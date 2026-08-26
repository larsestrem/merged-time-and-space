#!/usr/bin/env node
/* build-clock-convert.mjs — /24-hour-clock-converter/, the 12-hour ⇄ 24-hour
 * (military time) converter, plus one page per half hour at
 * /24-hour-clock-converter/<hhmm>/ — 48 of them, "1430", "0730", "0000".
 *
 * WHY A PAGE PER TIME AND NOT JUST THE TOOL. The query is almost never "convert
 * time": it is "1430 military time", "what is 18:00 in 12 hour", "0730 in am
 * pm". Each of those is a different answer and wants a page that SAYS the
 * answer, the way the alarm section has a page per "set alarm for 6:30 am".
 * The set is the same half-hourly walk round the clock those pages use
 * (CONV_TIMES in clock-convert.mjs is built from alarmTimes()), so every page
 * here has a working alarm for its own time one link away and the two families
 * cannot drift apart.
 *
 * FINITE AND CURATED, like the timer durations: :00 and :30 only. Every minute
 * of the day would be 1,440 pages that differ by one digit, which is the thin
 * near-duplicate set the timer generator deliberately does not emit either. The
 * converter itself handles every minute; only the landing pages are curated.
 *
 *   node seo/tools/build-clock-convert.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, appLd, faqLd } from "./lib.mjs";
import { clockFace } from "./clock-face.mjs";
import { CONV_TIMES, CONV_SLUGS, convForm, CONV_JS, hourChart, spoken24, spoken12, partOfDay } from "./clock-convert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

export const HUB = "/24-hour-clock-converter/";
export { CONV_SLUGS };

const p2 = (n) => String(n).padStart(2, "0");
const FOOTER = `  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>`;
/* one shared file across all 49 pages rather than 49 inlined copies */
const SCRIPT = `<script data-ac="shared" data-name="clock-convert">${CONV_JS}</script>`;

/* ---- where each hour is actually met in 24-hour notation -------------------
 * One line per hour, so the 48 pages are not one template with the clock swapped
 * (the same rule the "set alarm for" pages follow). These name real places the
 * notation is used at that hour — a timetable, a chart, a boarding pass — rather
 * than inventing an activity for the reader. */
const HOUR_NOTE = {
  0: "the start of the day on every 24-hour clock, and the one that catches people out: it is 12 AM, not 12 PM. Timetables and hospital charts write the date change here",
  1: "the small hours, where the 24-hour clock earns its keep — 01:00 and 13:00 can never be confused on a night-shift handover",
  2: "the hour daylight saving usually moves in, which is why the changeover is always published in 24-hour form",
  3: "deep night shift, and the hour long-haul flights are most often scheduled to land in",
  4: "the earliest hour on most bakery, market and freight timetables",
  5: "the first commuter trains and the earliest airport check-in desks",
  6: "the start of the working day on farms, building sites and morning broadcast schedules",
  7: "the school-run and first-flight hour, printed as 07:00 on a boarding pass",
  8: "the standard start of the office and school day across most of the world",
  9: "the hour appointments and business calls are most often booked for",
  10: "mid-morning: deliveries, hospital rounds and the second wave of departures",
  11: "the last hour of the morning, where a 12-hour clock is still unambiguous and a 24-hour one is already clearer",
  12: "noon, and the other hour people get wrong: 12:00 is 12 PM, and there is no such thing as 00:00 midday",
  13: "the first hour that actually changes when you convert — the one that makes the 24-hour clock look unfamiliar",
  14: "early afternoon: the most common slot for meetings, matinees and hospital clinics",
  15: "the school pickup hour, and kick-off time for a great many afternoon fixtures",
  16: "late afternoon, when shift handovers and end-of-day deadlines are written",
  17: "the end of the standard working day, and the start of the evening commute",
  18: "the hour evening services, classes and dinner reservations are timed from",
  19: "prime-time television and evening kick-offs, always published in 24-hour form",
  20: "the hour theatre curtains go up and evening flights leave",
  21: "late evening: last trains, closing times and the end of most opening hours",
  22: "the start of the night shift, and a common departure time for red-eye flights",
  23: "the last hour of the day — 23:59 is the deadline every system means when it says 'end of day'",
};

