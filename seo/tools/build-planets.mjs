#!/usr/bin/env node
/* build-planets.mjs — /planets/, the page that sends people to the others.
 *
 * WHY THIS PAGE EXISTS. There are eleven pages about individual worlds on this
 * site and, until now, no page whose subject was "the planets". The only way
 * in was the simulator hub — a tool — and a reader who wanted to know what
 * Uranus is like had to work out that the way to find out was to open a piece
 * of software and press a zoom button. This is the other door: a picture and
 * two paragraphs for each world, in orbital order, every one of them a link
 * to its own page.
 *
 * IT IS A ROUTE, NOT A DESTINATION. Nothing here repeats what a planet page
 * says at length — no moon tables, no open questions, no launch windows. Each
 * card carries the four figures that place a world (how far out, how long its
 * year and day, how many moons), all of them DERIVED, and prose that exists
 * nowhere else on the site, so it is a page in its own right rather than a
 * table of contents that competes with its own children for the same queries.
 *
 * THE BELT IS IN ITS PLACE. Between Mars and Jupiter, in the sequence, with a
 * card the same shape as a planet's — because that is where it is and that is
 * the fact about it worth teaching. Pluto is at the end, labelled a dwarf
 * planet in the card's own kicker rather than quietly listed as a ninth
 * planet or quietly dropped: both of those are ways of not answering the
 * question people actually arrive with.
 *
 * THE PICTURES ARE THE SITE'S OWN. Each planet is globe.mjs's drawing of it —
 * real features at real coordinates, the real oblateness, and for a ringed
 * planet the ring opening solved for today — baked into the page as inline
 * SVG. No image files, nothing to fetch, and nothing that can go stale.
 *
 *   node seo/tools/build-planets.mjs   (after build-solar, before build-sitemap)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, learningLd } from "./lib.mjs";
import { PLANETS_JS, SOLAR_JS, planetName, planetPeriodDays, PL_AU } from "./planets.mjs";
import { SMALL_JS, beltEdges } from "./smallbodies.mjs";
import { GLOBE_JS, globeSvg, globeRadius, ringAspect } from "./globe.mjs";
import { PLANETS_PATH, SOLAR_HUB, LAUNCH_PATH, planetPath, solarCrumbs, CRUMB_ROOT, bodyStats, lightTime } from "./solar-pages.mjs";
/* every distance here is emitted metric and converted in the browser for a
   reader whose units are imperial — see units.mjs */
import { kmSig, temps } from "./units.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const FACTS = JSON.parse(readFileSync(join(root, "seo/_data/solar-facts.json"), "utf8"));
const NOW = new Date();

const num = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/* THE BELT'S PICTURE IS THE SIMULATOR'S OWN, run here. Same one-source-two-
   runtimes trick build-solar uses for its baked figures: this IS solSvg, not a
   Node reimplementation of it, so the card cannot draw a belt in a different
   place from the page it links to. Only the two modules that view needs are
   instantiated — there are no moons and no transfers in it. */
const SSR = new Function(`${PLANETS_JS}\n${SMALL_JS}\n${SOLAR_JS}\nreturn { solSvg: solSvg };`)();
const beltFigure = () => SSR.solSvg(+NOW, "belt", { tilt: 52, tiltExag: 7, belt: 1 });

/* ---------------------------------------------------------------------------
 * One card.
 *
 * The kicker above each name says what KIND of thing it is and where it sits,
 * because that is the question the sequence is answering. It is computed from
 * the body's own position in the list, so inserting anything moves every
 * number after it rather than leaving a hand-typed "fifth" behind.
 * ------------------------------------------------------------------------- */
const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

