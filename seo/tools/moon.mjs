/* moon.mjs — ALL of the site's moon math, in one place.
 *
 * WHY THIS FILE EXISTS. There were already two moon implementations in the
 * repo and they disagreed:
 *   - build-sun.mjs had proper SunCalc illumination geometry inline,
 *   - assets/js/tides.js had a linear "days since a reference new moon /
 *     29.530588853" model — which drifts up to ±14 HOURS from the real phase,
 *     and drew the phase with 🌑🌒🌓 emoji (against the no-emoji-icons rule).
 * A ±14-hour error is harmless when you only print "waxing gibbous", and fatal
 * when the headline feature is "next full moon in 8 h 24 m". So the math lives
 * here once, and every consumer (build-moon, build-sun, tides.js) reads it.
 *
 * ONE SOURCE, TWO RUNTIMES. The math is written ONCE as MOON_CORE, an ES5
 * source string. The browser gets it inlined verbatim; Node instantiates the
 * same string through `new Function` at the bottom of this file. That is the
 * whole point — a hand-maintained "Node twin" of the client code is exactly
 * how the two implementations above drifted apart, so there isn't one.
 *
 * ACCURACY.
 *   - Primary phase instants (new / first quarter / full / last quarter) use
 *     Meeus, "Astronomical Algorithms" ch. 49: the mean phase plus the full
 *     periodic + planetary correction sets. Good to well under a minute, vs.
 *     the ±14 h of a mean-synodic model. Results are TT, converted to UTC with
 *     the Espenak–Meeus ΔT polynomial for 2005–2050.
 *   - Moon position/distance: Meeus ch. 47 truncated (the leading periodic
 *     terms). Distance is good to a few hundred km, which is what makes the
 *     supermoon test (perigee-syzygy ≤ 361,885 km) defensible.
 *   - Moonrise/moonset: hourly altitude sampling with quadratic interpolation
 *     (the SunCalc getMoonTimes method), ±~2 min at mid latitudes.
 * No network, at build time or at page load: everything here is arithmetic, so
 * the pages can be static and still never go stale.
 */

/* ---------------------------------------------------------------------------
 * MOON_CORE — the shared ES5 source. Everything is prefixed `mn`/`moon` so it
 * can be inlined alongside SUN_JS/DIAL_JS on the same page without colliding.
 * ------------------------------------------------------------------------- */
