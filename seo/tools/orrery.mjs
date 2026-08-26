/* orrery.mjs — the Sun–Earth–Moon view that sits in "Where the sun is right
 * now" on every /sun/ place page.
 *
 * WHAT IT IS FOR. The card already answers "how high is the sun and which way
 * do I look" — a horizon plot and two numbers. What it could not say is WHY:
 * why the sun is 12° up rather than 60°, why the moon is a gibbous rather than
 * a crescent, why a place can be in daylight at midnight. All three are one
 * picture: where you are standing on a turning Earth relative to the half of it
 * the sun is lighting, and where the moon is around you.
 *
 * WHAT IT DRAWS, AND WHAT EACH PART IS ALLOWED TO CLAIM.
 *   - The viewpoint is far above the Earth's ORBIT (the ecliptic pole), looking
 *     down from the viewer's own hemisphere. That is the one vantage from which
 *     the sun, the day/night line and the moon's position around the Earth are
 *     all true at once, with no foreshortening of the angle that matters most:
 *     the moon's separation from the sun, which IS the phase.
 *   - The sun is pinned to the top-left corner, so the picture reads the same
 *     way on every page and at every hour: light always arrives from up-left,
 *     the lit half always faces up-left. Everything that moves — the Earth's
 *     axis, the marker for the reader's city, the moon — moves against that
 *     fixed frame, which is what makes a change visible at all.
 *   - The two lines from the sun's edges land exactly on the ends of the
 *     day/night line, because that is where sunlight actually stops. Nothing is
 *     drawn behind the Earth: the real umbra reaches well past the moon's orbit
 *     and drawing it would put the moon in Earth's shadow every full moon,
 *     implying a monthly lunar eclipse. Whether an eclipse happens depends on
 *     the moon's distance from the ecliptic — the one thing this projection
 *     flattens away — so the picture must not appear to answer it. /moon/
 *     eclipses/ answers it properly.
 *   - The dotted ring the moon sits on is a schematic orbit at a fixed radius.
 *     The moon's DIRECTION is real; its distance is not, and the caption says
 *     so rather than letting a reader measure a picture that cannot be measured.
 *   - The faint ellipse inside the globe is the reader's own daily circle — the
 *     path their spot rides as the Earth turns. How much of it lies on the lit
 *     side is the day length the rest of the page prints, which is why Nome in
 *     June shows a circle that never leaves the daylight.
 *
 * ONE SOURCE, TWO RUNTIMES — the moon.mjs pattern. The drawing is written once
 * as an ES5 source string: the browser gets it inlined (so the picture is live
 * and repaints with the rest of the read-out), and Node instantiates the same
 * string through `new Function` below so the build can server-render it into
 * the HTML. There is no hand-maintained Node twin to drift.
 *
 * It depends on MOON_CORE being in scope (mnDays / mnSunPos / mnMoonPos /
 * mnSidereal / mnIllum), which is already inlined on every page that renders
 * this card — the same arrangement ARC_JS has with SUN_JS. That is deliberate:
 * the sun and moon positions in the picture are the same series the numbers
 * beside it come from, so the two cannot disagree.
 */
import { MOON_CORE } from "./moon.mjs";

export const ORRERY_JS = `
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
  return '<b>'+place+'</b> is the marker on the globe \\u2014 on the '+(lit?'daylit':'night')+' half '+when+edge
   + ', riding the dotted circle its spot traces as the Earth turns. '
   + 'The moon is <b>'+Math.round(g.elong)+'\\u00b0</b> from the sun in the sky '+(live===false?'then':'now')+', and that angle is the phase: '
   + nm.charAt(0).toLowerCase()+nm.slice(1)+'. '
   + 'You are looking down on the Earth from far above its orbit, from the '+(lat<0?'south':'north')+' \\u2014 the side you are on \\u2014 '
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
  var m=/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/.exec(v||''); if(!m) return null;
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
  return orrPlaying() ? 'Playing \u2014 a day every 1.4 seconds, and the whole bar is one lap of the moon'
    : 'Press Play, or drag: end to end is one full turn of the moon round the Earth \u2014 29 days and 13 hours';
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
`;

/* ---------------------------------------------------------------------------
 * The Node side. Same source string, instantiated once — NOT a reimplementation.
 * ------------------------------------------------------------------------- */
const O = new Function(`${MOON_CORE}
${ORRERY_JS}
return { orrSvg: orrSvg, orrNote: orrNote, orrLocalValue: orrLocalValue, orrMinOf: orrMinOf, orrCalc: orrCalc,
         spanMin: ORR_SPAN_MIN };`)();
/* the slider's length in minutes — one synodic month — read from the client
   source rather than restated here, so the baked control and the script that
   drives it cannot disagree about how long the bar is */
const ORR_SPAN_MIN = O.spanMin;
/* the same length as days — the synodic month the slider is built from,
   exported so /questions/ can quote the moon's cycle without a second copy */
export const orrSpanDays = ORR_SPAN_MIN / 1440;

export const orrerySvg = (ms, lat, lon, name, w) => O.orrSvg(+ms, lat, lon, name || "", w || 0);
/* `live` is forwarded, not dropped. It used to be hardcoded true, so the fifth
   argument build-simulator passes (false — its caption is baked for the build
   minute, not for the reader's) went nowhere: 1,103 pages captioned a frozen
   instant "right now" and then silently reworded themselves on the client's
   first repaint. */