/* Which of the four conversion cases this time is, said as a rule the reader
 * can apply to any other time. This is what differentiates a morning page from
 * an afternoon one: they are genuinely different arithmetic, not the same
 * sentence with different digits. */
function ruleFor(h) {
  if (h === 0) return `Midnight is the first of the two times people get wrong. On the 24-hour clock the day starts at <b>00:00</b>; on the 12-hour clock the same moment is <b>12:00 AM</b> — twelve, and AM. It is never 12 PM, and 24:00 is the same instant written as the END of the previous day, which is why a timetable will show a service departing at 00:10 on Tuesday and never at 24:10 on Monday.`;
  if (h === 12) return `Noon is the second of the two times people get wrong. <b>12:00</b> on the 24-hour clock is <b>12:00 PM</b> — it keeps its twelve, and it is PM, not AM. Only midnight moves, to 00:00. If you remember one thing about converting: 12 stays 12 at noon and becomes 0 at midnight.`;
  if (h < 12) return `Every hour from 1 to 11 in the morning reads the SAME on both clocks — only the leading zero and the AM label differ. That is why converting a morning time feels like it did nothing: <b>${p2(h)}:xx</b> and <b>${h}:xx AM</b> are the same digits. The 24-hour form still pays for itself, because it cannot be mistaken for the afternoon.`;
  return `This is the half of the day that actually changes. From 13:00 to 23:00, subtract 12 to get the 12-hour hour and label it PM: <b>${p2(h)}</b> − 12 = <b>${h - 12}</b>, so ${p2(h)}:xx is ${h - 12}:xx PM. Going the other way, add 12 to any PM hour except 12 PM itself.`;
}

/* ---- the hub -------------------------------------------------------------- */
const HUB_FAQ = [
  ["How do you convert 24-hour time to 12-hour time?",
    "For hours 13 through 23, subtract 12 and add PM: 14:30 becomes 2:30 PM. Hours 01 through 11 keep their number and take AM. 12:00 is 12:00 PM (noon) and 00:00 is 12:00 AM (midnight). The minutes never change."],
  ["How do you convert 12-hour time to 24-hour time?",
    "For PM times from 1 PM to 11 PM, add 12: 9:45 PM becomes 21:45. AM times keep their hour and take a leading zero where needed: 7:05 AM becomes 07:05. 12:00 PM stays 12:00, and 12:00 AM becomes 00:00."],
  ["Is military time the same as the 24-hour clock?",
    "Almost. Military time is the 24-hour clock written without the colon and usually spoken digit by digit — 14:30 is written 1430 and said \"fourteen thirty\". A whole hour takes \"hundred hours\": 07:00 is 0700, said \"zero seven hundred hours\". The arithmetic is identical."],
  ["What is 12 AM and 12 PM in 24-hour time?",
    "12 AM is midnight, 00:00 — the start of the day. 12 PM is noon, 12:00. These are the only two conversions that surprise people, because 12 is the one hour that does not simply gain or lose twelve."],
  ["Is there a 24:00, and what about 00:00?",
    "Both exist and mean the same instant. 00:00 is midnight at the start of a day and 24:00 is midnight at its end, so 24:00 on Monday and 00:00 on Tuesday are the same moment. Clocks and timetables use 00:00; 24:00 appears mainly as an end boundary, as in \"open 00:00–24:00\"."],
  ["Which countries use the 24-hour clock?",
    "Most of the world uses it in writing — across Europe, Latin America and Asia — while the United States, Canada (outside Quebec), Australia, New Zealand and the Philippines mainly speak and write the 12-hour clock. Even there, the 24-hour clock is standard in aviation, the military, medicine, computing and public transport, because it cannot be misread."],
];

