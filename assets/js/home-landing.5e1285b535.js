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

  var slider=document.getElementById('wk-slider'); if(!slider) return;
  var night=document.getElementById('wk-night'), sunG=document.getElementById('wk-sun'),
      meG=document.getElementById('wk-me'), share=document.getElementById('wk-share'),
      when=document.getElementById('wk-when'), nowB=document.getElementById('wk-nowbtn');
  var cs=document.querySelectorAll('[data-wk-tz]');
  var sunline=document.getElementById('wk-sunline');
  var orbitNow=document.getElementById('wk-orbit-now');
  var TILT=23.435387708251884;
  var seasonSun=function(dec,lon,laterDec){ return (function seasonSunHtml(dec, lon, laterDec, tilt) {
  var lat = Math.abs(dec).toFixed(1) + '\u00B0 ' + (dec >= 0 ? 'N' : 'S');
  var lo = Math.abs(lon).toFixed(1) + '\u00B0 ' + (lon >= 0 ? 'E' : 'W');
  var a = Math.abs(dec), n = dec >= 0, rising = laterDec > dec;
  var orbit = '<a href="/earth-sun-moon-orbit-simulator/">Earth\u2019s orbit</a>';
  var sub = '<a href="/concepts/what-is-the-subsolar-point/">subsolar point</a>';
  var head = 'The sun is overhead at <b>' + lat + ', ' + lo + '</b> \u2014 this is the ' + sub + '. ';
  if (a < 0.6) {
    if (rising) return head + 'Day and night are about equal everywhere \u2014 this is the spring equinox, the start of spring in the northern half of the world. Days there will get longer as Earth tilts toward the sun in ' + orbit + '.';
    return head + 'Day and night are about equal everywhere \u2014 this is the fall equinox, the start of fall in the northern half of the world. Days there will get shorter as Earth tilts away from the sun in ' + orbit + '.';
  }
  if (tilt - a < 0.15) {
    if (n) return head + 'The sun is as far north as it ever gets \u2014 the summer solstice, the start of summer and the longest days in the northern half of the world. From here Earth starts tilting away from the sun in ' + orbit + '.';
    return head + 'The sun is as far south as it ever gets \u2014 the winter solstice, the start of winter and the shortest days in the northern half of the world. From here Earth starts tilting back toward the sun in ' + orbit + '.';
  }
  if (n && !rising) return head + 'This time of year the sun is moving from summer toward fall, and days in the northern half of the world are getting shorter because Earth is tilting away from the sun in ' + orbit + '.';
  if (n && rising) return head + 'This time of year the sun is moving from spring toward summer, and days in the northern half of the world are getting longer because Earth is tilting toward the sun in ' + orbit + '.';
  if (!n && !rising) return head + 'This time of year the sun is moving from fall toward winter, and days in the northern half of the world are getting shorter because Earth is tilting away from the sun in ' + orbit + '.';
  return head + 'This time of year the sun is moving from winter toward spring, and days in the northern half of the world are getting longer because Earth is tilting toward the sun in ' + orbit + '.';
})(dec,lon,laterDec,TILT); };
  /* DAY0 is the midnight the slider is scrubbing — today's, until a season
     button moves it to a solstice or an equinox. */
  function midnightOf(ms){ var d=new Date(ms); d.setHours(0,0,0,0); return +d; }
  var DAY0=midnightOf(Date.now());
  function paint(at){
    var ss=dnSub(at);
    night.setAttribute('d',dnPath(ss.dec,ss.lon,0,2));
    if(sunG) sunG.setAttribute('transform','translate('+dnF(dnX(ss.lon))+' '+dnF(dnY(ss.dec))+')');
    for(var i=0;i<cs.length;i++){
      try{ cs[i].textContent=new Intl.DateTimeFormat('en-US',{timeZone:cs[i].getAttribute('data-wk-tz'),hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at)); }catch(e){}
    }
    if(sunline){
      sunline.innerHTML=seasonSun(ss.dec,ss.lon,dnSub(at+7*86400000).dec);
    }
    if(orbitNow){
      var op=soXY(dnEcl(at));
      orbitNow.setAttribute('transform','translate('+op.x+' '+op.y+')');
    }
  }
  function fmt(at){ try{ return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at)); }catch(e){ return ''; } }
  function dfmt(at){ try{ return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(at)); }catch(e){ return ''; } }
  function shown(){ return DAY0+(+slider.value)*60000; }
  function label(){
    var at=shown(), today=DAY0===midnightOf(Date.now());
    when.textContent=(today?'':dfmt(at)+', ')+fmt(at)+(today?' your time':'');
  }
  /* the slider opens AT now and follows the clock until touched */
  function syncNow(){ if(window.__wkHold) return; var d=new Date(); slider.value=d.getHours()*60+d.getMinutes(); }
  slider.disabled=false; syncNow(); setInterval(syncNow,60000);
  slider.addEventListener('input',function(){
    window.__wkHold=1; label(); paint(shown());
  });
  if(nowB){
    nowB.disabled=false;
    nowB.addEventListener('click',function(){
      window.__wkHold=0; when.textContent='Right now';
      DAY0=midnightOf(Date.now()); syncNow(); paint(Date.now());
    });
  }
  /* the four corners of the year: keep the time of day, move the date */
  var jumps=document.querySelectorAll('[data-wk-at]');
  for(var j=0;j<jumps.length;j++){
    jumps[j].disabled=false;
    jumps[j].addEventListener('click',function(){
      window.__wkHold=1;
      DAY0=midnightOf(+this.getAttribute('data-wk-at'));
      label(); paint(shown());
    });
  }
  /* ---- your place on the planet ----
     The dot is drawn from coordinates kept ONLY in this browser (the same
     dn_home key the day/night map page uses, so the two share one answer),
     and the same coordinates put you on the Earth in the moon tile below. */
  var LOC=null;
  try{ LOC=JSON.parse(localStorage.getItem('dn_home')||'null'); }catch(e){}
  function showMe(){
    if(!LOC||!meG) return;
    meG.removeAttribute('hidden');
    meG.setAttribute('transform','translate('+dnF(dnX(LOC.lon))+' '+dnF(dnY(LOC.lat))+')');
    if(share) share.hidden=true;
    try{ document.dispatchEvent(new CustomEvent('home:loc',{detail:LOC})); }catch(e){}
  }
  if(share&&navigator.geolocation&&!LOC){
    share.hidden=false;
    share.addEventListener('click',function(){
      share.textContent='Locating…';
      navigator.geolocation.getCurrentPosition(function(p){
        LOC={lat:p.coords.latitude,lon:p.coords.longitude};
        try{ localStorage.setItem('dn_home',JSON.stringify(LOC)); }catch(e){}
        showMe();
      },function(){ share.textContent='Location not shared'; setTimeout(function(){ share.hidden=true; },2200); },{timeout:10000,maximumAge:600000});
    });
  }
  showMe();
})();


var MN_RAD=Math.PI/180, MN_DAY=86400000, MN_J1970=2440588, MN_J2000=2451545, MN_OBL=MN_RAD*23.4397;
function mnDays(ms){ return ms/MN_DAY - 0.5 + MN_J1970 - MN_J2000; }
function mnRa(l,b){ return Math.atan2(Math.sin(l)*Math.cos(MN_OBL)-Math.tan(b)*Math.sin(MN_OBL), Math.cos(l)); }
function mnDec(l,b){ return Math.asin(Math.sin(b)*Math.cos(MN_OBL)+Math.cos(b)*Math.sin(MN_OBL)*Math.sin(l)); }
function mnSidereal(d,lw){ return MN_RAD*(280.16+360.9856235*d)-lw; }
function mnAlt(H,phi,dec){ return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H)); }

/* Sun's apparent equatorial position (same series SUN_JS uses). */
function mnSunPos(d){
  var M=MN_RAD*(357.5291+0.98560028*d);
  var C=MN_RAD*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M));
  var L=M+C+MN_RAD*102.9372+Math.PI;
  return { ra:mnRa(L,0), dec:mnDec(L,0) };
}

/* Moon's geocentric position and distance — Meeus ch. 47, truncated to the
 * leading terms. The distance series matters: the single-term version
 * (385001 - 20905*cos M') is off by up to ~2,000 km, which is more than the
 * margin the supermoon threshold is decided by. */
function mnMoonPos(d){
  var L=MN_RAD*(218.316+13.176396*d),   /* mean longitude   */
      M=MN_RAD*(134.963+13.064993*d),   /* mean anomaly     */
      F=MN_RAD*(93.272+13.229350*d),    /* argument of lat. */
      D=MN_RAD*(297.850+12.190749*d),   /* mean elongation  */
      Ms=MN_RAD*(357.529+0.98560028*d); /* sun mean anomaly */
  var l=L+MN_RAD*(6.289*Math.sin(M)+1.274*Math.sin(2*D-M)+0.658*Math.sin(2*D)
        +0.214*Math.sin(2*M)-0.186*Math.sin(Ms)-0.114*Math.sin(2*F));
  var b=MN_RAD*(5.128*Math.sin(F)+0.281*Math.sin(M+F)-0.278*Math.sin(F-M)
        -0.173*Math.sin(F-2*D));
  var dt=385000.56+(-20905355*Math.cos(M)-3699111*Math.cos(2*D-M)-2955968*Math.cos(2*D)
        -569925*Math.cos(2*M)+48888*Math.cos(Ms)-3149*Math.cos(2*F)
        +246158*Math.cos(2*D-2*M)-152138*Math.cos(2*D-Ms-M)-170733*Math.cos(2*D+M)
        -204586*Math.cos(2*D-Ms)-129620*Math.cos(Ms-M)+108743*Math.cos(D)
        +104755*Math.cos(Ms+M)+10321*Math.cos(2*D-2*F)+79661*Math.cos(M-2*F))/1000;
  return { ra:mnRa(l,b), dec:mnDec(l,b), dist:dt };
}
/* the one place the moon is straight overhead — same job as dnSub for the sun.
   Latitude is the moon's declination; longitude is RA minus Greenwich sidereal
   time, using THIS file's sidereal so a marker cannot disagree with mnPos. */
function mnSub(ms){
  var d=mnDays(ms), m=mnMoonPos(d);
  var lo=m.ra/MN_RAD-(280.16+360.9856235*d);
  lo=((lo%360)+540)%360-180;
  return {dec:m.dec/MN_RAD, lon:lo};
}

/* Illuminated fraction, cycle position and limb angle.
 *   fraction 0..1, phase 0=new .5=full (rises 0->1 across the cycle),
 *   waxing   true while the lit side is growing. */
function mnIllum(ms){
  var d=mnDays(ms), s=mnSunPos(d), m=mnMoonPos(d), SD=149598000;
  var phi=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra));
  var inc=Math.atan2(SD*Math.sin(phi), m.dist-SD*Math.cos(phi));
  var ang=Math.atan2(Math.cos(s.dec)*Math.sin(s.ra-m.ra),
        Math.sin(s.dec)*Math.cos(m.dec)-Math.cos(s.dec)*Math.sin(m.dec)*Math.cos(s.ra-m.ra));
  var ph=0.5+0.5*inc*(ang<0?-1:1)/Math.PI;
  return { fraction:(1+Math.cos(inc))/2, phase:ph, waxing:ph<0.5, dist:m.dist, angle:ang };
}

