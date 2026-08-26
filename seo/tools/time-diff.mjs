/* time-diff.mjs — "how long between these two times", with a time zone on EACH
 * side. Shared by /time-difference-calculator/ (the full page) and the home
 * page's card, so the two can't drift into two different calculators.
 *
 * WHY TWO ZONES AND NOT ONE. The calculator started with a single zone select
 * covering both times, which answers "how long is my shift" and nothing else.
 * The two questions people actually arrive with are cross-zone: "I leave at
 * 10:00 here and land at 18:00 there — how long was I in the air?", and "it's
 * 9 in the morning here, what is it on the other coast?". Both need a zone per
 * side, and once each side has one, the same-zone case is just the special
 * case where the two selects agree.
 *
 * THE ANSWER IS ALWAYS THE NEXT ONE, i.e. in [0, 24h). The end time is pinned
 * to whichever calendar day in ITS OWN zone puts it at or after the start,
 * within a day — so 10:00 PM to 6:00 AM is 8 hours rather than a negative
 * number, and a pair that straddles the date line doesn't come out 20-odd
 * hours wrong because "today" is a different date on the two sides. Days are
 * stepped through the CALENDAR, never by adding 86,400,000 ms, so a day that
 * is 23 or 25 hours long stays that length.
 *
 * ONE INSTANCE PER PAGE. The ids are fixed rather than prefixed — no page here
 * carries two of these, and a prefix argument would buy nothing but a chance
 * to pass two different ones to the markup and the script.
 */
import { esc } from "./lib.mjs";
import { WC_CITY_LIST } from "./wc-cities.mjs";
import { citySlug } from "./cities.mjs";

/* Tier 1 of the world-clock list: one city per distinct UTC offset — the same
 * "every clock on earth, no duplicates" set the world clock hub grids. A zone
 * chosen here therefore always has exactly one /world-clock/<slug>/ page to
 * link onward to. */
export const TDIFF_ZONES = WC_CITY_LIST.filter((c) => c.tier === 1);

const placeLabel = (c) => (c.area === "USA" && c.region ? `${c.city}, ${c.region}` : `${c.city}, ${c.area}`);

/** the <option> list, identical in both selects */
export const TDIFF_ZONE_OPTIONS = TDIFF_ZONES.map((c) =>
  `<option value="${esc(c.tz)}" data-slug="${esc(citySlug(c.city))}" data-label="${esc(placeLabel(c))}">${esc(placeLabel(c))}</option>`
).join("");

const zoneSelect = (id, label) => `<label>${label}
          <select id="${id}">
            <option value="">Your device's time zone</option>
            <optgroup label="Or choose a place">${TDIFF_ZONE_OPTIONS}</optgroup>
          </select>
        </label>`;

/* The two legs, the read-out and the two sentences under it. `compact` drops
 * the minutes pill and the onward links — the home card is a teaser for the
 * full page and doesn't need to repeat everything it does. */
export const tdiffForm = ({ compact = false } = {}) => `<div class="tdiff-form">
      <div class="tdiff-leg">
        <label>Start time<input type="time" id="tdiff-start" value="09:00"></label>
        ${zoneSelect("tdiff-tz1", "Time zone")}
      </div>
      <div class="tdiff-leg">
        <label>End time<input type="time" id="tdiff-end" value="17:00"></label>
        ${zoneSelect("tdiff-tz2", "Time zone")}
      </div>
    </div>
    <p class="tdiff-result" id="tdiff-result" aria-live="polite">8h 00m</p>
${compact ? "" : `    <p class="duration-equivalent" id="tdiff-mins">480 minutes</p>\n`}    <p class="sub tdiff-sum" id="tdiff-summary"></p>
    <p class="hint tdiff-cross" id="tdiff-cross" hidden></p>
    <p class="tool-msg-warn" id="tdiff-note" hidden></p>${compact ? "" : `
    <p class="tdiff-actions"><a id="tdiff-timer-link" href="/timer/">Set a timer for this long →</a> <a id="tdiff-wc-link" href="/world-clock/" hidden>See this place on the world clock →</a></p>`}`;

