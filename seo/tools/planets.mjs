/* planets.mjs — where the planets are, for /solar-system-simulator/.
 *
 * THE MODEL. Keplerian elements with per-century rates (the standard JPL
 * "approximate positions of the major planets" formulation): each planet gets a
 * semi-major axis, eccentricity, inclination, mean longitude, longitude of
 * perihelion and longitude of the ascending node, each drifting linearly with
 * time. Solve Kepler's equation for the eccentric anomaly, and out come
 * heliocentric ecliptic coordinates. It is about sixty lines and eight solves
 * per frame, which is nothing — the expensive part of a solar-system diagram is
 * never the arithmetic.
 *
 * WHAT IT IS GOOD FOR. A few arcminutes over 1800–2050 (JPL's own stated
 * maxima run to about 10' for Jupiter and Saturn), which is far finer than the
 * picture can show: at Neptune's zoom a whole DEGREE of orbit spans about seven
 * pixels, so even ten arcminutes is roughly one pixel. Outside 1800–2050 the
 * linear rates degrade, which is why the date pickers stop at 2050. It is NOT
 * an ephemeris — no perturbations, no relativity — and the page says so and
 * links to the methodology pages.
 *
 * WHY THE NUMBERS ARE CHECKED RATHER THAN TRUSTED. An element table is a wall
 * of digits, and a single wrong one produces a picture that looks entirely
 * plausible and is wrong. So planets-check.mjs asserts three things this module
 * cannot fake, each against something the repo computes independently:
 *   1. Earth's heliocentric longitude must be exactly 180° from the SUN's
 *      geocentric longitude out of moon.mjs — a different series, written years
 *      earlier, for a different purpose.
 *   2. Every derived orbital period (from a^1.5) must match the known one.
 *   3. Mercury's and Venus's greatest elongations, worked out by sweeping the
 *      geocentric geometry, must land in the ranges they are famous for
 *      (18–28° and 45–47°) — which exercises BOTH planets' orbits and Earth's.
 * One transposed digit fails at least one of those.
 *
 * ONE SOURCE, TWO RUNTIMES — the moon.mjs pattern. The maths is written once as
 * an ES5 source string, inlined for the browser and instantiated through
 * `new Function` below for the build.
 */

/* ---------------------------------------------------------------------------
 * PLANETS_JS — the shared ES5 source. Everything is prefixed `pl` so it can sit
 * alongside MOON_CORE and ORRERY_JS in one script without colliding.
 * ------------------------------------------------------------------------- */