/* ---- Meeus ch. 49: the exact instant of a primary phase ------------------
 * kind: 0 new, 1 first quarter, 2 full, 3 last quarter.
 * k must be an integer + kind/4. Returns epoch ms (UTC). */
function mnPhaseJde(k,kind){
  var T=k/1236.85, T2=T*T, T3=T2*T, T4=T3*T, R=MN_RAD;
  var jde=2451550.09766+29.530588861*k+0.00015437*T2-0.000000150*T3+0.00000000073*T4;
  var E=1-0.002516*T-0.0000074*T2;
  var M =R*(2.5534+29.10535670*k-0.0000014*T2-0.00000011*T3);
  var Mp=R*(201.5643+385.81693528*k+0.0107582*T2+0.00001238*T3-0.000000058*T4);
  var F =R*(160.7108+390.67050284*k-0.0016118*T2-0.00000227*T3+0.000000011*T4);
  var O =R*(124.7746-1.56375588*k+0.0020672*T2+0.00000215*T3);
  var s=Math.sin, c=Math.cos, corr=0;
  if(kind===0){
    corr=-0.40720*s(Mp)+0.17241*E*s(M)+0.01608*s(2*Mp)+0.01039*s(2*F)
      +0.00739*E*s(Mp-M)-0.00514*E*s(Mp+M)+0.00208*E*E*s(2*M)
      -0.00111*s(Mp-2*F)-0.00057*s(Mp+2*F)+0.00056*E*s(2*Mp+M)-0.00042*s(3*Mp)
      +0.00042*E*s(M+2*F)+0.00038*E*s(M-2*F)-0.00024*E*s(2*Mp-M)-0.00017*s(O)
      -0.00007*s(Mp+2*M)+0.00004*s(2*Mp-2*F)+0.00004*s(3*M)+0.00003*s(Mp+M-2*F)
      +0.00003*s(2*Mp+2*F)-0.00003*s(Mp+M+2*F)+0.00003*s(Mp-M+2*F)
      -0.00002*s(Mp-M-2*F)-0.00002*s(3*Mp+M)+0.00002*s(4*Mp);
  } else if(kind===2){
    corr=-0.40614*s(Mp)+0.17302*E*s(M)+0.01614*s(2*Mp)+0.01043*s(2*F)
      +0.00734*E*s(Mp-M)-0.00515*E*s(Mp+M)+0.00209*E*E*s(2*M)
      -0.00111*s(Mp-2*F)-0.00057*s(Mp+2*F)+0.00056*E*s(2*Mp+M)-0.00042*s(3*Mp)
      +0.00042*E*s(M+2*F)+0.00038*E*s(M-2*F)-0.00024*E*s(2*Mp-M)-0.00017*s(O)
      -0.00007*s(Mp+2*M)+0.00004*s(2*Mp-2*F)+0.00004*s(3*M)+0.00003*s(Mp+M-2*F)
      +0.00003*s(2*Mp+2*F)-0.00003*s(Mp+M+2*F)+0.00003*s(Mp-M+2*F)
      -0.00002*s(Mp-M-2*F)-0.00002*s(3*Mp+M)+0.00002*s(4*Mp);
  } else {
    corr=-0.62801*s(Mp)+0.17172*E*s(M)-0.01183*E*s(Mp+M)+0.00862*s(2*Mp)
      +0.00804*s(2*F)+0.00454*E*s(Mp-M)+0.00204*E*E*s(2*M)-0.00180*s(Mp-2*F)
      -0.00070*s(Mp+2*F)-0.00040*s(3*Mp)-0.00034*E*s(2*Mp-M)+0.00032*E*s(M+2*F)
      +0.00032*E*s(M-2*F)-0.00028*E*E*s(Mp+2*M)+0.00027*E*s(2*Mp+M)-0.00017*s(O)
      -0.00005*s(Mp-M-2*F)+0.00004*s(2*Mp+2*F)-0.00004*s(Mp+M+2*F)+0.00004*s(Mp-2*M)
      +0.00003*s(Mp+M-2*F)+0.00003*s(3*M)+0.00002*s(2*Mp-2*F)+0.00002*s(Mp-M+2*F)
      -0.00002*s(3*Mp+M);
    var W=0.00306-0.00038*E*c(M)+0.00026*c(Mp)-0.00002*c(Mp-M)+0.00002*c(Mp+M)+0.00002*c(2*F);
    corr+=(kind===1?W:-W);
  }
  /* the 14 planetary-argument corrections, identical for all four phases */
  var A=[299.77+0.107408*k-0.009173*T2, 251.88+0.016321*k, 251.83+26.651886*k,
    349.42+36.412478*k, 84.66+18.206239*k, 141.74+53.303771*k, 207.14+2.453732*k,
    154.84+7.306860*k, 34.52+27.261239*k, 207.19+0.121824*k, 291.34+1.844379*k,
    161.72+24.198154*k, 239.56+25.513099*k, 331.55+3.592518*k];
  var W2=[0.000325,0.000165,0.000164,0.000126,0.000110,0.000062,0.000060,
    0.000056,0.000047,0.000042,0.000040,0.000037,0.000035,0.000023];
  for(var i=0;i<14;i++) corr+=W2[i]*s(R*A[i]);
  jde+=corr;
  /* JDE is Terrestrial Time; shift to UTC (Espenak-Meeus, 2005-2050) */
  var yr=2000+(jde-2451545)/365.25, tt=yr-2000;
  var dT=62.92+0.32217*tt+0.005589*tt*tt;
  return (jde-2440587.5)*MN_DAY-dT*1000;
}
/* the lunation number bracketing an instant, so a search can start near it */
function mnK(ms){ return (( ms/MN_DAY+2440587.5 )-2451550.09766)/29.530588861; }

/* Next occurrence of phase "kind" at or after "ms". */
function mnNextPhase(ms,kind){
  var k=Math.floor(mnK(ms))-1+kind/4, t;
  for(var i=0;i<4;i++){ t=mnPhaseJde(k,kind); if(t>ms) return t; k+=1; }
  return t;
}
/* Most recent occurrence of phase "kind" at or before "ms". */
function mnPrevPhase(ms,kind){
  var k=Math.ceil(mnK(ms))+1+kind/4, t;
  for(var i=0;i<4;i++){ t=mnPhaseJde(k,kind); if(t<=ms) return t; k-=1; }
  return t;
}
/* Days since the last new moon — the real elapsed time, not a mean cycle. */
function mnAge(ms){ return (ms-mnPrevPhase(ms,0))/MN_DAY; }

/* ONE snapshot of the moon at an instant. Age, cycle position, waxing flag
 * and the phase name all come from the Meeus primary-phase instants. The
 * illuminated fraction still comes from the sun–moon elongation, because that
 * is the geometry of the lit disc. Mixing the two sources was how a page
 * could say "full, waxing, 15.1 days old, 49% through" at once. */
function mnSnap(ms){
  var lastNew=mnPrevPhase(ms,0), nextNew=mnNextPhase(ms,0);
  var nextFull=mnNextPhase(ms,2);
  var ill=mnIllum(ms);
  var lun=nextNew-lastNew;
  var age=(ms-lastNew)/MN_DAY;
  var cycle=lun>0?(ms-lastNew)/lun:ill.phase;
  var waxing=nextFull<nextNew;
  var name=mnNameFromInstants(ms, cycle);
  return { fraction:ill.fraction, phase:cycle, waxing:waxing, dist:ill.dist,
           angle:ill.angle, age:age, name:name, primary:mnNearestPrimary(ms) };
}
/* Within 12 hours of a primary instant, use that name so "full moon" means
 * the day of full moon. Otherwise name the cycle position. */
function mnNearestPrimary(ms){
  var best=null, bestAbs=12*3600000, i, prev, next, d;
  for(i=0;i<4;i++){
    prev=mnPrevPhase(ms,i); next=mnNextPhase(ms,i);
    d=Math.min(ms-prev, next-ms);
    if(d<bestAbs){ bestAbs=d; best=i; }
  }
  return best;
}
function mnNameFromInstants(ms, cycle){
  var k=mnNearestPrimary(ms);
  if(k!==null) return mnPrimaryName(k);
  return mnName(cycle);
}

/* Every primary phase whose instant falls inside [from,to). */
function mnPhasesBetween(from,to){
  var out=[], k=Math.floor(mnK(from))-1;
  while(k<mnK(to)+1){
    for(var kind=0;kind<4;kind++){
      var t=mnPhaseJde(k+kind/4,kind);
      if(t>=from&&t<to) out.push({ kind:kind, t:t });
    }
    k+=1;
  }
  return out.sort(function(a,b){ return a.t-b.t; });
}

var MN_NAMES=['New moon','Waxing crescent','First quarter','Waxing gibbous',
  'Full moon','Waning gibbous','Last quarter','Waning crescent'];
/* Phase name from cycle position. The four primary names are reserved for a
 * narrow window around the exact instant, so "first quarter" on the page means
 * roughly the day of first quarter, not four days of it. */
function mnName(p){
  if(p<0.02||p>=0.98) return MN_NAMES[0];
  if(p<0.23) return MN_NAMES[1];
  if(p<0.27) return MN_NAMES[2];
  if(p<0.48) return MN_NAMES[3];
  if(p<0.52) return MN_NAMES[4];
  if(p<0.73) return MN_NAMES[5];
  if(p<0.77) return MN_NAMES[6];
  return MN_NAMES[7];
}
function mnPrimaryName(kind){ return [MN_NAMES[0],MN_NAMES[2],MN_NAMES[4],MN_NAMES[6]][kind]; }

/* ---- moonrise / moonset -------------------------------------------------
 * start: epoch ms of the START of the local day being asked about (the caller
 * owns the time zone, so a city page can ask in the city's own zone). Samples
 * altitude hourly and interpolates the horizon crossings — the SunCalc method.
 * hc = 0.133° allows for the moon's semidiameter plus refraction. */
function mnTimes(start,lat,lon){
  var hc=0.133*MN_RAD, lw=MN_RAD*-lon, phi=MN_RAD*lat;
  function alt(hoursOn){
    var t=start+hoursOn*3600000, d=mnDays(t), m=mnMoonPos(d);
    return mnAlt(mnSidereal(d,lw)-m.ra, phi, m.dec)-hc;
  }
  var h0=alt(0), rise, set, ye=0;
  for(var i=1;i<=24;i+=2){
    var h1=alt(i), h2=alt(i+1);
    var a=(h0+h2)/2-h1, b=(h2-h0)/2, xe=-b/(2*a); ye=(a*xe+b)*xe+h1;
    var d0=b*b-4*a*h1, roots=0, x1=0, x2=0;
    if(d0>=0){
      var dx=Math.sqrt(d0)/(Math.abs(a)*2);
      x1=xe-dx; x2=xe+dx;
      if(Math.abs(x1)<=1) roots++;
      if(Math.abs(x2)<=1) roots++;
      if(x1<-1) x1=x2;
    }
    if(roots===1){ if(h0<0) rise=i+x1; else set=i+x1; }
    else if(roots===2){ rise=i+(ye<0?x2:x1); set=i+(ye<0?x1:x2); }
    if(rise!==undefined&&set!==undefined) break;
    h0=h2;
  }
  var out={};
  if(rise!==undefined) out.rise=start+rise*3600000;
  if(set!==undefined) out.set=start+set*3600000;
  if(rise===undefined&&set===undefined) out[ye>0?'alwaysUp':'alwaysDown']=true;
  return out;
}

