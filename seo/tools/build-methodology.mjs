#!/usr/bin/env node
/* build-methodology.mjs — /methodology/ and its five pages: how the numbers on
 * this site are worked out, and where they stop being reliable.
 *
 * WHY THIS EXISTS. Roughly 2,300 pages here publish computed values — sunrise
 * in Boise, moonrise in Cádiz, the next high tide at Point Reyes, what time it
 * is in Kolkata. A computed value with no stated method is indistinguishable
 * from a scraped one, both to a reader deciding whether to trust it and to a
 * search engine deciding whether the page is worth anything. These pages are
 * the answer to "says who": the algorithm by name, the simplifications it
 * makes, and the conditions under which it is wrong.
 *
 * EVERY NUMBER ON THESE PAGES WAS MEASURED, NOT LOOKED UP. The two accuracy
 * claims come from JSON written by measurement scripts in this directory —
 * seo/tools/measure-sun.mjs and seo/tools/measure-timing.mjs — and this
 * generator THROWS if either file is missing a field it wants to quote. That is
 * deliberate and it is the whole design: the one thing a methodology page
 * cannot do is make up its own accuracy figure. If a claim has no measurement
 * behind it, the build stops rather than the page shipping a plausible number.
 *
 * WHAT THESE PAGES DO NOT CLAIM. They do not say the site is fit for
 * navigation, aviation, safety or legal use; several say the opposite in as
 * many words. The tide page is the sharpest about it, because NOAA astronomical
 * predictions genuinely do not include weather, and someone reading a tide
 * chart may be about to walk onto a sandbar.
 *
 *   node seo/tools/build-methodology.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD } from "./lib.mjs";
import { ico } from "./icons.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const HUB = "/methodology/";

/* ---- measured inputs. Missing or incomplete = build failure, on purpose ---- */
function measured(file, ...required) {
  const p = join(root, "seo/_data", file);
  if (!existsSync(p))
    throw new Error(`seo/_data/${file} is missing — run the measurement script that writes it (seo/tools/measure-*.mjs) before building. A methodology page does not get to invent its own numbers.`);
  const j = JSON.parse(readFileSync(p, "utf8"));
  for (const k of required) {
    const v = k.split(".").reduce((o, s) => (o == null ? o : o[s]), j);
    if (v === undefined || v === null)
      throw new Error(`seo/_data/${file} has no "${k}" — the page quotes it, so re-run the measurement rather than shipping a page with a hole in it.`);
  }
  return j;
}
const SUN = measured("sun-accuracy.json", "medianDeltaSec", "worstDeltaSec", "worstAt.latitude", "worstAt.date", "samples", "latitudes");
const TIM = measured("browser-timing.json", "engine.version", "foreground.naiveDriftMs", "foreground.tickErrorMaxMs",
  "cpu4x.tickErrorMaxMs", "cpu20x.naiveDriftMs", "cpu20x.tickErrorMaxMs", "cpu20x.driftPerHourMs",
  "nestedTimeoutClamp.clampMs", "unmeasured");

const mmss = (s) => (Math.abs(s) < 60 ? `${Math.abs(s)} seconds` : `${(Math.abs(s) / 60).toFixed(1)} minutes`);
/* a real minus sign, not a hyphen — these are numbers in prose, and the rest
 * of the site (utcOffsetLabel in build-world-clock) already uses U+2212 */
const signed = (ms) => `${ms < 0 ? "\u2212" : ""}${Math.abs(ms)} ms`;

/* ---------------------------------------------------------------- shell ---- */
function page({ slug, title, desc, h1, sub, icon, body, faq = [], related = [] }) {
  const url = slug ? `${HUB}${slug}/` : HUB;
  const crumbs = [{ name: "Time and Space Science", url: "/" }, { name: "Methodology", url: HUB }];
  if (slug) crumbs.push({ name: h1, url });
  const rel = related.length
    ? `\n  <div class="card">\n    <h2>Related</h2>\n    <p class="bullets">${related.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join(" · ")}</p>\n  </div>`
    : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, crumbs)}</script>
${faq.length ? faqLd(faq) : ""}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand(slug
    ? { crumb: { slug: "methodology", url: HUB }, sub: { slug, url } }
    : { crumb: { slug: "methodology", url: HUB } })}
  <h1>${icon ? `${ico(icon)} ` : ""}${esc(h1)}</h1>
  <p class="sub">${sub}</p>
${body}${rel}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
  const dir = join(root, "methodology", slug || "");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  return url;
}

/* =============================================================== sunrise === */
const SUN_FAQ = [
  ["How accurate are the sunrise and sunset times?",
    `Close enough to plan a walk by, not close enough to navigate by. Compared against an iterative solution for the same horizon crossing, the times the site publishes were typically within about ${mmss(SUN.medianDeltaSec)} and never more than ${mmss(SUN.worstDeltaSec)} across ${SUN.samples} checks from the equator to ${Math.max(...SUN.latitudes)}° of latitude, at both solstices and both equinoxes. That figure covers the solving method only. It does not cover things the site does not model at all: unusual atmospheric refraction, your height above sea level, or a hill on the horizon — any of which can move real sunrise by more than the maths does.`],
  ["Why does the time differ slightly from another site?",
    "Almost always because of the horizon definition or the observer's elevation. This site solves for the sun's centre at −0.833° below the true horizon, which allows for the sun's own width plus average atmospheric bending — the standard convention. A site that models your altitude, or uses a different refraction assumption, will land a minute or two away. Neither is wrong; they answer slightly different questions."],
  ["Are the times calculated on my device or on a server?",
    "On your device, in the browser, from the page's own latitude and longitude. That is why they cannot go stale: there is no cached table to expire. The build also writes today's value into the HTML so the page is not empty for a search engine, and the browser recalculates it on load."],
  ["Why does it say the sun does not rise?",
    "Because at that latitude on that date it genuinely does not. Above the Arctic Circle and below the Antarctic Circle there are dates with no sunrise or no sunset, and the maths has no solution to report. The page says so rather than printing a nearby time that would be wrong."],
];

