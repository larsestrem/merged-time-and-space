#!/usr/bin/env node
/* build-classroom.mjs — /classroom/, the teacher's guide to the timer and the
 * stopwatch.
 *
 * WHY A GUIDE AND NOT ANOTHER TOOL PAGE. /timer/ and /stopwatch/ answer "I need
 * a timer now". This answers "how do I actually run this in a room of thirty
 * children, on a projector, without it letting me down mid-lesson" — which is a
 * different search and a different need. It is also the page a teacher-resource
 * site can link to, which /timer/ is not: nobody links to a tool, they link to
 * an explanation of how to use one.
 *
 * EVERY CLAIM HERE IS CHECKED AGAINST THE TOOLS. The keyboard shortcuts, the
 * three-timer limit, the CSV and image export, the full-screen modes — all
 * verified in the emitted pages, not assumed. That matters more than usual on
 * this page: a teacher who plans a lesson around a feature that doesn't exist is
 * let down in front of a class, and the limitations section is here for exactly
 * the same reason. A browser timer stops when the laptop sleeps, and the page
 * says so before a teacher finds out the hard way.
 *
 *   node seo/tools/build-classroom.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, learningLd } from "./lib.mjs";
import { ico } from "./icons.mjs";
import { CLASS_IDEAS } from "./class-ideas.mjs";
/* the one figure this page quotes from the solar drawing. Derived, not typed:
   the sentence below and the picture it describes must not be able to drift. */
import { RUNGS, FRAME_R, PL_EL, SOL_FRAME, EM_EARTH_PX, EM_MOON_PX } from "./planets.mjs";
import { MARBLE } from "./build-simulator.mjs";
/* the corridor walk is a measurement a class actually paces out, so it follows
   the reader's units like every other figure — see units.mjs */
import { mm, cm, metres } from "./units.mjs";
import { LAUNCH_PATH as ROCKET_PATH, PLANETS_PATH, planetPath } from "./solar-pages.mjs";
import { DAYNIGHT_PATH } from "./daynight.mjs";
import { sectionSwitcher } from "./section-nav.mjs";
import { hubQuestionsCard, placeQuestionsCard } from "./concepts.mjs";
import {
  lessonForm, questionsForm, FORMS_JS, plaque, submitCta,
  SUBMIT_PATH, LESSON_FORM_HASH, QUESTIONS_HASH,
} from "./classroom-forms.mjs";
const OUTER_RUNG = RUNGS.filter((r) => r.kind === "sys").pop().outer;
const MERCURY_PX = Math.round(PL_EL[0][1] / OUTER_RUNG * FRAME_R * 2);

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const PATH = "/classroom/";

/* The lengths a lesson actually runs on, each an existing preset page. Uses are
 * the ones teachers themselves describe in write-ups of classroom timers —
 * beat-the-clock tidy-ups, timed writing bursts for stamina, rapid-fire maths
 * drills, brain breaks, timed centres — rather than lengths invented to fill a
 * table. Labels are abbreviated to "min" so ten of them fit in a few rows.
 * NOTE 60 min maps to /timer/1-hour/: the URL scheme turns whole hours into
 * "1-hour", so the label and the slug differ here on purpose. */
const PRESETS = [
  ["1-minute", "1 min", "beat-the-clock tidy-up, quick-fire recall, a countdown into silence"],
  ["2-minutes", "2 min", "transitions between activities, packing away, lining up"],
  ["3-minutes", "3 min", "brain break \u2014 jumping jacks, a song, a stretch"],
  ["4-minutes", "4 min", "think-pair-share, a rapid maths drill run as a game"],
  ["5-minutes", "5 min", "timed free writing for stamina, warm-up, exit ticket"],
  ["10-minutes", "10 min", "centre or station rotation, small-group task"],
  ["15-minutes", "15 min", "silent reading, extended writing"],
  ["20-minutes", "20 min", "independent practice, project work block"],
  ["30-minutes", "30 min", "assessment section, test block"],
  ["1-hour", "60 min", "a full period, an exam, a whole-lesson countdown"],
];

const FAQ = [
  ["Does the timer keep running if I switch tabs?",
    "It keeps counting, but it can only ring while the page is still open — the tab can be in the background, the window can be behind another, but the page has to be there. If the laptop sleeps or the tab is closed, the alarm won't sound. On a classroom machine, leave the timer tab open on the projector output."],
  ["Can I run more than one timer at once?",
    "Yes — up to three at the same time on the timer page, each with its own length, its own label and its own alarm sound. That covers a rotation where three groups are on different clocks."],
  ["What are the keyboard shortcuts?",
    "On a timer's own page: Space starts and pauses, R resets. On the stopwatch: Space starts and stops, L records a lap, R resets. The multi-timer board on the main timer page is click-only — the shortcuts live on the single-duration pages."],
  ["How do I get the lap times out of the stopwatch?",
    "Two ways: CSV saves a spreadsheet that opens in Excel, Google Sheets or Numbers — one row per stopwatch, a column for each lap, then the total — and Share builds a single image of the session to send or save. Both files are named for the date and time you took them, so a term's worth of them sorts itself. Nothing is uploaded; the session lives on that device."],
  ["Is it accurate enough for a science experiment?",
    "For classroom work, yes — it times to a hundredth of a second. It is not calibrated equipment: the precision your device actually shows varies by browser and machine, and a background tab may update less often. It is not suitable for official sports timing, scientific measurement or anything medical."],
  ["Can I use the astronomy simulators on a projector?",
    "Yes — both are full-width and run in the browser with nothing installed. The Sun, Earth & Moon simulator has a page for every city, so you can open the one for your own town, and the location, date, time and span are all in the URL, which means one link puts every screen in the room on the same sky. Both carry a scale card explaining exactly what the drawing gets wrong, which is worth reading out loud."],
  ["Do I need an account?",
    "No. There's no sign-up and nothing to install — it runs in the browser, and anything you save (a running stopwatch, its laps) stays on that computer."],
];

const presetChips = PRESETS.map(([slug, label]) =>
  `<a class="chip" href="/timer/${slug}/">${esc(label)}</a>`).join("");
const presetRows = PRESETS.map(([slug, label, use]) =>
  `      <div class="wc-frow"><span><a href="/timer/${slug}/">${esc(label)} timer</a></span><b>${esc(use)}</b></div>`).join("\n");


/* ---- /classroom/lessons/ — a full lesson plan, and the matrix -------------
 *
 * WHY A SECOND PAGE. /classroom/ explains the tools; this page runs a class.
 * A teacher searching "solar system lesson plan 4th grade" wants a timed,
 * printable sequence with the links already made — not a guide to a stopwatch.
 * It is also the second linkable asset for teacher-resource sites: directories
 * list lesson plans, not tools.
 *
 * EVERY LINK CARRIES ITS VIEW IN THE QUERY STRING, and every parameter here is
 * one the simulators actually read (build-solar.mjs: zoom/span/speed/belt/
 * comets/to/date; build-simulator.mjs: city/lat/lon/tz/name/date/time/span).
 * A lesson link that opens the wrong view lets a teacher down in front of a
 * class, which is the one failure this page must never have — so nothing below
 * invents a parameter, and the honesty card says out loud what the simulator
 * fakes (moon starting positions, exaggerated orbit tilts in the tilted view),
 * because "is that real?" is a question a student will ask.
 *
 * THE SEASON DATES ARE COMPUTED, NOT TYPED. The solstice links below always
 * point at the NEXT June 21 / December 21, worked out at build time — the
 * hourly rebuild keeps them from ever going stale, which is the same reason
 * the site bakes "today" everywhere else. */
/* ---- /classroom/lessons/ — the lesson-plan family -------------------------
 *
 * WHY A FAMILY AND NOT ONE PAGE. /classroom/ explains the tools; these pages
 * run a class. A teacher searching "moon phases lesson 2nd grade" and one
 * searching "Kepler's laws activity high school" are different searches, and
 * folding them onto one page ranks for neither. So: a hub that opens with the
 * questions classes actually ask, and one page per topic PER GRADE BAND.
 *
 * THE ESCALATION RULE is what keeps five pages on one topic honestly
 * different: every band re-asks the SAME driving question one level deeper —
 * K–2 observe it, 3–4 describe the pattern, 5–6 measure it, 7–8 explain the
 * mechanism, high school quantify it and question the model. The mode is
 * printed on each page so the ladder is visible to the teacher choosing.
 *
 * EVERY LESSON OPENS WITH WHAT IT ASSUMES. The "before the lesson" block
 * names the knowledge taken as given and links the TOOL pages where a student
 * can build it beforehand — deliberately the tools and topics, never the
 * lower band's lesson page, so pre-work is exploration rather than a
 * curriculum to catch up on. Each lesson also ends with questions a student
 * can chase alone, because the tools work as well at a kitchen table as on a
 * projector.
 *
 * STUDENT-TAUGHT LESSONS are a first-class idea here (the hub's "Students
 * teach the class" card): every step of every plan carries its own minutes,
 * so any single step IS a ready-made five-minute lesson a student can be
 * handed — and the card carries the topic list and the how-to-use-AI recipe.
 *
 * EVERY LINK CARRIES ITS VIEW IN THE QUERY STRING, and every parameter is one
 * the simulators actually read (build-solar.mjs: zoom/span/speed/belt/comets/
 * to/date; build-simulator.mjs: city/lat/lon/tz/name/date/time/span). Nothing
 * below invents a parameter, and each topic's honesty note says out loud what
 * the drawing fakes — "is that real?" is a question a student will ask.
 *
 * EXTERNAL LINKS are limited to sources a teacher can cite without checking:
 * NASA (Space Place for the younger bands, science.nasa.gov above that),
 * NOAA, and PhET (University of Colorado). They open in a new tab, marked
 * noopener, and each says what it adds — never a bare "more here".
 *
 * THE SEASON DATES ARE COMPUTED, NOT TYPED: the solstice/equinox links always
 * point at the NEXT June 21 / September 22 / December 21, worked out at build
 * time, so the hourly rebuild keeps them from ever going stale.
 *
 * FEEDBACK: every lesson page ends with a form posting to /api/report with
 * reason "Lesson feedback" (email optional server-side, same as "Site idea").
 * The promise mirrors the classroom ask-form: an improvement that gets used
 * credits the teacher on the page. Three topics are built deep now; the four
 * planned ones are listed on the hub with the form as the way to vote. */
const LPATH = "/classroom/lessons/";
const nextOn = (m, d) => {
  const now = new Date();
  let t = new Date(Date.UTC(now.getUTCFullYear(), m - 1, d));
  if (t.getTime() < now.getTime()) t = new Date(Date.UTC(now.getUTCFullYear() + 1, m - 1, d));
  return t.toISOString().slice(0, 10);
};
const JUN21 = nextOn(6, 21), DEC21 = nextOn(12, 21), SEP22 = nextOn(9, 22);
const SOL = "/solar-system-simulator/";
/* A PLANET'S OWN PAGE, from the registry. These lessons used to send classes to
   `${SOL}<planet>/`, which is where the planet pages lived before they went
   flat — every one of those was a redirect, on links a teacher may have
   printed. planetPath is the one place that knows the real URL. */
const PL = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
  .reduce((m, slug, i) => (m[slug] = planetPath(slug, i), m), {});
const SIM = "/sun-moon-earth-movement-simulator/";

/* One row of a lesson: a label (a minute range, or "Task 2"), then the task.
   Rendered with the .lp-steps prose variant of the .wc-frow rows. */
/* a step row. `what` is what the TEACHER does; `you`, when a lesson provides
   it, is what the STUDENTS are doing during the same minutes — the split the
   template asks for, rendered as a second line so the two-column intent
   survives a phone screen. */
const step = (t, what, you) => `      <div class="wc-frow"><span>${esc(t)}</span><b>${what}${you ? `<span class="lp-you"><em>Students:</em> ${you}</span>` : ""}</b></div>`;

const BANDS = [
  { s: "grades-k-2", n: "Grades K–2", mode: "Observe it" },
  { s: "grades-3-4", n: "Grades 3–4", mode: "Describe the pattern" },
  { s: "grades-5-6", n: "Grades 5–6", mode: "Measure it" },
  { s: "grades-7-8", n: "Grades 7–8", mode: "Explain the mechanism" },
  { s: "high-school", n: "High school & up", mode: "Quantify it — and question the model" },
];

const TOPICS = [
  { s: "solar-system", n: "The solar system and gravity", ico: "solar",
    drive: "Why does everything out there orbit — and why don't the planets fall into the sun?",
    honest: "On every system view the planet dots are drawn far larger than scale, and where each moon sits along its orbit is illustrative — sizes, distances, speeds and directions are real, positions are not solved, and the pages say so.",
    curious: [
      ["If gravity pulls everything, why doesn't the moon fall on us?",
        `Here's the secret: it <em>is</em> falling — right now, continuously — and missing. The moon moves sideways so fast that by the time it has fallen toward Earth, the Earth's surface has curved away beneath it. An orbit is a fall that never lands. Newton figured this out by imagining a cannon on a mountain firing faster and faster until the cannonball fell all the way around the world — and that thought experiment is every satellite, the space station, and the moon.`],
      ["Why don't the planets ever crash into each other?",
        `Mostly they can't — each is locked in its own lane by its own speed, and the lanes are separated by distances that make the planets themselves like grains of sand miles apart. But here's the part worth knowing: early on, they <em>did</em> crash. The leading theory for where the moon came from is a Mars-sized world hitting the young Earth. The quiet, orderly system in the simulator is the survivor of a demolition derby — the orbits you see are the ones that lasted.`],
      ["How does the sun keep burning? There's no air in space!",
        `Because it isn't burning — fire needs air, and the sun would have burned out in a few thousand years if it were a bonfire. The sun is <em>crushing</em>: its own gravity squeezes its core so hard that hydrogen atoms fuse together, and fusion releases millions of times more energy than fire. It has run this way for 4.6 billion years and is about halfway through its fuel. Nothing is on fire. Something much stranger is happening.`],
    ] },
  { s: "moon-phases", n: "The moon and its phases", ico: "moon",
    drive: "Why does the moon light up differently through the month?",
    honest: "The phase, illumination and rise/set times are solved from the real orbit for the class's own town. The simulator's view deliberately draws no Earth shadow — a drawn shadow would imply an eclipse every month, which is exactly the misconception the 7–8 lesson takes apart.",
    curious: [
      ["Why can I see the moon in the daytime?",
        `Because the moon doesn't know about our night. It's above the horizon about twelve hours out of every twenty-four, and those hours drift through the whole clock as the month goes by — so roughly <em>half of all moon-watching time is daytime</em>. (<a href="/moon/near-me/">Your town's moon page</a> shows exactly when it's up today.) It's simply bright enough to beat the blue sky. The surprise isn't that you sometimes see a daytime moon; it's that anyone ever told you the moon belongs to the night.`],
      ["Why does the moon look huge when it's rising?",
        `Photograph it and check: the rising moon is exactly the same size in the picture as the high moon — your camera isn't fooled, but your brain is. This is the "moon illusion," and here is the genuinely great part: it has been argued about since the ancient Greeks and <em>there is still no fully agreed explanation</em>. It is one of the oldest open questions about your own mind, and you can run the experiment tonight with a phone.`],
      ["Why does the moon turn red in an eclipse?",
        `Because during <a href="/moon/eclipses/">a lunar eclipse</a> the only light reaching the moon has skimmed through the ring of Earth's atmosphere — the same air that makes sunsets red. Stand on the moon during totality and you'd see why: the Earth, black, ringed by a thin band of fire that is <em>every sunrise and every sunset on Earth happening at once</em>. That's the light painting the moon. A blood moon is our own sky, reflected back at us.`],
    ] },
  { s: "seasons", n: "The seasons and the length of a day", ico: "sunrise",
    drive: "Why is it summer here and winter in Sydney — on the same day?",
    honest: "Every sunrise is computed in the browser from the date and the place, never looked up, so any date works. The solver assumes a flat horizon — a mountain to the east makes the real sunrise later than the page says, and the methodology pages state the accuracy bounds.",
    curious: [
      ["Why isn't the hottest day the longest day?",
        `The longest day is <a href="/sun/near-me/">around June 21 — check yours</a> — but the hottest weeks come in July and August. Why the lag? Because the land and the oceans are still <em>filling up</em> with heat, like an oven that keeps warming after you turn the dial. As long as each day brings in more heat than the night lets out, temperatures keep climbing — even as the days start shrinking. The sea does the same thing harder: beach water is warmest in September, months after the sun's peak.`],
      ["Do people at the equator have seasons?",
        `Not ours. Day length barely moves — <a href="/sun/singapore/">check Singapore on any date</a>, it's near 12 hours year-round — and there's no warm-and-cold cycle to hang "summer" on. Instead the year is carved into <em>wet and dry</em> seasons as the planet's rain belt migrates north and south, chasing the overhead sun. And there's a bonus strangeness: at the equator the sun passes <em>straight overhead</em> twice a year, and on those days at noon, you have almost no shadow.`],
      ["If we're closer to the sun in January, shouldn't January be warmer?",
        `It is — in Australia: <a href="/sun/sydney/">look at Sydney's daylight today</a> against your own town's. That's the tell that unravels the whole "closer = summer" idea: Earth really is 3 million miles closer to the sun in early January, and the southern hemisphere really is in summer then. The distance change is real but small (about 3%); the tilt's effect on sun-angle and day length is enormous. The 7–8 lesson turns this exact trap into a full period of hypothesis-testing.`],
    ] },
  /* the three younger topics below start with their strongest band and grow
     from there — the matrix shows the empty rungs as "coming", and the
     feedback form is how a teacher asks for one to be built next */
  { s: "earth-moon-sun", n: "The Earth, moon and sun as one machine", ico: "earthmoon",
    drive: "The day, the month and the year — how does one machine keep all three clocks?",
    honest: "The simulator's own scale card computes how wrong its picture is from the drawing's real geometry — the moon drawn tens of times too close, the sun thousands — so the disclaimer updates itself and can never go stale. Read the numbers off the card, not off this page.",
    curious: [
      ["Why isn't there a solar eclipse every day? The moon's right there next to the sun!",
        `A kid watching <a href="${SIM}">this very simulator</a> asked exactly this, and it deserves a real answer. The daily lap you're watching is <em>us</em> — the Earth's turn sweeps the sun and moon across the sky together, like two pictures on a spinning wall; the moon barely creeps along its own orbit in one day. Watch <a href="${SIM}system/">all three bodies moving at once</a> and you can see it: the moon only actually passes the sun once a month (that's what a new moon is) — and even then it usually misses, because its orbit is tilted 5°, which at the sun's distance means passing ten sun-widths above or below. And on the rare month it does hit? The shadow's tip touching Earth is only ~100 miles wide. Any one town waits, on average, about 375 years for <a href="/moon/eclipses/">a total eclipse</a>. That's why people cross oceans for four minutes of darkness.`],
      ["Why does the moon follow me when we drive?",
        `Because it is absurdly far away. Trees and houses slide past because a mile of driving changes your angle to them; a mile of driving changes your angle to the moon by nothing your eye can detect — it is a quarter of a million miles away. Only impossibly distant things "follow" you. The moon follows the car <em>because</em> of the exact distance the corridor-walk in task 4 is about.`],
      ["If the Earth is spinning a thousand miles an hour, why can't I feel it?",
        `For the same reason you can pour a drink on a smooth flight: you, the air, and everything around you are all moving <em>together</em>, and your body only feels <em>changes</em> in motion. The spin does show itself, though — it's why hurricanes rotate, and why <a href="${SIM}?span=day">the simulator's sun arcs across the sky</a> at exactly 15° an hour. You can't feel the turn, but you can clock it.`],
    ] },
  { s: "light-speed", n: "The speed of light and the light year", ico: "rocket",
    drive: "How old is the sunlight hitting your desk — and how can a year measure a distance?",
    honest: "Light's travel is not drawn anywhere on this site — no picture could show it honestly, since at any legible scale the crossing is instant. This lesson is pure arithmetic on real distances from the planet pages, which is exactly the point: past the moon, distance IS time.",
    curious: [
      ["If the sun vanished right now, when would we know?",
        `Not for 8 minutes and 19 seconds — and not by any means whatsoever. The last eight minutes of sunlight would still be arriving, perfectly ordinary. Stranger still: <em>gravity itself travels at the speed of light</em>, so the Earth would keep orbiting the empty point where the sun had been for those same eight minutes. Nothing in the universe — not light, not gravity, not information of any kind — can outrun that speed limit. (We've checked: when two black holes collided, their gravitational waves and their light reached us together.)`],
      ["Can anything go faster than light?",
        `Nothing can move <em>through</em> space faster than light — but space itself is under no such rule. The universe's expansion stretches the distances between far galaxies faster than light could cross them, which is how a 13.8-billion-year-old universe can be 93 billion light-years wide. Nothing broke the speed limit; the road itself grew. This is the kind of sentence that sounds like cheating until the arithmetic in task 4 makes it land.`],
      ["When I look at a star, am I really looking back in time?",
        `Yes — literally, not poetically. Tonight's Proxima light is 4¼ years old; the North Star's light left around the time your great-great-grandparents were born; and with the naked eye from a dark field you can see the Andromeda galaxy — light 2½ <em>million</em> years old, older than our species. There is no "now" out there to see. Every look up is a look back, and the farther you look, the deeper into the past you're seeing.`],
    ] },
  { s: "leap-year", n: "Leap years and the calendar", ico: "calendar",
    drive: "Why does February grow a day every four years — and who decided?",
    honest: "The year's true length (365 days, 5 hours, 48 minutes, 46 seconds) is a measured fact this lesson hands over rather than derives — what the class derives is everything the fraction forces: the drift, the fix, and the fix's own error.",
    curious: [
      ["When does someone born on February 29 have a birthday?",
        `There are about five million "leaplings" alive, and the law genuinely disagrees about them: in New Zealand a leapling's off-year birthday falls on February 28; in the United Kingdom it's March 1. Same person, different birthday, depending on the country. Which is a perfect little lesson hiding in a party question: the calendar is not nature — it's law, and laws differ.`],
      ["Why is the extra day stuck in February, of all places?",
        `Because you are looking at a 2,700-year-old fossil. In the early Roman calendar the year began in March — February was the <em>last</em> month, so the year's loose change got tucked into the end, where the fewest festivals would notice. The year's start later moved to January; the leap day never moved at all. Your wall calendar contains archaeology.`],
      ["Could we ever need a leap SECOND?",
        `We already do — and they're stranger than leap days. The Earth's spin isn't perfectly steady (tides are slowly braking it, and even earthquakes nudge it), so every few years the world's atomic clocks pause for one extra second to let the planet catch up. Computers hate this — a minute with 61 seconds breaks software — and the world's timekeepers have voted to abandon leap seconds by 2035. The calendar bends to the sky; the internet is winning the argument with the Earth.`],
    ] },
];

