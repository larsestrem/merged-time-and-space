/**
 * One Moon learning engine, ten named states.
 *
 * A state is a stable string such as ?state=tidal-locking. The string chooses
 * the initial model, control, task and observation; numeric slider positions
 * remain disposable exploration inside that task. Concept pages embed the
 * same engine with data-state, while /moon-simulator/ reads the state from the
 * URL. The first frame is rendered here at build time and the same functions
 * are shipped to the browser, so the no-JS picture and interactive model
 * cannot disagree.
 */
import { esc } from "./lib.mjs";
import { SIDEREAL, ORBIT_TILT } from "./system-orbit.mjs";
import { orrSpanDays } from "./orrery.mjs";
import { moonDistance } from "./moon.mjs";

export const MOON_LAB_PATH = "/moon-simulator/";
const SID = +SIDEREAL;
const SYN = +orrSpanDays.toFixed(4);
const TILT = +ORBIT_TILT;

/* Stable, solver-derived bounds rather than a second typed perigee/apogee
 * table. Sample one complete reference year plus a lunar month at six-hour
 * intervals; the explanatory model needs the range, not today's osculating
 * elements. A fixed reference interval keeps the shared asset cacheable. */
const distanceRange = (() => {
  const from = Date.UTC(2026, 0, 1);
  let near = Infinity, far = -Infinity;
  for (let t = from; t <= from + 400 * 86400000; t += 6 * 3600000) {
    const d = moonDistance(t);
    if (d < near) near = d;
    if (d > far) far = d;
  }
  return { near: Math.round(near / 100) * 100, far: Math.round(far / 100) * 100 };
})();

