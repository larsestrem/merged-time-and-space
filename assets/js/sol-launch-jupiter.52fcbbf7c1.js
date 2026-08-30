/* The globe's drawing code sits at the TOP of this file, outside the IIFE below
   — the Earth-and-Moon view inside it calls glSvg, and so does the planet-page
   globe at the bottom. Declared once, seen by both. */
/* globe: not drawn on this page */
(function(){
/* moon: not drawn on this page */

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

/* sat: not drawn on this page */
/* small: not drawn on this page */

var TR_GM_SUN=1.32712440018e11;      /* km^3/s^2 */
var TR_GM_EARTH=398600.44;
var TR_LEO=6678;                     /* km: a 300 km parking orbit, Earth radius + 300 */
var TR_DAY=86400000;

/* the targets a transfer is offered for: index, and the label used in the UI */
var TR_TARGETS=[[3,'Mars'],[4,'Jupiter'],[5,'Saturn']];

function trAU(){ return PL_AU; }
function trR(idx,ms){ var p=plPos(idx,ms); return Math.sqrt(p.x*p.x+p.y*p.y)*PL_AU; }   /* km, in the ecliptic plane */
function trLon(idx,ms){ var p=plPos(idx,ms); return Math.atan2(p.y,p.x); }
function trWrapPi(a){ while(a>Math.PI) a-=2*Math.PI; while(a<-Math.PI) a+=2*Math.PI; return a; }

/* the half-ellipse from Earth's radius at t0 to the target's radius on arrival.
   Iterated because the arrival radius depends on the flight time it sets. */
function trSolve(idx,t0){
  var r1=trR(2,t0), a=(r1+trR(idx,t0))/2, tf=0, i;
  for(i=0;i<8;i++){
    tf=Math.PI*Math.sqrt(a*a*a/TR_GM_SUN)*1000;         /* ms */
    var r2=trR(idx,t0+tf), na=(r1+r2)/2;
    if(Math.abs(na-a)<1) { a=na; break; }
    a=na;
  }
  tf=Math.PI*Math.sqrt(a*a*a/TR_GM_SUN)*1000;
  var r2=trR(idx,t0+tf);
  /* how far the target misses the far end of the ellipse, in radians */
  var miss=trWrapPi(trLon(idx,t0+tf)-(trLon(2,t0)+Math.PI));
  return { t0:t0, tf:tf, a:a, r1:r1, r2:r2, e:(r2-r1)/(r2+r1), miss:miss, lon1:trLon(2,t0) };
}

/* The next departure at or after ms. Earth laps every target, so as the
   departure date slides forward the miss angle falls steadily — about half a
   degree a day for Mars, a degree for Saturn — and the window is where it
   crosses zero. Scan for that crossing, then bisect. The 6-day step is a small
   fraction of a synodic period, so no window can be stepped over, and the
   guard rejects the jump where the angle wraps from -180 to +180 rather than
   crossing. */
function trWindow(idx,ms){
  var step=6*TR_DAY, prev=trSolve(idx,ms), t=ms, i, cur;
  for(i=0;i<760;i++){                                   /* up to ~12.5 years */
    t+=step; cur=trSolve(idx,t);
    if(prev.miss>0&&cur.miss<=0&&(prev.miss-cur.miss)<Math.PI){
      var lo=t-step, hi=t, j;
      for(j=0;j<44;j++){
        var mid=(lo+hi)/2;
        if(trSolve(idx,mid).miss>0) lo=mid; else hi=mid;
      }
      return trSolve(idx,(lo+hi)/2);
    }
    prev=cur;
  }
  return null;
}

/* The next n windows, not just the next one. Each search restarts a fortnight
   past the last departure found, which is far enough to clear the window it just
   solved and far short of the synodic period, so none can be skipped. */
function trWindows(idx,ms,n){
  var out=[], t=ms, i, w;
  for(i=0;i<n;i++){
    w=trWindow(idx,t); if(!w) break;
    out.push(w); t=w.t0+14*TR_DAY;
  }
  return out;
}

/* speeds, and therefore the cost of the trip */
function trBurns(s){
  var vDep=Math.sqrt(TR_GM_SUN*(2/s.r1-1/s.a));         /* on the transfer ellipse at departure */
  var vE=Math.sqrt(TR_GM_SUN*(2/s.r1-1/(PL_EL[2][1]*PL_AU)));
  var vArr=Math.sqrt(TR_GM_SUN*(2/s.r2-1/s.a));
  return { vDep:vDep, vE:vE, dv1:vDep-vE, vArr:vArr };
}
/* the full accounting for one target: heliocentric burns, plus what it costs to
   leave a low Earth orbit at all (which is most of a rocket) */
function trCost(idx,s){
  var b=trBurns(s);
  var vT=Math.sqrt(TR_GM_SUN*(2/s.r2-1/(PL_EL[idx][1]*PL_AU)));
  var dv2=vT-b.vArr;
  var vinf=b.dv1;
  var vLeo=Math.sqrt(TR_GM_EARTH/TR_LEO);
  var vEsc=Math.sqrt(vinf*vinf+2*TR_GM_EARTH/TR_LEO);
  return { dv1:b.dv1, dv2:dv2, total:b.dv1+Math.abs(dv2), vinf:vinf,
           injection:vEsc-vLeo, vDep:b.vDep, vE:b.vE, vArr:b.vArr, vT:vT };
}

/* where the craft is at time ms, or null if it is not flying yet / already
   arrived. Kepler on the transfer ellipse, same solver the planets use. */
function trCraft(s,ms){
  if(ms<s.t0||ms>s.t0+s.tf) return null;
  var n=Math.PI/s.tf;                                    /* half a revolution over tf */
  var M=n*(ms-s.t0), E=plKepler(M,s.e);
  var aAU=s.a/PL_AU;
  var xo=aAU*(Math.cos(E)-s.e), yo=aAU*Math.sqrt(1-s.e*s.e)*Math.sin(E);
  var c=Math.cos(s.lon1), sn=Math.sin(s.lon1);           /* perihelion at the departure longitude */
  return { x:c*xo-sn*yo, y:sn*xo+c*yo, r:Math.sqrt(xo*xo+yo*yo) };
}

/* the closest the two planets get: local minima of the real separation. Not the
   same instant as opposition, and not the same distance every time, which is
   the whole point of showing it. */
function trClosest(idx,ms,count){
  var out=[], step=TR_DAY, sep=function(t){
    var a=plPos(2,t), b=plPos(idx,t);
    return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y)+(a.z-b.z)*(a.z-b.z));
  };
  var p0=sep(ms-step), p1=sep(ms), t=ms, i;
  for(i=0;i<7000&&out.length<count;i++){
    t+=step; var p2=sep(t);
    if(p1<p0&&p1<=p2){
      /* refine to the hour */
      var lo=t-2*step, hi=t, j;
      for(j=0;j<30;j++){
        var m1=lo+(hi-lo)/3, m2=hi-(hi-lo)/3;
        if(sep(m1)<sep(m2)) hi=m2; else lo=m1;
      }
      var tm=(lo+hi)/2;
      out.push({ t:tm, au:sep(tm) });
    }
    p0=p1; p1=p2;
  }
  return out;
}

