#!/usr/bin/env node
/* build-classroom.mjs — /classroom/ and /classroom/submit-a-lesson/.
 *
 * TWO PAGES, ON PURPOSE (owner's call, August 2026). The section used to be
 * twenty-five pages — three subject doors, a filterable catalog and eighteen
 * in-house lesson plans — and the owner's judgement was that in-house plans
 * were not classroom quality, and worse, that they argued against the thing
 * the section actually exists to do: get real teachers to bring the lessons.
 * So the catalog is gone (301s in _redirects; the drafts survive in
 * docs/archive/build-classroom-lessons.mjs.bak as raw material to hand a
 * collaborating teacher) and what remains is the offer, said once, briefly:
 *
 *   we make Earth and space science content; you bring a lesson you are
 *   proud of; we develop it with you — on our tools, or tools we build for
 *   it — then publish it free for every teacher.
 *
 * The hub keeps its #ask anchor: /about/, /about/work-with-us/, terms and
 * privacy all point at /classroom/#ask, and that promise chain is a working
 * rule in CLAUDE.md.
 *
 *   node seo/tools/build-classroom.mjs   (run before build-sitemap + build-inline)
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, learningLd } from "./lib.mjs";
import { ico } from "./icons.mjs";
import {
  CLASSROOM_PATH, SUBMIT_PATH, LESSON_FORM_HASH, QUESTIONS_HASH,
  plaque, submitCta, SAFETY_NOTE, lessonForm, questionsForm, FORMS_JS,
} from "./classroom-forms.mjs";
import { sectionSwitcher } from "./section-nav.mjs";
import { CLASSROOM_PAUSED, CLASSROOM_PAUSE_WHEN } from "./site-flags.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

/* what the site brings to the table — a compact row, not a catalog. Each chip
   is a tool a lesson can be built on; the sections carry the full tours. */
const TOOL_CHIPS = [
  ["/day-night-map/", "Day &amp; night map"],
  ["/sun/", "Sunrise &amp; sunset for any town"],
  ["/moon/", "Moon phases &amp; moonrise"],
  ["/earth-sun-moon-orbit-simulator/", "Earth&rsquo;s orbit &amp; the seasons"],
  ["/solar-system-simulator/", "The solar system, moving"],
  ["/rocket-launch-simulator/", "Launch windows to Mars"],
  ["/tides/", "NOAA tide charts"],
  ["/timer/", "Projector timer"],
  ["/stopwatch/", "Stopwatch with laps"],
];

/* ---- /classroom/ — the offer -------------------------------------------- */
const hub = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Classroom — Help Us Build Lesson Plans Every Teacher Can Use</title>
<meta name="description" content="We create free Earth and space science content, and we're looking for teachers to help create lesson plans. Bring one you're proud of — we'll develop it together and publish it free for every teacher.">
<link rel="canonical" href="${SITE}${CLASSROOM_PATH}">
<meta property="og:title" content="Classroom — Help Us Build Lesson Plans Every Teacher Can Use">
<meta property="og:description" content="Bring a lesson you're proud of. We'll develop it on our tools — or build tools for it — and publish it free for every teacher.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: CLASSROOM_PATH }])}</script>
${learningLd({ name: "Classroom", url: `${SITE}${CLASSROOM_PATH}`, description: "Free Earth and space science content for classrooms, and an open invitation to teachers to co-create lesson plans published free for everyone.", type: "guide", audience: "teacher" })}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: CLASSROOM_PATH } })}
  <h1>Classroom</h1>
${sectionSwitcher(CLASSROOM_PATH)}
  <p class="sub"><strong>We create Earth and space science content. Teachers create the lessons.</strong> Our goal is making better education accessible to every teacher — free, no sign-up, nothing installed.</p>

  <div class="card cr-ask" id="ask">
    <h2>${ico("classroom")} Have a lesson plan you're proud of?</h2>
    <p>We're looking for teachers to help create lesson plans. Bring us the one you already teach — in whatever state it's in — and we'll develop it with you: built on the simulators and live sky pages we already have, or on <strong>tools we build specifically for your lesson</strong>. Every plan is created <strong>for your topic and your grade band</strong> and shared that way, so as more teachers join in, this grows into a library a teacher can actually search. Then we'll publish yours, with your name on it, <strong>free for every teacher</strong>.</p>
