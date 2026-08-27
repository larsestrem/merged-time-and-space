#!/usr/bin/env node
/* build-solar.mjs — /solar-system-simulator/ and its twelve children.
 *
 * WHY A SECOND SIMULATOR. /sun-moon-earth-movement-simulator/ answers "where
 * are the sun and the moon from where I am standing". This answers "where is
 * everything else", which is a different scale, a different span and a
 * different lesson — and cannot share a page, because the two cannot be drawn
 * at once. At Saturn's zoom the whole Earth-Moon system is a tenth of a pixel.
 *
 * THE ZOOM LADDER IS THE HONEST ANSWER TO SCALE. The ratio between the
 * outermost and the innermost orbit on screen is what decides whether anything
 * is separable, and it climbs fast: about 4:1 out to Mars, 27:1 out to Saturn,
 * 81:1 out to Neptune, where Mercury's whole orbit is a few pixels. So the view
 * climbs a ladder instead of pretending one frame can hold it. Two of the rungs
 * are to scale in size as well as distance — Earth and the Moon, and every
 * planet's own disc against its moons' orbits — and the copy for all of it is
 * COMPUTED from planets.mjs and the frame, so it cannot go stale when the
 * drawing changes.
 *
 * WHAT EACH CHILD PAGE IS FOR. A page per planet, plus the asteroid belt, the
 * comets and the launch windows. Every one of them carries something only that
 * page has: its own moon system drawn from real orbits, physical figures
 * DERIVED (mass from GM, gravity from GM and radius, year from Kepler) rather
 * than typed in, the open questions science has not answered about it, and
 * dated recent findings. That is the difference between a simulator and a
 * teaching tool, and it is the reason these are pages rather than tabs.
 *
 * THE DATA IS CHECKED, NOT BELIEVED — check-planets.mjs for the orbits and
 * check-solar-data.mjs for the moons, the comets, the belt and the transfers.
 * Run both after touching any table.
 *
 *   node seo/tools/build-solar.mjs   (before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, appLd, learningLd } from "./lib.mjs";
/* every distance and speed below is emitted metric and converted in the reader's
   browser if their units are imperial — see units.mjs */
import { kmSig, km, kmPerS, temps } from "./units.mjs";
import { ico } from "./icons.mjs";
import { viewLadder } from "./view-ladder.mjs";
import { GLOBE_JS, globeSvg, globeRadius, globeCaption, PL_OBL } from "./globe.mjs";
import { MOON_CORE } from "./moon.mjs";
import { PLANETS_JS, SOLAR_JS, RUNGS, SOL_FRAME, FRAME_R, planetName, planetPeriodDays, planetPos, PL_DIA, PL_AU, PL_EL, PLANET } from "./planets.mjs";
import { SAT_JS, SAT_SYS, satRow, satCount, satGravity, satMass, satRotation } from "./satellites.mjs";
import { SMALL_JS, SM_COMETS, SM_BIG, cometRow, nextPerihelion, resonanceAU, beltEdges } from "./smallbodies.mjs";
import { TRANSFER_JS, TR_TARGETS, TR_GM_SUN, launchWindow, transferCost, closestApproaches } from "./transfer.mjs";
import { SIM_PATH, SYS_PATH } from "./build-simulator.mjs";
import { hubQuestionsCard } from "./concepts.mjs";
import { JS_MODULES, SOLAR_HUB, PLANETS_PATH, LAUNCH_PATH as LAUNCH_NEW, LAUNCH_OLD, planetPath, planetOldPath,
         SYS_VIEWS, EXTRA_VIEWS, HUB_NEEDS, LAUNCH_DESTS, LAUNCH_NEEDS, assertNeeds, moonCount,
         solarCrumbs, CRUMB_ROOT, ORBITAL_PATH } from "./solar-pages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const FACTS = JSON.parse(readFileSync(join(root, "seo/_data/solar-facts.json"), "utf8"));
export const SOLAR_PATH = SOLAR_HUB;
/* ROCKET LAUNCHES IS ITS OWN PAGE, not a rung of the solar system. It is the
 * only page that carries the flight-path controls, and it sits at the top
 * level rather than under /solar-system-simulator/ because what people search
 * for is "launch window to Mars", not a zoom level. It is now a hub with a
 * child per destination — /rocket-launch-simulator/mars/ and so on — because
 * "launch window to Mars" and "launch window to Saturn" are different
 * questions with different answers, and one page could only ever rank for one
 * of them. The old /rocket-launches/ URL 301s to it (see _redirects). */
export const LAUNCH_PATH = LAUNCH_NEW;
const TITLE = "Solar System Simulator";
/* THE VIEW ANGLE THE SIMULATOR OPENS AT, in degrees off straight-down.
 * 0 is the exact view — the only angle where a drawn angle equals the
 * longitude printed beside it — and it is one drag away. But a set of
 * concentric rings seen flat-on reads as a dartboard, and the same rings seen
 * at an angle read as a system, which is what the page is for. It matters most
 * on the moon rungs: Saturn seen flat-on is circles, and seen at an angle it
 * is Saturn.
 * Used in TWO places that must agree — the slider's baked `value` and
 * SOL_TILT0 in the client — so it lives here rather than being typed twice. */
const TILT_DEF = 50;
/* HOW MUCH THE ORBIT TILTS ARE EXAGGERATED at a given view angle, as ONE
 * expression in one place. A real inclination of 0.8-7 degrees shows as
 * z*sin(view), so at a shallow view it needs multiplying and at a steep one it
 * does not — multiplying it there anyway turns a readable picture into a
 * tangle. The read-out prints whichever factor is in force, so the number on
 * screen is always the number being drawn.
 * The body is written once as source text: the build-time bake evals it here
 * and the client gets the identical text, so the baked picture and the redrawn
 * one cannot use different rules. */
const TILT_EXAG_BODY = "return t<8 ? 1 : Math.max(1,Math.min(10,Math.round(360/t)));";
// eslint-disable-next-line no-new-func
const tiltExagFor = new Function("t", TILT_EXAG_BODY);
const NOW = new Date();

const num = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const dateLong = (d) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const dateShort = (d) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/* ---- what the ladder can honestly claim ---------------------------------
 * Every number below falls out of the frame and the orbital axes, which is why
 * none of them can go stale when the drawing changes. */
const SYS_RUNGS = RUNGS.filter((r) => r.kind === "sys");
const axis = (i) => PL_EL[i][1];
/* both return a DIAMETER in drawn pixels, because that is what every sentence
   below says ("across", "wide"). A length L in AU occupies L/outer*FRAME_R px
   of radius in the drawing, so an orbit's width is twice that. orbitPx used to
   return the radius and bodyPx carried a spare *2, which halved every orbit
   figure in the copy and doubled every planet one. */
const orbitPx = (i, outer) => axis(i) / outer * FRAME_R * 2;
const bodyPx = (name, outer) => (PL_DIA[name] / PL_AU) / outer * FRAME_R;
const ratio = (r) => r.outer / axis(0);
/* the radius the same drawing would get in a 16:9 frame of the same WIDTH —
   the constraint that actually binds, since the page column sets the width and
   height is free. Used only by the "why the frame is square" paragraph, so that
   claim is computed from SOL_FRAME rather than typed beside it. */
const WIDE_R = (SOL_FRAME.w * 9 / 16) / 2 - SOL_FRAME.pad;

/* how far each planet gets in each span — from the same axes the drawing uses */
const SPANS = [["month", "Month", 30], ["year", "Year", 365.25], ["decade", "Decade", 3652.5], ["century", "Century", 36525]];
const travel = (i, days) => days / planetPeriodDays(i) * 360;
const travelWords = (i, days) => {
  const d = travel(i, days);
  if (d >= 360) return `${(d / 360).toFixed(d / 360 < 10 ? 1 : 0)} laps`;
  return `${Math.round(d)}°`;
};

/* ---- derived physical figures. NONE of these are typed in beside a planet:
 * mass is GM/G, gravity is GM/r^2, the year is Kepler's third law, the day is
 * the rotation the moon table is measured against, and the diameter is the one
 * planets.mjs already uses to draw. */
const bodyStats = (idx) => {
  const p = planetPos(idx, NOW), yrDays = planetPeriodDays(idx);
  const rot = satRotation(idx), g = satGravity(idx), m = satMass(idx);
  return {
    dia: PL_DIA[planetName(idx)],
    diaEarth: PL_DIA[planetName(idx)] / PL_DIA.Earth,
    mass: m, massEarth: m / satMass(PLANET.EARTH),
    gravity: g, gravityEarth: g / satGravity(PLANET.EARTH),
    yearDays: yrDays, yearYears: yrDays / 365.256,
    dayHours: rot, retrogradeSpin: rot < 0,
    axisAU: axis(idx), rNow: p.r, moons: satCount(idx),
    drawn: SAT_SYS[idx] ? SAT_SYS[idx].moons.length : 0,
    perihelion: axis(idx) * (1 - p.e), aphelion: axis(idx) * (1 + p.e), ecc: p.e,
  };
};
/* how long light takes to cross a distance in AU — the one unit that makes
   these numbers mean something to a reader */
const lightTime = (au) => {
  const s = au * 499.004784;
  if (s < 90) return `${s.toFixed(0)} seconds`;
  if (s < 5400) return `${(s / 60).toFixed(1)} minutes`;
  return `${(s / 3600).toFixed(1)} hours`;
};

/* THE SAME DRAWING, RUN AT BUILD TIME. moon.mjs's one-source-two-runtimes
 * pattern: there is no Node twin of solSvg to drift, because this IS solSvg —
 * the identical string the browser gets, evaluated here. It exists so the page
 * ships a real picture instead of an empty <div>, which is what a crawler, a
 * no-JS visitor and the first paint of every visit all used to get on a page
 * whose H1 promises a simulator. */
const SSR = new Function(`${MOON_CORE}\n${PLANETS_JS}\n${SAT_JS}\n${SMALL_JS}\n${TRANSFER_JS}\n${GLOBE_JS}
${SOLAR_JS}\nreturn { solSvg: solSvg, solRung: solRung };`)();
/* baked AT THE DEFAULT TILT, not flat. The slider ships with value=TILT_DEF,
   so a flat baked picture meant the control and the drawing disagreed until
   the script replaced it — visible as a jump on every load, and the only
   picture a crawler or a no-JS visitor ever saw. `tilt` is a parameter because
   Earth's page opens at its own angle. */
const bakedFig = (rung, tilt = TILT_DEF) => SSR.solSvg(+NOW, rung, { tilt, tiltExag: tiltExagFor(tilt) });
const bakedWhen = NOW.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/* ---------------------------------------------------------------------------
 * The client — COMPOSED PER PAGE from the modules that page actually draws
 * with, not one bundle for all of them.
 *
 * It used to be a single script shared by every page: 129KB, byte-identical
 * apart from a config line, hoisted to one cached file. That was the right
 * trade while the zoom rungs were client-side buttons, because any page could
 * switch to any rung and therefore needed the code for all of them.
 *
 * The rungs are links between pages now (see solar-pages.mjs), so a page can
 * ship only its own view. The optional modules and what they cost:
 *
 *   globe     35.0 KB  the textured planet sphere — planet pages only
 *   moon      13.6 KB  the Earth-and-Moon view's lunar solver — one page
 *   sat       12.2 KB  moon systems — the six planets that have one
 *   small      9.1 KB  belt + comet elements — two pages
 *   transfer   6.7 KB  launch windows — the rocket pages and the 3 targets
 *
 * core (PLANETS_JS + SOLAR_JS, ~21KB) is the drawing itself and is never
 * optional. So /solar-system-simulator/inner-planets/ ships 21KB where it used
 * to ship 129KB, and /jupiter-and-moons-simulator/ ships ~75KB.
 *
 * SAFETY: every cross-module call in SOLAR_JS is already reached only through
 * its own rung or layer (satView behind rung[4]==='moons', smBeltLayer behind
 * opt.belt, trLayer behind opt.transfer, and so on). What makes omitting a
 * module safe rather than merely lucky is the pair of checks around it:
 * assertNeeds() in solar-pages.mjs refuses to build a page whose RUNG needs a
 * module it does not ship, and SOL_HAS below closes the other route in — a
 * ?belt=1 in the URL, or a layer button — so a module that is absent can never
 * be called for at runtime either.
 * ------------------------------------------------------------------------- */
const JS_SRC = { globe: GLOBE_JS, moon: MOON_CORE, sat: SAT_JS, small: SMALL_JS, transfer: TRANSFER_JS };

/* `sim` — DOES THIS PAGE CARRY THE SIMULATOR AT ALL?
 *
 * Mercury and Venus have no moons, so there is no moon system for their page
 * to draw, and what they used to get instead was the INNER-PLANETS view: the
 * solar system simulator, on a page about one planet, showing that planet as
 * one of four dots. It answered a question the page was not asking, and it
 * cost the whole drawing engine — the orbits, the rungs, the share builder —
 * to do it. Those two pages now ship the globe and nothing else, and reach the
 * system the way every other page does: by linking to it.
 * A page with a moon system keeps its simulator, because that picture IS the
 * page's subject and exists nowhere else. */
