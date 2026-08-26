/* The globe's drawing code sits at the TOP of this file, outside the IIFE below
   — the Earth-and-Moon view inside it calls glSvg, and so does the planet-page
   globe at the bottom. Declared once, seen by both. */

var GL_OBL={"Mercury":0.03,"Venus":177.4,"Earth":23.44,"Mars":25.19,"Jupiter":3.13,"Saturn":26.73,"Uranus":97.77,"Neptune":28.32,"Pluto":122.53};
var GL_COAST=[[[-17,15],[-16,19],[-13,23],[-10,27],[-7,31],[-6,34],[-2,35],[3,37],[8,37],[11,33],[15,32],[20,31],[25,32],[29,31],[33,31],[34,28],[35,24],[37,21],[39,17],[43,13],[45,11],[48,11],[51,11],[51,8],[48,5],[44,2],[41,-1],[40,-4],[40,-8],[39,-12],[37,-16],[35,-20],[33,-24],[31,-29],[27,-33],[22,-34],[18,-34],[15,-27],[13,-23],[12,-18],[12,-14],[10,-9],[9,-5],[9,-1],[8,4],[3,6],[-2,5],[-5,5],[-8,4],[-11,6],[-13,9],[-15,12],[-17,15]],[[-9,37],[-9,41],[-8,43],[-2,43],[0,46],[4,43],[7,44],[10,44],[13,38],[16,38],[18,40],[19,42],[16,43],[13,45],[14,45],[19,40],[23,38],[24,40],[27,41],[28,37],[31,37],[35,36],[36,36],[36,33],[35,31],[34,31],[33,31],[38,31],[43,30],[48,30],[50,27],[53,24],[57,24],[59,23],[57,20],[55,17],[52,16],[48,14],[44,13],[43,15],[40,20],[38,24],[35,28],[43,30],[50,25],[57,24],[60,20],[62,25],[66,25],[68,24],[72,20],[73,16],[75,12],[77,8],[80,10],[80,13],[81,16],[85,20],[87,21],[89,22],[92,21],[94,18],[97,16],[98,12],[100,13],[100,8],[103,1],[104,10],[106,10],[108,11],[109,15],[107,18],[106,21],[109,21],[113,22],[117,23],[120,25],[121,29],[122,31],[121,35],[119,37],[122,39],[126,40],[128,38],[129,35],[129,43],[132,43],[135,49],[139,53],[142,54],[141,60],[145,59],[150,59],[156,61],[161,60],[163,58],[163,62],[170,62],[177,64],[180,66],[180,71],[170,70],[160,70],[150,72],[140,73],[130,72],[120,73],[113,74],[105,77],[95,78],[87,75],[80,73],[73,72],[68,73],[62,71],[57,71],[52,69],[45,68],[40,66],[35,67],[33,64],[31,62],[28,66],[25,65],[22,60],[24,60],[20,58],[19,56],[16,56],[13,55],[10,57],[8,58],[5,60],[5,62],[11,64],[15,68],[20,70],[26,70],[30,70],[28,71],[20,70],[14,67],[10,64],[6,58],[8,54],[4,52],[0,51],[-2,49],[-4,48],[-2,47],[-1,46],[-2,44],[-9,44],[-9,37]],[[-168,66],[-166,68],[-160,71],[-155,71],[-148,70],[-140,70],[-133,69],[-125,70],[-117,69],[-110,68],[-102,69],[-95,68],[-90,68],[-85,67],[-82,70],[-78,73],[-72,70],[-68,66],[-65,60],[-64,58],[-78,57],[-82,55],[-86,53],[-80,51],[-79,55],[-78,60],[-73,62],[-66,60],[-60,55],[-56,52],[-59,48],[-65,45],[-67,44],[-70,42],[-72,41],[-74,39],[-75,37],[-76,35],[-78,34],[-81,31],[-81,27],[-80,25],[-82,25],[-83,28],[-85,30],[-88,30],[-90,29],[-94,29],[-97,26],[-97,21],[-95,19],[-91,18],[-88,21],[-87,21],[-88,18],[-87,15],[-84,11],[-83,9],[-80,9],[-78,8],[-79,5],[-78,1],[-80,-2],[-80,-4],[-76,-9],[-75,-14],[-71,-18],[-70,-23],[-71,-30],[-73,-37],[-73,-42],[-74,-46],[-75,-49],[-75,-52],[-70,-55],[-68,-55],[-65,-54],[-65,-48],[-64,-43],[-62,-40],[-58,-38],[-57,-35],[-53,-33],[-48,-27],[-48,-25],[-42,-23],[-39,-18],[-39,-13],[-37,-10],[-35,-6],[-38,-4],[-44,-2],[-48,0],[-51,0],[-52,4],[-55,6],[-60,8],[-63,10],[-68,11],[-71,12],[-73,10],[-75,9],[-77,9],[-79,9],[-82,9],[-84,10],[-87,16],[-91,16],[-95,16],[-101,18],[-105,20],[-106,23],[-110,24],[-112,27],[-114,28],[-115,30],[-117,33],[-120,34],[-122,37],[-124,40],[-124,44],[-124,48],[-127,51],[-131,54],[-133,57],[-140,60],[-146,60],[-151,59],[-155,58],[-160,59],[-165,60],[-166,62],[-168,66]],[[-45,60],[-50,62],[-52,64],[-54,67],[-55,70],[-57,73],[-60,76],[-58,79],[-50,82],[-40,83],[-32,83],[-24,81],[-20,78],[-22,75],[-22,72],[-28,70],[-33,68],[-38,66],[-42,62],[-45,60]],[[113,-22],[113,-26],[115,-30],[118,-34],[122,-34],[126,-32],[130,-32],[134,-33],[138,-35],[140,-38],[144,-38],[147,-38],[150,-37],[151,-33],[153,-28],[153,-25],[151,-24],[149,-21],[146,-19],[145,-15],[142,-11],[141,-13],[138,-16],[136,-12],[133,-11],[130,-12],[127,-14],[125,-14],[122,-17],[121,-19],[118,-20],[114,-21],[113,-22]],[[-180,-72],[-160,-75],[-140,-73],[-120,-74],[-100,-73],[-80,-72],[-60,-70],[-40,-72],[-20,-70],[0,-70],[20,-69],[40,-68],[60,-67],[80,-66],[100,-66],[120,-67],[140,-67],[160,-70],[180,-72],[180,-86],[-180,-86],[-180,-72]],[[43,-12],[48,-13],[50,-16],[49,-21],[48,-25],[45,-25],[44,-22],[43,-17],[43,-12]],[[-5,50],[-4,53],[-3,55],[-5,57],[-3,58],[-2,58],[0,54],[1,53],[-1,51],[-5,50]],[[-10,52],[-8,55],[-6,55],[-6,52],[-9,51],[-10,52]],[[130,31],[132,33],[135,34],[137,35],[140,36],[141,39],[141,41],[142,42],[145,44],[142,45],[140,42],[137,37],[133,35],[131,33],[130,31]],[[173,-35],[176,-37],[178,-38],[176,-41],[174,-41],[171,-43],[168,-46],[166,-45],[170,-43],[172,-40],[173,-35]],[[109,2],[113,4],[117,5],[119,3],[119,-1],[117,-4],[113,-3],[110,-3],[109,2]],[[95,5],[99,3],[104,-2],[106,-6],[103,-5],[100,-1],[97,2],[95,5]],[[105,-6],[110,-7],[114,-8],[114,-8],[110,-8],[106,-7],[105,-6]],[[119,-1],[123,0],[125,1],[125,-2],[121,-4],[120,-5],[119,-1]],[[131,-1],[137,-2],[141,-3],[146,-6],[150,-9],[147,-10],[143,-9],[138,-8],[134,-5],[131,-1]],[[120,18],[122,18],[124,12],[126,10],[122,7],[120,12],[120,18]],[[80,10],[82,8],[82,6],[80,6],[80,10]],[[-24,65],[-18,66],[-14,66],[-14,64],[-19,63],[-24,65]],[[-85,22],[-80,23],[-75,20],[-78,20],[-84,22],[-85,22]],[[-74,20],[-69,20],[-68,18],[-72,18],[-74,20]],[[145,-41],[148,-41],[148,-43],[145,-43],[145,-41]],[[142,46],[143,50],[143,54],[141,51],[142,46]],[[52,71],[56,73],[68,76],[62,73],[56,71],[52,71]]];
var GL_EDES=[[10,23,1900],[24,22,1700],[38,20,1300],[-4,25,1500],[45,22,1200],[52,20,1000],[58,28,900],[68,28,900],[100,40,1300],[88,40,1100],[125,-25,1500],[133,-24,1400],[118,-26,1200],[-114,32,700],[-70,-24,700],[18,-24,700],[46,-20,500]];
var GL_EICE=[[0,-90,4200],[-42,72,1700],[0,90,2600]];
var GL_ECLD=[[-30,4,2200],[10,2,1800],[60,6,1600],[110,3,2000],[150,8,1700],[-90,5,1800],[-160,2,1900],[-40,52,2600],[20,58,2300],[80,55,2200],[150,52,2400],[-120,50,2500],[-170,56,2100],[-50,-52,2600],[10,-56,2400],[70,-54,2500],[130,-52,2300],[-130,-55,2400],[-20,30,1200],[95,-15,1300],[-75,-8,1400]];

/* ---- the palettes, matched to how each world PHOTOGRAPHS -------------------
   base   the ground/cloud colour in full sun
   limb   the same colour at the edge of the disc, where you look through more
          atmosphere or across more curvature — every full-disc photograph is
          brighter in the middle, and putting that back is the single biggest
          step from "circle" to "ball"
   km     the real equatorial radius, which is what turns a feature's real size
          in kilometres into a fraction of the drawn disc */
var GL_PAL={
 Mercury:{base:'#8e8b86',limb:'#5e5b58',km:2440},
 Venus:  {base:'#e8d5a0',limb:'#c9ab68',km:6052},
 Earth:  {base:'#1c5b96',limb:'#12406e',km:6371},
 Mars:   {base:'#bc7746',limb:'#87502f',km:3390},
 Jupiter:{base:'#dfbf93',limb:'#a8815a',km:71492},
 Saturn: {base:'#e3cca0',limb:'#a88f61',km:60268},
 Uranus: {base:'#a8dfe3',limb:'#6fb0b8',km:25559},
 Neptune:{base:'#3f6fc4',limb:'#254a8e',km:24764},
 Pluto:  {base:'#b3a08c',limb:'#7d6c5c',km:1188}
};

/* ---- the features ---------------------------------------------------------
   Each entry: [lon E, lat N, km across, colourIndex, opacity]. Colours are
   indexes into the planet's own list so the data stays short. A feature is
   several lobes because one ellipse reads as a bubble and three read as a
   shape — the same reason the moon's maria are lobed. */
