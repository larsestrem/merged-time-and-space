/* Cloudflare Pages Function — most-viewed countdowns leaderboard.
 * Route: GET /api/popular[?n=50]
 *   -> { ok, ranked: [{ id, count }, ...] }  (descending by view count)
 *
 * Reads the same VIEWS KV namespace the per-event counter (/api/views) writes
 * to: each event stores its running total under "v:<id>". We list those keys,
 * read their counts, sort, and return the top N. The page maps id -> event from
 * a build-time table, so no event metadata is stored here.
 *
 * Setup: bind the VIEWS KV namespace (same as /api/views). Cached at the edge
 * for a few minutes so a burst of visitors doesn't fan out to KV every time.
 */

function json(data, status, cacheSeconds) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheSeconds ? `public, max-age=${cacheSeconds}` : "no-store",
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.VIEWS) return json({ ok: false, ranked: [] }, 200, 60);

  const n = Math.min(parseInt(new URL(request.url).searchParams.get("n") || "50", 10) || 50, 200);

  // List all per-event counter keys (v:<id>). One page holds up to 1000 keys,
  // which comfortably covers the whole catalogue.
  const keys = [];
  let cursor;
  do {
    const res = await env.VIEWS.list({ prefix: "v:", limit: 1000, cursor });
    keys.push(...res.keys.map((k) => k.name));
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);

  /* Main-page visit beacons (pghome, pgtides, …, injected by build-inline)
     share this namespace with the per-countdown counters and are an order of
     magnitude larger, so they sat at the top of the raw leaderboard. The
     consumers happen to drop them when mapping id -> event, which masked it;
     the ranking should not depend on that. */
  const counts = await Promise.all(
    keys.map(async (k) => ({ id: k.slice(2), count: parseInt((await env.VIEWS.get(k)) || "0", 10) || 0 }))
  );
  const isPageBeacon = (id) => /^pg[a-z0-9]*$/.test(id);

  const ranked = counts.filter((c) => c.count > 0 && !isPageBeacon(c.id)).sort((a, b) => b.count - a.count).slice(0, n);
  // Short edge cache: fresh enough for a leaderboard, cheap on KV.
  return json({ ok: true, ranked }, 200, 180);
}