const pageJs = (needs, cfg, sim = 1) => {
  const has = (m) => needs.includes(m);
  const part = (m) => (has(m) ? JS_SRC[m] : `/* ${m}: not drawn on this page */`);
  return `
/* The globe's drawing code sits at the TOP of this file, outside the IIFE below
   — the Earth-and-Moon view inside it calls glSvg, and so does the planet-page
   globe at the bottom. Declared once, seen by both. */
${part("globe")}
${!sim ? "/* no simulator on this page: it has no moon system to draw */" : `(function(){
${part("moon")}
${PLANETS_JS}
${part("sat")}
${part("small")}
${part("transfer")}
${SOLAR_JS}
  /* WHAT THIS PAGE CAN DRAW. Every optional module's entry points are behind
     one of these, so a URL parameter or a stray button cannot ask for a layer
     whose code was left out of this file. */
  var SOL_HAS=${JSON.stringify(Object.fromEntries(JS_MODULES.map((m) => [m, has(m) ? 1 : 0])))};
  /* The page's own configuration, baked in rather than read from a
     window.AC_SOL the surrounding page had to set: this file is unique to this
     page now, so its config belongs in it. */
  var CFG=${JSON.stringify(cfg)};
  var RUNG=CFG.rung||'inner', START=null, OFF=0, SPAN='year', PLAY=0, SPEED=15;
  /* THE VIEW OPENS TILTED. Straight down is the exact view and stays one drag
   away, but the page's job is to make people look, and a disc seen at an angle
   reads as a system where a set of concentric rings reads as a dartboard.
   TILT_DEF (up in the generator) is the only place the default is decided —
   the slider's baked value comes from the same constant, so the control and
   the drawing cannot open disagreeing. */
  var SOL_TILT0=(CFG&&CFG.tilt!=null)?CFG.tilt:${TILT_DEF};
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
  var DEST_SLUG=${JSON.stringify(Object.fromEntries(TR_TARGETS.map(([i]) => [i, planetPath(FACTS.bodies[i].slug, i)])))};
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
  function solTiltExag(t){ ${TILT_EXAG_BODY} }
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
  function fmt(o){ try{ return new Intl.DateTimeFormat('en-US',o).format(new Date(when())); }catch(e){ return '\\u2014'; } }
  function dfmt(ms){ try{ return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(new Date(ms)); }catch(e){ return '\\u2014'; } }
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
        out+=row(m[0],(m[1]>=1e6?(m[1]/1e6).toFixed(2)+'M':Math.round(m[1]/1000)+'k')+' km \\u00b7 '
          +(per<1?(per*24).toFixed(1)+' h':per.toFixed(per<10?2:1)+' d')+(m[2]<0?' \\u21ba':''));
      }
    } else {
      for(i=0;i<rung[3];i++){
        var p=plPos(i,t);
        out+=row(plName(i),p.r.toFixed(2)+' AU \\u00b7 '+Math.round(p.lon)+'\\u00b0',i===2);
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
    if(rung[4]==='em') s='Earth and the Moon, to scale in size <b>and</b> distance \\u2014 the only view here that is both.';
    else if(rung[4]==='moons') s='The orbits and the planet\\u2019s disc are to scale against each other. Where each moon sits on its orbit is <b>not</b> solved for \\u2014 watch the motion, not the position.';
    else s='Orbits to scale; the planets themselves are drawn big enough to see. Positions are good to about ten arcminutes \\u2014 well under a pixel here.';
    var t=when();
    if(t<VALID0||t>VALID1) s+=' <b>Beyond 1800\\u20132050</b> the orbital elements are being extrapolated, so this is the right shape of the system but no longer the right positions.';
    /* WHAT THE FLIGHT PATH IS, AND IS NOT. It is the minimum-energy transfer:
       the cheapest route there is, and the one launch windows are defined
       against. It is not what anybody flies to the outer planets, and drawing
       it without saying so let the page imply that it is. The burn figure
       beside it is the tell — 7.3 km/s out of low Earth orbit is more than any
       launcher has ever given a real spacecraft, which is exactly why Galileo,
       Cassini and Juno all went the long way round instead. */
    if(TARGET) s+=' The path drawn is the <b>minimum-energy</b> transfer \\u2014 the cheapest, and the slowest. Real missions to Jupiter and Saturn do not fly it: the burn it needs is bigger than any launcher provides, so Galileo, Cassini and Juno all borrowed speed from other planets on the way \\u2014 longer in time, far cheaper in fuel. Cassini took 6 years 8 months and four flybys to reach Saturn.';
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
    if(SPEED!==1) q+='&speed='+SPEED;
    /* the view angle travels with the link, so a shared picture arrives at the
       angle it was shared at rather than snapping back to the page default */
    if(Math.round(TILT)!==Math.round(SOL_TILT0)) q+='&tilt='+Math.round(TILT);
    if(MOONLVL>1) q+='&moons='+MOONLVL;
    if(LAYER.belt) q+='&belt=1';
    if(LAYER.comets) q+='&comets=1';
    if(TARGET) q+='&to='+TARGET;
    var url=location.origin+(CFG.path||'${SOLAR_PATH}')+'?'+q;
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
    var tl=parseFloat(q0.get('tilt')); if(tl>=0&&tl<=90) TILT=SOL_TILT0=tl;
    /* how much of the moon system to draw. Clamped inside satView too, so a
       level this planet does not have degrades to the most it does. */
    var ml=parseInt(q0.get('moons'),10); if(SOL_HAS.sat&&ml>=1&&ml<=3) MOONLVL=ml;
    if(SOL_HAS.transfer){ var to=parseInt(q0.get('to'),10); if(to>=3&&to<=5) TARGET=to; }
    var d=q0.get('date'); if(d&&/^\\d{4}-\\d{2}-\\d{2}$/.test(d)){ var dt=Date.parse(d+'T12:00:00Z');
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
        +(drawn<total ? '. The rest are a few km of captured rubble on distant tilted orbits \u2014 real, but a dot for each would say something false about what a moon system looks like.' : '.');
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
       all \u2014 the orbits are drawn in the planet's equatorial plane \u2014 so the
       read-out saying "orbit tilts x7" on Jupiter's moons was reporting a
       correction that nothing was applying. */
    var ex=solRung(RUNG)[4]==='sys' ? tiltExag() : 1;
    el.textContent = TILT<1 ? 'flat \u2014 straight down on the plane'
      : TILT+'\u00b0' + (ex>1 ? ' \u00b7 orbit tilts \u00d7'+ex : '');
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
      return '<option value="'+i+'">'+dfmt(w.t0)+' \u2014 '+Math.round(w.tf/86400000)+' day flight</option>';
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
          +'<a href="'+DEST_SLUG[TARGET]+'">More about '+plName(TARGET)+' \u2192</a>'; }
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
})();`}

/* THE PLANET'S OWN GLOBE, on the pages that draw one. Its own IIFE. It used to
   ride along in the one shared file and fall out at the first line on pages
   with no globe; now the globe module is only in the file when the page draws
   one, so this block is only emitted then too — and still checks for its box,
   because a planet page can carry the module for its Earth-and-Moon view
   without carrying a #pl-globe. */
${has("globe") ? `(function(){
  var box=document.getElementById('pl-globe'); if(!box) return;
  var nm=box.getAttribute('data-name'), hrs=+box.getAttribute('data-hours')||24,
      retro=box.getAttribute('data-retro')==='1', sec=+box.getAttribute('data-sec')||12;
  if(retro) hrs=-hrs;
  /* one drawn turn every sec seconds, whatever the planet. Worked out as a
     TIME SCALE rather than an angle, so the drawing code is the same function
     the page was baked with and cannot drift from it. */
  var speed=Math.abs(hrs)*3600000/(sec*1000), t0=Date.now(), iv=0;
  function frame(){
    var t=t0+(Date.now()-t0)*speed;
    box.innerHTML='<svg viewBox="0 0 400 400" width="100%" aria-hidden="true">'
      +'<rect width="400" height="400" rx="16" fill="#080d1a"/>'
      +glSvg(nm,t,200,200,glR(nm,192),hrs,0.9)+'</svg>';
  }
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function run(on){ if(iv){ clearInterval(iv); iv=0; } if(on&&!reduce) iv=setInterval(frame,60); }
  document.addEventListener('visibilitychange',function(){ run(!document.hidden); });
  run(!document.hidden);
})();` : "/* globe: not drawn on this page */"}
`;
};

/* ---------------------------------------------------------------------------
 * Shared page furniture
 * ------------------------------------------------------------------------- */
/* THE ZOOM LADDER IS BUTTONS, AND IT IS THE SOLAR SYSTEM ONLY.
 * Buttons because the six rungs ARE the page — they are what you press most and
 * a dropdown hid five of them behind a tap. Heliocentric only because the moon
 * systems and the Earth-and-Moon view have their own pages now: this one is the
 * solar system, and it stays the solar system.
 * The rung ids are unchanged, so a link into a moon view still resolves — it is
 * only the ladder OFFERED here that is trimmed. */
/* the solar page's ladder: every heliocentric rung EXCEPT the ones that exist
   only to frame something on another page (ladder: 0) */
const zoomRungs = () => RUNGS.filter((r) => r.kind === "sys" && r.ladder !== 0);

/* ---------------------------------------------------------------------------
 * "JUMP TO" — LINKS NOW, NOT RUNG SWITCHES.
 *
 * This row used to be six buttons that repainted the figure in place. Two
 * things were wrong with that once each view earned a page: the destinations
 * were unreachable to a crawler and unlinkable by a reader, and switching to
 * Jupiter's moons required this page to carry the satellite module whether it
 * drew moons or not — which is the 129KB every page was paying.
 *
 * They are anchors to the real pages, built from the registry so a URL cannot
 * be typed here and somewhere else and drift. A page never links to itself:
 * the row is filtered against the current path.
 * ------------------------------------------------------------------------- */
const bodyIdx = (slug) => FACTS.bodies.findIndex((b) => b.slug === slug);
const planetUrl = (slug) => planetPath(slug, bodyIdx(slug));
const JUMPS = [
  () => ["All the planets", PLANETS_PATH],
  () => ["Earth &amp; the Moon", planetUrl("earth")],
  () => ["Inner planets", `${SOLAR_PATH}inner-planets/`],
  () => ["Asteroid belt", `${SOLAR_PATH}asteroid-belt/`],
  () => ["Jupiter’s moons", planetUrl("jupiter")],
  () => ["Saturn’s rings", planetUrl("saturn")],
  () => ["The outer planets", `${SOLAR_PATH}outer-planets/`],
];
const jumpLinks = (self = "") => {
  const items = JUMPS.map((f) => f()).filter(([, url]) => url !== self);
  return `<p class="sim-jump sol-jump">Jump to
${items.map(([label, url]) => `      <a class="chip" href="${url}">${label}</a>`).join("\n")}
        </p>`;
};
/* THE DESTINATIONS, as buttons. Same control as the rungs beside them on the
   other page — press to choose, lit when chosen — but the thing being chosen is
   where the rocket is going, which is the only question /rocket-launches/ asks.
   "Nowhere" is a real answer: it is the system with no flight path drawn. */
const destButtons = () => `<button type="button" class="chip sol-destbtn" data-sol-dest="0" aria-pressed="true" data-sol-inert disabled>Nowhere yet</button>`
  + TR_TARGETS.map(([i, n]) => `<button type="button" class="chip sol-destbtn" data-sol-dest="${i}" aria-pressed="false" data-sol-inert disabled>${esc(n)}</button>`).join("");

/* THE LADDER IS BUTTONS ON THE HUB AND LINKS EVERYWHERE ELSE.
 *
 * The hub is the page whose subject IS the ladder — climbing it rung by rung is
 * how it makes its point about the shape of the system — so there it stays a
 * row of buttons that repaint in place, and the hub carries the code for every
 * rung to make that work.
 *
 * NO OTHER PAGE CARRIES IT AT ALL. It used to appear on every one as anchors
 * into the hub at each rung, which put six links that navigate away inside the
 * settings panel of the picture beside them — indistinguishable from a zoom
 * control for that picture, and the reason a reader on Saturn's page could
 * press "To Neptune" and end up somewhere else entirely without having asked
 * to go. The onward routes those pages need are named links in the prose and
 * in the jump row: /planets/ for the worlds, the hub for the system. */
const zoomButtons = (sel) => zoomRungs().map((r) =>
  `<button type="button" class="chip sol-zoombtn" data-sol-zoombtn="${r.id}" aria-pressed="${r.id === sel ? "true" : "false"}" data-sol-inert disabled>${esc(r.short || r.label)}</button>`).join("");
const spanOptions = SPANS.map(([v, l]) => `<option value="${v}"${v === "year" ? " selected" : ""}>${esc(l)}</option>`).join("");
/* the label beside it says "Launch to:", so each option is just the place */

/* THE SIMULATOR CARD. Square frame on the left, read-out on the right: the
 * picture is all concentric circles, so a square frame gives it about 40% more
 * radius than a 16:9 one of the same height, and the width freed up by the wide
 * layout goes to the read-out rather than to empty corners. */
/* launch=1 emits the flight-path controls. THEY ONLY EXIST ON ONE PAGE NOW —
 * /rocket-launches/, which is about them. On the solar system page they were a
 * dropdown in a settings drawer that quietly rewrote the zoom, the span and the
 * date the moment you touched it, which is a lot of page for a control that is
 * not what that page is about. */
/* `self` is the page's own URL — it keeps the Jump-to row from linking to the
   page it is already on. `hub` marks the one page that keeps the ladder as
   live buttons (see zoomButtons). */
/* `layers` — does this page carry the small-bodies module, i.e. can the belt
   and comet buttons DO anything here? On a planet page they never could: the
   rung is a moon system and the code is not shipped, so they sat there greyed
   out under a heading about the solar system on a page about one planet.
   Offering a dead control is worse than offering none. */
