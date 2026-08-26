#!/usr/bin/env node
/* build-trending.mjs — "Hottest countdowns right now" page (/trending/).
 * Companion to build-popular.mjs: where /popular/ ranks by all-time views, this
 * ranks by the last 7 days of views (momentum).
 *
 * Ranking used to be fetched live from /api/trending by a client-side script
 * on every single visit, which fans out to a full scan of the VIEWS KV
 * namespace — that scaled KV read cost with traffic to this one page. Now the
 * ranking is fetched ONCE, here, at build time, and baked directly into the
 * static HTML. The nightly Cloudflare Pages rebuild already triggered by
 * .github/workflows/maintenance.yml (CF_DEPLOY_HOOK) is what keeps these
 * counts current — "as of last night," not live-updating through the day.
 * If the build-time fetch fails (no network — a local/offline build), the
 * page falls back to its original list: soonest-upcoming-first, no counts.
 * Run before build-inline.
 *   node seo/tools/build-trending.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, nextOccurrence, iso, loadEvents, viewHash, when } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const events = loadEvents(readFileSync, join, root);

async function fetchRanking(pathAndQuery) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SITE}${pathAndQuery}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) { console.warn(`! ${pathAndQuery} returned ${res.status} at build time — falling back to the next 30 days`); return null; }
    const data = await res.json();
    return (data && data.ok && Array.isArray(data.ranked) && data.ranked.length) ? data.ranked : null;
  } catch (err) {
    console.warn(`! could not fetch ${pathAndQuery} at build time (${err.message}) — falling back to the next 30 days`);
    return null;
  }
}
const ranking = await fetchRanking("/api/trending?n=200");

const baseRows = events.map((e) => {
  const d = nextOccurrence(e);
  return { id: viewHash(e.urlPath), label: e.label || e.name, url: e.urlPath, cat: e.category.nav, date: d ? iso(d) : "9999" };
}).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

/* Ranked rows (by last-7-days views, in ranking order) first, then everything
 * else in its original upcoming-date order, so the page is never empty. */
function applyRanking(rows, ranked) {
  if (!ranked) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set();
  const out = [];
  let rank = 1;
  for (const it of ranked) {
    const r = byId.get(it.id);
    if (!r) continue;
    out.push({ ...r, rank: rank++, views: it.count });
    seen.add(it.id);
  }
  for (const r of rows) if (!seen.has(r.id)) out.push(r);
  return out;
}
/* WITHOUT A RANKING, THIS PAGE NARROWS RATHER THAN REPEATING /popular/. Both
 * used to fall back to the same complete date-ordered list, differing by an H1
 * — two indexable pages saying the same thing. "Trending" without view counts
 * is best answered by what is actually imminent, so the fallback is the next
 * 30 days (widened to a floor of 20 rows so a quiet month is not an empty
 * page). /popular/ falls back to the curated picks instead. */
const HORIZON_DAYS = 30, FLOOR = 20;
function applyHorizon(rows) {
  const cut = Date.now() + HORIZON_DAYS * 86400000;
  const soon = rows.filter((r) => r.date !== "9999" && Date.parse(`${r.date}T00:00:00Z`) <= cut);
  return soon.length >= FLOOR ? soon : rows.slice(0, FLOOR);
}
const rows = ranking ? applyRanking(baseRows, ranking) : applyHorizon(baseRows);

/* every row carries the event's real date and days-away, in all states — see
   the same change in build-popular.mjs for why */
const DAY_MS = 86400000;
const awayText = (isoDate) => {
  if (!isoDate || isoDate === "9999") return "";
  const d = Math.max(0, Math.ceil((Date.parse(isoDate + "T00:00:00Z") - Date.now()) / DAY_MS));
  return d === 0 ? "today" : d === 1 ? "tomorrow" : `${d} days`;
};
const listItems = rows.map((r) => {
  const ranked = r.rank != null;
  const views = ranked ? `${r.views.toLocaleString()}${r.views === 1 ? " view this week" : " views this week"}` : "";
  const away = awayText(r.date);
  const meta = away ? `${r.cat} · ${when(r.date)} · ${away}` : r.cat;
  return `      <li data-id="${r.id}"${ranked ? ' class="ranked"' : ""}><span class="rank">${ranked ? r.rank : ""}</span><a href="${esc(r.url)}">${esc(r.label)}</a><span class="when">${esc(meta)}</span><span class="views"${views ? "" : " hidden"}>${esc(views)}</span></li>`;
}).join("\n");
const note = ranking
  ? "Ranked by views over the last 7 days — refreshed nightly. Each row shows the event's date and how far away it is."
  : `View counts aren't available for this build, so this is the next ${HORIZON_DAYS} days instead — the countdowns closest to happening, with the date and how far away each is. When the week's view counts return they lead the ranking instead. For the all-time list, see the most-watched page.`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trending Countdowns — Most Viewed This Week | Time and Space Science</title>
<meta name="description" content="The hottest countdowns on Time and Space Science, ranked by views over the last 7 days — see which celebrity birthdays, holidays and events everyone is watching.">
<link rel="canonical" href="${SITE}/trending/">
<meta property="og:title" content="Trending Countdowns — Most Viewed This Week">
<meta property="og:description" content="The hottest countdowns, ranked by views over the last 7 days.">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/img/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Trending Countdowns", url: "/trending/" }])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "trending", url: "/trending/" } })}
  <h1>Trending Countdowns</h1>
  <p class="sub" id="pop-note">${esc(note)}</p>
  <div class="card">
    <ul class="toplist rank-list" id="pop-list">
${listItems}
    </ul>
  </div>
  <div class="more">
    <div class="more-links"><a href="/popular/">Most-watched all-time →</a></div>
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

mkdirSync(join(root, "trending"), { recursive: true });
writeFileSync(join(root, "trending/index.html"), html);
console.log(`Generated trending page (${rows.length} events).${ranking ? "" : " (no ranking data — build-time fetch unavailable)"}`);
