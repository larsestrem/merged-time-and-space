#!/usr/bin/env node
/* build-timers.mjs — the Timer section. Generates ONE timer tool from a single
 * template and emits:
 *   /timer/                      the hub (set any time + presets + how-it-works)
 *   /timer/<duration>/           preset duration pages (5-minutes, 1-hour, …)
 *   /timer/<use-case>/           named timers (egg-timer, study-timer, …)
 * Durations + use-cases come from seo/_data/timers.json. Slugs/labels come from
 * lib.mjs (timerSlug/timerLabel) so they match the sitemap and the inliner.
 * Run before build-sitemap + build-inline.
 *   node seo/tools/build-timers.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, timerSlug, timerLabel, timerPhrase, timerSpoken, appLd, faqLd, breadcrumbLD, segMarkup, SEG_JS, WAKE_JS } from "./lib.mjs";
import { TONE_LIST, TONES_JS } from "./alarm-tones.mjs";
import { NOTIFY_SW, NOTIFY_JS } from "./notify.mjs";

/* speaker/volume glyph for the square "alarm sound" button (SVG, not emoji) */
const SOUND_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
/* The same speaker, sized to sit INSIDE a sentence. The button version is a
 * fixed 20px, which towers over body text; this one is 1em and nudged onto the
 * baseline, so "tap (<icon>) and pick a sound" reads as a sentence rather than
 * as a paragraph with a button dropped into it. It exists because somebody
 * emailed to say they could not work out how to change the sound: the control
 * is an unlabelled speaker button, and the intro told them to "choose an alarm
 * sound" without showing what to look for.
 *
 * A SECOND visitor then read that instruction as a REQUIREMENT and thought the
 * timer would not run until a sound was chosen. Hence the current wording,
 * which leads with "ready to go \u2014 just press Start" and frames the sound as
 * a volume check you are advised to do, not a step you must complete. Both
 * emails were really about the same thing: an unlabelled control described in
 * words that did not say what pressing it does. */
const SOUND_ICON_INLINE = `<svg class="ico-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="speaker icon"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
/* expand/full-screen glyph for the multi-timer board */
const FS_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5"/><path d="M4 4l6 6"/><path d="M20 9V4h-5"/><path d="M20 4l-6 6"/><path d="M4 15v5h5"/><path d="M4 20l6-6"/><path d="M20 15v5h-5"/><path d="M20 20l-6-6"/></svg>`;

/* ---- the longest timer this tool will accept -------------------------------
 * 24 hours. The number is not arbitrary and it is not a storage limit — it is
 * the point past which this tool stops being able to do its job:
 *
 *   - it only runs while the page is open. A browser tab left for a day gets
 *     discarded, the OS reclaims it, the laptop sleeps, the phone locks. The
 *     measured background-throttle figures behind /methodology/browser-timing/
 *     are about MINUTES of drift, not days.
 *   - a countdown longer than a day is a countdown to a DATE, and the site
 *     already has the right tool for that (/countdown/), which is static, needs
 *     no open tab, and survives a reboot.
 *
 * So the ceiling is the honest edge of "a stretch of time you sit through",
 * and the refusal points at the tool that does work. Anything longer, silently
 * accepted, is a promise the page cannot keep. */
const MAX_SEC = 24 * 3600;
const LIMIT_TEXT = "Sorry — the timer is meant for stretches of up to 24 hours. For anything longer, make a countdown to a date instead.";
const LIMIT_HTML = `Sorry — the timer is meant for stretches of up to 24 hours. For anything longer, <a href="/countdown/">make a countdown to a date</a> instead.`;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const data = JSON.parse(readFileSync(join(root, "seo/_data/timers.json"), "utf8"));

/* ---- per-duration unique content. Each preset page gets its own "what it's
 * good for" line, a conversion fact, and links to the neighbouring durations so
 * no two pages read alike (and Google indexes them as distinct, not dupes).
 * Curated uses for the popular round durations; a sensible tier fallback for
 * everything else. Edit USES freely — these are starting points. */
const USES = {
  15: "quick breathing resets, a dental rinse, or rest between sprints",
  30: "a quick plank, a short rest between sets, or a brief breathing exercise",
  45: "a HIIT work interval, a wall sit, or a short rest period",
  60: "a one-minute plank, a quick breathing exercise, or steeping a delicate green tea",
  90: "interval training, a one-and-a-half-minute plank, or a short rest",
  120: "brushing your teeth, holding a plank, or steeping black tea",
  180: "steeping tea, a boxing round, or a short song-length break",
  240: "steeping a pot of tea, a quick stretch, or a short focus burst",
  300: "a quick break, steeping French-press coffee, or a short meditation",
  600: "a short meditation, a quick tidy-up, or a focused break",
  900: "a power nap, a study sprint, or a quick body-weight workout",
  1200: "a power nap, a focused study block, or a HIIT workout",
  1500: "a Pomodoro focus session, deep work, or revision",
  1800: "a workout, a study block, or keeping dinner on schedule",
  2700: "a class-length study or work block, or a longer workout",
  3000: "a long study block, exam practice, or deep work",
  3600: "a deep-work block, a workout, exam practice, or slow cooking",
  5400: "a long study session, a movie-length break, or batch cooking",
  7200: "a long exam, a study marathon, or slow-roasting in the oven",
};
function usesFor(sec) {
  if (USES[sec]) return USES[sec];
  if (sec < 60) return "short rest intervals, breathing exercises, and quick drills";
  if (sec <= 120) return "brushing teeth, planks, tea steeping, and breathing exercises";
  if (sec <= 300) return "tea and coffee steeping, short workouts, and quick breaks";
  if (sec <= 900) return "meditation, short study sprints, breaks, and quick chores";
  if (sec <= 1800) return "focused study or work blocks, workouts, and power naps";
  if (sec <= 3600) return "study sessions, workouts, cooking, and deep-work blocks";
  return "long study or work sessions, exams, cooking, and naps";
}
const commaNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/* seconds figure for the supporting line. The hours/minutes equivalent lives in
 * the .duration-equivalent line under the timer (durationEquivalent below), so
 * this deliberately no longer repeats it. */
function conversionFor(sec) {
  return `That's ${commaNum(sec)} seconds.`;
}
/* Visible "duration-equivalent" line shown right under the timer (roadmap step
 * 2): the same length in its other common formats, in plain language. Only for
 * durations where an alternate form actually helps — whole hours get the minute
 * form ("1 hour equals 60 minutes"), and minute durations of 60+ get the
 * hours-and-minutes form, plus the "N½ hours" form on a clean half hour
 * ("90 minutes equals 1 hour 30 minutes, or 1½ hours"). Everything under an hour
 * already shows its minutes/seconds breakdown in the title, so it returns "". */
function durationEquivalent(sec) {
  const alts = [];
  if (sec % 3600 === 0) {
    alts.push(`${commaNum(sec / 60)} minutes`);
  } else if (sec % 60 === 0 && sec >= 3600) {
    const h = Math.floor(sec / 3600), m = (sec % 3600) / 60;
    alts.push(`${h} hour${h > 1 ? "s" : ""} ${m} minute${m > 1 ? "s" : ""}`);
    if (sec % 1800 === 0) alts.push(`${Math.floor(sec / 3600)}½ hours`);
  } else {
    return "";
  }
  const body = alts.length > 1 ? `${alts[0]}, or ${alts[1]}` : alts[0];
  return `${timerSpoken(sec)} equals ${body}.`;
}

/* ---- per-duration meta descriptions ------------------------------------------
 * The <title> already states the duration + "Timer with Alarm", so the meta
 * description is ADDITIVE: what you can do, the controls, the six alarm sounds,
 * and what happens at zero. The exact duration appears ONCE (e.g. "when the 15
 * minutes are up"), never twice, and we avoid the "Quarter hour" phrasing in
 * favour of the natural "15 minutes". Several templates by duration range so the
 * pages don't all read from one identical sentence with only the number swapped.
 * Alternate formats ("1 hour 30 minutes", "1½ hours") belong on the visible
 * page, not here. ---- */
/* concise use-case phrases for the templates (shorter than the verbose on-page
 * USES); a few variants per range, picked deterministically by duration so
 * same-range pages don't come out byte-identical. */
const MED_USES = [
  "work, study, exercise, cooking, or a break",
  "studying, a workout, chores, or a short break",
  "focus sprints, exercise, cooking, or reading",
];
const LONG_USES = [
  "focused work, class, exercise, or rest",
  "a long study session, a workout, or cooking",
  "deep work, a class, exercise, or a rest break",
];
const metaUses = (sec) => (sec > 2700 ? LONG_USES : MED_USES)[Math.floor(sec / 300) % 3];
/* "is up" only for exactly one unit of value 1 (1 minute / 1 hour); else "are up" */
const durIsAre = (sec) => (sec === 60 || sec === 3600 ? "is" : "are");
/* a few high-value pages get an exact, hand-tuned description */
const META_SPECIAL = {
  900: "Start in one click. Six alarm sounds, previewed as you pick them so you can check your volume, plus pause and reset, and a clear alert when the 15 minutes are up.",
};
/* Templates by range: under 10 min (short), 10–45 min (medium), 46 min+ (long).
 * duration_display = timerSpoken() ("15 minutes", "1 minute", "1 hour",
 * "2 hours"), with grammatically correct is/are. Kept ~150 chars so Google's
 * ~158-char desktop truncation never clips the tail. */
function timerMeta(sec) {
  if (META_SPECIAL[sec]) return META_SPECIAL[sec];
  const d = timerSpoken(sec), v = durIsAre(sec);
  if (sec < 600) return `Start in one click. Six alarm sounds to pick from, each one previewed so you can check your volume, and a clear alert when the ${d} ${v} up.`;
  if (sec <= 2700) return `Use the countdown for ${metaUses(sec)}. Choose from six sounds and get a clear alert when the ${d} ${v} up.`;
  return `Start a longer countdown for ${metaUses(sec)}. Press Start when you are ready, preview an alarm sound to check your volume, pause if needed, and get a clear alert after ${d}.`;
}
/* Durations listed in timers.json "noindex" still generate a working, linked
 * page (functional URL) but carry robots noindex and are kept out of the
 * sitemap — for thin, low-demand fill-in durations (e.g. 1-minute-15-seconds)
 * that we don't want competing for indexation with the round durations. All
 * whole-minute and 5-minute-tier durations stay indexable. */
