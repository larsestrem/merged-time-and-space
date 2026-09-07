# Content and learning review: Time and Space Science

Reviewed September 6–7, 2026. Baseline: main at `1564ce3`. Audience: grades 4–6 for the first lesson; optional grade 6–7 explanations farther down.

## Main finding

The site has useful simulations, but the writing often explains how the website was built before helping a child use it. Dense captions, repeated answers, many competing links, and unrelated lessons compete with the drawing. Some comparisons also make stronger scientific claims than the model supports. The remedy is to give each page one clear learning goal, a short experiment, a visible result, and a useful next link.

This release revises the three requested simulator templates, including all 1,103 local city variants, and eight prerequisite concept pages. It does not claim that every article on the site has been rewritten or scientifically certified.

## Scope and evidence

- Automated text/structure inventory: 4,230 `index.html` pages. Five other root HTML documents are outside that inventory; the build checks 4,235 pages.
- Browser review of the three requested live pages, including their current controls, content order and the orbit page’s desktop first screen.
- Additional source/text review of 20 representative pages: home, Time, Earth, Space, seasons, Moon Lab, orbital velocity, planet guide, Jupiter, New York Sun/Moon/tides/world clock, 15-minute timer, stopwatch, classroom, Moon methodology, rocket launches, comets and asteroid belt.
- Close review of eight supporting concept pages on orbits, phases, axial tilt, lunar orbital tilt, tidal locking, scale and month lengths.
- The accompanying `content-inventory-2026-09-07.csv` records every inventoried path, paragraph-word count and longest paragraph.
- Counts cover HTML paragraphs, including closed disclosures and common footer text. They exclude text in lists without paragraphs, controls, tables and SVGs. They are a density screen, not total page word counts, reading-grade scores, traffic data or measured comprehension.
- Some checked-in generated pages were older than the live build. Date-dependent facts were assessed as a template/state-consistency problem; old build dates alone were not treated as proof of stale live output.

## Priority pages

| Page | Baseline evidence | Problem | Revision |
|---|---|---|---|
| Local Sun/Moon simulator, New York | 413 paragraph words; longest paragraph 98 words; no visible activity or question heading | Dense changing caption; duplicate baked “today” facts conflict with the selected date; settings are hard to connect with a task | Short opening; one-day, one-month and 24-hour-step activities; four expandable answers; one live set of readings; linked seasons and eclipse lessons |
| Earth–Sun–Moon orbit | 1,745 paragraph words; 15 paragraphs over 60 words; longest 145 words | Repeated explanations and question sections; ambiguous “Tilt Earth’s orbit” label; continuous animation has no pause/time control | Play/Pause, Reset and a year slider; View angle label; three experiments; one answer section; optional distinction between axial and orbital tilt |
| Solar system | 1,505 paragraph words; 9 paragraphs over 60 words; longest 100 words | Planet lesson interrupted by flight calculations, layout justifications and long scale explanations; too many settings/readings immediately visible | Planet race, spacing and 100-year comparisons; optional settings/readings; short question answers; rocket, comet and planet material linked to existing dedicated pages |

After revision, the same paragraph-count method gives:

| Page | Before | After | Longest paragraph after |
|---|---:|---:|---:|
| New York local simulator | 413 | 582 | 46 words |
| Earth–Sun–Moon orbit | 1,745 | 431 | 36 words |
| Solar system | 1,505 | 529 | 53 words |

The orbit and solar pages reduce paragraph text by about 75% and 65%. New York gains a missing lesson and optional answers instead of merely losing words. All three have zero paragraphs over 60 words. These totals include closed answers and footer paragraphs; they are not the amount a child must read before trying the model.

On the orbit page’s initial desktop screen, the figure began about 353 CSS pixels down at a 1363 × 936 viewport. The introductory three-view navigation consumed substantial space. The revision replaces it with compact links to the lesson sections and puts the other simulator choices in related topics.

## The reusable page structure

1. **Title and a 25–45 word introduction.** Name the subject, tell the child what changes, and identify the first action. Avoid leading with accuracy, algorithms, URL parameters or the creator’s reasons for the design.
2. **Simulator.** Keep its main action and timeline easy to reach. Start a continuously moving teaching diagram paused. Label the viewpoint separately from physical quantities.
3. **What to look for.** Three short tasks. Each asks for a prediction, provides a button that sets up the experiment, tells the learner what to observe, and offers an expandable explanation. The button must update the model and bring that model into view.
4. **Questions answered.** Three to five questions about what this picture actually shows. Answers are generally 25–55 words. Define a new term in the sentence where it first matters. Link the first meaningful mention to the page that teaches it.
5. **A closer look.** Optional material inside the question section. Introduce one extra idea at a time, such as why a 27.3-day orbit differs from a 29.5-day phase cycle. Avoid letting “advanced” mean a wall of equations or implementation details.
6. **Explore related topics.** Explain what the next page helps the learner see. Keep the primary choices small; preserve useful concept cross-links and existing topic anchors.
7. **Teacher/sharing tools.** Keep them after the learner’s material. They should support an experiment, not interrupt it.

