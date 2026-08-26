/* moon-face.mjs — the moon's near side, drawn from real selenographic coordinates.
 *
 * The phase glyph used to be a flat white disc. This builds the actual lunar
 * near side once, as an SVG sprite that every glyph on the page references with
 * <use>, so the maria and craters stay put while only the shadow moves. That is
 * what makes a waxing crescent read as the MOON rather than as a shape.
 *
 * WHY IT IS GENERATED AND NOT HAND-DRAWN. Every feature is positioned from its
 * real longitude/latitude and sized from its real diameter, then projected the
 * way the near side actually appears from Earth:
 *
 *   x = 100 + 100·cos(lat)·sin(lon)      (east positive, so east is to the RIGHT
 *   y = 100 − 100·sin(lat)                — the naked-eye view from the north)
 *
 * and foreshortened: a feature at angular distance d from the disc centre is
 * squashed along the radial direction by cos(d) = √(1−ρ²) and untouched across
 * it. That is why Mare Crisium comes out as a narrow oval hard against the
 * eastern limb and Grimaldi as a thin slit, exactly as they look in a
 * photograph — geometry the eye recognises immediately and which is very hard
 * to fake by hand.
 *
 * Randomness is seeded, so the file is byte-stable across builds and does not
 * churn the repo.
 */

/* ---- palette: warm cream/tan, matched to a real full-moon photograph ------
 * An earlier pass used raw albedo contrast (maria at half the highland
 * brightness) in the site's blue-grey family; against a photo that reads as
 * harsh slate blotches. A camera pointed at a full moon meters on the bright
 * highlands, so the whole disc comes out warm ivory and the maria sit only
 * ~15–25% darker — that gentler, warmer grading is what these values copy. */
const C = {
  highland: "#f7edd3",
  highlandLimb: "#d8c9a4",
  mare: "#c0b190",
  mareDeep: "#ab9b78",
  rim: "#fdf8e6",
  shade: "#c3b493",
  ray: "#fffdf0",
};

/* ---- projection ---------------------------------------------------------- */
const RAD = Math.PI / 180;
/* 1 unit = 17.37 km (the moon's 1737 km radius maps to 100 units) */
const KM = 100 / 1737;

/** Selenographic (lon°E, lat°N) → disc coords, plus the foreshortening frame. */
function project(lon, lat) {
  const la = lat * RAD, lo = lon * RAD;
  const x = 100 + 100 * Math.cos(la) * Math.sin(lo);
  const y = 100 - 100 * Math.sin(la);
  const dx = x - 100, dy = y - 100;
  const rho = Math.min(1, Math.hypot(dx, dy) / 100);
  return {
    x, y, rho,
    /* how much a feature is squashed toward the limb, and along which axis */
    squash: Math.sqrt(Math.max(0, 1 - rho * rho)),
    angle: Math.atan2(dy, dx) / RAD,
    /* the far side is never visible */
    visible: Math.cos(la) * Math.cos(lo) > 0.02,
  };
}

/** An ellipse for a round feature of `km` diameter at (lon,lat), foreshortened. */
function blob(lon, lat, km, attrs = "") {
  const p = project(lon, lat);
  if (!p.visible) return "";
  const r = (km * KM) / 2;
  const rx = Math.max(0.4, r * p.squash), ry = Math.max(0.4, r);
  return `<ellipse cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${p.angle.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})"${attrs ? " " + attrs : ""}/>`;
}

/* ---- the maria ------------------------------------------------------------
 * Each sea is several overlapping lobes rather than one ellipse — real maria
 * are irregular basins, and projecting each lobe separately gives an outline
 * that deforms correctly near the limb instead of staying a tidy oval.
 * [lon, lat, diameter km] */