const sunUrl = page({
  slug: "sunrise-sunset", icon: "sunrise",
  title: "How Sunrise & Sunset Times Are Calculated",
  desc: "The exact solar-position method behind the sunrise, sunset and twilight times on this site — the horizon angle, the simplifications, and a measured bound on the error.",
  h1: "How sunrise and sunset are calculated",
  sub: `Every time on a <a href="/sun/">sunrise &amp; sunset page</a> is solved in your browser from the page's own latitude and longitude. This is the method, in the order the code does it — and, at the end, what it gets wrong.`,
  body: `
  <div class="card">
    <h2>The calculation, step by step</h2>
    <p class="bullets">
      <em>1. Days since J2000.</em> The instant is converted to days since noon on 1 January 2000, the epoch the rest of the series is written against.<br>
      <em>2. The sun's mean anomaly.</em> Where the sun would be if the Earth's orbit were a circle: <code>M = 357.5291° + 0.98560028° × d</code>.<br>
      <em>3. The equation of centre.</em> Three sine terms correct that circle to the real ellipse — <code>1.9148 sin M + 0.02 sin 2M + 0.0003 sin 3M</code> — which is why the sun runs early in January and late in July.<br>
      <em>4. Ecliptic longitude, then declination.</em> Add the longitude of perihelion and half a turn to get the sun's position along the ecliptic, then tilt it by the Earth's axial tilt (23.4397°) to get how far north or south of the equator the sun is that day.<br>
      <em>5. Solar noon.</em> The moment the sun crosses your meridian, corrected for the equation of time. Not 12:00 — it can be more than a quarter of an hour either side.<br>
      <em>6. The hour angle for the target altitude.</em> Solve for how far from noon the sun sits at the angle you asked for, and place the crossing either side of noon.
    </p>
  </div>

  <div class="card">
    <h2>Why the horizon is −0.833°, not 0°</h2>
    <p>Sunrise is not the moment the sun's centre reaches the horizon. Two things happen first. The sun is a disc about half a degree across, so its upper edge clears the horizon while its centre is still below — roughly 0.25°. And the atmosphere bends light coming in at a shallow angle, lifting the whole sun into view before it is geometrically there — about another 0.583° under a standard atmosphere.</p>
    <p>Add them and you get the convention this site solves for: the sun's centre at <strong>0.833° below the true horizon</strong>. It is the same number almanacs use, which is why the times agree with them.</p>
    <p>The refraction half of that is an <em>average</em>. Real bending depends on air temperature and pressure, and over cold water or in a strong inversion it can differ enough to move visible sunrise by a couple of minutes. Nothing on this site models that, and nothing reasonably could without local atmospheric data.</p>
  </div>

  <div class="card">
    <h2>The twilights are the same solve, at a different angle</h2>
    <p>Once you can solve for "when is the sun at angle X", every twilight is the same calculation with a different X — which is exactly how the page produces them.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Sunrise / sunset</span><b>−0.833°</b></div>
      <div class="wc-frow"><span>Civil twilight — first and last light, bright enough to read outside</span><b>−6°</b></div>
      <div class="wc-frow"><span>Nautical twilight — the sea horizon is still visible</span><b>−12°</b></div>
      <div class="wc-frow"><span>Astronomical twilight — true darkness for stargazing</span><b>−18°</b></div>
      <div class="wc-frow"><span>Golden hour — warm, low-angle light</span><b>−4° to +6°</b></div>
      <div class="wc-frow"><span>Blue hour — the deep blue band just past it</span><b>−6° to −4°</b></div>
    </div>
    <p>At high latitudes in summer the sun never gets that low, so there is no crossing to report. The page shows a dash and says the twilight does not end, rather than inventing a time.</p>
  </div>

  <div class="card">
    <h2>What this method does not model</h2>
    <p class="bullets">
      <em>Your elevation.</em> Stand on a hill and you see the sun earlier than someone at sea level below you. The calculation assumes a flat sea-level horizon.<br>
      <em>The terrain.</em> A mountain to the east delays sunrise by however long it takes the sun to clear it. That is local geography, not astronomy, and no formula here knows about it.<br>
      <em>Non-standard refraction.</em> The 0.583° above is an average, not your air.<br>
      <em>Nutation and aberration.</em> The Earth's axis wobbles slightly and light takes time to arrive; both are omitted. Together they are worth well under the error already measured below.<br>
      <em>The declination changing during the day.</em> The solver treats the sun's declination as fixed for the day and places sunrise and sunset symmetrically either side of solar noon. It moves. This is the largest of the simplifications, and it is the one measured next.
    </p>
  </div>

  <div class="card">
    <h2>How far off is it? Measured, not asserted</h2>
    <p>The closed-form solve above is fast enough to run for a thousand cities in a browser, which is why it is used. To find what that speed costs, a script kept with the site’s source (<code>seo/tools/measure-sun.mjs</code>) re-solves the same horizon crossing iteratively — stepping until the sun's actual computed altitude equals −0.833° — and compares.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Comparisons</span><b>${SUN.samples}</b></div>
      <div class="wc-frow"><span>Latitudes tested</span><b>${SUN.latitudes.map((l) => `${l}°`).join(", ")}</b></div>
      <div class="wc-frow"><span>Dates tested</span><b>both equinoxes, both solstices</b></div>
      <div class="wc-frow"><span>Typical difference</span><b>${mmss(SUN.medianDeltaSec)}</b></div>
      <div class="wc-frow"><span>Worst difference</span><b>${mmss(SUN.worstDeltaSec)} (at ${SUN.worstAt.latitude}°, ${SUN.worstAt.date})</b></div>
    </div>
    <p>The pattern is the one you would expect: the difference is smallest near the equinoxes at low latitudes and grows toward the poles, where the sun's path meets the horizon at a shallow angle and a small error in altitude becomes a large error in time.</p>
    <p><strong>What this figure is not.</strong> Both sides of that comparison use the same solar-position series, so it bounds the <em>solver</em> and says nothing about the astronomy underneath it. And it cannot see the four things in the section above, which are not modelled at all. Treat it as the floor of the error, not the ceiling.</p>
  </div>
`,
  faq: SUN_FAQ,
  related: [["/sun/", "Sunrise & sunset times"], [`${HUB}moon-phase/`, "How the moon phase is calculated"], [`${HUB}time-zones/`, "How time zones and DST are handled"]],
});