A question is not interactive simply because its answer is hidden. The experiment should change something visible. A learner should be able to predict, act, observe and explain without remembering a paragraph of setup instructions.

## What belongs on which page

| Topic | Main destination | What the current simulator should retain |
|---|---|---|
| Day/night and local Moon view | `/sun-moon-earth-movement-simulator/` | Follow the place marker; compare the space view with the ground-view disc |
| Earth and Moon moving together | `/earth-sun-moon-orbit-simulator/` | Compare the two periods and the directions of motion |
| Seasons and changing daylight | `/earth-tilt-sun-seasons/` | One sentence linking Earth’s steady axial lean to the next lesson |
| Moon phases | `/concepts/why-does-the-moon-change-shape/` and Moon Lab | A short definition beside the changing view |
| Eclipses and the Moon’s orbital tilt | `/concepts/why-isnt-there-an-eclipse-every-month/` | Explain that a flat overhead picture cannot establish an eclipse |
| Gravity and orbital motion | `/concepts/how-does-an-orbit-work/` | Define orbit, then link to the experiment that changes speed |
| Scale | `/concepts/why-are-the-planets-drawn-so-close/` and `/earth-and-moon-simulator/` | A compact model-information control and a link to a true-scale comparison |
| Planet characteristics and moons | `/planets/` and the individual planet pages | Planet names and onward links |
| Spacecraft routes and launch timing | `/rocket-launch-simulator/` | A related-topic link, not flight budgets on the planet overview |
| Asteroids and comets | Their existing `/solar-system-simulator/` child pages | Optional layers and a clear onward link |
| Numerical methods and accuracy | Existing `/methodology/` pages and model notes | Enough context to interpret the picture correctly |

All these destinations already exist. Creating another page for each repeated paragraph would add duplication. Improve the existing concept page first; add a new URL only when it answers a distinct question.

## Sitewide priorities after this release

| Priority | Family and inventory size | Finding | Recommended next change |
|---|---|---|---|
| High | Sun: 1,157; Moon: 1,237; tides: 166 | Typical paragraph totals are 851, 735 and 1,132.5 words respectively. A majority have at least one paragraph over 60 words. Technical quantities and repeated explanations compete with the local answer. | Preserve the location/date answer and live chart. Introduce the first useful observation, define units beside the chart, collapse secondary readings, and link deeper mechanisms. Reuse one consistent template per family. |
| High | Remaining planet and simulator pages | Introductions promise “real” positions while some moon-system positions are schematic; long captions explain drawing choices. | Distinguish real periods from approximate positions and illustrative arrangements. Put assumptions in the model control and keep the main caption to what the learner should observe. |
| High | Concept pages: 54 total | 35 baseline pages contain a paragraph over 60 words. Some have strong interactive ideas but adult vocabulary or implementation commentary. | Continue the eight-page revision pattern across the remaining concepts: one short answer, one model/task, short answers, optional deeper detail. |
| High | Seasons and Moon Lab | Strong interactive foundation. Seasons opens with several technical concepts at once; Moon Lab’s introduction describes URL state to learners. | Retain their working experiments and shared controls. Simplify the first two sentences; relocate sharing/implementation instructions to teacher tools. |
| Medium | Home, Earth, Space, Time | Some introductions describe the system’s calculation methods or use compressed metaphors rather than clear choices. | Lead with a question a child can recognize. Name the destination’s learning outcome. Keep the visible tab navigation compact. |
| Medium | Timer: 70; stopwatch: 2; alarm: 51; clock: 110 | Timer’s “press Start” opening is a good model. Stopwatch repeats detailed operating/export instructions. Some tool counts differ between generated copy and project documentation. | Keep the immediate task first. Put export and multi-tool instructions in one expandable guide. Verify capabilities against actual controls before changing counts. |
| Medium | Classroom: 21 | Teacher recruitment, lesson use and a submissions-pause notice compete. | Give teachers a clear choice between using existing material and collaborating. Verify the current pause state; do not remove or contradict it casually. |
| Lower | Countdown/category families | Quality varies with editorial data; the same machinery can repeat long paragraphs across many pages. | Apply the short-answer standard to representative event types, then update the shared template. Keep the event date and countdown primary. |
| Keep specialized | Methodology: 6 | Dense technical content is expected here. | Add a short plain-language summary and a route back to the tool. Preserve the detailed method for readers who choose it. |

The rest of the inventory is a screening backlog, not a claim of a sentence-by-sentence review. No pages were deleted or redirected as part of this content pass.

### Maintenance findings from the site checks

