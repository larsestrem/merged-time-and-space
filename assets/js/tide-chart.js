/* tide-chart.js — THE tide chart renderer. One implementation, three uses:
 *   1. the homepage "Tide charts" card       (build time)
 *   2. the chart baked into every tide page  (build time)
 *   3. the live chart on /tides/             (in the browser, this file)
 * Before this, 1 and 2 were an SVG in tide-curve.mjs and 3 was a canvas in
 * tides.js — two drawings of the same picture, which is why a tide page
 * visibly swapped one chart for another a moment after it loaded.
 *
 * Pure string in, string out: no DOM, no canvas, no Intl. The build evals this
 * very file (seo/tools/tide-chart.mjs) to server-render the SVG, and the
 * browser gets it inlined by build-inline. Anything locale- or timezone-shaped
 * — day labels, tide heights — is formatted by the caller and passed in.
 *
 * Coordinate space is fixed (700x300 viewBox, scaled by CSS) so the baked SVG
 * and the browser's redraw land on the same pixels; style.css bumps the label
 * sizes on narrow screens, as the sun arc does. */

/* o = {
 *   pts:    [[t,v], …]        the water curve, already sampled
 *   hilo:   [{t,v,hi,lbl}]    high/low markers ("lbl" = the height text)
 *   nights: [[t,t], …]        sunset→sunrise spans to shade
 *   days:   [[t,"Su 7/26"], …] day boundaries + their labels
 *   t0,t1:  window in ms      now: ms|null   selA,selB: ms|0 (dimmed outside)
 *   W,H:    viewBox size      marks: bool    (draw the ft readouts)
 *   fs:     label scale       (a card rendered small on the page bumps this so
 *                              its text stays readable once CSS shrinks the SVG)
 *   lines:  roughly how many height grid lines to aim for (a small card wants
 *           fewer); the step itself is chosen from a 0.5/1/2/5/10/20 ladder
 * } */
