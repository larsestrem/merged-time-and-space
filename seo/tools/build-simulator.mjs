#!/usr/bin/env node
/* build-simulator.mjs — /sun-moon-earth-movement-simulator/
 *
 * WHY A PAGE OF ITS OWN. The Sun–Earth–Moon view on every /sun/ and /moon/ city
 * page carries a slider, but it can only ever scrub ONE day: those pages are
 * about a day, and a week-long slider under a card headed "today" would be a
 * different page pretending to be that one. The week and the month are exactly
 * where the interesting things live, though — the moon goes round in 29.5 days,
 * the phase cycle only exists at that scale — so they get their own page, with
 * room for a bigger picture, a span control, a read-out, and the one thing the
 * card版 cannot have: space to say honestly how wrong the scale is.
 *
 * THE SCALE DISCLAIMER IS COMPUTED, NOT WRITTEN. Every figure in that card is
 * derived from ORR_GEOM — the drawing's own dimensions — against the real
 * numbers below. Change the picture and the disclaimer changes with it; there
 * is no sentence here that can quietly become false.
 *
 * EVERYTHING IS SHAREABLE. Location, date, time and span all live in the URL,
 * so a teacher can hand a class one link and every screen shows the same sky.
 * The builder near the bottom writes those links without anyone having to learn
 * the parameter names.
 *
 *   node seo/tools/build-simulator.mjs   (before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, appLd, learningLd, nSunCalc, nSunPos } from "./lib.mjs";
import { MOON_CORE, moonIllum, moonName, moonTimes, moonPos, moonGlyph, compass } from "./moon.mjs";
import { ORRERY_JS, ORR_GEOM, orrerySvg, orreryNote, orreryLocalValue, orreryCalc } from "./orrery.mjs";
import { ico } from "./icons.mjs";
import { hubQuestionsCard } from "./concepts.mjs";
import { viewLadder } from "./view-ladder.mjs";
import { CITIES } from "./city-registry.mjs";
import { placeLd, resolvePlace } from "./place.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
export const SIM_PATH = "/sun-moon-earth-movement-simulator/";
const TITLE = "Sun, Moon & Earth Movement Simulator";
/* the middle rung between this page (one town, looking up) and
   /solar-system-simulator/ (the whole system, to scale in distance) — see
   buildSystemView() near the bottom of this file */
export const SYS_PATH = "/earth-sun-moon-orbit-simulator/";

/* ---- the real thing, for the scale card. Mean values, in km. ------------- */
const REAL = {
  earthD: 12742,        /* mean diameter                                     */
  moonD: 3474,
  sunD: 1391400,
  moonDist: 384400,     /* mean centre-to-centre                             */
  sunDist: 149597870,   /* one astronomical unit                             */
};
/* the same four ratios, as the picture draws them */
const DRAWN = {
  moonSize: ORR_GEOM.MR / ORR_GEOM.R,                 /* moon Ø / Earth Ø     */
  sunSize: ORR_GEOM.RS / ORR_GEOM.R,
  moonDist: ORR_GEOM.RM / (2 * ORR_GEOM.R),           /* distance / Earth Ø   */
  sunDist: ORR_GEOM.SUN_DIST / (2 * ORR_GEOM.R),
};
const TRUE_RATIO = {
  moonSize: REAL.moonD / REAL.earthD,
  sunSize: REAL.sunD / REAL.earthD,
  moonDist: REAL.moonDist / REAL.earthD,
  sunDist: REAL.sunDist / REAL.earthD,
};
const wrongBy = (k) => TRUE_RATIO[k] / DRAWN[k];
const num = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
/* The marble: one concrete build of the real ratios, in units a room can find.
 * Note what this is NOT — it is not derived from ORR_GEOM. The scale card holds
 * two different kinds of number side by side: how wrong the PICTURE is (from
 * ORR_GEOM, so it moves whenever the drawing does) and what the real system
 * would measure at 16mm to the Earth (from REAL, so it does not). Changing the
 * drawing must not move these, and does not.
 * EXPORTED because /classroom/ describes the same corridor walk and had the
 * figures typed into its own prose, which is how two descriptions of one thing
 * start to disagree. */
const MARBLE_MM = 16;
const perMm = REAL.earthD / MARBLE_MM;                 /* km per mm           */
const marble = {
  moonD: REAL.moonD / perMm,                           /* mm                  */
  moonDist: REAL.moonDist / perMm / 1000,              /* m                   */
  sunD: REAL.sunD / perMm / 1000,                      /* m                   */
  sunDist: REAL.sunDist / perMm / 1000,                /* m                   */
};
export const MARBLE = { mm: MARBLE_MM, ...marble };

/* THE OTHER WAY ROUND: fix the SUN at a beach ball and see what the Earth
 * becomes. Same real dimensions, same arithmetic, one different starting
 * object — and it lands on a set of things a school actually has: a beach
 * ball, a marble, a peppercorn. It needs a field rather than a corridor,
 * which is the entire point of doing it this way round.
 * Derived, not typed, for the same reason MARBLE is: two descriptions of one
 * ratio typed in two places are two descriptions that will disagree. */
const BALL_CM = 60;
const perCm = REAL.sunD / BALL_CM;                     /* km per cm           */
export const BEACHBALL = {
  ballCm: BALL_CM,
  earthMm: REAL.earthD / perCm * 10,                   /* mm                  */
  moonMm: REAL.moonD / perCm * 10,                     /* mm                  */
  moonDistCm: REAL.moonDist / perCm,                   /* cm                  */
  sunDistM: REAL.sunDist / perCm / 100,                /* m                   */
};

/* ---- the places the page can start from ---------------------------------
 * The seed is the curated world-city list — enough to match a visitor's time
 * zone and fill the quick chips without a fetch. The full 1,103-city index is
 * /sun/cities.json, already built for the sun hub's search, and is fetched only
 * when someone actually types. Tide and world-clock URLs come from the registry
 * so the cross-links match what those families actually published. */
const ALL = [...CITIES.values()];
const seed = ALL.filter((c) => c.curated)
  .map((c) => [c.slug, c.st ? `${c.city}, ${c.st}` : c.city, c.tz, +c.lat.toFixed(4), +c.lon.toFixed(4)]);
/* slug -> tide station URL, for the ~344 places NOAA actually covers */
const tideOf = Object.fromEntries(ALL.filter((c) => c.tide).map((c) => [c.slug, c.tide.split("/")[2]]));
const clockOf = ALL.filter((c) => c.clock).map((c) => c.slug);

const FAQ = [
  ["Is this drawing to scale?",
    `No, and it cannot be. The moon is drawn about ${num(wrongBy("moonDist"))} times too close to the Earth, and the sun about ${num(wrongBy("sunDist"))} times too close and ${num(wrongBy("sunSize"))} times too small. Shrink the Earth to a ${MARBLE_MM} mm marble and the moon is a ${marble.moonD.toFixed(1)} mm bead about ${Math.round(marble.moonDist * 100)} cm away, while the sun is a ${marble.sunD.toFixed(1)} m ball roughly ${Math.round(marble.sunDist)} m down the road. What IS true here is every direction and angle: where the sun and moon lie around the Earth, which half of the Earth is lit, and where you are on it.`],
  ["What am I looking at?",
    "The Earth from far above its orbit, looking down from your own hemisphere. Sunlight arrives from the top left, so the half of the Earth facing that way is having its day. The marker is the place you chose, the dotted circle inside the globe is the path that spot rides as the Earth turns, and the moon sits at its true angle from the sun."],
  ["Why does the moon always look half lit?",
    "Because from this vantage you are looking at the moon side-on: the sun lights one half of it, and from above you see the boundary edge-on. The phase people see from Earth is not how much of the moon is lit — it is how much of the lit half faces us, and that is the ANGLE between the moon and the sun in this picture. Line the moon up with the sun and it is a new moon; put it opposite and it is full. The phase disc beside the read-out shows the same instant as it looks from the ground."],
  ["Why do we always see the same side of the moon?",
    "Because the moon turns on its own axis exactly once per orbit — 27.3 days for both — so the same hemisphere faces us permanently. Earth's pull slowed its spin over billions of years until the two matched, which is called tidal locking. A wobble in the orbit lets us see about 59% of the surface over time. It also means \"the dark side of the moon\" is a misnomer: the far side gets exactly as much sunlight, and at new moon it is the fully lit one."],
  ["Does it show eclipses?",
    "No — deliberately. Earth's real shadow reaches well past the moon's orbit, so drawing it would put the moon inside it at every full moon and imply an eclipse every month. What actually decides an eclipse is how far the moon sits above or below the plane of Earth's orbit, and that is the one thing this flat view cannot show. Lunar eclipses have their own pages."],
  ["How accurate are the positions?",
    "The sun and moon positions come from the same solver the rest of the site uses — good to about a minute of time for sunrise and sunset, and to a fraction of a degree for the moon. It runs entirely in your browser, so nothing is cached or stale. The methodology pages set out where each figure stops being reliable."],
  ["Can I share the exact view I am looking at?",
    "Yes. The location, date, time and span are all in the address bar, so copying the URL shares the exact sky on screen. The link builder further down writes one for you if you would rather fill in a form than edit a URL."],
];

/* PER-CITY QUESTIONS. The generic set above is the hub's, and it stayed the
 * hub's: shipping one identical FAQPage on 1,104 pages is the "same markup,
 * near-identical page" signal that gets a family folded, and since 2023 Google
 * shows FAQ rich results for government and health sites only — so the generic
 * block was earning nothing anywhere and costing differentiation everywhere.
 * These are computed from figures the page already has, which turns the
 * duplication into the thing these pages were short of: content only this city
 * has. */
function cityFaq(c, f) {
  const label = c.st ? `${c.city}, ${c.st}` : c.city;
  const out = [
    [`What time does the moon rise in ${label} tonight?`,
      f.moonRise === "—"
        ? `The moon does not rise at all on this date in ${label} — it happens roughly once a month, because moonrise slides later each day until a calendar day gets skipped entirely. It sets at ${f.moonSet}. The simulator above recalculates both for any date you set.`
        : `Tonight the moon rises at ${f.moonRise} and sets at ${f.moonSet} in ${label}, and it is a ${f.moonName.toLowerCase()}, ${f.moonPct}% lit.${f.moonLag != null ? ` Tomorrow it rises at ${f.moonRiseNext} — ${Math.abs(f.moonLag)} minutes ${f.moonLag >= 0 ? "later" : "earlier"}, because while the Earth turns once the moon has moved on about 13° round its orbit and this spot has to turn that bit further to catch it.` : ""} These are today's figures; the simulator recalculates them in your browser for any date.`],
    [`Why is the moon that shape from ${label} tonight?`,
      `Because the moon is ${f.elong}° away from the sun in the sky right now, and that angle IS the phase — nothing is covering the moon up. At 0° it sits in the same direction as the sun and we see its unlit side (new moon); at 180° it is opposite the sun and fully lit. ${f.elong}° gives a ${f.moonName.toLowerCase()}, ${f.moonPct}% lit. Everyone on Earth sees the same phase at the same instant; what changes with where you stand is which way up it looks, and the disc on this page is drawn the right way up for ${c.lat < 0 ? "the southern" : "the northern"} hemisphere.`],
    [`What time is sunrise and sunset in ${label} today?`,
      `The sun rises at ${f.rise} and sets at ${f.set}, giving ${f.len} of daylight. At ${Math.abs(c.lat).toFixed(1)}° ${c.lat >= 0 ? "north" : "south"} the longest day of the year runs to ${lenWords(Math.max(dayLenAt(c, 5, 21), dayLenAt(c, 11, 21)))} and the shortest to ${lenWords(Math.min(dayLenAt(c, 5, 21), dayLenAt(c, 11, 21)))}. Set the slider to a day and press Play to watch the marker ride in and out of the lit half.`],
    ["Is this drawing to scale?",
      `No, and it cannot be. The moon is drawn about ${num(wrongBy("moonDist"))} times too close to the Earth, and the sun about ${num(wrongBy("sunDist"))} times too close and ${num(wrongBy("sunSize"))} times too small. What IS true is every direction and angle: where the sun and moon lie around the Earth, which half of the Earth is lit, and where ${label} is on it.`],
  ];
  return out;
}

/* ---------------------------------------------------------------------------
 * The page
 * ------------------------------------------------------------------------- */
/* A YEAR IS THE FOURTH SPAN. A month is the MOON's own cycle; a year is the
   EARTH's, and it is the only span over which the seasons actually happen — the
   pole leaning toward the sun and away again, and the daily circle sliding
   across the day/night line with it. The step is coarser so a drag stays cheap:
   6 hours a notch over 365 days is 1,460 positions, about what a month at 15
   minutes already costs. */
const SPANS = [["day", "Day", 1440, 1], ["week", "Week (7 days)", 10080, 5], ["month", "Month (30 days)", 43200, 15], ["year", "Year (365 days)", 525600, 360]];

