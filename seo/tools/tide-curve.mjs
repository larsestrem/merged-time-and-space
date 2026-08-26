/* tide-curve.mjs — a small inline-SVG illustration of a station's TYPICAL
 * daily tide shape, keyed to its pattern (semidiurnal = two near-equal humps,
 * mixed = two unequal humps, diurnal = one hump per day). This illustrates the
 * pattern described in the station's "what the tides are like here" card — it
 * is deliberately a schematic, not today's actual heights (those are on the
 * live NOAA chart above it), and is labelled as such. Tide-blue to match the
 * station-marker glyph (#7dd3fc). No external assets; ~1KB.
 */

/* level(pattern, x) — water level in -1..1 for x in 0..1 (one 24h day). */
function level(pattern, x) {
  const T = 2 * Math.PI;
  if (pattern === "diurnal") return Math.sin(T * x - Math.PI / 2);          // one hump
  if (pattern === "mixed") return 0.62 * Math.sin(T * x - Math.PI / 2)      // two unequal humps
    + 0.42 * Math.sin(2 * T * x - Math.PI / 2);
  return Math.sin(2 * T * x - Math.PI / 2);                                 // semidiurnal: two equal humps
}

/* Drawn in the SAME visual language as the live chart at the top of the page
 * (dark rounded panel, feet gridlines, hour labels, the #5fb8d0 water curve with
 * its soft fill, yellow-high / grey-low dots) — just for one day, and still a
 * schematic rather than today's heights.
 *
 * It used to be a bare line on a baseline, which read as a bell curve starting
 * and ending AT ZERO: the trough sat exactly on the axis and the fill ran to it,
 * so the shape implied the water empties out twice a day. Real tides oscillate
 * between two non-zero levels, so the curve is now inset vertically and never
 * touches the floor of the panel.
 *
 * The y axis is labelled "ft" at each gridline WITHOUT numbers. That is the
 * honest label for a schematic: it tells the reader the vertical axis is water
 * height in feet, which is the question the unlabelled axis raised, without
 * inventing station heights this drawing does not know. */