const NOINDEX = new Set(data.noindex || []);
/* full list of generated entries: {slug, label, seconds, title, desc, h1, sub} */
const durations = data.durations.map((s) => {
  const label = timerLabel(s), phrase = timerPhrase(s), spoken = timerSpoken(s);
  return {
    isDuration: true, noindex: NOINDEX.has(s),
    slug: timerSlug(s), label, seconds: s,
    title: `${label} with Alarm`,
    /* hook + a per-duration use-case (so no two snippets read alike and each
     * page signals a distinct intent) + the top search hesitations answered
     * (free, background-tab, no sign-up). Kept ~150 chars so it doesn't
     * truncate; the fuller use-case list lives on-page. */
    desc: timerMeta(s),
    h1: label,
    /* `phrase`, not `spoken`: the attributive form is "the 5-minute timer",
     * not "the 5 minutes timer" (and "30-second", not "30 seconds").
     * Visible intro — confirms the destination and covers the controls, i.e.
     * information the additive meta description deliberately leaves out. The
     * duration's alternate formats live in the .duration-equivalent line, and
     * the use-cases in the supporting line, so the three read as related but
     * non-duplicative (roadmap step 3). */
    /* SHORT ON PURPOSE. This is the first thing above the timer on a phone,
       and the previous version ran to 264px on a 390px-wide screen — a third
       of the viewport spent on prose before the thing the visitor came for.
       One clause per button, in the order they appear, no explanation of why.
       It still has to teach: two support emails came from people who could not
       tell what an unlabelled button did, so every control is named. The
       pop-out clause carries .desk-only, the same 560px breakpoint that hides
       the button. */
    sub: `The ${phrase} timer is ready \u2014 press <strong>Start</strong>. `
      + `Tap (${SOUND_ICON_INLINE}) to pick a sound and check your volume. `
      + `<strong>Edit</strong> adds or removes time before you start. `
      + `<strong>Add</strong> runs a second timer.`
      + `<span class="desk-only"> <strong>Pop out</strong> floats the timer above your other apps.</span>`,
    /* supporting content: a per-duration use-case set (distinct from the meta's)
     * plus the seconds figure (the hours form is in the equivalent line above). */
    /* On the longer durations, "wake me at 7" is a real alternative to "count
       30 minutes", and the alarm side already offers the reverse link. Below
       half an hour it is not, so the line is not shown. */
    uses: `A ${phrase} timer is handy for ${usesFor(s)}. ${conversionFor(s)}`
      + (s >= 1800 ? ` Waiting for a clock time instead of a length of time? Set an <a href="/alarm-clock/">alarm clock</a>.` : ""),
  };
});
/* sorted seconds -> {prev, next} neighbours, for "nearby timers" cross-links */
const ordered = data.durations.slice().sort((a, b) => a - b);
const neighbours = (s) => {
  const i = ordered.indexOf(s);
  return { prev: i > 0 ? ordered[i - 1] : null, next: i < ordered.length - 1 ? ordered[i + 1] : null };
};
const useCases = data.useCases.map((u) => ({
  slug: u.slug, label: u.label, seconds: u.seconds,
  title: `${u.label} with Alarm`,
  desc: u.desc, h1: u.label, sub: u.intro, egg: !!u.egg, chip: u.chip,
}));
const all = [...durations, ...useCases];

/* chip links to other timer pages */
const useCaseChips = useCases.map((u) => `<a class="chip" href="/timer/${u.slug}/">${esc(u.chip || u.label)}</a>`).join("");

/* The timer tool markup + controller, shared by every page. data-preset (secs)
 * pre-fills and shows the time; 0 = the hub (blank, with H/M/S inputs). */
/* egg doneness options: a labelled section per hardness, each with one or more
 * time buttons (data-seconds, wired up by the shared timer JS). */
function eggOptions() {
  const grp = (name, opts) =>
    `<div class="egg-grp"><h3 class="egg-grp-h">${name}</h3><div class="egg-grp-row">` +
    opts.map(([label, sec]) => `<button type="button" class="chip" data-seconds="${sec}">${label}</button>`).join("") +
    `</div></div>`;
  return `<div class="egg-options">` +
    grp("Poached", [["3 min", 180], ["3½ min", 210], ["4 min", 240]]) +
    grp("Soft", [["5½ min", 330], ["6 min", 360], ["6½ min", 390]]) +
    grp("Medium", [["7 min", 420], ["8 min", 480], ["9 min", 540]]) +
    grp("Hard", [["11 min", 660], ["11½ min", 690], ["12 min", 720]]) +
    `</div>`;
}

/* Preset chips shown under the clock. Each links to its own preset page
 * (/timer/<slug>/) — clicking one navigates there and shows the time, ready
 * for Start; it never auto-starts. Every value here has a generated page. */
const DEFAULT_PRESETS = [60, 120, 180, 240, 300, 600, 900, 1200, 1800, 2700, 3600];

const chipText = (sec) => sec < 60 ? `${sec} sec` : (sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);

/* "Nearby timer lengths" card for a duration page: up to 3 shorter and 3 longer
 * presets around this one, each linking to its own page (roadmap #8 — strengthen
 * timer-to-timer relationships in BOTH directions). This is what carries links
 * to LONGER durations on the 65–120-minute pages, whose below-the-clock preset
 * chips only reach 60 min. A focused set, not a wall of every length. */
function nearbyCard(sec) {
  const i = ordered.indexOf(sec);
  if (i < 0) return "";
  const shorter = ordered.slice(Math.max(0, i - 3), i);
  const longer = ordered.slice(i + 1, i + 4);
  if (!shorter.length && !longer.length) return "";
  const chip = (s) => `<a class="chip" href="/timer/${timerSlug(s)}/">${chipText(s)}</a>`;
  return `<div class="card"><h2>Nearby timer lengths</h2>
    <div class="timer-presets" style="margin-top:6px">${shorter.map(chip).join("")}${longer.map(chip).join("")}<a class="chip" href="/timer/">All timers →</a></div>
    <p class="hint">Shorter and longer presets around the ${timerPhrase(sec)} timer.</p></div>`;
}