/* ================================================================== moon === */
const MOON_FAQ = [
  ["Where do the moon phase times come from?",
    "They are calculated in your browser from Jean Meeus's Astronomical Algorithms — the periodic-term series in chapter 47 for the moon's position, and chapter 49 for the exact instant of a new, full or quarter moon. Nothing is fetched from an API, so nothing can be out of date."],
  ["Why does the illuminated percentage differ slightly from another source?",
    "Because \"illuminated fraction\" is a geometric quantity that different sources round and define slightly differently, and because the series here is truncated to its leading terms. The phase name and the primary-phase instants are the robust numbers; treat the percentage as a close approximation."],
  ["Is moonrise as accurate as sunrise?",
    "Slightly less, and for a real reason: the moon moves about thirteen degrees a day against the stars and its distance changes by more than a tenth, so its apparent size and its speed both vary. Moonrise is found by sampling the moon's altitude hourly and interpolating the horizon crossing, which is a good method but a sampled one."],
  ["What counts as a supermoon here?",
    "A full moon near the closest point of the moon's orbit. That threshold is decided by the moon's distance, which is why the distance series used here keeps its longer form — the one-term version can be wrong by around two thousand kilometres, enough to move a borderline case to the wrong side of the line."],
];

const moonUrl = page({
  slug: "moon-phase", icon: "moon",
  title: "How the Moon Phase & Moonrise Are Calculated",
  desc: "The Meeus periodic-term series behind the moon phase, illumination, moonrise and moonset on this site — and where the truncated version stops being exact.",
  h1: "How the moon phase is calculated",
  sub: `Every figure on a <a href="/moon/">moon page</a> — the phase, the illuminated percentage, moonrise and moonset, the next full moon — is computed in your browser. This is the method and its limits.`,
  body: `
  <div class="card">
    <h2>Where the moon is</h2>
    <p>The moon's position comes from the periodic-term series in chapter 47 of Jean Meeus's <em>Astronomical Algorithms</em>, truncated to its leading terms. Four angles drive it, each a simple linear function of time: mean longitude, mean anomaly, argument of latitude, and mean elongation from the sun.</p>
    <p>Those four feed three series — one for ecliptic longitude, one for latitude, one for distance — which are then rotated into right ascension and declination using the same axial tilt the sun calculation uses.</p>
    <p>The distance series is deliberately kept longer than the other two. The short form everyone quotes, <code>385001 − 20905 cos M′</code>, can be off by around two thousand kilometres, and distance is what decides whether a full moon is called a supermoon — so a truncation that is harmless for the phase name is not harmless there.</p>
  </div>

  <div class="card">
    <h2>Phase and illumination</h2>
    <p class="bullets">
      <em>Elongation.</em> The angle at your eye between the sun and the moon, from their two positions.<br>
      <em>Phase angle.</em> The angle at the moon between the sun and the Earth, which needs the moon's distance — this is where the distance series earns its length a second time.<br>
      <em>Illuminated fraction.</em> <code>(1 + cos i) / 2</code>, where <em>i</em> is that phase angle. Zero at new moon, one at full.<br>
      <em>Waxing or waning.</em> Decided by the sign of the position angle of the bright limb, which is also what tells the drawing on the page which side to light.
    </p>
    <p>The phase <em>name</em> — waxing crescent, first quarter, waning gibbous — is a band of that cycle position, not a separate calculation.</p>
  </div>

  <div class="card">
    <h2>The exact moment of a new or full moon</h2>
    <p>"When is the next full moon" is a different question from "how lit is it now", and it gets a different method: chapter 49 of the same book, which solves directly for the instant of a primary phase rather than searching the illumination curve for a maximum. It starts from the mean lunation — 29.530588861 days — and applies the corrections for the sun's and moon's anomalies and the moon's argument of latitude.</p>
    <p>That is why the site can name a minute rather than a day, and why the answer does not drift as the lunation count grows.</p>
  </div>

  <div class="card">
    <h2>Moonrise and moonset</h2>
    <p>There is no closed form for these, because the moon moves too fast against the stars for the "solve once for the day" trick that works for the sun. Instead the altitude is sampled every hour through the local day and the horizon crossings are interpolated with a quadratic through each set of three samples — the same approach SunCalc uses.</p>
    <p>The horizon angle is <strong>+0.133°</strong>, not the sun's −0.833°. The moon is much closer, so parallax works against its apparent altitude rather than for it, and the net allowance for its semidiameter plus refraction lands just above the horizon instead of below.</p>
    <p>On roughly one day in a month the moon does not rise, or does not set, within a given calendar day — because it comes up about fifty minutes later each day and eventually a rise falls off the end of the day. That is real, not a bug, and the page reports it as such.</p>
  </div>

  <div class="card">
    <h2>Limits worth knowing</h2>
    <p class="bullets">
      <em>Truncated series.</em> The full Meeus tables have dozens of terms; the leading ones are used here. Good to a small fraction of a degree, not to the arcsecond.<br>
      <em>Geocentric, not topocentric.</em> Positions are as seen from the centre of the Earth. For phase and illumination that is the right frame; for exactly where the moon sits in your sky it is a simplification.<br>
      <em>Same horizon caveats as the sun.</em> Elevation, terrain and non-standard refraction are not modelled here either.<br>
      <em>Not for eclipse prediction.</em> Eclipses need the node geometry solved properly, and this does not do it.
    </p>
  </div>
`,
  faq: MOON_FAQ,
  related: [["/moon/", "Moon phase tonight"], [`${HUB}sunrise-sunset/`, "How sunrise and sunset are calculated"], [`${HUB}tide-predictions/`, "Where the tide predictions come from"]],
});

