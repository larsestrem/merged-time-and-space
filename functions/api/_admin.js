/* Shared admin gate for the owner-only READ endpoints.
 *
 * /admin/stats/ was noindex and nothing more: /api/views?id=<any>&stats=1,
 * GET /api/purpose, GET /api/emails and GET /api/report all answered anybody,
 * and the page ids they key off are listed in the dashboard's own source. That
 * made the site's full traffic dashboard, the tally, the send log and the
 * deployment's configuration flags public to anyone who looked. Aggregate data
 * with no PII in it, but not the owner's to give away.
 *
 * The key travels as a HEADER, not a query parameter. /api/reports once
 * accepted ?key=<secret> for an old bookmark; that form is retired — a secret
 * in a URL lands in browser history, referrer logs and any proxy log along
 * the way. The dashboards send the header and keep the key in localStorage.
 *
 * Files whose names start with "_" are not routed by Pages Functions, so this
 * is a module, not an endpoint.
 */

/** The header the dashboards send. */
export const ADMIN_HEADER = "X-Admin-Key";

/** Constant-time-ish compare — the key is short and the endpoint is not hot,
 *  but there is no reason to leak length or prefix through early exit. */
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns null when the caller is authorised, or a Response to return as-is. */
export function requireAdmin(request, env) {
  const body = (d, s) => new Response(JSON.stringify(d), {
    status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (!env.MOD_LOG_KEY) {
    return body({ error: "Set the MOD_LOG_KEY environment variable to enable the admin endpoints." }, 501);
  }
  const sent = request.headers.get(ADMIN_HEADER);
  if (!same(sent || "", env.MOD_LOG_KEY)) return body({ error: "unauthorized" }, 401);
  return null;
}
