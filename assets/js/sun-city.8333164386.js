(function(){
  var C=window.AC_SUN_C;
  
  
function sunCalc(date,lat,lng,ang){
  var rad=Math.PI/180, dayMs=86400000, J1970=2440588, J2000=2451545, e=rad*23.4397;
  function toDays(d){ return d.valueOf()/dayMs - 0.5 + J1970 - J2000; }
  function sma(d){ return rad*(357.5291+0.98560028*d); }
  function ecl(M){ var C=rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M)), P=rad*102.9372; return M+C+P+Math.PI; }
  function dec(l){ return Math.asin(Math.sin(e)*Math.sin(l)); }
  function approxTransit(Ht,lw,n){ return 0.0009 + (Ht+lw)/(2*Math.PI) + n; }
  function transitJ(ds,M,L){ return J2000 + ds + 0.0053*Math.sin(M) - 0.0069*Math.sin(2*L); }
  function fromJ(j){ return (j + 0.5 - J1970)*dayMs; }
  var lw=rad*-lng, phi=rad*lat, d=toDays(date), n=Math.round(d-0.0009-lw/(2*Math.PI));
  var ds=approxTransit(0,lw,n), M=sma(ds), L=ecl(M), dc=dec(L), Jnoon=transitJ(ds,M,L);
  var x=(Math.sin(ang*rad)-Math.sin(phi)*Math.sin(dc))/(Math.cos(phi)*Math.cos(dc));
  var out={ noon:fromJ(Jnoon) };
  if(x>=-1&&x<=1){ var w=Math.acos(x), Jset=transitJ(approxTransit(w,lw,n),M,L); out.set=fromJ(Jset); out.rise=out.noon-(out.set-out.noon); }
  return out;
}
  
function sunPosition(date,lat,lng){
  var rad=Math.PI/180, dayMs=86400000, J1970=2440588, J2000=2451545, e=rad*23.4397;
  var d=date.valueOf()/dayMs - 0.5 + J1970 - J2000;
  var M=rad*(357.5291+0.98560028*d);
  var L=M+rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))+rad*102.9372+Math.PI;
  var dec=Math.asin(Math.sin(e)*Math.sin(L));
  var ra=Math.atan2(Math.sin(L)*Math.cos(e),Math.cos(L));
  /* Greenwich mean sidereal time, then the local hour angle */
  var H=rad*(280.16+360.9856235*d)-rad*-lng-ra, phi=rad*lat;
  var alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
  var az=Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi));
  return { alt: alt/rad, az: ((az/rad+180)%360+360)%360 };
}
var SUN_COMPASS16=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
var SUN_COMPASS_LONG=['north','north-northeast','northeast','east-northeast','east','east-southeast','southeast','south-southeast','south','south-southwest','southwest','west-southwest','west','west-northwest','northwest','north-northwest'];
function sunCompass(deg){ return SUN_COMPASS16[Math.round((((deg%360)+360)%360)/22.5)%16]; }
function sunCompassLong(deg){ return SUN_COMPASS_LONG[Math.round((((deg%360)+360)%360)/22.5)%16]; }
  
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
 * `south` flips it: the phase is identical everywhere on Earth, but below the
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
       "/assets/img/moon-face.a952fb5bbe.webp" is rewritten to the hashed .webp by build-inline, the
       same way "/assets/img/moon-face.b9e194850d.svg#ac-moon-face" is pointed at the hashed sprite.
       `plain` skips the face: the day/night map marker is too small to read it,
       and that page does not carry the sprite. */
    +(plain?'':(r<=32
      ? '<image href="/assets/img/moon-face.a952fb5bbe.webp" x="0" y="0" width="'+d+'" height="'+d+'"'+(south?' transform="rotate(180 '+cx+' '+cy+')"':'')+'/>'
      : '<g transform="scale('+(r/100)+')'+(south?' rotate(180 100 100)':'')+'"><use href="/assets/img/moon-face.b9e194850d.svg#ac-moon-face"/></g>'))
    /* Earthshine: the shadow is not equally opaque at every phase. Sunlight
       bounced off the Earth genuinely lights the moon's dark side, and it is
       most obvious on a thin crescent (a big, bright Earth in the moon's sky)
       and invisible next to a gibbous moon's glare — so the shadow lightens
       toward new and goes near-solid toward full. It also stops the sliver of
       shadow on a gibbous moon from looking like a smudge. */
    +(f>0.999?'':'<path d="'+shadow+'" fill="#0e0d08" fill-opacity="'+(0.91+0.075*f).toFixed(3)+'"/>')
    +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#57503a" stroke-width="1"/></svg>';
}

  
/* ---- geometry ---------------------------------------------------------- */
/* THE FRAME IS LANDSCAPE, 16:9. It was square, on the reasoning that this is a
   view of a plane — true, but the plane has a long axis: the sun is off one
   side and the Earth-and-moon system is on the other, and a square frame spent
   its height on nothing. Widening it buys the distance the picture most needs,
   which is the one between the sun and the Earth. It is also the shape a phone
   is held in when it is turned, which is what the full-screen view wants.

   THE SUN IS CENTRED ON THE LEFT EDGE, cut off on one side only. It used to sit
   in the top-left corner at an angle, which left the whole bottom-left of the
   frame empty and put the sun-Earth line at a 12-degree tilt. Centring it uses
   the left side's full height and makes that line exactly horizontal, so the
   day/night terminator is exactly vertical — which is easier to read and no
   less true.

   EVERYTHING IS SMALLER THAN IT COULD BE, ON PURPOSE. A picture that fills its
   frame with three big discs is the least realistic arrangement available: what
   is most wrong here is DISTANCE, and distance is measured in Earth-diameters,
   so shrinking the bodies while keeping the orbit wide improves every figure on
   the scale card at once. Against the previous, larger arrangement: the moon
   goes from 26x too close to 23x, the sun from 3,905x to 3,151x, and the clear
   sky between the sun's disc and the moon's from 63 units to 101. It is still
   enormously wrong — it has to be, at 11,740 Earth-diameters — but it is wrong
   by less, and it looks it.

   THE FLOOR ON THAT IS LEGIBILITY: the moon has to be big enough to show a lit
   half and a dark half on a phone. At 11.45 units in a 480-wide frame it is
   about 19px across on a 390px screen, which is the smallest that still reads.

   ORR_MR is not a free choice at all — the moon is 0.273 Earth diameters across
   and 11.45/42 is 0.2726, so the one ratio here that CAN be honest is, and the
   scale card prints both numbers side by side.

   THE MOON CLEARS THE SUN AT NEW MOON, its closest approach: 106 units of clear
   sky between the two discs, and the sun is then 1.9x further from the moon
   than the moon is from the Earth.

   ORR_RM ALSO HAS TO LEAVE ROOM FOR THE MOON'S LABEL BELOW IT. The label is
   pinned under the moon at every point on the orbit (see below), so the lowest
   the moon ever gets — ORR_CY+ORR_RM+ORR_MR — plus the label's own height has
   to stay inside ORR_H. At 107 the bottom of the moon is 253.5, the baseline
   lands at 264.5 and the frame ends at 270: the word clears the moon by about
   two units and the frame by five. This is why the orbit is not larger. */
/* THE HEIGHT IS FIXED AND THE WIDTH IS NOT. Every size in the picture — the
   Earth, the moon, the orbit, the sun — is set against ORR_H, which never
   changes; ORR_W is only the DEFAULT width, the one a card uses. The Earth sits
   a fixed distance in from the RIGHT edge and the sun a fixed distance in from
   the LEFT, so a wider frame does exactly one thing: it puts more space between
   them. That is the right thing for it to do, because the sun's distance is by
   far the most wrong figure in the picture, so every extra pixel of it makes
   the picture less wrong — and nothing about the bodies moves, so the drawing
   looks identical at any width.

   It is what lets full screen FILL the screen. A fixed-ratio picture in a box
   of some other ratio has to letterbox; this one is handed the box's own ratio
   and fills it exactly, at whatever height is left after the controls. On the
   smallest phone likely to be used that height is what sets the body sizes,
   which is the floor the sizes below were chosen against. */
var ORR_W=480, ORR_H=270,         /* 480 is the DEFAULT width, not the only one */
    ORR_RIGHT=135,                /* the Earth's centre, in from the right    */
    ORR_CY=135,                   /* ...and centred vertically               */
    ORR_R=42,                     /* the Earth's drawn radius                */
    ORR_RM=107,                   /* the moon's schematic orbit radius       */
    ORR_MR=11.45,                 /* the moon's drawn radius: see above      */
    ORR_SX=32, ORR_SY=135, ORR_RS=88;  /* the sun, centred on the left edge  */
var ORR_CX=ORR_W-ORR_RIGHT;       /* the default frame's Earth               */
/* the widest the frame is allowed to get. Past this the sun is so far from the
   Earth that the picture is mostly empty sky, which is realistic and useless. */
var ORR_WMAX=1100;
function orrFrameW(w){ return Math.max(ORR_W, Math.min(ORR_WMAX, Math.round(w||ORR_W))); }
/* WHERE THE SUN IS PINNED, DERIVED from where it is drawn rather than typed
   beside it. The scene is rotated so the real sun lands on this screen angle,
   and the day/night line is drawn square-on to it — so if this and the drawn
   position ever disagreed, the lit half of the Earth would not face the sun.
   It cannot now: both come from ORR_SX/ORR_SY. (Screen angle is measured the
   mathematical way, x right and y UP, hence CY-SY.) */
var ORR_SUNANG=Math.atan2(ORR_CY-ORR_SY, -1);   /* due left: SY === CY */
/* the day/night line is perpendicular to the sun, so its two ends are the sun
   angle turned a quarter turn either way. These replace the fixed 45-degree
   diagonal that only worked while the sun sat exactly on the corner diagonal. */
var ORR_TX=Math.sin(ORR_SUNANG), ORR_TY=Math.cos(ORR_SUNANG);
function orrF(n){ return Math.round(n*10)/10; }
/* Label boxes, so two labels never land on top of each other and none of them
   walks off the edge. Widths are estimated from the character count at the one
   font size used here — near enough for keeping text apart, and it costs no
   measuring pass (the build has no DOM at all). */
var ORR_PAD=4;                    /* how close a label may sit to the frame  */
function orrClampX(x,anch,w,W){
  W=W||ORR_W;
  if(anch==='start') return Math.min(Math.max(x,ORR_PAD),W-ORR_PAD-w);
  if(anch==='end') return Math.max(Math.min(x,W-ORR_PAD),ORR_PAD+w);
  return Math.min(Math.max(x,ORR_PAD+w/2),W-ORR_PAD-w/2);
}
function orrEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* equatorial right ascension/declination -> ecliptic longitude/latitude. The
   positions come out of MOON_CORE in equatorial coordinates because that is
   what rise/set and altitude need; this view is drawn in the plane the Earth
   orbits in, so it needs the other pair. Converting is three lines and keeps
   ONE solar/lunar series on the page. */
function orrEcl(ra,dec){
  var ce=Math.cos(MN_OBL), se=Math.sin(MN_OBL);
  return { lam:Math.atan2(Math.sin(ra)*ce+Math.tan(dec)*se, Math.cos(ra)),
           bet:Math.asin(Math.sin(dec)*ce-Math.cos(dec)*se*Math.sin(ra)) };
}
function orrUnit(lam,bet){ return [Math.cos(bet)*Math.cos(lam), Math.cos(bet)*Math.sin(lam), Math.sin(bet)]; }
/* a unit vector in Earth-equator coordinates -> the same vector in the orbit
   plane's coordinates (a single rotation by the axial tilt) */
function orrToEcl(v){ var ce=Math.cos(MN_OBL), se=Math.sin(MN_OBL);
  return [v[0], v[1]*ce+v[2]*se, -v[1]*se+v[2]*ce]; }