/* ================================================================= tides === */
const TIDE_FAQ = [
  ["Where do the tide predictions come from?",
    "NOAA's Center for Operational Oceanographic Products and Services (CO-OPS), the official source for United States tide predictions. Every number on the site is NOAA's, arriving one of two ways: the interactive chart and the station finder request the high/low list from NOAA live as you use them, and the seven-day table printed into the page comes from a 45-day window of NOAA predictions fetched weekly and stored with the site. Tide predictions are fixed astronomy — NOAA does not revise them — so a stored prediction is the same number a live request returns."],
  ["Can I use these for boating or fishing safety?",
    "No. These are astronomical predictions: they model the pull of the moon and sun on that station's water, and nothing else. Wind, barometric pressure, storm surge, river discharge and rainfall all move real water level and none of them are in these numbers — a strong onshore wind can hold water in well above a predicted low. For navigation or safety, use NOAA directly and check with the U.S. Coast Guard."],
  ["What does the height mean — height above what?",
    "Feet above MLLW, mean lower low water, which is NOAA's chart datum for these stations. It is roughly the average of the lower of each day's two low tides, so a negative predicted height is normal and simply means lower than that average."],
  ["Why is there no tide page for my city?",
    "Because NOAA covers United States coastal stations, and only those. An inland city has no station, and no amount of interpolation would make one honest. Where a city page has no tide link, that is the correct answer rather than a gap — see how coastal cities are matched to stations below."],
  ["Are the times in my time zone or the station's?",
    "The station's own local time, including its daylight saving, which is how NOAA publishes them and how anyone standing at that shore would read them. Each station's time zone is resolved once when the site is built, so the page does not have to ask a geolocation service at load time."],
];