/* ---- where in the sky ---------------------------------------------------
 * Altitude and compass bearing of the moon for an observer, epoch ms.
 * Azimuth comes out of the standard formula measured from south (positive
 * west); +180 converts it to a compass bearing (0 = N, 90 = E), which is the
 * form a "rises in the ESE" sentence needs. */
function mnPos(ms,lat,lon){
  var d=mnDays(ms), m=mnMoonPos(d), lw=MN_RAD*-lon, phi=MN_RAD*lat;
  var H=mnSidereal(d,lw)-m.ra;
  var az=Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(phi)-Math.tan(m.dec)*Math.cos(phi));
  return { alt:mnAlt(H,phi,m.dec)/MN_RAD, az:((az/MN_RAD+180)%360+360)%360, dist:m.dist };
}
var MN_COMPASS=['north','NNE','NE','ENE','east','ESE','SE','SSE','south','SSW','SW','WSW','west','WNW','NW','NNW'];
function mnCompass(bearing){ return MN_COMPASS[Math.round(((bearing%360)+360)%360/22.5)%16]; }

/* ---- the moon glyph -----------------------------------------------------
 * The real lunar near side (the sprite in moon-face.mjs, referenced once with
 * <use>) with the UNLIT part covered by a shadow.
 *
 * The shadow is ONE path, not a mask or a clip: the unlit region is bounded by
 * the dark limb on one side and the terminator on the other, so it is an arc
 * out and an arc back. That matters — masks and clipPaths need a document-
 * unique id, and these glyphs are generated at build time AND regenerated in
 * the browser, on pages carrying thirty of them. No id, nothing to collide.
 *
 * Sweep flags do all the work:
 *   dark limb   away from the lit side
 *   terminator  bulges toward the LIT side when a crescent (shadow crosses the
 *               middle) and toward the DARK side when gibbous.
 * At f=0 the two arcs make the whole disc; at f=1 they cancel to nothing; at
 * f=0.5 the terminator's rx is 0 and it degenerates to the straight centre
 * line. So new, full and both quarters fall out of the same two arcs.
 *
 * `south` flips it: the phase is identical everywhere on Earth, but below the
 * equator the lit limb — and the whole face with it — appears rotated 180°. */
function mnGlyph(fraction,waxing,r,south,plain){
  var f=fraction<0?0:(fraction>1?1:fraction), d=2*r, cx=r, cy=r;
  var rx=(r*Math.abs(1-2*f)).toFixed(2), litRight=(waxing!==!!south);
  var s1=litRight?0:1, s2=litRight?(f<0.5?0:1):(f<0.5?1:0);
  var shadow='M'+cx+' '+(cy-r)+'A'+r+' '+r+' 0 0 '+s1+' '+cx+' '+(cy+r)
    +'A'+rx+' '+r+' 0 0 '+s2+' '+cx+' '+(cy-r)+'Z';
  return '<svg viewBox="0 0 '+d+' '+d+'" width="'+d+'" height="'+d+'" aria-hidden="true" class="mn-moon"'+(plain?' overflow="visible"':'')+'>'
    /* plain disc underneath: if the sprite is ever missing the glyph still
       reads as a moon in the right phase rather than vanishing */
    +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#efe3c2"/>'
    /* The face is the same picture in every glyph — only the terminator and the
       earthshine below change per day. At thumbnail size a <use> of the sprite
       is a bad deal: it is 828 vector elements behind two blur filters, and
       <use> rasterizes each reference independently, so a 31-day strip drew
       ~25,700 shapes to fill thirty 30px circles (407ms of style+layout+paint
       on the home page, vs ~60ms without it). Below 64px the glyph therefore
       places a build-time raster of that same sprite instead — identical pixels,
       one decode, shared by every thumbnail on the page. The big moon on a
       /moon/ city page is a single instance and keeps the vector, which stays
       crisp at any size. See make-moon-face-raster.mjs.
       "/assets/img/moon-face.a952fb5bbe.webp" is rewritten to the hashed .webp by build-inline, the
       same way "/assets/img/moon-face.b9e194850d.svg#ac-moon-face" is pointed at the hashed sprite.
       `plain` skips the face: the day/night map marker is too small to read it,
       and that page does not carry the sprite. */
    +(plain?'':(r<=32
      ? '<image href="/assets/img/moon-face.a952fb5bbe.webp" x="0" y="0" width="'+d+'" height="'+d+'"'+(south?' transform="rotate(180 '+cx+' '+cy+')"':'')+'/>'
      : '<g transform="scale('+(r/100)+')'+(south?' rotate(180 100 100)':'')+'"><use href="/assets/img/moon-face.b9e194850d.svg#ac-moon-face"/></g>'))
    /* Earthshine: the shadow is not equally opaque at every phase. Sunlight
       bounced off the Earth genuinely lights the moon's dark side, and it is
       most obvious on a thin crescent (a big, bright Earth in the moon's sky)
       and invisible next to a gibbous moon's glare — so the shadow lightens
       toward new and goes near-solid toward full. It also stops the sliver of
       shadow on a gibbous moon from looking like a smudge. */
    +(f>0.999?'':'<path d="'+shadow+'" fill="#0e0d08" fill-opacity="'+(0.91+0.075*f).toFixed(3)+'"/>')
    +'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#57503a" stroke-width="1"/></svg>';
}


/* ---- geometry ---------------------------------------------------------- */
/* THE FRAME IS LANDSCAPE, 16:9. It was square, on the reasoning that this is a
   view of a plane — true, but the plane has a long axis: the sun is off one
   side and the Earth-and-moon system is on the other, and a square frame spent
   its height on nothing. Widening it buys the distance the picture most needs,
   which is the one between the sun and the Earth. It is also the shape a phone
   is held in when it is turned, which is what the full-screen view wants.

   THE SUN IS CENTRED ON THE LEFT EDGE, cut off on one side only. It used to sit
   in the top-left corner at an angle, which left the whole bottom-left of the
   frame empty and put the sun-Earth line at a 12-degree tilt. Centring it uses
   the left side's full height and makes that line exactly horizontal, so the
   day/night terminator is exactly vertical — which is easier to read and no
   less true.

   EVERYTHING IS SMALLER THAN IT COULD BE, ON PURPOSE. A picture that fills its
   frame with three big discs is the least realistic arrangement available: what
   is most wrong here is DISTANCE, and distance is measured in Earth-diameters,
   so shrinking the bodies while keeping the orbit wide improves every figure on
   the scale card at once. Against the previous, larger arrangement: the moon
   goes from 26x too close to 23x, the sun from 3,905x to 3,151x, and the clear
   sky between the sun's disc and the moon's from 63 units to 101. It is still
   enormously wrong — it has to be, at 11,740 Earth-diameters — but it is wrong
   by less, and it looks it.

   THE FLOOR ON THAT IS LEGIBILITY: the moon has to be big enough to show a lit
   half and a dark half on a phone. At 11.45 units in a 480-wide frame it is
   about 19px across on a 390px screen, which is the smallest that still reads.

   ORR_MR is not a free choice at all — the moon is 0.273 Earth diameters across
   and 11.45/42 is 0.2726, so the one ratio here that CAN be honest is, and the
   scale card prints both numbers side by side.

   THE MOON CLEARS THE SUN AT NEW MOON, its closest approach: 106 units of clear
   sky between the two discs, and the sun is then 1.9x further from the moon
   than the moon is from the Earth.

   ORR_RM ALSO HAS TO LEAVE ROOM FOR THE MOON'S LABEL BELOW IT. The label is
   pinned under the moon at every point on the orbit (see below), so the lowest
   the moon ever gets — ORR_CY+ORR_RM+ORR_MR — plus the label's own height has
   to stay inside ORR_H. At 107 the bottom of the moon is 253.5, the baseline
   lands at 264.5 and the frame ends at 270: the word clears the moon by about
   two units and the frame by five. This is why the orbit is not larger. */
/* THE HEIGHT IS FIXED AND THE WIDTH IS NOT. Every size in the picture — the
   Earth, the moon, the orbit, the sun — is set against ORR_H, which never
   changes; ORR_W is only the DEFAULT width, the one a card uses. The Earth sits
   a fixed distance in from the RIGHT edge and the sun a fixed distance in from
   the LEFT, so a wider frame does exactly one thing: it puts more space between
   them. That is the right thing for it to do, because the sun's distance is by
   far the most wrong figure in the picture, so every extra pixel of it makes
   the picture less wrong — and nothing about the bodies moves, so the drawing
   looks identical at any width.

   It is what lets full screen FILL the screen. A fixed-ratio picture in a box
   of some other ratio has to letterbox; this one is handed the box's own ratio
   and fills it exactly, at whatever height is left after the controls. On the
   smallest phone likely to be used that height is what sets the body sizes,
   which is the floor the sizes below were chosen against. */
var ORR_W=480, ORR_H=270,         /* 480 is the DEFAULT width, not the only one */
    ORR_RIGHT=135,                /* the Earth's centre, in from the right    */
    ORR_CY=135,                   /* ...and centred vertically               */
    ORR_R=42,                     /* the Earth's drawn radius                */
    ORR_RM=107,                   /* the moon's schematic orbit radius       */
    ORR_MR=11.45,                 /* the moon's drawn radius: see above      */
    ORR_SX=32, ORR_SY=135, ORR_RS=88;  /* the sun, centred on the left edge  */
var ORR_CX=ORR_W-ORR_RIGHT;       /* the default frame's Earth               */
/* the widest the frame is allowed to get. Past this the sun is so far from the
   Earth that the picture is mostly empty sky, which is realistic and useless. */
var ORR_WMAX=1100;
function orrFrameW(w){ return Math.max(ORR_W, Math.min(ORR_WMAX, Math.round(w||ORR_W))); }
/* WHERE THE SUN IS PINNED, DERIVED from where it is drawn rather than typed
   beside it. The scene is rotated so the real sun lands on this screen angle,
   and the day/night line is drawn square-on to it — so if this and the drawn
   position ever disagreed, the lit half of the Earth would not face the sun.
   It cannot now: both come from ORR_SX/ORR_SY. (Screen angle is measured the
   mathematical way, x right and y UP, hence CY-SY.) */
var ORR_SUNANG=Math.atan2(ORR_CY-ORR_SY, -1);   /* due left: SY === CY */
/* the day/night line is perpendicular to the sun, so its two ends are the sun
   angle turned a quarter turn either way. These replace the fixed 45-degree
   diagonal that only worked while the sun sat exactly on the corner diagonal. */
var ORR_TX=Math.sin(ORR_SUNANG), ORR_TY=Math.cos(ORR_SUNANG);
function orrF(n){ return Math.round(n*10)/10; }
/* Label boxes, so two labels never land on top of each other and none of them
   walks off the edge. Widths are estimated from the character count at the one
   font size used here — near enough for keeping text apart, and it costs no
   measuring pass (the build has no DOM at all). */