const PLANNED = [
  ["Day and night", "the Earth's turn, the terminator line, and who on the world map is asleep right now"],
  ["How big and how empty space is", "the to-scale Earth and Moon, the corridor scale model, and the peppercorn walk"],
  ["Measuring time itself", "the one-minute calibration game, repeated trials, and how far a browser timer can be trusted"],
  ["Tides", "the sun–moon angle over a month beside a real NOAA station's predictions (US coastal classes)"],
];

/* -------- the 15 lessons: LESSONS[topic][band] ----------------------------
 * Each lesson: t title, mins, ngss, before (assumed knowledge + pre-lesson
 * exploration, linking TOOLS not lessons), steps ([label, html] — every label
 * carries its minutes, so any step can be handed to a student as their own
 * five-minute lesson), find (the teacher's key), solo (questions a student
 * answers alone with the tools), ext (external references). */
/* the ladder of distance units — shared by the light-speed lesson's card and
   the /classroom/distance-units/ glossary page, so the two can't disagree */
const LADDER_HTML = `<div class="wc-facts lp-steps">
      <div class="wc-frow"><span>kilometre / mile</span><b>The Earth's own scale: 12,742 km (7,918 mi) across. The last rung where these units feel like numbers.</b></div>
      <div class="wc-frow"><span>light-second</span><b>299,792 km — 7½ times around the Earth. The moon sits 1.28 light-seconds up; your voice on a moon radio carries that lag.</b></div>
      <div class="wc-frow"><span>astronomical unit (AU)</span><b>149.6 million km: the Earth–sun distance, 8.3 light-minutes. The solar system's ruler — Mars 1.5 AU, Neptune 30 AU. Every planet page's distances reduce to it.</b></div>
      <div class="wc-frow"><span>light-hour</span><b>Neptune is about 4.2 light-hours out. Voyager 1, the farthest machine ever sent, is roughly 23 light-hours away after ~48 years of flying.</b></div>
      <div class="wc-frow"><span>light-year</span><b>9.46 trillion km — 63,241 AU. The nearest star, Proxima Centauri, is 4.25 of them: nine thousand times the distance to Neptune.</b></div>
      <div class="wc-frow"><span>parsec</span><b>3.26 light-years — the professionals' unit, defined by geometry rather than time: the distance at which the Earth's orbit appears one arcsecond wide. Measured distances to stars really are made this way, by watching them shift as we orbit.</b></div>
      <div class="wc-frow"><span>kiloparsec</span><b>1,000 parsecs — about 3,260 light-years. The centre of our galaxy is about 8 kpc away; the Milky Way's disc spans ~30 kpc.</b></div>
      <div class="wc-frow"><span>megaparsec</span><b>A million parsecs — the unit of galaxies: Andromeda, the nearest big one, is ~0.78 Mpc. The universe's expansion rate is quoted per megaparsec.</b></div>
      <div class="wc-frow"><span>gigaparsec</span><b>A billion parsecs — the edge of the map: the observable universe reaches ~14 Gpc, about 46 billion light-years, in every direction. There is no bigger rung; past this there is nothing observed to measure.</b></div>
    </div>`;