The September 7 check completed successfully, but reported existing editorial maintenance items outside the three simulator lessons:

- The World Series countdown uses an estimated October 20 date that needs confirmation as it approaches.
- The Super Bowl LXI date is due for source re-verification. The Daytona 500 entry has no verified date.
- Two external links returned HTTP 404: the Labor Day countdown's Department of Labor link and the Dude Perfect birthday page's Compassion partnership link. Verify replacement destinations before updating them.
- Of 518 external URLs checked, 83 could not be verified because of blocking or timeouts. This does not establish that those links are broken.

These are a maintenance backlog, not findings that the simulator calculations failed. The day/night, planet and solar-system calculation checks passed.

## Accuracy and trust corrections

- Corrected the supporting orbit answer that said the Sun moves out of a falling planet’s way. The relevant motion is the planet’s, with gravity bending its path. Also removed the blanket claim that gravity changes direction only: in a noncircular orbit it changes speed too.
- Corrected scale-page prose that claimed hundreds-to-one spacing out to Neptune and overstated how tiny Jupiter would appear. The replacement uses approximate mean distances instead of claiming an invariant pixel size.
- Separated the Moon’s orbital tilt from Earth’s axial tilt, and the star-relative orbital period from the phase cycle.
- Removed the local simulator’s duplicate static “today” prose/table so a selected past/future date has one live readout to interpret.
- Corrected Jupiter’s tagline to compare its mass with the other **planets**, rather than “everything else in the solar system,” which would include the Sun.
- Removed the solar family’s second visible breadcrumb implementation. Structured breadcrumb data remains.
- Moved model assumptions into a top-right `?` disclosure. It is available by keyboard and closes with Escape. It does not change the simulated physics.

Science checks used [NASA’s Moon facts](https://science.nasa.gov/moon/facts/), [NASA’s eclipse explanation](https://science.nasa.gov/moon/eclipses/), [NASA Space Place on seasons](https://spaceplace.nasa.gov/seasons/), [Mercury facts](https://science.nasa.gov/mercury/facts/), [Neptune facts](https://science.nasa.gov/neptune/neptune-facts/), [Jupiter facts](https://science.nasa.gov/jupiter/jupiter-facts/) and [JPL’s approximate planet-position method](https://ssd.jpl.nasa.gov/planets/approx_pos.html). These checks support the edited claims, not every scientific assertion elsewhere on the site.

## Reading and usability standards for future edits

- Aim for sentences of roughly 10–18 words in the first explanation; split most sentences over 25 words. This is an editorial guide, not a rigid formula.
- Prefer 2–3 sentences per paragraph. More than 60 words should trigger review, not automatic deletion.
- Keep important science vocabulary, but explain it immediately: “An orbit is a path around another object.”
- Use observable instructions: “Press Play. Follow the dot.” Avoid “this is the whole argument” or “what the picture gets honest.”
- Link prerequisites in context. Do not make the learner hunt through a generic footer or click away just to understand a button label.
- Do not require every child to open every answer. Do not present optional details as a prerequisite to touching the model.
- Check a narrow phone, keyboard navigation, reduced motion and returning from a linked lesson. A CSS breakpoint alone is not proof of good phone usability.
- Avoid claiming an exact grade level from a formula. Science names and short samples distort readability scores. A short teacher/student comprehension check is the stronger next validation: can a learner explain the main observation in their own words?

## Validation record

Actual new activity handlers were exercised for state changes, date/offset consistency, resetting old layers, model focus and scroll. The orbit controller was checked for paused initial state, Play/Pause/Reset, scrubbing, presets and finite SVG geometry across a year.

- The complete local `npm run build` passed, including all 4,235 page checks and reciprocal concept/city link checks. GitHub's build passed for release `e8d6981`.
- `npm run check` completed with the maintenance findings listed above; day/night, planet and solar-system calculation checks passed.
- Cloudflare Pages reported a successful deployment of `e8d6981`. Fresh public-site URLs showed the new lessons on all three priority pages and the revised supporting orbit explanation.
- Live desktop browser checks confirmed the local day/month presets and 24-hour date change; orbit Play/Pause, Reset, end-of-year scrubbing and all view presets; solar inner/all-eight/100-year presets and century scrubbing; expandable answers; model disclosures and Escape dismissal. Activity buttons focused and scrolled to the model. No horizontal page overflow or site JavaScript errors were observed at the available 1363 × 936 viewport. Browser-extension diagnostic errors were excluded.
- Desktop model and activity layouts were visually inspected. The remote browser could not access the local preview host, and a narrow phone viewport was unavailable. Mobile CSS and control behavior were reviewed, but this is not a claim of a mobile-device visual test or measured student comprehension.

The existing custom-domain cache can retain an older page. Fresh query-string URLs were used to verify the deployed release; this content change does not alter the hosting cache configuration.
