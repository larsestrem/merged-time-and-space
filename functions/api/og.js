/* Cloudflare Pages Function — per-event social preview image (Open Graph).
 *
 * Route: /api/og?name=&date=&time=&tz=&theme=&art=&message=
 *   Renders a 1200x630 PNG showing the event name, the occasion artwork, and the
 *   target date, themed to match the countdown page. Returned to social-media
 *   scrapers via the og:image tag that functions/_middleware.js injects on /c.
 *
 * How: workers-og = satori (HTML/CSS -> SVG) + resvg-wasm (SVG -> PNG). The only
 *   runtime dependency; bundled by Cloudflare Pages automatically (no build step,
 *   output dir stays "/"). A small Inter subset is fetched from Google Fonts per
 *   cold render and the resulting PNG is cached at the edge, so each unique
 *   countdown's preview is generated about once.
 *
 * Moderation: this path is in the edge blocklist scope (see cloudflare/waf-rule.md
 *   and seo/tools/build-waf.mjs) so banned text can't be baked into a preview.
 *
 * Note: emoji and scripts outside the fetched font's coverage are dropped from
 *   the rendered text (the countdown page itself still shows them). The occasion
 *   artwork carries the visual theme. To add emoji later, see workers-og's
 *   loadDynamicAsset.
 */
import { ImageResponse, loadGoogleFont } from "workers-og";

const W = 1200, H = 630;

/* Theme palettes for curated event pages. */
const THEMES = {
  generic:    { from: "#0b1026", to: "#1e1b4b", accent: "#fcd34d", text: "#f8fafc", sub: "#a5b4fc" },
  birthday:   { from: "#7c3aed", to: "#db2777", accent: "#fde047", text: "#fff7ed", sub: "#fbcfe8" },
  wedding:    { from: "#4a044e", to: "#831843", accent: "#f9a8d4", text: "#fdf2f8", sub: "#f9a8d4" },
  graduation: { from: "#0f172a", to: "#1e3a8a", accent: "#facc15", text: "#f8fafc", sub: "#93c5fd" },
  christmas:  { from: "#064e3b", to: "#7f1d1d", accent: "#fde047", text: "#fff7ed", sub: "#fecaca" },
  fireworks:    { from: "#020617", to: "#1e1b4b", accent: "#fcd34d", text: "#f8fafc", sub: "#a5b4fc" },
  vacation:   { from: "#075985", to: "#0c4a6e", accent: "#fcd34d", text: "#f0f9ff", sub: "#7dd3fc" },
  school:     { from: "#1d4ed8", to: "#16a34a", accent: "#fde047", text: "#f8fafc", sub: "#bbf7d0" },
  love:       { from: "#9d174d", to: "#f43f5e", accent: "#fecdd3", text: "#fff1f2", sub: "#fecdd3" },
  patriotic:  { from: "#0a1a3f", to: "#7f1d1d", accent: "#f8fafc", text: "#f8fafc", sub: "#fca5a5" },
  bbq:        { from: "#1c1207", to: "#7c2d12", accent: "#f97316", text: "#fff7ed", sub: "#fdba74" },
  party:      { from: "#2e1065", to: "#db2777", accent: "#fde047", text: "#fff7ed", sub: "#f9a8d4" },
  finishline: { from: "#0b0f1a", to: "#374151", accent: "#ef4444", text: "#f8fafc", sub: "#9ca3af" },
  spooky:     { from: "#1a0b2e", to: "#7c2d12", accent: "#f97316", text: "#fef3c7", sub: "#fdba74" },
  fiesta:     { from: "#831843", to: "#ea580c", accent: "#fde047", text: "#fff7ed", sub: "#fdba74" },
  soccer:     { from: "#065f46", to: "#064e3b", accent: "#fde047", text: "#f8fafc", sub: "#6ee7b7" },
  baseball:   { from: "#0f2d5c", to: "#7f1d1d", accent: "#f8fafc", text: "#f8fafc", sub: "#fca5a5" },
  football:   { from: "#14532d", to: "#052e16", accent: "#fde047", text: "#f8fafc", sub: "#86efac" },
  golf:       { from: "#14532d", to: "#166534", accent: "#fde047", text: "#f8fafc", sub: "#86efac" },
  four20:     { from: "#0b3d1a", to: "#1f9d40", accent: "#8bef9f", text: "#f0fff4", sub: "#bbf7d0" }
};
THEMES.newyear = THEMES.fireworks; // legacy alias for old shared ?theme=newyear links

