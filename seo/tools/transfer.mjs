/* transfer.mjs — launch windows and flight paths, for /solar-system-simulator/.
 *
 * WHY THIS IS NOT A TABLE OF DATES. "The next launch window to Mars is in
 * November 2026" is the kind of fact this site refuses to type in beside a
 * picture, because a year later it is wrong and nothing notices. So the window
 * is SOLVED, from the same orbits the simulator draws:
 *
 *   A minimum-energy transfer is half an ellipse. It leaves Earth's orbit at
 *   one end and arrives at the target's orbit at the other, so it sweeps
 *   exactly 180 degrees of heliocentric longitude. The launch window is
 *   therefore the moment when the target is positioned such that, after the
 *   flight time that ellipse takes, it will be at Earth's departure longitude
 *   plus 180 degrees. Scan for that instant and the date falls out.
 *
 * The flight time and the ellipse depend on the departure and arrival radii,
 * which depend on the flight time — so each candidate departure is iterated to
 * a fixed point (it converges in three or four passes; Earth's orbit is nearly
 * circular and Mars's eccentricity moves the answer by days, not months).
 *
 * WHAT IS SIMPLIFIED, STATED PLAINLY BECAUSE THE PAGE SAYS IT TOO. The transfer
 * is coplanar — the real inclinations (Mars 1.85 degrees, Jupiter 1.30) cost a
 * plane change this ignores. It is minimum-energy, so real missions, which
 * trade fuel for a faster arrival or a gravity assist, depart within days to
 * weeks of these dates rather than exactly on them. And the delta-v figures are
 * heliocentric — the change in the craft's orbit around the SUN — with the cost
 * of climbing out of Earth's own gravity well reported separately, because that
 * part is where most of the rocket goes.
 *
 * WHAT IS NOT SIMPLIFIED: the planets' positions, which come from planets.mjs,
 * and the arrival, which lands on the target's real longitude and real distance
 * from the Sun on the arrival date, not on a circle standing in for its orbit.
 *
 * check-solar-data.mjs holds the whole thing to numbers it did not produce: the
 * textbook Hohmann flight times (259 days to Mars, 997 to Jupiter, 2,209 to
 * Saturn), the textbook departure delta-v (2.94, 8.79 and 10.3 km/s), the
 * injection burn from low Earth orbit (3.6 km/s for Mars), and the 25.6-month
 * cadence of the Mars windows.
 */

/* ---------------------------------------------------------------------------
 * TRANSFER_JS — shared ES5 source, everything prefixed `tr`.
 * ------------------------------------------------------------------------- */
export const TRANSFER_JS = `
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
`;

/* ---------------------------------------------------------------------------
 * The Node side.
 * ------------------------------------------------------------------------- */
import { PLANETS_JS } from "./planets.mjs";

const T = new Function(`${PLANETS_JS}
${TRANSFER_JS}
return { trSolve, trWindow, trWindows, trCost, trClosest, trCraft, TR_TARGETS, TR_GM_SUN, TR_LEO };`)();

export const TR_TARGETS = T.TR_TARGETS;
export const TR_GM_SUN = T.TR_GM_SUN;
/** the next minimum-energy departure to planet `idx` at or after `ms` */
export const launchWindow = (idx, ms) => {
  const s = T.trWindow(idx, +ms);
  if (!s) return null;
  return {
    depart: new Date(s.t0), arrive: new Date(s.t0 + s.tf),
    flightDays: s.tf / 86400000,
    aAU: s.a / 149597870, e: s.e,
    r1AU: s.r1 / 149597870, r2AU: s.r2 / 149597870,
    raw: s,
  };
};
/** delta-v accounting for a solved window */
export const transferCost = (idx, win) => T.trCost(idx, win.raw);
/** the next `count` closest approaches between Earth and planet `idx` */
export const launchWindows = (idx, ms, n) => T.trWindows(idx, +ms, n).map((w) => ({ t0: w.t0, tf: w.tf, raw: w }));

export const closestApproaches = (idx, ms, count) =>
  T.trClosest(idx, +ms, count).map((c) => ({ when: new Date(c.t), au: c.au }));