/* The calculator itself. Everything is done in real instants (epoch ms) and
 * only rendered as wall clock, which is the only way a cross-zone span with a
 * daylight-saving change inside it comes out right. */
export const TDIFF_JS = `
(function(){
  var s1=document.getElementById('tdiff-start'), s2=document.getElementById('tdiff-end');
  if(!s1||!s2) return;
  var z1=document.getElementById('tdiff-tz1'), z2=document.getElementById('tdiff-tz2');
  var out=document.getElementById('tdiff-result'), minsEl=document.getElementById('tdiff-mins'),
      sumEl=document.getElementById('tdiff-summary'), crossEl=document.getElementById('tdiff-cross'),
      noteEl=document.getElementById('tdiff-note'),
      timerLink=document.getElementById('tdiff-timer-link'), wcLink=document.getElementById('tdiff-wc-link');
  function pad(n){ return (n<10?'0':'')+n; }
  /* how far tz is from UTC at a given instant, in ms — the same
     double-formatting technique the "Where the sun will be" card uses
     (orrery.mjs orrOffset). Omitting timeZone reads the device's own zone, so
     tz='' (the default option) needs no special case. */
  function offsetAt(ms,tz){
    try{
      var o={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'};
      if(tz) o.timeZone=tz;
      var ps=new Intl.DateTimeFormat('en-GB',o).formatToParts(new Date(ms));
      function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return +ps[i].value; return 0; }
      return Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'),g('second'))-ms;
    }catch(e){ return 0; }
  }
  /* a wall-clock reading in tz -> epoch. Two passes, because the offset has to
     be measured somewhere and the first guess can land on the far side of a
     daylight-saving change from the real answer. */
  function zonedToUtc(y,mo,d,h,mi,tz){
    var guess=Date.UTC(y,mo-1,d,h,mi), o1=offsetAt(guess,tz), t=guess-o1, o2=offsetAt(t,tz);
    if(o2!==o1) t=guess-o2;
    return t;
  }
  function todayIn(tz){
    try{
      var o={year:'numeric',month:'2-digit',day:'2-digit'};
      if(tz) o.timeZone=tz;
      var ps=new Intl.DateTimeFormat('en-CA',o).formatToParts(new Date());
      function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return +ps[i].value; return 0; }
      return [g('year'),g('month'),g('day')];
    }catch(e){ var n=new Date(); return [n.getFullYear(),n.getMonth()+1,n.getDate()]; }
  }
  /* step a calendar date by whole days — NOT by adding ms, so a 23- or 25-hour
     day keeps its real length once the date is turned back into an instant */
  function shiftDay(ymd,n){ var dt=new Date(Date.UTC(ymd[0],ymd[1]-1,ymd[2]+n)); return [dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate()]; }
  function fmt12(h,m){ var ap=h<12?'AM':'PM', t=h%12; if(!t) t=12; return t+':'+pad(m)+' '+ap; }
  /* the same instant, read off a clock in tz */
  function clockIn(ms,tz){
    try{
      var o={hour:'numeric',minute:'2-digit',hour12:true};
      if(tz) o.timeZone=tz;
      return new Intl.DateTimeFormat('en-US',o).format(new Date(ms));
    }catch(e){ return ''; }
  }
  function dayIn(ms,tz){
    try{
      var o={weekday:'long'};
      if(tz) o.timeZone=tz;
      return new Intl.DateTimeFormat('en-US',o).format(new Date(ms));
    }catch(e){ return ''; }
  }
  function fmtDur(totalMin){ var m=Math.max(0,totalMin), h=Math.floor(m/60); return h+'h '+pad(m%60)+'m'; }
  function labelOf(sel){ var o=sel.selectedOptions[0]; return sel.value?o.getAttribute('data-label'):'your time zone'; }

  function calc(){
    var sv=s1.value, ev=s2.value;
    if(!sv||!ev) return;
    var tzA=z1.value, tzB=z2.value;
    var sh=+sv.slice(0,2), sm=+sv.slice(3,5), eh=+ev.slice(0,2), em=+ev.slice(3,5);
    var dA=todayIn(tzA), startMs=zonedToUtc(dA[0],dA[1],dA[2],sh,sm,tzA);
    /* the end time on whichever day in ITS zone lands within 24h after the
       start — which is what "between these two times" means, and what keeps a
       date-line pair from coming out a day out */
    var dB=todayIn(tzB), endMs=zonedToUtc(dB[0],dB[1],dB[2],eh,em,tzB), guard=0;
    while(endMs<startMs && guard++<3){ dB=shiftDay(dB,1); endMs=zonedToUtc(dB[0],dB[1],dB[2],eh,em,tzB); }
    guard=0;
    while(endMs-startMs>=86400000 && guard++<3){ dB=shiftDay(dB,-1); endMs=zonedToUtc(dB[0],dB[1],dB[2],eh,em,tzB); }
    var totalMin=Math.round((endMs-startMs)/60000);
    out.textContent=fmtDur(totalMin);
    if(minsEl) minsEl.textContent=Math.max(0,totalMin)+' minutes';

    var labA=labelOf(z1), labB=labelOf(z2), sameZone=(tzA===tzB);
    /* "the next day" is a fact about the END zone's calendar, so it is read
       off that zone rather than assumed from the clock faces */
    var nextDay=dayIn(startMs,tzB)!==dayIn(endMs,tzB);
    sumEl.textContent='From '+fmt12(sh,sm)+' in '+labA+' to '+fmt12(eh,em)+(nextDay?' the next day':'')+' in '+labB+' is '+fmtDur(totalMin)+'.';

    /* the other question the same two zones answer: what that first moment
       reads on the second clock. Meaningless when both sides are one zone. */
    if(sameZone){ crossEl.hidden=true; crossEl.textContent=''; }
    else{
      var there=clockIn(startMs,tzB), gapMin=Math.round((offsetAt(startMs,tzB)-offsetAt(startMs,tzA))/60000);
      var ah=Math.floor(Math.abs(gapMin)/60), am=Math.abs(gapMin)%60;
      /* half- and quarter-hour zones exist (India, Nepal, Chatham), so the gap
         has to carry minutes — but "0 hours 30 minutes" is not how anyone says
         it, so a sub-hour gap drops the hours entirely */
      var span=ah?(ah+' hour'+(ah===1?'':'s')+(am?' '+am+' minutes':'')):(am+' minutes');
      var gapTxt=gapMin===0?'those two clocks read the same':(span+' '+(gapMin>0?'ahead':'behind'));
      crossEl.hidden=false;
      crossEl.textContent='Put another way: '+fmt12(sh,sm)+' in '+labA+' is '+there+' in '+labB+' — '+
        (gapMin===0?gapTxt+'.':labB+' is '+gapTxt+'.');
    }

    /* A clock-face subtraction is only a meaningful comparison inside ONE
       zone; across two it is not wrong so much as not a quantity. So the
       daylight-saving callout is same-zone only. */
    if(sameZone){
      var clockMin=(eh*60+em)-(sh*60+sm); if(clockMin<0) clockMin+=1440;
      if(clockMin!==totalMin){
        noteEl.hidden=false;
        noteEl.textContent='This span crosses a daylight-saving change: the clock reads '+fmtDur(clockMin)+', but '+fmtDur(totalMin)+' of real time passes.';
      } else noteEl.hidden=true;
    } else noteEl.hidden=true;

    if(timerLink){ var mm=Math.max(0,totalMin); timerLink.href='/timer/?h='+Math.floor(mm/60)+'&m='+(mm%60); }
    if(wcLink){
      /* the onward world-clock link follows the END zone: the "what time is it
         there" question is about where you are going, not where you left */
      var o2=z2.selectedOptions[0], slug=z2.value?o2.getAttribute('data-slug'):'';
      if(slug){ wcLink.hidden=false; wcLink.href='/world-clock/'+slug+'/'; wcLink.textContent='See '+labB+' on the world clock →'; }
      else wcLink.hidden=true;
    }
  }
  z1.addEventListener('change',calc); z2.addEventListener('change',calc);
  s1.addEventListener('input',calc); s2.addEventListener('input',calc);
  calc();
})();
`;