var ORR_PAD=4;                    /* how close a label may sit to the frame  */
function orrClampX(x,anch,w,W){
  W=W||ORR_W;
  if(anch==='start') return Math.min(Math.max(x,ORR_PAD),W-ORR_PAD-w);
  if(anch==='end') return Math.max(Math.min(x,W-ORR_PAD),ORR_PAD+w);
  return Math.min(Math.max(x,ORR_PAD+w/2),W-ORR_PAD-w/2);
}
function orrEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* equatorial right ascension/declination -> ecliptic longitude/latitude. The
   positions come out of MOON_CORE in equatorial coordinates because that is
   what rise/set and altitude need; this view is drawn in the plane the Earth
   orbits in, so it needs the other pair. Converting is three lines and keeps
   ONE solar/lunar series on the page. */
function orrEcl(ra,dec){
  var ce=Math.cos(MN_OBL), se=Math.sin(MN_OBL);
  return { lam:Math.atan2(Math.sin(ra)*ce+Math.tan(dec)*se, Math.cos(ra)),
           bet:Math.asin(Math.sin(dec)*ce-Math.cos(dec)*se*Math.sin(ra)) };
}
function orrUnit(lam,bet){ return [Math.cos(bet)*Math.cos(lam), Math.cos(bet)*Math.sin(lam), Math.sin(bet)]; }
/* a unit vector in Earth-equator coordinates -> the same vector in the orbit
   plane's coordinates (a single rotation by the axial tilt) */
function orrToEcl(v){ var ce=Math.cos(MN_OBL), se=Math.sin(MN_OBL);
  return [v[0], v[1]*ce+v[2]*se, -v[1]*se+v[2]*ce]; }

/* Everything the picture and its caption need for one instant and one place. */
function orrCalc(ms,lat,lon){
  var d=mnDays(ms), sp=mnSunPos(d), mp=mnMoonPos(d);
  var se=orrEcl(sp.ra,sp.dec), me=orrEcl(mp.ra,mp.dec);
  var S=orrUnit(se.lam,se.bet), M=orrUnit(me.lam,me.bet);
  /* the reader's own spot: their zenith direction. mnSidereal gives the right
     ascension of their meridian, so this is the same vector whose dot product
     with the sun is the altitude printed above the picture. */
  var phi=MN_RAD*lat, th=mnSidereal(d,MN_RAD*-lon);
  var O=orrToEcl([Math.cos(phi)*Math.cos(th), Math.cos(phi)*Math.sin(th), Math.sin(phi)]);
  /* Look down from the reader's OWN hemisphere: from above the north pole of
     the orbit for the northern half of the world, from below it for the
     southern. Otherwise every southern city would spend its day on the far
     side of the globe, hidden behind the Earth it is standing on. The flip
     mirrors the scene, which is why the Earth and moon turn the other way
     round below the equator — as they genuinely appear to from down there. */
  var flip=lat<0?-1:1;
  var rho=ORR_SUNANG-Math.atan2(flip*S[1],S[0]), cr=Math.cos(rho), sr=Math.sin(rho);
  function pr(v){ var a=v[0], b=flip*v[1];
    return { x:a*cr-b*sr, y:a*sr+b*cr, z:flip*v[2] }; }
  function clamp(v){ return v<-1?-1:(v>1?1:v); }
  return { pr:pr, obs:pr(O), moon:pr(M), pole:pr(orrToEcl([0,0,flip])), phi:phi,
    /* geometric, unrefracted — used only to say which side of the line the
       marker is on, never to print a number that would sit beside the
       refracted altitude in the card and disagree with it */
    sunAlt:Math.asin(clamp(S[0]*O[0]+S[1]*O[1]+S[2]*O[2]))/MN_RAD,
    elong:Math.acos(clamp(S[0]*M[0]+S[1]*M[1]+S[2]*M[2]))/MN_RAD };
}

/* ---- the picture ------------------------------------------------------- */
function orrSvg(ms,lat,lon,name,fw){
  var g=orrCalc(ms,lat,lon), i, k, s;
  var W=orrFrameW(fw), CX=W-ORR_RIGHT;
  var CY=ORR_CY, R=ORR_R, TX=ORR_TX, TY=ORR_TY;
  /* the ends of the day/night line, square-on to the sun and so at a fixed
     angle. There used to be a drawn beam as well — a tinted wedge plus two
     stroked lines running from the sun's edges to these two points. It was
     geometrically honest and it read badly: a hard-edged band lying across the
     picture, which looks like an object rather than like light, and which drew
     the eye away from the three things that actually move. The lit half of the
     Earth and the sun's own glow say the same thing without it. */
  /* the two ends of the day/night line: the sun's screen angle, turned a
     quarter turn each way. With the sun on the old corner diagonal these came
     out at exactly +/-45 degrees, which is why a constant used to do. */
  var ax=CX+R*TX, ay=CY+R*TY, bx=CX-R*TX, by=CY-R*TY;

  s='<svg viewBox="0 0 '+W+' '+ORR_H+'" width="'+W+'" height="'+ORR_H+'" aria-hidden="true">'
   + '<defs><radialGradient id="orr-glow" gradientUnits="userSpaceOnUse" cx="'+ORR_SX+'" cy="'+ORR_SY+'" r="'+(ORR_RS+26)+'">'
   + '<stop offset="'+orrF(ORR_RS/(ORR_RS+26))+'" stop-color="#fcd34d" stop-opacity=".34"/><stop offset="1" stop-color="#fcd34d" stop-opacity="0"/></radialGradient>'
   /* the sun runs off two edges, so the scene is clipped to the panel's own
      rounded rectangle rather than letting it spill */
   + '<clipPath id="orr-clip"><rect width="'+W+'" height="'+ORR_H+'" rx="16"/></clipPath></defs>'
   + '<g clip-path="url(#orr-clip)">'
   + '<rect width="'+W+'" height="'+ORR_H+'" rx="16" fill="#0a1020"/>'
   /* the sun. Drawn running off the corner rather than as a tidy disc: it is
      109 Earths wide and the picture cannot hold it. */
   + '<circle cx="'+ORR_SX+'" cy="'+ORR_SY+'" r="'+(ORR_RS+26)+'" fill="url(#orr-glow)"/>'
   + '<circle cx="'+ORR_SX+'" cy="'+ORR_SY+'" r="'+ORR_RS+'" fill="#fcd34d"/>'
   /* the centre is inside the frame now, so the label sits on it */
   + '<text x="'+ORR_SX+'" y="'+(ORR_SY+5)+'" text-anchor="middle" font-size="14" font-weight="700" fill="#4b3a05">Sun</text>'
   /* the moon's orbit, dotted because the radius is schematic */
   + '<circle cx="'+CX+'" cy="'+CY+'" r="'+ORR_RM+'" fill="none" stroke="#a8b6c8" stroke-opacity=".34" stroke-width="1" stroke-dasharray="2 4"/>'
   /* the Earth, lit side first */
   + '<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="#2f74ad"/>';

  /* The reader's daily circle: where their spot goes as the Earth turns. The
     half of it on the lit side is their daylight, which is the day length
     printed further up the page — the same fact, drawn. The part on the far
     side of the globe is behind the Earth, so it is drawn as barely-there
     dots rather than as a line that would appear to be in front. */
  var near=[], far=[], seg=null, wasVis=null;
  for(k=0;k<=64;k++){
    var t=k/64*2*Math.PI;
    var p=g.pr(orrToEcl([Math.cos(g.phi)*Math.cos(t), Math.cos(g.phi)*Math.sin(t), Math.sin(g.phi)]));
    var vis=p.z>=0;
    if(vis!==wasVis){ seg=[]; (vis?near:far).push(seg); wasVis=vis; }
    seg.push(orrF(CX+R*p.x)+','+orrF(CY-R*p.y));
  }
  /* The part of the circle on the FAR side of the globe goes under the night
     shading — it is behind the Earth and should read that way. */
  for(i=0;i<far.length;i++) if(far[i].length>1)
    s+='<polyline points="'+far[i].join(' ')+'" fill="none" stroke="#e8eef7" stroke-opacity=".13" stroke-width="1" stroke-dasharray="1 3"/>';

  /* night: the half turned away from the sun, laid over the globe */
  s+='<path d="M'+orrF(ax)+' '+orrF(ay)+'A'+R+' '+R+' 0 0 1 '+orrF(bx)+' '+orrF(by)+'Z" fill="#050a16" fill-opacity=".84"/>';

  /* ...and the near half of the daily circle goes OVER it, at one strength the
     whole way round. It used to sit under the shading, which dimmed the half a
     reader most wants to follow — the night half, where their own spot is when
     the question is "am I in the dark yet". Same colour on both sides now: the
     day/night line it crosses already says which part is which. */
  for(i=0;i<near.length;i++) if(near[i].length>1)
    s+='<polyline points="'+near[i].join(' ')+'" fill="none" stroke="#e8eef7" stroke-opacity=".38" stroke-width="1.1" stroke-dasharray="3 3"/>';
  s+='<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="#9dc2e0" stroke-opacity=".45" stroke-width="1"/>';

  /* The pole, which is the axial tilt made visible: it leans toward the sun in
     the reader's summer and away from it in their winter, and that lean is the
     whole reason the daily circle above sits where it does. */
  var pl=g.pole, plx=CX+R*pl.x, ply=CY-R*pl.y, pd=Math.sqrt(pl.x*pl.x+pl.y*pl.y)||1;
  s+='<path d="M'+CX+' '+CY+'L'+orrF(plx)+' '+orrF(ply)+'" stroke="#e8eef7" stroke-opacity=".33" stroke-width="1"/>'
   + '<circle cx="'+orrF(plx)+'" cy="'+orrF(ply)+'" r="1.8" fill="#e8eef7" fill-opacity=".65"/>'
   + '<text x="'+orrF(plx+pl.x/pd*8)+'" y="'+orrF(ply-pl.y/pd*8+3.5)+'" text-anchor="middle" font-size="10" fill="#e8eef7" fill-opacity=".6" paint-order="stroke" stroke="#0a1020" stroke-width="2.5">'+(lat<0?'S':'N')+'</text>';

  /* The reader. The tick runs straight up out of their spot — that is the
     direction they call "overhead", and how close it is to the day/night line
     is how low the sun is for them. A spot on the far side of the globe is
     drawn hollow rather than moved or dropped. */
  var o=g.obs, od=Math.sqrt(o.x*o.x+o.y*o.y), ux=od>0.02?o.x/od:0, uy=od>0.02?o.y/od:1;
  var oX=CX+R*o.x, oY=CY-R*o.y, vis2=o.z>=0;
  /* the label is the place name without its state or country suffix — the page
     it sits on has already said which one, and the picture has 320px total */
  var lab=String(name||'You').split(',')[0], lw=lab.length*6.4;
  var lx=orrClampX(CX+(R+13)*ux, (ux>0.25?'start':(ux<-0.25?'end':'middle')), lw, W);
  var anch=ux>0.25?'start':(ux<-0.25?'end':'middle');
  var ly=CY-(R+13)*uy+(uy<-0.5?9:(uy>0.5?-3:4));
  /* The tick and the name carry a class because they are the two things that
     have to GO while the picture is being played through a month. The name is
     anchored to a spot on a turning Earth, so at speed it swings round the
     globe dragging its leader line behind it, and that movement is louder than
     everything it is there to help you watch. The marker itself and its daily
     circle stay — they are the point. See ORR_SPIN below. */
  s+='<path class="orr-citytick" d="M'+orrF(oX)+' '+orrF(oY)+'L'+orrF(CX+(R+9)*ux)+' '+orrF(CY-(R+9)*uy)+'" stroke="#fcd34d" stroke-opacity="'+(vis2?'.75':'.35')+'" stroke-width="1.2"'+(vis2?'':' stroke-dasharray="2 2"')+'/>'
   + '<circle cx="'+orrF(oX)+'" cy="'+orrF(oY)+'" r="3.4" fill="'+(vis2?'#fcd34d':'none')+'" stroke="#fcd34d" stroke-opacity="'+(vis2?'.9':'.5')+'" stroke-width="1.2"/>'
   + '<text class="orr-cityname" x="'+orrF(lx)+'" y="'+orrF(ly)+'" text-anchor="'+anch+'" font-size="12" font-weight="600" fill="#fde68a" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+orrEsc(lab)+'</text>';

  /* The moon, at its true direction from the Earth. Its lit half faces the sun
     like everything else here — from this vantage every moon looks half lit,
     and that is the point: the phase people see is not how much of the moon is
     lit but how much of the lit half faces them, which is the ANGLE in this
     picture. */
  var m=g.moon, md=Math.sqrt(m.x*m.x+m.y*m.y)||1, mx=CX+ORR_RM*m.x/md, my=CY-ORR_RM*m.y/md;
  var mr=ORR_MR;
  s+='<circle cx="'+orrF(mx)+'" cy="'+orrF(my)+'" r="'+mr+'" fill="#4b5563"/>'
   + '<path d="M'+orrF(mx+mr*TX)+' '+orrF(my+mr*TY)+'A'+mr+' '+mr+' 0 0 0 '+orrF(mx-mr*TX)+' '+orrF(my-mr*TY)+'Z" fill="#e8eef7"/>'
   + '<circle cx="'+orrF(mx)+'" cy="'+orrF(my)+'" r="'+mr+'" fill="none" stroke="#cbd5e1" stroke-opacity=".55" stroke-width="1"/>';
  /* THE LABEL IS ALWAYS DIRECTLY BELOW THE MOON. It used to pick from three
     offsets — beside, below, above — taking the first that cleared the city's
     name and the frame, which meant it hopped from one side of the moon to the
     other as the moon went round. That is fine on a still picture and awful on
     a moving one: with Play running, the one word on screen that is not moving
     smoothly jumps. One fixed offset costs a little clearance and buys a label
     the eye can stop tracking.

     It cannot collide with the city's name, and that is geometry rather than
     luck: the city label is anchored on the Earth's disc and cannot reach
     further than R + its own width from the Earth's centre, while the moon's
     label sits ORR_RM out plus its own drop. Nor can it leave the frame — see
     the note on ORR_RM above for the bottom, and orrClampX still holds the
     sides for the rare wide-frame case. */
  var mw=30, lby=my+mr+11;
  s+='<text x="'+orrF(orrClampX(mx,'middle',mw,W))+'" y="'+orrF(lby)+'" text-anchor="middle" font-size="12" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">Moon</text>';

  /* the phase as seen from Earth, sitting in the sun–earth gap, low in the
     frame. The moon on the ring is always half-lit from this vantage; this
     disc is the face a person on Earth actually sees, and it updates as the
     moon goes round. */
  var il=mnIllum(ms);
  var phR=14, gapL=ORR_SX+ORR_RS, gapR=CX-R;
  var phx=(gapL+gapR)/2, phy=ORR_H-42;
  s+='<g class="orr-phase" transform="translate('+orrF(phx-phR)+' '+orrF(phy-phR)+')">'
   +mnGlyph(il.fraction,il.waxing,phR,lat<0,1)
   +'</g>'
   +'<text class="orr-phase-lab" x="'+orrF(phx)+'" y="'+orrF(phy+phR+12)+'" text-anchor="middle" font-size="11" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+orrEsc(mnName(il.phase))+'</text>';

  return s+'</g></svg>';
}

