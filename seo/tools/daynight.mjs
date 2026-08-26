/* daynight.mjs — the day-and-night world map: where the sun is overhead, and
 * therefore where it is light and where it is dark, right now.
 *
 * TWO PAGES DRAW THIS PICTURE — the home page's world-clock card and
 * /day-night-map/ — so the maths and the geometry live here rather than in
 * either of them. ONE SOURCE, TWO RUNTIMES, the moon.mjs pattern: DN_CORE is
 * an ES5 source string that ships to the browser and is also evaluated here at
 * build time, so a baked map and a live one cannot disagree.
 *
 * THE PROJECTION is equirectangular: x = (lon+180)/360*W, y = (90-lat)/180*H.
 * Every straight-up-and-down line on it is a meridian and every across line a
 * parallel, which is exactly why it is the right map for this job and exactly
 * why its continents are the wrong size. /day-night-map/ says so at length.
 *
 * THE NIGHT SIDE IS SOLVED, NOT DRAWN. The sun is `a` degrees above the
 * horizon at (lat, lon) when
 *   sin a = sin(dec) sin(lat) + cos(dec) cos(lat) cos(lon - subsolar)
 * which for a fixed `a` and a fixed meridian is one equation in one unknown:
 *   A sin(lat) + B cos(lat) = C,  A = sin dec, B = cos dec cos H, C = sin a
 *   => R cos(lat - psi) = C,  R = hypot(A,B), psi = atan2(A,B)
 * So the terminator is a latitude per meridian, and the shaded region is that
 * curve closed along whichever pole is in the dark. Feeding a = 0 gives the
 * day/night line; a = -18 gives the far edge of astronomical twilight, and the
 * band between them is drawn with fill-rule="evenodd", which is what puts a
 * real dusk on the map instead of a hard edge.
 *
 * THE CURVE IS BUILT IN ABSOLUTE MAP COORDINATES, and that is the fix for the
 * old card's one flaw. It used to bake the curve relative to its own subsolar
 * meridian and slide the whole group sideways, with two extra copies either
 * side to cover the wrap — fine at one repaint a minute, wrong the moment you
 * press Play, because the group's translate jumps a full map width every time
 * the subsolar longitude crosses the date line. Solving per meridian means
 * there is nothing to translate and nothing to wrap: the shape simply changes,
 * smoothly, and the picture never leaves the frame.
 */
import { COAST } from "./globe.mjs";