const simCard = (rung = "inner", launch = 0, self = "", hub = 0, tilt = TILT_DEF, layers = 0) => `  <div class="card sol-card">
    <div class="sol-stage">
      <div class="sol-figwrap">
        ${/* THE THREE LIVE CONTROLS RIDE ON THE PICTURE, bottom right. They were
             the tail of a seven-control row that could not wrap (it inherited
             .sim-ctl's flex-wrap:nowrap), so on a phone Now, the full-screen
             arrows and Play were simply off the right-hand edge of the page —
             the whole document scrolled sideways to reach them. Putting them
             over the drawing fixes that and buys back a row: these three are
             the ones you press WHILE watching, so they belong on the thing you
             are watching, and the settings that you touch once stay in the
             panel. The box exists because #sol-fig's contents are replaced on
             every repaint; anything inside it would be wiped. */""
        }<div class="sol-figbox">
        <div class="sol-fig" id="sol-fig">${bakedFig(rung, tilt)}</div>
        ${/* every planet dot and its orbit ring in a "sys" rung carry
             data-sol-planet (see solSystemView, planets.mjs); hovering either
             lights up both and this tooltip names where a click goes — see
             the delegated listener near the bottom of PAGE_JS. Sits outside
             #sol-fig, which is wiped and rebuilt on every repaint. */""
        }<div class="sol-ptip" id="sol-ptip" role="status" hidden></div>

        <div class="sol-overlay">
          <button type="button" class="chip" id="sol-now" data-sol-inert disabled hidden>Now</button>
          <button type="button" class="chip sim-icobtn" id="sol-fs" data-sol-inert disabled hidden aria-pressed="false" aria-label="Full screen">${ico("expand", 16)}<span class="sol-fslab">Full screen</span></button>
          <button type="button" class="chip chip-alt" id="sol-play" aria-pressed="false" data-sol-inert disabled>Play</button>
        </div>
        </div>
        <p class="sim-when" id="sol-when">${esc(bakedWhen)}</p>
        <p class="orr-scrub sol-scrub">
          ${/* THE FLIGHT, MARKED ON THE SLIDER. Once a launch is chosen the two
               instants that matter are the day it leaves and the day it gets
               there, and both were only findable by dragging until the ship
               appeared. This is a band behind the slider between them, so the
               crossing has a visible LENGTH — which is the thing about
               interplanetary flight that surprises people, and the reason a
               window exists at all. Launch page only: nothing else here has a
               departure. */""
          }${launch ? `<span class="sol-flight" id="sol-flight" hidden aria-hidden="true"><span class="sol-flight-bar" id="sol-flight-bar"></span></span>` : ""}
          <input type="range" class="orr-slider" id="sol-slider" min="0" max="525960" step="180" value="0" aria-label="Move through the span" data-sol-inert disabled>
          <span class="sim-ends"><span id="sol-from">—</span><span id="sol-to">—</span></span>
        </p>
        ${/* THE DESTINATION SITS UNDER THE SLIDER, not off in the settings
             column, because it is the question this page asks and everything
             else on it is an answer. It also has to be next to the slider it
             changes: choosing a destination picks a launch window, moves the
             starting date to that day and resizes the span to cover the
             crossing, and all three of those are that slider. */""
        }${launch ? `<div class="sol-destrow">
          <div class="sol-field sol-field-wide">
            <span class="sim-flab" id="sol-tolab">Select a destination</span>
            <div class="sol-zooms" role="group" aria-labelledby="sol-tolab" id="sol-dests">${destButtons()}</div>
          </div>
          <div class="sol-field sol-launchrow" id="sol-launchrow" hidden>
            <label class="sim-flab" for="sol-launch">Launch window</label>
            <select class="sim-span sol-sel" id="sol-launch" aria-label="Which launch window to fly" data-sol-inert disabled></select>
          </div>
          <p class="sol-destlink" id="sol-destlink" hidden></p>
        </div>` : ""}
      </div>
      <div class="sol-panel">
        ${/* WHAT IS LEFT IN THE PANEL is the three things you set and leave: the
             view, the date it starts from, and how much time the slider covers.
             As labelled fields in a grid rather than a single run-on line of
             selects and bare "from" — the line only read as a sentence at the
             one width it happened to fit on, and wrapped into nonsense at every
             other. Each field states what it is above its control, so it reads
             the same at any width. */""
        }<div class="sol-fields">
          ${/* THE SLIDERS COME FIRST, TOGETHER. Per the owner: the timeline
               slider sits at the foot of the stage, so view tilt and speed —
               the other two sliders — follow it directly, one after another,
               before anything else in the panel. Three sliders in a run read
               as one family of controls; split around the zoom buttons they
               read as strays. The zoom ladder follows, then the two date
               fields you set once. */""
          }<div class="sol-sliders">
          <div class="sol-field sol-field-wide sol-tiltfield">
            <label class="sim-flab" for="sol-tilt">View tilt</label>
            <p class="sol-tiltrow">
              <input type="range" class="orr-slider sol-tiltslider" id="sol-tilt" min="0" max="80" step="1" value="${tilt}" aria-label="Tilt the view away from straight down" data-sol-inert disabled>
              <span class="sol-tiltout" id="sol-tiltout">flat</span>
            </p>
          </div>
          ${/* Speed reads out UNDER its slider, exactly as the tilt does above
               it. Beside the slider, "1 year per second" took width from the
               only part of the control you drag, and its own text changes
               length as you drag it, so the slider kept resizing under the
               thumb. Two sliders one above the other now have the same shape,
               which is the point: they are the same kind of control. */""
          }<div class="sol-field sol-field-wide sol-speedfield">
            <label class="sim-flab" for="sol-speed">Speed</label>
            <p class="sol-speedrow">
              <input type="range" class="orr-slider sol-speed" id="sol-speed" min="3" max="90" step="1" value="15" aria-label="How fast the planets move while playing" data-sol-inert disabled>
              <span class="sol-speedout" id="sol-speedout">—</span>
            </p>
          </div>
          </div>
          ${/* THE LADDER AND THE LAYERS. The zoom buttons flow inline and wrap
               with a small, even gap; Include and its two layer chips share one
               line with their label (they are three short words — a line each
               was the single biggest waste on a phone). On a wide panel the
               layers still ride the right end of the ladder's line when they
               fit. The layers are BUTTONS, matching the rungs beside them. */""
          }${/* HOW MUCH OF THE MOON SYSTEM TO DRAW. Ships hidden and stays
               hidden unless the current view is a moon system that HAS more to
               show — Mars and Pluto already draw every moon they have, so
               offering them a "more" button would be offering nothing.
               The labels and the counts are written by the script from the
               same table the picture is drawn from, so a button can never
               promise a number of moons that is not what appears. */""
          }${launch ? "" : `<div class="sol-field sol-field-wide sol-moonfield" id="sol-moonfield" hidden>
            <span class="sim-flab" id="sol-moonlab">Moons shown</span>
            <div class="sol-moons" role="group" aria-labelledby="sol-moonlab" id="sol-moons">
              <button type="button" class="chip sol-moonbtn" data-sol-moons="1" aria-pressed="true" data-sol-inert disabled>Major</button>
              <button type="button" class="chip sol-moonbtn" data-sol-moons="2" aria-pressed="false" data-sol-inert disabled>Regular system</button>
              <button type="button" class="chip sol-moonbtn" data-sol-moons="3" aria-pressed="false" data-sol-inert disabled>Captured too</button>
            </div>
            <p class="sol-moonsout" id="sol-moonsout"></p>
          </div>`}
          ${/* THE ZOOM LADDER IS THE HUB'S CONTROL, AND ONLY THE HUB'S.
               Everywhere else it used to be six links into
               /solar-system-simulator/?zoom=..., sitting in the settings panel
               among that page's own controls — so on Saturn's page they read
               as a zoom control for the picture above them, and pressing one
               silently swapped both the page and the subject. A control that
               navigates has to look like a link and say where it goes; these
               did neither. The hub keeps them as buttons because there they
               genuinely repaint in place, and that ladder is what the hub is
               about. */""
          }${launch || !(hub || layers) ? "" : `<div class="sol-field sol-field-wide sol-zoomfield">
            <span class="sim-flab" id="sol-zoomlab">${hub ? "Planet zoom level" : "Include"}</span>
            <div class="sol-zoomline">
              ${hub ? `<div class="sol-zooms" role="group" aria-labelledby="sol-zoomlab" id="sol-zooms">${zoomButtons(rung)}</div>` : ""}
              <p class="sol-toggles" id="sol-toggles">
                ${hub ? `<span class="sol-toglab" id="sol-toglab">Include:</span>` : ""}
                <button type="button" class="chip sol-togbtn" id="sol-belt" aria-pressed="false" data-sol-inert disabled>Asteroid belt</button>
                <button type="button" class="chip sol-togbtn" id="sol-comets" aria-pressed="false" data-sol-inert disabled>Comets</button>
              </p>
            </div>
          </div>`}
          ${/* the two set-once date fields close the panel, sharing a line */""
          }<div class="sol-field sol-timefield">
            <label class="sim-flab" for="sol-start">Starting date</label>
            <input type="date" class="orr-at" id="sol-start" min="1800-01-01" max="2050-12-31" aria-label="Date the span starts" data-sol-inert disabled>
          </div>
          <div class="sol-field sol-timefield">
            <label class="sim-flab" for="sol-span">The slider covers</label>
            <select class="sim-span" id="sol-span" aria-label="How much time the slider covers" data-sol-inert disabled>${spanOptions}</select>
          </div>
        </div>
        <div class="sim-rows sol-rows" id="sol-rows"></div>
        ${launch ? `<div class="sim-rows sol-rows sol-mission" id="sol-mission"></div>` : ""}
        <p class="sol-note" id="sol-note"></p>
        ${launch ? "" : (hub || layers ? jumpLinks(self)
          : `<p class="sim-jump sol-jump"><a class="chip" href="${SOLAR_PATH}">The whole solar system &rarr;</a></p>`)}
      </div>
    </div>
    <p class="hint">Distances from the sun are in <strong>AU</strong> — one AU is the Earth’s average distance, ${kmSig(PL_AU, 6)} — and the angle is where the body sits around its orbit, measured from the March equinox direction.</p>
  </div>
`;

const head = ({ title, desc, path, ld = "", faq = null }) => `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
${appLd({ name: title, url: `${SITE}${path}`, description: desc })}${ld}
${faq ? faqLd(faq) : ""}
${GA_SNIPPET}`;

/* ONE SCRIPT FILE PER PAGE, holding only that page's modules and its own
   config. `data-name` is the page's own slug, so each gets its own
   content-hashed file under /assets/js/ (cached a year, like the rest) rather
   than the single 129KB bundle every page used to share. The config is inside
   the file now — there is no window.AC_SOL to set, because the file is not
   shared with anyone who would need a different one. */
const script = (jsName, needs, cfg, sim = 1) =>
  `<script data-ac="shared" data-name="sol-${jsName}">${pageJs(needs, cfg, sim)}</script>`;

/* #learn is the anchor the home page's "Educational info" link aims at, and it
   belongs on the FACTS — it was on the card explaining why the zoom ladder is a
   ladder, which is a design note about this page rather than anything about the
   solar system. Only the first facts card on a page takes the id. */
let learnUsed = false;
const factsCard = (title, facts) => `  <div class="card"${learnUsed ? "" : (learnUsed = true, ' id="learn"')}>
    <h2>${esc(title)}</h2>
    <ul class="sol-facts">
${/* the facts carry temperatures in prose; temps() wraps the figures so they
     follow the reader's units and leaves the sentence alone. They are already
     trusted HTML (the data file writes <b> and links into them), so there is
     no escape to do first. */""
  }${facts.map((f) => `      <li>${temps(f)}</li>`).join("\n")}
    </ul>
  </div>
`;
/* The open questions are the point of the exercise, so they are a card of their
 * own rather than a paragraph at the bottom: a page that only states settled
 * facts teaches that science is a list of answers. */
const questionsCard = (qs, what) => `  <div class="card sol-open">
    <h2>What we still don’t know about ${esc(what)}</h2>
    <p class="sub">Every one of these is genuinely unsettled — not simplified for the page, not waiting on a textbook update.</p>
${qs.map((q) => `    <h3>${esc(q.q)}</h3>\n    <p>${q.a}</p>`).join("\n")}
  </div>
`;
const findingsCard = (fs, what) => `  <div class="card">
    <h2>Recently learned about ${esc(what)}</h2>
    <div class="wc-facts">
${fs.map((f) => `      <div class="wc-frow"><span>${esc(f.when)}</span><b>${f.what}</b></div>`).join("\n")}
    </div>
    <p class="hint">Findings reviewed ${esc(FACTS.reviewed === "2026-08" ? "August 2026" : FACTS.reviewed)}. Space science moves; a date on a finding is part of the finding.</p>
  </div>
`;

/* ---- ONE CARD PER MOON WORTH A CARD --------------------------------------
 * The table above these gives every moon its distance, period, size and
 * direction; none of that is repeated here, because all of it is computed and
 * this file holds only what cannot be. A moon gets a card if solar-facts.json
 * has prose for it — which is the honest filter: the ones with something to
 * say get one, and Metis and Adrastea stay in the table where they belong.
 * Each card leads with the figures the table has ALREADY proved against
 * Kepler's third law, so the reader gets them in one place without this file
 * being able to disagree with them.
 * ------------------------------------------------------------------------ */
const moonCards = (idx) => {
  const sys = SAT_SYS[idx];
  if (!sys || !sys.moons.length) return "";
  const M = FACTS.moons || {};
  const cards = sys.moons.map((m) => {
    const r = satRow(m), e = M[r.name];
    if (!e) return "";
    const per = Math.abs(r.period);
    return `  <div class="card sol-moon" id="moon-${r.name.toLowerCase()}">
    <h2>${esc(r.name)}</h2>
    <p class="sub">${esc(e.tagline)}</p>
    <div class="wc-facts sol-moonfacts">
      <div class="wc-frow"><span>Across</span><b>${km(r.dia, r.dia < 100 ? 1 : 0)}</b></div>
      <div class="wc-frow"><span>Distance from ${esc(planetName(idx))}</span><b>${kmSig(r.a, 5)}</b></div>
      <div class="wc-frow"><span>One orbit</span><b>${per < 1 ? `${(per * 24).toFixed(1)} hours` : `${num(per, per < 10 ? 2 : 1)} days`}${r.retrograde ? " — backwards" : ""}</b></div>
      <div class="wc-frow"><span>Found</span><b>${esc(e.found)}</b></div>
    </div>
${e.facts ? `    <ul class="sol-facts">\n${e.facts.map((x) => `      <li>${x}</li>`).join("\n")}\n    </ul>` : ""}
${e.questions ? `    <h3>Still unsettled</h3>\n${e.questions.map((q) => `    <p>${q}</p>`).join("\n")}` : ""}
  </div>
`;
  }).filter(Boolean).join("");
  if (!cards) return "";
  return `  <div class="card sol-moonlead">
    <h2>The moons of ${esc(planetName(idx))}, one at a time</h2>
    <p>The table above has every figure — how far out, how long a lap takes, how wide. What follows is what those figures cannot tell you: what each one is actually like, who found it and when, and what is still argued about it.</p>
  </div>
${cards}`;
};