const PAGE_JS = `
(function(){
${MOON_CORE}
${ORRERY_JS}
  var SEED=${JSON.stringify(seed)};
  var TIDE=${JSON.stringify(tideOf)};
  var CLOCK=${JSON.stringify(clockOf)};
  var SPAN_MIN={day:1440,week:10080,month:43200,year:525600}, SPAN_STEP={day:1,week:5,month:15,year:360};
  var IDX=null;                       /* /sun/cities.json, fetched on demand  */
  var P=null;                         /* the place: {slug,name,tz,lat,lon}    */
  var START=null, SPAN='day', OFF=0, PLAY=0;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(ms,o){ try{ var x={}; for(var k in o) x[k]=o[k]; x.timeZone=P.tz;
    return new Intl.DateTimeFormat('en-US',x).format(new Date(ms)); }catch(e){ return '—'; } }
  function when(){ return START+OFF*60000; }
  function dayStart(ms){ var t=orrParse(orrDayOf(ms,P.tz)+'T00:00',P.tz); return t==null?ms:t; }

  /* ---- location ---------------------------------------------------------- */
  function setPlace(p){
    P=p;
    $('sim-place').textContent=p.name;
    /* the coordinates, linked to the exact spot on a map. The time zone used to
       share this line and has gone: it is already in the read-out and in the
       page's own text, and what a reader might DO with a latitude is look at
       where it is. */
    var gl=$('sim-geolink');
    if(gl){ gl.textContent=p.lat.toFixed(3)+'\\u00b0, '+p.lon.toFixed(3)+'\\u00b0';
      gl.href='https://www.google.com/maps/search/?api=1&query='+p.lat.toFixed(4)+','+p.lon.toFixed(4);
      gl.title=p.noTz?'No time zone in the link, so times use your device\\u2019s zone':'Open this spot on a map'; }
    var pk=$('sim-pick'); if(pk) pk.textContent=p.name;
    links(); repaint();
  }
  function fromParams(){
    var q; try{ q=new URLSearchParams(location.search); }catch(e){ return null; }
    var la=parseFloat(q.get('lat')), lo=parseFloat(q.get('lon'));
    if(isFinite(la)&&isFinite(lo)) return { slug:q.get('city')||null, name:q.get('name')||(la.toFixed(2)+', '+lo.toFixed(2)),
      tz:q.get('tz')||devTz(), noTz:!q.get('tz'), lat:la, lon:lo };
    var c=q.get('city'); if(c){ var hit=find(c); if(hit) return hit; }
    return null;
  }
  function find(key){
    key=String(key||'').toLowerCase().trim();
    var lists=[SEED].concat(IDX?[IDX]:[]), i, j;
    for(i=0;i<lists.length;i++) for(j=0;j<lists[i].length;j++){
      var r=lists[i][j];
      if(r[0]===key||r[1].toLowerCase()===key) return row(r);
    }
    return null;
  }
  function row(r){ return { slug:r[0], name:r[1], tz:r[2], lat:r[3], lon:r[4] }; }
  function devTz(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'; }catch(e){ return 'UTC'; } }
  /* no link, no saved place: match the visitor's own zone, preferring the city
     the zone is NAMED after (America/New_York -> New York), as /sun/ does */
  function byZone(){
    var tz=devTz(), named=tz.split('/').pop().toLowerCase().replace(/_/g,'-'), first=null, i;
    for(i=0;i<SEED.length;i++){ if(SEED[i][2]!==tz) continue;
      if(SEED[i][0]===named) return row(SEED[i]); if(!first) first=SEED[i]; }
    if(first) return row(first);
    /* no curated city in that exact zone (America/Indiana/Indianapolis, say):
       take one showing the same clock right now, which is the same fallback the
       /sun/ hub uses. Failing that, New York rather than whatever happens to be
       first alphabetically. */
    var mine=clockIn(tz);
    for(i=0;i<SEED.length;i++) if(clockIn(SEED[i][2])===mine) return row(SEED[i]);
    for(i=0;i<SEED.length;i++) if(SEED[i][0]==='new-york') return row(SEED[i]);
    return row(SEED[0]);
  }
  function clockIn(z){ try{ return new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()); }catch(e){ return ''; } }

  /* ---- the family links for whatever place is showing -------------------- */
  function links(){
    var box=$('sim-links'); if(!box) return;
    var lp=$('sim-links-place'); if(lp) lp.textContent=P.name;
    var s=P.slug, out='';
    if(s){
      out+='<a class="chip" href="/sun/'+s+'/">Sunrise &amp; sunset in '+esc(P.name)+'</a>';
      out+='<a class="chip" href="/moon/'+s+'/">Moonrise, moonset &amp; phase</a>';
      if(TIDE[s]) out+='<a class="chip" href="/tides/'+TIDE[s]+'/">Predicted tide times</a>';
      for(var i=0;i<CLOCK.length;i++) if(CLOCK[i]===s){ out+='<a class="chip" href="/world-clock/'+s+'/">World clock</a>'; break; }
    } else {
      out+='<a class="chip" href="/sun/anywhere/?lat='+P.lat+'&lon='+P.lon+'">Sun times for this spot</a>';
      out+='<a class="chip" href="/moon/near-me/?lat='+P.lat+'&lon='+P.lon+'">Moon times for this spot</a>';
    }
    box.innerHTML=out;
  }

  /* THE FRAME'S WIDTH IS THE BOX'S WIDTH. The drawing's HEIGHT is fixed, so
     every body in it is a fixed size; asking for a wider frame does one thing,
     which is put more sky between the sun and the Earth. Handing it the box's
     own ratio therefore fills the box exactly — no letterboxing — without
     changing the size of anything in it, and the extra distance is the most
     wrong figure in the picture getting less wrong.
     Only worth doing where the box has a height of its own to be measured
     against: in the card it does not (height comes FROM the drawing), so the
     default 16:9 stands and this returns 0. */
  function figW(){
    var f=$('sim-fig'); if(!f) return 0;
    var r=f.getBoundingClientRect();
    if(!r.width||!r.height) return 0;
    var ratio=r.width/r.height;
    if(ratio<=480/270) return 0;              /* taller box: the default fits */
    return Math.round(270*ratio);
  }

  /* ---- paint ------------------------------------------------------------- */
  function repaint(){
    var t=when();
    $('sim-fig').innerHTML=orrSvg(t,P.lat,P.lon,P.name.split(',')[0],figW());
    $('sim-note').innerHTML=orrNote(t,P.lat,P.lon,P.name.split(',')[0],false);
    /* the instant, in the PLACE's clock — the only clock this page uses */
    /* THE HOUR IS INFORMATION ONLY WHILE THE SLIDER COVERS A DAY. Over a week
       or a month it is noise — and noise that changes width on every frame,
       which is what made the whole row shuffle sideways as the picture played.
       The stage carries the state as a class so the fixed field widths below
       can be sized for the format actually in use. */
    var TIMED=SPAN==='day';
    var st=$('sim-stage'); if(st) st.classList[TIMED?'add':'remove']('sim-timed');
    $('sim-when').textContent=fmt(t,TIMED
      ?{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}
      :{weekday:'short',month:'short',day:'numeric',year:'numeric'});
    var sp=sunPos(t), mp=mnPos(t,P.lat,P.lon), il=mnIllum(t), g=orrCalc(t,P.lat,P.lon);
    put('sim-sun-alt',sp.alt.toFixed(1)+'\\u00b0'); put('sim-sun-az',sp.az.toFixed(1)+'\\u00b0 '+mnCompass(sp.az));
    put('sim-moon-alt',mp.alt.toFixed(1)+'\\u00b0'); put('sim-moon-az',mp.az.toFixed(1)+'\\u00b0 '+mnCompass(mp.az));
    put('sim-elong',Math.round(g.elong)+'\\u00b0');
    put('sim-phase',mnName(il.phase)); put('sim-lit',Math.round(il.fraction*100)+'%');
    $('sim-glyph').innerHTML=mnGlyph(il.fraction,il.waxing,56,P.lat<0);
    /* the full-screen copy: same instant, same solver, sized by CSS */
    var fg=$('sim-fsglyph'); if(fg) fg.innerHTML=mnGlyph(il.fraction,il.waxing,56,P.lat<0);
    put('sim-fsphase',mnName(il.phase)); put('sim-fslit',Math.round(il.fraction*100)+'%');
    put('sim-moonwhen',fmt(t,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}));
    /* the day the instant falls in: sun and moon rise/set, and day length */
    var d0=dayStart(t), sc=sunCalc(new Date(t),P.lat,P.lon,-0.833), mt=mnTimes(d0,P.lat,P.lon);
    put('sim-rise', sc.rise?fmt(sc.rise,{hour:'numeric',minute:'2-digit'}):'—');
    put('sim-set', sc.set?fmt(sc.set,{hour:'numeric',minute:'2-digit'}):'—');
    put('sim-len', sc.rise?dur(sc.set-sc.rise):'Midnight sun / polar night');
    put('sim-mrise', mt.rise?fmt(mt.rise,{hour:'numeric',minute:'2-digit'}):(mt.alwaysUp?'up all day':'—'));
    put('sim-mset', mt.set?fmt(mt.set,{hour:'numeric',minute:'2-digit'}):(mt.alwaysDown?'down all day':'—'));
    /* the controls, kept in step with the state they describe */
    var f=$('sim-start'); if(f&&!(dlg&&dlg.open)) f.value=orrLocalValue(START,P.tz);
    var sl=$('sim-slider');
    if(sl){ sl.max=SPAN_MIN[SPAN]; sl.step=SPAN_STEP[SPAN]; if(document.activeElement!==sl) sl.value=OFF; }
    var ENDF=TIMED?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric'};
    $('sim-from').textContent=fmt(START,ENDF);
    $('sim-to').textContent=fmt(START+SPAN_MIN[SPAN]*60000,ENDF);
    shareUrl();
  }
  function put(id,v){ var el=$(id); if(el) el.textContent=v; }
  function dur(ms){ var m=Math.round(ms/60000); return Math.floor(m/60)+' h '+(m%60)+' m'; }
  /* the sun's own position, from the same series MOON_CORE uses for the moon,
     so the two bodies in the read-out cannot come from different solvers */
  function sunPos(ms){
    var d=mnDays(ms), s=mnSunPos(d), lw=MN_RAD*-P.lon, phi=MN_RAD*P.lat, H=mnSidereal(d,lw)-s.ra;
    var az=Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(phi)-Math.tan(s.dec)*Math.cos(phi));
    return { alt:mnAlt(H,phi,s.dec)/MN_RAD, az:((az/MN_RAD+180)%360+360)%360 };
  }
  /* sunrise/sunset for the shown day: the same -0.833° crossing the /sun/ pages
     solve for, by the same hourly-sample-then-refine method */
  function sunCalc(date,lat,lon,h){
    var d0=dayStart(date.getTime()), out={rise:null,set:null}, prev=null, i;
    for(i=0;i<=1440;i+=5){
      var t=d0+i*60000, al=(function(){ var dd=mnDays(t), s=mnSunPos(dd), lw=MN_RAD*-lon, phi=MN_RAD*lat;
        return mnAlt(mnSidereal(dd,lw)-s.ra,phi,s.dec)/MN_RAD; })();
      if(prev!==null){
        if(prev<h&&al>=h) out.rise=refine(t-300000,t,lat,lon,h);
        if(prev>=h&&al<h) out.set=refine(t-300000,t,lat,lon,h);
      }
      prev=al;
    }
    return out;
  }
  function refine(a,b,lat,lon,h){
    for(var k=0;k<14;k++){ var m=(a+b)/2, dd=mnDays(m), s=mnSunPos(dd);
      var al=mnAlt(mnSidereal(dd,MN_RAD*-lon)-s.ra,MN_RAD*lat,s.dec)/MN_RAD;
      var alA=(function(){ var da=mnDays(a), sa=mnSunPos(da);
        return mnAlt(mnSidereal(da,MN_RAD*-lon)-sa.ra,MN_RAD*lat,sa.dec)/MN_RAD; })();
      if((alA<h)===(al<h)) a=m; else b=m; }
    return (a+b)/2;
  }

  /* ---- the address bar --------------------------------------------------- */
  /* Rewritten as the controls move, so the URL a reader copies out of the bar
     is always the sky they are looking at. The builder card below composes its
     own URL from its own fields — the two are separate on purpose, because a
     builder that could only ever describe the current view would not be a
     builder. */
  function linkFor(place,startMs,span){
    var v=orrLocalValue(startMs,place.tz), q=[];
    if(place.slug) q.push('city='+encodeURIComponent(place.slug));
    else q.push('lat='+place.lat+'&lon='+place.lon+'&tz='+encodeURIComponent(place.tz)+'&name='+encodeURIComponent(place.name));
    q.push('date='+v.slice(0,10)); q.push('time='+v.slice(11)); q.push('span='+span);
    return location.origin+'${SIM_PATH}'+(place.slug?place.slug+'/':'')+'?'+q.join('&');
  }
  /* The BUILDER stays in step on every repaint (it is a few property writes).
     The ADDRESS BAR does not: Safari rate-limits history.replaceState to 100
     calls per 30 seconds and throws past that, which the 40ms Play loop
     exhausted in about four seconds — after which the catch swallowed the error
     and the URL silently stopped tracking the view, which is the one thing this
     page promises about its URL. So it is debounced, and skipped while Play
     runs; stop() writes the final one. */
  var URLT=0;
  function shareUrl(){
    if(!PLAY){
      if(URLT) clearTimeout(URLT);
      URLT=setTimeout(function(){ URLT=0; try{ history.replaceState(null,'',linkFor(P,START,SPAN)); }catch(e){} },500);
    }
    bSync();
  }

  /* ---- the link builder --------------------------------------------------- */
  var bDirty=false;
  function bCities(){ return IDX||SEED; }
  function bFill(){
    var sel=$('b-city'); if(!sel) return;
    var want=sel.value, pool=bCities(), out='', i;
    /* the place on screen always heads the list, because it may be a set of
       coordinates or a census city that is not in the seeded 128 */
    out+='<option value="'+(P.slug||'@')+'">'+esc(P.name)+'</option>';
    for(i=0;i<pool.length;i++) if(pool[i][0]!==P.slug) out+='<option value="'+pool[i][0]+'">'+esc(pool[i][1])+'</option>';
    sel.innerHTML=out;
    if(want) sel.value=want;
    if(!sel.value) sel.selectedIndex=0;
  }
  function bPlace(){
    var v=$('b-city').value;
    if(v==='@'||v===P.slug) return P;
    var hit=find(v); return hit||P;
  }
  /* keep the form on the view until someone edits it; then it is theirs */
  function bSync(){
    if(!$('b-city')) return;
    if(!bDirty){
      bFill();
      $('b-city').value=P.slug||'@';
      var v=orrLocalValue(START,P.tz);
      $('b-date').value=v.slice(0,10); $('b-time').value=v.slice(11); $('b-span').value=SPAN;
    }
    bUpdate();
  }
  function bUpdate(){
    var out=$('sim-url'), sum=$('b-sum'); if(!out) return;
    var pl=bPlace(), d=$('b-date').value, tm=$('b-time').value||'12:00', sp=$('b-span').value;
    var t=d?orrParse(d+'T'+tm,pl.tz):null;
    if(t==null){ out.value=''; if(sum) sum.innerHTML='Pick a starting date to build a link.'; return; }
    out.value=linkFor(pl,t,sp);
    if(!sum) return;
    /* The check, in words. Every figure the URL encodes is repeated here in a
       readable form, plus what the sky actually does at that instant — which is
       the part that catches a link built for the wrong month or the wrong
       hemisphere before it is sent to thirty people. */
    var f=function(o){ try{ var x={}; for(var k in o) x[k]=o[k]; x.timeZone=pl.tz;
      return new Intl.DateTimeFormat('en-US',x).format(new Date(t)); }catch(e){ return '—'; } };
    var il=mnIllum(t), g=orrCalc(t,pl.lat,pl.lon);
    var spanWords={day:'one day',week:'seven days',month:'30 days',year:'a year'}[sp]||sp;
    sum.innerHTML='Opens the simulator for <b>'+esc(pl.name)+'</b>, starting <b>'
      +esc(f({weekday:'long',month:'long',day:'numeric',year:'numeric'}))+'</b> at <b>'
      +esc(f({hour:'numeric',minute:'2-digit'}))+'</b> local time, with the slider covering <b>'+spanWords+'</b>. '
      +'At that moment the moon there is a <b>'+esc(mnName(il.phase).toLowerCase())+'</b>, <b>'
      +Math.round(il.fraction*100)+'%</b> lit, and the sun is <b>'+Math.abs(g.sunAlt).toFixed(1)+'\u00b0</b> '
      +(g.sunAlt>0?'above':'below')+' the horizon.';
  }

  /* ---- boot -------------------------------------------------------------- */
  P=fromParams()||(window.AC_SIM_C||null)||byZone();
  var q0=null; try{ q0=new URLSearchParams(location.search); }catch(e){}
  /* THE MONTH IS THE DEFAULT. A day shows the Earth turning, which the card on
     every /sun/ and /moon/ page already shows; what this page is for is the
     thing a day cannot contain — the moon going right round, and the phase
     going with it. Landing on a month means the first drag teaches that. */
  SPAN=(q0&&SPAN_MIN[q0.get('span')])?q0.get('span'):'month';
  var d=q0&&q0.get('date'), tm=(q0&&q0.get('time'))||'12:00';
  START=(d&&orrParse(d+'T'+tm,P.tz))||Date.now()-(Date.now()%60000);
  $('sim-span').value=SPAN;   /* the dialog sets it too, but not before it opens */
  /* The controls shipped disabled (and Now / Use my location hidden) because
     without this script not one of them could do anything, and a control that
     silently does nothing is worse than no control. This is where they become
     real — before the first repaint, so nothing is ever briefly live-but-wrong. */
  var inert=document.querySelectorAll('[data-sim-inert]');
  for(var ni=0;ni<inert.length;ni++){ inert[ni].disabled=false; inert[ni].removeAttribute('hidden'); inert[ni].removeAttribute('data-sim-inert'); }
  setPlace(P);

  /* controls */
  $('sim-slider').addEventListener('input',function(){ OFF=+this.value||0; stop(); repaint(); });
  $('sim-now').addEventListener('click',function(){ START=Date.now()-(Date.now()%60000); OFF=0; stop(); repaint(); });
  /* Play sweeps the span in about 25 seconds — nobody drags a slider slowly
     enough to read the moon's month — but NOT FASTER THAN ONE SIMULATED DAY
     PER REAL SECOND. A fixed 25-second sweep works up to a month and falls
     apart over a year: 365 days in 25 seconds is about 15 days a second, which
     spins the Earth 15 times a second and swings the moon through half an orbit
     in the same time. Both are past the point where an eye can follow either,
     and following them is the entire purpose.

     One day per second is the floor an Earth-rotation is still legible at, so
     that is the cap. A day still takes 24 s and a week 24 s; a month goes from
     24 s to 30 s, and a year takes about six minutes to play right through —
     which is the honest cost of a year actually being watchable, and the slider
     is still there for anyone who would rather jump. */
  var PLAY_FPS=25, PLAY_MAXMIN=1440;      /* simulated minutes per real second */
  function playStep(){ return Math.min(SPAN_MIN[SPAN]/600, PLAY_MAXMIN/PLAY_FPS); }
  /* the city name and its leader line are hidden for the duration — see
     .orr-spin in 20d2-orrery.css for why. The class goes on the CONTAINER, not
     on the SVG, because repaint() replaces the SVG's contents 25 times a
     second and anything set on it would be gone by the next frame. */
  function spin(on){ var f=$('sim-fig'); if(f) f.classList[on?'add':'remove']('orr-spin'); }
  function stop(){ if(PLAY){ clearInterval(PLAY); PLAY=0; spin(false);
    var b=$('sim-play'); b.textContent='Play'; b.setAttribute('aria-pressed','false'); shareUrl(); } }
  $('sim-play').addEventListener('click',function(){
    if(PLAY){ stop(); return; }
    this.textContent='Pause'; this.setAttribute('aria-pressed','true'); spin(true);
    PLAY=setInterval(function(){
      OFF+=playStep();
      if(OFF>SPAN_MIN[SPAN]){
        if(LOOP){ OFF=0; }
        else { OFF=SPAN_MIN[SPAN]; repaint(); stop(); return; }   /* rest at the end */
      }
      repaint();
    },1000/PLAY_FPS);      /* the same 25 the cap above is worked out against */
  });
  /* jump to the next primary phase — the moment a class actually wants to see */
  var jumps=document.querySelectorAll('[data-sim-phase]');
  for(var i=0;i<jumps.length;i++) jumps[i].addEventListener('click',function(){
    var t=mnNextPhase(when(),+this.getAttribute('data-sim-phase'));
    /* land ON the phase and keep whatever span is set: someone who chose a
       month wants to carry on watching the month from there */
    START=t-30*60000; OFF=30; stop(); repaint();
  });

  /* ---- the settings dialog --------------------------------------------
     It applies on SAVE, so nothing half-typed repaints the picture. DRAFT is
     the staged place; null means "unchanged". Cancel and Escape drop it. */
  var dlg=$('sim-dialog'), DRAFT=null;
  /* Play loops by default. Over a year that IS the point — the seasons come
     round — but someone watching for one particular thing wants it to stop at
     the end rather than start again behind their back. */
  var LOOP=true;
  function openSettings(){
    if(!dlg) return;
    DRAFT=null;
    $('sim-pick').textContent=P.name;
    $('sim-start').value=orrLocalValue(START,P.tz);
    $('sim-span').value=SPAN;
    if($('sim-loop')) $('sim-loop').checked=LOOP;
    if(box){ box.value=''; }
    if(GTIMER){ clearTimeout(GTIMER); GTIMER=0; }
    GSEQ++; GROWS=[]; GBUSY=false; GDONE=false;
    if(list){ list.innerHTML=''; list.hidden=true; }
    /* the geocoder is not certain to be called from any page load, so it gets
       no preconnect in the head — but once this dialog is open a search is the
       likely next act, which is the moment to warm the handshake */
    if(!GWARM){ GWARM=1; try{ var pl=document.createElement('link');
      pl.rel='preconnect'; pl.href='https://geocoding-api.open-meteo.com'; pl.crossOrigin='';
      document.head.appendChild(pl); }catch(e){} }
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
  }
  function closeSettings(){ if(!dlg) return; if(dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function saveSettings(){
    var place=DRAFT||P;
    var sp=$('sim-span').value; if(SPAN_MIN[sp]) SPAN=sp;
    if($('sim-loop')) LOOP=$('sim-loop').checked;
    /* the date is read in the SAVED place's zone, not the old one, or moving
       from Tokyo to Denver would shift the instant by the zone difference */
    var t=orrParse($('sim-start').value,place.tz);
    if(t!=null) START=t;
    if(OFF>SPAN_MIN[SPAN]) OFF=SPAN_MIN[SPAN];
    stop();
    DRAFT=null;
    setPlace(place);            /* repaints, and rewrites the header + links */
    closeSettings();
  }
  if($('sim-cfg')) $('sim-cfg').addEventListener('click',openSettings);
  if($('sim-cancel')) $('sim-cancel').addEventListener('click',closeSettings);
  if($('sim-form')) $('sim-form').addEventListener('submit',function(e){ e.preventDefault(); saveSettings(); });

  /* ---- full screen ------------------------------------------------------
     The stage element goes full screen, not the page: it already carries the
     picture, the instant, the buttons and the slider, so the full-screen view
     is the same markup and the same layout rather than a second design.
     On a phone the useful orientation is landscape and the phone is being held
     portrait, so ask the browser to lock it. Android honours that; iOS does
     not, and there the stylesheet rotates the stage a quarter turn instead —
     the two compose, because a successful lock stops the portrait media query
     from matching in the first place. */
  var stage=$('sim-stage'), fsBtn=$('sim-fs');
  function fsOn(){ return document.fullscreenElement===stage||document.webkitFullscreenElement===stage; }
  function fsSync(){
    if(!fsBtn) return;
    var on=fsOn();
    fsBtn.setAttribute('aria-pressed',on?'true':'false');
    var lab=fsBtn.querySelector('.sim-fslab'); if(lab) lab.textContent=on?'Exit full screen':'Full screen';
    /* the text is hidden on a narrow screen, so the label has to say it too */
    fsBtn.setAttribute('aria-label',on?'Exit full screen':'Full screen');
  }
  function toggleFs(){
    if(!stage) return;
    if(fsOn()){
      try{ if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(e){}
      (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);
      return;
    }
    var req=stage.requestFullscreen||stage.webkitRequestFullscreen;
    if(!req) return;
    var r=req.call(stage);
    /* lock() rejects on desktop and on iOS; that is expected, not an error */
    if(r&&r.then) r.then(function(){ try{ screen.orientation.lock('landscape')['catch'](function(){}); }catch(e){} },function(){});
  }
  if(fsBtn&&(stage.requestFullscreen||stage.webkitRequestFullscreen)) fsBtn.addEventListener('click',toggleFs);
  else if(fsBtn) fsBtn.hidden=true;
  function fsChanged(){ fsSync(); repaint(); }   /* the box just changed shape */
  /* ?fs=1 means "opened from a Full screen link" on the home page. Full screen
     NEEDS a user gesture and a navigation is not one, so this arms the next tap
     or key press rather than trying on load and being refused. Once only. */
  if(q0&&q0.get('fs')&&stage){
    var armFs=function(){ document.removeEventListener('pointerdown',armFs); document.removeEventListener('keydown',armFs); toggleFs(); };
    document.addEventListener('pointerdown',armFs); document.addEventListener('keydown',armFs);
  }
  document.addEventListener('fullscreenchange',fsChanged);
  document.addEventListener('webkitfullscreenchange',fsChanged);
  /* ...and when the window is resized or the phone is turned. Debounced,
     because a repaint is a whole SVG and a drag of a desktop window edge fires
     this every frame. */
  var RSZ=0;
  window.addEventListener('resize',function(){
    if(RSZ) clearTimeout(RSZ);
    RSZ=setTimeout(function(){ RSZ=0; repaint(); },180);
  });

  /* search: the seed answers instantly, the full index loads on first keystroke */
  var box=$('sim-q'), list=$('sim-results');
  function local(v){
    v=v.toLowerCase().trim();
    if(!v) return [];
    var pool=IDX||SEED, out=[], i;
    for(i=0;i<pool.length&&out.length<8;i++) if(pool[i][1].toLowerCase().indexOf(v)===0) out.push(pool[i]);
    for(i=0;i<pool.length&&out.length<8;i++) if(pool[i][1].toLowerCase().indexOf(v)>0) out.push(pool[i]);
    return out;
  }
  /* ANYWHERE, NOT JUST THE 1,103 PLACES WITH A PAGE. The index is the cities
     this site publishes a simulator page for, which is a fine list of pages and
     a poor answer to "where are you": Truckee, Bruges, Inverness and Ushuaia
     are all real places and none of them are in it, and "no results" for a town
     someone lives in reads as broken.

     So when the local index comes up empty, the query goes to Open-Meteo's
     keyless geocoder — the same one /sun/, /moon/ and /tides/ already use, so
     this adds no new dependency — and the hits join the list. Picking one
     stages a place with NO SLUG, which every consumer already handles because
     "Use my location" has always produced one: the picture takes latitude and
     longitude, the read-out takes the IANA zone the geocoder returns, and the
     onward links fall back to /sun/anywhere/ and /moon/near-me/.

     Local matches always come first and the call only fires when there are
     none, so a search for a city that HAS a page still reaches the page. */
  var GSEQ=0, GTIMER=0, GROWS=[], GBUSY=false, GDONE=false, GWARM=0;
  function geoSearch(v){
    var seq=++GSEQ; GBUSY=true; GDONE=false;
    fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(v)+'&count=10&language=en&format=json')
      .then(function(r){ return r.json(); })
      .then(function(j){ if(seq!==GSEQ) return; GBUSY=false; GDONE=true;
        GROWS=(j.results||[]).slice(0,6).map(function(g){
          /* the region is dropped when it just repeats the name — Open-Meteo
             returns admin1 "Kyoto" for Kyoto, and "Kyoto, Kyoto" reads as a bug */
          var nm=g.name+(g.admin1&&g.admin1!==g.name?', '+g.admin1:'');
          return { slug:null, name:nm+(g.country_code&&g.country_code!=='US'?'\\u2002\\u00b7\\u2002'+g.country_code:''),
                   tz:g.timezone||devTz(), lat:+g.latitude.toFixed(4), lon:+g.longitude.toFixed(4) };
        });
        render(); })
      ["catch"](function(){ if(seq!==GSEQ) return; GBUSY=false; GDONE=true; GROWS=[]; render(); });
  }
  function render(){
    if(!list) return;
    var raw=box.value.trim();
    if(!raw){ list.innerHTML=''; list.hidden=true; return; }
    var out=local(raw), html='', i;
    for(i=0;i<out.length;i++) html+='<li><button type="button" data-slug="'+out[i][0]+'">'+esc(out[i][1])+'</button></li>';
    for(i=0;i<GROWS.length;i++) html+='<li><button type="button" data-geo="'+i+'">'+esc(GROWS[i].name)+'</button></li>';
    /* a search that found nothing has to SAY so, or the list just vanishes and
       the reader cannot tell a miss from a spelling mistake from a dead network */
    if(!html&&raw.length>=3) html='<li class="sim-noresult">'+(GBUSY||!GDONE?'Searching the map\\u2026'
      :'No place found for \\u201c'+esc(raw)+'\\u201d \\u2014 check the spelling, or try a larger town nearby.')+'</li>';
    list.innerHTML=html;
    list.hidden=!html;
  }
  if(box){
    box.addEventListener('input',function(){
      if(!IDX) fetch('/sun/cities.json').then(function(r){ return r.json(); })
        .then(function(j){ IDX=j; render(); })["catch"](function(){});
      GROWS=[]; GDONE=false;
      if(GTIMER) clearTimeout(GTIMER);
      var v=box.value.trim();
      /* debounced, and only when the index has nothing — one request per pause
         in typing, none at all for a city that is already on the list */
      if(v.length>=3) GTIMER=setTimeout(function(){
        if(!local(box.value).length){ geoSearch(box.value.trim()); render(); }
      },350);
      render();
    });
    list.addEventListener('click',function(e){
      var b=e.target.closest('button[data-slug],button[data-geo]'); if(!b) return;
      var g=b.getAttribute('data-geo');
      var hit=g!=null?GROWS[+g]:find(b.getAttribute('data-slug'));
      /* staged, not applied — Save is what commits it */
      if(hit){ DRAFT=hit; $('sim-pick').textContent=hit.name; box.value=''; GROWS=[]; list.innerHTML=''; list.hidden=true; }
    });
    /* a results list you can only reach with a mouse is not a results list.
       Down/Up walk it, Enter takes the focused one, Escape closes and hands
       focus back to the box. */
    function items(){ return list.querySelectorAll('button[data-slug],button[data-geo]'); }
    function step(n){
      var els=items(); if(!els.length) return;
      var at=-1, i; for(i=0;i<els.length;i++) if(els[i]===document.activeElement) at=i;
      var next=at+n; if(next<0) next=els.length-1; if(next>=els.length) next=0;
      els[next].focus();
    }
    function onKey(e){
      if(e.key==='Escape'){ list.hidden=true; box.focus(); return; }
      if(list.hidden) return;
      if(e.key==='ArrowDown'){ e.preventDefault(); step(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); step(-1); }
    }
    box.addEventListener('keydown',onKey);
    list.addEventListener('keydown',onKey);
  }
  var geo=$('sim-geo');
  if(geo&&navigator.geolocation){ geo.hidden=false; geo.addEventListener('click',function(){
    geo.textContent='Locating\\u2026';
    navigator.geolocation.getCurrentPosition(function(p){
      geo.textContent='Use my location';
      DRAFT={ slug:null, name:'My location', tz:devTz(), lat:+p.coords.latitude.toFixed(4), lon:+p.coords.longitude.toFixed(4) };
      $('sim-pick').textContent=DRAFT.name;
    },function(){ geo.textContent='Location unavailable'; });
  }); } else if(geo) geo.hidden=true;

  /* the link builder: the same URL the address bar already holds, on demand */
  var bIds=['b-city','b-date','b-time','b-span'];
  for(var bi=0;bi<bIds.length;bi++){ var el=$(bIds[bi]); if(!el) continue;
    el.addEventListener('change',function(){ bDirty=true; bUpdate(); });
    el.addEventListener('input',function(){ bDirty=true; bUpdate(); }); }
  var bs=$('b-sync');
  if(bs) bs.addEventListener('click',function(){ bDirty=false; bSync(); });
  /* the full city list is worth having in the dropdown, so fetch it the moment
     someone opens it rather than only when they type in the search box */
  var bc=$('b-city');
  if(bc) bc.addEventListener('focus',function(){
    if(IDX) return;
    fetch('/sun/cities.json').then(function(r){ return r.json(); })
      .then(function(j){ IDX=j; bFill(); })["catch"](function(){});
  });

  var copy=$('sim-copy');
  if(copy) copy.addEventListener('click',function(){
    var el=$('sim-url'); el.select();
    try{ navigator.clipboard.writeText(el.value); copy.textContent='Copied'; setTimeout(function(){ copy.textContent='Copy link'; },1600); }
    catch(e){ try{ document.execCommand('copy'); }catch(e2){} }
  });
})();
`;


