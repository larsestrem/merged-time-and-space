#!/usr/bin/env node
/* build-popular.mjs — "Most-watched countdowns" pages. Ranking used to be
 * fetched live from /api/popular by a client-side script on every single
 * visit — but that endpoint lists the entire VIEWS KV namespace and does one
 * KV read per event to total its count, so every visitor to /popular/ (or any
 * /<hub>/popular/ page) fanned out to hundreds of KV reads. That scaled KV
 * cost with traffic, which is exactly what pushed us toward the daily KV
 * operation limit.
 *
 * Now the ranking is fetched ONCE, here, at build time, and baked directly
 * into the static HTML — no client JS, no per-visitor KV reads at all. The
 * only remaining rank/view-count refresh comes from the nightly Cloudflare
 * Pages rebuild already triggered by .github/workflows/maintenance.yml (see
 * CF_DEPLOY_HOOK there), so counts are "as of last night" rather than
 * "live" — see docs/PROGRESS.md for that trade-off.
 *
 * If the build-time fetch fails (e.g. no network — a local/offline build),
 * the page falls back to its original no-ranking behavior: a complete list
 * sorted soonest-upcoming-first, so the page is always useful and never
 * empty either way.
 *
 * Generates the site-wide /popular/ page AND one per category at
 * /<hub>/popular/ (e.g. /birthday-countdowns/popular/ = "Most Popular Celebrity
 * Birthdays"), filtered to that category. Run before build-inline.
 *   node seo/tools/build-popular.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, nextOccurrence, iso, loadEvents, viewHash, when } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const popular = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
const events = loadEvents(readFileSync, join, root);

/* Friendly subject for each category's "Most Popular …" heading. */
const POP_LABEL = {
  birthdays: "Celebrity Birthdays", holidays: "Holidays", politics: "Political Events",
  sports: "Sports Events", entertainment: "Movies, Games & Shows",
  parties: "Parties & Celebrations", astronomy: "Sky & Space Events",
  anniversaries: "Famous Anniversaries", graduations: "Graduations",
};

/* One build-time fetch of the whole ranking (n=200 comfortably covers the
 * catalogue); every page below (site-wide + each category) reuses this same
 * array and just filters to whichever ids are on that page. `null` on any
 * failure/timeout — callers fall back to unranked order. */
async function fetchRanking(pathAndQuery) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SITE}${pathAndQuery}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) { console.warn(`! ${pathAndQuery} returned ${res.status} at build time — falling back to curated-picks order`); return null; }
    const data = await res.json();
    return (data && data.ok && Array.isArray(data.ranked) && data.ranked.length) ? data.ranked : null;
  } catch (err) {
    console.warn(`! could not fetch ${pathAndQuery} at build time (${err.message}) — falling back to curated-picks order`);
    return null;
  }
}
const ranking = await fetchRanking("/api/popular?n=200");

function rowsFor(list) {
  return list.map((e) => {
    const d = nextOccurrence(e);
    return { id: viewHash(e.urlPath), label: e.label || e.name, url: e.urlPath, cat: e.category.nav, date: d ? iso(d) : "9999" };
  }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
/* THE FALLBACK IS NOT DATE ORDER ANY MORE. When the ranking fetch fails, this
 * page and /trending/ both used to emit the same list — every event, soonest
 * first — so the two differed by an H1 and one sentence, which is a
 * near-duplicate pair on two indexable pages. They now fall back to different
 * things, each of which is the honest answer to that page's own question:
 * /popular/ (all-time) leads with the CURATED picks from
 * popular-countdowns.json — a hand-made "these are the ones people want" list,
 * which is what an all-time chart approximates — and /trending/ (this week)
 * narrows to what is imminent. Neither pretends to be a view count. */
const CURATED_ORDER = (() => {
  const order = new Map();
  let i = 0;
  for (const c of popular.categories)
    for (const l of [...(c.links || []), ...(c.more || [])])
      if (l && l.slug && !order.has(`/${c.hub}/${l.slug}/`)) order.set(`/${c.hub}/${l.slug}/`, i++);
  return order;
})();
function applyCurated(rows) {
  const picked = rows.filter((r) => CURATED_ORDER.has(r.url))
    .sort((a, b) => CURATED_ORDER.get(a.url) - CURATED_ORDER.get(b.url));
  const rest = rows.filter((r) => !CURATED_ORDER.has(r.url));
  return [...picked, ...rest];
}

/* Reproduces the old client-side reorder logic, but once, at build time:
 * ranked rows (in ranking order) come first, everything else keeps its
 * original upcoming-date order after them. */
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
/* Every row carries its event's real date and how far away it is, in ALL
 * states. Before, an unranked row was a bare label and a category name, and
 * when the view counts were unavailable the whole page was that — a list of
 * links under a note apologising for itself, duplicating /countdown/'s job. The
 * date is the thing a countdown list is actually for, and it is information the
 * page already had in hand. */
const DAY_MS = 86400000;
const awayText = (isoDate) => {
  if (!isoDate || isoDate === "9999") return "";
  const d = Math.max(0, Math.ceil((Date.parse(isoDate + "T00:00:00Z") - Date.now()) / DAY_MS));
  return d === 0 ? "today" : d === 1 ? "tomorrow" : `${d} days`;
};
const listItemsFor = (rows) => rows.map((r) => {
  const ranked = r.rank != null;
  const views = ranked ? `${r.views.toLocaleString()}${r.views === 1 ? " view" : " views"}` : "";
  const away = awayText(r.date);
  const meta = away ? `${r.cat} · ${when(r.date)} · ${away}` : r.cat;
  return `      <li data-id="${r.id}"${ranked ? ' class="ranked"' : ""}><span class="rank">${ranked ? r.rank : ""}</span><a href="${esc(r.url)}">${esc(r.label)}</a><span class="when">${esc(meta)}</span><span class="views"${views ? "" : " hidden"}>${esc(views)}</span></li>`;
}).join("\n");
const NOTE_RANKED = "Ranked by total views — refreshed nightly. Each row shows the event's date and how far away it is.";
const NOTE_FALLBACK = "View counts aren't available for this build, so this is the editor's pick order — the countdowns chosen for the category pages, first, then everything else by date. Each row shows the event's date and how far away it is. When view counts return they lead the ranking instead.";

function pageHtml({ title, desc, canonical, crumb, breadcrumb, h1, sub, listItems, ogImage = "/assets/img/og-default.png", footerExtra = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(h1)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, breadcrumb)}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb })}
  <h1>${esc(h1)}</h1>
  <p class="sub" id="pop-note">${esc(sub)}</p>
  <div class="card">
    <ul class="toplist rank-list" id="pop-list">
