import { requireAdmin } from "./_admin.js";
import { h36, ipTag } from "./_iptag.js";
/* Cloudflare Pages Function — per-event view counter.
 * Route: /api/views?id=<page-hash>[&v=<visitor-token>]
 *   POST  -> count this view (deduplicated) and return { count }
 *   GET   -> return current { count } without counting
 *
 * What counts as a "view" (designed so the number reflects real, distinct
 * humans and can't be juiced by reloading or scripting):
 *   1. Bots/crawlers/monitors (by User-Agent) and Cloudflare-verified bots are
 *      never counted. Googlebot crawling the page is great for SEO — we just
 *      don't log it as a human view.
 *   2. Each distinct browser counts a page at most ONCE PER DAY. We dedupe on a
 *      random visitor token the page stores in localStorage (?v=…), NOT on IP.
 *      That matters because a single IP can be either:
 *        - one person reloading/clicking repeatedly  -> same token  -> +0
 *          (so low-effort spam clicking never inflates the count), or
 *        - thousands of real people behind one address (mobile-carrier CGNAT, a
 *          university, a big office) -> different tokens -> each counts once
 *          (so a busy shared IP is NOT undercounted the way a flat per-IP rule
 *          would do it).
 *   3. Backstop: a single IP can trigger at most CAP counted views per page per
 *      day. Token dedupe alone could be gamed by a script rotating random
 *      tokens from one machine; the per-IP cap blocks that while staying well
 *      above any realistic number of genuine visitors sharing one address.
 *
 * Net effect: rewarding spammy/low-dwell behaviour with a higher number is
 * exactly what we DON'T want (it would encourage more of it, and that kind of
 * activity is an SEO negative), so the counter ignores it by design.
 *
 * The hourly/daily STATS buckets (what /admin/stats and /api/trending read)
 * dedupe one level harder: ONE VISIT PER IP ADDRESS PER PAGE PER DAY. Repeat
 * visits and extra devices/browsers behind the same address don't add to the
 * dashboard numbers — deliberately trading a little accuracy (shared IPs) for
 * a clean, inflation-free view. That dedupe reuses the per-IP daily tally
 * ("ipc:") — the stats buckets only bump when ipc was 0 (this IP's first
 * counted view today), so no separate per-IP stats key is stored, and only a
 * short non-reversible hash of the IP is ever used, never the raw address.
 *
 * Setup: bind a KV namespace named VIEWS. Keys: counts "v:<id>"; per-visitor
 * dedupe "seen:<id>:…"; per-IP daily tally "ipc:<id>:…" (doubles as the per-IP
 * stats dedupe; ~36h TTL, prefixes /api/popular never lists). First visit from
 * an address also bumps an hourly bucket "vh:<id>:<YYYY-MM-DDTHH>" (~50h TTL,
 * count mirrored in KV metadata) so /api/trending can sum the last 24h, and a
 * daily bucket "vd:<id>:<day>" (~32d TTL) powering the /admin/stats windows.
 */

const CAP = 50; // max counted views per IP, per page, per day (abuse backstop)

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|headless|python-requests|curl|wget|libwww|httpclient|okhttp|axios|node-fetch|go-http|java\/|phantom|scrapy|facebookexternalhit|embedly|preview|monitor|uptime|pingdom|lighthouse|gtmetrix|ahrefs|semrush|dataprovider/i;

/* h36 stays for the visitor TOKEN (already an opaque random string); IPs go
 * through the keyed tag in _iptag.js — see that file for why an unkeyed hash
 * of an IPv4 is not actually one-way. */