/* ---------------------------------------------------------------------------
 * The pages. One hub, plus one per city in the registry — the same list /sun/
 * and /moon/ are generated from, so the three families cannot drift apart and
 * every city page has two strong inbound links (its sun page and its moon page
 * both point at it rather than at the hub).
 *
 * NEAR-DUPLICATES ARE THE RISK, so every city page carries content only that
 * city can: its own baked picture for the build minute, today's sunrise, sunset
 * and day length, tonight's moon, the longest and shortest day of its year, a
 * sentence about what its LATITUDE does to all of that, and its own family
 * links. None of it is a swapped city name — it is all computed per place.
 * ------------------------------------------------------------------------- */
/* The figures the teaching card quotes. Named here, next to the rest of the
 * real-world numbers, so they are not loose in prose: sidereal month (one orbit
 * against the stars) vs synodic month (one full cycle of phases), the mean
 * moonrise delay, how much of the surface libration has shown us, and the tilt
 * of the moon's orbit that is the whole reason eclipses are rare. */
/* exported so a "27.3-day orbit" label anywhere else on the site (the home
   page's mini simulator card) reads the same number this page does, rather
   than a separately-typed "27" that could drift from it */
export const SIDEREAL = "27.3";
const SYNODIC = "29.53";
const MOONRISE_LAG = "50";
const LIBRATION = "59";
const ORBIT_TILT = "5.1";

