/* clock-face.mjs — a 12-hour analog clock illustration (inline SVG) with the
 * hands pointing at a given time. Used on the "set alarm for HH:MM" pages so
 * each of the 48 pages carries a unique, crawlable visual of its own time
 * (Google Images, plus it visually reinforces the page subject before any JS
 * runs). Palette matches the timer dials (navy ring/ticks/hands, white face,
 * orange minute hand + center) so the alarm and timer tools read as one set.
 * No external assets; ~1KB.
 */
const NAVY = "#1d2637";
const ORANGE = "#f5a623";
const FACE = "#fdfdfd";

/* clockFace(hour24, minute, {size}) — hour24 in 0..23, minute in 0..59. */
export function clockFace(hour24, minute, { size = 320 } = {}) {
  const C = 100;
  const pt = (deg, r) => {
    const a = (deg - 90) * Math.PI / 180;
    return [+(C + r * Math.cos(a)).toFixed(2), +(C + r * Math.sin(a)).toFixed(2)];
  };
  /* hand angles: minute = 6°/min; hour = 30°/hr + 0.5°/min so it drifts. */
  const minDeg = minute * 6;
  const hourDeg = (hour24 % 12) * 30 + minute * 0.5;
  const [hx, hy] = pt(hourDeg, 46);   // hour hand: shorter
  const [mx, my] = pt(minDeg, 68);    // minute hand: longer
  /* 12 hour ticks (long) + 60 minute ticks (short) */
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x1, y1] = pt(i * 6, major ? 74 : 79);
    const [x2, y2] = pt(i * 6, 84);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="${major ? 3 : 1.3}"/>`;
  }
  const h12 = hour24 % 12 || 12;
  const ap = hour24 < 12 ? "AM" : "PM";
  const label = `${h12}:${String(minute).padStart(2, "0")} ${ap}`;
  return `<svg class="clock-illus" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Clock face showing ${label}">` +
    `<circle cx="${C}" cy="${C}" r="88" fill="${FACE}" stroke="${NAVY}" stroke-width="8"/>` +
    ticks +
    /* hour hand (navy, thick), minute hand (orange, thinner), center pin */
    `<line x1="${C}" y1="${C}" x2="${hx}" y2="${hy}" stroke="${NAVY}" stroke-width="6" stroke-linecap="round"/>` +
    `<line x1="${C}" y1="${C}" x2="${mx}" y2="${my}" stroke="${ORANGE}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<circle cx="${C}" cy="${C}" r="5.5" fill="${ORANGE}" stroke="${NAVY}" stroke-width="2"/>` +
    `<text x="${C}" y="150" text-anchor="middle" font-family="ui-rounded,'SF Pro Rounded',system-ui,sans-serif" font-size="20" font-weight="800" fill="${NAVY}">${label}</text>` +
    `</svg>`;
}
