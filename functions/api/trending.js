/* Cloudflare Pages Function — "most viewed this week" leaderboard.
 * Route: GET /api/trending[?n=50]
 *   -> { ok, ranked: [{ id, count }, ...] }  (descending by views, last 7 days)
 *
 * Where /api/popular ranks by all-time totals ("v:<id>"), this ranks by recent
 * momentum: the per-event counter (/api/views) bumps a daily bucket
 * "vd:<id>:<YYYY-MM-DD>" on the first visit from an address each day (~32d
 * TTL). We list those buckets, keep the ones inside the last 7 days (today +
 * the previous 6, UTC), and sum per event. Bucket counts are mirrored in KV
 * metadata, so we read them from list() directly with no get-per-bucket
 * fan-out. The page maps id -> event from a build-time table.
 *
 * Setup: bind the VIEWS KV namespace (same as /api/views). Edge-cached a couple
 * of minutes so a burst of visitors doesn't fan out to KV every time.
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
  // Last 7 UTC days (today + previous 6), at day granularity. ISO date strings
  // compare correctly lexicographically, so a string >= check is all we need.
  const cutoff = new Date(Date.now() - 6 * 86400 * 1000).toISOString().slice(0, 10);

  const sums = {};
  let cursor;
  do {
    const res = await env.VIEWS.list({ prefix: "vd:", limit: 1000, cursor });
    for (const k of res.keys) {
      // name = "vd:<id>:<YYYY-MM-DD>" — no colons in id or the day stamp.
      const parts = k.name.split(":");
      if (parts.length !== 3 || parts[2] < cutoff) continue;
      /* skip the main-page visit beacons — see the note in popular.js */
      if (/^pg[a-z0-9]*$/.test(parts[1])) continue;
      const c = (k.metadata && +k.metadata.c) || 0;
      if (c) sums[parts[1]] = (sums[parts[1]] || 0) + c;
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);

  const ranked = Object.keys(sums)
    .map((id) => ({ id, count: sums[id] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
  return json({ ok: true, ranked }, 200, 120);
}
