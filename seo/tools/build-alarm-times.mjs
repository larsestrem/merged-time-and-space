#!/usr/bin/env node
/* build-alarm-times.mjs — "set alarm for HH:MM" landing pages, one per half
 * hour from 5:00 AM to 12:00 PM, at /alarm-clock/<slug>/. Each reuses the
 * shared alarm widget and presets its time (window.AC_SETTIME) so the visitor
 * lands with the Set dialog filled in. High-intent SEO pages for the very
 * common "set alarm for 7 am" style searches, which the timeandspace.science domain
 * is well placed to rank for.
 *   node seo/tools/build-alarm-times.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, alarmTimes, breadcrumbLD, appLd } from "./lib.mjs";
import { PANEL_HTML, DIALOGS_HTML, WIDGET_JS } from "./alarm-widget.mjs";
import { NOTIFY_JS } from "./notify.mjs";
import { clockFace } from "./clock-face.mjs";
/* the /24-hour-clock-converter/ page for THIS time — one slug helper shared with
 * that generator, so the two families' 48 pages can never point past each other */
import { convSlug } from "./clock-convert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

const times = alarmTimes();

/* Per-time context line so each wake-up page reads differently (not just the
 * same template with the clock swapped) — keyed by 24h time. Edit freely. */
const WAKE_USES = {
  /* overnight / small hours */
  "00:00": "a midnight reminder, a New Year countdown, or the start of a night shift",
  "00:30": "a late-night cue, the end of a movie, or a night-shift check-in",
  "01:00": "a night feed for a newborn, a medication reminder, or a night-shift break",
  "01:30": "a laundry-cycle reminder, a night-owl work session, or a night-shift task",
  "02:00": "a night feed, a medication dose, or waking for a very early flight",
  "02:30": "an overnight reminder, a night-shift break, or an early airport run",
  "03:00": "waking for a red-eye flight, a night feed, or a pre-dawn fishing trip",
  "03:30": "an early travel start, a night-shift task, or an astronomy session",
  "04:00": "a very early flight, a farm or bakery start, or a pre-dawn workout",
  "04:30": "an early shift, catching a sunrise hike, or a long travel day",
  /* morning */
  "05:00": "early risers — a pre-dawn workout, beating the commute, or a quiet head start on the day",
  "05:30": "an early gym session, a sunrise run, or prepping before the rest of the house is up",
  "06:00": "a morning workout, a longer commute, or easing into the day before work",
  "06:30": "getting ready for work, a school-run morning, or a short workout before breakfast",
  "07:00": "a typical workday start, the school run, or breakfast without rushing",
  "07:30": "the morning routine, the school drop-off, or a steady start to the work day",
  "08:00": "a standard work or school start, early meetings, or a relaxed morning",
  "08:30": "a slightly later start, a first class, or catching a morning train",
  "09:00": "a 9-to-5 start, the first meeting of the day, or capping a weekend lie-in",
  "09:30": "a flexible-hours start, a morning appointment, or a slow weekend morning",
  "10:00": "a late start, a mid-morning appointment, or a weekend reset",
  "10:30": "a mid-morning break, an appointment, or an easy day off",
  "11:00": "a late shift, a brunch reminder, or a gentle mid-morning wake-up",
  "11:30": "a brunch alarm, a late-morning task, or the end of a midday nap",
  /* midday / afternoon */
  "12:00": "a midday reminder, the end of a power nap, or a lunch-break cue",
  "12:30": "the end of lunch, an early-afternoon meeting, or a midday medication reminder",
  "13:00": "getting back to work after lunch, an afternoon appointment, or the end of a nap",
  "13:30": "an afternoon deadline, a school pickup reminder, or the end of a lunch break",
  "14:00": "an afternoon meeting, a school pickup, or the end of a 20-minute power nap",
  "14:30": "an afternoon appointment, a study break, or a mid-afternoon reset",
  "15:00": "the school run, an afternoon coffee break, or the end of an afternoon nap",
  "15:30": "collecting the kids, an afternoon reminder, or a workout before dinner",
  "16:00": "the end of the work day, an after-school activity, or an afternoon errand",
  "16:30": "wrapping up work, a gym session, or an early dinner prep reminder",
  /* evening */
  "17:00": "leaving work, an after-work workout, or starting dinner",
  "17:30": "the commute home, dinner prep, or an evening class",
  "18:00": "dinner time, an evening workout, or picking someone up",
  "18:30": "a family dinner, an evening appointment, or the start of a night out",
  "19:00": "an evening reminder, a workout, or catching the start of a show",
  "19:30": "the kids' bedtime routine, an evening class, or a dinner reservation",
  "20:00": "a bedtime routine for young kids, an evening reminder, or a favorite show",
  "20:30": "winding down the evening, a medication reminder, or a study session",
  /* night */
  "21:00": "a kids' lights-out, an evening medication reminder, or starting to wind down",
  "21:30": "a bedtime reminder, the end of a show, or a last task before bed",
  "22:00": "a lights-out reminder, taking nightly medication, or a wind-down cue",
  "22:30": "a bedtime nudge, a phones-away reminder, or a final task of the day",
  "23:00": "a bedtime alarm, a medication reminder, or a cue to stop scrolling",
  "23:30": "a last call before bed, the end of a late show, or a wind-down reminder",
};
const wakeUses = (t) => WAKE_USES[t.t24] || "waking up on time, a daily reminder, or a repeating routine";