const MARIA = {
  /* Imbrium is a circular impact basin — one big lobe with smaller ones round
     the rim, not a cluster of equal blobs (that read as bubbles). */
  imbrium: [[-17, 33, 1010], [-28, 39, 520], [-6, 27, 500], [-24, 22, 400],
    [-33, 30, 400], [-9, 40, 420], [-19, 44, 360]],
  serenitatis: [[17, 27, 660], [23, 22, 400], [11, 33, 400], [20, 33, 380]],
  tranquillitatis: [[30, 8, 720], [39, 2, 500], [23, 14, 520], [34, 15, 420],
    [26, -1, 420], [42, 10, 360]],
  crisium: [[59, 17, 540], [57, 13, 440], [61, 21, 400]],
  fecunditatis: [[51, -8, 690], [54, -15, 480], [48, -2, 470], [56, -6, 400]],
  nectaris: [[34, -15, 340], [36, -19, 250], [32, -11, 240]],
  nubium: [[-17, -21, 610], [-9, -17, 420], [-24, -25, 400], [-13, -26, 380]],
  humorum: [[-39, -24, 390], [-41, -28, 270], [-37, -20, 260]],
  cognitum: [[-23, -10, 340], [-19, -12, 240]],
  insularum: [[-31, 8, 450], [-25, 4, 340], [-35, 13, 300]],
  vaporum: [[3, 13, 250], [8, 15, 190]],
  aestuum: [[-9, 12, 280]],
  /* a long thin arc along the northern limb — kept narrow on purpose, it is a
     ribbon, and a first pass merged it into Imbrium */
  frigoris: [[-44, 50, 210], [-37, 53, 250], [-30, 55, 220], [-23, 57, 260],
    [-16, 58, 220], [-9, 58, 255], [-2, 59, 215], [5, 58, 250], [12, 57, 220],
    [19, 55, 245], [26, 53, 215], [33, 50, 230], [-51, 47, 200]],
  procellarum: [[-56, 18, 800], [-51, 33, 660], [-62, 3, 600], [-44, 9, 540],
    [-65, 25, 520], [-47, 25, 520], [-55, -7, 440], [-42, 39, 420], [-69, 13, 400],
    [-58, 40, 380], [-50, -2, 420], [-66, 34, 340]],
  iridum: [[-32, 45, 260]],
  somniorum: [[31, 38, 370]],
  anguis: [[68, 23, 150]],
  undarum: [[69, 7, 240]],
  spumans: [[65, 1, 150]],
  marginis: [[86, 13, 360]],
  smythii: [[87, 2, 400]],
  australe: [[93, -40, 600]],
  humboldtianum: [[81, 57, 270]],
  lacusMortis: [[27, 45, 150]],
};

/* Craters worth naming: the ones a viewer can actually pick out.
 * [lon, lat, diameter km, kind]
 *   dark  — a lava-flooded floor, reads as a dark spot (Plato, Grimaldi)
 *   bright— a young crater with a bright rim (Aristarchus, Proclus)
 *   plain — a rim ring on the highlands */
const CRATERS = [
  [-9, 51, 101, "dark"], [-68, -6, 222, "dark"], [-40, -18, 110, "dark"],
  [-4, 30, 83, "dark"], [-3, -13, 119, "plain"], [-2, -18, 97, "plain"],
  [-20, 10, 93, "bright"], [-11, -43, 85, "bright"], [-38, 8, 32, "bright"],
  [-47, 24, 40, "bright"], [47, 16, 28, "bright"], [17, 3, 18, "bright"],
  [-14, -58, 231, "plain"], [-22, -50, 145, "plain"], [-5, -33, 234, "plain"],
  [1, -33, 132, "plain"], [6, -41, 126, "plain"], [14, -42, 114, "plain"],
  [4, -11, 114, "plain"], [5, -6, 150, "plain"], [-2, -9, 153, "plain"],
  [26, -11, 100, "plain"], [33, -21, 124, "plain"], [32, -30, 88, "plain"],
  [61, -9, 132, "plain"], [61, -25, 177, "plain"], [-55, -44, 227, "plain"],
  [17, 50, 87, "plain"], [16, 44, 67, "plain"], [30, 32, 95, "plain"],
  [-22, -21, 61, "plain"], [-14, -30, 97, "plain"], [9, 15, 39, "bright"],
  [16, 16, 27, "bright"], [-69, -67, 303, "plain"], [-25, -55, 118, "plain"],
  [24, -25, 100, "plain"], [-8, -58, 100, "plain"], [42, -44, 120, "plain"],
  [-33, -13, 42, "plain"], [-58, 34, 60, "plain"], [-8, 41, 60, "plain"],
];