/* Everything the picture and its caption need for one instant and one place. */
function orrCalc(ms,lat,lon){
  var d=mnDays(ms), sp=mnSunPos(d), mp=mnMoonPos(d);
  var se=orrEcl(sp.ra,sp.dec), me=orrEcl(mp.ra,mp.dec);
  var S=orrUnit(se.lam,se.bet), M=orrUnit(me.lam,me.bet);
  /* the reader's own spot: their zenith direction. mnSidereal gives the right
     ascension of their meridian, so this is the same vector whose dot product
     with the sun is the altitude printed above the picture. */
  var phi=MN_RAD*lat, th=mnSidereal(d,MN_RAD*-lon);
  var O=orrToEcl([Math.cos(phi)*Math.cos(th), Math.cos(phi)*Math.sin(th), Math.sin(phi)]);
  /* Look down from the reader's OWN hemisphere: from above the north pole of
     the orbit for the northern half of the world, from below it for the
     southern. Otherwise every southern city would spend its day on the far
     side of the globe, hidden behind the Earth it is standing on. The flip
     mirrors the scene, which is why the Earth and moon turn the other way
     round below the equator — as they genuinely appear to from down there. */
  var flip=lat<0?-1:1;
  var rho=ORR_SUNANG-Math.atan2(flip*S[1],S[0]), cr=Math.cos(rho), sr=Math.sin(rho);
  function pr(v){ var a=v[0], b=flip*v[1];
    return { x:a*cr-b*sr, y:a*sr+b*cr, z:flip*v[2] }; }
  function clamp(v){ return v<-1?-1:(v>1?1:v); }
  return { pr:pr, obs:pr(O), moon:pr(M), pole:pr(orrToEcl([0,0,flip])), phi:phi,
    /* geometric, unrefracted — used only to say which side of the line the
       marker is on, never to print a number that would sit beside the
       refracted altitude in the card and disagree with it */
    sunAlt:Math.asin(clamp(S[0]*O[0]+S[1]*O[1]+S[2]*O[2]))/MN_RAD,
    elong:Math.acos(clamp(S[0]*M[0]+S[1]*M[1]+S[2]*M[2]))/MN_RAD };
}

/* ---- the picture ------------------------------------------------------- */
function orrSvg(ms,lat,lon,name,fw){
  var g=orrCalc(ms,lat,lon), i, k, s;
  var W=orrFrameW(fw), CX=W-ORR_RIGHT;
  var CY=ORR_CY, R=ORR_R, TX=ORR_TX, TY=ORR_TY;
  /* the ends of the day/night line, square-on to the sun and so at a fixed
     angle. There used to be a drawn beam as well — a tinted wedge plus two
     stroked lines running from the sun's edges to these two points. It was
     geometrically honest and it read badly: a hard-edged band lying across the
     picture, which looks like an object rather than like light, and which drew
     the eye away from the three things that actually move. The lit half of the
     Earth and the sun's own glow say the same thing without it. */
  /* the two ends of the day/night line: the sun's screen angle, turned a
     quarter turn each way. With the sun on the old corner diagonal these came
     out at exactly +/-45 degrees, which is why a constant used to do. */
  var ax=CX+R*TX, ay=CY+R*TY, bx=CX-R*TX, by=CY-R*TY;

  s='<svg viewBox="0 0 '+W+' '+ORR_H+'" width="'+W+'" height="'+ORR_H+'" aria-hidden="true">'
   + '<defs><radialGradient id="orr-glow" gradientUnits="userSpaceOnUse" cx="'+ORR_SX+'" cy="'+ORR_SY+'" r="'+(ORR_RS+26)+'">'
   + '<stop offset="'+orrF(ORR_RS/(ORR_RS+26))+'" stop-color="#fcd34d" stop-opacity=".34"/><stop offset="1" stop-color="#fcd34d" stop-opacity="0"/></radialGradient>'
   /* the sun runs off two edges, so the scene is clipped to the panel's own
      rounded rectangle rather than letting it spill */
   + '<clipPath id="orr-clip"><rect width="'+W+'" height="'+ORR_H+'" rx="16"/></clipPath></defs>'
   + '<g clip-path="url(#orr-clip)">'
   + '<rect width="'+W+'" height="'+ORR_H+'" rx="16" fill="#0a1020"/>'
   /* the sun. Drawn running off the corner rather than as a tidy disc: it is
      109 Earths wide and the picture cannot hold it. */
   + '<circle cx="'+ORR_SX+'" cy="'+ORR_SY+'" r="'+(ORR_RS+26)+'" fill="url(#orr-glow)"/>'
   + '<circle cx="'+ORR_SX+'" cy="'+ORR_SY+'" r="'+ORR_RS+'" fill="#fcd34d"/>'
   /* the centre is inside the frame now, so the label sits on it */
   + '<text x="'+ORR_SX+'" y="'+(ORR_SY+5)+'" text-anchor="middle" font-size="14" font-weight="700" fill="#4b3a05">Sun</text>'
   /* the moon's orbit, dotted because the radius is schematic */
   + '<circle cx="'+CX+'" cy="'+CY+'" r="'+ORR_RM+'" fill="none" stroke="#a8b6c8" stroke-opacity=".34" stroke-width="1" stroke-dasharray="2 4"/>'
   /* the Earth, lit side first */
   + '<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="#2f74ad"/>';

  /* The reader's daily circle: where their spot goes as the Earth turns. The
     half of it on the lit side is their daylight, which is the day length
     printed further up the page — the same fact, drawn. The part on the far
     side of the globe is behind the Earth, so it is drawn as barely-there
     dots rather than as a line that would appear to be in front. */
  var near=[], far=[], seg=null, wasVis=null;
  for(k=0;k<=64;k++){
    var t=k/64*2*Math.PI;
    var p=g.pr(orrToEcl([Math.cos(g.phi)*Math.cos(t), Math.cos(g.phi)*Math.sin(t), Math.sin(g.phi)]));
    var vis=p.z>=0;
    if(vis!==wasVis){ seg=[]; (vis?near:far).push(seg); wasVis=vis; }
    seg.push(orrF(CX+R*p.x)+','+orrF(CY-R*p.y));
  }
  /* The part of the circle on the FAR side of the globe goes under the night
     shading — it is behind the Earth and should read that way. */
  for(i=0;i<far.length;i++) if(far[i].length>1)
    s+='<polyline points="'+far[i].join(' ')+'" fill="none" stroke="#e8eef7" stroke-opacity=".13" stroke-width="1" stroke-dasharray="1 3"/>';

  /* night: the half turned away from the sun, laid over the globe */
  s+='<path d="M'+orrF(ax)+' '+orrF(ay)+'A'+R+' '+R+' 0 0 1 '+orrF(bx)+' '+orrF(by)+'Z" fill="#050a16" fill-opacity=".84"/>';

  /* ...and the near half of the daily circle goes OVER it, at one strength the
     whole way round. It used to sit under the shading, which dimmed the half a
     reader most wants to follow — the night half, where their own spot is when
     the question is "am I in the dark yet". Same colour on both sides now: the
     day/night line it crosses already says which part is which. */
  for(i=0;i<near.length;i++) if(near[i].length>1)
    s+='<polyline points="'+near[i].join(' ')+'" fill="none" stroke="#e8eef7" stroke-opacity=".38" stroke-width="1.1" stroke-dasharray="3 3"/>';
  s+='<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="#9dc2e0" stroke-opacity=".45" stroke-width="1"/>';

  /* The pole, which is the axial tilt made visible: it leans toward the sun in
     the reader's summer and away from it in their winter, and that lean is the
     whole reason the daily circle above sits where it does. */
  var pl=g.pole, plx=CX+R*pl.x, ply=CY-R*pl.y, pd=Math.sqrt(pl.x*pl.x+pl.y*pl.y)||1;
  s+='<path d="M'+CX+' '+CY+'L'+orrF(plx)+' '+orrF(ply)+'" stroke="#e8eef7" stroke-opacity=".33" stroke-width="1"/>'
   + '<circle cx="'+orrF(plx)+'" cy="'+orrF(ply)+'" r="1.8" fill="#e8eef7" fill-opacity=".65"/>'
   + '<text x="'+orrF(plx+pl.x/pd*8)+'" y="'+orrF(ply-pl.y/pd*8+3.5)+'" text-anchor="middle" font-size="10" fill="#e8eef7" fill-opacity=".6" paint-order="stroke" stroke="#0a1020" stroke-width="2.5">'+(lat<0?'S':'N')+'</text>';

  /* The reader. The tick runs straight up out of their spot — that is the
     direction they call "overhead", and how close it is to the day/night line
     is how low the sun is for them. A spot on the far side of the globe is
     drawn hollow rather than moved or dropped. */
  var o=g.obs, od=Math.sqrt(o.x*o.x+o.y*o.y), ux=od>0.02?o.x/od:0, uy=od>0.02?o.y/od:1;
  var oX=CX+R*o.x, oY=CY-R*o.y, vis2=o.z>=0;
  /* the label is the place name without its state or country suffix — the page
     it sits on has already said which one, and the picture has 320px total */
  var lab=String(name||'You').split(',')[0], lw=lab.length*6.4;
  var lx=orrClampX(CX+(R+13)*ux, (ux>0.25?'start':(ux<-0.25?'end':'middle')), lw, W);
  var anch=ux>0.25?'start':(ux<-0.25?'end':'middle');
  var ly=CY-(R+13)*uy+(uy<-0.5?9:(uy>0.5?-3:4));
  /* The tick and the name carry a class because they are the two things that
     have to GO while the picture is being played through a month. The name is
     anchored to a spot on a turning Earth, so at speed it swings round the
     globe dragging its leader line behind it, and that movement is louder than
     everything it is there to help you watch. The marker itself and its daily
     circle stay — they are the point. See ORR_SPIN below. */
  s+='<path class="orr-citytick" d="M'+orrF(oX)+' '+orrF(oY)+'L'+orrF(CX+(R+9)*ux)+' '+orrF(CY-(R+9)*uy)+'" stroke="#fcd34d" stroke-opacity="'+(vis2?'.75':'.35')+'" stroke-width="1.2"'+(vis2?'':' stroke-dasharray="2 2"')+'/>'
   + '<circle cx="'+orrF(oX)+'" cy="'+orrF(oY)+'" r="3.4" fill="'+(vis2?'#fcd34d':'none')+'" stroke="#fcd34d" stroke-opacity="'+(vis2?'.9':'.5')+'" stroke-width="1.2"/>'
   + '<text class="orr-cityname" x="'+orrF(lx)+'" y="'+orrF(ly)+'" text-anchor="'+anch+'" font-size="12" font-weight="600" fill="#fde68a" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+orrEsc(lab)+'</text>';

  /* The moon, at its true direction from the Earth. Its lit half faces the sun
     like everything else here — from this vantage every moon looks half lit,
     and that is the point: the phase people see is not how much of the moon is
     lit but how much of the lit half faces them, which is the ANGLE in this
     picture. */
  var m=g.moon, md=Math.sqrt(m.x*m.x+m.y*m.y)||1, mx=CX+ORR_RM*m.x/md, my=CY-ORR_RM*m.y/md;
  var mr=ORR_MR;
  s+='<circle cx="'+orrF(mx)+'" cy="'+orrF(my)+'" r="'+mr+'" fill="#4b5563"/>'
   + '<path d="M'+orrF(mx+mr*TX)+' '+orrF(my+mr*TY)+'A'+mr+' '+mr+' 0 0 0 '+orrF(mx-mr*TX)+' '+orrF(my-mr*TY)+'Z" fill="#e8eef7"/>'
   + '<circle cx="'+orrF(mx)+'" cy="'+orrF(my)+'" r="'+mr+'" fill="none" stroke="#cbd5e1" stroke-opacity=".55" stroke-width="1"/>';
  /* THE LABEL IS ALWAYS DIRECTLY BELOW THE MOON. It used to pick from three
     offsets — beside, below, above — taking the first that cleared the city's
     name and the frame, which meant it hopped from one side of the moon to the
     other as the moon went round. That is fine on a still picture and awful on
     a moving one: with Play running, the one word on screen that is not moving
     smoothly jumps. One fixed offset costs a little clearance and buys a label
     the eye can stop tracking.

     It cannot collide with the city's name, and that is geometry rather than
     luck: the city label is anchored on the Earth's disc and cannot reach
     further than R + its own width from the Earth's centre, while the moon's
     label sits ORR_RM out plus its own drop. Nor can it leave the frame — see
     the note on ORR_RM above for the bottom, and orrClampX still holds the
     sides for the rare wide-frame case. */
  var mw=30, lby=my+mr+11;
  s+='<text x="'+orrF(orrClampX(mx,'middle',mw,W))+'" y="'+orrF(lby)+'" text-anchor="middle" font-size="12" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">Moon</text>';

  /* the phase as seen from Earth, sitting in the sun–earth gap, low in the
     frame. The moon on the ring is always half-lit from this vantage; this
     disc is the face a person on Earth actually sees, and it updates as the
     moon goes round. */
  var il=mnIllum(ms);
  var phR=14, gapL=ORR_SX+ORR_RS, gapR=CX-R;
  var phx=(gapL+gapR)/2, phy=ORR_H-42;
  s+='<g class="orr-phase" transform="translate('+orrF(phx-phR)+' '+orrF(phy-phR)+')">'
   +mnGlyph(il.fraction,il.waxing,phR,lat<0,1)
   +'</g>'
   +'<text class="orr-phase-lab" x="'+orrF(phx)+'" y="'+orrF(phy+phR+12)+'" text-anchor="middle" font-size="11" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+orrEsc(mnName(il.phase))+'</text>';

  return s+'</g></svg>';
}