export async function onRequest(context) {
  const { request, env } = context;
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (!id || !/^[a-z0-9]{1,16}$/.test(id)) return json({ error: "bad id" }, 400);
  if (!env.VIEWS) return json({ error: "counter not configured" }, 501);

  const key = "v:" + id;
  const num = (v) => parseInt(v || "0", 10) || 0;
  /* Reads below are issued in PARALLEL rounds, not one at a time. This endpoint
     is called from a page-view beacon, and it was doing up to five sequential
     awaited KV reads (v:, seen:, ipc:, vh:, vd:) before answering — ~340ms for
     a 0.4KB reply, the largest single bar in the page's network panel. The
     reads have no data dependency on each other, only on the branch decisions
     between them, so they collapse into two rounds. Same reads, same counting
     semantics, same number of KV operations on every path; a fifth of the
     round trips. */
  let count;

  if (request.method !== "POST") {
    count = num(await env.VIEWS.get(key));
    // GET ?stats=1: window sums from the daily buckets (used by /admin/stats):
    // today, yesterday (d1), last 7 days and last 30 days — UTC days.
    if (params.get("stats")) {
      /* owner-only: this is the whole traffic dashboard, and the page ids are
         listed in /admin/stats/'s own source */
      const denied = requireAdmin(request, env);
      if (denied) return denied;
      const dstr = (o) => new Date(Date.now() - o * 86400e3).toISOString().slice(0, 10);
      const dToday = dstr(0), dYest = dstr(1), c7 = dstr(6), c30 = dstr(29);
      const pre = "vd:" + id + ":";
      let today = 0, d1 = 0, d7 = 0, d30 = 0, cursor;
      const days = {}, hours = {};
      do {
        const page = await env.VIEWS.list({ prefix: pre, cursor });
        for (const k of page.keys) {
          const c = (k.metadata && k.metadata.c) || 0, d = k.name.slice(pre.length);
          if (d === dToday) today += c;
          if (d === dYest) d1 += c;
          if (d >= c7) d7 += c;
          if (d >= c30) { d30 += c; days[d] = (days[d] || 0) + c; }
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      const hpre = "vh:" + id + ":";
      cursor = undefined;
      do {
        const page = await env.VIEWS.list({ prefix: hpre, cursor });
        for (const k of page.keys) {
          const c = (k.metadata && k.metadata.c) || 0, h = k.name.slice(hpre.length);
          hours[h] = (hours[h] || 0) + c;
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      return json({ count, today, d1, d7, d30, days, hours });
    }
    return json({ count });
  }

  // 1. Never count bots, crawlers, monitors, or Cloudflare-verified bots.
  //    Checked BEFORE any read: a bot needs the count and nothing else, so it
  //    must not pay for the dedupe lookups it can never reach.
  const ua = request.headers.get("User-Agent") || "";
  const verifiedBot = !!(request.cf && request.cf.botManagement && request.cf.botManagement.verifiedBot);
  if (!ua || BOT_RE.test(ua) || verifiedBot) return json({ count: num(await env.VIEWS.get(key)) });

  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await ipTag(request.headers.get("CF-Connecting-IP") || "0", env);

  // 2. Dedupe per distinct browser per day (fall back to IP if JS/localStorage
  //    gave us no token, e.g. privacy modes).
  // 3. Per-IP daily backstop: stop counting once one address has hit the cap.
  //    Both keys are pure functions of the request, so the count, the dedupe
  //    marker and the per-IP tally are fetched in ONE round rather than three.
  const token = (params.get("v") || "").slice(0, 40);
  const seenKey = "seen:" + id + (token ? ":v:" + h36(token) : ":i:" + ipHash) + ":" + day;
  const ipcKey = "ipc:" + id + ":" + ipHash + ":" + day;
  const [rawCount, seen, rawIpc] = await Promise.all([
    env.VIEWS.get(key), env.VIEWS.get(seenKey), env.VIEWS.get(ipcKey),
  ]);
  count = num(rawCount);
  if (seen) return json({ count }); // already counted today

  const ipc = num(rawIpc);
  if (ipc >= CAP) { context.waitUntil(env.VIEWS.put(seenKey, "1", { expirationTtl: 129600 })); return json({ count }); }

  count += 1;
  context.waitUntil(env.VIEWS.put(key, String(count)));
  context.waitUntil(env.VIEWS.put(seenKey, "1", { expirationTtl: 129600 }));    // ~36h
  context.waitUntil(env.VIEWS.put(ipcKey, String(ipc + 1), { expirationTtl: 129600 }));

  // Stats buckets count ONE VISIT PER IP PER PAGE PER DAY: a second browser or
  // device behind the same address still bumps the public counter above, but
  // not the dashboard/trending buckets below. "First visit from this IP today"
  // is exactly `ipc === 0` (the pre-increment count read above), so we gate on
  // that instead of a separate sip: dedupe key — saving one KV read AND one KV
  // write on every new visit, with identical behaviour (a second browser behind
  // the same address has ipc >= 1 here and is skipped). Removing the highest-
  // frequency redundant write is the cheap half of easing KV write pressure;
  // the durable fix is the Workers Paid plan (and, later, Analytics Engine).
  if (ipc > 0) return json({ count });

  // Trending: bump this hour's bucket. /api/trending sums the last 24h of these
  // to rank what's hot right now. Count is mirrored in metadata so the ranking
  // endpoint can read it straight from list() without a get per bucket.
  // Second (and last) round: the two stats buckets are independent of each
  // other, so they are read together rather than one after the other.
  const hourKey = "vh:" + id + ":" + new Date().toISOString().slice(0, 13);
  const dayKey = "vd:" + id + ":" + day;
  const [rawHour, rawDay] = await Promise.all([env.VIEWS.get(hourKey), env.VIEWS.get(dayKey)]);

  const hc = num(rawHour) + 1;
  context.waitUntil(env.VIEWS.put(hourKey, String(hc), { expirationTtl: 180000, metadata: { c: hc } })); // ~50h (dashboard shows yesterday hourly)

  // Daily bucket (~32-day TTL): powers the 30d/7d/1d/today windows on /admin/stats.
  const dc = num(rawDay) + 1;
  context.waitUntil(env.VIEWS.put(dayKey, String(dc), { expirationTtl: 2764800, metadata: { c: dc } }));

  return json({ count });
}
