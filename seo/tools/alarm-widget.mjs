/* alarm-widget.mjs — shared markup + controller for the alarm clock, used by
 * both /alarm/ (build-alarm.mjs) and the home page (build-home.mjs). The
 * controller guards a missing inline list (#ac-list) so the widget works on the
 * home page (where only the clock + dialogs are embedded). */

import { minifyJs } from "./lib.mjs";

const dayChips = [["0", "Su"], ["1", "Mo"], ["2", "Tu"], ["3", "We"], ["4", "Th"], ["5", "Fr"], ["6", "Sa"]]
  .map((d) => `<label><input type="checkbox" value="${d[0]}"><span>${d[1]}</span></label>`).join("");
const weekOpts = [["1", "1st"], ["2", "2nd"], ["3", "3rd"], ["4", "4th"], ["last", "last"]].map((w) => `<option value="${w[0]}">${w[1]}</option>`).join("");
const wdOpts = [["0", "Sunday"], ["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"], ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"]].map((w) => `<option value="${w[0]}">${w[1]}</option>`).join("");
const timeMarkup = `<span class="dig" data-d="h1"></span><span class="dig" data-d="h2"></span><span class="ac-colon"><i></i><i></i></span><span class="dig" data-d="m1"></span><span class="dig" data-d="m2"></span>`;
/* Full-screen icon — shared by the Full screen button and the hint message
 * below the clock so the two always use the same glyph. */
export const FS_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5"/><path d="M4 4l6 6"/><path d="M20 9V4h-5"/><path d="M20 4l-6 6"/><path d="M4 15v5h5"/><path d="M4 20l6-6"/><path d="M20 15v5h-5"/><path d="M20 20l-6-6"/></svg>`;

/* the clock panel (no inline #ac-list — that's page-specific) */
/* data-c ships on the markup so the LED is the default colour on first paint
   rather than flashing the stylesheet's base red and then being corrected. The
   script still owns it after that — a visitor who has picked a colour has it in
   localStorage, and applyColor() overwrites this on boot. */
export const PANEL_HTML = `<div id="ac-panel" data-c="purple">
    <div id="ac-stage">
    <button type="button" class="ac-close-tl" id="ac-close-tl" aria-label="Exit full screen" title="Exit full screen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="ac-batt" id="ac-batt" hidden aria-hidden="true"><svg class="ac-batt-bolt" viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg><span id="ac-batt-pct"></span></div>
    <div class="ac-clock">
      <div class="ac-left"><span class="ac-time" id="ac-time">${timeMarkup}</span><span class="ac-ampm" id="ac-ampm">--</span></div>
      <div class="ac-right"><div class="ac-date" id="ac-date">--</div><div class="ac-alarms" id="ac-alarms"></div></div>
    </div>
  </div>
  <div class="ac-ring" id="ac-ring" hidden>⏰ <span id="ac-ring-label"></span></div>
  <div class="ac-alert" id="ac-alert" role="status" hidden></div>
  <div class="ac-controls">
    <div class="ac-ctrl-row ac-ctrl-main">
      <button class="btn" id="ac-edit-open" type="button">Add/Edit</button>
      <button class="btn" id="ac-stop" type="button">Stop alarm</button>
    </div>
    <div class="ac-ctrl-row ac-ctrl-icons">
      <button class="btn ac-icon" id="ac-help" type="button" aria-label="Jump to instructions" title="Instructions">?</button>
      <button class="btn ac-icon ac-swatch" id="ac-color" type="button" aria-label="Change display color" title="Change display color"></button>
      <button class="btn ac-icon" id="ac-fs" type="button" aria-label="Full screen" title="Full screen">${FS_ICON}</button>
      <button class="btn ac-icon" id="ac-ontop" type="button" aria-label="Pop out" title="Pop out — a small clock that floats above your other windows"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="11.5" y="11" width="7.5" height="6" rx="1" fill="currentColor" stroke="none"/></svg></button>
      <button class="btn ac-icon" id="ac-close" type="button" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
  </div>
    <div class="ac-brand"><a href="/" target="_blank" rel="noopener">Time and Space Science</a><a href="/alarm-clock/about/" target="_blank" rel="noopener">How it works</a></div>
    <p class="ac-fs-legal"><a href="/browser-limitations/" target="_blank" rel="noopener">Browser Limitations</a> · <a href="/alarm-clock/warnings/" target="_blank" rel="noopener">Warnings</a></p>
  </div>`;

export const DIALOGS_HTML = `<dialog class="ac-dialog" id="ac-dialog">
  <form class="ac-form" method="dialog">
    <h2 id="ac-dlg-title">Set alarm</h2>
    <label>Time<input type="time" id="ac-f-time" required></label>
    <label>Label<input type="text" id="ac-f-label" readonly tabindex="-1" aria-readonly="true"></label>
    <p class="ac-label-hint">Generated automatically from the time and repeat settings — not editable.</p>
    <label>Repeat<select id="ac-f-repeat">
      <option value="once">One time</option>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly (pick days)</option>
      <option value="monthdate">Monthly (by date)</option>
      <option value="monthweekday">Monthly (by weekday)</option>
    </select></label>
    <div class="ac-f-sub" id="ac-f-weekly" hidden><div class="ac-f-days">${dayChips}</div></div>
    <label class="ac-f-sub" id="ac-f-dom" hidden>Day of month<input type="number" id="ac-f-dom-val" min="1" max="31" value="1"></label>
    <div class="ac-f-sub ac-f-mw" id="ac-f-mw" hidden><select id="ac-f-week">${weekOpts}</select><select id="ac-f-wd">${wdOpts}</select></div>
    <label>Sound<select id="ac-f-sound"><option value="beep">Beep</option><option value="chime">Chime</option><option value="mellow">Mellow</option><option value="bell">Bell</option><option value="siren">Siren</option></select></label>
    <p class="ac-vol-hint">The alarm plays at your device's volume — Test before saving.</p>
    <p class="ac-vol-hint">⚠ Rings only while this page stays open — for anything important, also set your phone's built-in alarm as backup. <a href="/alarm-clock/about/" target="_blank" rel="noopener">How this works</a></p>
    <div class="ac-form-btns ac-btns-3"><button type="button" class="btn secondary" id="ac-cancel">Cancel</button><button type="button" class="btn secondary" id="ac-test">Test</button><button type="button" class="btn" id="ac-save">Save</button></div>
  </form>
</dialog>

<dialog class="ac-dialog" id="ac-edit">
  <div class="ac-form">
    <h2>Your alarms</h2>
    <div class="ac-list" id="ac-editlist"></div>
    <div class="ac-form-btns"><button type="button" class="btn secondary" id="ac-edit-add">＋ Add</button><button type="button" class="btn" id="ac-edit-close">Done</button></div>
  </div>
</dialog>`;

export const WIDGET_JS = minifyJs(`
(function(){
  var $=function(s){return document.querySelector(s);};
  if(!$('#ac-panel')) return;
  var timeEl=$('#ac-time'), ampmEl=$('#ac-ampm'), dateEl=$('#ac-date'), alarmsEl=$('#ac-alarms'),
      listEl=$('#ac-list'), editListEl=$('#ac-editlist'),
      ringEl=$('#ac-ring'), ringLabel=$('#ac-ring-label'),
      stopBtn=$('#ac-stop'), editOpenBtn=$('#ac-edit-open'), fsBtn=$('#ac-fs'), closeBtn=$('#ac-close'),
      dlg=$('#ac-dialog'), dlgTitle=$('#ac-dlg-title'), editDlg=$('#ac-edit'),
      fTime=$('#ac-f-time'), fLabel=$('#ac-f-label'), fRepeat=$('#ac-f-repeat'),
      fWeekly=$('#ac-f-weekly'), fDom=$('#ac-f-dom'), fDomV=$('#ac-f-dom-val'), fMw=$('#ac-f-mw'), fWeek=$('#ac-f-week'), fWd=$('#ac-f-wd'), fSound=$('#ac-f-sound');
  var WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], DOW=['sun','mon','tue','wed','thu','fri','sat'];
  var ac=null, alarmTimer=0, alarms=[], editId=null, DOC_TITLE=document.title;
  /* Firing is measured against the PREVIOUS tick, not against the current
     minute string — see prevFire(). lastTick starts at load so catch-up only
     covers alarms that came due while this page was open. */
  var lastTick=Date.now(), MISSED_GRACE=180000;

  var SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','':''};
  var digs={};
  [].slice.call(timeEl.querySelectorAll('.dig')).forEach(function(el){ 'abcdefg'.split('').forEach(function(s){ var i=document.createElement('i'); i.className='seg seg-'+s; el.appendChild(i); }); digs[el.getAttribute('data-d')]=el; });
  var SEGL='abcdefg';
  function setDigit(el,ch){ el.style.visibility=(ch==='')?'hidden':'visible'; var on=SEG[ch]||''; for(var i=0;i<7;i++){ el.children[i].classList.toggle('on', on.indexOf(SEGL.charAt(i))>-1); } }

  function uid(){ return Math.random().toString(36).slice(2,9); }
  function pad(n){ return n<10?'0'+n:''+n; }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function normTime(t){ var p=String(t).split(':'); return pad(parseInt(p[0],10)||0)+':'+pad(parseInt(p[1],10)||0); }
  function fmt12(t){ var p=t.split(':'),h=+p[0],m=+p[1],ap=h<12?'AM':'PM',hh=h%12; if(hh===0)hh=12; return hh+':'+pad(m)+' '+ap; }
  function ordinal(n){ var s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function find(id){ for(var i=0;i<alarms.length;i++) if(alarms[i].id===id) return alarms[i]; return null; }
  function nextOnceDate(t){ var p=t.split(':'),now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),+p[0],+p[1],0,0); if(d.getTime()<=now.getTime()) d.setDate(d.getDate()+1); return ymd(d); }

  /* "Mon, Wed, Fri" but collapse runs of 3+ consecutive days to "Mon–Fri". */
  function condenseDays(days){ days=(days||[]).slice().sort(function(a,b){return a-b;}); var out=[],i=0; while(i<days.length){ var j=i; while(j+1<days.length && days[j+1]===days[j]+1) j++; if(j-i>=2) out.push(WD[days[i]]+'–'+WD[days[j]]); else for(var k=i;k<=j;k++) out.push(WD[days[k]]); i=j+1; } return out.join(', '); }
  function repeatDesc(a){
    if(a.type==='daily') return 'Daily';
    if(a.type==='weekly') return condenseDays(a.days)||'Weekly';
    if(a.type==='monthdate') return 'Monthly · '+ordinal(a.dom);
    if(a.type==='monthweekday') return 'Monthly · '+(a.week==='last'?'last':ordinal(parseInt(a.week,10)))+' '+WD[a.wd];
    return 'One time';
  }
  function matches(a,now){
    if(a.type==='daily') return true;
    if(a.type==='weekly') return (a.days||[]).indexOf(now.getDay())>-1;
    /* "the 31st" in a 30-day month, or the 29th-31st in February, has no such
       date. Clamp to the month's last day rather than skipping the month in
       silence — an alarm that just does not go off in June is the failure this
       whole widget exists to avoid. */
    if(a.type==='monthdate'){ var dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); return now.getDate()===Math.min(a.dom,dim); }
    if(a.type==='monthweekday'){ if(now.getDay()!==a.wd) return false; if(a.week==='last'){ var dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); return now.getDate()+7>dim; } return (Math.floor((now.getDate()-1)/7)+1)===parseInt(a.week,10); }
    if(a.type==='once') return ymd(now)===a.date;
    return false;
  }
  /* timestamp of the next time this alarm will fire (Infinity if never) */
  function nextFire(a){ var p=String(a.time||'0:0').split(':'), hh=parseInt(p[0],10)||0, mm=parseInt(p[1],10)||0, now=new Date();
    for(var i=0;i<367;i++){ var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,hh,mm,0,0); if(d.getTime()<=now.getTime()) continue; if(matches(a,d)) return d.getTime(); }
    return Infinity; }
  /* The mirror of nextFire: the most recent instant this alarm was DUE, at or
   * before the given moment (0 if it has never been due). Firing used to test the current
   * minute string against a.time, which meant a tick that arrived at 07:01 —
   * background-tab throttling, or the machine asleep — skipped a 07:00 alarm
   * entirely and nothing ever went back for it. Comparing scheduled INSTANTS
   * instead also handles the spring-forward gap: an alarm set for a wall time
   * that does not exist that night still has a passed instant, so it rings. */
  function prevFire(a,now){ var p=String(a.time||'0:0').split(':'), hh=parseInt(p[0],10)||0, mm=parseInt(p[1],10)||0;
    for(var i=0;i<367;i++){ var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i,hh,mm,0,0); if(d.getTime()>now.getTime()) continue; if(matches(a,d)) return d.getTime(); }
    return 0; }

  function load(){ try{ alarms=JSON.parse(localStorage.getItem('ac_alarms')||'[]')||[]; }catch(e){ alarms=[]; } cleanupExpired(); }
  function save(){ try{ localStorage.setItem('ac_alarms',JSON.stringify(alarms)); }catch(e){} }

  /* Drop one-time alarms more than 2 hours past their scheduled time, so the
   * list stays clean once an alarm is no longer needed (whether it rang or the
   * tab was closed when it was due). Recurring alarms (daily/weekly/monthly)
   * are always kept. Returns true if anything was removed. */
  function cleanupExpired(){ var now=Date.now(), n=alarms.length;
    alarms=alarms.filter(function(a){ if(a.type!=='once'||!a.date) return true;
      var dp=String(a.date).split('-'), tp=String(a.time||'0:0').split(':');
      var fireT=new Date(+dp[0],(+dp[1])-1,+dp[2],parseInt(tp[0],10)||0,parseInt(tp[1],10)||0,0,0).getTime();
      return (now-fireT)<=7200000; });
    if(alarms.length!==n){ save(); return true; } return false; }

  function byNext(x,y){ return nextFire(x)-nextFire(y); }
  /* Reproduce the auto-generated label for an alarm, so the list can tell an
   * auto label (which just repeats the time/schedule already shown) from a
   * custom name the user typed — only the latter is worth showing. */
  function autoLabelFor(a){ if(!a.time) return ''; var tt=fmt12(a.time);
    if(a.type==='daily') return tt+' · daily';
    if(a.type==='weekly') return tt+' · '+((a.days&&a.days.length)?condenseDays(a.days):WD[new Date().getDay()])+' · weekly';
    if(a.type==='monthdate') return tt+' · '+ordinal(a.dom||1)+' · monthly';
    if(a.type==='monthweekday') return tt+' · '+(WKN[a.week]||a.week)+' '+WD[a.wd]+' · monthly';
    var nd=String(a.date||'').split('-'); return (nd.length===3?MON3[(+nd[1])-1]+' '+(+nd[2]):'')+' · '+tt; }
  function listHtml(){ var arr=alarms.slice().sort(byNext); return arr.length ? arr.map(function(a){ var custom=(a.label && a.label!==autoLabelFor(a)) ? ' · '+escapeHtml(a.label) : ''; return '<div class="ac-li"><label class="ac-li-on"><input type="checkbox" class="ac-tog" aria-label="Alarm on/off" data-id="'+a.id+'"'+(a.on?' checked':'')+'></label><div class="ac-li-main"><b>'+fmt12(a.time)+'</b>'+custom+'<span class="ac-li-rep">'+repeatDesc(a)+'</span></div><button class="ac-editbtn" data-id="'+a.id+'">Edit</button><button class="ac-del" data-id="'+a.id+'" aria-label="Delete alarm">×</button></div>'; }).join('') : ''; }
  function render(){
    var on=alarms.filter(function(a){return a.on;}).slice().sort(byNext);
    /* On the red clock face, show each upcoming alarm as "M/D - time" (the date
     * of its NEXT occurrence, so you can tell if it fires today, tomorrow or
     * further out), next to fire first. No labels — a long label breaks the
     * layout; the full name lives in the list below the buttons. */
    alarmsEl.innerHTML = on.length ? on.slice(0,4).map(function(a){
      var nf=nextFire(a), tm=fmt12(a.time);
      if(!isFinite(nf)) return '<div class="ac-alarm-row">'+tm+'</div>';
      var d=new Date(nf); return '<div class="ac-alarm-row">'+(d.getMonth()+1)+'/'+d.getDate()+' - '+tm+'</div>';
    }).join('') : '<div class="ac-alarm-row ac-dim">no alarms</div>';
    var h=listHtml(); if(listEl) listEl.innerHTML=h; if(editListEl) editListEl.innerHTML=h;
  }

  function unlock(){ try{ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume().then(checkAudio,checkAudio); }catch(e){} checkAudio(); }

  /* ------------------------------------------------------ the alert bar ---
   * One visible surface for the two ways this clock can fail QUIETLY: an alarm
   * whose moment passed without ringing, and a browser that will not make a
   * sound until the page has been tapped. Both used to be invisible — the
   * audio one doubly so, because every audio call is wrapped in catch(e){} and
   * a suspended context throws nothing at all, it just plays silence. */
  var alertEl=$('#ac-alert'), audioWarned=false, missedAt=0;
  function showAlert(html){ if(!alertEl) return; alertEl.innerHTML=html; alertEl.hidden=false; }
  function hideAlert(){ if(alertEl){ alertEl.hidden=true; alertEl.innerHTML=''; } audioWarned=false; missedAt=0; }
  /* True when the browser is holding sound back: a context that exists and is
   * still suspended after a resume() attempt will play nothing. */
  function audioBlocked(){ return !!(ac && ac.state==='suspended'); }
  function anyOn(){ for(var i=0;i<alarms.length;i++) if(alarms[i].on) return true; return false; }
  function checkAudio(){
    if(missedAt) return;                       // a missed alarm is the bigger news
    if(audioBlocked() && anyOn()){ audioWarned=true;
      showAlert('Sound is blocked until you tap the page — tap anywhere to enable the alarm sound.'); }
    else if(audioWarned){ hideAlert(); if(alarmTimer) startSound(ringingSound); }
  }
  /* Probing costs one AudioContext, so only do it when there is actually an
   * alarm armed — that is the only case where silence would matter. */
  function auditAudio(){ if(anyOn()){ try{ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } checkAudio(); }
  function showMissed(a,due){
    missedAt=due;
    var d=new Date(due), sameDay=ymd(d)===ymd(new Date());
    showAlert('Missed alarm: <b>'+fmt12(a.time)+'</b>'+(sameDay?'':' on '+(d.getMonth()+1)+'/'+d.getDate())+
      ' — this tab was asleep or throttled when it was due, so it did not ring.'+
      '<button type="button" id="ac-missed-x">Dismiss</button>');
    var x=$('#ac-missed-x'); if(x) x.addEventListener('click',hideAlert);
  }
  function beep(){ try{ unlock(); var o=ac.createOscillator(),g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='square'; o.frequency.value=1000; g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.4,ac.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+0.4); o.start(); o.stop(ac.currentTime+0.42); }catch(e){} }
  /* Vibrate alongside the beep where supported (Android Chrome/Firefox; iOS
   * Safari has no Vibration API, and it only fires while the page is visible). */
  /* a few selectable alarm tones, all synthesized (no audio files) */
  function chime(){ try{ unlock(); var t=ac.currentTime; [880,1320].forEach(function(f,i){ var o=ac.createOscillator(),g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sine'; o.frequency.value=f; var s=t+i*0.18; g.gain.setValueAtTime(0.0001,s); g.gain.exponentialRampToValueAtTime(0.35,s+0.02); g.gain.exponentialRampToValueAtTime(0.0001,s+0.4); o.start(s); o.stop(s+0.42); }); }catch(e){} }
  function bell(){ try{ unlock(); var t=ac.currentTime, g=ac.createGain(); g.connect(ac.destination); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.4,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.7); [800,1600,2400,3200].forEach(function(f,i){ var o=ac.createOscillator(),og=ac.createGain(); o.type='sine'; o.frequency.value=f; og.gain.value=[0.5,0.3,0.15,0.08][i]; o.connect(og); og.connect(g); o.start(t); o.stop(t+0.72); }); }catch(e){} }
  function siren(){ try{ unlock(); var t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sawtooth'; o.frequency.setValueAtTime(700,t); o.frequency.linearRampToValueAtTime(1100,t+0.25); o.frequency.linearRampToValueAtTime(700,t+0.5); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.03); g.gain.setValueAtTime(0.35,t+0.47); g.gain.exponentialRampToValueAtTime(0.0001,t+0.55); o.start(t); o.stop(t+0.57); }catch(e){} }
  /* Mellow: a soft warm note (gentle slow attack, long fade, faint harmonic). */
  function mellow(){ try{ unlock(); var t=ac.currentTime, o=ac.createOscillator(), o2=ac.createOscillator(), g=ac.createGain(), g2=ac.createGain(); o.type='sine'; o.frequency.value=523.25; o2.type='sine'; o2.frequency.value=784; g2.gain.value=0.35; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.2,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+0.95); o.start(t); o2.start(t); o.stop(t+1); o2.stop(t+1); }catch(e){} }
  var SOUNDS={beep:beep,chime:chime,mellow:mellow,bell:bell,siren:siren};
  function playSound(k){ (SOUNDS[k]||beep)(); }
  var ringingSound='beep';
  function startSound(k){ ringingSound=k||'beep'; if(alarmTimer){ clearInterval(alarmTimer); } playSound(k); var n=0; alarmTimer=setInterval(function(){ playSound(k); if(++n>=150) stopRing(); },800); }
  function testSound(){ acNotifyInit(); unlock(); var k=fSound?fSound.value:'beep', c=0; (function rep(){ playSound(k); if(++c<3) setTimeout(rep,800); })(); }
  function fire(a){ ringLabel.textContent=a.label||fmt12(a.time); ringEl.hidden=false; document.body.classList.add('ac-alarming'); clearTimeout(idleTimer); clearIdle(); document.title='⏰ Alarm!'; startSound(a.sound); if(window.acNotify) acNotify.show({ body:(a.label||fmt12(a.time))+' — tap Stop.' }); if(a.type==='once'){ a.on=false; } save(); render();
    /* The shade is up and the tones have been "played". If the context is
     * suspended they made no sound, and a sleeping user is being shown a
     * silent alarm — say so, and re-ring the moment a tap unblocks audio. */
    unlock(); if(audioBlocked()){ audioWarned=true; showAlert('Your alarm is ringing but this browser is blocking sound until you tap the page — tap anywhere to hear it.'); } }
  function stopRing(){ clearInterval(alarmTimer); alarmTimer=0; ringEl.hidden=true; document.body.classList.remove('ac-alarming'); document.title=DOC_TITLE; if(window.acNotify) acNotify.clear(); if(audioWarned) hideAlert(); scheduleHide(); }
  /* register the notifications service worker + ask permission, tied to a user
   * gesture (saving an alarm or tapping Test). A tap on the shade's Stop button
   * silences the ring. */
  function acNotifyInit(){ if(window.acNotify) acNotify.init({ sw:'/alarm-clock/sw.js', tag:'ac-alarm', title:'⏰ Alarm!', body:'Your alarm is ringing — tap Stop.' }, stopRing); }

  function tick(){
    if(cleanupExpired()) render();
    var now=new Date(), h=now.getHours(), m=now.getMinutes(), ap=h<12?'AM':'PM', hh=h%12; if(hh===0)hh=12;
    setDigit(digs.h1, hh>=10?'1':''); setDigit(digs.h2, String(hh%10)); setDigit(digs.m1, String(Math.floor(m/10))); setDigit(digs.m2, String(m%10));
    ampmEl.textContent=ap;
    dateEl.textContent=WD[now.getDay()].toUpperCase()+'  '+(now.getMonth()+1)+'/'+now.getDate();
    /* Fire on "the scheduled instant has passed since the last tick", never on
     * "the clock now reads exactly a.time". lastTick starts at load, so this
     * only ever catches up on alarms that came due while the page was open —
     * it does not resurrect this morning's alarm for someone opening the tab
     * at lunchtime. An instant more than MISSED_GRACE stale means the tab was
     * genuinely asleep: waking the room hours late is worse than useless, so
     * that case is reported rather than rung. */
    var nowMs=now.getTime(), fired=false;
    alarms.forEach(function(a){
      if(!a.on) return;
      var due=prevFire(a,now);
      if(!due || due<=lastTick) return;
      var key=String(due); if(a.lastFired===key) return;
      a.lastFired=key; fired=true;
      if(nowMs-due>MISSED_GRACE) showMissed(a,due); else fire(a);
    });
    if(fired) save();
    lastTick=nowMs;
    burnShift(now);
    if(cloneEl){ var cc=cloneEl.querySelector('.ac-clock'); if(cc) cc.innerHTML=panel.querySelector('.ac-clock').innerHTML; }
  }
  /* OLED anti-burn-in: in full screen (the overnight bedside view) nudge the
   * whole clock to a slightly different position once an hour, so no pixel
   * shows the same static image all night. A ~1-2% drift is invisible in use
   * but enough to spread the wear. Cleared outside full screen. */
  var burnEl=null, burnHour=-1;
  function burnShift(now){ if(!burnEl) burnEl=panel.querySelector('.ac-clock'); if(!burnEl) return;
    if(!document.body.classList.contains('ac-fs')){ if(burnHour!==-1){ burnEl.style.removeProperty('--burn-x'); burnEl.style.removeProperty('--burn-y'); burnHour=-1; } return; }
    var h=now.getHours(); if(h===burnHour) return; burnHour=h;
    var P=[[0,0],[1.4,1],[-1.2,1.8],[1,-1.4],[-1.4,-.8],[1.8,.6],[-.6,1.2],[.6,-1.8]];
    var o=P[h%P.length];
    burnEl.style.setProperty('--burn-x',o[0]+'vw'); burnEl.style.setProperty('--burn-y',o[1]+'vh'); }

  function showDlg(d){ if(d.showModal) d.showModal(); else d.setAttribute('open',''); }
  function closeDlg(d){ if(d.close) d.close(); else d.removeAttribute('open'); }
  function syncFields(){ var v=fRepeat.value; fWeekly.hidden=(v!=='weekly'); fDom.hidden=(v!=='monthdate'); fMw.hidden=(v!=='monthweekday'); }
  /* The label is always auto-generated from the time and repeat fields —
   * never freely typed — so no arbitrary text ever gets stored or displayed.
   * It refreshes live as those fields change. */
  var MON3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], WKN={'1':'1st','2':'2nd','3':'3rd','4':'4th','last':'last'};
  function autoLabel(){ var t=fTime.value; if(!t) return ''; var tt=fmt12(normTime(t)), v=fRepeat.value;
    if(v==='daily') return tt+' · daily';
    if(v==='weekly'){ var dn=[].slice.call(fWeekly.querySelectorAll('input:checked')).map(function(c){return +c.value;}); return tt+' · '+(dn.length?condenseDays(dn):WD[new Date().getDay()])+' · weekly'; }
    if(v==='monthdate') return tt+' · '+ordinal(parseInt(fDomV.value,10)||1)+' · monthly';
    if(v==='monthweekday') return tt+' · '+(WKN[fWeek.value]||fWeek.value)+' '+WD[parseInt(fWd.value,10)]+' · monthly';
    var nd=nextOnceDate(normTime(t)).split('-'); return MON3[(+nd[1])-1]+' '+(+nd[2])+' · '+tt; }
  function refreshLabel(){ if(fLabel) fLabel.value=autoLabel(); }
  function openDialog(a){
    editId = a ? a.id : null; dlgTitle.textContent = a ? 'Edit alarm' : 'Set alarm';
    var now=new Date();
    if(a){ fTime.value=a.time; fRepeat.value=a.type;
      [].slice.call(fWeekly.querySelectorAll('input')).forEach(function(c){ c.checked=(a.days||[]).indexOf(+c.value)>-1; });
      fDomV.value=a.dom||now.getDate(); fWeek.value=a.week||'1'; fWd.value=String(a.wd!=null?a.wd:now.getDay());
    } else { fTime.value=pad(now.getHours())+':'+pad(now.getMinutes()); fRepeat.value='once';
      [].slice.call(fWeekly.querySelectorAll('input')).forEach(function(c){ c.checked=(+c.value===now.getDay()); });
      fDomV.value=now.getDate(); fWeek.value=String(Math.floor((now.getDate()-1)/7)+1); fWd.value=String(now.getDay());
    }
    if(fSound) fSound.value=(a && SOUNDS[a.sound]) ? a.sound : 'beep';
    syncFields();
    refreshLabel();
    showDlg(dlg);
  }
  function saveNew(){ var t=fTime.value; if(!t) return; acNotifyInit(); var a={id:editId||uid(),time:normTime(t),label:autoLabel(),on:true,type:fRepeat.value,sound:(fSound?fSound.value:'beep')};
    if(a.type==='weekly'){ a.days=[].slice.call(fWeekly.querySelectorAll('input:checked')).map(function(c){return +c.value;}); if(!a.days.length) a.days=[new Date().getDay()]; }
    else if(a.type==='monthdate'){ a.dom=parseInt(fDomV.value,10)||new Date().getDate(); }
    else if(a.type==='monthweekday'){ a.week=fWeek.value; a.wd=parseInt(fWd.value,10); }
    else { a.date=nextOnceDate(normTime(t)); }
    if(editId){ for(var i=0;i<alarms.length;i++) if(alarms[i].id===editId){ alarms[i]=a; break; } } else { alarms.push(a); }
    editId=null; save(); render(); closeDlg(dlg); unlock();
    /* On a "set alarm for HH:MM" landing page, once it's saved there's nothing
     * left to do on that single-time page — send the visitor to the main
     * alarm clock, where they can see and manage every alarm. */
    if(window.AC_SETTIME){ location.href='/alarm-clock/'; }
  }

  function inFs(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
  function lockLandscape(){ try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(function(){}); }catch(e){} }
  function enterFs(){ var el=document.documentElement, rq=el.requestFullscreen||el.webkitRequestFullscreen; if(rq){ var p; try{ p=rq.call(el,{navigationUI:'hide'}); }catch(e){ p=rq.call(el); } if(p&&p.then) p.then(lockLandscape).catch(function(){}); else lockLandscape(); } else { popTop(); } }
  function exitFs(){ try{ var p=(document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document); if(p&&p['catch']) p['catch'](function(){}); }catch(e){} }
  /* The close button must ALWAYS leave the view. Exiting real full screen is
     the normal path and onFsChange does the cleanup — but the body can carry
     .ac-fs without the document being in full screen (the browser dropped it
     without firing fullscreenchange, or the view was entered on a device with
     no Fullscreen API at all), and in that state exitFullscreen is a no-op and
     the X did nothing. So: exit if there is something to exit, otherwise tear
     the view down directly. */
  /* LEAVING THE VIEW MUST NEVER DEPEND ON exitFullscreen() SUCCEEDING. Asking
     the browser is the right first move — it fires fullscreenchange and
     onFsChange does the tidying. But exitFullscreen can reject, resolve without
     the state actually changing, or fire nothing at all depending on how the
     view was entered, and the previous version simply returned and trusted it.
     When it did not take, the body kept .ac-fs, the page stayed locked in the
     bedside view, and the X looked broken because nothing visibly happened.
     So: ask, then verify, and tear the view down ourselves if the browser has
     not done it a moment later. */
  function forceOut(){
    document.body.classList.remove('ac-fs','ac-view','ac-idle');
    try{ if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(e){}
    relWake(); updateNote(); render();
  }
  function closeView(){
    if(inFs()){ exitFs(); setTimeout(function(){ if(!inFs()) forceOut(); },350); return; }
    forceOut();
  }
  /* Screen wake lock — keeps the display from sleeping. Held while in full
   * screen, and (on the alarm page, where #ac-wake-note exists) automatically
   * while the phone is charging, so it works as a bedside clock when plugged
   * in. Released when unplugged so we never drain an unplugged battery. The
   * charging check needs the Battery Status API (Android Chrome/Edge); iOS
   * has no battery API, so iPhone users get the same effect via full screen. */
  var wakeLock=null, charging=false, batteryOK=false, wakeNote=$('#ac-wake-note'), battEl=$('#ac-batt'), battPct=$('#ac-batt-pct');
  function wantWake(){ return document.body.classList.contains('ac-fs') || (charging && !!wakeNote); }
  function reqWake(){ if(wakeLock) return; try{ if(navigator.wakeLock&&navigator.wakeLock.request&&document.visibilityState==='visible'){ navigator.wakeLock.request('screen').then(function(w){ wakeLock=w; w.addEventListener('release',function(){ wakeLock=null; }); }).catch(function(){}); } }catch(e){} }
  function relWake(){ try{ if(wakeLock) wakeLock.release(); }catch(e){} wakeLock=null; }
  function syncWake(){ if(wantWake()) reqWake(); else relWake(); }
  /* The note below the clock points to Full screen (which holds the wake lock,
   * so it keeps the screen on). Not shown once full screen bedside mode has
   * actually started — no message pop-up once the clock is already running
   * full screen. */
  function updateNote(){ if(!wakeNote||!('wakeLock' in navigator)||document.body.classList.contains('ac-fs')){ if(wakeNote) wakeNote.hidden=true; return; }
    wakeNote.hidden=false;
    wakeNote.innerHTML = 'Alarm only rings when screen is unlocked — ${FS_ICON} keeps it unlocked.'; }

  /* Bedside auto-hide: in full screen, fade the controls + note away after
   * 15s of no activity for a clean clock face, and bring them back on any
   * activity — touch, pointer, key, plug/unplug, or physically moving the
   * phone. While the alarm is ringing they stay put so Stop alarm is always
   * reachable. */
  var idleTimer=0, IDLE=15000, lastA=null;
  function clearIdle(){ document.body.classList.remove('ac-idle'); }
  function scheduleHide(){ clearTimeout(idleTimer); if(document.body.classList.contains('ac-fs')&&!document.body.classList.contains('ac-alarming')){ idleTimer=setTimeout(function(){ document.body.classList.add('ac-idle'); },IDLE); } }
  function activity(){ clearIdle(); scheduleHide(); }
  function onMotion(e){ var a=e.accelerationIncludingGravity||e.acceleration; if(!a) return; if(lastA&&(Math.abs((a.x||0)-lastA.x)+Math.abs((a.y||0)-lastA.y)+Math.abs((a.z||0)-lastA.z))>2) activity(); lastA={x:a.x||0,y:a.y||0,z:a.z||0}; }
  /* Idle-detection listeners (three are high-frequency: mousemove, pointermove,
   * wheel) only matter while in full screen, so attach them on entry and
   * detach on exit instead of leaving them running for the whole page visit. */
  var ACTIVITY_EVENTS=['pointerdown','pointermove','touchstart','mousemove','keydown','wheel'];
  function onFsChange(){ var on=inFs(); document.body.classList.toggle('ac-fs',on); document.body.classList.toggle('ac-view',on); if(!on){ try{ if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(e){} } syncWake(); updateNote(); render(); burnShift(new Date()); if(on){ try{ window.addEventListener('devicemotion',onMotion); }catch(e){} ACTIVITY_EVENTS.forEach(function(ev){ document.addEventListener(ev,activity,{passive:true}); }); clearIdle(); scheduleHide(); } else { try{ window.removeEventListener('devicemotion',onMotion); }catch(e){} ACTIVITY_EVENTS.forEach(function(ev){ document.removeEventListener(ev,activity,{passive:true}); }); clearTimeout(idleTimer); clearIdle(); } }
  document.addEventListener('fullscreenchange',onFsChange);
  document.addEventListener('webkitfullscreenchange',onFsChange);
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible'){ syncWake(); tick(); scheduleTick(); } });
  document.addEventListener('click',syncWake);
  /* Battery level + charging badge, top-right of the clock face. Same
   * Battery Status API as the wake-lock above (Android Chrome/Edge only —
   * no Safari/Firefox support, so it just stays hidden there). */
  function updateBatt(b){ if(!battEl) return; battEl.hidden=false; if(battPct) battPct.textContent=Math.round(b.level*100)+'%'; battEl.classList.toggle('charging',b.charging); }
  if(navigator.getBattery){ navigator.getBattery().then(function(b){ batteryOK=true; charging=b.charging; updateBatt(b);
      b.addEventListener('chargingchange',function(){ charging=b.charging; updateNote(); syncWake(); activity(); updateBatt(b); });
      b.addEventListener('levelchange',function(){ updateBatt(b); });
      updateNote(); syncWake(); }).catch(function(){}); }

  var panel=$('#ac-panel'), onTopBtn=$('#ac-ontop'),
      panelHome=panel.parentNode, panelNext=panel.nextSibling, pipOK=!!(window.documentPictureInPicture&&documentPictureInPicture.requestWindow), cloneEl=null;
  function restorePanel(){ if(cloneEl){ if(cloneEl.parentNode) cloneEl.parentNode.removeChild(cloneEl); cloneEl=null; } if(panelNext&&panelNext.parentNode===panelHome) panelHome.insertBefore(panel,panelNext); else panelHome.appendChild(panel); }
  if(!pipOK) onTopBtn.style.display='none';
  function popTop(){ if(!pipOK || cloneEl) return; documentPictureInPicture.requestWindow({width:400,height:230}).then(function(pip){
      [].forEach.call(document.querySelectorAll('style'),function(s){ pip.document.head.appendChild(s.cloneNode(true)); });
      pip.document.body.className='ac-pip';
      cloneEl=panel.cloneNode(true); cloneEl.removeAttribute('id'); cloneEl.className='ac-clone';
      /* STRIP EVERY id, not just the panel's own. The clone is a dead
         placeholder standing in for the panel that just moved to the
         picture-in-picture window; leaving its descendants' ids behind
         put a SECOND #ac-close-tl (and #ac-stage, and the rest) in the
         document. getElementById then returned the clone's copy, which
         has no listeners — cloneNode does not copy them — so the X in the
         corner of the full-screen clock was a dead button that looked
         exactly like the real one. Duplicate ids are invalid HTML anyway. */
      [].forEach.call(cloneEl.querySelectorAll('[id]'),function(n){ n.removeAttribute('id'); });
      ['.ac-controls','.ac-brand'].forEach(function(sel){ var n=cloneEl.querySelector(sel); if(n&&n.parentNode) n.parentNode.removeChild(n); });
      if(panelNext&&panelNext.parentNode===panelHome) panelHome.insertBefore(cloneEl,panelNext); else panelHome.appendChild(cloneEl);
      pip.document.body.appendChild(panel);
      pip.addEventListener('pagehide',restorePanel);
    }).catch(function(){}); }
  onTopBtn.addEventListener('click',popTop);

  document.addEventListener('click',unlock);
  stopBtn.addEventListener('click',stopRing);
  editOpenBtn.addEventListener('click',function(){ showDlg(editDlg); });
  /* in-page "Add a custom alarm" chips (alarm pages only) open the same edit
   * dialog as Add/Edit; absent from the pop-out/full-screen views */
  [].slice.call(document.querySelectorAll('.ac-custom-add')).forEach(function(el){ el.addEventListener('click',function(){ showDlg(editDlg); }); });
  fsBtn.addEventListener('click',enterFs);
  /* Delegated, not bound to the nodes present at startup: the panel is MOVED
     into the picture-in-picture window by popTop() and moved back on close, so
     a reference captured here can end up pointing at a node that is no longer
     the one on screen. Delegation follows whichever button was actually
     clicked, in either document. */
  /* Two event types, because a control that strands someone in a full-screen
     view is worse than a double-fire: some touch keyboards and overlays eat
     the synthetic click but not the pointer sequence. A 400ms guard stops the
     pair from being handled twice. */
  /* MOVE THE TOP-LEFT X TO BODY LEVEL, ONCE, AT STARTUP.
     Both close buttons run the same closeView() through the same delegated
     handler, so when one works and the other does not the difference is not
     the code — it is where they sit. #ac-close (bottom right) is inside
     .ac-controls, a direct child of body. #ac-close-tl was inside #ac-panel >
     #ac-stage, and in full screen #ac-stage is position:fixed with z-index
     9998, which makes it a STACKING CONTEXT: the X's z-index:10001 is scoped
     inside it and cannot rise above anything painted over the stage, and every
     ancestor between it and the viewport is one more thing that can trap its
     fixed positioning or swallow its hit testing.
     It could not be reproduced in a headless browser at 1000, 1440 or 1920px —
     position, stacking and hit testing were all correct there — so rather than
     guess at the remaining difference, the button is given the SAME structural
     position as the one that works: a direct child of body, outside every
     stacking context. It is display:none unless body.ac-fs, so moving it costs
     nothing the rest of the time, and it also stops the button travelling into
     the picture-in-picture window when popTop() moves the panel. */
  (function(){ var x=$('#ac-close-tl'); if(x&&x.parentNode!==document.body) document.body.appendChild(x); })();

  var lastClose=0;
  function onCloseHit(e){
    var t=e.target&&e.target.closest?e.target.closest('#ac-close,#ac-close-tl,.ac-close-tl'):null;
    if(!t) return;
    var now=Date.now(); if(now-lastClose<400) return; lastClose=now;
    e.preventDefault(); closeView();
  }
  document.addEventListener('click',onCloseHit);
  document.addEventListener('pointerup',onCloseHit);
  /* Escape always leaves the view. The browser's own Escape ends real full
     screen, but if the body is wearing .ac-fs without the document actually
     being full screen that does nothing — which is the state a stuck view is
     in, and the state in which someone is hunting for a way out. */
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&document.body.classList.contains('ac-fs')) closeView(); });
  /* Display colour: a swatch button cycles the LED colour and persists it. The
   * chosen colour drives --seg-on on #ac-panel (the rest derive from it). */
  var AC_COLORS=['red','purple','blue','green','yellow','orange'], AC_DEFAULT='purple', colorBtn=$('#ac-color');
  /* set on both #ac-panel (so a cloned panel keeps its color when popped into
   * a Picture-in-Picture window) and <body> (so the color also reaches
   * sibling sections outside #ac-panel, like the alarm list and dialogs) */
  function applyColor(c){ if(AC_COLORS.indexOf(c)<0) c=AC_DEFAULT; if(c==='red'){ panel.removeAttribute('data-c'); document.body.removeAttribute('data-c'); } else { panel.setAttribute('data-c',c); document.body.setAttribute('data-c',c); } }
  var savedColor=AC_DEFAULT; try{ savedColor=localStorage.getItem('ac_color')||AC_DEFAULT; }catch(e){}
  applyColor(savedColor);
  if(colorBtn) colorBtn.addEventListener('click',function(){ var cur=AC_DEFAULT; try{ cur=localStorage.getItem('ac_color')||AC_DEFAULT; }catch(e){} var next=AC_COLORS[(AC_COLORS.indexOf(cur)+1)%AC_COLORS.length]; applyColor(next); try{ localStorage.setItem('ac_color',next); }catch(e){} });
  /* Help: jump to the on-page instructions (leaving full screen first). */
  var helpBtn=$('#ac-help');
  if(helpBtn) helpBtn.addEventListener('click',function(){ if(document.body.classList.contains('ac-fs')) exitFs(); var t=document.getElementById('ac-instructions'); if(t) setTimeout(function(){ t.scrollIntoView({behavior:'smooth',block:'start'}); },document.body.classList.contains('ac-fs')?200:0); });
  $('#ac-save').addEventListener('click',saveNew);
  var testBtn=$('#ac-test'); if(testBtn) testBtn.addEventListener('click',testSound);
  $('#ac-cancel').addEventListener('click',function(){ closeDlg(dlg); });
  $('#ac-edit-add').addEventListener('click',function(){ closeDlg(editDlg); openDialog(); });
  $('#ac-edit-close').addEventListener('click',function(){ closeDlg(editDlg); });
  fRepeat.addEventListener('change',function(){ syncFields(); refreshLabel(); });
  if(fTime) fTime.addEventListener('input',refreshLabel);
  if(fDomV) fDomV.addEventListener('input',refreshLabel);
  if(fWeek) fWeek.addEventListener('change',refreshLabel);
  if(fWd) fWd.addEventListener('change',refreshLabel);
  if(fWeekly) [].slice.call(fWeekly.querySelectorAll('input')).forEach(function(c){ c.addEventListener('change',refreshLabel); });
  function onList(e){
    var id=e.target.getAttribute('data-id');
    if(e.type==='change' && e.target.classList.contains('ac-tog')){ var a=find(id); if(a){ a.on=e.target.checked; save(); render(); } }
    else if(e.type==='click' && e.target.classList.contains('ac-del')){ alarms=alarms.filter(function(x){return x.id!==id;}); save(); render(); }
    else if(e.type==='click' && e.target.classList.contains('ac-editbtn')){ var a2=find(id); if(a2){ closeDlg(editDlg); openDialog(a2); } }
  }
  [listEl,editListEl].filter(Boolean).forEach(function(el){ el.addEventListener('change',onList); el.addEventListener('click',onList); });

  load(); render(); tick(); updateNote(); auditAudio();
  /* The readout is HH:MM (no seconds) and the colon doesn't blink, and alarms
   * are set by the minute — so tick once per minute, aligned to the minute
   * boundary, instead of every second. Far fewer wake-ups, which matters most
   * for the all-night bedside clock. We also tick the moment the tab becomes
   * visible again so the time is never stale after a background throttle. */
  var tickTO=0;
  function scheduleTick(){ clearTimeout(tickTO); var n=new Date(); tickTO=setTimeout(function(){ tick(); scheduleTick(); }, (60-n.getSeconds())*1000-n.getMilliseconds()+20); }
  scheduleTick();
  if(/[?&]set=1/.test(location.search)) openDialog();
  /* "set alarm for HH:MM" landing pages preset a time: open the Set dialog with
   * it filled in (as a new one-time alarm) so the visitor just taps Save. But
   * if they already have an active alarm at this time, there's nothing to add —
   * send them to the main alarm clock instead of re-popping the form. This only
   * fires for returning visitors who saved that alarm (localStorage), so search
   * crawlers — which have no saved alarms — always render the full page. */
  if(window.AC_SETTIME && /^\\d{1,2}:\\d{2}$/.test(window.AC_SETTIME)){
    var setT=normTime(window.AC_SETTIME);
    if(alarms.some(function(a){ return a.on && normTime(a.time)===setT; })){ location.replace('/alarm-clock/'); }
    else { openDialog(); fTime.value=window.AC_SETTIME; fRepeat.value='once'; syncFields(); refreshLabel(); }
  }
  if(/[?&]popout=1/.test(location.search) && pipOK){ var ph=document.createElement('div'); ph.className='ac-pohint'; ph.innerHTML='<div>⧉<br>Tap to open the floating clock</div>'; document.body.appendChild(ph); var go=function(){ if(ph.parentNode) ph.parentNode.removeChild(ph); document.removeEventListener('click',go); popTop(); }; setTimeout(function(){ document.addEventListener('click',go); },60); }
  if(/[?&]bedside=1/.test(location.search)){ var bh=document.createElement('div'); bh.className='ac-pohint'; bh.innerHTML='<div class="ac-pohint-box"><div class="ac-pohint-title">Ready for your bedside clock? Confirm to go full screen.</div><button type="button" class="btn ac-bedside-go">Open full screen</button><button type="button" class="btn secondary ac-bedside-skip">Return to alarm clock</button><p>Plug in your device so the screen can stay on overnight.</p></div>'; document.body.appendChild(bh); var bgo=bh.querySelector('.ac-bedside-go'), bskip=bh.querySelector('.ac-bedside-skip'); function closeBedsideHint(){ if(bh.parentNode) bh.parentNode.removeChild(bh); } bgo.addEventListener('click',function(){ closeBedsideHint(); enterFs(); }); bskip.addEventListener('click',function(){ location.href='/alarm-clock/'; }); }
})();`);

/* HOME_CLOCK_JS — a tiny display-only version of the clock for the home page
 * card, which only shows the live time + saved-alarm summary (the card's
 * buttons are plain links to /alarm-clock/). It deliberately omits all of the
 * interactive widget (dialogs, set/edit/delete, full screen, pop-out, wake
 * lock, sound) so the home page doesn't ship the full ~16KB controller. */
export const HOME_CLOCK_JS = minifyJs(`
(function(){
  var timeEl=document.getElementById('ac-time'); if(!timeEl) return;
  var ampmEl=document.getElementById('ac-ampm'), dateEl=document.getElementById('ac-date'), alarmsEl=document.getElementById('ac-alarms');
  var SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','':''}, SEGL='abcdefg', digs={};
  [].slice.call(timeEl.querySelectorAll('.dig')).forEach(function(el){ if(!el.children.length){ 'abcdefg'.split('').forEach(function(s){ var i=document.createElement('i'); i.className='seg seg-'+s; el.appendChild(i); }); } digs[el.getAttribute('data-d')]=el; });
  function setDigit(el,ch){ el.style.visibility=(ch===''?'hidden':'visible'); var on=SEG[ch]||''; for(var i=0;i<7;i++) el.children[i].classList.toggle('on', on.indexOf(SEGL.charAt(i))>-1); }
  function pad(n){ return n<10?'0'+n:''+n; }
  function fmt12(t){ var p=t.split(':'),h=+p[0],m=+p[1],ap=h<12?'AM':'PM',hh=h%12; if(hh===0)hh=12; return hh+':'+pad(m)+' '+ap; }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  var WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  /* same next-occurrence logic as the full widget, so the summary reads
   * "M/D - time" consistently across the home card and the alarm page */
  function matches(a,now){
    if(a.type==='daily') return true;
    if(a.type==='weekly') return (a.days||[]).indexOf(now.getDay())>-1;
    /* "the 31st" in a 30-day month, or the 29th-31st in February, has no such
       date. Clamp to the month's last day rather than skipping the month in
       silence — an alarm that just does not go off in June is the failure this
       whole widget exists to avoid. */
    if(a.type==='monthdate'){ var dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); return now.getDate()===Math.min(a.dom,dim); }
    if(a.type==='monthweekday'){ if(now.getDay()!==a.wd) return false; if(a.week==='last'){ var dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); return now.getDate()+7>dim; } return (Math.floor((now.getDate()-1)/7)+1)===parseInt(a.week,10); }
    if(a.type==='once') return ymd(now)===a.date;
    return false;
  }
  function nextFire(a){ var p=String(a.time||'0:0').split(':'), hh=parseInt(p[0],10)||0, mm=parseInt(p[1],10)||0, now=new Date();
    for(var i=0;i<367;i++){ var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,hh,mm,0,0); if(d.getTime()<=now.getTime()) continue; if(matches(a,d)) return d.getTime(); }
    return Infinity; }
  function tick(){
    var now=new Date(),h=now.getHours(),m=now.getMinutes(),ap=h<12?'AM':'PM',hh=h%12; if(hh===0)hh=12;
    setDigit(digs.h1, hh>=10?'1':''); setDigit(digs.h2, String(hh%10)); setDigit(digs.m1, String(Math.floor(m/10))); setDigit(digs.m2, String(m%10));
    if(ampmEl) ampmEl.textContent=ap;
    if(dateEl) dateEl.textContent=WD[now.getDay()].toUpperCase()+'  '+(now.getMonth()+1)+'/'+now.getDate();
    if(alarmsEl){ var on=[]; try{ on=(JSON.parse(localStorage.getItem('ac_alarms'))||[]).filter(function(a){return a&&a.on&&a.time;}); }catch(e){} on.sort(function(x,y){return nextFire(x)-nextFire(y);}); alarmsEl.innerHTML = on.length ? on.slice(0,4).map(function(a){ var nf=nextFire(a), tm=fmt12(a.time); if(!isFinite(nf)) return '<div class="ac-alarm-row">'+tm+'</div>'; var d=new Date(nf); return '<div class="ac-alarm-row">'+(d.getMonth()+1)+'/'+d.getDate()+' - '+tm+'</div>'; }).join('') : '<div class="ac-alarm-row ac-dim">no alarms</div>'; }
  }
  tick();
  function sched(){ var n=new Date(); setTimeout(function(){ tick(); sched(); }, (60-n.getSeconds())*1000-n.getMilliseconds()+20); }
  sched();
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') tick(); });
})();`);

/* HOME_COLOR_JS — lets the home card's colour-swatch button work the same
 * way as the real alarm page's: cycles the same rainbow order and reads/
 * writes the same 'ac_color' localStorage key, so a colour picked on either
 * page shows up on the other. Keep AC_COLORS in sync with WIDGET_JS. */
export const HOME_COLOR_JS = minifyJs(`
(function(){
  var panel=document.getElementById('ac-panel'), btn=document.getElementById('home-ac-color');
  if(!panel) return;
  var AC_COLORS=['red','purple','blue','green','yellow','orange'], AC_DEFAULT='purple';
  function apply(c){ if(AC_COLORS.indexOf(c)<0) c=AC_DEFAULT; if(c==='red'){ panel.removeAttribute('data-c'); document.body.removeAttribute('data-c'); } else { panel.setAttribute('data-c',c); document.body.setAttribute('data-c',c); } }
  var saved=AC_DEFAULT; try{ saved=localStorage.getItem('ac_color')||AC_DEFAULT; }catch(e){}
  apply(saved);
  if(btn) btn.addEventListener('click',function(){ var cur=AC_DEFAULT; try{ cur=localStorage.getItem('ac_color')||AC_DEFAULT; }catch(e){} var next=AC_COLORS[(AC_COLORS.indexOf(cur)+1)%AC_COLORS.length]; apply(next); try{ localStorage.setItem('ac_color',next); }catch(e){} });
})();`);
