/* satellites.mjs — the moons, for the per-planet rungs of /solar-system-simulator/.
 *
 * WHAT CHANGED, AND WHAT DID NOT. build-solar used to draw no moons at all, on
 * the grounds that at the zoom where Jupiter is visible its outermost Galilean
 * is under half a pixel away AND this repo does not solve for their positions.
 * The first half of that is answered by giving each planet its OWN rung, where
 * the frame is the moon system rather than the solar system. The second half is
 * still true and is stated on the page rather than papered over:
 *
 *   SIZES, ORBIT RADII, PERIODS, TILT AND DIRECTION ARE REAL AND CHECKED.
 *   WHERE A MOON SITS ON ITS ORBIT AT A GIVEN INSTANT IS NOT SOLVED HERE.
 *
 * So a moon rung answers "how big, how far out, how fast, which way round, and
 * how do they beat against each other" — every one of which is a real property
 * of the system — and never "point your telescope there tonight". The starting
 * angles are spread by index so the moons do not launch from a line, and the
 * drawing says so in its own caption, the way the Earth-and-Moon rung already
 * says what IS to scale on it.
 *
 * WHY THE TABLE CAN BE TRUSTED. Same reason as planets.mjs: it is checked, not
 * believed. Every row carries a semi-major axis AND a period, and those two are
 * not independent — Kepler's third law ties them to the planet's mass. So all
 * nine of Saturn's moons here must agree, to a fraction of a percent, on one
 * value of GM, and that value must be Saturn's. A transposed digit in either
 * column breaks the agreement immediately; check-solar-data.mjs is where that
 * is asserted, together with the resonances (Io:Europa:Ganymede 1:2:4,
 * Mimas:Tethys 2:1, Enceladus:Dione 2:1, Titan:Hyperion 4:3) that a table of
 * plausible-looking numbers would not reproduce by accident.
 *
 * ONE SOURCE, TWO RUNTIMES — the moon.mjs pattern, as everywhere else here.
 */

/* ---------------------------------------------------------------------------
 * SAT_JS — the shared ES5 source. Prefixed `sat` so it can sit in one script
 * with MOON_CORE, PLANETS_JS, SMALL_JS and SOLAR_JS.
 * ------------------------------------------------------------------------- */