/* Quick-link chips to other times. Two rules, in this order:
 *
 *   1. NEIGHBOURS FIRST. The visible set used to be the same 4:00–10:00 AM
 *      wall on all 48 pages, so a "set alarm for 9 PM" page offered thirteen
 *      links to breakfast and nothing near 9 PM. Somebody who wants 9 PM is
 *      far more likely to want 8:30 or 9:30, so the two hours either side of
 *      THIS page's time lead — the same shape as the timer pages' curated
 *      neighbour chips.
 *   2. Then the everyday wake window, because that is what most visitors are
 *      here for whatever page they landed on.
 *
 * Everything else stays behind the "Show more times" expander. The pages all
 * still exist and cross-link — this only orders what's visible up front. */
const mins = (t) => t.h * 60 + t.m;
const isCommon = (t) => t.t24 >= "04:00" && t.t24 <= "10:00";
/* circular distance in minutes, so 11:30 PM and 12:30 AM are an hour apart */
const apart = (a, b) => { const d = Math.abs(mins(a) - mins(b)); return Math.min(d, 1440 - d); };
const chip = (t) => `<a class="chip" href="/alarm-clock/${t.slug}/">${esc(t.disp)}</a>`;
function commonChips(slug) {
  const self = times.find((t) => t.slug === slug);
  const near = times.filter((t) => t.slug !== slug && self && apart(t, self) <= 120);
  const rest = times.filter((t) => t.slug !== slug && isCommon(t) && !near.includes(t));
  return [...near, ...rest].map(chip).join("");
}
function moreChips(slug) {
  const shown = new Set([slug]);
  const self = times.find((t) => t.slug === slug);
  for (const t of times) if (self && apart(t, self) <= 120) shown.add(t.slug);
  for (const t of times) if (isCommon(t)) shown.add(t.slug);
  return times.filter((t) => !shown.has(t.slug)).map(chip).join("");
}

