(function(){
  var boards=[].slice.call(document.querySelectorAll('.home-board'));
  if(!boards.length||!window.matchMedia) return;
  var mq=window.matchMedia('(min-width:700px)'), queued=false;
  function pack(b){
    b.classList.add('hb-mas');
    var cs=getComputedStyle(b);
    var rowH=parseFloat(cs.gridAutoRows), gap=parseFloat(cs.columnGap)||14;
    if(!rowH){ clear(b); return; } /* stylesheet absent or overridden */
    var kids=[].slice.call(b.children), h=[], i;
    for(i=0;i<kids.length;i++) h[i]=kids[i].hidden?0:kids[i].getBoundingClientRect().height;
    for(i=0;i<kids.length;i++)
      kids[i].style.gridRowEnd=kids[i].hidden?'':'span '+Math.max(1,Math.ceil((h[i]+gap)/rowH));
  }
  function clear(b){
    b.classList.remove('hb-mas');
    for(var i=0;i<b.children.length;i++) b.children[i].style.gridRowEnd='';
  }
  function layout(){
    queued=false;
    for(var i=0;i<boards.length;i++) mq.matches?pack(boards[i]):clear(boards[i]);
  }
  function queue(){ if(!queued){ queued=true; requestAnimationFrame(layout); } }
  window.addEventListener('resize',queue);
  if(mq.addEventListener) mq.addEventListener('change',queue);
  var i,j;
  if(window.ResizeObserver){
    var ro=new ResizeObserver(queue);
    for(i=0;i<boards.length;i++) for(j=0;j<boards[i].children.length;j++) ro.observe(boards[i].children[j]);
  }
  if(window.MutationObserver){
    var mo=new MutationObserver(queue);
    for(i=0;i<boards.length;i++) mo.observe(boards[i],{attributes:true,attributeFilter:['hidden'],subtree:true});
  }
  layout();
})();

