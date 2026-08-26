/* smallbodies.mjs — the asteroid belt and the comets, for /solar-system-simulator/.
 *
 * THE BELT IS DRAWN FROM JUPITER, NOT FROM A REMEMBERED NUMBER. Every edge and
 * every gap in the main belt is a resonance with Jupiter, so all of them fall
 * out of ONE quantity this repo already has and already checks — Jupiter's
 * semi-major axis in planets.mjs. An asteroid whose period is p/q of Jupiter's
 * sits at a_J*(p/q)^(2/3), and that is where the belt's inner edge (4:1), its
 * Kirkwood gaps (3:1, 5:2, 7:3), its outer edge (2:1), the Hilda group (3:2)
 * and the Trojan clouds (1:1, sixty degrees ahead of and behind Jupiter) all
 * are. Nothing here is a figure typed in beside the picture; change Jupiter's
 * axis and the whole belt moves, correctly.
 *
 * THE COMETS ARE ELEMENTS, PROPAGATED AS TWO BODIES. Each carries its published
 * osculating elements plus a perihelion time, and the position comes from
 * solving Kepler's equation the same way the planets do. Two things are
 * therefore true and both are on the page: it is right about where in the solar
 * system a comet is and which orbits it crosses, and it is NOT an ephemeris —
 * real comets are pulled about by the planets and shoved by their own outgassing,
 * so a date many revolutions from the element epoch drifts.
 *
 * WHY THE ELEMENTS CAN BE TRUSTED. Each row carries a, e AND, redundantly, the
 * period and the perihelion distance. Those are not free: P must equal a^1.5 and
 * q must equal a(1-e). check-solar-data.mjs asserts both, so a wrong digit in a
 * or e contradicts the two columns that did not come from it. The perihelion
 * dates are checked the same way — tp plus a whole number of periods has to land
 * on the apparition the comet is known for.
 *
 * ONE SOURCE, TWO RUNTIMES — the moon.mjs pattern.
 */

/* ---------------------------------------------------------------------------
 * SMALL_JS — shared ES5 source, everything prefixed `sm`.
 * ------------------------------------------------------------------------- */