/* Inline occasion artwork for curated event pages. */
const ART = {
  birthday:
  '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="28" y="60" width="64" height="44" rx="6" fill="#fde4ef"/><rect x="28" y="74" width="64" height="9" fill="#f9a8d4"/><rect x="28" y="93" width="64" height="9" fill="#f9a8d4"/><rect x="28" y="60" width="64" height="44" rx="6" fill="none" stroke="#f472b6" stroke-width="1.5" opacity="0.5"/><path d="M26 54 q0 -8 8 -8 h52 q8 0 8 8 v8 q-4 9 -8 0 q-4 9 -8 0 q-4 9 -8 0 q-4 9 -8 0 q-4 9 -8 0 q-4 9 -8 0 q-4 9 -8 0 q-4 9 -8 0 z" fill="#ffffff"/><ellipse cx="44" cy="52" rx="9" ry="3" fill="#ffffff" opacity="0.6"/><circle cx="42" cy="56" r="2.2" fill="#38bdf8"/><circle cx="52" cy="58" r="2.2" fill="#f472b6"/><circle cx="60" cy="59" r="2.2" fill="#1d4ed8"/><circle cx="68" cy="58" r="2.2" fill="#fde047"/><circle cx="78" cy="56" r="2.2" fill="#a78bfa"/><rect x="37.5" y="30" width="5" height="18" rx="1.5" fill="#f472b6"/><path d="M37.5 35l5 -3M37.5 41l5 -3M37.5 47l5 -3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/><rect x="39.4" y="27" width="1.2" height="3" fill="#7c2d12"/><path d="M40 14 C44 21 43.5 27 40 27 C36.5 27 36 21 40 14Z" fill="#fb923c"/><path d="M40 18 C42.2 22 42 25.5 40 25.5 C37.8 25.5 38 22 40 18Z" fill="#fde047"/><rect x="47.5" y="26" width="5" height="22" rx="1.5" fill="#38bdf8"/><path d="M47.5 31l5 -3M47.5 37l5 -3M47.5 43l5 -3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/><rect x="49.4" y="23" width="1.2" height="3" fill="#7c2d12"/><path d="M50 10 C54 17 53.5 23 50 23 C46.5 23 46 17 50 10Z" fill="#fb923c"/><path d="M50 14 C52.2 18 52 21.5 50 21.5 C47.8 21.5 48 18 50 14Z" fill="#fde047"/><rect x="57.5" y="22" width="5" height="26" rx="1.5" fill="#f472b6"/><path d="M57.5 27l5 -3M57.5 33l5 -3M57.5 39l5 -3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/><rect x="59.4" y="19" width="1.2" height="3" fill="#7c2d12"/><path d="M60 6 C64 13 63.5 19 60 19 C56.5 19 56 13 60 6Z" fill="#fb923c"/><path d="M60 10 C62.2 14 62 17.5 60 17.5 C57.8 17.5 58 14 60 10Z" fill="#fde047"/><rect x="67.5" y="26" width="5" height="22" rx="1.5" fill="#38bdf8"/><path d="M67.5 31l5 -3M67.5 37l5 -3M67.5 43l5 -3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/><rect x="69.4" y="23" width="1.2" height="3" fill="#7c2d12"/><path d="M70 10 C74 17 73.5 23 70 23 C66.5 23 66 17 70 10Z" fill="#fb923c"/><path d="M70 14 C72.2 18 72 21.5 70 21.5 C67.8 21.5 68 18 70 14Z" fill="#fde047"/><rect x="77.5" y="30" width="5" height="18" rx="1.5" fill="#f472b6"/><path d="M77.5 35l5 -3M77.5 41l5 -3M77.5 47l5 -3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/><rect x="79.4" y="27" width="1.2" height="3" fill="#7c2d12"/><path d="M80 14 C84 21 83.5 27 80 27 C76.5 27 76 21 80 14Z" fill="#fb923c"/><path d="M80 18 C82.2 22 82 25.5 80 25.5 C77.8 25.5 78 22 80 18Z" fill="#fde047"/><circle cx="30" cy="16" r="1.8" fill="#38bdf8"/><circle cx="90" cy="12" r="1.8" fill="#fb7185"/><circle cx="74" cy="5" r="1.8" fill="#fde047"/><circle cx="46" cy="7" r="1.8" fill="#34d399"/><circle cx="100" cy="26" r="1.8" fill="#f472b6"/><circle cx="20" cy="30" r="1.8" fill="#a78bfa"/></svg>',
  wedding:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="50" cy="30" r="8" fill="#fbbf24"/><circle cx="70" cy="30" r="8" fill="#fbbf24"/>' +
    '<rect x="40" y="80" width="40" height="22" rx="3" fill="#fff"/>' +
    '<rect x="46" y="62" width="28" height="20" rx="3" fill="#fff"/>' +
    '<rect x="52" y="46" width="16" height="18" rx="3" fill="#fff"/>' +
    '<circle cx="60" cy="44" r="4" fill="#f472b6"/>' +
    '<rect x="40" y="80" width="40" height="5" fill="#fbcfe8"/><rect x="46" y="62" width="28" height="5" fill="#fbcfe8"/></svg>',
  graduation:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<polygon points="60,40 100,56 60,72 20,56" fill="#1e293b"/>' +
    '<rect x="50" y="62" width="20" height="16" fill="#1e293b"/>' +
    '<polygon points="60,72 70,78 50,78" fill="#0f172a"/>' +
    '<line x1="100" y1="56" x2="100" y2="78" stroke="#facc15" stroke-width="3"/>' +
    '<circle cx="100" cy="80" r="4" fill="#facc15"/></svg>',
  christmas:
  '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><polygon points="60,8 62.4,15 70,15 64,19.5 66.3,27 60,22.5 53.7,27 56,19.5 50,15 57.6,15" fill="#fde047"/><polygon points="60,20 76,40 44,40" fill="#16a34a"/><polygon points="60,30 82,54 38,54" fill="#15803d"/><polygon points="60,42 88,70 32,70" fill="#16a34a"/><polygon points="60,56 94,88 26,88" fill="#15803d"/><rect x="54" y="88" width="12" height="12" rx="2" fill="#92400e"/><path d="M48 38 q12 7 24 0" stroke="#fde047" stroke-width="2" fill="none" opacity="0.9"/><path d="M42 52 q18 8 36 0" stroke="#fde047" stroke-width="2" fill="none" opacity="0.9"/><path d="M36 68 q24 9 48 0" stroke="#fde047" stroke-width="2" fill="none" opacity="0.9"/><circle cx="54" cy="34" r="2.6" fill="#ef4444"/><circle cx="67" cy="36" r="2.6" fill="#38bdf8"/><circle cx="47" cy="49" r="2.8" fill="#a78bfa"/><circle cx="72" cy="48" r="2.8" fill="#ef4444"/><circle cx="60" cy="50" r="2.4" fill="#fb923c"/><circle cx="40" cy="65" r="3" fill="#38bdf8"/><circle cx="58" cy="64" r="2.6" fill="#ef4444"/><circle cx="78" cy="64" r="3" fill="#fde047"/><circle cx="34" cy="84" r="3" fill="#ef4444"/><circle cx="52" cy="82" r="2.6" fill="#38bdf8"/><circle cx="70" cy="83" r="3" fill="#a78bfa"/><circle cx="86" cy="84" r="2.6" fill="#fb923c"/></svg>',
  fireworks:
  /* New Year's fireworks: a big multicolour burst with a smaller electric-blue
     burst upper-left and a pink-red one upper-right, overlapping for a "show" */
  '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="#ffffff" fill-opacity="0.4"><polygon points="60.3,72 55.7,72 58,46"/><polygon points="59.6,73.6 56.4,70.4 76.4,53.6"/><polygon points="58,74.3 58,69.7 84,72"/><polygon points="56.4,73.6 59.6,70.4 76.4,90.4"/><polygon points="55.7,72 60.3,72 58,98"/><polygon points="56.4,70.4 59.6,73.6 39.6,90.4"/><polygon points="58,69.7 58,74.3 32,72"/><polygon points="59.6,70.4 56.4,73.6 39.6,53.6"/></g><circle cx="58" cy="46" r="2.8" fill="#f472b6"/><circle cx="76.4" cy="53.6" r="2.8" fill="#38bdf8"/><circle cx="84" cy="72" r="2.8" fill="#fde047"/><circle cx="76.4" cy="90.4" r="2.8" fill="#a78bfa"/><circle cx="58" cy="98" r="2.8" fill="#fb923c"/><circle cx="39.6" cy="90.4" r="2.8" fill="#34d399"/><circle cx="32" cy="72" r="2.8" fill="#f43f5e"/><circle cx="39.6" cy="53.6" r="2.8" fill="#fde047"/><g fill="#ffffff" fill-opacity="0.24"><polygon points="36.6,39 33.4,39 35,23"/><polygon points="36.1,40.1 33.9,37.9 46.3,27.7"/><polygon points="35,40.6 35,37.4 51,39"/><polygon points="33.9,40.1 36.1,37.9 46.3,50.3"/><polygon points="33.4,39 36.6,39 35,55"/><polygon points="33.9,37.9 36.1,40.1 23.7,50.3"/><polygon points="35,37.4 35,40.6 19,39"/><polygon points="36.1,37.9 33.9,40.1 23.7,27.7"/></g><circle cx="35" cy="23" r="2.2" fill="#38bdf8" fill-opacity="0.9"/><circle cx="46.3" cy="27.7" r="2.2" fill="#22d3ee" fill-opacity="0.9"/><circle cx="51" cy="39" r="2.2" fill="#60a5fa" fill-opacity="0.9"/><circle cx="46.3" cy="50.3" r="2.2" fill="#7dd3fc" fill-opacity="0.9"/><circle cx="35" cy="55" r="2.2" fill="#38bdf8" fill-opacity="0.9"/><circle cx="23.7" cy="50.3" r="2.2" fill="#22d3ee" fill-opacity="0.9"/><circle cx="19" cy="39" r="2.2" fill="#60a5fa" fill-opacity="0.9"/><circle cx="23.7" cy="27.7" r="2.2" fill="#7dd3fc" fill-opacity="0.9"/><g fill="#ffffff" fill-opacity="0.32"><polygon points="87,35 83,35 85,15"/><polygon points="86.4,36.4 83.6,33.6 99.1,20.9"/><polygon points="85,37 85,33 105,35"/><polygon points="83.6,36.4 86.4,33.6 99.1,49.1"/><polygon points="83,35 87,35 85,55"/><polygon points="83.6,33.6 86.4,36.4 70.9,49.1"/><polygon points="85,33 85,37 65,35"/><polygon points="86.4,33.6 83.6,36.4 70.9,20.9"/></g><circle cx="85" cy="15" r="2.6" fill="#fb7185" fill-opacity="0.95"/><circle cx="99.1" cy="20.9" r="2.6" fill="#f43f5e" fill-opacity="0.95"/><circle cx="105" cy="35" r="2.6" fill="#fb5b8a" fill-opacity="0.95"/><circle cx="99.1" cy="49.1" r="2.6" fill="#f9719b" fill-opacity="0.95"/><circle cx="85" cy="55" r="2.6" fill="#fb7185" fill-opacity="0.95"/><circle cx="70.9" cy="49.1" r="2.6" fill="#f43f5e" fill-opacity="0.95"/><circle cx="65" cy="35" r="2.6" fill="#fb5b8a" fill-opacity="0.95"/><circle cx="70.9" cy="20.9" r="2.6" fill="#f9719b" fill-opacity="0.95"/></svg>',
  vacation:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="86" cy="36" r="12" fill="#fde047"/>' +
    '<rect x="20" y="80" width="80" height="18" fill="#fcd34d"/>' +
    '<path d="M20 80 q20 -10 40 0 t40 0" fill="#38bdf8"/>' +
    '<rect x="58" y="46" width="4" height="34" fill="#92400e"/>' +
    '<path d="M60 46 q-18 -6 -22 6 q18 -2 22 4 q4 -10 22 -4 q-6 -12 -22 -6Z" fill="#16a34a"/></svg>',
  school:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="40" y="48" width="40" height="46" rx="8" fill="#2563eb"/>' +
    '<rect x="48" y="40" width="24" height="12" rx="4" fill="#1d4ed8"/>' +
    '<rect x="50" y="60" width="20" height="22" rx="3" fill="#bfdbfe"/>' +
    '<rect x="56" y="60" width="8" height="22" fill="#93c5fd"/></svg>',
  generic:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="60" cy="62" r="34" fill="none" stroke="#38bdf8" stroke-width="5"/>' +
    '<line x1="60" y1="62" x2="60" y2="42" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>' +
    '<line x1="60" y1="62" x2="76" y2="62" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="48" y="22" width="24" height="8" rx="3" fill="#38bdf8"/></svg>',
  love:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M60 90 C30 66 30 40 48 40 C58 40 60 50 60 54 C60 50 62 40 72 40 C90 40 90 66 60 90Z" fill="#f43f5e"/></svg>',
  trophy:
    '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M42 30h36v24a18 18 0 0 1-36 0z" fill="#fcd34d" stroke="#d97706" stroke-width="2"/>' +
    '<path d="M42 34h-12a10 10 0 0 0 10 16" fill="none" stroke="#fcd34d" stroke-width="4"/>' +
    '<path d="M78 34h12a10 10 0 0 1-10 16" fill="none" stroke="#fcd34d" stroke-width="4"/>' +
    '<rect x="56" y="72" width="8" height="12" fill="#fcd34d"/>' +
    '<path d="M44 90h32l-4 8H48z" fill="#fcd34d" stroke="#d97706" stroke-width="2"/></svg>'
};
ART.newyear = ART.fireworks; // legacy alias for old shared ?art=newyear links