/* ---- the caption -------------------------------------------------------
 * The picture is decorative markup (the SVG is aria-hidden); this sentence is
 * the part that has to carry it in words, so it says what the marker is doing
 * and what the moon's angle means rather than describing shapes. */
function orrNote(ms,lat,lon,name,live){
  var g=orrCalc(ms,lat,lon), il=mnIllum(ms), nm=mnName(il.phase);
  /* Every claim in here is about ONE instant, and that instant is only "now"
     while the control below the picture says so — otherwise this would tell a
     reader looking at next October what the sky is doing today. */
  var when=live===false?'at the time shown':'right now';
  /* the sentence opens with it, and /sun/anywhere/ hands over "your location" */
  var place=orrEsc(name||'Your location');
  place=place.charAt(0).toUpperCase()+place.slice(1);
  var lit=g.sunAlt>0;
  var edge=Math.abs(g.sunAlt)<8 ? ', close to the line where day meets night' : '';
  return '<b>'+place+'</b> is the marker on the globe \u2014 on the '+(lit?'daylit':'night')+' half '+when+edge
   + ', riding the dotted circle its spot traces as the Earth turns. '
   + 'The moon is <b>'+Math.round(g.elong)+'\u00b0</b> from the sun in the sky '+(live===false?'then':'now')+', and that angle is the phase: '
   + nm.charAt(0).toLowerCase()+nm.slice(1)+'. '
   + 'You are looking down on the Earth from far above its orbit, from the '+(lat<0?'south':'north')+' \u2014 the side you are on \u2014 '
   + 'with sunlight arriving from the top left, so the half of the Earth facing that way is the half having its day. '
   + 'Sizes and distances are not to scale; the directions are.';
}

/* ---- the instant being drawn -------------------------------------------
 * The picture started out as a read-out of NOW. It is worth more than that:
 * the geometry solves for an arbitrary instant, so letting the reader move the
 * instant turns the same picture into "where will the sun and moon be when I
 * get there" — the question a photographer actually has.
 *
 * ORR_AT is the whole of that state: null means live (the page's own tick keeps
 * the picture on the current minute), anything else freezes it on a chosen
 * instant. TWO controls write it, and the difference between them is what the
 * rest of the page does about it:
 *
 *   - the date+time field changes the DAY, and the host page follows: sunrise,
 *     the dial, the twilight bands, the 7-day table, the moon's rise and set.
 *     Those are all per-day facts and a page showing two different days at once
 *     would be worse than no control at all.
 *   - the slider scrubs the time WITHIN that day, and nothing else moves. The
 *     day's facts have not changed — only where the two bodies are in it — so
 *     it repaints this card and no more, which is what makes it cheap enough to
 *     drag.
 *
 * The field is a native datetime-local on purpose: its own date and time
 * pickers on every platform, one line wide, no library — and its value is a
 * naive wall-clock reading with no zone of its own, which is exactly right
 * here, because the clock this page must show is the PLACE's, never the
 * visitor's. */
var ORR_AT=null, ORR_LAST=null, ORR_ONCHANGE=null;
function orrLive(){ return ORR_AT==null; }
function orrAt(){ return ORR_AT; }                 /* null, or the chosen instant */
function orrWhen(){ return ORR_AT==null?Date.now():ORR_AT; }
function orrOnChange(fn){ ORR_ONCHANGE=fn; }       /* host repaints its own numbers */

/* epoch -> "YYYY-MM-DDTHH:mm" as the clock reads in tz (what the input wants) */
function orrLocalValue(ms,tz){
  try{
    var o={ year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' };
    if(tz) o.timeZone=tz;
    var ps=new Intl.DateTimeFormat('en-CA',o).formatToParts(new Date(ms));
    function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return ps[i].value; return '00'; }
    return g('year')+'-'+g('month')+'-'+g('day')+'T'+g('hour')+':'+g('minute');
  }catch(e){ return ''; }
}
function orrDayOf(ms,tz){ return orrLocalValue(ms,tz).slice(0,10); }
function orrMinOf(ms,tz){ var v=orrLocalValue(ms,tz); return (+v.slice(11,13))*60+(+v.slice(14,16)); }
function orrPad(n){ return (n<10?'0':'')+n; }
/* how far tz is from UTC at a given instant, in ms */
function orrOffset(ms,tz){
  try{
    var o={ year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' };
    if(tz) o.timeZone=tz;
    var ps=new Intl.DateTimeFormat('en-GB',o).formatToParts(new Date(ms));
    function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return +ps[i].value; return 0; }
    return Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'),g('second'))-ms;
  }catch(e){ return 0; }
}
/* "YYYY-MM-DDTHH:mm" read in tz -> epoch. Two passes, because the offset has to
   be measured somewhere and the first guess can land on the far side of a
   daylight-saving change from the answer (the technique lib.mjs uses for event
   dates). An hour that does not exist locally — the spring-forward gap — comes
   back as a real instant an hour to one side of it, because there is no such
   local time and so no sky to draw for it. */
function orrParse(v,tz){
  var m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v||''); if(!m) return null;
  var guess=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
  var o1=orrOffset(guess,tz), t=guess-o1, o2=orrOffset(t,tz);
  if(o2!==o1) t=guess-o2;
  return t;
}

/* ---- THE SLIDER'S SPAN: ONE LAP OF THE MOON -------------------------------
 * The bar used to cover a DAY, which is the wrong unit for this picture. What
 * it draws is the moon's angle from the sun — the phase — and that angle takes
 * a synodic month to come round. Across a day it moves 13 degrees, so the whole
 * length of the control bought a thirtieth of the one cycle it exists to show.
 * End to end is now exactly one revolution: drag from the left edge to the
 * right and the moon goes round the Earth once and comes back to the phase it
 * started in.
 *
 * The span is anchored at MIDNIGHT of the day the card is on, so the left edge
 * lines up with the day the rest of the page is about and the thumb starts
 * wherever in that day the reader is. Choosing another day — the field, Now,
 * the page's own date pickers — re-anchors it (orrSpanFix). */
var ORR_SYN=29.530588853;                          /* days, sun to sun */
var ORR_SPAN_MIN=Math.round(ORR_SYN*1440);         /* the slider's max, in minutes */
var ORR_SPAN0=null;                                /* epoch of the left edge */
function orrSpanStart(tz,ms){
  var t=orrParse(orrDayOf(ms,tz)+'T00:00',tz);
  return t==null?ms:t;
}
function orrSpanFix(ms,tz,force){
  if(force||ORR_SPAN0==null||ms<ORR_SPAN0||ms>=ORR_SPAN0+ORR_SPAN_MIN*60000)
    ORR_SPAN0=orrSpanStart(tz,ms);
  return ORR_SPAN0;
}
/* where the thumb sits for an instant, and what instant a thumb position is */
function orrSpanPos(ms,tz){ return Math.round((ms-orrSpanFix(ms,tz))/60000); }
function orrSpanAt(min,tz){ return orrSpanFix(orrWhen(),tz)+min*60000; }