const HUB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>24-Hour Clock Converter — 12-Hour and Military Time</title>
<meta name="description" content="Convert between the 12-hour clock and the 24-hour clock (military time), both ways, with a full conversion chart, the rules for doing it in your head, and the midnight and noon traps. Free, no sign-up.">
<link rel="canonical" href="${SITE}${HUB}">
<meta property="og:title" content="12-Hour and 24-Hour Clock Converter">
<meta property="og:description" content="Convert between the 12-hour clock and the 24-hour clock (military time), both ways — with a full chart and the midnight and noon rules.">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "24-hour clock converter", url: HUB }])}</script>
${appLd({ name: "12-Hour and 24-Hour Clock Converter", url: `${SITE}${HUB}`, description: "Convert between the 12-hour clock and the 24-hour clock (military time) in either direction, with a full conversion chart." })}
${faqLd(HUB_FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "24-hour-clock-converter", url: HUB } })}
  <h1>12-Hour and 24-Hour Clock Converter</h1>
  <p class="sub">Set either clock and read the other. 14:30 is 2:30 PM, 9:45 PM is 21:45 &mdash; the minutes never move, only the hour and the AM/PM label.</p>

  <div class="card">
    ${convForm(14, 30)}
  </div>

  <div class="card tool-about">
    <h2>How to convert, in your head</h2>
    <p><strong>24-hour &rarr; 12-hour.</strong> Hours 13&ndash;23: subtract 12 and add PM (17:20 &rarr; 5:20 PM). Hours 01&ndash;11: keep the hour, add AM (08:05 &rarr; 8:05 AM). 12:00 is 12:00 PM. 00:00 is 12:00 AM.</p>
    <p><strong>12-hour &rarr; 24-hour.</strong> PM times from 1 to 11: add 12 (6:40 PM &rarr; 18:40). AM times: keep the hour and pad it to two digits (7:05 AM &rarr; 07:05). 12:00 PM stays 12:00. 12:00 AM becomes 00:00.</p>
    <p><strong>The two that catch everyone.</strong> Midnight and noon are the only hours that do not simply gain or lose twelve. <b>12 AM is 00:00</b> and <b>12 PM is 12:00</b>. If a page, a form or a colleague says "12 PM tonight", it is worth asking which one they mean — the 24-hour clock exists precisely so that question never has to be asked.</p>
    <p class="hint">Military time is this same 24-hour clock with the colon dropped and the digits spoken: 14:30 is written 1430 and said &ldquo;fourteen thirty&rdquo;; 07:00 is 0700, &ldquo;zero seven hundred hours&rdquo;.</p>
  </div>

  <div class="card">
    <h2>24-hour clock chart</h2>
    <p class="sub">Every hour, both ways. The right-hand column is the left-hand column plus twelve &mdash; that is the whole conversion.</p>
    ${hourChart()}
  </div>

  <div class="card">
    <h2>Convert a specific time</h2>
    <p class="sub">Every half hour has its own page, with the answer, how it is said aloud, and an alarm you can set for it.</p>
    <div class="timer-presets" style="margin-top:6px">${CONV_TIMES.map((t) =>
      `<a class="chip" href="${HUB}${t.slug}/">${esc(t.t24)}</a>`).join("")}</div>
  </div>

  <div class="card faq-card">
    <h2>Common questions</h2>
${HUB_FAQ.map(([q, a]) => `    <p><strong>${esc(q)}</strong><br>${esc(a)}</p>`).join("\n")}
  </div>

  <div class="more">
    <div class="more-label">Related tools</div>
    <div class="more-links">
      <a href="/time-difference-calculator/">Time difference calculator</a>
      <a href="/world-clock/">World clock</a>
      <a href="/alarm-clock/">Alarm clock</a>
      <a href="/timer/">Timer</a>
      <a href="/methodology/time-zones/">How time zones are handled</a>
    </div>
  </div>