const LESSONS = {
  /* ============================ SOLAR SYSTEM ============================= */
  "solar-system": {
    "grades-k-2": {
      t: "The planet race", mins: 20, ngss: "Builds toward 1-ESS1-1 (patterns of objects in the sky).",
      before: [
        `Assumes nothing — this works as the first space lesson of the year.`,
        `Optional pre-work, at home or in a spare five minutes: open <a href="${SOL}">the solar system simulator</a> and just press Play. Wandering around it first makes the race feel like a place they've been.`,
      ],
      steps: [
        ["Warm-up · 3 min", `Ask who can name a planet. Count how many the class can name together, then open <a href="${SOL}?zoom=neptune">all eight at once</a> on the projector and count the real answer.`],
        ["Task 1 · 6 min", `Open <a href="${SOL}?zoom=inner&span=year&speed=30">the four inner planets with a year on the slider</a> and press <strong>Play</strong>. It's a race. Ask: who's winning? Let them shout it — then ask the only question that matters: <em>what does the winner have that the others don't?</em> (It's nearest the sun.)`],
        ["Task 2 · 5 min", `Count together: how many times does Mercury go round while Earth goes round once? (Four.) Every lap of Earth's is one whole year — a birthday.`],
        ["Task 3 · 4 min", `Open <a href="${SOL}?zoom=moon">the Earth and its moon</a> — the one picture where the sizes and the distance are both true. Ask: which dot do we live on? Where is everything else? (Empty. Space is mostly empty, and that surprises everyone.)`],
        ["Wrap-up · 2 min", `Three things on the board, in their words: the planets go round the sun; they never bump; the closest one moves fastest.`],
      ],
      find: [
        "Mercury completes about four orbits per Earth year — the class counts it live.",
        "Nearest-the-sun and fastest are the same planet; the pattern holds all the way out.",
        "On the to-scale view the Earth is a handful of pixels and the moon a dot — the emptiness is the lesson.",
      ],
      solo: [
        `Which planet would you most want to visit? Open <a href="${SOL}">its page</a> with a grown-up and find one thing about it nobody in class said.`,
        `Watch <a href="${SOL}?zoom=inner&span=year&speed=30">the race</a> again at home: does the same planet always win?`,
      ],
      ext: [
        ["NASA Space Place: All About the Planets", "https://spaceplace.nasa.gov/menu/solar-system/", "one illustrated page per planet, written for exactly this age"],
        ["ESA Kids", "https://www.esa.int/kids/en/home", "short animations and activities for early primary"],
      ],
    },
    "grades-3-4": {
      t: "The solar system, gravity and moons", mins: 45, ngss: "Builds toward 5-ESS1-2; the same ground sits under MS-ESS1-2/3 for older classes.",
      flagship: true,
      before: [
        `Assumes the class knows the planets go around the sun — nothing more.`,
        `Pre-work (10 minutes, alone or in pairs): open <a href="${SOL}">the solar system simulator</a>, press Play, and try two zoom buttons. Arriving already knowing the controls buys the lesson ten minutes.`,
        `Worth a look for the teacher: <a href="/classroom/">the classroom guide</a> — projector setup and what each control does.`,
      ],
      steps: [
        ["0–5 · Hook", `Ask what they already know: how many planets, which is biggest, what keeps them from flying away? Take guesses, write three on the board to check later. Then open <a href="${SOL}?zoom=inner">the inner planets, live</a> on the projector: this is where Mercury, Venus, Earth and Mars <em>actually are today</em> — not a poster, a computation from the real orbits.`],
        ["5–12 · The tour out", `Walk the zoom ladder outward one rung at a time — <a href="${SOL}?zoom=mars">to Mars</a>, <a href="${SOL}?zoom=belt&belt=1">to the asteroid belt</a> (turn the belt layer on), <a href="${SOL}?zoom=jupiter">to Jupiter</a>, <a href="${SOL}?zoom=saturn">to Saturn</a>, <a href="${SOL}?zoom=neptune">out to Neptune</a>. Name the order as you go. At the last stop, point out what happened to the inner planets: all four are now a labelled knot, and Mercury's whole orbit is a few pixels. <em>The evenly-spaced diagram in their heads is the thing this picture corrects.</em>`],
        ["12–15 · The disc", `Still on the whole system: <strong>drag the tilt slider flat</strong>, so the class is looking edge-on. Every orbit collapses into one thin line — the solar system is a <em>disc</em>, not a jumble. Ask why that might be (it all condensed from one spinning cloud), then tilt back to the overhead view.`],
        ["15–20 · Orbits in motion", `<a href="${SOL}?zoom=jupiter&span=year&speed=30">Jupiter's view with a year on the slider</a>. Press <strong>Play</strong>. Mercury laps four times while Earth goes round once and Jupiter barely moves. Ask: who's fastest? Who's slowest? What's different about them? Land the rule: <strong>closer to the sun → pulled harder → moves faster</strong>. That pull is gravity, and it is steering, not sucking — nothing falls in.`],
        ["20–27 · The moons", `Zoom to <a href="${SOL}?zoom=jupiter-moons&span=month&speed=2">Jupiter's four big moons with a month on the slider</a> and Play: Io whips round in under two days while Callisto takes over two weeks — <em>the same rule again</em>, with Jupiter now playing the sun's part. Then <a href="${SOL}?zoom=saturn-moons">Saturn's rings and moons</a>. Expect “is that real?” — and give the honest answer: the sizes, distances and speeds are real; <em>where each moon sits along its orbit right now is not solved</em>, and the read-out says so. A picture that tells you what it fakes is how real science behaves.`],
        ["27–38 · Group activity", `Groups at their machines, journals open, <a href="/timer/10-minutes/">a 10-minute timer</a> on the projector (Space starts it). Tasks on the board: <strong>(1)</strong> Find the asteroid belt — whose orbits is it between? <strong>(2)</strong> Count Jupiter's big moons, then Saturn's, from the moon views. <strong>(3)</strong> On the year view, decide which planet is fastest and which is slowest — and write the WHY in one sentence. <strong>(4)</strong> Open <a href="${PL.jupiter}">the Jupiter page</a> or <a href="${PL.mars}">the Mars page</a> and copy down two facts — including what you would weigh there.`],
        ["38–43 · Wrap-up", `Chart paper: fastest planet and why; two differences between inner and outer planets; check the three guesses from minute one against what was watched. The rule on the wall in their words: <em>closer means faster, and gravity is the reason.</em>`],
        ["43–45 · The closer", `End on <a href="${SOL}?zoom=moon">the Earth and Moon, to true scale</a> — the one view where size and distance are both real. If you brought the marble: Earth is the marble, the peppercorn moon stands ${cm(Math.round(MARBLE.moonDist * 100))} away, and the sun would be a ${metres(MARBLE.sunD, 1)} ball ${metres(Math.round(MARBLE.sunDist))} down the corridor. Send them out the door with that walk.`],
      ],
      find: [
        "Order of the eight planets, walked rather than memorised; rocky inner vs gas-giant outer.",
        "Edge-on, the system is a disc — one spinning cloud's leftover shape.",
        "Closer means faster, at the planets and again at Jupiter's moons: one rule, two scales.",
        "Materials: projector, machines in pairs, journals, chart paper; optionally a marble and a peppercorn.",
        "Younger classes: stop after the moons and make the tasks find-and-point. Older: add the flight path from the high-school lesson.",
      ],
      solo: [
        `How many moons does Saturn have big enough to be drawn? Count them on <a href="${SOL}?zoom=saturn-moons">the Saturn view</a>, then find how many are known in total on <a href="${PL.saturn}">Saturn's page</a>.`,
        `What is between Mars and Jupiter? <a href="${SOL}?zoom=belt&belt=1">Turn the belt on</a> and name the four biggest things in it.`,
        `Which planet has the shortest year, and how short? Check your answer on <a href="${PL.mercury}">its page</a>.`,
      ],
      ext: [
        ["NASA Space Place: All About the Planets", "https://spaceplace.nasa.gov/menu/solar-system/", "per-planet reading at this band's level"],
        ["NASA Solar System", "https://science.nasa.gov/solar-system/", "the reference the fact-hunt can be checked against"],
      ],
    },
    "grades-5-6": {
      t: "Bigger orbit, longer year — find the rule", mins: 45, ngss: "5-ESS1-2 practice; builds toward MS-ESS1-3.",
      before: [
        `Assumes: the order of the planets and that they orbit the sun — five minutes on <a href="${SOL}?zoom=neptune">the whole-system view</a> refreshes it.`,
        `Assumes: plotting points on a simple graph (distance across, time up).`,
        `Pre-work: each student opens <a href="${SOL}">the simulator</a> once and finds the zoom buttons and one planet page on their own.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Ask for a guess: Earth's year is 365 days — how long is Jupiter's? Write the guesses down. Nobody guesses high enough, and that's the hook.`],
        ["Task 1 · 12 min", `Data hunt, in pairs: open the planet pages — <a href="${PL.mercury}">Mercury</a>, <a href="${PL.venus}">Venus</a>, <a href="${PL.earth}">Earth</a>, <a href="${PL.mars}">Mars</a>, <a href="${PL.jupiter}">Jupiter</a>, <a href="${PL.saturn}">Saturn</a>, <a href="${PL.uranus}">Uranus</a>, <a href="${PL.neptune}">Neptune</a> — and for each record two numbers in a table: distance from the sun and length of its year. (Every figure on those pages is computed from the orbit, not copied from a book.)`],
        ["Task 2 · 10 min", `Graph it: distance across, year up. Ask them to describe the shape in words before anyone names it — <em>farther out is slower, and not by a little: twice as far is much more than twice as slow.</em>`],
        ["Task 3 · 6 min", `Check the claim live: <a href="${SOL}?zoom=saturn&span=decade&speed=60">a whole decade on the slider</a>. Play it. Earth laps ten times; Saturn covers a third of one orbit. The graph they just drew is happening on screen.`],
        ["Task 4 · 6 min", `<a href="${SOL}?zoom=belt&belt=1">Turn the asteroid belt on</a>. The belt sits between Mars and Jupiter — so from the graph, what must belt objects' years be? (Between Mars's ~2 and Jupiter's ~12.) A prediction from a pattern, checked against a picture.`],
        ["Wrap-up · 6 min", `Why would farther mean slower? Collect ideas, then land it: the sun's pull weakens with distance, and a weaker pull steers a slower orbit. Gravity was on the graph the whole time.`],
      ],
      find: [
        "The table itself: 0.39 AU/88 d out to 30 AU/165 yr. The curve bends upward — this is Kepler's third law, discovered rather than announced.",
        "Belt prediction lands between 3 and 6 years for the big asteroids.",
        "The rule's name can wait for 7–8; the shape of it cannot be unlearned once graphed.",
      ],
      solo: [
        `Pluto orbits at about 40 AU. From your graph, predict its year — then check on <a href="${PL.pluto}">Pluto's page</a>. How close were you?`,
        `A comet spends most of its time far beyond Neptune. Using your rule, what must be true about its speed out there? <a href="${SOL}comets/">The comets page</a> has the answer.`,
      ],
      ext: [
        ["PhET: Gravity and Orbits", "https://phet.colorado.edu/en/simulations/gravity-and-orbits", "drag the sun's mass and watch the orbit answer — the mechanism behind today's graph"],
        ["NASA Solar System", "https://science.nasa.gov/solar-system/", "check any number the class doubts"],
      ],
    },
    "grades-7-8": {
      t: "Gravity runs the moons too — and your weight", mins: 45, ngss: "MS-ESS1-2 (gravity's role in the solar system); MS-ESS1-3.",
      before: [
        `Assumes: closer-to-the-sun means faster — two minutes of <a href="${SOL}?zoom=inner&span=year&speed=30">the inner planets on Play</a> re-establishes it.`,
        `Assumes: the difference between mass (how much stuff) and weight (how hard gravity pulls on it).`,
        `Pre-work: skim <a href="${PL.jupiter}">Jupiter's page</a> and write down its surface gravity — today the class finds out where that number comes from.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Ask: what would you weigh on Jupiter? Guesses on the board — most will say “ten times as much”, and the real answer is the surprise the lesson is built around.`],
        ["Task 1 · 10 min", `<a href="${SOL}?zoom=jupiter-moons&span=month&speed=2">Jupiter's four big moons, a month on the slider</a>, Play. From the read-out, record each moon's orbital period: Io, Europa, Ganymede, Callisto. State the pattern — inner is faster — and say what it is: the planets' rule, running again around a planet. One law, every scale.`],
        ["Task 2 · 6 min", `<a href="${SOL}?zoom=saturn-moons">Saturn's system</a>: does the rule repeat? Have them check two moons' periods against their distances before you say anything.`],
        ["Task 3 · 12 min", `The weight question, with real numbers: the planet pages derive surface gravity from mass and radius — <a href="${PL.mars}">Mars</a>, <a href="${PL.jupiter}">Jupiter</a>, <a href="${PL.saturn}">Saturn</a>. Each student computes their own weight on all three. Then the trap springs: <em>Saturn is 95 Earth masses, and you would weigh about the same as at home.</em> Why? (It is huge but puffy — gravity depends on mass AND radius, g = GM/r².)`],
        ["Task 4 · 6 min", `The honesty check: the moon views state that positions along the orbits are illustrative. Ask WHY sizes, distances and periods can be right while positions are not (a position needs an epoch — a measured starting point — and an orbit does not). What would we need to fix it?`],
        ["Wrap-up · 6 min", `One diagram per student: sun → planets, planet → moons, the same arrow labelled the same word. And the weight table, with Saturn circled.`],
      ],
      find: [
        "Io ≈ 1.8 d, Europa ≈ 3.6 d, Ganymede ≈ 7.2 d, Callisto ≈ 16.7 d — and the doubling pattern in the first three is a resonance worth mentioning.",
        "Surface gravity: Mars ≈ 0.38 g, Jupiter ≈ 2.5 g, Saturn ≈ 1.07 g. The Saturn result is the discussion.",
        "g = GM/r² does all of it; the site derives those figures the same way, so the class's numbers match the pages'.",
      ],
      solo: [
        `Compute your weight on <a href="${PL.uranus}">Uranus</a> and <a href="${PL.neptune}">Neptune</a>. Which surprises you, and why?`,
        `Io, Europa and Ganymede orbit in a locked 1:2:4 rhythm. Find the name for that on <a href="${PL.jupiter}">Jupiter's page</a> and explain it in one sentence of your own.`,
      ],
      ext: [
        ["NASA: Jupiter's Moons", "https://science.nasa.gov/jupiter/moons/", "the reference list — 90+ known, four that matter today"],
        ["PhET: Gravity and Orbits", "https://phet.colorado.edu/en/simulations/gravity-and-orbits", "turn gravity OFF and watch what the moons do — the counterfactual the simulator can't show"],
      ],
    },
    "high-school": {
      t: "Launch windows: aim where it will be", mins: 50, ngss: "HS-ESS1-4 (orbital motions and Kepler's laws).",
      before: [
        `Assumes: farther orbits are slower (Kepler's third law, at least by shape) — the planet pages' distance and year figures rebuild it in minutes.`,
        `Assumes: comfortable algebra with fractions — the lesson derives 1/(1/T₁ − 1/T₂).`,
        `Pre-work: read <a href="${ROCKET_PATH}">the launch-windows page</a> top to bottom once, without trying to understand the solver — just collect what seems strange.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Ask: if Mars is closest to Earth tonight, is tonight the night to launch? (No — and working out why is the whole period.)`],
        ["Task 1 · 8 min", `Open <a href="${ROCKET_PATH}">the launch-windows page</a>: the next Mars window, solved from the real orbits. Note the cadence — Mars windows come roughly every 26 months. Where does 26 months come from, when neither planet has a 26-month year?`],
        ["Task 2 · 10 min", `<a href="${SOL}?zoom=inner&to=3">Draw the flight path to Mars</a>: a minimum-energy transfer sweeps half an orbit, so the ship arrives at the far side — Mars must be there WHEN the ship is, which means launching when Mars is ahead by just the right angle. Play the span and watch the geometry close.`],
        ["Task 3 · 10 min", `Derive the cadence: the synodic period is 1/(1/T₁ − 1/T₂). With T₁ = 365.25 d and T₂ = 687 d, compute it. (≈ 780 days ≈ 25.6 months.) The number they just computed is the number the page shows.`],
        ["Task 4 · 8 min", `Do Jupiter and Saturn: why do their windows come nearly every year? (T₂ huge → synodic period → T₁. The formula says outer-planet windows converge on Earth's own year.) Check against <a href="${ROCKET_PATH}jupiter/">the solved Jupiter windows</a>.`],
        ["Task 5 · 5 min", `Critique the model — the page states its own limits: coplanar, minimum-energy, heliocentric, with the burn from low Earth orbit reported separately. What did each assumption buy, and what would a real mission planner add back?`],
        ["Wrap-up · 4 min", `One sentence each: why “aim where it will be” is just Kepler's laws with a deadline.`],
      ],
      find: [
        "Synodic period Earth–Mars ≈ 780 days; Earth–Jupiter ≈ 399 days; Earth–Saturn ≈ 378 days — all three derivable and all three checkable on the page.",
        "The transfer geometry: launch when the target leads by the angle it will cover in half the transfer time.",
        "Model limits are stated, not hidden — the difference between a teaching model and a mission plan.",
      ],
      solo: [
        `Compute the Earth–Venus synodic period (Venus's year: 225 days). Why might a Venus mission planner care about ~584 days?`,
        `From <a href="${ROCKET_PATH}">the windows list</a>: which target's windows are most frequent, and does your formula agree it must be so?`,
      ],
      ext: [
        ["NASA's Eyes on the Solar System", "https://eyes.nasa.gov/", "fly the real missions in 3-D — the professional version of today's drawing"],
        ["NASA Mars Exploration", "https://science.nasa.gov/mars/", "every launch in the class's lifetime landed inside one of these windows; check"],
      ],
    },
  },

  /* ============================= MOON PHASES ============================= */
  "moon-phases": {
    "grades-k-2": {
      t: "Draw tonight's moon, then go and check", mins: 20, ngss: "1-ESS1-1 (observe, describe, predict sky patterns).",
      before: [
        `Assumes nothing at all.`,
        `Optional pre-work: if the moon is out tonight, look at it. That's the whole assignment.`,
      ],
      steps: [
        ["Warm-up · 4 min", `Everyone draws the moon from memory — no peeking, no wrong answers. Hold them up: the room will disagree, and that disagreement is the lesson starting.`],
        ["Task 1 · 5 min", `Open <a href="/moon/near-me/">tonight's moon for your town</a> on the projector. Compare with the drawings. Who was close? The glyph is drawn from the real moon — the dark patches are where they actually are.`],
        ["Task 2 · 5 min", `Scroll to the next few nights: what will it look like in three nights? Everyone draws that prediction and writes the night on it.`],
        ["Task 3 · 4 min", `The homework that isn't homework: on that night, go outside and check. A prediction you can check with your own eyes is a different thing from a fact you were told.`],
        ["Wrap-up · 2 min", `One sentence together: the moon's shape changes a little every night, the same way, every month.`],
      ],
      find: [
        "Tonight's phase and the next few nights, from the page — the teacher key is the page itself.",
        "The point is the checkable prediction, not vocabulary; “waxing” can wait.",
      ],
      solo: [
        `Does someone you love live in another town? Open <a href="/moon/">their town's moon page</a> with a grown-up: is their moon the same shape tonight? (It is — and that's a clue about how far away the moon must be.)`,
      ],
      ext: [
        ["NASA Space Place: Moon Phases", "https://spaceplace.nasa.gov/moon-phases/en/", "the picture-book version of what the class just predicted"],
      ],
    },
    "grades-3-4": {
      t: "The moon goes around — watch the light follow", mins: 35, ngss: "Builds toward MS-ESS1-1; addresses the shadow misconception directly.",
      before: [
        `Assumes: the moon goes around the Earth (not the reverse) — one Play of <a href="${SIM}?span=month">the month view</a> shows it.`,
        `Assumes: half of any ball in sunshine is lit — worth thirty seconds with a ball and a torch before the screen comes on.`,
        `Pre-work: keep a three-night moon diary (K–2's lesson without the class): shape, and roughly where in the sky.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Ask WHY the moon's shape changes. Collect every idea on the board — most classes offer “the Earth's shadow covers it”, and today that idea gets tested rather than corrected.`],
        ["Task 1 · 8 min", `<a href="${SIM}?span=month&speed=2">A month on the slider</a>, Play: the moon circles the Earth while the phase disc changes with it. (The link opens on your own town automatically.) Watch a full lap: where is the moon when it's full? When it's new?`],
        ["Task 2 · 8 min", `Pause at the three positions and read the angle: moon beside the sun → new; a quarter-turn away → half lit; opposite the sun → full. The rule in their words: <em>the shape tells you where the moon is.</em>`],
        ["Task 3 · 6 min", `Now test the shadow idea: in the picture, is anything ever covering the moon? (No. Half the moon is ALWAYS lit — we just see that lit half from different sides.) The shadow idea predicts the dark part should be curved like the Earth; check a crescent against that.`],
        ["Task 4 · 4 min", `Predict the next full moon's date from the simulator, then check on <a href="/moon/">the moon calendar</a>. A month is a real, countable thing.`],
        ["Wrap-up · 4 min", `Draw the rule from above: sun on one side, Earth in the middle, moon at three positions with the shape we see at each.`],
      ],
      find: [
        "0° = new, 90° = quarter, 180° = full — the angle IS the phase.",
        "The misconception has a testable consequence and fails it; the Earth's shadow only touches the moon in an eclipse, which is the 7–8 lesson.",
      ],
      solo: [
        `Is the moon the same shape in Sydney tonight? Check <a href="/moon/sydney/">Sydney's moon page</a> — same phase. Now the strange part: people there see it <em>rotated</em>. Why might that be?`,
        `Find the next NEW moon on <a href="/moon/">the calendar</a>. Why is that the best week for seeing faint stars?`,
      ],
      ext: [
        ["NASA Space Place: Moon Phases", "https://spaceplace.nasa.gov/moon-phases/en/", "reinforcement reading at exactly this level"],
        ["NASA: Moon Phases", "https://science.nasa.gov/moon/moon-phases/", "the adult version, for the teacher's back pocket"],
      ],
    },
    "grades-5-6": {
      t: "The 50-minute slip — measure it", mins: 40, ngss: "5-ESS1-2 (represent data on sky patterns); builds toward MS-ESS1-1.",
      before: [
        `Assumes: the phase-angle rule (new beside the sun, full opposite) — two minutes on <a href="${SIM}?span=month">the month view</a> restores it.`,
        `Assumes: subtracting times across an hour boundary (7:42 to 8:31 is 49 minutes).`,
        `Pre-work: tonight, note the moonrise time for your town from <a href="/moon/near-me/">its moon page</a> — tomorrow the class finds out whether that number repeats.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Ask: the sun rises at nearly the same time as yesterday — does the moon? Take a vote. Almost nobody knows, because almost nobody has checked.`],
        ["Task 1 · 10 min", `Check: open <a href="/moon/near-me/">your town's moon page</a> and its 7-day table. Record seven moonrise times, compute the six gaps. The slip is not zero and not random — about 50 minutes later every night.`],
        ["Task 2 · 8 min", `WHY: <a href="${SIM}?span=month&speed=2">the month view</a>. Each day the moon has moved along its orbit, so the Earth has to turn a little PAST a full turn to bring it up again. The slip is the orbit, measured with a clock.`],
        ["Task 3 · 8 min", `The consequence: a full moon is opposite the sun — so when must it rise? (At sunset, every time.) Verify against the table on the nights around full moon.`],
        ["Task 4 · 5 min", `The arithmetic: the moon covers 360° in about 29.5 days ≈ 12° per day. The Earth turns 15° per hour. 12/15 of an hour ≈ 48 minutes. Their measured slip, derived.`],
        ["Wrap-up · 4 min", `One line in the journal: we measured the moon's orbit without a telescope — with a table of times and a subtraction.`],
      ],
      find: [
        "Measured slip ≈ 50 min/night (it genuinely varies, roughly 30–70 — worth saying).",
        "Full moon rises at sunset by geometry, not coincidence.",
        "Derived slip ≈ 48 min — measurement and model agree within the spread.",
      ],
      solo: [
        `Does moonSET slip by about the same amount? Test it against the same 7-day table.`,
        `A new moon rises at roughly what time of day? Reason it out from the angle rule, then check the table near the next new moon.`,
      ],
      ext: [
        ["NASA: Observe the Moon", "https://science.nasa.gov/moon/", "observing guides and the annual Observe the Moon night"],
      ],
    },
    "grades-7-8": {
      t: "Why isn't there an eclipse every month?", mins: 45, ngss: "MS-ESS1-1 (Earth–sun–moon model: phases AND eclipses).",
      before: [
        `Assumes: the phase-angle rule, solidly — a full moon is the moon OPPOSITE the sun. <a href="${SIM}?span=month">The month view</a> rebuilds it fast if needed.`,
        `Assumes: what a shadow cone is (any lamp and any ball).`,
        `Pre-work: find the date of the next full moon on <a href="/moon/">the calendar</a> and bring it to class — the lesson opens by asking why that date has no eclipse attached.`,
      ],
      steps: [
        ["Warm-up · 5 min", `The setup: full moon means sun–Earth–moon in a line, and that happens every month. So why isn't there a lunar eclipse every month? Let the class feel the contradiction before touching anything.`],
        ["Task 1 · 8 min", `<a href="${SIM}?span=month&speed=2">The month view</a>: the moon passes “behind” the Earth every lap. In THIS flat picture an eclipse looks inevitable — say so out loud, because the picture is about to be caught leaving something out.`],
        ["Task 2 · 10 min", `The missing dimension: the moon's orbit is tilted about 5° to Earth's orbit (the teaching card on the simulator page covers it). Most full moons pass ABOVE or BELOW the shadow. Have them draw the side view the simulator deliberately doesn't show. This is also why the view draws no shadow at all — a drawn shadow would imply the monthly eclipse that doesn't happen.`],
        ["Task 3 · 10 min", `Now the data: <a href="/moon/eclipses/">the lunar eclipse pages</a> — real events, solved. How often do they actually come? Find the next one your town can see, and note its local times.`],
        ["Task 4 · 7 min", `The pattern in the list: eclipses cluster in seasons roughly six months apart. Why? (The tilted orbit's crossing line only points at the sun twice a year.) Check the clustering against the list's dates.`],
        ["Wrap-up · 5 min", `The takeaway sentence: a model that failed to predict eclipses wasn't wrong — it was FLAT, and finding a model's missing dimension is what science does.`],
      ],
      find: [
        "≈ 5.1° tilt; two node seasons per year; the list's dates cluster accordingly.",
        "The simulator's no-shadow choice is a documented modelling decision, not an omission.",
        "Total vs partial vs penumbral fall out of how deep the moon dips into the shadow.",
      ],
      solo: [
        `The site lists LUNAR eclipses only, and <a href="/moon/eclipses/">the hub explains why</a> (a solar eclipse's narrow track needs data this site doesn't solve). Read the reason, then find the next solar eclipse's date and path from NASA's eclipse pages.`,
        `From the eclipse list: how many months apart are the eclipse seasons, really? Compute the gaps.`,
      ],
      ext: [
        ["NASA: Eclipses", "https://science.nasa.gov/eclipses/", "the reference for upcoming events and the geometry — including solar"],
      ],
    },
    "high-school": {
      t: "Two months — and who decides what a supermoon is?", mins: 50, ngss: "HS-ESS1-4 practice; nature-of-science: definitions are choices.",
      before: [
        `Assumes: phases as geometry (angle from the sun), fluently.`,
        `Assumes: algebra with reciprocals — the lesson lives on 1/(1/a − 1/b).`,
        `Pre-work: from <a href="/moon/">the calendar</a>, count the days between two consecutive full moons. Bring the number; it will disagree with the textbook's 27.3, on purpose.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Ask: how long does the moon take to go around the Earth? Take answers, then reveal there are two right ones — 27.3 days and 29.5 days — and the gap between them is today's subject.`],
        ["Task 1 · 10 min", `<a href="${SIM}?span=month&speed=2">The month view</a>: follow the moon from full to full (29.5 d, the synodic month). Why longer than the true orbit (27.3 d, sidereal)? Because the Earth moved almost a month along ITS orbit, so the moon must travel extra to line back up with the sun.`],
        ["Task 2 · 8 min", `Derive it: 1/(1/27.32 − 1/365.25). Compute. (≈ 29.53 d.) The same synodic formula the solar-system lesson uses for launch windows — one identity, two phenomena.`],
        ["Task 3 · 12 min", `<a href="/moon/supermoons/">The supermoon list</a>. The page states its threshold — a full moon within 361,885 km — and states WHY it must: there is no official definition. Task: recount the year's supermoons with a threshold 5,000 km looser, then 5,000 km tighter. The count changes. What, then, is a supermoon a fact ABOUT?`],
        ["Task 4 · 8 min", `The distances in that table vary by tens of thousands of km between perigees. Why isn't perigee constant? (The orbit is elliptical AND the sun keeps deforming it.) Which figure in the table would a headline quote, and which would a scientist?`],
        ["Wrap-up · 7 min", `Write the paragraph: two months, one formula; one “supermoon”, many defensible definitions — and what a page owes its readers when it picks one.`],
      ],
      find: [
        "1/(1/27.32 − 1/365.25) = 29.53 d.",
        "The threshold-sensitivity exercise typically moves the year's count by 1–3 events either way.",
        "The site's stated-threshold policy is the model answer to the closing question.",
      ],
      solo: [
        `If the moon's orbit lay exactly in Earth's orbital plane, how many lunar eclipses would there be per year? Defend the number.`,
        `<a href="/moon/blue-moons/">The blue moon page</a> tabulates one definition and only explains the other. Read why — is that the right editorial call? Argue either way in three sentences.`,
      ],
      ext: [
        ["NASA: The Moon", "https://science.nasa.gov/moon/", "reference figures for both months and the orbit's shape"],
        ["NASA: Phases, Eclipses & Supermoons", "https://science.nasa.gov/moon/phases-eclipses-supermoons/", "NASA's own careful wording — compare it with the tabloids'"],
      ],
    },
  },

  /* =============================== SEASONS =============================== */
  "seasons": {
    "grades-k-2": {
      t: "Is today longer than yesterday?", mins: 20, ngss: "1-ESS1-2 (seasonal patterns of daylight).",
      before: [
        `Assumes nothing — this works from the first week of school.`,
        `Optional pre-work: at dinner, ask whether it was dark when everyone woke up. Different answers in one family is a great way to arrive.`,
      ],
      steps: [
        ["Warm-up · 3 min", `Ask: was it dark when you woke up today? Will it be at bedtime? Guesses only — then look.`],
        ["Task 1 · 6 min", `Open <a href="/sun/near-me/">today's sunrise and sunset for your town</a> on the projector. Read today's daylight out loud — hours and minutes. Write it big on the board.`],
        ["Task 2 · 5 min", `Use the date picker to look at tomorrow: longer or shorter, and by how much? (About a minute or two — small, but it never stops.) Which way is it going right now?`],
        ["Task 3 · 4 min", `Start a class daylight chart: one reading a week, same wall, all term. By the holidays the line will be unmistakable.`],
        ["Wrap-up · 2 min", `The sentence: days grow and shrink slowly, all year, and we are keeping the record.`],
      ],
      find: [
        "Today's daylight and the day-to-day change (~1–2 min at mid-latitudes; less right at the solstices).",
        "The wall chart is the deliverable — this lesson is an observation habit, not a one-off.",
      ],
      solo: [
        `With a grown-up, find sunrise for a place a relative lives on <a href="/sun/">the sunrise pages</a>. Earlier or later than yours?`,
      ],
      ext: [
        ["NASA Space Place: What Causes the Seasons?", "https://spaceplace.nasa.gov/seasons/en/", "the picture-level answer, for when the chart raises the question"],
      ],
    },
    "grades-3-4": {
      t: "Three towns, three stories", mins: 35, ngss: "Builds toward 5-ESS1-2 (seasonal daylight data).",
      before: [
        `Assumes: reading a time and a duration (hours and minutes).`,
        `Assumes: day and night come from the Earth turning — one Play of <a href="${SIM}?span=day">a single day in the simulator</a> shows the town riding into the dark half.`,
        `Pre-work: find your town on <a href="/sun/near-me/">its sunrise page</a> and write down today's day length.`,
      ],
      steps: [
        ["Warm-up · 4 min", `Ask: is today the same length everywhere on Earth? Vote yes/no, then test it three ways.`],
        ["Task 1 · 8 min", `Three tabs: <a href="/sun/near-me/">your town</a>, far-north <a href="/sun/anchorage/">Anchorage</a>, equatorial <a href="/sun/singapore/">Singapore</a>. Record today's day length from each. Three towns, three different answers — the vote is already settled.`],
        ["Task 2 · 10 min", `The pattern over the year: using each page's date picker, record the same three towns on <a href="/sun/anchorage/?date=${JUN21}">June 21</a>, <a href="/sun/anchorage/?date=${SEP22}">September 22</a> and <a href="/sun/anchorage/?date=${DEC21}">December 21</a> (the dated links open Anchorage — use the picker for the other two). Nine numbers in a 3×3 table.`],
        ["Task 3 · 8 min", `Describe each town's story in one line: Singapore barely moves; yours swings by hours; Anchorage swings by most of a day. Whatever causes seasons must be something that does MORE the farther you are from the equator.`],
        ["Wrap-up · 5 min", `The reveal, watched rather than told: <a href="${SIM}?span=week&date=${DEC21}">a week at the winter solstice</a> — the Earth leaning, and how little of the far-north's daily circle falls in the light.`],
      ],
      find: [
        "Singapore ≈ 12 h all three dates; mid-latitudes swing hours; Anchorage from ~5.5 h to ~19.5 h.",
        "The equator-to-pole gradient is the finding; the tilt as its cause is deliberately left as the next band's mechanism.",
      ],
      solo: [
        `Find a city where today is LONGER than in your town. (Hint: try the other hemisphere — <a href="/sun/sydney/">Sydney</a>.) Why might that be?`,
        `Which day of the whole year is your town's longest? Hunt for it with the date picker.`,
      ],
      ext: [
        ["NASA Space Place: What Causes the Seasons?", "https://spaceplace.nasa.gov/seasons/en/", "confirms the pattern the table just showed"],
      ],
    },
    "grades-5-6": {
      t: "Measure what the tilt does", mins: 45, ngss: "5-ESS1-2 (graph seasonal daylight); MS-ESS1-1 practice.",
      before: [
        `Assumes: day length differs by place and season (the three-town pattern) — five minutes across <a href="/sun/anchorage/">Anchorage</a> and <a href="/sun/singapore/">Singapore</a> rebuilds it.`,
        `Assumes: plotting points and reading a curve.`,
        `Pre-work: each pair finds their assigned city's page under <a href="/sun/">the sunrise hub</a> before class, so the data hunt starts on time.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Hand each pair a latitude: <a href="/sun/singapore/">Singapore (1°N)</a>, <a href="/sun/miami/">Miami (26°N)</a>, <a href="/sun/portland/">Portland (46°N)</a>, <a href="/sun/anchorage/">Anchorage (61°N)</a>, plus your own town. Prediction first: rank them, longest June day to shortest.`],
        ["Task 1 · 10 min", `Each pair records their city's day length on June 21 using the date picker (or the dated link — e.g. <a href="/sun/portland/?date=${JUN21}">Portland on ${JUN21}</a>). Pool the class data: day length vs latitude, one curve.`],
        ["Task 2 · 8 min", `Same cities, <a href="/sun/portland/?date=${DEC21}">December 21</a>. Plot on the same axes. The two curves mirror — whatever helps June hurts December, by the same amount.`],
        ["Task 3 · 8 min", `The hinge: around <a href="/sun/portland/?date=${SEP22}">the September equinox</a> every city lands near 12 h. Verify with two cities. Twice a year the tilt points sideways and the whole planet gets the same day.`],
        ["Task 4 · 8 min", `One more measurement: on each city's page, how HIGH the noon sun gets today (the dial). Higher noon sun and longer day travel together — same cause, two symptoms.`],
        ["Wrap-up · 6 min", `The graph gets its caption, in their words: latitude decides how strongly the tilt is felt; the equinox is when nobody feels it.`],
      ],
      find: [
        "June-21 day lengths run ≈ 12.2 h (Singapore) → ~13.8 (Miami) → ~15.7 (Portland) → ~19.4 (Anchorage); December mirrors.",
        "Equinox rows all fall within minutes of 12 h.",
        "Noon altitude tracks day length at every latitude — the pairing the 7–8 lesson explains.",
      ],
      solo: [
        `Find a city whose day length today is within 5 minutes of 13 hours. How far north (or south) did you have to go?`,
        `Does the sun rise due east in your town today? Check the direction on <a href="/sun/near-me/">your sun page</a> — and find the two dates when it truly does.`,
      ],
      ext: [
        ["NOAA Solar Calculator", "https://gml.noaa.gov/grad/solcalc/", "NOAA's own sun-position tool — cross-check any figure the class collected"],
      ],
    },
    "grades-7-8": {
      t: "Summer is tilt, not distance", mins: 45, ngss: "MS-ESS1-1 (the tilt model, argued from evidence).",
      before: [
        `Assumes: day length varies with latitude and season — the data, if not the graph. <a href="/sun/anchorage/?date=${DEC21}">Anchorage in December</a> vs <a href="/sun/singapore/?date=${DEC21}">Singapore the same day</a> restores it in two clicks.`,
        `Assumes: the Earth orbits the sun once a year and spins on a tilted axis (names, not mechanisms — the mechanism is today).`,
        `Pre-work: ask three adults why summer is warmer than winter. Bring their answers. (Most will say “closer to the sun”, and that's the lesson's raw material.)`,
      ],
      /* THE EXEMPLAR. This lesson carries the full template — launch card,
         mission, teacher/student step split, pathways, artifact, assessment,
         student view — as the pattern the other fourteen migrate to, one per
         session. Content unchanged where it was already right; the additions
         are the layers a teacher needs to RUN it, not re-derive it. */
      projector: `${SIM}?span=week&date=${DEC21}`,
      launch: {
        prep: `Ten minutes, once: open the four linked views in tabs and click through them; run the vote question on yourself. Print the <a href="student/">student view</a> if you want paper.`,
        materials: `A projector. Optional but worth it for Task 4: a flashlight and a sheet of paper. Student sheet on paper or screens.`,
        devices: `Runs fully with <strong>one projector and no student devices</strong> — every link is projected. With one device per pair, students drive Tasks 2–3 themselves instead of watching.`,
        vocab: ["axis", "tilt (23.4\u00B0)", "hemisphere", "solstice", "perihelion", "direct vs. spread light"],
        misconception: `\u201CIt's summer because the Earth is closer to the sun.\u201D Most adults believe it. The hour is built so the CLASS kills it, with two facts a scientist could check \u2014 not so the teacher announces it.`,
        mechanic: `Vote-and-reveal. The class votes on the misconception before and after; the two counts on the board are the visible evidence that the hour changed minds \u2014 including, usually, some adults' answers they brought from home.`,
      },
      mission: `Prove \u2014 with two facts anyone could check \u2014 that summer is NOT about being closer to the sun. Then explain what actually runs the seasons, well enough that you could convince one of the adults who got it wrong.`,
      steps: [
        ["Warm-up · 5 min",
          `Run the vote: is it summer because the Earth is closer to the sun? Collect hands, write the count on the board, keep it for the end. Add the adults' answers from the pre-work to the tally.`,
          `Vote, and report what their three adults said. No debating yet — the count is data.`],
        ["Task 1 · 8 min",
          `Put the first fact up: Earth is CLOSEST to the sun in early January \u2014 northern-hemisphere winter. Ask what January would have to be like if distance ran the seasons.`,
          `Write one sentence: \u201CIf distance caused summer, January would be\u2026\u201D \u2014 and say what actually happens in January where they live.`],
        ["Task 2 · 10 min",
          `Second fact: put <a href="/sun/sydney/?date=${DEC21}">Sydney on December 21</a> beside your own town on the same date. One planet, one distance, opposite seasons ON THE SAME DAY.`,
          `Read both day lengths off the projected pages and record them on the sheet. Pairs with devices pull a southern city of their own choice and check it agrees with Sydney.`],
        ["Task 3 · 10 min",
          `Show the mechanism: <a href="${SIM}?span=week&date=${DEC21}">the December solstice week</a> \u2014 the axis leans and your latitude's daily circle runs mostly through dark; then <a href="${SIM}?span=week&date=${JUN21}">the June week</a> flips it. Point at the axis every pass: it never moves.`,
          `Watch one full orbit and answer on the sheet: what changed between June and December, and what stayed exactly the same? (Wanted answer: only which end leans toward the light.)`],
        ["Task 4 · 7 min",
          `The intensity half: tilt a flashlight beam across a desk \u2014 same light, more ground, weaker per patch. Tie it to the number: the sun pages' noon-altitude readout gives each hemisphere's angle today.`,
          `Trace the bright patch upright and tilted, and label which one is winter. One line: why does LOW sun mean WEAK sun?`],
        ["Wrap-up · 5 min",
          `Re-run the vote and write the second count beside the first. Then set the artifact: not the answer \u2014 the argument.`,
          `Write the claim-evidence-reasoning paragraph: the claim (tilt, not distance), the two facts that killed distance, and one sentence on why tilt survives both.`],
      ],
      find: [
        "Perihelion: early January, ≈ 147.1 million km; aphelion early July, ≈ 152.1 — closest in northern winter.",
        "Sydney vs a northern town on the December solstice: hours of day-length difference, same date.",
        "The lesson's shape IS the science: a hypothesis, two tests, one survivor.",
      ],
      artifact: `Every student leaves with a written <strong>claim-evidence-reasoning paragraph</strong> \u2014 claim: tilt, not distance; evidence: perihelion falls in early January, and Sydney and their own town have opposite seasons on the same date; reasoning: one sentence on why only the tilt survives both facts \u2014 plus the before/after vote counts copied off the board. That paragraph is the assessment, the record, and the thing to show a parent who still believes the distance story.`,
      paths: {
        support: `Run Warm-up through Task 3 and the wrap-up vote only (\u224835 min). The two killing facts and the moving picture carry the idea without the intensity argument; the paragraph frame is provided with the claim already written, students supply the two facts.`,
        core: `As written, 45 minutes.`,
        extension: `Uranus is really tilted ~98\u00B0 \u2014 read <a href="${PL.uranus}">its page</a> and describe its seasons. Or go quantitative a rung early: compute noon sun altitude as 90\u00B0 \u2212 latitude \u00B1 23.4\u00B0 for your town's two solstices and check it against <a href="/sun/near-me/">the sun page's readout</a> \u2014 which is the high-school lesson arriving early.`,
        access: [
          `<strong>ELL:</strong> the vocabulary row above is six terms; pre-teach them with the simulator picture rather than definitions \u2014 every one of them is visible.`,
          `<strong>Reading:</strong> nothing in the lesson requires reading beyond the sheet; every fact arrives as a picture or a number read aloud.`,
          `<strong>Visual:</strong> the day lengths are the numbers, not the picture \u2014 read Sydney's and your town's aloud from the page; the flashlight patch can be traced by touch.`,
          `<strong>Motor:</strong> no student manipulation is required in the core path; the simulator is driven from the projector.`,
          `<strong>Hearing:</strong> every step's content is on screen or on the sheet; the vote works by hands.`,
          `<strong>Screen reader:</strong> the sun pages carry their figures as text (the day-length tables and readouts are HTML, not canvas), so a student on a reader gets the same two facts from the same pages.`,
        ],
      },
      assess: {
        criteria: [
          `Can state the two facts that rule out distance \u2014 without notes.`,
          `Can say what the axis does through a full year (nothing \u2014 it keeps pointing the same way) and what changes (which hemisphere leans toward the sun).`,
          `Can explain why a LOW sun is a WEAK sun in one sentence.`,
        ],
        checks: [
          `After Task 2: thumbs \u2014 same planet, same day, opposite seasons: can distance explain that? (All thumbs down before moving on; anyone unsure re-reads the two day lengths aloud.)`,
          `During Task 3: cold-call \u201Cwhat just changed?\u201D on each pass of the orbit until \u201Conly which end leans toward the light\u201D comes back unprompted.`,
        ],
        exit: [
          [`Earth is closest to the sun in January. What does that single fact do to the \u201Ccloser = summer\u201D idea?`,
           `It kills it: if distance ran the seasons, January would be northern summer \u2014 it is the middle of northern winter.`],
          [`It is December 21. Sydney has a long day and you have a short one. What one word explains how both can be true at once?`,
           `Tilt (accept: the hemispheres lean differently \u2014 south toward the sun, north away).`],
          [`Your friend says the tilt makes us closer to the sun in summer. Fix the sentence.`,
           `The tilt doesn't change the distance \u2014 it changes the ANGLE: the leaning hemisphere gets higher sun (more direct light) and longer days. Distance barely changes, and the whole planet shares it.`],
        ],
      },
      solo: [
        `If Earth's tilt were 0°, what happens to seasons? If it were 90°? One paragraph each, using what the simulator showed.`,
        `Uranus really is tilted ~98°. Read <a href="${PL.uranus}">its page</a>: what are its seasons like?`,
      ],
      ext: [
        ["NASA Space Place: Seasons", "https://spaceplace.nasa.gov/seasons/en/", "the model, cleanly drawn"],
        ["NOAA Solar Calculator", "https://gml.noaa.gov/grad/solcalc/", "declination and sun position for any date — the data behind task 4"],
      ],
    },
    "high-school": {
      t: "Put numbers on the sun's height", mins: 50, ngss: "HS-ESS1-4 practice; error analysis on a real model.",
      before: [
        `Assumes: the tilt model of the seasons, argued and believed — this lesson quantifies it, it doesn't re-litigate it.`,
        `Assumes: sine-level trig and reading residuals off a table.`,
        `Pre-work: find your town's latitude on <a href="/sun/near-me/">its sun page</a> and compute 90° − latitude + 23.4° and 90° − latitude − 23.4°. Bring both numbers; class tests them against the sky.`,
      ],
      steps: [
        ["Warm-up · 5 min", `The claim to test: at solstice, noon sun altitude = 90° − latitude ± 23.4°. One formula, every city. Today the class checks a published model against a live one.`],
        ["Task 1 · 12 min", `Each pair takes a city and both solstices: compute predicted noon altitude from the formula, then read the sun page's altitude for <a href="/sun/portland/?date=${JUN21}">June 21</a> and <a href="/sun/portland/?date=${DEC21}">December 21</a> around solar noon (scrub the time on the “where the sun is” card). Tabulate predicted vs observed.`],
        ["Task 2 · 10 min", `Rate of change: from a city's 7-day tables near <a href="/sun/portland/?date=${SEP22}">the equinox</a> and near the solstice, compute minutes-of-daylight change per day at each. Fastest at the equinoxes, near zero at the solstices — the derivative of a sine, found in a sunrise table.`],
        ["Task 3 · 12 min", `The asymmetry: find the earliest sunset and the shortest day for your town from the December tables. They are NOT the same date. The culprit is the equation of time — solar noon itself drifts. <a href="/methodology/sunrise-sunset/">The methodology page</a> covers what the solver includes; NOAA's calculator (below) shows the drift directly.`],
        ["Task 4 · 6 min", `Model audit: the site states its solver's accuracy bounds and its assumptions (flat horizon, standard refraction −0.833°). Which of today's small prediction gaps do those assumptions explain, and which needed the equation of time?`],
        ["Wrap-up · 5 min", `The write-up: formula, data table, residuals, and one paragraph on which corrections mattered at which precision — a complete little modelling paper.`],
      ],
      find: [
        "Formula vs page agrees to well under a degree once read at true solar noon; reading at clock noon injects the equation-of-time error deliberately.",
        "Day-length change: ~2–3 min/day at equinox (mid-latitudes), ≲ seconds/day at solstice.",
        "Earliest sunset precedes the winter solstice by ~1–2 weeks at mid-northern latitudes; latest sunrise follows it.",
      ],
      solo: [
        `The tropics sit at 23.4° latitude and the Arctic Circle at 66.6°. Show that both numbers are the tilt wearing different hats.`,
        `Using <a href="/sun/">any city's page</a>: find a latitude where the formula predicts a midnight sun on June 21, then verify the page agrees.`,
      ],
      ext: [
        ["NOAA Solar Calculator", "https://gml.noaa.gov/grad/solcalc/", "the professional reference — includes the equation-of-time drift the class just uncovered"],
        ["NASA: Earth", "https://science.nasa.gov/earth/", "context reading on orbit, tilt and climate patterns"],
      ],
    },
  },

  /* ========================== EARTH · MOON · SUN ========================= */
  "earth-moon-sun": {
    "grades-5-6": {
      t: "One machine, three clocks: the day, the month and the year", mins: 45,
      ngss: "MS-ESS1-1 foundations (cyclic patterns from the Earth–sun–moon system), built on 5-ESS1-2.",
      before: [
        `Assumes: day and night come from the Earth's turn, and the moon goes around the Earth — names, not mechanisms; the mechanisms are today.`,
        `Pre-work (5 minutes): open <a href="${SIM}">the Sun, Earth and Moon simulator</a>, find <strong>Play</strong> and the <strong>day / week / month</strong> span control, and drag the slider once. Nothing else.`,
        `For the teacher: <a href="/classroom/">the classroom guide</a> covers projector setup, and the simulator's own scale card explains its exaggerations — the lesson leans on it in task 4.`,
      ],
      steps: [
        ["Warm-up · 5 min", `Three clocks run in the sky: one takes a day, one about a month, one a year. Ask the class to name what each clock measures before touching anything — most can name the day, few the month, and the year usually gets "the seasons?", which is exactly right.`],
        ["Task 1 · 8 min", `<strong>The day.</strong> <a href="${SIM}?span=day">Set the span to one day</a> (the link opens on your own town) and Play. The sun arcs over; the read-out gives its altitude and direction live. Ask: what is actually moving — the sun, or us? Check the read-out's sunrise time against <a href="/sun/near-me/">the town's sun page</a>: same number, because both are computed from the same sky.`],
        ["Task 2 · 8 min", `<strong>The month's first clue.</strong> <a href="${SIM}?span=week">A week on the slider</a>: now the moon visibly crawls along its orbit while the sun laps daily. Watch moonrise — later every day, by most of an hour. The moon's slowness against the sun's daily lap is the whole reason a "month" exists.`],
        ["Task 3 · 8 min", `<strong>The month itself.</strong> <a href="${SIM}?span=month&speed=2">A month on the slider</a>, Play: one full lap of the moon, and the phase disc beside the read-out runs new → quarter → full → back. Use the jump-to-next-phase control to land exactly on the next full moon, note its date, and verify it against <a href="/moon/">the moon calendar</a>.`],
        ["Task 4 · 8 min", `<strong>"Is that picture true?"</strong> Scroll to the simulator's scale card and read it aloud: it states, in numbers, how much too close the moon is drawn and how much too close and too small the sun is — figures the page computes from its own drawing. Then the corridor version: at ${mm(MARBLE.mm, 0)} to the Earth, the moon is a peppercorn ${cm(Math.round(MARBLE.moonDist * 100))} away and the sun a ${metres(MARBLE.sunD, 1)} ball ${metres(Math.round(MARBLE.sunDist))} down the corridor. A drawing that confesses its lies, with numbers, is a scientific drawing.`],
        ["Task 5 · 5 min", `<strong>Your own sky.</strong> The link-builder on the simulator page writes a URL for any place, date and span. Each pair builds the link for a date that matters to them — a birthday works — and reads off the moon's phase that night.`],
        ["Wrap-up · 3 min", `The board, in their words: the day is the Earth's turn; the month is the moon's lap; the year is the Earth's lap. One machine, three clocks — and next lesson's question is what happens because the three never divide evenly.`],
      ],
      find: [
        "Day span: the sun's arc and the turn behind it; the read-out's sunrise matches the sun page's, because one sky is being computed.",
        "Week span: moonrise slips ~50 minutes a night (the 5–6 moon lesson measures this properly).",
        "Month span: the phase cycle completes in ~29.5 days; the jump-to-phase date matches the calendar.",
        "The scale card's own numbers — read them off the card, they update with the drawing.",
        "Different birthdays give different phases: the phase is a fact about the date, the same everywhere on Earth.",
      ],
      solo: [
        `Build <a href="${SIM}">a simulator link</a> for the day you were born and find your birth moon. Compare with a friend's — same date, same phase, any town?`,
        `Using jump-to-next-phase: how many days from the next new moon to the next full moon? Is it always half of 29.5?`,
        `Watch <a href="${SIM}system/">all three bodies moving at once</a>: the moon's grey patch always faces the Earth while its lit half always faces the sun. Explain, in one sentence, why that pair of facts IS the phase cycle.`,
      ],
      ext: [
        ["NASA Space Place: Moon Phases", "https://spaceplace.nasa.gov/moon-phases/en/", "the month clock, drawn for this age"],
        ["NASA: Earth's Moon", "https://science.nasa.gov/moon/", "the reference behind the month's numbers"],
      ],
    },
  },

  /* =============================== LEAP YEAR ============================= */
  "leap-year": {
    "grades-5-6": {
      t: "The leap year: a fraction with consequences", mins: 45,
      ngss: "5-ESS1-2 foundations; mathematics doing real work (decimals, multiplication, remainders).",
      before: [
        `Assumes: the year is the Earth's lap around the sun — one Play of <a href="${SIM}?span=month">the simulator</a> at any span re-grounds it.`,
        `Assumes: decimal multiplication (0.24 × 100) and comfortable division.`,
        `Pre-work: ask at home whether anyone knows someone born on February 29, and what they do about birthdays. Bring the stories.`,
      ],
      figure: {
        h2: "What the calendar is fighting: the drift, drawn",
        html: (() => {
          /* the June solstice's day-of-year, drifting 24.22 days per century if
             no leap day is ever added — computed here, not typed */
          const W = 1000, BAR_Y = 52, MON = "JFMAMJJASOND".split("");
          const marks = [0, 100, 200, 300].map((yrs, i) => {
            const doy = 172 - 24.22 * (yrs / 100);
            const x = (doy / 365) * W;
            return `<line x1="${x.toFixed(0)}" y1="${BAR_Y - 8}" x2="${x.toFixed(0)}" y2="${BAR_Y + 26}" stroke="var(--accent)" stroke-width="2"/><text x="${x.toFixed(0)}" y="${i % 2 ? BAR_Y - 14 : BAR_Y + 42}" text-anchor="middle" font-size="15" fill="var(--text)">${yrs ? `+${yrs} yrs` : "now"}</text>`;
          }).join("");
          return `<p>Suppose we never added a leap day. The real year is about a quarter-day longer than 365, so the seasons would slide backwards through the calendar — here is where the <strong>June solstice</strong> (the longest day) would land after each century of a leap-free calendar:</p>
    <svg viewBox="0 0 ${W} 140" role="img" aria-label="The June solstice drifting from late June back into April over three centuries without leap days" style="width:100%;height:auto">
      <rect x="0" y="${BAR_Y}" width="${W}" height="18" rx="4" fill="var(--border)"/>
      ${MON.map((m, i) => `<line x1="${(i * W / 12).toFixed(0)}" y1="${BAR_Y}" x2="${(i * W / 12).toFixed(0)}" y2="${BAR_Y + 18}" stroke="var(--bg-solid)" stroke-width="2"/><text x="${(i * W / 12 + W / 24).toFixed(0)}" y="${BAR_Y + 74}" text-anchor="middle" font-size="14" fill="var(--muted)">${m}</text>`).join("")}
      ${marks}
    </svg>
    <p class="hint">Months drawn equal width for simplicity; the drift itself — 24.22 days per century — is computed from the year's measured length, and task 2 is the class computing it themselves.</p>`;
        })(),
      },
      steps: [
        ["Warm-up · 5 min", `Ask: how long does the Earth take to go around the sun? ("A year. 365 days.") Then the reveal that runs the whole lesson: the real number is <strong>365 days, 5 hours, 48 minutes and 46 seconds</strong>. The sky does not deal in whole numbers, and somebody had to do something about it.`],
        ["Task 1 · 8 min", `Turn the leftover into a decimal: 5 h 48 m 46 s of a 24-hour day. (5.8128 h ÷ 24 ≈ <strong>0.2422</strong> of a day.) That fraction is the villain of the story — small enough to ignore for a while, too big to ignore forever.`],
        ["Task 2 · 10 min", `<strong>What if we ignored it?</strong> Each year the calendar would finish 0.2422 days early, so the seasons drift. Compute: how many years until summer's longest day has moved a full month earlier? (30 ÷ 0.2422 ≈ 124 years.) Until summer lands where winter was? (about 750 years.) Check the drawing above — then say what it would mean: a farmer's planting calendar breaking within living memory.`],
        ["Task 3 · 10 min", `<strong>The fix, and the fix's own error.</strong> Add one day every 4 years: that treats the fraction as 0.25. But it's 0.2422 — the fix over-corrects by 0.0078 days a year. How long until THAT builds up to a whole day? (1 ÷ 0.0078 ≈ 128 years.) So the rule grew exceptions: century years are NOT leap years — unless divisible by 400. Test it: was 1900 a leap year? 2000? Will 2100 be? (No; yes; no.)`],
        ["Task 4 · 7 min", `<strong>The sky doesn't care.</strong> Open <a href="/sun/near-me/?date=2028-02-29">February 29, 2028 for your town</a> — a perfectly ordinary sunrise and sunset, computed like any other day's. The extra day is not out there; it is bookkeeping. Then flip it: use the date picker to check the longest day's DATE this year and four years on — it stays around June 21, which is the leap rule succeeding.`],
        ["Wrap-up · 5 min", `Write the rule from memory: every 4th year, except every 100th, except every 400th — and one sentence on WHY each clause exists. The calendar is an engineering solution to a fraction, and they have now done all of its arithmetic.`],
      ],
      find: [
        "0.2422 of a day, from the class's own conversion.",
        "Drift without leap days: ~1 month per 124 years, seasons inverted in ~750.",
        "The ÷4 fix overshoots by ~1 day per 128 years — hence ÷100 skip, ÷400 keep. 1900 no, 2000 yes, 2100 no.",
        "Feb 29's sun page renders like any other day — the sky has no leap day, only the calendar does.",
      ],
      solo: [
        `Is 2400 a leap year? 2200? Write the one-line test and check five years of your choosing.`,
        `Design a calendar for a planet whose year is exactly 365.5 days. Now try Mars: its year is about 668.6 of its own days. What's your Martian leap rule, and how good is it after 1,000 Mars-years?`,
      ],
      ext: [
        ["NASA Space Place: Leap Year", "https://spaceplace.nasa.gov/leap-year/en/", "the story at this band's level, with the same numbers"],
        ["NOAA Solar Calculator", "https://gml.noaa.gov/grad/solcalc/", "watch the solstice date hold steady across years — the rule working"],
      ],
    },
  },

  /* ============================== LIGHT SPEED ============================ */
  "light-speed": {
    "grades-7-8": {
      t: "Eight minutes old: light, and distance measured in time", mins: 45,
      ngss: "MS-ESS1-3 (scale of the solar system); mathematics: rates, unit conversion, scientific notation by the end.",
      before: [
        `Assumes: distance = speed × time, and comfort rearranging it.`,
        `Assumes: the layout of the solar system — a two-minute glance at <a href="${SOL}?zoom=neptune">the whole-system view</a> is enough.`,
        `Pre-work: from <a href="${PL.earth}">the Earth page</a> and <a href="${PL.neptune}">the Neptune page</a>, write down each one's distance from the sun in kilometres. Bring both numbers; they are today's raw material.`,
      ],
      figure: {
        h2: "The crossing, to scale",
        html: `<p>The strip below is the sun-to-Earth distance drawn to true scale — the sun's size is honest (it barely manages four pixels), and the Earth would be invisible at a fortieth of a pixel, so its position is marked instead. The moving dot is sunlight:</p>
    <svg viewBox="0 0 1000 110" role="img" aria-label="Sunlight crossing the sun-Earth distance, drawn to scale" style="width:100%;height:auto">
      <style>@keyframes lsp-x{from{transform:translateX(14px)}to{transform:translateX(988px)}}.lsp-p{animation:lsp-x 12.5s linear infinite}</style>
      <line x1="10" y1="55" x2="992" y2="55" stroke="var(--border)" stroke-width="1"/>
      <circle cx="10" cy="55" r="4.6" fill="var(--accent)"/>
      <text x="10" y="86" text-anchor="start" font-size="14" fill="var(--muted)">the sun, to scale</text>
      <line x1="992" y1="47" x2="992" y2="63" stroke="var(--text)" stroke-width="2"/>
      <text x="992" y="86" text-anchor="end" font-size="14" fill="var(--muted)">Earth (too small to draw)</text>
      <circle class="lsp-p" cx="0" cy="55" r="3" fill="var(--text)"/>
    </svg>
    <p class="hint">Sped up 40×: the real crossing takes 8 minutes 19 seconds, and nothing in the universe does it faster. <span id="lsp-tick"></span></p>
    <script>
    (function(){
      var el=document.getElementById("lsp-tick"); if(!el) return;
      function f(){ var d=new Date(Date.now()-499000);
        el.textContent="The sunlight arriving as you read this left the sun at "+d.toLocaleTimeString()+". The moonlight left 1.3 seconds ago."; }
      f(); setInterval(f,1000);
    })();
    </script>`,
      },
      more: {
        h2: "The ladder of distances — every rung between a mile and the edge",
        html: `<p>Between the mile and the light year sits a whole ladder of units, each invented at the moment the one below it became unusable. In order, with something real standing on each rung:</p>
    ${LADDER_HTML}
    <p class="hint">Notice the seam in the ladder: up through the light-year the units are TIME (how long light takes), then the parsec switches to ANGLE (how far things appear to shift). Both are ways of measuring what no ruler can touch — and converting between them is just arithmetic, which is the point of this lesson. The weeds — where the parsec's strange number comes from, why every unit on this ladder is now secretly a unit of time, and the unit that measures the universe's countdown — are on <a href="/classroom/distance-units/">the distance units page</a>.</p>`,
      },
      steps: [
        ["Warm-up · 5 min", `Hold up a hand into the sunlight (or point at the window): how old is that light? Collect guesses — most say zero, a few say hours. The real answer sits between, and by the end of the period they will have computed it, not been told it.`],
        ["Task 1 · 8 min", `<strong>Start at the moon — because we've actually measured it.</strong> Light travels at 300,000 km every second (299,792, if the class wants the real one). Apollo astronauts left mirrors on the moon; observatories still fire lasers at them and time the echo — about 2.6 seconds there and back. So: distance = ½ × 300,000 × 2.6 ≈ 390,000 km. Check it against the moon's distance on <a href="${SIM}">the simulator's read-out</a>. <em>We measure the moon's distance WITH time.</em> That inversion is the whole lesson.`],
        ["Task 2 · 8 min", `<strong>Now the sun.</strong> 150,000,000 km ÷ 300,000 km/s = 500 seconds = <strong>8 minutes 19 seconds</strong> (with the exact figures: 499 s). The warm-up question is answered by their own division: you have never once seen the sun as it is — only as it was eight minutes ago.`],
        ["Task 3 · 10 min", `<strong>The solar system in light-time.</strong> In pairs, convert distances from the planet pages into light-minutes: <a href="${PL.mars}">Mars</a>, <a href="${PL.jupiter}">Jupiter</a>, <a href="${PL.saturn}">Saturn</a>, <a href="${PL.neptune}">Neptune</a>. (Neptune comes out around 4 light-HOURS.) Then the consequence: a Mars rover's radio commands take 3 to 22 minutes each way depending on the geometry — which is why <em>rovers drive themselves</em>. No joystick can cross that gap.`],
        ["Task 4 · 10 min", `<strong>The light year.</strong> If light-minutes work for planets, what distance does light cover in a YEAR? Compute it: 300,000 × 60 × 60 × 24 × 365.25 ≈ <strong>9.5 trillion km</strong>. That number is why the unit exists — "9,460,000,000,000 km" is unusable; "one light year" is a number a mind can hold. Now the punchline: Neptune is 4 light-hours out, and the NEAREST star is 4.2 light-YEARS — nine thousand times farther. The whole solar system view the class has been zooming around is the front porch.`],
        ["Task 5 · 5 min", `<strong>Why light gets to be the ruler.</strong> Two reasons, worth saying plainly: its speed never varies, anywhere, ever measured — a ruler that cannot bend — and at these distances every other ruler has already failed. Distance and time stop being different subjects; astronomers say "the star is 4.2 light years away" and mean, equally, "we are seeing it as it was 4.2 years ago."`],
        ["Wrap-up · 4 min", `The closing sentence, theirs to write: looking farther out is looking further back — the sky is a time machine, and the class now owns the arithmetic that proves it.`],
      ],
      find: [
        "Moon: ~1.3 light-seconds, and the laser-ranging echo (~2.6 s round trip) is a real, ongoing measurement.",
        "Sun: 499 s ≈ 8 min 19 s. Mars ≈ 12.7 light-min from the sun (3–22 min from Earth by geometry); Jupiter ≈ 43; Saturn ≈ 80; Neptune ≈ 4.2 light-hours.",
        "One light year ≈ 9.46 × 10¹² km; Proxima Centauri ≈ 4.25 ly ≈ 9,000× Neptune's distance.",
        "Every distance figure the class used comes off the planet pages, where it is derived from the orbits — the arithmetic closes.",
      ],
      solo: [
        `New Horizons took 9.5 years to reach Pluto. How long does light take? What does the ratio tell you about how fast our fastest machines are, really?`,
        `When you look at the moon tonight you see it 1.3 seconds ago; the sun, 8 minutes; Proxima, 4 years. Find something in the night sky you can name whose light left before you were born.`,
      ],
      ext: [
        ["NASA Space Place: What Is a Light-Year?", "https://spaceplace.nasa.gov/light-year/en/", "the unit, explained at this band's level"],
        ["NASA: Apollo Laser Ranging", "https://science.nasa.gov/moon/", "the mirrors are still up there and still answering — start here and search 'retroreflector'"],
      ],
    },
  },
};