export const MOON_LAB_STATES = Object.freeze({
  phases: {
    question: "Why does the Moon change shape?",
    task: "Move the Moon around Earth. Watch the Moon itself stay half lit while the phase seen from Earth changes.",
    observe: "The dark part is lunar night, not Earth’s shadow.",
    control: "Moon’s angle from the Sun",
    min: 0, max: 360, step: 1, value: 90,
    presets: [["New", 0], ["First quarter", 90], ["Full", 180], ["Last quarter", 270]],
  },
  "phase-names": {
    question: "What are the Moon phases called?",
    task: "Move in eighths of an orbit and use the position, not just the shape, to learn each phase name.",
    observe: "Quarter means a quarter of the orbit, even though the disc looks half lit.",
    control: "Position in the phase cycle",
    min: 0, max: 315, step: 45, value: 0,
    presets: [["New", 0], ["First quarter", 90], ["Full", 180], ["Last quarter", 270]],
  },
  "synodic-month": {
    question: "Why is the phase month longer than one orbit?",
    task: "Stop first at one star-relative orbit, then continue until the Moon catches the Sun’s shifted direction.",
    observe: "Back to the same stars is not yet back to the same phase.",
    control: "Days since new moon",
    min: 0, max: SYN, step: 0.1, value: SID,
    presets: [["Start", 0], ["One orbit", SID], ["Same phase", SYN]],
  },
  "tidal-locking": {
    question: "What does tidal locking actually mean?",
    task: "Move the Moon around Earth, then compare one spin per orbit with no spin. Follow the gold mark.",
    observe: "A Moon that did not spin would show Earth every side during one orbit.",
    control: "Position around Earth",
    min: 0, max: 360, step: 1, value: 120,
    presets: [["Start", 0], ["Quarter lap", 90], ["Half lap", 180], ["Full lap", 360]],
    optionLabel: "Moon’s spin",
    optionValue: "locked",
    options: [["locked", "One spin per orbit"], ["none", "No spin"], ["double", "Two spins per orbit"]],
  },
  libration: {
    question: "How can a locked Moon appear to wobble?",
    task: "Move through the slightly elliptical orbit. Compare the steady spin angle with the changing orbital speed.",
    observe: "Near perigee the Moon moves faster but its spin does not speed up to match.",
    control: "Position in the orbit",
    min: 0, max: 360, step: 1, value: 90,
    presets: [["Perigee", 0], ["Quarter", 90], ["Apogee", 180], ["Three quarters", 270]],
  },
  "moonrise-later": {
    question: "Why does moonrise get later each night?",
    task: "Advance one night at a time. Watch how much extra Earth must turn to face the Moon again.",
    observe: "The roughly 50-minute delay is the Moon’s daily orbital step converted into Earth-rotation time.",
    control: "Nights after the first observation",
    min: 0, max: 7, step: 1, value: 1,
    presets: [["First night", 0], ["Next night", 1], ["Three nights", 3], ["One week", 7]],
  },
  "eclipse-tilt": {
    question: "Why isn’t there an eclipse every month?",
    task: "Set the orbit to 0°, then restore its real tilt. Watch the Moon move off the exact Sun–Earth line.",
    observe: "Phase controls left–right alignment; orbital tilt controls the missing up–down dimension.",
    control: "Moon-orbit tilt",
    min: 0, max: TILT, step: 0.1, value: TILT,
    presets: [["Flat orbit", 0], ["Half tilt", +(TILT / 2).toFixed(1)], ["Real tilt", TILT]],
    optionLabel: "Alignment",
    optionValue: "full",
    options: [["full", "Full moon — Earth’s shadow"], ["new", "New moon — the Sun"]],
  },
  supermoon: {
    question: "How much difference does Moon distance make?",
    task: "Move from the closest to the farthest part of the orbit. Compare apparent width and brightness side by side.",
    observe: "The size change is subtle; the brightness change is easier to measure.",
    control: "Position from closest to farthest",
    min: 0, max: 100, step: 1, value: 0,
    presets: [["Closest", 0], ["Middle", 50], ["Farthest", 100]],
  },
  "blue-moon": {
    question: "When can one month contain two full moons?",
    task: "Move the first full moon through the month. Find the latest starting day that still leaves room for another.",
    observe: "The Moon does nothing unusual. A calendar box happens to be slightly longer than the phase cycle.",
    control: "Day of the first full moon",
    min: 1, max: 31, step: 1, value: 1,
    presets: [["Day 1", 1], ["Day 2", 2], ["Day 3", 3], ["Day 10", 10]],
    optionLabel: "Days in the month",
    optionValue: "31",
    options: [["28", "28 days"], ["29", "29 days"], ["30", "30 days"], ["31", "31 days"]],
  },
  "dark-side": {
    question: "Is the far side always dark?",
    task: "Move through the phase cycle. Compare the arrow toward Earth with the arrow toward the Sun.",
    observe: "Far side is a fixed hemisphere; dark side is whichever hemisphere faces away from sunlight now.",
    control: "Moon’s angle from the Sun",
    min: 0, max: 360, step: 1, value: 0,
    presets: [["New", 0], ["First quarter", 90], ["Full", 180], ["Last quarter", 270]],
  },
});

export const MOON_LAB_STATE_NAMES = Object.freeze(Object.keys(MOON_LAB_STATES));

const CLIENT_CONFIG = Object.fromEntries(Object.entries(MOON_LAB_STATES).map(([key, value]) => [key, value]));
CLIENT_CONFIG._constants = { sid: SID, syn: SYN, tilt: TILT, near: distanceRange.near, far: distanceRange.far };

/* ES5 source shared by the build and browser. Keep this DOM-free: the painter
 * returns a complete SVG, result sentence and formatted control value. */