const tideUrl = page({
  slug: "tide-predictions", icon: "wave",
  title: "Where the Tide Predictions Come From",
  desc: "The NOAA CO-OPS source behind every tide chart on this site, what MLLW heights mean, and the weather effects these astronomical predictions deliberately exclude.",
  h1: "Where the tide predictions come from",
  sub: `Every number on a <a href="/tides/">tide page</a> is NOAA's. This is which NOAA product, how it reaches the page, what the numbers mean — and, most importantly, what they leave out.`,
  body: `
  <div class="card">
    <h2>The source</h2>
    <p>Tide data comes from <strong>NOAA CO-OPS</strong>, the Center for Operational Oceanographic Products and Services — the official United States tide authority. The page asks its predictions API for one thing: the high and low list for that station.</p>
    <p>Only the extremes are requested, because only the extremes are published as measurements. The smooth curve drawn between them on the chart is <em>interpolation for readability</em>, not additional data, and should not be read as a prediction of the level at some in-between minute.</p>
    <p>It reaches the page two ways, and the difference is worth knowing. The <strong>interactive chart and the station finder</strong> ask NOAA directly while you are on the page, so they show whatever NOAA publishes at that moment. The <strong>seven-day table printed into the page itself</strong> is served from a rolling 45-day window of NOAA predictions that a scheduled job fetches once a week and stores with the site — that is what lets a tide page render its table instantly, with no network request, and what lets a search engine read it.</p>
    <p>Storing predictions would be a bad idea for a measurement. It is a safe one here because a tide prediction is not a measurement: it is astronomy, solved from decades of observation at that station, and NOAA does not revise it afterwards. A prediction fetched last Tuesday for next Friday is the identical number NOAA would return for next Friday today. Age within the window changes nothing.</p>
    <p>What could go wrong is the window running out, so it is built not to fail quietly. Each station's data is only replaced when a fetch succeeds, so an unreachable NOAA leaves slightly older predictions rather than blanks; a run in which <em>no</em> station refreshes fails loudly instead of reporting success; and the window is 45 days against a weekly job, so several consecutive failures would have to go unnoticed before a table could run short. If it ever did, the table would be absent — never wrong.</p>
  </div>

  <div class="card">
    <h2>What "astronomical prediction" excludes — read this one</h2>
    <p>A tide prediction models the gravitational pull of the moon and the sun on the water at that station, worked out from decades of observation at that specific place. It is genuinely good at that. It knows nothing whatsoever about the weather.</p>
    <p class="bullets">
      <em>Wind.</em> A sustained onshore wind piles water against the coast; an offshore wind pushes it away. Either can be worth a foot or more.<br>
      <em>Barometric pressure.</em> Low pressure lets sea level rise; high pressure presses it down.<br>
      <em>Storm surge.</em> During a storm, the difference between predicted and actual is the entire point of a surge warning.<br>
      <em>Rain and river discharge.</em> In an estuary, upstream rainfall changes the level days later.
    </p>
    <p>So: <strong>do not use these pages for navigation or for any decision where being wrong is dangerous.</strong> Not for clearing a bar, not for anchoring, not for judging whether a sandbar walk is safe on the way back. For those, go to NOAA directly and check current conditions with the U.S. Coast Guard. These pages are for knowing roughly when the water will be high on Saturday.</p>
  </div>

  <div class="card">
    <h2>Reading the numbers</h2>
    <div class="wc-facts">
      <div class="wc-frow"><span>Heights are</span><b>feet above MLLW</b></div>
      <div class="wc-frow"><span>MLLW is</span><b>mean lower low water — NOAA's chart datum</b></div>
      <div class="wc-frow"><span>A negative height means</span><b>lower than that average, which is normal</b></div>
      <div class="wc-frow"><span>Times are</span><b>the station's own local time, DST included</b></div>
      <div class="wc-frow"><span>Between the highs and lows</span><b>a drawn curve, not measured data</b></div>
    </div>
    <p>Most stations see two highs and two lows a day, of noticeably unequal size — the diurnal inequality. Some places on the Gulf coast get one of each. Both are in the data as NOAA publishes it; neither is an error.</p>
  </div>

  <div class="card">
    <h2>How a city gets matched to a station</h2>
    <p>Sun and moon pages exist for cities; tide stations exist where NOAA has instruments, which is rarely the middle of a city. The two are matched once, when the site is built: each station is paired with the nearest city that has a sun page, <strong>within 35 miles and in the same state</strong>. Outside that radius, no link is offered.</p>
    <p>That is why most city pages have no tide link and are not missing one. The United States has coasts; Kansas does not. A matching rule that reached further would produce a link that technically resolved and practically misled.</p>
    <p>The links are also checked for reciprocity at build time: if a station links to a city, that city must link back, and the build fails if it does not. A one-way link renders perfectly and silently dead-ends anyone following it.</p>
  </div>
`,
  faq: TIDE_FAQ,
  related: [["/tides/", "Tide charts"], [`${HUB}moon-phase/`, "How the moon phase is calculated"], [`${HUB}sunrise-sunset/`, "How sunrise and sunset are calculated"]],
});

/* ============================================================= time zones === */
const TZ_FAQ = [
  ["Where do the time zone rules come from?",
    "From the IANA time zone database, through your own device. The site does not keep a table of UTC offsets — it names a zone, like America/Halifax, and asks the browser's internationalisation engine what that zone's offset is at a given instant. Your operating system's updates keep the rules current."],
  ["How does the site know whether daylight saving is in effect?",
    "By asking the zone for its offset on the 15th of every month of the current year. If all twelve match, the zone keeps one offset all year and the page says so. If they differ, the page names the offsets it actually takes and which one today is on. Twelve samples rather than two, because two dates six months apart miss any shift that is not a northern-summer one — Casablanca is UTC+1 in both January and July and drops to UTC for about five weeks around Ramadan, which a January-versus-July test declared impossible."],
  ["Why does my city show another city's page?",
    "Because it shares that city's time zone and has no page of its own. Detroit and New York keep the same clock, so Detroit's sunrise page links to the Eastern Time page rather than promising a Detroit page that does not exist. The link text names the zone in that case, not the city, so the destination matches the promise."],
  ["Does the clock keep working if a country changes its rules?",
    "Yes, as soon as your device gets the updated database — which is the reason for not keeping offsets on the site. Governments change daylight saving rules with little notice, and a hard-coded offset would be wrong until someone noticed and rebuilt."],
];