function tideChartSvg(o){
  var W=o.W||700, H=o.H||300, padL=46, padR=12, padT=30, padB=26;
  var iw=W-padL-padR, ih=H-padT-padB, t0=o.t0, t1=o.t1, i, fs=o.fs||1;
  var pts=o.pts||[], hilo=o.hilo||[];
  if(!pts.length||!(t1>t0)) return '';
  var vmin=1e9,vmax=-1e9;
  for(i=0;i<pts.length;i++){ if(pts[i][1]<vmin) vmin=pts[i][1]; if(pts[i][1]>vmax) vmax=pts[i][1]; }
  /* ~10% headroom of the real swing (min 0.25 ft) so the curve fills the panel
     even where the range is small, e.g. the Gulf */
  var vpad=Math.max(0.25,(vmax-vmin)*0.1); vmin-=vpad; vmax+=vpad;
  if(vmax-vmin<0.6){ var vc=(vmin+vmax)/2; vmin=vc-0.3; vmax=vc+0.3; }
  function X(t){ return padL+iw*(t-t0)/(t1-t0); }
  function Y(v){ return padT+ih*(1-(v-vmin)/(vmax-vmin)); }
  function n(x){ return (Math.round(x*10)/10); }
  var spanD=(t1-t0)/86400000;
  var out='<rect x="0.5" y="0.5" width="'+(W-1)+'" height="'+(H-1)+'" rx="12" fill="#141a27" stroke="rgba(255,255,255,.10)"/>';

  /* night shading first, so everything else sits on top of it */
  var nights=o.nights||[];
  for(i=0;i<nights.length;i++){
    var a=Math.max(nights[i][0],t0), b=Math.min(nights[i][1],t1);
    if(b>a) out+='<rect x="'+n(X(a))+'" y="'+padT+'" width="'+n(X(b)-X(a))+'" height="'+ih+'" fill="rgba(0,0,0,.32)"/>';
  }
  /* height grid + ft labels */
  /* Pick the height step from the RANGE, not a fixed 1 or 2 ft: Anchorage swings
     32 ft, and 2 ft lines there means sixteen of them mashed together, while a
     Gulf station swinging 2 ft needs half-foot lines to show anything. Aim for
     ~6 lines and snap to a step people read in (0.5, 1, 2, 5, 10, 20, 50). */
  var vstep=niceStep(vmax-vmin,o.lines||6);
  for(var v=Math.ceil(vmin/vstep)*vstep;v<=vmax;v+=vstep){ var gy=n(Y(v));
    out+='<line x1="'+padL+'" y1="'+gy+'" x2="'+(W-padR)+'" y2="'+gy+'" stroke="rgba(255,255,255,.12)" stroke-width="1"/>'
      /* the number alone, right-aligned in its own gutter — "30ft 20ft 10ft"
         repeated down the edge crowded the panel, so the unit is stated once
         at the top of the axis instead */
      +'<text class="tc-ax" x="'+(padL-9)+'" y="'+n(Y(v)+3.5*fs)+'" text-anchor="end" font-size="'+(11*fs)+'" fill="rgba(255,255,255,.62)">'+(Math.round(v*10)/10)+'</text>';
  }
  out+='<text class="tc-ax" x="'+(padL-9)+'" y="'+(padT-9)+'" text-anchor="end" font-size="'+(10*fs)+'" fill="rgba(255,255,255,.45)">ft</text>';
  /* day boundaries + their labels */
  var days=o.days||[];
  for(i=0;i<days.length;i++){ var dx=X(days[i][0]); if(dx<padL||dx>W-padR) continue;
    out+='<line x1="'+n(dx)+'" y1="'+padT+'" x2="'+n(dx)+'" y2="'+(H-padB)+'" stroke="rgba(255,255,255,.12)" stroke-width="1"/>';
    if(days[i][1]) out+='<text class="tc-ax" x="'+n(dx+4)+'" y="'+(H-9)+'" font-size="'+(11*fs)+'" fill="rgba(255,255,255,.62)">'+days[i][1]+'</text>';
  }
  /* the water curve, and the same path filled underneath */
  var d='';
  for(i=0;i<pts.length;i++) d+=(i?'L':'M')+n(X(pts[i][0]))+' '+n(Y(pts[i][1]));
  out+='<path d="'+d+'L'+n(X(pts[pts.length-1][0]))+' '+(padT+ih)+'L'+n(X(pts[0][0]))+' '+(padT+ih)+'Z" fill="rgba(95,184,208,.14)"/>'
    +'<path d="'+d+'" fill="none" stroke="#5fb8d0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  /* high/low dots, with their heights when the window is short enough to read */
  for(i=0;i<hilo.length;i++){ var p=hilo[i]; if(p.t<t0||p.t>t1) continue;
    var mx=n(X(p.t)), my=n(Y(p.v));
    out+='<circle cx="'+mx+'" cy="'+my+'" r="4" fill="'+(p.hi?'#fcd34d':'#94a3b8')+'"/>';
    /* keep the readout inside the panel — a marker right at the edge would
       otherwise hang its label over the ft axis or off the chart */
    var lx=Math.min(Math.max(mx,padL+20),W-padR-20);
    if(o.marks&&p.lbl) out+='<text class="tc-lb" x="'+n(lx)+'" y="'+n(my+(p.hi?-9:17))+'" text-anchor="middle" font-size="'+(11.5*fs)+'" font-weight="700" fill="#fff" paint-order="stroke" stroke="#141a27" stroke-width="3" stroke-linejoin="round">'+p.lbl+'</text>';
  }
  /* the window the visitor picked stays bright; context days either side dim */
  if(o.selA&&o.selB){
    if(o.selA>t0) out+='<rect x="'+padL+'" y="'+padT+'" width="'+n(Math.max(0,X(Math.min(o.selA,t1))-padL))+'" height="'+ih+'" fill="rgba(7,9,18,.45)"/>';
    if(o.selB<t1) out+='<rect x="'+n(X(Math.max(o.selB,t0)))+'" y="'+padT+'" width="'+n(Math.max(0,(W-padR)-X(Math.max(o.selB,t0))))+'" height="'+ih+'" fill="rgba(7,9,18,.45)"/>';
    var edges=[o.selA,o.selB];
    for(i=0;i<2;i++){ if(edges[i]>t0&&edges[i]<t1)
      out+='<line x1="'+n(X(edges[i]))+'" y1="'+padT+'" x2="'+n(X(edges[i]))+'" y2="'+(H-padB)+'" stroke="rgba(252,211,77,.55)" stroke-width="1" stroke-dasharray="3 3"/>'; }
  }
  /* now */
  if(o.now&&o.now>t0&&o.now<t1) out+='<line x1="'+n(X(o.now))+'" y1="'+padT+'" x2="'+n(X(o.now))+'" y2="'+(H-padB)+'" stroke="#fcd34d" stroke-width="1.5" stroke-dasharray="4 4"/>';
  return out;
}
/* A grid step people read in: the smallest ladder value that keeps the number
 * of lines at or under the target. */
function niceStep(range,target){
  var ladder=[0.5,1,2,5,10,20,50,100],i;
  for(i=0;i<ladder.length;i++) if(range/ladder[i]<=target) return ladder[i];
  return ladder[ladder.length-1];
}
/* Sample a smooth curve between NOAA's high/low extremes. The extremes
 * themselves are exact; between them the tide follows a half-cosine closely
 * enough to draw, which is what lets the build render the same curve the
 * browser draws without shipping an hourly series. ev = [{t,v}] sorted. */
function tideSeries(ev,t0,t1,stepMs){
  if(ev.length<2) return [];
  var out=[],step=stepMs||900000,i=0,t;
  for(t=t0;t<=t1;t+=step){
    while(i<ev.length-2&&ev[i+1].t<t) i++;
    var a=ev[i],b=ev[i+1];
    if(t<=a.t){ out.push([t,a.v]); continue; }
    if(t>=b.t){ out.push([t,b.v]); continue; }
    var f=(t-a.t)/(b.t-a.t);
    out.push([t,a.v+(b.v-a.v)*(1-Math.cos(Math.PI*f))/2]);
  }
  return out;
}
