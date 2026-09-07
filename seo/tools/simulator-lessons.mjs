import { activities, questions, relatedTopics } from "./simulator-lesson.mjs";

export const LOCAL_QUESTIONS = [
  ["What does the dot on Earth show?", "It marks the place you chose. Earth spins, so the dot moves into sunlight and then into darkness. That is <a href=\"/day-night-map/\">day and night</a>."],
  ["Why are there two pictures of the Moon?", "The big scene looks down from space. The Moon disc shows the view from the ground. Compare them to see how our view of the Moon’s sunlit half makes its <a href=\"/concepts/why-does-the-moon-change-shape/\">phases</a>."],
  ["Can the Moon be up during the day?", "Yes. The Moon can be above the horizon while the Sun is up too. Look for a time when both height readings are above 0°. Clouds and bright sunlight may make it hard to see outside."],
  ["What do the height numbers mean?", "0° is the horizon, where the sky meets the ground. Positive numbers mean above it. Negative numbers mean below it. 90° is straight overhead. Direction tells you which way to face."],
];
export const localLesson = activities('sim', [
  {key:'day',title:'1. Follow one day',prompt:'When will your place move into darkness?',action:'Show one day',watch:'Press Play. Follow the dot on Earth as it crosses into the dark half.',answer:'Earth spins once in about 24 hours. Your place has day when it faces the Sun, and night when it faces away.'},
  {key:'month',title:'2. Watch the Moon change',prompt:'Will the Moon disc stay the same shape?',action:'Show one month',watch:'Press Play. Compare the Moon’s place in space with the disc seen from the ground.',answer:'We see different amounts of the Moon’s sunlit half. These shapes are called <a href="/concepts/why-does-the-moon-change-shape/">Moon phases</a>.'},
  {key:'next-day',title:'3. Step through the days',prompt:'Will the Moon be in the same place 24 hours later?',action:'Move ahead 24 hours',watch:'Press this button several times. Watch the Moon move while Earth makes each turn.',answer:'The Moon travels along its own orbit while Earth spins. Its position and rise time change from day to day. <a href="/moon/">Explore Moon rise times</a>.'},
]);
export const localAnswers = questions(LOCAL_QUESTIONS, `<h3>One orbit or one phase cycle?</h3><p>The Moon takes about 27.3 days to go around Earth compared with the distant stars. A full cycle of phases takes about 29.5 days. Earth moves around the Sun too, so the Moon must travel a little farther to reach the same Sun angle.</p><p><a href="/concepts/what-is-a-synodic-month/">See why these two months differ</a>.</p>`);
export const localRelated = relatedTopics('/sun-moon-earth-movement-simulator/', [
  ['/earth-sun-moon-orbit-simulator/','Watch Earth and the Moon orbit together','Step back to compare a month with a year.'],
  ['/earth-tilt-sun-seasons/','Why does day length change?','Explore Earth’s tilt and the seasons.'],
  ['/concepts/why-isnt-there-an-eclipse-every-month/','Why isn’t there an eclipse every month?','See the tilt that this top-down view leaves out.'],
]);

export const ORBIT_QUESTIONS = [
  ["What is an orbit?", "An orbit is a path around another object in space. Here, Earth orbits the Sun and the Moon orbits Earth. <a href=\"/concepts/how-does-an-orbit-work/\">See how gravity bends an orbit</a>."],
  ["How long does each trip take?", "Earth takes about 365 days to go around the Sun. The Moon takes about 27 days to go around Earth compared with the stars. That is about 13 Moon orbits during one Earth year."],
  ["Why does the bright side change?", "Sunlight lights the side facing the Sun. As a body moves, we see that lit side from a different angle. <a href=\"/concepts/why-does-the-moon-change-shape/\">Explore Moon phases from Earth</a>."],
  ["Does View angle change Earth’s real tilt?", "No. It changes where you look from. Earth’s axis, the line it spins around, keeps its real lean of about 23.4°. <a href=\"/earth-tilt-sun-seasons/\">See how that lean causes seasons</a>."],
];
export const orbitLesson = activities('sys', [
  {key:'year',title:'1. Compare the two trips',prompt:'How many Moon orbits fit into one Earth year?',action:'Start a year',watch:'Press Play. Follow Earth’s large ring and count the Moon’s smaller loops.',answer:'The Moon makes about 13 trips around Earth while Earth makes one trip around the Sun.'},
  {key:'light',title:'2. Follow the sunlight',prompt:'Which side of each body will be bright?',action:'Look from above',watch:'Press Play. Watch the bright side of Earth and the Moon as they move.',answer:'Each bright side faces the Sun. The Sun lights these worlds; they do not make their own light.'},
  {key:'side',title:'3. Look from the side',prompt:'Does the Moon always stay level with Earth’s large ring?',action:'Look from the side',watch:'Press Play. Watch the Moon move above and below the flat surface of Earth’s orbit.',answer:'The Moon’s orbit is tilted. The tilt helps explain <a href="/concepts/why-isnt-there-an-eclipse-every-month/">why eclipses do not happen every month</a>.'},
]);
export const orbitAnswers = questions(ORBIT_QUESTIONS, `<h3>Two different kinds of tilt</h3><p>Earth’s axis leans about 23.4° from an upright position. The Moon’s orbit tilts about 5° compared with the flat surface of Earth’s orbit. One describes a spinning world. The other describes a path around it.</p><p><a href="/concepts/what-is-earths-axial-tilt/">Explore Earth’s axis</a> or <a href="/concepts/why-isnt-there-an-eclipse-every-month/">explore the Moon’s tilted path</a>.</p>`);
export const orbitRelated = relatedTopics('/earth-sun-moon-orbit-simulator/', [
  ['/sun-moon-earth-movement-simulator/','See the Sun and Moon from your town','Connect these orbits with day, night and Moon phases.'],
  ['/earth-tilt-sun-seasons/','Explore Earth’s tilt and the seasons','Compare sunlight at different times of year.'],
  ['/earth-and-moon-simulator/','How far away is the Moon?','See Earth and the Moon with sizes and distance to scale.'],
  ['/solar-system-simulator/','Compare all eight planets','See where Earth fits in the solar system.'],
]);