export const MOON_CORE = `
var MN_RAD=Math.PI/180, MN_DAY=86400000, MN_J1970=2440588, MN_J2000=2451545, MN_OBL=MN_RAD*23.4397;
function mnDays(ms){ return ms/MN_DAY - 0.5 + MN_J1970 - MN_J2000; }
function mnRa(l,b){ return Math.atan2(Math.sin(l)*Math.cos(MN_OBL)-Math.tan(b)*Math.sin(MN_OBL), Math.cos(l)); }
function mnDec(l,b){ return Math.asin(Math.sin(b)*Math.cos(MN_OBL)+Math.cos(b)*Math.sin(MN_OBL)*Math.sin(l)); }
function mnSidereal(d,lw){ return MN_RAD*(280.16+360.9856235*d)-lw; }
function mnAlt(H,phi,dec){ return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H)); }

/* Sun's apparent equatorial position (same series SUN_JS uses). */
function mnSunPos(d){
  var M=MN_RAD*(357.5291+0.98560028*d);
  var C=MN_RAD*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M));
  var L=M+C+MN_RAD*102.9372+Math.PI;
  return { ra:mnRa(L,0), dec:mnDec(L,0) };
}

/* Moon's geocentric position and distance — Meeus ch. 47, truncated to the
 * leading terms. The distance series matters: the single-term version
 * (385001 - 20905*cos M') is off by up to ~2,000 km, which is more than the
 * margin the supermoon threshold is decided by. */
function mnMoonPos(d){
  var L=MN_RAD*(218.316+13.176396*d),   /* mean longitude   */
      M=MN_RAD*(134.963+13.064993*d),   /* mean anomaly     */
      F=MN_RAD*(93.272+13.229350*d),    /* argument of lat. */
      D=MN_RAD*(297.850+12.190749*d),   /* mean elongation  */
      Ms=MN_RAD*(357.529+0.98560028*d); /* sun mean anomaly */
  var l=L+MN_RAD*(6.289*Math.sin(M)+1.274*Math.sin(2*D-M)+0.658*Math.sin(2*D)
        +0.214*Math.sin(2*M)-0.186*Math.sin(Ms)-0.114*Math.sin(2*F));
  var b=MN_RAD*(5.128*Math.sin(F)+0.281*Math.sin(M+F)-0.278*Math.sin(F-M)
        -0.173*Math.sin(F-2*D));
  var dt=385000.56+(-20905355*Math.cos(M)-3699111*Math.cos(2*D-M)-2955968*Math.cos(2*D)
        -569925*Math.cos(2*M)+48888*Math.cos(Ms)-3149*Math.cos(2*F)
        +246158*Math.cos(2*D-2*M)-152138*Math.cos(2*D-Ms-M)-170733*Math.cos(2*D+M)
        -204586*Math.cos(2*D-Ms)-129620*Math.cos(Ms-M)+108743*Math.cos(D)
        +104755*Math.cos(Ms+M)+10321*Math.cos(2*D-2*F)+79661*Math.cos(M-2*F))/1000;
  return { ra:mnRa(l,b), dec:mnDec(l,b), dist:dt };
}
/* the one place the moon is straight overhead — same job as dnSub for the sun.
   Latitude is the moon's declination; longitude is RA minus Greenwich sidereal
   time, using THIS file's sidereal so a marker cannot disagree with mnPos. */
function mnSub(ms){
  var d=mnDays(ms), m=mnMoonPos(d);
  var lo=m.ra/MN_RAD-(280.16+360.9856235*d);
  lo=((lo%360)+540)%360-180;
  return {dec:m.dec/MN_RAD, lon:lo};
}

/* Illuminated fraction, cycle position and limb angle.
 *   fraction 0..1, phase 0=new .5=full (rises 0->1 across the cycle),
 *   waxing   true while the lit side is growing. */
function mnIllum(ms){
  var d=mnDays(ms), s=mnSunPos(d), m=mnMoonPos(d), SD=149598000;
  var phi=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra));
  var inc=Math.atan2(SD*Math.sin(phi), m.dist-SD*Math.cos(phi));
  var ang=Math.atan2(Math.cos(s.dec)*Math.sin(s.ra-m.ra),
        Math.sin(s.dec)*Math.cos(m.dec)-Math.cos(s.dec)*Math.sin(m.dec)*Math.cos(s.ra-m.ra));
  var ph=0.5+0.5*inc*(ang<0?-1:1)/Math.PI;
  return { fraction:(1+Math.cos(inc))/2, phase:ph, waxing:ph<0.5, dist:m.dist, angle:ang };
}

/* ---- Meeus ch. 49: the exact instant of a primary phase ------------------
 * kind: 0 new, 1 first quarter, 2 full, 3 last quarter.
 * k must be an integer + kind/4. Returns epoch ms (UTC). */
function mnPhaseJde(k,kind){
  var T=k/1236.85, T2=T*T, T3=T2*T, T4=T3*T, R=MN_RAD;
  var jde=2451550.09766+29.530588861*k+0.00015437*T2-0.000000150*T3+0.00000000073*T4;
  var E=1-0.002516*T-0.0000074*T2;
  var M =R*(2.5534+29.10535670*k-0.0000014*T2-0.00000011*T3);
  var Mp=R*(201.5643+385.81693528*k+0.0107582*T2+0.00001238*T3-0.000000058*T4);
  var F =R*(160.7108+390.67050284*k-0.0016118*T2-0.00000227*T3+0.000000011*T4);
  var O =R*(124.7746-1.56375588*k+0.0020672*T2+0.00000215*T3);
  var s=Math.sin, c=Math.cos, corr=0;
  if(kind===0){
    corr=-0.40720*s(Mp)+0.17241*E*s(M)+0.01608*s(2*Mp)+0.01039*s(2*F)
      +0.00739*E*s(Mp-M)-0.00514*E*s(Mp+M)+0.00208*E*E*s(2*M)
      -0.00111*s(Mp-2*F)-0.00057*s(Mp+2*F)+0.00056*E*s(2*Mp+M)-0.00042*s(3*Mp)
      +0.00042*E*s(M+2*F)+0.00038*E*s(M-2*F)-0.00024*E*s(2*Mp-M)-0.00017*s(O)
      -0.00007*s(Mp+2*M)+0.00004*s(2*Mp-2*F)+0.00004*s(3*M)+0.00003*s(Mp+M-2*F)
      +0.00003*s(2*Mp+2*F)-0.00003*s(Mp+M+2*F)+0.00003*s(Mp-M+2*F)
      -0.00002*s(Mp-M-2*F)-0.00002*s(3*Mp+M)+0.00002*s(4*Mp);
  } else if(kind===2){
    corr=-0.40614*s(Mp)+0.17302*E*s(M)+0.01614*s(2*Mp)+0.01043*s(2*F)
      +0.00734*E*s(Mp-M)-0.00515*E*s(Mp+M)+0.00209*E*E*s(2*M)
      -0.00111*s(Mp-2*F)-0.00057*s(Mp+2*F)+0.00056*E*s(2*Mp+M)-0.00042*s(3*Mp)
      +0.00042*E*s(M+2*F)+0.00038*E*s(M-2*F)-0.00024*E*s(2*Mp-M)-0.00017*s(O)
      -0.00007*s(Mp+2*M)+0.00004*s(2*Mp-2*F)+0.00004*s(3*M)+0.00003*s(Mp+M-2*F)
      +0.00003*s(2*Mp+2*F)-0.00003*s(Mp+M+2*F)+0.00003*s(Mp-M+2*F)
      -0.00002*s(Mp-M-2*F)-0.00002*s(3*Mp+M)+0.00002*s(4*Mp);
  } else {
    corr=-0.62801*s(Mp)+0.17172*E*s(M)-0.01183*E*s(Mp+M)+0.00862*s(2*Mp)
      +0.00804*s(2*F)+0.00454*E*s(Mp-M)+0.00204*E*E*s(2*M)-0.00180*s(Mp-2*F)
      -0.00070*s(Mp+2*F)-0.00040*s(3*Mp)-0.00034*E*s(2*Mp-M)+0.00032*E*s(M+2*F)
      +0.00032*E*s(M-2*F)-0.00028*E*E*s(Mp+2*M)+0.00027*E*s(2*Mp+M)-0.00017*s(O)
      -0.00005*s(Mp-M-2*F)+0.00004*s(2*Mp+2*F)-0.00004*s(Mp+M+2*F)+0.00004*s(Mp-2*M)
      +0.00003*s(Mp+M-2*F)+0.00003*s(3*M)+0.00002*s(2*Mp-2*F)+0.00002*s(Mp-M+2*F)
      -0.00002*s(3*Mp+M);
    var W=0.00306-0.00038*E*c(M)+0.00026*c(Mp)-0.00002*c(Mp-M)+0.00002*c(Mp+M)+0.00002*c(2*F);
    corr+=(kind===1?W:-W);
  }
  /* the 14 planetary-argument corrections, identical for all four phases */
  var A=[299.77+0.107408*k-0.009173*T2, 251.88+0.016321*k, 251.83+26.651886*k,
    349.42+36.412478*k, 84.66+18.206239*k, 141.74+53.303771*k, 207.14+2.453732*k,
    154.84+7.306860*k, 34.52+27.261239*k, 207.19+0.121824*k, 291.34+1.844379*k,
    161.72+24.198154*k, 239.56+25.513099*k, 331.55+3.592518*k];
  var W2=[0.000325,0.000165,0.000164,0.000126,0.000110,0.000062,0.000060,
    0.000056,0.000047,0.000042,0.000040,0.000037,0.000035,0.000023];
  for(var i=0;i<14;i++) corr+=W2[i]*s(R*A[i]);
  jde+=corr;
  /* JDE is Terrestrial Time; shift to UTC (Espenak-Meeus, 2005-2050) */
  var yr=2000+(jde-2451545)/365.25, tt=yr-2000;
  var dT=62.92+0.32217*tt+0.005589*tt*tt;
  return (jde-2440587.5)*MN_DAY-dT*1000;
}
/* the lunation number bracketing an instant, so a search can start near it */
function mnK(ms){ return (( ms/MN_DAY+2440587.5 )-2451550.09766)/29.530588861; }

/* Next occurrence of phase "kind" at or after "ms". */
function mnNextPhase(ms,kind){
  var k=Math.floor(mnK(ms))-1+kind/4, t;
  for(var i=0;i<4;i++){ t=mnPhaseJde(k,kind); if(t>ms) return t; k+=1; }
  return t;
}
/* Most recent occurrence of phase "kind" at or before "ms". */
function mnPrevPhase(ms,kind){
  var k=Math.ceil(mnK(ms))+1+kind/4, t;
  for(var i=0;i<4;i++){ t=mnPhaseJde(k,kind); if(t<=ms) return t; k-=1; }
  return t;
}
/* Days since the last new moon — the real elapsed time, not a mean cycle. */
function mnAge(ms){ return (ms-mnPrevPhase(ms,0))/MN_DAY; }

/* ONE snapshot of the moon at an instant. Age, cycle position, waxing flag
 * and the phase name all come from the Meeus primary-phase instants. The
 * illuminated fraction still comes from the sun–moon elongation, because that
 * is the geometry of the lit disc. Mixing the two sources was how a page
 * could say "full, waxing, 15.1 days old, 49% through" at once. */
function mnSnap(ms){
  var lastNew=mnPrevPhase(ms,0), nextNew=mnNextPhase(ms,0);
  var nextFull=mnNextPhase(ms,2);
  var ill=mnIllum(ms);
  var lun=nextNew-lastNew;
  var age=(ms-lastNew)/MN_DAY;
  var cycle=lun>0?(ms-lastNew)/lun:ill.phase;
  var waxing=nextFull<nextNew;
  var name=mnNameFromInstants(ms, cycle);
  return { fraction:ill.fraction, phase:cycle, waxing:waxing, dist:ill.dist,
           angle:ill.angle, age:age, name:name, primary:mnNearestPrimary(ms) };
}
/* Within 12 hours of a primary instant, use that name so "full moon" means
 * the day of full moon. Otherwise name the cycle position. */
function mnNearestPrimary(ms){
  var best=null, bestAbs=12*3600000, i, prev, next, d;
  for(i=0;i<4;i++){
    prev=mnPrevPhase(ms,i); next=mnNextPhase(ms,i);
    d=Math.min(ms-prev, next-ms);
    if(d<bestAbs){ bestAbs=d; best=i; }
  }
  return best;
}
function mnNameFromInstants(ms, cycle){
  var k=mnNearestPrimary(ms);
  if(k!==null) return mnPrimaryName(k);
  return mnName(cycle);
}

/* Every primary phase whose instant falls inside [from,to). */
function mnPhasesBetween(from,to){
  var out=[], k=Math.floor(mnK(from))-1;
  while(k<mnK(to)+1){
    for(var kind=0;kind<4;kind++){
      var t=mnPhaseJde(k+kind/4,kind);
      if(t>=from&&t<to) out.push({ kind:kind, t:t });
    }
    k+=1;
  }
  return out.sort(function(a,b){ return a.t-b.t; });
}

var MN_NAMES=['New moon','Waxing crescent','First quarter','Waxing gibbous',
  'Full moon','Waning gibbous','Last quarter','Waning crescent'];
/* Phase name from cycle position. The four primary names are reserved for a
 * narrow window around the exact instant, so "first quarter" on the page means
 * roughly the day of first quarter, not four days of it. */
function mnName(p){
  if(p<0.02||p>=0.98) return MN_NAMES[0];
  if(p<0.23) return MN_NAMES[1];
  if(p<0.27) return MN_NAMES[2];
  if(p<0.48) return MN_NAMES[3];
  if(p<0.52) return MN_NAMES[4];
  if(p<0.73) return MN_NAMES[5];
  if(p<0.77) return MN_NAMES[6];
  return MN_NAMES[7];
}
function mnPrimaryName(kind){ return [MN_NAMES[0],MN_NAMES[2],MN_NAMES[4],MN_NAMES[6]][kind]; }

/* ---- moonrise / moonset -------------------------------------------------
 * start: epoch ms of the START of the local day being asked about (the caller
 * owns the time zone, so a city page can ask in the city's own zone). Samples
 * altitude hourly and interpolates the horizon crossings — the SunCalc method.
 * hc = 0.133° allows for the moon's semidiameter plus refraction. */
function mnTimes(start,lat,lon){
  var hc=0.133*MN_RAD, lw=MN_RAD*-lon, phi=MN_RAD*lat;
  function alt(hoursOn){
    var t=start+hoursOn*3600000, d=mnDays(t), m=mnMoonPos(d);
    return mnAlt(mnSidereal(d,lw)-m.ra, phi, m.dec)-hc;
  }
  var h0=alt(0), rise, set, ye=0;
  for(var i=1;i<=24;i+=2){
    var h1=alt(i), h2=alt(i+1);
    var a=(h0+h2)/2-h1, b=(h2-h0)/2, xe=-b/(2*a); ye=(a*xe+b)*xe+h1;
    var d0=b*b-4*a*h1, roots=0, x1=0, x2=0;
    if(d0>=0){
      var dx=Math.sqrt(d0)/(Math.abs(a)*2);
      x1=xe-dx; x2=xe+dx;
      if(Math.abs(x1)<=1) roots++;
      if(Math.abs(x2)<=1) roots++;
      if(x1<-1) x1=x2;
    }
    if(roots===1){ if(h0<0) rise=i+x1; else set=i+x1; }
    else if(roots===2){ rise=i+(ye<0?x2:x1); set=i+(ye<0?x1:x2); }
    if(rise!==undefined&&set!==undefined) break;
    h0=h2;
  }
  var out={};
  if(rise!==undefined) out.rise=start+rise*3600000;
  if(set!==undefined) out.set=start+set*3600000;
  if(rise===undefined&&set===undefined) out[ye>0?'alwaysUp':'alwaysDown']=true;
  return out;
}

/* ---- where in the sky ---------------------------------------------------
 * Altitude and compass bearing of the moon for an observer, epoch ms.
 * Azimuth comes out of the standard formula measured from south (positive
 * west); +180 converts it to a compass bearing (0 = N, 90 = E), which is the
 * form a "rises in the ESE" sentence needs. */
function mnPos(ms,lat,lon){
  var d=mnDays(ms), m=mnMoonPos(d), lw=MN_RAD*-lon, phi=MN_RAD*lat;
  var H=mnSidereal(d,lw)-m.ra;
  var az=Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(phi)-Math.tan(m.dec)*Math.cos(phi));
  return { alt:mnAlt(H,phi,m.dec)/MN_RAD, az:((az/MN_RAD+180)%360+360)%360, dist:m.dist };
}
var MN_COMPASS=['north','NNE','NE','ENE','east','ESE','SE','SSE','south','SSW','SW','WSW','west','WNW','NW','NNW'];
function mnCompass(bearing){ return MN_COMPASS[Math.round(((bearing%360)+360)%360/22.5)%16]; }

/* ---- the moon glyph -----------------------------------------------------
 * The real lunar near side (the sprite in moon-face.mjs, referenced once with
 * <use>) with the UNLIT part covered by a shadow.
 *
 * The shadow is ONE path, not a mask or a clip: the unlit region is bounded by
 * the dark limb on one side and the terminator on the other, so it is an arc
 * out and an arc back. That matters — masks and clipPaths need a document-
 * unique id, and these glyphs are generated at build time AND regenerated in
 * the browser, on pages carrying thirty of them. No id, nothing to collide.
 *
 * Sweep flags do all the work:
 *   dark limb   away from the lit side
 *   terminator  bulges toward the LIT side when a crescent (shadow crosses the
 *               middle) and toward the DARK side when gibbous.
 * At f=0 the two arcs make the whole disc; at f=1 they cancel to nothing; at
 * f=0.5 the terminator's rx is 0 and it degenerates to the straight centre
 * line. So new, full and both quarters fall out of the same two arcs.
 *
 * \`south\` flips it: the phase is identical everywhere on Earth, but below the
 * equator the lit limb — and the whole face with it — appears rotated 180°. */
function mnGlyph(fraction,waxing,r,south,plain){
  var f=fraction<0?0:(fraction>1?1:fraction), d=2*r, cx=r, cy=r;
  var rx=(r*Math.abs(1-2*f)).toFixed(2), litRight=(waxing!==!!south);
  var s1=litRight?0:1, s2=litRight?(f<0.5?0:1):(f<0.5?1:0);
  var shadow='M'+cx+' '+(cy-r)+'A'+r+' '+r+' 0 0 '+s1+' '+cx+' '+(cy+r)
    +'A'+rx+' '+r+' 0 0 '+s2+' '+cx+' '+(cy-r)+'Z';
  return '<svg viewBox="0 0 '+d+' '+d+'" width="'+d+'" height="'+d+'" aria-hidden="true" class="mn-moon"'+(plain?' overflow="visible"':'')+'>'
    /* plain disc underneath: if the sprite is ever missing the glyph still
       reads as a moon in the right phase rather than vanishing */
    +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#efe3c2"/>'
    /* The face is the same picture in every glyph — only the terminator and the
       earthshine below change per day. At thumbnail size a <use> of the sprite
       is a bad deal: it is 828 vector elements behind two blur filters, and
       <use> rasterizes each reference independently, so a 31-day strip drew
       ~25,700 shapes to fill thirty 30px circles (407ms of style+layout+paint
       on the home page, vs ~60ms without it). Below 64px the glyph therefore
       places a build-time raster of that same sprite instead — identical pixels,
       one decode, shared by every thumbnail on the page. The big moon on a
       /moon/ city page is a single instance and keeps the vector, which stays
       crisp at any size. See make-moon-face-raster.mjs.
       "#ac-moon-raster" is rewritten to the hashed .webp by build-inline, the
       same way "#ac-moon-face" is pointed at the hashed sprite.
       \`plain\` skips the face: the day/night map marker is too small to read it,
       and that page does not carry the sprite. */
    +(plain?'':(r<=32
      ? '<image href="#ac-moon-raster" x="0" y="0" width="'+d+'" height="'+d+'"'+(south?' transform="rotate(180 '+cx+' '+cy+')"':'')+'/>'
      : '<g transform="scale('+(r/100)+')'+(south?' rotate(180 100 100)':'')+'"><use href="#ac-moon-face"/></g>'))
    /* Earthshine: the shadow is not equally opaque at every phase. Sunlight
       bounced off the Earth genuinely lights the moon's dark side, and it is
       most obvious on a thin crescent (a big, bright Earth in the moon's sky)
       and invisible next to a gibbous moon's glare — so the shadow lightens
       toward new and goes near-solid toward full. It also stops the sliver of
       shadow on a gibbous moon from looking like a smudge. */
    +(f>0.999?'':'<path d="'+shadow+'" fill="#0e0d08" fill-opacity="'+(0.91+0.075*f).toFixed(3)+'"/>')
    +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#57503a" stroke-width="1"/></svg>';
}
`;

