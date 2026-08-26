#!/usr/bin/env node
/* build-calendar.mjs — one calendar for every countdown on the site, grouped by
 * month, with All / per-category filter chips (filtered client-side). Each event
 * shows its next occurrence, so recurring events appear once within the coming
 * year. Order self-refreshes on every rebuild (roll-dates keeps dates current).
 *   node seo/tools/build-calendar.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, nextOccurrence, iso, loadEvents } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const popular = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
const events = loadEvents(readFileSync, join, root);

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/* category display order from the curated config */
const catOrder = popular.categories.map((c) => ({ id: c.id, nav: c.nav }));

/* every event with a resolvable next date */
const rows = [];
for (const e of events) {
  const d = nextOccurrence(e);
  if (!d) continue;
  rows.push({
    label: e.label || e.name,
    url: e.urlPath,
    date: d,
    key: iso(d).slice(0, 7),
    day: d.getUTCDate(),
    catId: e.category.id,
    cat: e.category.nav,
  });
}
rows.sort((a, b) => a.date - b.date);

/* group into months in chronological order */
const months = [];
const seen = new Map();
for (const r of rows) {
  if (!seen.has(r.key)) {
    const g = { key: r.key, label: `${MONTHS[r.date.getUTCMonth()]} ${r.date.getUTCFullYear()}`, items: [] };
    seen.set(r.key, g);
    months.push(g);
  }
  seen.get(r.key).items.push(r);
}

/* only categories that actually appear, in curated order */
const present = catOrder.filter((c) => rows.some((r) => r.catId === c.id));
const chips = `<button class="chip active" type="button" data-cat="all">All events</button>`
  + present.map((c) => `<button class="chip" type="button" data-cat="${esc(c.id)}">${esc(c.nav)}</button>`).join("");

const monthCards = months.map((m) => `  <div class="card cal-month" data-month="${m.key}">
    <h2>${esc(m.label)}</h2>
    <ul class="toplist">
${m.items.map((r) =>
  `      <li data-cat="${esc(r.catId)}"><a href="${esc(r.url)}"><span class="cal-day">${r.day}</span>${esc(r.label)}</a><span class="when cal-badge">${esc(r.cat)}</span></li>`
).join("\n")}
    </ul>
  </div>`).join("\n\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Events Calendar: Every Countdown by Month | Time and Space Science</title>
<meta name="description" content="Browse every countdown on Time and Space Science by month — celebrity birthdays, holidays, sports, parties and more. Filter by category to see what's coming up.">
<link rel="canonical" href="${SITE}/calendar/">
<meta property="og:title" content="Events Calendar — every countdown by month">
<meta property="og:description" content="See what's coming up: celebrity birthdays, holidays, sports and parties, all on one calendar.">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/img/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="alternate" type="text/calendar" href="/calendar/events.ics" title="Time and Space Science events calendar">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Events Calendar", url: "/calendar/" }])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "calendar", url: "/calendar/" } })}
  <h1>Events Calendar</h1>
  <p class="sub">Every countdown on the site, by month. Filter to a category, or browse them all to see what's coming up.</p>
  <div class="cal-filters" id="cal-filters">${chips}</div>

${monthCards}

  <div class="card">
    <h2>Subscribe to this calendar</h2>
    <p>Every date on this page as a calendar feed: <a href="/calendar/events.ics">events.ics</a>. Add it once and the ${rows.length} countdowns below appear in Google Calendar, Apple Calendar or Outlook as all-day entries, each linking back to its own page.</p>
    <p class="hint">The file is regenerated with the site, so a date that rolls to next year rolls in the feed too. In Google Calendar: Other calendars → From URL → <code>${SITE}/calendar/events.ics</code>.</p>
  </div>

  <div class="more">
    <div class="more-label">Browse another way</div>
    <div class="more-links">
      <a href="/countdown/">All countdowns</a>
      <a href="/countries/">Countdowns by country</a>
      <a href="/popular/">Most-watched</a>
      <a href="/trending/">Trending</a>
    </div>
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>
(function(){var f=document.getElementById('cal-filters');if(!f)return;var rows=[].slice.call(document.querySelectorAll('.cal-month li[data-cat]')),months=[].slice.call(document.querySelectorAll('.cal-month'));f.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;var cat=b.getAttribute('data-cat');[].forEach.call(f.querySelectorAll('.chip'),function(x){x.classList.toggle('active',x===b);});rows.forEach(function(li){li.style.display=(cat==='all'||li.getAttribute('data-cat')===cat)?'':'none';});months.forEach(function(m){var any=[].some.call(m.querySelectorAll('li[data-cat]'),function(li){return li.style.display!=='none';});m.style.display=any?'':'none';});});})();
</script>
</body>
</html>
`;

/* ---- the same dates as a subscribable feed -------------------------------
 * Not a rich-result play — there is no calendar rich result. It is a linkable
 * artefact: "free countdown calendar feed" is the kind of thing roundups and
 * teacher-resource pages link to, and the data to build it is already here.
 *
 * Deliberately plain: all-day VEVENTs (these are dates, not appointments, and
 * pinning them to a time would be wrong for every reader outside one zone), a
 * stable UID per event so a re-subscribe updates rather than duplicates, and no
 * alarms — nobody subscribing to a countdown calendar wants 118 notifications.
 * DTSTAMP is the run time, which is what iCalendar means by it. */
const icsEsc = (t) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (d) => iso(d).slice(0, 10).replace(/-/g, "");
/* RFC 5545 says lines are folded at 75 octets, continued with one leading
   space. Google and Apple both reject or truncate a long unfolded line. */
const fold = (line) => {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 73) return line;
  const out = [];
  let cur = Buffer.alloc(0);
  for (const ch of [...line]) {
    const b = Buffer.from(ch, "utf8");
    if (cur.length + b.length > (out.length ? 72 : 73)) { out.push(cur.toString("utf8")); cur = Buffer.alloc(0); }
    cur = Buffer.concat([cur, b]);
  }
  out.push(cur.toString("utf8"));
  return out[0] + out.slice(1).map((x) => `\r\n ${x}`).join("");
};
const stamp = `${iso(new Date()).slice(0, 10).replace(/-/g, "")}T000000Z`;
const ics = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//timeandspace.science//Events Calendar//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  `X-WR-CALNAME:${icsEsc("Time and Space Science countdowns")}`,
  `X-WR-CALDESC:${icsEsc("Holidays, celebrity birthdays, sports and other dates counted down on Time and Space Science.")}`,
  "X-PUBLISHED-TTL:PT24H",
  ...rows.flatMap((r) => {
    const end = new Date(r.date.getTime() + 86400000);   /* DTEND is exclusive */
    return [
      "BEGIN:VEVENT",
      `UID:${r.url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}@timeandspace.science`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(r.date)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      fold(`SUMMARY:${icsEsc(r.label)}`),
      fold(`DESCRIPTION:${icsEsc(`Countdown: ${SITE}${r.url}`)}`),
      fold(`URL:${SITE}${r.url}`),
      `CATEGORIES:${icsEsc(r.cat)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ];
  }),
  "END:VCALENDAR",
].join("\r\n") + "\r\n";

mkdirSync(join(root, "calendar"), { recursive: true });
writeFileSync(join(root, "calendar/index.html"), html);
writeFileSync(join(root, "calendar/events.ics"), ics);
console.log(`Generated calendar (${rows.length} events across ${months.length} months) + events.ics.`);