/* ---- the moon table for one planet -------------------------------------- */
const moonsCard = (idx) => {
  const sys = SAT_SYS[idx];
  if (!sys || !sys.moons.length) return "";
  const name = planetName(idx), st = bodyStats(idx);
  const rows = sys.moons.map((m) => {
    const r = satRow(m), per = Math.abs(r.period);
    return `        <tr><th>${esc(r.name)}</th><td>${kmSig(r.a, 5)}</td><td>${per < 1 ? `${(per * 24).toFixed(1)} h` : `${num(per, per < 10 ? 2 : 1)} d`}${r.retrograde ? " ↺" : ""}</td><td>${km(r.dia, r.dia < 100 ? 1 : 0)}</td><td>${esc(r.note)}</td></tr>`;
  }).join("\n");
  return `  <div class="card">
    <h2>The moons of ${esc(name)}</h2>
    <p>${esc(name)} has <strong>${num(st.moons)} confirmed moons</strong>${st.moons > st.drawn ? `, of which the ${num(st.drawn)} below are large enough to be worth drawing. The rest are mostly a few kilometres of captured rubble on distant, tilted orbits` : ""}. Every distance and period here is real, and they are not independent: each pair has to satisfy Kepler’s third law against ${esc(name)}’s mass, which is how this table is checked rather than trusted.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Moon</th><th>Distance</th><th>Orbit</th><th>Width</th><th></th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="hint">↺ marks a moon going round backwards. This system is the picture at the top of this page — press Play and watch these periods run.</p>
  </div>
`;
};

/* ---- physical data, all of it derived ----------------------------------- */
const statsCard = (idx, b) => {
  const s = bodyStats(idx);
  const day = Math.abs(s.dayHours);
  const dayWord = day > 48 ? `${num(day / 24, 1)} Earth days` : `${num(day, 2)} hours`;
  const rows = [
    ["Width", `${kmSig(s.dia, 5)} — ${num(s.diaEarth, 2)}× Earth`],
    ["Mass", `${s.mass.toExponential(3).replace("e+", " × 10^")} kg — ${s.massEarth < 1 ? `${num(s.massEarth, 3)}× Earth` : `${num(s.massEarth, 1)}× Earth`}`],
    ["Surface gravity", `${num(s.gravity, 2)} m/s² — ${num(s.gravityEarth, 2)}× Earth`],
    ["Day", `${dayWord}${s.retrogradeSpin ? " (backwards)" : ""}`],
    ["Year", s.yearYears < 2 ? `${num(s.yearDays, 1)} Earth days` : `${num(s.yearYears, 2)} Earth years`],
    ["Distance from the sun", `${num(s.axisAU, 3)} AU on average — ${num(s.perihelion, 2)} to ${num(s.aphelion, 2)} AU`],
    ["Sunlight takes", lightTime(s.axisAU)],
    ["Axial tilt", b.tilt],
    ["Temperature", temps(esc(b.temp))],
    ["Moons", s.moons === 0 ? "None" : num(s.moons)],
    ["Atmosphere", b.atmos],
  ];
  return `  <div class="card">
    <h2>${esc(b.name)} by the numbers</h2>
    <div class="wc-facts">
${rows.map(([k, v]) => `      <div class="wc-frow"><span>${esc(k)}</span><b>${v}</b></div>`).join("\n")}
    </div>
    <p class="hint">The mass is worked out from ${esc(b.name)}’s gravitational parameter and the gravity from that and its radius; the year comes from Kepler’s third law and the width is the same figure the simulator draws with. None of them is typed in beside the picture, so none of them can disagree with it.</p>
  </div>
`;
};

/* ---- closest approach, and how far light has to go ----------------------- */
const closeCard = (idx) => {
  const name = planetName(idx);
  const list = closestApproaches(idx, +NOW, 4);
  if (!list.length) return "";
  /* NO data-sol-zoom2 HERE. The date link used to change the RUNG as well, so
     clicking a closest approach on Saturn's page threw the picture from
     Saturn's moon system out to a heliocentric frame — the same jarring
     "same tool, different subject" move the zoom links made. It moves the
     date and nothing else now; the href is the no-JS fallback and goes to the
     hub, which is a different page and looks like one. */
  const rows = list.map((c) => `      <div class="wc-frow"><span><a href="${SOLAR_PATH}?date=${c.when.toISOString().slice(0, 10)}" data-sol-date="${c.when.toISOString().slice(0, 10)}">${esc(dateLong(c.when))}</a></span><b>${num(c.au, 3)} AU — light takes ${lightTime(c.au)}</b></div>`).join("\n");
  const spread = list.map((c) => c.au);
  return `  <div class="card">
    <h2>When Earth and ${esc(name)} are next closest</h2>
    <p>Both planets are moving, so the gap between them swings enormously — and the closest approaches are not all equal, because the orbits are ellipses rather than circles. These are the next four, solved from the orbits rather than looked up${Math.max(...spread) / Math.min(...spread) > 1.2 ? `, and the widest is ${num(Math.max(...spread) / Math.min(...spread), 1)}× the distance of the closest` : ""}.</p>
    <div class="wc-facts">
${rows}
    </div>
    <p class="hint">Click a date to take the simulator there. These are minimum-distance moments, which fall near — but not exactly on — opposition.</p>
  </div>
`;
};

/* ---- launch window ------------------------------------------------------- */
const windowCard = (idx) => {
  const name = planetName(idx);
  const w = launchWindow(idx, +NOW);
  if (!w) return "";
  const c = transferCost(idx, w);
  const w2 = launchWindow(idx, +w.depart + 30 * 86400000);
  return `  <div class="card sol-mission-card">
    <h2>Flying to ${esc(name)}: when to leave</h2>
    <p>A rocket cannot point at ${esc(name)} and fire. It has to leave Earth on an orbit around the <em>sun</em> whose far side touches ${esc(name)}’s orbit — half an ellipse — and it has to leave at the moment when ${esc(name)} will have arrived at that far side by the time the ship gets there. That is what a launch window is, and it is why they come round only every ${num((w2.depart - w.depart) / 86400000 / 30.4369, 1)} months.</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Next window opens</span><b><a href="${LAUNCH_PATH}?date=${w.depart.toISOString().slice(0, 10)}&to=${idx}" data-sol-date="${w.depart.toISOString().slice(0, 10)}" data-sol-target="${idx}">${esc(dateLong(w.depart))}</a></b></div>
      <div class="wc-frow"><span>Arrives</span><b>${esc(dateLong(w.arrive))}</b></div>
      <div class="wc-frow"><span>Flight time</span><b>${num(w.flightDays)} days — ${num(w.flightDays / 365.25, 1)} years</b></div>
      <div class="wc-frow"><span>Speed change to leave Earth’s orbit round the sun</span><b>${kmPerS(c.dv1)}</b></div>
      <div class="wc-frow"><span>The burn itself, from a low Earth orbit</span><b>${kmPerS(c.injection)}</b></div>
      <div class="wc-frow"><span>Slowing down to stay at ${esc(name)}</span><b>${kmPerS(Math.abs(c.dv2))}</b></div>
      <div class="wc-frow"><span>The window after that</span><b>${esc(dateLong(w2.depart))}</b></div>
    </div>
    <p class="hint">Set <strong>Launch to: ${esc(name)}</strong> on <a href="${LAUNCH_PATH}">the rocket launches page</a> to see the ellipse, where ${esc(name)} is on launch day, and where it will be on arrival. Click the date to fly it.</p>
  </div>
`;
};

/* ---- the shared honesty note about the transfer model -------------------- */
const TRANSFER_NOTE = `  <div class="card">
    <h2>What the flight path is, and is not</h2>
    <p>It is a <strong>minimum-energy transfer</strong>: the cheapest possible path, half an ellipse with Earth’s orbit at one end and the target’s at the other, solved against where the planets really are — so the arrival lands on the planet’s real distance from the sun and its real position on the day it gets there, not on a circle standing in for its orbit.</p>
    <p>It is <strong>not</strong> a mission plan, and three things are left out on purpose. The orbits are treated as flat, so the real inclinations — Mars is tilted 1.85°, Jupiter 1.3° — cost a plane change this ignores. Real missions trade fuel for a faster arrival, so they leave within days or weeks of these dates rather than exactly on them. And anything going past Jupiter usually steals speed from a planet on the way instead of buying it with fuel, which changes both the date and the path.</p>
    <p>What it gets right is the thing worth teaching: <em>why</em> the window exists, why it comes round on the cadence it does, and why the cost of the trip is set by where two planets happen to be rather than by how far apart they are.</p>
  </div>
`;

/* ---------------------------------------------------------------------------
 * FAQ (hub)
 * ------------------------------------------------------------------------- */
const outerRung = SYS_RUNGS[SYS_RUNGS.length - 1], innerRung = SYS_RUNGS[0];
const FAQ = [
  ["Why does the view jump between zoom levels instead of scrolling smoothly?",
    `Because the solar system will not fit in one frame. Out to Mars the outermost orbit is only about ${ratio(innerRung).toFixed(0)} times the innermost, and everything is separable. Out to Saturn it is ${ratio(SYS_RUNGS[3]).toFixed(0)} times and the inner four are a tight knot. Out to Neptune it is ${ratio(outerRung).toFixed(0)} times: Mercury's whole orbit is ${orbitPx(0, outerRung.outer).toFixed(1)} pixels across and Earth's is ${orbitPx(2, outerRung.outer).toFixed(0)}. Each rung of the ladder is a view where something is legible; a smooth zoom would just pass through a lot of frames where nothing is.`],
  ["Can I see the moons of the other planets?",
    "Yes — each of the five planets that has large moons gets a view of its own, where the frame is the moon system rather than the solar system. The orbits, the periods, the sizes and the direction of travel are all real, and the planet's own disc is to scale against them. What is not solved for is where each moon sits on its orbit at a given moment, and the picture says so: watch Io lap Europa twice while Europa laps Ganymede twice, which is a real resonance, rather than reading it as tonight's sky."],
  ["Are the planets drawn to scale?",
    `The ORBITS are, within each view. The planets themselves cannot be: at the Saturn view, Jupiter — the largest planet — would be ${bodyPx("Jupiter", SYS_RUNGS[3].outer).toFixed(3)} of a pixel across, and Earth ${bodyPx("Earth", SYS_RUNGS[3].outer).toFixed(4)}. So the dots are legibility sizes, not measurements. The exception is the Earth and Moon view, which is to scale in both size and distance at once.`],
  ["When is the next launch window to Mars?",
    `Every launch window on this site is solved from the orbits when the page loads, not written into it — the answer for Mars right now is ${dateLong(launchWindow(3, +NOW).depart)}, with an arrival ${num(launchWindow(3, +NOW).flightDays)} days later. Windows to Mars come round roughly every 26 months, because that is how long it takes Earth to lap Mars and line the two orbits up again.`],
  ["Where is the asteroid belt, and why does it have gaps?",
    `Between Mars and Jupiter, from about ${beltEdges()[0].toFixed(2)} to ${beltEdges()[1].toFixed(2)} AU. The gaps are Jupiter's doing: an asteroid whose orbital period is a simple fraction of Jupiter's gets the same tug at the same point over and over until it is pushed out. This page computes every edge and every gap from Jupiter's own orbit rather than drawing them from a remembered number, which is why they land on the Kirkwood gaps at ${resonanceAU(3, 1).toFixed(2)}, ${resonanceAU(5, 2).toFixed(2)} and ${resonanceAU(7, 3).toFixed(2)} AU.`],
  ["How accurate are the positions?",
    "The planets come from Keplerian elements with per-century rates — the standard approximate-positions method — good to a few arcminutes over 1800–2050 — JPL's own stated maxima run to about ten arcminutes for Jupiter and Saturn, which is still around one pixel at the widest zoom here. The date picker stops at 2050 for that reason: past it the linear rates are being extrapolated.  The comets are published osculating elements propagated as a two-body orbit, which is right about where in the system a comet is and not right to the day: a real comet is pulled about by the planets and shoved by its own outgassing. None of this is an ephemeris."],
  ["Can I share a particular date?",
    "Yes. The date, the zoom level, the span, the speed, the belt and comet layers and any flight path are all in the address bar, so copying the URL shares exactly what is on screen, and the builder near the bottom writes one for you."],
];

/* ---------------------------------------------------------------------------
 * The hub
 * ------------------------------------------------------------------------- */
const howItWorksCard = () => `  <div class="card" id="how">
    <h2>What this is, and how it works</h2>
    <p>This is a working model of the solar system. The planets sit on their real orbits, moving at their real relative speeds — Mercury really does lap everyone; Neptune really does barely move in a lifetime.</p>
    <p><strong>Span</strong> is how much time the slider covers: a month, a year, a decade or a century. <strong>Speed</strong> is how fast that time plays. <strong>Zoom</strong> climbs a ladder of views, because the whole system will not fit in one frame. <strong>Now</strong> jumps back to this moment. <strong>Tilt</strong> tips the view so the orbits look like ellipses instead of circles. Switch on the asteroid belt, the comets, and a flight path to Mars when you want them.</p>
    <p>The orbits are to scale within each zoom. The planet dots are not — they would be smaller than a pixel. The ladder card below says by how much, computed from the drawing itself.</p>
  </div>
`;

