/* solar-pages.mjs — THE ONE TABLE OF SIMULATOR PAGES.
 *
 * Every simulator view used to be a `?zoom=` state on /solar-system-simulator/:
 * one URL, one title, one 129KB script, eleven different pictures. A reader who
 * wanted Jupiter's moons could not link to them, a search engine could not index
 * them, and every visitor downloaded the moon systems, the comet elements and
 * the transfer solver whether their page drew them or not.
 *
 * Each view is now a page. This file is what makes that safe: the URL, the
 * opening rung, the layers and — crucially — THE JS MODULES THE PAGE ACTUALLY
 * NEEDS all live in one row, read by build-solar (to write the page), by
 * build-sitemap (to list it) and by the redirect check (to prove the old URL
 * still lands somewhere). Three places that would otherwise each keep their own
 * copy of "what pages exist", which is exactly how the old share-link URLs
 * survived in eighteen country pages long after the product was retired.
 *
 * NO SIDE EFFECTS — importing this must never write a file, so any generator
 * can read the table without triggering another generator's build.
 */
import { RUNGS, PL_EL, PL_DIA, planetPos, planetName, planetPeriodDays } from "./planets.mjs";
import { SAT_SYS, satCount, satGravity, satMass, satRotation } from "./satellites.mjs";
import { esc } from "./lib.mjs";

/* ---------------------------------------------------------------------------
 * The JS modules a page can be built from.
 *
 * THE LADDER IS WHY THIS CAN BE A PER-PAGE CHOICE AT ALL. While the zoom rungs
 * were client-side buttons, every page had to carry the code for every rung it
 * could switch to — which was all of them. The rungs are links between pages
 * now, so a page only ships what its OWN view draws, and the browser only
 * parses what it is about to use. `core` is the drawing itself and is not
 * optional; the rest are earned.
 * ------------------------------------------------------------------------- */
export const JS_MODULES = ["core", "globe", "moon", "sat", "small", "transfer"];

/* the rung ids that need each optional module, so a page's `needs` can be
   CHECKED against its rung rather than hand-kept beside it (assertNeeds below) */
const RUNG_NEEDS = {
  moon: ["moon"],                    /* the Earth-and-Moon view */
  "mars-moons": ["sat"],
  "jupiter-moons": ["sat"],
  "saturn-moons": ["sat"],
  "uranus-moons": ["sat"],
  "neptune-moons": ["sat"],
  "pluto-moons": ["sat"],
};

/* THE SECTION HUB. /planets/ is the page a reader lands on to choose a world —
 * a picture and a couple of paragraphs each, in orbital order, with the
 * asteroid belt in its real place between Mars and Jupiter. It sits ABOVE the
 * simulator in the tree, because "the planets" is the subject and the
 * simulator is one way of looking at them, and it is what every planet page's
 * breadcrumb points back to. */
export const PLANETS_PATH = "/planets/";
export const SOLAR_HUB = "/solar-system-simulator/";
export const LAUNCH_PATH = "/rocket-launch-simulator/";
/* the orbital-velocity pair. Its own generator writes it, but the belt page
   links to it, so the URL lives with the rest of the family's rather than in
   two files. */
export const ORBITAL_PATH = "/orbital-velocity-simulator/";
/* the URL /rocket-launches/ had before it gained per-destination children.
   Kept here, not in _redirects alone, so the redirect and the page that
   replaced it are named in the same place. */
export const LAUNCH_OLD = "/rocket-launches/";

/** How many moons the drawing actually gives a planet (0 for Mercury/Venus). */
export const moonCount = (idx) => ((SAT_SYS[idx] || {}).moons || []).length;

/* ---------------------------------------------------------------------------
 * A PLANET'S OWN URL.
 *
 * Flat, and named for what the page shows: /jupiter-and-moons-simulator/. The
 * planet is the subject, not a sub-topic of the system, and the old nested
 * /solar-system-simulator/jupiter/ read as the latter.
 *
 * Mercury and Venus drop the "-and-moons": they have none, and a title
 * promising moons that do not exist is the one thing a page about a planet
 * must not do. Earth takes the SINGULAR — it has one moon, and "the Moon" is
 * its name. Which branch a planet takes is decided by satellites.mjs's own moon
 * list, so adding a moon to that table moves the URL with it rather than
 * leaving the two disagreeing.
 * ------------------------------------------------------------------------- */