function faqLd(disp) {
  const qa = [
    [`How do I set an alarm for ${disp}?`, `This page already has ${disp} filled in — just tap Save. The alarm then rings at ${disp} for as long as this tab (or its full-screen or floating window) stays open.`],
    [`Will the alarm still go off if I close the tab?`, `No. This is a browser alarm, so it only rings while the page or its floating window is open. Keep the tab open — plug your phone in and tap Full screen for an overnight ${disp} bedside alarm.`],
    [`Can I repeat the ${disp} alarm every day?`, `Yes. Open the alarm and choose Daily, or pick specific weekdays, and it will ring at ${disp} on each of those days.`],
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

function faqHtml(t) {
  const disp = t.disp;
  return `  <div class="card tool-about" id="ac-instructions">
    ${clockFace(t.h, t.m, { size: 150 })}
    <h2>Common questions</h2>
    <p><strong>How do I set an alarm for ${esc(disp)}?</strong> This page already has ${esc(disp)} filled in — just tap <strong>Save</strong>. It rings at ${esc(disp)} as long as this tab (or its full-screen or floating window) stays open.</p>
    <p><strong>Will it go off if I close the tab?</strong> No — it's a browser alarm, so keep the tab open. Plug your phone in and tap <strong>Full screen</strong> for a large, always-on ${esc(disp)} alarm display.</p>
    <p><strong>Can I repeat it every day?</strong> Yes — open the alarm and choose <strong>Daily</strong>, or pick specific weekdays, to ring at ${esc(disp)} each day.</p>
    <p class="hint">Counting a length of time rather than waiting for a clock time? Use the <a href="/timer/">online timer</a> instead — set it for a number of minutes and it rings when they are up. Given this time as ${esc(t.t24)} on a 24-hour clock? That's <a href="/24-hour-clock-converter/${convSlug(t.h, t.m)}/">${esc(t.t24)} in 12-hour time</a>.</p>
  </div>`;
}

let n = 0;
for (const t of times) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set Alarm for ${esc(t.disp)} — Free Online Alarm Clock</title>
<meta name="description" content="Set a free online alarm for ${esc(t.disp)}. It's already filled in — tap Save, keep the tab open, and it rings right at ${esc(t.disp)}. One-time or repeating, no app, no sign-up.">
<link rel="canonical" href="${SITE}/alarm-clock/${t.slug}/">
<meta property="og:title" content="Set Alarm for ${esc(t.disp)}">
<meta property="og:description" content="A free online alarm preset to ${esc(t.disp)} — tap Save and keep the tab open.">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/api/og?tpl=alarm&amp;h=${t.h}&amp;m=${t.m}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/api/og?tpl=alarm&amp;h=${t.h}&amp;m=${t.m}">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${JSON.stringify(faqLd(t.disp))}</script>
<!-- These 48 pages are the section's highest-intent long tail ("set alarm for
     6:30 am") and were the only tool pages carrying neither a breadcrumb nor an
     app entity — the breadcrumb renders in the SERP, the WebApplication says
     what the page IS. -->
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Alarm Clock", url: "/alarm-clock/" }, { name: `Set alarm for ${t.disp}`, url: `/alarm-clock/${t.slug}/` }])}</script>
${appLd({ name: `Set Alarm for ${t.disp}`, url: `${SITE}/alarm-clock/${t.slug}/`, description: `A free online alarm clock preset to ${t.disp} — set it in one tap, with a full-screen bedside view.` })}
${GA_SNIPPET}
</head>
<body class="ac-page">
<div class="wrap">
  ${brand({ crumb: { slug: "alarm-clock", url: "/alarm-clock/" }, sub: { slug: t.slug, url: `/alarm-clock/${t.slug}/` } })}
  <h1>Set an Alarm for ${esc(t.disp)}</h1>
  <p class="sub">${t.h >= 4 && t.h <= 11
    ? `Need to be up by ${esc(t.disp)}? It's already filled in below — tap <strong>Save</strong>, keep this tab open, and the alarm rings right at ${esc(t.disp)}. Tap <strong>Full screen</strong> to turn your phone into a ${esc(t.disp)} bedside alarm.`
    : `Need an alarm at ${esc(t.disp)}? It's already filled in below — tap <strong>Save</strong>, keep this tab open, and it rings right at ${esc(t.disp)}. One-time or repeating, no app and no sign-up.`}</p>
  <p class="tool-uses">A ${esc(t.disp)} alarm is a popular choice for ${wakeUses(t)}.</p>

  ${PANEL_HTML}
  <p class="ac-wake-note" id="ac-wake-note" hidden></p>
  <div class="ac-list" id="ac-list"></div>

  <div class="card"><h2>Set an alarm for another time</h2>
    <div class="timer-presets" style="margin-top:6px">${commonChips(t.slug)}<button type="button" class="chip ac-custom-add">Add a custom alarm</button></div>
    <details class="more-times"><summary>Show more times</summary><div class="timer-presets" style="margin-top:10px">${moreChips(t.slug)}<a class="chip" href="/alarm-clock/">All alarm options →</a></div></details>
  </div>

${faqHtml(t)}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>

${DIALOGS_HTML}
<script>window.AC_SETTIME=${JSON.stringify(t.t24)};</script>
<script>${NOTIFY_JS}
${WIDGET_JS}</script>
</body>
</html>
`;
  mkdirSync(join(root, "alarm-clock", t.slug), { recursive: true });
  writeFileSync(join(root, "alarm-clock", t.slug, "index.html"), html);
  n++;
}
console.log(`Generated ${n} "set alarm for HH:MM" pages under /alarm-clock/.`);