/* The great ray systems — the brightest thing on a full moon and the reason a
 * full moon doesn't read as a flat grey disc. Each is a young impact whose
 * ejecta was flung across the surface; Tycho's reaches most of the way over the
 * near side.
 *
 * THESE ARE DRAWN OVER THE MARIA, NOT UNDER. Every one of these craters is far
 * YOUNGER than the basalt it lies on, so its ejecta sits on top of the sea —
 * which is exactly why you can watch Tycho's rays run straight across Mare
 * Nubium and Serenitatis in any photograph. A first pass painted them
 * underneath, on the reasoning that basalt overprints highland dust, and it
 * buried the single most recognisable feature on the disc.
 * [lon, lat, count, length units, width, opacity] */
const RAYS = [
  [-11, -43, 20, 132, 2.0, 0.70],  /* Tycho — dominant, reaches the far highlands */
  [-20, 10, 13, 54, 1.7, 0.44],    /* Copernicus */
  [-38, 8, 10, 36, 1.5, 0.38],     /* Kepler     */
  [-47, 24, 11, 40, 1.6, 0.46],    /* Aristarchus — the brightest spot on the moon */
  [47, 16, 9, 30, 1.3, 0.38],     /* Proclus    */
  [-63, -25, 9, 30, 1.2, 0.28],    /* Byrgius A  */
  [-10, 74, 8, 24, 1.1, 0.24],     /* Anaxagoras */
  [52, -32, 8, 26, 1.1, 0.26],     /* Stevinus A */
  [61, -33, 7, 22, 1.1, 0.23],     /* Furnerius A */
  [50, 62, 7, 20, 1.1, 0.23],      /* Thales     */
  [-78, 8, 7, 20, 1.1, 0.22],      /* Glushko    */
  [1, 31, 7, 18, 1.0, 0.22],       /* Autolycus  */
  [-50, -61, 7, 22, 1.1, 0.24],    /* Zucchius   */
  [24, -25, 7, 18, 1.0, 0.21],     /* Madler     */
];

/* The bright ejecta apron each of those craters sits in — a diffuse splash of
 * pulverised rock, brighter than anything around it. Without it the rays read
 * as lines drawn on the surface instead of debris thrown out of a hole.
 * [lon, lat, radius units, opacity] */
const APRONS = RAYS.map(([lon, lat, , len, , op]) => [lon, lat, len * 0.26, Math.min(0.22, op * 0.5)]);

/* Small craters that are simply BRIGHT — fresh, high-albedo spots that catch
 * the eye on a full moon even without a ray system. [lon, lat, km] */
const SPARKS = [
  [47, -2, 11], [48, -2, 11],   /* Messier & Messier A — the twin "comet tail" */
  [32, -0.4, 4], [17, 3, 18],   /* Censorinus, Dionysius */
  [16, 16, 27], [9, 15, 39],    /* Menelaus, Manilius — bright on the dark sea */
  [-8, 41, 60], [1, 34, 55],    /* Cassini area, Aristillus */
  [-58, 34, 60], [-43, -13, 40],
  [20, -9, 25], [-3, -58, 45], [-30, -70, 50], [12, -76, 40],
];

/* deterministic PRNG — the sprite must be byte-identical on every build */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function maria() {
  let out = "";
  for (const lobes of Object.values(MARIA)) {
    for (const [lon, lat, km] of lobes) out += blob(lon, lat, km);
  }
  return out;
}

/* Scattered small craters over the highlands. The southern highlands are the
 * most heavily cratered ground on the near side, so density is weighted by
 * latitude — that contrast is a big part of why the moon looks like the moon. */