${FOOTER}
</div>
${SCRIPT}
</body>
</html>
`;

mkdirSync(join(root, "24-hour-clock-converter"), { recursive: true });
writeFileSync(join(root, "24-hour-clock-converter/index.html"), HUB_HTML);

/* ---- one page per half hour ----------------------------------------------- */
/* the two hours either side, the same neighbour rule the alarm-time pages use —
 * somebody who wants 14:30 is far more likely to want 14:00 or 15:00 than 03:00 */
const mins = (t) => t.h * 60 + t.m;
const apart = (a, b) => { const d = Math.abs(mins(a) - mins(b)); return Math.min(d, 1440 - d); };

let n = 0;
for (const t of CONV_TIMES) {
  const url = `${HUB}${t.slug}/`;
  const near = CONV_TIMES.filter((x) => x.slug !== t.slug && apart(x, t) <= 120);
  const faq = [
    [`What is ${t.t24} in 12-hour time?`,
      `${t.t24} is ${t.disp}. The minutes are unchanged; ${t.h >= 13 ? `the hour is ${t.h} − 12 = ${t.h - 12}, and it takes PM` : t.h === 12 ? "the hour stays 12 and takes PM, because 12:00 is noon" : t.h === 0 ? "the hour 00 becomes 12 and takes AM, because 00:00 is midnight" : `the hour keeps its number and takes AM`}.`],
    [`What is ${t.disp} in 24-hour time?`,
      `${t.disp} is ${t.t24}, written ${t.hhmm} in military time.`],
    [`How do you say ${t.hhmm} out loud?`,
      `In military time it is said "${spoken24(t.h, t.m)}". On a 12-hour clock the same moment is "${spoken12(t.h, t.m)}".`],
  ];
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.t24)} in 12-Hour Time &mdash; ${esc(t.disp)}</title>
<meta name="description" content="${esc(t.t24)} on the 24-hour clock is ${esc(t.disp)}. Written ${t.hhmm} in military time and said &quot;${esc(spoken24(t.h, t.m))}&quot;. Convert any other time both ways, free and with no sign-up.">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${esc(t.t24)} is ${esc(t.disp)}">
<meta property="og:description" content="${esc(t.t24)} on the 24-hour clock is ${esc(t.disp)} — ${t.hhmm} in military time.">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "24-hour clock converter", url: HUB }, { name: `${t.t24} in 12-hour time`, url }])}</script>
${appLd({ name: `${t.t24} in 12-Hour Time`, url: `${SITE}${url}`, description: `${t.t24} on the 24-hour clock is ${t.disp}, written ${t.hhmm} in military time.` })}
${faqLd(faq)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "24-hour-clock-converter", url: HUB }, sub: { slug: t.slug, url } })}
  <h1>${esc(t.t24)} in 12-Hour Time</h1>
  <p class="cv-ans">${esc(t.t24)} is <b>${esc(t.disp)}</b>.</p>
  <p class="sub">Written <strong>${t.hhmm}</strong> in military time and said &ldquo;${esc(spoken24(t.h, t.m))}&rdquo;. Going the other way, ${esc(t.disp)} is ${esc(t.t24)}.</p>
  <p class="tool-uses">The ${p2(t.h)}:00 hour is ${HOUR_NOTE[t.h]}.</p>

  <div class="card">
    ${convForm(t.h, t.m)}
  </div>

  <div class="card tool-about">
    ${clockFace(t.h, t.m, { size: 150 })}
    <h2>Why ${esc(t.t24)} converts the way it does</h2>
    <p>${ruleFor(t.h)}</p>
    <p>The minutes are the same on both clocks &mdash; ${t.m === 0 ? "a whole hour stays a whole hour" : `the :${p2(t.m)} never moves`} &mdash; and ${esc(t.t24)} is ${partOfDay(t.h)}, which is the information the AM/PM label is carrying.</p>
    <p class="hint">Need this time to actually do something? <a href="/alarm-clock/${t.alarmSlug}/">Set an alarm for ${esc(t.disp)}</a>, or use the <a href="/timer/">timer</a> to count a length of time instead of waiting for a clock time.</p>
  </div>

  <div class="card">
    <h2>Nearby times</h2>
    <div class="timer-presets" style="margin-top:6px">${near.map((x) =>
      `<a class="chip" href="${HUB}${x.slug}/">${esc(x.t24)}</a>`).join("")}<a class="chip" href="${HUB}">Full 24-hour chart &rarr;</a></div>
  </div>

  <div class="card faq-card">
    <h2>Common questions</h2>
${faq.map(([q, a]) => `    <p><strong>${esc(q)}</strong><br>${esc(a)}</p>`).join("\n")}
  </div>

${FOOTER}
</div>
${SCRIPT}
</body>
</html>
`;
  mkdirSync(join(root, "24-hour-clock-converter", t.slug), { recursive: true });
  writeFileSync(join(root, "24-hour-clock-converter", t.slug, "index.html"), html);
  n++;
}

console.log(`Generated ${HUB} + ${n} per-time conversion pages.`);