/* ---- PLAY ----------------------------------------------------------------
 * The slider moves the instant WITHIN a day, and across a day the moon travels
 * 13 degrees — real, and too little to read as an orbit. So the picture drew a
 * city spinning on an Earth the moon appeared to be pinned to, which is the
 * opposite of what the card is for. Play runs the clock forward across days
 * instead, at a rate chosen so the LUNAR CYCLE is the thing you see.
 *
 * One drawn day every 1.4 seconds: a full cycle of the moon's phase takes about
 * 41 seconds, and the city marker comes round once every 1.4 — fast enough to
 * read as spin, slow enough to follow.
 *
 * WHILE IT RUNS, ONLY THIS CARD MOVES. Every frame calls orrSet with
 * dayChanged FALSE, so the host page repaints the picture and its live rows and
 * not the day's own facts — sunrise, the dial, the tables — which would be a
 * full re-render sixteen times a second. The page catches up in ONE re-render
 * when the picture stops, which is also the moment a reader looks at it. */
var ORR_PLAY=0, ORR_IV=0, ORR_ANCH=0, ORR_T0=0;
var ORR_SPEED=86400000/1400;
function orrPlaying(){ return !!ORR_PLAY; }
function orrPlayBtn(){ return document.getElementById('orr-play'); }
function orrPlayStop(sync){
  if(!ORR_PLAY) return;
  ORR_PLAY=0;
  if(ORR_IV){ clearInterval(ORR_IV); ORR_IV=0; }
  var b=orrPlayBtn();
  if(b){ b.setAttribute('aria-pressed','false'); b.textContent='Play'; }
  /* the city's name and leader line come back the moment the picture stops */
  var f=document.getElementById('orr-fig'); if(f) f.classList.remove('orr-spin');
  var re=document.getElementById('orr-scrub-lab'); if(re) re.textContent=orrScrubLab();
  /* sync=false when the caller is about to move the instant itself (Now, the
     field, the slider): re-rendering the old day first would be a wasted pass */
  if(sync!==false) orrSet(orrWhen(), true);
}
function orrPlayStart(){
  if(ORR_PLAY) return;
  ORR_PLAY=1; ORR_ANCH=orrWhen(); ORR_T0=Date.now();
  var b=orrPlayBtn();
  if(b){ b.setAttribute('aria-pressed','true'); b.textContent='Pause'; }
  /* see .orr-spin in 20d2-orrery.css: the name is pinned to a spot on a turning
     Earth and swings round the globe dragging its line, which is louder than
     the thing the animation exists to show */
  var f=document.getElementById('orr-fig'); if(f) f.classList.add('orr-spin');
  var re=document.getElementById('orr-scrub-lab'); if(re) re.textContent=orrScrubLab();
  ORR_IV=setInterval(function(){
    if(!ORR_PLAY) return;
    var tz=(ORR_LAST||{}).tz;
    /* WRAPPED INSIDE THE SPAN, so Play and the slider are the same journey:
       one press takes the moon round the Earth once, the thumb crosses the bar
       once, and then it starts again rather than wandering off into next year. */
    var span=ORR_SPAN_MIN*60000, t0=orrSpanFix(ORR_ANCH,tz);
    var off=(ORR_ANCH-t0)+(Date.now()-ORR_T0)*ORR_SPEED;
    orrSet(t0+(off%span), false);
  },66);
}
function orrPlayToggle(){ if(ORR_PLAY) orrPlayStop(true); else orrPlayStart(); }

/* Move the instant and tell the host. dayChanged says whether the rest of the
   page has to follow, which is the whole difference between the field and the
   slider. */
function orrSet(t,dayChanged){
  ORR_AT=t;
  if(ORR_ONCHANGE) ORR_ONCHANGE(!!dayChanged);
  else { var L=ORR_LAST||{}; orrShow(L.lat,L.lon,L.name,L.tz); }
}

/* Paint for one instant. The DOM wiring lives here rather than in each
   generator so /sun/ and /moon/ fill the same markup the same way, and it does
   nothing at all on a page that does not render the figure. */
function orrPaint(ms,lat,lon,name,tz){
  var f=document.getElementById('orr-fig'); if(!f) return;
  ORR_LAST={ lat:lat, lon:lon, name:name, tz:tz };
  f.innerHTML=orrSvg(ms,lat,lon,name);
  var n=document.getElementById('orr-note'); if(n) n.innerHTML=orrNote(ms,lat,lon,name,orrLive());
  var inp=document.getElementById('orr-at');
  if(inp){
    /* never yank the value out from under someone mid-edit: the page's own
       30-second tick calls straight through here */
    if(document.activeElement!==inp){ var v=orrLocalValue(ms,tz); if(inp.value!==v) inp.value=v; }
    inp.disabled=false;                         /* it can only work with JS */
  }
  var sl=document.getElementById('orr-slider');
  if(sl){ if(document.activeElement!==sl){ var mn=orrSpanPos(ms,tz); if(+sl.value!==mn) sl.value=mn; }
    sl.disabled=false; }
  var re=document.getElementById('orr-scrub-lab');
  if(re) re.textContent=orrScrubLab();
  orrWire();
}

/* the line under the slider doubles as the card's state read-out */
function orrScrubLab(){
  return orrPlaying() ? 'Playing — a day every 1.4 seconds, and the whole bar is one lap of the moon'
    : 'Press Play, or drag: end to end is one full turn of the moon round the Earth — 29 days and 13 hours';
}

/* Everything the host page calls: paint for whatever instant is current. */
function orrShow(lat,lon,name,tz){ orrPaint(orrWhen(),lat,lon,name,tz); }

/* One-time listeners. The field moves the day (host follows), the slider moves
   the time inside it (host does not), Now hands the picture back to the clock. */
function orrWire(){
  var inp=document.getElementById('orr-at'), sl=document.getElementById('orr-slider'),
      nw=document.getElementById('orr-now'), L=function(){ return ORR_LAST||{}; };
  var pl=document.getElementById('orr-play');
  if(pl&&!pl.getAttribute('data-orr-wired')){
    pl.setAttribute('data-orr-wired','1');
    pl.hidden=false;                            /* useless without JS, ships hidden */
    pl.addEventListener('click',orrPlayToggle);
    /* a tab in the background gets no frames anyway, and coming back to a
       picture that has silently run three months on is not a feature */
    document.addEventListener('visibilitychange',function(){ if(document.hidden) orrPlayStop(true); });
  }
  if(inp&&!inp.getAttribute('data-orr-wired')){
    inp.setAttribute('data-orr-wired','1');
    inp.addEventListener('change',function(){
      orrPlayStop(false);
      var tz=L().tz, t=orrParse(inp.value,tz);
      /* a cleared field means "no particular time", which is the live clock */
      if(t==null){ orrSpanFix(Date.now(),tz,1); orrSet(null, orrDayOf(Date.now(),tz)!==orrDayOf(orrWhen(),tz)); return; }
      orrSpanFix(t,tz,1);                       /* the bar starts at the chosen day */
      orrSet(t, orrDayOf(t,tz)!==orrDayOf(orrWhen(),tz));
    });
  }
  if(sl&&!sl.getAttribute('data-orr-wired')){
    sl.setAttribute('data-orr-wired','1');
    /* 'input', not 'change': the picture follows the thumb as it is dragged.
       Each repaint is one solar and one lunar position and a string of SVG —
       cheap enough to run per frame, which is why the slider can be scoped to
       this card and skip the page's per-day work entirely. */
    /* DRAGGING CROSSES DAYS NOW, and that is the point — but the host page's
       per-day work (sunrise, the dial, the twilight bands, the 7-day table) is
       far too heavy to redo per frame. So 'input' moves the picture alone and
       'change' — which fires once, when the thumb is let go — hands the page
       the day it landed on. Smooth while dragging, correct when it stops. */
    sl.addEventListener('input',function(){
      orrPlayStop(false);
      var t=orrSpanAt(+sl.value||0, L().tz);
      if(t!=null) orrSet(t,false);
    });
    sl.addEventListener('change',function(){
      var tz=L().tz, t=orrSpanAt(+sl.value||0, tz);
      if(t!=null) orrSet(t, orrDayOf(t,tz)!==orrDayOf(orrWhen(),tz));
    });
  }
  if(nw&&!nw.getAttribute('data-orr-wired')){
    nw.setAttribute('data-orr-wired','1');
    nw.hidden=false;                            /* useless without JS, ships hidden */
    nw.addEventListener('click',function(){
      var tz=L().tz, changed=orrDayOf(Date.now(),tz)!==orrDayOf(orrWhen(),tz);
      orrPlayStop(false);
      orrSpanFix(Date.now(),tz,1);              /* back to today, and the bar with it */
      orrSet(null, changed);
    });
  }
}


var PL_RAD=Math.PI/180, PL_DAY=86400000, PL_J2000=2451545, PL_J1970=2440588;
/* [name, a, e, I, L, longPeri, longNode] at J2000, then the same six per
   Julian century. a in AU, angles in degrees. */
var PL_EL=[
 ['Mercury',0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593,
            0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081],
 ['Venus',  0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255,
            0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418],
 ['Earth',  1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0,
            0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0],
 ['Mars',   1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891,
            0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343],
 ['Jupiter',5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909,
            -0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106],
 ['Saturn', 9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448,
            -0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794],
 ['Uranus', 19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503,
            -0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589],
 ['Neptune',30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574,
            0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664],
 /* PLUTO IS A DWARF PLANET and the page says so wherever it appears. It is here
    because it is the one body whose orbit makes two things visible that nothing
    else on this page can: a 17-degree inclination, against the 0.8-to-7 of
    everything else, and an eccentricity that carries it inside Neptune's orbit
    for twenty years of every 248. Same JPL approximate-elements table and the
    same rates as the eight above, so check-planets proves it the same way. */
 ['Pluto',  39.48211675,0.24882730,17.14001206,238.92903833,224.06891629,110.30393684,
            -0.00031596,0.00005170,0.00004818,145.20780515,-0.04062942,-0.01183482]
];
/* mean diameters in km, for the size disclaimer and the to-scale rungs */
var PL_DIA={ Sun:1391400, Mercury:4879, Venus:12104, Earth:12742, Mars:6779,
             Jupiter:139820, Saturn:116460, Uranus:50724, Neptune:49244, Pluto:2377, Moon:3474 };
var PL_AU=149597870;

function plCent(ms){ return (ms/PL_DAY - 0.5 + PL_J1970 - PL_J2000)/36525; }
function plWrap(d){ return ((d%360)+360)%360; }

/* Kepler's equation, Newton–Raphson. The eccentricities here top out at Mercury's
   0.206, where six iterations are already past double precision. */
function plKepler(M,e){
  var E=M+e*Math.sin(M), i, dE;
  for(i=0;i<8;i++){
    dE=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
    E-=dE; if(Math.abs(dE)<1e-12) break;
  }
  return E;
}

/* Heliocentric ecliptic position of one planet, in AU: {x,y,z,lon,lat,r}.
   x points at the March equinox, z at the north ecliptic pole. */