const spanOptions = SPANS.map(([v, label]) => `<option value="${v}">${esc(label)}</option>`).join("");
const NOW = new Date();
const YEAR = NOW.getUTCFullYear();

const fmtT = (ms, tz) => (ms ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(ms)) : "—");
const lenWords = (ms) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)} h ${m % 60} m`; };
const dayLenAt = (c, month, day) => {
  const s = nSunCalc(new Date(Date.UTC(YEAR, month, day, 12)), c.lat, c.lon, -0.833);
  if (s.rise) return s.set - s.rise;
  /* polar: the sun never crosses the horizon that day, so it is all or nothing */
  return nSunPos(new Date(s.noon), c.lat, c.lon).alt > -0.833 ? 86400000 : 0;
};
const miles = (a, b) => {
  const R = 3958.8, r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const ALL_SORTED = [...ALL].sort((a, b) => (b.pop || 5e6) - (a.pop || 5e6));

/* What this city's latitude does to its year — a real sentence per place, from
 * its own two solstice day lengths and the three bands that actually change the
 * answer (polar circle, mid-latitudes, tropics). */
function latitudeLine(c) {
  const lat = Math.abs(c.lat), north = c.lat >= 0;
  const jun = dayLenAt(c, 5, 21), dec = dayLenAt(c, 11, 21);
  const longest = Math.max(jun, dec), shortest = Math.min(jun, dec);
  const where = `${lat.toFixed(1)}° ${north ? "north" : "south"}`;
  if (lat >= 66.56) {
    return `${esc(c.city)} lies inside the ${north ? "Arctic" : "Antarctic"} Circle, at ${where}. Run the month slider across midsummer and the dotted circle inside the globe never leaves the daylight — that is the midnight sun. Run it across midwinter and it never enters the light at all.`;
  }
  if (lat >= 45) {
    return `At ${where}, ${esc(c.city)} sits far enough from the equator for the seasons to swing hard: ${lenWords(longest)} of daylight at the longest day against ${lenWords(shortest)} at the shortest. Watch the dotted circle slide across the day/night line as you move the date through the year.`;
  }
  if (lat >= 23.44) {
    return `At ${where}, ${esc(c.city)} has a moderate swing through the year — ${lenWords(longest)} of daylight at the longest day and ${lenWords(shortest)} at the shortest — and the sun never quite reaches straight overhead.`;
  }
  return `At ${where}, ${esc(c.city)} is inside the tropics: day length barely moves through the year (${lenWords(longest)} against ${lenWords(shortest)}), and the sun passes directly overhead twice, when its path crosses this latitude.`;
}

function cityFacts(c) {
  const s = nSunCalc(NOW, c.lat, c.lon, -0.833);
  const il = moonIllum(NOW);
  /* the moon's rise and set for this city's own calendar day */
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: c.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(NOW).split(":");
  const d0 = NOW.getTime() - (+parts[0] * 3600 + +parts[1] * 60) * 1000 - (NOW.getTime() % 60000);
  const mt = moonTimes(d0, c.lat, c.lon);
  const mp = moonPos(NOW.getTime(), c.lat, c.lon);
  const sp = nSunPos(NOW, c.lat, c.lon);
  return {
    rise: fmtT(s.rise, c.tz), set: fmtT(s.set, c.tz),
    len: s.rise ? lenWords(s.set - s.rise) : "midnight sun or polar night",
    moonName: moonName(il.phase), moonPct: Math.round(il.fraction * 100),
    moonRise: mt.rise ? fmtT(mt.rise, c.tz) : (mt.alwaysUp ? "up all day" : "—"),
    moonSet: mt.set ? fmtT(mt.set, c.tz) : (mt.alwaysDown ? "down all day" : "—"),
    sunAlt: sp.alt.toFixed(1), sunDir: compass(sp.az),
    moonAlt: mp.alt.toFixed(1), moonDir: compass(mp.az),
    glyph: moonGlyph(il.fraction, il.waxing, 56, c.lat < 0),
    elong: Math.round(orreryCalc(NOW.getTime(), c.lat, c.lon).elong),
    /* tomorrow's moonrise against today's. The generic text says "about 50
       minutes"; this is what it actually is HERE, which is the whole argument
       for a page per city. Null when either day has no moonrise at all (it
       happens once a month, and at high latitudes for longer). */
    moonLag: (() => {
      const t2 = moonTimes(d0 + 86400000, c.lat, c.lon);
      if (!mt.rise || !t2.rise) return null;
      const min = Math.round((t2.rise - mt.rise) / 60000) - 1440;
      return min > -180 && min < 180 ? min : null;
    })(),
    moonRiseNext: (() => { const t2 = moonTimes(d0 + 86400000, c.lat, c.lon); return t2.rise ? fmtT(t2.rise, c.tz) : null; })(),
  };
}

function nearbyCities(c) {
  return ALL.filter((o) => o.slug !== c.slug)
    .map((o) => ({ o, mi: miles(c, o) }))
    .sort((a, b) => a.mi - b.mi).slice(0, 6);
}

/* ---- the shared blocks ---------------------------------------------------- */
/* THE STAGE is the part that goes full screen: the picture, the instant it is
 * drawn for, the three buttons and the slider — and nothing else. Everything a
 * reader needs to drive the thing is inside it, which is what lets the
 * full-screen view be the same markup rather than a second design. The layout
 * is the same in both: ONE row under the picture holding the instant on the
 * left and the buttons on the right, then the slider full width beneath it. */
const simCard = (c, f) => `  <div class="card sim-card">
    <h2 class="sim-title">Showing <span id="sim-place">${c ? esc(c.city) : "—"}</span>${/*
      the coordinates, and nothing else — the time zone used to sit here and it
      is already on the page twice. They link to the exact spot on a map, which
      is the one thing a reader might actually want to do with a latitude. */""
    }<a class="sim-geo" id="sim-geolink" target="_blank" rel="noopener"${c ? ` href="https://www.google.com/maps/search/?api=1&amp;query=${c.lat.toFixed(4)},${c.lon.toFixed(4)}"` : ""}>${c ? `${c.lat.toFixed(3)}°, ${c.lon.toFixed(3)}°` : ""}</a></h2>

    ${/* .sim-top: stage and read-out as one block. On a wide screen it goes
         two-column — picture left, the phase disc and the eight numbers as a
         right-hand column — the same shape the solar-system page already uses,
         because the two pages are the same kind of thing and were reading as
         two different sites. The picture GAINS from the freed width: the frame's
         height is fixed and its width is not, so a wider box puts more sky
         between the sun and the Earth and makes the drawing's worst figure (the
         sun's distance) less wrong. The dialog rides inside the wrapper so it
         stays a following sibling of the stage — the fullscreen portrait
         rotation selects it with `.sim-stage:fullscreen ~ .sim-dlg`. */""
    }<div class="sim-top">
    <div class="sim-stage" id="sim-stage"><div class="sim-inner">
    <div class="sim-figwrap">
    ${/* baked for the build minute so a crawler and a no-JS visitor both get a
         real picture of a real sky, not an empty box the script fills in */""
    }<div class="orr-fig sim-fig" id="sim-fig">${c ? orrerySvg(NOW.getTime(), c.lat, c.lon, c.city) : ""}</div>
    </div>

    ${/* ONE ROW UNDER THE PICTURE, holding everything that is not the picture:
         the instant on the left, the buttons on the right. It was two rows, and
         then for a while the instant was laid over the picture to save one of
         them — which worked, but put a caption across the sky and still left the
         buttons a row of their own. Sharing the row costs the picture the same
         single row as the overlay did and leaves the sky clean.

         It WRAPS. On a narrow phone with the hour showing, the instant and four
         buttons genuinely do not fit; the instant then takes the line above
         rather than the buttons breaking across two.

         Button DOM order is Settings, Full screen, Now, Play — so reading right
         to left it is Play, Now, Full screen, Settings, with the one you press
         most under the thumb. The DOM order is the visual order rather than
         being reversed in CSS, so tabbing follows the eye. */""
    }<div class="sim-row">
    <div class="sim-bar">
    ${/* the moon's phase, in full screen only — see the CSS */""
    }<p class="sim-fsmoon">
      <span class="sim-fsglyph" id="sim-fsglyph" aria-hidden="true">${c ? f.glyph : ""}</span>
      <span class="sim-fslab"><b id="sim-fsphase">${c ? esc(f.moonName) : "—"}</b> <span id="sim-fslit">${c ? `${f.moonPct}%` : "—"}</span> lit</span>
    </p>
    <p class="sim-when" id="sim-when">${c ? esc(new Intl.DateTimeFormat("en-US", { timeZone: c.tz, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(NOW)) : "—"}</p>
    </div>
    <div class="sim-ctl">
      <button type="button" class="chip sim-icobtn" id="sim-cfg" data-sim-inert disabled hidden aria-haspopup="dialog" aria-label="Simulator settings">${ico("gear", 16)}<span>Settings</span></button>
      <button type="button" class="chip sim-icobtn" id="sim-fs" data-sim-inert disabled hidden aria-pressed="false" aria-label="Full screen">${ico("expand", 16)}<span class="sim-fslab">Full screen</span></button>
      <button type="button" class="chip" id="sim-now" data-sim-inert disabled hidden>Now</button>
      <button type="button" class="chip chip-alt" id="sim-play" aria-pressed="false" data-sim-inert disabled>Play</button>
    </div>
    </div>
    <p class="orr-scrub sim-scrub">
      <input type="range" class="orr-slider" id="sim-slider" min="0" max="43200" step="15" value="0" aria-label="Move through the span" data-sim-inert disabled>
      <span class="sim-ends"><span id="sim-from">—</span><span id="sim-to">—</span></span>
    </p>
    </div></div>

    ${/* The settings, in a dialog rather than strung along the control row. It
         holds the three things that are not moment-to-moment — where, when, and
         how much time the slider covers — and it APPLIES ON SAVE, so half-typed
         values never repaint the picture. Reachable from the card and from full
         screen, because in full screen it is the only way to reach them. */""
    }<dialog class="ac-dialog sim-dlg" id="sim-dialog" aria-labelledby="sim-dlg-h">
      <form method="dialog" id="sim-form">
        <h3 id="sim-dlg-h">Simulator settings</h3>
        <label class="sim-flab" for="sim-q">Place</label>
        ${/* "any town or city" rather than "a city", because that is now true:
             a query the index cannot answer goes on to the geocoder. A field
             that promises less than it does gets used for less than it can. */""
        }<input type="search" id="sim-q" class="sim-q" placeholder="Search any town or city…" autocomplete="off" aria-describedby="sim-qhint">
        <ul class="hs-results" id="sim-results" hidden></ul>
        <p class="sim-qhint" id="sim-qhint">Anywhere in the world — type a town, city or village.</p>
        <p class="sim-pickrow">Showing <b id="sim-pick">${c ? esc(c.st ? `${c.city}, ${c.st}` : c.city) : "—"}</b>
          <button type="button" class="chip" id="sim-geo" hidden>Use my location</button></p>
        ${/* WHEN and HOW LONG are wrapped so they can sit SIDE BY SIDE in full
             screen. The form is a fixed stack of single-line rows, so it does
             not get shorter when it gets wider — and full screen on a phone is
             exactly the case with width to spare and no height at all. One
             column everywhere else. */""
        }<div class="sim-fields">
          <div class="sim-field">
            <label class="sim-flab" for="sim-start">Starting date and time</label>
            <input type="datetime-local" class="orr-at" id="sim-start" step="60" min="1900-01-01T00:00" max="2099-12-31T23:59"${c ? ` value="${orreryLocalValue(NOW.getTime(), c.tz)}"` : ""}>
          </div>
          <div class="sim-field">
            <label class="sim-flab" for="sim-span">The slider covers</label>
            <select class="sim-span" id="sim-span">${spanOptions}</select>
          </div>
        </div>
        <label class="sim-check"><input type="checkbox" id="sim-loop" checked> Play repeats when it reaches the end</label>
        <menu class="sim-dlgbtns">
          <button type="button" class="chip" id="sim-cancel">Cancel</button>
          <button type="submit" class="chip chip-alt" id="sim-save" value="save">Save</button>
        </menu>
      </form>
    </dialog>

    <div class="sim-read">
      ${/* The moon in the DRAWING is seen from above, where the sun lights half
           of it and the terminator is edge-on — so it looks half lit at every
           phase, which is the point: the phase is the ANGLE, not the lit
           fraction. This disc is the same moon at the same instant seen from
           the ground, and says so, because two views of one object in one card
           have to be labelled or they read as a contradiction. */""
      }<div class="sim-moonbox">
        <span class="sim-glyph" id="sim-glyph" aria-hidden="true">${c ? f.glyph : ""}</span>
        <b id="sim-phase">${c ? esc(f.moonName) : "—"}</b>
        <span class="hint"><span id="sim-lit">${c ? `${f.moonPct}%` : "—"}</span> lit</span>
        <span class="hint sim-moonlab">from the ground at <span id="sim-moonwhen">—</span></span>
      </div>
      <div class="sim-rows">
        <div class="sun-srow sun-main"><span>Sun altitude</span><b id="sim-sun-alt">${c ? `${f.sunAlt}°` : "—"}</b></div>
        <div class="sun-srow"><span>Sun direction</span><b id="sim-sun-az">${c ? esc(f.sunDir) : "—"}</b></div>
        <div class="sun-srow sun-main"><span>Moon altitude</span><b id="sim-moon-alt">${c ? `${f.moonAlt}°` : "—"}</b></div>
        <div class="sun-srow"><span>Moon direction</span><b id="sim-moon-az">${c ? esc(f.moonDir) : "—"}</b></div>
        <div class="sun-srow"><span>Moon–sun angle</span><b id="sim-elong">${c ? `${f.elong}°` : "—"}</b></div>
        <div class="sun-srow"><span>Daylight that day</span><b id="sim-len">${c ? esc(f.len) : "—"}</b></div>
        <div class="sun-srow"><span>Sunrise · sunset</span><b><span id="sim-rise">${c ? esc(f.rise) : "—"}</span> · <span id="sim-set">${c ? esc(f.set) : "—"}</span></b></div>
        <div class="sun-srow"><span>Moonrise · moonset</span><b><span id="sim-mrise">${c ? esc(f.moonRise) : "—"}</span> · <span id="sim-mset">${c ? esc(f.moonSet) : "—"}</span></b></div>
      </div>
    </div>
    </div>

    <p class="sim-jump">Jump to the next
      <button type="button" class="chip" data-sim-inert disabled data-sim-phase="0">new moon</button>
      <button type="button" class="chip" data-sim-inert disabled data-sim-phase="1">first quarter</button>
      <button type="button" class="chip" data-sim-inert disabled data-sim-phase="2">full moon</button>
      <button type="button" class="chip" data-sim-inert disabled data-sim-phase="3">last quarter</button>
    </p>

    <p class="hint orr-note" id="sim-note">${c ? orreryNote(NOW.getTime(), c.lat, c.lon, c.city, false) : ""}</p>
  </div>
`;

/* the corridor walk, as prose — shared with sysScaleCard below (the /system/
   page's own not-to-scale card) so the same physical demonstration is not
   independently retyped in two places that could then disagree. It describes
   REAL, not DRAWN, ratios, so it is exactly as true on one page as the other. */
const CORRIDOR_PARA = `<p><strong>Try it in a corridor.</strong> Shrink the Earth to a ${MARBLE_MM} mm marble. The moon is then a <strong>${marble.moonD.toFixed(1)} mm bead</strong> — about a peppercorn — held <strong>${Math.round(marble.moonDist * 100)} cm away</strong>. The sun is a <strong>${marble.sunD.toFixed(1)} metre ball</strong>, taller than a person, standing <strong>${Math.round(marble.sunDist)} metres</strong> down the road: nearly two football pitches. Nothing about that fits on a screen, so this picture keeps the angles honest and lets the distances go.</p>`;

const scaleCard = `  <div class="card">
    <h2>This picture is not to scale — here is how far out it is</h2>
    <p>Every direction and angle in the simulator is real. Every <em>size</em> and <em>distance</em> is not, and it is worth being exact about which, because a diagram that quietly lies about the solar system is how people end up thinking the moon is a few Earth-widths away.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>The moon is drawn</span><b>about ${num(wrongBy("moonDist"))}× too close</b></div>
      <div class="wc-frow"><span>The sun is drawn</span><b>about ${num(wrongBy("sunDist"))}× too close, and ${num(wrongBy("sunSize"))}× too small</b></div>
      <div class="wc-frow"><span>The moon’s size next to Earth</span><b>very nearly right — ${(DRAWN.moonSize * 100).toFixed(0)}% of Earth’s width, against a real ${(TRUE_RATIO.moonSize * 100).toFixed(0)}%</b></div>
    </div>
    ${CORRIDOR_PARA}
    <p class="hint">Those figures are for the picture as it sits on this page. The drawing's HEIGHT is what sets every size in it, so a wider frame changes nothing except the gap between the sun and the Earth — which is why <strong>full screen is less wrong than this</strong>: it hands the picture the screen's own shape, and on a phone held sideways that puts the sun roughly ${num(wrongBy("sunDist") / 2)}× too close instead of ${num(wrongBy("sunDist"))}×. Still hopeless, and better.</p>
    <p class="hint">What you can trust here: the direction of the sun and the moon from the Earth and from your own spot; which half of the Earth is in daylight; the angle between the moon and the sun, which is the phase; the tilt of the Earth’s axis and how much of your daily circle falls in the light. What you cannot: any distance, the sun’s size, or anything about eclipses.</p>
  </div>
`;

const howWorksCard = `  <div class="card">
    <h2>What this is, and how it works</h2>
    <p>This is a working model of the Sun, Earth and Moon for one place on Earth. The Earth turns, the Moon goes around it, and the Sun sits off to the left. Drag the slider through a <strong>day</strong>, a <strong>week</strong> or a <strong>month</strong>. <strong>Now</strong> jumps back to this moment. <strong>Tilt</strong> tips the view. Playback speed is how fast that time plays.</p>
    <p>Every angle is real. Every size and distance is not — the card below says by how much, computed from the drawing itself.</p>
  </div>
`;

const teachCard = hubQuestionsCard(SIM_PATH, "What this picture is telling you", { id: "learn" });

const classroomCard = `  <div class="card sim-teach" id="classroom">
    <h2>Using it in a classroom</h2>
    <p>Every control here is a lesson. Set the slider to a <strong>day</strong> and press Play — the Earth turns, and the marker rides in and out of the light. That is day and night. Leave it on a <strong>month</strong> and watch the moon–sun angle and the phase disc together: 0° is new, 180° is full. Nothing covers the moon up.</p>
    <p>The scale card above is the activity students remember: a marble, a peppercorn, and a ball down the corridor. <a href="/classroom/">The classroom guide</a> has timed plans; the link builder below hands every screen the same sky.</p>
  </div>
`;

const builderCard = `  <div class="card">
    <h2>Zoom out, one step at a time</h2>
    <p>This page is one town, looking up. <a href="${SYS_PATH}">The next step out</a> is the three bodies moving together — Earth going round the sun, the moon going round the Earth, on one screen and openly not to scale, with the real ratio between the two the one thing kept honest. Beyond that is where the <em>planets</em> are — Mercury and Venus racing round inside us, Jupiter and Saturn crawling, Neptune barely moving in a lifetime — the <a href="/solar-system-simulator/">solar system simulator</a>, with the same kind of slider over a month, a year, a decade or a century, and a zoom that climbs from the Earth and Moon out to Neptune.</p>
  </div>

  <div class="card">
    <h2>Make a link to a particular sky</h2>
    <p>Pick a place, a starting date and time and how much time the slider should cover. The link builds itself as you choose, and the sentence under it says in words where that link goes — so you can check it before you send it.</p>
    ${/* The form seeds itself from whatever the simulator is showing and keeps
         following it until someone edits a field; after that it is theirs, and
         "Match the view above" hands it back. A builder that silently drifted
         from the picture would be a good way to send someone the wrong sky. */""
    }<div class="sim-form">
      <label class="sim-fld"><span>Place</span>
        <select id="b-city" aria-label="Place the link opens"></select></label>
      <label class="sim-fld"><span>Starting date</span>
        <input type="date" id="b-date" min="1900-01-01" max="2099-12-31"></label>
      <label class="sim-fld"><span>Starting time</span>
        <input type="time" id="b-time" step="60"></label>
      <label class="sim-fld"><span>Slider covers</span>
        <select id="b-span" aria-label="How much time the slider covers">${spanOptions}</select></label>
    </div>
    <p class="sim-formrow"><button type="button" class="chip" id="b-sync">Match the view above</button></p>

    <p class="sim-urlrow">
      <input type="text" id="sim-url" class="sim-url" readonly aria-label="Link to this view">
      <button type="button" class="chip chip-alt" id="sim-copy">Copy link</button>
    </p>
    <p class="sim-sum" id="b-sum"></p>

    <details class="sim-params">
      <summary>What the parameters mean</summary>
      <div class="wc-facts">
        <div class="wc-frow"><span><code>city</code></span><b>a city slug — <code>?city=seattle</code></b></div>
        <div class="wc-frow"><span><code>lat</code> &amp; <code>lon</code></span><b>any coordinates — <code>?lat=47.6&amp;lon=-122.33</code>, with optional <code>name</code> and <code>tz</code></b></div>
        <div class="wc-frow"><span><code>date</code></span><b><code>YYYY-MM-DD</code>, the day the span starts</b></div>
        <div class="wc-frow"><span><code>time</code></span><b><code>HH:MM</code> in the place’s own clock</b></div>
        <div class="wc-frow"><span><code>span</code></span><b><code>day</code>, <code>week</code> or <code>month</code></b></div>
      </div>
      <p class="hint">City slugs are the ones in the address of a city page: <code>/sun/<strong>seattle</strong>/</code>. Coordinates win if you give both.</p>
    </details>
  </div>
`;

const faqCard = (faq = FAQ, heading = "Simulator FAQ") => `  <div class="card tool-about">
    <h2>${esc(heading)}</h2>
    ${faq.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
    <p class="hint">How the positions are worked out, and where they stop being reliable: <a href="/methodology/sunrise-sunset/">sunrise &amp; sunset</a>, <a href="/methodology/moon-phase/">moon phase</a>.</p>
  </div>
`;

const head = ({ title, desc, path, ld = "", faq = FAQ }) => `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: title, url: `${SITE}${path}`, description: desc })}${ld}
${faqLd(faq)}
${GA_SNIPPET}`;

const script = (c) => `${c ? `<script>window.AC_SIM_C=${JSON.stringify({ slug: c.slug, name: c.st ? `${c.city}, ${c.st}` : c.city, tz: c.tz, lat: c.lat, lon: c.lon })};</script>\n` : ""}<!-- ~60KB, byte-identical on the hub and all ${ALL.length} city pages but the
     config line above, so it is hoisted into one cached file (build-inline). -->