var GL_FEAT={
 /* MERCURY. Grey, and the flattest contrast in the solar system: the whole
    disc varies by well under a factor of two, so these sit at low opacity. The
    named basins are where they are; the anonymous cratering is seeded noise. */
 Mercury:{
  col:['#635f5a','#b8b3aa','#e2ddd2','#57534e'],
  f:[
   /* Caloris Planitia, 1550 km, one of the largest impact basins anywhere —
      smoother and slightly BRIGHTER than its surroundings, not darker */
   [190,30,1550,1,.55],[178,34,900,1,.4],[201,25,850,1,.4],
   /* the big dark-floored basins */
   [236,-20,630,0,.5],[195,-16,355,0,.45],[88,-33,715,0,.45],[183,-45,400,0,.4],
   [302,27,306,0,.4],[110,8,290,0,.35],[335,15,250,0,.3],
   /* the young rayed craters — Hokusai and Debussy both throw rays most of the
      way round the planet, which is what a fresh impact on an airless world
      looks like */
   [17,58,95,2,.8],[348,-34,85,2,.75],[329,-11,62,2,.6],[122,-14,70,2,.5]
  ],
  ray:[[17,58,2600],[348,-34,2200]],
  speckle:{n:300,km:[26,170],col:3,op:.6,seed:7412,rim:'#d5cfc2',rimop:.5}
 },
 /* VENUS. In visible light there is nothing to see and that is the fact worth
    drawing: no telescope at any wavelength the eye uses has ever seen the
    ground. What is here is the faint darker mottle of the cloud deck itself,
    at the contrast a visible-light photograph actually shows — a few percent.
    The famous dark Y is ULTRAVIOLET and does not belong on a picture of what
    you would see. */
 Venus:{
  col:['#d9c084','#f4e6bd'],
  f:[[40,20,5200,0,.16],[210,-10,5800,0,.14],[300,35,4200,0,.12],[130,-40,4600,0,.13],
     [340,5,4000,1,.2],[95,25,3600,1,.16],[190,45,3000,1,.14],[250,-45,3400,1,.13]],
  speckle:{n:70,km:[900,2600],col:1,op:.05,seed:2298}
 },
 /* EARTH. Handled by its own layers — coastline rings, deserts, ice, cloud —
    because a coastline is the one thing on any of these worlds with a genuinely
    hard edge, and it has to be a clipped path and not a blob. */
 Earth:{col:[],f:[]},
 /* MARS. Butterscotch, with the grey-brown albedo features telescopes have
    tracked since the 1600s. Two things make it read as Mars: Syrtis Major is a
    sharp dark wedge and Hellas is a BRIGHT circle, because it is a basin full
    of dust rather than a dark plain. */
 Mars:{
  col:['#7d5a45','#6d4c3a','#e0a878','#f4efe8','#a86a44'],
  f:[
   /* Syrtis Major Planum — the dark wedge, 1300 km, the first surface feature
      ever mapped on another planet (Huygens, 1659) */
   [70,10,1300,1,.82],[74,2,900,1,.74],[66,18,800,0,.68],[78,-4,600,0,.6],
   /* Acidalia Planitia, the big northern dark region */
   [340,50,2400,0,.66],[350,42,1600,0,.58],[325,45,1400,0,.52],
   /* Mare Erythraeum / Margaritifer */
   [335,-25,1800,0,.66],[345,-18,1200,0,.55],[318,-30,1100,0,.52],
   /* Mare Cimmerium and Mare Sirenum, the southern dark band */
   [210,-20,2000,0,.64],[228,-26,1400,0,.55],[150,-30,1900,0,.62],[168,-24,1300,0,.52],
   /* Mare Tyrrhenum, Sinus Sabaeus */
   [95,-18,1100,0,.55],[10,-8,1200,0,.52],[350,-6,900,0,.47],
   /* Hellas Planitia — 2300 km, and BRIGHT, because it is full of dust */
   [70,-42,2300,2,.6],[62,-46,1400,2,.4],
   /* Arabia Terra and Tharsis, the bright dusty uplands */
   [20,20,2600,2,.4],[250,5,3000,2,.32],
   /* Olympus Mons, and the three Tharsis Montes in their real diagonal line */
   [226,18,600,4,.5],[247,12,400,4,.42],[247,3,400,4,.4],[248,-9,400,4,.38],
   /* Valles Marineris — 4000 km long and only ~200 wide, so it is drawn as a
      chain of lobes rather than a circle */
   [285,-9,500,1,.42],[295,-11,500,1,.42],[305,-12,500,1,.4],[275,-7,450,1,.38],
  ],
  /* THE CAPS ARE LATITUDE BANDS, NOT BLOBS. A blob centred on the pole has a
     depth of exactly zero here — the poles lie on the limb — so it was culled
     on every frame and Mars was drawn capless. A cap is a band of latitude,
     which is what the band machinery already draws correctly right up to the
     pole. The south cap is the bigger one when it is winter down there. */
  bands:[[90,80,'#f6f2ec',.82,.5,4],[-90,-74,'#f2ece2',.75,.7,4]],
  speckle:{n:110,km:[200,760],col:0,op:.14,seed:5531}
 },
 /* JUPITER. The belts and zones are at their real latitudes and the Great Red
    Spot at 22 degrees south. What makes it Jupiter rather than a striped ball
    is that the boundaries are TURBULENT — the bands are drawn with a wave
    along their edges, and the blue-grey festoons hang off the south edge of
    the North Equatorial Belt into the bright Equatorial Zone, which is where
    they really are. */
 Jupiter:{
  col:['#c9502f','#e8d3ae','#f2e6cc','#8a6242','#6f7f96'],
  bands:[
   /* [north lat, south lat, colour, opacity, wave amplitude, wave number] */
   [90,62,'#93867e',.5,.35,4],
   [62,48,'#c9ab84',.4,.5,5],
   [48,40,'#8d6a4c',.55,.7,7],
   [40,31,'#ead2ab',.6,.6,6],
   [31,24,'#96704f',.6,.8,8],
   [24,17,'#f0dcb8',.6,.7,7],
   [17,7,'#8f6039',.75,1.1,9],
   [7,-7,'#f6e9cd',.7,.6,6],
   [-7,-21,'#93613b',.72,1.1,9],
   [-21,-27,'#eddcb8',.6,.7,7],
   [-27,-37,'#8d6a4c',.6,.8,6],
   [-37,-48,'#dcc399',.5,.6,5],
   [-48,-62,'#c9ab84',.4,.45,5],
   [-62,-90,'#93867e',.5,.35,4]
  ],
  f:[
   /* the Great Red Spot: 16,000 km by 12,000, one and a quarter Earths wide,
      with its own paler curl inside it */
   [58,-22,16000,0,.75],[58,-22,9000,0,.45],[54,-20,5000,3,.25],
   /* Oval BA, the "little red spot", and the white ovals of the south */
   [130,-33,9000,2,.5],[196,-33,7000,2,.42],[246,-40,6000,2,.38],
   /* the festoons: blue-grey plumes trailing off the NEB into the bright zone.
      Nothing else in the picture says "this is a fluid" as loudly. */
   [20,7,6000,4,.4],[62,6,5200,4,.36],[104,8,5600,4,.34],[148,6,4800,4,.32],
   [192,7,5400,4,.34],[236,6,5000,4,.3],[280,8,5600,4,.32],[324,6,4600,4,.3],
   /* bright plumes in the equatorial zone itself */
   [90,1,7000,2,.28],[210,-2,6000,2,.24],[330,2,6500,2,.26]
  ]
 },
 /* SATURN. The banding is real and genuinely this faint — Saturn is a much
    blander planet than Jupiter, and drawing it with Jupiter's contrast is the
    commonest way to get it wrong. The polar hood is bluish. */
 Saturn:{
  col:['#f0e2ba','#c2a878','#8fa3b4'],
  bands:[
   [90,74,'#93a6b6',.45,.25,4],
   [74,55,'#d8c091',.4,.4,5],
   [55,38,'#e8d5a6',.36,.45,5],
   [38,22,'#d2b884',.34,.5,6],
   [22,8,'#efe0af',.4,.4,6],
   [8,-8,'#f5e8bd',.45,.3,5],
   [-8,-24,'#d8be8a',.36,.5,6],
   [-24,-42,'#e6d3a2',.32,.45,5],
   [-42,-62,'#d0b681',.34,.4,5],
   [-62,-90,'#93a6b6',.4,.25,4]
  ],
  f:[[0,88,12000,2,.35],[0,-88,10000,2,.3],
     [140,-40,9000,1,.18],[300,35,8000,0,.2]],
  /* the real ring system, in Saturn radii: the C ring is translucent, the B
     ring is the bright one, the Cassini Division is a genuine gap, and the A
     ring carries the Encke gap near its outer edge. Seven evenly spaced arcs
     — which is what this was — is the one thing everybody draws and nobody
     has ever photographed. */
  ring:[[1.239,1.527,.18],[1.527,1.951,.62],[1.951,2.026,.05],[2.026,2.214,.42],[2.214,2.229,.04],[2.229,2.269,.36]]
 },
 /* URANUS. Almost featureless in visible light, and drawn that way. The tilt
    is the point: at 97.8 degrees it rolls along its orbit, and the thin rings
    go round the equator, so from here they stand nearly upright. */
 Uranus:{
  col:['#bceaee','#8fcdd6'],
  bands:[[90,45,'#a5dde3',.25,.2,3],[45,-45,'#b4e4e9',.2,.15,3],[-45,-90,'#a5dde3',.25,.2,3]],
  f:[[0,90,9000,0,.3],[180,-25,7000,1,.12]],
  ring:[[1.64,1.66,.07],[1.90,1.92,.08],[2.00,2.01,.16]]
 },
 /* NEPTUNE. The deepest blue of the eight, and the dark spots come and go over
    a few years — the one Voyager 2 photographed in 1989 had gone by 1994. The
    bright companion cloud that trails a dark spot is methane ice, and it is the
    highest cloud on the planet. */
 Neptune:{
  col:['#1f3a78','#e6eefc','#5b83d4'],
  bands:[[90,50,'#4f74c2',.4,.3,4],[50,20,'#33559f',.42,.45,5],[20,-20,'#5a80cc',.35,.4,4],
         [-20,-50,'#31549e',.45,.45,5],[-50,-90,'#4f74c2',.4,.3,4]],
  f:[[200,-22,12000,0,.6],[200,-22,7000,0,.3],
     [186,-26,5000,1,.5],[318,-42,6000,1,.35],[120,42,5000,1,.3],[60,-12,4000,1,.2]]
 },
 /* PLUTO. New Horizons only saw one side properly, and that side is the one
    everybody knows: Sputnik Planitia — the western lobe of the heart — is a
    1000 km sheet of nitrogen ice, the brightest thing on the planet, and
    Cthulhu Macula is the dark red equatorial band beside it, stained by
    tholins. The north polar region is pale yellow methane frost. */
 Pluto:{
  col:['#f7f0e2','#5a4238','#d8c9a8','#8a6f56'],
  f:[
   /* Sputnik Planitia and the rest of Tombaugh Regio */
   [175,20,1000,0,.92],[178,5,700,0,.8],[186,28,600,0,.75],[196,8,600,0,.6],
   /* Cthulhu Macula — the dark whale, 3000 km of it along the equator */
   [110,-8,1400,1,.62],[85,-6,1100,1,.58],[140,-10,1000,1,.5],[60,-4,800,1,.45],
   [35,-8,700,1,.4],[155,-14,700,1,.38],
   /* the other dark equatorial patches, and the pale north */
   [280,-12,700,1,.35],[320,-6,600,1,.3],
   [240,30,700,3,.3],[300,45,600,3,.25]
  ],
  bands:[[90,79,'#e8dcc4',.45,.6,3],[-90,-80,'#d8cbb4',.3,.6,3]],
  speckle:{n:70,km:[70,240],col:3,op:.2,seed:9021}
 }
};
/* how much light a world's own haze scatters back at you: high for a cloud
   deck or an ice sheet, low for bare rock */
/* HOW FLATTENED EACH ONE IS. Jupiter is 6.5% wider than it is tall and Saturn
   nearly 10% — both are visibly oval in any photograph, and drawing them as
   circles is one of the loudest wrong notes available. It is their own spin
   that does it, so the squash is along the SPIN AXIS, which is why it goes in
   before the tilt rotation rather than after. */