export const SMALL_JS = `
var SM_RAD=Math.PI/180, SM_YR=365.256898, SM_DAY=86400000;

/* [name, label, a AU, e, i deg, node deg, argPeri deg, perihelion time ms,
    period years (checked against a^1.5), q AU (checked against a(1-e)), note] */
var SM_COMETS=[
 ['1P','Halley',17.834,0.967140,162.262,58.42,111.33,Date.UTC(1986,1,9,11,1),75.32,0.5860,
  'The one everybody has heard of, and the only short-period comet visible to the naked eye twice in a lifetime. Goes round backwards.'],
 ['2P','Encke',2.2153,0.848330,11.781,334.57,186.55,Date.UTC(2023,9,22,9,36),3.30,0.3360,
  'The shortest orbit of any known comet — it never gets past the asteroid belt, and it has been round more than a hundred times since it was found.'],
 ['55P','Tempel-Tuttle',10.3376,0.905510,162.49,235.27,172.50,Date.UTC(1998,1,28,5,0),33.24,0.9766,
  'Leaves the dust that becomes the Leonid meteor shower every November, and a storm of them roughly every 33 years.'],
 ['109P','Swift-Tuttle',26.092,0.963226,113.454,139.38,152.98,Date.UTC(1992,11,12,7,0),133.28,0.9595,
  'The Perseids in August are this comet\\u2019s dust. The nucleus is 26 km across, the largest object known to make repeated close passes of Earth.'],
 ['12P','Pons-Brooks',17.20,0.954608,74.19,255.85,199.03,Date.UTC(2024,3,21,7,0),71.33,0.7810,
  'The \\u201cdevil comet\\u201d of spring 2024, named for the horned shape its outbursts gave it.'],
 ['67P','Churyumov-Gerasimenko',3.4630,0.641000,7.043,36.33,22.15,Date.UTC(2021,10,2,0,0),6.44,1.2432,
  'The rubber-duck-shaped one Rosetta orbited for two years and landed on in 2014 — the only comet ever visited that way.'],
 ['C/1995 O1','Hale-Bopp',186.0,0.995086,89.43,282.47,130.59,Date.UTC(1997,3,1,3,20),2537,0.9140,
  'Naked-eye for eighteen months in 1996-97, longer than any comet on record. Its orbit is very nearly perpendicular to everything else here.'],
 ['C/2020 F3','NEOWISE',358.5,0.999178,128.94,61.01,37.28,Date.UTC(2020,6,3,16,48),6788,0.2947,
  'The best comet of the last two decades from the northern hemisphere, and not due back for about 6,800 years.']
];

/* Kepler for eccentricities the planets never reach. Newton from E=M diverges
   as e approaches 1, so this uses Danby's starting guess and a tighter loop;
   check-solar-data.mjs asserts convergence at e=0.9992, the worst row here. */
function smKepler(M,e){
  M=((M+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  var E=M+0.85*e*(M<0?-1:1), i, f, fp, dE;
  for(i=0;i<60;i++){
    f=E-e*Math.sin(E)-M; fp=1-e*Math.cos(E);
    dE=f/fp; E-=dE;
    if(Math.abs(dE)<1e-13) break;
  }
  return E;
}
/* heliocentric ecliptic position of one comet, in AU */
function smCometPos(idx,ms){
  var c=SM_COMETS[idx], a=c[2], e=c[3];
  var I=c[4]*SM_RAD, O=c[5]*SM_RAD, w=c[6]*SM_RAD;
  var P=Math.pow(a,1.5)*SM_YR*SM_DAY;             /* period in ms, from a alone */
  var M=2*Math.PI*((ms-c[7])/P);
  var E=smKepler(M,e);
  var xo=a*(Math.cos(E)-e), yo=a*Math.sqrt(1-e*e)*Math.sin(E);
  var cw=Math.cos(w), sw=Math.sin(w), cO=Math.cos(O), sO=Math.sin(O), cI=Math.cos(I), sI=Math.sin(I);
  var x=(cw*cO-sw*sO*cI)*xo+(-sw*cO-cw*sO*cI)*yo;
  var y=(cw*sO+sw*cO*cI)*xo+(-sw*sO+cw*cO*cI)*yo;
  var z=(sw*sI)*xo+(cw*sI)*yo;
  return { x:x, y:y, z:z, r:Math.sqrt(x*x+y*y+z*z) };
}
/* the perihelion on or after ms — how the "next pass" dates are worked out */
function smNextPerihelion(idx,ms){
  var c=SM_COMETS[idx], P=Math.pow(c[2],1.5)*SM_YR*SM_DAY;
  var n=Math.ceil((ms-c[7])/P);
  return c[7]+n*P;
}
function smPeriodYears(idx){ return Math.pow(SM_COMETS[idx][2],1.5); }

/* ---- the belt, entirely derived from Jupiter -----------------------------
   A body in a p:q resonance with Jupiter (its period q/p of Jupiter's) orbits
   at a_J*(q/p)^(2/3). Every feature below is one of those. */
function smResonance(p,q){ return PL_EL[4][1]*Math.pow(q/p,2/3); }
var SM_BELT=[
 [4,1,'gap','4:1 \\u2014 inner edge'],
 [3,1,'gap','3:1 Kirkwood gap'],
 [5,2,'gap','5:2 Kirkwood gap'],
 [7,3,'gap','7:3 Kirkwood gap'],
 [2,1,'gap','2:1 \\u2014 outer edge'],
 [3,2,'hilda','3:2 \\u2014 the Hildas'],
 [1,1,'trojan','1:1 \\u2014 the Trojans']
];
function smBeltEdges(){ return [smResonance(4,1),smResonance(2,1)]; }

/* the four largest belt objects. Drawn as RINGS, never as dots: the orbit of an
   asteroid needs no epoch and is a fact, but where it sits on that orbit today
   is not solved for here, and an invented dot would be the one untruth this
   page is built to avoid. */
var SM_BIG=[
 ['Ceres',2.7658,939.4,'A dwarf planet, a quarter of all the mass in the belt, with water ice under its crust'],
 ['Vesta',2.3617,525.4,'The brightest asteroid, bright enough to see without a telescope, and a differentiated protoplanet'],
 ['Pallas',2.7709,511,'On a 35-degree tilt, so it crosses the belt rather than lying in it'],
 ['Hygiea',3.1415,433,'Round enough that it may count as a dwarf planet too']
];

/* ---- drawing ------------------------------------------------------------ */
function smBeltLayer(ms,outer,k){
  var e=smBeltEdges(), ri=e[0]*k, ro=e[1]*k, out='', i;
  if(e[0]>outer) return '';
  /* faint on purpose: the belt is a place, not a wall, and the planets' orbits
     have to stay readable through it. It is also nearly empty in reality — the
     large bodies in it are around a million km apart. */
  out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF((ri+ro)/2)+'" fill="none" stroke="#8b7355" stroke-opacity=".22" stroke-width="'+solF(ro-ri)+'"/>';
  for(i=0;i<SM_BELT.length;i++){
    var b=SM_BELT[i], a=smResonance(b[0],b[1]);
    if(b[2]!=='gap'||a>outer) continue;
    out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF(a*k)+'" fill="none" stroke="#080d1a" stroke-opacity=".62" stroke-width="'+solF(Math.max(1.2,(ro-ri)*0.05))+'"/>';
  }
  out+='<text x="'+SOL_CX+'" y="'+solF(SOL_CY-(ri+ro)/2+4)+'" text-anchor="middle" font-size="11" fill="#c8b48f" paint-order="stroke" stroke="#0a1020" stroke-width="3">Asteroid belt \\u2014 the dark lanes are Jupiter\\u2019s resonances</text>';
  /* the Hildas and the Trojans are where Jupiter says they are, right now */
  var ha=smResonance(3,2);
  if(ha<=outer)
    out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF(ha*k)+'" fill="none" stroke="#8b7355" stroke-opacity=".45" stroke-width="2" stroke-dasharray="2 6"/>';
  var jp=plPos(4,ms), jlon=Math.atan2(jp.y,jp.x), jr=Math.sqrt(jp.x*jp.x+jp.y*jp.y);
  if(jr<=outer){
    for(i=-1;i<=1;i+=2){
      var th=jlon+i*60*SM_RAD, tx=SOL_CX+k*jr*Math.cos(th), ty=SOL_CY-k*jr*Math.sin(th);
      out+='<ellipse cx="'+solF(tx)+'" cy="'+solF(ty)+'" rx="'+solF(Math.max(5,jr*k*0.14))+'" ry="'+solF(Math.max(3,jr*k*0.05))+'" fill="#8b7355" fill-opacity=".55" transform="rotate('+solF(-th/SM_RAD+(i>0?90:90))+' '+solF(tx)+' '+solF(ty)+')"/>';
    }
    out+='<text x="'+solF(SOL_CX+k*jr*Math.cos(jlon+60*SM_RAD))+'" y="'+solF(SOL_CY-k*jr*Math.sin(jlon+60*SM_RAD)-12)+'" text-anchor="middle" font-size="11" fill="#c8b48f" paint-order="stroke" stroke="#0a1020" stroke-width="3">Trojans</text>';
  }
  return out;
}
/* WOULD THERE BE ANYTHING TO SEE? The two draw functions above already return
   nothing when their subject is off the frame, which left the switches that
   turn them on looking live while doing nothing. These answer the same question
   from the same numbers, so a switch cannot claim a layer the frame has no
   room for. */
function smBeltIn(outer){ return smBeltEdges()[0]<=outer; }
function smCometsIn(outer){
  for(var i=0;i<SM_COMETS.length;i++) if(SM_COMETS[i][2]*(1-SM_COMETS[i][3])<=outer) return 1;
  return 0;
}
/* one comet: its orbit, and where the two-body solution puts it */
function smCometLayer(ms,outer,k){
  var out='', i, j;
  for(i=0;i<SM_COMETS.length;i++){
    var c=SM_COMETS[i], a=c[2], e=c[3];
    if(a*(1-e)>outer) continue;                    /* never enters the frame */
    var I=c[4]*SM_RAD, O=c[5]*SM_RAD, w=c[6]*SM_RAD;
    var cw=Math.cos(w), sw=Math.sin(w), cO=Math.cos(O), sO=Math.sin(O), cI=Math.cos(I);
    var pts=[], any=0;
    for(j=0;j<=240;j++){
      var E=j/240*2*Math.PI;
      var xo=a*(Math.cos(E)-e), yo=a*Math.sqrt(1-e*e)*Math.sin(E);
      var x=(cw*cO-sw*sO*cI)*xo+(-sw*cO-cw*sO*cI)*yo;
      var y=(cw*sO+sw*cO*cI)*xo+(-sw*sO+cw*cO*cI)*yo;
      if(Math.abs(x)>outer*2.5||Math.abs(y)>outer*2.5){ if(any){ pts.push(''); any=0; } continue; }
      pts.push(solF(SOL_CX+k*x)+','+solF(SOL_CY-k*y)); any=1;
    }
    out+='<polyline points="'+pts.filter(Boolean).join(' ')+'" fill="none" stroke="#7dd3fc" stroke-opacity=".33" stroke-width="1" stroke-dasharray="5 4"/>';
    var p=smCometPos(i,ms);
    if(Math.abs(p.x)<outer&&Math.abs(p.y)<outer){
      var px=SOL_CX+k*p.x, py=SOL_CY-k*p.y;
      /* the tail points away from the sun, because that is the one thing about
         a comet tail everybody gets wrong */
      var d=Math.sqrt(p.x*p.x+p.y*p.y)||1, tl=Math.min(46,Math.max(10,26/Math.max(p.r,0.3)));
      out+='<line x1="'+solF(px)+'" y1="'+solF(py)+'" x2="'+solF(px+tl*p.x/d)+'" y2="'+solF(py-tl*p.y/d)+'" stroke="#7dd3fc" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>';
      out+='<circle cx="'+solF(px)+'" cy="'+solF(py)+'" r="3" fill="#e0f2fe"/>';
      out+='<text x="'+solF(px)+'" y="'+solF(py+16)+'" text-anchor="middle" font-size="11" fill="#bae6fd" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+c[1]+'</text>';
    }
  }
  return out;
}
`;