/* ---- the client/build shared core (ES5, no backticks) ------------------- */
export const DN_CORE = `
var DN_W=720,DN_H=360;
function dnX(lon){return (lon+180)/360*DN_W}
function dnY(lat){return (90-lat)/180*DN_H}
function dnF(n){return Math.round(n*10)/10}
/* the sun's declination and the longitude it is directly over, from the same
   low-precision solar series the rest of the site uses */
function dnSub(ms){
  var d=(ms-Date.UTC(2000,0,1,12))/86400000;
  var g=(357.529+0.98560028*d)*Math.PI/180;
  var q=280.459+0.98564736*d;
  var L=(q+1.915*Math.sin(g)+0.020*Math.sin(2*g))*Math.PI/180;
  var e=(23.439-0.00000036*d)*Math.PI/180;
  var dec=Math.asin(Math.sin(e)*Math.sin(L))*180/Math.PI;
  var ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L))*180/Math.PI;
  var gmst=(18.697374558+24.06570982441908*d)%24*15;
  var lo=ra-gmst; lo=((lo%360)+540)%360-180;
  return {dec:dec,lon:lo};
}
/* how high the sun is, in degrees, at one place at one instant. The argument
   is clamped because sin^2+cos^2 lands on 1.0000000000000002 often enough to
   matter: at the subsolar point itself, an unclamped asin returns NaN. */
function dnAlt(lat,lon,dec,ss){
  var R=Math.PI/180,h=(lon-ss)*R;
  var v=Math.sin(dec*R)*Math.sin(lat*R)+Math.cos(dec*R)*Math.cos(lat*R)*Math.cos(h);
  return Math.asin(v>1?1:v<-1?-1:v)/R;
}
/* WHERE ON THIS MERIDIAN IS THE SUN EXACTLY a DEGREES UP?
   A sin(lat) + B cos(lat) = C, solved by the tangent half-angle substitution
   rather than by a phase angle. Both give the same two roots; only this one
   gives them already inside (-180, 180], which matters because the phase form
   needs the answer unwrapped by hand and gets it wrong near an equinox — it
   was returning "this whole meridian is dark" for meridians where the sun was
   a degree above the horizon. Also returned: whether each POLE is darker than
   a, which is what says which side of a root the shading goes. */
function dnRoots(dec,ss,lon,a){
  var R=Math.PI/180,h=(lon-ss)*R;
  var A=Math.sin(dec*R),B=Math.cos(dec*R)*Math.cos(h),C=Math.sin(a*R);
  var out={sDark:(-A<C),nDark:(A<C),r:[]};
  var disc=A*A+B*B-C*C;
  if(disc>0){
    /* atan2 lands in (-180,180] and the substitution doubles it, so a root can
       come back as 275 degrees when it means -85. Wrapped before it is judged
       against the poles, or a real root is thrown away as out of range. */
    var s=Math.sqrt(disc),wrap=function(u){return ((u%360)+540)%360-180;};
    var u1=wrap(2*Math.atan2(A+s,B+C)/R),u2=wrap(2*Math.atan2(A-s,B+C)/R);
    if(u1>-90&&u1<90) out.r.push(u1);
    if(u2>-90&&u2<90) out.r.push(u2);
    if(out.r.length===2&&out.r[0]>out.r[1]) out.r=[out.r[1],out.r[0]];
  }
  return out;
}
/* THE DARK PART OF ONE MERIDIAN, as up to three pieces: a cap hanging off the
   south pole (everything below sHi), a cap off the north pole (everything
   above nLo), and — where both poles are lit but the middle is not, which
   happens near the equinoxes at the twilight thresholds — a band between bLo
   and bHi. A piece that does not exist is returned collapsed onto an edge, so
   the caller always builds the same three shapes and two of them usually have
   no area at all. */
function dnBands(dec,ss,lon,a){
  var q=dnRoots(dec,ss,lon,a),n=q.r.length;
  var sHi=-90,nLo=90,bLo=-90,bHi=-90;
  if(n===0){ if(q.sDark) sHi=90; }                 /* all of it, or none of it */
  else if(n===1){ if(q.sDark) sHi=q.r[0]; else nLo=q.r[0]; }
  else if(q.sDark){ sHi=q.r[0]; nLo=q.r[1]; }      /* dark at both ends, lit between */
  else { bLo=q.r[0]; bHi=q.r[1]; }                 /* lit at both ends, dark between */
  return [sHi,nLo,bLo,bHi];
}
/* the shaded region for "the sun is lower than a degrees", as one path in
   absolute map coordinates. Empty pieces are dropped rather than emitted flat,
   so in the ordinary case this is exactly the one curve it always was. */
function dnPath(dec,ss,a,step){
  var st=step||2,n=Math.round(360/st),i,lon,b;
  var sd="",nd="",bh="",bl="",anyS=0,anyN=0,anyB=0;
  for(i=0;i<=n;i++){
    lon=-180+i*st; b=dnBands(dec,ss,lon,a);
    var x=dnF(dnX(lon));
    sd+=(i?"L":"M")+x+" "+dnF(dnY(b[0]));
    nd+=(i?"L":"M")+x+" "+dnF(dnY(b[1]));
    bh+=(i?"L":"M")+x+" "+dnF(dnY(b[3]));
    bl="L"+x+" "+dnF(dnY(b[2]))+bl;
    if(b[0]>-90) anyS=1;
    if(b[1]<90) anyN=1;
    if(b[3]>b[2]) anyB=1;
  }
  var out="";
  if(anyS) out+=sd+"L"+DN_W+" "+DN_H+"L0 "+DN_H+"Z";
  if(anyN) out+=nd+"L"+DN_W+" 0L0 0Z";
  if(anyB) out+=bh+bl+"Z";
  return out;
}
/* night + astronomical twilight as one even-odd path: the band between the two
   curves is the part that belongs to exactly one of them */
function dnTwiPath(dec,ss,step){
  return dnPath(dec,ss,0,step)+dnPath(dec,ss,-18,step);
}
/* ---- THE SAME MOMENT, SEEN FROM THE SIDE ---------------------------------
 * The map answers "where is it light". This answers "why there", and it is the
 * only picture on the site that draws the sun and the Earth in the same frame
 * at once.
 *
 * The viewpoint is in the plane of the orbit, level with the sun, so sunlight
 * arrives as PARALLEL horizontal lines and exactly half the globe is lit. One
 * of those lines is special: the one running from the centre of the sun to the
 * centre of the Earth. It meets the surface at a single point, and that point
 * is the place the sun is directly overhead — the same yellow dot the map
 * marks. Its LATITUDE is the declination.
 *
 * WHAT SETS THE LEAN. The axis is tilted 23.4 degrees and points the same way
 * all year, so what changes is how much of that tilt faces the sun. Seen from
 * here that component IS the declination, so drawing the axis leaning by dec
 * is not an approximation of the seasons — it is what the seasons are. At an
 * equinox the tilt is sideways-on to the sun and the axis draws upright, which
 * is why the light then divides the globe pole to pole.
 *
 * WHY THE TROPICS ARE WHERE THEY ARE. The lean can never exceed the tilt, so
 * the centre-to-centre line can never land further from the equator than
 * 23.4 degrees. Those two limits, drawn as chords at +/- r*sin(tilt) along the
 * axis, are the Tropic of Cancer and the Tropic of Capricorn. Passing tilt
 * separately from dec is deliberate: on a solstice the two are equal and the
 * dot lands exactly on a chord end, which is the whole point of the picture.
 *
 * Returns a complete <svg>, not inner markup, because the client replaces it
 * by setting innerHTML on a plain <div> — an HTML parser handles a whole svg
 * element correctly, where SVG-namespaced innerHTML has historically not. */
function dnSide(dec,tilt){
  var RD=Math.PI/180,cx=372,cy=138,r=86,d=dec*RD,t=tilt*RD,i,y;
  var ax=-Math.sin(d),ay=-Math.cos(d);          /* unit vector toward the north pole */
  var ex=Math.cos(d),ey=-Math.sin(d);           /* along the equator, perpendicular to it */
  var PX=function(u,v){return dnF(cx+ax*u+ex*v)};
  var PY=function(u,v){return dnF(cy+ay*u+ey*v)};
  var o=r*Math.sin(t),h=r*Math.cos(t);          /* tropic offset, and its half-chord */
  var s='<svg class="dns-svg" viewBox="0 0 700 276" width="100%" role="img" aria-label="The Earth seen from the side, lit from the left, with the line from the centre of the sun to the centre of the Earth landing between the Tropic of Cancer and the Tropic of Capricorn">';
  s+='<circle class="dns-glow" cx="54" cy="'+cy+'" r="54"/><circle class="dns-sun" cx="54" cy="'+cy+'" r="34"/>';
  for(i=-2;i<=2;i++){ if(!i) continue; y=cy+i*46;
    s+='<line class="dns-ray" x1="98" y1="'+y+'" x2="'+(cx-r-8)+'" y2="'+y+'"/>'; }
  s+='<text class="dns-lab" x="98" y="26">Sunlight, arriving parallel</text>';
  s+='<circle class="dns-earth" cx="'+cx+'" cy="'+cy+'" r="'+r+'"/>';
  s+='<path class="dns-night" d="M'+cx+' '+(cy-r)+'A'+r+' '+r+' 0 0 1 '+cx+' '+(cy+r)+'Z"/>';
  s+='<line class="dns-term" x1="'+cx+'" y1="'+(cy-r-12)+'" x2="'+cx+'" y2="'+(cy+r+12)+'"/>';
  s+='<line class="dns-axis" x1="'+PX(-r*1.26,0)+'" y1="'+PY(-r*1.26,0)+'" x2="'+PX(r*1.26,0)+'" y2="'+PY(r*1.26,0)+'"/>';
  s+='<text class="dns-lab" text-anchor="middle" x="'+PX(r*1.4,0)+'" y="'+PY(r*1.4,0)+'">N</text>';
  s+='<text class="dns-lab" text-anchor="middle" x="'+PX(-r*1.4,0)+'" y="'+PY(-r*1.4,0)+'">S</text>';
  s+='<line class="dns-par dns-trop" x1="'+PX(o,-h)+'" y1="'+PY(o,-h)+'" x2="'+PX(o,h)+'" y2="'+PY(o,h)+'"/>';
  s+='<line class="dns-par dns-trop" x1="'+PX(-o,-h)+'" y1="'+PY(-o,-h)+'" x2="'+PX(-o,h)+'" y2="'+PY(-o,h)+'"/>';
  s+='<line class="dns-par dns-eq" x1="'+PX(0,-r)+'" y1="'+PY(0,-r)+'" x2="'+PX(0,r)+'" y2="'+PY(0,r)+'"/>';
  s+='<line class="dns-ctr" x1="54" y1="'+cy+'" x2="'+cx+'" y2="'+cy+'"/>';
  s+='<circle class="dns-hit" cx="'+(cx-r)+'" cy="'+cy+'" r="6"/>';
  /* UP AND TO THE LEFT, always. The tropic chord nearest the dot leaves it
     going up-RIGHT in June and down-RIGHT in December, so the only quadrant
     that is clear on every date is the one behind the incoming ray. */
  s+='<text class="dns-lab dns-lab-d" text-anchor="end" x="'+(cx-r-8)+'" y="'+(cy-18)+'">sun overhead here</text>';
  s+='<text class="dns-lab dns-lab-t" x="'+(PX(o,h)+10)+'" y="'+(PY(o,h)+4)+'">Tropic of Cancer</text>';
  s+='<text class="dns-lab" x="'+(PX(0,r)+10)+'" y="'+(PY(0,r)+4)+'">Equator</text>';
  s+='<text class="dns-lab dns-lab-t" x="'+(PX(-o,h)+10)+'" y="'+(PY(-o,h)+4)+'">Tropic of Capricorn</text>';
  return s+'</svg>';
}
`;