function toolHtml(presetSeconds, opts = {}) {
  const egg = opts.variant === "egg";
  const p2 = (n) => String(n).padStart(2, "0");
  const segTime = (sec) => { sec = Math.max(0, sec); return `${p2(Math.floor(sec / 3600))}:${p2(Math.floor((sec % 3600) / 60))}:${p2(sec % 60)}`; };
  /* egg keeps its small text readout inside the egg; the regular timer uses the
   * shared LED screen (black panel, light blue-green) with a "Time Remaining"
   * label, always in HH:MM:SS. */
  const timeEl = egg
    ? `<div class="tool-time" id="t-time" role="timer" aria-live="off" hidden>07:00</div>`
    : (() => {
      /* The 7-segment display is lit <i> elements — visually a read-out, but
       * NOTHING readable in the parsed HTML, so a crawler saw a timer page whose
       * headline number was missing. The same duration also goes in as text:
       * aria-label (which acSegDisplay keeps updated once JS runs) plus a
       * visually-hidden copy, which acSegDisplay's first repaint replaces. */
      const t = segTime(presetSeconds || 300);
      return `<div class="seg-label" id="t-label">Time Remaining</div><div class="tool-time seg-screen" id="t-time" role="timer" aria-live="off" aria-label="${t}"><span class="visually-hidden">${t}</span>${segMarkup(t)}</div>`;
    })();
  /* non-egg timer gets an "Edit" button that opens the custom-time dialog;
   * egg uses its doneness options instead, so it has no Set button. The label is
   * one word so sound / Edit / Add / Start stay on a single row on a phone. */
  const setBtn = egg ? "" : `<button class="btn secondary" id="t-set" type="button" aria-label="Edit timer duration" title="Edit Timer Duration">Edit</button>`;
  /* square alarm-sound button: a <details> dropdown of tones (same set as the
   * alarm clock). Default tone differs on egg pages (rooster). */
  const soundDD = `<details class="t-sound-dd">
        <summary class="btn secondary t-sound-btn" aria-label="Change alarm sound" title="Change alarm sound">${SOUND_ICON}</summary>
        <div class="t-sound-menu" data-default="${egg ? "rooster" : "beep"}">
          <div class="t-sound-menu-h">Alarm sound</div>
          ${TONE_LIST.map(([v, l]) => `<button type="button" class="t-sound-opt" data-sound="${v}">${l}</button>`).join("\n          ")}
        </div>
      </details>`;
  /* "Add" promotes this single timer to the multi-timer board on /timer/,
     carrying it over (running or not) so you can run several at once. Not on the
     egg, which has its own layout. The full intent is in the aria-label. */
  const addTimerBtn = egg ? "" : `<button class="btn secondary" id="t-add" type="button" aria-label="Add another timer" title="Add another timer">Add</button>`;
  /* "Pop out" puts the countdown into a small window the OS floats above
     other apps — the thing a timer is actually for, since you are working in
     something else while it runs. Not on the egg: its controls sit inside an
     overflow-hidden shape with no room, and the egg is a novelty layout. The
     button hides itself where Document Picture-in-Picture is unsupported. */
  const popBtn = egg ? "" : POP_BTN("t");
  /* Full screen — added for phones, which had no way to make the read-out big:
     "Pop out" needs Document Picture-in-Picture (desktop Chrome/Edge only) and
     hides itself under 560px. Shown at every width, NOT only on narrow screens:
     a phone turned landscape is 780px wide, so a width test would have taken
     the button away exactly when the screen became worth filling. */
  const fsBtn = egg ? "" : `<button class="btn secondary sw-fsbtn t-fsbtn" id="t-fs" type="button" aria-label="Full screen" title="Full screen">${FS_ICON}</button>`;
  /* Reading order across the row: pick the sound, edit the length, add it to the
   * board, then Start — the action you actually came for sits last, where the
   * thumb lands. Reset / Stop alarm are hidden until they apply. */
  const controlsInner = `${egg ? "" : soundDD}
      ${setBtn}
      ${addTimerBtn}
      ${fsBtn}
      ${popBtn}
      <button class="btn" id="t-start" type="button">Start</button>
      ${/* RESET STAYS HIDDEN, and that is deliberate — do not "fix" it into a
            greyed button the way the stopwatch's export row was.
            This row holds exactly FIVE controls in every state, because Edit
            and Reset swap: Edit is only useful before you start, Reset only
            after, so hiding each in the other's state keeps the row a constant
            width that fits a phone. Making Reset permanent makes it six, and
            six do not fit — measured at 412px, the card's full inner width is
            338px and six labels need 452px, so no amount of widening the
            display or shrinking the gaps gets there. */""
      }<button class="btn secondary" id="t-reset" type="button" hidden>Reset</button>
      <button class="btn" id="t-stopalarm" type="button" hidden>Stop alarm</button>`;
  /* regular timer: the sound button rides in the control row (sound / Edit /
   * Add / Start on one line). Egg's controls sit inside the
   * overflow-hidden egg shape, so there the dropdown goes in its own row. */
  const controls = `<div class="tool-controls${egg ? "" : " t-controls"}">
      ${controlsInner}
    </div>`;
  /* concise reliability limitation adjacent to the Start control (not only in
   * the prose/FAQ below the fold) — placed per-layout since the egg variant
   * nests `controls` inside the overflow-hidden egg shape. */
  const toolWarn = `<p class="hint tool-warn">The alarm sounds only while this page stays open. Keep the tab visible for anything important. <a href="/browser-limitations/">Why</a></p>`;
  const eggSoundRow = `<div class="t-sound-row">${soundDD}</div>`;
  const presetList = Array.isArray(opts.presets) ? opts.presets : DEFAULT_PRESETS;
  const presets = `<div class="timer-presets" id="t-presets">${presetList.map((sec) => `<a class="chip" href="/timer/${timerSlug(sec)}/">${chipText(sec)}</a>`).join("")}</div>`;
  const msg = `<p class="tool-msg" id="t-msg"></p>`;
  /* subtle opt-in hint: tap to allow notifications (or, on iPhone, add to Home
   * Screen). Text/behaviour set client-side from the permission state. */
  const notifyHint = `<button type="button" class="t-notify-hint" id="t-notify" hidden></button>`;
  /* The footer of the full-screen view. Its text is written client-side from
     the ACTUAL wake-lock result, not from a hopeful assumption: Screen Wake
     Lock is unavailable in Firefox and in iOS Safari before 16.4, and even
     where it exists the request can be refused (low battery, power saving).
     Telling somebody their screen will stay on and then letting it lock mid-bake
     is worse than telling them nothing, so the line only claims the lock once
     the browser has actually granted it. */
  const fsNote = `<p class="t-fs-note" id="t-fs-note" hidden></p>`;
  /* egg: egg (with time + Start) on the left, options on the right. */
  const body = egg
    ? `<div class="egg-layout">
      <div class="egg-wrap"><div class="egg">${timeEl}\n        ${controls}</div></div>
      ${eggOptions()}
    </div>\n    ${msg}\n    ${eggSoundRow}\n    ${toolWarn}\n    ${notifyHint}`
    : `<div class="t-pop-host" id="t-pop-host">${timeEl}\n    ${msg}\n    ${controls}</div>\n    ${toolWarn}\n    ${presets}\n    ${notifyHint}\n    ${fsNote}`;
  /* the custom-time inputs now live in a dialog, opened by "Set timer". They
   * stay in the DOM (egg's doneness buttons still write to them) but no longer
   * sit as a form above the display. */
  const setDialog = `<dialog class="ac-dialog" id="t-set-dlg">
    <form class="ac-form" method="dialog">
      <h2>Set timer</h2>
      <div class="timer-set" id="tm-set">
        <div><input id="t-h" aria-label="hours" type="number" min="0" max="24" placeholder="0" inputmode="numeric"><div class="u">hours</div></div>
        <div><input id="t-m" aria-label="minutes" type="number" min="0" max="59" placeholder="5" inputmode="numeric"><div class="u">min</div></div>
        <div><input id="t-s" aria-label="seconds" type="number" min="0" max="59" placeholder="0" inputmode="numeric"><div class="u">sec</div></div>
      </div>
      <p class="set-err" id="t-set-err" hidden>${LIMIT_HTML}</p>
      <div class="ac-form-btns"><button type="button" class="btn secondary" id="t-set-cancel">Cancel</button><button type="button" class="btn" id="t-set-ok">Set</button></div>
    </form>
  </dialog>`;
  return `
  <div class="tool-card${egg ? " egg-card" : ""}" id="tm" data-preset="${presetSeconds || 0}">
    ${body}
  </div>
  ${setDialog}`;
}

/* The pop-out control, on its own line under the tool. It was originally a
 * sixth button in the sound/Edit/Add/Start row, where it was both cramped and
 * easy to miss — and it was missing from the /timer/ hub altogether, because
 * the hub renders the multi-timer board rather than this card. Its own row,
 * on both. */
const POP_BTN = (id) => `<button class="btn secondary ac-popbtn" id="${id}-pop" type="button" aria-pressed="false" title="Open this timer in a small window that floats above your other apps (Chrome and Edge)">Pop out</button>`;