/* ---- drawing ------------------------------------------------------------- */
/* the flight path: the half ellipse, where the planets are when it leaves and
   when it lands, and the craft itself if the clock is inside the flight. */
function trLayer(ms,idx,outer,k,s){
  if(!s) return '';
  var out='', i, pts=[];
  var aAU=s.a/PL_AU, c=Math.cos(s.lon1), sn=Math.sin(s.lon1);
  for(i=0;i<=120;i++){
    var E=i/120*Math.PI;
    var xo=aAU*(Math.cos(E)-s.e), yo=aAU*Math.sqrt(1-s.e*s.e)*Math.sin(E);
    pts.push(solF(SOL_CX+k*(c*xo-sn*yo))+','+solF(SOL_CY-k*(sn*xo+c*yo)));
  }
  out+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#facc15" stroke-opacity=".85" stroke-width="2"/>';
  /* departure and arrival, as hollow markers on the two orbits */
  var e0=plPos(2,s.t0), p1=plPos(idx,s.t0+s.tf);
  out+='<circle cx="'+solF(SOL_CX+k*e0.x)+'" cy="'+solF(SOL_CY-k*e0.y)+'" r="7" fill="none" stroke="#facc15" stroke-width="1.5"/>';
  out+='<circle cx="'+solF(SOL_CX+k*p1.x)+'" cy="'+solF(SOL_CY-k*p1.y)+'" r="9" fill="none" stroke="#facc15" stroke-width="1.5" stroke-dasharray="3 3"/>';
  out+='<text x="'+solF(SOL_CX+k*e0.x)+'" y="'+solF(SOL_CY-k*e0.y+22)+'" text-anchor="middle" font-size="11" fill="#fde68a" paint-order="stroke" stroke="#0a1020" stroke-width="3">launch</text>';
  out+='<text x="'+solF(SOL_CX+k*p1.x)+'" y="'+solF(SOL_CY-k*p1.y+24)+'" text-anchor="middle" font-size="11" fill="#fde68a" paint-order="stroke" stroke="#0a1020" stroke-width="3">arrive</text>';
  var cr=trCraft(s,ms);
  if(cr){
    var cx=SOL_CX+k*cr.x, cy=SOL_CY-k*cr.y;
    out+='<circle cx="'+solF(cx)+'" cy="'+solF(cy)+'" r="4" fill="#fef9c3"/>';
    out+='<circle cx="'+solF(cx)+'" cy="'+solF(cy)+'" r="9" fill="none" stroke="#facc15" stroke-opacity=".7"/>';
  }
  return out;
}