/* the same functions, here, by evaluating the source the browser gets */
const DN = new Function(`${DN_CORE}
return {dnX:dnX,dnY:dnY,dnF:dnF,dnSub:dnSub,dnAlt:dnAlt,dnBands:dnBands,dnPath:dnPath,dnTwiPath:dnTwiPath,dnSide:dnSide};`)();

export const DN_W = 720, DN_H = 360;
/* THE POLES ARE CROPPED OFF. A whole-globe equirectangular map is 2:1, and the
   two bands it spends that height on are the ones this projection stretches
   into nonsense. Cutting to 82N-62S loses no city anybody looks for and takes
   the picture to about 2.5:1. The paths are still drawn in full-globe
   coordinates — only the viewBox crops, so nothing else has to know. */
export const DN_TOP = 82, DN_BOT = -62;
export const dnX = DN.dnX, dnY = DN.dnY, dnF = DN.dnF;
export const subsolar = DN.dnSub;
export const sunAltitude = DN.dnAlt;
export const nightPath = DN.dnPath;
export const twilightPath = DN.dnTwiPath;
/** the side view — the sun, the Earth and the one line between their centres */
export const sideView = DN.dnSide;

/** The sun's year, solved from the same series that draws the map: the tilt
 *  (its largest declination), the two solstice instants and the two equinox
 *  crossings, from `from` forward. Both the home page and /day-night-map/ take
 *  their season buttons and their tropic latitudes from this ONE scan, so the
 *  two pages cannot disagree about where the tropics are or when a solstice
 *  falls. Hourly steps: a solstice is flat, so the hour it lands in is exact
 *  enough for a date, and an equinox crossing is caught to the hour. */