/* ---- timezone-correct target instant (mirrors assets/js/util.js) ---- */
function tzOffset(tz, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const p = {};
  dtf.formatToParts(date).forEach((x) => { p[x.type] = x.value; });
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - date.getTime();
}
function targetDate(dateStr, timeStr, tz) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr || "00:00");
  if (!dm) return null;
  const h = tm ? +tm[1] : 0, mi = tm ? +tm[2] : 0;
  const guess = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], h, mi, 0);
  let off = tzOffset(tz, new Date(guess));
  let utc = guess - off;
  const off2 = tzOffset(tz, new Date(utc));
  if (off2 !== off) utc = guess - off2;
  const d = new Date(utc);
  return isNaN(d.getTime()) ? null : d;
}

/* Drop control chars, emoji/pictographs/symbols (which have no glyph in a text
 * font), and collapse whitespace so the rendered text stays clean. Letters in
 * scripts the font does cover (incl. accented Latin, Cyrillic, Greek) are kept. */
const RE_CONTROL = /[\x00-\x1f\x7f]/g;
const RE_SYMBOLS = /[\u{1F000}-\u{1FAFF}\u{1F100}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{2600}-\u{26FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;
function clean(s, max) {
  let out = (s || "").normalize("NFC")
    .replace(RE_CONTROL, "")
    .replace(RE_SYMBOLS, "")
    .replace(/\s+/g, " ")
    .trim();
  if (out.length > max) out = out.slice(0, max - 1).trim() + "…";
  return out;
}

function nameSize(len) {
  if (len <= 16) return 78;
  if (len <= 28) return 62;
  if (len <= 44) return 50;
  return 40;
}

function svgImg(artId) {
  return "data:image/svg+xml;base64," + btoa(ART[artId] || ART.generic);
}

/* The 420 social card: the SAME cannabis leaf drawn on the /420-countdown/ page
 * (produced by leafSvg() in build-420.mjs), materialised as a static string so
 * this serverless renderer can embed it. resvg rasterises the <img> data URI,
 * so its gradient/<use> are fine. */
const LEAF420 = "<svg class=\"og-leaf\" viewBox=\"-72 -105 144 159\" width=\"300\" height=\"300\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"lgog\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#2e6b2f\"/><stop offset=\".5\" stop-color=\"#4f9440\"/><stop offset=\"1\" stop-color=\"#7ab557\"/></linearGradient><g id=\"llog\"><path d=\"M0,0L0,0L5.9,-8.6L6,-7.7L9.5,-16.3L7.8,-15.4L11.4,-24L8.9,-23.1L12.5,-31.7L9.5,-30.8L12.9,-39.4L9.6,-38.5L12.9,-47.1L9.5,-46.2L12.6,-54.8L9,-53.8L11.8,-62.5L8.4,-61.5L10.7,-70.2L7.4,-69.2L9.2,-77.8L6.2,-76.9L7.4,-85.5L4.7,-84.6L5.2,-93.2L2.8,-92.3L2.2,-100.9L0,-100L-2.2,-100.9L-2.8,-92.3L-5.2,-93.2L-4.7,-84.6L-7.4,-85.5L-6.2,-76.9L-9.2,-77.8L-7.4,-69.2L-10.7,-70.2L-8.4,-61.5L-11.8,-62.5L-9,-53.8L-12.6,-54.8L-9.5,-46.2L-12.9,-47.1L-9.6,-38.5L-12.9,-39.4L-9.5,-30.8L-12.5,-31.7L-8.9,-23.1L-11.4,-24L-7.8,-15.4L-9.5,-16.3L-6,-7.7L-5.9,-8.6L0,0Z\" fill=\"url(#lgog)\"/><path d=\"M0,4L0,-93M0,-6.9L5.9,-8.6M0,-6.9L-5.9,-8.6M0,-13L9.5,-16.3M0,-13L-9.5,-16.3M0,-19.2L11.4,-24M0,-19.2L-11.4,-24M0,-25.4L12.5,-31.7M0,-25.4L-12.5,-31.7M0,-31.5L12.9,-39.4M0,-31.5L-12.9,-39.4M0,-37.7L12.9,-47.1M0,-37.7L-12.9,-47.1M0,-43.8L12.6,-54.8M0,-43.8L-12.6,-54.8M0,-50L11.8,-62.5M0,-50L-11.8,-62.5M0,-56.2L10.7,-70.2M0,-56.2L-10.7,-70.2M0,-62.2L9.2,-77.8M0,-62.2L-9.2,-77.8M0,-68.4L7.4,-85.5M0,-68.4L-7.4,-85.5M0,-74.6L5.2,-93.2M0,-74.6L-5.2,-93.2M0,-80.7L2.2,-100.9M0,-80.7L-2.2,-100.9\" fill=\"none\" stroke=\"#d6ecab\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\".55\"/></g></defs><use href=\"#llog\" transform=\"rotate(0) scale(1)\"/><use href=\"#llog\" transform=\"rotate(33) scale(0.88)\"/><use href=\"#llog\" transform=\"rotate(-33) scale(0.88)\"/><use href=\"#llog\" transform=\"rotate(61) scale(0.72)\"/><use href=\"#llog\" transform=\"rotate(-61) scale(0.72)\"/><use href=\"#llog\" transform=\"rotate(90) scale(0.54)\"/><use href=\"#llog\" transform=\"rotate(-90) scale(0.54)\"/><use href=\"#llog\" transform=\"rotate(122) scale(0.36)\"/><use href=\"#llog\" transform=\"rotate(-122) scale(0.36)\"/><path d=\"M0,4 C-2,22 2,33 0.5,50\" fill=\"none\" stroke=\"#8cc152\" stroke-width=\"4.5\" stroke-linecap=\"round\"/></svg>";
const leaf420Img = "data:image/svg+xml;base64," + btoa(LEAF420);

/* Dark card: "420 Countdown" flanked by small leaves, a big leaf below. */
function layout420() {
  return h("div", {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    width: W, height: H, backgroundColor: "#0b0e1c",
    backgroundImage: "linear-gradient(160deg,#0b0e1c,#10231a)",
    color: "#ffffff", fontFamily: "Inter", padding: 48
  }, [
    // Title row kept narrow so it survives Facebook's center-square crop of the
    // 1200x630 card (safe zone ≈ the middle 630px).
    h("div", { display: "flex", alignItems: "center", justifyContent: "center" }, [
      { type: "img", props: { src: leaf420Img, width: 64, height: 64, style: { marginRight: 16 } } },
      h("div", { fontSize: 58, fontWeight: 700, letterSpacing: -1 }, "420 Countdown"),
      { type: "img", props: { src: leaf420Img, width: 64, height: 64, style: { marginLeft: 16 } } }
    ]),
    { type: "img", props: { src: leaf420Img, width: 300, height: 300, style: { marginTop: 20 } } }
  ]);
}

async function renderTree(tree, headers) {
  const font = await loadGoogleFont({ family: "Inter", weight: 700 });
  const img = new ImageResponse(tree, { width: W, height: H, format: "png", fonts: [{ name: "Inter", data: font, weight: 700, style: "normal" }] });
  const res = new Response(img.body, img);
  for (const k in headers) res.headers.set(k, headers[k]);
  return res;
}

/* ---- tool share cards (alarm / timer / tide) --------------------------------
 * The event card above is date-centric ("LIVE COUNTDOWN / Make your own"),
 * which doesn't fit the tool pages. These render a matching card: a piece of
 * art drawn from the page's own subject (a clock face at the alarm time, a
 * timer dial, or the station's tide-pattern curve) plus a clean title/subtitle,
 * on the site's dark theme. The art SVGs mirror the on-page illustrations
 * (clock-face.mjs / tide-curve.mjs) and are resvg-safe like the ART set above.
 * Self-contained (Functions bundle separately), and every branch falls through
 * to the standard renderer on any error, so a bug here can't break OG. */
const TOOL_BG = { from: "#0b0e1c", to: "#10182e", accent: "#f5a623", text: "#f8fafc", sub: "#93c5fd" };
const NAVY = "#1d2637", ORANGE = "#f5a623", FACE = "#fdfdfd", TIDE = "#7dd3fc";
const polar = (deg, r) => [+(100 + r * Math.cos((deg - 90) * Math.PI / 180)).toFixed(2), +(100 + r * Math.sin((deg - 90) * Math.PI / 180)).toFixed(2)];
function clockFaceSvg(h24, m) {
  let ticks = "";
  for (let i = 0; i < 60; i++) { const mj = i % 5 === 0; const [x1, y1] = polar(i * 6, mj ? 74 : 79), [x2, y2] = polar(i * 6, 84); ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="${mj ? 3 : 1.3}"/>`; }
  const [hx, hy] = polar((h24 % 12) * 30 + m * 0.5, 46), [mx, my] = polar(m * 6, 68);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="${FACE}" stroke="${NAVY}" stroke-width="8"/>${ticks}<line x1="100" y1="100" x2="${hx}" y2="${hy}" stroke="${NAVY}" stroke-width="6" stroke-linecap="round"/><line x1="100" y1="100" x2="${mx}" y2="${my}" stroke="${ORANGE}" stroke-width="4.5" stroke-linecap="round"/><circle cx="100" cy="100" r="5.5" fill="${ORANGE}" stroke="${NAVY}" stroke-width="2"/></svg>`;
}
function dialSvg(minutes) {
  const mm = Math.max(1, Math.min(60, minutes | 0)), deg = mm * 6, [ex, ey] = polar(deg, 84);
  const wedge = mm === 60 ? `<circle cx="100" cy="100" r="84" fill="${ORANGE}"/>` : `<path d="M100 100 L100 16 A84 84 0 ${deg > 180 ? 1 : 0} 1 ${ex} ${ey} Z" fill="${ORANGE}"/>`;
  let ticks = ""; for (let i = 0; i < 60; i++) { const mj = i % 5 === 0; const [x1, y1] = polar(i * 6, mj ? 70 : 76), [x2, y2] = polar(i * 6, 84); ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="${mj ? 3.5 : 1.5}"/>`; }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="${FACE}" stroke="${NAVY}" stroke-width="8"/>${wedge}${ticks}</svg>`;
}
function tideCurveSvg(pat) {
  const lvl = (x) => pat === "diurnal" ? Math.sin(2 * Math.PI * x - Math.PI / 2)
    : pat === "mixed" ? 0.62 * Math.sin(2 * Math.PI * x - Math.PI / 2) + 0.42 * Math.sin(4 * Math.PI * x - Math.PI / 2)
    : Math.sin(4 * Math.PI * x - Math.PI / 2);
  const W2 = 200, base = 150, top = 40, PAD = 12, N = 96, xs = (i) => PAD + (i / N) * (W2 - 2 * PAD), ys = (v) => base - ((v + 1) / 2) * (base - top);
  let d = `M${xs(0).toFixed(1)} ${ys(lvl(0)).toFixed(1)}`; for (let i = 1; i <= N; i++) d += ` L${xs(i).toFixed(1)} ${ys(lvl(i / N)).toFixed(1)}`;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="${d} L${xs(N).toFixed(1)} ${base} L${xs(0).toFixed(1)} ${base} Z" fill="rgba(125,211,252,0.2)"/><path d="${d}" fill="none" stroke="${TIDE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const dataUri = (svg) => "data:image/svg+xml;base64," + btoa(svg);
function toolLayout(artUri, title, sub, footLeft) {
  return h("div", {
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    width: W, height: H, padding: 72,
    backgroundColor: TOOL_BG.from, backgroundImage: "linear-gradient(160deg," + TOOL_BG.from + "," + TOOL_BG.to + ")",
    fontFamily: "Inter", color: TOOL_BG.text
  }, [
    h("div", { display: "flex", alignItems: "center" }, [
      h("div", { width: 28, height: 28, borderRadius: "50%", backgroundColor: TOOL_BG.accent, marginRight: 18 }),
      h("div", { fontSize: 32, fontWeight: 700, letterSpacing: 1 }, "Time and Space Science")
    ]),
    h("div", { display: "flex", alignItems: "center" }, [
      { type: "img", props: { src: artUri, width: 250, height: 250, style: { marginRight: 54 } } },
      h("div", { display: "flex", flexDirection: "column", maxWidth: 740 }, [
        h("div", { fontSize: nameSize(title.length), fontWeight: 700, lineHeight: 1.05 }, title),
        h("div", { fontSize: 36, fontWeight: 700, color: TOOL_BG.sub, marginTop: 22 }, sub)
      ])
    ]),
    h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 27, fontWeight: 700, color: TOOL_BG.sub }, [
      h("div", { letterSpacing: 2 }, footLeft),
      h("div", {}, "Free · no sign-up")
    ])
  ]);
}

/* Build the satori virtual-DOM tree directly instead of via an HTML string.
 * This skips workers-og's HTML parser and gives satori exactly the structure it
 * wants: every node with more than one child carries an explicit display:flex. */
function h(type, style, children) {
  return { type, props: children === undefined ? { style } : { style, children } };
}

function layout(t, artId, name, dateLine) {
  return h("div", {
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    width: W, height: H, padding: 72,
    backgroundColor: t.from,
    backgroundImage: "linear-gradient(160deg," + t.from + "," + t.to + ")",
    fontFamily: "Inter", color: t.text
  }, [
    // brand row
    h("div", { display: "flex", alignItems: "center" }, [
      h("div", { width: 28, height: 28, borderRadius: "50%", backgroundColor: t.accent, marginRight: 18 }),
      h("div", { fontSize: 32, fontWeight: 700, letterSpacing: 1 }, "Countdown")
    ]),
    // headline: occasion artwork + name/date
    h("div", { display: "flex", alignItems: "center" }, [
      { type: "img", props: { src: svgImg(artId), width: 240, height: 240, style: { marginRight: 54 } } },
      h("div", { display: "flex", flexDirection: "column", maxWidth: 760 }, [
        h("div", { fontSize: nameSize(name.length), fontWeight: 700, lineHeight: 1.05 }, name),
        h("div", { fontSize: 38, fontWeight: 700, color: t.sub, marginTop: 24 }, dateLine)
      ])
    ]),
    // footer
    h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 27, fontWeight: 700, color: t.sub }, [
      h("div", { letterSpacing: 2 }, "LIVE COUNTDOWN"),
      h("div", {}, "Make your own →")
    ])
  ]);
}

async function render(t, artId, name, dateLine, headers) {
  // Fetch the full "latin" Inter face (no text-subsetting). workers-og's
  // loadGoogleFont does NOT URL-encode the text param, so a "&" in a name would
  // truncate a subset request; the full face avoids that, covers names with
  // &/apostrophes/accents, and — since the request URL is constant — is fetched
  // once and reused from cache across renders.
  const font = await loadGoogleFont({ family: "Inter", weight: 700 });
  const img = new ImageResponse(layout(t, artId, name, dateLine), {
    width: W, height: H, format: "png",
    fonts: [{ name: "Inter", data: font, weight: 700, style: "normal" }]
  });
  // Re-wrap so we control caching headers regardless of ImageResponse internals.
  const res = new Response(img.body, img);
  for (const k in headers) res.headers.set(k, headers[k]);
  return res;
}


/* ---- moderation (was functions/_middleware.js, which Pages ran on EVERY
 * request site-wide because there is no _routes.json narrowing it) ---------- */
import { BLOCK_RE, BLOCK_COMPACT_RE, BLOCK_COMPACT_STRICT_RE, EVASION_RE, ALLOW } from "../moderation.js";

function normTerm(s) {
  try { s = decodeURIComponent(String(s).replace(/\+/g, " ")); } catch (e) { /* keep raw */ }
  return s.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}
function matchTerm(v) {
  const n = normTerm(v);
  if (!n || ALLOW.has(n)) return null;
  let m = BLOCK_RE.exec(n);
  if (m) return m[0];
  const compact = n.replace(/[^a-z0-9]/g, "");
  m = BLOCK_COMPACT_RE.exec(compact);              /* anti-evasion */
  if (m) return m[0];
  /* the short high-collision roots, but only for a value that is being spelled
     out with separators — "r-a-p-e" yes, "Grape Festival" no */
  if (EVASION_RE.test(n)) { m = BLOCK_COMPACT_STRICT_RE.exec(compact); if (m) return m[0]; }
  return null;
}
/* every visitor-supplied field this endpoint RENDERS */
function isBlocked(q) {
  for (const field of ["name", "label", "message"]) if (matchTerm(q.get(field))) return true;
  return false;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const q = url.searchParams;

  /* Moderation, in the endpoint that renders the text rather than in
     site-wide middleware. This is the one route that bakes visitor-supplied
     words into a scrapeable image with no authentication, so it checks every
     field it actually renders — `label`, which the timer and tide cards print,
     was NOT checked before, while `message` (checked) is no longer rendered at
     all. Terms come from cloudflare/blocklist.txt via `npm run waf`. */
  if (isBlocked(q)) return Response.redirect(new URL("/not-found", url.origin).href, 302);

  // Dedicated 420 share card (dark bg, leaf-flanked title, big leaf).
  if (q.get("tpl") === "four20") {
    const hdrs = { "content-type": "image/png", "cache-control": "public, max-age=86400, s-maxage=604800, immutable" };
    try { return await renderTree(layout420(), hdrs); } catch (e) { /* fall through to the standard renderer */ }
  }

  // Tool share cards (alarm / timer / tide). Each draws its own subject art and
  // falls through to the standard renderer on any error, so OG never hard-fails.
  const tpl = q.get("tpl");
  if (tpl === "alarm" || tpl === "timer" || tpl === "tide") {
    const hdrs = { "content-type": "image/png", "cache-control": "public, max-age=86400, s-maxage=604800, immutable" };
    try {
      let art, title, sub, foot;
      if (tpl === "alarm") {
        const hh = Math.max(0, Math.min(23, parseInt(q.get("h"), 10) || 0));
        const mm = Math.max(0, Math.min(59, parseInt(q.get("m"), 10) || 0));
        const disp = `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
        art = clockFaceSvg(hh, mm); title = `Set an alarm for ${disp}`; sub = "Free online alarm — tap Save, keep the tab open"; foot = "ONLINE ALARM CLOCK";
      } else if (tpl === "timer") {
        const mins = Math.max(1, Math.min(60, parseInt(q.get("min"), 10) || 5));
        const lbl = clean(q.get("label"), 40) || `${mins} minute`;
        art = dialSvg(mins); title = `${lbl} timer`; sub = "Free countdown timer with an alarm — no sign-up"; foot = "ONLINE TIMER";
      } else {
        const pat = ["semidiurnal", "diurnal", "mixed"].includes(q.get("pat")) ? q.get("pat") : "semidiurnal";
        const lbl = clean(q.get("label"), 44) || "Tide chart";
        art = tideCurveSvg(pat); title = `${lbl} tide chart`; sub = "Today's high & low tides, live from NOAA"; foot = "TIDE TIMES & CHARTS";
      }
      return await renderTree(toolLayout(dataUri(art), title, sub, foot), hdrs);
    } catch (e) { /* fall through to the standard renderer */ }
  }

  const t = THEMES[q.get("theme")] || THEMES.generic;
  const artId = ART[q.get("art")] ? q.get("art") : "generic";

  const rawName = clean(q.get("name"), 80);
  const tz = q.get("tz") || "UTC";
  const target = targetDate(q.get("date"), q.get("time"), tz);

  let name, dateLine;
  if (!rawName && !target) {
    // Branded default (e.g. /api/og with no params).
    name = "Someone sent you a countdown";
    dateLine = "See how long until the big moment";
  } else {
    name = rawName || "A countdown for you";
    if (target) {
      const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz };
      const time = q.get("time");
      if (/^(\d{1,2}):(\d{2})$/.test(time || "") && time !== "00:00") {
        opts.hour = "numeric"; opts.minute = "2-digit"; opts.timeZoneName = "short";
      }
      dateLine = clean(new Intl.DateTimeFormat("en-US", opts).format(target), 64);
    } else {
      dateLine = "Live countdown";
    }
  }

  const headers = {
    "content-type": "image/png",
    // Generated once per unique countdown; safe to cache hard at the edge & by scrapers.
    "cache-control": "public, max-age=86400, s-maxage=604800, immutable"
  };

  try {
    return await render(t, artId, name, dateLine, headers);
  } catch (e) {
    // Never fail a preview: fall back to the branded default, then the static SVG.
    try {
      return await render(THEMES.generic, "generic", "Someone sent you a countdown", "See how long until the big moment", headers);
    } catch (e2) {
      return Response.redirect(new URL("/assets/img/og-default.svg", request.url).href, 302);
    }
  }
}