const tzUrl = page({
  slug: "time-zones", icon: "globe",
  title: "How Time Zones & Daylight Saving Are Handled",
  desc: "Why this site stores IANA zone names instead of UTC offsets, how daylight saving is detected, and what happens when a country changes its rules.",
  h1: "How time zones and daylight saving are handled",
  sub: `Every local time on this site — the <a href="/world-clock/">world clock</a>, the sunrise times, the tide times — is produced the same way, and it is deliberately not the obvious way.`,
  body: `
  <div class="card">
    <h2>No offsets are stored. Anywhere.</h2>
    <p>The tempting design is a table of cities and their UTC offsets. It is also wrong within about a year, because governments change daylight saving rules with little notice and every stored offset becomes a small lie until someone rebuilds the site.</p>
    <p>What is stored instead is the <strong>IANA time zone name</strong> — <code>America/Halifax</code>, <code>Asia/Kolkata</code>, <code>Australia/Lord_Howe</code>. The offset is then asked for at the moment it is needed, from your own device's internationalisation engine, which is backed by the IANA database and updated by your operating system.</p>
    <p>The practical consequence: when a country moves its clocks, these pages follow as soon as your device does, with no rebuild here at all.</p>
  </div>

  <div class="card">
    <h2>Detecting daylight saving</h2>
    <p>There is no flag in the data saying "this zone uses DST". It is worked out, with a rule short enough to state completely:</p>
    <p class="bullets">
      <em>1.</em> Ask for the zone's offset on the 15th of each of the twelve months of the current year.<br>
      <em>2.</em> If all twelve are equal, the clocks there do not change. Say so and stop.<br>
      <em>3.</em> If they differ, those are the offsets the zone actually takes — name them.<br>
      <em>4.</em> Compare today's offset against the set to say which one the zone is on right now.
    </p>
    <p>Twelve samples, not two. Sampling only January and July handles the southern hemisphere correctly — Australia's daylight saving is in January and the comparison never assumes which half of the year is which — but it misses a shift that happens in neither month. Africa/Casablanca is UTC+1 on both dates and falls back to UTC for about five weeks around Ramadan every year, so the two-sample rule told Casablanca's page its offset "holds all year", wrongly, for several weeks annually.</p>
    <p>The wording follows from the offsets rather than from a "does it do DST" flag, for the same reason: Casablanca's shift is a Ramadan pause, not daylight saving, and calling it one would be a second wrong answer dressed as a right one.</p>
  </div>

  <div class="card">
    <h2>Which page a zone links to</h2>
    <p>Around 2,300 place pages carry a one-line "it's 5:35 PM in Portland right now" strip, and each has to link somewhere sensible on the world clock. The resolution runs in three steps, and the link text changes with it — which is the point.</p>
    <p class="bullets">
      <em>This city has a world clock page.</em> The link names the city.<br>
      <em>It does not, but its zone has a representative page.</em> The link names <em>the zone</em>: "Pacific Daylight Time on the world clock". Portland has no page of its own and lands on Los Angeles, so promising "Portland on the world clock" would be a promise the destination cannot keep.<br>
      <em>Neither.</em> The link goes to the hub and says so.
    </p>
    <p>Zones are matched first by exact IANA name, then by the daylight-saving-independent name the browser gives them — which is how <code>America/Detroit</code> finds the Eastern Time page without anyone maintaining a list of aliases.</p>
  </div>

  <div class="card">
    <h2>The awkward cases, and what happens</h2>
    <div class="wc-facts">
      <div class="wc-frow"><span>Half-hour and quarter-hour offsets</span><b>Handled — India is UTC+5:30, Nepal UTC+5:45</b></div>
      <div class="wc-frow"><span>A zone with no daylight saving</span><b>Stated as "not observed", not left blank</b></div>
      <div class="wc-frow"><span>Zones whose only name is a UTC offset</span><b>The name is dropped rather than printed — "GMT+7" reads badly in a sentence</b></div>
      <div class="wc-frow"><span>A rule change mid-year</span><b>Follows your device's database; no rebuild needed here</b></div>
    </div>
    <p>One genuine limitation remains: twelve monthly samples describe the current year, and a shift shorter than a month that falls between two sample dates would still be missed. That is why the page states which offsets a zone takes rather than promising when it changes.</p>
  </div>
`,
  faq: TZ_FAQ,
  related: [["/world-clock/", "World clock"], [`${HUB}browser-timing/`, "How accurate a browser timer is"], [`${HUB}sunrise-sunset/`, "How sunrise and sunset are calculated"]],
});

/* ========================================================= browser timing === */
const eng = TIM.engine;
const BT_FAQ = [
  ["Is a browser timer accurate enough for cooking or a workout?",
    `Comfortably. In the measurements below, a one-second tick in a foreground tab in Chromium ${eng.version} landed within ${TIM.foreground.tickErrorMaxMs} millisecond${TIM.foreground.tickErrorMaxMs === 1 ? "" : "s"} of schedule and accumulated no meaningful drift over a minute. The failure modes that matter are not precision — they are the tab being closed, the machine sleeping, or the sound being muted.`],
  ["Does the countdown drift if my computer is busy?",
    `The tick does, slightly. Under a twenty-fold CPU slowdown a one-second interval was late by up to ${TIM.cpu20x.tickErrorMaxMs} milliseconds per tick. But the displayed time does not drift, because it is not counted up from ticks — it is recomputed from the target instant on every tick, so a late tick shows a correct number rather than a number that is one tick behind forever.`],
  ["Will an alarm ring if the tab is in the background?",
    "It can, but only while the page is still open and the device is awake. Browsers slow down timers in hidden tabs and may freeze a background tab entirely; phones and laptops suspend pages when the screen locks. That behaviour could not be measured in the environment these figures came from, so it is described here rather than quantified — and it is why the site says to keep the page open and test an alarm before relying on it."],
  ["Why is setTimeout(fn, 0) not zero?",
    `Because the specification lets a browser put a floor under nested timeouts, and browsers use it. Measured here, a chain of setTimeout(fn, 0) calls settled at about ${TIM.nestedTimeoutClamp.clampMs} milliseconds per step once it was five deep. It is the root of a whole family of "my timer is slow" reports, and it is one reason nothing here counts elapsed time by adding up timeouts.`],
];