const TOOL_JS = `
(function(){
  var $=function(s){return document.querySelector(s);};
  var hEl=$("#t-h"), mEl=$("#t-m"), sEl=$("#t-s"), disp=$("#t-time"), msg=$("#t-msg"),
      startBtn=$("#t-start"), resetBtn=$("#t-reset"), stopAlarmBtn=$("#t-stopalarm"), card=$("#tm"),
      setDlg=$("#t-set-dlg"), setBtn=$("#t-set"), soundDD=$(".t-sound-dd"), soundMenu=$(".t-sound-menu");
  var state="idle", remaining=0, target=0, iv=0, ac=null, alarmTimer=0;
  var egg=card.classList.contains("egg-card"), presetsEl=$("#t-presets");
  var label=$("#t-label"), setDisp=egg?null:(window.acSegDisplay?window.acSegDisplay(disp):null);
  function dv(on){ disp.hidden=!on; if(label) label.hidden=!on; }
  function qp(k){var m=new RegExp("[?&]"+k+"=([^&#]+)").exec(location.search);return m?parseInt(decodeURIComponent(m[1]),10):null;}
  function totalFromInputs(){ return (parseInt(hEl.value||0,10)||0)*3600+(parseInt(mEl.value||0,10)||0)*60+(parseInt(sEl.value||0,10)||0); }
  /* 24-hour ceiling. Refused, not silently clamped: quietly turning a 100-hour
     request into 24 hours would leave somebody watching a countdown that ends
     76 hours early with no idea why. */
  var MAX_SEC=${MAX_SEC};
  function overLimit(t){ return t>MAX_SEC; }
  function setMsg(txt){ msg.textContent=txt; msg.classList.remove("tool-msg-warn"); }
  function sayLimit(){ msg.innerHTML=${JSON.stringify(LIMIT_HTML)}; msg.classList.add("tool-msg-warn"); }
  function fmt(sec){ sec=Math.max(0,Math.ceil(sec)); var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60,p=function(n){return n<10?"0"+n:""+n;}; return egg?((h>0?p(h)+":":"")+p(m)+":"+p(s)):(p(h)+":"+p(m)+":"+p(s)); }
  function show(sec){ var str=fmt(sec); if(setDisp) setDisp(str); else disp.textContent=str; document.title=(state==="running"?"⏳ "+str:state==="done"?"⏰ Time's up!":document.title.replace(/^[\\u23f3\\u23f8\\u23f0]\\s*/,"")); }
  /* alarm tones come from the shared window.AC_TONES (same set as the alarm
   * clock, + rooster). The chosen tone is remembered per device. */
  function unlockAc(){ try{ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume(); }catch(e){} }
  /* current alarm tone: chosen from the sound dropdown, remembered per device */
  var sound="beep";
  function curSound(){ return sound; }
  function setSound(k,persist){ sound=k; if(soundMenu){ [].forEach.call(soundMenu.querySelectorAll(".t-sound-opt"),function(b){ b.classList.toggle("on",b.getAttribute("data-sound")===k); }); } if(persist){ try{ localStorage.setItem("ac_timer_sound",k); }catch(e){} } }
  function playTone(){ unlockAc(); if(!ac||!window.AC_TONES) return; var fn=window.AC_TONES[curSound()]||window.AC_TONES.beep; try{ fn(ac); }catch(e){} }
  function startAlarm(){ var slow=curSound()==="rooster"; var gap=slow?3000:800, max=slow?12:30; playTone(); var n=0; alarmTimer=setInterval(function(){ playTone(); if(++n>=max) stopAlarm(); },gap); }
  function stopAlarm(){ clearInterval(alarmTimer); alarmTimer=0; if(window.acNotify) acNotify.clear(); }
  /* system notification when time's up (shared window.acNotify): a Stop button
   * in the phone's notification shade. Permission is asked on Start. */
  function initNotify(){ if(window.acNotify) acNotify.init({ sw:"/timer/sw.js", tag:"ac-timer", title:"\\u23f0 Time's up!", body:"Your timer finished \\u2014 tap Stop." }, function(){ stopAlarm(); reset(); }); }
  function notifyDone(){ if(window.acNotify) acNotify.show(); }
  /* subtle "Notify me" opt-in hint — reflects the current permission state and,
   * on an iPhone (no web notifications in a Safari tab), points to Add to Home
   * Screen instead. */
  var notifyBtn=$("#t-notify");
  function renderNotifyHint(){ if(!notifyBtn) return;
    if(!("Notification" in window)){
      if(/iP(hone|od|ad)/.test(navigator.userAgent||"")){ notifyBtn.hidden=false; notifyBtn.disabled=true; notifyBtn.textContent="\\uD83D\\uDD14 On iPhone, add this page to your Home Screen for time's-up alerts"; }
      else notifyBtn.hidden=true; return; }
    var pm=Notification.permission;
    notifyBtn.hidden=false;
    if(pm==="granted"){ notifyBtn.disabled=true; notifyBtn.textContent="\\uD83D\\uDD14 Alerts on — we'll notify you when time's up"; }
    else if(pm==="denied"){ notifyBtn.disabled=true; notifyBtn.textContent="\\uD83D\\uDD14 Notifications are blocked in your browser settings"; }
    else { notifyBtn.disabled=false; notifyBtn.textContent="\\uD83D\\uDD14 Notify me when time's up"; } }
  if(notifyBtn){ notifyBtn.addEventListener("click",function(){ if(!("Notification" in window)) return; initNotify(); try{ var r=Notification.requestPermission(); if(r&&r.then) r.then(renderNotifyHint); else setTimeout(renderNotifyHint,400); }catch(e){ setTimeout(renderNotifyHint,400); } }); }
  renderNotifyHint();
  /* init selection from storage (or this page's default), then wire the menu:
   * a tap picks the tone, previews it (also unlocks audio), and closes. */
  (function(){ var def=(soundMenu&&soundMenu.getAttribute("data-default"))||"beep", k=def;
    try{ var sv=localStorage.getItem("ac_timer_sound"); if(sv&&/^(beep|chime|mellow|bell|siren|rooster)$/.test(sv)) k=sv; }catch(e){}
    setSound(k,false); })();
  if(soundMenu){ [].forEach.call(soundMenu.querySelectorAll(".t-sound-opt"),function(b){ b.addEventListener("click",function(){ setSound(b.getAttribute("data-sound"),true); playTone(); if(soundDD) soundDD.open=false; }); }); }
  document.addEventListener("click",function(e){ if(soundDD&&soundDD.open&&!soundDD.contains(e.target)) soundDD.open=false; });
  function tick(){ remaining=(target-Date.now())/1000; if(remaining<=0){ remaining=0; show(0); finish(); return; } show(remaining); }
  function finish(){ state="done"; clearInterval(iv); card.classList.add("tool-done"); setMsg("⏰ Time's up!"); startBtn.hidden=true; resetBtn.hidden=false; stopAlarmBtn.hidden=false; show(0); startAlarm(); notifyDone(); }
  function start(){
    if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    initNotify(); setTimeout(renderNotifyHint,600);
    if(state==="paused"){ target=Date.now()+remaining*1000; }
    else { var t=totalFromInputs(); if(t<=0){ setMsg("Set a time first."); return; } if(overLimit(t)){ sayLimit(); return; } remaining=t; target=Date.now()+t*1000; }
    state="running"; setMsg(""); dv(true); if(presetsEl) presetsEl.style.display="none"; if(setBtn) setBtn.hidden=true;
    if(egg){ startBtn.hidden=true; } else { startBtn.textContent="Pause"; } resetBtn.hidden=false; show(remaining); iv=setInterval(tick,200);
  }
  function pause(){ state="paused"; clearInterval(iv); startBtn.textContent="Resume"; document.title="⏸ "+fmt(remaining); }
  function reset(){ state="idle"; clearInterval(iv); stopAlarm(); card.classList.remove("tool-done"); setMsg("");
    var pre=parseInt(card.getAttribute("data-preset"),10)||0;
    dv(true); show(pre>0?pre:totalFromInputs());
    if(presetsEl) presetsEl.style.display=""; if(setBtn) setBtn.hidden=false; startBtn.hidden=false; startBtn.textContent="Start"; resetBtn.hidden=true; stopAlarmBtn.hidden=true;
    document.title=document.title.replace(/^[\\u23f3\\u23f8\\u23f0]\\s*/,""); }
  startBtn.addEventListener("click",function(){ if(state==="running"){ if(!egg) pause(); } else { start(); } });
  resetBtn.addEventListener("click",reset);
  stopAlarmBtn.addEventListener("click",function(){ stopAlarm(); reset(); });
  /* "Add timer": hand this timer off to the multi-timer board on /timer/. Timing
     is wall-clock, so a RUNNING timer keeps counting to the exact same end-time
     on the board — no hiccup or reset. The board reads this seed once on load,
     recreates the timer, and opens the Add dialog for the next one. */
  var addBtn2=$("#t-add");
  if(addBtn2) addBtn2.addEventListener("click",function(){
    var dur=totalFromInputs(); if(dur<=0) dur=parseInt(card.getAttribute("data-preset"),10)||0;
    if(dur<=0){ setMsg("Set a time first."); return; }
    if(overLimit(dur)){ sayLimit(); return; }
    var rem=dur, run=false, tgt=0;
    if(state==="running"){ run=true; tgt=target; rem=(target-Date.now())/1000; }
    else if(state==="paused"){ rem=remaining; }
    try{ localStorage.setItem("ac_timer_handoff", JSON.stringify({ dur:Math.round(dur), remaining:rem, target:tgt, run:run })); }catch(e){}
    location.href="/timer/";
  });
  document.addEventListener("keydown",function(e){ if(e.target.tagName==="INPUT")return;
    if(e.code==="Space"){ e.preventDefault(); if(state==="done"){stopAlarm();reset();} else if(state==="running"){ if(!egg) pause(); } else { start(); } }
    else if(e.key==="r"||e.key==="R"){ reset(); } });
  /* set the time and show it WITHOUT starting (egg doneness options, or the
   * "Set timer" dialog) */
  function setShow(sec){ if(sec<=0)return; clearInterval(iv); stopAlarm(); card.classList.remove("tool-done"); state="idle"; setMsg("");
    hEl.value=Math.floor(sec/3600)||""; mEl.value=Math.floor((sec%3600)/60)||""; sEl.value=sec%60||""; dv(true); show(sec);
    if(presetsEl) presetsEl.style.display=""; if(setBtn) setBtn.hidden=false;
    startBtn.hidden=false; startBtn.textContent="Start"; resetBtn.hidden=true; stopAlarmBtn.hidden=true;
    document.title=document.title.replace(/^[\\u23f3\\u23f8\\u23f0]\\s*/,""); }
  /* "Set timer" dialog: open with the current time pre-filled, apply on Set */
  if(setBtn&&setDlg){
    var setErr=$("#t-set-err");
    setBtn.addEventListener("click",function(){ if(setErr) setErr.hidden=true; if(setDlg.showModal) setDlg.showModal(); else setDlg.setAttribute("open",""); setTimeout(function(){ try{ mEl.focus(); mEl.select&&mEl.select(); }catch(e){} },0); });
    var setOk=$("#t-set-ok"), setCancel=$("#t-set-cancel");
    function closeDlg(){ if(setDlg.close) setDlg.close(); else setDlg.removeAttribute("open"); }
    /* Over the ceiling the dialog STAYS OPEN with the reason under the inputs.
       Closing it and putting the message on the page behind would look like the
       Set had worked. */
    if(setOk) setOk.addEventListener("click",function(){ var t=totalFromInputs(); if(t<=0){ setMsg("Set a time first."); closeDlg(); return; }
      if(overLimit(t)){ if(setErr) setErr.hidden=false; else sayLimit(); return; }
      if(setErr) setErr.hidden=true; setShow(t); closeDlg(); });
    if(setCancel) setCancel.addEventListener("click",closeDlg);
  }
  /* preset chips are now server-rendered links to each preset page, so there's
   * no client-side rendering or auto-start here. */
  /* static buttons that carry a time (e.g. egg doneness options) */
  [].slice.call(document.querySelectorAll("[data-seconds]")).forEach(function(b){
    b.addEventListener("click",function(){ setShow(parseInt(b.getAttribute("data-seconds"),10)||0); });
  });
  /* keep the LED in sync with the inputs while idle (so the hub shows the
   * digital readout like the home page, not just blank input boxes) */
  if(!egg) [hEl,mEl,sEl].forEach(function(el){ el.addEventListener("input",function(){ if(state==="idle"){ dv(true); show(totalFromInputs()); } }); });
  /* preset duration baked into the page, then optional ?h&m&s override */
  var pre=parseInt(card.getAttribute("data-preset"),10)||0;
  if(pre>0){ hEl.value=Math.floor(pre/3600)||""; mEl.value=Math.floor((pre%3600)/60)||""; sEl.value=pre%60||""; dv(true); show(pre); }
  else if(!egg){ if(!totalFromInputs()) mEl.value="5"; dv(true); show(totalFromInputs()); }
  var qh=qp("h"),qm=qp("m"),qs=qp("s");
  if(qh!==null) hEl.value=qh; if(qm!==null) mEl.value=qm; if(qs!==null) sEl.value=qs;
  if(qh!==null||qm!==null||qs!==null){ dv(true); show(totalFromInputs()); if(overLimit(totalFromInputs())) sayLimit(); }
  /* "Pop out": the display and controls MOVE into a floating window, so
     a running countdown keeps running (show() holds the same node) and Start /
     Reset / Stop alarm keep their listeners. */
  if(window.acPopOut) window.acPopOut({ btn:"#t-pop", host:"#t-pop-host", cls:"t-pop" });

  /* ---- full screen -------------------------------------------------------
     The card itself goes full screen, so the display and the whole control row
     travel with it and every listener above still applies — no second copy of
     the timer to keep in sync. Two layers, because they fail in different
     places: the .t-fs class alone gives a full-viewport view that works
     everywhere, and the real Fullscreen API is attempted on top of it to hide
     the browser chrome where it is allowed. iOS Safari on iPhone refuses
     requestFullscreen entirely, which is exactly why the class is not
     conditional on it. */
  /* Marks the browser as one where "Pop out" actually works, which is what the
     stylesheet uses to hide the full-screen button — so the two controls are
     never both present and never both absent. */
  if(window.documentPictureInPicture) document.documentElement.classList.add("pip-ok");
  var fsBtn2=$("#t-fs"), fsNote=$("#t-fs-note"), isFs=false;
  function realFs(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
  function noteText(){ if(!fsNote) return;
    fsNote.innerHTML=(window.acWakeLock&&acWakeLock.held())
      ? "Your screen stays awake while the timer is full screen. Tap the arrows to leave."
      : "Heads up: this browser won't let the page keep your screen awake, so your phone may still lock. Check your screen-timeout setting if you need the timer visible.";
  }
  function applyFs(on){ isFs=on;
    card.classList.toggle("t-fs",on); document.body.classList.toggle("t-fs-open",on);
    if(fsNote) fsNote.hidden=!on;
    if(fsBtn2){ fsBtn2.setAttribute("aria-label",on?"Exit full screen":"Full screen"); fsBtn2.setAttribute("title",on?"Exit full screen":"Full screen"); }
    if(window.acWakeLock){ on?acWakeLock.on():acWakeLock.off(); }
    /* the lock resolves a tick later (and can be refused), so the line is
       written from the result, not from the request */
    noteText(); setTimeout(noteText,400);
  }
  function enterFs(){ applyFs(true); var rq=card.requestFullscreen||card.webkitRequestFullscreen; if(rq){ try{ var p=rq.call(card); if(p&&p["catch"]) p["catch"](function(){}); }catch(e){} } }
  function exitFs(){ applyFs(false); if(realFs()){ try{ (document.exitFullscreen||document.webkitExitFullscreen).call(document); }catch(e){} } }
  if(fsBtn2) fsBtn2.addEventListener("click",function(){ isFs?exitFs():enterFs(); });
  /* leaving full screen with the browser's own gesture (swipe, Esc, the system
     back button) must tear down the class and the wake lock too */
  function onFsChange(){ if(!realFs()&&isFs) applyFs(false); }
  document.addEventListener("fullscreenchange",onFsChange);
  document.addEventListener("webkitfullscreenchange",onFsChange);
  document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&isFs) exitFs(); });
  if(window.acWakeLock) acWakeLock.onchange(noteText);
})();`;