export const MOON_LAB_CORE = `
var ML_C=${JSON.stringify(CLIENT_CONFIG)};
function mlClamp(v,a,b){return Math.max(a,Math.min(b,v));}
function mlRad(v){return v*Math.PI/180;}
function mlFix(v,n){return (+v).toFixed(n).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');}
function mlComma(v){return Math.round(v).toLocaleString('en-US');}
function mlEsc(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function mlNorm(v){v=(v+180)%360;if(v<0)v+=360;return v-180;}
function mlFrame(body,label){
  return '<svg class="ml-svg" viewBox="0 0 720 360" role="img" aria-label="'+mlEsc(label)+'">'
    +'<rect width="720" height="360" rx="18" fill="#080d1a"/>'
    +'<g font-family="system-ui,-apple-system,Segoe UI,sans-serif">'+body+'</g></svg>';
}
function mlText(x,y,s,size,fill,anchor,weight){
  return '<text x="'+x+'" y="'+y+'" font-size="'+(size||13)+'" fill="'+(fill||'#94a3b8')+'" text-anchor="'+(anchor||'middle')+'" font-weight="'+(weight||500)+'">'+s+'</text>';
}
function mlSun(x,y,r){
  var s='<g stroke="#fbbf24" stroke-width="2" opacity=".55">';
  for(var i=0;i<12;i++){var a=i*Math.PI/6;s+='<line x1="'+(x+Math.cos(a)*(r+7)).toFixed(1)+'" y1="'+(y+Math.sin(a)*(r+7)).toFixed(1)+'" x2="'+(x+Math.cos(a)*(r+18)).toFixed(1)+'" y2="'+(y+Math.sin(a)*(r+18)).toFixed(1)+'"/>';}
  return s+'</g><circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#fbbf24"/>';
}
function mlEarth(x,y,r){
  /* A recognizable classroom-globe shorthand, not a random green patch.
     The Americas sit on the left; Europe/Africa/Asia and Australia sit on the
     right. Normalized coordinates keep the same silhouette legible everywhere
     this engine draws Earth, from the 20px synodic-month globe to the 76px
     moonrise globe. */
  var k=r/50;
  return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#2563eb" stroke="#93c5fd" stroke-width="2"/>'
    +'<g transform="translate('+x+' '+y+') scale('+k.toFixed(3)+')" fill="#4ade80" stroke="#166534" stroke-width="1" stroke-linejoin="round" vector-effect="non-scaling-stroke">'
    +'<path d="M-39-22l9-10 13-5 12 5 4 9-7 7-8 2-2 8 6 8-3 8-7-1-5-8-10-5-5-9z"/>'
    +'<path d="M-17 8l8 4 4 9-5 18-7 8-5-16-7-12 5-10z"/>'
    +'<path d="M0-29l13-7 10 4 3 6 14 1 7 10-7 8-13-1-8 6-3 9-8 2-10-8-9-5 3-10 8-6z"/>'
    +'<path d="M5 4l13 2 8 9-6 19-10 12-8-8-5-17z"/>'
    +'<path d="M29 22l11 2 4 8-8 7-11-5z"/>'
    +'</g>';
}
function mlMoon(x,y,r){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#334155" stroke="#cbd5e1" stroke-width="2"/><path d="M '+x+' '+(y-r)+' A '+r+' '+r+' 0 0 0 '+x+' '+(y+r)+' A '+(r*.72)+' '+r+' 0 0 0 '+x+' '+(y-r)+'Z" fill="#e2e8f0"/>';}
function mlPhaseName(a){
  var names=['new moon','waxing crescent','first quarter','waxing gibbous','full moon','waning gibbous','last quarter','waning crescent'];
  return names[Math.round((((a%360)+360)%360)/45)%8];
}
function mlPhaseDisc(cx,cy,r,a){
  a=((a%360)+360)%360;var p=mlRad(a),c=Math.cos(p),rx=Math.max(.01,r*Math.abs(c)),wax=a<=180;
  var outer=wax?'A '+r+' '+r+' 0 0 1 '+cx+' '+(cy+r):'A '+r+' '+r+' 0 0 0 '+cx+' '+(cy+r);
  var sweep=wax?(c>=0?0:1):(c<0?0:1);
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#111827" stroke="#64748b" stroke-width="2"/>'
    +'<path d="M '+cx+' '+(cy-r)+' '+outer+' A '+rx+' '+r+' 0 0 '+sweep+' '+cx+' '+(cy-r)+'Z" fill="#f8fafc"/>';
}
function mlKepler(m,e){var E=m;for(var i=0;i<7;i++)E-=(E-e*Math.sin(E)-m)/(1-e*Math.cos(E));return E;}
function mlDraw(state,value,opt){
  var C=ML_C[state]||ML_C.phases,v=mlClamp(+value,C.min,C.max),o=opt||C.optionValue||'',b='',result='',label=C.question;
  var a,r,x,y,f,name,ang,extra,delay,near=ML_C._constants.near,far=ML_C._constants.far;
  if(state==='phases'||state==='phase-names'){
    a=v;ang=mlRad(180+a);x=350+125*Math.cos(ang);y=180+125*Math.sin(ang);
    b=mlSun(65,180,30)+'<line x1="105" y1="180" x2="190" y2="180" stroke="#fbbf24" stroke-width="3"/>'
      +'<ellipse cx="350" cy="180" rx="125" ry="125" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="5 7"/>'
      +mlEarth(350,180,34)+mlMoon(x.toFixed(1),y.toFixed(1),16)+mlPhaseDisc(585,176,54,a)
      +mlText(585,252,mlPhaseName(a),16,'#f8fafc','middle',750)+mlText(65,235,'Sun',13,'#fbbf24')+mlText(350,232,'Earth',13,'#93c5fd');
    if(state==='phase-names'){
      var labs=[[0,'new'],[45,'waxing crescent'],[90,'first quarter'],[135,'waxing gibbous'],[180,'full'],[225,'waning gibbous'],[270,'last quarter'],[315,'waning crescent']];
      for(var li=0;li<labs.length;li++){var la=mlRad(180+labs[li][0]),lx=350+158*Math.cos(la),ly=184+146*Math.sin(la);b+=mlText(lx.toFixed(1),ly.toFixed(1),labs[li][1],10,labs[li][0]===a?'#67e8f9':'#64748b');}
    }
    f=(1-Math.cos(mlRad(a)))/2;name=mlPhaseName(a);
    result=name.charAt(0).toUpperCase()+name.slice(1)+': '+Math.round(f*100)+'% of the Earth-facing disc is lit, although half of the Moon is still in sunlight.';
  }else if(state==='synodic-month'){
    var theta=mlRad(v/365.256*360),er=245,ex=100+er*Math.cos(theta),ey=180+er*Math.sin(theta)*.72;
    var ma=mlRad(180+v/ML_C._constants.sid*360),mx=ex+44*Math.cos(ma),my=ey+44*Math.sin(ma);
    b=mlSun(100,180,27)+'<ellipse cx="100" cy="180" rx="'+er+'" ry="'+(er*.72)+'" fill="none" stroke="#334155" stroke-width="2"/>'
      +'<line x1="70" y1="55" x2="650" y2="55" stroke="#64748b" stroke-dasharray="3 7"/>'
      +mlText(650,48,'same star direction',12,'#94a3b8','end')+mlEarth(ex.toFixed(1),ey.toFixed(1),20)
      +'<circle cx="'+ex.toFixed(1)+'" cy="'+ey.toFixed(1)+'" r="44" fill="none" stroke="#475569" stroke-dasharray="4 6"/>'
      +mlMoon(mx.toFixed(1),my.toFixed(1),9)+mlText(ex.toFixed(1),(ey+75).toFixed(1),'Earth has moved '+mlFix(v/365.256*360,1)+'° around the Sun',13,'#93c5fd');
    var starLaps=v/ML_C._constants.sid,phaseLaps=v/ML_C._constants.syn;
    result=mlFix(v,1)+' days: '+mlFix(starLaps,2)+' orbit'+(Math.abs(starLaps-1)<.005?' — back to the same stars':'')+', but '+mlFix(phaseLaps,2)+' phase cycle'+(Math.abs(phaseLaps-1)<.005?' — back to the same Sun angle':'')+'.';
  }else if(state==='tidal-locking'){
    a=v;ang=mlRad(a-90);x=330+126*Math.cos(ang);y=180+126*Math.sin(ang);
    var face=o==='none'?90:o==='double'?(2*a+90):(a+90),fr=mlRad(face);
    b='<circle cx="330" cy="180" r="126" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="5 7"/>'
      +mlEarth(330,180,42)+mlMoon(x.toFixed(1),y.toFixed(1),28)
      +'<line x1="'+x.toFixed(1)+'" y1="'+y.toFixed(1)+'" x2="'+(x+25*Math.cos(fr)).toFixed(1)+'" y2="'+(y+25*Math.sin(fr)).toFixed(1)+'" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>'
      +mlText(565,120,'Gold mark = one place',15,'#fbbf24')+mlText(565,146,'on the Moon',15,'#fbbf24')
      +mlText(330,340,'Move the orbit and follow the gold mark',13,'#94a3b8');
    var faceToEarth=mlNorm(face-(a+90));
    result=o==='locked'?'One spin per orbit: the gold mark stays aimed at Earth through the whole lap.':(o==='none'?'No spin: the mark is fixed in space, so Earth sees every lunar longitude during one lap.':'Two spins per orbit: the mark sweeps past Earth once during each orbit.');
  }else if(state==='libration'){
    var M=mlRad(v),e=.055,E=mlKepler(M,e),nu=2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2)),delta=mlNorm((nu-M)*180/Math.PI);
    x=245+145*(Math.cos(E)-e);y=180+105*Math.sin(E);
    b='<ellipse cx="237" cy="180" rx="145" ry="105" fill="none" stroke="#475569" stroke-width="2"/>'
      +mlEarth(237-145*.055,180,34)+mlMoon(x.toFixed(1),y.toFixed(1),18)
      +'<circle cx="555" cy="178" r="72" fill="#cbd5e1" stroke="#f8fafc" stroke-width="2"/>'
      +'<path d="M 555 106 Q '+(555+delta*4).toFixed(1)+' 178 555 250" fill="none" stroke="#334155" stroke-width="5"/>'
      +'<circle cx="'+(555+delta*5.5).toFixed(1)+'" cy="170" r="8" fill="#fbbf24"/>'
      +mlText(555,278,'Apparent face from Earth',13,'#94a3b8')+mlText(237,330,'Slightly elliptical orbit',13,'#94a3b8');
    result='The steady spin and changing orbital speed differ by '+mlFix(Math.abs(delta),1)+'°. We peek '+(delta>=0?'around the eastern':'around the western')+' limb.';
  }else if(state==='moonrise-later'){
    var advance=v*360/ML_C._constants.sid;extra=advance%360;delay=v*(360/ML_C._constants.sid)/15*60;
    ang=mlRad(-90+extra);x=315+145*Math.cos(ang);y=180+145*Math.sin(ang);
    b='<circle cx="315" cy="180" r="145" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="5 7"/>'
      +mlEarth(315,180,76)+mlMoon(315,35,17)+mlMoon(x.toFixed(1),y.toFixed(1),20)
      +'<path d="M 315 100 A 80 80 0 0 1 '+(315+80*Math.sin(mlRad(extra))).toFixed(1)+' '+(180-80*Math.cos(mlRad(extra))).toFixed(1)+'" fill="none" stroke="#67e8f9" stroke-width="5"/>'
      +mlText(570,145,'Moon moved east',15,'#cbd5e1')+mlText(570,174,mlFix(advance,1)+'°',28,'#67e8f9','middle',800)+mlText(570,203,'Earth must turn extra',13,'#94a3b8');
    result=v===0?'First observation: Earth is facing the Moon.':v+' night'+(v===1?'':'s')+' later, the average extra turn is '+mlFix(advance,1)+'°, equal to about '+Math.round(delay)+' minutes of clock time.';
  }else if(state==='eclipse-tilt'){
    var full=o!=='new',side=full?1:-1,moonX=360+side*220,off=v/ML_C._constants.tilt*72;
    b=mlSun(75,180,34)+mlEarth(360,180,38)
      +'<line x1="115" y1="180" x2="680" y2="180" stroke="#fbbf24" stroke-width="2" opacity=".45"/>'
      +(full?'<path d="M 398 160 L 690 120 L 690 240 L 398 200 Z" fill="#020617" stroke="#334155" stroke-width="2"/>':'')
      +'<line x1="'+(full?398:115)+'" y1="180" x2="'+moonX+'" y2="'+(180-off)+'" stroke="#67e8f9" stroke-width="2" stroke-dasharray="5 6"/>'
      +mlMoon(moonX,180-off,19)+mlText(moonX,105-off,(full?'full moon':'new moon'),13,'#cbd5e1')
      +mlText(500,318,'Vertical separation is exaggerated so '+mlFix(v,1)+'° can be seen',13,'#94a3b8');
    result=v<.05?'At 0° the centers line up: this model produces an eclipse every new and full moon.':'At '+mlFix(v,1)+'°, the Moon passes above or below the exact line. An eclipse happens only near an orbital crossing.';
  }else if(state==='supermoon'){
    var d=near+(far-near)*v/100,scale=far/d,bright=scale*scale,r0=58,r1=r0*scale;
    b='<circle cx="205" cy="175" r="'+r0+'" fill="#dbe4ee" stroke="#f8fafc" stroke-width="2"/>'
      +'<circle cx="500" cy="175" r="'+r1.toFixed(1)+'" fill="#f8fafc" stroke="#fbbf24" stroke-width="2"/>'
      +mlText(205,270,'Farthest comparison',14,'#94a3b8')+mlText(500,270,'Selected distance',14,'#fbbf24')
      +mlText(205,298,mlComma(far)+' km',13,'#cbd5e1')+mlText(500,298,mlComma(d)+' km',13,'#f8fafc');
    result='At '+mlComma(d)+' km, the full Moon appears '+mlFix((scale-1)*100,1)+'% wider and '+mlFix((bright-1)*100,1)+'% brighter than at the far end of this solver-derived range.';
  }else if(state==='blue-moon'){
    var days=+(o||31),second=v+ML_C._constants.syn,inside=second<days+1,cellW=82,cellH=48,startX=72,startY=82;
    b=mlText(360,42,days+'-day month',18,'#f8fafc','middle',750);
    for(var day=1;day<=days;day++){var col=(day-1)%7,row=Math.floor((day-1)/7),cx=startX+col*cellW,cy=startY+row*cellH;
      b+='<rect x="'+(cx-30)+'" y="'+(cy-25)+'" width="60" height="38" rx="7" fill="#111827" stroke="#334155"/>'
        +mlText(cx-21,cy-10,day,10,'#94a3b8','start');
      if(day===Math.round(v)||day===Math.floor(second)&&inside)b+='<circle cx="'+(cx+8)+'" cy="'+(cy-7)+'" r="11" fill="#f8fafc" stroke="'+(day===Math.floor(second)?'#67e8f9':'#fbbf24')+'" stroke-width="3"/>';
    }
    b+=mlText(360,335,inside?'Two full moons fit inside the same calendar box.':'The second full moon lands in the next month.',14,inside?'#67e8f9':'#fbbf24');
    result='First full moon on day '+v+'; the next is about day '+mlFix(second,1)+'. '+(inside?'That fits inside '+days+' days, so the second is a blue moon.':'That does not fit inside '+days+' days.');
  }else if(state==='dark-side'){
    a=v;ang=mlRad(180+a);x=315+130*Math.cos(ang);y=180+130*Math.sin(ang);var farLit=(1+Math.cos(mlRad(a)))/2;
    b=mlSun(65,180,30)+'<circle cx="315" cy="180" r="130" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="5 7"/>'
      +mlEarth(315,180,36)+mlMoon(x.toFixed(1),y.toFixed(1),25)
      +'<line x1="'+x.toFixed(1)+'" y1="'+y.toFixed(1)+'" x2="'+(x+(315-x)*.48).toFixed(1)+'" y2="'+(y+(180-y)*.48).toFixed(1)+'" stroke="#67e8f9" stroke-width="4"/>'
      +'<line x1="'+x.toFixed(1)+'" y1="'+y.toFixed(1)+'" x2="'+(x+(65-x)*.18).toFixed(1)+'" y2="'+(y+(180-y)*.18).toFixed(1)+'" stroke="#fbbf24" stroke-width="4"/>'
      +mlText(575,130,'Blue points toward Earth',14,'#67e8f9')+mlText(575,160,'Gold points toward the Sun',14,'#fbbf24')
      +mlText(575,205,'Far side in daylight',13,'#94a3b8')+mlText(575,240,Math.round(farLit*100)+'%',32,'#f8fafc','middle',800);
    result=mlPhaseName(a).replace(/^./,function(m){return m.toUpperCase();})+': the fixed far side is about '+Math.round(farLit*100)+'% sunlit. Far and dark are different directions.';
  }else{return mlDraw('phases',90,'');}
  return {svg:mlFrame(b,label),result:result,value:mlFormat(state,v)};
}
function mlFormat(state,v){
  if(state==='synodic-month')return mlFix(v,1)+' days';
  if(state==='moonrise-later')return Math.round(v)+' night'+(+v===1?'':'s');
  if(state==='eclipse-tilt')return mlFix(v,1)+'°';
  if(state==='supermoon')return Math.round(v)+'% toward farthest';
  if(state==='blue-moon')return 'day '+Math.round(v);
  return Math.round(v)+'°';
}
`;