/* ---- the caption -------------------------------------------------------
 * The picture is decorative markup (the SVG is aria-hidden); this sentence is
 * the part that has to carry it in words, so it says what the marker is doing
 * and what the moon's angle means rather than describing shapes. */
function orrNote(ms,lat,lon,name,live){
  var g=orrCalc(ms,lat,lon), il=mnIllum(ms), nm=mnName(il.phase);
  /* Every claim in here is about ONE instant, and that instant is only "now"
     while the control below the picture says so — otherwise this would tell a
     reader looking at next October what the sky is doing today. */
  var when=live===false?'at the time shown':'right now';
  /* the sentence opens with it, and /sun/anywhere/ hands over "your location" */
  var place=orrEsc(name||'Your location');
  place=place.charAt(0).toUpperCase()+place.slice(1);
  var lit=g.sunAlt>0;
  var edge=Math.abs(g.sunAlt)<8 ? ', close to the line where day meets night' : '';
  return '<b>'+place+'</b> is the marker on the globe \u2014 on the '+(lit?'daylit':'night')+' half '+when+edge
   + ', riding the dotted circle its spot traces as the Earth turns. '
   + 'The moon is <b>'+Math.round(g.elong)+'\u00b0</b> from the sun in the sky '+(live===false?'then':'now')+', and that angle is the phase: '
   + nm.charAt(0).toLowerCase()+nm.slice(1)+'. '
   + 'You are looking down on the Earth from far above its orbit, from the '+(lat<0?'south':'north')+' \u2014 the side you are on \u2014 '
   + 'with sunlight arriving from the top left, so the half of the Earth facing that way is the half having its day. '
   + 'Sizes and distances are not to scale; the directions are.';
}

/* ---- the instant being drawn -------------------------------------------
 * The picture started out as a read-out of NOW. It is worth more than that:
 * the geometry solves for an arbitrary instant, so letting the reader move the
 * instant turns the same picture into "where will the sun and moon be when I
 * get there" — the question a photographer actually has.
 *
 * ORR_AT is the whole of that state: null means live (the page's own tick keeps
 * the picture on the current minute), anything else freezes it on a chosen
 * instant. TWO controls write it, and the difference between them is what the
 * rest of the page does about it:
 *
 *   - the date+time field changes the DAY, and the host page follows: sunrise,
 *     the dial, the twilight bands, the 7-day table, the moon's rise and set.
 *     Those are all per-day facts and a page showing two different days at once
 *     would be worse than no control at all.
 *   - the slider scrubs the time WITHIN that day, and nothing else moves. The
 *     day's facts have not changed — only where the two bodies are in it — so
 *     it repaints this card and no more, which is what makes it cheap enough to
 *     drag.
 *
 * The field is a native datetime-local on purpose: its own date and time
 * pickers on every platform, one line wide, no library — and its value is a
 * naive wall-clock reading with no zone of its own, which is exactly right
 * here, because the clock this page must show is the PLACE's, never the
 * visitor's. */
var ORR_AT=null, ORR_LAST=null, ORR_ONCHANGE=null;
function orrLive(){ return ORR_AT==null; }
function orrAt(){ return ORR_AT; }                 /* null, or the chosen instant */
function orrWhen(){ return ORR_AT==null?Date.now():ORR_AT; }
function orrOnChange(fn){ ORR_ONCHANGE=fn; }       /* host repaints its own numbers */

/* epoch -> "YYYY-MM-DDTHH:mm" as the clock reads in tz (what the input wants) */
function orrLocalValue(ms,tz){
  try{
    var o={ year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' };
    if(tz) o.timeZone=tz;
    var ps=new Intl.DateTimeFormat('en-CA',o).formatToParts(new Date(ms));
    function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return ps[i].value; return '00'; }
    return g('year')+'-'+g('month')+'-'+g('day')+'T'+g('hour')+':'+g('minute');
  }catch(e){ return ''; }
}
function orrDayOf(ms,tz){ return orrLocalValue(ms,tz).slice(0,10); }
function orrMinOf(ms,tz){ var v=orrLocalValue(ms,tz); return (+v.slice(11,13))*60+(+v.slice(14,16)); }
function orrPad(n){ return (n<10?'0':'')+n; }
/* how far tz is from UTC at a given instant, in ms */
function orrOffset(ms,tz){
  try{
    var o={ year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' };
    if(tz) o.timeZone=tz;
    var ps=new Intl.DateTimeFormat('en-GB',o).formatToParts(new Date(ms));
    function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return +ps[i].value; return 0; }
    return Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'),g('second'))-ms;
  }catch(e){ return 0; }
}
/* "YYYY-MM-DDTHH:mm" read in tz -> epoch. Two passes, because the offset has to
   be measured somewhere and the first guess can land on the far side of a
   daylight-saving change from the answer (the technique lib.mjs uses for event
   dates). An hour that does not exist locally — the spring-forward gap — comes
   back as a real instant an hour to one side of it, because there is no such
   local time and so no sky to draw for it. */
function orrParse(v,tz){
  var m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v||''); if(!m) return null;
  var guess=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
  var o1=orrOffset(guess,tz), t=guess-o1, o2=orrOffset(t,tz);
  if(o2!==o1) t=guess-o2;
  return t;
}

/* ---- THE SLIDER'S SPAN: ONE LAP OF THE MOON -------------------------------
 * The bar used to cover a DAY, which is the wrong unit for this picture. What
 * it draws is the moon's angle from the sun — the phase — and that angle takes
 * a synodic month to come round. Across a day it moves 13 degrees, so the whole
 * length of the control bought a thirtieth of the one cycle it exists to show.
 * End to end is now exactly one revolution: drag from the left edge to the
 * right and the moon goes round the Earth once and comes back to the phase it
 * started in.
 *
 * The span is anchored at MIDNIGHT of the day the card is on, so the left edge
 * lines up with the day the rest of the page is about and the thumb starts
 * wherever in that day the reader is. Choosing another day — the field, Now,
 * the page's own date pickers — re-anchors it (orrSpanFix). */
var ORR_SYN=29.530588853;                          /* days, sun to sun */
var ORR_SPAN_MIN=Math.round(ORR_SYN*1440);         /* the slider's max, in minutes */
var ORR_SPAN0=null;                                /* epoch of the left edge */
function orrSpanStart(tz,ms){
  var t=orrParse(orrDayOf(ms,tz)+'T00:00',tz);
  return t==null?ms:t;
}
function orrSpanFix(ms,tz,force){
  if(force||ORR_SPAN0==null||ms<ORR_SPAN0||ms>=ORR_SPAN0+ORR_SPAN_MIN*60000)
    ORR_SPAN0=orrSpanStart(tz,ms);
  return ORR_SPAN0;
}
/* where the thumb sits for an instant, and what instant a thumb position is */
function orrSpanPos(ms,tz){ return Math.round((ms-orrSpanFix(ms,tz))/60000); }
function orrSpanAt(min,tz){ return orrSpanFix(orrWhen(),tz)+min*60000; }

/* ---- PLAY ----------------------------------------------------------------
 * The slider moves the instant WITHIN a day, and across a day the moon travels
 * 13 degrees — real, and too little to read as an orbit. So the picture drew a
 * city spinning on an Earth the moon appeared to be pinned to, which is the
 * opposite of what the card is for. Play runs the clock forward across days
 * instead, at a rate chosen so the LUNAR CYCLE is the thing you see.
 *
 * One drawn day every 1.4 seconds: a full cycle of the moon's phase takes about
 * 41 seconds, and the city marker comes round once every 1.4 — fast enough to
 * read as spin, slow enough to follow.
 *
 * WHILE IT RUNS, ONLY THIS CARD MOVES. Every frame calls orrSet with
 * dayChanged FALSE, so the host page repaints the picture and its live rows and
 * not the day's own facts — sunrise, the dial, the tables — which would be a
 * full re-render sixteen times a second. The page catches up in ONE re-render
 * when the picture stops, which is also the moment a reader looks at it. */
var ORR_PLAY=0, ORR_IV=0, ORR_ANCH=0, ORR_T0=0;
var ORR_SPEED=86400000/1400;
function orrPlaying(){ return !!ORR_PLAY; }
function orrPlayBtn(){ return document.getElementById('orr-play'); }
function orrPlayStop(sync){
  if(!ORR_PLAY) return;
  ORR_PLAY=0;
  if(ORR_IV){ clearInterval(ORR_IV); ORR_IV=0; }
  var b=orrPlayBtn();
  if(b){ b.setAttribute('aria-pressed','false'); b.textContent='Play'; }
  /* the city's name and leader line come back the moment the picture stops */
  var f=document.getElementById('orr-fig'); if(f) f.classList.remove('orr-spin');
  var re=document.getElementById('orr-scrub-lab'); if(re) re.textContent=orrScrubLab();
  /* sync=false when the caller is about to move the instant itself (Now, the
     field, the slider): re-rendering the old day first would be a wasted pass */
  if(sync!==false) orrSet(orrWhen(), true);
}
function orrPlayStart(){
  if(ORR_PLAY) return;
  ORR_PLAY=1; ORR_ANCH=orrWhen(); ORR_T0=Date.now();
  var b=orrPlayBtn();
  if(b){ b.setAttribute('aria-pressed','true'); b.textContent='Pause'; }
  /* see .orr-spin in 20d2-orrery.css: the name is pinned to a spot on a turning
     Earth and swings round the globe dragging its line, which is louder than
     the thing the animation exists to show */
  var f=document.getElementById('orr-fig'); if(f) f.classList.add('orr-spin');
  var re=document.getElementById('orr-scrub-lab'); if(re) re.textContent=orrScrubLab();
  ORR_IV=setInterval(function(){
    if(!ORR_PLAY) return;
    var tz=(ORR_LAST||{}).tz;
    /* WRAPPED INSIDE THE SPAN, so Play and the slider are the same journey:
       one press takes the moon round the Earth once, the thumb crosses the bar
       once, and then it starts again rather than wandering off into next year. */
    var span=ORR_SPAN_MIN*60000, t0=orrSpanFix(ORR_ANCH,tz);
    var off=(ORR_ANCH-t0)+(Date.now()-ORR_T0)*ORR_SPEED;
    orrSet(t0+(off%span), false);
  },66);
}
function orrPlayToggle(){ if(ORR_PLAY) orrPlayStop(true); else orrPlayStart(); }

/* Move the instant and tell the host. dayChanged says whether the rest of the
   page has to follow, which is the whole difference between the field and the
   slider. */
function orrSet(t,dayChanged){
  ORR_AT=t;
  if(ORR_ONCHANGE) ORR_ONCHANGE(!!dayChanged);
  else { var L=ORR_LAST||{}; orrShow(L.lat,L.lon,L.name,L.tz); }
}

/* Paint for one instant. The DOM wiring lives here rather than in each
   generator so /sun/ and /moon/ fill the same markup the same way, and it does
   nothing at all on a page that does not render the figure. */
function orrPaint(ms,lat,lon,name,tz){
  var f=document.getElementById('orr-fig'); if(!f) return;
  ORR_LAST={ lat:lat, lon:lon, name:name, tz:tz };
  f.innerHTML=orrSvg(ms,lat,lon,name);
  var n=document.getElementById('orr-note'); if(n) n.innerHTML=orrNote(ms,lat,lon,name,orrLive());
  var inp=document.getElementById('orr-at');
  if(inp){
    /* never yank the value out from under someone mid-edit: the page's own
       30-second tick calls straight through here */
    if(document.activeElement!==inp){ var v=orrLocalValue(ms,tz); if(inp.value!==v) inp.value=v; }
    inp.disabled=false;                         /* it can only work with JS */
  }
  var sl=document.getElementById('orr-slider');
  if(sl){ if(document.activeElement!==sl){ var mn=orrSpanPos(ms,tz); if(+sl.value!==mn) sl.value=mn; }
    sl.disabled=false; }
  var re=document.getElementById('orr-scrub-lab');
  if(re) re.textContent=orrScrubLab();
  orrWire();
}