/* ---------- multi-timer board (hub only) ------------------------------------
 * Up to three independent countdowns on one page — each started when you like,
 * each ringing its own alarm. Shares the LED display (acSegDisplay) and the tone
 * engine (window.AC_TONES) with the single timer, plus a full-screen view. */
const MT_MAX = 3;
function multiToolHtml() {
  const soundDD = `<details class="t-sound-dd mt-sound">
      <summary class="btn secondary t-sound-btn" aria-label="Alarm sound" title="Alarm sound">${SOUND_ICON}</summary>
      <div class="t-sound-menu" data-default="beep">
        <div class="t-sound-menu-h">Alarm sound</div>
        ${TONE_LIST.map(([v, l]) => `<button type="button" class="t-sound-opt" data-sound="${v}">${l}</button>`).join("\n        ")}
      </div>
    </details>`;
  const quick = [60, 300, 600, 900].map((s) => `<button type="button" class="chip" data-quick="${s}">${chipText(s)}</button>`).join("");
  const dlg = `<dialog class="ac-dialog" id="mt-dlg">
    <form class="ac-form" method="dialog">
      <h2>Add a timer</h2>
      <div class="timer-set">
        <div><input id="mt-h" aria-label="hours" type="number" min="0" max="24" placeholder="0" inputmode="numeric"><div class="u">hours</div></div>
        <div><input id="mt-m" aria-label="minutes" type="number" min="0" max="59" placeholder="5" inputmode="numeric"><div class="u">min</div></div>
        <div><input id="mt-s" aria-label="seconds" type="number" min="0" max="59" placeholder="0" inputmode="numeric"><div class="u">sec</div></div>
      </div>
      <div class="mt-quick">${quick}</div>
      <input id="mt-name-in" class="mt-name-in" type="text" maxlength="24" placeholder="Label (optional)" aria-label="Timer label">
      <p class="set-err" id="mt-err" hidden>${LIMIT_HTML}</p>
      <div class="ac-form-btns"><button type="button" class="btn secondary" id="mt-cancel">Cancel</button><button type="button" class="btn" id="mt-ok">Add timer</button></div>
    </form>
  </dialog>`;
  return `
  <div class="mt-wrap" id="mt">
    <div class="mt-board" id="mt-board"></div>
    <div class="mt-bar">
      ${/* HIDE: everything but the timers themselves goes away — the rest of this
           bar, the note under it, and every card down the page — leaving the
           board and the one button that brings it all back. It is the
           projector/kitchen-counter view: full screen makes the read-out big on
           the screen you are at, this makes it big on the page you already have,
           and unlike full screen it survives a scroll and a screenshot.
           First in the row, left of Add a timer, and it stays put when the
           others vanish so the way out never moves. */""
      }<button class="btn secondary mt-hide" id="mt-hide" type="button" aria-pressed="false">Hide</button>
      <button class="btn" id="mt-add" type="button">Add a timer</button>
      ${soundDD}
      ${POP_BTN("mt")}
      <button class="btn secondary sw-fsbtn" id="mt-fs" type="button" aria-label="Full screen" title="Full screen">${FS_ICON}</button>
    </div>
    <p class="hint tool-warn">Run up to three timers at once — add one, set its length, and press Start. Each rings on its own, but only while this page stays open. <a href="/browser-limitations/">Why</a></p>
    <p class="t-fs-note" id="mt-fs-note" hidden></p>
  </div>
  ${dlg}`;
}