var GL_FLAT={Jupiter:.0649,Saturn:.0980,Uranus:.0229,Neptune:.0171};
/* WHERE THE PRIME MERIDIAN IS, for real. [W0 degrees at J2000, degrees per day]
   — the IAU working-group rotation elements. Without these the phase was
   anchored to 1 January 1970 for no reason, so the rate was right and the FACE
   was arbitrary: Syrtis Major was the right size in the right place on Mars,
   and Mars was turned to a longitude nothing had chosen. Jupiter and Saturn
   are System III, the magnetic-field rotation, which is what "Jupiter's day"
   means for a planet with no surface. */
var GL_PM={
 Mercury:[329.5988,6.1385108], Venus:[160.20,-1.4813688], Earth:[190.147,360.9856235],
 Mars:[176.630,350.891982443297], Jupiter:[284.95,870.5360000], Saturn:[38.90,810.7939024],
 Uranus:[203.81,-501.1600928], Neptune:[253.198,536.3128492], Pluto:[302.695,56.3625225]
};
/* THE RINGS' OWN COLOUR. Water ice, and it photographs as a cool off-white
   against the planet's warm cream — the two being different is most of what
   tells you they are not part of the planet. */
var GL_RINGC='#efe9dc';
var GL_SHEEN={Mercury:.05,Venus:.3,Earth:.18,Mars:.07,Jupiter:.14,Saturn:.16,Uranus:.22,Neptune:.2,Pluto:.1};
var GL_CAP={Mercury:'Craters are placed by their real coordinates and sized in real kilometres \u2014 Caloris really is 1,550 km across and really is at 30 degrees north. What is invented is the small stuff between them. Mercury is the most heavily cratered of the four rocky planets, and the flattest in contrast: the whole disc varies by less than a factor of two.',
 Venus:'An unbroken cloud deck, which is what you would actually see: no telescope at any wavelength the eye uses has ever seen the ground through it. The famous dark Y is an ultraviolet feature and is deliberately not drawn here \u2014 this is the visible-light view, and in visible light Venus is very nearly blank.',
 Earth:'Coastlines from real coordinates, the deserts and the ice where they are, and cloud banded the way it is banded \u2014 wet at the equator, stormy near 55 degrees. It turns at the real sidereal rate from the real prime meridian, so a full turn takes 23h 56m and the continents come round in the right order; which face you would see from anywhere in particular is not solved for.',
 Mars:'Every dark patch is a named albedo feature at its real place and size: Syrtis Major the dark wedge, Acidalia in the north, Mare Cimmerium and Mare Sirenum along the south. Hellas is the bright circle \u2014 it is a 2,300 km basin full of dust, not a dark plain. Olympus Mons and the three Tharsis Montes are in their real diagonal line.',
 Jupiter:'The belts and zones are at their real latitudes and the Great Red Spot at 22 degrees south, one and a quarter Earths wide. The blue-grey plumes along the equator are festoons, hanging off the south edge of the North Equatorial Belt where they really hang. Where each sits in longitude is schematic, and the white ovals stand for a set that changes every few years.',
 Saturn:'The rings are the real ring system to scale: the faint C ring from 1.24 Saturn radii, the bright B ring, the Cassini Division as a genuine gap at 1.95, then the A ring with the Encke gap near its outer edge. How far OPEN they look is solved for this date rather than assumed — it is the angle Earth stands above the ring plane, which is zero at a crossing (the last was 23 March 2025) and reaches the full 26.7 degrees only at solstice, so the rings here widen and close over the years as they really do. The dark line across the planet is the rings’ own shadow, and how wide it runs is set by where the SUN stands above the plane rather than where you do. The banding is real and genuinely this faint.',
 Uranus:'Almost featureless in visible light, and drawn that way \u2014 adding detail here would be inventing it. The tilt is the point: at 97.8 degrees Uranus rolls along its orbit, so the face it turns to Earth swings from pole-on to edge-on and back over its 84-year year. This decade it is very nearly pole-on, which is why its thin rings are drawn here as circles around the disc rather than as a line across it, and why the axis marker is a stub: that pole is pointing very nearly at you.',
 Neptune:'The deepest blue of the eight, and that colour is methane absorbing red light. The dark spot is schematic in position: Neptune\u2019s come and go over a few years, and the one Voyager 2 photographed in 1989 had gone by 1994. The bright smudges are the methane clouds that trail them \u2014 the highest clouds on the planet.',
 Pluto:'The face New Horizons saw in 2015. Sputnik Planitia \u2014 the western lobe of the heart \u2014 is a 1,000 km sheet of nitrogen ice and the brightest thing on the planet; Cthulhu Macula is the dark band along the equator beside it, stained red-brown by tholins. The other hemisphere is far less well known, and is drawn with far less on it.'};

/* ---------------------------------------------------------------------------
 * HOW FAR OPEN A RING SYSTEM IS, SOLVED RATHER THAN ASSUMED.
 *
 * This drawing used to open Saturn's rings by its AXIAL TILT — 26.7 degrees,
 * always, so they were drawn near their widest on every day of the 29-year
 * orbit and the caption's own claim (that they close to a line twice a Saturn
 * year) was the one thing the picture could not show. The angle that decides
 * how open they look is the sub-Earth latitude on the ring plane, B: it is 0
 * at a ring-plane crossing (the last was 23 March 2025) and reaches the axial
 * tilt only at solstice.
 *
 * B falls out of two things this file can already reach: the pole direction,
 * which is fixed in space (IAU right ascension and declination, converted to
 * the ecliptic frame the orbits are solved in), and the planet-to-Earth vector
 * from plPos. sin B is the pole dotted with that direction. The same dot
 * against the planet-to-SUN vector gives the sub-solar latitude Bs, which is
 * what casts the rings' shadow onto the planet.
 *
 * So the picture moves with the real date, at build time and in the browser,
 * from the same series the rest of the site's positions come from — and
 * NOTHING here is typed in beside the drawing.
 * ------------------------------------------------------------------------- */
var GL_POLE={Saturn:[5,40.589,83.537],Uranus:[6,257.311,-15.175]};
function glPoleVec(ra,dec){
  var e=23.439291*Math.PI/180, r=ra*Math.PI/180, d=dec*Math.PI/180;
  var x=Math.cos(d)*Math.cos(r), y=Math.cos(d)*Math.sin(r), z=Math.sin(d);
  return [x, y*Math.cos(e)+z*Math.sin(e), -y*Math.sin(e)+z*Math.cos(e)];
}
/* {B, Bs} in degrees, or null for a body with no ring plane worth solving —
   and null too where plPos is absent, so a page that ships the globe without
   the orbits still draws something rather than throwing. */
function glAspect(name,ms){
  var p=GL_POLE[name];
  if(!p||typeof plPos!=='function') return null;
  var n=glPoleVec(p[1],p[2]), s=plPos(p[0],ms), e=plPos(2,ms);
  var vx=e.x-s.x, vy=e.y-s.y, vz=e.z-s.z, d=Math.sqrt(vx*vx+vy*vy+vz*vz);
  return {
    B:Math.asin((n[0]*vx+n[1]*vy+n[2]*vz)/d)*180/Math.PI,
    Bs:Math.asin(-(n[0]*s.x+n[1]*s.y+n[2]*s.z)/s.r)*180/Math.PI
  };
}

function glF(n){ return Math.round(n*100)/100; }
/* seeded, so a build is byte-stable and the speckle does not crawl */
function glRng(s){ var x=s>>>0; return function(){ x=(x*1664525+1013904223)>>>0; return x/4294967296; }; }

/* THE DRAWN RADIUS THAT FITS A FRAME. Saturn's rings reach 2.27 planet radii
   and Uranus's 2.01, so a ringed planet drawn at the same radius as a bare one
   puts most of its rings outside the box. Derived from the ring table rather
   than written beside it. 1.22 is the bare case: the axis overshoots the disc
   by a fifth. */
function glR(name,half){
  var f=GL_FEAT[name], ro=f&&f.ring?f.ring[f.ring.length-1][1]:0;
  return half/(ro?ro*1.04:1.22);
}

/* A point on the globe, orthographic, PLUS the foreshortening frame — this is
   the moon's project() with the sub-observer longitude and the axial tilt
   folded in. rho is how far out toward the limb it is; squash is how much a
   feature there is compressed along the radial direction; ang is which way
   "radial" points on screen.

   vlat is the latitude the planet is being SEEN FROM, not the axial tilt.
   The two used to be conflated, and the giveaway was Saturn: the rings opened
   by its 26.7-degree tilt while the bands were drawn as if the viewer sat on
   its equator, so one picture held two viewpoints at once. The LEAN of the
   axis on screen is a rotation of the whole drawing (see glSvg) and does not
   belong in here either. */
function glPt(lat,lon,lon0,vlat,flat){
  var a=lat*Math.PI/180, b=(lon-lon0)*Math.PI/180, B=(vlat||0)*Math.PI/180;
  var cb=Math.cos(B), sb=Math.sin(B), ca=Math.cos(a), sa=Math.sin(a)*(1-(flat||0));
  var x=ca*Math.sin(b), y=sa*cb-ca*Math.cos(b)*sb, z=sa*sb+ca*Math.cos(b)*cb;
  var sx=x, sy=-y;
  var rho=Math.min(1,Math.sqrt(sx*sx+sy*sy));
  return { x:sx, y:sy, z:z, rho:rho,
    squash:Math.sqrt(Math.max(0,1-rho*rho)),
    ang:Math.atan2(sy,sx)*180/Math.PI };
}

/* ONE FEATURE. Foreshortened radially, faded at its own rim by a gradient, and
   faded again as it approaches the limb — a feature seen at a glancing angle is
   both squashed AND dimmer, and leaving the second one out is what makes a
   rotating planet look like a rolling sticker. */
function glBlob(lat,lon,km,R,rkm,lon0,vlat,gid,op,flat){
  var p=glPt(lat,lon,lon0,vlat,flat);
  if(p.z<=0.015) return '';
  var r=km/2/rkm*R;
  if(r<0.4) return '';
  var rx=Math.max(0.3,r*p.squash);
  var fade=Math.min(1,p.z*2.6);
  return '<ellipse cx="0" cy="0" rx="'+glF(rx)+'" ry="'+glF(r)+'" fill="url(#'+gid+')" opacity="'+glF(op*fade)
    +'" transform="translate('+glF(p.x*R)+' '+glF(p.y*R)+') rotate('+glF(p.ang)+')"/>';
}

/* A LATITUDE BAND, as a filled path across the visible hemisphere, with a WAVE
   along both edges. Jupiter's belts do not have straight boundaries — the
   shear between a belt and the zone beside it curls them — and a straight edge
   is the giveaway that this is a drawing of stripes and not of weather.
   It closes DOWN THE LIMB, not across the disc: at lon = lon0 +/- 90 the depth
   is exactly zero, so every point on that meridian lies on the drawn circle.
   Closing the two endpoints with a straight line instead cuts a chord through
   the planet, and on a steeply tilted world that chord is the widest thing in
   the picture. */