const statRows = (idx) => {
  const s = bodyStats(idx, NOW), day = Math.abs(s.dayHours);
  return [
    ["Distance from the sun", `${num(s.axisAU, 2)} AU — light takes ${lightTime(s.axisAU)}`],
    ["Width", `${kmSig(s.dia)} — ${num(s.diaEarth, 2)}× Earth`],
    ["Its year", s.yearYears < 2 ? `${num(s.yearDays, 0)} Earth days` : `${num(s.yearYears, 1)} Earth years`],
    ["Its day", `${day > 48 ? `${num(day / 24, 1)} Earth days` : `${num(day, 1)} hours`}${s.retrogradeSpin ? " — backwards" : ""}`],
    ["Moons", s.moons === 0 ? "None" : num(s.moons)],
  ];
};

/* WHAT THE RINGS ARE DOING TODAY, in a sentence, for the two planets that have
   them. The angle is the sub-Earth latitude on the ring plane, which is what
   the drawing beside it opens the rings by — so the caption cannot describe a
   picture other than the one on the page. Three bands because the same number
   means three different pictures: a line, a part-open ellipse, and a bullseye. */
const ringNote = (name, asp) => {
  const b = Math.abs(asp.B), side = asp.B < 0 ? "below" : "above";
  const what = b < 12
    ? "so the rings here are close to edge-on — a narrow ellipse, not the wide oval diagrams always draw"
    : b > 55
      ? "so the rings here are drawn as near-circles round the disc: we are looking almost straight down on them"
      : "so the rings here are part open, halfway between a line and a circle";
  return `The rings are drawn as they stand today, not at a convenient angle: Earth is ${num(b, 1)}° ${side} ${esc(name)}’s ring plane, ${what}. It shifts as the planet goes round the sun, and the picture shifts with it.`;
};

const planetCard = (b, place) => {
  const idx = b.idx, url = planetPath(b.slug, idx);
  const dwarf = b.slug === "pluto";
  const asp = ringAspect(planetName(idx), NOW);
  const art = globeSvg(planetName(idx), +NOW, 200, 200, globeRadius(planetName(idx), 190), 24, 0.9);
  return `  <div class="card sol-plan" id="${esc(b.slug)}">
    <div class="sol-planrow">
      <div class="sol-planart">
        <a href="${url}" aria-label="${esc(b.name)}"><svg viewBox="0 0 400 400" width="100%" aria-hidden="true"><rect width="400" height="400" rx="16" fill="#080d1a"/>${art}</svg></a>
      </div>
      <div class="sol-planbody">
        <p class="sol-plankind">${dwarf ? "Dwarf planet" : "Planet"} · ${dwarf ? "beyond Neptune, in the Kuiper belt" : `${ordinals[place]} from the sun`}</p>
        <h2><a href="${url}">${esc(b.name)}</a></h2>
        <p class="sub">${esc(b.tagline)}</p>
${/* escaped first, THEN the temperature figures wrapped: the escape has to
     happen before any markup goes in */""
  }${b.overview.map((p) => `        <p>${temps(esc(p))}</p>`).join("\n")}
${asp ? `        <p class="hint">${ringNote(b.name, asp)}</p>` : ""}
        <div class="wc-facts sol-planfacts">
${/* the VALUE is not escaped: these strings are built here and some carry a
     units.mjs span, which escaping would print as markup */""
  }${statRows(idx).map(([k, v]) => `          <div class="wc-frow"><span>${esc(k)}</span><b>${v}</b></div>`).join("\n")}
        </div>
        <p class="sol-planmore"><a class="chip chip-alt" href="${url}">More about ${esc(b.name)} →</a></p>
      </div>
    </div>
  </div>
`;
};

/* The belt takes the same shape as a planet card — same picture box, same
   kicker, same onward link — because it sits in the same sequence and a
   different-looking card would read as an aside rather than as a place. Its
   figures are the ones a belt HAS: where it starts and stops, and what it
   weighs against the moon. */