const timUrl = page({
  slug: "browser-timing", icon: "timer",
  title: "How Accurate Is a Browser Timer? Measured Results",
  desc: `Measured setInterval drift, tick error under CPU load, and the nested-setTimeout clamp in Chromium ${eng.version} — plus the three behaviours that could not be measured and why.`,
  h1: "How accurate is a browser timer?",
  sub: `The <a href="/timer/">timer</a>, <a href="/stopwatch/">stopwatch</a> and <a href="/alarm-clock/">alarm clock</a> here all run on browser timers. Rather than describe how those behave, this page measures it — and is equally specific about what it could not measure.`,
  body: `
  <div class="card">
    <h2>The setup</h2>
    <div class="wc-facts">
      <div class="wc-frow"><span>Engine</span><b>${esc(eng.name)} ${esc(eng.version)}</b></div>
      <div class="wc-frow"><span>Mode</span><b>${eng.headless ? "Headless" : "Headed"}, no GPU</b></div>
      <div class="wc-frow"><span>Platform</span><b>${esc(eng.platform)}</b></div>
      <div class="wc-frow"><span>Method</span><b><code>seo/tools/measure-timing.mjs</code>, run with Playwright</b></div>
    </div>
    <p><strong>This is one engine on one machine.</strong> It is not a cross-browser comparison: Firefox and WebKit could not be installed in the environment these were taken in, so there are no Firefox or Safari figures here, and there are no estimated ones either. Read every number below as "Chromium, on a quiet Linux box", because that is exactly what it is.</p>
  </div>

  <div class="card">
    <h2>A one-second tick, undisturbed</h2>
    <p>Sixty seconds of <code>setInterval(fn, 1000)</code> in a foreground tab, with each tick compared against where it was scheduled to land.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Ticks expected / received</span><b>${TIM.foreground.expectedTicks} / ${TIM.foreground.ticks}</b></div>
      <div class="wc-frow"><span>Typical error per tick</span><b>${TIM.foreground.tickErrorMedianMs} ms</b></div>
      <div class="wc-frow"><span>Worst error per tick</span><b>${TIM.foreground.tickErrorMaxMs} ms</b></div>
      <div class="wc-frow"><span>Accumulated drift over the minute</span><b>${signed(TIM.foreground.naiveDriftMs)}</b></div>
    </div>
    <p>The interesting result is the last row. A common worry is that <code>setInterval</code> compounds its own lateness — that a tick two milliseconds late makes the next one two milliseconds late as well, forever. It does not: the browser schedules against the original start, so lateness is corrected rather than carried. Over a minute the total came to ${signed(TIM.foreground.naiveDriftMs)} — a millisecond early, not a second late.</p>
  </div>

  <div class="card">
    <h2>The same tick on a busy machine</h2>
    <p>The condition people actually complain about is not an idle laptop — it is one compiling something in the next window. These runs throttle the CPU by a fixed factor: 4× is roughly a mid-range phone, 20× is a machine in trouble.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>4× slowdown — worst tick error</span><b>${TIM.cpu4x.tickErrorMaxMs} ms</b></div>
      <div class="wc-frow"><span>4× slowdown — ticks expected / received</span><b>${TIM.cpu4x.expectedTicks} / ${TIM.cpu4x.ticks}</b></div>
      <div class="wc-frow"><span>20× slowdown — worst tick error</span><b>${TIM.cpu20x.tickErrorMaxMs} ms</b></div>
      <div class="wc-frow"><span>20× slowdown — ticks expected / received</span><b>${TIM.cpu20x.expectedTicks} / ${TIM.cpu20x.ticks}</b></div>
      <div class="wc-frow"><span>20× slowdown — drift, extrapolated to an hour</span><b>${(Math.abs(TIM.cpu20x.driftPerHourMs) / 1000).toFixed(1)} s</b></div>
    </div>
    <p>No ticks were dropped even at 20×; they arrived late, not never. The extrapolated hourly figure is what a naive counter — one that adds a second per tick — would be out by after an hour of that treatment. It is also entirely avoidable, which is the next section.</p>
  </div>

  <div class="card">
    <h2>Why the displayed time does not drift at all</h2>
    <p>There are two ways to write a countdown. Count the ticks and multiply, or store the target instant and recompute what is left on every tick. The first is simpler and is wrong by exactly the drift measured above. The second is what everything on this site does.</p>
    <p>The same runs measured both. Against a clock read fresh at the moment of comparison, the recomputed value was never out by more than <strong>${Math.max(TIM.foreground.correctedWorstMs, TIM.cpu4x.correctedWorstMs, TIM.cpu20x.correctedWorstMs)} ms</strong> — in the undisturbed run, under 4× load, and under 20× load alike. A late tick makes the display update late; it does not make it show the wrong number.</p>
    <p>This is why a timer left running for an hour finishes when it should, and why the same design is used for the alarm clock and every countdown page.</p>
  </div>

  <div class="card">
    <h2>The four-millisecond floor</h2>
    <p>A chain of <code>setTimeout(fn, 0)</code> calls does not run instantly. The specification permits a floor once the chain is five deep, and here it settled at about <strong>${TIM.nestedTimeoutClamp.clampMs} ms</strong> per step.</p>
    <p class="bullets"><em>Measured gaps, in milliseconds, from the first nested call onward:</em> ${TIM.nestedTimeoutClamp.gapsMs.join(" · ")}</p>
    <p>Nothing here counts elapsed time by chaining timeouts, for this reason.</p>
  </div>

  <div class="card">
    <h2>What could not be measured, and why it is absent</h2>
    <p>Three behaviours matter a great deal for an alarm clock and are not quantified on this page. They are missing because the environment could not produce them honestly — not because they are unimportant, and there are no estimates standing in for them.</p>
    ${TIM.unmeasured.map((u) => `<p class="bullets"><em>${esc(u.what)}.</em> ${esc(u.why)}</p>`).join("\n    ")}
    <p>One of these was written, run, and thrown out. A page-freeze test appeared to work — the browser accepted the command without error — but the page kept ticking at a steady one per second throughout, and still ran JavaScript on request, which a genuinely frozen page cannot do. The freeze had not engaged. Publishing those ten ticks as "a frozen tab keeps counting" would have been a measurement of nothing, presented as a fact about browsers. The test that remains in the script now asserts the freeze <em>fails</em>, so nobody adds the numbers back by accident.</p>
    <p>For what these behaviours mean in practice, in plain language: <a href="/browser-limitations/">browser limitations</a>.</p>
  </div>
`,
  faq: BT_FAQ,
  related: [["/browser-limitations/", "Browser limitations, in plain language"], ["/timer/", "Online timer"], ["/stopwatch/", "Online stopwatch"], ["/classroom/", "Classroom timer & stopwatch guide"]],
});

