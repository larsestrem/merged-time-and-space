/* view-ladder.mjs — the three simulators, presented AS a ladder, at the TOP
 * of each of their pages.
 *
 * The site draws the same machine at three altitudes: one town looking up
 * (the Earth's TURN — day and night, moonrise, the phase), the three bodies
 * together (the Earth's ORBIT and the moon's — the month, the year, the
 * seasons), and the whole solar system (the same clockwork running all eight
 * planets). Each view is honest about a different thing, and the concepts a
 * student actually struggles with — why a day, why a month, why seasons, why
 * a year — only click when the three pictures are held together. That is a
 * relationship the pages themselves have to TEACH, which they cannot do from
 * a link buried at the bottom of the page (where /system/ used to live on
 * its parent's page).
 *
 * So this strip sits directly under the H1 on all three, the same three
 * tiles in the same 1-2-3 order, with "this page" marked. A reader on any
 * rung sees where they are standing and what the other two rungs answer.
 *
 * NO SIDE EFFECTS in this module, ever: build-simulator AND build-solar both
 * import it, and a generator that imports a generator re-runs it (the same
 * trap CLAUDE.md documents for build-tides/build-sun). That is the whole
 * reason this is its own file.
 */

/* THE NAME IS THE WHOLE TILE on a phone (the description is hidden below
 * 760px), so each name has to say what the view actually SHOWS rather than
 * being a slogan — "The sky you actually see" told a reader nothing about
 * where the picture is taken from. Each is phrased as a vantage point, and
 * the three read as one journey outward: standing on the Earth, then above
 * the Earth's orbit, then above the whole system. */
const VIEWS = [
  {
    id: "town",
    href: "/sun-moon-earth-movement-simulator/",
    k: "1 · From a place on Earth",
    name: "Sun & moon from your own town",
    what: "The Earth turns under a marked location: day and night, sunrise, moonrise and tonight's phase.",
  },
  {
    id: "system",
    href: "/earth-sun-moon-orbit-simulator/",
    k: "2 · Step back",
    name: "Earth & the moon's orbit around the sun",
    what: "All three moving at once — the month, the seasons and the year on one screen.",
  },
  {
    id: "solar",
    href: "/solar-system-simulator/",
    k: "3 · Step back again",
    name: "The full solar system",
    what: "Earth's orbit among all eight, from Mercury's 88 days out to Neptune's 165 years.",
  },
];

export function viewLadder(current, { note = "" } = {}) {
  const tiles = VIEWS.map((v, i) => {
    const inner = `<span class="sys-vlad-n" aria-hidden="true">${i + 1}</span>`
      + `<span class="sys-vlad-k">${v.k}</span><b>${v.name}</b><span class="sys-vlad-what">${v.what}</span>`;
    return v.id === current
      ? `      <span class="sys-vlad-tile is-here" aria-current="page">${inner}<span class="sys-vlad-here">You are here</span></span>`
      : `      <a class="sys-vlad-tile" href="${v.href}">${inner}</a>`;
  }).join("\n");
  return `  <nav class="sys-vlad" aria-label="Three views of Earth in the solar system">
    <p class="sys-vlad-lead">Three views of Earth, and how it fits with the rest of the solar system</p>
    <div class="sys-vlad-row">
${tiles}
    </div>
${note}  </nav>
`;
}