function speckle() {
  const rand = rng(20260730);
  let fills = "", rims = "";
  for (let i = 0; i < 230; i++) {
    const lon = (rand() * 2 - 1) * 88, lat = (rand() * 2 - 1) * 82;
    const p = project(lon, lat);
    if (!p.visible || p.rho > 0.985) continue;
    /* skip the smooth mare floors — craters there are sparse and young */
    if (inMare(lon, lat)) { if (rand() > 0.14) continue; }
    /* southern highlands: denser and older */
    if (lat > -10 && rand() > 0.55) continue;
    const km = 14 + rand() * 44;
    const r = (km * KM) / 2;
    const rx = Math.max(0.35, r * p.squash);
    const g = `cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${rx.toFixed(1)}" ry="${r.toFixed(1)}" transform="rotate(${p.angle.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})"`;
    fills += `<ellipse ${g}/>`;
    /* the larger anonymous craters get the same bright ring the named ones
       have — that circle-with-a-rim repetition is what makes the photo's
       texture look cratered rather than mottled */
    if (km > 28) rims += `<ellipse ${g}/>`;
  }
  return { fills, rims };
}
/* rough "is this point on a mare" test, used only to thin out the speckle */
function inMare(lon, lat) {
  for (const lobes of Object.values(MARIA)) {
    for (const [mlon, mlat, km] of lobes) {
      const r = km * KM / 2;
      const dx = (lon - mlon) * Math.cos(lat * RAD) * (100 / 90), dy = (lat - mlat) * (100 / 90);
      if (Math.hypot(dx, dy) < r) return true;
    }
  }
  return false;
}

function craters() {
  let dark = "", bright = "", plain = "", rims = "", floors = "";
  for (const [lon, lat, km, kind] of CRATERS) {
    const p = project(lon, lat);
    if (!p.visible) continue;
    const r = (km * KM) / 2;
    const rx = Math.max(0.5, r * p.squash);
    const at = (f) => `cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${(rx * f).toFixed(1)}" ry="${(r * f).toFixed(1)}" transform="rotate(${p.angle.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})"`;
    const g = at(1);
    if (kind === "dark") dark += `<ellipse ${g}/>`;
    else if (kind === "bright") bright += `<ellipse ${g}/>`;
    else plain += `<ellipse ${g}/>`;
    /* every named crater gets its bright rim — in a full-moon photo that ring
       IS the crater; without it they read as smudges */
    if (r > 0.8) rims += `<ellipse ${g}/>`;
    /* the big walled plains get a slightly sunken inner floor, so at hero size
       they read as dishes (ring–moat–floor) instead of flat discs */
    if (kind === "plain" && r > 2.6) floors += `<ellipse ${at(0.62)}/>`;
  }
  return { dark, bright, plain, rims, floors };
}

function aprons() {
  let out = "";
  for (const [lon, lat, r, op] of APRONS) {
    const p = project(lon, lat);
    if (!p.visible) continue;
    out += `<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${(r * p.squash * 0.55 + r * 0.45).toFixed(1)}" opacity="${op.toFixed(2)}"/>`;
  }
  return out;
}

function sparks() {
  let out = "";
  for (const [lon, lat, km] of SPARKS) {
    const p = project(lon, lat);
    if (!p.visible) continue;
    const r = Math.max(0.7, (km * KM) / 2);
    out += `<ellipse cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${(r * p.squash).toFixed(1)}" ry="${r.toFixed(1)}" transform="rotate(${p.angle.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})"/>`;
  }
  return out;
}

function rays() {
  let out = "";
  for (const [lon, lat, n, len, w, op] of RAYS) {
    const p = project(lon, lat);
    if (!p.visible) continue;
    const rand = rng(Math.round((lon + 200) * 977 + (lat + 200)));
    /* Each ray is a chain of segments, thinning and fading outward. A single
       uniform stroke per ray read as a laser beam; real ejecta is dense at the
       crater and peters out, so the taper is what makes it look like debris. */
    const STEPS = 3;
    let g = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI + rand() * 0.55;
      const L = len * (0.52 + rand() * 0.48);
      const wob = (rand() - 0.5) * 0.16;   /* rays are not perfectly radial */
      for (let k = 0; k < STEPS; k++) {
        const t0 = k / STEPS, t1 = (k + 1) / STEPS;
        const a0 = a + wob * t0, a1 = a + wob * t1;
        const x1 = p.x + Math.cos(a0) * L * t0, y1 = p.y + Math.sin(a0) * L * t0;
        const x2 = p.x + Math.cos(a1) * L * t1, y2 = p.y + Math.sin(a1) * L * t1;
        const fade = 1 - 0.58 * t1;                  /* bright at the crater, faint at the tip */
        const o = fade.toFixed(2).replace(/^0/, "").replace(/0$/, "");
        g += `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)}L${x2.toFixed(0)} ${y2.toFixed(0)}" stroke-width="${(w * (0.55 + rand() * 0.5) * (0.45 + 0.55 * (1 - t0))).toFixed(1)}"${fade > 0.99 ? "" : ` opacity="${o}"`}/>`;
      }
    }
    out += `<g opacity="${op}">${g}</g>`;
  }
  return out;
}