${listItems}
    </ul>
  </div>${footerExtra}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
}

/* ---- site-wide page ---- */
writeFileSync(join(root, "popular/index.html"), pageHtml({
  title: "Most Popular Countdowns — Ranked by Views | Time and Space Science",
  desc: "The most-watched countdowns on Time and Space Science right now, ranked by views — see which celebrity birthdays, holidays and events everyone is counting down to.",
  canonical: `${SITE}/popular/`,
  crumb: { slug: "popular", url: "/popular/" },
  breadcrumb: [{ name: "Time and Space Science", url: "/" }, { name: "Most-Watched Countdowns", url: "/popular/" }],
  h1: "Most-Watched Countdowns",
  sub: ranking ? NOTE_RANKED : NOTE_FALLBACK,
  listItems: listItemsFor(ranking ? applyRanking(rowsFor(events), ranking) : applyCurated(rowsFor(events))),
  /* /trending/ links here; this never linked back. The two pages answer
     different questions — all-time vs the last seven days — so say which. */
  footerExtra: `
  <div class="more">
    <div class="more-label">Browse another way</div>
    <div class="more-links"><a href="/trending/">Trending this week →</a><a href="/calendar/">Full event calendar</a><a href="/countdown/">All countdowns</a></div>
  </div>`,
}));

/* ---- one page per category ---- */
let cats = 0;
for (const c of popular.categories) {
  const catEvents = events.filter((e) => e.category && e.category.id === c.id);
  if (!catEvents.length) continue;
  const label = POP_LABEL[c.id] || c.nav;
  const more = `
  <div class="more">
    <div class="more-links"><a href="/${c.hub}/">All ${esc(c.nav.toLowerCase())} →</a><a href="/popular/">All most-watched →</a></div>
  </div>`;
  mkdirSync(join(root, c.hub, "popular"), { recursive: true });
  writeFileSync(join(root, c.hub, "popular/index.html"), pageHtml({
    title: `Most Popular ${label} | Time and Space Science`,
    desc: `The most-watched ${label.toLowerCase()} countdowns on Time and Space Science right now, ranked by views.`,
    canonical: `${SITE}/${c.hub}/popular/`,
    crumb: { slug: c.hub, url: `/${c.hub}/` },
    breadcrumb: [{ name: "Time and Space Science", url: "/" }, { name: c.nav, url: `/${c.hub}/` }, { name: `Most Popular ${label}`, url: `/${c.hub}/popular/` }],
    h1: `Most Popular ${label}`,
    sub: ranking ? NOTE_RANKED : NOTE_FALLBACK,
    listItems: listItemsFor(ranking ? applyRanking(rowsFor(catEvents), ranking) : applyCurated(rowsFor(catEvents))),
    footerExtra: more,
  }));
  cats++;
}
console.log(`Generated most-watched page (${events.length} events) + ${cats} per-category popular pages.${ranking ? "" : " (no ranking data — build-time fetch unavailable)"}`);
