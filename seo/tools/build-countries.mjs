#!/usr/bin/env node
/* build-countries.mjs — per-country event pages at /countries/<code>/ plus a
 * /countries/ hub, from seo/_data/countries.json. Same link rules as the
 * popular-countdown lists; links prefer rich landing pages when they exist.
 *
 *   node seo/tools/build-countries.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, faqLd, when, richMap, loadEvents, nextOccurrence, iso } from "./lib.mjs";
import { flag } from "./flags.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const { countries } = JSON.parse(readFileSync(join(root, "seo/_data/countries.json"), "utf8"));
const events = loadEvents(readFileSync, join, root);
const rich = richMap(events);

const shell = (title, desc, canonical, body, nav = {}) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Time and Space Science</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${nav.extraLd || ""}<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "countries", url: "/countries/" }, ...(nav.page ? [{ name: nav.page.label, url: nav.page.url }] : [])]).replace(/</g, "\\u003c")}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "countries", url: "/countries/" }, page: nav.page || null })}
${body}
  <p class="footer"><a href="/countries/">All countries</a> · <a href="/wrong-date/?url=${encodeURIComponent(canonical)}">Wrong date?</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

/* The 9 country pages were the thinnest section on the site (~237 words, no H2,
 * no FAQ). Everything added here is DERIVED from countries.json — the sorted
 * date list, the next-up answer line, day-of-week facts and the FAQ all come
 * from data the page already links to, so nothing can drift or be invented.
 * Baked "days until" figures stay fresh the same way the rest of the site's
 * do: roll-dates keeps every date in the future and the hourly rebuild
 * re-bakes the numbers. */
const DAY_MS = 86400000;
const longDate = (d) => new Intl.DateTimeFormat("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
const daysUntil = (d) => Math.max(0, Math.ceil((Date.parse(d + "T00:00:00Z") - Date.now()) / DAY_MS));

/* "type[/slug]" -> the event's own resolved next date, exactly as the category
 * hubs do it. The static `date` in countries.json only rolls for fixed-date
 * events (roll-dates), so a movable feast — or any date that has simply passed
 * — would otherwise be rendered as upcoming forever. The rich date wins; the
 * curated date is the fallback for events with no landing page. */
const richDate = new Map();
for (const e of events) {
  const d = e.once || (nextOccurrence(e) ? iso(nextOccurrence(e)) : null);
  if (d) richDate.set(e.slug ? `${e.type}/${e.slug}` : e.type, d);
}
const richKey = (c, l) => (l.slug ? `${l.path || c.path}/${l.slug}` : (l.path || c.path));
const dateFor = (c, l) => richDate.get(richKey(c, l)) || l.date;

/* The custom-countdown product is retired, so there is no dynamic URL to fall
 * back to: an event with no landing page is rendered as plain text with its
 * date, never as a link to a page that does not exist. */
const urlFor = (c, l) => l.url || rich.get(richKey(c, l)) || null;
const linkOrText = (c, l, text) => {
  const u = urlFor(c, l);
  return u ? `<a href="${esc(u)}">${esc(text)}</a>` : esc(text);
};

function countryPage(c) {
  const sorted = [...c.events].sort((a, b) => dateFor(c, a).localeCompare(dateFor(c, b)));
  const next = sorted[0];
  const nextDate = dateFor(c, next);
  const items = sorted.map((l) =>
    `      <li>${linkOrText(c, l, l.label)}<span class="when">${when(dateFor(c, l))}</span></li>`
  ).join("\n");
  const others = countries.filter((x) => x.code !== c.code)
    .map((x) => `<a href="/countries/${x.code}/">${flag(x.code) || x.flag} ${esc(x.name)}</a>`).join("\n      ");
  const nextDays = daysUntil(nextDate);
  const nextHasPage = !!urlFor(c, next);
  const faq = [
    [`What is the next holiday in ${c.name}?`,
     `${next.label} is next — ${longDate(nextDate)}, ${nextDays === 0 ? "today" : `${nextDays} day${nextDays === 1 ? "" : "s"} from now`}. After that: ${sorted.slice(1, 3).map((l) => `${l.label} (${when(dateFor(c, l))})`).join(", ")}.`],
    [`How many days until ${next.label}?`,
     `${nextDays === 0 ? `${next.label} is today` : `${nextDays} day${nextDays === 1 ? "" : "s"} until ${next.label}`} — it falls on ${longDate(nextDate)}.${nextHasPage ? " Open its countdown for a live clock counting down the days, hours, minutes and seconds." : ""}`],
    ["Do these dates stay current?",
     `Yes. Each date rolls forward automatically once it passes, so this page always shows the NEXT ${next.label} and every other upcoming date — nothing here goes stale.`],
    ["Can I share one of these countdowns?",
     "Events with their own countdown page are linked above — share that link and everyone sees the same live countdown to the same moment."],
  ];
  const body = `  <h1><span class="h1-flag">${flag(c.code) || c.flag}</span> Countdowns in ${esc(c.name)}</h1>
  <p class="sub">${esc(c.desc)}</p>
  <div class="card cd-answer">
    <p><strong>Next up in ${esc(c.name)}:</strong> ${linkOrText(c, next, next.label)} on ${longDate(nextDate)} — ${nextDays === 0 ? "that's today" : `${nextDays} day${nextDays === 1 ? "" : "s"} away`}.</p>
  </div>
  <div class="card">
    <h2>Upcoming holidays &amp; events in ${esc(c.name)}</h2>
    <ul class="toplist">
${items}
    </ul>
    <p class="hint">Dates are the observed calendar dates in ${esc(c.name)}. Linked events open a live, shareable countdown.</p>
  </div>
  <div class="card faq-card">
    <h2>${esc(c.name)} countdown FAQ</h2>
    ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n    ")}
  </div>
  <div class="more">
    <div class="more-label">Other countries</div>
    <div class="more-links">
      ${others}
    </div>
  </div>`;
  return shell(`${c.name} Holiday & Event Countdowns`, c.desc,
    `${SITE}/countries/${c.code}/`, body,
    { page: { label: c.name, url: `/countries/${c.code}/` }, extraLd: faqLd(faq) + "\n" });
}

function hubPage() {
  const items = countries.map((c) =>
    `      <li><a href="/countries/${c.code}/">${flag(c.code) || c.flag} ${esc(c.name)}</a><span class="when">${c.events.length} events</span></li>`
  ).join("\n");
  const body = `  <h1>Countdowns by country</h1>
  <p class="sub">National holidays and celebrations around the world, each with a live shareable countdown.</p>
  <div class="card">
    <ul class="toplist">
${items}
    </ul>
  </div>`;
  return shell("Event Countdowns by Country", "Live countdowns to national holidays and celebrations around the world.",
    `${SITE}/countries/`, body);
}

mkdirSync(join(root, "countries"), { recursive: true });
writeFileSync(join(root, "countries", "index.html"), hubPage());
for (const c of countries) {
  mkdirSync(join(root, "countries", c.code), { recursive: true });
  writeFileSync(join(root, "countries", c.code, "index.html"), countryPage(c));
}
console.log(`Generated ${countries.length} country pages + the /countries/ hub.`);
