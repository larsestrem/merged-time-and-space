#!/usr/bin/env node
/* build-category-pages.mjs — one hub page per popular-countdown category
 * (e.g. /birthdays/ = "Popular Celebrity Birthday Countdowns") showing the
 * FULL list (home shows only the first `homeCount`). Links prefer a rich
 * landing page (events.json) when one exists.
 *
 *   node seo/tools/build-category-pages.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, hrefFor, when, richMap, loadEvents, viewHash, nextOccurrence, iso, syncLabelYear } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const popular = JSON.parse(readFileSync(join(root, "seo/_data/popular-countdowns.json"), "utf8"));
const events = loadEvents(readFileSync, join, root);
const rich = richMap(events);

/* richKey ("type[/slug]") -> the event's actual next date, so a hub list shows
 * the same date as the event page (and auto-tracks roll-dates / the SpaceX
 * updater) instead of the static date hand-entered in popular-countdowns. */
const richDate = new Map();
for (const e of events) {
  const d = e.once || (nextOccurrence(e) ? iso(nextOccurrence(e)) : null);
  if (d) richDate.set(e.slug ? `${e.type}/${e.slug}` : e.type, d);
}
const dateFor = (l, cat) => richDate.get(l.slug ? `${l.path || cat.path}/${l.slug}` : (l.path || cat.path)) || l.date;

function page(cat) {
  /* default order: soonest upcoming first (sortable by Name/Date in the page) */
  const all = [...cat.links, ...(cat.more || [])]
    .slice().sort((a, b) => (dateFor(a, cat) || "9999") < (dateFor(b, cat) || "9999") ? -1 : (dateFor(a, cat) || "9999") > (dateFor(b, cat) || "9999") ? 1 : 0);
  const items = all.map((l) => {
    const dt = dateFor(l, cat);
    const label = syncLabelYear(l.label, dt);
    return `      <li data-name="${esc(label.toLowerCase())}" data-date="${esc(dt)}"><a href="${esc(hrefFor(cat, l, rich))}">${esc(label)}</a><span class="when">${when(dt)}</span></li>`;
  }).join("\n");
  const others = popular.categories.filter((c) => c.id !== cat.id)
    .map((c) => `<a href="/${c.hub}/">${esc(c.nav)}</a>`).join("\n      ");

  /* Live "most-watched in this category" strip — same component as the home
   * page, but the id->event map holds only this category's rich pages, so the
   * shared /api/popular leaderboard is auto-filtered to this category. */
  const catEvents = events.filter((e) => e.urlPath.startsWith(`/${cat.hub}/`));
  const viewsMap = {};
  for (const e of catEvents) viewsMap[viewHash(e.urlPath)] = { l: e.label || e.name, u: e.urlPath };
  const mwCard = catEvents.length ? `
  <div class="card mw-card" id="mw-card" hidden>
    <h2>🔥 Most-watched ${esc(cat.nav.toLowerCase())}</h2>
    <ul class="toplist rank-list" id="mw-list"></ul>
    <a class="more-cta" href="/${cat.hub}/popular/">See all most-watched ${esc(cat.nav.toLowerCase())} →</a>
  </div>
` : "";
  const mwScript = catEvents.length ? `
<script>
window.AC_VIEWS=${JSON.stringify(viewsMap)};
(function(){var card=document.getElementById('mw-card'),list=document.getElementById('mw-list'),map=window.AC_VIEWS||{};if(!card||!list)return;fetch('/api/popular?n=200').then(function(r){return r.ok?r.json():null;}).then(function(d){if(!d||!d.ok||!d.ranked)return;var rank=1,added=0;for(var i=0;i<d.ranked.length&&added<6;i++){var it=d.ranked[i],ev=map[it.id];if(!ev)continue;var li=document.createElement('li'),rk=document.createElement('span'),a=document.createElement('a'),v=document.createElement('span');rk.className='rank';rk.textContent=rank++;a.href=ev.u;a.textContent=ev.l;v.className='when';v.textContent=it.count.toLocaleString()+(it.count===1?' view':' views');li.appendChild(rk);li.appendChild(a);li.appendChild(v);list.appendChild(li);added++;}if(added)card.hidden=false;})['catch'](function(){});})();
</script>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cat.hubTitle)} | Time and Space Science</title>
<meta name="description" content="${esc(cat.hubDesc)}">
<link rel="canonical" href="${SITE}/${cat.hub}/">
<meta property="og:title" content="${esc(cat.hubTitle)}">
<meta property="og:description" content="${esc(cat.hubDesc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: cat.nav, url: `/${cat.hub}/` }]).replace(/</g, "\\u003c")}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: cat.hub, url: `/${cat.hub}/` } })}
  <h1>${esc(cat.hubTitle)}</h1>
  <p class="sub">${esc(cat.hubDesc)}</p>
  <div class="card">
    <div class="list-head"><button class="sortbtn" type="button" data-k="name">Name</button><button class="sortbtn" type="button" data-k="date" data-dir="asc">Date</button></div>
    <ul class="toplist" id="cat-list">
${items}
    </ul>
  </div>
${mwCard}
  <script>(function(){var L=document.getElementById("cat-list");if(!L)return;var items=[].slice.call(L.children);var st={k:"date",d:1};
    Array.prototype.forEach.call(document.querySelectorAll(".sortbtn"),function(b){b.addEventListener("click",function(){
      var k=b.getAttribute("data-k");st.d=(st.k===k)?-st.d:1;st.k=k;
      Array.prototype.forEach.call(document.querySelectorAll(".sortbtn"),function(x){x.removeAttribute("data-dir");});
      b.setAttribute("data-dir",st.d>0?"asc":"desc");
      items.sort(function(a,c){var x=a.getAttribute("data-"+k)||"",y=c.getAttribute("data-"+k)||"";return x<y?-st.d:x>y?st.d:0;});
      items.forEach(function(li){L.appendChild(li);});});});})();</script>

  <div class="more">
    <div class="more-label">More categories</div>
    <div class="more-links">
      ${others}
      <!-- /countries/ was in the sitemap but linked from exactly one page on
           the site (/countdown/), which is a near-orphan section however good
           the pages are. -->
      <a href="/countries/">By country</a>
      <a href="/calendar/">Full calendar</a>
    </div>
  </div>

  <p class="footer"><a href="/wrong-date/?url=${encodeURIComponent(`${SITE}/${cat.hub}/`)}">Wrong date?</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${mwScript}
</body>
</html>
`;
}

let n = 0;
for (const cat of popular.categories) {
  const dir = join(root, cat.hub);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(cat));
  n++;
}
console.log(`Generated ${n} category hub pages.`);
