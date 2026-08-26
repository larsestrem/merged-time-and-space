import { requireAdmin } from "./_admin.js";
/* Cloudflare Pages Function — abuse reports from /report/.
 * Route: POST /api/report   body: { url, reason, details, email, website }
 *
 * Delivery (any/all of these, whichever are configured):
 *   1. REPORT_WEBHOOK — a private Google Apps Script URL that appends the
 *      report to a Google Sheet and emails the owner (recommended; stays
 *      entirely inside the owner's Google account). See cloudflare/report-sink.gs.
 *   2. Resend email — RESEND_API_KEY + FROM_EMAIL (+ optional REPORT_EMAIL).
 *   3. KV backstop — stored under report:<ts> in the RATE binding for 90 days,
 *      viewable (privately, key-gated) at /admin/reports.
 *
 * Setup (Pages -> Settings -> Functions):
 *   Environment variables:  REPORT_WEBHOOK (recommended), and/or
 *                           RESEND_API_KEY, FROM_EMAIL, optional REPORT_EMAIL
 *   KV namespace binding:   RATE
 *
 * Anti-abuse: honeypot field + per-IP daily cap.
 */

function json(d, s) {
  return new Response(JSON.stringify(d), {
    status: s || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

/* GET /api/report — configuration self-check (booleans only, no secret values).
 * Lets the owner see at a glance whether the delivery channels are wired up on
 * THIS deployment: open it in a browser on the production domain. */
export async function onRequestGet(context) {
  const { request, env } = context;
  /* booleans only, but they still describe the deployment's wiring to anyone
     who asks — the owner is the only audience this self-check ever had */
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const w = env.REPORT_WEBHOOK || "";
  return json({
    ok: true,
    webhook_set: !!w,
    webhook_looks_right: /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(w.trim()),
    kv_bound: !!env.RATE,
    resend_email_set: !!(env.RESEND_API_KEY && env.FROM_EMAIL),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad body" }, 400); }

  if (body.website) return json({ ok: true });               // honeypot tripped — pretend success

  const url = (body.url || "").slice(0, 600);
  const reason = (body.reason || "").slice(0, 80);
  /* A PASTED LESSON PLAN IS NOT A BUG REPORT, and 1,000 characters is about
     four paragraphs — a teacher's plan would have been silently beheaded at
     the fold with nothing on the page to say so. The long forms get room;
     everything else keeps the old cap, because the reason a public endpoint
     has a cap at all has not changed. */
  const LONG = reason === "Lesson plan" || reason === "Class questions";
  const details = (body.details || "").slice(0, LONG ? 20000 : 1000);
  const email = (body.email || "").slice(0, 200);
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  // Abuse reports require an email for accountability/follow-up. Site-idea
  // submissions (the site-wide suggestion box) and lesson feedback (a teacher's
  // quick improvement shouldn't demand an address) make it optional — but if
  // one is supplied it must still be well-formed.
  const emailOptional = reason === "Site idea" || reason === "Lesson feedback";
  /* WHAT KIND OF THING THIS IS, for the inbox. Used three times below and,
     until now, DECLARED NOWHERE: every submission that reached the webhook
     branch threw a ReferenceError and answered 500, so the sender was told it
     had failed. That is a plausible reason the teacher forms had never
     received anything. Named per reason rather than derived from
     emailOptional, which is a different question (does this need a reply
     address) that happened to be true for one of the same values. */
  const isIdea = reason === "Site idea";
  const KIND = reason === "Lesson plan" ? { h: "📚 Teacher lesson plan", s: "Lesson plan" }
    : reason === "Class questions" ? { h: "❓ Questions from a class", s: "Class questions" }
    : isIdea ? { h: "💡 Site idea", s: "Site idea" }
    : { h: "🚩 Abuse report", s: "Report" };
  if (!/^https?:\/\//.test(url) || !reason) return json({ error: "missing fields" }, 400);
  if (!emailOptional && !emailOk) return json({ error: "missing fields" }, 400);
  if (emailOptional && email && !emailOk) return json({ error: "missing fields" }, 400);

  // per-IP daily rate limit
  const ip = request.headers.get("CF-Connecting-IP") || "0";
  if (env.RATE) {
    const k = "rr:" + ip + ":" + new Date().toISOString().slice(0, 10);
    const n = parseInt((await env.RATE.get(k)) || "0", 10);
    if (n >= 10) return json({ error: "rate limited" }, 429);
    context.waitUntil(env.RATE.put(k, String(n + 1), { expirationTtl: 86400 }));
  }

  const report = { url, reason, details, email, ip, at: new Date().toISOString() };

  // Primary delivery: POST to a private Google Apps Script webhook (REPORT_WEBHOOK)
  // that appends the report to a Google Sheet AND emails the owner — all inside
  // the owner's own Google account, nothing public. Fire-and-forget.
  const logEmail = (purpose) => { if (env.VIEWS) context.waitUntil(env.VIEWS.put(
    "em:" + new Date().toISOString() + ":" + Math.random().toString(36).slice(2, 6),
    "1", { expirationTtl: 7776000, metadata: { p: purpose } }
  )); };
  if (env.REPORT_WEBHOOK) {
    context.waitUntil(
      fetch(env.REPORT_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      }).catch(() => {})
    );
    logEmail(KIND.s + " → Sheet/email");
  }

  // backstop: keep the report in KV for 90 days even if email isn't configured
  if (env.RATE) {
    context.waitUntil(env.RATE.put(
      "report:" + Date.now() + ":" + Math.random().toString(36).slice(2, 8),
      JSON.stringify(report), { expirationTtl: 90 * 86400 }
    ));
  }

  // email the owner when Resend is configured
  const to = env.REPORT_EMAIL || env.FROM_EMAIL;
  if (env.RESEND_API_KEY && env.FROM_EMAIL && to) {
    const escq = (s) => String(s).replace(/[<>&]/g, "");
    const heading = KIND.h;
    const html =
      '<div style="font-family:sans-serif;max-width:560px;margin:auto">' +
      '<h2>' + heading + '</h2>' +
      '<p><strong>Reason:</strong> ' + escq(reason) + '</p>' +
      '<p><strong>Reported URL:</strong><br><a href="' + escq(url) + '">' + escq(url) + '</a></p>' +
      (details ? '<p><strong>Details:</strong><br>' + escq(details).replace(/\n/g, '<br>') + '</p>' : '') +
      (email ? '<p><strong>Reporter contact:</strong> ' + escq(email) + '</p>' : '') +
      '<p style="color:#777;font-size:12px">IP ' + escq(ip) + ' · ' + report.at +
      ' · To block the event, add its URL pattern to cloudflare/blocklist.txt (see cloudflare/waf-rule.md).</p>' +
      '</div>';
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to, subject: heading + ": " + reason, html })
    });
    if (!res.ok) return json({ ok: true, stored: true }); // KV has it; don't fail the reporter
    logEmail(KIND.s + " (owner email)");
  }
  return json({ ok: true });
}