function glBand(n,so,R,lon0,vlat,amp,wav,flat){
  var i, d='', N=40, M=10;
  var put=function(la,lo){
    var q=glPt(la,lo,lon0,vlat,flat);
    d+=(d?'L':'M')+glF(q.x*R)+' '+glF(q.y*R);
  };
  /* TWO HARMONICS, NOT ONE. A single sine reads as a ribbon; a belt edge on
     Jupiter is ragged at several scales at once, and a second faster, smaller
     term is the cheapest thing that stops the eye seeing the period. */
  var wave=function(la,lo,s){
    var r=lo*Math.PI/180;
    return la+(amp||0)*(Math.sin((wav||3)*r+s)*.68+Math.sin((wav||3)*2.7*r+s*1.9)*.32);
  };
  for(i=0;i<=N;i++){ var lo=lon0-90+180*i/N; put(wave(n,lo,0),lo); }
  for(i=1;i<M;i++) put(n+(so-n)*i/M,lon0+90);
  for(i=0;i<=N;i++){ var lo2=lon0+90-180*i/N; put(wave(so,lo2,2.2),lo2); }
  for(i=1;i<M;i++) put(so+(n-so)*i/M,lon0-90);
  return d+'Z';
}

/* one closed ring of lat/lon, clipped to the near side. Returns path fragments
   — a coastline that crosses the limb has to break there. */
function glRing(pts,R,lon0,vlat,flat){
  var out=[], run=null, i;
  for(i=0;i<pts.length;i++){
    var q=glPt(pts[i][1],pts[i][0],lon0,vlat,flat);
    if(q.z>0.02){
      var xy=glF(q.x*R)+' '+glF(q.y*R);
      if(run===null) run='M'+xy; else run+='L'+xy;
    } else if(run!==null){ out.push(run); run=null; }
  }
  if(run!==null) out.push(run);
  return out;
}

/* ONE PLANET, TURNING. ms is the instant; R the drawn radius; rotHours the real
   sidereal period, negative for a retrograde spin; sunAng where the light comes
   from, so the terminator is where it really is. */
function glSvg(name,ms,cx,cy,R,rotHours,sunAng){
  var pal=GL_PAL[name], sk=GL_FEAT[name];
  if(!pal||!sk) return '';
  var tilt=GL_OBL[name]||0, retro=rotHours<0, fl=GL_FLAT[name]||0, i, j;
  /* WHERE THIS PICTURE IS TAKEN FROM, and which way it is turned on screen.
     A ringed planet is drawn the way every photograph of one is framed: the
     ring plane FLAT to the viewer, opened by the real sub-Earth latitude for
     this instant. Everything else keeps the old convention — seen from over
     its equator, with the axis leaning by its tilt — because for a body with
     no ring plane there is nothing in the picture that fixes a viewpoint, and
     the lean is the fact worth showing.
       vlat  the latitude the planet is seen from (bands, features, rings)
       pa    how far the drawing is rotated on screen (the axis lean) */
  var asp=glAspect(name,ms);
  var vlat=asp?asp.B:(sk.ring?tilt:0), pa=asp?0:tilt;
  /* THE SILHOUETTE OF A SQUASHED PLANET DEPENDS ON WHERE YOU STAND. Seen from
     over the equator Saturn is 9.8% wider than tall; seen from over a pole it
     is a circle. Uranus is very nearly pole-on this decade, so drawing it with
     its equator-on squash would be visibly wrong. */
  var vb=vlat*Math.PI/180;
  var Ry=R*Math.sqrt((1-fl)*(1-fl)*Math.cos(vb)*Math.cos(vb)+Math.sin(vb)*Math.sin(vb));
  var ell='rx="'+glF(R)+'" ry="'+glF(Ry)+'"';
  /* days since J2000, and the prime meridian from it. Falls back to the old
     rate-only turn if a body has no published elements. */
  var pm=GL_PM[name], lon0;
  if(pm){ lon0=pm[0]+pm[1]*((ms-946728000000)/86400000); }
  else { lon0=(ms/3600000)/Math.abs(rotHours)*360; if(retro) lon0=-lon0; }
  lon0=((lon0%360)+360)%360;
  var uid='g'+name, s='', defs='';
  var lx=Math.cos(sunAng), ly=-Math.sin(sunAng);

  /* every distinct feature colour gets ONE soft-edged radial gradient, reused
     by every blob of that colour — soft edges without a filter, which matters
     because these repaint sixteen times a second */
  var cols=sk.col||[];
  for(i=0;i<cols.length;i++)
    defs+='<radialGradient id="'+uid+'f'+i+'"><stop offset="0" stop-color="'+cols[i]+'" stop-opacity="1"/>'
      +'<stop offset=".55" stop-color="'+cols[i]+'" stop-opacity=".85"/>'
      +'<stop offset="1" stop-color="'+cols[i]+'" stop-opacity="0"/></radialGradient>';

  /* LIMB DARKENING. A full-disc photograph of any of these is brighter in the
     middle: you look straight down through the least atmosphere there and at a
     glancing angle everywhere else. It is the difference between a ball and a
     circle, and no amount of surface detail substitutes for it. */
  defs+='<radialGradient id="'+uid+'l" cx=".5" cy=".5" r=".5">'
    +'<stop offset="0" stop-color="'+pal.base+'"/><stop offset=".62" stop-color="'+pal.base+'"/>'
    +'<stop offset=".88" stop-color="'+pal.limb+'"/><stop offset="1" stop-color="'+pal.limb+'"/></radialGradient>';
  /* the night side: a hard-edged terminator across the disc, from the real
     sun direction */
  defs+='<linearGradient id="'+uid+'n" gradientUnits="objectBoundingBox" x1="'+glF(.5-lx*.5)+'" y1="'+glF(.5-ly*.5)+'" x2="'+glF(.5+lx*.5)+'" y2="'+glF(.5+ly*.5)+'">'
    /* A PORTRAIT, NOT A CRESCENT. This is the card whose job is "look at this
       planet", and a full-strength terminator hid most of the artwork behind
       it — Earth came out as a dark disc with a lit sliver. Every full-disc
       photograph these are drawn from is nearly fully lit, because that is
       when anybody photographs a planet. So the shading says which way the
       light is coming from and stops there. */
    +'<stop offset=".3" stop-color="#000000" stop-opacity="0"/>'
    +'<stop offset=".72" stop-color="#04060e" stop-opacity=".2"/>'
    +'<stop offset="1" stop-color="#04060e" stop-opacity=".5"/></linearGradient>';
  /* and the sheen the atmosphere scatters back at you, where there is one */
  defs+='<radialGradient id="'+uid+'s" cx="'+glF(.5-lx*.26)+'" cy="'+glF(.5-ly*.26)+'" r=".7">'
    +'<stop offset="0" stop-color="#ffffff" stop-opacity="'+(GL_SHEEN[name]||.1)+'"/>'
    +'<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>';
  /* Earth's three extra layers get their own soft gradients: sand, ice, cloud */
  if(name==='Earth'){
    var ec=[['d','#c2a06a'],['i','#f2f6fa'],['w','#f4f8fd']];
    for(i=0;i<ec.length;i++)
      defs+='<radialGradient id="'+uid+ec[i][0]+'"><stop offset="0" stop-color="'+ec[i][1]+'" stop-opacity="1"/>'
        +'<stop offset=".5" stop-color="'+ec[i][1]+'" stop-opacity=".8"/>'
        +'<stop offset="1" stop-color="'+ec[i][1]+'" stop-opacity="0"/></radialGradient>';
  }
  defs+='<clipPath id="'+uid+'c"><ellipse cx="0" cy="0" '+ell+'/></clipPath>';
  s+='<defs>'+defs+'</defs>';

  /* THE AXIS LEAN IS ONE ROTATION OF THE WHOLE DRAWING, applied here rather
     than point by point inside the projection: the disc, its bands, its
     features and its rings all have to lean together, and doing it once is
     what guarantees they do. */
  s+='<g transform="translate('+cx+' '+cy+')'+(pa?' rotate('+glF(-pa)+')':'')+'">';

  /* THE RINGS LIE IN THE EQUATORIAL PLANE, so how far open they look is the
     sub-Earth latitude on that plane — near zero for years around a crossing,
     the axial tilt only at solstice. Far half first, then the planet, then the
     near half over it: that ordering is the whole illusion. */
  var nearRing='';
  if(sk.ring){
    /* The projection already puts the viewer at latitude vlat, so the ring
       plane's own foreshortening is the sine of the same angle and the two
       cannot disagree. Positive means we are north of the plane, looking down
       on the rings' north face; negative means the south face, and which half
       of the ring passes in FRONT of the planet swaps with it. */
    var ry=Math.abs(Math.sin(vb)), north=(vlat>0);
    /* sweep 1 draws the UPPER arc; from north of the plane the half that
       passes in front of the planet is the LOWER one. */
    /* EACH RING IS A FILLED ANNULUS, not a stroked arc. A stroke is the same
       width in every direction, so a ring drawn that way is right at the ansae
       and far too thick top and bottom — which is exactly where a nearly
       edge-on system spends most of its length, and why this used to read as a
       smudge rather than as a set of rings. Two concentric half-ellipses with
       the same squash put every edge where the projection puts it, and the
       Cassini Division opens up as a real gap between two filled shapes. */
    var half=function(a,b,sweep){
      return 'M'+glF(-b)+' 0A'+glF(b)+' '+glF(b*ry)+' 0 0 '+sweep+' '+glF(b)+' 0'
        +'L'+glF(a)+' 0A'+glF(a)+' '+glF(a*ry)+' 0 0 '+(sweep?0:1)+' '+glF(-a)+' 0Z';
    };
    var mk=function(front){
      var sweep=north?(front?0:1):(front?1:0), t='', k;
      for(k=0;k<sk.ring.length;k++){
        var a=sk.ring[k][0]*R, b=sk.ring[k][1]*R, op=sk.ring[k][2];
        if(op<.06) continue;                    /* a gap is drawn by not drawing */
        /* A RING SEEN NEARLY EDGE-ON IS BRIGHTER, not fainter: the same sheet
           of ice is being looked through at a glancing angle, so more of it
           lies along the line of sight. That is why Saturn's rings stay
           obvious in a photograph taken near a crossing, when they are only a
           few pixels of sky. Capped at opaque. */
        t+='<path d="'+half(a,b,sweep)+'" fill="'+GL_RINGC+'" fill-opacity="'
          +glF(Math.min(.95,op*(1+(1-Math.min(1,ry/.45))*.55)))+'"/>';
      }
      return t;
    };
    s+=mk(0); nearRing=mk(1);
  }

  /* the ball */
  s+='<ellipse cx="0" cy="0" '+ell+' fill="url(#'+uid+'l)"/>';
  s+='<g clip-path="url(#'+uid+'c)">';

  /* banding, wavy-edged */
  if(sk.bands) for(i=0;i<sk.bands.length;i++){
    var bd=sk.bands[i];
    s+='<path d="'+glBand(bd[0],bd[1],R,lon0,vlat,bd[4],bd[5],fl)+'" fill="'+bd[2]+'" fill-opacity="'+bd[3]+'"/>';
  }

  /* THE RINGS' SHADOW ON THE PLANET — the hard dark line across Saturn in
     every photograph of it, and the one feature of a ringed planet that a
     drawing cannot fake convincingly because its width and its side are both
     set by where the SUN is, not where the viewer is.
     Sunlight reaching a point on the globe at height h above the ring plane
     crosses that plane at radius roughly 1 + h/tan(Bs) planet-radii out, so
     the shadowed band runs between the latitudes whose crossing radius is the
     inner and the outer edge of the ring system — and it falls on the side of
     the equator AWAY from the sun. Near a ring-plane crossing the sun is
     nearly in the plane, the band is a thin line on the equator, and that is
     exactly what the picture should show. */
  if(sk.ring&&asp){
    var tb=Math.tan(Math.abs(asp.Bs)*Math.PI/180), sgn=(asp.Bs>0?-1:1);
    var rin=sk.ring[0][0], rout=sk.ring[sk.ring.length-1][1];
    var l1=Math.asin(Math.min(1,(rin-1)*tb))*180/Math.PI;
    var l2=Math.asin(Math.min(1,(rout-1)*tb))*180/Math.PI;
    /* a floor of a quarter degree, so a shadow that is real but sub-pixel
       thin still reads as the line it is */
    if(l2-l1<.25) l2=l1+.25;
    /* glBand takes the northern edge first, so the pair swaps with the side */
    var sn=sgn>0?l2:-l1, ss=sgn>0?l1:-l2;
    s+='<path d="'+glBand(sn,ss,R,lon0,vlat,.25,4,fl)+'" fill="#1a1508" fill-opacity=".62"/>';
  }

  /* EARTH: land, then desert, then ice, then cloud. In that order because that
     is the order they sit in physically, and cloud over land is what a photo
     of Earth mostly is. */
  if(name==='Earth'){
    for(i=0;i<GL_COAST.length;i++){
      var frags=glRing(GL_COAST[i],R,lon0,vlat,fl);
      /* Greenland and Antarctica are ice sheets, and drawing them the same
         green as the Amazon is the one thing that makes a globe look painted */
      var lc=(i===3||i===5)?'#e9f1f6':'#3d6b3a';
      for(j=0;j<frags.length;j++)
        s+='<path d="'+frags[j]+'Z" fill="'+lc+'" fill-opacity=".95"/>';
    }
    for(i=0;i<GL_EDES.length;i++) s+=glBlob(GL_EDES[i][1],GL_EDES[i][0],GL_EDES[i][2],R,pal.km,lon0,vlat,uid+'d',.7,fl);
    for(i=0;i<GL_EICE.length;i++) s+=glBlob(GL_EICE[i][1],GL_EICE[i][0],GL_EICE[i][2],R,pal.km,lon0,vlat,uid+'i',.9,fl);
    /* CLOUD IS A TEXTURE, NOT A SET OF SHAPES. Twenty-one big soft ovals read
       as lozenges stuck on a globe. What a full-disc photograph shows is a
       great many small overlapping puffs, densest in the wet belt at the
       equator and in the two storm tracks near 55 degrees and thin over the
       deserts in between — so each listed system is a SEED that scatters a
       dozen smaller ones around itself, and the latitude bands are where the
       seeds are. */
    var cr=glRng(31337);
    for(i=0;i<GL_ECLD.length;i++){
      var C0=GL_ECLD[i];
      for(j=0;j<14;j++){
        var sp2=C0[2]/2/pal.km*R;
        var dl=(cr()*2-1)*C0[2]/111/Math.max(.35,Math.cos(C0[1]*Math.PI/180))*.55;
        var db=(cr()*2-1)*C0[2]/111*.35;
        s+=glBlob(C0[1]+db,C0[0]+dl,C0[2]*(.13+cr()*.22),R,pal.km,lon0,vlat,uid+'w',.34+cr()*.3,fl);
      }
    }
  }

  /* the named features */
  if(sk.f) for(i=0;i<sk.f.length;i++){
    var ft=sk.f[i];
    s+=glBlob(ft[1],ft[0],ft[2],R,pal.km,lon0,vlat,uid+'f'+ft[3],ft[4],fl);
  }

  /* ray systems: a fresh impact on an airless world throws bright streaks most
     of the way round it, and on Mercury that is half of what you see */
  if(sk.ray) for(i=0;i<sk.ray.length;i++){
    var rp=glPt(sk.ray[i][1],sk.ray[i][0],lon0,vlat,fl);
    if(rp.z<=0.05) continue;
    var rr=sk.ray[i][2]/2/pal.km*R, rd=glRng(4001+i*97);
    for(j=0;j<16;j++){
      var th=rd()*360, ln=rr*(.45+rd()*.75);
      s+='<line x1="0" y1="0" x2="'+glF(Math.cos(th*Math.PI/180)*ln*rp.squash)+'" y2="'+glF(Math.sin(th*Math.PI/180)*ln)
        +'" stroke="#e8e2d6" stroke-opacity="'+glF(.16*Math.min(1,rp.z*2.4))+'" stroke-width="'+glF(Math.max(.5,rr*.09))
        +'" stroke-linecap="round" transform="translate('+glF(rp.x*R)+' '+glF(rp.y*R)+') rotate('+glF(rp.ang)+')"/>';
    }
  }

  /* THE ANONYMOUS SMALL STUFF, seeded. On an airless world it needs a RIM: a
     dark patch alone reads as a stain, and the same patch with a bright arc on
     its sunward side reads as a hole in the ground. That repetition — circle,
     rim, shadow, over and over — is most of what makes cratered terrain look
     cratered rather than mottled. */
  if(sk.speckle){
    var sp=sk.speckle, rd2=glRng(sp.seed);
    for(i=0;i<sp.n;i++){
      var slon=rd2()*360, slat=(rd2()*2-1)*88, big=rd2();
      var skm=sp.km[0]+big*big*(sp.km[1]-sp.km[0]);
      if(sp.rim){
        var q3=glPt(slat,slon,lon0,vlat,fl);
        if(q3.z>0.02){
          var r3=skm/2/pal.km*R;
          if(r3>=0.6){
            var fd=Math.min(1,q3.z*2.6);
            var g3='transform="translate('+glF(q3.x*R)+' '+glF(q3.y*R)+') rotate('+glF(q3.ang)+')"';
            s+='<ellipse cx="0" cy="0" rx="'+glF(Math.max(.3,r3*q3.squash))+'" ry="'+glF(r3)+'" fill="url(#'+uid+'f'+sp.col+')" opacity="'+glF(sp.op*fd)+'" '+g3+'/>';
            /* the rim, offset a fraction of a radius toward the sun */
            if(r3>1.4) s+='<ellipse cx="'+glF(-lx*r3*.16*q3.squash)+'" cy="'+glF(-ly*r3*.16)+'" rx="'+glF(Math.max(.3,r3*q3.squash))+'" ry="'+glF(r3)+'" fill="none" stroke="'+sp.rim+'" stroke-opacity="'+glF(sp.rimop*fd)+'" stroke-width="'+glF(Math.max(.4,r3*.16))+'" '+g3+'/>';
          }
        }
      } else {
        s+=glBlob(slat,slon,skm,R,pal.km,lon0,vlat,uid+'f'+sp.col,sp.op,fl);
      }
    }
  }
  s+='</g>';

  /* haze, then night, then the rings that pass in front */
  s+='<ellipse cx="0" cy="0" '+ell+' fill="url(#'+uid+'s)"/>';
  s+='<ellipse cx="0" cy="0" '+ell+' fill="url(#'+uid+'n)"/>';
  s+=nearRing;
  /* THE AXIS. It is vertical in this frame by construction — the whole drawing
     is rotated by the lean above, and the projection puts the pole straight up
     — so the only thing left to get right is its LENGTH: an axis pointing
     partly at the viewer is foreshortened by the cosine of the latitude the
     planet is seen from, which is what makes Uranus's stub read as "that pole
     is aimed at you" rather than as a short line. */
  var axl=R*1.2*Math.abs(Math.cos(vb));
  if(axl>R*.06) s+='<g stroke="#e2e8f0" stroke-opacity=".33" stroke-dasharray="4 5">'
    +'<line x1="0" y1="'+glF(-axl)+'" x2="0" y2="'+glF(axl)+'"/></g>';
  s+='<ellipse cx="0" cy="0" '+ell+' fill="none" stroke="#0a1020" stroke-opacity=".4"/>';
  return s+'</g>';
}