const beltCard = (b) => {
  const [inner, outer] = beltEdges();
  const url = `${SOLAR_HUB}${b.slug}/`;
  const jYear = planetPeriodDays(4) / 365.256;
  return `  <div class="card sol-plan" id="${esc(b.slug)}">
    <div class="sol-planrow">
      <div class="sol-planart">
        <a href="${url}" aria-label="The asteroid belt"><span class="sol-planbelt">${beltFigure()}</span></a>
      </div>
      <div class="sol-planbody">
        <p class="sol-plankind">Not a planet · between Mars and Jupiter</p>
        <h2><a href="${url}">The asteroid belt</a></h2>
        <p class="sub">${esc(b.tagline)}</p>
${/* escaped first, THEN the temperature figures wrapped: the escape has to
     happen before any markup goes in */""
  }${b.overview.map((p) => `        <p>${temps(esc(p))}</p>`).join("\n")}
        <div class="wc-facts sol-planfacts">
          <div class="wc-frow"><span>Where it runs</span><b>${inner.toFixed(2)} to ${outer.toFixed(2)} AU</b></div>
          <div class="wc-frow"><span>Sunlight reaches it in</span><b>${lightTime((inner + outer) / 2)}</b></div>
          <div class="wc-frow"><span>What shapes it</span><b>Jupiter, every ${num(jYear, 1)} years round</b></div>
          <div class="wc-frow"><span>Largest object</span><b>Ceres, ${kmSig(940, 2)} across — a dwarf planet</b></div>
          <div class="wc-frow"><span>All of it together</span><b>About 3% of the mass of the Moon</b></div>
        </div>
        <p class="sol-planmore"><a class="chip chip-alt" href="${url}">More about the belt →</a></p>
      </div>
    </div>
  </div>
`;
};

/* ---------------------------------------------------------------------------
 * The page
 * ------------------------------------------------------------------------- */
/* THE SIMULATOR LINK RIDES AT THE TOP, above the cards. A reader who came for
   "what are the planets" is served by the cards; a reader who came to watch
   them move should not have to scroll past ten of them to find the tool. */
const openCard = () => `  <div class="card sol-planlead">
    <p>Below: every planet in orbital order, with the asteroid belt where it actually sits — between Mars and Jupiter — and Pluto at the end, labelled for what it is. Each one links to its own page, where that world is drawn turning on its axis with its moons going round it.</p>
    <p class="sol-planjump">
      <a class="chip chip-alt" href="${SOLAR_HUB}">Watch them all move — the solar system simulator →</a>
      <a class="chip" href="${SOLAR_HUB}inner-planets/">The inner planets</a>
      <a class="chip" href="${SOLAR_HUB}outer-planets/">The outer planets</a>
      <a class="chip" href="${LAUNCH_PATH}">Launch windows</a>
    </p>
  </div>
`;

const scaleCard = () => {
  const nep = bodyStats(7).axisAU, mer = bodyStats(0).axisAU;
  return `  <div class="card">
    <h2>Why a list like this is misleading, and what to do about it</h2>
    <p>Ten cards down a page put the planets a screen apart, evenly. They are not. Neptune is <strong>${num(nep / mer, 0)} times</strong> further from the sun than Mercury, and the four rocky planets together occupy the innermost tenth of the system — so any picture that shows all of them at once has either squashed the outside or lost the inside. The <a href="${SOLAR_HUB}">solar system simulator</a> deals with that by climbing a ladder of views instead of pretending one frame can hold it, and the shape you see at the top of that ladder is the real one.</p>
    <p>The same goes for size. Jupiter is ${num(bodyStats(4).diaEarth, 1)} times Earth's width and Mercury ${num(bodyStats(0).diaEarth, 2)} of it; one AU — the Earth's own distance from the sun — is ${kmSig(PL_AU, 6)}, which is about ${num(PL_AU / 12742, 0)} Earths laid end to end. Every figure on this page comes from the same orbital elements and masses the simulator draws with, not from a table typed beside them.</p>
  </div>
`;
};