export function seasonPoints(from = Date.now()) {
  let max = -99, min = 99, maxMs = 0, minMs = 0, up = 0, down = 0, prev = null;
  for (let ms = from; ms < from + 366 * 86400000; ms += 3600000) {
    const d = subsolar(ms).dec;
    if (d > max) { max = d; maxMs = ms; }
    if (d < min) { min = d; minMs = ms; }
    if (prev !== null) {
      if (prev < 0 && d >= 0 && !up) up = ms;
      if (prev > 0 && d <= 0 && !down) down = ms;
    }
    prev = d;
  }
  return { tilt: max, maxMs, minMs, up, down };
}

/** the viewBox for the cropped map */
export const DN_VIEWBOX = `0 ${dnF(dnY(DN_TOP))} ${DN_W} ${dnF(dnY(DN_BOT) - dnY(DN_TOP))}`;
export const DN_VIEW_Y = dnF(dnY(DN_TOP));
export const DN_VIEW_H = dnF(dnY(DN_BOT) - dnY(DN_TOP));

/** the coastlines, as one path. A ring that crosses the date line is broken
 *  there, or it draws a band straight back across the whole map. */
export function landPath() {
  return COAST.map((ring) => {
    let out = "", run = null, prev = null;
    for (const [lon, lat] of ring) {
      if (prev !== null && Math.abs(lon - prev) > 180) { if (run) out += run + "Z"; run = null; }
      run = (run === null ? "M" : run + "L") + dnF(dnX(lon)) + " " + dnF(dnY(lat));
      prev = lon;
    }
    return out + (run ? run + "Z" : "");
  }).join("");
}