<script data-ac="shared" data-name="simulator">${PAGE_JS}</script>`;

/* The hub had no place until JS picked one, so it shipped an empty figure, a
 * dash for every read-out and an empty link box under a heading that named
 * "this place". It now bakes the largest city in the registry; the script
 * replaces it with the visitor's own zone on load, exactly as it always did. */
const HUB_CITY = ALL.find((c) => c.slug === "new-york") || ALL_SORTED[0];

/* ---- the hub -------------------------------------------------------------- */
function buildHub() {
  const hubFacts = cityFacts(HUB_CITY);
  /* the biggest cities first: a hub that lists every one of 1,103 places is a
     wall, and these are the ones a visitor is most likely to be looking for.
     Every city page is still reachable — its own /sun/ and /moon/ pages link
     straight to it, which is the path a crawler actually follows. */
  const featured = ALL_SORTED.slice(0, 120).sort((a, b) => a.city.localeCompare(b.city));
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
    title: `${TITLE} — Sun & Moon Positions Over a Day, Week or Month`,
    desc: "Watch the sun and moon move around the Earth for any place and any date — scrub a day, a week or a month with a slider, see the phase, sunrise, moonrise and the lit half of the Earth. Free, runs in your browser.",
    path: SIM_PATH,
    ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Sun, Moon & Earth simulator", url: SIM_PATH }])}</script>\n${learningLd({ name: TITLE, url: `${SITE}${SIM_PATH}`, description: "An interactive model of the sun, the Earth and the moon: watch day and night, the phases, the seasons and the tides from any place on Earth." })}`,
  })}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "simulator", url: SIM_PATH } })}
  <h1>Sun, Moon &amp; Earth Movement Simulator</h1>
  <p class="sub">Watch where the sun and the moon actually are, from any place on Earth, at any moment you like. Drag the slider through a <strong>day</strong>, a <strong>week</strong> or a <strong>month</strong> and the picture, the phase and every number move with it.</p>