/* Public browser surface: MOON_CORE plus a namespace object, for assets/js
 * consumers (tides.js) that are bundled as separate files rather than inlined
 * into a generator's own <script>. build-moon.mjs writes this to
 * assets/js/moon.js so build-inline can bundle it like any other asset. */
export const MOON_ASSET_JS = `/* GENERATED by seo/tools/build-moon.mjs from seo/tools/moon.mjs — do not edit. */
(function(){
${MOON_CORE}
window.AC_MOON={ illum:mnIllum, name:mnName, primaryName:mnPrimaryName, age:mnAge,
  snap:mnSnap, nextPhase:mnNextPhase, prevPhase:mnPrevPhase, phasesBetween:mnPhasesBetween,
  times:mnTimes, glyph:mnGlyph, pos:mnPos, compass:mnCompass };
})();`;

/* ---------------------------------------------------------------------------
 * The Node side. Same source string, instantiated once — NOT a reimplementation.
 * ------------------------------------------------------------------------- */
const M = new Function(`${MOON_CORE}
return { mnIllum, mnName, mnPrimaryName, mnAge, mnSnap, mnNextPhase, mnPrevPhase,
         mnPhasesBetween, mnTimes, mnGlyph, mnMoonPos, mnDays, mnPos, mnCompass, mnSub };`)();

