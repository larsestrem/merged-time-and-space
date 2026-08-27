/** Shared Home / Time / Earth / Space / Classroom switcher.
 *  One copy so the four section pages and /classroom/ cannot drift. */
export const SECTION_LINKS = [
  ["/", "Home"],
  ["/time/", "Time"],
  ["/earth/", "Earth"],
  ["/space/", "Space"],
  ["/classroom/", "Classroom"],
];

export function sectionSwitcher(here) {
  return `  <nav class="home-tabs sec-switch" aria-label="Site sections">
${SECTION_LINKS.map(([u, l]) => u === here
    ? `    <span class="chip is-here" aria-current="page">${l}</span>`
    : `    <a class="chip" href="${u}">${l}</a>`).join("\n")}
  </nav>`;
}