export const PLANETS_JS = `
var PL_RAD=Math.PI/180, PL_DAY=86400000, PL_J2000=2451545, PL_J1970=2440588;
/* [name, a, e, I, L, longPeri, longNode] at J2000, then the same six per
   Julian century. a in AU, angles in degrees. */
var PL_EL=[
 ['Mercury',0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593,
            0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081],
 ['Venus',  0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255,
            0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418],
 ['Earth',  1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0,
            0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0],
 ['Mars',   1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891,
            0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343],
 ['Jupiter',5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909,
            -0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106],
 ['Saturn', 9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448,
            -0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794],
 ['Uranus', 19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503,
            -0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589],
 ['Neptune',30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574,
            0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664],
 /* PLUTO IS A DWARF PLANET and the page says so wherever it appears. It is here
    because it is the one body whose orbit makes two things visible that nothing
    else on this page can: a 17-degree inclination, against the 0.8-to-7 of
    everything else, and an eccentricity that carries it inside Neptune's orbit
    for twenty years of every 248. Same JPL approximate-elements table and the
    same rates as the eight above, so check-planets proves it the same way. */
 ['Pluto',  39.48211675,0.24882730,17.14001206,238.92903833,224.06891629,110.30393684,
            -0.00031596,0.00005170,0.00004818,145.20780515,-0.04062942,-0.01183482]
];
/* mean diameters in km, for the size disclaimer and the to-scale rungs */
var PL_DIA={ Sun:1391400, Mercury:4879, Venus:12104, Earth:12742, Mars:6779,
             Jupiter:139820, Saturn:116460, Uranus:50724, Neptune:49244, Pluto:2377, Moon:3474 };
var PL_AU=149597870;

function plCent(ms){ return (ms/PL_DAY - 0.5 + PL_J1970 - PL_J2000)/36525; }
function plWrap(d){ return ((d%360)+360)%360; }

/* Kepler's equation, Newton–Raphson. The eccentricities here top out at Mercury's
   0.206, where six iterations are already past double precision. */
function plKepler(M,e){
  var E=M+e*Math.sin(M), i, dE;
  for(i=0;i<8;i++){
    dE=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
    E-=dE; if(Math.abs(dE)<1e-12) break;
  }
  return E;
}

/* Heliocentric ecliptic position of one planet, in AU: {x,y,z,lon,lat,r}.
   x points at the March equinox, z at the north ecliptic pole. */
function plPos(idx,ms){
  var p=PL_EL[idx], T=plCent(ms);
  var a=p[1]+p[7]*T, e=p[2]+p[8]*T, I=(p[3]+p[9]*T)*PL_RAD;
  var L=p[4]+p[10]*T, w=p[5]+p[11]*T, O=(p[6]+p[12]*T)*PL_RAD;
  var argPeri=(w-p[6]-p[12]*T)*PL_RAD;               /* omega = long.peri - node */
  var M=plWrap(L-w); if(M>180) M-=360; M*=PL_RAD;
  var E=plKepler(M,e);
  /* position in the orbital plane, perifocal coordinates */
  var xo=a*(Math.cos(E)-e), yo=a*Math.sqrt(1-e*e)*Math.sin(E);
  var cw=Math.cos(argPeri), sw=Math.sin(argPeri), cO=Math.cos(O), sO=Math.sin(O),
      cI=Math.cos(I), sI=Math.sin(I);
  var x=(cw*cO-sw*sO*cI)*xo+(-sw*cO-cw*sO*cI)*yo;
  var y=(cw*sO+sw*cO*cI)*xo+(-sw*sO+cw*cO*cI)*yo;
  var z=(sw*sI)*xo+(cw*sI)*yo;
  var r=Math.sqrt(x*x+y*y+z*z);
  return { x:x, y:y, z:z, r:r, a:a, e:e,
           lon:plWrap(Math.atan2(y,x)/PL_RAD), lat:Math.asin(z/r)/PL_RAD };
}
function plName(idx){ return PL_EL[idx][0]; }
/* Kepler's third law: the period falls out of the axis, so the "how far does it
   get in a decade" copy cannot disagree with the drawing. */
function plPeriodDays(idx){ var a=PL_EL[idx][1]; return 365.256898*Math.pow(a,1.5); }
`;

/* ---------------------------------------------------------------------------
 * The Node side. Same source string, instantiated once — not a reimplementation.
 * ------------------------------------------------------------------------- */
const P = new Function(`${PLANETS_JS}
return { plPos, plName, plPeriodDays, plCent, PL_EL, PL_DIA, PL_AU };`)();

export const planetPos = (idx, ms) => P.plPos(idx, +ms);
export const planetName = (idx) => P.plName(idx);
export const planetPeriodDays = (idx) => P.plPeriodDays(idx);
export const PL_EL = P.PL_EL;
export const PL_DIA = P.PL_DIA;
export const PL_AU = P.PL_AU;
/** index of each planet, for callers that would rather not count */
export const PLANET = { MERCURY: 0, VENUS: 1, EARTH: 2, MARS: 3, JUPITER: 4, SATURN: 5, URANUS: 6, NEPTUNE: 7 };


/* ---------------------------------------------------------------------------
 * THE ZOOM LADDER, as data.
 *
 * It lives here rather than inside the JS source string because build-solar
 * writes copy ABOUT the ladder — how many pixels across Mercury's orbit is at
 * each rung, which view can be to scale — and that copy and the drawing have to
 * come from one table or they drift. The source string below is generated from
 * this array, so there is exactly one ladder.
 *
 * kind:  'sys'   the planets, orbits to scale, bodies not
 *        'em'    Earth and the Moon, to scale in size AND distance
 *        'moons' one planet's moon system, the frame set by the moons
 * outer: the AU at the edge of the frame ('sys' only)
 * n:     how many planets are drawn ('sys' only)
 * ------------------------------------------------------------------------- */