${CLASSROOM_PAUSED ? "" : `    <p>${submitCta("Submit a lesson plan", SUBMIT_PATH)}</p>
`}    <p class="hint">How the collaboration and the credit work, field by field, is written down at <a href="/about/work-with-us/">work with us</a>. Nothing about a student is ever published.</p>
  </div>

  <div class="card">
    <h2>Lesson plans we'd like to create — with you</h2>
    <p>We're starting from scratch on purpose: rather than fill this page with plans no teacher has taught, here is what we'd most like to build, and roughly what each would cover. Claim one — tell us your topic and grade band and we'll build it specifically for your class.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>The seasons</span><b>The "closer to the sun in summer" trap, broken by the class's own measurements — day length here vs. Sydney, on the same date.</b></div>
      <div class="wc-frow"><span>Moon phases</span><b>A month of moonrise from the class's own town, why the phase is an angle, and why there isn't an eclipse every month.</b></div>
      <div class="wc-frow"><span>Time zones</span><b>A political stripe on a rotating ball: why noon is a place, why China is one zone, and the seam where the date jumps.</b></div>
      <div class="wc-frow"><span>Tides</span><b>For a coastal school: read this week's real NOAA chart, predict spring and neap from tonight's phase, then check.</b></div>
      <div class="wc-frow"><span>Launch windows</span><b>High school: why a Mars rocket waits 26 months, derived from two orbital periods and checked against the real solved windows.</b></div>
      <div class="wc-frow"><span>The leap year</span><b>The stray quarter-day: count solstice to solstice, find the drift, and invent the fix Caesar's astronomers found.</b></div>
    </div>
    <p class="hint">Teach something these don't cover? Even better — <a href="${SUBMIT_PATH}">send what you have</a>.</p>
  </div>

  <div class="card">
    <h2>Two examples of what we'd build together</h2>
    <p><strong>Written by a non-teacher, and labelled that way on the page</strong> — they show the shape (timed steps, every step opening the exact live view, a teacher's key, a printable student sheet), and we think a real teacher's help would make them much better. That is the collaboration we're asking for.</p>
    <p class="timer-presets">
      <a class="chip" href="/classroom/lessons/seasons-grades-7-8/">Seasons · grades 7&ndash;8</a>
      <a class="chip" href="/classroom/lessons/solar-system-grades-3-4/">The solar system · grades 3&ndash;4</a>
    </p>
    <p class="hint">Sixteen more drafts sit in an archive at their old addresses — unpolished on purpose, each one an invitation. If a link brought you to one, <a href="${SUBMIT_PATH}">adopt it</a> and we'll rebuild it with you.</p>
  </div>

  <div class="card">
    <h2>What we bring to your lesson</h2>
    <p>Everything on this site is computed, never typed in — sunrise for your own town, tonight's moon, the planets where they actually are today — and it all runs full screen on a projector. <strong>Projector mode</strong>, in the menu on every page, raises the contrast for the back row.</p>
    <p class="timer-presets">
${TOOL_CHIPS.map(([u, l]) => `      <a class="chip" href="${u}">${l}</a>`).join("\n")}
    </p>
    <p class="hint">Start anywhere: <a href="/earth/">Earth</a> · <a href="/space/">Space</a> · <a href="/time/">Time</a> · <a href="/questions/">the questions students actually ask</a>.</p>
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;

/* ---- /classroom/submit-a-lesson/ — the form, first ----------------------- */
const submit = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Submit a Lesson Plan — We'll Build It With You</title>
<meta name="description" content="Send the Earth or space science lesson you already teach. We'll develop it with you on our free tools — or build tools for it — credit you, and publish it free for every teacher.">
<link rel="canonical" href="${SITE}${SUBMIT_PATH}">
<meta property="og:title" content="Submit a Lesson Plan — We'll Build It With You">
<meta property="og:description" content="Send the lesson you already teach. We'll develop it together and publish it free for every teacher, with your name on it.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Classroom", url: CLASSROOM_PATH }, { name: "Submit a lesson plan", url: SUBMIT_PATH }])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "classroom", url: CLASSROOM_PATH }, page: { label: "submit-a-lesson", url: SUBMIT_PATH } })}
  <h1>Submit a lesson plan</h1>
  <p class="sub">Send the Earth or space science lesson you already teach. We'll develop it with you — on our tools, or tools we build for it — <strong>specifically for your topic and your grade band</strong>, then publish it <strong>free for every teacher</strong>, credited to you.</p>
${CLASSROOM_PAUSED ? `  <div class="card cr-ask">
    <h2>Submissions are paused while we update the classroom pages</h2>
    <p>The lesson-plan and class-questions forms are offline until the update ships, expected in ${CLASSROOM_PAUSE_WHEN}. Nothing sent in the meantime would reach a person, so rather than take your work and lose it, we have taken the forms down. Please check back then — the offer stands.</p>
  </div>
` : `${plaque()}
${lessonForm}
${questionsForm}
${SAFETY_NOTE}
`}  <p class="hint">The longer story — what we publish, what we never publish, and how the credit line works — is at <a href="/about/work-with-us/">work with us</a>.</p>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${CLASSROOM_PAUSED ? "" : FORMS_JS}
</body>
</html>
`;

mkdirSync(join(root, "classroom"), { recursive: true });
writeFileSync(join(root, "classroom/index.html"), hub);
mkdirSync(join(root, SUBMIT_PATH.slice(1)), { recursive: true });
writeFileSync(join(root, SUBMIT_PATH.slice(1) + "index.html"), submit);
console.log(`classroom: wrote ${CLASSROOM_PATH} and ${SUBMIT_PATH} (2 pages — the catalog is retired, see _redirects)`);
