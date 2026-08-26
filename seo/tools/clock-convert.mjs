/* clock-convert.mjs — the 12-hour ⇄ 24-hour clock converter: the widget, the
 * script that drives it, the reference chart, and the spoken forms.
 *
 * Shared by /24-hour-clock-converter/ and its 48 per-time pages, so the hub and
 * every "1430 in 12-hour time" page run ONE converter rather than two that can
 * drift — the same reason time-diff.mjs exists.
 *
 * WHY TWO COMPLETE CLOCKS AND NOT ONE SET OF FIELDS. Converting only ever
 * changes the HOUR and the AM/PM label; the minutes are the same number on both
 * sides. A single shared minute field would be less markup and would answer the
 * wrong question — the visitor is here to see the two readings SIDE BY SIDE,
 * and half of what they are checking is that the minutes did not move. So each
 * side is a whole clock you can type into, either one drives the other, and the
 * duplicated minutes are the point rather than an oversight.
 *
 * NO <input type="time"> ON THE 24-HOUR SIDE. A native time input renders in
 * the BROWSER's locale format: on a US device it draws a 12-hour field with an
 * AM/PM segment, which is the one thing this page must not do. Selects show
 * exactly the notation each side is named after, on every device.
 *
 * WORKS BEFORE THE SCRIPT. Every page bakes its own time into the selects AND
 * into both read-outs, so a crawler (and a visitor whose JS has not run) sees a
 * finished conversion rather than an empty widget. The script only makes it
 * interactive. "Use the time now" ships hidden and is revealed by the script,
 * since without it the button could do nothing.
 */
import { esc, alarmTimes } from "./lib.mjs";

const p2 = (n) => String(n).padStart(2, "0");

/* ---- number words -------------------------------------------------------- */
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
const word = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);

/* An hour or a minute said the 24-hour way: single digits keep their leading
 * zero out loud ("zero seven thirty"), which is the whole reason a 24-hour time
 * is read digit-first rather than as a number. */
const pairWord = (n) => (n < 10 ? `zero ${ONES[n]}` : word(n));

/** How a 24-hour time is said aloud: 14:30 -> "fourteen thirty", 07:00 ->
 *  "zero seven hundred hours". */
export function spoken24(h, m) {
  return m === 0 ? `${pairWord(h)} hundred hours` : `${pairWord(h)} ${pairWord(m)}`;
}

/* Which part of the day a 24-hour hour falls in — used both for the spoken
 * 12-hour form ("in the afternoon") and for the per-page copy. The small hours
 * are "at night", not "in the morning": nobody says nine minutes past one in
 * the morning meaning 01:09 and then means something else by it. */
export function partOfDay(h) {
  if (h < 5) return "at night";
  if (h < 12) return "in the morning";
  if (h < 18) return "in the afternoon";
  if (h < 21) return "in the evening";
  return "at night";
}

/** How a 12-hour time is said aloud: 14:30 -> "half past two in the afternoon". */
export function spoken12(h, m) {
  if (h === 0 && m === 0) return "twelve midnight";
  if (h === 12 && m === 0) return "twelve noon";
  const h12 = h % 12 || 12;
  const part = partOfDay(h);
  if (m === 0) return `${word(h12)} o'clock ${part}`;
  if (m === 30) return `half past ${word(h12)} ${part}`;
  return `${word(h12)} ${m < 10 ? `oh ${ONES[m]}` : word(m)} ${part}`;
}

/* ---- the times that get their own page ------------------------------------
 * EXACTLY the set the alarm pages use — alarmTimes() is the half-hourly walk
 * round the whole clock, and taking it from there rather than rebuilding it
 * means every converter page has a "set an alarm for this time" page waiting at
 * the other end, permanently, without a lookup table anyone has to maintain. */
/** "1430" — the URL segment for a time, and the way the query is typed. Exported
 *  so the alarm pages can link to their own converter page without deriving the
 *  slug a second time. */