/* ---- the city dots ------------------------------------------------------
 * EVERY DOT COMES FROM THE WORLD-CLOCK REGISTRY'S OWN COORDINATES, so a city
 * cannot be marked in one place here and another on its own page. Named by
 * IANA zone and resolved through that registry, never typed. Thinned where two
 * labels would sit on top of each other at this size — Chicago beside New
 * York, Seoul beside Tokyo, Dubai beside Karachi. */
export const DN_MAP_EXTRA = [
  "America/Los_Angeles", "America/Mexico_City", "America/Sao_Paulo",
  "America/Bogota", "America/Anchorage", "Europe/Moscow", "Europe/Madrid", "Africa/Lagos",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Nairobi", "Asia/Karachi",
  "Asia/Kolkata", "Asia/Bangkok", "Asia/Shanghai", "Asia/Singapore", "Asia/Jakarta",
  "Pacific/Auckland", "Australia/Perth",
];
export const DN_MAP_BIG = [
  { slug: "new-york", city: "New York", tz: "America/New_York" },
  { slug: "london", city: "London", tz: "Europe/London" },
  { slug: "tokyo", city: "Tokyo", tz: "Asia/Tokyo" },
  { slug: "sydney", city: "Sydney", tz: "Australia/Sydney" },
];

/** one labelled dot for a city, given the world-clock registry list */
export function cityMark(list, tz, big, esc) {
  const g = list.find((x) => x.tz === tz);
  if (!g) return "";
  const x = dnF(dnX(g.lon)), y = dnF(dnY(g.lat));
  const r = big ? 4.5 : 2.8, fs = big ? 14 : 10.5, col = big ? "#fcd34d" : "#e2e8f0";
  /* a label centred on a city near the edge runs off it — Auckland lost its
     last three letters — so the ones close to either side anchor inward */
  const anc = x > DN_W * 0.92 ? "end" : x < DN_W * 0.08 ? "start" : "middle";
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#0b0e1c" stroke-width="1.6"/>`
    + `<text x="${anc === "end" ? dnF(x + r + 2) : anc === "start" ? dnF(x - r - 2) : x}" y="${dnF(y - r - 4)}" text-anchor="${anc}" font-size="${fs}" font-weight="${big ? 700 : 600}" fill="${col}" paint-order="stroke" stroke="#0b0e1c" stroke-width="3">${esc(g.city)}</text>`;
}

/** the page this map's own explanation and simulator live on */
export const DAYNIGHT_PATH = "/day-night-map/";