const CORE = Function(`${MOON_LAB_CORE};return {draw:mlDraw,format:mlFormat};`)();

/** Build/test entry point. The browser receives this exact painter source in
 * MOON_LAB_JS; exporting the build-time call lets the gate exercise every
 * endpoint and option without maintaining a second implementation. */
export function moonLabFrame(state, value, option = "") {
  if (!MOON_LAB_STATES[state]) throw new Error(`Unknown Moon Lab state: ${state}`);
  return CORE.draw(state, value, option);
}

const optionsHtml = (c, selected) => (c.options || []).map(([value, label]) =>
  `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`).join("");
const presetsHtml = (c) => c.presets.map(([label, value]) =>
  `<button type="button" class="chip" data-ml-preset="${value}" disabled>${esc(label)}</button>`).join("");

export function moonLabHtml({ state, caption = "", alt = "", hub = false } = {}) {
  if (!MOON_LAB_STATES[state]) state = "phases";
  const c = MOON_LAB_STATES[state];
  const opt = c.optionValue || "";
  const first = moonLabFrame(state, c.value, opt);
  return `<figure class="graphic-block moon-lab" data-moon-lab data-state="${esc(state)}"${hub ? ' data-url-state="1"' : ""}>
  <div class="ml-intro">
    <p class="ml-kicker">Try the question</p>
    <p class="ml-question" data-ml-question>${esc(c.question)}</p>
    <p class="ml-task" data-ml-task>${esc(c.task)}</p>
  </div>
  <div class="ml-grid">
    <div class="ml-stage" data-ml-stage>${first.svg.replace('aria-label="' + esc(c.question) + '"', `aria-label="${esc(alt || c.question)}"`)}</div>
    <div class="ml-controls">
${hub ? `      <label class="ml-field"><span>Experiment</span><select data-ml-state disabled>${MOON_LAB_STATE_NAMES.map((key) => `<option value="${key}"${key === state ? " selected" : ""}>${esc(MOON_LAB_STATES[key].question)}</option>`).join("")}</select></label>` : ""}
      <label class="ml-field"><span data-ml-control>${esc(c.control)}</span>
        <input type="range" data-ml-range min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}" disabled>
        <output data-ml-value>${esc(first.value)}</output>
      </label>
      <label class="ml-field ml-option" data-ml-option-row${c.options ? "" : " hidden"}><span data-ml-option-label>${esc(c.optionLabel || "")}</span>
        <select data-ml-option disabled>${optionsHtml(c, opt)}</select>
      </label>
      <div class="ml-presets" data-ml-presets>${presetsHtml(c)}</div>
      <div class="ml-readout" aria-live="polite">
        <span>What changed</span>
        <strong data-ml-result>${esc(first.result)}</strong>
      </div>
      <p class="ml-observe"><strong>Watch for:</strong> <span data-ml-observe>${esc(c.observe)}</span></p>
      ${hub ? "" : `<p class="ml-open"><a href="${MOON_LAB_PATH}?state=${esc(state)}">Open this experiment in the full Moon lab</a></p>`}
    </div>
  </div>
  <figcaption${hub ? " data-ml-caption" : ""}>${esc(caption || c.observe)}</figcaption>
</figure>`;
}