const bodyLinks = () => `  <div class="card">
    <h2>A page for every planet</h2>
    <p>Each one carries its own moon system, its physical figures worked out from its mass rather than copied in, the open questions about it, and what has been learned lately. <a href="${PLANETS_PATH}">The planets</a> is the way in if you would rather see them side by side first — a picture and a couple of paragraphs each, in orbital order.</p>
    <div class="chips">
      <a class="chip chip-alt" href="${PLANETS_PATH}">All the planets</a>
${FACTS.bodies.map((b) => `      <a class="chip" href="${planetPath(b.slug, b.idx)}">${esc(b.name)}</a>`).join("\n")}
${FACTS.extras.map((b) => `      <a class="chip" href="${SOLAR_PATH}${b.slug}/">${esc(b.name)}</a>`).join("\n")}
      <a class="chip chip-alt" href="${LAUNCH_PATH}">Rocket launches</a>
    </div>
  </div>
`;

const ladderCard = () => `  <div class="card sim-teach">
    <h2>Why the view climbs a ladder instead of zooming smoothly</h2>
    <p>The solar system does not fit in one frame, and the reason is a ratio. What decides whether you can see anything is how many times bigger the outermost drawn orbit is than the innermost one:</p>
    <div class="wc-facts">
${SYS_RUNGS.map((r) => `      <div class="wc-frow"><span>${esc(r.label)}</span><b>${ratio(r).toFixed(0)}:1 — Mercury’s orbit ${orbitPx(0, r.outer).toFixed(orbitPx(0, r.outer) < 10 ? 1 : 0)} px across${r.outer > 9 ? ", the inner four a knot" : ""}</b></div>`).join("\n")}
    </div>
    <p>So each rung is a view where something is legible, rather than a smooth zoom that spends most of its travel in frames where nothing is. The outermost rung keeps the inner four as a labelled knot on purpose — that <em>is</em> the shape of the solar system, and it is the part every evenly-spaced textbook diagram hides.</p>

    <h3>Why the frame is square</h3>
    <p>Everything drawn here is a set of concentric circles, and a circle in a widescreen frame is limited by the short side — the corners hold nothing. A page column sets the WIDTH, so the honest comparison is a 16:9 frame of the same width: squaring it buys about <strong>${Math.round((FRAME_R / WIDE_R - 1) * 100)}% more drawing radius</strong>, which on the outer rung is the difference between Mercury’s orbit being ${(orbitPx(0, outerRung.outer) * WIDE_R / FRAME_R).toFixed(1)} pixels wide and ${orbitPx(0, outerRung.outer).toFixed(1)}.</p>

    <h3>What is to scale here, and what is not</h3>
    <p>The <strong>orbits</strong> are to scale within each view. The <strong>planets</strong> are not, and cannot be: at the Saturn view Jupiter would be <strong>${bodyPx("Jupiter", SYS_RUNGS[3].outer).toFixed(3)} of a pixel</strong> across and Earth <strong>${bodyPx("Earth", SYS_RUNGS[3].outer).toFixed(4)}</strong>. The dots are sized to be seen, not measured.</p>
    <p>The one exception is <strong>Earth &amp; the Moon</strong>, and it is worth looking at for that reason alone: it is the only view on this site that is to scale in size <em>and</em> distance at the same time. The moon really does sit about 30 Earth-diameters away — far further than almost every diagram draws it, and close enough to fit on a screen.</p>
    <p>On a <strong>moon system</strong> view, the planet’s own disc <em>is</em> to scale against its moons’ orbits — so Saturn’s rings really are that wide compared with Titan’s orbit, and Phobos really is that close to Mars. The moons themselves are drawn oversize by a factor the picture prints, because at the zoom where Callisto’s orbit fills the frame, Ganymede is half a pixel across.</p>

    <h3>How far anything actually gets</h3>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Span</th><th>Mercury</th><th>Earth</th><th>Jupiter</th><th>Saturn</th><th>Neptune</th></tr></thead>
        <tbody>
${SPANS.map(([, label, days]) => `      <tr><th>${esc(label)}</th>${[0, 2, 4, 5, 7].map((i) => `<td>${travelWords(i, days)}</td>`).join("")}</tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p class="hint">Which is why the zoom, the span and the speed belong together. A month is the right span for Mercury and means nothing for Neptune; a century sends Mercury round ${travelWords(0, 36525)} — an unreadable blur — while Neptune still has not finished a single lap, because one Neptune year is ${num(planetPeriodDays(7) / 365.25, 0)} of ours. The speed slider is there so you can slow a century down until the outer planets separate, or run a month fast enough to see Mercury move.</p>
  </div>
`;

const shareCard = (path = SOLAR_PATH) => `  <div class="card">
    <h2>Make a link to a particular view</h2>
    <p>The date, the zoom, the span, the speed, the layers and any flight path are all in the address bar, so copying the URL shares exactly what is on screen. Set it up above, then take the link — it is the quickest way to hand a class one specific thing to look at.</p>
    <p class="sim-urlrow">
      <input type="text" id="sol-url" class="sim-url" readonly aria-label="Link to this view" value="${esc(SITE + path)}">
      <button type="button" class="chip chip-alt" id="sol-copy" data-sol-inert disabled>Copy link</button>
    </p>
    <p class="sim-sum" id="sol-sum"></p>
  </div>
`;

const elsewhereCard = (extra = "") => `  <div class="card">
    <h2>The other simulator</h2>
    <p>This one is about the whole system. If the question is where the sun and the moon are <em>from where you are standing</em> — what time the sun comes up, why tonight's moon is the shape it is — that is the <a href="${SIM_PATH}">Sun, Earth &amp; Moon movement simulator</a>, which has a page for every city and a slider over a day, a week or a month. Between the two is <a href="${SYS_PATH}">the three bodies moving together</a> — Earth going round the sun, the moon going round the Earth, on one screen and openly not to scale, keeping only the real ratio between the two periods.</p>
    <p>And for <em>why</em> any of it stays up: the <a href="/orbital-velocity-simulator/">orbital velocity simulator</a> takes one planet and lets you set its distance and its sideways speed by hand, so you can watch the balance that holds every orbit here — and break it, into an ellipse, an escape, or a fall into the sun.</p>
    <p class="hint">${extra}Also: <a href="/classroom/">the classroom guide</a> · <a href="/sun/">sunrise &amp; sunset by city</a> · <a href="/moon/">moon phase &amp; moonrise</a> · <a href="/moon/eclipses/">lunar eclipses</a> · <a href="/methodology/moon-phase/">how the positions are worked out</a></p>
  </div>
`;

const faqCard = (faq, heading) => `  <div class="card tool-about">
    <h2>${esc(heading)}</h2>
    ${faq.map(([q, a]) => `<p><strong>${esc(q)}</strong> ${esc(a)}</p>`).join("\n    ")}
  </div>
`;

/* THE TREE THIS FAMILY HANGS FROM: Home / Planets / <this page>. /planets/ is
   the section hub — the page whose subject is the planets themselves — and the
   simulator is one of its children rather than the other way round. One
   function so the visible crumb and the JSON-LD are built from one array. */
const solarTrail = (name, url) => [...CRUMB_ROOT, { name, url }];
const HUB_TRAIL = solarTrail("Solar system simulator", SOLAR_HUB);
const LAUNCH_TRAIL = solarTrail("Rocket launch simulator", LAUNCH_NEW);
const trailLd = (trail) => `\n<script type="application/ld+json">${breadcrumbLD(SITE, trail)}</script>`;

/* crumb defaults to /solar; /rocket-launches/ is a page of its own outside this
   family and passes its own. */
/* `trail` is the visible breadcrumb, drawn under the H1 — Home / Planets /
   Jupiter. It is passed as data rather than markup because the SAME array
   becomes the BreadcrumbList JSON-LD (see solarTrail below), and a visible
   trail that disagrees with the structured one is worse than neither. */
const page = ({ title, desc, path, crumbPage, crumb, trail = null, ld, faq, h1, sub, cards, cfg, jsName, needs, sim = 1 }) => `<!DOCTYPE html>
<html lang="en">
<head>
${head({ title, desc, path, ld, faq })}
</head>
<body>
<div class="wrap wrap-wide">
  ${brand(crumbPage ? { crumb: crumb || { slug: "solar", url: SOLAR_PATH }, page: crumbPage } : { crumb: crumb || { slug: "solar", url: SOLAR_PATH } })}
  <h1>${h1}</h1>
${trail ? solarCrumbs(trail) : ""}  <p class="sub">${sub}</p>

${cards}  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
${(sim ? assertNeeds(path, cfg.rung, needs) : 0, script(jsName, needs, cfg, sim))}
</body>
</html>
`;

function buildHub() {
  const html = page({
    title: `${TITLE} — Planets, Moons, Comets & Launch Windows`,
    desc: "An interactive solar system: watch the planets on their real orbits, zoom in on Jupiter's moons or Saturn's rings, switch on the asteroid belt and the comets, and see when the next launch window to Mars opens. Free, runs in your browser.",
    path: SOLAR_PATH,
    trail: HUB_TRAIL,
    ld: `${trailLd(HUB_TRAIL)}\n${learningLd({ name: TITLE, url: `${SITE}${SOLAR_PATH}`, description: "An interactive model of the solar system: the planets on their real orbits, their moons, the asteroid belt, the comets and the launch windows between them." })}`,
    faq: FAQ,
    h1: "Solar System Simulator",
    sub: `The planets on their real orbits, moving. Drag through a <strong>month</strong>, a <strong>year</strong>, a <strong>decade</strong> or a <strong>century</strong>; zoom from Jupiter’s moons all the way out to Neptune; switch on the asteroid belt, the comets, and the flight path to Mars.`,
    cards: viewLadder("solar") + simCard("inner", 0, SOLAR_PATH, 1) + howItWorksCard() + hubQuestionsCard(SOLAR_PATH) + bodyLinks() + windowCard(PLANET.MARS) + TRANSFER_NOTE + ladderCard()
      + shareCard(SOLAR_PATH) + elsewhereCard(),
    cfg: { rung: "inner", path: SOLAR_PATH },
    /* the one page that keeps every module — its ladder climbs every rung in
       place, which is the whole point of it */
    jsName: "hub", needs: HUB_NEEDS,
  });
  writePage(SOLAR_PATH, html);
}

/* ---------------------------------------------------------------------------
 * One planet
 * ------------------------------------------------------------------------- */
/* ---- THE PLANET ITSELF, TURNING -------------------------------------------
 * The page is about the planet and its picture was about everything else: the
 * moon system for the ones with moons, and for Mercury and Venus a fall-back to
 * the inner-planets view, where they are a two-pixel dot among three others.
 * This card is the body alone, on its own axis, at its own rotation rate.
 * The rate is SPED UP and the read-out says by how much — an honest real-time
 * Venus would turn a degree an hour and look like a photograph. Everything the
 * speed-up does not touch is real: the direction (Venus and Uranus turn the
 * other way), the tilt, and the ratio between one planet's day and another's. */
const globeCard = (b) => {
  const idx = b.idx, nm = b.name;
  const rot = satRotation(idx) || 24, hrs = Math.abs(rot);
  const retro = rot < 0;
  const days = hrs / 24, yr = planetPeriodDays(idx);
  /* one drawn turn every 12 seconds, whatever the planet — so the picture is
     always worth watching — and the FIGURE beside it says what that stands for */
  const secPerTurn = 12;
  return `  <div class="card sol-globecard">
    <h2>${esc(nm)} on its axis</h2>
    <div class="sol-globewrap">
      <div class="sol-globe" id="pl-globe" data-hours="${hrs}" data-retro="${retro ? 1 : 0}" data-name="${esc(nm)}" data-sec="${secPerTurn}">
        <svg viewBox="0 0 400 400" width="100%" aria-hidden="true"><rect width="400" height="400" rx="16" fill="#080d1a"/>${globeSvg(nm, +NOW, 200, 200, globeRadius(nm, 192), rot, 0.9)}</svg>
      </div>
      <div class="sol-globefacts">
        <div class="sun-srow sun-main"><span>One turn takes</span><b>${hrs < 48 ? `${hrs.toFixed(1)} hours` : `${days.toFixed(1)} days`}${retro ? " · backwards" : ""}</b></div>
        <div class="sun-srow"><span>Axis tilted</span><b>${(PL_OBL[nm] ?? 0).toFixed(2)}°</b></div>
        <div class="sun-srow"><span>Its year</span><b>${yr < 1000 ? `${Math.round(yr)} days` : `${(yr / 365.256).toFixed(1)} Earth years`}</b></div>
        ${/* TURNS, not "days". These are SIDEREAL rotations — Mercury makes 1.5 of
             them in a year, which is the 3:2 resonance and the reason its
             sun-to-sun day is 176 days, two of its years. Calling the figure
             "days" would have it read as the second thing while being the
             first. Venus's 0.9 is the one worth stopping on: it turns less than
             once per orbit, so its year is shorter than its day. */""
        }<div class="sun-srow"><span>Turns per year</span><b>${(yr * 24 / hrs).toFixed(1)}</b></div>
      </div>
    </div>
    <p class="hint">Turning here at one rotation every ${secPerTurn} seconds, which is ${nm === "Jupiter" ? "about 3,000" : Math.round(hrs * 3600 / secPerTurn).toLocaleString("en-US")} times real speed. What is not sped up: which way it turns${retro ? " — backwards, and that is real" : ""}, how far the axis leans, and how its day compares with every other planet's. ${globeCaption(nm)}</p>
  </div>
`;
};

/* WHAT A MOONLESS PLANET GETS INSTEAD OF A SIMULATOR: the two links the
   simulator was standing in for, said plainly. It sits directly under the
   globe, where the picture used to be, so the route onward is in the same
   place on every planet page. */
const systemLink = (name) => `  <div class="card sol-syslink">
    <p>${esc(name)} has no moons, so there is no system of its own to watch here — the globe above is the planet itself, turning at its real rate. To see where it is in the solar system today, and how fast it goes round compared with everything else:</p>
    <p class="sim-jump sol-jump">
      <a class="chip chip-alt" href="${SOLAR_PATH}">${esc(name)} in the solar system simulator &rarr;</a>
      <a class="chip" href="${PLANETS_PATH}">All the planets</a>
    </p>
  </div>
