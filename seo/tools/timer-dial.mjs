/* timer-dial.mjs — generated analog dial illustration for timer pages.
 *
 * Recreates the user's dial artwork (white clock face, dark-navy ring and
 * ticks, orange elapsed wedge from 12 o'clock, big minute number + "min")
 * as a parametric inline SVG, so every whole-minute duration up to an hour
 * can carry a mathematically exact dial at ~1KB with no image request.
 * Colors sampled from the reference images. The wedge is drawn under the
 * ticks and the number, matching the reference layering.
 */

const NAVY = "#1d2637";
const ORANGE = "#f5a623";
const FACE = "#fdfdfd";

/* dialSvg(minutes) — minutes must be 1..60 (whole minutes; returns "" for
 * anything else so callers can feature-detect: sub-minute wedges are
 * invisible and >60 doesn't fit a 60-minute face). */
export function dialSvg(minutes, { size = 320 } = {}) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) return "";
  const C = 100, RING_R = 88, RING_W = 8, WEDGE_R = 84;
  const pt = (deg, r) => {
    const a = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)].map((v) => +v.toFixed(2));
  };
  /* elapsed wedge: 12 o'clock, clockwise to the minute mark */
  const deg = minutes * 6;
  const [ex, ey] = pt(deg, WEDGE_R);
  const wedge = minutes === 60
    ? `<circle cx="${C}" cy="${C}" r="${WEDGE_R}" fill="${ORANGE}"/>`
    : `<path d="M${C} ${C} L${C} ${C - WEDGE_R} A${WEDGE_R} ${WEDGE_R} 0 ${deg > 180 ? 1 : 0} 1 ${ex} ${ey} Z" fill="${ORANGE}"/>`;
  /* 60 minute ticks; every 5th is longer and heavier */
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x1, y1] = pt(i * 6, major ? 70 : 76);
    const [x2, y2] = pt(i * 6, WEDGE_R);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="${major ? 3.5 : 1.5}"/>`;
  }
  const numSize = minutes >= 10 ? 52 : 60;
  return `<svg class="timer-illus" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Analog dial showing a ${minutes} minute timer">` +
    `<circle cx="${C}" cy="${C}" r="${RING_R}" fill="${FACE}" stroke="${NAVY}" stroke-width="${RING_W}"/>` +
    wedge + ticks +
    `<text x="${C}" y="108" text-anchor="middle" font-family="ui-rounded,'SF Pro Rounded',system-ui,sans-serif" font-size="${numSize}" font-weight="800" fill="${NAVY}">${minutes}</text>` +
    `<text x="${C}" y="142" text-anchor="middle" font-family="ui-rounded,'SF Pro Rounded',system-ui,sans-serif" font-size="22" font-weight="700" fill="${NAVY}">min</text>` +
    `</svg>`;
}
