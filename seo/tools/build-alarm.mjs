#!/usr/bin/env node
/* build-alarm.mjs — the alarm clock at /alarm-clock/ (+ /alarm-clock/about/ disclaimer).
 * The clock markup + controller live in alarm-widget.mjs so the same widget can
 * also be embedded on the home page. Rings only while the page/window is open.
 *   node seo/tools/build-alarm.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GA_SNIPPET, brand, esc, alarmTimes, appLd, faqLd, breadcrumbLD } from "./lib.mjs";
import { PANEL_HTML, DIALOGS_HTML, WIDGET_JS } from "./alarm-widget.mjs";
import { NOTIFY_SW, NOTIFY_JS } from "./notify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

const FAQ = [
  ["Does the alarm ring if I close the tab?", "No. It's a browser alarm, so it only rings while the alarm page or its full-screen or floating window is open. Keep it open for the alarm to sound."],
  ["Can I set repeating alarms?", "Yes — choose a one-time alarm, or repeat daily, weekly on chosen days, or monthly by date or weekday."],
  ["Can I use it as a bedside clock that stays on?", "Tap Full screen for a big bedside clock. On supported browsers and devices it will try to keep the display awake while open, but power-saving settings, browser restrictions, or device permissions may still dim or turn off the screen — keep your phone plugged in for the best results."],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Online Alarm Clock — Set Free Alarms in Your Browser</title>
<meta name="description" content="Set one-time or repeating alarms, choose a sound, add a label, and use a full-screen bedside clock. Test the alarm and keep the page open while it runs.">
<link rel="canonical" href="${SITE}/alarm-clock/">
<meta property="og:title" content="Alarm Clock">
<meta property="og:description" content="Free online alarm clock with a big red LED display, full-screen mode and repeating alarms.">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/assets/img/alarm-clock-preview.png">
<meta property="og:image:width" content="780">
<meta property="og:image:height" content="810">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/assets/img/alarm-clock-preview.png">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: "Online Alarm Clock", url: `${SITE}/alarm-clock/`, description: "Free online alarm clock with a big red LED display, full-screen bedside mode and one-time or repeating alarms." })}
${faqLd(FAQ)}
${GA_SNIPPET}
</head>
<body class="ac-page">
<div class="wrap">
  ${brand({ crumb: { slug: "alarm-clock", url: "/alarm-clock/" } })}
  <h1>Online Alarm Clock</h1>

  ${PANEL_HTML}
  <p class="ac-wake-note" id="ac-wake-note" hidden></p>
  <div class="ac-list" id="ac-list"></div>

  ${(() => {
    /* Only the everyday wake window (4:00–10:00 AM) shows by default; the rest
       sit behind a "Show more times" expander so this isn't a wall of links. */
    const chip = (t) => `<a class="chip" href="/alarm-clock/${t.slug}/">${esc(t.disp)}</a>`;
    const all = alarmTimes();
    const common = all.filter((t) => t.t24 >= "04:00" && t.t24 <= "10:00").map(chip).join("");
    const more = all.filter((t) => !(t.t24 >= "04:00" && t.t24 <= "10:00")).map(chip).join("");
    return `<div class="card"><h2>Set an alarm for…</h2>
    <div class="timer-presets" style="margin-top:6px">${common}<button type="button" class="chip ac-custom-add">Add a custom alarm</button></div>
    <details class="more-times"><summary>Show more times</summary><div class="timer-presets" style="margin-top:10px">${more}</div></details>
  </div>`;
  })()}

  <div class="card tool-about" id="ac-instructions">
    <h2>What you can do</h2>
    <p><strong>Set</strong> as many alarms as you like — pick a time, add a label, and choose a one-time alarm or a repeat (daily, weekly, or monthly). <strong>Edit</strong> changes any alarm and <strong>Stop alarm</strong> silences one that's ringing.</p>
    <p><strong>Full screen</strong> turns this into a bedside clock — a big, easy-to-read display you can leave on the nightstand. On supported devices, the page asks the screen to stay awake while it's open and plugged in — glance over and read the time like a real bedside clock. Your browser or device can still dim the screen, suspend the page or mute audio, so keep the device powered and test an alarm first. The buttons fade away for a clean face and come back the moment you touch the screen or move the phone. On a computer, <strong>Pop out</strong> opens a small floating clock that stays above your other windows (Chrome and Edge).</p>
    <p>Alarms ring only while this page (or its floating window) is open — <a href="/alarm-clock/about/">here's exactly how that works</a>, and see <a href="/browser-limitations/">browser timing limitations</a> for why background tabs and mobile devices can affect that.</p>
    <p>Using it in a classroom? The <a href="/classroom/time/">classroom timer &amp; stopwatch guide</a> covers full screen on a projector, keyboard shortcuts and what to test before a lesson depends on it.</p>
  </div>

  <div class="card tool-about">
    <h2>Alarm clock FAQ</h2>
    ${FAQ.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>

${DIALOGS_HTML}
<script>${NOTIFY_JS}
${WIDGET_JS}</script>
</body>
</html>
`;

mkdirSync(join(root, "alarm-clock"), { recursive: true });
writeFileSync(join(root, "alarm-clock/index.html"), html);
/* notifications-only service worker for the alarm clock (scope /alarm-clock/,
 * covers the about + per-time pages too); shared source, no fetch/caching. */
writeFileSync(join(root, "alarm-clock/sw.js"), NOTIFY_SW);

/* /alarm-clock/about/ — the accurate "only works while open" disclaimer */
const aboutHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How the Alarm Clock Works</title>
<meta name="description" content="How the Time and Space Science alarm works and its one limit: it only rings while the page or its floating window is open. No background, no push notifications.">
<link rel="canonical" href="${SITE}/alarm-clock/about/">
<meta property="og:title" content="How the Alarm Clock Works">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Alarm Clock", url: "/alarm-clock/" }, { name: "How it works", url: "/alarm-clock/about/" }])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "alarm-clock", url: "/alarm-clock/" }, sub: { slug: "about", url: "/alarm-clock/about/" } })}
  <h1>How this alarm clock works</h1>
  <p class="sub">It's a free browser alarm — here's exactly what it can and can't do.</p>
  <div class="card"><h2>⏰ It only rings while it's open</h2><p>The alarm runs entirely in your browser. It checks the time each minute and plays a sound when an alarm time is reached. So it can only ring while the alarm is <strong>open and running</strong> — either the <a href="/alarm-clock/">alarm page</a> in an open tab, or its floating <em>Pop out</em> window. If you close the tab, close the floating window, fully quit the browser, or your device powers off, the alarm <strong>cannot</strong> ring.</p></div>
  <div class="card"><h2>No background, no notifications</h2><p>It does not send push notifications and does not run in the background. There's no server and nothing is scheduled remotely — leave the clock (or its floating window) open for it to sound.</p></div>
  <div class="card"><h2>Keeping the screen on (mobile) — bedside mode</h2><p>To use it as a bedside clock, leave the alarm page open and <strong>keep your phone plugged in</strong>: while it's charging the clock holds a screen wake lock so the display won't auto-sleep, and it releases that lock the moment you unplug so it never drains an unplugged battery. Full screen also keeps the screen on. This needs a browser that supports the wake lock and battery APIs (Chrome/Edge on Android); on iPhone, use <strong>Full screen</strong> for the same always-on bedside view. Keeping the screen on doesn't unlock or bypass your phone's passcode — if you <em>manually</em> lock the screen the view stops until you reopen it.</p></div>
  <div class="card"><h2>Where your alarms live</h2><p>Alarms are saved in this browser on this device only (local storage). They aren't synced or sent anywhere, and clearing your browser's site data removes them. Alarm links can't be shared — each alarm's time and label are only ever visible to you.</p></div>
  <div class="card"><h2>"Pop out" floating window</h2><p>On Chrome and Edge, <em>Pop out</em> opens an always-on-top floating window (Picture-in-Picture) that stays visible over other tabs and apps — it must stay open to ring. Firefox and Safari don't support this yet.</p></div>
  <p class="hint">For the fuller picture — tab throttling, mobile OS behavior, battery optimization — see <a href="/browser-limitations/">browser timing limitations</a>, or <a href="/methodology/browser-timing/">the measured timing results</a>. Using bedside mode overnight? See <a href="/alarm-clock/warnings/">screen warnings</a> first.</p>
  <div class="cta"><a class="btn" href="/alarm-clock/">← Back to the alarm clock</a></div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
mkdirSync(join(root, "alarm-clock/about"), { recursive: true });
writeFileSync(join(root, "alarm-clock/about/index.html"), aboutHtml);

/* /alarm-clock/warnings/ — screen burn-in / overnight-use safety notice.
 * Linked (small text, "Warnings") from the full-screen bedside clock itself,
 * alongside a "Browser Limitations" link — kept short there by design; the
 * full explanation, manufacturer-guidance pointer and liability language
 * live here instead. */
const warningsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Screen Warnings — Burn-In &amp; Overnight Device Use</title>
<meta name="description" content="Using the alarm clock in full-screen bedside mode overnight? Read about screen burn-in risk, device heat, and why you should follow your manufacturer's guidance on overnight and charging use.">
<link rel="canonical" href="${SITE}/alarm-clock/warnings/">
<meta property="og:title" content="Screen Warnings — Burn-In &amp; Overnight Device Use">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Alarm Clock", url: "/alarm-clock/" }, { name: "Warnings", url: "/alarm-clock/warnings/" }])}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "alarm-clock", url: "/alarm-clock/" }, sub: { slug: "warnings", url: "/alarm-clock/warnings/" } })}
  <h1>Screen warnings</h1>
  <p class="sub">Bedside mode is meant to be left open on a bright screen for hours at a time, often overnight and while charging. Read this first.</p>
  <div class="card"><h2>Screen burn-in / image retention</h2><p>Displaying the same bright image in the same place for long, repeated stretches — exactly what a full-screen bedside clock does — is a known risk factor for burn-in (permanent image retention) on OLED and AMOLED screens, common on most modern phones. This page's full-screen mode nudges the clock's position slightly over time as a mitigation, but that reduces the risk, it does not remove it. LCD screens are far less susceptible but are not risk-free either. If your device's screen already shows any ghosting or discoloration, stop using it in any all-night, static-display mode, including this one.</p></div>
  <div class="card"><h2>Heat and charging overnight</h2><p>Bedside mode is designed to be used with your device <strong>plugged in</strong> so the screen can stay on. A screen running at full brightness while charging generates more heat than normal use. Don't cover the device (pillows, blankets, cases that trap heat), don't use a damaged cable or charger, and stop use if the device feels hot to the touch.</p></div>
  <div class="card"><h2>Follow your device manufacturer's guidance</h2><p>Time and Space Science doesn't know the specific engineering limits, battery chemistry, or screen technology of your exact device. Before leaving any phone, tablet or other device on and charging overnight, check your device manufacturer's own guidance on safe charging, screen burn-in / image retention, screen brightness, and extended or overnight use — that guidance is written for your specific hardware and takes precedence over anything general said here.</p></div>
  <div class="card"><h2>Disclaimer</h2><p>This page is general information only, not a substitute for your device manufacturer's instructions, and not a guarantee that any particular device won't be affected by burn-in, overheating, battery wear, or other harm from extended or overnight display use. Using full-screen or bedside mode — or any other tool on this site — for extended periods is at your own risk. See our <a href="/terms#no-warranty">Terms of Service</a> for the full liability terms.</p></div>
  <p class="hint">See also <a href="/browser-limitations/">browser timing limitations</a> for why the alarm itself can't be guaranteed to fire on time in the background.</p>
  <div class="cta"><a class="btn" href="/alarm-clock/">← Back to the alarm clock</a></div>
  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
</body>
</html>
`;
mkdirSync(join(root, "alarm-clock/warnings"), { recursive: true });
writeFileSync(join(root, "alarm-clock/warnings/index.html"), warningsHtml);

console.log("Generated /alarm-clock/ + /alarm-clock/about/ + /alarm-clock/warnings/ (shared alarm widget).");