/* which lesson each band leads with, for the home card and the hub's featured
   row — "the best", not "all", which is the home page's whole deal */
const FLAGSHIP = {
  "grades-k-2": ["moon-phases", "Draw tonight's moon, then go and check"],
  "grades-3-4": ["solar-system", "The solar system, gravity and moons — 45 min"],
  "grades-5-6": ["moon-phases", "The 50-minute slip — measure it"],
  "grades-7-8": ["seasons", "Summer is tilt, not distance"],
  "high-school": ["solar-system", "Launch windows: aim where it will be"],
};

/* ---- the questions under each topic --------------------------------------
 * The merge moved the explanations to /concepts/, and the lesson plans — the
 * pages whose whole job is handing a teacher the explanation — never pointed
 * at them: 17 of 18 lessons carried zero concept links, because
 * hubQuestionsCard(url) had no mapping for lesson URLs and silently returned
 * "". This map is that mapping, per topic. hubQs throws on a slug that does
 * not exist, so a retired concept fails the build here instead of shipping a
 * dead card. */
const TOPIC_CONCEPTS = {
  "solar-system": ["why-dont-planets-fall-into-the-sun", "how-does-an-orbit-work", "why-do-planets-have-moons"],
  "moon-phases": ["why-does-the-moon-change-shape", "what-is-a-synodic-month", "why-isnt-there-an-eclipse-every-month"],
  "seasons": ["why-do-we-have-seasons", "what-is-earths-axial-tilt", "what-is-the-subsolar-point"],
  "earth-moon-sun": ["what-is-a-solar-day", "what-is-a-synodic-month", "what-is-tidal-locking"],
  "light-speed": ["why-is-the-night-sky-dark"],
  "leap-year": ["what-is-a-leap-year", "what-is-a-solar-day"],
};