${viewLadder("town")}${simCard(HUB_CITY, hubFacts)}${howWorksCard}${scaleCard}${teachCard}  <div class="card">
    <h2>Pick a city</h2>
    <p>Every city with a sunrise page has a simulator page of its own — ${ALL.length.toLocaleString("en-US")} of them. The largest are here; for anywhere else, use the search above or start from that city’s <a href="/sun/">sunrise</a> or <a href="/moon/">moon</a> page.</p>
    <div class="chips sim-citylist">
${featured.map((c) => `      <a class="chip" href="${SIM_PATH}${c.slug}/">${esc(c.st ? `${c.city}, ${c.st}` : c.city)}</a>`).join("\n")}
    </div>
  </div>

  <div class="card">
    <h2>Where <span id="sim-links-place">${esc(HUB_CITY.city)}</span> appears elsewhere</h2>
    <div class="chips sim-links" id="sim-links">
      <a class="chip" href="/sun/${HUB_CITY.slug}/">Sunrise &amp; sunset in ${esc(HUB_CITY.city)}</a>
      <a class="chip" href="/moon/${HUB_CITY.slug}/">Moonrise, moonset &amp; phase</a>${HUB_CITY.tide ? `\n      <a class="chip" href="${HUB_CITY.tide}">Predicted tide times</a>` : ""}${HUB_CITY.clock ? `\n      <a class="chip" href="${HUB_CITY.clock}">World clock</a>` : ""}
    </div>
    <p class="hint">Or browse the families: <a href="/sun/">sunrise &amp; sunset by city</a>, <a href="/moon/">moonrise, moonset &amp; phase</a>, <a href="/tides/">predicted tide times</a>, <a href="/world-clock/">world clock</a>.</p>
  </div>

${classroomCard}${builderCard}  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${script(HUB_CITY)}
</body>
</html>
`;
  mkdirSync(join(root, SIM_PATH.slice(1, -1)), { recursive: true });
  writeFileSync(join(root, SIM_PATH.slice(1) + "index.html"), html);
}

/* ---- one city ------------------------------------------------------------- */
function buildCity(c) {
  const f = cityFacts(c);
  const label = c.st ? `${c.city}, ${c.st}` : c.city;
  const path = `${SIM_PATH}${c.slug}/`;
  const near = nearbyCities(c);
  /* data-xlink on the two families that link back per-place, so
     check-crosslinks.mjs can assert the pairing rather than hope for it. Tides
     and the world clock link here contextually and are deliberately one-way:
     a station is not a city, and a clock page stands for a whole zone. */
  const fam = [
    [`/sun/${c.slug}/`, `Sunrise &amp; sunset in ${esc(c.city)}`, "sun"],
    [`/moon/${c.slug}/`, `Moonrise, moonset &amp; phase`, "moon"],
    ...(c.tide ? [[c.tide, "Predicted tide times"]] : []),
    ...(c.clock ? [[c.clock, `${esc(c.city)} time &amp; time zone`]] : []),
  ];
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
    /* raw "&" — head() escapes it. A pre-escaped one here shipped
       "Sun, Moon &amp;amp; Earth" into the title, og:title and the JSON-LD
       name on all 1,103 city pages. check-pages.mjs now gates the pattern. */
    title: `Sun, Moon & Earth Simulator for ${label} — Any Date or Time`,
    desc: `Watch the sun and moon move around the Earth as seen from ${label}: scrub a day, a week or a month, see the phase, altitude and direction of both, sunrise ${f.rise}, sunset ${f.set} and today's ${f.moonName.toLowerCase()} moon.`,
    path,
    ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Sun, Moon & Earth simulator", url: SIM_PATH }, { name: label, url: path }])}</script>\n${placeLd({ ...resolvePlace(c), elevKey: c.slug, url: `${SITE}${path}` })}`,
  })}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "simulator", url: SIM_PATH }, page: { label: c.slug, url: path } })}
  <h1>Sun, Moon &amp; Earth Movement Simulator for ${esc(label)}</h1>
  <p class="sub">Where the sun and the moon are from ${esc(label)}, at any moment you choose. Today the sun rises at <b>${esc(f.rise)}</b> and sets at <b>${esc(f.set)}</b> — <b>${esc(f.len)}</b> of daylight — and the moon is a <b>${esc(f.moonName.toLowerCase())}</b>, ${f.moonPct}% lit. Drag the slider through a day, a week or a month and watch all of it move.</p>

${viewLadder("town")}${simCard(c, f)}  <div class="card">
    <h2>What ${esc(c.city)}’s latitude does to the picture</h2>
    <p>${latitudeLine(c)}</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Sunrise · sunset today</span><b>${esc(f.rise)} · ${esc(f.set)}</b></div>
      <div class="wc-frow"><span>Daylight today</span><b>${esc(f.len)}</b></div>
      <div class="wc-frow"><span>Moonrise · moonset today</span><b>${esc(f.moonRise)} · ${esc(f.moonSet)}</b></div>
      ${f.moonLag != null ? `<div class="wc-frow"><span>Moonrise tomorrow</span><b>${esc(f.moonRiseNext)} — ${Math.abs(f.moonLag)} min ${f.moonLag >= 0 ? "later" : "earlier"}</b></div>` : ""}
      <div class="wc-frow"><span>Moon–sun angle now</span><b>${f.elong}° — ${esc(f.moonName.toLowerCase())}</b></div>
      <div class="wc-frow"><span>Longest · shortest day of ${YEAR}</span><b>${lenWords(Math.max(dayLenAt(c, 5, 21), dayLenAt(c, 11, 21)))} · ${lenWords(Math.min(dayLenAt(c, 5, 21), dayLenAt(c, 11, 21)))}</b></div>
      <div class="wc-frow"><span>Time zone</span><b>${esc(c.tz.replace(/_/g, " "))}</b></div>
    </div>
    <p class="hint">Baked for the moment this page was built; the simulator above recomputes everything in your browser for whatever instant you set.</p>
    <ul class="hub-qs">
      <li><p><a href="/concepts/why-does-the-moon-change-shape/">Why does the Moon change shape?</a> The angle between the Moon and the Sun is the phase.</p></li>
      <li><p><a href="/concepts/what-is-tidal-locking/">What is tidal locking?</a> The Moon turns once per orbit, so the same face stays toward us.</p></li>
    </ul>
    <p class="hint">The full stack of questions sits on the <a href="${SIM_PATH}">simulator’s own page</a>.</p>

  </div>

  <div class="card">
    <h2>${esc(c.city)} on the rest of the site</h2>
    <div class="chips sim-links" id="sim-links">
${fam.map(([href, t, x]) => `      <a class="chip" href="${href}"${x ? ` data-xlink="${x}"` : ""}>${t}</a>`).join("\n")}
    </div>
    <p class="hint">Nearby, for a side-by-side: ${near.map(({ o, mi }) => `<a href="${SIM_PATH}${o.slug}/">${esc(o.st ? `${o.city}, ${o.st}` : o.city)}</a> (${Math.round(mi)} mi)`).join(" · ")}.</p>
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${script(c)}
</body>
</html>
`;
  mkdirSync(join(root, path.slice(1, -1)), { recursive: true });
  writeFileSync(join(root, path.slice(1) + "index.html"), html);
}

/* ---------------------------------------------------------------------------
 * /earth-sun-moon-orbit-simulator/ — THE STEP BETWEEN THE TWO
 * SIMULATORS.
 *
 * The hub above answers "where are the sun and moon from my town" — one
 * place, looking up. /solar-system-simulator/ answers "where is everything"
 * — eight real orbits, to scale in distance. Neither one draws the picture in
 * between: the three bodies moving TOGETHER, Earth going round the Sun and
 * the Moon going round the Earth, at once, on one screen.
 *
 * NOT TO SCALE, AND SAID SO. A drawing that held the Earth's orbit and the
 * Moon's true ~30-Earth-diameter distance at once has no room left for the
 * second one — the Moon would sit closer to the Earth than the line drawing
 * the Earth's own edge. So every size and distance here is invented, exactly
 * as the hub's own scale card admits about its picture, and sysScaleCard
 * below says by how much, computed from this drawing's own pixels rather
 * than typed in.
 *
 * ONE THING SURVIVES THE COMPRESSION ON PURPOSE: the RATIO of the two
 * periods. The Moon's animation runs SIDEREAL/365.25 of the Earth's own
 * duration, so watching it lap the Earth about thirteen times per Earth
 * orbit is a real fact about the solar system — only the SIZE of the two
 * circles is a drawing choice.
 * ------------------------------------------------------------------------- */
const SYS_W = 640, SYS_H = 420, SYS_CX = 320, SYS_CY = 210;
const SYS_RS = 26;      /* the sun's drawn radius                            */
const SYS_REO = 160;    /* Earth's orbit radius around the sun, in px        */
const SYS_RE = 10;      /* Earth's drawn radius                              */
const SYS_RMO = 26;     /* the Moon's orbit radius around the Earth, in px   */
const SYS_RM = 3.5;     /* the Moon's drawn radius                           */
const SYS_EARTH_S = 40; /* seconds per drawn Earth orbit                     */
/* the Moon's animation is that same SIDEREAL/365.25 fraction of the Earth's
   own duration — the one number on this page derived from the real sky
   rather than picked for legibility */
const SYS_MOON_S = +(SYS_EARTH_S * (+SIDEREAL) / 365.25).toFixed(2);
const SYS_K = Math.SQRT1_2;
const sysWrongBy = (drawn, real) => real / drawn;
/* reusing TRUE_RATIO (real ratios, defined above for the hub's own scale
   card) against THIS drawing's own pixels — the real numbers can't drift
   between the two pages because both read the same TRUE_RATIO */
const SYS_WRONG = {
  sunDist: sysWrongBy(SYS_REO / (2 * SYS_RE), TRUE_RATIO.sunDist),
  sunSize: sysWrongBy(SYS_RS / SYS_RE, TRUE_RATIO.sunSize),
  moonDist: sysWrongBy(SYS_RMO / (2 * SYS_RE), TRUE_RATIO.moonDist),
};
/* the moon has to be drawn BIGGER than true scale to still be visible at
   this compressed a distance — the one figure here that runs the other way */
const SYS_MOON_BIG = (SYS_RM / SYS_RE) / TRUE_RATIO.moonSize;

/* THE SHADING IS GEOMETRY, NOT DECORATION — and it is what makes this figure
 * teach. Three orientation rules, each carried by the transform structure:
 *
 * 1. EACH BODY'S DARK HALF FACES AWAY FROM THE SUN, ALWAYS. The Earth's
 *    night-side path is drawn with its flat edge PERPENDICULAR to the
 *    sun-Earth line (dark half radially outward); rotating the whole group
 *    about the sun preserves that radial orientation, so it stays sun-true
 *    for free. The moon needs one more step: its disc rides a group that
 *    orbits the EARTH, so its shading sits in a counter-rotating inner group
 *    (.sys-rev, same duration reversed) that cancels the moon-orbit spin and
 *    leaves only the sun-relative orientation. Watch a full lap and the
 *    moon's lit half sweeps around its face — that IS the phase cycle.
 *
 * 2. THE MOON'S GREY BLOTCH FACES THE EARTH, ALWAYS — it sits OUTSIDE the
 *    counter-rotator, so the moon-orbit rotation keeps it Earth-facing:
 *    tidal locking, drawn. Same face toward us; different lighting on it.
 *
 * 3. THE EARTH'S AXIS KEEPS ONE FIXED LEAN IN SPACE (23.4°, in its own
 *    counter-rotating group, along with the label so the text stays
 *    upright). At the orbit's left the north pole leans SUNWARD (June), at
 *    the right it leans away (December) — the mechanism of the seasons,
 *    visible because the lean does NOT turn with the orbit. */
const SYS_EX = SYS_CX + SYS_REO, SYS_MX = SYS_EX + SYS_RMO;
const SYS_TILT = Math.PI * 23.4 / 180, SYS_AXL = SYS_RE + 7;
const sysFigure = `<svg viewBox="0 0 ${SYS_W} ${SYS_H}" role="img" aria-label="Earth going round the sun with its axis leaning one fixed way, while the moon goes round the Earth keeping one face toward it; every lit side faces the sun. A view slider tips the whole scene from overhead to a side view, where the moon's tilted orbit visibly misses the sun-Earth line." class="sys-fig">
  <rect width="${SYS_W}" height="${SYS_H}" rx="16" fill="#0a1020"/>
  <text x="12" y="${SYS_CY - 4}" font-size="11" fill="#94a3b8">June</text>
  <text x="12" y="${SYS_CY + 12}" font-size="10" fill="#64748b">pole leans sunward</text>
  <text x="${SYS_W - 12}" y="${SYS_CY - 4}" text-anchor="end" font-size="11" fill="#94a3b8">December</text>
  <text x="${SYS_W - 12}" y="${SYS_CY + 12}" text-anchor="end" font-size="10" fill="#64748b">pole leans away</text>
  ${/* everything that MOVES lives inside #sys-scene. Without JS it is exactly
       the old flat CSS-animated drawing; the view-tilt script clears this group
       and re-renders the same three bodies with a real projection instead —
       the frame, the June/December anchors and the card around it never change. */""
  }<g id="sys-scene">
  <circle cx="${SYS_CX}" cy="${SYS_CY}" r="${SYS_REO}" fill="none" stroke="#94a3b8" stroke-opacity=".28" stroke-width="1" stroke-dasharray="3 5"/>
  <circle cx="${SYS_CX}" cy="${SYS_CY}" r="${SYS_RS + 14}" fill="#fcd34d" fill-opacity=".16"/>
  <circle cx="${SYS_CX}" cy="${SYS_CY}" r="${SYS_RS}" fill="#fcd34d"/>
  <text x="${SYS_CX}" y="${SYS_CY + SYS_RS + 18}" text-anchor="middle" font-size="13" fill="#fcd34d">Sun</text>
  <g class="sys-eorbit" style="--sys-o:${SYS_CX}px ${SYS_CY}px;animation-duration:${SYS_EARTH_S}s">
    <circle cx="${SYS_EX}" cy="${SYS_CY}" r="${SYS_RE}" fill="#2f74ad"/>
    <path d="M${SYS_EX} ${SYS_CY - SYS_RE}A${SYS_RE} ${SYS_RE} 0 0 1 ${SYS_EX} ${SYS_CY + SYS_RE}Z" fill="#050a16" fill-opacity=".84"/>
    <circle cx="${SYS_EX}" cy="${SYS_CY}" r="${SYS_RE}" fill="none" stroke="#9dc2e0" stroke-opacity=".45"/>
    <g class="sys-rev" style="--sys-o:${SYS_EX}px ${SYS_CY}px;animation-duration:${SYS_EARTH_S}s">
      ${/* the axis is a VERTICAL line rotated into its lean by a transform on
           this group, rather than baked into the endpoints with trig — that is
           what lets the tilt slider drive it with one setAttribute. The baked
           rotation is the real 23.4°, so no-JS and crawlers see the true axis. */""
      }<g id="sys-axis" transform="rotate(${(SYS_TILT * 180 / Math.PI).toFixed(1)} ${SYS_EX} ${SYS_CY})">
        <line x1="${SYS_EX}" y1="${SYS_CY + SYS_AXL}" x2="${SYS_EX}" y2="${SYS_CY - SYS_AXL}" stroke="#e2e8f0" stroke-opacity=".8" stroke-width="1.5"/>
        <text x="${SYS_EX}" y="${SYS_CY - SYS_AXL - 5}" text-anchor="middle" font-size="10" fill="#e2e8f0">N</text>
      </g>
      <text x="${SYS_EX}" y="${SYS_CY + SYS_RE + 30}" text-anchor="middle" font-size="12" fill="#e2e8f0">Earth</text>
    </g>
    <circle cx="${SYS_EX}" cy="${SYS_CY}" r="${SYS_RMO}" fill="none" stroke="#cbd5e1" stroke-opacity=".3" stroke-width="1" stroke-dasharray="2 4"/>
    <g class="sys-mo" style="--sys-o:${SYS_EX}px ${SYS_CY}px;animation-duration:${SYS_MOON_S}s">
      <g class="sys-rev" style="--sys-o:${SYS_MX}px ${SYS_CY}px;animation-duration:${SYS_MOON_S}s">
        <circle cx="${SYS_MX}" cy="${SYS_CY}" r="${SYS_RM}" fill="#d8dee9"/>
        <path d="M${SYS_MX} ${SYS_CY - SYS_RM}A${SYS_RM} ${SYS_RM} 0 0 1 ${SYS_MX} ${SYS_CY + SYS_RM}Z" fill="#050a16" fill-opacity=".84"/>
      </g>
      <circle cx="${(SYS_MX - SYS_RM * 0.45).toFixed(1)}" cy="${SYS_CY}" r="${(SYS_RM * 0.38).toFixed(1)}" fill="#8a93a5"/>
    </g>
  </g>
  </g>
