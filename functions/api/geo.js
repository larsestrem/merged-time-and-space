/* GET /api/geo — the visitor's approximate location, read from Cloudflare's
 * edge (IP geolocation). No external API call, no cookies, no logging: it just
 * echoes the coarse lat/lon/city Cloudflare already attached to the request.
 * Used by the homepage tide card to feature the nearest beach. */
export function onRequest(context) {
  const cf = context.request.cf || {};
  const num = (v) => (v == null || v === "" ? null : +v);
  const body = {
    lat: num(cf.latitude),
    lon: num(cf.longitude),
    city: cf.city || null,
    region: cf.regionCode || cf.region || null,
    country: cf.country || null,
  };
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      /* per-visitor, so never cache at the edge */
      "cache-control": "no-store, max-age=0",
    },
  });
}