export function planetPath(slug, idx) {
  if (slug === "earth") return "/earth-and-moon-simulator/";
  return moonCount(idx) > 0 ? `/${slug}-and-moons-simulator/` : `/${slug}-simulator/`;
}

/** The URL each planet page used to live at, for the 301. */
export const planetOldPath = (slug) => `${SOLAR_HUB}${slug}/`;

/* ---------------------------------------------------------------------------
 * THE HELIOCENTRIC VIEWS.
 *
 * These stay CHILDREN of /solar-system-simulator/ rather than going flat like
 * the planets: they are views of the system, and the hub is the page about the
 * system. It also costs nothing — /solar-system-simulator/asteroid-belt/ and
 * /comets/ already exist at these URLs and are indexed, so keeping them here
 * means two fewer redirects and no ranking reset on the two oldest children.
 *
 * `inner-planets` and `outer-planets` are the two new ones. The intermediate
 * rungs (out to Jupiter, out to Saturn, out to Pluto) deliberately get NO page:
 * they differ from their neighbours only by a zoom level, and four pages whose
 * content is the same drawing at four scales is the near-duplicate case the
 * canonical rules exist to prevent. They stay on the hub's ladder, which is the
 * page whose actual subject is how the scale changes.
 * ------------------------------------------------------------------------- */
export const SYS_VIEWS = [
  {
    slug: "inner-planets", rung: "inner", needs: ["core"],
    name: "The inner planets",
    title: "Inner Planets Simulator — Mercury, Venus, Earth & Mars on Their Real Orbits",
    desc: "Watch Mercury, Venus, Earth and Mars move on their real orbits, to scale with each other, solved when the page loads. See why the four rocky planets are packed into the innermost tenth of the solar system.",
  },
  {
    slug: "outer-planets", rung: "neptune", needs: ["core"],
    name: "The outer planets",
    title: "Outer Planets Simulator — Jupiter, Saturn, Uranus & Neptune to Scale",
    desc: "Jupiter, Saturn, Uranus and Neptune on their real orbits, at the scale that shows how far apart the giants actually are — and how small the inner four look from out here.",
  },
];

/* the two that were already children, kept at their existing URLs */
export const EXTRA_VIEWS = {
  "asteroid-belt": { rung: "belt", needs: ["core", "small"], layers: { belt: 1 } },
  comets: { rung: "saturn", needs: ["core", "small"], layers: { comets: 1 } },
};

/* ---------------------------------------------------------------------------
 * THE HUB keeps every module.
 *
 * It is the one page whose subject IS the ladder — "the true shape of the
 * system and the thing evenly-spaced textbook diagrams hide" — so its rungs
 * stay client-side buttons that repaint in place, and it therefore needs the
 * code for every rung it can reach. That is a deliberate exception, not an
 * oversight: paying 129KB on one page buys the ladder its point, and every
 * OTHER page is now 20-75KB instead of paying it too.
 * ------------------------------------------------------------------------- */
export const HUB_NEEDS = ["core", "globe", "moon", "sat", "small", "transfer"];

/* ---------------------------------------------------------------------------
 * ROCKET LAUNCHES.
 *
 * The hub asks "where to?" and answers for all three; each child answers for
 * one, framed on that flight, with that destination's own numbers in its title.
 * `rung` is the frame that fits the whole transfer arc — Mars's own rung exists
 * for exactly this and is kept off the solar ladder (ladder: 0).
 *
 * There is NO /moon child. A lunar trip is an Earth-orbit departure, not a
 * sun-centred transfer between two planetary orbits, and transfer.mjs solves
 * only the latter. A page that framed one as the other would be inventing its
 * own numbers, which is the thing this codebase gates against everywhere else.
 * ------------------------------------------------------------------------- */
export const LAUNCH_DESTS = [
  { slug: "mars", idx: 3, name: "Mars", rung: "mars" },
  { slug: "jupiter", idx: 4, name: "Jupiter", rung: "jupiter" },
  { slug: "saturn", idx: 5, name: "Saturn", rung: "saturn" },
];
export const LAUNCH_NEEDS = ["core", "transfer"];

/* ---------------------------------------------------------------------------
 * Gate: a page must ship the modules its own rung draws with.
 *
 * The `needs` lists above are hand-written, and a wrong one does not crash the
 * build — it ships a page whose script throws the moment it tries to draw a
 * moon it has no code for, which is only visible if somebody loads that exact
 * page. RUNG_NEEDS derives the answer from the rung instead, and build-solar
 * calls this for every page it writes.
 * ------------------------------------------------------------------------- */