function plPos(idx,ms){
  var p=PL_EL[idx], T=plCent(ms);
  var a=p[1]+p[7]*T, e=p[2]+p[8]*T, I=(p[3]+p[9]*T)*PL_RAD;
  var L=p[4]+p[10]*T, w=p[5]+p[11]*T, O=(p[6]+p[12]*T)*PL_RAD;
  var argPeri=(w-p[6]-p[12]*T)*PL_RAD;               /* omega = long.peri - node */
  var M=plWrap(L-w); if(M>180) M-=360; M*=PL_RAD;
  var E=plKepler(M,e);
  /* position in the orbital plane, perifocal coordinates */
  var xo=a*(Math.cos(E)-e), yo=a*Math.sqrt(1-e*e)*Math.sin(E);
  var cw=Math.cos(argPeri), sw=Math.sin(argPeri), cO=Math.cos(O), sO=Math.sin(O),
      cI=Math.cos(I), sI=Math.sin(I);
  var x=(cw*cO-sw*sO*cI)*xo+(-sw*cO-cw*sO*cI)*yo;
  var y=(cw*sO+sw*cO*cI)*xo+(-sw*sO+cw*cO*cI)*yo;
  var z=(sw*sI)*xo+(cw*sI)*yo;
  var r=Math.sqrt(x*x+y*y+z*z);
  return { x:x, y:y, z:z, r:r, a:a, e:e,
           lon:plWrap(Math.atan2(y,x)/PL_RAD), lat:Math.asin(z/r)/PL_RAD };
}
function plName(idx){ return PL_EL[idx][0]; }
/* Kepler's third law: the period falls out of the axis, so the "how far does it
   get in a decade" copy cannot disagree with the drawing. */
function plPeriodDays(idx){ var a=PL_EL[idx][1]; return 365.256898*Math.pow(a,1.5); }


var SOL_RUNGS=[["moon","Earth & the Moon",0,0,"em",2],["inner","The inner planets",1.62,4,"sys",-1],["mars","Out to Mars",1.72,4,"sys",-1],["belt","Out to the asteroid belt",3.75,4,"sys",-1],["jupiter","Out to Jupiter",5.75,5,"sys",-1],["saturn","Out to Saturn",10.3,6,"sys",-1],["neptune","Out to Neptune",31.5,8,"sys",-1],["pluto","Out to Pluto (a dwarf planet)",50,9,"sys",-1],["mars-moons","Mars: Phobos & Deimos",0,0,"moons",3],["jupiter-moons","Jupiter: the Galilean moons",0,0,"moons",4],["saturn-moons","Saturn: the rings & Titan",0,0,"moons",5],["uranus-moons","Uranus: Titania & Miranda",0,0,"moons",6],["neptune-moons","Neptune: Triton",0,0,"moons",7],["pluto-moons","Pluto: Charon & the small four",0,0,"moons",8]];
var SOL_SPANS=[['month','Month',30],['year','Year',365.25],['decade','Decade',3652.5],['century','Century',36525]];
/* drawn radius per body, in px. Nothing here is to scale with anything else on
   the planetary rungs — Jupiter is a fraction of a pixel across at Saturn's
   zoom — so these are legibility sizes, and the page says so. */
var SOL_R={Sun:15,Mercury:3.5,Venus:5,Earth:5,Mars:4,Jupiter:10,Saturn:9,Uranus:7,Neptune:7,Pluto:3};
var SOL_COL={Sun:'#fcd34d',Mercury:'#b8b3ab',Venus:'#e6c98a',Earth:'#4a90c8',Mars:'#c86a4a',
             Jupiter:'#d9a878',Saturn:'#e3cd9a',Uranus:'#8fd0da',Neptune:'#6b8fd8',Pluto:'#c9b7a8',Moon:'#d8dee9'};
/* where a click on this planet's dot or orbit ring goes, and whether the
   tooltip should say "and its moons" — SOL_HASMOON is exactly the set of
   planets with a moons rung in SOL_RUNGS (mars/jupiter/saturn/uranus/
   neptune/pluto); Earth's own moon lives on the "moon" rung instead, which
   is why Earth is not in this table. */
var SOL_SLUG={Mercury:'mercury',Venus:'venus',Earth:'earth',Mars:'mars',Jupiter:'jupiter',
              Saturn:'saturn',Uranus:'uranus',Neptune:'neptune',Pluto:'pluto'};
var SOL_HASMOON={Mars:1,Jupiter:1,Saturn:1,Uranus:1,Neptune:1,Pluto:1};
var SOL_ZINC=12;      /* degrees: how tilted a small orbit is drawn once lifted */
var SOL_W=900, SOL_H=900, SOL_CX=450, SOL_CY=450, SOL_PAD=26;
/* THE CAPTIONS SIT AT THE TOP OF THESE TWO FRAMES, not the foot, because Now /
   Full screen / Play now ride on the bottom-right of the picture. Reserving a
   band at the bottom cannot work: the overlay is sized in CSS pixels and the
   drawing is scaled, so on a 390px phone those buttons cover 129 SVG units and
   on a desktop 41 — no fixed offset clears both. The top of both views is empty
   sky at every size, and nothing is ever drawn over it. */

function solF(n){ return Math.round(n*10)/10; }
function solEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function solRung(id){ for(var i=0;i<SOL_RUNGS.length;i++) if(SOL_RUNGS[i][0]===id) return SOL_RUNGS[i]; return SOL_RUNGS[1]; }
/* lighten (pct>0) or darken (pct<0) a hex colour, so a flat dot can carry a
   highlight and a rim shadow instead of reading as a punched-out circle —
   the cheapest way to say "sphere" without a real light model. */
function solShade(hex,pct){
  var n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  var t=pct<0?0:255, p=Math.abs(pct);
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+('000000'+(((r<<16)|(g<<8)|b)>>>0).toString(16)).slice(-6);
}

/* one planet's orbit as a path, sampled from the same solver that places it, so
   the ring and the dot can never disagree */
/* THE PROJECTION, and the only place the view tilt is applied.
   tl=0 is straight down on the plane — every orbit a true circle-ish ellipse,
   every drawn angle equal to the longitude in the read-out. Tilting rotates the
   scene about the screen's horizontal axis: what was depth (z, the height above
   Earth's orbital plane) turns into screen height, which is the ONLY way an
   inclination can be seen at all. The third value returned is depth away from
   the eye, larger = further, and it is what lets the far half of an orbit be
   drawn dimmer than the near half. */
function solPrj(x,y,z,k,ct,st){
  return [ SOL_CX+k*x, SOL_CY-k*(y*ct+z*st), y*st-z*ct ];
}
/* THE EXAGGERATION HAS A CEILING, per orbit rather than one factor for all.
   Multiplying every inclination by the same number was fine while they ran 0.8
   to 7 degrees; Pluto's is 17, and x8 of that is a wheel standing on its edge.
   Each orbit is instead lifted only as far as a common visible tilt, so the
   small ones become legible and the ones that are already legible are drawn
   true. Pluto is therefore the one orbit on the picture that is never
   exaggerated at all, which is worth knowing about it. */
function solZCap(idx,zk){
  var inc=Math.abs(PL_EL[idx][3]);
  if(inc<0.01) return 1;
  return Math.max(1,Math.min(zk,SOL_ZINC/inc));
}
function solOrbitZ(idx,ms,k,ct,st,zk){
  zk=solZCap(idx,zk||1);
  var p=PL_EL[idx], T=plCent(ms), pts=[], i;
  var a=p[1]+p[7]*T, e=p[2]+p[8]*T, I=(p[3]+p[9]*T)*PL_RAD;
  var w=p[5]+p[11]*T, O=(p[6]+p[12]*T)*PL_RAD, argPeri=(w-p[6]-p[12]*T)*PL_RAD;
  var cw=Math.cos(argPeri), sw=Math.sin(argPeri), cO=Math.cos(O), sO=Math.sin(O),
      cI=Math.cos(I), sI=Math.sin(I);
  for(i=0;i<=120;i++){
    var E=i/120*2*Math.PI;
    var xo=a*(Math.cos(E)-e), yo=a*Math.sqrt(1-e*e)*Math.sin(E);
    var x=(cw*cO-sw*sO*cI)*xo+(-sw*cO-cw*sO*cI)*yo;
    var y=(cw*sO+sw*cO*cI)*xo+(-sw*sO+cw*cO*cI)*yo;
    /* z was computed and thrown away here for as long as this function has
       existed; it is the whole of the inclination and it costs one line */
    var z=(sw*sI)*xo+(cw*sI)*yo;
    pts.push(solPrj(x,y,z*zk,k,ct,st));
  }
  return pts;
}
/* An orbit as one polyline, faded from far to near rather than switched.
   THE FADE IS A GRADIENT, NOT TWO OPACITIES. Splitting each orbit into a bright
   near half and a dim far half put a visible seam at the two points where the
   ring crosses the horizon, and made a smooth ellipse look like two arcs of
   different colours. A vertical gradient does the same job continuously, and it
   is not an approximation: for anything lying IN the plane, depth works out as
   y.sin(tilt) while screen height works out as -y.cos(tilt), so depth is exactly
   proportional to how far up the frame a point sits. One gradient per colour,
   spanning the frame, therefore encodes depth correctly for every orbit at once
   — and shallower for the inner ones, which is also right, because they have
   less depth to span. */
function solOrbitSvg(pts,col,tilted,gid,nm){
  var i, run=[];
  for(i=0;i<pts.length;i++) run.push(solF(pts[i][0])+','+solF(pts[i][1]));
  /* clickable/hoverable only when drawn for a real planet (nm set) — the
     ring and its own dot share data-sol-planet so hovering either one can
     light up both, and the click target for both is the same planet page */
  var attrs=nm?' class="sol-oring" data-sol-planet="'+nm+'"':'';
  if(!tilted) return '<polyline points="'+run.join(' ')+'" fill="none" stroke="'+col+'" stroke-opacity=".38" stroke-width="1"'+attrs+'/>';
  return '<polyline points="'+run.join(' ')+'" fill="none" stroke="url(#'+gid+')" stroke-width="1.15"'+attrs+'/>';
}

/* THE EARTH-AND-MOON RUNG. The only view on the site that is to scale in both
   size and distance at once: the moon sits 30 Earth-diameters away, which fits
   a frame this wide with room to spare. Everything else has to cheat, and the
   contrast is the point. */