/* ---------------------------------------------------------------------------
 * The Node side. PLANETS_JS comes along because the belt is derived from
 * Jupiter's axis — the whole point of this module.
 * ------------------------------------------------------------------------- */
import { PLANETS_JS } from "./planets.mjs";

const S = new Function(`${PLANETS_JS}
${SMALL_JS}
return { SM_COMETS, SM_BIG, SM_BELT, smCometPos, smNextPerihelion, smPeriodYears, smResonance, smBeltEdges, smBeltIn, smCometsIn, smKepler };`)();

export const SM_COMETS = S.SM_COMETS;
export const SM_BIG = S.SM_BIG;
export const SM_BELT = S.SM_BELT;
export const cometPos = (i, ms) => S.smCometPos(i, +ms);
export const nextPerihelion = (i, ms) => new Date(S.smNextPerihelion(i, +ms));
export const cometPeriodYears = (i) => S.smPeriodYears(i);
export const resonanceAU = (p, q) => S.smResonance(p, q);
export const beltEdges = () => S.smBeltEdges();
export const beltInFrame = (outer) => !!S.smBeltIn(outer);
export const cometsInFrame = (outer) => !!S.smCometsIn(outer);
export const keplerSolve = (M, e) => S.smKepler(M, e);
/** one comet row as a named object, for the tables */
export const cometRow = (c) => ({
  desig: c[0], name: c[1], a: c[2], e: c[3], inc: c[4], node: c[5], peri: c[6],
  tp: new Date(c[7]), periodYears: c[8], q: c[9], note: c[10],
  retrograde: c[4] > 90,
});
