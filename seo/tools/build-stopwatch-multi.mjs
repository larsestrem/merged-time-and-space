#!/usr/bin/env node
/* build-stopwatch-multi.mjs — /stopwatch/multiple/, up to six stopwatches at once.
 *
 * A SEPARATE PAGE, NOT A REWRITE OF /stopwatch/. The single stopwatch works,
 * persists a session across reloads, exports CSV, builds a share image and is
 * the page that ranks. Restructuring it into an N-instance model to add a
 * feature most visitors don't want would risk all of that for nothing. It is
 * also the wrong shape: someone timing six swimmers is doing a different job
 * from someone timing one thing, and "multiple stopwatches" is its own search.
 *
 * The timer hub already runs three countdowns at once, so the board pattern,
 * its CSS (.mt-board / .mt-timer / .mt-bar, in 10-multitimer.css) and its
 * full-screen behaviour are reused rather than reinvented. What is genuinely
 * different here is that a stopwatch counts UP and has laps, so each card
 * carries a lap count and its best lap, and the export interleaves every
 * watch's laps into one file — which is the actual reason to run three at once.
 *
 * HOW MANY DEPENDS ON THE VIEW, AND THE VIEW CAN BE OVERRIDDEN. Six on a
 * computer, laid out three across and two down; three on a phone. The number is
 * not a taste, it is what a read-out big enough to glance at costs in width:
 * six across a laptop are six slivers, and six down a phone are six scrolls. So
 * the wide layout stacks the second row instead of narrowing the first.
 * The view follows the window until somebody chooses, and from then on it is
 * their choice — the person plugging a laptop into a projector and the person
 * holding a phone sideways at the poolside both know something a media query
 * does not. Switching to the narrow view NEVER stops or deletes a watch: it
 * says how many fit and leaves the running clocks alone, because the alternative
 * is throwing away a time somebody recorded.
 *
 * TELLING THEM APART IS THE JOB. Six identical dark cards in a grid are six
 * identical dark cards: which one is lane 3? So each card carries its own NAME
 * and its own COLOUR, both set from one palette button sitting to the left of
 * the name — a colour is what you match to a shirt, a lane rope or a paint tin,
 * and it is read from across a room in a way a 17px label is not. The colour is
 * a background TINT rather than a flood: the read-out is a lit LED display on a
 * dark screen, and a card washed out to a pastel would take the digits with it.
 * Both are saved with the session.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. No PER-WATCH share image and no per-watch
 * CSV: that is what /stopwatch/ is for, and three copies of it on one screen
 * would bury the timing controls the page exists for. The Share and CSV in the
 * bar are board-level and always have been the whole point — the comparison is
 * the artefact, so one file holds every watch.
 *
 *   node seo/tools/build-stopwatch-multi.mjs   (run before build-sitemap + build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, faqLd, breadcrumbLD, appLd, SEG_JS } from "./lib.mjs";
import { ico } from "./icons.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;
const PATH = "/stopwatch/multiple/";
const MAX_DESK = 6;
const MAX_MOB = 3;

const FS_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5"/><path d="M4 4l6 6"/><path d="M20 9V4h-5"/><path d="M20 4l-6 6"/><path d="M4 15v5h5"/><path d="M4 20l6-6"/><path d="M20 15v5h-5"/><path d="M20 20l-6-6"/></svg>`;

/* The preset colours. Eight, because the point is to pick one at a glance and a
 * longer grid is a decision rather than a glance; hues far enough apart to stay
 * distinct once tinted into a dark card, and each one common enough to actually
 * match something (a kit, a lane rope, a group's table). Anything else is what
 * the custom picker beside them is for. */
const SWATCHES = [
  ["Red", "#ef4444"], ["Orange", "#f97316"], ["Amber", "#f59e0b"], ["Green", "#22c55e"],
  ["Teal", "#14b8a6"], ["Blue", "#3b82f6"], ["Purple", "#a855f7"], ["Pink", "#ec4899"],
];
const SWATCH_HTML = SWATCHES.map(([n, c]) =>
  `<button type="button" class="ms-sw" data-c="${c}" style="--sw:${c}" title="${n}" aria-label="${n}" aria-pressed="false"></button>`).join("");