const MULTI_TOOL_JS = `
(function(){
  var board=document.getElementById("mt-board"), addBtn=document.getElementById("mt-add"),
      fsBtn=document.getElementById("mt-fs"), dlg=document.getElementById("mt-dlg"), wrap=document.getElementById("mt");
  if(!board) return;
  var MAX=${MT_MAX}, timers=[], seq=0, ac=null, soundKey="beep", loop=0;
  var BASE_TITLE=document.title;      /* what the tab is called when nothing is running */
  var soundDD=document.querySelector(".mt-sound"), soundMenu=soundDD&&soundDD.querySelector(".t-sound-menu");
  function unlockAc(){ try{ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume(); }catch(e){} }
  function playTone(k){ unlockAc(); if(!ac||!window.AC_TONES) return; var fn=window.AC_TONES[k]||window.AC_TONES.beep; try{ fn(ac); }catch(e){} }
  function markSound(){ if(!soundMenu) return; [].forEach.call(soundMenu.querySelectorAll(".t-sound-opt"),function(b){ b.classList.toggle("on",b.getAttribute("data-sound")===soundKey); }); }
  (function(){ var def=(soundMenu&&soundMenu.getAttribute("data-default"))||"beep", k=def; try{ var sv=localStorage.getItem("ac_timer_sound"); if(sv&&/^(beep|chime|mellow|bell|siren|rooster)$/.test(sv)) k=sv; }catch(e){} soundKey=k; markSound(); })();
  if(soundMenu){ [].forEach.call(soundMenu.querySelectorAll(".t-sound-opt"),function(b){ b.addEventListener("click",function(){ soundKey=b.getAttribute("data-sound"); try{ localStorage.setItem("ac_timer_sound",soundKey); }catch(e){} markSound(); playTone(soundKey); if(soundDD) soundDD.open=false; }); }); }
  document.addEventListener("click",function(e){ if(soundDD&&soundDD.open&&!soundDD.contains(e.target)) soundDD.open=false; });

  function pad(n){ return n<10?"0"+n:""+n; }
  function fmt(sec){ sec=Math.max(0,Math.ceil(sec)); var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60; return h>0?(h+":"+pad(m)+":"+pad(s)):(pad(m)+":"+pad(s)); }
  function nameFor(sec){ if(sec<=0) return "New timer"; var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60,p=[]; if(h)p.push(h+" hr"); if(m)p.push(m+" min"); if(s)p.push(s+" sec"); return p.join(" ")+" timer"; }

  function showT(t){ var str=fmt(t.remaining); if(t.setDisp) t.setDisp(str); else t.disp.textContent=str; }
  /* ONE BUTTON PER TIMER, AND IT PAUSES — it does not reset.
     It used to say "Stop" and call stopT(), which put the timer back to its full
     length: press it four minutes into a five-minute bake and those four minutes
     were gone, with nothing to get them back. There is already a Reset link in
     the card's header for the case where starting over IS what you want, so the
     button next to the read-out had no business doing the same job destructively.
     Four states now: Start, Pause (while running), Resume (while paused, keeping
     the time that is left), and Stop only on a ringing timer, where stopping the
     alarm and re-arming it genuinely is one action. */
  function render(t){ t.el.setAttribute("data-state",t.state);
    var ph=t.dur<=0; /* a zeroed placeholder left after the last timer is cleared */
    if(ph){ t.toggle.textContent="Set"; t.toggle.classList.remove("secondary"); }
    else if(t.state==="running"){ t.toggle.textContent="Pause"; t.toggle.classList.add("secondary"); }
    else if(t.state==="paused"){ t.toggle.textContent="Resume"; t.toggle.classList.remove("secondary"); }
    else if(t.state==="done"){ t.toggle.textContent="Stop"; t.toggle.classList.remove("secondary"); }
    else { t.toggle.textContent="Start"; t.toggle.classList.remove("secondary"); }
    if(t.reset) t.reset.style.display=ph?"none":"";
    if(t.sep) t.sep.style.display=ph?"none":"";
    showT(t); }
  function startT(t){ unlockAc(); if(t.remaining<=0) t.remaining=t.dur; t.target=Date.now()+t.remaining*1000; t.state="running"; t.el.classList.remove("mt-done"); render(t); ensureLoop(); }
  /* the seconds left are already in t.remaining, kept up to date by the loop —
     pausing is just refusing to be counted by it any more */
  function pauseT(t){ t.remaining=Math.max(0,(t.target-Date.now())/1000); t.state="paused"; render(t); updateTitle(); }
  function stopT(t){ stopAlarmT(t); t.remaining=t.dur; t.state="ready"; t.el.classList.remove("mt-done"); render(t); updateTitle(); }
  function finishT(t){ t.state="done"; t.remaining=0; t.el.classList.add("mt-done"); render(t); ringT(t); updateTitle(); }
  function ringT(t){ stopAlarmT(t); var slow=soundKey==="rooster", gap=slow?3000:800, max=slow?12:30, n=0; playTone(soundKey); t.alarm=setInterval(function(){ playTone(soundKey); if(++n>=max) stopAlarmT(t); },gap); }
  function stopAlarmT(t){ if(t.alarm){ clearInterval(t.alarm); t.alarm=0; } }
  /* removing the last timer leaves a zeroed placeholder so the board is never
     empty (a bare page looks broken); its button becomes "Set". */
  function removeT(t){ stopAlarmT(t);
    if(timers.length<=1){ t.dur=0; t.remaining=0; t.state="ready"; t.el.classList.remove("mt-done"); if(t.nameEl) t.nameEl.textContent="New timer"; render(t); updateTitle(); updateAdd(); return; }
    var i=timers.indexOf(t); if(i>-1) timers.splice(i,1); if(t.el.parentNode) t.el.parentNode.removeChild(t.el); updateAdd(); updateTitle(); }
  /* set (or re-arm) a timer's length — used by the Add dialog, including when it
     fills the zeroed placeholder rather than adding a new card. */
  function setTimer(t,sec,name){ stopAlarmT(t); t.dur=sec; t.remaining=sec; t.state="ready"; t.el.classList.remove("mt-done"); if(t.nameEl) t.nameEl.textContent=name||nameFor(sec); render(t); updateAdd(); }
  function placeholder(){ for(var i=0;i<timers.length;i++) if(timers[i].dur<=0) return timers[i]; return null; }

  function ensureLoop(){ if(loop) return; loop=setInterval(function(){
    var any=false;
    for(var i=0;i<timers.length;i++){ var t=timers[i]; if(t.state==="running"){ t.remaining=(t.target-Date.now())/1000; if(t.remaining<=0){ finishT(t); } else { showT(t); any=true; } } }
    updateTitle();
    if(!any){ clearInterval(loop); loop=0; }
  },200); }
  function updateTitle(){ var run=[],hold=[],done=0; for(var i=0;i<timers.length;i++){ var s=timers[i].state;
      if(s==="running") run.push(timers[i].remaining); else if(s==="paused") hold.push(timers[i].remaining); else if(s==="done") done++; }
    if(done) document.title="\\u23f0 Time's up!";
    else if(run.length) document.title="\\u23f3 "+fmt(Math.min.apply(null,run));
    /* a paused timer still has time on it, and a tab that goes blank the moment
       you pause looks like the timer was thrown away — which it now isn't */
    else if(hold.length) document.title="\\u23f8 "+fmt(Math.min.apply(null,hold));
    /* BASE_TITLE, not a regex over the current one: the title is REPLACED while
       a timer runs, not prefixed, so stripping the emoji off "\u23f3 04:58" left
       the tab called "04:58" for the rest of the visit. */
    else document.title=BASE_TITLE; }
  function updateAdd(){ addBtn.disabled=timers.length>=MAX; addBtn.textContent=timers.length>=MAX?"Max 3 timers":"Add a timer";
    /* how many timers there are decides how big each read-out can be in focus
       mode — three stacked cards cannot each be the size one card can */
    board.setAttribute("data-count",String(timers.length)); }

  function make(sec,name){ if(timers.length>=MAX||sec<=0) return null; var id=++seq;
    var el=document.createElement("div"); el.className="mt-timer"; el.setAttribute("data-state","ready");
    el.innerHTML='<button class="mt-x" type="button" aria-label="Remove timer">\\u00d7</button>'
      +'<div class="mt-head"><span class="mt-name"></span><span class="mt-sep"> \\u2013 </span><button class="mt-reset-link" type="button">Reset</button></div>'
      +'<div class="mt-row"><div class="tool-time seg-screen mt-disp" role="timer" aria-live="off"></div><button class="btn mt-toggle" type="button">Start</button></div>';
    board.appendChild(el);
    var disp=el.querySelector(".mt-disp");
    var t={ id:id, dur:sec, remaining:sec, target:0, state:"ready", el:el, disp:disp,
      setDisp:(window.acSegDisplay?window.acSegDisplay(disp):null),
      nameEl:el.querySelector(".mt-name"), reset:el.querySelector(".mt-reset-link"), sep:el.querySelector(".mt-sep"),
      toggle:el.querySelector(".mt-toggle"), x:el.querySelector(".mt-x"), alarm:0 };
    t.nameEl.textContent=name||nameFor(sec);
    timers.push(t); render(t); updateAdd();
    t.toggle.addEventListener("click",function(){ unlockAc();
      if(t.dur<=0){ openDlg(t); }
      else if(t.state==="running") pauseT(t);      /* keep what is left */
      else if(t.state==="done") stopT(t);          /* silence it and re-arm */
      else startT(t); });                          /* ready or paused */
    t.reset.addEventListener("click",function(){ stopT(t); });
    t.x.addEventListener("click",function(){ removeT(t); });
    return t; }

  var hEl=document.getElementById("mt-h"), mEl=document.getElementById("mt-m"), sEl=document.getElementById("mt-s"), nameIn=document.getElementById("mt-name-in"), dlgTarget=null;
  function dlgSec(){ return (parseInt(hEl.value||0,10)||0)*3600+(parseInt(mEl.value||0,10)||0)*60+(parseInt(sEl.value||0,10)||0); }
  /* target = an existing timer to (re)set, e.g. the zeroed placeholder; null adds a new card */
  function openDlg(target,skipFocus){ if(!dlg) return; dlgTarget=target||null; var e0=document.getElementById("mt-err"); if(e0) e0.hidden=true; hEl.value=""; mEl.value="5"; sEl.value=""; if(nameIn) nameIn.value=""; if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open",""); if(!skipFocus) setTimeout(function(){ try{ mEl.focus(); mEl.select&&mEl.select(); }catch(e){} },0); }
  function closeDlg(){ if(dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  addBtn.addEventListener("click",function(){ unlockAc(); if(timers.length>=MAX) return; openDlg(placeholder()); });
  /* HIDE / SHOW. One class on <body>; the stylesheet does the rest, so there is
     no list of elements here to fall out of step with the page. The button keeps
     its place in the bar and goes quiet — dimmed, low-contrast, still a real
     button — because in this view it is the only chrome left and it should not
     compete with the thing it is there to show. */
  var hideBtn=document.getElementById("mt-hide");
  if(hideBtn) hideBtn.addEventListener("click",function(){
    var on=!document.body.classList.contains("mt-focus");
    document.body.classList.toggle("mt-focus",on);
    hideBtn.textContent=on?"Show":"Hide";
    hideBtn.classList.toggle("mt-hide-on",on);
    hideBtn.setAttribute("aria-pressed",on?"true":"false");
  });
  /* hk 1.8: the board stacks its timers, so every size preset needs the extra
     height that three cards in a column take. */
  if(window.acPopOut) window.acPopOut({ btn:"#mt-pop", host:"#mt-board", cls:"mt-pop", hk:1.8 });
  var okBtn=document.getElementById("mt-ok"), cancelBtn=document.getElementById("mt-cancel");
  /* same 24-hour ceiling as the preset pages, refused in the dialog so the
     reason sits next to the field that caused it */
  var MAX_SEC=${MAX_SEC}, mtErr=document.getElementById("mt-err");
  if(okBtn) okBtn.addEventListener("click",function(){ var sec=dlgSec(); if(sec<=0) return;
    if(sec>MAX_SEC){ if(mtErr) mtErr.hidden=false; return; }
    if(mtErr) mtErr.hidden=true;
    var nm=nameIn&&nameIn.value.trim(); if(dlgTarget){ setTimer(dlgTarget,sec,nm||nameFor(sec)); } else { make(sec,nm||nameFor(sec)); } dlgTarget=null; closeDlg(); });
  if(cancelBtn) cancelBtn.addEventListener("click",closeDlg);
  [].slice.call(document.querySelectorAll("#mt-dlg [data-quick]")).forEach(function(b){ b.addEventListener("click",function(){ var s=parseInt(b.getAttribute("data-quick"),10)||0,h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; hEl.value=h||""; mEl.value=m||""; sEl.value=sc||""; }); });

  var isFs=false;
  function realFs(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
  var fsNote=document.getElementById("mt-fs-note");
  function noteText(){ if(!fsNote) return;
    fsNote.innerHTML=(window.acWakeLock&&acWakeLock.held())
      ? "Your screen stays awake while the board is full screen. Tap the arrows to leave."
      : "Heads up: this browser won't let the page keep your screen awake, so your device may still lock. Check your screen-timeout setting if you need the timers visible."; }
  function applyFs(on){ isFs=on; if(wrap) wrap.classList.toggle("mt-fs",on); document.body.classList.toggle("mt-fs-open",on); if(fsBtn) fsBtn.setAttribute("aria-label",on?"Exit full screen":"Full screen");
    if(fsNote) fsNote.hidden=!on;
    if(window.acWakeLock){ on?acWakeLock.on():acWakeLock.off(); }
    noteText(); setTimeout(noteText,400); }
  if(window.acWakeLock) acWakeLock.onchange(noteText);
  function enterFs(){ applyFs(true); if(wrap){ var rq=wrap.requestFullscreen||wrap.webkitRequestFullscreen; if(rq){ try{ var p=rq.call(wrap); if(p&&p["catch"]) p["catch"](function(){}); }catch(e){} } } }
  function exitFs(){ applyFs(false); if(realFs()){ try{ (document.exitFullscreen||document.webkitExitFullscreen).call(document); }catch(e){} } }
  if(fsBtn) fsBtn.addEventListener("click",function(){ isFs?exitFs():enterFs(); });
  function onFsChange(){ if(!realFs()&&isFs) applyFs(false); }
  document.addEventListener("fullscreenchange",onFsChange); document.addEventListener("webkitfullscreenchange",onFsChange);
  document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&isFs) exitFs(); });

  /* if a preset page handed a timer off (via the "Add timer" button), recreate
     it here — resuming a running one to its exact end-time — then open the Add
     dialog for the next timer. Otherwise start with one blank 5-minute timer. */
  var seed=null; try{ var sv=localStorage.getItem("ac_timer_handoff"); if(sv){ seed=JSON.parse(sv); localStorage.removeItem("ac_timer_handoff"); } }catch(e){}
  if(seed&&seed.dur>0){
    var t0=make(seed.dur,nameFor(seed.dur));
    if(t0){
      if(seed.run&&seed.target&&seed.target>Date.now()){ t0.remaining=(seed.target-Date.now())/1000; t0.target=seed.target; t0.state="running"; t0.el.classList.remove("mt-done"); render(t0); ensureLoop(); }
      else if(seed.remaining>0&&seed.remaining<seed.dur){ t0.remaining=seed.remaining; render(t0); }
    }
    openDlg(null,true);
  } else {
    make(300,nameFor(300));
  }
})();`;

/* The square (1:1) card rendered by make-timer-images.mjs is also the page's own
 * illustration: an analog dial with the duration marked, the digital read-out
 * and the Start button, on the site's own background. It replaces the older
 * white-on-white dial photos, and unlike those it exists for EVERY duration and
 * use-case page — so no page is left without one. Same file the JSON-LD `image`
 * and the square og:image point at, so the picture in search results and the
 * picture on the page are the same thing. */