export const SAT_JS = `
/* Per planet, keyed by the planets.mjs index:
     gm    planet GM in km^3/s^2 (what the moons must agree on)
     req   equatorial radius in km — the disc every orbit is measured against
     rot   rotation period in hours, negative = retrograde
     frame the moon whose orbit sets the edge of the view. It is named rather
           than derived because no rule gets it right: Jupiter's outermost
           large moon is Callisto and Himalia is six times further out again,
           while Saturn's Iapetus is so far out that framing on it shrinks the
           rings to a smudge. Anything beyond the frame moon is not dropped —
           the picture says how many times further out it is.
     ring  [inner, outer] ring-system radius in km, or null
     moons [name, a in km, period in days (negative = retrograde), diameter in
            km, note, DETAIL LEVEL (optional, default 1)]
     frames level -> the moon that sets the edge of the frame at that level
            (see DETAIL LEVELS below); the plain 'frame' key is level 1

   DETAIL LEVELS. Level 1 is what the picture has always shown and is still the
   default: the moons big enough that a reader has heard of them. Levels 2 and 3
   add the rest of what can be drawn honestly, because "how many moons does
   Jupiter have" is a question the old picture answered with nine.

   The levels are not arbitrary — they are the populations themselves, and
   climbing them is the lesson:
     1  the moons that matter to look at
     2  the REGULAR system — close in, near-circular, in the planet's own
        equatorial plane, formed where they are. For Saturn that is the
        shepherds inside the rings; for Jupiter, whose regulars are all already
        at level 1, it is the prograde Himalia group instead.
     3  the CAPTURED irregulars — far out, steeply inclined, mostly retrograde,
        and almost certainly caught rather than formed. At this level the frame
        blows out by an order of magnitude and the whole regular system
        collapses to a dot in the middle, which IS the point: these two
        populations are not the same kind of object and the usual "moons of
        Jupiter" diagram hides it.

   WHAT IS NOT HERE, and why. Every row must satisfy Kepler's third law against
   its planet's GM to within the tolerance check-solar-data.mjs enforces, and
   that is not a formality: a and the period are used for two different things
   (where the ring is drawn, and how fast the moon runs along it), so a pair
   that disagrees draws a moon sliding off its own orbit. Published elements for
   the distant irregulars come from different fits at different epochs and the
   Sun perturbs them appreciably, so several widely-quoted a/period pairs do NOT
   agree with each other. Setebos, Psamathe and Neso are left out for exactly
   that reason — not because they are unimportant, but because no pair could be
   found that draws correctly. The counts below still report them.

   Mercury and Venus are in here with EMPTY moon lists. They have no satellites
   to measure, but the two numbers above them are what every "how heavy, how
   strong is gravity there" figure on the pages is computed from — mass is
   GM/G and surface gravity is GM/r^2, so neither is ever typed in beside a
   planet where it could drift from the orbits drawn next to it. An empty list
   is also the honest shape of "why does Mercury have no moons", which is one
   of the open questions the pages put to the reader.

   The moon lists are the ones big enough to be worth drawing, not the full
   counts — Jupiter has 97 and Saturn 274, almost all of them a few km of
   captured rubble on distant, tilted, retrograde orbits. The full count is on
   the page as a number; drawing 274 dots would say something false about what
   a moon system looks like. */
var SAT_SYS={
 0:{gm:22031.87,req:2439.7,rot:1407.6,frame:null,ring:null,moons:[]},
 1:{gm:324858.59,req:6051.8,rot:-5832.5,frame:null,ring:null,moons:[]},
 3:{gm:42828.37,req:3396,rot:24.6229,frame:'Deimos',ring:null,moons:[
   ['Phobos',9376,0.318910,22.4,'Closer to its planet than any other moon in the solar system, and falling'],
   ['Deimos',23463,1.262441,12.4,'So small and so far out that from Mars it is barely more than a bright star']]},
 4:{gm:126686534,req:71492,rot:9.9250,frame:'Callisto',frames:{2:'Elara',3:'Sinope'},ring:[122000,129000],moons:[
   ['Metis',127690,0.294780,43,'Inside the main ring, and feeding it'],
   ['Adrastea',128690,0.298260,16.4,'The dust knocked off these two IS the main ring'],
   ['Amalthea',181366,0.498179,167,'Red, potato-shaped, and radiating more heat than it receives'],
   ['Thebe',221900,0.674500,98.6,'Its dust makes the outer gossamer ring'],
   ['Io',421700,1.769138,3643.2,'The most volcanically active body known — squeezed by Jupiter and by Europa'],
   ['Europa',671034,3.551181,3121.6,'A saltwater ocean under an ice shell, and more liquid water than Earth has'],
   ['Ganymede',1070412,7.154553,5268.2,'The largest moon in the solar system — bigger than Mercury — and the only one with its own magnetic field'],
   ['Callisto',1882709,16.689018,4820.6,'The most cratered surface known: nothing has resurfaced it in four billion years'],
   ['Himalia',11451000,250.560000,139.6,'A captured asteroid, 27 times further out than Io'],
   /* LEVEL 2 - the prograde irregulars. Jupiter's regular moons are all at
      level 1 already, so its second population is this one: the Himalia group,
      four bodies on near-identical orbits that are almost certainly one
      captured asteroid that came apart. */
   ['Themisto',7393216,129.870000,9,'Alone between the Galileans and the Himalia group - lost for 25 years after its discovery',2],
   ['Leda',11187781,241.750000,21.5,'The smallest of the Himalia group',2],
   ['Lysithea',11700800,259.200000,42,'Himalia group: same orbit, same colour, same parent body',2],
   ['Elara',11712320,259.640000,79.9,'Second largest of the group - Lysithea and Elara sit barely 12,000 km apart in orbital radius',2],
   /* LEVEL 3 - the retrograde captures. Twice as far out again and going the
      wrong way round, which is the giveaway: nothing that formed alongside
      Jupiter could be doing this. */
   ['Ananke',21454952,-641.900000,29.1,'Leader of a retrograde group of about two dozen fragments',3],
   ['Carme',23404000,-734.170000,46.7,'Another shattered capture - the Carme group are all the same dark red',3],
   ['Pasiphae',23624000,-743.630000,57.8,'The largest retrograde moon Jupiter has',3],
   ['Sinope',23939000,-758.900000,35,'Nearly 57 times further from Jupiter than Io, and running backwards',3]]},
 5:{gm:37931207,req:60268,rot:10.5610,frame:'Hyperion',frames:{2:'Hyperion',3:'Ymir'},ring:[74500,140220],moons:[
   ['Mimas',185539,0.942422,396.4,'One crater a third of its own width'],
   ['Enceladus',237948,1.370218,504.2,'Venting ocean water into space through cracks at its south pole'],
   ['Tethys',294619,1.887802,1062,'Almost pure water ice, and lighter than water'],
   ['Dione',377396,2.736915,1122.8,'Wispy cliffs of fresh ice, hundreds of metres high'],
   ['Rhea',527108,4.518212,1527.6,'Saturn\\u2019s second largest, and still only two fifths the width of our moon'],
   ['Titan',1221870,15.945000,5149.5,'Thick nitrogen air, rain, rivers and seas — of methane'],
   ['Hyperion',1481009,21.276000,270,'Tumbles chaotically: it has no settled day length at all'],
   ['Iapetus',3560820,79.330000,1468.6,'One hemisphere as dark as coal, the other as bright as snow'],
   ['Phoebe',12947780,-550.310000,213,'Goes round backwards — captured, probably from the Kuiper belt'],
   /* LEVEL 2 - the regular system, which at Saturn means the ring shepherds and
      the co-orbitals. This is the level that changes what the picture is ABOUT:
      the rings stop being scenery and become a structure with moons embedded in
      it, clearing the gaps and holding the edges. */
   ['Pan',133584,0.575050,28.2,'Orbits inside the Encke gap, and is what keeps it open',2],
   ['Daphnis',136505,0.594080,7.6,'Raises vertical waves in the edges of the Keeler gap',2],
   ['Atlas',137670,0.601790,30.2,'Flying-saucer shaped, with a ridge of ring material round its equator',2],
   ['Prometheus',139380,0.612986,86.2,'Steals material from the F ring every time it swings close',2],
   ['Pandora',141720,0.628504,81.4,'Works the other side of the F ring from Prometheus',2],
   ['Epimetheus',151410,0.694333,116.2,'Swaps orbits with Janus every four years - they never collide',2],
   ['Janus',151460,0.694660,179,'Fifty km from Epimetheus, and the pair trade places rather than crash',2],
   ['Aegaeon',167500,0.808100,0.66,'Two thirds of a kilometre across, inside its own faint ring arc',2],
   ['Methone',194440,1.009570,2.9,'Egg-smooth: no crater has ever been seen on it',2],
   ['Anthe',197700,1.036500,1.8,'Sits in a ring arc made of its own dust',2],
   ['Pallene',212280,1.153750,4.4,'Another dust-arc moonlet, between Mimas and Enceladus',2],
   ['Telesto',294619,1.887802,24.8,'Rides 60 degrees ahead of Tethys, at a Lagrange point',2],
   ['Calypso',294619,1.887802,21.4,'Rides 60 degrees behind Tethys - same orbit, same period',2],
   ['Helene',377396,2.736915,35.2,'Sits at the leading Lagrange point of Dione',2],
   ['Polydeuces',377396,2.736915,2.6,'Trails Dione, wandering tens of degrees either side of the point',2],
   /* LEVEL 3 - the Inuit, Gallic and Norse groups, out where Saturn barely
      holds on. Three separate captures, and they sort by colour. */
   ['Kiviuq',11294800,448.160000,17,'Inuit group: prograde, steeply tilted, reddish',3],
   ['Ijiraq',11355316,451.770000,13,'Almost the same orbit as Kiviuq - fragments of one body',3],
   ['Paaliaq',15103400,692.980000,25,'Inuit group, found in the 2000 survey that tripled the count',3],
   ['Siarnaq',17776600,884.880000,40,'The largest of the Inuit group',3],
   ['Tarvos',18562800,944.230000,15,'Gallic group - a separate family again',3],
   ['Ymir',23130680,-1315.140000,18,'Norse group: retrograde, and the furthest out drawn here',3]]},
 6:{gm:5793939,req:25559,rot:-17.2478,frame:'Oberon',frames:{2:'Oberon',3:'Prospero'},ring:[41837,51149],moons:[
   ['Puck',86004,0.761833,162,'Dark, and probably rubble from a shattered earlier moon'],
   ['Miranda',129900,1.413479,471.6,'A cliff 20 km high — the tallest known anywhere'],
   ['Ariel',191020,2.520379,1157.8,'The brightest and youngest-looking surface of the five'],
   ['Umbriel',266000,4.144177,1169.4,'The darkest, with one unexplained bright ring near its equator'],
   ['Titania',435910,8.705872,1576.8,'The largest, with canyons 1,600 km long'],
   ['Oberon',583520,13.463239,1522.8,'Craters floored with something dark that nobody has identified'],
   /* LEVEL 2 - the inner regulars, a crowd of small dark moons packed inside
      Miranda and tangled up with the rings. Thirteen bodies inside the orbit of
      the innermost moon anyone has heard of. */
   ['Cordelia',49770,0.335034,40.2,'Inner shepherd of the Epsilon ring',2],
   ['Ophelia',53790,0.376400,42.8,'Outer shepherd of the Epsilon ring - the pair hold its edges',2],
   ['Bianca',59170,0.434579,51.4,'One of ten found by Voyager 2 in a single pass',2],
   ['Cressida',61780,0.463570,79.6,'On a collision course with Desdemona within a few million years',2],
   ['Desdemona',62680,0.473650,64,'Between Cressida and Juliet, and crowded by both',2],
   ['Juliet',64350,0.493065,93.6,'Part of the most tightly packed set of moons known',2],
   ['Portia',66090,0.513196,135.2,'The largest of the inner crowd',2],
   ['Rosalind',69940,0.558460,72,'Dark as charcoal, like all of these',2],
   ['Cupid',74800,0.618000,18,'Eighteen km across, and not found until 2003',2],
   ['Belinda',75260,0.623527,90.4,'Elongated, and probably not round at all',2],
   ['Perdita',76400,0.638000,30,'Photographed by Voyager in 1986, then lost, then found again in 1999',2],
   ['Mab',97700,0.923000,25,'Feeds the outer Mu ring with dust knocked off its surface',2],
   /* LEVEL 3 - the captures, all retrograde, all a long way out */
   ['Caliban',7169000,-579.730000,72,'Retrograde and 12 times further out than Oberon',3],
   ['Stephano',7942000,-677.370000,32,'Same group as Caliban - a shared parent body',3],
   ['Trinculo',8505200,-749.240000,18,'Eighteen km of captured rock',3],
   ['Sycorax',12179400,-1288.300000,150,'The largest irregular Uranus has, and distinctly red',3],
   ['Prospero',16276800,-1978.290000,50,'Takes five and a half years to go round once',3]]},
 7:{gm:6835100,req:24764,rot:16.1100,frame:'Triton',frames:{2:'Triton',3:'Laomedeia'},ring:[41900,62933],moons:[
   ['Larissa',73548,0.554654,194,'Battered and irregular, inside the ring system'],
   ['Proteus',117647,1.122315,420,'About as large as a body can get and stay this lumpy'],
   ['Triton',354759,-5.876854,2706.8,'Orbits backwards, so it was captured — and is spiralling in'],
   ['Nereid',5513818,360.130000,340,'The most eccentric orbit of any large moon: 1.4 to 9.6 million km'],
   /* LEVEL 2 - the inner regulars. All of them orbit INSIDE Triton, and all of
      them are probably second-generation: rubble re-accreted after Triton's
      capture wrecked whatever system Neptune had before. */
   ['Naiad',48227,0.294396,66,'Closest in, and tilted 5 degrees to the rest - still settling after Triton arrived',2],
   ['Thalassa',50075,0.311485,82,'Dances an avoidance pattern with Naiad every time they pass',2],
   ['Despina',52526,0.334655,150,'Shepherds the inner edge of the Le Verrier ring',2],
   ['Galatea',61953,0.428745,176,'Holds the Adams ring arcs together - the ring is clumpy, and this is why',2],
   ['Hippocamp',105283,0.950300,34.8,'Found in 2013 in old Hubble frames: chipped off Proteus by a comet strike',2],
   /* LEVEL 3 - the captures. Neptune has five; two are left out because no
      published semi-major axis and period could be found that agree well
      enough to draw (see the note at the top of this file). */
   ['Halimede',16611000,-1879.710000,62,'Probably a chip off Nereid - same colour, crossing orbits',3],
   ['Sao',22228000,2914.070000,44,'Prograde, unlike most captures, and takes eight years to go round',3],
   ['Laomedeia',23567000,3167.850000,42,'Found in 2002, and named after a Nereid of Greek myth like the rest',3]]},
 2:{gm:398600.44,req:6378,rot:23.9345,frame:'Moon',ring:null,moons:[
   ['Moon',384400,27.321661,3474.8,'A quarter of Earth\\u2019s width, and drifting away 3.8 cm a year']]},
 /* PLUTO. gm is PLUTO'S OWN, not the pair's — mass and surface gravity are
    derived from it and would both be 12% too big with the system value. Charon
    is a big enough fraction of Pluto that the two orbit a point in empty space
    between them, so the constant Kepler's third law wants HERE is the sum; the
    check adds Charon's 105.9 the same way it adds the Moon's for Earth.
    The four small moons are listed at their real axes and periods; they are the
    ones that tumble rather than keeping a face to Pluto, because the gravity
    they sit in is not a point but a rotating pair. */
 8:{gm:869.6,req:1188.3,rot:-153.2928,frame:'Hydra',ring:null,moons:[
   ['Charon',19591,6.387230,1212,'Half Pluto across and an eighth its mass — the two are locked face to face and orbit a point outside them both'],
   ['Styx',42656,20.16155,16,'Tumbling, not locked: the gravity here is a moving pair, not a point'],
   ['Nix',48694,24.85463,50,'Its spin is chaotic — its day length changes unpredictably'],
   ['Kerberos',57783,32.16756,19,'Darker than the others, and found by Hubble in 2011'],
   ['Hydra',64738,38.20177,65,'The outermost, and the far edge of this view']]}
};
/* the confirmed counts are a different number from the drawn ones, and they
   move: these are IAU-confirmed totals, stated with their date on the page */
var SAT_COUNT={0:0,1:0,2:1,3:2,4:97,5:274,6:28,7:16,8:5};

function satSys(idx){ return SAT_SYS[idx]||null; }
function satCount(idx){ return SAT_COUNT[idx]; }
/* a moon's detail level, defaulting to 1 — every row written before the levels
   existed is level 1, which is what keeps the default picture unchanged */
function satLevelOf(m){ return m[5]||1; }
/* the highest level this planet has anything at. Mars and Pluto come back 1:
   every moon they have is already drawn, so there is no "more" to offer and
   the control that offers it should not appear. */
function satMaxLevel(idx){
  var sys=SAT_SYS[idx]; if(!sys) return 1;
  var mx=1; for(var i=0;i<sys.moons.length;i++) mx=Math.max(mx,satLevelOf(sys.moons[i]));
  return mx;
}
function satClampLevel(idx,l){ return Math.max(1,Math.min(satMaxLevel(idx),l||1)); }
/* how many moons are actually drawn at a given level — the honest half of the
   "274 confirmed" sentence on the page */
function satDrawn(idx,l){
  var sys=SAT_SYS[idx]; if(!sys) return 0;
  l=satClampLevel(idx,l); var c=0;
  for(var i=0;i<sys.moons.length;i++) if(satLevelOf(sys.moons[i])<=l) c++;
  return c;
}

/* THE STARTING ANGLES. Not an ephemeris and not pretending to be: a fixed
   spread by index so the moons do not all set off from the same radius line,
   plus real mean motion from the real period. Everything you can READ off the
   picture — spacing, relative size, who laps whom, which way Triton and Phoebe
   go — is true. The absolute longitude is not, and the caption says so. */
function satAngle(sys,i,ms){
  var m=sys.moons[i], per=m[2];
  var turns=(ms/86400000)/per;
  return (i*137.508/360+turns)*2*Math.PI;   /* 137.5deg = the golden angle, so the seeds never line up */
}

/* One planet's system, drawn to fill the square frame. The outermost DRAWN moon
   sets the scale, so Jupiter's rung is Callisto-wide and does not waste the
   frame on Himalia 6x further out; Himalia gets an off-frame marker instead. */
function satView(ms,idx,opt){
  var sys=SAT_SYS[idx]; if(!sys) return '';
  opt=opt||{};
  var n=sys.moons.length, i, out='';
  /* which moons fit: everything out to the named frame moon. The ones beyond it
     are not silently dropped — they are named at the top with how much further
     out they are, which is a fact about the system worth having. */
  /* HOW MUCH OF THE SYSTEM TO DRAW. Level 1 is the set this picture has always
     shown and stays the default; 2 adds the regular system, 3 the captures.
     Clamped to what this planet actually has, so a ?moons=3 aimed at Mars —
     which has two moons and one level — quietly draws its two rather than
     nothing. */
  var lvl=satClampLevel(idx,+opt.moonLevel||1);
  /* EACH LEVEL HAS ITS OWN FRAME. Framing level 3 on the level-1 moon would put
     every new moon off the edge; framing level 1 on the level-3 moon would
     shrink the Galileans to a dot to make room for moons that are not being
     drawn. sys.frames holds the choice per level and falls back to sys.frame. */
  var fname=(sys.frames&&sys.frames[lvl])||sys.frame;
  var lim=0;
  for(i=0;i<n;i++) if(sys.moons[i][0]===fname) lim=sys.moons[i][1];
  if(!lim) for(i=0;i<n;i++) if(satLevelOf(sys.moons[i])<=lvl) lim=Math.max(lim,sys.moons[i][1]);
  var shown=[], off=[];
  for(i=0;i<n;i++){
    if(satLevelOf(sys.moons[i])>lvl) continue;   /* not at this level of detail */
    if(sys.moons[i][1]<=lim) shown.push(i); else off.push(i);
  }
  var outer=0, big=0;
  for(i=0;i<shown.length;i++){ outer=Math.max(outer,sys.moons[shown[i]][1]); big=Math.max(big,sys.moons[shown[i]][3]); }
  var R=SOL_CX-SOL_PAD-26, k=R/(outer*1.06);
  var pr=Math.max(6,sys.req*k);              /* the planet's own disc, to scale with the orbits */
  /* THE VIEW TILT, the same one the heliocentric rungs use. This view ignored
     it entirely: the slider moved, the read-out changed, and the picture did
     not — which on a moon page is the one control people reach for, because a
     ring system seen flat-on is a set of concentric circles and seen at an
     angle it is Saturn. 0 = straight down on the orbital plane.
     Applied here as a cosine on the vertical only, exactly as solSystemView
     does it, rather than a wrapping <g> squash: the labels and the moon discs
     must NOT be squashed with the orbits, so each y is scaled at the point it
     is computed and every radius stays a radius. */
  var stl=(+opt.tilt||0)*PL_RAD, sct=Math.cos(stl), stilted=stl>0.01;
  /* how far a point at orbital radius r, angle th, sits from the centre once
     the plane is tilted — one place, so an orbit ring and the moon on it can
     never disagree about where that orbit is */
  function satY(r,th){ return SOL_CY-r*Math.sin(th)*sct; }
  /* HOW MUCH THE MOONS ARE OVERSIZE IS COMPUTED, NOT CHOSEN. At the zoom where
     Callisto's orbit fills the frame, Ganymede — the largest moon there is — is
     half a pixel across. So the factor is whatever makes the biggest moon in
     THIS system about 9px, capped so that a system of specks (Mars) does not
     get blown up until Phobos looks like a major world. The number it lands on
     is printed on the picture. */
  var mag=Math.min(25,Math.max(1,Math.round(9/Math.max(big/2*k,0.001))));

  /* rings, where there are any — to scale, because they are close in and this
     is the one view where they are more than a line */
  if(sys.ring){
    var ri=sys.ring[0]*k, ro=sys.ring[1]*k, rmid=(ri+ro)/2;
    /* an ellipse once tilted — a ring seen at an angle is the whole reason
       anyone tilts this view. The stroke WIDTH is the ring's thickness and is
       not scaled: it is a radial measurement, not a vertical one. */
    out+='<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(rmid)+'" ry="'+solF(rmid*sct)+'" fill="none" stroke="#cbd5e1" stroke-opacity=".33" stroke-width="'+solF(Math.max(1,ro-ri))+'"/>';
  }
  /* the planet */
  out+='<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF(pr)+'" fill="'+(SOL_COL[plName(idx)]||'#94a3b8')+'"/>';
  out+='<text x="'+SOL_CX+'" y="'+solF(SOL_CY+pr+18)+'" text-anchor="middle" font-size="13" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+plName(idx)+'</text>';

  var inner=[];
  for(var s=0;s<shown.length;s++){
    i=shown[s];
    var m=sys.moons[i], a=m[1]*k, th=satAngle(sys,i,ms);
    var mx=SOL_CX+a*Math.cos(th), my=satY(a,th);
    var retro=m[2]<0;
    /* the orbit: near-circular, so a circle seen flat-on and an ellipse of the
       same radius seen at an angle. Squashed by the same cosine as the moon
       riding on it, so the moon sits ON its ring at every tilt. */
    out+=(stilted
      ? '<ellipse cx="'+SOL_CX+'" cy="'+SOL_CY+'" rx="'+solF(a)+'" ry="'+solF(a*sct)+'"'
      : '<circle cx="'+SOL_CX+'" cy="'+SOL_CY+'" r="'+solF(a)+'"')
      +' fill="none" stroke="'+(retro?'#f0a5a5':'#8fb3d9')+'" stroke-opacity="'+(retro?'.5':'.32')+'" stroke-width="1"'+(retro?' stroke-dasharray="4 4"':'')+'/>';
    /* moon size: real diameters, scaled up by the stated factor so the small
       ones exist at all. The factor is drawn ON the picture, not hidden here. */
    var mr=Math.max(1.5,m[3]/2*k*mag);
    out+='<circle cx="'+solF(mx)+'" cy="'+solF(my)+'" r="'+solF(mr)+'" fill="'+(retro?'#e8b4b4':'#e8eef7')+'"/>';
    /* label only where a label will not land on top of another one. The inner
       moonlets of Jupiter and Saturn sit within a few pixels of each other and
       of the planet, so they share one line under a ring instead — the same
       treatment the outer rungs give the inner four planets. */
    /* the test is on the ORBITAL radius, not the drawn one, so which moons get
       a label does not change as they go round — or as the view tilts. */
    if(a>=46)
      out+='<text x="'+solF(mx)+'" y="'+solF(my-mr-7)+'" text-anchor="middle" font-size="12" fill="#e2e8f0" paint-order="stroke" stroke="#0a1020" stroke-width="3">'+m[0]+'</text>';
    else inner.push(m[0]);
  }
  if(inner.length){
    var ir=0;
    for(var q=0;q<shown.length;q++){ var qa=sys.moons[shown[q]][1]*k; if(qa<46) ir=Math.max(ir,qa); }
    /* clears the bottom of the innermost ring, which the tilt has flattened */
    out+='<text x="'+SOL_CX+'" y="'+solF(SOL_CY+Math.max(pr,ir*sct)+16)+'" text-anchor="middle" font-size="11" fill="#94a3b8" paint-order="stroke" stroke="#080d1a" stroke-width="3">'
       +(inner.length>1?inner.slice(0,-1).join(', ')+' and '+inner[inner.length-1]+' are in here':inner[0]+' is in here')+'</text>';
  }
  /* anything too far out to draw still gets said, with its real distance */
  if(off.length){
    var lab=[]; for(i=0;i<off.length;i++)
      lab.push(sys.moons[off[i]][0]+' '+Math.round(sys.moons[off[i]][1]/outer)+'x further out');
    out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+16)+'" font-size="12" fill="#94a3b8">Off frame: '+lab.join(', ')+'</text>';
  }
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+34)+'" font-size="12" fill="#94a3b8">Orbit sizes, orbit speeds and the planet\\u2019s own disc are to scale'+(mag>1?'; the moons are drawn '+mag+'x oversize to be visible at all':'')+'.</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+50)+'" font-size="12" fill="#94a3b8">Where each moon sits on its orbit is not solved for here \\u2014 watch the motion, not the position.</text>';
  return out;
}
`;