function solMoonView(ms,tl){
  var d=mnDays(ms), m=mnMoonPos(d), sp=mnSunPos(d);
  function eclLon(ra,dec){ return Math.atan2(Math.sin(ra)*Math.cos(MN_OBL)+Math.tan(dec)*Math.sin(MN_OBL),Math.cos(ra)); }
  var mlon=eclLon(m.ra,m.dec), slon=eclLon(sp.ra,sp.dec);
  var rho=3*Math.PI/4-slon;                    /* sun pinned up-left, as elsewhere */
  var ORR_SUNA=3*Math.PI/4;                    /* ...so up-left is where the light is */
  /* THE SCALE IS FIXED BY THE MEAN ORBIT, NOT BY WHAT LOOKS GOOD. Put the moon's
     average distance at the frame's usable radius and everything else follows:
     the Earth comes out about 14 units across and the
     moon under 4. That is not
     a drawing choice — it is what 30 Earth-diameters of empty space does to a
     picture, and it is the reason this rung exists. The locator rings are the
     concession: without them the moon is genuinely hard to find, which is
     itself the point. */
  var perDia=13.524287200832466;                     /* see EM_EARTH_PX above */
  var R=perDia/2, mr=perDia*3474/12742/2;
  var dist=m.dist/12742*perDia;                /* the REAL distance right now    */
  /* the moon's orbit, seen at the page's own view tilt: the circle becomes an
     ellipse and the moon rides it, so at full tilt you are looking along the
     plane the two of them share rather than straight down onto it */
  var vct=Math.cos(tl||0);
  var mang=mlon+rho;
  var mx=SOL_CX+dist*Math.cos(mang), my=SOL_CY-dist*Math.sin(mang)*vct;
  var K=Math.SQRT1_2, out='';
  out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(dist)+'" ry="'+solF(dist*vct)+'" fill="none" stroke="#94a3b8" stroke-opacity=".3" stroke-width="1" stroke-dasharray="3 5"/>';
  /* NO LOCATOR RING ON THE EARTH. It used to have one at r=20 against the moon's
     at r=14, and those two rings — not the discs inside them — were what the eye
     compared, which made the moon look very nearly Earth-sized on a picture
     whose entire claim is that it is to scale. The discs are exact (13.5 units
     against 3.7, a ratio of 0.2726 against the real 0.2726); the rings were
     lying about them. The Earth needs no locating anyway: it is in the middle,
     it is labelled, and it is the biggest thing here. */
  /* THE EARTH IS THE GLOBE, not a flat blue disc with a bite out of it. Same
     drawing the planet pages use — real rotation rate, real 23.44-degree tilt,
     schematic continents — so at this zoom you can watch it turn underneath the
     moon going round, which is the one relationship this view exists for. */
  out+=(typeof glSvg==='function'
    ? glSvg('Earth',ms,SOL_CX,SOL_CY,R,23.9345,ORR_SUNA)
    : '<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF(R)+'" fill="#2f74ad"/>'
      + '<path d="M'+solF(SOL_CX+R*K)+' '+solF(SOL_CY-R*K)+'A'+solF(R)+' '+solF(R)+' 0 0 1 '+solF(SOL_CX-R*K)+' '+solF(SOL_CY+R*K)+'Z" fill="#050a16" fill-opacity=".84"/>');
  /* the moon keeps one, because at 3.7 units across it is genuinely hard to
     find — but dashed and tight, so it reads as a pointer rather than as a body */
  out+='<circle cx="'+solF(mx)+'" cy="'+solF(my)+'" r="9" fill="none" stroke="#cbd5e1" stroke-opacity=".38" stroke-dasharray="2 3"/>'
     + '<circle cx="'+solF(mx)+'" cy="'+solF(my)+'" r="'+solF(mr)+'" fill="#4b5563"/>'
     + '<path d="M'+solF(mx+mr*K)+' '+solF(my-mr*K)+'A'+solF(mr)+' '+solF(mr)+' 0 0 0 '+solF(mx-mr*K)+' '+solF(my+mr*K)+'Z" fill="#e8eef7"/>';
  out+='<text x="'+SOL_CX+'" y="'+(SOL_CY+38)+'" text-anchor="middle" font-size="13" fill="#e2e8f0">Earth</text>';
  out+='<text x="'+solF(mx)+'" y="'+solF(my-22)+'" text-anchor="middle" font-size="13" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">Moon</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+4)+'" font-size="13" fill="#fcd34d">Sunlight arrives from here</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+24)+'" font-size="12" fill="#94a3b8">Both bodies AND the gap between them are to scale here \u2014 the only view on this page that is.</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+40)+'" font-size="12" fill="#94a3b8">That is why they are so small: the moon sits about 30 Earth-diameters away. The dashed ring is only a pointer to the moon, not its size.</text>';
  return out;
}

/* THE PLANETARY RUNGS. Orbits to scale, bodies not. opt turns the extra layers
   on: the belt, the comets, and a flight path to one of the planets. */
function solSystemView(ms,rung,opt){
  opt=opt||{};
  var outer=rung[2], n=rung[3], k=(SOL_W/2-SOL_PAD)/outer, i, out='';
  /* THE VIEW TILT. 0 = straight down on the plane, which is the default and the
     only angle at which a drawn angle equals the longitude printed beside it.
     Every other value trades that for the one thing the flat view can never
     show: that the orbits do not all lie in the same plane. */
  var tl=(+opt.tilt||0)*PL_RAD, ct=Math.cos(tl), st=Math.sin(tl), tilted=tl>0.01;
  /* the exaggeration, when asked for. Real inclinations are 0.8-7 degrees, so
     at any tilt gentle enough to keep the picture readable they are a couple of
     pixels; this multiplies the HEIGHT off the plane and nothing else, and the
     page says so in words next to the control. */
  var zk=+opt.tiltExag||1;
  /* The belt, the comets and the flight path are all drawn IN the plane, so one
     vertical squash about the centre tilts them exactly — no per-layer maths,
     and they cannot fall out of step with the orbits. */
  var flat0='<g transform="translate(0 '+solF(SOL_CY*(1-ct))+') scale(1 '+solF(ct)+')">', flat1='</g>';
  if(opt.belt) out+=(tilted?flat0:'')+smBeltLayer(ms,outer,k)+(tilted?flat1:'');
  /* the plane itself, faintly: a set of tilted rings needs something to be
     tilted AGAINST or it reads as a pile of ellipses */
  if(tilted) for(i=1;i<=4;i++)
    out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(k*outer*i/4)+'" ry="'+solF(k*outer*i/4*ct)+'" fill="none" stroke="#e2e8f0" stroke-opacity=".07"/>';
  out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+(SOL_R.Sun+11)+'" fill="#fcd34d" fill-opacity=".18"/>';
  out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+SOL_R.Sun+'" fill="'+SOL_COL.Sun+'"/>';
  out+='<text x="'+SOL_CX+'" y="'+(SOL_CY+SOL_R.Sun+18)+'" text-anchor="middle" font-size="12" fill="#fcd34d">Sun</text>';
  var marks=[];
  /* one radial gradient per planet, always — a highlight near the upper-left
     and a darker rim, so the body reads as a lit sphere instead of a flat
     punched-out dot. objectBoundingBox keys it to each circle's own box, so
     the same three stops work whatever the drawn radius. Tilted rungs ALSO
     get the far-to-near linear fade on the ORBIT (unchanged); the two are
     independent and both live in one <defs> block. */
  out+='<defs>';
  for(i=0;i<n;i++){
    var gn=plName(i);
    out+='<radialGradient id="pg'+i+'" gradientUnits="objectBoundingBox" cx=".35" cy=".32" r=".75">'
      +'<stop offset="0" stop-color="'+solShade(SOL_COL[gn],.55)+'"/>'
      +'<stop offset=".55" stop-color="'+SOL_COL[gn]+'"/>'
      +'<stop offset="1" stop-color="'+solShade(SOL_COL[gn],-.35)+'"/></radialGradient>';
    if(tilted)
      out+='<linearGradient id="og'+i+'" gradientUnits="userSpaceOnUse" x1="0" y1="'+SOL_PAD+'" x2="0" y2="'+(SOL_H-SOL_PAD)+'">'
        +'<stop offset="0" stop-color="'+SOL_COL[gn]+'" stop-opacity=".13"/>'
        +'<stop offset="1" stop-color="'+SOL_COL[gn]+'" stop-opacity=".62"/></linearGradient>';
  }
  out+='</defs>';
  for(i=0;i<n;i++){
    var nm=plName(i), pp=plPos(i,ms);
    var pr=solPrj(pp.x,pp.y,pp.z*solZCap(i,zk),k,ct,st);
    out+=solOrbitSvg(solOrbitZ(i,ms,k,ct,st,zk),SOL_COL[nm],tilted,'og'+i,nm);
    marks.push([pr[2],pr[0],pr[1],nm,i]);
  }
  /* far planets first, so a near one passing in front actually looks like it */
  marks.sort(function(a,b){ return b[0]-a[0]; });
  for(i=0;i<marks.length;i++){
    var m=marks[i], px=m[1], py=m[2], nm2=m[3];
    var slug2=SOL_SLUG[nm2]||'', moons2=SOL_HASMOON[nm2]?'1':'0';
    out+='<circle cx="'+solF(px)+'" cy="'+solF(py)+'" r="'+SOL_R[nm2]+'" fill="url(#pg'+m[4]+')" class="sol-pdot" data-sol-planet="'+nm2+'" data-sol-slug="'+slug2+'" data-sol-moons="'+moons2+'"/>';
    /* labels only where they will not pile up: on the crowded rungs the inner
       four share one label rather than four overlapping ones */
    if(n<=5||m[4]>=4)
      out+='<text x="'+solF(px)+'" y="'+solF(py-SOL_R[nm2]-8)+'" text-anchor="middle" font-size="12" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+nm2+'</text>';
  }
  if(n>5){
    var inr=k*1.55;
    out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(inr)+'" ry="'+solF(inr*ct)+'" fill="none" stroke="#e2e8f0" stroke-opacity=".25" stroke-dasharray="2 3"/>';
    /* clear of the sun even when the ring is squashed almost flat: at a steep
       view inr*ct goes to nearly nothing and this line landed on the planets */
    out+='<text x="'+SOL_CX+'" y="'+solF(SOL_CY+Math.max(inr*ct,44)+14)+'" text-anchor="middle" font-size="11" fill="#94a3b8" paint-order="stroke" stroke="#080d1a" stroke-width="3">Mercury, Venus, Earth and Mars are all inside this ring</text>';
  }
  if(opt.comets) out+=(tilted?flat0:'')+smCometLayer(ms,outer,k)+(tilted?flat1:'');
  if(opt.transfer) out+=(tilted?flat0:'')+trLayer(ms,opt.transfer,outer,k,opt.transferSolution)+(tilted?flat1:'');
  return out;
}

function solSvg(ms,rungId,opt){
  var rung=solRung(rungId), body='';
  if(rung[4]==='em') body=solMoonView(ms,(+opt.tilt||0)*PL_RAD);
  else if(rung[4]==='moons') body=satView(ms,rung[5],opt);
  else body=solSystemView(ms,rung,opt);
  return '<svg viewBox="0 0 '+SOL_W+' '+SOL_H+'" width="100%" aria-hidden="true">'
    + '<rect width="'+SOL_W+'" height="'+SOL_H+'" rx="16" fill="#080d1a"/>'
    + body + '</svg>';
}

(function(){
  var orr=document.getElementById('home-orr'), sol=document.getElementById('home-sol');
  if(!orr&&!sol) return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduce) return;
  /* one real synodic month across the orrery every 24 seconds; one real year
     around the inner planets every 24 seconds — Mercury laps in about six */
  var MOON_SPEED=106310;
  var YEAR_SPEED=1314900;
  var t0=Date.now(), iv=0;
  /* when a location has been shared (hero button, or the day/night map page),
     the orrery marks THAT spot riding the turning Earth */
  var LOC=null;
  try{ LOC=JSON.parse(localStorage.getItem('dn_home')||'null'); }catch(e){}
  document.addEventListener('home:loc',function(e){ LOC=e.detail||LOC; });
  function frame(){
    var dt=Date.now()-t0;
    if(orr) orr.innerHTML=orrSvg(t0+dt*MOON_SPEED,LOC?LOC.lat:20,LOC?LOC.lon:0,LOC?'You':'',480).replace(/width="\d+" height="\d+"/,'width="100%"');
    if(sol) sol.innerHTML=solSvg(t0+dt*YEAR_SPEED,'inner',{});
  }
  function run(on){ if(iv){ clearInterval(iv); iv=0; } if(on) iv=setInterval(frame,90); }
  document.addEventListener('visibilitychange',function(){ run(!document.hidden); });
  run(!document.hidden);
})();
