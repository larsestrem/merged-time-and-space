import { requireAdmin } from "./_admin.js";
/* Cloudflare Pages Function — review abuse / wrong-date / suggestion reports.
 * Route: GET /api/reports?key=<MOD_LOG_KEY>
 *
 * Returns the reports the /report, /wrong-date and /suggest-event forms stored
 * in KV (report.js writes them under the "report:" prefix in the RATE
 * namespace, kept 90 days), newest first, so the owner can review them. There
 * is no public listing — this is gated by an admin key (MOD_LOG_KEY).
 *
 * Setup (Pages -> Settings -> Functions):
 *   Environment variable:  MOD_LOG_KEY = <the same long secret you chose>
 *   KV namespace binding:   RATE  (the same namespace report.js writes to)
 */
function json(d, s) {
  return new Response(JSON.stringify(d, null, 2), {
    status: s || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  /* Header preferred (a ?key= lands in history and proxy logs); the query form
     still works so an existing bookmark does not break. */
  /* header only. The legacy ?key= form was kept for an old bookmark, but a
     secret in a URL lands in browser history and every log on the way — the
     dashboard at /admin/ sends the header and keeps the key in localStorage,
     which is the supported route. */
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const kv = env.RATE || env.MODLOG;
  if (!kv) return json({ error: "Bind a KV namespace named RATE (the one report.js writes to)." }, 501);

  const items = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: "report:", limit: 1000, cursor });
    for (const k of page.keys) {
      const v = await kv.get(k.name, "json");
      if (v) items.push(v);
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor && items.length < 2000);

  /* newest first (key suffix and `at` are both timestamps) */
  items.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  return json({ count: items.length, items });
}
