/**
 * Earth–Sun–Moon orbit figure. Shared by /earth-sun-moon-orbit-simulator/
 * and /concepts/why-do-we-have-seasons/. Side-effect free so both builders
 * can import it; build-simulator.mjs already imports hubQuestionsCard from
 * concepts.mjs, so the figure cannot live there.
 *
 * ONE THING SURVIVES THE COMPRESSION ON PURPOSE: the RATIO of the two
 * periods. The Moon's animation runs SIDEREAL/365.25 of the Earth's own
 * duration, so watching it lap the Earth about thirteen times per Earth
 * orbit is a real fact about the solar system — only the SIZE of the two
 * circles is a drawing choice.
 */
export const SIDEREAL = "27.3";
export const ORBIT_TILT = "5.1";

export const SYS_W = 640, SYS_H = 448, SYS_CX = 320, SYS_CY = 210;
export const SYS_RS = 26;      /* the sun's drawn radius                            */
export const SYS_REO = 160;    /* Earth's orbit radius around the sun, in px        */
export const SYS_RE = 10;      /* Earth's drawn radius                              */
export const SYS_RMO = 26;     /* the Moon's orbit radius around the Earth, in px   */
export const SYS_RM = 3.5;     /* the Moon's drawn radius                           */
export const SYS_EARTH_S = 40; /* seconds per drawn Earth orbit                     */
/* the Moon's animation is that same SIDEREAL/365.25 fraction of the Earth's
   own duration — the one number on this page derived from the real sky
   rather than picked for legibility */
export const SYS_MOON_S = +(SYS_EARTH_S * (+SIDEREAL) / 365.25).toFixed(2);
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
export const SYS_EX = SYS_CX + SYS_REO, SYS_MX = SYS_EX + SYS_RMO;
export const SYS_TILT = Math.PI * 23.4 / 180, SYS_AXL = SYS_RE + 7;
export const sysFigure = `<svg viewBox="0 0 ${SYS_W} ${SYS_H}" role="img" aria-label="Earth going round the sun with its axis leaning one fixed way, while the moon goes round the Earth keeping one face toward it; every lit side faces the sun. A view slider tips the whole scene from overhead to a side view, where the moon's tilted orbit visibly misses the sun-Earth line." class="sys-fig">
  <rect width="${SYS_W}" height="${SYS_H}" rx="16" fill="#0a1020"/>
  <text x="12" y="${SYS_CY - 8}" font-size="11" fill="#94a3b8">June - North</text>
  <text x="12" y="${SYS_CY + 8}" font-size="10" fill="#64748b">leans sunward</text>
  <text x="${SYS_W - 12}" y="${SYS_CY - 8}" text-anchor="end" font-size="11" fill="#94a3b8">December - North</text>
  <text x="${SYS_W - 12}" y="${SYS_CY + 8}" text-anchor="end" font-size="10" fill="#64748b">leans away</text>
  <text x="${SYS_CX}" y="16" text-anchor="middle" font-size="11" fill="#94a3b8">Sun is above the equator</text>
  <text x="${SYS_CX}" y="${SYS_H - 12}" text-anchor="middle" font-size="11" fill="#94a3b8">Sun is above the equator</text>
  ${/* everything that MOVES lives inside #sys-scene. Without JS it is exactly
       the old flat CSS-animated drawing; the view-tilt script clears this group
       and re-renders the same three bodies with a real projection instead —
       the frame, the June/December/equinox anchors and the card around it never change. */""
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

export const SYS_INC_DRAWN = 18;   /* drawn inclination of the moon's orbit, degrees */
/* THE PAGE OPENS ALREADY TIPPED, at 60° — per the owner. The flat textbook
 * view hides everything this page exists to show (the axis lean, the moon
 * riding off the plane, Earth's phases as it passes in front of and behind
 * the sun); 60° shows all of it while keeping the ellipse clearly open, so
 * the picture still reads as an orbit rather than a bare line. The slider
 * still runs 0–90, so the flat diagram is one drag away, not gone. Set by
 * the script, not baked into the markup: without JS the slider is dead and
 * the static figure is the old flat drawing, so a baked value would
 * mislabel it. */
export const SYS_VIEW_START = 60;
export const SYS_VIEW_UI = `    <div class="sys-tiltrow">
      <label for="sys-view">Tilt Earth&rsquo;s orbit</label>
      <input type="range" id="sys-view" min="0" max="90" step="1" value="0" disabled aria-describedby="sys-view-note">
      <output id="sys-view-v" for="sys-view">flat on</output>
      <button type="button" class="chip" id="sys-view-side" hidden>Edge on</button>
    </div>
    <p class="hint sys-tiltnote" id="sys-view-note">Drag to tip the whole orbit away from you. It flattens as it goes — wider and shorter — until you are looking along its edge, where the Earth loops in front of the sun and then behind it, and the moon&rsquo;s tilted orbit visibly misses the sun&ndash;Earth line.</p>`;
export const SYS_VIEW_JS = `<script>(function(){
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

/** Figure + tilt slider + the projection script. One copy, both pages. */
export function sysOrbitWidget() {
  return `<div class="sys-figwrap">${sysFigure}</div>
${SYS_VIEW_UI}
${SYS_VIEW_JS}`;
}