function illusImg(t) {
  const mins = t.seconds % 60 === 0 && t.seconds >= 60 && t.seconds <= 3600 ? t.seconds / 60 : 0;
  const alt = mins
    ? `The Time and Space Science ${timerPhrase(t.seconds)} timer: an analog dial with ${mins} minute${mins === 1 ? "" : "s"} shaded orange, the digital read-out and a Start button`
    : `The Time and Space Science ${timerPhrase(t.seconds)} timer: the digital read-out showing ${timerSpoken(t.seconds)} and a Start button`;
  /* The 1200px file is the social/search card; on the page it fills a 160px box,
     so a 480px sibling covers even a 3x screen. sizes tells the browser the slot
     up front, so it never fetches the 1200px version for a 160px picture. */
  return `<img class="timer-illus" src="/assets/img/timer/${t.slug}-480.webp"`
    + ` srcset="/assets/img/timer/${t.slug}-480.webp 480w, /assets/img/timer/${t.slug}-1x1.webp 1200w"`
    + ` sizes="160px" alt="${esc(alt)}" width="1200" height="1200" loading="lazy" decoding="async">\n    `;
}

const ABOUT_SLOT = "<!--ABOUT-->";
function pageHtml({ title, desc, canonicalPath, h1, sub, presetSeconds, browse, tool, more, about, aboutTitle, seg, ld = "", faqHtml = "", ogImage = "", ogSquare = "", noindex = false, equiv = "", usesBelow = "", multi = false, aboutSlot = false, illus = "" }) {
  /* "How it works" normally sits right under the tool. A page can instead put
     ABOUT_SLOT in its `browse` markup and set aboutSlot, to place the card
     itself — the hub does that so it follows "Timers for a purpose" rather
     than sitting between the tool and the lists people came to browse. */
  const aboutCard = `  <div class="card tool-about">
    <h2>${aboutTitle || "How it works"}</h2>
    ${illus}${about || `<p>Type hours, minutes and seconds — or tap a preset — and press <strong>Start</strong>. The timer keeps counting while you use another tab, and the tab title shows the time remaining. When it reaches zero it sounds an alarm, as long as the page is still open and your browser allows audio. Browser power-saving and background-tab restrictions may delay updates or prevent the alarm, so keep the page visible for anything important — see <a href="/browser-limitations/">browser timing limitations</a> for why. <strong>Pause</strong> and resume anytime, or <strong>Reset</strong> to start over. <kbd>Space</kbd> starts/pauses. On a computer, <strong>Pop out</strong> puts the countdown into a small window that floats above your other apps, so you can watch it while you work in something else (Chrome and Edge).</p>
    <p>Counting down to a date or event instead? Make a <a href="/countdown/">countdown</a>. Need to time how long something takes? Use the <a href="/stopwatch/">online stopwatch with lap times</a>.</p>
    <p>Teaching? Full screen fills a projector, <strong>Projector mode</strong> in the menu raises the contrast for the back row, and <kbd>Space</kbd> starts and pauses without hunting for a button. If you have built a lesson around a timed activity, <a href="/classroom/">we develop lesson plans with teachers</a> and publish them free.</p>`}
  </div>`;

  /* Social/preview images. The wide 1200×630 dial card (ogImage) is the primary
   * og:image — the 1.91:1 ratio social platforms want. The square rendered card
   * (ogSquare), when present, is added as a second og:image so
   * search engines are free to pick it for the SERP/image thumbnail. */
  const ogParts = [];
  if (ogImage) ogParts.push(`<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`);
  if (ogSquare) ogParts.push(`<meta property="og:image" content="${ogSquare}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">`);
  const ogBlock = ogParts.length ? `
${ogParts.join("\n")}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage || ogSquare}">` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${noindex ? `
<meta name="robots" content="noindex, follow">` : ""}
<link rel="canonical" href="${SITE}${canonicalPath}">
<meta property="og:title" content="${esc(h1)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">${ogBlock}
<link rel="stylesheet" href="/assets/css/style.css">
${ld}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "timer", url: "/timer/" }, sub: seg ? { slug: seg, url: canonicalPath } : null })}
  <h1>${esc(h1)}</h1>
  ${more || `<p class="sub">${sub}</p>`}
${multi ? multiToolHtml() : toolHtml(presetSeconds, tool)}
${usesBelow ? `  <p class="tool-uses">${usesBelow}</p>` : ""}
${equiv ? `  <p class="duration-equivalent">${equiv}</p>` : ""}
${aboutSlot ? "" : aboutCard}
${faqHtml}
  ${aboutSlot ? browse.replace(ABOUT_SLOT, aboutCard) : browse}
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>${SEG_JS}
${WAKE_JS}
${TONES_JS}
${multi ? MULTI_TOOL_JS : NOTIFY_JS + "\n" + TOOL_JS}</script>
</body>
</html>
`;
}

function write(path, html) {
  const dir = join(root, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

/* Notifications-only service worker for the timer (scope /timer/), from the
 * shared notify.mjs — no fetch handler, so nothing caches or goes stale. */
mkdirSync(join(root, "timer"), { recursive: true });
writeFileSync(join(root, "timer", "sw.js"), NOTIFY_SW);

/* ---- hub ---- */
const hubPresetLinks = DEFAULT_PRESETS.map((sec) => `<a class="chip" href="/timer/${timerSlug(sec)}/">${chipText(sec)}</a>`).join("");
write("timer", pageHtml({
  /* TITLE DELIBERATELY UNCHANGED. The timer cluster is the best-converting one
     on the site, this title already leads with the exact query ("Online Timer")
     and states the differentiator, and the recommended rewrite ("Online Timer —
     Run Multiple Timers with Alarms") says the same thing with slightly
     different words. There is no gain worth resetting a working title for.
     The DESCRIPTION is another matter: it said "from your phone", narrowing a
     tool that works anywhere for no reason, and left out the two things people
     actually notice — a separate alarm sound per timer and the countdown in the
     browser tab. Descriptions don't affect ranking, so this is upside with no
     ranking risk. Note what is NOT claimed: keyboard controls. The duration
     pages have them; this hub does not, and a description has to be true of
     the page it is on. */
  title: "Online Timer That Can Run Multiple Timers at Once",
  desc: "Run up to three online timers at once, each with its own alarm sound. Pick a preset or set hours, minutes and seconds — the countdown shows in the browser tab.",
  canonicalPath: "/timer/",
  h1: "Online Timer",
  /* Same shape as the preset pages' intro, and short for the same reason: one
     clause per control, in the order they appear on screen, no explanation of
     why. It replaces a sentence that described the FEATURE ("run up to three at
     once") and named only one button, leaving the sound, the full-screen and
     the pop-out controls — all unlabelled icons — for the visitor to guess at.
     That guessing is what produced two support emails on the preset pages.
     The pop-out clause carries .desk-only, the same 560px breakpoint that hides
     the button itself. */
  sub: `<strong>Add a timer</strong>, set its length, then press <strong>Start</strong> — up to three at once, each ringing on its own. `
    + `Tap (${SOUND_ICON_INLINE}) to pick a sound and check your volume. `
    + `The arrows go full screen, and <strong>Hide</strong> clears the page down to the timers.`
    + `<span class="desk-only"> <strong>Pop out</strong> floats the timers above your other apps.</span>`,
  presetSeconds: 0,
  multi: true,
  aboutSlot: true,   /* "How it works" sits after "Timers for a purpose" (see browse) */
  /* The hub runs the MULTI-timer board, not the single-timer tool, and the
     shared default text describes the single one: it promised "Pause and
     resume anytime" and that Space starts and pauses. Neither exists here —
     Stop resets a timer to its full length and there is no keyboard handler
     beyond Escape — so a teacher following the instructions pressed Space and
     either got nothing or activated whatever button had focus. This card
     describes the board that is actually on the page. */
  about: `<p>Press <strong>＋ Add timer</strong> for each timer you want — up to three — then set each one's hours, minutes and seconds and press its own <strong>Start</strong>. They run independently: starting one does not touch the others, and each rings its own alarm when it reaches zero. <strong>Pause</strong> holds a timer where it is and <strong>Resume</strong> picks it up from there; <strong>Reset</strong>, beside the timer's name, puts it back to its full length, and the × removes it. Tap the speaker on a timer to choose its sound and check your volume before you rely on it.</p>
    <p><strong>Hide</strong> clears everything but the timers themselves — this text, the buttons beside it and every panel down the page — and grows the read-out to fill the space it frees. It is the view for a kitchen counter or a desk you glance at, and unlike full screen it survives a scroll. Press <strong>Show</strong> to bring it all back. With one timer running the digits take the whole width, so turning a phone sideways makes them bigger again with nothing to switch.</p>
    <p>The timers keep counting while you use another tab in most modern browsers, and the tab title shows the least time left; the alarm sounds when the page is still active and your browser permits audio. Background-tab power saving can delay updates or prevent the alarm, so keep the page visible for anything that matters — <a href="/browser-limitations/">why that happens</a>, and <a href="/methodology/browser-timing/">what a browser timer actually does, measured</a>.</p>
    <p>The arrows button goes full screen (<kbd>Esc</kbd> leaves it). On a computer, <strong>Pop out</strong> floats the whole board above your other apps (Chrome and Edge). There are no other keyboard shortcuts on this page — the single-length timers, like the <a href="/timer/5-minutes/">5-minute timer</a>, add <kbd>Space</kbd> to start and pause.</p>
    <p>Counting down to a date or event instead? Make a <a href="/countdown/">countdown</a>. Timing how long something takes? Use the <a href="/stopwatch/">online stopwatch with lap times</a>, or <a href="/stopwatch/multiple/">up to six stopwatches at once</a>. Already know the start and end times and just need the gap between them? Try the <a href="/time-difference-calculator/">time difference calculator</a> — it can set a timer for the result.</p>
    <p>Teaching? Full screen fills a projector, <strong>Projector mode</strong> in the menu raises the contrast for the back row, and <kbd>Space</kbd> starts and pauses without hunting for a button. If you have built a lesson around a timed activity, <a href="/classroom/">we develop lesson plans with teachers</a> and publish them free.</p>`,
  browse: `<div class="card"><h2>Popular timer lengths</h2><div class="timer-presets" style="margin-top:6px">${hubPresetLinks}</div></div>

  <div class="card"><h2>Timers for a purpose</h2><div class="timer-presets" style="margin-top:6px">${useCaseChips}</div></div>