export const MOON_FACE_ID = "ac-moon-face";

/** The sprite: one hidden <svg> holding the near side, referenced by every glyph. */
export function moonFaceSprite() {
  const c = craters();
  const sp = speckle();
  const m = maria();
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>` +
    `<radialGradient id="acmf-base" cx="44%" cy="40%" r="70%">` +
      `<stop offset="0" stop-color="${C.highland}"/><stop offset=".75" stop-color="#efe3c2"/>` +
      `<stop offset="1" stop-color="${C.highlandLimb}"/></radialGradient>` +
    /* Limb darkening as a gradient, not a stroked ring. The ring version read
       as a drawn border; a sphere dims smoothly toward the edge. */
    `<radialGradient id="acmf-limb" cx="50%" cy="50%" r="50%">` +
      `<stop offset=".55" stop-color="#8a7c5c" stop-opacity="0"/>` +
      `<stop offset=".86" stop-color="#8a7c5c" stop-opacity=".13"/>` +
      `<stop offset="1" stop-color="#6f6349" stop-opacity=".42"/></radialGradient>` +
    `<filter id="acmf-soft" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur stdDeviation="1.5"/></filter>` +
    `<filter id="acmf-blur" x="-25%" y="-25%" width="150%" height="150%">` +
      `<feGaussianBlur stdDeviation="3.4"/></filter>` +
    `<clipPath id="acmf-clip"><circle cx="100" cy="100" r="100"/></clipPath>` +
    `<g id="${MOON_FACE_ID}" clip-path="url(#acmf-clip)">` +
      `<circle cx="100" cy="100" r="100" fill="url(#acmf-base)"/>` +
      /* the seas: one blurred pass to fuse the lobes into an organic outline,
         then the same shapes again crisper on top so the edges don't go woolly */
      `<g fill="${C.mareDeep}" opacity=".55" filter="url(#acmf-blur)">${m}</g>` +
      `<g fill="${C.mare}" opacity=".8" filter="url(#acmf-soft)">${m}</g>` +
      `<g fill="${C.shade}" opacity=".38">${sp.fills}</g>` +
      `<g fill="none" stroke="${C.rim}" stroke-width=".45" opacity=".5">${sp.rims}</g>` +
      `<g fill="${C.mareDeep}" opacity=".7">${c.dark}</g>` +
      `<g fill="${C.shade}" opacity=".42">${c.plain}</g>` +
      `<g fill="${C.mareDeep}" opacity=".28">${c.floors}</g>` +
      /* --- the bright stuff, ON TOP of the seas (see the RAYS note) --------
         apron first (the diffuse splash the crater sits in), then the rays
         themselves, then the hard bright cores. Painted last so the debris
         reads as thrown ACROSS the surface rather than buried under it. */
      `<g fill="${C.ray}" filter="url(#acmf-blur)">${aprons()}</g>` +
      `<g stroke="${C.ray}" fill="none" stroke-linecap="round" filter="url(#acmf-soft)">${rays()}</g>` +
      `<g fill="${C.rim}" opacity=".95">${c.bright}</g>` +
      `<g fill="${C.ray}" opacity=".6" filter="url(#acmf-soft)">${sparks()}</g>` +
      `<g fill="none" stroke="${C.rim}" stroke-width=".55" opacity=".55">${c.rims}</g>` +
      `<circle cx="100" cy="100" r="100" fill="url(#acmf-limb)"/>` +
    `</g></defs></svg>`;
}