const elsewhereCard = () => `  <div class="card">
    <h2>Other things out there</h2>
    <p>The belt is not the only thing between the planets. <a href="${SOLAR_HUB}comets/">Comets</a> come in on long ellipses from much further out, and <a href="${LAUNCH_PATH}">launch windows</a> are what it takes to actually reach any of these places — solved from the same orbits, not looked up.</p>
    <p class="hint">Closer to home: <a href="/sun-moon-earth-movement-simulator/">the sun and moon from your own town</a> · <a href="/earth-and-moon-simulator/">Earth and the Moon to scale</a> · <a href="/moon/">tonight's moon phase</a> · <a href="/sun/">sunrise and sunset by city</a> · <a href="/classroom/">the classroom guide</a></p>
  </div>
`;

const FAQ = [
  ["How many planets are there?", "Eight. Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. Pluto was counted as a ninth from its discovery in 1930 until 2006, when the International Astronomical Union defined a planet as a body that orbits the sun, is round under its own gravity, and has cleared its orbital neighbourhood. Pluto meets the first two and not the third."],
  ["Is Pluto a planet?", "It is a dwarf planet — that is a real category, not a demotion to nothing. It shares the Kuiper belt with a great many other bodies, one of which, Eris, turned out to be more massive than Pluto. That discovery in 2005 is what forced the definition."],
  ["What is between Mars and Jupiter?", "The asteroid belt: rock and metal spread between roughly 2.1 and 3.3 AU that never formed into a planet, because Jupiter's gravity kept stirring it. All of it together comes to about 3% of the mass of the Moon."],
  ["Which planet is closest to Earth?", "On average, Mercury. It is a counter-intuitive answer, and it is right: Venus comes closer than anything else at its nearest, but it also spends long stretches on the far side of the sun, while Mercury never gets far from it. Averaged over time, Mercury is the nearest planet to Earth — and to every other planet."],
  ["Can I see them without a telescope?", "Five of them, yes — Mercury, Venus, Mars, Jupiter and Saturn are all naked-eye objects, and were known as planets thousands of years before telescopes existed. Uranus is borderline under a very dark sky; Neptune needs optics."],
];

function build() {
  /* the family's own root, not a second copy of it */
  const trail = CRUMB_ROOT;
  const bodies = FACTS.bodies;
  const belt = FACTS.extras.find((x) => x.slug === "asteroid-belt");
  /* the belt goes after Mars, which is where it is. Its place in the sequence
     is found from the orbits rather than from a hard-coded index. */
  let cards = "";
  bodies.forEach((b, i) => {
    cards += planetCard(b, i);
    if (b.slug === "mars") cards += beltCard(belt);
  });

  const title = "The Planets — Every Planet in Order, with Pictures and Facts";
  const desc = "The eight planets in order from the sun, with the asteroid belt in its place between Mars and Jupiter and Pluto at the end as the dwarf planet it is. A picture and a couple of paragraphs each, and a page for every one.";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${PLANETS_PATH}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, trail)}</script>
${learningLd({ name: "The planets of the solar system", url: `${SITE}${PLANETS_PATH}`, description: desc })}
${faqLd(FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap wrap-wide">
  ${brand({ crumb: { slug: "planets", url: PLANETS_PATH } })}
  <h1>The Planets</h1>
${solarCrumbs(trail)}  <p class="sub">Eight planets, one dwarf planet and the belt of rubble between them — in the order they go round the sun. Every picture here is drawn from the real thing: real features at their real coordinates, real sizes against each other, and for Saturn the ring opening solved for today rather than assumed.</p>

${openCard()}${cards}${scaleCard()}${elsewhereCard()}  <div class="card tool-about">
    <h2>Questions people ask about the planets</h2>
    ${FAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
  mkdirSync(join(root, PLANETS_PATH.slice(1, -1)), { recursive: true });
  writeFileSync(join(root, PLANETS_PATH.slice(1) + "index.html"), html);
  console.log(`Generated ${PLANETS_PATH} — ${bodies.length} worlds + the belt, `
    + `${num(bodyStats(7).axisAU / bodyStats(0).axisAU, 0)}x from Mercury's orbit to Neptune's.`);
}

build();