`;

function buildBody(b, prev, next) {
  const idx = b.idx, name = b.name, path = planetPath(b.slug, idx);
  const s = bodyStats(idx);
  const sys = SAT_SYS[idx];
  /* DOES THIS PLANET HAVE A VIEW OF ITS OWN?
     Earth does (it and the moon, to scale in both size and distance) and so
     does every planet with moons (its own system, drawn from real orbits).
     Mercury and Venus do not, and what they used to be given was the
     inner-planets view — the solar system simulator, on a page about one
     planet, showing it as one dot among four. That is a picture of something
     else, and it dragged the entire drawing engine onto the page to say it.
     Those two now carry the turning globe at the top and a link to the
     simulator, and nothing in between. */
  const hasSim = idx === PLANET.EARTH || moonCount(idx) > 0;
  /* EARTH'S OWN VIEW IS THE EARTH-AND-MOON ONE, which is called "moon" and not
     "earth-moons" — so this used to fall through to the inner-planets view. */
  const rung = idx === PLANET.EARTH ? "moon" : `${b.slug}-moons`;
  const faq = b.questions.map((q) => [q.q, q.a.replace(/<[^>]+>/g, "")]);
  const isTarget = TR_TARGETS.some(([i]) => i === idx);
  /* Earth's page opens nearly edge-on: its view is the Earth-and-Moon pair, and
     the one thing worth seeing there is the moon's separation, which a
     top-down view foreshortens to nothing. Everyone else takes the default.
     The SAME value goes to the baked figure, the slider and the client cfg. */
  const pageTilt = idx === PLANET.EARTH ? 80 : TILT_DEF;
  /* the planet first, then the system it sits in the middle of */
  const cards = globeCard(b)
    + (hasSim ? simCard(rung, 0, path, 0, pageTilt) : systemLink(name))
    + hubQuestionsCard(path)
    + statsCard(idx, b)
    + moonsCard(idx)
    + moonCards(idx)
    + (idx !== PLANET.EARTH ? closeCard(idx) : "")
    + (isTarget ? windowCard(idx) + TRANSFER_NOTE : "")
    + factsCard(`${name}: things worth knowing`, b.facts)
    + questionsCard(b.questions, name)
    + findingsCard(b.findings, name)
    + `  <div class="card">
    <h2>The rest of the system</h2>
    <p>${prev ? `Inward: <a href="${planetPath(prev.slug, prev.idx)}">${esc(prev.name)}</a>. ` : ""}${next ? `Outward: <a href="${planetPath(next.slug, next.idx)}">${esc(next.name)}</a>. ` : ""}Or step out: <a href="${PLANETS_PATH}">all the planets</a>, a picture and a paragraph each, and the <a href="${SOLAR_PATH}">solar system simulator</a>, where every orbit runs at once.</p>
    <div class="chips">
${FACTS.bodies.filter((x) => x.slug !== b.slug).map((x) => `      <a class="chip" href="${planetPath(x.slug, x.idx)}">${esc(x.name)}</a>`).join("\n")}
${FACTS.extras.map((x) => `      <a class="chip" href="${SOLAR_PATH}${x.slug}/">${esc(x.name)}</a>`).join("\n")}
    </div>
  </div>
`
    + (hasSim ? shareCard(path) : "") + elsewhereCard() + faqCard(faq, `${name}: questions without settled answers`);

  /* THE TITLE NAMES WHAT IS ON THE PAGE. /jupiter-and-moons-simulator/ is a
     simulator of Jupiter and its moons, so the title says so — and a title
     offering moons Mercury does not have is the one thing this page must not
     do. The two moonless planets no longer carry a simulator at all, so they
     no longer claim one either: what they have is the planet itself, turning.
     The URL keeps its -simulator suffix — those two pages are indexed at it,
     and a rename would cost that for a word. */
  const nMoons = moonCount(idx);
  const simTitle = idx === PLANET.EARTH ? "Earth & the Moon Simulator"
    : nMoons ? `${name} & Its Moons Simulator`
    : `${name}`;

  const html = page({
    /* raw "&" — head() escapes. See check-pages.mjs's double-escape gate. */
    title: `${simTitle} — Orbit, Facts & What We Still Don’t Know`,
    desc: hasSim
      ? `Watch ${name} on its real orbit${nMoons ? `, zoom in on its ${num(s.drawn)} largest moons` : ""}, and see its size, mass, day, year and temperature worked out rather than copied — plus the questions about ${name} that science has not answered.`
      : `Watch ${name} turn on its axis at its real rate, and see its size, mass, day, year and temperature worked out rather than copied — plus the questions about ${name} that science has not answered.`,
    path,
    trail: solarTrail(name, path),
    ld: trailLd(solarTrail(name, path)),
    faq,
    crumbPage: { label: b.slug, url: path },
    h1: `${name}`,
    sub: hasSim
      ? `${esc(b.tagline)} Where it is right now, how big and how heavy, ${nMoons ? "what goes round it, " : ""}and what is still unexplained.`
      : `${esc(b.tagline)} The planet itself, turning at its real rate — how big and how heavy, how long its day and its year, and what is still unexplained.`,
    cards,
    cfg: hasSim ? { rung, path, tilt: pageTilt } : { path },
    sim: hasSim ? 1 : 0,
    /* globe always (the planet's own turning sphere leads the page); the lunar
       solver only for Earth's own view; the satellite module only where there
       are moons to draw; the transfer solver only on the three the rocket
       pages fly to, which show a launch-window card */
    /* THE SCRIPT IS NAMED FOR WHAT IS IN IT. A page with no simulator ships
       exactly the globe animator, and that file is byte-identical for every
       such planet — so they share one name and therefore one cached file,
       rather than two copies under two planet names. */
    jsName: hasSim ? b.slug : "globe-only",
    /* a page with no simulator ships the globe and nothing else — no orbits,
       no rungs, no share builder */
    needs: (hasSim ? ["core", "globe"] : ["globe"])
      .concat(idx === PLANET.EARTH ? ["moon"] : [])
      .concat(nMoons ? ["sat"] : [])
      .concat(hasSim && isTarget ? ["transfer"] : []),
  });
  writePage(path, html);
}

/* ---------------------------------------------------------------------------
 * The asteroid belt and the comets
 * ------------------------------------------------------------------------- */
function buildBelt(b) {
  const path = `${SOLAR_PATH}${b.slug}/`;
  const [inner, outer] = beltEdges();
  /* DERIVED, like everything else on this page. Circular speed at a distance is
     sqrt(GM/r); the period follows from Kepler; the fall time is the degenerate
     ellipse — half the period of an orbit with a = r/2, which is
     (pi/2)*sqrt(r^3/2GM). Two inputs only: the sun's GM (the same one the
     launch-window solver uses) and the belt's edges (computed from Jupiter's
     orbit), so no figure here can drift from the picture above it. */
  const vCircAt = (au) => Math.sqrt(TR_GM_SUN / (au * PL_AU));
  const yearsAt = (au) => Math.pow(au, 1.5);
  const beltVIn = vCircAt(inner), beltVOut = vCircAt(outer), beltVEarth = vCircAt(1);
  const beltTIn = yearsAt(inner), beltTOut = yearsAt(outer);
  const beltFall = Math.round(Math.PI / 2 * Math.sqrt(Math.pow(inner * PL_AU, 3) / (2 * TR_GM_SUN)) / 86400);
  const gapRows = [[4, 1, "The inner edge"], [3, 1, "Kirkwood gap"], [5, 2, "Kirkwood gap"], [7, 3, "Kirkwood gap"],
                   [2, 1, "The outer edge"], [3, 2, "The Hilda group sits here"], [1, 1, "The Trojans, 60° ahead of and behind Jupiter"]]
    .map(([p, q, what]) => `        <tr><th>${p}:${q}</th><td>${resonanceAU(p, q).toFixed(3)} AU</td><td>${esc(what)}</td></tr>`).join("\n");
  const bigRows = SM_BIG.map(([n, a, d, note]) =>
    `        <tr><th>${esc(n)}</th><td>${a.toFixed(3)} AU</td><td>${kmSig(d, 3)}</td><td>${esc(note)}</td></tr>`).join("\n");
  const faq = b.questions.map((q) => [q.q, q.a.replace(/<[^>]+>/g, "")]);
  const cards = simCard("belt", 0, path, 0, TILT_DEF, 1)
    + `  <div class="card">
    <h2>Where the belt is, and where its gaps are</h2>
    <p>The main belt runs from about <strong>${inner.toFixed(2)} AU to ${outer.toFixed(2)} AU</strong> — between Mars and Jupiter — and it is not evenly filled. Every edge and every clean lane in it is a resonance with Jupiter: an asteroid whose orbital period is a simple fraction of Jupiter’s year gets the same gravitational tug at the same point over and over, and is eventually pushed somewhere else.</p>
    <p>That means the whole structure can be <em>calculated</em> rather than remembered. A body in a p:q resonance orbits at Jupiter’s distance times (q/p)<sup>2/3</sup>, and the table below is that formula applied to Jupiter’s own semi-major axis — the same number the simulator draws Jupiter with. Change one and the other moves.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Resonance</th><th>Distance</th><th>What is there</th></tr></thead>
        <tbody>
${gapRows}
        </tbody>
      </table>
    </div>
    <p class="hint">The belt is already switched on in the picture above — jump to the belt or the Jupiter view to see it drawn, gaps and all. The Trojan clouds move with Jupiter, so they are wherever Jupiter is on the date you have chosen.</p>
  </div>
`
    + `  <div class="card">
    <h2>Why the belt doesn’t fall into the sun</h2>
    <p>The sun pulls on every asteroid in the belt, hard, without a break, and has done for four and a half billion years. Nothing holds them up. What keeps them out there is the same thing that keeps a planet out there: <strong>they are moving sideways fast enough to keep missing.</strong> An orbit is a fall that never arrives, and an asteroid obeys that rule exactly as Jupiter does — it is not too small to fall in, and its own mass appears nowhere in the calculation.</p>
    <p>The speed is not a choice. At a given distance from the sun there is exactly one speed that turns a fall into a circle, and every rock still out there is travelling close to it — anything that was not either left long ago or is on its way somewhere else. From the sun’s gravity and the belt’s own edges:</p>
    <div class="wc-facts">
      <div class="wc-frow"><span>Inner edge, ${inner.toFixed(2)} AU</span><b>${kmPerS(beltVIn, 1)} to hold a circle — one lap of the sun every ${num(beltTIn, 1)} years</b></div>
      <div class="wc-frow"><span>Outer edge, ${outer.toFixed(2)} AU</span><b>${kmPerS(beltVOut, 1)} — one lap every ${num(beltTOut, 1)} years</b></div>
      <div class="wc-frow"><span>Earth, for comparison</span><b>${kmPerS(beltVEarth, 1)} at 1 AU — closer in means pulled harder, and pulled harder means faster</b></div>
      <div class="wc-frow"><span>Stop one dead</span><b>It would reach the sun about ${num(beltFall)} days later. That is the only way in, and nothing out there is slowing down.</b></div>
    </div>
    <p><strong>The belt does not turn as one thing.</strong> Every asteroid keeps its own orbit and its own year, and the inner ones go round faster than the outer ones — ${num(beltTIn, 1)} years against ${num(beltTOut, 1)} — so the belt shears past itself rather than rotating like a wheel. That difference is exactly why the resonances above matter: it decides which asteroids keep meeting Jupiter in the same place, and those are the ones that get removed.</p>
    <p><a href="${ORBITAL_PATH}">The orbital velocity simulator</a> lets you set a distance and a sideways speed and watch what gravity makes of it — a circle, a long ellipse, an escape, or a fall into the sun. Set it out at the belt and try to drop a rock into the sun: it takes shedding almost all of that ${kmPerS(beltVIn, 1)} before the near end of the new orbit reaches the sun at all.</p>
  </div>
`
    + `  <div class="card">
    <h2>The four largest</h2>
    <p>Between them these hold about half the mass of the entire belt, and Ceres alone is roughly a third of it.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Object</th><th>Distance</th><th>Width</th><th></th></tr></thead>
        <tbody>
${bigRows}
        </tbody>
      </table>
    </div>
    <p class="hint">The simulator draws the belt as a band and never as individual dots. The orbit of an asteroid is a fact that needs no date; where it sits on that orbit today is something this site does not solve for, and a dot in an invented place would be exactly the kind of confident wrongness these pages are built to avoid.</p>
  </div>
