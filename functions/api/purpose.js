import { requireAdmin } from "./_admin.js";
import { ipTag } from "./_iptag.js";
/* Cloudflare Pages Function — tally of "purpose of your tide search".
 * Route: /api/purpose
 *   POST {p:["Fishing","Crabbing"]} -> +1 each purpose, returns {ok:true}
 *   GET                             -> {tally:{Fishing:123,...}} sorted desc
 *
 * The site owner reads the tally by opening /api/purpose in a browser.
 * Selections also go to analytics (Zaraz -> GA4); this endpoint exists so the
 * running totals are one click away without digging through GA.
 *
 * Storage: VIEWS KV, keys "purp:<lowercased>" -> count, display name kept in
 * metadata. Guards: bots never counted; each IP capped per day; names
 * sanitized and capped at 40 chars; at most 6 purposes per request.
 */

const IP_DAY_CAP = 30; // max counted purpose picks per IP per day

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|headless|python-requests|curl|wget|libwww|httpclient|okhttp|axios|node-fetch|go-http|java\/|phantom|scrapy|facebookexternalhit|embedly|preview|monitor|uptime|pingdom|lighthouse|gtmetrix|ahrefs|semrush|dataprovider/i;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}


export async function onRequest(context) {
  const { request, env } = context;
  if (!env.VIEWS) return json({ error: "not configured" }, 501);

  if (request.method !== "POST") {
    const denied = requireAdmin(request, env);   /* owner-only read */
    if (denied) return denied;
    // GET: read every "purp:" key back as a sorted tally
    const tally = {};
    let cursor;
    do {
      const page = await env.VIEWS.list({ prefix: "purp:", cursor });
      for (const k of page.keys) {
        const count = parseInt((await env.VIEWS.get(k.name)) || "0", 10) || 0;
        const name = (k.metadata && k.metadata.n) || k.name.slice(5);
        tally[name] = (tally[name] || 0) + count;
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    const sorted = Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1]));
    return json({ tally: sorted });
  }

  const ua = request.headers.get("User-Agent") || "";
  const verifiedBot = !!(request.cf && request.cf.botManagement && request.cf.botManagement.verifiedBot);
  if (!ua || BOT_RE.test(ua) || verifiedBot) return json({ ok: true });

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad body" }, 400); }
  const list = Array.isArray(body && body.p) ? body.p : [];
  const names = [...new Set(list
    .map((v) => String(v).replace(/[<>&"]/g, "").trim().slice(0, 40))
    .filter(Boolean))].slice(0, 6);
  if (!names.length) return json({ error: "no purposes" }, 400);

  // per-IP daily cap so one machine can't skew the tally
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = "purpip:" + (await ipTag(request.headers.get("CF-Connecting-IP") || "0", env)) + ":" + day;
  const used = parseInt((await env.VIEWS.get(ipKey)) || "0", 10) || 0;
  if (used >= IP_DAY_CAP) return json({ ok: true });
  context.waitUntil(env.VIEWS.put(ipKey, String(used + names.length), { expirationTtl: 129600 }));

  for (const name of names) {
    const key = "purp:" + name.toLowerCase();
    const count = (parseInt((await env.VIEWS.get(key)) || "0", 10) || 0) + 1;
    context.waitUntil(env.VIEWS.put(key, String(count), { metadata: { n: name } }));
  }
  return json({ ok: true });
}
