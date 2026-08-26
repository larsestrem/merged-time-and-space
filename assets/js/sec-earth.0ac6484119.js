(function(){
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

  var g=document.getElementById('wk-night'), sunG=document.getElementById('wk-sun');
  if(g){
    var tick=function(){
      if(window.__wkHold) return; /* the landing page's slider owns the map */
      var ss=dnSub(Date.now());
      g.setAttribute('d',dnPath(ss.dec,ss.lon,0,2));
      if(sunG) sunG.setAttribute('transform','translate('+dnF(dnX(ss.lon))+' '+dnF(dnY(ss.dec))+')');
    };
    tick(); setInterval(tick,60000);
  }
  /* and the four clocks under it, to the real minute */
  var cs=document.querySelectorAll('[data-wk-tz]');
  function clocks(){
    if(window.__wkHold) return;
    for(var i=0;i<cs.length;i++){
      try{ cs[i].textContent=new Intl.DateTimeFormat('en-US',{timeZone:cs[i].getAttribute('data-wk-tz'),hour:'numeric',minute:'2-digit',hour12:true}).format(new Date()); }catch(e){}
    }
  }
  clocks(); setInterval(clocks,30000);
})();

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