window.AC_FEDHOL=[{"name":"Labor Day","date":"2026-09-07","longWeekend":true},{"name":"Columbus Day","date":"2026-10-12","longWeekend":true},{"name":"Veterans Day","date":"2026-11-11","longWeekend":false},{"name":"Thanksgiving Day","date":"2026-11-26","longWeekend":true},{"name":"Christmas Day","date":"2026-12-25","longWeekend":true},{"name":"New Year's Day","date":"2027-01-01","longWeekend":true},{"name":"Martin Luther King Jr. Day","date":"2027-01-18","longWeekend":true},{"name":"Washington's Birthday (Presidents Day)","date":"2027-02-15","longWeekend":true},{"name":"Memorial Day","date":"2027-05-31","longWeekend":true},{"name":"Juneteenth","date":"2027-06-18","longWeekend":true},{"name":"Independence Day","date":"2027-07-05","longWeekend":true},{"name":"Labor Day","date":"2027-09-06","longWeekend":true},{"name":"Columbus Day","date":"2027-10-11","longWeekend":true},{"name":"Veterans Day","date":"2027-11-11","longWeekend":false},{"name":"Thanksgiving Day","date":"2027-11-25","longWeekend":true},{"name":"Christmas Day","date":"2027-12-24","longWeekend":true},{"name":"New Year's Day","date":"2027-12-31","longWeekend":true},{"name":"Martin Luther King Jr. Day","date":"2028-01-17","longWeekend":true},{"name":"Washington's Birthday (Presidents Day)","date":"2028-02-21","longWeekend":true},{"name":"Memorial Day","date":"2028-05-29","longWeekend":true},{"name":"Juneteenth","date":"2028-06-19","longWeekend":true},{"name":"Independence Day","date":"2028-07-04","longWeekend":false},{"name":"Labor Day","date":"2028-09-04","longWeekend":true},{"name":"Columbus Day","date":"2028-10-09","longWeekend":true},{"name":"Veterans Day","date":"2028-11-10","longWeekend":true},{"name":"Thanksgiving Day","date":"2028-11-23","longWeekend":true},{"name":"Christmas Day","date":"2028-12-25","longWeekend":true},{"name":"New Year's Day","date":"2029-01-01","longWeekend":true},{"name":"Martin Luther King Jr. Day","date":"2029-01-15","longWeekend":true},{"name":"Washington's Birthday (Presidents Day)","date":"2029-02-19","longWeekend":true},{"name":"Memorial Day","date":"2029-05-28","longWeekend":true},{"name":"Juneteenth","date":"2029-06-19","longWeekend":false},{"name":"Independence Day","date":"2029-07-04","longWeekend":false}];
(function(){
  [].slice.call(document.querySelectorAll('.tc[data-href]')).forEach(function(c){ c.addEventListener('click',function(e){ if(e.target.closest('a,button')) return; location.href=c.getAttribute('data-href'); }); });
  /* Sunrise & Sunset card: the dials AND the rise/set times are baked at
     build time (static SVG, see homeDial/homeSunTimes), so there's nothing
     to draw here on load — the home card needs no JS for sun. */
  /* "Countdown to Friday" / "Next Federal Holiday" mini cards — a coarse
   * days+hours readout updated once a minute (these are just a teaser for
   * the full live-ticking page, so second-level precision isn't needed
   * here). Same target-computation rules as microevent-widget.mjs's daily/
   * weekly/dates types, kept as a small standalone version since the full
   * widget also drives fullscreen/wake-lock/burn-in this card doesn't need. */
  function fmtRemain(ms){ if(ms<=0) return 'now!'; var s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
    if(d>0) return d+'d '+h+'h'; if(h>0) return h+'h '+m+'m'; return m+'m'; }
  function nextFriday5pm(){ var now=new Date(), t=new Date(now.getFullYear(),now.getMonth(),now.getDate(),17,0,0,0);
    var diff=(5-t.getDay()+7)%7; t.setDate(t.getDate()+diff); if(t.getTime()<=now.getTime()) t.setDate(t.getDate()+7); return t; }
  function nextDateItem(items,longWeekendOnly,startOfWeekend){ var now=new Date(), best=null;
    for(var i=0;i<items.length;i++){ if(longWeekendOnly&&!items[i].longWeekend) continue;
      var p=items[i].date.split('-'), d=new Date(+p[0],+p[1]-1,+p[2],8,0,0,0);
      if(startOfWeekend){ var dow=d.getDay(), back=dow===1?2:0; d.setDate(d.getDate()-back); d.setHours(9,0,0,0); }
      if(d.getTime()>now.getTime() && (!best||d.getTime()<best.date.getTime())) best={name:items[i].name,date:d}; }
    return best; }
  function mcTick(){
    var items=window.AC_FEDHOL||[];
    var fEl=document.getElementById('home-wk-friday');
    if(fEl) fEl.textContent=fmtRemain(nextFriday5pm().getTime()-Date.now());
    var hEl=document.getElementById('home-wk-holiday'), nh=nextDateItem(items,false,false);
    if(hEl&&nh) hEl.textContent=fmtRemain(nh.date.getTime()-Date.now());
    var wEl=document.getElementById('home-wk-longweekend'), nw=nextDateItem(items,true,true);
    if(wEl&&nw) wEl.textContent=fmtRemain(nw.date.getTime()-Date.now());
  }
  if(document.getElementById('home-wk-friday')){ mcTick(); setInterval(mcTick,60000); }
  var t=new Date(); t=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate());
  [].slice.call(document.querySelectorAll('.cd-days[data-date]')).forEach(function(c){ var p=c.getAttribute('data-date').split('-'); var d=Date.UTC(+p[0],+p[1]-1,+p[2]); var n=Math.round((d-t)/86400000); c.textContent=n<=0?'today':n===1?'tomorrow':'in '+n+'d'; });
})();