export const MOON_LAB_JS = `${MOON_LAB_CORE}
(function(){
  var roots=document.querySelectorAll('[data-moon-lab]');
  function init(root){
    var state=root.getAttribute('data-state')||'phases',fromUrl=root.hasAttribute('data-url-state');
    if(fromUrl){try{var qs=new URLSearchParams(location.search),wanted=qs.get('state');if(ML_C[wanted])state=wanted;}catch(e){}}
    var range=root.querySelector('[data-ml-range]'),option=root.querySelector('[data-ml-option]'),optionRow=root.querySelector('[data-ml-option-row]');
    var stateSelect=root.querySelector('[data-ml-state]'),stage=root.querySelector('[data-ml-stage]'),result=root.querySelector('[data-ml-result]');
    var valueOut=root.querySelector('[data-ml-value]'),control=root.querySelector('[data-ml-control]'),question=root.querySelector('[data-ml-question]');
    var task=root.querySelector('[data-ml-task]'),observe=root.querySelector('[data-ml-observe]'),presets=root.querySelector('[data-ml-presets]');
    var caption=root.querySelector('[data-ml-caption]');
    var optionLabel=root.querySelector('[data-ml-option-label]');
    function optionMarkup(c){
      var s='';for(var i=0;i<(c.options||[]).length;i++)s+='<option value="'+c.options[i][0]+'">'+c.options[i][1]+'</option>';return s;
    }
    function presetMarkup(c){
      var s='';for(var i=0;i<c.presets.length;i++)s+='<button type="button" class="chip" data-ml-preset="'+c.presets[i][1]+'">'+c.presets[i][0]+'</button>';return s;
    }
    function paint(){
      var d=mlDraw(state,+range.value,option&&!optionRow.hidden?option.value:'');
      stage.innerHTML=d.svg;result.textContent=d.result;valueOut.textContent=d.value;
    }
    function setState(next,write){
      if(!ML_C[next]||next.charAt(0)==='_')next='phases';state=next;var c=ML_C[state];
      root.setAttribute('data-state',state);question.textContent=c.question;task.textContent=c.task;observe.textContent=c.observe;control.textContent=c.control;
      if(caption)caption.textContent=c.observe;
      range.min=c.min;range.max=c.max;range.step=c.step;range.value=c.value;range.disabled=false;
      presets.innerHTML=presetMarkup(c);
      if(c.options){optionRow.hidden=false;optionLabel.textContent=c.optionLabel;option.innerHTML=optionMarkup(c);option.value=c.optionValue;option.disabled=false;}
      else{optionRow.hidden=true;option.innerHTML='';option.disabled=true;}
      if(stateSelect){stateSelect.value=state;stateSelect.disabled=false;}
      if(write&&fromUrl){try{var u=new URL(location.href);u.searchParams.set('state',state);history.replaceState(null,'',u.pathname+'?'+u.searchParams.toString()+u.hash);}catch(e){}}
      paint();
    }
    range.addEventListener('input',paint);
    option.addEventListener('change',paint);
    presets.addEventListener('click',function(e){var b=e.target.closest('[data-ml-preset]');if(!b)return;range.value=b.getAttribute('data-ml-preset');paint();});
    if(stateSelect)stateSelect.addEventListener('change',function(){setState(this.value,true);});
    setState(state,false);
  }
  for(var i=0;i<roots.length;i++)init(roots[i]);
})();
`;
