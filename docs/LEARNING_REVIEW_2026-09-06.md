# Time and Space Science: learning review, September 6, 2026

The site's strongest feature is the ability to change something and see the result immediately. Its biggest opportunity is to make each simulator feel like a short investigation with a clear question, a prediction, and an observable answer.

This is a representative review of the homepage, seasons lesson, solar system simulator, Earth and Moon page, and sunrise hub, plus their generator source. It is not a full crawl or a review of every city/countdown page.

| Priority | Finding | Recommended next change | What success looks like |
| --- | --- | --- | --- |
| 1 | Several simulators explain what to try only after the controls and long descriptions. | Put one short investigation beside each simulator. For the solar system: predict how many Mercury orbits fit into one Earth year, then run it. | A new learner can begin a meaningful experiment without reading instructions elsewhere. |
| 1 | The homepage has many simultaneous demonstrations and long sections. | Give the opening screen a few question-led starting points: Why seasons? Why Moon phases? How do orbits work? Keep the demonstrations, but load/run them as they enter view and pause offscreen. | Students choose a question quickly; mobile animation and input stay responsive. |
| 1 | Some wording is clever but harder to understand than the science needs to be. The orbit teaser describes the Sun as no longer being where the planet was falling toward. | Replace that wording with: gravity pulls the planet inward while its sideways motion continually changes its position, producing an orbit. Use a short direct answer before analogy or detail. | A student can explain the cause in their own words without repeating a misleading metaphor. |
| 2 | The Earth page mixes spin period, solar day, and rotations per year, and begins with a line about geology rather than a clear learning question. | Label 23 h 56 min as a rotation relative to distant stars; explain why the noon-to-noon solar day is about 24 hours. Open with what the student can explore. | Learners understand why two different day lengths are both valid. |
| 2 | Controls vary between simulators: dates, spans, speed, and viewing angle compete for attention. | Extend the seasons page's shared pattern: Play/Pause, selected date, timeline, then advanced settings. Keep view angle clearly separate from physical axial tilt. | A learner who uses one simulator understands the next one's basic controls. |
| 2 | The sunrise hub offers many city links but leaves the learning comparison implicit. | Add a two-city comparison using one selected date and a simple day-length difference. Offer a north/south comparison with similar absolute latitudes. | Students can test the effect of latitude without manually copying figures between pages. |
| 2 | The project has an existing classroom pause because submissions are not reaching the owner. | Resolve and verify delivery before restoring teacher submission invitations. Then add short activities by topic, approximate age, and duration. | Teachers can use and contribute activities with a reliable response path. |
| 3 | Models have useful scale disclosures, often farther from the relevant picture than the learner needs. | Keep one short limitation directly under each diagram. Put detailed numerical accuracy and methodology in an expandable section. | Learners distinguish a teaching model from an exact scale drawing. |

## Changes implemented in this branch

- An original, static black star field, sparse at the upper left with faint distant Milky Way detail toward the lower right; no Moon. WebP background about 28 KB.
- A static Earth home button, about 4 KB, with consistent bookmark and structured-data logo images. The Earth art is decorative generated artwork, not a scientific map.
- Primary seasons links route to `/earth-tilt-sun-seasons/` without fixing every visitor to December 31. Existing date, time, year, and view links remain supported. The lesson retains a link to the focused written seasons article.
- One shared date and playback control in Compact, Normal, and Full details. Exact date/time and speed are available in an expandable section; changing the reading mode does not reset time.
- Month-based equinox/solstice buttons, opposite astronomical season labels, the overhead Sun's latitude, and a daylight / midday Sun comparison at 45 degrees north and south.
- A less edge-on orbit view with visible headings and short observation cues in Compact. On smaller screens the diagrams stack and each offers a return link to the shared controls.
- Projector mode retains a plain black background.

## Science and verification notes

The daylight comparison uses ideal horizon geometry without refraction, terrain, weather, or the Sun's apparent radius. The selected season boundaries use the same hourly solar-declination solver as the existing simulator. They are approximate instants, not an authoritative astronomical calendar. Earth's distance variation is explicitly separate from the simplified circular teaching orbit.

Reference: [NASA Space Place: What Causes the Seasons?](https://spaceplace.nasa.gov/seasons/).

Behavioral verification exercises the generated page controller in a DOM harness: one controller, all three diagrams changing, hemispheres, equinox daylight, exact URL state, mode preservation, leap day, invalid dates, stepping, scrubbing, playback rollover, pause/reload, Now, and the standalone day/night map. This does not substitute for a real mobile browser check. Local browser preview is unavailable in this environment; a deployed branch preview should be checked before merging.

The normal full-site build also checks CSS coverage, navigation, internal links, document metadata, and structured data. External link checks are advisory and include unrelated existing date-maintenance findings.

Final results: the full build passed, including CSS coverage, 4,235 page checks, 6,882 reciprocal crosslinks and 230 one-way crosslinks. The solar-system checks passed. The existing standalone day/night check reports a 0.0000012° subsolar-angle rounding discrepancy against its strict tolerance; neither that check nor its solar-math source was changed. The broad external-URL audit did not complete; its existing sports/date advisories are unrelated to this change.

Delivery: the owner explicitly approved publishing these changes to `larsestrem/merged-time-and-space` and deploying them to `timeandspace.science` on September 6, 2026. Deployment and browser verification are tracked in the pull request.