export const moonIllum = (ms) => M.mnIllum(+ms);
export const moonName = (phase) => M.mnName(phase);
export const primaryName = (kind) => M.mnPrimaryName(kind);
export const moonAge = (ms) => M.mnAge(+ms);
export const moonSnap = (ms) => M.mnSnap(+ms);
export const nextPhase = (ms, kind) => M.mnNextPhase(+ms, kind);
export const prevPhase = (ms, kind) => M.mnPrevPhase(+ms, kind);
export const phasesBetween = (from, to) => M.mnPhasesBetween(+from, +to);
export const moonTimes = (startMs, lat, lon) => M.mnTimes(+startMs, lat, lon);
export const moonGlyph = (fraction, waxing, r, south = false, plain = false) => M.mnGlyph(fraction, waxing, r, south, plain);
export const moonDistance = (ms) => M.mnMoonPos(M.mnDays(+ms)).dist;
export const moonPos = (ms, lat, lon) => M.mnPos(+ms, lat, lon);
export const compass = (bearing) => M.mnCompass(bearing);
/** where the moon is straight overhead — the pale marker on the day/night map */
export const sublunar = (ms) => M.mnSub(+ms);
/** "in 7 hours" below a day, "in 20 minutes" below an hour. */
export function remainLabel(fromMs, toMs) {
  const s = Math.max(0, (toMs - fromMs) / 1000);
  if (s < 90) return "now";
  if (s < 3600) {
    const m = Math.max(1, Math.round(s / 60));
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  if (s < 86400) {
    const h = Math.max(1, Math.round(s / 3600));
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/* ---- naming the full moons ------------------------------------------------
 * The month names are the widely published Farmers'-Almanac set. Harvest Moon
 * is NOT simply September's: it's the full moon nearest the September equinox,
 * which lands in October roughly one year in three — and then October's own
 * name (Hunter's Moon) moves to the next one. Getting that right is the kind of
 * detail these pages are supposed to be trusted for. */
const MONTH_MOON = ["Wolf Moon", "Snow Moon", "Worm Moon", "Pink Moon", "Flower Moon",
  "Strawberry Moon", "Buck Moon", "Sturgeon Moon", "Corn Moon", "Hunter's Moon",
  "Beaver Moon", "Cold Moon"];

/* Mean September equinox (Meeus ch. 27, table 27.A). The periodic terms it
 * omits are worth minutes; the Harvest Moon test needs about a day. */
function septEquinox(year) {
  const Y = (year - 2000) / 1000;
  const jde = 2451810.21715 + 365242.01767 * Y - 0.11575 * Y ** 2 + 0.00337 * Y ** 3 + 0.00078 * Y ** 4;
  return (jde - 2440587.5) * 86400000;
}

/* A supermoon has no formal definition. The site names ONE rule and uses it
 * everywhere: Fred Espenak's 361,885 km, the common "within 90% of perigee"
 * reading. It lives here, and /moon/supermoons/ imports it, because the site
 * previously carried two thresholds — this calendar badged at 360,000 km while
 * the supermoon list used 361,885 — so three full moons were listed as
 * supermoons on one page and unbadged on another. Stated as "unusually close",
 * never as a fact of astronomy, on the page. */
export const SUPERMOON_KM = 361885;
/** The threshold as it is written in prose, so no page can hardcode its own. */
export const SUPERMOON_KM_TEXT = SUPERMOON_KM.toLocaleString("en-US") + " km";

/** Every full moon in `year` (UTC), each with its traditional name and flags. */
export function fullMoons(year) {
  const from = Date.UTC(year, 0, 1), to = Date.UTC(year + 1, 0, 1);
  const list = phasesBetween(from, to).filter((p) => p.kind === 2).map((p) => ({
    t: p.t,
    month: new Date(p.t).getUTCMonth(),
    dist: moonDistance(p.t),
  }));
  for (const f of list) {
    f.name = MONTH_MOON[f.month];
    f.supermoon = f.dist <= SUPERMOON_KM;
  }
  /* Harvest Moon: whichever full moon is closest to the September equinox. */
  const eq = septEquinox(year);
  let harvest = null;
  for (const f of list) if (!harvest || Math.abs(f.t - eq) < Math.abs(harvest.t - eq)) harvest = f;
  if (harvest) {
    const i = list.indexOf(harvest);
    harvest.name = "Harvest Moon";
    if (list[i + 1]) list[i + 1].name = "Hunter's Moon";
    /* when Harvest lands in October, September's full moon keeps Corn Moon */
    if (harvest.month === 8 && list[i - 1] && list[i - 1].month === 8) list[i - 1].name = "Corn Moon";
  }
  /* Blue moon (the popular definition): the second full moon in one calendar
   * month. The older seasonal definition is explained on the page instead of
   * being silently mixed in here.
   *
   * The flag and the name are decided separately. A month's name belongs to
   * its FIRST full moon, so the second takes "Blue Moon" instead of repeating
   * it — otherwise May 2026 lists "Flower Moon" twice. But an already-special
   * name wins: in 2031 the Harvest Moon is itself the second full moon of
   * September, and it stays the Harvest Moon with a Blue Moon badge rather
   * than disappearing from the year. */
  const perMonth = new Map();
  for (const f of list) perMonth.set(f.month, (perMonth.get(f.month) || 0) + 1);
  const seen = new Map();
  for (const f of list) {
    const n = (seen.get(f.month) || 0) + 1;
    seen.set(f.month, n);
    if (perMonth.get(f.month) > 1 && n === 2) {
      f.blue = true;
      if (f.name === MONTH_MOON[f.month]) f.name = "Blue Moon";
    }
  }
  return list;
}

/** All four primary phases in `year` (UTC), in order. */
export function yearPhases(year) {
  return phasesBetween(Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1));
}