</svg>`;

/* ---- the VIEW slider --------------------------------------------------------
 * Per the owner: the tilt that matters here is the tilt of the VIEW — swing
 * the camera from straight overhead round to a side view, and two things the
 * flat drawing could only assert become visible facts. From the side the
 * Earth's orbit flattens into a line and the Earth loops in FRONT of the sun,
 * then BEHIND it — the year as an actual loop through space. And the moon's
 * orbit, tilted out of the Earth's, stops hiding its tilt: at most new and
 * full moons the moon passes visibly ABOVE or BELOW the sun-Earth line, which
 * is the entire reason there is no eclipse every month.
 *
 * That cannot be done with the nested CSS rotations (they only know the flat
 * plane), so on this one page the script below REPLACES the CSS animation
 * with its own projection: sun at the origin, Earth on a circle in the
 * ecliptic, moon on a circle inclined to it with a fixed node direction, all
 * three orthographically projected at the slider's angle, painter-sorted by
 * depth, with a mild size-with-depth cue so the front of the loop reads as
 * the front. The no-JS page keeps the old flat CSS-animated figure untouched.
 *
 * THE MOON'S TILT IS DRAWN AT ${SYS_INC_DRAWN}°, NOT ITS REAL 5.1° — at this drawing's
 * 26px orbit the real angle is a two-pixel wobble. Same honesty rule as every
 * other exaggeration on this page: drawn wrong, and the page says by how much.
 * The RATIO the animation keeps real is unchanged: ~13.4 moon laps per orbit. */
const SYS_INC_DRAWN = 18;   /* drawn inclination of the moon's orbit, degrees */
/* THE PAGE OPENS ALREADY TIPPED, at 60° — per the owner. The flat textbook
 * view hides everything this page exists to show (the axis lean, the moon
 * riding off the plane, Earth's phases as it passes in front of and behind
 * the sun); 60° shows all of it while keeping the ellipse clearly open, so
 * the picture still reads as an orbit rather than a bare line. The slider
 * still runs 0–90, so the flat diagram is one drag away, not gone. Set by
 * the script, not baked into the markup: without JS the slider is dead and
 * the static figure is the old flat drawing, so a baked value would
 * mislabel it. */
const SYS_VIEW_START = 60;
const SYS_VIEW_UI = `    <div class="sys-tiltrow">
      <label for="sys-view">Tilt Earth&rsquo;s orbit</label>
      <input type="range" id="sys-view" min="0" max="90" step="1" value="0" disabled aria-describedby="sys-view-note">
      <output id="sys-view-v" for="sys-view">flat on</output>
      <button type="button" class="chip" id="sys-view-side" hidden>Edge on</button>
    </div>
    <p class="hint sys-tiltnote" id="sys-view-note">Drag to tip the whole orbit away from you. It flattens as it goes — wider and shorter — until you are looking along its edge, where the Earth loops in front of the sun and then behind it, and the moon&rsquo;s tilted orbit visibly misses the sun&ndash;Earth line.</p>`;
const SYS_VIEW_JS = `<script>(function(){
  var scene=document.getElementById('sys-scene'), s=document.getElementById('sys-view'),
      out=document.getElementById('sys-view-v'), note=document.getElementById('sys-view-note'),
      side=document.getElementById('sys-view-side');
  if(!scene||!s||!out||!note||!side) return;
  var CX=${SYS_CX}, CY=${SYS_CY}, REO=${SYS_REO}, RMO=${SYS_RMO}, RS=${SYS_RS}, RE=${SYS_RE}, RM=${SYS_RM},
      AXL=${SYS_AXL}, ES=${SYS_EARTH_S}, MS=${SYS_MOON_S},
      INC=${SYS_INC_DRAWN}*Math.PI/180, AX=23.4*Math.PI/180,
      NS='http://www.w3.org/2000/svg';
  function el(t,a){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
  function half(r){return 'M0,'+(-r)+'A'+r+','+r+' 0 0 1 0,'+r+'Z';}
  /* ---- A LIT SPHERE HAS PHASES, and drawing it as a half disc that merely
     ROTATES is only right when you are looking at it from the side of the
     light. Tipped edge on, Earth passing BEHIND the sun turns its fully lit
     face to us and passing IN FRONT turns its night side — exactly the cycle
     the moon runs through every month, for exactly the same reason. This is
     the shadow shape for an illuminated fraction f, terminator vertical and
     the LIT side on +x; the caller rotates it to point at the sun. Same
     construction as mnGlyph in moon.mjs, which draws the real moon. */
  function phasePath(r,f){
    var rx=(r*Math.abs(1-2*f)).toFixed(2), s2=(f<0.5?0:1);
    return 'M0 '+(-r)+'A'+r+' '+r+' 0 0 0 0 '+r+'A'+rx+' '+r+' 0 0 '+s2+' 0 '+(-r)+'Z';
  }
  /* how much of a body at world point B is lit FROM WHERE WE ARE STANDING,
     and which way its bright limb points on screen. The viewer direction is
     (0,-sv,cv) — the same vector the depth sort uses — so the phase and the
     front/behind ordering can never disagree. */
  function shade(node,B,r){
    var lx=-B[0], ly=-B[1], lz=-B[2];                       /* body -> sun */
    var L=Math.sqrt(lx*lx+ly*ly+lz*lz)||1;
    var f=(1+(ly*(-sv)+lz*cv)/L)/2;                         /* (1+cos a)/2 */
    var ang=Math.atan2(-(ly*cv+lz*sv),lx)*180/Math.PI;      /* sunward, on screen */
    node.setAttribute('d',phasePath(r,f));
    node.setAttribute('transform','rotate('+ang.toFixed(1)+')');
  }
  /* rebuild the scene as elements this script owns */
  while(scene.firstChild) scene.removeChild(scene.firstChild);
  var ering=el('ellipse',{cx:CX,cy:CY,fill:'none',stroke:'#94a3b8','stroke-opacity':'.28','stroke-width':'1','stroke-dasharray':'3 5'});
  var mring=el('path',{fill:'none',stroke:'#cbd5e1','stroke-opacity':'.3','stroke-width':'1','stroke-dasharray':'2 4'});
  var gS=el('g'),gE=el('g'),gM=el('g');
  gS.appendChild(el('circle',{r:RS+14,fill:'#fcd34d','fill-opacity':'.16'}));
  gS.appendChild(el('circle',{r:RS,fill:'#fcd34d'}));
  var tS=el('text',{y:RS+18,'text-anchor':'middle','font-size':'13',fill:'#fcd34d'});tS.textContent='Sun';gS.appendChild(tS);
  gE.appendChild(el('circle',{r:RE,fill:'#2f74ad'}));
  var eDark=el('path',{d:half(RE),fill:'#050a16','fill-opacity':'.84'});gE.appendChild(eDark);
  gE.appendChild(el('circle',{r:RE,fill:'none',stroke:'#9dc2e0','stroke-opacity':'.45'}));
  var eAxis=el('line',{stroke:'#e2e8f0','stroke-opacity':'.8','stroke-width':'1.5'});gE.appendChild(eAxis);
  var eN=el('text',{'text-anchor':'middle','font-size':'10',fill:'#e2e8f0'});eN.textContent='N';gE.appendChild(eN);
  var tE=el('text',{y:RE+30,'text-anchor':'middle','font-size':'12',fill:'#e2e8f0'});tE.textContent='Earth';gE.appendChild(tE);
  gM.appendChild(el('circle',{r:RM,fill:'#d8dee9'}));
  var mDark=el('path',{d:half(RM),fill:'#050a16','fill-opacity':'.84'});gM.appendChild(mDark);
  var mPatch=el('circle',{r:(RM*0.38).toFixed(2),fill:'#8a93a5'});gM.appendChild(mPatch);
  scene.appendChild(ering);scene.appendChild(mring);scene.appendChild(gS);scene.appendChild(gE);scene.appendChild(gM);
  /* projection: world x right, y toward June (left of sun is +? see below), z up.
     screen x = wx; screen y = -(wy*cos v + wz*sin v); closeness = -wy*sin v + wz*cos v.
     v=0 is the old flat top-down view; v=90 looks along the plane from the front. */
  /* SC — the whole scene grows as the orbit tips over. Tipping costs the
     drawing height and costs it nothing in width, so a flat-on circle sized
     to fit the frame's SHORT side leaves the picture as a thin band across
     the middle of an empty box once it is edge on. Growing with the tilt is
     what makes it read as "wider and shorter" rather than just "shorter".
     It is a UNIFORM scale — positions and body radii together — so every
     ratio the scale card quotes (orbit against Earth's diameter, moon's
     orbit against the same) is untouched at any tilt. A zoom that moved the
     bodies without resizing them would quietly falsify that whole table. */
  var vdeg=${SYS_VIEW_START}, cv=1, sv=0, SC=1;
  function px(p){return CX+p[0]*SC;}
  function py(p){return CY-(p[1]*cv+p[2]*sv)*SC;}
  function close(p){return -p[1]*sv+p[2]*cv;}
  function place(g,p,kmin){
    var k=1+0.18*(close(p)/REO); if(k<kmin)k=kmin;
    g.setAttribute('transform','translate('+px(p).toFixed(1)+' '+py(p).toFixed(1)+') scale('+(k*SC).toFixed(3)+')');
    return k;
  }
  function render(th,ph){
    var E=[REO*Math.cos(th),REO*Math.sin(th),0];
    var M=[E[0]+RMO*Math.cos(ph),E[1]+RMO*Math.sin(ph)*Math.cos(INC),RMO*Math.sin(ph)*Math.sin(INC)];
    ering.setAttribute('rx',REO*SC);ering.setAttribute('ry',Math.max(REO*cv*SC,0.75));
    var d='',i,a;
    for(i=0;i<=36;i++){a=i/36*2*Math.PI;
      var q=[E[0]+RMO*Math.cos(a),E[1]+RMO*Math.sin(a)*Math.cos(INC),RMO*Math.sin(a)*Math.sin(INC)];
      d+=(i?'L':'M')+px(q).toFixed(1)+' '+py(q).toFixed(1);}
    mring.setAttribute('d',d+'Z');
    place(gS,[0,0,0],1);
    place(gE,E,0.7); place(gM,M,0.7);
    /* each body shows the phase it would really show from this viewpoint —
       full when it is beyond the sun, dark when it is between us and the sun,
       half when it is off to the side */
    shade(eDark,E,RE); shade(mDark,M,RM);
    /* the grey near side keeps facing the Earth */
    var ddx=px(E)-px(M),ddy=py(E)-py(M),dl=Math.sqrt(ddx*ddx+ddy*ddy)||1;
    mPatch.setAttribute('cx',(ddx/dl*RM*0.45).toFixed(2));mPatch.setAttribute('cy',(ddy/dl*RM*0.45).toFixed(2));
    /* THE AXIS IS RIGIDLY ATTACHED TO THE ORBIT, at the real 23.4° from the
       orbit's own normal, and it tips with everything else — it is never
       tilted independently. Flat on you see only its in-plane component (a
       short stub); edge on you see almost its full length. Both are the same
       fixed direction in space, foreshortened by the same projection.
       It rides inside the group's transform, so SC has already scaled it. */
    var adx=Math.sin(AX)*AXL, ady=-(Math.cos(AX)*sv)*AXL;
    eAxis.setAttribute('x1',(-adx).toFixed(1));eAxis.setAttribute('y1',(-ady).toFixed(1));
    eAxis.setAttribute('x2',adx.toFixed(1));eAxis.setAttribute('y2',ady.toFixed(1));
    eN.setAttribute('x',(adx*1.4).toFixed(1));eN.setAttribute('y',(ady*1.4-3).toFixed(1));
    /* painter's order: farthest first, so the Earth really passes in front of
       and then behind the sun */
    var order=[[close([0,0,0]),gS],[close(E),gE],[close(M),gM]].sort(function(x,y){return x[0]-y[0];});
    for(i=0;i<3;i++) scene.appendChild(order[i][1]);
  }
  function caption(){
    if(vdeg<10) return 'The orbit lying flat, seen face on \\u2014 the classic textbook diagram. From here the moon\\u2019s own tilt is invisible: its orbit looks like a flat ring inside Earth\\u2019s, and nothing in the picture explains why there is no eclipse every month. Tip it over.';
    if(vdeg<75) return 'Tipping over: both orbits are flattening into ellipses \\u2014 wider than they are tall \\u2014 and the moon has started riding visibly above and below the plane of Earth\\u2019s orbit as it goes round. Earth\\u2019s axis tips with the orbit, holding its 23.4\\u00B0 lean.';
    return 'Edge on. Earth\\u2019s orbit is now a line, and Earth runs along it \\u2014 passing in front of the sun, then behind it. That loop is the year. And watch the moon: its tilted orbit carries it above or below the sun\\u2013Earth line at most new and full moons, so the three rarely line up exactly \\u2014 which is why eclipses are rare events rather than a monthly schedule. (The moon\\u2019s tilt is drawn at ${SYS_INC_DRAWN}\\u00B0 so it is visible at this size; the real ${ORBIT_TILT}\\u00B0 still carries it several times its own width off the exact line.)';
  }
  function applyView(){
    cv=Math.cos(vdeg*Math.PI/180); sv=Math.sin(vdeg*Math.PI/180);
    SC=1+0.42*sv;
    out.textContent=vdeg<5?'flat on':(vdeg>85?'edge on':vdeg+'\\u00B0');
    note.textContent=caption();
    side.hidden=vdeg>80;
  }
  var th0=0, ph0=0, t0=null, still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(ts){
    if(t0===null)t0=ts;
    var t=(ts-t0)/1000;
    render(th0+2*Math.PI*t/ES, ph0+2*Math.PI*t/MS);
    requestAnimationFrame(frame);
  }
  s.addEventListener('input',function(){ vdeg=+s.value; applyView(); if(still) render(0.8,2.1); });
  side.addEventListener('click',function(){ s.value=90; vdeg=90; applyView(); if(still) render(0.8,2.1); });
  s.value=vdeg; applyView(); s.disabled=false;
  if(still){ render(0.8,2.1); } else { requestAnimationFrame(frame); }
})();</script>`;

const sysFigureCard = `  <div class="card">
    <div class="sys-figwrap">${sysFigure}</div>
${SYS_VIEW_UI}
    <p class="hint">The Earth crosses its own big ring once every drawn orbit; watch the Moon and it crosses its small one about <strong>thirteen times</strong> in that same span — the real ratio between a ${SIDEREAL}-day month and a 365.25-day year, kept even though neither ring is at the real distance. Every dark half faces away from the sun, the moon's grey patch keeps facing the Earth, and the Earth's axis keeps one fixed lean — the four cards below say why each of those is worth staring at.</p>
  </div>
`;

/* id="learn" is the anchor both sibling simulator pages carry for "the part
   that explains rather than draws" (teachCard above, and build-solar's), and
   the home page's cards link to it on all three. This page had the card and
   not the anchor, so its "Educational info" link had nowhere to land. */
const sysWatchCard = `  <div class="card" id="learn">
    <h2>Four true things hiding in this toy drawing</h2>
    <p><strong>1 · The lit sides always face the sun.</strong> Watch the Earth all the way round: its bright half tracks the sun the whole lap, because day and night are nothing but which half faces the light. The moon's bright half does the same — which leads directly to the strange part.</p>
    <p><strong>2 · The moon shows us one face, but the sun lights whichever half it likes.</strong> The grey patch on the moon always points at the Earth — the moon genuinely turns exactly once per orbit, so we only ever see one side (that is tidal locking, and why the far side stayed unphotographed until 1959). But its <em>lit</em> half tracks the SUN, not us. Follow one lap: when the moon sits between Earth and sun, the face we see is all shadow (new moon); on the far side, all lit (full moon). <em>Same face, different lighting — that is the whole phase cycle</em>, and you can check tonight's result against <a href="/moon/">the real phase</a>. It is also why "the dark side of the moon" is a misnomer: the far side gets exactly as much sun as the near side.</p>
    <p><strong>3 · The axis leans one fixed way — and that lean is the seasons.</strong> The Earth's pole is tilted 23.4° and keeps pointing at the same patch of sky all year (toward Polaris). It does NOT swivel to follow the sun — watch the little axis hold its angle through the whole orbit. So on one side of the orbit the north pole leans sunward (June — long days, high sun) and half a year later it leans away (December). Nothing about the Earth changed; only which end leans toward the light. The lean is easiest to see from the side — <strong>drag the tilt slider under the picture</strong> to tip the orbit edge on, and watch the axis stay parallel to itself all the way round the loop. <a href="/classroom/lessons/seasons-grades-7-8/">The seasons lesson</a> turns exactly this into a class period, including why "closer to the sun" cannot be the reason.</p>
    <p><strong>4 · Why eclipses are rare — visible from the side.</strong> Seen from above, the moon crosses the sun–Earth line twice a month and you would expect an eclipse every crossing. Now <strong>tip the orbit edge on with the slider</strong>: the moon's orbit is tilted out of the Earth's, so at most new and full moons it slides <em>above</em> or <em>below</em> the sun–Earth line instead of through it. The tilt is drawn steeper than its real 5.1° so you can see it (the scale card below says by how much), but the miss is genuine — the real angle still carries the moon several times its own width off the exact line, which is why eclipses come in occasional seasons and <a href="/moon/eclipses/">the real list</a> is short. <a href="/classroom/lessons/moon-phases-grades-7-8/">The eclipse lesson</a> is built on exactly this.</p>
  </div>
`;

const sysScaleCard = `  <div class="card">
    <h2>This picture is not to scale — by how much</h2>
    <p>The <em>directions</em> each body turns, and the <em>ratio</em> between the two periods, are real. Every <em>size</em> and every <em>distance</em> is invented, because a drawing that held the Earth's orbit AND the Moon's true distance at once has no room left to show the Moon at all — it would sit closer to the Earth than the line marking the Earth's own edge.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>The Earth's orbit is drawn</span><b>about ${num(SYS_WRONG.sunDist)}× too close to the sun</b></div>
      <div class="wc-frow"><span>The sun itself is drawn</span><b>about ${num(SYS_WRONG.sunSize)}× too small</b></div>
      <div class="wc-frow"><span>The moon's orbit is drawn</span><b>about ${num(SYS_WRONG.moonDist)}× too close to the Earth</b></div>
      <div class="wc-frow"><span>The moon itself is drawn</span><b>about ${SYS_MOON_BIG.toFixed(1)}× too big next to the Earth — it has to be, to still be visible at that distance</b></div>
      <div class="wc-frow"><span>The moon's orbit tilt is drawn</span><b>at ${SYS_INC_DRAWN}° — about ${(SYS_INC_DRAWN / +ORBIT_TILT).toFixed(1)}× the real ${ORBIT_TILT}°, which at this orbit's drawn size would be a two-pixel wobble</b></div>
    </div>
    ${CORRIDOR_PARA}
    <p class="hint">What you can trust here: which way each body turns and orbits, that the moon genuinely completes about thirteen trips round the Earth for every trip the Earth makes round the sun, and — with the orbit tipped edge on — that the moon's orbit really does carry it off the sun–Earth line at most new and full moons. What you cannot: any size, any distance, the drawn steepness of that tilt (exaggerated, as the table says), or the direction its crossing line points — a drawing choice, so nothing here says <em>when</em> in the year real eclipse seasons fall.</p>
  </div>
`;

/* the old "Where this sits between the other two" card at the FOOT of the
   page became the viewLadder strip at its HEAD (view-ladder.mjs, shared by
   all three simulators — the relationship between the views is the hardest
   thing here to teach and cannot live below the fold). Its what-each-view-
   trades paragraph survives as the strip's note. */
const sysTradeNote = `    <p class="hint sys-vlad-note">Each view trades one kind of honesty for another. <a href="${SIM_PATH}">The single-location simulator</a> gets the sun and moon's real position from your own town, but only ever shows one place. This page adds the Earth's own orbit and keeps the real ratio between the two periods, but invents every size and distance to fit them both on a screen. <a href="/solar-system-simulator/">The solar system simulator</a> gets distance right — orbits drawn to actual scale — by giving up on size, since a to-scale Jupiter would be a fraction of a pixel.</p>
`;

const SYS_FAQ = [
  ["Is this to scale?", "No, and it says so on the page: every size and every distance here is invented so the Earth's orbit and the moon's orbit can both fit on one screen. What is real is the direction each body turns, the ratio between the two periods, the fixed lean of the Earth's axis, and which half of each body is lit."],
  ["Why does the moon go round so much faster than the Earth does?", "Because it really does: the moon completes an orbit in about 27.3 days against the stars, and the Earth takes 365.25 days to go once round the sun — about thirteen moon orbits to one Earth orbit, which is the speed this page's animation runs at."],
  ["Does the same side of the moon always face the Earth?", "Yes — the grey patch in the drawing marks it. The moon rotates exactly once per orbit, so one face points at us permanently. But the SUN lights whichever half faces it, so the face we see swings from fully dark (new moon) to fully lit (full moon) and back. Same face, changing light: that is what the phases are."],
  ["Is the Earth's tilt really why we have seasons?", "Yes. The axis leans 23.4 degrees and keeps pointing the same way in space all year — watch it hold its angle through the whole drawn orbit. When your hemisphere's pole leans sunward the days run long and the sun stands high; half an orbit later it leans away. Distance is not the cause — the Earth is actually closest to the sun in early January, in the middle of the northern winter."],
  ["What does the tilt slider do?", "It tips Earth's whole orbit away from you, from lying flat and face on to standing edge on. As it tips, the orbit flattens — wider and shorter — until it is a line. Edge on you can see the things a flat diagram cannot show: Earth passing in front of the sun and then behind it, which is the year, and the moon's tilted orbit carrying it above or below the sun-Earth line at most new and full moons, which is why eclipses are rare. Earth's axis keeps its 23.4-degree lean relative to the orbit throughout and tips along with it."],
  ["Why isn't there an eclipse every month?", "Because the moon's orbit is tilted about 5 degrees out of the plane of the Earth's, so at most new and full moons the moon passes above or below the exact sun-Earth line instead of through it. Tip the orbit edge on with the slider and you can watch it happen — the drawn tilt is exaggerated so it is visible at this size, but the miss is real: even 5 degrees carries the moon several times its own width off the line."],
  ["Where can I see this to scale?", "Nowhere on one screen, at both distances at once — that is the whole point of this page. The Earth and the Moon ARE drawn to real scale, in both size and distance, on the Earth & the Moon rung of the solar system simulator; that view has no room left to also show the sun."],
];

const sysTeachCard = hubQuestionsCard(SYS_PATH, "What this picture is telling you", { id: "learn" });

function buildSystemView() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${head({
    title: "Earth, the Sun & the Moon — All Three Moving at Once",
    desc: "A schematic of the Earth going round the sun while the moon goes round the Earth, drawn small enough to fit one screen. Not to scale — the page says by how much — but the real ratio between the two orbital periods.",
    path: SYS_PATH,
    ld: `\n<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Earth, Sun & Moon orbit simulator", url: SYS_PATH }])}</script>\n${learningLd({ name: "Earth, Sun & Moon: the whole system moving", url: `${SITE}${SYS_PATH}`, description: "A schematic showing the Earth orbiting the sun while the moon orbits the Earth, at the real ratio between the two periods and an openly invented scale." })}`,
    faq: SYS_FAQ,
  })}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "earth-sun-moon-orbit-simulator", url: SYS_PATH } })}
  <h1>Earth, the Sun &amp; the Moon — All Three Moving</h1>
  <p class="sub">The picture neither of this site's other simulators draws: the Earth going round the sun while the moon goes round the Earth, both at once. It is drawn small enough to fit a screen, which means it cannot be to scale — and the card below it says exactly how far out it is.</p>

${viewLadder("system", { note: sysTradeNote })}${sysFigureCard}${sysWatchCard}${sysTeachCard}${sysScaleCard}${faqCard(SYS_FAQ, "Common questions")}  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${SYS_VIEW_JS}
</body>
</html>
`;
  mkdirSync(join(root, SYS_PATH.slice(1, -1)), { recursive: true });
  writeFileSync(join(root, SYS_PATH.slice(1) + "index.html"), html);
}

/** every path this generator emits — build-inline and build-sitemap read it */
export const SIM_SLUGS = ALL.map((c) => c.slug);

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  buildHub();
  for (const c of ALL) buildCity(c);
  buildSystemView();
  console.log(`Generated ${SIM_PATH} + ${ALL.length} city pages + ${SYS_PATH} (moon drawn ${num(wrongBy("moonDist"))}x too close, sun ${num(wrongBy("sunDist"))}x too close and ${num(wrongBy("sunSize"))}x too small).`);
}