export const SOLAR_QUESTIONS = [
  ["Which planet finishes an orbit first?", "Mercury. Its year lasts about 88 Earth days. In one Earth year, Mercury goes around the Sun a little more than four times."],
  ["Why do the outer planets take longer?", "They have much larger paths to travel and move more slowly. Neptune takes about 165 Earth years to go around the Sun. <a href=\"/concepts/how-does-an-orbit-work/\">See how gravity shapes an orbit</a>."],
  ["Why do the inner planets bunch together when I zoom out?", "They really are close to the Sun compared with the outer planets. Zooming out shows more space, so their orbits look smaller. <a href=\"/concepts/why-are-the-planets-drawn-so-close/\">Explore solar-system scale</a>."],
  ["Can I explore a single planet?", "Yes. Click a planet in the drawing to open its page, or use <a href=\"/planets/\">the planet guide</a>. Each planet has its own story. Worlds with moons also have closer views of their moon systems."],
];
export const solarLesson = activities('sol', [
  {key:'race',title:'1. Race the inner planets',prompt:'Which planet will finish first?',action:'Compare one year',watch:'Press Play. Count Mercury’s laps while Earth completes one.',answer:'Mercury finishes a little more than four laps. Planets closer to the Sun have shorter years.'},
  {key:'space',title:'2. See the gaps',prompt:'Are the planets evenly spaced?',action:'Show all eight planets',watch:'Look near the Sun. Can you find the four small inner orbits?',answer:'The planets are not evenly spaced. The outer solar system has much larger gaps. The planet dots are enlarged so you can see them.'},
  {key:'slow',title:'3. Give Neptune more time',prompt:'Will Neptune finish a lap in 100 years?',action:'Compare 100 years',watch:'Drag the time slider from left to right. Follow Neptune’s outer ring.',answer:'No. Neptune completes only about three-fifths of its orbit in 100 Earth years. Its full year takes about 165 Earth years.'},
]);
export const solarAnswers = questions(SOLAR_QUESTIONS, `<h3>What does AU mean?</h3><p>AU is a unit for measuring space. One AU is Earth’s average distance from the Sun, about 150 million kilometres. Neptune is about 30 AU away. That is about 30 times farther from the Sun than Earth.</p><h3>What keeps a planet moving around the Sun?</h3><p>A planet is already moving. The Sun’s <a href="/concepts/why-dont-planets-fall-into-the-sun/">gravity pulls it inward</a> and bends its path. Gravity does not switch off when the planet is far away.</p>`);
export const solarRelated = relatedTopics('/solar-system-simulator/', [
  ['/planets/','Meet the planets','Compare their sizes and what each world is like.'],
  ['/earth-sun-moon-orbit-simulator/','Follow Earth and the Moon','Watch their two orbits at once.'],
  ['/earth-tilt-sun-seasons/','Why do we have seasons?','Compare Earth’s tilt, daylight and orbit.'],
  ['/solar-system-simulator/asteroid-belt/','Explore the asteroid belt','Find the rocky objects between Mars and Jupiter.'],
  ['/solar-system-simulator/comets/','Follow a comet','Watch its long path and its changing speed.'],
  ['/rocket-launch-simulator/','Plan a trip to Mars','Explore why a spacecraft needs the right launch time.'],
]);