/* topics may cover only some bands — a new topic starts with its strongest
   band and the matrix shows the empty rungs as "coming" */
export const LESSON_PAGES = [];
for (const T of TOPICS) for (const B of BANDS) if (LESSONS[T.s][B.s]) LESSON_PAGES.push(`${T.s}-${B.s}`);

/* ---- the feedback block (hub + every lesson page) ------------------------ */
const feedbackCard = (what) => `  <div class="card cr-ask" id="feedback">
    <h2>Teachers: make ${what} better</h2>
    <p>You are the one standing in front of the class, so you will see what we cannot: a task that runs long, a question that lands better another way, a grade level pitched wrong, a topic we should build next. Tell us — improvements go into the page, and <strong>if we use yours, your class gets the credit on it</strong>, the same promise the <a href="/classroom/#ask">classroom request form</a> makes.</p>
    ${""/* THE BIGGER DOOR, offered where the right person is standing. Anyone
         reading a lesson plan closely enough to reach the bottom of it is,
         by definition, someone who writes lesson plans. */}
    <p><strong>Have a lesson of your own?</strong> <a href="${LESSON_FORM_HASH}">Send us the one you already run</a> and we will build it into a page like this one, with your name on it. That is the ask we would most like you to take.</p>
    <form id="lf-form">
      <label for="lf-text">What should change, or what should we build next?</label>
      <textarea id="lf-text" maxlength="1200" required placeholder="e.g. Task 3 needs 10 minutes, not 6 — my 6th graders wanted to check every planet. And build the tides topic next; we're a coastal school."></textarea>
      <label for="lf-email">Email <span class="cr-opt">— optional, only if you'd like a reply or the credit</span></label>
      <input id="lf-email" type="email" placeholder="A school address is fine">
      <input id="lf-hp" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="row" style="margin-top:16px"><button class="btn" id="lf-send" type="submit">Send it</button></div>
      <p id="lf-note" class="hint"></p>
    </form>
  </div>
  <script>
  (function(){
    var f=document.getElementById("lf-form"); if(!f) return;
    f.addEventListener("submit",function(ev){
      ev.preventDefault();
      var note=document.getElementById("lf-note"), btn=document.getElementById("lf-send");
      btn.disabled=true; note.textContent="Sending\\u2026";
      fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ url:location.href, reason:"Lesson feedback",
          details:(document.getElementById("lf-text").value||"").trim(),
          email:(document.getElementById("lf-email").value||"").trim(),
          website:document.getElementById("lf-hp").value })})
        .then(function(r){ return r.json().catch(function(){return{};}); })
        .then(function(d){
          if(d&&d.ok){ f.reset(); note.textContent="\\u2713 Thank you \\u2014 we read every one. If we use it, your class goes on the page."; }
          else { btn.disabled=false; note.textContent="Something went wrong \\u2014 please try again."; }
        })
        .catch(function(){ btn.disabled=false; note.textContent="Network error \\u2014 please try again."; });
    });
  })();
  </script>`;

/* ---- one lesson page ----------------------------------------------------- */
const lessonPage = (T, B, L) => {
  const slug = `${T.s}-${B.s}`;
  const url = `${LPATH}${slug}/`;
  const others = BANDS.filter((b) => b.s !== B.s && LESSONS[T.s][b.s])
    .map((b) => `<a class="chip" href="${LPATH}${T.s}-${b.s}/">${esc(b.n)}</a>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(L.t)} — ${esc(B.n)} Lesson Plan (${L.mins} min)</title>
<meta name="description" content="A free ${L.mins}-minute ${esc(B.n)} lesson: ${esc(T.drive)} Every step is a link that opens the exact simulator view; no sign-up, nothing installed.">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${esc(L.t)} — ${esc(B.n)} Lesson Plan">
<meta property="og:description" content="${esc(T.drive)} A ${L.mins}-minute lesson where every step opens the exact view.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: PATH }, { name: "Lesson plans", url: LPATH }, { name: L.t, url }])}</script>
${learningLd({ name: `${L.t} — a ${L.mins}-minute ${B.n} lesson`, url: `${SITE}${url}`, description: `${T.drive} A ${B.n} lesson plan built on free browser-based astronomy simulators; every step is a deep link to the exact view.`, type: "lesson plan", audience: "teacher", level: B.n })}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>${esc(L.t)}</h1>
  <p class="sub"><strong>${esc(B.n)} · ${L.mins} minutes · ${esc(B.mode)}.</strong> The driving question: <em>${esc(T.drive)}</em> Every step below is a link that opens the exact view — one link puts the projector and every student screen on the same sky. Part of <a href="${LPATH}">the lesson plans by topic and grade</a>.</p>

${L.launch ? `  ${/* TEACH THIS TOMORROW — the launch card, above all prose (the audit's
       best structural note: a teacher deciding whether to use this needs the
       logistics before the pedagogy). The three buttons are the lesson's
       working surface: the projector link on the clipboard, the student view,
       and print — the print stylesheet turns this page into the ink-friendly
       one-pager. */""}<div class="card lp-launch" id="tomorrow">
    <h2>Teach this tomorrow</h2>
    <div class="wc-facts lp-steps">
      <div class="wc-frow"><span>Grade · time</span><b>${esc(B.n)} · ${L.mins} minutes</b></div>
      <div class="wc-frow"><span>Preparation</span><b>${L.launch.prep}</b></div>
      <div class="wc-frow"><span>Materials</span><b>${L.launch.materials}</b></div>
      <div class="wc-frow"><span>Devices</span><b>${L.launch.devices}</b></div>
      <div class="wc-frow"><span>Standards</span><b>${esc(L.ngss)}</b></div>
      <div class="wc-frow"><span>Vocabulary</span><b>${L.launch.vocab.map(esc).join(" · ")}</b></div>
      <div class="wc-frow"><span>The misconception</span><b>${L.launch.misconception}</b></div>
      <div class="wc-frow"><span>The mechanic</span><b>${L.launch.mechanic}</b></div>
    </div>
    <p class="timer-presets lp-actions">
      <button type="button" class="chip" id="lp-copy" data-link="${SITE}${L.projector}" hidden>Copy the projector link</button>
      <a class="chip" href="student/">Open the student view</a>
      <button type="button" class="chip" id="lp-print" hidden>Print this plan</button>
    </p>
    <script>(function(){var c=document.getElementById("lp-copy"),p=document.getElementById("lp-print");
      if(p){p.hidden=false;p.addEventListener("click",function(){window.print();});}
      if(c&&navigator.clipboard){c.hidden=false;c.addEventListener("click",function(){
        navigator.clipboard.writeText(c.getAttribute("data-link")).then(function(){var t=c.textContent;c.textContent="\u2713 Copied";setTimeout(function(){c.textContent=t;},1600);});});}
    })();</script>
  </div>

  <div class="pullquote lp-mission"><strong>The mission, in the students' own terms:</strong> ${L.mission}</div>

` : ""}  ${""/* WHAT IT ASSUMES COMES FIRST. Pre-work links go to the TOOLS, never to
       a lower band's lesson page: pre-work should feel like exploring, not
       like being sent back a grade. */}
  <div class="card">
    <h2>Before the lesson — what this assumes</h2>
    <ul class="bullets">
${L.before.map((b) => `      <li>${b}</li>`).join("\n")}
    </ul>
  </div>

${L.figure ? `  <div class="card">
    <h2>${L.figure.h2}</h2>
${L.figure.html}
  </div>

` : ""}  <div class="card">
    <h2>${ico(T.ico)} The plan — every step carries its minutes</h2>
    <div class="wc-facts lp-steps">
${L.steps.map(([t, w, y]) => step(t, w, y)).join("\n")}
    </div>
    <p class="hint">The minutes are there for the teacher's pacing — and so that any single step can be handed to a student as their own five-minute lesson. See <a href="${LPATH}#student-taught">students teach the class</a>.</p>
  </div>

  <div class="card">
    <h2>What they should find — the teacher's key</h2>
    <ul class="bullets">
${L.find.map((f) => `      <li>${f}</li>`).join("\n")}
    </ul>
    <p class="hint"><strong>Standards:</strong> ${esc(L.ngss)}</p>
    <p class="hint"><strong>What the picture fakes:</strong> ${esc(T.honest)}</p>
  </div>

${L.paths ? `  <div class="card">
    <h2>Three pathways through the same hour</h2>
    <div class="wc-facts lp-steps">
      <div class="wc-frow"><span>Support</span><b>${L.paths.support}</b></div>
      <div class="wc-frow"><span>Core</span><b>${L.paths.core}</b></div>
      <div class="wc-frow"><span>Extension</span><b>${L.paths.extension}</b></div>
    </div>
    <h3 class="lp-h3">Access</h3>
    <ul class="bullets">
${L.paths.access.map((a) => `      <li>${a}</li>`).join("\n")}
    </ul>
  </div>

` : ""}${L.artifact ? `  <div class="card">
    <h2>What each student walks out with</h2>
    <p>${L.artifact}</p>
  </div>

` : ""}${L.assess ? `  <div class="card" id="assessment">
    <h2>Assessment</h2>
    <p><strong>Success looks like:</strong></p>
    <ul class="bullets">
${L.assess.criteria.map((c) => `      <li>${c}</li>`).join("\n")}
    </ul>
    <p><strong>Checks along the way:</strong></p>
    <ul class="bullets">
${L.assess.checks.map((c) => `      <li>${c}</li>`).join("\n")}
    </ul>
    <p><strong>Exit ticket</strong> — the same three questions are on the <a href="student/">student view</a>, without the answers:</p>
    <ul class="bullets">
${L.assess.exit.map(([q]) => `      <li>${q}</li>`).join("\n")}
    </ul>
    ${/* answers in a details element, so a projected page does not leak them */""}
    <details class="lp-key"><summary>Answer key</summary>
    <ul class="bullets">
${L.assess.exit.map(([q, a]) => `      <li><strong>${q}</strong><br>${a}</li>`).join("\n")}
    </ul>
    </details>
  </div>

` : ""}${L.more ? `  <div class="card">
    <h2>${L.more.h2}</h2>
${L.more.html}
  </div>

` : ""}  <div class="card">
    <h2>Questions to chase on your own</h2>
    <p>For the student who wants more — each answerable with the tools, no teacher required:</p>
    <ul class="bullets">
${L.solo.map((q) => `      <li>${q}</li>`).join("\n")}
    </ul>
  </div>

${T.curious ? `  <div class="card">
    <h2>Questions the curious actually ask</h2>
    <p>Real questions, mostly from real kids — the kind that sound simple and open trapdoors. Worth raising in class before someone raises them for you:</p>
    ${T.curious.map(([q, a]) => `<p><strong>${esc(q)}</strong><br>${a}</p>`).join("\n    ")}
  </div>

` : ""}

  <div class="card">
    <h2>Go further — beyond this site</h2>
    <ul class="bullets">
${L.ext.map(([n, u, why]) => `      <li><a href="${u}" rel="noopener" target="_blank">${esc(n)}</a> — ${esc(why)}.</li>`).join("\n")}
    </ul>
  </div>

  <div class="card">
    <h2>Same question, other grades</h2>
    <p>Each grade band re-asks this topic's question one level deeper — observe it, describe the pattern, measure it, explain the mechanism, quantify it and question the model. This page is the <strong>${esc(B.mode.toLowerCase())}</strong> rung.</p>
    <div class="timer-presets">${others}<a class="chip chip-alt" href="${LPATH}">All lesson plans</a></div>
  </div>

${TOPIC_CONCEPTS[T.s] ? placeQuestionsCard(TOPIC_CONCEPTS[T.s], url) : ""}${feedbackCard("this lesson")}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
};

/* ---- the student view -----------------------------------------------------
 * A lesson that carries the full template gets a second page: the same hour
 * with the teacher's half removed. Big type, the mission, one row per step
 * saying only what the STUDENT does, and the exit ticket without its answers.
 * This is what goes on student screens (or paper — the print stylesheet turns
 * it into the student sheet), while the K–2 problem the audit named — a page
 * for children carrying 900 words of teacher prose — is solved by never
 * showing children the teacher page at all. noindex: it is a companion to the
 * lesson, not a competitor for its query. */
const studentPage = (T, B, L) => {
  const url = `${LPATH}${T.s}-${B.s}/student/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(L.t)} — Student Sheet</title>
<meta name="description" content="The student sheet for the ${esc(L.t)} lesson: the mission, what to do at each step, and the exit ticket.">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${SITE}${url}">
<link rel="stylesheet" href="/assets/css/style.css">
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>${esc(L.t)}</h1>
  <p class="sub lp-student-sub">Your sheet for this lesson. Name: <span class="lp-blank"></span></p>
  <div class="pullquote lp-mission"><strong>Your mission:</strong> ${L.mission}</div>
  <div class="card">
    <h2>What you do</h2>
    <div class="wc-facts lp-steps">
${L.steps.map(([t, w, y]) => `      <div class="wc-frow"><span>${esc(t)}</span><b>${y || w}</b></div>`).join("\n")}
    </div>
  </div>
  <div class="card">
    <h2>Exit ticket</h2>
    <ol class="bullets lp-exit">
${L.assess.exit.map(([q]) => `      <li>${q}<span class="lp-blank lp-blank-wide"></span></li>`).join("\n")}
    </ol>
  </div>
  <p class="hint">Teacher's page: <a href="../">the full lesson plan</a>.</p>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
};

export const LESSON_STUDENT_PAGES = [];
for (const T of TOPICS) for (const B of BANDS) {
  const L = LESSONS[T.s][B.s];
  if (!L) continue;
  mkdirSync(join(root, `classroom/lessons/${T.s}-${B.s}`), { recursive: true });
  writeFileSync(join(root, `classroom/lessons/${T.s}-${B.s}/index.html`), lessonPage(T, B, L));
  if (L.mission && L.assess) {
    mkdirSync(join(root, `classroom/lessons/${T.s}-${B.s}/student`), { recursive: true });
    writeFileSync(join(root, `classroom/lessons/${T.s}-${B.s}/student/index.html`), studentPage(T, B, L));
    LESSON_STUDENT_PAGES.push(`${T.s}-${B.s}`);
  }
}