(function(){
/* moon: not drawn on this page */

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
   ['Rhea',527108,4.518212,1527.6,'Saturn\u2019s second largest, and still only two fifths the width of our moon'],
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
   ['Moon',384400,27.321661,3474.8,'A quarter of Earth\u2019s width, and drifting away 3.8 cm a year']]},
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
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+34)+'" font-size="12" fill="#94a3b8">Orbit sizes, orbit speeds and the planet\u2019s own disc are to scale'+(mag>1?'; the moons are drawn '+mag+'x oversize to be visible at all':'')+'.</text>';
  out+='<text x="'+SOL_PAD+'" y="'+(SOL_PAD+50)+'" font-size="12" fill="#94a3b8">Where each moon sits on its orbit is not solved for here \u2014 watch the motion, not the position.</text>';
  return out;
}

/* small: not drawn on this page */
/* transfer: not drawn on this page */

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

  /* WHAT THIS PAGE CAN DRAW. Every optional module's entry points are behind
     one of these, so a URL parameter or a stray button cannot ask for a layer
     whose code was left out of this file. */
  var SOL_HAS={"core":1,"globe":1,"moon":0,"sat":1,"small":0,"transfer":0};
  /* The page's own configuration, baked in rather than read from a
     window.AC_SOL the surrounding page had to set: this file is unique to this
     page now, so its config belongs in it. */
  var CFG={"rung":"neptune-moons","path":"/neptune-and-moons-simulator/","tilt":50};
  var RUNG=CFG.rung||'inner', START=null, OFF=0, SPAN='year', PLAY=0, SPEED=15;
  /* THE VIEW OPENS TILTED. Straight down is the exact view and stays one drag
   away, but the page's job is to make people look, and a disc seen at an angle
   reads as a system where a set of concentric rings reads as a dartboard.
   TILT_DEF (up in the generator) is the only place the default is decided —
   the slider's baked value comes from the same constant, so the control and
   the drawing cannot open disagreeing. */
  var SOL_TILT0=(CFG&&CFG.tilt!=null)?CFG.tilt:50;
  /* A PAGE THAT IS ABOUT THE BELT OPENS WITH THE BELT ON. /asteroid-belt/ used
     to load its simulator with the belt layer OFF, so the one thing the page is
     named after was the one thing not in the picture. Same for /comets/. The
     URL parameters below can still override either way. */
  var LAYER={belt:(CFG&&CFG.belt)?1:0,comets:(CFG&&CFG.comets)?1:0};
  /* A DESTINATION PAGE OPENS WITH ITS OWN FLIGHT DRAWN. /rocket-launch-
     simulator/mars/ is about that crossing, so arriving to a picture with no
     path on it and a "Nowhere yet" button lit would be the belt page opening
     with the belt off, again. ?to= can still override. */
  var TARGET=(CFG&&CFG.to)?CFG.to:0, SOLN=null, TILT=SOL_TILT0, WINS=[], WIN=0;
  /* HOW MUCH OF A MOON SYSTEM IS DRAWN. 1 is what the picture has always shown
     and stays the default, so nobody's existing link changes what it opens. */
  var MOONLVL=(CFG&&CFG.moons)?CFG.moons:1;
  /* THE DESTINATION MAPS LIVE UP HERE, above the boot block, because a
     destination page now opens with TARGET already set — so markDest() reads
     DEST_SLUG during boot. Declared further down (where the buttons are bound)
     they were var-hoisted but still unassigned at that moment, and the first
     load of /rocket-launch-simulator/mars/ threw on DEST_SLUG[3]. */
  /* the planets' own pages, from the registry rather than built out of a slug
     — they are flat URLs now (/mars-and-moons-simulator/), not children of the
     solar hub, and a second copy of that rule here would rot the first time
     one moved */
  var DEST_SLUG={"3":"/mars-and-moons-simulator/","4":"/jupiter-and-moons-simulator/","5":"/saturn-and-moons-simulator/"};
  /* THE FRAME FOLLOWS THE FLIGHT. A trip to Mars was drawn on the belt view,
     3.75 AU wide, which put Mars's orbit in the middle third of the picture
     and spent the rest of it on empty sky. Each destination now gets the rung
     whose frame its own orbit fills. */
  var DEST_RUNG={3:'mars',4:'jupiter',5:'saturn'};

  /* HOW MUCH THE ORBIT TILTS ARE EXAGGERATED depends on how tilted the VIEW is,
     because that is what decides whether they are visible at all. A real
     inclination of 0.8-7 degrees shows as z.sin(view), so at a shallow view it
     needs multiplying and at a steep one it does not — and multiplying it there
     anyway turns a readable picture into a tangle. Reported in the read-out
     either way, so the number on screen is always the number being drawn. */
  function tiltExag(){ return solTiltExag(TILT); }
  function solTiltExag(t){ return t<8 ? 1 : Math.max(1,Math.min(10,Math.round(360/t))); }
  var SHARE='', URLT=0;
  var SPAN_MIN={month:43200,year:525960,decade:5259600,century:52596000};
  /* The elements are JPL's 1800-2050 table with linear rates. Outside that the
     rates keep extrapolating and the picture keeps looking plausible, so the
     date field stops at 2050 and the note below says so whenever a long span
     carries the drawn instant past it. */
  var VALID0=Date.parse('1800-01-01T00:00:00Z'), VALID1=Date.parse('2050-12-31T23:59:00Z');
  var SPAN_STEP={month:15,year:180,decade:1800,century:18000};
  var SPAN_WORD={month:'a month',year:'a year',decade:'ten years',century:'a hundred years'};
  function $(id){ return document.getElementById(id); }
  function when(){ return START+OFF*60000; }
  function fmt(o){ try{ return new Intl.DateTimeFormat('en-US',o).format(new Date(when())); }catch(e){ return '\u2014'; } }
  function dfmt(ms){ try{ return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(new Date(ms)); }catch(e){ return '\u2014'; } }
  function localValue(ms){
    try{ var ps=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
      function g(t){ for(var i=0;i<ps.length;i++) if(ps[i].type===t) return ps[i].value; return '00'; }
      /* DATE ONLY. The hour never earned its place here: the fastest thing on
         this page is Mercury, which moves about four degrees in a day, so a
         picture set to 09:15 and one set to 21:15 are the same picture. The
         instant is still carried to the minute underneath — only the FIELD is
         a date, and setting it keeps whatever time of day was already there. */
      return g('year')+'-'+g('month')+'-'+g('day');
    }catch(e){ return ''; }
  }
  function opts(){ return { belt:LAYER.belt, comets:LAYER.comets, transfer:TARGET, transferSolution:SOLN, tilt:TILT, tiltExag:tiltExag(), moonLevel:MOONLVL }; }

  function paint(){
    var t=when(), rung=solRung(RUNG);
    $('sol-fig').innerHTML=solSvg(t,RUNG,opts());
    /* no weekday. It changes on every frame while this plays, which makes it the
       most restless thing on the line and the least informative: nothing on this
       page happens on a Tuesday. */
    $('sol-when').textContent=fmt({year:'numeric',month:'long',day:'numeric'})
      +(SPAN==='month'?', '+fmt({hour:'numeric',minute:'2-digit'}):'');
    var sl=$('sol-slider');
    sl.max=SPAN_MIN[SPAN]; sl.step=SPAN_STEP[SPAN];
    if(document.activeElement!==sl) sl.value=OFF;
    var f=$('sol-start'); if(f&&document.activeElement!==f) f.value=localValue(START);
    $('sol-from').textContent=dfmt(START);
    $('sol-to').textContent=dfmt(START+SPAN_MIN[SPAN]*60000);
    rows(t,rung); note(rung); enable(rung); share();
  }
  /* the belt, the comets and the flight path are all drawn around the SUN, so
     on a moon system they have nothing to draw. Turn them off rather than leave
     three controls that silently do nothing. */
  function enable(rung){
    var on=rung[4]==='sys';
    /* A LAYER SWITCH IS ONLY LIVE IF ITS LAYER WOULD BE IN THE FRAME. The belt
       starts at the 4:1 resonance with Jupiter, 2.06 AU, which is outside the
       inner-planets rung entirely — so on that rung the button was pressable
       and did nothing. smBeltIn/smCometsIn answer from the same numbers the
       drawing itself uses, so the switch and the picture cannot disagree. */
    if($('sol-belt')) $('sol-belt').disabled=!(on&&SOL_HAS.small&&smBeltIn(rung[2]));
    if($('sol-comets')) $('sol-comets').disabled=!(on&&SOL_HAS.small&&smCometsIn(rung[2]));
    /* the destination buttons live on a page whose rungs are all heliocentric,
       so there is nothing left here to dim */
  }

  /* the read-out. What it says depends on what is being drawn, because "2.4 AU
     at 137 degrees" is the wrong answer for a picture of Jupiter's moons. */
  function rows(t,rung){
    var box=$('sol-rows'); if(!box) return;
    var out='', i;
    if(rung[4]==='em'){
      var il=mnIllum(t);
      out+=row('Moon phase',mnName(il.phase),1)
        +row('Lit',Math.round(il.fraction*100)+'%')
        +row('Distance',Math.round(il.dist).toLocaleString('en-US')+' km')
        +row('In Earth diameters',(il.dist/12742).toFixed(1));
    } else if(rung[4]==='moons'){
      var sys=SAT_SYS[rung[5]];
      for(i=0;i<sys.moons.length;i++){
        var m=sys.moons[i], per=Math.abs(m[2]);
        out+=row(m[0],(m[1]>=1e6?(m[1]/1e6).toFixed(2)+'M':Math.round(m[1]/1000)+'k')+' km \u00b7 '
          +(per<1?(per*24).toFixed(1)+' h':per.toFixed(per<10?2:1)+' d')+(m[2]<0?' \u21ba':''));
      }
    } else {
      for(i=0;i<rung[3];i++){
        var p=plPos(i,t);
        out+=row(plName(i),p.r.toFixed(2)+' AU \u00b7 '+Math.round(p.lon)+'\u00b0',i===2);
      }
      if(TARGET&&SOLN){
        var e=plPos(2,t), q=plPos(TARGET,t);
        var sep=Math.sqrt((e.x-q.x)*(e.x-q.x)+(e.y-q.y)*(e.y-q.y)+(e.z-q.z)*(e.z-q.z));
        out+=row('Earth to '+plName(TARGET),sep.toFixed(3)+' AU',1);
      }
    }
    box.innerHTML=out;
  }
  function row(k,v,main){ return '<div class="sun-srow'+(main?' sun-main':'')+'"><span>'+solEsc(k)+'</span><b>'+v+'</b></div>'; }

  /* one line under the picture saying what this rung is and is not */
  function note(rung){
    var el=$('sol-note'); if(!el) return;
    var s='';
    if(rung[4]==='em') s='Earth and the Moon, to scale in size <b>and</b> distance \u2014 the only view here that is both.';
    else if(rung[4]==='moons') s='The orbits and the planet\u2019s disc are to scale against each other. Where each moon sits on its orbit is <b>not</b> solved for \u2014 watch the motion, not the position.';
    else s='Orbits to scale; the planets themselves are drawn big enough to see. Positions are good to about ten arcminutes \u2014 well under a pixel here.';
    var t=when();
    if(t<VALID0||t>VALID1) s+=' <b>Beyond 1800\u20132050</b> the orbital elements are being extrapolated, so this is the right shape of the system but no longer the right positions.';
    /* WHAT THE FLIGHT PATH IS, AND IS NOT. It is the minimum-energy transfer:
       the cheapest route there is, and the one launch windows are defined
       against. It is not what anybody flies to the outer planets, and drawing
       it without saying so let the page imply that it is. The burn figure
       beside it is the tell — 7.3 km/s out of low Earth orbit is more than any
       launcher has ever given a real spacecraft, which is exactly why Galileo,
       Cassini and Juno all went the long way round instead. */
    if(TARGET) s+=' The path drawn is the <b>minimum-energy</b> transfer \u2014 the cheapest, and the slowest. Real missions to Jupiter and Saturn do not fly it: the burn it needs is bigger than any launcher provides, so Galileo, Cassini and Juno all borrowed speed from other planets on the way \u2014 longer in time, far cheaper in fuel. Cassini took 6 years 8 months and four flybys to reach Saturn.';
    el.innerHTML=s;
  }

  /* the flight path. Solved in the browser from the date on screen, so it is
     never a date baked into a page months ago. */
  /* THE SPAN HAS TO COVER THE CROSSING. A Hohmann transfer to Saturn takes about
     six years and to Jupiter nearly three, so a slider covering one year cannot
     reach the arrival at all — you would drag to the end and the ship would
     still be somewhere past Mars. Mars fits inside a year; anything longer takes
     the decade, and anything longer than the decade takes the century. Picked
     from the flight time the solver returns, so it cannot be wrong for a target
     added later. */
  function fitSpan(w){
    if(!w) return;
    var days=w.tf/86400000;
    SPAN = days<330 ? 'year' : days<3300 ? 'decade' : 'century';
    if($('sol-span')) $('sol-span').value=SPAN;
    if(OFF>SPAN_MIN[SPAN]) OFF=SPAN_MIN[SPAN];
  }
  /* the figures for whichever window is selected — split out from retarget so
     picking a different launch date rewrites them without re-solving the list */
  /* where the flight sits inside the span the slider covers, as a percentage
     of it. Clamped rather than hidden when it runs past the end: a crossing to
     Saturn is longer than a year, and cutting the bar off at the edge says
     exactly that. */
  function flightBar(){
    var w=$('sol-flight'), bar=$('sol-flight-bar');
    if(!w||!bar) return;
    if(!TARGET||!SOLN){ w.hidden=true; return; }
    var total=SPAN_MIN[SPAN]*60000, t0=SOLN.t0-START, t1=SOLN.t0+SOLN.tf-START;
    if(t1<=0||t0>=total){ w.hidden=true; return; }
    var a=Math.max(0,t0)/total*100, b=Math.min(total,t1)/total*100;
    w.hidden=false;
    /* sit the band exactly on the track by MEASURING it rather than guessing a
       pixel offset — the slider is a different height in full screen */
    var sl=$('sol-slider');
    if(sl){ w.style.top=sl.offsetTop+'px'; w.style.height=sl.offsetHeight+'px'; }
    bar.style.left=a.toFixed(2)+'%';
    bar.style.width=Math.max(0.6,b-a).toFixed(2)+'%';
    bar.className='sol-flight-bar'+(t0<0?' sol-flight-cutl':'')+(t1>total?' sol-flight-cutr':'');
  }
  function missionRows(){
    var box=$('sol-mission'); if(!box) return;
    if(!TARGET||!SOLN){ box.innerHTML=''; return; }
    var c=trCost(TARGET,SOLN), nm=plName(TARGET);
    box.innerHTML=row('Launch',dfmt(SOLN.t0),1)
      +row('Arrives at '+nm,dfmt(SOLN.t0+SOLN.tf))
      +row('Flight time',Math.round(SOLN.tf/86400000).toLocaleString('en-US')+' days')
      +row('Burn to leave Earth orbit',c.injection.toFixed(2)+' km/s');
  }
  function retarget(){
    if(!TARGET){ SOLN=null; WIN=0; fillWindows(); missionRows(); flightBar(); return; }
    WIN=0; fillWindows();
    markDest();
    SOLN=WINS.length?WINS[0]:trWindow(TARGET,Date.now());
    fitSpan(SOLN); missionRows(); flightBar();
  }

  function share(){
    var q='date='+localValue(when()).slice(0,10)+'&zoom='+RUNG+'&span='+SPAN;
    if(SPEED!==1) q+='&speed='+SPEED;
    /* the view angle travels with the link, so a shared picture arrives at the
       angle it was shared at rather than snapping back to the page default */
    if(Math.round(TILT)!==Math.round(SOL_TILT0)) q+='&tilt='+Math.round(TILT);
    if(MOONLVL>1) q+='&moons='+MOONLVL;
    if(LAYER.belt) q+='&belt=1';
    if(LAYER.comets) q+='&comets=1';
    if(TARGET) q+='&to='+TARGET;
    var url=location.origin+(CFG.path||'/solar-system-simulator/')+'?'+q;
    SHARE=url;
    var o=$('sol-url'); if(o) o.value=url;
    var s=$('sol-sum');
    if(s){ var rung=solRung(RUNG);
      s.innerHTML='Opens on <b>'+fmt({weekday:'long',year:'numeric',month:'long',day:'numeric'})
        +'</b>, showing <b>'+solEsc(rung[1])+'</b>, with the slider covering <b>'+SPAN_WORD[SPAN]+'</b>'
        +(TARGET?' and the flight path to <b>'+plName(TARGET)+'</b>':'')+'.'; }
    pushUrl();
  }
  /* The share BOX is rewritten on every repaint (it is one property write). The
     ADDRESS BAR is not: Safari rate-limits history.replaceState to 100 calls
     per 30 seconds and throws past that, which a 40ms Play loop exhausted in
     about four seconds — after which the catch swallowed the error and the URL
     silently stopped tracking the view. So it is debounced, and skipped
     entirely while Play runs; stop() writes the final one. */
  function pushUrl(){
    if(PLAY) return;
    if(URLT) clearTimeout(URLT);
    URLT=setTimeout(function(){ URLT=0; try{ history.replaceState(null,'',SHARE); }catch(e){} },500);
  }
  function stop(){ if(PLAY){ clearInterval(PLAY); PLAY=0; var b=$('sol-play'); b.textContent='Play'; b.setAttribute('aria-pressed','false'); pushUrl(); } }
  /* the speed read-out is the honest version of a 1x-16x dial: it says how much
     TIME goes by per second of watching, which is the thing that changes. */
  /* SPEED IS ABSOLUTE, NOT A FRACTION OF THE SPAN. It used to be a multiplier on
     "sweep the whole span in 24 seconds", which meant the same slider position
     ran the planets at 1.25 days a second over a month and 125 over a decade —
     the one control whose whole job is how fast the planets move was the one
     control that changed meaning every time you touched a different one.
     SOL_DPS is that rate at speed 1, DERIVED from the setting it is meant to
     match — the year span, which is what the slider was calibrated against — so
     the familiar speeds land exactly where they always did and every other span
     now agrees with them. The span is left doing only what its name says: how
     much time the slider covers. */
  /* THE RANGE DEPENDS ON WHAT IS ON SCREEN, because the thing being watched is
     four orders of magnitude different between the two kinds of view. Io goes
     round Jupiter in 42 hours and Neptune round the sun in 165 years; one slider
     range cannot serve both, and the one range there was made every moon system
     a blur before it had moved a pixel of Neptune. So a moon view runs from 3
     hours to 4 days of sky per second, and a heliocentric one from 3 days to 90.
     SPEED is that figure directly — days of sky per real second — not a
     multiplier on anything, so the number beside the slider IS the setting. */
  var SOL_RATE={ sys:[3,90,1], moons:[0.125,4,0.125] };
  function rateFor(){ var r=solRung(RUNG); return SOL_RATE[r[4]==='sys'?'sys':'moons']; }
  function syncSpeed(){
    var r=rateFor(), el=$('sol-speed');
    if(SPEED<r[0]||SPEED>r[1]) SPEED=r[0];
    if(el){ el.min=String(r[0]); el.max=String(r[1]); el.step=String(r[2]); el.value=String(SPEED); }
    speedLabel();
  }
  function speedLabel(){
    var perSec=SPEED;                                 /* days of sky per second */
    var el=$('sol-speedout'); if(!el) return;
    var s;
    if(perSec<1) s=(perSec*24).toFixed(1)+' hours';
    else if(perSec<400) s=perSec.toFixed(perSec<10?1:0)+' days';
    else s=(perSec/365.25).toFixed(perSec/365.25<10?1:0)+' years';
    el.textContent=s+' per second';
  }

  /* CAN THIS PAGE DRAW THAT RUNG? A moon rung needs the satellite module and
     the Earth-and-Moon rung needs the lunar one, and a page that does not draw
     them no longer carries the code. So a ?zoom= naming a rung this file cannot
     draw is ignored rather than obeyed into a ReferenceError — the link still
     resolves, it just opens the page at its own view. Every rung has a page of
     its own now, so the honest destination for that link exists. */
  function rungOk(id){
    var r=solRung(id); if(r[0]!==id) return 0;
    if(r[4]==='moons') return !!SOL_HAS.sat;
    if(r[4]==='em') return !!SOL_HAS.moon;
    return 1;
  }

  /* boot */
  var q0=null; try{ q0=new URLSearchParams(location.search); }catch(e){}
  if(q0){ if(rungOk(q0.get('zoom'))) RUNG=q0.get('zoom');
    if(SPAN_MIN[q0.get('span')]) SPAN=q0.get('span');
    /* the layers and the flight path are only offered where their module is */
    if(SOL_HAS.small&&q0.get('belt')) LAYER.belt=1;
    if(SOL_HAS.small&&q0.get('comets')) LAYER.comets=1;
    var sp=parseFloat(q0.get('speed')); if(sp>0&&sp<=90) SPEED=sp;
    /* TILT IS A URL VARIABLE TOO. It was config-only, so the one control that
       changes the picture most could not be linked to or shared — the share
       box below now writes it, and this reads it back. 0 is straight down
       (the exact view) and 90 is edge-on. */
    var tl=parseFloat(q0.get('tilt')); if(tl>=0&&tl<=90) TILT=SOL_TILT0=tl;
    /* how much of the moon system to draw. Clamped inside satView too, so a
       level this planet does not have degrades to the most it does. */
    var ml=parseInt(q0.get('moons'),10); if(SOL_HAS.sat&&ml>=1&&ml<=3) MOONLVL=ml;
    if(SOL_HAS.transfer){ var to=parseInt(q0.get('to'),10); if(to>=3&&to<=5) TARGET=to; }
    var d=q0.get('date'); if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){ var dt=Date.parse(d+'T12:00:00Z');
      if(!isNaN(dt)) START=Math.max(VALID0,Math.min(VALID1,dt)); } }
  if(!START) START=Date.now()-(Date.now()%60000);
  markZoom(); $('sol-span').value=SPAN;
  if($('sol-belt')) $('sol-belt').setAttribute('aria-pressed',LAYER.belt?'true':'false');
  if($('sol-comets')) $('sol-comets').setAttribute('aria-pressed',LAYER.comets?'true':'false');
  if($('sol-dests')) markDest();

  if($('sol-tilt')) $('sol-tilt').value=String(TILT);
  /* the controls shipped disabled (and Now hidden) because without this script
     not one of them could do anything. This is the moment they become real. */
  /* ---- full screen -------------------------------------------------------
     The stage is the figure and the read-out side by side, which is already
     the right shape for a landscape screen, so unlike the Sun-Earth-Moon view
     there is nothing to rotate: this drawing is square and reads the same way
     whichever way a phone is held. */
  var solStage=document.querySelector('.sol-stage'), solFsBtn=$('sol-fs');
  function solFsOn(){ return document.fullscreenElement===solStage||document.webkitFullscreenElement===solStage; }
  function solFsSync(){
    if(!solFsBtn) return;
    var on=solFsOn();
    solFsBtn.setAttribute('aria-pressed',on?'true':'false');
    var l=solFsBtn.querySelector('.sol-fslab'); if(l) l.textContent=on?'Exit full screen':'Full screen';
  }
  function solToggleFs(){
    if(!solStage) return;
    if(solFsOn()){ (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document); return; }
    var req=solStage.requestFullscreen||solStage.webkitRequestFullscreen;
    if(req) req.call(solStage);
  }
  if(solFsBtn&&solStage&&(solStage.requestFullscreen||solStage.webkitRequestFullscreen)) solFsBtn.addEventListener('click',solToggleFs);
  else if(solFsBtn) solFsBtn.hidden=true;
  document.addEventListener('fullscreenchange',solFsSync);
  document.addEventListener('webkitfullscreenchange',solFsSync);
  /* ?fs=1 means "opened from a Full screen link". Full screen NEEDS a user
     gesture and a navigation is not one, so this arms the next tap or key
     press instead of trying (and being refused) on load. Once only. */
  if(q0&&q0.get('fs')&&solStage){
    var armS=function(){ document.removeEventListener('pointerdown',armS); document.removeEventListener('keydown',armS); solToggleFs(); };
    document.addEventListener('pointerdown',armS); document.addEventListener('keydown',armS);
  }

  var inert=document.querySelectorAll('[data-sol-inert]');
  for(var ii=0;ii<inert.length;ii++){ inert[ii].disabled=false; inert[ii].removeAttribute('hidden'); inert[ii].removeAttribute('data-sol-inert'); }
  retarget(); syncSpeed(); tiltLabel(); markMoons(); paint();

  $('sol-slider').addEventListener('input',function(){ OFF=+this.value||0; stop(); paint(); });
  $('sol-span').addEventListener('change',function(){ SPAN=this.value; if(OFF>SPAN_MIN[SPAN]) OFF=SPAN_MIN[SPAN]; flightBar(); paint(); });
  /* THE LADDER, as buttons. One handler on the group rather than one per
     button, and markZoom is the single place that says which is current — the
     select it replaces was being set from four different places. */
  function markZoom(){
    var bs=document.querySelectorAll('[data-sol-zoombtn]'), i;
    for(i=0;i<bs.length;i++) bs[i].setAttribute('aria-pressed',bs[i].getAttribute('data-sol-zoombtn')===RUNG?'true':'false');
  }
  /* A CONTROL THAT SAYS "ASTEROID BELT" HAS TO SHOW THE ASTEROID BELT. The
     belt rung is named after the belt, and choosing it while the belt layer was
     off left you looking at the gap where the belt would be. It only ever turns
     a layer ON — if you switch it off by hand it stays off until you ask for
     that view again. */
  function layerFor(r){
    /* ...on a page that carries the belt's elements. Without SOL_HAS.small this
       would switch on a layer whose drawing code was left out of this file. */
    if(SOL_HAS.small&&r==='belt'&&!LAYER.belt){ LAYER.belt=1;
      if($('sol-belt')) $('sol-belt').setAttribute('aria-pressed','true'); }
  }
  var zoomBox=$('sol-zooms');
  if(zoomBox) zoomBox.addEventListener('click',function(e){
    var b=e.target.closest('[data-sol-zoombtn]'); if(!b) return;
    RUNG=b.getAttribute('data-sol-zoombtn'); layerFor(RUNG); markZoom(); syncSpeed(); markMoons(); paint(); share();
  });
  $('sol-start').addEventListener('change',function(){
    /* keep the time of day that is already set and move only the date, so
       stepping a day forward does not silently jump the clock to midnight */
    var d=new Date(START), t=Date.parse(this.value+'T00:00:00');
    if(!isNaN(t)){ var n=new Date(t); n.setHours(d.getHours(),d.getMinutes(),0,0);
      START=Math.max(VALID0,Math.min(VALID1,+n)); paint(); } });
  $('sol-now').addEventListener('click',function(){ START=Date.now()-(Date.now()%60000); OFF=0; stop(); paint(); });
  $('sol-play').addEventListener('click',function(){
    if(PLAY){ stop(); return; }
    this.textContent='Pause'; this.setAttribute('aria-pressed','true');
    /* minutes of sky per 40ms tick = days-per-second x 1440 / 25 */
    PLAY=setInterval(function(){ OFF+=SPEED*57.6; if(OFF>SPAN_MIN[SPAN]) OFF=0; paint(); },40);
  });
  if($('sol-speed')) $('sol-speed').addEventListener('input',function(){ SPEED=+this.value||1; speedLabel(); share(); });
  /* the tilt repaints and nothing else — it changes the VIEW, not the instant,
     so the date, the span and the slider position all stay exactly where they
     were and you can tilt while it is playing */
  /* THE MOON-DETAIL CONTROL. Only shown where there is more to show: a moons
     rung whose planet has a level 2 at all. Mars and Pluto have every moon
     they own already in the picture, so on those the field stays hidden rather
     than offering a button that changes nothing. */
  function markMoons(){
    var f=$('sol-moonfield'); if(!f) return;
    var r=solRung(RUNG), idx=r[5], on=SOL_HAS.sat&&r[4]==='moons'&&satMaxLevel(idx)>1;
    f.hidden=!on;
    if(!on) return;
    var mx=satMaxLevel(idx), bs=f.querySelectorAll('[data-sol-moons]'), i, lv;
    for(i=0;i<bs.length;i++){
      lv=+bs[i].getAttribute('data-sol-moons');
      /* a level this planet does not have is removed, not disabled — there is
         nothing behind it to explain */
      bs[i].hidden=lv>mx;
      bs[i].setAttribute('aria-pressed',lv===MOONLVL?'true':'false');
      bs[i].title=satDrawn(idx,lv)+' moons drawn';
    }
    var out=$('sol-moonsout');
    if(out){
      var drawn=satDrawn(idx,MOONLVL), total=satCount(idx);
      out.innerHTML='Drawing <b>'+drawn+'</b> of '+plName(idx)+"'s <b>"+total+'</b> confirmed moon'+(total===1?'':'s')
        +(drawn<total ? '. The rest are a few km of captured rubble on distant tilted orbits — real, but a dot for each would say something false about what a moon system looks like.' : '.');
    }
  }
  var moonBox=$('sol-moons');
  if(moonBox) moonBox.addEventListener('click',function(e){
    var b=e.target.closest('[data-sol-moons]'); if(!b) return;
    MOONLVL=+b.getAttribute('data-sol-moons')||1;
    markMoons(); paint(); share();
  });
  function tiltLabel(){ var el=$('sol-tiltout'); if(!el) return;
    /* THE EXAGGERATION IS A HELIOCENTRIC FACT AND IS ONLY CLAIMED THERE.
       It multiplies each planet's height off the ecliptic, which is a thing
       only solSystemView draws. A moon view models no per-moon inclination at
       all — the orbits are drawn in the planet's equatorial plane — so the
       read-out saying "orbit tilts x7" on Jupiter's moons was reporting a
       correction that nothing was applying. */
    var ex=solRung(RUNG)[4]==='sys' ? tiltExag() : 1;
    el.textContent = TILT<1 ? 'flat — straight down on the plane'
      : TILT+'°' + (ex>1 ? ' · orbit tilts ×'+ex : '');
    var st=$('sol-stage'); if(st) st.classList.toggle('sol-tilted',TILT>=1); }
  if($('sol-tilt')) $('sol-tilt').addEventListener('input',function(){ TILT=+this.value||0; tiltLabel(); paint(); share(); });
  /* the launch windows for the chosen target, listed rather than assumed */
  function fillWindows(){
    var sel=$('sol-launch'), row=$('sol-launchrow');
    if(!sel||!row) return;
    if(!TARGET){ row.hidden=true; sel.innerHTML=''; WINS=[]; return; }
    WINS=trWindows(TARGET,Date.now(),6)||[];
    row.hidden=!WINS.length;
    sel.innerHTML=WINS.map(function(w,i){
      return '<option value="'+i+'">'+dfmt(w.t0)+' — '+Math.round(w.tf/86400000)+' day flight</option>';
    }).join('');
    if(WIN>=WINS.length) WIN=0;
    sel.value=String(WIN);
  }
  if($('sol-launch')) $('sol-launch').addEventListener('change',function(){
    WIN=parseInt(this.value,10)||0;
    var w=WINS[WIN]; if(!w) return;
    SOLN=w;
    /* go to the launch day, and make the slider cover the crossing: a 265-day
       flight scrubbed over a month shows nothing, and over a century it is one
       pixel of the track */
    START=w.t0; OFF=0;
    fitSpan(w); stop(); missionRows(); flightBar(); paint(); share();
  });
  /* pressed state lives in aria-pressed, which is what a screen reader reads
     and what the stylesheet lights up — one source, not a class beside it */
  function layerBtn(id,key){
    var b=$(id); if(!b) return;
    b.addEventListener('click',function(){
      LAYER[key]=LAYER[key]?0:1;
      b.setAttribute('aria-pressed',LAYER[key]?'true':'false');
      paint();
    });
  }
  layerBtn('sol-belt','belt'); layerBtn('sol-comets','comets');
  /* THE DESTINATION BUTTONS. Choosing one picks the next launch window, moves
     the starting date to that day and sizes the span to cover the crossing —
     so the picture jumps, and the read-out under the buttons says where to and
     offers the page about the place. */
  function markDest(){
    var bs=document.querySelectorAll('[data-sol-dest]'), i;
    for(i=0;i<bs.length;i++)
      bs[i].setAttribute('aria-pressed',(+bs[i].getAttribute('data-sol-dest'))===TARGET?'true':'false');
    var L=$('sol-destlink');
    if(L){
      if(!TARGET){ L.hidden=true; L.innerHTML=''; }
      else { L.hidden=false;
        L.innerHTML='Flying to <b>'+plName(TARGET)+'</b>. '
          +'<a href="'+DEST_SLUG[TARGET]+'">More about '+plName(TARGET)+' →</a>'; }
    }
  }
  var db=$('sol-dests');
  if(db) db.addEventListener('click',function(e){
    var b=e.target.closest('[data-sol-dest]'); if(!b) return;
    TARGET=parseInt(b.getAttribute('data-sol-dest'),10)||0;
    if(TARGET) RUNG=DEST_RUNG[TARGET]||'belt';
    markDest(); retarget(); paint(); share(); });
  var zs=document.querySelectorAll('[data-sol-zoom]');
  for(var zi=0;zi<zs.length;zi++) zs[zi].addEventListener('click',function(){
    RUNG=this.getAttribute('data-sol-zoom'); layerFor(RUNG); markZoom(); syncSpeed(); paint(); share(); });
  /* "take me to that date" — the launch windows and closest approaches on the
     page are links into the picture, not just numbers in a table */
  var js=document.querySelectorAll('[data-sol-date]');
  for(var ji=0;ji<js.length;ji++) js[ji].addEventListener('click',function(e){
    e.preventDefault();
    var t=Date.parse(this.getAttribute('data-sol-date')+'T12:00:00Z');
    if(isNaN(t)) return;
    START=t; OFF=0; stop();
    var z=this.getAttribute('data-sol-zoom2'); if(z){ RUNG=z; markZoom(); }
    var to=this.getAttribute('data-sol-target');
    if(to){ TARGET=parseInt(to,10); markDest(); retarget(); }
    paint();
    var fig=$('sol-fig'); if(fig&&fig.scrollIntoView) fig.scrollIntoView({behavior:'smooth',block:'center'});
  });
  /* HOVER + CLICK ON THE PLANETS THEMSELVES. Bound to #sol-fig ONCE, here,
     rather than to each circle/polyline: paint() replaces #sol-fig's
     CONTENTS every repaint (up to 25 times a second while playing) but never
     the element itself, so one delegated listener survives every repaint —
     rebinding per shape, per frame would be the expensive way to do this.
     Only "sys" rungs draw data-sol-planet at all (see solSystemView in
     planets.mjs), so on every other rung this listener simply never matches
     anything. */
  var solFig=$('sol-fig'), solTip=$('sol-ptip'), solHoverKey=null;
  function solPlanetEls(key){ return solFig.querySelectorAll('[data-sol-planet="'+key+'"]'); }
  function solClearHover(){
    if(solHoverKey){ var els=solPlanetEls(solHoverKey),hi; for(hi=0;hi<els.length;hi++) els[hi].classList.remove('sol-hoverlit'); }
    solHoverKey=null; if(solTip) solTip.hidden=true;
  }
  function solSetHover(el,x,y){
    var key=el.getAttribute('data-sol-planet');
    if(key!==solHoverKey){
      solClearHover(); solHoverKey=key;
      var els=solPlanetEls(key),hi; for(hi=0;hi<els.length;hi++) els[hi].classList.add('sol-hoverlit');
      if(solTip){
        var moons=el.getAttribute('data-sol-moons')==='1';
        solTip.textContent='Click to see '+key+(key==='Earth'?' & the Moon':moons?' and its moons':'')+' →';
        solTip.hidden=false;
      }
    }
    if(solTip){ solTip.style.left=x+'px'; solTip.style.top=y+'px'; }
  }
  if(solFig){
    solFig.addEventListener('pointermove',function(e){
      var el=e.target.closest&&e.target.closest('[data-sol-planet]');
      if(el) solSetHover(el,e.clientX,e.clientY); else solClearHover();
    });
    solFig.addEventListener('pointerleave',solClearHover);
    /* click navigates straight to that planet's own page — the same
       destination the tooltip just named */
    solFig.addEventListener('click',function(e){
      var el=e.target.closest&&e.target.closest('[data-sol-planet]');
      if(!el) return;
      var slug=el.getAttribute('data-sol-slug');
      if(slug) location.href='/solar-system-simulator/'+slug+'/';
    });
  }
  var cp=$('sol-copy');
  if(cp) cp.addEventListener('click',function(){ var el=$('sol-url'); el.select();
    try{ navigator.clipboard.writeText(el.value); cp.textContent='Copied'; setTimeout(function(){ cp.textContent='Copy link'; },1600); }catch(e){} });
})();