export const RUNGS = [
  { id: "moon", label: "Earth & the Moon", kind: "em", outer: 0, n: 0, planet: 2 },
  { id: "inner", short: "Inner planets", label: "The inner planets", kind: "sys", outer: 1.62, n: 4, planet: -1 },
  /* MARS'S OWN FRAME. Not on the solar page's ladder (zoomRungs filters on
     `ladder`) — it exists so /rocket-launches/ can frame a flight to Mars.
     1.72 AU clears Mars's aphelion at 1.666 with a margin for the label, and
     the transfer's own aphelion is at Mars's orbit, so the whole arc fits. */
  { id: "mars", short: "To Mars", label: "Out to Mars", kind: "sys", outer: 1.72, n: 4, planet: -1, ladder: 0 },
  { id: "belt", short: "To the belt", label: "Out to the asteroid belt", kind: "sys", outer: 3.75, n: 4, planet: -1 },
  { id: "jupiter", short: "To Jupiter", label: "Out to Jupiter", kind: "sys", outer: 5.75, n: 5, planet: -1 },
  { id: "saturn", short: "To Saturn", label: "Out to Saturn", kind: "sys", outer: 10.3, n: 6, planet: -1 },
  { id: "neptune", short: "To Neptune", label: "Out to Neptune", kind: "sys", outer: 31.5, n: 8, planet: -1 },
  /* Pluto's aphelion is 49.3 AU, so the frame has to reach past it — and at that
     zoom the inner four are a single knot, which is the honest shape of it. */
  { id: "pluto", short: "To Pluto", label: "Out to Pluto (a dwarf planet)", kind: "sys", outer: 50, n: 9, planet: -1 },
  { id: "mars-moons", label: "Mars: Phobos & Deimos", kind: "moons", outer: 0, n: 0, planet: 3 },
  { id: "jupiter-moons", label: "Jupiter: the Galilean moons", kind: "moons", outer: 0, n: 0, planet: 4 },
  { id: "saturn-moons", label: "Saturn: the rings & Titan", kind: "moons", outer: 0, n: 0, planet: 5 },
  { id: "uranus-moons", label: "Uranus: Titania & Miranda", kind: "moons", outer: 0, n: 0, planet: 6 },
  { id: "neptune-moons", label: "Neptune: Triton", kind: "moons", outer: 0, n: 0, planet: 7 },
  { id: "pluto-moons", label: "Pluto: Charon & the small four", kind: "moons", outer: 0, n: 0, planet: 8 },
];

/* THE FRAME IS SQUARE, and that is not a style choice. Everything drawn here is
 * a set of concentric circles, so a 16:9 frame throws away a third of the
 * drawable radius to hold the corners of a picture that has none — the orbits
 * are limited by the SHORT side. Squaring the frame at the same height buys
 * about 40% more radius, which on the outer rungs is the difference between
 * Mercury's orbit being 4 pixels across and 6. */
export const SOL_FRAME = { w: 900, h: 900, pad: 26 };
/** usable drawing radius in px — every scale figure in the copy comes from this */
export const FRAME_R = SOL_FRAME.w / 2 - SOL_FRAME.pad;

/* THE EARTH & MOON RUNG, in drawn units. That view is the only one on the site
   to scale in size AND distance at once, so its scale is not a choice: put the
   moon's mean orbit at the frame's usable radius and the Earth's diameter falls
   out of it. Exported because /classroom/ quotes the figure, and interpolated
   INTO the drawing below so there is one source rather than a constant here and
   a formula there — the same reason build-classroom imports it rather than
   typing it. The 16 is the room left for the moon's own disc and locator ring. */
export const EM_ORBIT_PX = SOL_FRAME.w / 2 - SOL_FRAME.pad - 16;
export const EM_EARTH_PX = EM_ORBIT_PX / (384400 / 12742);
export const EM_MOON_PX = EM_EARTH_PX * 3474 / 12742;