/* ---------------------------------------------------------------------------
 * The Node side. Same source string, instantiated once.
 * ------------------------------------------------------------------------- */
const S = new Function(`${SAT_JS}
return { SAT_SYS, SAT_COUNT, satSys, satCount, satMaxLevel, satClampLevel, satDrawn, satLevelOf };`)();

export const SAT_SYS = S.SAT_SYS;
export const SAT_COUNT = S.SAT_COUNT;
/** Newton's constant, the one number here that is not about this solar system */
export const G = 6.67430e-11;
/** surface gravity in m/s^2, GM/r^2 — derived, never typed beside the planet */
export const satGravity = (idx) => {
  const s = S.SAT_SYS[idx];
  return s ? s.gm / (s.req * s.req) * 1000 : null;
};
/** mass in kg, GM/G */
export const satMass = (idx) => {
  const s = S.SAT_SYS[idx];
  return s ? s.gm * 1e9 / G : null;
};
/** rotation period in hours (negative = retrograde) */
export const satRotation = (idx) => (S.SAT_SYS[idx] ? S.SAT_SYS[idx].rot : null);
/** the drawn moons of one planet, by planets.mjs index (null where there are none) */
export const satSystem = (idx) => S.satSys(idx);
/** IAU-confirmed moon count, which is a much bigger number than the drawn one */
export const satCount = (idx) => S.satCount(idx);
/* the detail levels, for the generator: how many a planet has, and how many
   moons each level draws. Mars and Pluto report 1 — every moon they have is
   already in the picture, so the level control is not offered there. */
export const satMaxLevel = (idx) => S.satMaxLevel(idx);
export const satDrawn = (idx, level) => S.satDrawn(idx, level);
/** [name, a_km, periodDays, diameterKm, note] -> a named object, for the tables */
export const satRow = (m) => ({ name: m[0], a: m[1], period: m[2], dia: m[3], note: m[4], retrograde: m[2] < 0 });
