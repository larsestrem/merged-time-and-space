import { requireAdmin } from "./_admin.js";
/* Cloudflare Pages Function — log of emails the site has sent, for
 * /admin/stats. Route: GET /api/emails[?n=50]
 *   -> { emails: [{ p, at }, ...] }   newest first
 *
 * Entries are written by report.js under "em:<ISO>:<rand>"
 * in the VIEWS KV namespace with a ~90-day TTL. Only a short PURPOSE label and
 * the send time are stored — never a recipient address or message content, so
 * this endpoint holds no personal data.
 */

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const denied = requireAdmin(request, env);   /* owner-only read */
  if (denied) return denied;
  if (!env.VIEWS) return json({ emails: [] });
  const n = Math.min(parseInt(new URL(request.url).searchParams.get("n") || "50", 10) || 50, 200);
  const out = [];
  let cursor;
  do {
    const page = await env.VIEWS.list({ prefix: "em:", cursor });
    for (const k of page.keys) out.push({ p: (k.metadata && k.metadata.p) || "email", at: k.name.slice(3, 27) });
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => (a.at < b.at ? 1 : -1)); // newest first
  return json({ emails: out.slice(0, n) });
}