/* ---- the hub ------------------------------------------------------------- */
const LFAQ = [
  ["Do the lesson links work on any school computer?",
    "Yes — everything runs in the browser with nothing installed and no sign-up. Each link carries the whole view (place, date, zoom, speed) in the address, so the same link puts the projector and every student machine on the same screen."],
  ["Are the simulators real, or animations?",
    "The positions are computed from the real orbits when the page loads — the same standard methods observatories teach from — and every page says exactly what the drawing exaggerates. The one honest exception: where a moon sits along its orbit is illustrative, and the simulator says so on the page."],
  ["How are the grade bands different?",
    "Every band re-asks the same driving question one level deeper: K–2 observe it, 3–4 describe the pattern, 5–6 measure it, 7–8 explain the mechanism, high school quantifies it and questions the model itself."],
  ["Can students use these without a teacher?",
    "Yes — every lesson lists questions to chase alone, every step is time-boxed so one step can become a student's own five-minute lesson, and the tools work as well at a kitchen table as on a projector."],
  ["Can I print or adapt the plans?",
    "Yes — free to use, adapt and share for teaching. Each page has a feedback form at the bottom; improvements that get used credit your class on the page."],
];

/* ---- the filterable grid -------------------------------------------------
 * EVERY FILTERABLE FACT RIDES ON THE MARKUP IT FILTERS. A lesson row carries
 * its band and its minutes; a topic card carries its topic slug. The script
 * below reads those attributes rather than any parallel list, so a lesson
 * added to LESSONS is filterable the moment it renders and there is no second
 * data structure to fall out of step.
 *
 * FILTERING SHOWS ABSENCE HONESTLY. Pick "Grades 3–4" and a topic that lacks
 * that band shows its "coming — ask for this band" row rather than vanishing:
 * a gap a teacher can see is a gap a teacher can ask us to fill, which is the
 * collaboration loop this whole section exists for. A topic filtered out by
 * the TOPIC chips, on the other hand, disappears entirely — the reader said
 * they don't want it, which is not the same as us not having it. */
const topicCard = (T) => `  <div class="card lg-topic" data-topic="${esc(T.s)}">
    <h2>${ico(T.ico)} ${esc(T.n)}</h2>
    <p><em>${esc(T.drive)}</em></p>
    <div class="wc-facts lp-steps">
${BANDS.map((B) => {
  const L = LESSONS[T.s][B.s];
  if (!L) return `      <div class="wc-frow lg-row" data-band="${B.s}" data-coming="1"><span>${esc(B.n)}</span><b><span class="hint">coming — <a href="#feedback">ask for this band</a> and it moves up the list</span></b></div>`;
  return `      <div class="wc-frow lg-row" data-band="${B.s}" data-mins="${L.mins}"><span>${esc(B.n)}</span><b><a href="${LPATH}${T.s}-${B.s}/">${esc(L.t)}</a> — ${L.mins} min · ${esc(B.mode.toLowerCase())}</b></div>`;
}).join("\n")}
    </div>
  </div>`;

/* The three chip groups. Buckets chosen from the catalog's actual spread
   (20 / 35–40 / 45–50), because a bucket nothing falls into is a control
   that teaches the reader the filters are broken. Ships DISABLED — without
   JS every lesson is already visible, and a dead control on a page for a
   classroom is worse than no control. */
const filterBar = `  <div class="card lg-filter" id="filters">
    <h2>Find the lesson that fits the class and the clock</h2>
    <div class="lg-fgroups">
      <div class="lg-fgroup" data-lg="band" role="group" aria-label="Filter by grade band">
        <span class="lg-flab">Grade</span>
        <button type="button" class="chip" data-v="" aria-pressed="true" disabled>All</button>
${BANDS.map((B) => `        <button type="button" class="chip" data-v="${B.s}" aria-pressed="false" disabled>${esc(B.n.replace(" & up", ""))}</button>`).join("\n")}
      </div>
      <div class="lg-fgroup" data-lg="topic" role="group" aria-label="Filter by topic">
        <span class="lg-flab">Topic</span>
        <button type="button" class="chip" data-v="" aria-pressed="true" disabled>All</button>
${TOPICS.map((T) => {
  const short = T.n.replace(/^The /, "").replace(" and the length of a day", "").replace(" and its phases", "").replace(" as one machine", "").replace(" and the calendar", "").replace(" and the light year", "").replace(" and gravity", "");
  return `        <button type="button" class="chip" data-v="${T.s}" aria-pressed="false" disabled>${esc(short[0].toUpperCase() + short.slice(1))}</button>`;
}).join("\n")}
      </div>
      <div class="lg-fgroup" data-lg="time" role="group" aria-label="Filter by lesson length">
        <span class="lg-flab">Time</span>
        <button type="button" class="chip" data-v="" aria-pressed="true" disabled>Any</button>
        <button type="button" class="chip" data-v="short" aria-pressed="false" disabled>About 20 min</button>
        <button type="button" class="chip" data-v="mid" aria-pressed="false" disabled>30–40 min</button>
        <button type="button" class="chip" data-v="full" aria-pressed="false" disabled>A full period</button>
      </div>
    </div>
    <p class="hint lg-count" id="lg-count" aria-live="polite"></p>
  </div>
`;

/* One listener per group, state in three variables, the DOM re-read on every
   pass. The band+time filters act on rows, the topic filter on cards, and a
   card also hides when every row in it is hidden — which only happens under a
   TIME filter, since a band filter leaves the "coming" row and topic cards
   always have all five bands. URL params (?grade=&topic=&time=) are written
   with replaceState so a filtered view is shareable and Back is not spammed;
   they are read once on load so a shared link opens already filtered. */
const FILTER_JS = `<script>(function(){
var bar=document.getElementById('filters'); if(!bar) return;
var state={band:'',topic:'',time:''};
var KEY={band:'grade',topic:'topic',time:'time'};
function bucket(m){ return m<=25?'short':m<=40?'mid':'full'; }
function apply(){
  var cards=document.querySelectorAll('.lg-topic'), shown=0, comings=0;
  for(var i=0;i<cards.length;i++){
    var c=cards[i];
    if(state.topic && c.getAttribute('data-topic')!==state.topic){ c.hidden=true; continue; }
    var rows=c.querySelectorAll('.lg-row'), any=0;
    for(var j=0;j<rows.length;j++){
      var r=rows[j], ok=true;
      if(state.band && r.getAttribute('data-band')!==state.band) ok=false;
      if(ok && state.time){
        var m=r.getAttribute('data-mins');
        if(!m || bucket(+m)!==state.time) ok=false;
        /* a "coming" row survives a band filter (the gap is the message) but
           not a time filter — it has no length to match */
      }
      r.hidden=!ok;
      if(ok){ any=1; if(r.hasAttribute('data-coming')) comings++; else shown++; }
    }
    c.hidden=!any;
  }
  var el=document.getElementById('lg-count');
  if(el) el.textContent=(state.band||state.topic||state.time)
    ? shown+' lesson'+(shown===1?'':'s')+(comings?' ('+comings+' band'+(comings===1?'':'s')+' not written yet \\u2014 ask below)':'')
    : '';
  var q=[], k;
  for(k in state) if(state[k]) q.push(KEY[k]+'='+encodeURIComponent(state[k]));
  try{ history.replaceState(null,'',location.pathname+(q.length?'?'+q.join('&'):'')+location.hash); }catch(e){}
}
var groups=bar.querySelectorAll('.lg-fgroup');
for(var g=0;g<groups.length;g++)(function(grp){
  var kind=grp.getAttribute('data-lg'), chips=grp.querySelectorAll('.chip');
  for(var i=0;i<chips.length;i++){
    chips[i].disabled=false;
    chips[i].addEventListener('click',function(){
      var v=this.getAttribute('data-v');
      state[kind]=(state[kind]===v)?'':v;              /* re-press = clear */
      if(!v) state[kind]='';
      for(var j=0;j<chips.length;j++) chips[j].setAttribute('aria-pressed',String(chips[j].getAttribute('data-v')===state[kind]));
      apply();
    });
  }
})(groups[g]);
/* a shared link opens already filtered */
try{
  var p=new URLSearchParams(location.search), k2;
  for(k2 in KEY){
    var v=p.get(KEY[k2])||'';
    if(!v) continue;
    var grp=bar.querySelector('.lg-fgroup[data-lg="'+k2+'"] .chip[data-v="'+v.replace(/["\\\\]/g,'')+'"]');
    if(grp){ state[k2]=v; var sib=grp.parentNode.querySelectorAll('.chip');
      for(var j2=0;j2<sib.length;j2++) sib[j2].setAttribute('aria-pressed',String(sib[j2]===grp)); }
  }
  if(state.band||state.topic||state.time) apply();
}catch(e){}
})();</script>`;

/* five-minute topics for student-taught lessons: each is a real view or page,
   so the student's "slides" are the live sky rather than a poster */
const FIVE_MIN = [
  [`The planet race`, `${SOL}?zoom=inner&span=year&speed=30`, `who laps whom, and why the winner is the innermost`],
  [`Saturn's rings and moons`, `${SOL}?zoom=saturn-moons`, `what the rings are, and Titan`],
  [`The moon's phases in one picture`, `${SIM}?span=month&speed=2`, `the angle rule: new beside the sun, full opposite`],
  [`Why the moon rises 50 minutes later each night`, `/moon/near-me/`, `one table, one subtraction, one orbit`],
  [`The midnight sun`, `/sun/anchorage/?date=${JUN21}`, `a day that never ends, live from Anchorage`],
  [`Why no eclipse every month`, `/moon/eclipses/`, `the 5° tilt that saves the full moon`],
  [`The Earth and Moon to true scale`, `${SOL}?zoom=moon`, `the emptiness nobody's poster shows`],
  [`What you'd weigh on Saturn`, `${PL.saturn}`, `95 Earths of planet, one Earth of gravity`],
  [`The asteroid belt`, `${SOL}?zoom=belt&belt=1`, `where it is, what's in it, why it's no danger to fly through`],
  [`Launch windows to Mars`, `${ROCKET_PATH}`, `why rockets wait 26 months for a green light`],
  [`The "dark side" of the moon`, `${SIM}`, `tidal locking, and why the far side isn't dark`],
  [`What a supermoon actually is`, `/moon/supermoons/`, `and who gets to decide — the threshold is on the page`],
  [`Why Mars rovers drive themselves`, `${PL.mars}`, `radio takes 3 to 22 minutes each way — no joystick crosses that`],
  [`The year is not a whole number`, `/classroom/lessons/leap-year-grades-5-6/`, `365.2422 days, and everything the calendar does about it`],
];