/* the line under the slider doubles as the card's state read-out */
function orrScrubLab(){
  return orrPlaying() ? 'Playing — a day every 1.4 seconds, and the whole bar is one lap of the moon'
    : 'Press Play, or drag: end to end is one full turn of the moon round the Earth — 29 days and 13 hours';
}

/* Everything the host page calls: paint for whatever instant is current. */
function orrShow(lat,lon,name,tz){ orrPaint(orrWhen(),lat,lon,name,tz); }

/* One-time listeners. The field moves the day (host follows), the slider moves
   the time inside it (host does not), Now hands the picture back to the clock. */
function orrWire(){
  var inp=document.getElementById('orr-at'), sl=document.getElementById('orr-slider'),
      nw=document.getElementById('orr-now'), L=function(){ return ORR_LAST||{}; };
  var pl=document.getElementById('orr-play');
  if(pl&&!pl.getAttribute('data-orr-wired')){
    pl.setAttribute('data-orr-wired','1');
    pl.hidden=false;                            /* useless without JS, ships hidden */
    pl.addEventListener('click',orrPlayToggle);
    /* a tab in the background gets no frames anyway, and coming back to a
       picture that has silently run three months on is not a feature */
    document.addEventListener('visibilitychange',function(){ if(document.hidden) orrPlayStop(true); });
  }
  if(inp&&!inp.getAttribute('data-orr-wired')){
    inp.setAttribute('data-orr-wired','1');
    inp.addEventListener('change',function(){
      orrPlayStop(false);
      var tz=L().tz, t=orrParse(inp.value,tz);
      /* a cleared field means "no particular time", which is the live clock */
      if(t==null){ orrSpanFix(Date.now(),tz,1); orrSet(null, orrDayOf(Date.now(),tz)!==orrDayOf(orrWhen(),tz)); return; }
      orrSpanFix(t,tz,1);                       /* the bar starts at the chosen day */
      orrSet(t, orrDayOf(t,tz)!==orrDayOf(orrWhen(),tz));
    });
  }
  if(sl&&!sl.getAttribute('data-orr-wired')){
    sl.setAttribute('data-orr-wired','1');
    /* 'input', not 'change': the picture follows the thumb as it is dragged.
       Each repaint is one solar and one lunar position and a string of SVG —
       cheap enough to run per frame, which is why the slider can be scoped to
       this card and skip the page's per-day work entirely. */
    /* DRAGGING CROSSES DAYS NOW, and that is the point — but the host page's
       per-day work (sunrise, the dial, the twilight bands, the 7-day table) is
       far too heavy to redo per frame. So 'input' moves the picture alone and
       'change' — which fires once, when the thumb is let go — hands the page
       the day it landed on. Smooth while dragging, correct when it stops. */
    sl.addEventListener('input',function(){
      orrPlayStop(false);
      var t=orrSpanAt(+sl.value||0, L().tz);
      if(t!=null) orrSet(t,false);
    });
    sl.addEventListener('change',function(){
      var tz=L().tz, t=orrSpanAt(+sl.value||0, tz);
      if(t!=null) orrSet(t, orrDayOf(t,tz)!==orrDayOf(orrWhen(),tz));
    });
  }
  if(nw&&!nw.getAttribute('data-orr-wired')){
    nw.setAttribute('data-orr-wired','1');
    nw.hidden=false;                            /* useless without JS, ships hidden */
    nw.addEventListener('click',function(){
      var tz=L().tz, changed=orrDayOf(Date.now(),tz)!==orrDayOf(orrWhen(),tz);
      orrPlayStop(false);
      orrSpanFix(Date.now(),tz,1);              /* back to today, and the bar with it */
      orrSet(null, changed);
    });
  }
}

  
function sunArcInner(S,TW,tz,lat,dateMs,nowMs){
  var X0=32,X1=608,TOP=20,HZ=132,DIP=152,RT=172,RB=190,rad=Math.PI/180;
  function fmt(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
  function hod(ms){ try{ var p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }catch(e){ return 12; } }
  /* solar declination for the day — same series sunCalc uses for the times */
  var dd=new Date(dateMs).valueOf()/86400000-0.5+2440588-2451545;
  var M=rad*(357.5291+0.98560028*dd);
  var Lc=M+rad*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))+rad*102.9372+Math.PI;
  var dec=Math.asin(Math.sin(rad*23.4397)*Math.sin(Lc)), phi=rad*lat, hN=hod(S.noon);
  /* altitude in degrees at local hour h — it passes exactly through −0.833° at
     the sunrise and sunset the rest of the page prints, because it is the same
     geometry those times come from */
  function alt(h){ return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(2*Math.PI*(h-hN)/24))/rad; }
  /* Where the day starts on the axis. Normally midnight, which is what people
     expect. But where the clock sits far from the sun — Nome in July sets at
     12:31 AM — a midnight-to-midnight axis chops the daylight in two and parks
     the halves at opposite ends of the chart. When the day's events stop
     falling in order, the window re-centres on solar noon (rounded to a whole
     hour, so the axis labels stay on the hour) and the daylight reads as one
     continuous band. */
  var evs=[TW.rise,S.rise,S.set,TW.set],hh=[],q,wraps=false;
  for(q=0;q<evs.length;q++) if(evs[q]) hh.push(hod(evs[q]));
  for(q=1;q<hh.length;q++) if(hh[q]<hh[q-1]) wraps=true;
  var h0=wraps?((Math.round(hN)-12)%24+24)%24:0;
  function U(h){ return ((h-h0)%24+24)%24; }                 /* clock hour → hours into the window */
  function XU(u){ return +(X0+(u/24)*(X1-X0)).toFixed(1); }  /* hours into the window → x */
  function X(h){ return XU(U(h)); }
  var peak=alt(hN),PK=TOP+24;
  /* height is drawn on a true 0–90° scale, so a June arc in Miami towers over a
     December one in Seattle instead of both filling the panel — the shape is
     part of the information. Below the horizon the scale compresses (0 to −18°
     in 20px) so the night dip stays a hint, not half the chart. */
  function Y(a){ return +(a>=0 ? HZ-(Math.min(a,90)/90)*(HZ-PK) : HZ+Math.min(-a,18)/18*(DIP-HZ)).toFixed(1); }
  function sunGlyph(x,y){ var g='<g transform="translate('+x+' '+y+')"><circle r="5" fill="#fcd34d"/>',k,a;
    for(k=0;k<8;k++){ a=k*Math.PI/4; g+='<line x1="'+(6.8*Math.cos(a)).toFixed(1)+'" y1="'+(6.8*Math.sin(a)).toFixed(1)+'" x2="'+(9.4*Math.cos(a)).toFixed(1)+'" y2="'+(9.4*Math.sin(a)).toFixed(1)+'" stroke="#fcd34d" stroke-width="1.5" stroke-linecap="round"/>'; }
    return g+'</g>'; }
  /* every label carries a dark outline (paint-order puts the stroke behind the
     glyphs) so it stays readable wherever it lands — over the gold fill, the
     curve, or the live sun riding it */
  function txt(x,y,anchor,size,fill,weight,s,cls){ return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+fill+'" paint-order="stroke" stroke="#12172b" stroke-width="3.5" stroke-linejoin="round"'+(weight?' font-weight="'+weight+'"':'')+(cls?' class="'+cls+'"':'')+'>'+s+'</text>'; }
  /* two wordings of the same label — the long one on wide screens, the short
     one on phones, where the chart is scaled down to fit and CSS swaps them
     (a presentation attribute loses to a stylesheet rule, so the media query
     can also bump these back up to a legible size) */
  function two(long,short,time){ return '<tspan class="sun-aL">'+long+'</tspan><tspan class="sun-aS">'+short+'</tspan>'+time; }
  /* a label beside a point. Labels may run into the 32px margins either side of
     the panel (the viewBox is wider than the plot); they only flip to the other
     side of the point when they'd leave the chart entirely. */
  function side(x,y,right,s,size,fill,weight,cls){ var a=right?'start':'end', xx=x+(right?9:-9);
    if(right&&xx>540){ a='end'; xx=x-9; } if(!right&&xx<100){ a='start'; xx=x+9; }
    return txt(xx.toFixed(1),y,a,size,fill,weight,s,cls); }

  var out='<defs>'
    +'<linearGradient id="sunArcG" x1="0" y1="'+TOP+'" x2="0" y2="'+HZ+'" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fcd34d" stop-opacity=".40"/><stop offset="1" stop-color="#fcd34d" stop-opacity=".04"/></linearGradient>'
    +'<linearGradient id="sunTwA" x1="0" x2="1"><stop offset="0" stop-color="#141c3a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>'
    +'<linearGradient id="sunTwB" x1="0" x2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#141c3a"/></linearGradient>'
    +'<clipPath id="sunRailC"><rect x="'+X0+'" y="'+RT+'" width="'+(X1-X0)+'" height="'+(RB-RT)+'" rx="9"/></clipPath></defs>';
  out+='<rect x="'+X0+'" y="'+TOP+'" width="'+(X1-X0)+'" height="'+(DIP-TOP)+'" rx="10" fill="#12172b"/>';
  out+='<rect x="'+X0+'" y="'+HZ+'" width="'+(X1-X0)+'" height="'+(DIP-HZ)+'" fill="#0a0f22"/>';
  for(var g=6;g<24;g+=6) out+='<line x1="'+XU(g)+'" y1="'+TOP+'" x2="'+XU(g)+'" y2="'+DIP+'" stroke="rgba(148,163,184,.13)" stroke-width="1"/>';

  /* sample the altitude across the local day, then split into above/below-
     horizon runs so each can be drawn in its own style (and so midnight sun,
     polar night and a sunset after midnight all fall out for free) */
  var pts=[],i,u,a;
  for(i=0;i<=96;i++){ u=i*0.25; a=alt(h0+u); pts.push([XU(u),Y(a),a]); }
  var runs=[],cur=null;
  for(i=0;i<pts.length;i++){ var up=pts[i][2]>=0;
    if(!cur||cur.up!==up){ cur={up:up,p:[]}; runs.push(cur); if(i>0) cur.p.push(pts[i-1]); }
    cur.p.push(pts[i]); }
  for(i=0;i<runs.length;i++){
    var r=runs[i],dPath='',k;
    for(k=0;k<r.p.length;k++) dPath+=(k?'L':'M')+r.p[k][0]+' '+r.p[k][1]+' ';
    /* a daylight run is one path doing two jobs: stroked as the curve, and
       filled as the area under it — an open path fills as if closed, and the
       closing chord runs between the two horizon crossings, i.e. along the
       horizon. Saves emitting the whole curve twice on every page. */
    out+=r.up
      ? '<path d="'+dPath+'" fill="url(#sunArcG)" stroke="#fcd34d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="'+dPath+'" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="4 5" opacity=".6" stroke-linecap="round"/>';
  }
  out+='<line x1="'+X0+'" y1="'+HZ+'" x2="'+X1+'" y2="'+HZ+'" stroke="rgba(148,163,184,.5)" stroke-width="1"/>';

  /* the live sun goes on before the labels so the text sits on top of it */
  var hn=null;
  if(nowMs!=null){ hn=hod(nowMs); var an=alt(hn);
    out+=an>=0?sunGlyph(X(hn),Y(an)):'<circle cx="'+X(hn)+'" cy="'+Y(an)+'" r="3.6" fill="#cbd5e1"/>'; }

  var hasSun=!!(S.rise&&S.set), hr=hasSun?hod(S.rise):null, hs=hasSun?hod(S.set):null;
  if(hasSun){
    out+='<circle cx="'+X(hr)+'" cy="'+HZ+'" r="4.5" fill="#fcd34d" stroke="#12172b" stroke-width="1.5"/>';
    out+='<circle cx="'+X(hs)+'" cy="'+HZ+'" r="4.5" fill="#fcd34d" stroke="#12172b" stroke-width="1.5"/>';
    /* labels sit on the NIGHT side of each dot, where the panel is empty —
       inside the arc they'd land on the curve. side() flips them back in only
       when a very early rise or late set would push them off the chart. */
    out+=side(X(hr),HZ-11,false,two('Sunrise ','',fmt(S.rise)),12,'#e2e8f0','700');
    out+=side(X(hs),HZ-11,true,two('Sunset ','',fmt(S.set)),12,'#e2e8f0','700');
  } else {
    out+=txt(320,TOP+16,'middle',12,'#94a3b8','700',peak>-0.833?'Midnight sun — the sun never sets today':'Polar night — the sun never rises today');
  }
  var py=Y(peak);
  out+=sunGlyph(X(hN),py);
  out+=txt(X(hN),Math.max(py-17,TOP+9).toFixed(1),'middle',11,'#94a3b8','',two(hasSun?'Solar noon ':'Highest ',hasSun?'Noon ':'Peak ',fmt(S.noon))+' · '+two('sun ','',Math.round(peak)+'° high'),'sun-pk');

  /* row 2 — the twilight rail: night, first light, daylight, last light, night */
  out+='<rect x="'+X0+'" y="'+RT+'" width="'+(X1-X0)+'" height="'+(RB-RT)+'" rx="9" fill="#0a0f22" stroke="rgba(148,163,184,.25)"/>';
  /* segments are placed in window hours, so a span that runs past the window's
     end simply splits and continues at the left edge */
  function seg(a1,a2,fill){ if(a1==null||a2==null) return '';
    var u1=U(a1),u2=U(a2);
    if(u2<u1) return segU(u1,24,fill)+segU(0,u2,fill);
    return segU(u1,u2,fill); }
  function segU(u1,u2,fill){ if(XU(u2)-XU(u1)<0.4) return '';
    return '<rect x="'+XU(u1)+'" y="'+RT+'" width="'+(XU(u2)-XU(u1)).toFixed(1)+'" height="'+(RB-RT)+'" fill="'+fill+'" clip-path="url(#sunRailC)"/>'; }
  var hd=TW.rise?hod(TW.rise):null, hk=TW.set?hod(TW.set):null;
  out+=seg(hd,hr,'url(#sunTwA)')+seg(hr,hs,'#fbbf24')+seg(hs,hk,'url(#sunTwB)');
  if(!hasSun&&peak>-0.833) out+=segU(0,24,'#fbbf24');
  /* far north in summer, last light lands after midnight — i.e. at the LEFT end
     of the same day, right next to first light. Stack the two labels when that
     happens instead of printing them over each other. */
  var stack=(hd!=null&&hk!=null&&Math.abs(X(hk)-X(hd))<200);
  if(hd!=null){ out+='<line x1="'+X(hd)+'" y1="'+(RT-4)+'" x2="'+X(hd)+'" y2="'+(RB+4)+'" stroke="#93c5fd" stroke-width="1.4"/>';
    out+=side(X(hd),RT-9,false,two('First light ','First ',fmt(TW.rise)),11,'#93c5fd','700'); }
  if(hk!=null){ out+='<line x1="'+X(hk)+'" y1="'+(RT-4)+'" x2="'+X(hk)+'" y2="'+(RB+4)+'" stroke="#93c5fd" stroke-width="1.4"/>';
    out+=side(X(hk),stack?RT-23:RT-9,true,two('Last light ','Last ',fmt(TW.set)),11,'#93c5fd','700'); }
  /* axis labels follow the window, so a noon-centred chart reads 3 AM … 3 AM */
  for(i=0;i<=24;i+=6){ var ah=(h0+i)%24, ap=ah<12?' AM':' PM', a12=ah%12; if(a12===0) a12=12;
    out+=txt(XU(i),RB+16,'middle',9.5,'#7c88a8','',a12+ap,'sun-ax'); }

  /* the "now" hairline goes on last so it reads across both rows */
  if(hn!=null) out+='<line x1="'+X(hn)+'" y1="'+TOP+'" x2="'+X(hn)+'" y2="'+RB+'" stroke="rgba(226,232,240,.4)" stroke-width="1" stroke-dasharray="3 4"/>';
  return out;
}
  /* ---- the live sun position. Same phase thresholds as the build-time
     SUN_PHASES table, in the same order, so the baked copy and the live one
     can never disagree about which twilight is running. ---- */
  var SUN_PHASES=[[6,'Full daylight','The sun is well up.'],
    [-0.833,'Daylight','The sun is up, low in the sky.'],
    [-6,'Civil twilight','Below the horizon, but still bright enough to be outside without a light.'],
    [-12,'Nautical twilight','Deeper dusk — the horizon is still faintly visible.'],
    [-18,'Astronomical twilight','Nearly dark; the brightest stars are out.'],
    [-90,'Night','The sun is far below the horizon — full astronomical darkness.']];
  /* The whole card is drawn for ONE instant, and the control under the picture
     owns which one: live by default, or whatever date and time the reader set.
     Everything here therefore reads orrWhen() rather than Date.now() — a card
     whose picture showed next October under an altitude row still labelled
     "right now" would be worse than having no control at all. */
  function sunNowPaint(){
    var box=document.getElementById('sun-now-alt'); if(!box) return;
    var t=orrWhen(), live=orrLive();
    var p=sunPosition(new Date(t),C.lat,C.lon), i, ph=SUN_PHASES[SUN_PHASES.length-1];
    for(i=0;i<SUN_PHASES.length;i++){ if(p.alt>=SUN_PHASES[i][0]){ ph=SUN_PHASES[i]; break; } }
    put('sun-now-alt',p.alt.toFixed(1)+'\u00b0');
    put('sun-now-az',p.az.toFixed(1)+'\u00b0');
    put('sun-now-dir',sunCompassLong(p.az));
    put('sun-now-phase',ph[1]);
    put('sun-now-note', live?ph[2]:('At the time shown, '+ph[2].charAt(0).toLowerCase()+ph[2].slice(1)));
    /* the baked stamp said "shown for 2:14 PM"; once we are live it is simply now */
    put('sun-now-stamp','');
    /* Heading and row label follow the instant too. These two lines are the
       difference between a read-out and a claim about the present. */
    var h2=document.getElementById('sun-now-h2');
    if(h2) h2.textContent = live ? 'Where the sun is right now'
      : (t>Date.now()+60000 ? 'Where the sun will be' : 'Where the sun was');
    put('sun-now-rowlab', live?'Right now':'At that time');
    /* the moon line, live from the same instant — mnPos already ships in this
       controller for the moonrise/moonset rows, so this costs no extra code */
    var ml=document.getElementById('sun-nowmoon');
    if(ml){ var mp=mnPos(t,C.lat,C.lon), href=ml.querySelector('a');
      var url=(href&&href.getAttribute('href'))||'/moon/';
      ml.innerHTML = mp.alt>0
        ? 'The moon is up too — <b>'+mp.alt.toFixed(1)+'°</b> above the horizon in the <b>'+mnCompass(mp.az)+'</b>. <a href="'+url+'">Moonrise, moonset and tonight’s phase &rarr;</a>'
        : 'The moon is below the horizon here '+(live?'right now':'at that time')+' (<b>'+mp.alt.toFixed(1)+'°</b>). <a href="'+url+'">When it rises, and tonight’s phase &rarr;</a>'; }
    /* and the view from outside — same instant, same series (orrery.mjs) */
    orrPaint(t,C.lat,C.lon,C.city||'',C.tz);
  }
  /* The control under the picture owns the instant for the WHOLE page. Move the
     time of day and only this card repaints (the day's own facts have not
     changed); move the day and the page follows — dial, arc, twilight bands,
     7-day table, the answer sentence — because a page showing two different
     days at once is exactly the confusion the control is meant to remove. */
  orrOnChange(function(dayChanged){
    sunNowPaint();
    if(dayChanged&&goToDate) goToDate(orrDayOf(orrWhen(),C.tz));
  });
  /* ...and the reverse: the page's own date pickers move the instant with them,
     keeping the time of day, so the two controls can never disagree. Picking
     today hands the picture back to the live clock. */
  function orrFromDate(v){
    var tz=C.tz;
    if(v===orrDayOf(Date.now(),tz)){ orrSet(null,false); return; }
    var t=orrParse(v+'T'+orrLocalValue(orrWhen(),tz).slice(11),tz);
    if(t!=null) orrSet(t,false);
  }
  function hm(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:C.tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
  function dur(ms){ var m=Math.round(ms/60000); return Math.floor(m/60)+' h '+(m%60)+' m'; }
  function dayLabel(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:C.tz,weekday:'short',month:'short',day:'numeric'}).format(new Date(ms)); }catch(e){ return ''; } }
  function dayLong(ms){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:C.tz,weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date(ms)); }catch(e){ return ''; } }
  function lenWords(ms){ var m=Math.round(ms/60000),h=Math.floor(m/60),mm=m%60; return h+' hour'+(h===1?'':'s')+' '+mm+' minute'+(mm===1?'':'s'); }
  function put(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  /* golden hour (sun −4°→+6°) & blue hour (−6°→−4°): morning & evening ranges */
  function sunBands(d,lat,lon){ var a6=sunCalc(d,lat,lon,6),am4=sunCalc(d,lat,lon,-4),am6=sunCalc(d,lat,lon,-6);
    var am12=sunCalc(d,lat,lon,-12), am18=sunCalc(d,lat,lon,-18), s0=sunCalc(d,lat,lon,-0.833);
    function rng(a,b){ return (a&&b&&b>a)?(hm(a)+' – '+hm(b)):'—'; }
    return { ghAm:rng(am4.rise,a6.rise), ghPm:rng(a6.set,am4.set), blAm:rng(am6.rise,am4.rise), blPm:rng(am4.set,am6.set),
      civAm:rng(am6.rise,s0.rise), civPm:rng(s0.set,am6.set),
      nauAm:rng(am12.rise,am6.rise), nauPm:rng(am6.set,am12.set),
      astAm:rng(am18.rise,am12.rise), astPm:rng(am12.set,am18.set) }; }
  /* Moon illumination + glyph now come from the shared MOON_CORE inlined
     above (seo/tools/moon.mjs), not a local copy — the whole point of that
     module is that /moon/, /sun/ and /tides/ can't drift apart on what phase
     it is. The glyph mirrors below the equator, which the local copy didn't. */
  function updateMoon(){ var m=mnIllum(Date.now()), ico=document.getElementById('sun-moon-ico');
    if(ico) ico.innerHTML=mnGlyph(m.fraction,m.waxing,22,C.lat<0); put('sun-moon-name',mnName(m.phase)); put('sun-moon-pct',Math.round(m.fraction*100)+'%');
    /* moonrise/moonset for the city's local day (mnTimes is in MOON_CORE above) */
    var mp=new Intl.DateTimeFormat('en-GB',{timeZone:C.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':');
    var mds=Date.now()-(+mp[0]*3600+ +mp[1]*60)*1000-(Date.now()%60000), mt=mnTimes(mds,C.lat,C.lon);
    put('sun-moon-rise', mt.rise?hm(mt.rise):(mt.alwaysUp?'up all day':'—'));
    put('sun-moon-set', mt.set?hm(mt.set):(mt.alwaysDown?'down all day':'—')); }
  /* the arc card above the dial: its stat line + the two-row chart. The live
     "now" marker only means anything on today, so other dates draw without it
     (and so does the baked server-rendered copy). */
  var arcToday=true, updNext=function(){};   /* set by the countdown block below */
  var setDates=function(){};                 /* set by the date-picker block below */
  var goToDate=null;                         /* ditto: jump the page to a YYYY-MM-DD */
  /* the answer sentence as the build wrote it, so returning to today restores
     the exact markup renderFor() fills in rather than a rebuilt copy */
  var ANSWER0=(document.getElementById('sun-answer')||{}).innerHTML||'';
  function esc0(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function paintArc(d,isToday,s2,tw2){
    arcToday=isToday;
    put('sun-arc-len', s2.rise?lenWords(s2.set-s2.rise):'Midnight sun / polar night');
    put('sun-arc-rise', s2.rise?hm(s2.rise):'—');
    put('sun-arc-set', s2.set?hm(s2.set):'—');
    /* the countdown only means anything on today; on any other date the row
       says which day is being shown instead of ticking toward nothing */
    var nx=document.getElementById('sun-next');
    if(nx&&!isToday) nx.textContent='Showing '+dayLabel(d.getTime());
    if(isToday) updNext();
    var el=document.getElementById('sun-arc'); if(!el) return;
    el.innerHTML=sunArcInner(s2,tw2,C.tz,C.lat,d.getTime(),isToday?Date.now():null);
  }
  /* keep the sun riding the curve while the tab is open (today only) */
  (function(){ if(!document.getElementById('sun-arc')) return;
    setInterval(function(){ if(!arcToday) return; var t=new Date();
      paintArc(t,true,sunCalc(t,C.lat,C.lon,-0.833),sunCalc(t,C.lat,C.lon,-6)); },60000); })();

  var now=new Date();
  var s=sunCalc(now,C.lat,C.lon,-0.833), tw=sunCalc(now,C.lat,C.lon,-6);
  /* stats + dial for any chosen date (the dropdown below the dial) */
  function renderFor(d,isToday){
    var s2=sunCalc(d,C.lat,C.lon,-0.833), tw2=sunCalc(d,C.lat,C.lon,-6);
    if(s2.rise){ put('sun-rise',hm(s2.rise)); put('sun-set',hm(s2.set)); put('sun-len',dur(s2.set-s2.rise)); }
    else { put('sun-rise','—'); put('sun-set','—'); put('sun-len','Midnight sun / polar night'); }
    put('sun-noon',hm(s2.noon));
    put('sun-dawn', tw2.rise?hm(tw2.rise):'—');
    put('sun-dusk', tw2.set?hm(tw2.set):'—');
    var bands=sunBands(d,C.lat,C.lon);
    put('sun-gh-am',bands.ghAm); put('sun-gh-pm',bands.ghPm); put('sun-bl-am',bands.blAm); put('sun-bl-pm',bands.blPm);
    put('sun-civ-am',bands.civAm); put('sun-civ-pm',bands.civPm);
    put('sun-nau-am',bands.nauAm); put('sun-nau-pm',bands.nauPm);
    put('sun-ast-am',bands.astAm); put('sun-ast-pm',bands.astPm);
    paintArc(d,isToday,s2,tw2);
    if(isToday) updateMoon();
    /* The answer-first sentence. On today it is refreshed in place (the build
       baked yesterday-or-today's values into it for crawlers). On any other
       date it is REWRITTEN to name that date: a page reached by the tomorrow
       link, showing tomorrow in every card, must not still open with a line
       that says "today" — that is the contradiction the date link would
       otherwise create on the most-read line of the page. */
    var ansEl=document.getElementById('sun-answer');
    if(ansEl&&!isToday){
      var dl=dayLong(d.getTime()), city=esc0(C.city||'this location');
      ansEl.innerHTML = s2.rise
        ? 'On <b>'+esc0(dl)+'</b> the sun rises in '+city+' at <b>'+hm(s2.rise)+'</b> and sets at <b>'+hm(s2.set)+'</b>, giving <b>'+lenWords(s2.set-s2.rise)+'</b> of daylight. First light is at <b>'+(tw2.rise?hm(tw2.rise):'—')+'</b>, last light at <b>'+(tw2.set?hm(tw2.set):'—')+'</b>, and solar noon at <b>'+hm(s2.noon)+'</b>.'
        : 'On <b>'+esc0(dl)+'</b> '+city+' has no ordinary sunrise or sunset — at this latitude the sun stays continuously above or below the horizon. Solar noon is <b>'+hm(s2.noon)+'</b>.';
    }
    if(isToday){
      if(ansEl&&ANSWER0) ansEl.innerHTML=ANSWER0;
      put('sun-a-rise', s2.rise?hm(s2.rise):'—');
      put('sun-a-set', s2.set?hm(s2.set):'—');
      put('sun-a-noon', hm(s2.noon));
      put('sun-a-len', s2.rise?lenWords(s2.set-s2.rise):'—');
      put('sun-a-dawn', tw2.rise?hm(tw2.rise):'—');
      put('sun-a-dusk', tw2.set?hm(tw2.set):'—');
      var yd=sunCalc(new Date(d.getTime()-86400000),C.lat,C.lon,-0.833);
      if(s2.rise&&yd.rise){ var df=Math.round(((s2.set-s2.rise)-(yd.set-yd.rise))/60000);
        put('sun-a-delta', df===0?'about the same as yesterday':(Math.abs(df)+' minute'+(Math.abs(df)===1?'':'s')+' '+(df>0?'more':'less')+' than yesterday')); }
    }
    drawDial(s2,tw2,C.tz,document.getElementById('sun-dial'),{noteEl:document.getElementById('sun-dial-note'),hand:isToday,live:isToday});
    var note=document.getElementById('sun-dial-note');
    if(note&&!isToday) note.textContent=note.textContent.replace(' The hand shows the time there right now.',' Showing '+dayLabel(d.getTime())+'.');
  }
  /* TWO date pickers now — one in the daylight card's heading, one under the
     dial — and they are the same control: changing either moves both and
     redraws everything once. */
  var dateEls=[document.getElementById('sun-date2'),document.getElementById('sun-date')].filter(Boolean);
  if(dateEls.length){
    /* the picker accepts ANY date; sun math is valid for centuries either way */
    function ymdTz(ms){ return new Intl.DateTimeFormat('en-CA',{timeZone:C.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms)); }
    function hodTz2(ms){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:C.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    /* an instant near local noon of the picked calendar day in the CITY's zone */
    function cityNoon(ymd){ var pp=ymd.split('-'), guess=Date.UTC(+pp[0],+pp[1]-1,+pp[2],12,0,0);
      var off=hodTz2(guess)-12; var t=guess-off*3600e3;
      if(ymdTz(t)!==ymd){ t+= (ymdTz(t)<ymd?86400e3:-86400e3)/2; }
      return new Date(t); }
    setDates=function(v){ for(var i=0;i<dateEls.length;i++) if(dateEls[i].value!==v) dateEls[i].value=v; };
    goToDate=function(v){ setDates(v); renderFor(cityNoon(v), v===ymdTz(now.getTime())); };
    setDates(ymdTz(now.getTime()));
    dateEls.forEach(function(el){ el.min='1900-01-01'; el.max='2099-12-31';
      el.addEventListener('change',function(){ if(!el.value) return;
        setDates(el.value);
        renderFor(cityNoon(el.value), el.value===ymdTz(now.getTime()));
        orrFromDate(el.value); }); });
  }
  put('sun-today', dayLong(now.getTime()));
  /* 7-day table (rebuilt on midnight rollover) */
  function chgCell(ms){ if(ms==null) return '—'; var m=Math.round(ms/60000); return m===0?'\u00b10 min':(m>0?'+':'\u2212')+Math.abs(m)+' min'; }
  function buildWeek(){
    var rows='';
    var yw=sunCalc(new Date(now.getTime()-86400000),C.lat,C.lon,-0.833);
    var prevLen=yw.rise?(yw.set-yw.rise):null;
    for(var k=0;k<7;k++){
      var d=new Date(now.getTime()+k*86400000), sk=sunCalc(d,C.lat,C.lon,-0.833);
      var len=sk.rise?(sk.set-sk.rise):null, chg=(len!=null&&prevLen!=null)?(len-prevLen):null;
      var cell=k===0?('Today <span class="sun-wd">'+dayLabel(d.getTime())+'</span>')
        :k===1?('Tomorrow <span class="sun-wd">'+dayLabel(d.getTime())+'</span>')
        :dayLabel(d.getTime());
      rows+='<tr'+(k===1?' class="sun-tmw-row"':'')+'><td>'+cell+'</td><td>'+(sk.rise?hm(sk.rise):'—')+'</td><td>'+(sk.set?hm(sk.set):'—')+'</td><td>'+(sk.rise?dur(sk.set-sk.rise):'—')+'</td><td>'+chgCell(chg)+'</td></tr>';
      prevLen=len;
    }
    var tbl=document.getElementById('sun-week');
    if(tbl) tbl.innerHTML='<tr><th>Day</th><th>Sunrise</th><th>Sunset</th><th>Day length</th><th>Daily change</th></tr>'+rows;
  }
  buildWeek();

  /* tomorrow, recomputed from the visitor's now. The baked values come from the
     build clock; someone reading at 11pm local on the day of a build wants the
     day after THEIR today, which can already be a different date. */
  function paintTomorrow(){
    if(!document.getElementById('sun-tmw-rise')) return;
    var t=new Date(Date.now()+86400000), sc=sunCalc(t,C.lat,C.lon,-0.833);
    var today=sunCalc(new Date(),C.lat,C.lon,-0.833);
    put('sun-tmw-rise', sc.rise?hm(sc.rise):'—');
    put('sun-tmwlink-rise', sc.rise?hm(sc.rise):'—');   /* the pointer in the arc card */
    /* ...and its href, for the same reason the time beside it is repainted: at
       11pm local the build's tomorrow is already today. */
    var tl=document.getElementById('sun-tmwlink-a'), base=tl&&tl.getAttribute('data-sun-base');
    if(base){ try{ tl.setAttribute('href', base+'?date='+new Intl.DateTimeFormat('en-CA',{timeZone:C.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(t)); }catch(e){} }
    put('sun-tmw-set', sc.set?hm(sc.set):'—');
    put('sun-tmw-len', sc.rise?dur(sc.set-sc.rise):'—');
    put('sun-tmw-day', dayLong(sc.noon));
    var note=document.getElementById('sun-tmw-note'); if(!note) return;
    if(!sc.rise){ note.textContent='Tomorrow the sun does not rise or set here — at this latitude it stays above or below the horizon around this date.'; return; }
    var chg=today.rise?Math.round(((sc.set-sc.rise)-(today.set-today.rise))/60000):null;
    var chgTxt=(chg==null||chg===0)?'the same length as today'
      :(Math.abs(chg)+' minute'+(Math.abs(chg)===1?'':'s')+' '+(chg>0?'longer':'shorter')+' than today');
    note.innerHTML='Tomorrow the sun rises at <b>'+hm(sc.rise)+'</b> and sets at <b>'+hm(sc.set)+'</b> — '
      +lenWords(sc.set-sc.rise)+' of daylight, '+chgTxt+'.';
  }
  paintTomorrow();

  /* next solar event — a live "in Xh Ym" countdown that upgrades the baked
     absolute time (#sun-next; guarded, so tool pages without it are unaffected).
     It sits in the daylight card and only ticks while that card is showing
     today — on any other picked date paintArc owns the line instead. */
  (function(){
    var el=document.getElementById('sun-next'); if(!el) return;
    function gap(ms){ var m=Math.round(ms/60000), h=Math.floor(m/60), mm=m%60;
      return h<=0 ? (mm+' minute'+(mm===1?'':'s')) : (h+' hour'+(h===1?'':'s')+' '+mm+' minute'+(mm===1?'':'s')); }
    function upd(){ if(!arcToday) return;
      var t=Date.now(), sc=sunCalc(new Date(t),C.lat,C.lon,-0.833); if(!sc.rise||!sc.set){ el.textContent=''; return; }
      var txt;
      if(t<sc.rise) txt='Sunrise in '+gap(sc.rise-t);
      else if(t<sc.set) txt='Sunset in '+gap(sc.set-t);
      else { var tm=sunCalc(new Date(t+86400000),C.lat,C.lon,-0.833); txt=tm.rise?('Sunrise tomorrow at '+hm(tm.rise)):''; }
      el.textContent=txt; }
    updNext=upd; upd(); setInterval(upd,30000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) upd(); });
  })();

  
  /* ---- the 24-hour sun dial: noon at top, midnight at bottom. Day wedge
   * tinted gold, dawn/dusk twilight wedges tinted amber, radial lines at
   * sunrise/sunset (solid) and first/last light (dashed), a sun or moon
   * icon for each hour with the 24h numeral inside the ring, and a live
   * hand pointing at the current time in the city's own zone. ---- */
  function drawDial(S,TW,TZ,svg,opts){
    opts=opts||{}; if(!svg) return;
    /* R1 sits just past the icon tips so the margin outside the sun/moon
       icons equals the gap inside them (icon ring R2, rays to 8.6, inner
       separator ring at 112 -> gap 7.4 each side) */
    var C=146,R1=144,R2=128,R3=97,RW=86;
    function ang(h){ return h/24*2*Math.PI; }  /* 0h at top, noon at bottom */
    function px(h,r){ var a=ang(h); return (C+r*Math.sin(a)).toFixed(1); }
    function py(h,r){ var a=ang(h); return (C-r*Math.cos(a)).toFixed(1); }
    function hmz(ms,tz){ try{ return new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch(e){ return '—'; } }
    function hod(ms){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    var hr=S.rise?hod(S.rise):6, hs=S.set?hod(S.set):18;
    var hd=TW.rise?hod(TW.rise):hr-0.6, hk=TW.set?hod(TW.set):hs+0.6;
    function wedge(h1,h2,color){ if(h2<=h1) h2+=24; if(h2<=h1) return ''; /* wrap past midnight (Arctic summer) */
      var large=(h2-h1)>12?1:0;
      return '<path d="M'+C+' '+C+' L'+px(h1,RW)+' '+py(h1,RW)+' A'+RW+' '+RW+' 0 '+large+' 1 '+px(h2,RW)+' '+py(h2,RW)+' Z" fill="'+color+'"/>'; }
    function line(h,color,dash){ return '<line x1="'+px(h,58)+'" y1="'+py(h,58)+'" x2="'+px(h,RW)+'" y2="'+py(h,RW)+'" stroke="'+color+'" stroke-width="1.8"'+(dash?' stroke-dasharray="3 4" opacity=".75"':'')+'/>'; }
    function sunIco(x,y){ var o='<g transform="translate('+x+' '+y+')"><circle r="4.6" fill="#fcd34d"/>';
      for(var k=0;k<8;k++){ var a=k*Math.PI/4; o+='<line x1="'+(6.2*Math.cos(a)).toFixed(1)+'" y1="'+(6.2*Math.sin(a)).toFixed(1)+'" x2="'+(8.6*Math.cos(a)).toFixed(1)+'" y2="'+(8.6*Math.sin(a)).toFixed(1)+'" stroke="#fcd34d" stroke-width="1.4" stroke-linecap="round"/>'; }
      return o+'</g>'; }
    function moonIco(x,y){ return '<g transform="translate('+x+' '+y+')"><circle r="6.2" fill="#cbd5e1"/><circle cx="3.2" cy="-2.2" r="5.2" fill="#12172b"/></g>'; }
    var out='<circle cx="'+C+'" cy="'+C+'" r="'+R1+'" fill="#12172b" stroke="#2b3350" stroke-width="1.5"/>';
    out+='<circle cx="'+C+'" cy="'+C+'" r="112" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>';
    out+=wedge(hd,hk,'rgba(251,146,60,.13)');           /* dawn->dusk amber under-glow */
    out+=wedge(hr,hs,'rgba(252,211,77,.18)');           /* daylight gold */
    /* subtle ring enclosing the day/night face (matches the numeral ring) */
    out+='<circle cx="'+C+'" cy="'+C+'" r="'+RW+'" fill="none" stroke="rgba(148,163,184,.28)" stroke-width="1"/>';
    out+=line(hd,'#fb923c',true)+line(hk,'#fb923c',true);
    out+=line(hr,'#fcd34d')+line(hs,'#fcd34d');
    for(var i=0;i<24;i++){
      var mid=i+0.5, day=hs>hr?(mid>=hr&&mid<=hs):(mid>=hr||mid<=hs);
      out+=(day?sunIco(px(mid,R2),py(mid,R2)):moonIco(px(mid,R2),py(mid,R2)));
      var big=(i%6===0);
      out+='<text x="'+px(mid,R3)+'" y="'+py(mid,R3)+'" text-anchor="middle" dy=".34em" font-size="'+(big?11:8.5)+'" font-weight="'+(big?'700':'400')+'" fill="'+(big?'#e2e8f0':'#7c88a8')+'">'+i+'</text>';
    }
    var labels=[[hr,'Sunrise','#fcd34d'],[hs,'Sunset','#fcd34d'],[hd,'Dawn','#fb923c'],[hk,'Dusk','#fb923c']];
    var hand='';
    function handNow(){
      var hn=hod(Date.now()), a=ang(hn), sx=Math.sin(a), cx2=Math.cos(a);
      function X(r,o){ return (C+r*sx+o*cx2).toFixed(1); }
      function Y(r,o){ return (C-r*cx2+o*sx).toFixed(1); }
      return '<line x1="'+C+'" y1="'+C+'" x2="'+X(80,0)+'" y2="'+Y(80,0)+'" stroke="#f8fafc" stroke-width="2.2" stroke-linecap="round"/>'
        +'<polygon points="'+X(90,0)+','+Y(90,0)+' '+X(79,3.6)+','+Y(79,3.6)+' '+X(79,-3.6)+','+Y(79,-3.6)+'" fill="#f8fafc"/>'
        +'<circle cx="'+C+'" cy="'+C+'" r="4" fill="#fcd34d"/>';
    }
    /* the gold center pivot stays even when the hand is hidden (non-today dates) */
    var pivot='<circle cx="'+C+'" cy="'+C+'" r="4" fill="#fcd34d"/>';
    /* The hand is never in the served HTML — it's drawn here at view time,
       repainted every minute, and repainted IMMEDIATELY when a background
       tab becomes visible again (browsers throttle timers, so without this
       a tab reopened hours later could briefly show the old hand). A token
       on the svg makes stale repaints from superseded drawDial calls
       (e.g. after a date-picker change) clean themselves up. */
    var tok={}; svg.__acTok=tok; var iv=null;
    function paint(){ if(svg.__acTok!==tok||(iv&&!svg.isConnected)){ if(iv) clearInterval(iv); return; }
      svg.innerHTML=out+(opts.hand===false?pivot:handNow()); }
    paint();
    if(opts.live!==false){ iv=setInterval(paint,60000);
      var onVis=function(){ if(svg.__acTok!==tok||!svg.isConnected){ document.removeEventListener('visibilitychange',onVis); return; }
        if(!document.hidden) paint(); };
      document.addEventListener('visibilitychange',onVis); }
    var note=opts.noteEl;
    if(note) note.textContent='The gold band is daylight, from '+(S.rise?hmz(S.rise,TZ):'—')+' to '+(S.set?hmz(S.set,TZ):'—')+'. The amber dashes mark first light at '+(TW.rise?hmz(TW.rise,TZ):'—')+' and last light at '+(TW.set?hmz(TW.set,TZ):'—')+'. The hand shows the time there right now.';
  }

  /* ?date=YYYY-MM-DD — where the "Tomorrow's sunrise" link lands. The page is
     static and its canonical is the clean URL, so this is one page rendered for
     a different day, not a second page: no crawler is offered anything it
     cannot already reach, and the reader gets the day they clicked for. */
  (function(){
    var q=null; try{ q=new URLSearchParams(location.search).get('date'); }catch(e){}
    if(q&&/^\d{4}-\d{2}-\d{2}$/.test(q)&&q>='1900-01-01'&&q<='2099-12-31'&&goToDate){ goToDate(q); orrFromDate(q); return; }
    renderFor(now,true);
  })();

  /* midnight rollover: if the tab stays open past midnight (or is refocused
     on a later day) and the picker is still on "today", flip the dial,
     stats, date field and 7-day table to the new day */
  (function(){
    function dkey(){ try{ return new Intl.DateTimeFormat('en-CA',{timeZone:C.tz}).format(new Date()); }catch(e){ return ''; } }
    var k0=dkey();
    function chk(){ var k=dkey(); if(k===k0) return;
      var ds=document.getElementById('sun-date')||document.getElementById('sun-date2');
      var onToday=!ds||!ds.value||ds.value===k0; k0=k;
      if(!onToday) return;
      now=new Date(); setDates(k);
      put('sun-today', dayLong(now.getTime()));
      renderFor(now,true); buildWeek(); paintTomorrow(); }
    setInterval(chk,60000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) chk(); });
  })();

  /* ---- annual sunrise/sunset trend with solstice markers ---- */
  (function(){
    var svg=document.getElementById('sun-year'); if(!svg) return;
    function hodTz(ms){ var p=new Intl.DateTimeFormat('en-GB',{timeZone:C.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).split(':'); return +p[0]+p[1]/60; }
    function unwrap(h,ref){ while(h-ref>12) h-=24; while(ref-h>12) h+=24; return h; }
    var W=640,H=260,padL=46,padR=12,padT=14,padB=26,iw=W-padL-padR,ih=H-padT-padB;
    var yr=new Date().getFullYear(), y0=new Date(yr,0,1), rise=[], set=[], longest=null, shortest=null;
    for(var d=0;d<365;d+=3){
      var t=new Date(y0.getTime()+d*86400e3+12*3600e3), sc=sunCalc(t,C.lat,C.lon,-0.833);
      if(!sc.rise){ rise.push([d,null]); set.push([d,null]); continue; }
      /* Plot each day's times relative to ITS OWN solar noon rather than on a
         fixed 12 AM–12 AM scale. Where the clock runs far from the sun (Nome
         sets at 12:31 AM in July) the sunset curve otherwise falls off the
         bottom of the chart and reappears at the top, splitting the daylight
         band in two. Unwrapping keeps the curves continuous and the daylight
         centred; the axis labels below wrap the hours back into clock time. */
      var hN=hodTz(sc.noon);
      rise.push([d,unwrap(hodTz(sc.rise),hN)]); set.push([d,unwrap(hodTz(sc.set),hN)]);
    }
    /* The extremes get their OWN every-day scan. Taking them from the
       every-third-day drawing samples put the solstice on whichever of the
       three days happened to be sampled — the chart said Jun 21 while the
       facts card, which walks every day, said Jun 20. Sampling is fine for a
       curve and wrong for a date. */
    for(var e2=0;e2<366;e2++){
      var t2=new Date(y0.getTime()+e2*86400e3+12*3600e3);
      if(t2.getFullYear()!==yr) break;
      var s2=sunCalc(t2,C.lat,C.lon,-0.833); if(!s2.rise) continue;
      var L2=s2.set-s2.rise;
      if(!longest||L2>longest.L) longest={d:e2,t:t2,L:L2};
      if(!shortest||L2<shortest.L) shortest={d:e2,t:t2,L:L2};
    }
    var vals=rise.concat(set).map(function(p){return p[1];}).filter(function(v){return v!=null;});
    var lo=Math.floor(Math.min.apply(null,vals))-1, hi=Math.ceil(Math.max.apply(null,vals))+1;
    function X(d){ return padL+d/364*iw; }
    function Y(h){ return padT+(h-lo)/(hi-lo)*ih; }
    function fmtH(h){ var hh=((Math.round(h)%24)+24)%24; var ap=hh<12?' AM':' PM'; var v=hh%12; if(v===0)v=12; return v+ap; }
    function md(t){ return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(t); }
    function line(pts){ var o='',pen=false; pts.forEach(function(p){ if(p[1]==null){pen=false;return;} o+=(pen?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1); pen=true; }); return o; }
    var out='';
    for(var g=Math.ceil(lo/3)*3; g<=hi; g+=3){
      out+='<line x1="'+padL+'" y1="'+Y(g).toFixed(1)+'" x2="'+(W-padR)+'" y2="'+Y(g).toFixed(1)+'" stroke="#2b3350" stroke-width="1"/>'
        +'<text x="'+(padL-6)+'" y="'+Y(g).toFixed(1)+'" text-anchor="end" dy=".34em" font-size="10" fill="#94a3b8">'+fmtH(g)+'</text>';
    }
    var MON='JFMAMJJASOND';
    for(var m=0;m<12;m++){ var dd=Math.round(m*30.4);
      out+='<text x="'+X(dd+15).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="#94a3b8">'+MON[m]+'</text>'; }
    /* shaded daylight band between the curves */
    var band='',i;
    for(i=0;i<rise.length;i++){ if(rise[i][1]==null) continue; band+=(band?'L':'M')+X(rise[i][0]).toFixed(1)+' '+Y(rise[i][1]).toFixed(1); }
    for(i=set.length-1;i>=0;i--){ if(set[i][1]==null) continue; band+='L'+X(set[i][0]).toFixed(1)+' '+Y(set[i][1]).toFixed(1); }
    if(band) out+='<path d="'+band+'Z" fill="rgba(252,211,77,.08)"/>';
    /* daylight-saving clock-change markers (offset shifts), like the
       solstice lines but gray */
    function offAt(dd){ try{ var pr=new Intl.DateTimeFormat('en-US',{timeZone:C.tz,timeZoneName:'shortOffset'}).formatToParts(new Date(y0.getTime()+dd*86400e3+12*3600e3)); for(var q=0;q<pr.length;q++){ if(pr[q].type==='timeZoneName') return pr[q].value; } }catch(e){} return ''; }
    var prevOff=offAt(0);
    for(var dd=1;dd<365;dd++){
      var od=offAt(dd);
      if(od!==prevOff){
        var tt=new Date(y0.getTime()+dd*86400e3);
        out+='<line x1="'+X(dd).toFixed(1)+'" y1="'+padT+'" x2="'+X(dd).toFixed(1)+'" y2="'+(H-padB)+'" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="2 5" opacity=".8"/>'
          +'<text x="'+X(dd).toFixed(1)+'" y="'+(H-padB-4)+'" text-anchor="middle" font-size="9" fill="#94a3b8">'+md(tt)+' clocks</text>';
        prevOff=od;
      } else if(dd%2===0){ dd++; } /* coarse scan: offsets only change twice a year */
    }
    /* solstice markers */
    [[longest,'Summer solstice'],[shortest,'Winter solstice']].forEach(function(pair){
      var p=pair[0]; if(!p) return;
      out+='<line x1="'+X(p.d).toFixed(1)+'" y1="'+padT+'" x2="'+X(p.d).toFixed(1)+'" y2="'+(H-padB)+'" stroke="#fb923c" stroke-width="1.4" stroke-dasharray="4 4"/>'
        +'<text x="'+X(p.d).toFixed(1)+'" y="'+(padT-3)+'" text-anchor="middle" font-size="9.5" fill="#fb923c">'+md(p.t)+'</text>';
    });
    out+='<path d="'+line(rise)+'" fill="none" stroke="#7dd3fc" stroke-width="2"/>'
      +'<path d="'+line(set)+'" fill="none" stroke="#fcd34d" stroke-width="2"/>'
      +'<text x="'+(padL+6)+'" y="'+(padT+12)+'" font-size="10.5" fill="#7dd3fc">Sunrise</text>'
      +'<text x="'+(padL+6)+'" y="'+(H-padB-6)+'" font-size="10.5" fill="#fcd34d">Sunset</text>';
    /* today's date, marked with a dotted vertical line */
    var tdy=Math.floor((Date.now()-y0.getTime())/86400e3);
    if(tdy>=0&&tdy<365){
      out+='<line x1="'+X(tdy).toFixed(1)+'" y1="'+padT+'" x2="'+X(tdy).toFixed(1)+'" y2="'+(H-padB)+'" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="2 3" opacity=".85"/>'
        +'<text x="'+X(tdy).toFixed(1)+'" y="'+(padT-3)+'" text-anchor="middle" font-size="9.5" fill="#e2e8f0">Today</text>';
    }
    /* the hover furniture, drawn once and moved rather than re-created: a
       guide line, a dot on each curve, and a wide transparent rect that is
       what actually receives the pointer (the 2px-wide curves are impossible
       to hit, and on a phone there is no pointer at all — you drag) */
    out+='<g id="sun-yhover" style="display:none" pointer-events="none">'
      +'<line id="sun-yline" y1="'+padT+'" y2="'+(H-padB)+'" stroke="#e2e8f0" stroke-width="1.2" opacity=".75"/>'
      +'<circle id="sun-ydot1" r="3.6" fill="#7dd3fc" stroke="#0b1020" stroke-width="1.4"/>'
      +'<circle id="sun-ydot2" r="3.6" fill="#fcd34d" stroke="#0b1020" stroke-width="1.4"/></g>'
      +'<rect id="sun-yhit" x="'+padL+'" y="'+padT+'" width="'+iw+'" height="'+ih+'" fill="transparent" style="cursor:crosshair"/>';
    svg.innerHTML=out;
    function dl(ms){ var m2=Math.round(ms/60000); return Math.floor(m2/60)+' h '+(m2%60)+' m'; }
    var note=document.getElementById('sun-year-note');
    if(note&&longest&&shortest) note.textContent='Summer solstice (longest day): '+md(longest.t)+' — '+dl(longest.L)+' of daylight · Winter solstice (shortest day): '+md(shortest.t)+' — '+dl(shortest.L)+'. Steps in the curves are the clock changes (daylight saving time).';

    /* ---- read any date off the chart ------------------------------------
       The curves are sampled every third day for drawing, but the read-out
       solves the exact day under the pointer — so what it reports is the real
       answer for that date, not the nearest plotted sample. */
    (function(){
      var wrap=document.getElementById('sun-year-wrap'), tip=document.getElementById('sun-yt'),
          live=document.getElementById('sun-yt-live'), hit=document.getElementById('sun-yhit'),
          grp=document.getElementById('sun-yhover'), ln=document.getElementById('sun-yline'),
          d1=document.getElementById('sun-ydot1'), d2=document.getElementById('sun-ydot2');
      if(!wrap||!tip||!hit) return;
      var cur=-1;
      function hide(){ cur=-1; grp.style.display='none'; tip.hidden=true; }
      function show(d){
        d=Math.max(0,Math.min(364,d)); if(d===cur) return; cur=d;
        var t=new Date(y0.getTime()+d*86400e3+12*3600e3), sc=sunCalc(t,C.lat,C.lon,-0.833);
        var x=X(d);
        ln.setAttribute('x1',x.toFixed(1)); ln.setAttribute('x2',x.toFixed(1));
        var html='<b>'+md(t)+'</b>';
        if(sc.rise){
          var hN=hodTz(sc.noon), yr2=Y(unwrap(hodTz(sc.rise),hN)), ys=Y(unwrap(hodTz(sc.set),hN));
          d1.setAttribute('cx',x.toFixed(1)); d1.setAttribute('cy',yr2.toFixed(1));
          d2.setAttribute('cx',x.toFixed(1)); d2.setAttribute('cy',ys.toFixed(1));
          d1.style.display=d2.style.display='';
          /* golden hour: the sun between −4° and +6°, the same definition the
             card above the chart uses */
          var a6=sunCalc(t,C.lat,C.lon,6), am4=sunCalc(t,C.lat,C.lon,-4);
          var gh=(a6.set&&am4.set&&am4.set>a6.set)?(hm(a6.set)+' – '+hm(am4.set)):null;
          /* how the day compares with the one before it — the trend is the
             thing the curve shows and a single date cannot */
          var yd=sunCalc(new Date(t.getTime()-86400e3),C.lat,C.lon,-0.833);
          var delta=(yd.rise)?Math.round(((sc.set-sc.rise)-(yd.set-yd.rise))/60000):null;
          html+='<span><i>Sunrise</i>'+hm(sc.rise)+'</span><span><i>Sunset</i>'+hm(sc.set)+'</span>'
            +'<span><i>Daylight</i>'+dl(sc.set-sc.rise)
            +(delta===null||delta===0?'':' <em>'+(delta>0?'+':'−')+Math.abs(delta)+' min</em>')+'</span>'
            +(gh?'<span><i>Golden hour</i>'+gh+'</span>':'');
        } else {
          d1.style.display=d2.style.display='none';
          html+='<span>'+(sunPosition(new Date(sc.noon),C.lat,C.lon).alt>-0.833?'Midnight sun — the sun does not set':'Polar night — the sun does not rise')+'</span>';
        }
        tip.innerHTML=html;
        grp.style.display=''; tip.hidden=false;
        /* Sit BESIDE the guide line, not centred on it: centred, the panel
           covered the sunrise curve and the dot the reader is looking at.
           It flips to the other side past the halfway mark so it never runs
           off the edge in November and December either. */
        tip.style.left=(x/W*100)+'%';
        tip.classList.toggle('is-left', d>182);
        if(live) live.textContent=tip.textContent;
      }
      function dayFromClientX(cx){
        var r=svg.getBoundingClientRect(); if(!r.width) return 0;
        return Math.round(((cx-r.left)/r.width*W-padL)/iw*364);
      }
      hit.addEventListener('pointermove',function(e){ show(dayFromClientX(e.clientX)); });
      hit.addEventListener('pointerdown',function(e){ show(dayFromClientX(e.clientX)); });
      hit.addEventListener('pointerleave',function(e){ if(e.pointerType==='mouse') hide(); });
      /* keyboard: the chart is a real control, so it takes focus and arrows.
         Home/End jump to the ends of the year. */
      wrap.addEventListener('keydown',function(e){
        var step=e.shiftKey?7:1, d=cur<0?Math.floor((Date.now()-y0.getTime())/86400e3):cur;
        if(e.key==='ArrowRight') show(d+step);
        else if(e.key==='ArrowLeft') show(d-step);
        else if(e.key==='Home') show(0);
        else if(e.key==='End') show(364);
        else if(e.key==='Escape'){ hide(); return; }
        else return;
        e.preventDefault();
      });
      wrap.addEventListener('blur',hide);
    })();
  })();

  /* ---- today's place in the year -------------------------------------
     Baked at build time, but the build is not what the visitor is reading —
     the rank changes at local midnight and the page can be served from cache
     for hours. So it is recomputed here from the visitor's own today.
     A full 365-day scan, not the every-third-day sampling the year chart
     uses: a rank has to see every day or it is not a rank. Scheduled on idle
     because nothing above the fold waits on it. */
  function sunRankPaint(){
    var el=document.getElementById('sun-rank'); if(!el) return;
    function len(t){ var sc=sunCalc(t,C.lat,C.lon,-0.833);
      if(sc.rise) return sc.set-sc.rise;
      /* no rise/set: midnight sun or polar night, and which one decides
         whether the day sorts above or below every ordinary one */
      return sunPosition(new Date(sc.noon),C.lat,C.lon).alt>-0.833?86400000:0; }
    /* "the 78th longest day in Portland" is a fact about PORTLAND, so today
       and the year are read in the CITY's zone (the same dkey() rule the rest
       of the page uses), and the days are stepped on UTC noon exactly as the
       build does. Keyed off the visitor's own calendar instead, a reader in
       Tokyo got a different answer about Portland than a reader in Portland. */
    var key; try{ key=new Intl.DateTimeFormat('en-CA',{timeZone:C.tz}).format(new Date()); }
    catch(e){ key=new Date().toISOString().slice(0,10); }
    var kp=key.split('-'), yr=+kp[0];
    var todayMs=Date.UTC(yr,+kp[1]-1,+kp[2],12);
    var L=[], longest=null, shortest=null, d;
    for(d=0;d<366;d++){
      var ms=Date.UTC(yr,0,1+d,12); if(new Date(ms).getUTCFullYear()!==yr) break;
      var v=len(new Date(ms)); L.push(v);
      if(!longest||v>longest.L) longest={L:v,t:ms};
      if(!shortest||v<shortest.L) shortest={L:v,t:ms};
    }
    var todayL=len(new Date(todayMs)), longerN=0, tied=0, i;
    for(i=0;i<L.length;i++){ if(L[i]>todayL+60000) longerN++;
      if(Math.abs(L[i]-todayL)<=60000) tied++; }
    function ord(k){ var t2=k%100; if(t2>=11&&t2<=13) return k+'th';
      return k+(['th','st','nd','rd'][k%10]||'th'); }
    var txt;
    if(todayL>=86400000){ var n1=0; for(i=0;i<L.length;i++) if(L[i]>=86400000) n1++;
      txt=C.city+' is under midnight sun today — the sun does not set. '+n1+' days this year are like that.'; }
    else if(todayL<=0){ var n2=0; for(i=0;i<L.length;i++) if(L[i]<=0) n2++;
      txt=C.city+' is in polar night today — the sun does not rise. '+n2+' days this year are like that.'; }
    else if(tied>3) txt='Today is one of '+tied+' days this year with the same length of daylight, within a minute of each other.';
    else txt='Of the '+L.length+' days this year, today is the '+ord(longerN+1)+' longest here.';
    el.textContent=txt;
    var sol=document.getElementById('sun-solstice'); if(!sol) return;
    function daysTo(ms){ return Math.round((ms-todayMs)/86400000); }
    var cands=[[longest,'longest day'],[shortest,'shortest day']].filter(function(p){ return p[0]&&daysTo(p[0].t)>0; })
      .sort(function(a,b){ return daysTo(a[0].t)-daysTo(b[0].t); });
    if(!cands.length){ sol.textContent=''; return; }
    var ev=cands[0][0], nm=cands[0][1], dd=daysTo(ev.t);
    var md2; try{ md2=new Intl.DateTimeFormat('en-US',{timeZone:C.tz,month:'long',day:'numeric'}).format(new Date(ev.t)); }
    catch(e){ md2=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric'}).format(new Date(ev.t)); }
    sol.textContent='The '+nm+' of the year is '+dd+' day'+(dd===1?'':'s')+' away, on '+md2+' — '+dur(ev.L)+' of daylight.';
  }
  (function(){ if(!document.getElementById('sun-rank')) return;
    if(window.requestIdleCallback) requestIdleCallback(sunRankPaint,{timeout:3000});
    else setTimeout(sunRankPaint,400); })();

  /* the live position: paint immediately over the baked build-minute values,
     then every 30s. Unlike the rest of the page this is not tied to the date
     picker — "right now" is always right now. */
  (function(){ if(!document.getElementById('sun-now-alt')) return;
    sunNowPaint(); setInterval(sunNowPaint,30000);
    /* a phone that has been asleep comes back with a stale reading */
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) sunNowPaint(); }); })();


})();
