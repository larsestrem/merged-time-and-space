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
function matches(a,now){
if(a.type==='daily') return true;
if(a.type==='weekly') return (a.days||[]).indexOf(now.getDay())>-1;
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
})();(function(){
var panel=document.getElementById('ac-panel'), btn=document.getElementById('home-ac-color');
if(!panel) return;
var AC_COLORS=['red','purple','blue','green','yellow','orange'], AC_DEFAULT='purple';
function apply(c){ if(AC_COLORS.indexOf(c)<0) c=AC_DEFAULT; if(c==='red'){ panel.removeAttribute('data-c'); document.body.removeAttribute('data-c'); } else { panel.setAttribute('data-c',c); document.body.setAttribute('data-c',c); } }
var saved=AC_DEFAULT; try{ saved=localStorage.getItem('ac_color')||AC_DEFAULT; }catch(e){}
apply(saved);
if(btn) btn.addEventListener('click',function(){ var cur=AC_DEFAULT; try{ cur=localStorage.getItem('ac_color')||AC_DEFAULT; }catch(e){} var next=AC_COLORS[(AC_COLORS.indexOf(cur)+1)%AC_COLORS.length]; apply(next); try{ localStorage.setItem('ac_color',next); }catch(e){} });
})();
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
/* apparent ecliptic longitude of the sun, degrees. 0 at the spring equinox,
   90 at the summer solstice, 180 at the fall equinox, 270 at the winter
   solstice. The season-orbit drawing places Earth with this angle. */
function dnEcl(ms){
  var d=(ms-Date.UTC(2000,0,1,12))/86400000;
  var g=(357.529+0.98560028*d)*Math.PI/180;
  var q=280.459+0.98564736*d;
  return q+1.915*Math.sin(g)+0.020*Math.sin(2*g);
}
/* the season-orbit figure: sun at the centre, Earth on a circle. Spring
   equinox at the top, then counterclockwise: summer right, fall bottom,
   winter left. soXY is shared with the live "today" marker. */
var SO_CX=320,SO_CY=320,SO_R=248;
function soXY(L){
  var a=L*Math.PI/180;
  return {x:SO_CX+SO_R*Math.sin(a), y:SO_CY-SO_R*Math.cos(a)};
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
function dnSide(dec,tilt,youLat){
  var RD=Math.PI/180,cx=372,cy=138,r=86,d=dec*RD,t=tilt*RD,i,y;
  var ax=-Math.sin(d),ay=-Math.cos(d);          /* unit vector toward the north pole */
  var ex=Math.cos(d),ey=-Math.sin(d);           /* along the equator, perpendicular to it */
  var PX=function(u,v){return dnF(cx+ax*u+ex*v)};
  var PY=function(u,v){return dnF(cy+ay*u+ey*v)};
  var o=r*Math.sin(t),h=r*Math.cos(t);          /* tropic offset, and its half-chord */
  var s='<svg class="dns-svg" viewBox="0 0 600 276" width="100%" role="img" aria-label="The Earth seen from the side, lit from the left, with the line from the centre of the sun to the centre of the Earth landing between the Tropic of Cancer and the Tropic of Capricorn">';
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
  /* a visitor whose location is already known: their latitude on the
     sun-facing limb, so they can see themselves against the tropics and
     the overhead-sun hit. v is negative because that is the left, lit edge. */
  if(youLat!=null && isFinite(youLat)){
    var yl=youLat*RD, yu=r*Math.sin(yl), yv=-r*Math.cos(yl);
    s+='<circle class="dns-you" cx="'+PX(yu,yv)+'" cy="'+PY(yu,yv)+'" r="5.5"/>';
    s+='<text class="dns-you-lab" text-anchor="middle" x="'+PX(yu,yv)+'" y="'+(PY(yu,yv)-12)+'">You</text>';
  }
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

(function(){
  var h24=document.getElementById('cv-h24'), m24=document.getElementById('cv-m24'),
      h12=document.getElementById('cv-h12'), m12=document.getElementById('cv-m12'),
      ap=document.getElementById('cv-ap');
  if(!h24||!m24||!h12||!m12||!ap) return;
  var out24=document.getElementById('cv-out24'), out12=document.getElementById('cv-out12'),
      say=document.getElementById('cv-say'), nowBtn=document.getElementById('cv-now');
  var ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  var TENS=['','','twenty','thirty','forty','fifty'];
  function pad(n){ return (n<10?'0':'')+n; }
  function word(n){ return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:''); }
  function pairWord(n){ return n<10?'zero '+ONES[n]:word(n); }
  function part(h){ return h<5?'at night':h<12?'in the morning':h<18?'in the afternoon':h<21?'in the evening':'at night'; }
  function say24(h,m){ return m===0?pairWord(h)+' hundred hours':pairWord(h)+' '+pairWord(m); }
  function say12(h,m){
    if(h===0&&m===0) return 'twelve midnight';
    if(h===12&&m===0) return 'twelve noon';
    var t=h%12||12, p=part(h);
    if(m===0) return word(t)+" o'clock "+p;
    if(m===30) return 'half past '+word(t)+' '+p;
    return word(t)+' '+(m<10?'oh '+ONES[m]:word(m))+' '+p;
  }
  /* h,m are the one truth; both sides and both read-outs are drawn from them */
  function render(h,m){
    var t=h%12||12, a=h<12?'AM':'PM';
    h24.value=String(h); m24.value=String(m);
    h12.value=String(t); m12.value=String(m); ap.value=a;
    out24.textContent=pad(h)+':'+pad(m);
    out12.textContent=t+':'+pad(m)+'\u00a0'+a;
    /* guarded: a compact instance may leave pieces out */
    if(say) say.textContent='Said aloud: \u201c'+say24(h,m)+'\u201d on the 24-hour clock, \u201c'+say12(h,m)+'\u201d on the 12-hour one.';
  }
  function from24(){ render(+h24.value, +m24.value); }
  function from12(){
    var t=+h12.value%12, h=ap.value==='PM'?t+12:t;
    render(h, +m12.value);
  }
  h24.addEventListener('change',from24); m24.addEventListener('change',from24);
  h12.addEventListener('change',from12); m12.addEventListener('change',from12);
  ap.addEventListener('change',from12);
  if(nowBtn){
    nowBtn.hidden=false;
    nowBtn.addEventListener('click',function(){ var n=new Date(); render(n.getHours(), n.getMinutes()); });
  }
  from24();
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