const lessonsHub = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Science Lesson Plans by Grade — Solar System, Moon &amp; Seasons</title>
<meta name="description" content="Free astronomy lesson plans for every grade from K–2 to high school: the solar system and gravity, the moon and its phases, the seasons — each a timed sequence where every step opens the exact simulator view.">
<link rel="canonical" href="${SITE}${LPATH}">
<meta property="og:title" content="Science Lesson Plans by Grade — Solar System, Moon &amp; Seasons">
<meta property="og:description" content="Timed, free lesson plans from K–2 to high school, built on live astronomy simulators — every step a link to the exact view.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: PATH }, { name: "Lesson plans", url: LPATH }])}</script>
${learningLd({ name: "Science lesson plans by topic and grade", url: `${SITE}${LPATH}`, description: "Timed astronomy lesson plans for K–2 through high school — solar system and gravity, moon phases, seasons — built on free browser-based simulators with per-step deep links.", type: "lesson plan", audience: "teacher" })}
${faqLd(LFAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>Lesson Plans, by Topic and Grade</h1>
  <p class="sub">Timed lessons a teacher can run tomorrow, on tools that need no sign-up and no install. Every step is a link that opens the exact view — place, date, zoom and speed ride in the address, so one link puts the projector and thirty student screens on the same sky. The tools themselves are on the <a href="${PATH}">classroom hub</a>, by subject: <a href="${PATH}astronomy/">astronomy</a>, <a href="${PATH}earth/">Earth science</a> and <a href="${PATH}time/">time</a>.</p>
  <p class="cr-ctarow">${submitCta()} <a class="cr-more" href="${QUESTIONS_HASH}">Or send the questions your class asked →</a></p>

  ${""/* THE QUESTIONS COME FIRST, AS PROSE. A teacher doesn't arrive holding a
       topic taxonomy; they arrive holding the question a student asked at
       2:15 on a Tuesday. So the door into the matrix is the questions
       themselves, each linking straight to the lesson that answers it —
       deliberately a different shape from the grid below it. */}
  <div class="card">
    <h2>Start from the question a student actually asked</h2>
    <p>Every class has them — the questions that sound simple and aren't. <a href="${LPATH}moon-phases-grades-3-4/">Why does the moon light up differently through the month?</a> <a href="${LPATH}solar-system-grades-3-4/">Why don't the planets get sucked into the sun?</a> <a href="${LPATH}solar-system-grades-5-6/">Why does Mercury travel faster than Mars?</a> Each of those is a lesson here, and the answer is never recited — the class watches the real motions until the rule shows itself.</p>
    <p>Some take a measurement to answer: <a href="${LPATH}moon-phases-grades-5-6/">why does the moon rise about fifty minutes later every night?</a> <a href="${LPATH}seasons-grades-k-2/">Is today longer than yesterday — and by how much?</a> Some hide a broken model that has to be caught: <a href="${LPATH}moon-phases-grades-7-8/">if the sun, Earth and moon line up every month, why isn't there an eclipse every month?</a> <a href="${LPATH}seasons-grades-7-8/">Is it summer because we're closer to the sun — and if so, why is it winter in Sydney on the same day?</a> And one is a deadline dressed as geometry: <a href="${LPATH}solar-system-high-school/">why can a rocket to Mars only launch every 26 months?</a></p>
    <p>And some questions turn out to be about numbers wearing a costume: <a href="${LPATH}leap-year-grades-5-6/">why does February grow a day every four years — and who decided?</a> <a href="${LPATH}light-speed-grades-7-8/">How old is the sunlight hitting your desk, and how can a year measure a distance?</a> <a href="${LPATH}earth-moon-sun-grades-5-6/">And how does one machine — the Earth, the moon and the sun — keep the day, the month and the year all ticking at once?</a> Those lessons are where space stops being a picture and starts being arithmetic.</p>
    <p>Pick the question, and the grade band comes with it — or browse the grid below.</p>
  </div>

${filterBar}
${TOPICS.map(topicCard).join("\n")}

  ${""/* STUDENT-TAUGHT LESSONS. The per-step minutes exist partly for this:
       a step is a hand-sized lesson. The AI section is deliberately a recipe
       plus rules rather than cheerleading — the point is that the student
       does the learning and the verifying, and the teacher sees it first. */}
  <div class="card" id="student-taught">
    <h2>Students teach the class — the five-minute lesson</h2>
    <p>Some of the best lessons here will be taught by a nine-year-old. Letting a student teach five minutes does three things at once: it builds comfort in front of a room, it forces the deep version of learning (you cannot teach what you only half know), and it hands them the rarest thing in a school week — <strong>the choice of what to study</strong>. Frame it exactly that way: <em>pick anything you're curious about, inside science and space, and share it.</em></p>
    <h3>Three ways to pick a topic</h3>
    <ul class="bullets">
      <li><strong>Take a ready-made five minutes:</strong> every step of every plan above carries its own minutes — hand a student one step, link and all, and it is already a lesson with a beginning and an end.</li>
      <li><strong>Pick from the list below:</strong> each one opens the exact view, so the "slides" are the live sky.</li>
      <li><strong>Bring your own:</strong> anything inside space and science counts, subject to the teacher's yes.</li>
    </ul>
    <div class="wc-facts lp-steps">
${FIVE_MIN.map(([t, u, d]) => step("5 min", `<a href="${u}">${esc(t)}</a> — ${esc(d)}`)).join("\n")}
    </div>
    <h3>Using AI to build your five minutes — the honest way</h3>
    <p>An AI assistant is genuinely good at turning a topic into a five-minute plan — <em>if you feed it the right ingredients and check what comes back</em>. The recipe:</p>
    <ul class="bullets">
      <li><strong>Tell it exactly who and what:</strong> “I'm a 5th grader teaching my class a 5-minute lesson about why the moon rises later each night. Build me: a one-sentence hook question, two minutes of showing using this link, one surprising fact, and one question to ask the class at the end.”</li>
      <li><strong>Paste the link you'll project</strong> (any lesson step or list entry above) so the plan is built around what the class will actually see.</li>
      <li><strong>Verify every fact before you say it</strong> — against this site or NASA. If the AI said it and you can't find it anywhere else, it doesn't go in your lesson. That rule is not a formality; it is the lesson behind the lesson.</li>
      <li><strong>The AI writes the plan; you do the learning.</strong> If you can answer one unexpected question from the class, you learned it. If you only read it aloud, you didn't.</li>
      <li><strong>Show the teacher first.</strong> Every performer has an editor.</li>
    </ul>
  </div>

  <div class="card">
    <h2>Coming next — help us pick</h2>
    <p>Four more topics are planned, each on tools the site already has. The feedback form below is the vote:</p>
    <ul class="bullets">
${PLANNED.map(([n, d]) => `      <li><strong>${esc(n)}</strong> — ${esc(d)}.</li>`).join("\n")}
    </ul>
  </div>

${feedbackCard("these lessons")}

  <div class="card tool-about">
    <h2>Lesson plan FAQ</h2>
    ${LFAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${FILTER_JS}
</body>
</html>
`;

mkdirSync(join(root, "classroom/lessons"), { recursive: true });
writeFileSync(join(root, "classroom/lessons/index.html"), lessonsHub);

/* ==========================================================================
 * THE HUB AND ITS THREE SUBJECT PAGES
 *
 * WHY THIS PAGE WAS REBUILT. /classroom/ used to open with a wall of preset
 * minutes and an essay on why countdowns help with transitions. That is a
 * real page for a real search, but it is the wrong FIRST IMPRESSION for a
 * science site: a teacher who lands on it learns that we make timers. In the
 * whole time it has been up, not one teacher has sent anything through it.
 *
 * So the hub is now three doors and an ask, and every word about timers has
 * moved down a level to /classroom/time/, where it keeps its search terms and
 * stops being the thing this site appears to be about.
 *
 * THE DOORS ARE NOT EQUAL, ON PURPOSE. Astronomy and Earth science lead;
 * Time follows, smaller. That is the owner's call and it is the right one —
 * the sky is what a class remembers, and the clock is what it uses. Weighting
 * them equally would be a design that reflects the URL structure rather than
 * the subject.
 *
 * EVERYTHING A SUBJECT PAGE SAYS ABOUT A LESSON IS DERIVED from LESSONS, so a
 * retitled lesson or a changed length cannot leave a stale claim behind on
 * three other pages. Nothing here is a new simulator and nothing here is a
 * new lesson: it is the existing catalog, arranged so a teacher's first click
 * is science.
 * ======================================================================= */

/* the bare NGSS code out of a lesson's sentence about it — the sentence is
   what the lesson page prints, the code is what a catalog row needs */
const ngssCode = (s) => {
  const m = /\b((?:K|[1-9]|HS|MS)-[A-Z]{2,4}\d*-\d+)\b/.exec(s || "");
  return m ? m[1] : "";
};
/* one lesson, resolved from the catalog. Throws rather than silently emitting
   a dead row: a subject page that lists a lesson which does not exist is a
   broken promise that check-pages would catch as a 404 and nobody would catch
   as a wrong grade band. */
const lessonRef = (t, b) => {
  const T = TOPICS.find((x) => x.s === t), B = BANDS.find((x) => x.s === b);
  const L = T && LESSONS[t] && LESSONS[t][b];
  if (!L) throw new Error(`classroom: no lesson ${t}/${b} to feature`);
  return { url: `${LPATH}${t}-${b}/`, t: L.t, mins: L.mins, band: B.n, ngss: ngssCode(L.ngss) };
};
const lessonRow = (t, b) => {
  const L = lessonRef(t, b);
  return `      <div class="wc-frow"><span>${esc(L.band)}</span><b><a href="${L.url}">${esc(L.t)}</a> — ${L.mins} min${L.ngss ? ` · ${esc(L.ngss)}` : ""}</b></div>`;
};
/* a tool a teacher can put on the projector, as a row */
const toolRow = ([url, name, note]) =>
  `      <div class="wc-frow"><span><a href="${url}">${esc(name)}</a></span><b>${note}</b></div>`;

const SUBJECTS = [
  {
    s: "astronomy", ico: "solar", lead: true,
    n: "Astronomy in the classroom",
    door: "Planets, the moon, the solar system — and a rocket that has to aim at where Mars will be.",
    dek: "Put the solar system on the projector. The drawing is the worksheet.",
    title: "Astronomy in the Classroom — Free Solar System &amp; Moon Simulators",
    desc: "Free astronomy tools and lesson plans for K–2 to high school: the solar system on its real orbits, the moon's phases from your own town, the planets in order, and why a Mars rocket waits 26 months. No sign-up, nothing installed.",
    intro: [
      `Every tool below runs in a browser tab on a school machine, with nothing installed and nobody signed in. They are not animations of what space looks like — the positions are computed from the real orbits when the page loads, and every page states plainly what its picture exaggerates. That last part is the lesson more often than the picture is.`,
      `The link is the lesson plan. Place, date, zoom and speed all ride in the address, so one link puts the projector and thirty student screens on the same sky — and a link you send home on Friday opens the same view on a kitchen laptop.`,
    ],
    tools: [
      [SIM, "Sun, Earth &amp; Moon", "Your town marked on the turning Earth, the daylight half, and the moon at its true angle from the sun. A day, a week or a month per drag."],
      [SOL, "Solar system simulator", "The planets on their real orbits, from the to-scale Earth and Moon out to Neptune. <strong>This is the planets-and-moons simulator</strong> — there is no second one."],
      [PLANETS_PATH, "The planets", "One page per world in orbital order, each with a drawn globe. Reading first, then the simulator."],
      [ROCKET_PATH, "Rocket launches", "Why a Mars window opens every 26 months. Geometry, not a date off a poster."],
      ["/moon/eclipses/", "Eclipses", "Every lunar eclipse, solved — and why there is not one every month."],
    ],
    lessons: [["solar-system", "grades-k-2"], ["solar-system", "grades-3-4"], ["moon-phases", "grades-5-6"], ["light-speed", "grades-7-8"], ["solar-system", "high-school"]],
    close: `The one that surprises a class most costs nothing and needs no screen: shrink the Earth to a ${MARBLE.mm} mm marble, walk the moon ${Math.round(MARBLE.moonDist * 100)} cm down the corridor as a ${MARBLE.moonD.toFixed(1)} mm peppercorn, and leave the ${MARBLE.sunD.toFixed(1)}-metre sun ${Math.round(MARBLE.sunDist)} metres away at the far end of the building. The <a href="${SOL}">simulator's scale card</a> computes those figures from its own drawing, so they cannot drift from the picture the class just watched.`,
  },
  {
    s: "earth", ico: "globe", lead: true,
    n: "Earth science in the classroom",
    door: "Why the day/night line leans, why summer is tilt and not distance, and what the moon does to the sea.",
    dek: "The ground under the class is moving. Show them.",
    title: "Earth Science in the Classroom — Seasons, Day &amp; Night, Tides",
    desc: "Free Earth science tools and lesson plans: a live day and night map with the equator and tropics, why the seasons are tilt and not distance, sunrise and sunset for your own town, and tide predictions. K–2 to high school, no sign-up.",
    intro: [
      `This is the half of the site where the class is standing inside the thing being taught. The sunrise on the board is their sunrise, computed for their coordinates from today's date — not a number looked up in a table, and not an average for the state.`,
      `Which is why the seasons land here rather than in astronomy. A tilted Earth is an astronomy fact; a day that is four minutes longer than yesterday's, in their town, is a measurement they can take.`,
    ],
    tools: [
      [DAYNIGHT_PATH, "Day and night map", "Who is in daylight right now, the equator and both tropics drawn on, and the four corners of the year on buttons. <strong>This is the seasons lesson</strong>, and it comes with the side-on picture of why."],
      [SIM, "Sun, Earth &amp; Moon", "The tilt from above the orbit: the midnight sun, and a town moving in and out of the light."],
      ["/sun/", "Sunrise &amp; sunset", "The real numbers for this town, on any date, with a seven-day table. Over a thousand cities, or any location you name."],
      ["/tides/", "Tides", "The same moon, pulling water — predicted highs and lows at real NOAA stations, for US coastal classes."],
      ["/moon/", "Tonight's moon", "Phase, illumination and rise time for your own town, which is what makes a moon journal work."],
    ],
    lessons: [["seasons", "grades-k-2"], ["seasons", "grades-3-4"], ["seasons", "grades-5-6"], ["seasons", "grades-7-8"], ["earth-moon-sun", "grades-5-6"]],
    close: `The seasons lessons are the ones to start with, and the 7–8 band is deliberately a trap: it hands the class the "we are closer to the sun in summer" idea, which is <em>true in January and true in Australia</em>, and makes them break it themselves. A misconception a class dismantles with its own measurements does not come back.`,
  },
  {
    s: "time", ico: "timer", lead: true,
    n: "Time in the classroom",
    door: "Time zones, 12- and 24-hour clocks, the line where the date jumps — time as geography, not as a countdown.",
    dek: "Time zones, the two clocks, and the seam in the calendar. Then, if you need a countdown, the timer is still here.",
    title: "Time in the Classroom — Time Zones, 24-Hour Clocks &amp; a Projector Timer",
    desc: "Free classroom tools for teaching time: a world clock and time zones, a 12- to 24-hour converter, the day and night map behind why zones exist, a leap year lesson — and a full-screen projector timer and stopwatch with CSV export.",
    intro: [
      `A time zone is a political stripe painted on a rotating ball. That sentence is the whole subject, and it is why this page starts with a map rather than a clock: noon is not a number somebody chose, it is where the sun is overhead, and every zone is an argument about how far from that a country is willing to sit.`,
      `The countdown timer is at the bottom of this page, where it belongs. It is a good timer and a lot of classrooms use it — but it is a piece of furniture, not a subject.`,
    ],
    tools: [
      ["/world-clock/", "World clock", "Who is asleep, and who could pick up the phone. Every zone, with the 12/24 switch on the page."],
      [DAYNIGHT_PATH, "Day and night map", "<strong>Why</strong> time zones exist: the sun is overhead at one meridian, and everything east of it is already later."],
      ["/24-hour-clock-converter/", "12- and 24-hour converter", "The other clock — the one science, airlines and most of the world actually use."],
      ["/alarm-clock/", "Alarm clock", "For a fixed moment rather than a length: end of test, start of assembly. Full-screen mode doubles as a wall clock."],
    ],
    lessons: [["leap-year", "grades-5-6"]],
    close: `One full timed plan so far — which is exactly why this subject leads the list on <a href="${SUBMIT_PATH}">the submission page</a>. If you teach time zones, the two clocks or the date line, your lesson is the one this shelf is missing.`,
    /* FOUR LESSONS A TEACHER CAN RUN TOMORROW, expanded from what used to be
       one closing paragraph. The owner's brief: time as taught here — preset
       minutes and a countdown essay — was not compelling, so the page now
       leads with the part of "time" that is actually astonishing: it is
       GEOGRAPHY, and every one of these runs on tools the site already has.
       Each is a runnable sequence, not a sentiment, because "worth a lesson"
       convinces nobody standing in front of a class at 8am. */
    run: [
      ["A time zone is a political stripe on a rotating ball", "~20 min · grades 3–8",
        `Open <a href="${DAYNIGHT_PATH}">the day and night map</a> and find the sun marker: noon is not a decision, it is a place. Then open <a href="/world-clock/">the world clock</a> beside it and ask why the stripes are not straight — why is all of China one zone? Why is India half an hour off from everyone? The answers are politics, and realising that the clock on the wall is a <em>negotiated settlement</em> is the best civics lesson hiding inside a science class.`],
      ["The clock that hides the afternoon", "~15 min · grades 3–6",
        `Write 7:00 on the board and ask: breakfast or dinner? You cannot know — the 12-hour clock throws away the answer. Have the class write their whole day in 24-hour time with <a href="/24-hour-clock-converter/">the converter</a> to check themselves, then ask who cannot afford that ambiguity. Pilots, doctors, train drivers, armies, scientists: everyone whose mistake would matter uses the clock that does not hide half the day.`],
      ["The seam where the date jumps", "~20 min · grades 5–8",
        `On <a href="/world-clock/">the world clock</a>, find two cities where it is <em>two different days right now</em> — Auckland and Honolulu usually do it. Same moment, different date. Then hand the class the puzzle the map solves: if noon travels west around a round Earth forever, somewhere the calendar has to tear. The International Date Line is not magic — it is the seam you are forced to cut, and they can work out for themselves roughly where you would put it (as far from everyone as possible).`],
      ["Call a city without waking it up", "~15 min · any grade",
        `Pick a city the class has a connection to and plan a phone call: what time is it there when school starts here? Zone conversion is just adding hours and then asking whether you crossed the seam — and <a href="${DAYNIGHT_PATH}">the day and night map</a> shows the answer physically, as who is in daylight, before anyone touches arithmetic. End on the question that sticks: is there any moment when the whole world is having the same day?`],
    ],
    /* THE WISHLIST IS COPY, NOT URLS (per the brief: nothing new built this
       month) — but it is copy WITH A DOOR ON IT, because the owner's ask is
       that this page pull teachers into collaborating. A list of things we
       might build is idle; a list a teacher can vote on or claim is not. */
    wish: [
      ["A visual time-zone converter", "two cities pinned on the day/night map, the hour difference shown as the stretch of lit Earth between them"],
      ["A date-line explorer", "step across 180° and watch the calendar jump a day under your feet"],
      ["A sundial page", "why clock noon and sun noon disagree — the equation of time, drawn for your own town"],
      ["Sidereal vs solar day (high school)", "why a star rises four minutes earlier each night, and what that says about what a 'day' even is"],
    ],
  },
];
const subjectUrl = (s) => `${PATH}${s}/`;
const runSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SUBJ = (s) => SUBJECTS.find((x) => x.s === s);

/* ---- one door on the hub -------------------------------------------------
 * The lead pair get three named lessons; Time gets its one line and its link.
 * A door is a route, not a summary — anything it explains at length is
 * something the subject page then has to repeat. */
const doorCard = (S) => {
  const lessonBits = S.lessons.slice(0, 3).map(([t, b]) => lessonRow(t, b)).join("\n");
  /* The hub row links to the sequence itself, not the bare subject page — a
     row titled as a lesson that lands mid-scroll with no anchor reads as a
     broken promise. */
  const runBits = (S.run || []).slice(0, S.lessons.length >= 3 ? 0 : 3 - S.lessons.length)
    .map(([title, meta]) => `      <div class="wc-frow"><span><a href="${subjectUrl(S.s)}#run-${runSlug(title)}">${esc(title)}</a></span><b>${esc(meta)}</b></div>`)
    .join("\n");
  return `  <div class="card cr-door${S.lead ? "" : " cr-door-min"}">
    <h2>${ico(S.ico)} <a href="${subjectUrl(S.s)}">${esc(S.n)}</a></h2>
    <p>${S.door}</p>
    <div class="wc-facts lp-steps">
${lessonBits}
${runBits}
    </div>
    <p><a class="cr-more" href="${subjectUrl(S.s)}">${esc(S.lead ? `Open ${S.n.replace(" in the classroom", "")}` : "Open Time")}</a></p>
  </div>`;
};

/* ---- a subject page ------------------------------------------------------ */
const subjectPage = (S) => {
  const url = subjectUrl(S.s);
  const others = SUBJECTS.filter((x) => x.s !== S.s);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${S.title}</title>
<meta name="description" content="${esc(S.desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:title" content="${S.title}">
<meta property="og:description" content="${esc(S.dek)}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: PATH }, { name: S.n, url }])}</script>
${learningLd({ name: S.n, url: `${SITE}${url}`, description: S.desc.replace(/&amp;/g, "&"), type: "guide", audience: "teacher" })}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>${esc(S.n)}</h1>
  <p class="sub"><strong>${esc(S.dek)}</strong> Free, no sign-up, nothing installed. Part of the <a href="${PATH}">classroom hub</a>; the full catalog is on <a href="${LPATH}">lesson plans by topic and grade</a>.</p>

  <div class="card">
    <h2>What this is</h2>
${S.intro.map((p) => `    <p>${p}</p>`).join("\n")}
    <p class="cr-ctarow">${submitCta()} <a class="cr-more" href="${QUESTIONS_HASH}">Or send the questions your class asked →</a></p>
  </div>

  <div class="card">
    <h2>${ico("projector")} On the projector</h2>
    <p>Everything here is already built. Open it, full-screen it, and teach.</p>
    <div class="wc-facts">
${S.tools.map(toolRow).join("\n")}
    </div>
  </div>

${S.run ? `  ${""/* RUNNABLE, NOT ADMIRABLE. These were one closing paragraph of "ideas
       worth a lesson each"; a teacher cannot project a sentiment. Each is now
       a sequence with a length and a grade band, on tools that exist. */}
  <div class="card">
    <h2>${ico("classroom")} Four lessons you can run tomorrow — no prep, no new tools</h2>
    <div class="wc-facts lp-steps">
${S.run.map(([t, meta, how]) => `      <div class="wc-frow" id="run-${runSlug(t)}"><span>${esc(meta)}</span><b><strong>${esc(t)}.</strong> ${how}</b></div>`).join("\n")}
    </div>
    <p class="hint">Run one of these and it worked — or didn't? <a href="${SUBMIT_PATH}">Tell us, or send us your version</a>: the written-up plan that comes out of it carries your name.</p>
  </div>

` : ""}  <div class="card">
    <h2>${ico("classroom")} Lessons that run on them</h2>
    <p>Timed, step-by-step, every step a link that opens the exact view. ${S.lessons.length === 1 ? "One so far in this subject" : `${S.lessons.length} of them`}, and the <a href="${LPATH}">full grid</a> has the rest.</p>
    <div class="wc-facts lp-steps">
${S.lessons.map(([t, b]) => lessonRow(t, b)).join("\n")}
    </div>
    <p>${S.close}</p>
  </div>

${S.wish ? `  ${""/* THE WISHLIST, WITH A DOOR ON IT. Copy only — none of these exist
       and none get a URL until one is built (see the working rules) — but a
       list a teacher can vote on or claim is a collaboration hook, where a
       list of maybes is just a roadmap nobody asked for. */}
  <div class="card cr-lead">
    <h2>What we're considering building next — help us choose</h2>
    <p>None of these exist yet. Each would be built the way everything here is built — free, in the browser, computed from the real motions — and <strong>the class whose ask gets one built is credited on the page it becomes</strong>:</p>
    <div class="wc-facts">
${S.wish.map(([t, d]) => `      <div class="wc-frow"><span>${esc(t)}</span><b>${esc(d)}</b></div>`).join("\n")}
    </div>
    <p class="cr-ctarow"><a class="btn cr-cta" href="${PATH}#ask">Vote, or ask for your own</a> <a class="cr-more" href="${SUBMIT_PATH}">Or send a lesson you already run →</a></p>
  </div>

` : ""}${S.s === "time" ? `  ${""/* THE TIMERS, DEMOTED BUT NOT DELETED. This material used to be the
       first thing a teacher saw on /classroom/. It is genuinely useful and it
       ranks; it is simply not what the site is about, so it lives here, below
       the subject, keeping its search terms. */}
  <div class="card">
    <h2>${ico("timer")} And when you do need a countdown</h2>
    <p>A visible countdown does the managing for you: it makes the length of a task explicit, it ends an activity without anyone being told off, and it turns "two more minutes" from a negotiation into a fact on the wall. Both tools have a full-screen mode, which is the point at which a timer becomes readable from the back of a room, and the time left also appears in the browser tab title.</p>
    <div class="timer-presets">${presetChips}<a class="chip chip-alt" href="/timer/">Custom timer</a></div>
    <div class="wc-facts" style="margin-top:12px">
${presetRows}
      <div class="wc-frow"><span><a href="/timer/">Custom timer</a></span><b>any length — set hours, minutes and seconds</b></div>
    </div>
    <h3>Keyboard control, so you're not hunting for a button</h3>
    <div class="wc-facts">
      <div class="wc-frow"><span>Timer (a single-duration page)</span><b>Space start / pause · R reset</b></div>
      <div class="wc-frow"><span>Stopwatch</span><b>Space start / stop · L lap · R reset</b></div>
    </div>
    <h3>Rotations, fluency and repeated trials</h3>
    <p>The timer runs <strong>up to three countdowns at once</strong>, each with its own label and its own alarm sound — enough for a three-station rotation where every group is on a different clock. For reading fluency or a repeated experiment, the <a href="/stopwatch/">stopwatch</a>'s <strong>Lap</strong> button gives a numbered list with each lap time and the running total, fastest in green and slowest in red. <a href="/stopwatch/multiple/">Three stopwatches on one screen</a> lets each group have its own, named and coloured so they can find it from across the room.</p>
    <p>A session leaves the page two ways: <strong>CSV</strong> (a row per stopwatch — its name, a column per lap, then the total) for records, and <strong>Share</strong>, one image of the whole session, for people. Both are named for the date and time, so a term's files sort themselves. Nothing is uploaded.</p>
    <h3>What a browser timer can't do</h3>
    <ul class="bullets">
      <li>It rings only while the page is open. The tab can be behind another window, but if it is closed or the machine sleeps, no alarm.</li>
      <li>A background tab may be updated less often by the browser, so a display that isn't on screen can lag.</li>
      <li>The precision depends on the device. Fine for classroom work — not for official sports timing, scientific measurement or anything medical.</li>
      <li>Sound needs the volume up and, on some browsers, one tap on the page before audio is allowed. Test it once on the classroom machine.</li>
    </ul>
    <p><a href="/browser-limitations/">The full browser limitations page</a> explains why, and <a href="/methodology/browser-timing/">the measured accuracy figures</a> show how far off a browser timer actually is.</p>
    <h3>Accessibility — what to check</h3>
    <ul class="bullets">
      <li>The big read-out is drawn as segments rather than text, so it carries a text version for screen readers. It is deliberately <em>not</em> announced on every tick, which means a screen-reader user gets the value on demand rather than a live countdown.</li>
      <li>At zero the timer does three visual things as well as ring — the read-out turns to the accent colour and flashes, <em>Time's up!</em> appears under it, and the tab title changes — so a deaf or hard-of-hearing student watching the projector gets the same signal at the same moment. It does not vibrate, and the flash is the display rather than the whole screen, so full-screen it on a projector.</li>
      <li>Every control is a real button and reachable by keyboard.</li>
      <li>The display colour can be changed on the alarm clock and the timer if the default is hard to read on your projector.</li>
    </ul>
  </div>

  <div class="card tool-about">
    <h2>Classroom timer FAQ</h2>
    ${FAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>

` : ""}  <div class="card">
    <h2>The other two doors</h2>
    <div class="wc-facts">
${others.map((O) => `      <div class="wc-frow"><span><a href="${subjectUrl(O.s)}">${esc(O.n.replace(" in the classroom", ""))}</a></span><b>${O.door}</b></div>`).join("\n")}
      <div class="wc-frow"><span><a href="${LPATH}">Every lesson</a></span><b>the full grid: ${BANDS.length} grade bands, ${TOPICS.length} topics${LESSON_PAGES.length === BANDS.length * TOPICS.length ? ", every one a timed sequence" : ` — ${LESSON_PAGES.length} of them written`}.</b></div>
    </div>
  </div>

${hubQuestionsCard(url)}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
};

/* ---- the hub ------------------------------------------------------------- */
const HUB_FAQ = [
  ["Do I need an account?",
    "No. There is no sign-up, nothing to install and nothing to pay. Everything runs in the browser on whatever machine the school gives you, and anything a tool saves stays on that device."],
  ["Will these work on a locked-down school computer?",
    "They are ordinary web pages, so if the browser can reach the site they work. There is no plugin, no Flash, no app and no login wall. The one thing worth testing before a lesson is sound, because some browsers need one tap on the page before they will play audio."],
  ["Are the simulators real, or are they animations?",
    "The positions are computed from the real orbits when the page loads, using the same standard methods observatories teach from — not a video and not a loop. Every page also states what its drawing exaggerates, which is usually the most useful thing on it. The one honest exception: where a moon sits along its orbit is illustrative, and the page says so."],
  ["Can I print, adapt or remix the lesson plans?",
    "Yes — free to use, adapt and share for teaching. You do not need to ask, and there is nothing to attribute unless you want to."],
  ["What actually happens if I send you a lesson?",
    "A person reads it. If we can use it, we rewrite it in the site's voice, wire every step to a live view, check the science, credit you the way you asked, and email you when it is live. If we cannot use it, we tell you rather than leaving you waiting. Nothing is ever published automatically."],
  ["Do you collect anything from students?",
    "No. There are no student accounts, no student forms, no uploads and no public comments anywhere on this site. The only address it ever holds is a teacher's, given on one of the teacher forms, and it is used to reply to that teacher. Class questions are published as “a 5th-grade class asked…”, never with a name."],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Earth, Sky and Time for the Classroom — Free Science Simulators</title>
<meta name="description" content="Free, projector-ready science simulators and lesson plans for K–2 to high school: the solar system and the moon, the seasons and the day/night line, time zones and clocks. No sign-up. Send us the lesson you already run and we will build it.">
<link rel="canonical" href="${SITE}${PATH}">
<meta property="og:title" content="Earth, sky and time — for the classroom">
<meta property="og:description" content="Free simulators, projector-ready, no sign-up. Open a lesson. Or send us one.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: PATH }])}</script>
${learningLd({ name: "Earth, sky and time for the classroom", url: `${SITE}${PATH}`, description: "Free browser-based science simulators and timed lesson plans for K–2 through high school: astronomy, Earth science and time. Teachers can submit a lesson plan they already run, or the questions their class asked.", type: "guide", audience: "teacher" })}
${faqLd(HUB_FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>Earth, sky and time — for the classroom</h1>
${sectionSwitcher("/classroom/")}
  <p class="sub">Free simulators, projector-ready, no sign-up. Open a lesson. Or send us one.</p>

  ${""/* THREE DOORS AND NOTHING ELSE ABOVE THE FOLD. Every tool on the site
       could be listed here and the page would be a junk drawer; a teacher who
       has to choose between eleven things chooses none. Two lead doors and a
       third, and the subject pages carry the tools. */}
  <div class="duo">
${doorCard(SUBJ("astronomy"))}
${doorCard(SUBJ("earth"))}
  </div>
${doorCard(SUBJ("time"))}

  ${""/* THE PITCH STAYS ON THE HUB; THE FORMS MOVED TO THEIR OWN PAGE
       (/classroom/submit-a-lesson/, also in the site nav). A hub is a page of
       doors, and two full forms in the middle of it made the doors below them
       invisible. The pitch is the door; the page is the room. */}
  <div class="card cr-lead">
    <h2>Send us the lesson you already run</h2>
    <p>This site is one person building simulators, and the best thing that could happen to it is a teacher saying <em>here is what I actually teach, and here is where it falls apart on a whiteboard</em>. Send that. We rewrite it into a page on this site, built on these tools, with your name on it — free for every classroom that comes after yours.</p>
    <p>You do not need a polished plan, an original one, or one you wrote without help. You need the right to share it. That is the entire bar.</p>
${plaque()}
    <p class="cr-ctarow">${submitCta()} <a class="cr-more" href="${QUESTIONS_HASH}">Or just send the questions your class asked →</a></p>
  </div>

  <div class="card">
    <h2>${ico("classroom")} Or start from a lesson that already exists</h2>
    ${""/* the count is LESSON_PAGES.length, never typed: it said "Seventeen"
         while the catalog held eighteen, which is exactly the kind of small
         lie this site's derive-everything rule exists to prevent */}
    <p>${["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"][LESSON_PAGES.length] || LESSON_PAGES.length} timed plans across five grade bands, each built around one question and each with every step wired to a live view. The whole grid is on <a href="${LPATH}">lesson plans by topic and grade</a>; a few to start from:</p>
    <div class="wc-facts lp-steps">
${[["seasons", "grades-k-2"], ["solar-system", "grades-3-4"], ["moon-phases", "grades-5-6"], ["seasons", "grades-7-8"], ["solar-system", "high-school"]].map(([t, b]) => lessonRow(t, b)).join("\n")}
    </div>
    <p class="hint">Every step carries its own minutes, which means any single step can be handed to a student as their own five-minute lesson. The <a href="${LPATH}#student-taught">student-taught section</a> is built on exactly that.</p>
  </div>

  ${""/* FORM C, KEPT AND DEMOTED. It is a good offer and it has produced
       nothing, because it asks a teacher to imagine a tool that does not
       exist — the hardest possible first move. It stays, at the bottom, for
       the teacher who already knows what they want to watch. */}
  <div class="card cr-ask" id="ask">
    <h2>Ask us to build something new</h2>
    <p>The third door, and the biggest ask: <strong>a simulator, not a countdown</strong>. What would make a concept land for your class if they could <em>see it move</em>? If it comes out of orbits, formulas or real measurements — an alignment, a cycle, a comparison, a scale you could walk out on a field, a body we have not drawn — it is probably within reach, and we will take it as a challenge.</p>
    <p>Make the ask part of the lesson: let them argue about what would actually help, then send <strong>one</strong> email from the class rather than thirty. If we build it, the credit goes on the page it inspired — <em>“inspired by an idea from Mr Smith's 5th grade class at Paradise Elementary School in Paradise, California”</em> — which is a rare thing for a school task to end with: evidence, on the open internet, that the work changed something outside the room.</p>

    <form id="cr-form">
      <label for="cr-teacher">Teacher's name, as you want it to appear</label>
      <input id="cr-teacher" type="text" maxlength="80" required placeholder="e.g. Mr Smith">
      <label for="cr-grade">Grade or year group</label>
      <input id="cr-grade" type="text" maxlength="60" required placeholder="e.g. 5th grade">
      <label for="cr-place">City and state, or town and country</label>
      <input id="cr-place" type="text" maxlength="90" required placeholder="e.g. Paradise, CA">
      <label for="cr-year">School year <span class="cr-opt">— optional, and only used if you want it printed</span></label>
      <input id="cr-year" type="text" maxlength="30" placeholder="e.g. 2026–2027">
      <label for="cr-ask">What are you teaching, and what would you like to be able to watch?</label>
      <textarea id="cr-ask" maxlength="1200" required placeholder="e.g. We are on the seasons in October. We would like a tool that shows the same town at noon on the solstice and the equinox side by side, so we can see the sun's height change without leaving the classroom…"></textarea>
      <label for="cr-email">Email to reply to</label>
      <input id="cr-email" type="email" required placeholder="A school address is fine">
      <div class="hint">Required — a request nobody can reply to is a request we cannot ask a question about. Used only to answer you, never shared and never added to a list.</div>
      <label class="cr-check"><input type="checkbox" id="cr-credit" checked> <span>Credit my class on the page if you build it</span></label>
      <input id="cr-hp" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="row" style="margin-top:16px"><button class="btn" id="cr-send" type="submit">Send our request</button></div>
      <p id="cr-note" class="hint"></p>
    </form>
  </div>
  <script>
  (function(){
    var f=document.getElementById("cr-form"); if(!f) return;
    var V=function(id){ return (document.getElementById(id).value||"").trim(); };
    f.addEventListener("submit",function(ev){
      ev.preventDefault();
      var note=document.getElementById("cr-note"), btn=document.getElementById("cr-send");
      btn.disabled=true; note.textContent="Sending\\u2026";
      var yr=V("cr-year"), cite=V("cr-teacher")+"'s "+V("cr-grade")+" class"
        +(yr?", "+yr+" school year":"")+" \\u2014 "+V("cr-place");
      var credit=document.getElementById("cr-credit").checked?"YES":"NO";
      fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          url:location.href, reason:"Classroom request",
          details:"CITATION: "+cite+"\\nCREDIT OK: "+credit+"\\n\\n"+V("cr-ask"),
          email:V("cr-email"), website:document.getElementById("cr-hp").value
        })})
        .then(function(r){ return r.json().catch(function(){return{};}); })
        .then(function(d){
          if(d&&d.ok){ f.reset(); note.textContent="\\u2713 Thank you \\u2014 we read every one of these and will reply. If we build it, your class goes on the page."; }
          else { btn.disabled=false; note.textContent="Something went wrong \\u2014 please try again."; }
        })
        .catch(function(){ btn.disabled=false; note.textContent="Network error \\u2014 please try again."; });
    });
  })();
  </script>

  <div class="card">
    <h2>Need a countdown on the wall?</h2>
    <p>The <a href="/timer/">timer</a> and the <a href="/stopwatch/">stopwatch</a> are still here, still free and still full-screen. They are not what this page is about — the projector timer, the keyboard shortcuts, the lap export and what a browser timer cannot be trusted to do all live on <a href="${subjectUrl("time")}">Time in the classroom</a>.</p>
  </div>

  <div class="card tool-about">
    <h2>Common questions</h2>
    ${HUB_FAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

/* ---- /classroom/submit-a-lesson/ — the collaboration page -----------------
 *
 * A NAV ITEM NEEDS A DESTINATION. "Submit a lesson plan" sits in the site
 * menu (owner's call: this is a primary task of the site, not a footnote on
 * the hub), and a menu row that jumped to an anchor halfway down another page
 * would land a reader mid-scroll with no idea what they had agreed to. This
 * page is the whole case, made once: why teacher-written lessons, what
 * happens to one, what the teacher gets back, and then the two forms.
 *
 * IT IS A COLLABORATION PAGE, NOT A DROPBOX. The copy leads with what the
 * teacher's material becomes — a page other classrooms use, free, credited —
 * because "help make quality lesson plans for teachers everywhere" is the
 * actual offer, and "paste your lesson here" is only its mechanism. */
const SUBMIT_FAQ = [
  ["Do you publish everything you receive?",
    "No — a person reads every submission, and nothing goes up without a reply to you first. If we can use it, we convert it and credit you; if we cannot, we say so rather than leaving you waiting."],
  ["Does it have to be polished? Or original?",
    "Neither. Rough notes, a scanned worksheet, five bullet points — all fine, because we rewrite everything into the site's voice anyway. AI-assisted drafts are fine too. What we need is the right to adapt it: your own material, or material you are free to share. A photocopy of a paid curriculum is the one thing we will refuse."],
  ["What do I get out of it?",
    "Your lesson, rebuilt on live simulators, at a permanent address you can project, print and share — with your name on it, the way you asked for it to appear. And every other teacher gets it too, which is the point."],
  ["What subjects are you looking for?",
    "Astronomy and Earth science first — the solar system, the moon, the seasons, day and night, tides. That is where the site's tools are strongest and where a converted lesson gains the most. Time and calendar lessons are welcome too."],
  ["I don't have a lesson — just questions my class asked. Is that useful?",
    "Very. The whole catalog is organised around real questions, and we cannot invent the ones a real nine-year-old asks. Send them through the second form; we will try to answer each one inside a lesson, credited to your class if you want."],
  ["Is any of this collected from students?",
    "No. The teacher is the only sender, the teacher's email is the only address we hold, and questions are published as “a 5th-grade class asked…” — never with a name. If a student's name arrives in a paste, we delete it."],
];

const submitPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Submit a Lesson Plan — Build It With Us, Free for Every Classroom</title>
<meta name="description" content="Send the science lesson you already run — astronomy, Earth science, moon phases, seasons — and we rebuild it on free live simulators, credit you on the page, and publish it free for every classroom. Or just send the questions your class asked.">
<link rel="canonical" href="${SITE}${SUBMIT_PATH}">
<meta property="og:title" content="Submit a lesson plan — build it with us">
<meta property="og:description" content="Send the lesson you already run. We rebuild it on live simulators, credit you, and publish it free for every classroom.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: PATH }, { name: "Submit a lesson plan", url: SUBMIT_PATH }])}</script>
${learningLd({ name: "Submit a lesson plan", url: `${SITE}${SUBMIT_PATH}`, description: "How teachers collaborate with Time and Space Science: send a lesson you already run, or the questions your class asked, and we rebuild it on free browser-based simulators, credited and free for every classroom.", type: "guide", audience: "teacher" })}
${faqLd(SUBMIT_FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>Submit a lesson plan</h1>
  <p class="sub"><strong>You have taught it. We can build it.</strong> Send the science lesson you already run, and we turn it into a page on this site — every step wired to a live simulator, your name on it, free for every classroom that comes after yours.</p>

  <div class="card">
    <h2>Why we are asking teachers, of all people</h2>
    <p>This site can compute where the moon will be tonight to a fraction of a degree. What it cannot compute is what happens at 10:15 on a Tuesday when a fourth grader asks why the moon is out in the daytime and the projector will not focus. <strong>You know things about teaching this material that no simulator can derive</strong> — which step runs long, which analogy finally lands, which question a class always asks and which answer never satisfies them.</p>
    <p>So this is the trade. You send the lesson as you actually teach it. We do the part we are good at: rebuild it on <a href="${PATH}astronomy/">the simulators</a>, check the science, wire every step to the exact view so one link puts thirty screens on the same sky, and make it printable. The result carries your name and goes out free — no sign-up, no paywall, no ads — to any teacher who wants it. Your lesson, minus the part where every other teacher has to reinvent it.</p>
    <p><strong>Astronomy and Earth science are what we most want</strong> — the solar system, the moon and its phases, the seasons, day and night, tides. That is where the tools are strongest and where a teacher's lesson gains the most from being rebuilt on them. Time and calendar lessons are welcome too.</p>
${plaque()}
  </div>

${lessonForm}
${questionsForm}

  <div class="card">
    <h2>Or start a lesson from nothing, together</h2>
    <p>If the lesson does not exist yet — you know what you want the class to <em>see</em>, and no tool shows it — that is a different door: <a href="${PATH}#ask">ask us to build a simulator</a>. We take those as challenges, and if we build yours, your class is credited on the page it inspired. <a href="/about/work-with-us/">How that works is written down.</a></p>
  </div>

  <div class="card tool-about">
    <h2>Common questions</h2>
    ${SUBMIT_FAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${FORMS_JS}
</body>
</html>
`;

mkdirSync(join(root, "classroom"), { recursive: true });
writeFileSync(join(root, "classroom/index.html"), html);
mkdirSync(join(root, SUBMIT_PATH.slice(1, -1)), { recursive: true });
writeFileSync(join(root, SUBMIT_PATH.slice(1) + "index.html"), submitPage);
for (const S of SUBJECTS) {
  mkdirSync(join(root, "classroom", S.s), { recursive: true });
  writeFileSync(join(root, "classroom", S.s, "index.html"), subjectPage(S));
}
/** the three subject URLs, for the sitemap */
export const CLASSROOM_SUBJECTS = SUBJECTS.map((S) => S.s);
export { SUBMIT_PATH };


/* ---- /classroom/distance-units/ — the ladder, with the weeds --------------
 * The glossary the light-speed lesson's ladder card links into: every unit
 * from the mile to the gigaparsec, and then the three genuinely strange
 * things about them — where 206,265 comes from, why every length unit on
 * Earth is now officially a unit of time, and the unit whose reciprocal is
 * the age of the universe. Shares LADDER_HTML with the lesson so the two
 * tables cannot disagree. */
const GFAQ = [
  ["What is a parsec, in plain words?",
    "The distance at which the radius of Earth's orbit would appear one arcsecond wide — about 3.26 light-years, or 31 trillion kilometres. It exists because that is literally how star distances are measured: watch a star shift as the Earth orbits, and the smaller the shift, the farther the star."],
  ["How many light-years are in a parsec, kiloparsec and megaparsec?",
    "One parsec is 3.26 light-years; a kiloparsec is 1,000 parsecs (about 3,260 light-years); a megaparsec is a million parsecs (about 3.26 million light-years); a gigaparsec is a billion."],
  ["Why do astronomers use parsecs instead of light-years?",
    "Because the parsec is the unit the measurement itself produces: distance in parsecs is just 1 divided by the parallax in arcseconds — no conversion, no extra step. The light-year is the better teaching unit; the parsec is the better working unit."],
];
const unitsPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Parsec vs Light-Year — Every Astronomical Distance Unit, in Order</title>
<meta name="description" content="The full ladder of distance units from the mile to the gigaparsec: light-seconds, astronomical units, light-years, parsecs — what each one means, where the strange numbers come from, and why every length is now secretly a time.">
<link rel="canonical" href="${SITE}/classroom/distance-units/">
<meta property="og:title" content="Parsec vs Light-Year — Every Astronomical Distance Unit, in Order">
<meta property="og:description" content="The ladder of distances, mile to gigaparsec — with the weeds: where 206,265 comes from, why the metre is defined by light, and the unit that measures the universe's countdown.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: PATH }, { name: "Distance units", url: "/classroom/distance-units/" }])}</script>
${faqLd(GFAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: PATH } })}
  <h1>The Ladder of Distances: Mile to Gigaparsec</h1>
  <p class="sub">Every unit astronomy climbs through, in order — each invented at the moment the one below it became unusable — and then the weeds: three genuinely strange things about these units that most textbooks skip. Companion to <a href="${LPATH}light-speed-grades-7-8/">the light-speed lesson</a>.</p>

  <div class="card">
    <h2>The ladder, in order</h2>
    ${LADDER_HTML}
    <p class="hint">The seam in the ladder: up through the light-year the units are TIME — how long light takes. From the parsec up they are ANGLE — how far things appear to shift. Everything below explains that seam.</p>
  </div>

  <div class="card">
    <h2>The parsec, in the weeds</h2>
    <p>Hold a finger at arm's length and blink one eye, then the other: the finger jumps against the background. Your two eyes are a few centimetres apart, and that little baseline is enough for your brain to compute depth. Now make the baseline bigger — <em>much</em> bigger. The Earth's orbit is a 300-million-kilometre-wide pair of eyes: photograph a nearby star in January and again in July, and it shifts against the far stars. That shift is <strong>parallax</strong>, the angle is tiny, and the tinier it is, the farther the star.</p>
    <p>The unit falls straight out of the geometry. Slice one degree into 60 arcminutes and each of those into 60 arcseconds; an arcsecond is 1/3,600 of a degree — a hair's width seen from 14 metres, or a coin from four kilometres. A star whose parallax is exactly one arcsecond sits at a distance of one <strong>par</strong>allax-<strong>sec</strong>ond: a parsec (the word was coined in 1913). And because a full circle holds 1,296,000 arcseconds, the trigonometry lands on a famous number: one parsec = <strong>206,265</strong> astronomical units — that's 1,296,000 ÷ 2π. The 3.26 light-years everyone quotes is just that number of AU, converted.</p>
    <p>Why professionals swear by it: the distance in parsecs is simply <strong>1 ÷ the parallax in arcseconds</strong>. Measure 0.1″, the star is 10 parsecs out. No constant, no conversion — the unit IS the measurement. (It also settles a famous movie argument: the parsec is strictly a distance, so making the Kessel Run "in less than twelve parsecs" is like running a marathon in less than 26 miles. Star Wars fans have been repairing that line for decades.)</p>
    <p>Three footnotes worth the trip. First: no star is within one parsec of the sun — Proxima Centauri's parallax is 0.77″, putting it at 1.3 parsecs — so every stellar parallax ever measured is <em>less</em> than one arcsecond, which is why nobody managed it until 1838, when Friedrich Bessel finally caught the star 61 Cygni shifting by a third of an arcsecond. Distances to the stars were <em>unknown</em> — not roughly known, unknown — until that measurement. Second: the European Gaia spacecraft now measures parallaxes to a few <em>millionths</em> of an arcsecond — the width of a coin on the moon, seen from Earth — and has done it for nearly two billion stars. Third: when the parallax is too small even for Gaia, astronomy stacks new rungs on this one — special pulsing stars whose true brightness is known — and every one of those rungs is calibrated, ultimately, against parallax. The whole cosmic distance scale stands on the geometry of the Earth's orbit.</p>
  </div>

  <div class="card">
    <h2>Every length is now secretly a time</h2>
    <p>Here is the quiet plot twist of modern measurement. Since 1983, the metre has been <em>defined</em> as the distance light travels in 1/299,792,458 of a second. Not measured — defined. The speed of light can never be "remeasured" again, because it is now the ruler itself. Which means the mile (1,609.344 of those metres) is officially about 5.4 light-microseconds, and the astronomical unit — fixed by international agreement in 2012 at exactly 149,597,870,700 metres — is a stated number of light-seconds. <strong>Every rung of the ladder, from the millimetre up, is a unit of time wearing a costume.</strong></p>
    <p>The computing pioneer Grace Hopper used to hand out 30-centimetre lengths of wire to her students: one light-nanosecond each — the absolute farthest any signal can travel in a billionth of a second, and the reason computers can't just be built bigger and faster forever. A foot, near enough, is a light-nanosecond. Keep one in your head next to the light-year; they are the same idea at opposite ends of the ladder.</p>
  </div>

  <div class="card">
    <h2>The strangest unit in science: kilometres per second, per megaparsec</h2>
    <p>At the top of the ladder lives a unit that looks like a typo. The universe's expansion rate — the Hubble constant — is quoted as roughly 70 <strong>km/s per Mpc</strong>: for every megaparsec farther out a galaxy sits, it recedes about 70 kilometres per second faster. Look at the units: a speed divided by a distance. Speed ÷ distance = 1/time. The Hubble constant is secretly a <em>frequency</em> — and its reciprocal, one-over-70-km/s/Mpc, works out to about 14 billion years: the age of the universe, hiding inside its own speedometer, because a universe expanding at that rate needs about that long to spread out from nothing.</p>
    <p>And it comes with a live controversy your class can watch unfold: measured from the early universe's afterglow the number comes out near 67; measured from nearby exploding stars it comes out near 73, and the error bars no longer overlap. This "Hubble tension" is one of the sharpest open problems in cosmology — either one set of measurements hides a subtle mistake, or the universe contains physics nobody has written down yet. The ladder's top rung is still being argued about, which is the healthiest thing a ladder can be.</p>
  </div>

  <div class="card">
    <h2>Use it in class</h2>
    <p>The ladder belongs to <a href="${LPATH}light-speed-grades-7-8/">the grades 7–8 light-speed lesson</a>, where the class derives the light-second, light-minute and light-year themselves. The parsec section here makes a natural high-school extension: measure a finger's parallax across the room with a protractor, then scale the baseline to the Earth's orbit. Any of these cards works as <a href="${LPATH}#student-taught">a student-taught five-minute lesson</a>.</p>
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
mkdirSync(join(root, "classroom/distance-units"), { recursive: true });
writeFileSync(join(root, "classroom/distance-units/index.html"), unitsPage);

/* the home page's classroom tab reads these to build its compact glimpse —
   the flagship lesson per band, without re-stating any lesson content */
export const LESSON_FLAGSHIPS = BANDS.map((B) => {
  const [topicSlug, label] = FLAGSHIP[B.s];
  return { band: B.n, label, url: `${LPATH}${topicSlug}-${B.s}/` };
});

/* ---- the tool -> lesson index (seo/_data/lesson-index.json) --------------
 * Which lessons run on which tool, DERIVED by scanning each lesson's own
 * copy for the tools it opens — a lesson that stops linking a simulator
 * falls off that simulator's "lessons that run on this" card by itself,
 * and nothing is typed twice. Written as a sidecar because the tool
 * builders (day/night map, orbital, solar, the movement simulator) run
 * AFTER this script in the build and must not import it — importing a
 * builder re-runs it, and this one writes twenty-five pages. lesson-index.mjs
 * is the side-effect-free reader they use. check-pages' dead-link gate
 * covers the staleness case: a sidecar row pointing at a retired lesson
 * fails the build. */
const TOOL_HUBS = new Set([
  "day-night-map", "sun", "moon", "tides", "world-clock",
  "timer", "stopwatch", "alarm-clock", "24-hour-clock-converter",
  "time-difference-calculator", "planets",
  "solar-system-simulator", "sun-moon-earth-movement-simulator",
  "earth-sun-moon-orbit-simulator", "orbital-velocity-simulator",
  "rocket-launch-simulator", "earth-and-moon-simulator",
  "mercury-simulator", "venus-simulator", "mars-and-moons-simulator",
  "jupiter-and-moons-simulator", "saturn-and-moons-simulator",
  "uranus-and-moons-simulator", "neptune-and-moons-simulator",
  "pluto-and-moons-simulator",
]);
const lessonIndex = [];
for (const T of TOPICS) for (const B of BANDS) {
  const L = LESSONS[T.s][B.s];
  if (!L) continue;
  const strings = [];
  (function walk(v) {
    if (typeof v === "string") strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  })(L);
  const tools = new Set();
  for (const s of strings)
    for (const m of s.matchAll(/href="\/([a-z0-9-]+)(?=[/?"#])/g))
      if (TOOL_HUBS.has(m[1])) tools.add(`/${m[1]}/`);
  lessonIndex.push({
    url: `${LPATH}${T.s}-${B.s}/`, title: L.t, mins: L.mins,
    band: B.n, topic: T.s, tools: [...tools].sort(),
  });
}
writeFileSync(join(root, "seo/_data/lesson-index.json"), JSON.stringify(lessonIndex, null, 1) + "\n");
console.log(`classroom: wrote seo/_data/lesson-index.json (${lessonIndex.length} lessons)`);