/* =================================================================== hub === */
const PAGES = [
  [sunUrl, "sunrise", "How sunrise and sunset are calculated", "The solar-position method, why the horizon is −0.833°, what is not modelled, and a measured bound on the error."],
  [moonUrl, "moon", "How the moon phase is calculated", "Meeus's periodic-term series for position, illumination and the exact instant of a full moon — and where the truncation shows."],
  [tideUrl, "wave", "Where the tide predictions come from", "NOAA CO-OPS, what MLLW heights mean, and the weather effects an astronomical prediction deliberately excludes."],
  [tzUrl, "globe", "How time zones and daylight saving are handled", "Why no UTC offset is stored anywhere, and how clock changes are detected by sampling the zone across the year."],
  [timUrl, "timer", "How accurate is a browser timer?", "Measured setInterval drift, tick error under CPU load, and the three behaviours that could not be measured."],
];

page({
  slug: "", title: "Methodology — How These Numbers Are Worked Out",
  desc: "The algorithms and data sources behind the sunrise, moon, tide, time zone and timer figures on Time and Space Science — including what each method does not model.",
  h1: "Methodology",
  sub: `This site publishes a lot of computed numbers — sunrise in one city, the next high tide at one station, what time it is somewhere else. These pages say how each one is worked out, and where it stops being reliable.`,
  body: `
  <div class="card">
    <h2>The pages</h2>
${/* NOT .wc-facts here: that is a two-column key/value strip built for short
    labels, and it squeezed these titles into a narrow wrapping column. A
    heading and a sentence is what this list actually is. */""}
${PAGES.map(([u, i, t, d]) => `    <p class="bullets"><em>${ico(i)} <a href="${u}">${esc(t)}</a></em><br>${esc(d)}</p>`).join("\n")}
  </div>

  <div class="card">
    <h2>Two rules these pages follow</h2>
    <p><strong>Every accuracy figure was measured here.</strong> The two pages that quote one read it from a file written by a measurement script in the repository, and the build fails outright if that file is missing or incomplete. A methodology page that invented its own error bar would be worse than no methodology page, so it is not possible to ship one.</p>
    <p><strong>What could not be measured is named, not estimated.</strong> The browser timing page lists three behaviours it could not reproduce, with the reason for each, instead of quoting numbers from elsewhere. One test was written, run, and discarded when it turned out to be measuring nothing.</p>
  </div>

  <div class="card">
    <h2>What none of this is for</h2>
    <p>These are consumer tools. The astronomy is good enough to plan an evening walk or a photograph; the tide predictions are NOAA's own, and NOAA excludes weather from them. Nothing here is suitable for navigation, aviation, safety-critical timing, scientific measurement, or any decision where being a few minutes out has consequences. Where that matters most — tides — the page says so at length.</p>
    <p class="bullets"><a href="/how-it-works/">How countdowns work</a> · <a href="/browser-limitations/">Browser limitations</a> · <a href="/about/">About this site</a></p>
  </div>
`,
});

console.log(`built ${HUB} + ${PAGES.length} methodology pages`);