`
    + factsCard("The belt: things worth knowing", b.facts)
    + hubQuestionsCard(path)
    + questionsCard(b.questions, "the asteroid belt")
    + findingsCard(b.findings, "the asteroid belt")
    + shareCard(path) + elsewhereCard(`<a href="${SOLAR_PATH}comets/">Comets</a> · <a href="${planetUrl("jupiter")}">Jupiter, which made the belt what it is</a> · `)
    + faqCard(faq, "The asteroid belt: questions without settled answers");

  writePage(path, page({
    title: "The Asteroid Belt — Where It Is, Why It Has Gaps, What Is In It",
    desc: "See the asteroid belt drawn between Mars and Jupiter, with the Kirkwood gaps and the Trojan clouds worked out from Jupiter's own orbit — plus what the belt is made of and why it never became a planet.",
    path,
    trail: solarTrail(b.name, path),
    ld: trailLd(solarTrail(b.name, path)),
    faq,
    crumbPage: { label: b.slug, url: path },
    h1: "The Asteroid Belt",
    sub: `${esc(b.tagline)} Where it sits, why it has clean lanes through it, and why the gaps are really a portrait of Jupiter.`,
    cards,
    cfg: { rung: "belt", path, belt: 1 },
    jsName: b.slug, needs: EXTRA_VIEWS["asteroid-belt"].needs,
  }));
}

function buildComets(b) {
  const path = `${SOLAR_PATH}${b.slug}/`;
  const rows = SM_COMETS.map((row, i) => {
    const c = cometRow(row);
    const next = nextPerihelion(i, +NOW);
    return `        <tr><th>${esc(c.desig)} ${esc(c.name)}</th><td>${c.periodYears >= 1000 ? `${num(c.periodYears)} y` : `${num(c.periodYears, 2)} y`}</td><td>${c.q.toFixed(3)} AU</td><td>${(c.a * (1 + c.e)).toFixed(1)} AU</td><td>${esc(dateShort(next))}</td><td>${c.retrograde ? "backwards" : "forwards"}</td></tr>`;
  }).join("\n");
  const faq = b.questions.map((q) => [q.q, q.a.replace(/<[^>]+>/g, "")]);
  const halley = SM_COMETS.findIndex((c) => c[0] === "1P");
  const cards = simCard("saturn", 0, path, 0, TILT_DEF, 1)
    + `  <div class="card">
    <h2>The comets drawn here, and when they come back</h2>
    <p>Each of these is already drawn on its own orbit in the picture above, with a tail pointing away from the sun — which is the direction a real tail points, whatever the comet is doing. On the way out, a comet travels tail first.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Comet</th><th>Orbit</th><th>Closest to the sun</th><th>Furthest</th><th>Next perihelion</th><th>Direction</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="hint">Every date in that column is computed from the comet’s orbit, not looked up — which is exactly why it should be read with care. Halley’s next perihelion comes out of this two-body model at ${esc(dateShort(nextPerihelion(halley, +NOW)))}; the published figure, which accounts for the tug of the planets over a whole 75-year lap, is 28 July 2061. Two months of drift over three quarters of a century is what the simplification costs, and it is worth knowing the size of it.</p>
  </div>
`
    + `  <div class="card">
    <h2>Why a comet’s tail is not behind it</h2>
    <p>A tail is not exhaust. It is the comet being blown apart slowly: sunlight and the solar wind strip gas and dust off the nucleus and push them <em>directly away from the sun</em>. So the tail swings around as the comet passes perihelion, and on the outbound leg it leads rather than follows.</p>
    <p>There are usually two of them. The <strong>ion tail</strong> is gas, ionised by sunlight and carried straight out along the magnetic field of the solar wind — narrow, blue, and pointing exactly anti-sunward. The <strong>dust tail</strong> is heavier grains that keep some of the comet’s own orbital motion and fall behind, curving. The drawing here shows the anti-sunward direction only, because that is the part that is a geometric fact rather than a photograph.</p>
    <p>That dust does not disappear. It stays strung out along the orbit, and when Earth crosses one of those trails we get a meteor shower on the same dates every year — the Perseids in August from 109P/Swift-Tuttle, the Leonids in November from 55P/Tempel-Tuttle. Both of those orbits are drawn on this page.</p>
  </div>
`
    + factsCard("Comets: things worth knowing", b.facts)
    + questionsCard(b.questions, "comets")
    + findingsCard(b.findings, "comets")
    + shareCard(path) + elsewhereCard(`<a href="${SOLAR_PATH}asteroid-belt/">The asteroid belt</a> · `)
    + faqCard(faq, "Comets: questions without settled answers");

  writePage(path, page({
    title: "Comets — Where They Are Now and When They Come Back",
    desc: "Watch Halley, Encke, Swift-Tuttle and five more comets on their real orbits through the solar system, with the next perihelion of each worked out from its orbit — and why a comet's tail points away from the sun.",
    path,
    trail: solarTrail(b.name, path),
    ld: trailLd(solarTrail(b.name, path)),
    faq,
    crumbPage: { label: b.slug, url: path },
    h1: "Comets",
    sub: `${esc(b.tagline)} Eight of them drawn on their real orbits, with the next return of each solved rather than looked up.`,
    cards,
    cfg: { rung: "saturn", path, comets: 1 },
    jsName: b.slug, needs: EXTRA_VIEWS.comets.needs,
  }));
}

/* ---------------------------------------------------------------------------
 * Launch windows
 * ------------------------------------------------------------------------- */
function buildWindows() {
  const path = LAUNCH_PATH;
  const wins = TR_TARGETS.map(([idx, name]) => {
    const w = launchWindow(idx, +NOW), c = transferCost(idx, w);
    const w2 = launchWindow(idx, +w.depart + 30 * 86400000);
    return { idx, name, w, c, w2 };
  });
  const rows = wins.map(({ idx, name, w, c }) =>
    `        <tr><th><a href="${LAUNCH_PATH}?date=${w.depart.toISOString().slice(0, 10)}&to=${idx}" data-sol-date="${w.depart.toISOString().slice(0, 10)}" data-sol-target="${idx}">${esc(name)}</a></th><td>${esc(dateShort(w.depart))}</td><td>${esc(dateShort(w.arrive))}</td><td>${num(w.flightDays)} d</td><td>${kmPerS(c.dv1)}</td><td>${kmPerS(c.injection)}</td></tr>`).join("\n");
  const faq = [
    ["Why can't a rocket just fly straight at Mars?",
      "Because it is already moving at about 30 km/s sideways, along with the Earth. A spacecraft does not leave the solar system's rules when it leaves the launch pad: it stays in orbit around the sun, and the only thing an engine can do is change the shape of that orbit. Getting to Mars means enlarging the orbit until its far side reaches Mars's — and then arranging to be there when Mars is."],
    ["Doesn't the curved path cost more fuel than a straight one?",
      "It costs far less — the curve is the free part. A rocket only spends fuel when it changes its speed or direction, and on this route the engine fires twice: once to leave, once to arrive. In between it is switched off for months, and the sun's gravity does all of the turning. A straight line is what an object does when NO force acts on it, and the sun is pulling the whole time, so holding a straight line to Mars would mean thrusting continuously for the entire trip just to cancel that pull — and cancelling the 30 km/s sideways motion the spacecraft inherited from Earth before it even started. The curve is not a detour. It is the shape of falling."],
    ["Why do launch windows come round every 26 months for Mars?",
      "Earth goes round the sun faster than Mars, so it laps it. The time between one lap and the next — the synodic period — is about 26 months for Mars, and only then are the two planets in the right relative position again for a minimum-energy transfer. For Jupiter it is 13 months and for Saturn about 12.5, because the outer planets barely move while Earth goes round."],
    ["Is the next window on this page the date NASA would use?",
      "Close, but not identical. This is the cheapest possible path with no plane change and no gravity assist, so it is the reference every real plan starts from. Real missions leave within days or weeks of it, trading extra fuel for a better arrival geometry, a shorter flight or a launch site's constraints."],
    ["Why is Saturn so much more expensive than Mars?",
      `Because the change in speed you need is set by how much you have to enlarge your orbit around the sun, not by the distance. Leaving Earth's orbit for Mars costs about ${num(wins[0].c.dv1, 1)} km/s; for Saturn it is about ${num(wins[2].c.dv1, 1)} km/s, and the flight takes ${num(wins[2].w.flightDays / wins[0].w.flightDays, 0)} times as long. That is why almost everything sent to the outer solar system steals speed from a planet on the way instead of buying it.`],
  ];
  /* WHAT THE REAL MISSIONS ACTUALLY DID, against what the cheapest route would
     have taken from the same window. The launch and arrival dates are history
     and cannot be derived — they are the only typed numbers here. Everything
     compared against them is solved: trWindow finds the minimum-energy window
     nearest the real launch, and the difference between the two flight times
     IS the story. A negative number means the mission BEAT the cheapest route,
     which only a gravity assist or a much bigger burn can buy; a large positive
     one means it took the slow road on purpose, because the burn the fast one
     needs does not exist. */
  const missionRows = (FACTS.missions || []).map((m) => {
    const lift = new Date(m.launch + "T00:00:00Z"), land = new Date(m.arrive + "T00:00:00Z");
    const real = (+land - +lift) / 86400000;
    /* the window nearest the real launch: look from six months before it */
    const ref = launchWindow(m.target, +lift - 183 * 86400000);
    const diff = ref ? real - ref.flightDays : null;
    const verdict = diff === null ? "—"
      : diff < -20 ? `<b class="sol-fast">${num(-diff)} days faster</b>`
      : diff > 20 ? `${num(diff)} days slower`
      : "about the same";
    return `        <tr><th>${esc(m.name)}</th><td>${esc(planetName(m.target))}</td><td>${esc(dateShort(lift))}</td><td>${esc(dateShort(land))}</td><td>${num(real)} d</td><td>${ref ? num(ref.flightDays) + " d" : "—"}</td><td>${verdict}</td><td>${m.assists.length ? esc(m.assists.join(", ")) : "none"}</td></tr>`;
  }).join("\n");

  const cards = simCard("belt", 1)
    + `  <div class="card" id="windows">
    <h2>The next window to each planet</h2>
    <p>None of these dates is written into this page. Each one is solved when the page is built, and again in your browser when it loads, by asking a single question of the real orbits: when is the target positioned such that, after the time a minimum-energy transfer takes, it will have arrived at the far end of that transfer?</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Target</th><th>Leave</th><th>Arrive</th><th>Flight</th><th>Speed change</th><th>Burn from low Earth orbit</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="hint">Click a planet to fly it in the simulator above. The last column is what the rocket actually has to do from a parking orbit ${num(300)} km up — always less than the middle column, because you are already moving fast up there.</p>
  </div>
`
    + `  <div class="card" id="missions">
    <h2>What the real missions did instead</h2>
    <p>Every row here launched. The <em>cheapest route</em> column is what a minimum-energy transfer from the same window would have taken, solved from the orbits — so the last two columns together are the whole argument for gravity assists. A mission that arrived far <strong>faster</strong> than the cheapest route bought that time somewhere: from a bigger burn, or, far more often, by taking speed off a planet on the way. A mission that took much longer went the long way round on purpose, because the burn the direct route needs is bigger than any rocket that has ever flown.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Mission</th><th>To</th><th>Launched</th><th>Arrived</th><th>Actual flight</th><th>Cheapest route</th><th>Difference</th><th>Flybys on the way</th></tr></thead>
        <tbody>
${missionRows}
        </tbody>
      </table>
    </div>
    <p class="hint">Cassini is the clearest case: four flybys, nearly seven years, and it still could not have gone direct — the speed change for a straight minimum-energy run to Saturn is about ${num(wins[2].c.injection, 1)} km/s from a low Earth orbit, and that is before anything is left over for slowing down at the far end. Voyager 2 is the opposite case: Jupiter threw it at Saturn, and it arrived in less than two thirds of the time the cheapest route would have taken.</p>
  </div>
`
    + `  <div class="card sim-teach" id="learn">
    <h2>Why a flyby speeds a spacecraft up</h2>
    <p>Seen from the planet, a flyby changes nothing: the ship comes in at some speed, swings round, and leaves at exactly that speed in a new direction. Nothing is gained. Seen from the <em>sun</em>, though, the planet is moving — Jupiter at about 13 km/s — and the ship's new direction is measured against a target that has been dragging it along. Turn the ship so it leaves pointing the way Jupiter is already going and it keeps some of Jupiter's motion. The energy is real and it is conserved: the planet loses exactly as much, slowed in its orbit by an amount too small ever to measure.</p>
    <p>The cost is time and arithmetic. Every flyby has to be aimed years ahead, and the planets have to line up for the whole chain — which is why Galileo went <em>inward</em> to Venus first on its way to Jupiter, and why Voyager's route past all four outer planets needed an alignment that comes round every 175 years.</p>
  </div>
`
    + `  <div class="card">
    <h2>Why the picture above does not draw a flyby</h2>
    <p>The flight paths drawn on this page are the minimum-energy ones, so they do not show a flyby. Adding one honestly means solving each leg between its own two planets and matching the speeds where they join, which this page does not do — and a curve drawn past Jupiter without that solved underneath it would be a picture of nothing. What is here is the reference every real plan is measured against, and the table above is the measurement.</p>
  </div>
`
    + wins.map(({ idx }) => windowCard(idx)).join("")
    + TRANSFER_NOTE
    + `  <div class="card sim-teach">
    <h2>The idea in one paragraph, for a class</h2>
    <p>Draw two circles round the sun: Earth’s orbit and Mars’s. Now draw the smallest ellipse that touches both — it touches Earth’s circle at one end and Mars’s at the other, and that half-ellipse is the cheapest route between them. Fire the engine once, at the right moment, and you coast the whole way. The catch is that the trip takes ${num(wins[0].w.flightDays)} days, and Mars has to be at the far end when you arrive, not where it was when you left. Mars moves about ${Math.round(travel(3, wins[0].w.flightDays))}° while you are in flight, so it has to start roughly ${Math.round(180 - travel(3, wins[0].w.flightDays))}° ahead of you — and it is only in that position for a few weeks every ${num((wins[0].w2.depart - wins[0].w.depart) / 86400000 / 30.4369, 0)} months.</p>
    <p>Everything else about interplanetary flight is a refinement of that picture, including the reason a probe to Saturn usually goes past Venus first.</p>
  </div>
`
    + destLinksCard()
    + shareCard(path) + elsewhereCard() + faqCard(faq, "Launch windows: common questions");

  writePage(path, page({
    title: "Rocket Launch Simulator — Launch Windows to Mars, Jupiter & Saturn",
    desc: "When the next rocket launch window to Mars, Jupiter and Saturn opens, how long the flight takes, what it costs in speed, and how the real missions — Cassini, Galileo, Juno, Perseverance — compare. Solved from the real orbits, with the flight path drawn and flyable.",
    path,
    trail: LAUNCH_TRAIL,
    ld: trailLd(LAUNCH_TRAIL),
    faq,
    crumb: { slug: "rocket-launches", url: path },
    h1: "Rocket Launch Simulator",
    sub: "A rocket cannot point at Mars and fire. It has to leave on an orbit around the <strong>sun</strong> that meets Mars where Mars will be — and that is only possible for a few weeks every couple of years. Every date here is solved from the real orbits when the page loads.",
    cards,
    cfg: { rung: "belt", path },
    jsName: "launch", needs: LAUNCH_NEEDS,
  }));

  LAUNCH_DESTS.forEach((d) => buildLaunchDest(d, wins.find((w) => w.idx === d.idx), faq));
}