<!--ABOUT-->

  <div class="card tool-about"><h2>Timer FAQ</h2>
    <p><strong>Can I run more than one timer at once?</strong> Yes — add up to three timers and start each one whenever you like. They run independently and each sounds its own alarm, so you can have, say, 15-, 10- and 5-minute timers going at the same time.</p>
    <p><strong>Is the online timer free?</strong> Yes — free, with no sign-up and no app to install.</p>
    <p><strong>Does it ring if I switch tabs?</strong> Timers keep counting in most modern browsers, and the tab title shows whichever timer has the least time remaining. When a timer reaches zero it tries to sound its alarm. Browser power-saving and background-tab restrictions can delay updates or prevent it, so keep the tab open for exact timing — see <a href="/browser-limitations/">browser timing limitations</a> for why, and <a href="/methodology/browser-timing/">how accurate is a browser timer?</a> for measured figures.</p>
    <p><strong>Can I set a timer for a specific length?</strong> Add a timer and type any hours, minutes and seconds, or tap a preset like 5 min or 1 hr.</p>
  </div>`,
  ld: appLd({ name: "Online Timer", url: `${SITE}/timer/`, description: "Free online countdown timer with an alarm — run up to three at once, or set any duration." })
    + faqLd([
      ["Can I run more than one timer at once?", "Yes — add up to three timers and start each one whenever you like. They run independently and each sounds its own alarm, so you can have 15-, 10- and 5-minute timers going at the same time."],
      ["Is the online timer free?", "Yes — free, with no sign-up and no app to install."],
      ["Does the timer ring if I switch tabs?", "Timers keep counting in most modern browsers, and the tab title shows whichever timer has the least time remaining. When a timer reaches zero it tries to sound its alarm. Browser power-saving and background-tab restrictions can delay updates or prevent it, so keep the tab open for exact timing."],
      ["Can I set a timer for a specific length?", "Add a timer and type any hours, minutes and seconds, or tap a preset like 5 min or 1 hr."],
    ]),
}));

/* ---- preset duration + use-case pages ---- */
let n = 0;
for (const t of all) {
  /* duration pages lead with a nearby-lengths card (shorter + longer around this
   * one); the "Other timers" card below then points to the purpose timers. */
  const nearbyDur = t.isDuration ? nearbyCard(t.seconds) : "";
  const related = `${nearbyDur}<div class="card"><h2>Other timers</h2><div class="timer-presets" style="margin-top:6px">${useCaseChips}<a class="chip" href="/timer/">All timers →</a></div></div>`;
  const tool = t.egg ? { variant: "egg" } : undefined;
  /* duration pages: prev/next neighbours, linked as prose in the about block */
  const near = t.isDuration ? neighbours(t.seconds) : null;
  const nearProse = near
    ? [near.prev, near.next].filter((v) => v !== null)
        .map((s) => `<a href="/timer/${timerSlug(s)}/">${timerPhrase(s)} timer</a>`).join(" or ")
    : "";
  const more = t.egg ? `<div class="egg-intro">
    <input type="checkbox" id="egg-more-t" class="egg-more-toggle">
    <p class="sub">${t.sub} <label for="egg-more-t" class="egg-more-link">More instructions</label></p>
    <div class="egg-more-body">
      <p>Bring a pan of water to a rolling boil, gently lower the egg in with a spoon, and start the timer for the doneness you want. The moment it rings, lift the egg into a bowl of ice water so it stops cooking.</p>
      <ul>
        <li><strong>Higher up, a little longer</strong> — water boils cooler the higher you are, so eggs cook more slowly. Add about 1 minute for every 1,000 ft (300 m) above sea level.</li>
        <li><strong>Bigger eggs, a little longer</strong> — jumbo or extra-large eggs need roughly 30 seconds more.</li>
      </ul>
    </div>
  </div>`
    /* `uses` used to render here, directly under the intro and ABOVE the timer,
       so the first screen was two paragraphs of prose before the thing the
       visitor came for. It moves below the tool, via usesBelow. */
    : t.isDuration ? `<p class="sub">${t.sub}</p>` : undefined;
  const about = t.egg ? `<p>Pick how you like your egg — <strong>poached</strong>, <strong>soft</strong>, <strong>medium</strong> or <strong>hard</strong> — and the time above the egg updates to match. Roughly: poached and soft leave the yolk runny, medium gives a soft, jammy centre, and hard sets the yolk all the way through.</p>
    <p>Bring a pan of water to a rolling boil, gently lower the egg in with a spoon, then press <strong>Start</strong>. A rooster crows when the egg is done — tap <strong>Stop alarm</strong> to silence it, and cool the egg in ice water so it doesn't overcook.</p>
    <p>The cook times assume roughly sea level — add a little time the higher your elevation (tap <em>More instructions</em> above). Running behind? Tap <strong>Reset</strong> to start over.</p>
    <p>Want a plain countdown timer instead? Use the <a href="/timer/">timer</a>, or time something with the <a href="/stopwatch/">stopwatch</a>.</p>`
    : t.isDuration ? `<p>Once it's running, the countdown continues in most modern browsers if you switch tabs — the tab title shows the time remaining — then sounds your chosen alarm when it reaches zero, provided the page stays active and your browser permits audio (see <a href="/browser-limitations/">browser timing limitations</a>). <kbd>Space</kbd> starts and pauses, and <kbd>R</kbd> resets.</p>
    <p>The arrows button fills the screen with the countdown, for a phone propped on the counter or a timer at the back of a room. While it's full screen the page asks your browser to keep the screen awake; most phones allow this, and the line along the bottom tells you whether yours did. The longest timer you can set is 24 hours — for anything beyond that, count down to a date with a <a href="/countdown/">countdown</a>.</p>
    <p>Need a different length? Try the ${nearProse}, or set any hours, minutes and seconds above. Counting down to a date instead? Make a <a href="/countdown/">countdown</a>; to time how long something takes, use the <a href="/stopwatch/">stopwatch</a>.</p>` : undefined;
  /* per-page structured data: breadcrumb (SERP shows Timer › <label>), a
   * SoftwareApplication card, and an FAQ — the FAQ can earn expandable rich
   * results, the highest-leverage CTR win for these near-identical pages.
   * Questions are tuned to real hesitations; the alarm answer is honest that
   * the sound depends on the device not being muted. */
  const faq = t.isDuration ? [
    [`Is the ${timerPhrase(t.seconds)} timer free?`, `Yes — it's completely free, with no sign-up, no account and nothing to install. Open the page and press Start.`],
    [`Will the alarm go off if I switch tabs?`, `It keeps counting down in most modern browsers if you switch to another tab or app, and the browser tab title shows the time remaining. Browser power-saving restrictions can delay updates or prevent the alarm from sounding, so keep the tab open and make sure your device isn't muted for anything important.`],
    [`Does it work on my phone?`, `Yes, on any phone, tablet or computer with a web browser — nothing to download. Keep the sound turned on so you hear the alarm.`],
    /* Deliberately NOT "what is it good for?" — that answer was the intro's
       own `uses` sentence repeated word for word further down the same page.
       This asks the other thing people actually search for at this length. */
    [`How long is ${timerSpoken(t.seconds)} exactly?`, `${conversionFor(t.seconds)} Start it and the page counts down in real time, so you never have to work it out.`],
  ] : null;
  /* The page's search & social images, one per aspect ratio (16:9, 4:3, 1:1),
   * rendered by make-stopwatch-images' sibling seo/tools/make-timer-images.mjs.
   * Google picks a thumbnail per surface — Discover wants landscape, mobile
   * carousels want square — so all three go in the JSON-LD `image` array rather
   * than betting on one shape. Each is composed at its own size; none is a crop
   * of another. Every duration and use-case page has a set. */
  const imgSet = ["16x9", "4x3", "1x1"].map((r) => `${SITE}/assets/img/timer/${t.slug}-${r}.webp`);
  const squareImg = imgSet[2];
  /* schema + a VISIBLE FAQ card — Google only grants FAQ rich results when
   * the same Q&A is on the page, so we render both */
  const ld = `<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Timer", url: "/timer/" }, { name: t.label, url: `/timer/${t.slug}/` }])}</script>\n`
    /* WebApplication for every timer page, not just the duration presets — the 7
       use-case pages (egg, tea, study, plank, workout, meditation, brush-teeth)
       are the same tool and were the only ones without an app entity. The FAQ
       block stays duration-only, since only those render a visible FAQ card. */
    + appLd({ name: t.label, url: `${SITE}/timer/${t.slug}/`, description: t.desc, image: imgSet })
    + (t.isDuration ? faqLd(faq) : "");
  const faqHtml = faq
    ? `  <div class="card tool-faq">
    <h2>${esc(t.label)} — questions</h2>
    ${faq.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n    ")}
  </div>`
    : "";
  /* whole-minute duration pages (1..60 min) get a timer-dial share card */
  const ogMin = t.isDuration && t.seconds % 60 === 0 && t.seconds >= 60 && t.seconds <= 3600 ? t.seconds / 60 : 0;
  const ogImage = ogMin
    ? `${SITE}/api/og?tpl=timer&amp;min=${ogMin}&amp;label=${encodeURIComponent(timerSpoken(t.seconds))}`
    : imgSet[0];   /* no dial card for this duration — use the rendered 16:9 */
  write(`timer/${t.slug}`, pageHtml({
    title: t.title, desc: t.desc, canonicalPath: `/timer/${t.slug}/`,
    h1: t.h1, sub: t.sub, presetSeconds: t.seconds, browse: related, tool, more, about, ld, faqHtml,
    illus: t.egg ? "" : illusImg(t),   /* the egg page has its own egg artwork */
    aboutTitle: t.egg ? "How to boil an egg" : undefined, seg: t.slug, ogImage, ogSquare: squareImg, noindex: !!t.noindex,
    equiv: t.isDuration ? durationEquivalent(t.seconds) : "",
    usesBelow: t.isDuration ? t.uses : "",
  }));
  n++;
}
console.log(`Generated timer hub + ${n} preset/use-case pages.`);