export const orreryNote = (ms, lat, lon, name, live = true) => O.orrNote(+ms, lat, lon, name || "", live);
/* the sun/moon geometry for one instant — the same call the browser makes, so
   a figure baked into a page and the one the client recomputes are the same
   number. Exists because sim-elong was the one read-out shipping as "—" while
   the value sat right here at build time. */
export const orreryCalc = (ms, lat, lon) => O.orrCalc(+ms, lat, lon);
export const orreryLocalValue = (ms, tz) => O.orrLocalValue(+ms, tz || null);
export const orreryMinuteOf = (ms, tz) => O.orrMinOf(+ms, tz || null);

/* The figure as it appears on a page, markup and all — emitted identically by
 * /sun/ and /moon/ so one stylesheet section and one painter serve both.
 * `ms` null is the any-location tools, which have no coordinates until the
 * visitor gives them: the shell ships empty and orrPaint fills it.
 * `tide` is the sentence from crosslinks.tideNote() — passed in rather than
 * looked up here, because this module draws and does not know about places. */
export function orreryFigure({ ms = null, lat = 0, lon = 0, place = "", tz = null } = {}) {
  return `    <figure class="orr" aria-describedby="orr-note">
      <div class="orr-fig" id="orr-fig">${ms == null ? "" : orrerySvg(ms, lat, lon, place)}</div>
      ${/* WHICH INSTANT the picture is of — and the controls that change it.
           One line: the native date+time picker holding the place's own clock
           reading, then the two buttons that move it — Play, which runs the
           clock forward fast enough to see the moon go round, and Now, which
           hands the picture back to the live clock.
           NO "Drawn for" label (owner's call): a date field reads as a date
           field on sight, the sentence under the bar says what the card is
           doing, and the label was taking the width the buttons needed.
           The baked value is the build minute, the same promise the rest of the
           card makes to a crawler or a no-JS visitor; the browser replaces it
           with the real instant on load and on every repaint. All three ship
           inert — the input disabled, the buttons hidden — because none of them
           can do anything without JS, and a control that silently does nothing
           is worse than no control. */""
      }<p class="orr-stamp">
        <input type="datetime-local" class="orr-at" id="orr-at" step="60" min="1900-01-01T00:00" max="2099-12-31T23:59"${ms == null ? "" : ` value="${orreryLocalValue(ms, tz)}"`} disabled aria-label="Date and time to draw the sun and moon for">
        <button type="button" class="chip orr-now orr-play" id="orr-play" hidden aria-pressed="false">Play</button>
        <button type="button" class="chip orr-now" id="orr-now" hidden>Now</button>
      </p>
      ${/* ONE LAP OF THE MOON, end to end. The baked value is the build
           minute's offset from that day's midnight, which is exactly where the
           span starts — so the thumb ships in the right place without the
           script, and lands there again on the first repaint. */""
      }<p class="orr-scrub">
        <input type="range" class="orr-slider" id="orr-slider" min="0" max="${ORR_SPAN_MIN}" step="5"${ms == null ? "" : ` value="${orreryMinuteOf(ms, tz)}"`} disabled aria-label="Move through one full cycle of the moon">
        <span class="orr-scrub-lab" id="orr-scrub-lab">Press Play, or drag: end to end is one full turn of the moon round the Earth — 29 days and 13 hours</span>
      </p>
    </figure>
`;
}

/* The prose that goes with it, SEPARATE from the figure because the two do not
 * always sit together: the sun card puts its live stat rows between them (the
 * picture answers "where", the numbers answer "how high", and the explanation
 * belongs after both), while the moon card runs figure straight into caption.
 * `aria-describedby` on the figure keeps them associated either way, which
 * matters because the SVG itself is aria-hidden. */
export function orreryCaption({ ms = null, lat = 0, lon = 0, place = "", live = true } = {}) {
  return `    <p class="hint orr-note" id="orr-note">${ms == null ? "" : orreryNote(ms, lat, lon, place, live)}</p>
`;
}

/* The drawing's own dimensions, so anything that DESCRIBES the picture — above
 * all the scale disclaimer on /sun-moon-earth-movement-simulator/, which prints
 * exactly how far out the sizes and distances are — is computed from the same
 * numbers the picture is drawn with, and cannot go stale when they change. */
export const ORR_GEOM = (() => {
  const g = {};
  for (const k of ["W", "H", "RIGHT", "CY", "R", "RM", "MR", "SX", "SY", "RS"]) {
    const m = new RegExp(`ORR_${k}=(-?[\\d.]+)`).exec(ORRERY_JS);
    g[k] = m ? +m[1] : null;
  }
  g.CX = g.W - g.RIGHT;      /* the default frame's Earth; a wider one moves it */
  /* how far the sun's centre is drawn from the Earth's, in the same units.
     THE DEFAULT FRAME'S figure — which is the one the scale card describes,
     because that is the picture its reader is looking at. A wider frame (full
     screen) only ever puts the sun FURTHER away, so the card's claim is the
     conservative one and stays true. */
  g.SUN_DIST = Math.hypot(g.CX - g.SX, g.CY - g.SY);
  return g;
})();