/* the row of children, on the hub — one link per destination */
const destLinksCard = () => `  <div class="card">
    <h2>A page for each destination</h2>
    <p>The window, the flight time, the burn and the path, worked out for one planet at a time and framed on that flight.</p>
    <div class="chips">
${LAUNCH_DESTS.map((d) => `      <a class="chip" href="${LAUNCH_PATH}${d.slug}/">Launch to ${esc(d.name)}</a>`).join("\n")}
    </div>
    ${/* SAYING WHY THE MOON IS NOT HERE, rather than leaving a gap somebody has
         to guess about. Every other destination on this page is solved by the
         same sun-centred transfer; a lunar trip is not that problem, and this
         site does not publish a number it has not worked out. */""
    }<p class="hint">There is no page here for a flight to the Moon. Everything above is a transfer between two orbits <em>around the sun</em>, and a trip to the Moon is a departure from orbit around the <em>Earth</em> — a different problem with different arithmetic, which this site does not yet solve. Rather than dress one up as the other, it is left out until it can be done properly.</p>
  </div>
`;

/* ---------------------------------------------------------------------------
 * ONE DESTINATION.
 *
 * The hub answers "where can I go?"; this answers "what does it take to get to
 * THIS one?" — which is the question people actually type, and one page could
 * only ever rank for one of the three. The numbers are the same solver, framed
 * on that flight's own rung and opened with the flight already drawn.
 * ------------------------------------------------------------------------- */
function buildLaunchDest(d, win, hubFaq) {
  const path = `${LAUNCH_PATH}${d.slug}/`;
  const { w, c, w2 } = win;
  const name = d.name;
  const synodic = (w2.depart - w.depart) / 86400000 / 30.4369;
  const body = FACTS.bodies[d.idx];
  const missions = (FACTS.missions || []).filter((m) => m.target === d.idx);
  const missionRows = missions.map((m) => {
    const lift = new Date(m.launch + "T00:00:00Z"), land = new Date(m.arrive + "T00:00:00Z");
    const real = (+land - +lift) / 86400000;
    const ref = launchWindow(m.target, +lift - 183 * 86400000);
    const diff = ref ? real - ref.flightDays : null;
    const verdict = diff === null ? "—"
      : diff < -20 ? `<b class="sol-fast">${num(-diff)} days faster</b>`
      : diff > 20 ? `${num(diff)} days slower` : "about the same";
    return `        <tr><th>${esc(m.name)}</th><td>${esc(dateShort(lift))}</td><td>${esc(dateShort(land))}</td><td>${num(real)} d</td><td>${ref ? num(ref.flightDays) + " d" : "—"}</td><td>${verdict}</td><td>${m.assists.length ? esc(m.assists.join(", ")) : "none"}</td></tr>`;
  }).join("\n");

  const faq = [
    [`When is the next launch window to ${name}?`,
      `The next minimum-energy window opens around ${dateShort(w.depart)}, with arrival about ${dateShort(w.arrive)} — a flight of roughly ${num(w.flightDays)} days. That date is not written into this page: it is solved from the real orbits when the page is built and again in your browser when it loads.`],
    [`How often does a window to ${name} come round?`,
      `About every ${num(synodic, 0)} months. That is the synodic period — how long Earth takes to lap ${name} — and only at that point are the two planets positioned for the cheapest transfer again.`],
    [`How much speed does it take to reach ${name}?`,
      `About ${num(c.dv1, 2)} km/s of change to leave Earth's orbit around the sun, or about ${num(c.injection, 2)} km/s as a burn from a 300 km parking orbit — less, because up there you are already moving fast.`],
  ].concat(hubFaq.slice(0, 2));

  const cards = simCard(d.rung, 1, path)
    + `  <div class="card" id="windows">
    <h2>The next windows to ${esc(name)}</h2>
    <p>The next one opens around <strong>${esc(dateShort(w.depart))}</strong> and the crossing takes about <strong>${num(w.flightDays)} days</strong>, arriving ${esc(dateShort(w.arrive))}. After that you wait roughly <strong>${num(synodic, 0)} months</strong> for the next one — that is how long Earth takes to lap ${esc(name)}.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th></th><th>Leave</th><th>Arrive</th><th>Flight</th><th>Speed change</th><th>Burn from low Earth orbit</th></tr></thead>
        <tbody>
        <tr><th>Next window</th><td>${esc(dateShort(w.depart))}</td><td>${esc(dateShort(w.arrive))}</td><td>${num(w.flightDays)} d</td><td>${kmPerS(c.dv1)}</td><td>${kmPerS(c.injection)}</td></tr>
        <tr><th>The one after</th><td>${esc(dateShort(w2.depart))}</td><td>${esc(dateShort(w2.arrive))}</td><td>${num(w2.flightDays)} d</td><td colspan="2" class="hint">roughly the same — the geometry repeats</td></tr>
        </tbody>
      </table>
    </div>
  </div>
`
    + windowCard(d.idx) + TRANSFER_NOTE
    + (missionRows ? `  <div class="card" id="missions">
    <h2>What the real missions to ${esc(name)} did</h2>
    <p>The <em>cheapest route</em> column is what a minimum-energy transfer from the same window would have taken, solved from the orbits rather than looked up — so the difference is the whole argument for gravity assists.</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Mission</th><th>Launched</th><th>Arrived</th><th>Actual flight</th><th>Cheapest route</th><th>Difference</th><th>Flybys on the way</th></tr></thead>
        <tbody>
${missionRows}
        </tbody>
      </table>
    </div>
  </div>
` : "")
    + `  <div class="card">
    <h2>The rest of the journey</h2>
    <p>This is the flight. <a href="${planetPath(body.slug, d.idx)}">${esc(name)} itself</a> — how big, how heavy, what goes round it and what is still unexplained — is its own page. Or see <a href="${LAUNCH_PATH}">every destination and how they compare</a>.</p>
    <div class="chips">
${LAUNCH_DESTS.filter((x) => x.slug !== d.slug).map((x) => `      <a class="chip" href="${LAUNCH_PATH}${x.slug}/">Launch to ${esc(x.name)}</a>`).join("\n")}
      <a class="chip" href="${planetPath(body.slug, d.idx)}">${esc(name)}, the planet</a>
    </div>
  </div>
`
    + shareCard(path) + elsewhereCard() + faqCard(faq, `Launching to ${name}: common questions`);

  writePage(path, page({
    title: `Rocket Launch to ${name} — Next Launch Window, Flight Time & Burn`,
    desc: `When the next launch window to ${name} opens (around ${dateShort(w.depart)}), how long the crossing takes, what it costs in speed, and how the real missions compare — all solved from the real orbits, with the flight path drawn.`,
    path,
    trail: [...LAUNCH_TRAIL, { name: `To ${name}`, url: path }],
    ld: trailLd([...LAUNCH_TRAIL, { name: `To ${name}`, url: path }]),
    faq,
    crumb: { slug: "rocket-launches", url: LAUNCH_PATH },
    crumbPage: { label: d.slug, url: path },
    h1: `Rocket Launch to ${esc(name)}`,
    sub: `The next window opens around <strong>${esc(dateShort(w.depart))}</strong>, and the crossing takes about <strong>${num(w.flightDays)} days</strong>. Both are solved from the real orbits when the page loads — and the path is drawn above, framed on the flight.`,
    cards,
    /* opens with the flight to this destination already drawn */
    cfg: { rung: d.rung, path, to: d.idx },
    jsName: `launch-${d.slug}`, needs: LAUNCH_NEEDS,
  }));
}

/* EVERY PAGE THIS GENERATOR WROTE, in the order it wrote them. build-inline and
   build-sitemap both need the list, and both used to keep their own — a nested
   `solar-system-simulator/<slug>/` pattern that stopped being true the moment
   the planets went flat. Recording it here means the list cannot be wrong: it
   IS what was written. */
export const SOLAR_URLS = [];
function writePage(path, html) {
  mkdirSync(join(root, path.slice(1, -1)), { recursive: true });
  writeFileSync(join(root, path.slice(1) + "index.html"), html);
  SOLAR_URLS.push(path);
}

/* ---------------------------------------------------------------------------
 * A HELIOCENTRIC VIEW OF ITS OWN.
 *
 * The two ends of the ladder that people actually search for — "the inner
 * planets", "the outer planets" — as pages rather than zoom states. Each one
 * is differentiated by content the other cannot carry: the planets in THAT
 * group, their own numbers, and the scale fact that only makes sense at that
 * framing. The intermediate rungs stay on the hub's ladder, because four pages
 * of the same drawing at four zooms is exactly the near-duplicate the
 * canonical rules are there to stop.
 * ------------------------------------------------------------------------- */
function buildSysView(v) {
  const path = `${SOLAR_PATH}${v.slug}/`;
  const rung = RUNGS.find((r) => r.id === v.rung);
  /* which planets this frame actually contains, from the rung's own outer
     radius against each orbit — so the prose cannot name a planet the picture
     does not show */
  const inFrame = FACTS.bodies.filter((b) => axis(b.idx) <= rung.outer);
  const group = v.slug === "inner-planets"
    ? FACTS.bodies.filter((b) => b.idx <= PLANET.MARS)
    : FACTS.bodies.filter((b) => b.idx >= PLANET.JUPITER && b.idx <= 7);
  const rows = group.map((b) => {
    const s = bodyStats(b.idx);
    return `        <tr><th><a href="${planetPath(b.slug, b.idx)}">${esc(b.name)}</a></th><td>${axis(b.idx).toFixed(3)} AU</td><td>${num(planetPeriodDays(b.idx) / 365.25, 2)} y</td><td>${kmSig(PL_DIA[planetName(b.idx)], 5)}</td><td>${num(moonCount(b.idx))}</td></tr>`;
  }).join("\n");
  const outer = group[group.length - 1], inner = group[0];
  /* named `spread`, not `ratio` — there is a module-level ratio() for the
     ladder rungs and shadowing it here would be a trap for the next reader */
  const spread = axis(outer.idx) / axis(inner.idx);

  const cards = simCard(v.rung, 0, path)
    + `  <div class="card" id="learn">
    <h2>${esc(v.name)}, and how far apart they really are</h2>
    <p>${v.slug === "inner-planets"
      ? `All four rocky planets fit inside <strong>${rung.outer} AU</strong> — the outermost, Mars, orbits only <strong>${spread.toFixed(1)}×</strong> further from the sun than the innermost, Mercury. That is why a diagram of the whole solar system shows them as a knot in the middle: on the scale that reaches Neptune, this entire picture is the first few percent of the width.`
      : `From Jupiter out to Neptune the sun's distance multiplies by <strong>${spread.toFixed(1)}×</strong>, and this frame reaches <strong>${rung.outer} AU</strong>. The gaps between the giants are larger than the whole of the inner solar system — Jupiter alone sits further out than ${num(axis(PLANET.JUPITER) / axis(PLANET.MARS), 1)} times Mars's orbit.`}</p>
    <div class="mn-tablewrap">
      <table class="mn-table sol-table">
        <thead><tr><th>Planet</th><th>Distance from the sun</th><th>Year</th><th>Diameter</th><th>Moons drawn</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="hint">Every figure is worked out from the same orbital elements the picture is drawn with — the year from Kepler's third law, the distance from the semi-major axis — so the table and the drawing cannot disagree. ${inFrame.length ? `This frame holds ${num(inFrame.length)} of the nine bodies the simulator draws.` : ""}</p>
  </div>
`
    + `  <div class="card">
    <h2>Each one on its own</h2>
    <p>The planet itself — turning on its axis, with its moons, its mass and gravity worked out from its own GM rather than copied in, and what has been learned about it lately.</p>
    <div class="chips">
${group.map((b) => `      <a class="chip" href="${planetPath(b.slug, b.idx)}">${esc(b.name)}</a>`).join("\n")}
    </div>
    <p>Or climb the whole ladder on the <a href="${SOLAR_PATH}">solar system simulator</a>, which is the page about how much the scale changes between these two views.</p>
  </div>
`
    + shareCard(path) + elsewhereCard();

  writePage(path, page({
    title: v.title,
    desc: v.desc,
    path,
    trail: solarTrail(v.name, path),
    ld: trailLd(solarTrail(v.name, path)),
    crumbPage: { label: v.slug, url: path },
    h1: v.name,
    sub: v.slug === "inner-planets"
      ? "Mercury, Venus, Earth and Mars on their real orbits, to scale with each other. Drag through a month, a year or a decade and watch the inner four lap one another."
      : "Jupiter, Saturn, Uranus and Neptune on their real orbits, at the scale that shows how much room there is between them.",
    cards,
    cfg: { rung: v.rung, path },
    jsName: v.slug, needs: v.needs,
  }));
}

/* ---------------------------------------------------------------------------
 * Run
 * ------------------------------------------------------------------------- */
export const SOLAR_SLUGS = [...FACTS.bodies.map((b) => b.slug), ...FACTS.extras.map((b) => b.slug)];

buildHub();
FACTS.bodies.forEach((b, i) => buildBody(b, FACTS.bodies[i - 1] || null, FACTS.bodies[i + 1] || null));
buildBelt(FACTS.extras.find((x) => x.slug === "asteroid-belt"));
buildComets(FACTS.extras.find((x) => x.slug === "comets"));
SYS_VIEWS.forEach(buildSysView);
buildWindows();

console.log(`Generated ${SOLAR_PATH} + ${SOLAR_SLUGS.length} child pages (${RUNGS.length} zoom rungs, ${SPANS.length} spans; `
  + `Mercury's orbit ${orbitPx(0, SYS_RUNGS[0].outer).toFixed(0)}px at the inner view, ${orbitPx(0, outerRung.outer).toFixed(1)}px at the outer; `
  + `next Mars window ${launchWindow(3, +NOW).depart.toISOString().slice(0, 10)}).`);