export function tideCurve(pattern, { width = 320, height = 132 } = {}) {
  const W = 320, H = 132, padL = 22, padR = 10, padT = 14, padB = 18;
  const iw = W - padL - padR, ih = H - padT - padB;
  const N = 120;
  const X = (h) => padL + iw * (h / 24);
  /* Start the day part-way up the rise rather than exactly on a trough. With no
   * phase shift the curve began AND ended at its lowest point, which is what
   * made it read as one bell curve bottoming out at zero; offset, the day shows
   * low -> high -> low -> high the way the caption describes it. */
  const at = (i) => level(pattern, ((i / N) + 0.15) % 1);
  /* Normalise to the pattern's own range, then inset — the extremes must never
   * touch the panel floor, or the drawing claims the water empties out. */
  const vs = []; for (let i = 0; i <= N; i++) vs.push(at(i));
  const lo = Math.min(...vs), hi = Math.max(...vs), span = (hi - lo) || 1;
  const Y = (v) => padT + ih * (1 - (0.16 + 0.68 * (v - lo) / span));
  const f = (n) => n.toFixed(1);
  let d = "";
  for (let i = 0; i <= N; i++) { const h = (i / N) * 24; d += (i ? "L" : "M") + f(X(h)) + " " + f(Y(at(i))); }
  const area = `${d} L${f(X(24))} ${f(padT + ih)} L${f(X(0))} ${f(padT + ih)} Z`;
  /* four evenly spaced gridlines, each marked with the unit only */
  let grid = "";
  for (let k = 0; k <= 3; k++) {
    const y = padT + (ih * k) / 3;
    grid += `<line x1="${padL}" y1="${f(y)}" x2="${W - padR}" y2="${f(y)}" stroke="rgba(255,255,255,.10)" stroke-width="1"/>` +
      `<text x="3" y="${f(y + 3)}" font-family="system-ui,sans-serif" font-size="8" fill="rgba(255,255,255,.5)">ft</text>`;
  }
  const hrLbl = (h) => (h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`);
  let hours = "";
  for (const h of [0, 6, 12, 18, 24]) hours += `<text x="${f(X(h))}" y="${H - 5}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="rgba(255,255,255,.5)">${hrLbl(h)}</text>`;
  /* hi/lo dots at the turning points of the schematic itself */
  let marks = "";
  for (let i = 1; i < N; i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1);
    const up = b > a && b >= c, dn = b < a && b <= c;
    if (!up && !dn) continue;
    const x = X((i / N) * 24);
    if (x < padL + 5 || x > W - padR - 5) continue;
    marks += `<circle cx="${f(x)}" cy="${f(Y(b))}" r="2.6" fill="${up ? "#fcd34d" : "#94a3b8"}"/>`;
  }
  const patLabel = pattern === "diurnal" ? "one high & one low a day"
    : pattern === "mixed" ? "two uneven highs & lows a day" : "two highs & two lows a day";
  return `<svg class="tide-curve" viewBox="0 0 ${W} ${H}" width="${width}" height="${height}" role="img" aria-label="Typical daily tide pattern: ${patLabel}">` +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#12151f" stroke="rgba(255,255,255,.09)"/>` +
    grid + hours +
    `<path d="${area}" fill="rgba(95,184,208,.16)"/>` +
    `<path d="${d}" fill="none" stroke="#5fb8d0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    marks +
    `</svg>`;
}

/* tideDayChart(events) — a static SVG of ONE day's REAL tide curve in the same
 * visual language as the live tides-page chart (dark rounded panel, ft
 * gridlines + labels, hour ticks, the #5fb8d0 water curve with soft fill, and
 * yellow-high / grey-low markers each labelled with height + time). Built from
 * the station's actual NOAA high/low predictions for the day, cosine-
 * interpolated between extrema (the real tidal shape). No client JS. Shared by
 * the home card and (later) the station pages so both match.
 * events: [{ hod: 0..24, v: feet, hi: bool, label: "5:30 AM" }] (>=2, sorted). */
export function tideDayChart(events, { width = 460, height = 168 } = {}) {
  const W = width, H = height, padL = 26, padR = 12, padT = 20, padB = 20, iw = W - padL - padR, ih = H - padT - padB;
  const ev = events.slice().sort((a, b) => a.hod - b.hod);
  let vmin = Math.min(...ev.map((e) => e.v)), vmax = Math.max(...ev.map((e) => e.v));
  const vpad = (vmax - vmin) * 0.22 || 1; vmin -= vpad; vmax += vpad;
  const X = (h) => padL + iw * (h / 24), Y = (v) => padT + ih * (1 - (v - vmin) / (vmax - vmin));
  /* Extend the curve past the first/last extreme with a synthetic opposite
   * extreme (tides alternate high<->low ~every 6h, so the tide before the first
   * point ≈ the second point's level, and after the last ≈ the second-last's).
   * Otherwise the ends flat-line instead of curving toward the next tide. */
  const leadGap = ev[1].hod - ev[0].hod, trailGap = ev[ev.length - 1].hod - ev[ev.length - 2].hod;
  const pad = [{ hod: ev[0].hod - leadGap, v: ev[1].v }, ...ev, { hod: ev[ev.length - 1].hod + trailGap, v: ev[ev.length - 2].v }];
  const val = (h) => {
    if (h <= pad[0].hod) return pad[0].v;
    if (h >= pad[pad.length - 1].hod) return pad[pad.length - 1].v;
    let i = 0; while (i < pad.length - 1 && pad[i + 1].hod < h) i++;
    const a = pad[i], b = pad[i + 1], f = (h - a.hod) / (b.hod - a.hod);
    return a.v + (b.v - a.v) * (1 - Math.cos(Math.PI * f)) / 2;
  };
  const N = 120; let d = "";
  for (let k = 0; k <= N; k++) { const h = (k / N) * 24; d += (k ? "L" : "M") + X(h).toFixed(1) + " " + Y(val(h)).toFixed(1); }
  const area = `${d} L${X(24).toFixed(1)} ${(padT + ih).toFixed(1)} L${X(0).toFixed(1)} ${(padT + ih).toFixed(1)} Z`;
  let grid = "";
  for (let v = Math.ceil(vmin); v <= Math.floor(vmax); v++) {
    const y = Y(v);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.10)" stroke-width="1"/>` +
      `<text x="4" y="${(y + 3).toFixed(1)}" font-family="system-ui,sans-serif" font-size="8" fill="rgba(255,255,255,.5)">${v}ft</text>`;
  }
  const hrLbl = (h) => h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`;
  let hours = "";
  for (const h of [0, 6, 12, 18, 24]) hours += `<text x="${X(h).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="rgba(255,255,255,.5)">${hrLbl(h)}</text>`;
  const marks = ev.map((e) => {
    const x = X(e.hod), y = Y(e.v), ly = e.hi ? y - 7 : y + 12;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${e.hi ? "#fcd34d" : "#94a3b8"}"/>` +
      `<text x="${x.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.5" font-weight="700" fill="#e2e8f0">${e.v.toFixed(1)}ft</text>` +
      `<text x="${x.toFixed(1)}" y="${(ly + (e.hi ? -9 : 9)).toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7.5" fill="#9fb0c4">${e.label}</text>`;
  }).join("");
  return `<svg class="tide-day" viewBox="0 0 ${W} ${H}" width="${width}" height="${height}" role="img" aria-label="Today's tide chart: highs and lows over 24 hours">` +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#12151f" stroke="rgba(255,255,255,.09)"/>` +
    grid + hours + `<path d="${area}" fill="rgba(95,184,208,.16)"/>` +
    `<path d="${d}" fill="none" stroke="#5fb8d0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    marks + `</svg>`;
}

/* tideChartSnapshot() — a static SVG that looks like a real screenshot of the
 * live tide tool's chart (assets/js/tides.js drawChart): dark rounded panel,
 * the #5fb8d0 water curve with its soft fill, night shading, an ft axis, day
 * labels, and yellow-high / grey-low markers with bold-white "ft" readouts.
 * It plots a realistic mixed-semidiurnal curve (two uneven highs & lows a day)
 * from a fixed harmonic sum — deterministic, no network, always renders — so
 * the homepage card previews what the real chart looks like instead of a bare
 * schematic. Colours copied from drawChart so the preview matches the tool. */
export function tideChartSnapshot({ width = 300, height = 132 } = {}) {
  const W = 300, H = 132, padL = 22, padR = 10, padT = 16, padB = 18;
  const iw = W - padL - padR, ih = H - padT - padB;
  const DAYS = 3, N = 216;
  /* ft above datum: semidiurnal (~1.932 cycles/day) + a diurnal inequality term
   * so the two daily highs differ, like a real US Pacific/mixed station */
  const lvl = (xd) => 3.0 + 2.15 * Math.sin(2 * Math.PI * (xd * 1.932 - 0.10))
    + 0.55 * Math.sin(2 * Math.PI * (xd * 0.966 - 0.28));
  const pts = [];
  for (let i = 0; i <= N; i++) { const xd = (i / N) * DAYS; pts.push({ xd, v: lvl(xd) }); }
  let vmin = Infinity, vmax = -Infinity;
  pts.forEach((p) => { vmin = Math.min(vmin, p.v); vmax = Math.max(vmax, p.v); });
  const vpad = (vmax - vmin) * 0.14; vmin -= vpad; vmax += vpad;
  const X = (xd) => padL + iw * (xd / DAYS);
  const Y = (v) => padT + ih * (1 - (v - vmin) / (vmax - vmin));
  const f = (n) => n.toFixed(1);
  let d = `M${f(X(0))} ${f(Y(pts[0].v))}`;
  for (let i = 1; i <= N; i++) d += ` L${f(X(pts[i].xd))} ${f(Y(pts[i].v))}`;
  const area = `${d} L${f(X(DAYS))} ${f(padT + ih)} L${f(X(0))} ${f(padT + ih)} Z`;
  /* local maxima/minima → hi/lo dots + ft readouts */
  const ex = [];
  for (let i = 1; i < N; i++) {
    const up = pts[i].v > pts[i - 1].v && pts[i].v >= pts[i + 1].v;
    const dn = pts[i].v < pts[i - 1].v && pts[i].v <= pts[i + 1].v;
    if (up || dn) ex.push({ xd: pts[i].xd, v: pts[i].v, hi: up });
  }
  /* night shading: before 6am and after 6pm each day (rgba like drawChart) */
  const nightRanges = [];
  for (let dd = 0; dd <= DAYS; dd++) { nightRanges.push([dd - 0.25, dd + 0.25]); }
  const nights = nightRanges.map(([a, b]) => {
    const xa = X(Math.max(0, a)), xb = X(Math.min(DAYS, b));
    return xb > xa ? `<rect x="${f(xa)}" y="${padT}" width="${f(xb - xa)}" height="${ih}" fill="rgba(0,0,0,.22)"/>` : "";
  }).join("");
  /* y gridlines + ft labels at whole feet */
  let grid = "";
  for (let v = Math.ceil(vmin); v <= Math.floor(vmax); v++) {
    const y = Y(v);
    grid += `<line x1="${padL}" y1="${f(y)}" x2="${W - padR}" y2="${f(y)}" stroke="rgba(255,255,255,.10)" stroke-width="1"/>`;
    grid += `<text x="3" y="${f(y + 3)}" font-family="system-ui,sans-serif" font-size="8" fill="rgba(255,255,255,.5)">${v}ft</text>`;
  }
  /* day dividers + weekday labels */
  const dayNames = ["Fri", "Sat", "Sun"];
  let days = "";
  for (let dd = 1; dd < DAYS; dd++) {
    const x = X(dd);
    days += `<line x1="${f(x)}" y1="${padT}" x2="${f(x)}" y2="${padT + ih}" stroke="rgba(255,255,255,.10)" stroke-width="1"/>`;
  }
  for (let dd = 0; dd < DAYS; dd++) {
    days += `<text x="${f(X(dd + 0.5))}" y="${H - 6}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="rgba(255,255,255,.5)">${dayNames[dd]}</text>`;
  }
  /* hi/lo markers + bold-white ft readouts (yellow high, grey low — as drawChart) */
  const marks = ex.map((p) => {
    const x = X(p.xd), y = Y(p.v);
    if (x < padL + 6 || x > W - padR - 6) return "";
    const dot = `<circle cx="${f(x)}" cy="${f(y)}" r="2.6" fill="${p.hi ? "#fcd34d" : "#94a3b8"}"/>`;
    const ly = p.hi ? y - 6 : y + 10;
    const lbl = `<text x="${f(x)}" y="${f(ly)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7.5" font-weight="700" fill="#ffffff">${f(p.v)}ft</text>`;
    return dot + lbl;
  }).join("");
  return `<svg class="tide-snapshot" viewBox="0 0 ${W} ${H}" width="${width}" height="${height}" role="img" aria-label="Example tide chart: two uneven high tides and two low tides a day over three days">` +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#12151f" stroke="rgba(255,255,255,.09)"/>` +
    nights + grid + days +
    `<path d="${area}" fill="rgba(95,184,208,.16)"/>` +
    `<path d="${d}" fill="none" stroke="#5fb8d0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    marks +
    `</svg>`;
}