export const convSlug = (h, m) => `${p2(h)}${p2(m)}`;

export const CONV_TIMES = alarmTimes().map((t) => ({
  ...t,                              // h, m, ap, hh, t24 ("14:30"), disp ("2:30 PM")
  alarmSlug: t.slug,                 // "2-30-pm" — the /alarm-clock/ page for the same time
  slug: convSlug(t.h, t.m),
  hhmm: convSlug(t.h, t.m),
}));

export const CONV_SLUGS = CONV_TIMES.map((t) => t.slug);

/* ---- the widget ---------------------------------------------------------- */
const opts = (list, sel) => list.map(([v, label]) =>
  `<option value="${v}"${v === sel ? " selected" : ""}>${esc(label)}</option>`).join("");

const HOURS_24 = Array.from({ length: 24 }, (_, i) => [String(i), p2(i)]);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => [String(i + 1), String(i + 1)]);
const MINUTES = Array.from({ length: 60 }, (_, i) => [String(i), p2(i)]);

/** convForm(h, m, {compact}) — both clocks, baked to that time.
 *  `compact` is the home page's card: the two clocks always stack (a card at
 *  half the board's width is narrower than any viewport media query can see)
 *  and "Use the time now" goes, because the card is a teaser for the full page
 *  rather than a second copy of it — the same split tdiffForm makes. */
export function convForm(h, m, { compact = false } = {}) {
  const h12 = h % 12 || 12, ap = h < 12 ? "AM" : "PM";
  return `<div class="cv-form${compact ? " cv-compact" : ""}">
      <div class="cv-side">
        <h2 class="cv-side-h">24-hour clock</h2>
        <div class="cv-fields">
          <label class="cv-f">Hour<select id="cv-h24" aria-label="Hour, 24-hour clock">${opts(HOURS_24, String(h))}</select></label>
          <span class="cv-colon" aria-hidden="true">:</span>
          <label class="cv-f">Minute<select id="cv-m24" aria-label="Minute, 24-hour clock">${opts(MINUTES, String(m))}</select></label>
        </div>
        <p class="cv-read" id="cv-out24">${p2(h)}:${p2(m)}</p>
      </div>
      <div class="cv-eq" aria-hidden="true">=</div>
      <div class="cv-side">
        <h2 class="cv-side-h">12-hour clock</h2>
        <div class="cv-fields">
          <label class="cv-f">Hour<select id="cv-h12" aria-label="Hour, 12-hour clock">${opts(HOURS_12, String(h12))}</select></label>
          <span class="cv-colon" aria-hidden="true">:</span>
          <label class="cv-f">Minute<select id="cv-m12" aria-label="Minute, 12-hour clock">${opts(MINUTES, String(m))}</select></label>
          <label class="cv-f">AM/PM<select id="cv-ap" aria-label="AM or PM">${opts([["AM", "AM"], ["PM", "PM"]], ap)}</select></label>
        </div>
        <p class="cv-read" id="cv-out12">${h12}:${p2(m)}&nbsp;${ap}</p>
      </div>
    </div>
    <p class="cv-say" id="cv-say">Said aloud: &ldquo;${esc(spoken24(h, m))}&rdquo; on the 24-hour clock, &ldquo;${esc(spoken12(h, m))}&rdquo; on the 12-hour one.</p>${compact ? "" : `
    <p class="cv-actions"><button type="button" class="btn secondary" id="cv-now" hidden>Use the time now</button></p>`}`;
}

/* The script. Plain ES5 in a string, like every other inlined controller here.
 * One direction of travel per change: whichever side you touched is the truth,
 * the other side is rewritten from it. */