export function assertNeeds(label, rung, needs) {
  if (!needs.includes("core")) throw new Error(`${label}: every page needs "core"`);
  const bad = needs.filter((n) => !JS_MODULES.includes(n));
  if (bad.length) throw new Error(`${label}: unknown JS module(s) ${bad.join(", ")}`);
  const missing = (RUNG_NEEDS[rung] || []).filter((n) => !needs.includes(n));
  if (missing.length)
    throw new Error(`${label}: opens at rung "${rung}" but does not ship ${missing.join(", ")} — `
      + `that view cannot draw without it. Add it to the page's needs, or open at a different rung.`);
  if (!RUNGS.some((r) => r.id === rung)) throw new Error(`${label}: no such rung "${rung}"`);
}

/* ---------------------------------------------------------------------------
 * THE BREADCRUMB UNDER THE TITLE.
 *
 * The bar at the top of every page is logo, wordmark and menu — its old
 * "/solar" crumb was removed with the copy-link dropdown — so a reader on
 * /jupiter-and-moons-simulator/ had nothing on the page telling them where
 * that page sits or how to get to its neighbours. This is that trail, drawn
 * under the H1: Home, Planets, Jupiter.
 *
 * It lives here rather than in either generator because build-solar and
 * build-planets have to emit the SAME tree, and because the same array is
 * what breadcrumbLD() gets — a visible trail that disagrees with the one in
 * the structured data is worse than either alone. Pass it [{name, url}, ...]
 * from the home page outward; the last entry is the current page and is not
 * a link.
 * ------------------------------------------------------------------------- */
export function solarCrumbs(trail) {
  /* `short` is what the READER sees where the two differ, and there is exactly
     one such entry: the site itself, which every page's structured data names
     "Time and Space Science" (so this family agrees with the other four
     thousand pages) and which reads "Home" in a trail, because that is what a
     breadcrumb's first step is called. The LD gets t.name, the page gets
     t.short — one array, two audiences, and neither invented at the call site. */
  const items = trail.map((t, i) => i === trail.length - 1
    ? `<span class="sol-crumb-here" aria-current="page">${esc(t.short || t.name)}</span>`
    : `<a class="sol-crumb" href="${t.url}">${esc(t.short || t.name)}</a>`).join('<span class="sol-crumb-sep" aria-hidden="true">/</span>');
  return `  <nav class="sol-crumbs" aria-label="Breadcrumb">${items}</nav>\n`;
}
/** the trail every page in this family starts with */
export const CRUMB_ROOT = [{ name: "Time and Space Science", short: "Home", url: "/" },
                           { name: "Planets", url: PLANETS_PATH }];

/* ---------------------------------------------------------------------------
 * A BODY'S PHYSICAL FIGURES, ALL OF THEM DERIVED.
 *
 * Nothing here is typed in beside a planet: mass is GM/G, gravity is GM/r²,
 * the year is Kepler's third law, the day is the rotation the moon tables are
 * measured against, and the diameter is the one the simulator draws with. It
 * sits in this module — which has no side effects — so that the planet pages
 * and /planets/ quote ONE calculation rather than two that agree today.
 * ------------------------------------------------------------------------- */
export const bodyStats = (idx, at = new Date()) => {
  const name = planetName(idx), p = planetPos(idx, at), yrDays = planetPeriodDays(idx);
  const rot = satRotation(idx), g = satGravity(idx), m = satMass(idx);
  return {
    dia: PL_DIA[name], diaEarth: PL_DIA[name] / PL_DIA.Earth,
    mass: m, massEarth: m / satMass(2),
    gravity: g, gravityEarth: g / satGravity(2),
    yearDays: yrDays, yearYears: yrDays / 365.256,
    dayHours: rot, retrogradeSpin: rot < 0,
    axisAU: PL_EL[idx][1], rNow: p.r, moons: satCount(idx),
    drawn: SAT_SYS[idx] ? SAT_SYS[idx].moons.length : 0,
    perihelion: PL_EL[idx][1] * (1 - p.e), aphelion: PL_EL[idx][1] * (1 + p.e), ecc: p.e,
  };
};
/** how long light takes to cross a distance in AU — the one unit that makes
 *  these numbers mean something to a reader */
export const lightTime = (au) => {
  const s = au * 499.004784;
  if (s < 90) return `${s.toFixed(0)} seconds`;
  if (s < 5400) return `${(s / 60).toFixed(1)} minutes`;
  return `${(s / 3600).toFixed(1)} hours`;
};