/* THE PLANET'S OWN GLOBE, on the pages that draw one. Its own IIFE. It used to
   ride along in the one shared file and fall out at the first line on pages
   with no globe; now the globe module is only in the file when the page draws
   one, so this block is only emitted then too — and still checks for its box,
   because a planet page can carry the module for its Earth-and-Moon view
   without carrying a #pl-globe. */
(function(){
  var box=document.getElementById('pl-globe'); if(!box) return;
  var nm=box.getAttribute('data-name'), hrs=+box.getAttribute('data-hours')||24,
      retro=box.getAttribute('data-retro')==='1', sec=+box.getAttribute('data-sec')||12;
  if(retro) hrs=-hrs;
  /* one drawn turn every sec seconds, whatever the planet. Worked out as a
     TIME SCALE rather than an angle, so the drawing code is the same function
     the page was baked with and cannot drift from it. */
  var speed=Math.abs(hrs)*3600000/(sec*1000), t0=Date.now(), iv=0;
  function frame(){
    var t=t0+(Date.now()-t0)*speed;
    box.innerHTML='<svg viewBox="0 0 400 400" width="100%" aria-hidden="true">'
      +'<rect width="400" height="400" rx="16" fill="#080d1a"/>'
      +glSvg(nm,t,200,200,glR(nm,192),hrs,0.9)+'</svg>';
  }
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function run(on){ if(iv){ clearInterval(iv); iv=0; } if(on&&!reduce) iv=setInterval(frame,60); }
  document.addEventListener('visibilitychange',function(){ run(!document.hidden); });
  run(!document.hidden);
})();