const FAQ = [
  ["How many stopwatches can I run at once?",
    `${MAX_DESK} on a computer and ${MAX_MOB} on a phone. Each one keeps its own name, its own colour, its own elapsed time and its own laps, and they run completely independently — starting one does not touch the others. If you only need one, the single stopwatch has more per-session tools.`],
  ["Why only three on a phone?",
    `Because a phone showing ${MAX_DESK} cards shows ${MAX_DESK} read-outs too small to glance at, and glancing is the whole job. If you want them anyway — a phone held sideways, or a tablet the page has guessed wrong about — the layout button switches between the wide and narrow views and stays where you put it. Switching to the narrow view never stops or deletes a watch; it tells you how many fit and leaves your clocks running.`],
  ["Do they all have to start together?",
    "No, and that is the point — each card has its own Start. There is also a Start all button for a race where everyone goes on the same gun, and pressing it starts every stopped watch at the same instant rather than one after another."],
  ["Can I name them?",
    "Yes — open the palette button to the left of the name and type, or just tap the name itself. Lane 3, Kettle, Group B, whatever you are actually timing. The names are saved with the session and appear in the exported file."],
  ["Can I give each stopwatch its own colour?",
    "Yes. The palette button on each card sets its background colour: eight presets, or a custom picker for any colour at all, so a card can match a team kit, a lane rope or the paint on a wall. Colours are saved with the session, and there is a No colour option to put a card back to plain."],
  ["Are my times saved if I close the tab?",
    "Yes. Every watch, its name, its colour and its laps are stored on your device. A watch that was running when you closed the tab is still running when you come back, and it will read the full wall-clock time since you pressed Start — the gap is counted, not skipped. Stop a watch before closing if you do not want that. Reset all clears the times; the names and colours stay."],
  ["Can I export them all at once?",
    "Yes — CSV writes one file with a row per stopwatch: its name, then a column for each lap, then its total time. Six watches are six rows you can read down, and if nobody took a lap the file is simply each name and its time. Share does the same thing as a picture — one column per watch, in that watch's colour."],
  ["What are the exported files called?",
    "The date and time you saved them, then the names of the cards you renamed: 2026-08-08-1615-lane-3-lane-4.csv. A board you did not rename falls back to stopwatch-times. That way a folder of exports sorts itself into the order you took them and no two ever overwrite each other."],
  ["Is it accurate enough for a race?",
    "For training, a classroom or a kitchen, comfortably. It is not calibrated timing equipment and is not suitable for official results — displayed precision varies by device, and a background tab updates less often. The measured behaviour is on the browser timing page."],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Multiple Stopwatches — Run Up to 6 at Once</title>
<meta name="description" content="Run up to six independent stopwatches at the same time, each with its own name, colour and laps. Free, no sign-up, and every session exports to one CSV.">
<link rel="canonical" href="${SITE}${PATH}">
<meta property="og:title" content="Multiple Stopwatches — Run Up to 6 at Once">
<meta property="og:description" content="Six independent stopwatches on one screen, each with its own name, colour and lap list — for lanes, groups, stations or heats.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${breadcrumbLD(SITE, [{ name: "Time and Space Science", url: "/" }, { name: "Stopwatch", url: "/stopwatch/" }, { name: "Multiple", url: PATH }])}</script>
${appLd({ name: "Multiple Stopwatches", url: `${SITE}${PATH}`, description: "Run up to six independent stopwatches at once, each with its own name, colour and laps." })}
${faqLd(FAQ)}
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: "stopwatch", url: "/stopwatch/" }, sub: { slug: "multiple", url: PATH } })}
  <h1>Multiple Stopwatches</h1>
  <p class="sub">Up to ${MAX_DESK} independent stopwatches on one screen — each with its own name, its own colour, its own laps and its own Start. For lanes, heats, groups, stations or six things on the stove.</p>

  <div class="mt-wrap" id="ms" data-view="desk">
    <div class="mt-board ms-board" id="ms-board" data-count="0"></div>
    <p class="tool-msg ms-over" id="ms-over" role="status" hidden></p>
    <div class="mt-bar">
      <button class="btn secondary" id="ms-share" type="button" disabled title="Start a stopwatch first — Share saves the board as an image">Share</button>
      <button class="btn secondary" id="ms-dl" type="button" disabled title="Start a stopwatch first — CSV saves every watch as a spreadsheet file">CSV</button>
      <button class="btn" id="ms-add" type="button" title="Add a stopwatch">Add</button>
      <button class="btn secondary" id="ms-all" type="button">Start all</button>
      <button class="btn secondary" id="ms-reset" type="button">Reset all</button>
      <button class="btn secondary" id="ms-view" type="button" title="Switch between the wide and narrow layouts">Mobile view</button>
      <button class="btn secondary sw-fsbtn" id="ms-fs" type="button" aria-label="Full screen" title="Full screen">${FS_ICON}</button>
    </div>
    <p class="hint ms-cap">Each stopwatch runs on its own — <strong>Start all</strong> is for a common gun. The palette button on each card sets that card's <strong>name and colour</strong>, so you can tell six cards apart at a glance. ${MAX_DESK} fit the wide layout and ${MAX_MOB} the narrow one; the layout button switches between them. Everything is saved on this device. <strong>CSV</strong> writes one row per stopwatch — name, a column per lap, then the total — and <strong>Share</strong> saves the same board as an image; both files are named for the date, the time and the cards you renamed. Keyboard: <kbd>Space</kbd> start/stop all · <kbd>R</kbd> reset all · <kbd>F</kbd> full screen.</p>
  </div>

  <div class="card tool-about">
    <h2>When six beat one</h2>
    <p>A single stopwatch answers "how long did that take". Six answer "which of these was quicker", and that is a different question with a different shape: the times only mean something next to each other. Each card here keeps its own laps, so you can take a split on lane 2 without touching lane 3, and the export puts them in one file — a row per stopwatch, a column per lap — so the comparison survives the trip into a spreadsheet.</p>
    <p class="bullets">
      <em>Swimming and track.</em> One watch per lane or per athlete, named and coloured, with splits taken independently.<br>
      <em>Classroom stations.</em> One per group, so you can see which station is running long without stopping the others.<br>
      <em>Cooking.</em> Several things that went in at different times and come out at different times.<br>
      <em>Interviews and debates.</em> One watch per speaker, so total speaking time is a number rather than a guess.<br>
      <em>Lab work.</em> Parallel reactions started a minute apart, each with its own elapsed clock.
    </p>
    <p>Timing one thing? The <a href="/stopwatch/">single stopwatch</a> does more per session — fastest and slowest lap highlighting, a +/- column against the previous lap, a start delay, and a choice of display precision.</p>
  </div>

  <div class="card tool-about">
    <h2>Naming and colouring the cards</h2>
    <p>Six dark cards in a grid are six identical dark cards, and "which one is lane 3?" is a question you should never have to ask in the middle of timing something. The <strong>palette button</strong> to the left of each name opens that card's settings: a <strong>name</strong> and a <strong>colour</strong>.</p>
    <p>Eight preset colours cover most of what people actually match to — a team kit, a lane rope, the coloured card on a group's table — and the custom picker beside them takes any colour at all, so a card can be the exact shade of a shirt or a paint tin. Pick <strong>No colour</strong> to put a card back to plain. Names and colours are saved on your device with the rest of the session, and <strong>Reset all</strong> clears the times without clearing them.</p>
    <p class="hint">The colour tints the card behind the display rather than flooding it: the read-out is a lit LED panel on a dark screen, and a pastel card would take the digits down with it. Colour is a label, not a status — a running card is still the one with the bright border.</p>
  </div>

  <div class="card tool-about">
    <h2>What it can't do</h2>
    <p>These are browser stopwatches, and the limits are the browser's. A running stopwatch measures <strong>wall-clock time</strong>: it is the difference between the moment you pressed Start and the moment you are looking at it, so it keeps counting in a background tab and it keeps counting through a closed tab or a sleeping laptop. Come back the next morning and a watch you left running will read the whole night, because the whole night is what elapsed. Stop it before you close the tab if that is not what you want. Displayed precision varies by device.</p>
    <p>Good enough for training, a classroom or a kitchen. Not calibrated equipment, and not suitable for official results. What a browser timer actually does, measured rather than described: <a href="/methodology/browser-timing/">how accurate is a browser timer?</a></p>
  </div>

  <div class="card tool-faq">
    ${FAQ.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n    ")}
  </div>

  <div class="card tool-about">
    <h2>More timing tools</h2>
    <p><a href="/stopwatch/">Single stopwatch</a> · <a href="/timer/">Timer</a> (three countdowns at once) · <a href="/alarm-clock/">Alarm clock</a> · <a href="/classroom/">Using these in a classroom</a></p>
  </div>

  <p class="footer"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script>
${SEG_JS}
(function(){
  var board=document.getElementById("ms-board"), addBtn=document.getElementById("ms-add"),
      allBtn=document.getElementById("ms-all"), resetBtn=document.getElementById("ms-reset"),
      dlBtn=document.getElementById("ms-dl"), shareBtn=document.getElementById("ms-share"),
      fsBtn=document.getElementById("ms-fs"), wrap=document.getElementById("ms"),
      viewBtn=document.getElementById("ms-view"), overEl=document.getElementById("ms-over");
  if(!board) return;
  var MAXD=${MAX_DESK}, MAXM=${MAX_MOB}, KEY="ac_multi_stopwatch", VKEY="ac_ms_view",
      watches=[], seq=0, raf=0, openW=null;

  /* ---- WHICH VIEW, AND WHO DECIDED ------------------------------------------
     "auto" is only the state before anybody has chosen: the layout follows the
     window. The moment the layout button is pressed, that choice IS the answer
     and the window stops being consulted. The cap applies to ADDING a watch; it
     never removes one that is already on screen, because that would stop a
     clock somebody is timing with. */
  var view="auto"; try{ view=localStorage.getItem(VKEY)||"auto"; }catch(e){}
  var MQ=window.matchMedia("(min-width:680px)");
  function mode(){ return view==="auto" ? (MQ.matches?"desk":"mob") : view; }
  function cap(){ return mode()==="desk" ? MAXD : MAXM; }

  function pad(n){ return n<10?"0"+n:""+n; }
  function clk(ms){ ms=Math.max(0,ms); var cs=Math.floor(ms/10)%100, s=Math.floor(ms/1000),
    h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    return (h>0?pad(h)+":":"")+pad(m)+":"+pad(sec)+"."+pad(cs); }
  /* elapsed for one watch, whether or not it is running */
  function now(w){ return w.running ? w.elapsed+(Date.now()-w.startedAt) : w.elapsed; }

  function save(){ try{
    if(!watches.length){ localStorage.removeItem(KEY); return; }
    localStorage.setItem(KEY, JSON.stringify(watches.map(function(w){
      return {n:w.name,r:w.running,e:w.elapsed,s:w.startedAt,l:w.laps,ll:w.lastLap,c:w.color}; })));
  }catch(e){} }

  function anyRunning(){ for(var i=0;i<watches.length;i++) if(watches[i].running) return true; return false; }
  /* The all-button keys off ALL running, not ANY. With one of three going,
     "any" made the button read Stop all and made it stop that one watch —
     the opposite of what someone with two idle cards is reaching for.
     Start all fills the board; only once everything is running does it
     become Stop all. */
  function allRunning(){ return watches.length>0 && watches.every(function(w){ return w.running; }); }
  function anyLaps(){ for(var i=0;i<watches.length;i++) if(watches[i].laps.length) return true; return false; }
  /* Exportable from the first tick, not the first lap: the CSV has a no-laps
     shape (name and one time), so a plain timing is a real export. "running"
     counts on its own — at the instant Start is pressed the elapsed time is
     still zero, and a button that greys out until you stop reads as broken. */
  function anyTime(){ for(var i=0;i<watches.length;i++) if(watches[i].laps.length||watches[i].running||now(watches[i])>0) return true; return false; }
  function maxLaps(){ var m=0; for(var i=0;i<watches.length;i++) m=Math.max(m,watches[i].laps.length); return m; }

  function paintOne(w){
    if(w.setDisp) w.setDisp(clk(now(w)));
    w.card.setAttribute("data-state", w.running?"running":"idle");
    w.toggle.textContent = w.running?"Stop":"Start";
    w.lapBtn.disabled = !w.running;
    var n=w.laps.length;
    if(!n){ w.meta.textContent = w.running?"running — no laps yet":"ready"; return; }
    var best=w.laps[0].split, last=w.laps[n-1].split;
    for(var i=1;i<n;i++) if(w.laps[i].split<best) best=w.laps[i].split;
    w.meta.innerHTML = n+" lap"+(n===1?"":"s")+" · last <b>"+clk(last)+"</b> · best <b class=\\"ms-best\\">"+clk(best)+"</b>";
  }
  function paint(){ for(var i=0;i<watches.length;i++) paintOne(watches[i]); }
  function loop(){ paint(); raf = anyRunning() ? requestAnimationFrame(loop) : 0; }
  function kick(){ if(!raf && anyRunning()) raf=requestAnimationFrame(loop); }

  function syncBar(){
    var m=mode(), lim=cap(), n=watches.length;
    wrap.setAttribute("data-view",m);
    board.setAttribute("data-count",String(n));
    /* One word each. This button sits in a row of one-word buttons, and
       "Max 3 stopwatches" was three times the width of anything beside it to
       say what a disabled button already says. */
    addBtn.disabled = n>=lim;
    addBtn.textContent = n>=lim ? "Max" : "Add";
    addBtn.title = n>=lim ? "This layout fits "+lim+" stopwatches" : "Add a stopwatch";
    viewBtn.textContent = m==="desk" ? "Mobile view" : "Desktop view";
    viewBtn.setAttribute("aria-label", m==="desk" ? "Switch to the narrow, mobile layout" : "Switch to the wide, desktop layout");
    /* Over the limit is only reachable by switching TO the narrow view with
       more watches than it fits, or by arriving on a phone with a wide-layout
       session saved. Nothing is stopped and nothing is thrown away — the page
       says what happened and what the two ways out are. */
    var over = n - lim;
    overEl.hidden = over<=0;
    if(over>0) overEl.textContent = (m==="mob"?"Mobile":"This")+" view fits "+lim+
      " stopwatches and you have "+n+". Close "+over+" with the \\u00D7 on "+
      (over===1?"its card":"their cards")+", or switch back to the desktop view. Nothing has been stopped.";
    allBtn.textContent = allRunning() ? "Stop all" : "Start all";
    allBtn.disabled = !watches.length;
    resetBtn.disabled = !watches.length;
    /* greyed, not gone — the same rule the single stopwatch uses, so the row
       does not jump the moment the first watch starts */
    dlBtn.disabled = !anyTime();
    shareBtn.disabled = !anyTime();
    document.title = anyRunning() ? "\\u25B6 Multiple stopwatches" : "Multiple Stopwatches";
  }

  function startW(w){ if(w.running) return; w.running=true; w.startedAt=Date.now(); paintOne(w); syncBar(); save(); kick(); }
  function stopW(w){ if(!w.running) return; w.elapsed=now(w); w.running=false; paintOne(w); syncBar(); save(); }
  function lapW(w){ var t=now(w); w.laps.push({split:t-w.lastLap,total:t}); w.lastLap=t; paintOne(w); syncBar(); save(); }
  /* Reset clears the TIMES. The name and the colour are how you know which card
     this is, and they survive it — clearing them would make Reset all a rename
     of every lane as well as a restart of it. */
  function resetW(w){ w.running=false; w.elapsed=0; w.startedAt=0; w.laps=[]; w.lastLap=0; paintOne(w); syncBar(); save(); }

  /* The colour is a CSS custom property on the card, so the stylesheet decides
     how strongly it is mixed into the background and the border, and one rule
     covers presets and custom picks alike. */
  function tint(w){
    if(w.color){ w.card.style.setProperty("--ms-tint",w.color); w.card.classList.add("ms-tinted"); }
    else { w.card.style.removeProperty("--ms-tint"); w.card.classList.remove("ms-tinted"); }
    var sw=w.panel.querySelectorAll(".ms-sw");
    for(var i=0;i<sw.length;i++) sw[i].setAttribute("aria-pressed", sw[i].getAttribute("data-c")===w.color?"true":"false");
    if(w.color) w.custom.value=w.color;
  }
  function setName(w,v){
    w.name=(String(v).trim()||w.name).slice(0,24);
    w.nameBtn.textContent=w.name;
    if(w.panelName.value!==w.name) w.panelName.value=w.name;
  }
  function closePanel(){ if(!openW) return;
    openW.panel.hidden=true; openW.tintBtn.setAttribute("aria-expanded","false"); openW=null; }
  function openPanel(w){
    if(openW===w){ closePanel(); return; }
    closePanel();
    w.panelName.value=w.name; tint(w);
    w.panel.hidden=false; w.tintBtn.setAttribute("aria-expanded","true"); openW=w;
    w.panelName.focus(); w.panelName.select();
  }

  function make(st,force){
    if(!force && watches.length>=cap()) return null;
    if(watches.length>=MAXD) return null;
    var id=++seq;
    var w={ id:id, name:(st&&st.n)||("Stopwatch "+(watches.length+1)),
            running:!!(st&&st.r), elapsed:(st&&st.e)||0, startedAt:(st&&st.s)||Date.now(),
            laps:(st&&st.l)||[], lastLap:(st&&st.ll)||0, color:(st&&st.c)||"" };
    var el=document.createElement("div");
    el.className="mt-timer ms-watch"; el.setAttribute("data-state","idle");
    el.innerHTML=
      '<button class="mt-x" type="button" aria-label="Remove this stopwatch">&times;</button>'+
      '<div class="mt-head">'+
        '<button class="ms-tintbtn" type="button" aria-expanded="false" aria-label="Name and colour" title="Name and colour">${ico("palette")}</button>'+
        '<button class="mt-name ms-name" type="button" title="Rename"></button>'+
        '<span class="mt-sep">\\u2013</span><button class="mt-reset-link" type="button">Reset</button></div>'+
      '<div class="ms-panel" hidden>'+
        '<label class="ms-field"><span>Name</span><input type="text" class="ms-panel-name" maxlength="24" placeholder="Lane 3"></label>'+
        '<p class="ms-field-lab">Card colour</p>'+
        '<div class="ms-swatches">'+
          '<button type="button" class="ms-sw ms-sw-none" data-c="" title="No colour" aria-label="No colour" aria-pressed="false"></button>'+
          '${SWATCH_HTML}'+
        '</div>'+
        '<label class="ms-field ms-custom"><span>Any other colour</span><input type="color" class="ms-panel-col" value="#3b82f6"></label>'+
        '<button class="btn secondary ms-panel-done" type="button">Done</button>'+
      '</div>'+
      '<div class="mt-row"><div class="mt-disp seg-screen" role="timer" aria-live="off"></div>'+
        '<button class="btn mt-toggle" type="button">Start</button></div>'+
      '<p class="ms-meta hint"></p>'+
      '<button class="btn secondary ms-lap" type="button" disabled>Lap</button>';
    board.appendChild(el);
    w.card=el;
    w.disp=el.querySelector(".mt-disp");
    w.setDisp=window.acSegDisplay(w.disp);
    w.toggle=el.querySelector(".mt-toggle");
    w.lapBtn=el.querySelector(".ms-lap");
    w.meta=el.querySelector(".ms-meta");
    w.nameBtn=el.querySelector(".ms-name");
    w.tintBtn=el.querySelector(".ms-tintbtn");
    w.panel=el.querySelector(".ms-panel");
    w.panelName=w.panel.querySelector(".ms-panel-name");
    w.custom=w.panel.querySelector(".ms-panel-col");
    w.nameBtn.textContent=w.name;
    w.panelName.value=w.name;
    tint(w);

    w.toggle.addEventListener("click",function(){ w.running?stopW(w):startW(w); });
    w.lapBtn.addEventListener("click",function(){ if(w.running) lapW(w); });
    el.querySelector(".mt-reset-link").addEventListener("click",function(){ resetW(w); });
    el.querySelector(".mt-x").addEventListener("click",function(){
      if(openW===w) closePanel();
      var i=watches.indexOf(w); if(i>-1) watches.splice(i,1);
      el.remove(); syncBar(); save(); });

    /* the palette button IS the settings button: name and colour are the two
       things that say which card this is, so they open together */
    w.tintBtn.addEventListener("click",function(e){ e.stopPropagation(); openPanel(w); });
    w.panel.addEventListener("click",function(e){ e.stopPropagation(); });
    /* live: the card renames as you type. An empty field is not a rename — the
       label keeps the last real name until there is something to replace it. */
    w.panelName.addEventListener("input",function(){
      var v=w.panelName.value.trim().slice(0,24);
      if(v) w.name=v;
      w.nameBtn.textContent=w.name; save(); });
    w.panelName.addEventListener("blur",function(){ setName(w,w.panelName.value); save(); });
    w.panelName.addEventListener("keydown",function(e){
      if(e.key==="Enter"){ e.preventDefault(); setName(w,w.panelName.value); save(); closePanel(); } });
    w.panel.addEventListener("click",function(e){
      var b=e.target.closest?e.target.closest(".ms-sw"):null;
      if(!b) return;
      w.color=b.getAttribute("data-c")||""; tint(w); save(); });
    /* "input" rather than "change": dragging through a native colour picker
       repaints the card as you go, which is the whole point of matching one. */
    w.custom.addEventListener("input",function(){ w.color=w.custom.value; tint(w); save(); });
    w.panel.querySelector(".ms-panel-done").addEventListener("click",function(){
      setName(w,w.panelName.value); save(); closePanel(); w.tintBtn.focus(); });

    /* rename in place: the label IS the input, so there is no edit mode to
       discover and nothing to confirm — blur commits, Enter blurs. */
    w.nameBtn.addEventListener("click",function(){
      var inp=document.createElement("input");
      inp.type="text"; inp.className="mt-name ms-name-in"; inp.value=w.name; inp.maxLength=24;
      w.nameBtn.replaceWith(inp); inp.focus(); inp.select();
      function commit(){ setName(w,inp.value); inp.replaceWith(w.nameBtn); save(); }
      inp.addEventListener("blur",commit);
      inp.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); inp.blur(); }
        else if(e.key==="Escape"){ inp.value=w.name; inp.blur(); } });
    });

    watches.push(w); paintOne(w); syncBar(); kick();
    return w;
  }

  addBtn.addEventListener("click",function(){ var w=make(null); if(w) save(); });
  /* pressing it IS the choice — from here on the window is not consulted */
  viewBtn.addEventListener("click",function(){
    view = mode()==="desk" ? "mob" : "desk";
    try{ localStorage.setItem(VKEY,view); }catch(e){}
    syncBar();
  });
  function onMq(){ if(view==="auto") syncBar(); }
  if(MQ.addEventListener) MQ.addEventListener("change",onMq);
  else if(MQ.addListener) MQ.addListener(onMq);
  allBtn.addEventListener("click",function(){
    /* one Date.now() for the whole sweep, so "Start all" really is one instant
       rather than three a few milliseconds apart */
    var t=Date.now(), go=!allRunning();
    for(var i=0;i<watches.length;i++){ var w=watches[i];
      if(go){ if(!w.running){ w.running=true; w.startedAt=t; } }
      else if(w.running){ w.elapsed=w.elapsed+(t-w.startedAt); w.running=false; } }
    paint(); syncBar(); save(); kick(); });
  resetBtn.addEventListener("click",function(){ for(var i=0;i<watches.length;i++) resetW(watches[i]); });
  document.addEventListener("click",function(){ closePanel(); });

  /* ---- the exported file ------------------------------------------------
     ONE ROW PER STOPWATCH, laps across. The old file was one row per lap with a
     pair of columns per watch, which put the thing being compared — the watches
     — at right angles to the thing a spreadsheet compares easily, and needed a
     "Final" row underneath because the totals had nowhere else to go. Name
     first, then a column per lap, then the total; three watches are three rows
     you can read down. /stopwatch/ writes the same shape for its one watch, so
     a file from either page opens the same way and two of them stack.
     No laps anywhere is its own header — "Name,Time" — because a row of empty
     lap columns above a total is a worse answer than the one column. */
  function q(s){ return '"'+String(s).replace(/"/g,'""')+'"'; }
  function csv(){
    var n=maxLaps(), lines, i, j;
    if(!n){ lines=["Name,Time"];
      for(i=0;i<watches.length;i++) lines.push(q(watches[i].name)+","+clk(now(watches[i])));
      return lines.join("\\r\\n"); }
    var head=["Name"]; for(i=1;i<=n;i++) head.push("Lap "+i); head.push("Total time");
    lines=[head.join(",")];
    for(i=0;i<watches.length;i++){ var w=watches[i], row=[q(w.name)];
      for(j=0;j<n;j++) row.push(w.laps[j]?clk(w.laps[j].split):"");
      row.push(clk(now(w))); lines.push(row.join(",")); }
    return lines.join("\\r\\n");
  }

  /* ---- what the file is CALLED -------------------------------------------
     Date and time first, so a folder of exports sorts itself and two sessions
     never overwrite each other. Then the cards' own names — but only the ones
     that were actually named: "stopwatch-1-stopwatch-2" is noise, so a board
     nobody renamed falls back to "stopwatch-times". */
  function isNamed(w){ return !/^Stopwatch \\d+$/.test(w.name); }
  function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,24); }
  function stamp(){ var d=new Date(), p=function(x){ return x<10?"0"+x:""+x; };
    return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes()); }
  function fileBase(){
    var named=[]; for(var i=0;i<watches.length;i++) if(isNamed(watches[i])){ var s=slug(watches[i].name); if(s) named.push(s); }
    return stamp()+"-"+(named.length?named.join("-"):"stopwatch-times");
  }
  function saveFile(blob,name){ try{ var url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},1500); }catch(e){} }
  dlBtn.addEventListener("click",function(){
    saveFile(new Blob([csv()],{type:"text/csv;charset=utf-8"}), fileBase()+".csv"); });

  /* ---- the shareable image ------------------------------------------------
     A COLUMN PER WATCH, not a row: on screen the watches sit side by side and
     that is how the comparison was read, so the picture keeps it. Each column
     wears its card's own colour, mixed against the same near-black the page
     uses — the tint has to be computed here because a canvas has no color-mix.
     Best lap per column in green, the same green the card marks it with. */
  function hex2rgb(h){ h=String(h).replace("#",""); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var v=parseInt(h,16); return [(v>>16)&255,(v>>8)&255,v&255]; }
  function mix(h,amt){ var c=hex2rgb(h), b=[11,14,28], o=[0,0,0];
    for(var i=0;i<3;i++) o[i]=Math.round(c[i]*amt+b[i]*(1-amt));
    return "rgb("+o[0]+","+o[1]+","+o[2]+")"; }
  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function fit(g,s,maxW){ if(g.measureText(s).width<=maxW) return s;
    while(s.length>1 && g.measureText(s+"\\u2026").width>maxW) s=s.slice(0,-1);
    return s+"\\u2026"; }
  function buildImageFile(){
    var n=watches.length, ml=maxLaps(), W=1080, m=24, side=40, gap=16;
    var colW=(W-2*m-2*side-(n-1)*gap)/n, colTop=196, headH=150, rowH=52;
    var colH=headH+Math.max(ml,1)*rowH+18, H=colTop+colH+92;
    var c=document.createElement("canvas"); c.width=W; c.height=H; var g=c.getContext("2d");
    g.fillStyle="#0b0e1c"; g.fillRect(0,0,W,H);
    rr(g,m,m,W-2*m,H-2*m,40); g.fillStyle="#141a33"; g.fill();
    g.lineWidth=2; g.strokeStyle="rgba(255,255,255,.12)"; g.stroke();
    g.textAlign="center"; g.textBaseline="alphabetic";
    g.fillStyle="#e2e8f0"; g.font="800 46px system-ui,-apple-system,Arial,sans-serif";
    g.fillText(n===1?"Stopwatch":n+" Stopwatches",W/2,108);
    var st=stamp(); g.fillStyle="#8ea0b6"; g.font="500 28px system-ui,Arial,sans-serif";
    g.fillText(st.slice(0,10)+" \\u00b7 "+st.slice(11,13)+":"+st.slice(13),W/2,152);
    for(var i=0;i<n;i++){
      var w=watches[i], x=m+side+i*(colW+gap), best=-1;
      if(w.laps.length){ var bmin=Infinity; for(var k=0;k<w.laps.length;k++) if(w.laps[k].split<bmin){ bmin=w.laps[k].split; best=k; } }
      rr(g,x,colTop,colW,colH,20);
      g.fillStyle = w.color ? mix(w.color,.26) : "rgba(255,255,255,.03)"; g.fill();
      g.lineWidth=2; g.strokeStyle = w.color ? mix(w.color,.55) : "rgba(255,255,255,.12)"; g.stroke();
      g.textAlign="center";
      g.fillStyle="#e2e8f0"; g.font="700 32px system-ui,Arial,sans-serif";
      g.fillText(fit(g,w.name,colW-32),x+colW/2,colTop+52);
      g.fillStyle="#3df2c0"; g.font="800 "+(n>2?46:58)+"px ui-monospace,Menlo,Consolas,monospace";
      g.fillText(clk(now(w)),x+colW/2,colTop+120);
      if(!w.laps.length){ g.fillStyle="#8ea0b6"; g.font="500 28px system-ui,Arial,sans-serif";
        g.fillText("no laps",x+colW/2,colTop+headH+34); }
      for(var j=0;j<w.laps.length;j++){ var ry=colTop+headH+34+j*rowH;
        g.strokeStyle="rgba(255,255,255,.10)"; g.lineWidth=1;
        g.beginPath(); g.moveTo(x+20,ry-36); g.lineTo(x+colW-20,ry-36); g.stroke();
        g.textAlign="left"; g.fillStyle="#94a3b8"; g.font="500 28px system-ui,Arial,sans-serif";
        g.fillText("Lap "+(j+1),x+20,ry);
        g.textAlign="right"; g.fillStyle=j===best&&w.laps.length>1?"#4ade80":"#f8fafc";
        g.font="700 30px ui-monospace,Menlo,Consolas,monospace"; g.fillText(clk(w.laps[j].split),x+colW-20,ry); }
    }
    g.textAlign="center"; g.fillStyle="#8ea0b6"; g.font="600 34px system-ui,Arial,sans-serif";
    g.fillText("timeandspace.science/stopwatch/multiple",W/2,H-44);
    /* synchronous dataURL -> File keeps us inside the click gesture (Safari share) */
    var du=c.toDataURL("image/png"), bin=atob(du.split(",")[1]), arr=new Uint8Array(bin.length);
    for(var b=0;b<bin.length;b++) arr[b]=bin.charCodeAt(b);
    return new File([new Blob([arr],{type:"image/png"})],fileBase()+".png",{type:"image/png"});
  }
  function canShareImg(){ try{ return !!(navigator.canShare && navigator.canShare({files:[new File([new Blob([""],{type:"image/png"})],"a.png",{type:"image/png"})]})); }catch(e){ return false; } }
  shareBtn.textContent = canShareImg() ? "Share" : "Save image";
  shareBtn.addEventListener("click",function(){
    if(!anyTime()) return;
    var file; try{ file=buildImageFile(); }catch(e){ return; }
    if(canShareImg()) navigator.share({files:[file],title:"My stopwatch times",text:"My times from Time and Space Science"})["catch"](function(){});
    else saveFile(file,file.name); });

  document.addEventListener("keydown",function(e){
    if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA") return;
    /* a shortcut fired from inside the settings panel would start every watch
       while you were choosing a colour for one of them */
    if(e.target.closest&&e.target.closest(".ms-panel")) return;
    if(e.code==="Space"){ e.preventDefault(); allBtn.click(); }
    else if(e.key==="r"||e.key==="R"){ resetBtn.click(); }
    else if(e.key==="f"||e.key==="F"){ fsBtn.click(); } });
  document.addEventListener("visibilitychange",function(){ if(!document.hidden){ paint(); kick(); } });

  /* The class on the wrap is the layout; real fullscreen is the browser's. They
     have to be torn down together, because a system gesture (an Android back
     swipe, Esc handled by the browser) clears document.fullscreenElement
     without telling the click handler — which left the board stuck in the
     fixed full-viewport layout with the button still reading "Exit full
     screen". Same teardown the single stopwatch and both timers already have. */
  function applyFs(on){
    wrap.classList.toggle("mt-fs",on); document.body.classList.toggle("sw-fs-open",on);
    fsBtn.setAttribute("aria-label",on?"Exit full screen":"Full screen");
  }
  fsBtn.addEventListener("click",function(){
    var on=!wrap.classList.contains("mt-fs");
    applyFs(on);
    if(on){ var rq=wrap.requestFullscreen||wrap.webkitRequestFullscreen;
      if(rq){ try{ var p=rq.call(wrap); if(p&&p["catch"]) p["catch"](function(){}); }catch(_){} } }
    else if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(_){} } });
  function onFsChange(){
    var real=document.fullscreenElement||document.webkitFullscreenElement;
    if(!real&&wrap.classList.contains("mt-fs")) applyFs(false);
  }
  document.addEventListener("fullscreenchange",onFsChange);
  document.addEventListener("webkitfullscreenchange",onFsChange);
  /* Escape closes the settings panel FIRST and full screen only if no panel is
     open — one key, the innermost thing it can dismiss. */
  document.addEventListener("keydown",function(e){ if(e.key!=="Escape") return;
    if(openW){ var t=openW.tintBtn; closePanel(); t.focus(); return; }
    if(wrap.classList.contains("mt-fs")) fsBtn.click(); });

  /* restore, or open with two — one stopwatch on a page called "multiple" is a
     worse first impression than an empty board would be */
  var saved=null; try{ saved=JSON.parse(localStorage.getItem(KEY)||"null"); }catch(e){}
  /* RESTORE PAST THE CAP ON PURPOSE (force). Six saved watches opened on a
     phone are six watches that were running when the tab closed; silently
     dropping three would lose times somebody recorded. They all come back, the
     notice says how many the narrow view fits, and closing one is a decision
     the person makes rather than one the layout makes for them. */
  if(saved&&saved.length){ for(var i=0;i<saved.length&&i<MAXD;i++) make(saved[i],true); }
  else { make(null); make(null); }
  paint(); syncBar(); kick();
})();
</script>
</body>
</html>
`;

mkdirSync(join(root, "stopwatch", "multiple"), { recursive: true });
writeFileSync(join(root, "stopwatch", "multiple", "index.html"), html);
console.log(`built ${PATH} (up to ${MAX_DESK} wide, ${MAX_MOB} narrow)`);