export const CONV_JS = `
(function(){
  var h24=document.getElementById('cv-h24'), m24=document.getElementById('cv-m24'),
      h12=document.getElementById('cv-h12'), m12=document.getElementById('cv-m12'),
      ap=document.getElementById('cv-ap');
  if(!h24||!m24||!h12||!m12||!ap) return;
  var out24=document.getElementById('cv-out24'), out12=document.getElementById('cv-out12'),
      say=document.getElementById('cv-say'), nowBtn=document.getElementById('cv-now');
  var ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  var TENS=['','','twenty','thirty','forty','fifty'];
  function pad(n){ return (n<10?'0':'')+n; }
  function word(n){ return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:''); }
  function pairWord(n){ return n<10?'zero '+ONES[n]:word(n); }
  function part(h){ return h<5?'at night':h<12?'in the morning':h<18?'in the afternoon':h<21?'in the evening':'at night'; }
  function say24(h,m){ return m===0?pairWord(h)+' hundred hours':pairWord(h)+' '+pairWord(m); }
  function say12(h,m){
    if(h===0&&m===0) return 'twelve midnight';
    if(h===12&&m===0) return 'twelve noon';
    var t=h%12||12, p=part(h);
    if(m===0) return word(t)+" o'clock "+p;
    if(m===30) return 'half past '+word(t)+' '+p;
    return word(t)+' '+(m<10?'oh '+ONES[m]:word(m))+' '+p;
  }
  /* h,m are the one truth; both sides and both read-outs are drawn from them */
  function render(h,m){
    var t=h%12||12, a=h<12?'AM':'PM';
    h24.value=String(h); m24.value=String(m);
    h12.value=String(t); m12.value=String(m); ap.value=a;
    out24.textContent=pad(h)+':'+pad(m);
    out12.textContent=t+':'+pad(m)+'\\u00a0'+a;
    /* guarded: a compact instance may leave pieces out */
    if(say) say.textContent='Said aloud: \\u201c'+say24(h,m)+'\\u201d on the 24-hour clock, \\u201c'+say12(h,m)+'\\u201d on the 12-hour one.';
  }
  function from24(){ render(+h24.value, +m24.value); }
  function from12(){
    var t=+h12.value%12, h=ap.value==='PM'?t+12:t;
    render(h, +m12.value);
  }
  h24.addEventListener('change',from24); m24.addEventListener('change',from24);
  h12.addEventListener('change',from12); m12.addEventListener('change',from12);
  ap.addEventListener('change',from12);
  if(nowBtn){
    nowBtn.hidden=false;
    nowBtn.addEventListener('click',function(){ var n=new Date(); render(n.getHours(), n.getMinutes()); });
  }
  from24();
})();
`;

/* ---- the reference chart --------------------------------------------------
 * Every whole hour, both ways, with the spoken form — the "24 hour clock chart"
 * people come looking for, and the only table on the site whose rows are all
 * pages. Two columns of twelve rather than one column of twenty-four, because
 * the pairing that matters is 13:00 sitting level with 01:00: the afternoon
 * column IS the morning column plus twelve, and reading it that way is the
 * conversion rule without the arithmetic. */
export function hourChart({ link = true } = {}) {
  const row = (h) => {
    const t = CONV_TIMES.find((x) => x.h === h && x.m === 0);
    const cell = link ? `<a href="/24-hour-clock-converter/${t.slug}/">${p2(h)}:00</a>` : `${p2(h)}:00`;
    return `<tr><td class="cv-24">${cell}</td><td>${t.hh}:00&nbsp;${t.ap}</td><td class="cv-said">${esc(spoken24(h, 0))}</td></tr>`;
  };
  const half = (from) => `<table class="cv-chart">
        <thead><tr><th scope="col">24-hour</th><th scope="col">12-hour</th><th scope="col">Said as</th></tr></thead>
        <tbody>
${Array.from({ length: 12 }, (_, i) => `          ${row(from + i)}`).join("\n")}
        </tbody>
      </table>`;
  return `<div class="cv-chart-wrap">${half(0)}${half(12)}</div>`;
}