var SOL_RUNGS=[["moon","Earth & the Moon",0,0,"em",2],["inner","The inner planets",1.62,4,"sys",-1],["mars","Out to Mars",1.72,4,"sys",-1],["belt","Out to the asteroid belt",3.75,4,"sys",-1],["jupiter","Out to Jupiter",5.75,5,"sys",-1],["saturn","Out to Saturn",10.3,6,"sys",-1],["neptune","Out to Neptune",31.5,8,"sys",-1],["pluto","Out to Pluto (a dwarf planet)",50,9,"sys",-1],["mars-moons","Mars: Phobos & Deimos",0,0,"moons",3],["jupiter-moons","Jupiter: the Galilean moons",0,0,"moons",4],["saturn-moons","Saturn: the rings & Titan",0,0,"moons",5],["uranus-moons","Uranus: Titania & Miranda",0,0,"moons",6],["neptune-moons","Neptune: Triton",0,0,"moons",7],["pluto-moons","Pluto: Charon & the small four",0,0,"moons",8]];
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
var SOL_W=900, SOL_H=900, SOL_CX=450, SOL_CY=450, SOL_PAD=26;
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
     the Earth comes out about 14 units across and the
     moon under 4. That is not
     a drawing choice — it is what 30 Earth-diameters of empty space does to a
     picture, and it is the reason this rung exists. The locator rings are the
     concession: without them the moon is genuinely hard to find, which is
     itself the point. */
  var perDia=13.524287200832466;                     /* see EM_EARTH_PX above */
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
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+24)+'" font-size="12" fill="#94a3b8">Both bodies AND the gap between them are to scale here \u2014 the only view on this page that is.</text>';
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

  /* WHAT THIS PAGE CAN DRAW. Every optional module's entry points are behind
     one of these, so a URL parameter or a stray button cannot ask for a layer
     whose code was left out of this file. */
  var SOL_HAS={"core":1,"globe":0,"moon":0,"sat":0,"small":0,"transfer":1};
  /* The page's own configuration, baked in rather than read from a
     window.AC_SOL the surrounding page had to set: this file is unique to this
     page now, so its config belongs in it. */
  var CFG={"rung":"jupiter","path":"/rocket-launch-simulator/jupiter/","to":4};
  var RUNG=CFG.rung||'inner', START=null, OFF=0, SPAN='year', PLAY=0, SPEED=15;
  /* THE VIEW OPENS TILTED. Straight down is the exact view and stays one drag
   away, but the page's job is to make people look, and a disc seen at an angle
   reads as a system where a set of concentric rings reads as a dartboard.
   TILT_DEF (up in the generator) is the only place the default is decided —
   the slider's baked value comes from the same constant, so the control and
   the drawing cannot open disagreeing. */
  var SOL_TILT0=(CFG&&CFG.tilt!=null)?CFG.tilt:50;
  /* A PAGE THAT IS ABOUT THE BELT OPENS WITH THE BELT ON. /asteroid-belt/ used
     to load its simulator with the belt layer OFF, so the one thing the page is
     named after was the one thing not in the picture. Same for /comets/. The
     URL parameters below can still override either way. */
  var LAYER={belt:(CFG&&CFG.belt)?1:0,comets:(CFG&&CFG.comets)?1:0};
  /* A DESTINATION PAGE OPENS WITH ITS OWN FLIGHT DRAWN. /rocket-launch-
     simulator/mars/ is about that crossing, so arriving to a picture with no
     path on it and a "Nowhere yet" button lit would be the belt page opening
     with the belt off, again. ?to= can still override. */
  var TARGET=(CFG&&CFG.to)?CFG.to:0, SOLN=null, TILT=SOL_TILT0, WINS=[], WIN=0;
  /* HOW MUCH OF A MOON SYSTEM IS DRAWN. 1 is what the picture has always shown
     and stays the default, so nobody's existing link changes what it opens. */
  var MOONLVL=(CFG&&CFG.moons)?CFG.moons:1;
  /* THE DESTINATION MAPS LIVE UP HERE, above the boot block, because a
     destination page now opens with TARGET already set — so markDest() reads
     DEST_SLUG during boot. Declared further down (where the buttons are bound)
     they were var-hoisted but still unassigned at that moment, and the first
     load of /rocket-launch-simulator/mars/ threw on DEST_SLUG[3]. */
  /* the planets' own pages, from the registry rather than built out of a slug
     — they are flat URLs now (/mars-and-moons-simulator/), not children of the
     solar hub, and a second copy of that rule here would rot the first time
     one moved */
  var DEST_SLUG={"3":"/mars-and-moons-simulator/","4":"/jupiter-and-moons-simulator/","5":"/saturn-and-moons-simulator/"};
  /* THE FRAME FOLLOWS THE FLIGHT. A trip to Mars was drawn on the belt view,
     3.75 AU wide, which put Mars's orbit in the middle third of the picture
     and spent the rest of it on empty sky. Each destination now gets the rung
     whose frame its own orbit fills. */
  var DEST_RUNG={3:'mars',4:'jupiter',5:'saturn'};

  /* HOW MUCH THE ORBIT TILTS ARE EXAGGERATED depends on how tilted the VIEW is,
     because that is what decides whether they are visible at all. A real
     inclination of 0.8-7 degrees shows as z.sin(view), so at a shallow view it
     needs multiplying and at a steep one it does not — and multiplying it there
     anyway turns a readable picture into a tangle. Reported in the read-out
     either way, so the number on screen is always the number being drawn. */
  function tiltExag(){ return solTiltExag(TILT); }
  function solTiltExag(t){ return t<8 ? 1 : Math.max(1,Math.min(10,Math.round(360/t))); }
  var SHARE='', URLT=0;
  var SPAN_MIN={month:43200,year:525960,decade:5259600,century:52596000};
  /* The elements are JPL's 1800-2050 table with linear rates. Outside that the
     rates keep extrapolating and the picture keeps looking plausible, so the
     date field stops at 2050 and the note below says so whenever a long span
     carries the drawn instant past it. */
  var VALID0=Date.parse('1800-01-01T00:00:00Z'), VALID1=Date.parse('2050-12-31T23:59:00Z');
  var SPAN_STEP={month:15,year:180,decade:1800,century:18000};
  var SPAN_WORD={month:'a month',year:'a year',decade:'ten years',century:'a hundred years'};
  function $(id){ return document.getElementById(id); }
  function when(){ return START+OFF*60000; }
  function fmt(o){ try{ return new Intl.DateTimeFormat('en-US',o).format(new Date(when())); }catch(e){ return '\u2014'; } }
  function dfmt(ms){ try{ return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(new Date(ms)); }catch(e){ return '\u2014'; } }
  function localValue(ms){
    try{ var ps=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
      function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return ps[i].value; return '00'; }
      /* DATE ONLY. The hour never earned its place here: the fastest thing on
         this page is Mercury, which moves about four degrees in a day, so a
         picture set to 09:15 and one set to 21:15 are the same picture. The
         instant is still carried to the minute underneath — only the FIELD is
         a date, and setting it keeps whatever time of day was already there. */
      return g('year')+'-'+g('month')+'-'+g('day');
    }catch(e){ return ''; }
  }
  function opts(){ return { belt:LAYER.belt, comets:LAYER.comets, transfer:TARGET, transferSolution:SOLN, tilt:TILT, tiltExag:tiltExag(), moonLevel:MOONLVL }; }

  function paint(){
    var t=when(), rung=solRung(RUNG);
    $('sol-fig').innerHTML=solSvg(t,RUNG,opts());
    /* no weekday. It changes on every frame while this plays, which makes it the
       most restless thing on the line and the least informative: nothing on this
       page happens on a Tuesday. */
    $('sol-when').textContent=fmt({year:'numeric',month:'long',day:'numeric'})
      +(SPAN==='month'?', '+fmt({hour:'numeric',minute:'2-digit'}):'');
    var sl=$('sol-slider');
    sl.max=SPAN_MIN[SPAN]; sl.step=SPAN_STEP[SPAN];
    if(document.activeElement!==sl) sl.value=OFF;
    var f=$('sol-start'); if(f&&document.activeElement!==f) f.value=localValue(START);
    $('sol-from').textContent=dfmt(START);
    $('sol-to').textContent=dfmt(START+SPAN_MIN[SPAN]*60000);
    rows(t,rung); note(rung); enable(rung); share();
  }
  /* the belt, the comets and the flight path are all drawn around the SUN, so
     on a moon system they have nothing to draw. Turn them off rather than leave
     three controls that silently do nothing. */
  function enable(rung){
    var on=rung[4]==='sys';
    /* A LAYER SWITCH IS ONLY LIVE IF ITS LAYER WOULD BE IN THE FRAME. The belt
       starts at the 4:1 resonance with Jupiter, 2.06 AU, which is outside the
       inner-planets rung entirely — so on that rung the button was pressable
       and did nothing. smBeltIn/smCometsIn answer from the same numbers the
       drawing itself uses, so the switch and the picture cannot disagree. */
    if($('sol-belt')) $('sol-belt').disabled=!(on&&SOL_HAS.small&&smBeltIn(rung[2]));
    if($('sol-comets')) $('sol-comets').disabled=!(on&&SOL_HAS.small&&smCometsIn(rung[2]));
    /* the destination buttons live on a page whose rungs are all heliocentric,
       so there is nothing left here to dim */
  }

  /* the read-out. What it says depends on what is being drawn, because "2.4 AU
     at 137 degrees" is the wrong answer for a picture of Jupiter's moons. */
  function rows(t,rung){
    var box=$('sol-rows'); if(!box) return;
    var out='', i;
    if(rung[4]==='em'){
      var il=mnIllum(t);
      out+=row('Moon phase',mnName(il.phase),1)
        +row('Lit',Math.round(il.fraction*100)+'%')
        +row('Distance',Math.round(il.dist).toLocaleString('en-US')+' km')
        +row('In Earth diameters',(il.dist/12742).toFixed(1));
    } else if(rung[4]==='moons'){
      var sys=SAT_SYS[rung[5]];
      for(i=0;i<sys.moons.length;i++){
        var m=sys.moons[i], per=Math.abs(m[2]);
        out+=row(m[0],(m[1]>=1e6?(m[1]/1e6).toFixed(2)+'M':Math.round(m[1]/1000)+'k')+' km \u00b7 '
          +(per<1?(per*24).toFixed(1)+' h':per.toFixed(per<10?2:1)+' d')+(m[2]<0?' \u21ba':''));
      }
    } else {
      for(i=0;i<rung[3];i++){
        var p=plPos(i,t);
        out+=row(plName(i),p.r.toFixed(2)+' AU \u00b7 '+Math.round(p.lon)+'\u00b0',i===2);
      }
      if(TARGET&&SOLN){
        var e=plPos(2,t), q=plPos(TARGET,t);
        var sep=Math.sqrt((e.x-q.x)*(e.x-q.x)+(e.y-q.y)*(e.y-q.y)+(e.z-q.z)*(e.z-q.z));
        out+=row('Earth to '+plName(TARGET),sep.toFixed(3)+' AU',1);
      }
    }
    box.innerHTML=out;
  }
  function row(k,v,main){ return '<div class="sun-srow'+(main?' sun-main':'')+'"><span>'+solEsc(k)+'</span><b>'+v+'</b></div>'; }

  /* one line under the picture saying what this rung is and is not */
  function note(rung){
    var el=$('sol-note'); if(!el) return;
    var s='';
    if(rung[4]==='em') s='Earth and the Moon, to scale in size <b>and</b> distance \u2014 the only view here that is both.';
    else if(rung[4]==='moons') s='The orbits and the planet\u2019s disc are to scale against each other. Where each moon sits on its orbit is <b>not</b> solved for \u2014 watch the motion, not the position.';
    else s='Orbits to scale; the planets themselves are drawn big enough to see. Positions are good to about ten arcminutes \u2014 well under a pixel here.';
    var t=when();
    if(t<VALID0||t>VALID1) s+=' <b>Beyond 1800\u20132050</b> the orbital elements are being extrapolated, so this is the right shape of the system but no longer the right positions.';
    /* WHAT THE FLIGHT PATH IS, AND IS NOT. It is the minimum-energy transfer:
       the cheapest route there is, and the one launch windows are defined
       against. It is not what anybody flies to the outer planets, and drawing
       it without saying so let the page imply that it is. The burn figure
       beside it is the tell — 7.3 km/s out of low Earth orbit is more than any
       launcher has ever given a real spacecraft, which is exactly why Galileo,
       Cassini and Juno all went the long way round instead. */
    if(TARGET) s+=' The path drawn is the <b>minimum-energy</b> transfer \u2014 the cheapest, and the slowest. Real missions to Jupiter and Saturn do not fly it: the burn it needs is bigger than any launcher provides, so Galileo, Cassini and Juno all borrowed speed from other planets on the way \u2014 longer in time, far cheaper in fuel. Cassini took 6 years 8 months and four flybys to reach Saturn.';
    el.innerHTML=s;
  }

  /* the flight path. Solved in the browser from the date on screen, so it is
     never a date baked into a page months ago. */
  /* THE SPAN HAS TO COVER THE CROSSING. A Hohmann transfer to Saturn takes about
     six years and to Jupiter nearly three, so a slider covering one year cannot
     reach the arrival at all — you would drag to the end and the ship would
     still be somewhere past Mars. Mars fits inside a year; anything longer takes
     the decade, and anything longer than the decade takes the century. Picked
     from the flight time the solver returns, so it cannot be wrong for a target
     added later. */
  function fitSpan(w){
    if(!w) return;
    var days=w.tf/86400000;
    SPAN = days<330 ? 'year' : days<3300 ? 'decade' : 'century';
    if($('sol-span')) $('sol-span').value=SPAN;
    if(OFF>SPAN_MIN[SPAN]) OFF=SPAN_MIN[SPAN];
  }
  /* the figures for whichever window is selected — split out from retarget so
     picking a different launch date rewrites them without re-solving the list */
  /* where the flight sits inside the span the slider covers, as a percentage
     of it. Clamped rather than hidden when it runs past the end: a crossing to
     Saturn is longer than a year, and cutting the bar off at the edge says
     exactly that. */
  function flightBar(){
    var w=$('sol-flight'), bar=$('sol-flight-bar');
    if(!w||!bar) return;
    if(!TARGET||!SOLN){ w.hidden=true; return; }
    var total=SPAN_MIN[SPAN]*60000, t0=SOLN.t0-START, t1=SOLN.t0+SOLN.tf-START;
    if(t1<=0||t0>=total){ w.hidden=true; return; }
    var a=Math.max(0,t0)/total*100, b=Math.min(total,t1)/total*100;
    w.hidden=false;
    /* sit the band exactly on the track by MEASURING it rather than guessing a
       pixel offset — the slider is a different height in full screen */
    var sl=$('sol-slider');
    if(sl){ w.style.top=sl.offsetTop+'px'; w.style.height=sl.offsetHeight+'px'; }
    bar.style.left=a.toFixed(2)+'%';
    bar.style.width=Math.max(0.6,b-a).toFixed(2)+'%';
    bar.className='sol-flight-bar'+(t0<0?' sol-flight-cutl':'')+(t1>total?' sol-flight-cutr':'');
  }
  function missionRows(){
    var box=$('sol-mission'); if(!box) return;
    if(!TARGET||!SOLN){ box.innerHTML=''; return; }
    var c=trCost(TARGET,SOLN), nm=plName(TARGET);
    box.innerHTML=row('Launch',dfmt(SOLN.t0),1)
      +row('Arrives at '+nm,dfmt(SOLN.t0+SOLN.tf))
      +row('Flight time',Math.round(SOLN.tf/86400000).toLocaleString('en-US')+' days')
      +row('Burn to leave Earth orbit',c.injection.toFixed(2)+' km/s');
  }
  function retarget(){
    if(!TARGET){ SOLN=null; WIN=0; fillWindows(); missionRows(); flightBar(); return; }
    WIN=0; fillWindows();
    markDest();
    SOLN=WINS.length?WINS[0]:trWindow(TARGET,Date.now());
    fitSpan(SOLN); missionRows(); flightBar();
  }

  function share(){
    var q='date='+localValue(when()).slice(0,10)+'&zoom='+RUNG+'&span='+SPAN;
    /* always written. The old guard (skip when SPEED===1) predates absolute
       speeds — 1 was the multiplier's default then, and is a real day-per-second
       setting on a moon rung now, which the shared link silently dropped. */
    q+='&speed='+SPEED;
    /* the view angle travels with the link, so a shared picture arrives at the
       angle it was shared at rather than snapping back to the page default */
    if(Math.round(TILT)!==Math.round(SOL_TILT0)) q+='&tilt='+Math.round(TILT);
    if(MOONLVL>1) q+='&moons='+MOONLVL;
    if(LAYER.belt) q+='&belt=1';
    if(LAYER.comets) q+='&comets=1';
    if(TARGET) q+='&to='+TARGET;
    var url=location.origin+(CFG.path||'/solar-system-simulator/')+'?'+q;
    SHARE=url;
    var o=$('sol-url'); if(o) o.value=url;
    var s=$('sol-sum');
    if(s){ var rung=solRung(RUNG);
      s.innerHTML='Opens on <b>'+fmt({weekday:'long',year:'numeric',month:'long',day:'numeric'})
        +'</b>, showing <b>'+solEsc(rung[1])+'</b>, with the slider covering <b>'+SPAN_WORD[SPAN]+'</b>'
        +(TARGET?' and the flight path to <b>'+plName(TARGET)+'</b>':'')+'.'; }
    pushUrl();
  }
  /* The share BOX is rewritten on every repaint (it is one property write). The
     ADDRESS BAR is not: Safari rate-limits history.replaceState to 100 calls
     per 30 seconds and throws past that, which a 40ms Play loop exhausted in
     about four seconds — after which the catch swallowed the error and the URL
     silently stopped tracking the view. So it is debounced, and skipped
     entirely while Play runs; stop() writes the final one. */
  function pushUrl(){
    if(PLAY) return;
    if(URLT) clearTimeout(URLT);
    URLT=setTimeout(function(){ URLT=0; try{ history.replaceState(null,'',SHARE); }catch(e){} },500);
  }
  function stop(){ if(PLAY){ clearInterval(PLAY); PLAY=0; var b=$('sol-play'); b.textContent='Play'; b.setAttribute('aria-pressed','false'); pushUrl(); } }
  /* the speed read-out is the honest version of a 1x-16x dial: it says how much
     TIME goes by per second of watching, which is the thing that changes. */
  /* SPEED IS ABSOLUTE, NOT A FRACTION OF THE SPAN. It used to be a multiplier on
     "sweep the whole span in 24 seconds", which meant the same slider position
     ran the planets at 1.25 days a second over a month and 125 over a decade —
     the one control whose whole job is how fast the planets move was the one
     control that changed meaning every time you touched a different one.
     SOL_DPS is that rate at speed 1, DERIVED from the setting it is meant to
     match — the year span, which is what the slider was calibrated against — so
     the familiar speeds land exactly where they always did and every other span
     now agrees with them. The span is left doing only what its name says: how
     much time the slider covers. */
  /* THE RANGE DEPENDS ON WHAT IS ON SCREEN, because the thing being watched is
     four orders of magnitude different between the two kinds of view. Io goes
     round Jupiter in 42 hours and Neptune round the sun in 165 years; one slider
     range cannot serve both, and the one range there was made every moon system
     a blur before it had moved a pixel of Neptune. So a moon view runs from 3
     hours to 4 days of sky per second, and a heliocentric one from 3 days to 90.
     SPEED is that figure directly — days of sky per real second — not a
     multiplier on anything, so the number beside the slider IS the setting. */
  var SOL_RATE={ sys:[3,90,1], moons:[0.125,4,0.125] };
  function rateFor(){ var r=solRung(RUNG); return SOL_RATE[r[4]==='sys'?'sys':'moons']; }
  function syncSpeed(){
    var r=rateFor(), el=$('sol-speed');
    if(SPEED<r[0]||SPEED>r[1]) SPEED=r[0];
    if(el){ el.min=String(r[0]); el.max=String(r[1]); el.step=String(r[2]); el.value=String(SPEED); }
    speedLabel();
  }
  function speedLabel(){
    var perSec=SPEED;                                 /* days of sky per second */
    var el=$('sol-speedout'); if(!el) return;
    var s;
    if(perSec<1) s=(perSec*24).toFixed(1)+' hours';
    else if(perSec<400) s=perSec.toFixed(perSec<10?1:0)+' days';
    else s=(perSec/365.25).toFixed(perSec/365.25<10?1:0)+' years';
    el.textContent=s+' per second';
  }

  /* CAN THIS PAGE DRAW THAT RUNG? A moon rung needs the satellite module and
     the Earth-and-Moon rung needs the lunar one, and a page that does not draw
     them no longer carries the code. So a ?zoom= naming a rung this file cannot
     draw is ignored rather than obeyed into a ReferenceError — the link still
     resolves, it just opens the page at its own view. Every rung has a page of
     its own now, so the honest destination for that link exists. */
  function rungOk(id){
    var r=solRung(id); if(r[0]!==id) return 0;
    if(r[4]==='moons') return !!SOL_HAS.sat;
    if(r[4]==='em') return !!SOL_HAS.moon;
    return 1;
  }

  /* boot */
  var q0=null; try{ q0=new URLSearchParams(location.search); }catch(e){}
  if(q0){ if(rungOk(q0.get('zoom'))) RUNG=q0.get('zoom');
    if(SPAN_MIN[q0.get('span')]) SPAN=q0.get('span');
    /* the layers and the flight path are only offered where their module is */
    if(SOL_HAS.small&&q0.get('belt')) LAYER.belt=1;
    if(SOL_HAS.small&&q0.get('comets')) LAYER.comets=1;
    var sp=parseFloat(q0.get('speed')); if(sp>0&&sp<=90) SPEED=sp;
    /* TILT IS A URL VARIABLE TOO. It was config-only, so the one control that
       changes the picture most could not be linked to or shared — the share
       box below now writes it, and this reads it back. 0 is straight down
       (the exact view) and 90 is edge-on. */
    /* clamped to the slider's own 80° max: a link carrying more drew a picture
       the control could not represent — the thumb pinned at 80 while the view
       sat at 90, and the first drag snapped the drawing back */
    var tl=parseFloat(q0.get('tilt')); if(tl>=0&&tl<=90) TILT=SOL_TILT0=Math.min(80,tl);
    /* how much of the moon system to draw. Clamped inside satView too, so a
       level this planet does not have degrades to the most it does. */
    var ml=parseInt(q0.get('moons'),10); if(SOL_HAS.sat&&ml>=1&&ml<=3) MOONLVL=ml;
    if(SOL_HAS.transfer){ var to=parseInt(q0.get('to'),10); if(to>=3&&to<=5) TARGET=to; }
    var d=q0.get('date'); if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){ var dt=Date.parse(d+'T12:00:00Z');
      if(!isNaN(dt)) START=Math.max(VALID0,Math.min(VALID1,dt)); } }
  if(!START) START=Date.now()-(Date.now()%60000);
  markZoom(); $('sol-span').value=SPAN;
  if($('sol-belt')) $('sol-belt').setAttribute('aria-pressed',LAYER.belt?'true':'false');
  if($('sol-comets')) $('sol-comets').setAttribute('aria-pressed',LAYER.comets?'true':'false');
  if($('sol-dests')) markDest();

  if($('sol-tilt')) $('sol-tilt').value=String(TILT);
  /* the controls shipped disabled (and Now hidden) because without this script
     not one of them could do anything. This is the moment they become real. */
  /* ---- full screen -------------------------------------------------------
     The stage is the figure and the read-out side by side, which is already
     the right shape for a landscape screen, so unlike the Sun-Earth-Moon view
     there is nothing to rotate: this drawing is square and reads the same way
     whichever way a phone is held. */
  var solStage=document.querySelector('.sol-stage'), solFsBtn=$('sol-fs');
  function solFsOn(){ return document.fullscreenElement===solStage||document.webkitFullscreenElement===solStage; }
  function solFsSync(){
    if(!solFsBtn) return;
    var on=solFsOn();
    solFsBtn.setAttribute('aria-pressed',on?'true':'false');
    var l=solFsBtn.querySelector('.sol-fslab'); if(l) l.textContent=on?'Exit full screen':'Full screen';
  }
  function solToggleFs(){
    if(!solStage) return;
    if(solFsOn()){ (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document); return; }
    var req=solStage.requestFullscreen||solStage.webkitRequestFullscreen;
    if(req) req.call(solStage);
  }
  if(solFsBtn&&solStage&&(solStage.requestFullscreen||solStage.webkitRequestFullscreen)) solFsBtn.addEventListener('click',solToggleFs);
  else if(solFsBtn) solFsBtn.hidden=true;
  document.addEventListener('fullscreenchange',solFsSync);
  document.addEventListener('webkitfullscreenchange',solFsSync);
  /* ?fs=1 means "opened from a Full screen link". Full screen NEEDS a user
     gesture and a navigation is not one, so this arms the next tap or key
     press instead of trying (and being refused) on load. Once only. */
  if(q0&&q0.get('fs')&&solStage){
    var armS=function(){ document.removeEventListener('pointerdown',armS); document.removeEventListener('keydown',armS); solToggleFs(); };
    document.addEventListener('pointerdown',armS); document.addEventListener('keydown',armS);
  }

  var inert=document.querySelectorAll('[data-sol-inert]');
  for(var ii=0;ii<inert.length;ii++){ inert[ii].disabled=false; inert[ii].removeAttribute('hidden'); inert[ii].removeAttribute('data-sol-inert'); }
  retarget(); syncSpeed(); tiltLabel(); markMoons(); paint();

  $('sol-slider').addEventListener('input',function(){ OFF=+this.value||0; stop(); paint(); });
  $('sol-span').addEventListener('change',function(){ SPAN=this.value; if(OFF>SPAN_MIN[SPAN]) OFF=SPAN_MIN[SPAN]; flightBar(); paint(); });
  /* THE LADDER, as buttons. One handler on the group rather than one per
     button, and markZoom is the single place that says which is current — the
     select it replaces was being set from four different places. */
  function markZoom(){
    var bs=document.querySelectorAll('[data-sol-zoombtn]'), i;
    for(i=0;i<bs.length;i++) bs[i].setAttribute('aria-pressed',bs[i].getAttribute('data-sol-zoombtn')===RUNG?'true':'false');
  }
  /* A CONTROL THAT SAYS "ASTEROID BELT" HAS TO SHOW THE ASTEROID BELT. The
     belt rung is named after the belt, and choosing it while the belt layer was
     off left you looking at the gap where the belt would be. It only ever turns
     a layer ON — if you switch it off by hand it stays off until you ask for
     that view again. */
  function layerFor(r){
    /* ...on a page that carries the belt's elements. Without SOL_HAS.small this
       would switch on a layer whose drawing code was left out of this file. */
    if(SOL_HAS.small&&r==='belt'&&!LAYER.belt){ LAYER.belt=1;
      if($('sol-belt')) $('sol-belt').setAttribute('aria-pressed','true'); }
  }
  var zoomBox=$('sol-zooms');
  if(zoomBox) zoomBox.addEventListener('click',function(e){
    var b=e.target.closest('[data-sol-zoombtn]'); if(!b) return;
    RUNG=b.getAttribute('data-sol-zoombtn'); layerFor(RUNG); markZoom(); syncSpeed(); markMoons(); paint(); share();
  });
  $('sol-start').addEventListener('change',function(){
    /* keep the time of day that is already set and move only the date, so
       stepping a day forward does not silently jump the clock to midnight */
    var d=new Date(START), t=Date.parse(this.value+'T00:00:00');
    if(!isNaN(t)){ var n=new Date(t); n.setHours(d.getHours(),d.getMinutes(),0,0);
      START=Math.max(VALID0,Math.min(VALID1,+n)); paint(); } });
  $('sol-now').addEventListener('click',function(){ START=Date.now()-(Date.now()%60000); OFF=0; stop(); paint(); });
  $('sol-play').addEventListener('click',function(){
    if(PLAY){ stop(); return; }
    this.textContent='Pause'; this.setAttribute('aria-pressed','true');
    /* minutes of sky per 40ms tick = days-per-second x 1440 / 25 */
    PLAY=setInterval(function(){ OFF+=SPEED*57.6; if(OFF>SPAN_MIN[SPAN]) OFF=0; paint(); },40);
  });
  if($('sol-speed')) $('sol-speed').addEventListener('input',function(){ SPEED=+this.value||1; speedLabel(); share(); });
  /* the tilt repaints and nothing else — it changes the VIEW, not the instant,
     so the date, the span and the slider position all stay exactly where they
     were and you can tilt while it is playing */
  /* THE MOON-DETAIL CONTROL. Only shown where there is more to show: a moons
     rung whose planet has a level 2 at all. Mars and Pluto have every moon
     they own already in the picture, so on those the field stays hidden rather
     than offering a button that changes nothing. */
  function markMoons(){
    var f=$('sol-moonfield'); if(!f) return;
    var r=solRung(RUNG), idx=r[5], on=SOL_HAS.sat&&r[4]==='moons'&&satMaxLevel(idx)>1;
    f.hidden=!on;
    if(!on) return;
    var mx=satMaxLevel(idx), bs=f.querySelectorAll('[data-sol-moons]'), i, lv;
    for(i=0;i<bs.length;i++){
      lv=+bs[i].getAttribute('data-sol-moons');
      /* a level this planet does not have is removed, not disabled — there is
         nothing behind it to explain */
      bs[i].hidden=lv>mx;
      bs[i].setAttribute('aria-pressed',lv===MOONLVL?'true':'false');
      bs[i].title=satDrawn(idx,lv)+' moons drawn';
    }
    var out=$('sol-moonsout');
    if(out){
      var drawn=satDrawn(idx,MOONLVL), total=satCount(idx);
      out.innerHTML='Drawing <b>'+drawn+'</b> of '+plName(idx)+"'s <b>"+total+'</b> confirmed moon'+(total===1?'':'s')
        +(drawn<total ? '. The rest are a few km of captured rubble on distant tilted orbits — real, but a dot for each would say something false about what a moon system looks like.' : '.');
    }
  }
  var moonBox=$('sol-moons');
  if(moonBox) moonBox.addEventListener('click',function(e){
    var b=e.target.closest('[data-sol-moons]'); if(!b) return;
    MOONLVL=+b.getAttribute('data-sol-moons')||1;
    markMoons(); paint(); share();
  });
  function tiltLabel(){ var el=$('sol-tiltout'); if(!el) return;
    /* THE EXAGGERATION IS A HELIOCENTRIC FACT AND IS ONLY CLAIMED THERE.
       It multiplies each planet's height off the ecliptic, which is a thing
       only solSystemView draws. A moon view models no per-moon inclination at
       all — the orbits are drawn in the planet's equatorial plane — so the
       read-out saying "orbit tilts x7" on Jupiter's moons was reporting a
       correction that nothing was applying. */
    var ex=solRung(RUNG)[4]==='sys' ? tiltExag() : 1;
    el.textContent = TILT<1 ? 'flat — straight down on the plane'
      : TILT+'°' + (ex>1 ? ' · orbit tilts ×'+ex : '');
    var st=$('sol-stage'); if(st) st.classList.toggle('sol-tilted',TILT>=1); }
  if($('sol-tilt')) $('sol-tilt').addEventListener('input',function(){ TILT=+this.value||0; tiltLabel(); paint(); share(); });
  /* the launch windows for the chosen target, listed rather than assumed */
  function fillWindows(){
    var sel=$('sol-launch'), row=$('sol-launchrow');
    if(!sel||!row) return;
    if(!TARGET){ row.hidden=true; sel.innerHTML=''; WINS=[]; return; }
    WINS=trWindows(TARGET,Date.now(),6)||[];
    row.hidden=!WINS.length;
    sel.innerHTML=WINS.map(function(w,i){
      return '<option value="'+i+'">'+dfmt(w.t0)+' — '+Math.round(w.tf/86400000)+' day flight</option>';
    }).join('');
    if(WIN>=WINS.length) WIN=0;
    sel.value=String(WIN);
  }
  if($('sol-launch')) $('sol-launch').addEventListener('change',function(){
    WIN=parseInt(this.value,10)||0;
    var w=WINS[WIN]; if(!w) return;
    SOLN=w;
    /* go to the launch day, and make the slider cover the crossing: a 265-day
       flight scrubbed over a month shows nothing, and over a century it is one
       pixel of the track */
    START=w.t0; OFF=0;
    fitSpan(w); stop(); missionRows(); flightBar(); paint(); share();
  });
  /* pressed state lives in aria-pressed, which is what a screen reader reads
     and what the stylesheet lights up — one source, not a class beside it */
  function layerBtn(id,key){
    var b=$(id); if(!b) return;
    b.addEventListener('click',function(){
      LAYER[key]=LAYER[key]?0:1;
      b.setAttribute('aria-pressed',LAYER[key]?'true':'false');
      paint();
    });
  }
  layerBtn('sol-belt','belt'); layerBtn('sol-comets','comets');
  /* THE DESTINATION BUTTONS. Choosing one picks the next launch window, moves
     the starting date to that day and sizes the span to cover the crossing —
     so the picture jumps, and the read-out under the buttons says where to and
     offers the page about the place. */
  function markDest(){
    var bs=document.querySelectorAll('[data-sol-dest]'), i;
    for(i=0;i<bs.length;i++)
      bs[i].setAttribute('aria-pressed',(+bs[i].getAttribute('data-sol-dest'))===TARGET?'true':'false');
    var L=$('sol-destlink');
    if(L){
      if(!TARGET){ L.hidden=true; L.innerHTML=''; }
      else { L.hidden=false;
        L.innerHTML='Flying to <b>'+plName(TARGET)+'</b>. '
          +'<a href="'+DEST_SLUG[TARGET]+'">More about '+plName(TARGET)+' →</a>'; }
    }
  }
  var db=$('sol-dests');
  if(db) db.addEventListener('click',function(e){
    var b=e.target.closest('[data-sol-dest]'); if(!b) return;
    TARGET=parseInt(b.getAttribute('data-sol-dest'),10)||0;
    if(TARGET) RUNG=DEST_RUNG[TARGET]||'belt';
    markDest(); retarget(); paint(); share(); });
  var zs=document.querySelectorAll('[data-sol-zoom]');
  for(var zi=0;zi<zs.length;zi++) zs[zi].addEventListener('click',function(){
    RUNG=this.getAttribute('data-sol-zoom'); layerFor(RUNG); markZoom(); syncSpeed(); paint(); share(); });
  /* "take me to that date" — the launch windows and closest approaches on the
     page are links into the picture, not just numbers in a table */
  var js=document.querySelectorAll('[data-sol-date]');
  for(var ji=0;ji<js.length;ji++) js[ji].addEventListener('click',function(e){
    e.preventDefault();
    var t=Date.parse(this.getAttribute('data-sol-date')+'T12:00:00Z');
    if(isNaN(t)) return;
    START=t; OFF=0; stop();
    var z=this.getAttribute('data-sol-zoom2'); if(z){ RUNG=z; markZoom(); }
    var to=this.getAttribute('data-sol-target');
    if(to){ TARGET=parseInt(to,10); markDest(); retarget(); }
    paint();
    var fig=$('sol-fig'); if(fig&&fig.scrollIntoView) fig.scrollIntoView({behavior:'smooth',block:'center'});
  });
  /* HOVER + CLICK ON THE PLANETS THEMSELVES. Bound to #sol-fig ONCE, here,
     rather than to each circle/polyline: paint() replaces #sol-fig's
     CONTENTS every repaint (up to 25 times a second while playing) but never
     the element itself, so one delegated listener survives every repaint —
     rebinding per shape, per frame would be the expensive way to do this.
     Only "sys" rungs draw data-sol-planet at all (see solSystemView in
     planets.mjs), so on every other rung this listener simply never matches
     anything. */
  var solFig=$('sol-fig'), solTip=$('sol-ptip'), solHoverKey=null;
  function solPlanetEls(key){ return solFig.querySelectorAll('[data-sol-planet="'+key+'"]'); }
  function solClearHover(){
    if(solHoverKey){ var els=solPlanetEls(solHoverKey),hi; for(hi=0;hi<els.length;hi++) els[hi].classList.remove('sol-hoverlit'); }
    solHoverKey=null; if(solTip) solTip.hidden=true;
  }
  function solSetHover(el,x,y){
    var key=el.getAttribute('data-sol-planet');
    if(key!==solHoverKey){
      solClearHover(); solHoverKey=key;
      var els=solPlanetEls(key),hi; for(hi=0;hi<els.length;hi++) els[hi].classList.add('sol-hoverlit');
      if(solTip){
        var moons=el.getAttribute('data-sol-moons')==='1';
        solTip.textContent='Click to see '+key+(key==='Earth'?' & the Moon':moons?' and its moons':'')+' →';
        solTip.hidden=false;
      }
    }
    if(solTip){ solTip.style.left=x+'px'; solTip.style.top=y+'px'; }
  }
  if(solFig){
    solFig.addEventListener('pointermove',function(e){
      var el=e.target.closest&&e.target.closest('[data-sol-planet]');
      if(el) solSetHover(el,e.clientX,e.clientY); else solClearHover();
    });
    solFig.addEventListener('pointerleave',solClearHover);
    /* click navigates straight to that planet's own page — the same
       destination the tooltip just named */
    solFig.addEventListener('click',function(e){
      var el=e.target.closest&&e.target.closest('[data-sol-planet]');
      if(!el) return;
      var slug=el.getAttribute('data-sol-slug');
      if(slug) location.href='/solar-system-simulator/'+slug+'/';
    });
  }
  var cp=$('sol-copy');
  if(cp) cp.addEventListener('click',function(){ var el=$('sol-url'); el.select();
    try{ navigator.clipboard.writeText(el.value); cp.textContent='Copied'; setTimeout(function(){ cp.textContent='Copy link'; },1600); }catch(e){} });
})();

/* THE PLANET'S OWN GLOBE, on the pages that draw one. Its own IIFE. It used to
   ride along in the one shared file and fall out at the first line on pages
   with no globe; now the globe module is only in the file when the page draws
   one, so this block is only emitted then too — and still checks for its box,
   because a planet page can carry the module for its Earth-and-Moon view
   without carrying a #pl-globe. */
/* globe: not drawn on this page */