/* ---------------------------------------------------------------------------
 * SOLAR_JS — the drawing. Kept beside the maths because the rung definitions
 * ARE the honest-scale story: which view can be to scale and which cannot is
 * decided by the numbers above, not by taste.
 *
 * It calls out to three other modules' sources, which the page concatenates
 * before this one: satView (satellites.mjs) for a moon system, smBeltLayer and
 * smCometLayer (smallbodies.mjs), and trLayer (transfer.mjs) for a flight path.
 * They are separate modules because each is a separate body of data with its
 * own checks; they are one script because they draw into one picture.
 * ------------------------------------------------------------------------- */
export const SOLAR_JS = `
var SOL_RUNGS=${JSON.stringify(RUNGS.map((r) => [r.id, r.label, r.outer, r.n, r.kind, r.planet]))};
var SOL_SPANS=[['month','Month',30],['year','Year',365.25],['decade','Decade',3652.5],['century','Century',36525]];
/* drawn radius per body, in px. Nothing here is to scale with anything else on
   the planetary rungs — Jupiter is a fraction of a pixel across at Saturn's
   zoom — so these are legibility sizes, and the page says so. */
var SOL_R={Sun:15,Mercury:3.5,Venus:5,Earth:5,Mars:4,Jupiter:10,Saturn:9,Uranus:7,Neptune:7,Pluto:3};
var SOL_COL={Sun:'#fcd34d',Mercury:'#b8b3ab',Venus:'#e6c98a',Earth:'#4a90c8',Mars:'#c86a4a',
             Jupiter:'#d9a878',Saturn:'#e3cd9a',Uranus:'#8fd0da',Neptune:'#6b8fd8',Pluto:'#c9b7a8',Moon:'#d8dee9'};
/* where a click on this planet's dot or orbit ring goes, and whether the
   tooltip should say "and its moons" — SOL_HASMOON is exactly the set of
   planets with a moons rung in SOL_RUNGS (mars/jupiter/saturn/uranus/
   neptune/pluto); Earth's own moon lives on the "moon" rung instead, which
   is why Earth is not in this table. */
var SOL_SLUG={Mercury:'mercury',Venus:'venus',Earth:'earth',Mars:'mars',Jupiter:'jupiter',
              Saturn:'saturn',Uranus:'uranus',Neptune:'neptune',Pluto:'pluto'};
var SOL_HASMOON={Mars:1,Jupiter:1,Saturn:1,Uranus:1,Neptune:1,Pluto:1};
var SOL_ZINC=12;      /* degrees: how tilted a small orbit is drawn once lifted */
var SOL_W=${SOL_FRAME.w}, SOL_H=${SOL_FRAME.h}, SOL_CX=${SOL_FRAME.w / 2}, SOL_CY=${SOL_FRAME.h / 2}, SOL_PAD=${SOL_FRAME.pad};
/* THE CAPTIONS SIT AT THE TOP OF THESE TWO FRAMES, not the foot, because Now /
   Full screen / Play now ride on the bottom-right of the picture. Reserving a
   band at the bottom cannot work: the overlay is sized in CSS pixels and the
   drawing is scaled, so on a 390px phone those buttons cover 129 SVG units and
   on a desktop 41 — no fixed offset clears both. The top of both views is empty
   sky at every size, and nothing is ever drawn over it. */

function solF(n){ return Math.round(n*10)/10; }
function solEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function solRung(id){ for(var i=0;i<SOL_RUNGS.length;i++) if(SOL_RUNGS[i][0]===id) return SOL_RUNGS[i]; return SOL_RUNGS[1]; }
/* lighten (pct>0) or darken (pct<0) a hex colour, so a flat dot can carry a
   highlight and a rim shadow instead of reading as a punched-out circle —
   the cheapest way to say "sphere" without a real light model. */
function solShade(hex,pct){
  var n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  var t=pct<0?0:255, p=Math.abs(pct);
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+('000000'+(((r<<16)|(g<<8)|b)>>>0).toString(16)).slice(-6);
}

/* one planet's orbit as a path, sampled from the same solver that places it, so
   the ring and the dot can never disagree */
/* THE PROJECTION, and the only place the view tilt is applied.
   tl=0 is straight down on the plane — every orbit a true circle-ish ellipse,
   every drawn angle equal to the longitude in the read-out. Tilting rotates the
   scene about the screen's horizontal axis: what was depth (z, the height above
   Earth's orbital plane) turns into screen height, which is the ONLY way an
   inclination can be seen at all. The third value returned is depth away from
   the eye, larger = further, and it is what lets the far half of an orbit be
   drawn dimmer than the near half. */
function solPrj(x,y,z,k,ct,st){
  return [ SOL_CX+k*x, SOL_CY-k*(y*ct+z*st), y*st-z*ct ];
}
/* THE EXAGGERATION HAS A CEILING, per orbit rather than one factor for all.
   Multiplying every inclination by the same number was fine while they ran 0.8
   to 7 degrees; Pluto's is 17, and x8 of that is a wheel standing on its edge.
   Each orbit is instead lifted only as far as a common visible tilt, so the
   small ones become legible and the ones that are already legible are drawn
   true. Pluto is therefore the one orbit on the picture that is never
   exaggerated at all, which is worth knowing about it. */
function solZCap(idx,zk){
  var inc=Math.abs(PL_EL[idx][3]);
  if(inc<0.01) return 1;
  return Math.max(1,Math.min(zk,SOL_ZINC/inc));
}
function solOrbitZ(idx,ms,k,ct,st,zk){
  zk=solZCap(idx,zk||1);
  var p=PL_EL[idx], T=plCent(ms), pts=[], i;
  var a=p[1]+p[7]*T, e=p[2]+p[8]*T, I=(p[3]+p[9]*T)*PL_RAD;
  var w=p[5]+p[11]*T, O=(p[6]+p[12]*T)*PL_RAD, argPeri=(w-p[6]-p[12]*T)*PL_RAD;
  var cw=Math.cos(argPeri), sw=Math.sin(argPeri), cO=Math.cos(O), sO=Math.sin(O),
      cI=Math.cos(I), sI=Math.sin(I);
  for(i=0;i<=120;i++){
    var E=i/120*2*Math.PI;
    var xo=a*(Math.cos(E)-e), yo=a*Math.sqrt(1-e*e)*Math.sin(E);
    var x=(cw*cO-sw*sO*cI)*xo+(-sw*cO-cw*sO*cI)*yo;
    var y=(cw*sO+sw*cO*cI)*xo+(-sw*sO+cw*cO*cI)*yo;
    /* z was computed and thrown away here for as long as this function has
       existed; it is the whole of the inclination and it costs one line */
    var z=(sw*sI)*xo+(cw*sI)*yo;
    pts.push(solPrj(x,y,z*zk,k,ct,st));
  }
  return pts;
}
/* An orbit as one polyline, faded from far to near rather than switched.
   THE FADE IS A GRADIENT, NOT TWO OPACITIES. Splitting each orbit into a bright
   near half and a dim far half put a visible seam at the two points where the
   ring crosses the horizon, and made a smooth ellipse look like two arcs of
   different colours. A vertical gradient does the same job continuously, and it
   is not an approximation: for anything lying IN the plane, depth works out as
   y.sin(tilt) while screen height works out as -y.cos(tilt), so depth is exactly
   proportional to how far up the frame a point sits. One gradient per colour,
   spanning the frame, therefore encodes depth correctly for every orbit at once
   — and shallower for the inner ones, which is also right, because they have
   less depth to span. */
function solOrbitSvg(pts,col,tilted,gid,nm){
  var i, run=[];
  for(i=0;i<pts.length;i++) run.push(solF(pts[i][0])+','+solF(pts[i][1]));
  /* clickable/hoverable only when drawn for a real planet (nm set) — the
     ring and its own dot share data-sol-planet so hovering either one can
     light up both, and the click target for both is the same planet page */
  var attrs=nm?' class="sol-oring" data-sol-planet="'+nm+'"':'';
  if(!tilted) return '<polyline points="'+run.join(' ')+'" fill="none" stroke="'+col+'" stroke-opacity=".38" stroke-width="1"'+attrs+'/>';
  return '<polyline points="'+run.join(' ')+'" fill="none" stroke="url(#'+gid+')" stroke-width="1.15"'+attrs+'/>';
}

/* THE EARTH-AND-MOON RUNG. The only view on the site that is to scale in both
   size and distance at once: the moon sits 30 Earth-diameters away, which fits
   a frame this wide with room to spare. Everything else has to cheat, and the
   contrast is the point. */
function solMoonView(ms,tl){
  var d=mnDays(ms), m=mnMoonPos(d), sp=mnSunPos(d);
  function eclLon(ra,dec){ return Math.atan2(Math.sin(ra)*Math.cos(MN_OBL)+Math.tan(dec)*Math.sin(MN_OBL),Math.cos(ra)); }
  var mlon=eclLon(m.ra,m.dec), slon=eclLon(sp.ra,sp.dec);
  var rho=3*Math.PI/4-slon;                    /* sun pinned up-left, as elsewhere */
  var ORR_SUNA=3*Math.PI/4;                    /* ...so up-left is where the light is */
  /* THE SCALE IS FIXED BY THE MEAN ORBIT, NOT BY WHAT LOOKS GOOD. Put the moon's
     average distance at the frame's usable radius and everything else follows:
     the Earth comes out about ${Math.round(EM_EARTH_PX)} units across and the
     moon under ${Math.ceil(EM_MOON_PX)}. That is not
     a drawing choice — it is what 30 Earth-diameters of empty space does to a
     picture, and it is the reason this rung exists. The locator rings are the
     concession: without them the moon is genuinely hard to find, which is
     itself the point. */
  var perDia=${EM_EARTH_PX};                     /* see EM_EARTH_PX above */
  var R=perDia/2, mr=perDia*3474/12742/2;
  var dist=m.dist/12742*perDia;                /* the REAL distance right now    */
  /* the moon's orbit, seen at the page's own view tilt: the circle becomes an
     ellipse and the moon rides it, so at full tilt you are looking along the
     plane the two of them share rather than straight down onto it */
  var vct=Math.cos(tl||0);
  var mang=mlon+rho;
  var mx=SOL_CX+dist*Math.cos(mang), my=SOL_CY-dist*Math.sin(mang)*vct;
  var K=Math.SQRT1_2, out='';
  out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(dist)+'" ry="'+solF(dist*vct)+'" fill="none" stroke="#94a3b8" stroke-opacity=".3" stroke-width="1" stroke-dasharray="3 5"/>';
  /* NO LOCATOR RING ON THE EARTH. It used to have one at r=20 against the moon's
     at r=14, and those two rings — not the discs inside them — were what the eye
     compared, which made the moon look very nearly Earth-sized on a picture
     whose entire claim is that it is to scale. The discs are exact (13.5 units
     against 3.7, a ratio of 0.2726 against the real 0.2726); the rings were
     lying about them. The Earth needs no locating anyway: it is in the middle,
     it is labelled, and it is the biggest thing here. */
  /* THE EARTH IS THE GLOBE, not a flat blue disc with a bite out of it. Same
     drawing the planet pages use — real rotation rate, real 23.44-degree tilt,
     schematic continents — so at this zoom you can watch it turn underneath the
     moon going round, which is the one relationship this view exists for. */
  out+=(typeof glSvg==='function'
    ? glSvg('Earth',ms,SOL_CX,SOL_CY,R,23.9345,ORR_SUNA)
    : '<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF(R)+'" fill="#2f74ad"/>'
      + '<path d="M'+solF(SOL_CX+R*K)+' '+solF(SOL_CY-R*K)+'A'+solF(R)+' '+solF(R)+' 0 0 1 '+solF(SOL_CX-R*K)+' '+solF(SOL_CY+R*K)+'Z" fill="#050a16" fill-opacity=".84"/>');
  /* the moon keeps one, because at 3.7 units across it is genuinely hard to
     find — but dashed and tight, so it reads as a pointer rather than as a body */
  out+='<circle cx="'+solF(mx)+'" cy="'+solF(my)+'" r="9" fill="none" stroke="#cbd5e1" stroke-opacity=".38" stroke-dasharray="2 3"/>'
     + '<circle cx="'+solF(mx)+'" cy="'+solF(my)+'" r="'+solF(mr)+'" fill="#4b5563"/>'
     + '<path d="M'+solF(mx+mr*K)+' '+solF(my-mr*K)+'A'+solF(mr)+' '+solF(mr)+' 0 0 0 '+solF(mx-mr*K)+' '+solF(my+mr*K)+'Z" fill="#e8eef7"/>';
  out+='<text x="'+SOL_CX+'" y="'+(SOL_CY+38)+'" text-anchor="middle" font-size="13" fill="#e2e8f0">Earth</text>';
  out+='<text x="'+solF(mx)+'" y="'+solF(my-22)+'" text-anchor="middle" font-size="13" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">Moon</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+4)+'" font-size="13" fill="#fcd34d">Sunlight arrives from here</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+24)+'" font-size="12" fill="#94a3b8">Both bodies AND the gap between them are to scale here \\u2014 the only view on this page that is.</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+40)+'" font-size="12" fill="#94a3b8">That is why they are so small: the moon sits about 30 Earth-diameters away. The dashed ring is only a pointer to the moon, not its size.</text>';
  return out;
}

/* THE PLANETARY RUNGS. Orbits to scale, bodies not. opt turns the extra layers
   on: the belt, the comets, and a flight path to one of the planets. */
function solSystemView(ms,rung,opt){
  opt=opt||{};
  var outer=rung[2], n=rung[3], k=(SOL_W/2-SOL_PAD)/outer, i, out='';
  /* THE VIEW TILT. 0 = straight down on the plane, which is the default and the
     only angle at which a drawn angle equals the longitude printed beside it.
     Every other value trades that for the one thing the flat view can never
     show: that the orbits do not all lie in the same plane. */
  var tl=(+opt.tilt||0)*PL_RAD, ct=Math.cos(tl), st=Math.sin(tl), tilted=tl>0.01;
  /* the exaggeration, when asked for. Real inclinations are 0.8-7 degrees, so
     at any tilt gentle enough to keep the picture readable they are a couple of
     pixels; this multiplies the HEIGHT off the plane and nothing else, and the
     page says so in words next to the control. */
  var zk=+opt.tiltExag||1;
  /* The belt, the comets and the flight path are all drawn IN the plane, so one
     vertical squash about the centre tilts them exactly — no per-layer maths,
     and they cannot fall out of step with the orbits. */
  var flat0='<g transform="translate(0 '+solF(SOL_CY*(1-ct))+') scale(1 '+solF(ct)+')">', flat1='</g>';
  if(opt.belt) out+=(tilted?flat0:'')+smBeltLayer(ms,outer,k)+(tilted?flat1:'');
  /* the plane itself, faintly: a set of tilted rings needs something to be
     tilted AGAINST or it reads as a pile of ellipses */
  if(tilted) for(i=1;i<=4;i++)
    out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(k*outer*i/4)+'" ry="'+solF(k*outer*i/4*ct)+'" fill="none" stroke="#e2e8f0" stroke-opacity=".07"/>';
  out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+(SOL_R.Sun+11)+'" fill="#fcd34d" fill-opacity=".18"/>';
  out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+SOL_R.Sun+'" fill="'+SOL_COL.Sun+'"/>';
  out+='<text x="'+SOL_CX+'" y="'+(SOL_CY+SOL_R.Sun+18)+'" text-anchor="middle" font-size="12" fill="#fcd34d">Sun</text>';
  var marks=[];
  /* one radial gradient per planet, always — a highlight near the upper-left
     and a darker rim, so the body reads as a lit sphere instead of a flat
     punched-out dot. objectBoundingBox keys it to each circle's own box, so
     the same three stops work whatever the drawn radius. Tilted rungs ALSO
     get the far-to-near linear fade on the ORBIT (unchanged); the two are
     independent and both live in one <defs> block. */
  out+='<defs>';
  for(i=0;i<n;i++){
    var gn=plName(i);
    out+='<radialGradient id="pg'+i+'" gradientUnits="objectBoundingBox" cx=".35" cy=".32" r=".75">'
      +'<stop offset="0" stop-color="'+solShade(SOL_COL[gn],.55)+'"/>'
      +'<stop offset=".55" stop-color="'+SOL_COL[gn]+'"/>'
      +'<stop offset="1" stop-color="'+solShade(SOL_COL[gn],-.35)+'"/></radialGradient>';
    if(tilted)
      out+='<linearGradient id="og'+i+'" gradientUnits="userSpaceOnUse" x1="0" y1="'+SOL_PAD+'" x2="0" y2="'+(SOL_H-SOL_PAD)+'">'
        +'<stop offset="0" stop-color="'+SOL_COL[gn]+'" stop-opacity=".13"/>'
        +'<stop offset="1" stop-color="'+SOL_COL[gn]+'" stop-opacity=".62"/></linearGradient>';
  }
  out+='</defs>';
  for(i=0;i<n;i++){
    var nm=plName(i), pp=plPos(i,ms);
    var pr=solPrj(pp.x,pp.y,pp.z*solZCap(i,zk),k,ct,st);
    out+=solOrbitSvg(solOrbitZ(i,ms,k,ct,st,zk),SOL_COL[nm],tilted,'og'+i,nm);
    marks.push([pr[2],pr[0],pr[1],nm,i]);
  }
  /* far planets first, so a near one passing in front actually looks like it */
  marks.sort(function(a,b){ return b[0]-a[0]; });
  for(i=0;i<marks.length;i++){
    var m=marks[i], px=m[1], py=m[2], nm2=m[3];
    var slug2=SOL_SLUG[nm2]||'', moons2=SOL_HASMOON[nm2]?'1':'0';
    out+='<circle cx="'+solF(px)+'" cy="'+solF(py)+'" r="'+SOL_R[nm2]+'" fill="url(#pg'+m[4]+')" class="sol-pdot" data-sol-planet="'+nm2+'" data-sol-slug="'+slug2+'" data-sol-moons="'+moons2+'"/>';
    /* labels only where they will not pile up: on the crowded rungs the inner
       four share one label rather than four overlapping ones */
    if(n<=5||m[4]>=4)
      out+='<text x="'+solF(px)+'" y="'+solF(py-SOL_R[nm2]-8)+'" text-anchor="middle" font-size="12" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+nm2+'</text>';
  }
  if(n>5){
    var inr=k*1.55;
    out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(inr)+'" ry="'+solF(inr*ct)+'" fill="none" stroke="#e2e8f0" stroke-opacity=".25" stroke-dasharray="2 3"/>';
    /* clear of the sun even when the ring is squashed almost flat: at a steep
       view inr*ct goes to nearly nothing and this line landed on the planets */
    out+='<text x="'+SOL_CX+'" y="'+solF(SOL_CY+Math.max(inr*ct,44)+14)+'" text-anchor="middle" font-size="11" fill="#94a3b8" paint-order="stroke" stroke="#080d1a" stroke-width="3">Mercury, Venus, Earth and Mars are all inside this ring</text>';
  }
  if(opt.comets) out+=(tilted?flat0:'')+smCometLayer(ms,outer,k)+(tilted?flat1:'');
  if(opt.transfer) out+=(tilted?flat0:'')+trLayer(ms,opt.transfer,outer,k,opt.transferSolution)+(tilted?flat1:'');
  return out;
}

function solSvg(ms,rungId,opt){
  var rung=solRung(rungId), body='';
  if(rung[4]==='em') body=solMoonView(ms,(+opt.tilt||0)*PL_RAD);
  else if(rung[4]==='moons') body=satView(ms,rung[5],opt);
  else body=solSystemView(ms,rung,opt);
  return '<svg viewBox="0 0 '+SOL_W+' '+SOL_H+'" width="100%" aria-hidden="true">'
    + '<rect width="'+SOL_W+'" height="'+SOL_H+'" rx="16" fill="#080d1a"/>'
    + body + '</svg>';
}
`;
