# timeandspace.science — Project Knowledge

This file is the architectural source of truth for the project. If the
generated site (the HTML directories) is ever lost or corrupted, **everything
can be rebuilt from the source files described here by running `npm run
build`.** The generated `*/index.html` directories are disposable output; the
real source is:

```
seo/tools/*.mjs     the generators (the program that writes the site)
seo/_data/*.json     the content/data the generators read
assets/css/parts/*.css the stylesheet, one file per section (see css-parts.mjs);
                    build-css.mjs assembles them into assets/css/style.css,
                    build-inline gives each page only the sections it renders
assets/js/*.js       tool controllers (small/page-only code may be inlined;
                    repeated controllers become hashed deferred assets)
functions/           Cloudflare Pages Functions (serverless)
*.html (root)        index.html, c.html, 404.html, terms/privacy/not-found
_redirects, _headers, wrangler.toml, package.json
```

If you only kept those, `npm run build` regenerates the entire public site.

---

## Working rules

- **Prefer one coherent outcome per session.** This is a scope-control default,
  not a quota: ship the smallest reviewable release that solves the visitor's
  problem, even when that needs a coupled content, interaction and performance
  change. Explore, plan, code, verify, commit.
- **Touch only files needed for the current task.** No drive-by refactors or
  reformatting of unrelated code.
- **At session start, read `docs/PROGRESS.md`.** At session end, append a dated
  5–10 line entry: what changed, files touched, decisions made, open questions.
- **A passed date fails the build, by design.** `check-dates --gate` runs inside
  `npm run build`: if a one-off event's date is in the past, or a curated link
  still shows a date that is gone, the build stops and the last good deploy
  keeps serving. Fix the date and the copy that names it, or retire the page —
  do not work around the gate. A countdown to a day that has been and gone is
  the site failing at the one thing it exists to do.
- **Run the build before finishing** (`npm run build`, and `npm run check` for
  date/link work). Fix anything you broke.
- **Commit in small units** with clear messages. Never end a session with
  uncommitted work. Deploy = push to `main` (Cloudflare auto-publishes).
- **All digits in the UI use tabular numerals.** The 7-segment LED displays
  (alarm/timer/stopwatch) are the deliberate, digit-only exception.
- **Never use emoji as UI icons.** (The existing emoji nav/card icons predate
  this rule and are slated for replacement with a real icon set in the design
  round — don't add new emoji icons in the meantime.)
- **When a sports countdown rolls to its next edition, carry the last one
  forward** — who played and who won, in the page's own prose, not just in the
  champions table. The page people land on the day after a final is the one
  counting down to the next one, and "who won?" is what they came for. The
  champions/records lists are the record; a short "How the 20XX … finished"
  section is what a reader actually reads.
- **If a task needs something you don't have** — an API key, a hosting setting,
  a scheduler — stop and ask instead of stubbing it silently.

---

## What the site is

**timeandspace.science** is a free, no-sign-up static site on **Cloudflare Pages**
offering browser-based clock tools and shareable countdowns:

- **Alarm clock** (`/alarm-clock/`) — digital LED clock, full-screen bedside
  mode, multiple alarms persisted in `localStorage` (`ac_alarms`). Rings only
  while the page/window is open.
- **Timer** (`/timer/`) — countdown timer with presets, a "Set timer" dialog,
  egg/use-case variants, and ~62 preset-duration SEO pages.
- **Stopwatch** (`/stopwatch/`) — one watch, with laps, a +/- column, a start
  delay and a choice of precision. Hand-maintained HTML (no generator); its
  action row and its export files are kept in step with `/stopwatch/multiple/`
  by hand, because there is no shared module between a generated page and a
  static one. **Both pages write the same CSV**: `Name`, a column per lap, then
  `Total time` — one row per stopwatch — or `Name,Time` when no laps were taken,
  and the file is named `<date>-<HHMM>-<renamed cards, else "stopwatch-times">`.
  Change one, change the other.
- **World clock** (`/world-clock/`).
- **12/24-hour clock converter** (`/24-hour-clock-converter/`) — both directions,
  a full 24-hour chart, and a page per half hour ("14:30 in 12-hour time").
- **Countdowns** (`/countdown/`) — curated rich landing pages live under
  `/<category>-countdowns/<slug>/` (birthdays, holidays, anniversaries, etc.),
  each a real static page built from `events.json`/`people.json`. Custom,
  user-created countdown links (the old `/c.html?...` share-link product and
  the `/widget/` embed builder) were retired; both URLs now serve a static
  "no longer available" notice instead of rendering anything dynamic.

The growth loop is sharing a curated countdown link and being useful in a
classroom. Nothing on the site is monetised today — no ads, no affiliate links,
nothing for sale — and if that ever changes it has to clear the standard set
out at `/about/#funding` (see "Who the site is for").

### Key facts

- **Site name:** **Time and Space Science.** That is what the site is called in
  every title, meta tag, breadcrumb, footer and JSON-LD node. The domain,
  `timeandspace.science`, is now only an ADDRESS: it survives in URLs, in the
  `alternateName` on the WebSite/Organization nodes (so the rename reads as one
  site, not two), in iCal `PRODID`/`UID`s and outbound `User-Agent`s, and in the
  alarm-clock.org migration notice. Don't write the domain where the name
  belongs. The wordmark in the brand bar is unchanged — it sets the domain as
  words (`TimeAndSpace.Science`) and is the logo, not the meta copy.
- **Domain / origin:** `https://timeandspace.science` (in `seo/_data/site.json`).
- **Google Analytics ID:** `G-Z6VS7WYEP7` (in `seo/tools/lib.mjs` as `GA`),
  loaded deferred off the critical path via `GA_SNIPPET`.
- **No affiliate programme.** The site sells nothing and earns nothing from
  outbound links; the Amazon Associates tag was removed from `site.json` in
  August 2026 (see "Who the site is for").
- **No backend for the core experience.** Curated countdown pages are static;
  the live clock on each one runs client-side from the page's own baked-in
  date. A few Cloudflare Functions handle optional dynamic bits (preview
  images, view counter, reports).
- **Deploy target:** push to `main` → Cloudflare Pages auto-publishes.

---

## Build pipeline

`npm run build` runs these generators **in order** (order matters — later
steps consume files/markers written by earlier ones; `build-sitemap` then
`build-inline` must run last):

| # | Tool | Produces |
|---|------|----------|
| 2 | `roll-dates.mjs` | bumps the year on any past fixed-date events so links never go stale |
| 2b | `check-dates.mjs --gate` | **gate, runs early**: fails the build if anything dated is still presented as upcoming after its date passed (one-off `once`, exhausted date tables, non-rollable curated links). Advisory findings — thin tables, estimates to verify — never block. Runs after `roll-dates` so it audits the rolled state, and before the generators so a bad build fails in seconds rather than after 3,000 pages |
| 3 | `build-waf.mjs` | edge-moderation WAF rule expression from `cloudflare/blocklist.txt` |
| 4 | `build-themes.mjs` | writes `html.t-<id>` palette + motif rules into `assets/css/parts/01-themes.css` between `THEMES-START/END` markers |
| 4b | `build-css.mjs` | assembles `assets/css/parts/*.css` (in numeric order) into `assets/css/style.css` — the `<link>` fallback and the social-card generators still read that one file |
| 5 | `build-events.mjs` | rich evergreen event landing pages from `events.json` + `people.json` → `/<category>-countdowns/<slug>/` |
| 6 | `build-category-pages.mjs` | category hub pages ("Popular … Countdowns") |
| 7 | `build-countries.mjs` | per-country pages from `countries.json` |
| 8 | `build-home.mjs` | **`/` (landing) + the three section pages + `/countdown/`.** The tabbed portal became pages: `/time/`, `/earth/` and `/space/` each carry the old tab's lede and cards on the same board grid, with a switcher row (the old tab row as real links, aria-current where you stand) and their own keyword titles/beacons. The LANDING page demonstrates rather than describes: the live day/night map as hero (via `WK`, shared with the world-clock card), one line of pitch, a "start with a question" strip into concept pages and the glossary, one block per section (narrative line + three `pc-card` links, ACTION-voiced — never "for students"/"for teachers"), and a three-row "how this site works". Its `<title>` is the DOMAIN, `TimeAndSpace.Science` (owner's call — the one page where the address is the name); the section pages carry the keyword titles instead. Old `?tab=` URLs redirect via an inline script at the top of the landing body. The classroom tab's nine idea cards moved to `/classroom/` (data in `class-ideas.mjs`) |
| 9 | `build-calendar.mjs` | `/calendar/` filterable event calendar |
| 10 | `build-popular.mjs` | `/popular/` most-watched (reads `/api/popular`) |
| 11 | `build-trending.mjs` | `/trending/` hottest now (reads `/api/trending`) |
| 12 | `build-timers.mjs` | `/timer/` hub + preset-duration + use-case pages |
| 12b | `build-classroom.mjs` | `/classroom/` — the teacher's guide to the timer and stopwatch (projector, keyboard shortcuts, lap timing, CSV/image export, limits). A guide, not a tool page: it's the thing a teacher-resource site can link to |
| 12b2 | `build-stopwatch-multi.mjs` | `/stopwatch/multiple/` — up to **three** independent stopwatches, each with its own name, colour, laps and Start. A separate page, NOT a rewrite of `/stopwatch/`: that page ranks, persists sessions and builds share images, and restructuring it into an N-instance model would risk all of it. Reuses the timer hub's `.mt-board`/`.mt-timer` CSS. Three, not four: three cards side by side still leave a read-out big enough to read across a room, and the fourth narrowed every card for the person who only wanted two. **Telling the cards apart is the job** — a palette button LEFT of each name opens that card's name + colour (8 presets, a custom picker, No colour), because three identical dark cards do not say which one is lane 3 and a colour is read from across a room where a 17px label is not. The colour is a background TINT mixed against `--bg-solid` (never a flood: the read-out is a lit LED panel on a dark screen), and the tinted border yields to the accent border while a watch runs — which one is RUNNING outranks which one is orange. Names and colours persist with the session and survive Reset all; the count matters to copy on `/stopwatch/`, `/timer/`, `/classroom/` and the home page, all of which name it. **The bar is Share · CSV · Add/Max · Start all · Reset all · full screen**, the same row `/stopwatch/` carries (where Add links here and there is no Start all — one watch, and its own Start already is it). Share draws the board on a canvas, a COLUMN PER WATCH in that watch's colour (mixed by hand: a canvas has no `color-mix`), because on screen the watches sit side by side and that is how the comparison was read |
| 12c | `build-methodology.mjs` | `/methodology/` hub + 5 pages: how sunrise/sunset, moon phase, tide predictions, time zones and browser timers are worked out, and where each stops being reliable. **Reads `seo/_data/browser-timing.json` and `seo/_data/sun-accuracy.json` and THROWS if either is missing a field it quotes** — a methodology page must not be able to invent its own accuracy figure |
| 13 | `build-world-clock.mjs` | `/world-clock/` hub (one card per UTC offset, each card a link to its city page, with Sun/Moon/Tides chips) + a `/world-clock/<city>/` page for each of the ~109 cities in `wc-cities.mjs` — live clock, UTC offset, DST state, sun times, city comparison, and the shared `astroStrip` from `crosslinks.mjs`. Tier 1 = one city per offset (the grid); tier 2 = high-demand cities sharing those offsets (linked, not gridded). The hub search covers exactly the cities that have a page |
| 13b | `build-clock-convert.mjs` | `/24-hour-clock-converter/` — the 12-hour ⇄ 24-hour (military time) converter, plus **one page per half hour** at `/24-hour-clock-converter/<hhmm>/` (48 of them: `1430`, `0730`, `0000`). The query is almost never "convert time"; it is "1430 military time" or "what is 18:00 in 12 hour", so each of those gets a page that SAYS the answer, the way the alarm section has a page per "set alarm for 6:30 am". **The set is `alarmTimes()`**, taken from lib rather than rebuilt, so every converter page has a working alarm for its own time one link away and the two families cannot drift. Finite and curated for the same reason the timer durations are: every minute of the day would be 1,440 pages differing by one digit. The converter itself handles every minute; only the landing pages are curated |
| 14 | `build-alarm.mjs` | `/alarm-clock/` + `/alarm-clock/about/` |
| 15 | `build-alarm-times.mjs` | `/alarm-clock/<time>/` "set alarm for HH:MM" pages |
| 16 | `build-microevents.mjs` | `/work/` hub + friday/holiday/long-weekend micro-countdown pages |
| 17 | `build-420.mjs` | `/420-countdown/` + `/420-day-countdown/` |
| 18 | `build-tides.mjs` | `/tides/` hub + per-station NOAA tide-chart pages + per-state county-grouped hubs like `/tides/california/` (stations/counties/state helpers in `tide-stations.mjs`; client data via NOAA CO-OPS in `assets/js/tides.js` — astronomical predictions only, no weather/storm/pressure overlay; each station's IANA time zone is resolved at build time via the vendored tz-lookup) |
| 19 | `build-sun.mjs` | `/sun/` hub + ~1,074 city pages (curated world cities from `cities.mjs` + census US top-1000 from `us-cities.json`) + `/sun/state/<state>/` hubs + indexable `/sun/anywhere/` (any-location utility: local index + Open-Meteo geocoding + GPS — deliberately indexed and sitemapped, since it answers the small-town queries the city pages cannot) + `/sun/cities.json` search index. All sun math is client-side (SunCalc), never stale | Every city page also accepts **`?date=YYYY-MM-DD`**, which renders the whole page for that day (pickers, dial, arc, twilight, 7-day table) and rewrites the answer sentence to NAME the date — the "Tomorrow's sunrise" pointer is that link. The canonical stays the clean URL, so dated variants consolidate into it rather than competing with it
| 19d | `build-simulator.mjs` | `/sun-moon-earth-movement-simulator/` — the Sun-Earth-Moon view with room to move: a **day / week / month** span control, a slider across it, Play, jump-to-next-phase, a full read-out (sun and moon altitude/direction, elongation, phase, sunrise, moonrise) and a large phase disc. The card on a /sun/ or /moon/ page can only scrub ONE day, because that page is about one day; the moon's own cycle only becomes visible over a month. **The scale card holds two kinds of number and they must not be confused.** How wrong the PICTURE is comes from `ORR_GEOM` against the real dimensions, so it cannot go stale when the drawing changes — it moves on its own (currently: moon 23x too close, sun 3,151x too close and 52x too small, and the moon's size against Earth very nearly right, 27% against a real 27%, because `ORR_MR/ORR_R` is set to the true ratio). **The bodies are deliberately smaller than the frame allows**: what is most wrong in this picture is DISTANCE, distance is measured in Earth-diameters, so shrinking the discs while keeping the orbit wide improves every one of those figures at once. The floor is legibility — the moon must still show a lit half and a dark half on a phone, which is ~19px at 390px wide. **The frame's HEIGHT is fixed and its WIDTH is not**: every size is set against `ORR_H`, the Earth sits a fixed distance in from the right and the sun a fixed distance in from the left, so a wider frame does exactly one thing — put more sky between them. That is what lets full screen FILL the screen at any shape instead of letterboxing, and it makes the sun's distance (the most wrong figure there is) less wrong the bigger the screen: 3,151x too close on the card, ~1,563x on a phone held sideways. `orrSvg(...,fw)` takes the width; the client measures its own box and passes the ratio, and 480 is the floor and the card's default. What the real system would MEASURE at 16mm to the Earth — the corridor walk, the peppercorn, the 188 m — comes from the real dimensions alone and does NOT move when the drawing does. `MARBLE` is exported so /classroom/, which describes the same walk, imports the figures instead of typing them. Location, date, time and span are all URL parameters (`city` or `lat`+`lon`+`tz`+`name`, `date`, `time`, `span`), and a builder on the page writes the link. **The controls are Play / Now / Settings / Full screen, left-justified over a full-width slider**, with the moon's phase appearing beside the instant read-out in full screen only (it shares that already-centred row because every row under the picture costs the picture WIDTH — a 16:9 frame in a wider box is limited by its short side), and that same block is what goes full screen — one layout, not two. Where, when and how long the slider covers live in a `<dialog>` that APPLIES ON SAVE, so a half-typed date never repaints. Full screen asks for a landscape orientation lock; where that is refused (iOS) the stylesheet turns an inner wrapper a quarter turn instead — it cannot turn the fullscreen element itself, because the UA stylesheet forces `transform:none !important` on it |. **Plus one page per registry city** (`/sun-moon-earth-movement-simulator/<slug>/`, 1,103 of them — the same list /sun/ and /moon/ are built from, so the three cannot drift). Each carries content only that city has: its own baked picture, today's sunrise/sunset/day length, tonight's moon, its longest and shortest day, a sentence computed from its LATITUDE band, and its family links. Its sun and moon pages link straight to it, which is what makes the children reachable. A teaching card (tidal locking and the "dark side" misnomer, the ~50-minute moonrise slip, sidereal vs synodic month, why the phase is global but rotated, why the 5.1° orbit tilt means no monthly eclipse, spring/neap tides) rides on every one
| 19e | `build-solar.mjs` | `/solar-system-simulator/` **+ 11 child pages** (one per planet, plus `asteroid-belt/`, `comets/`, `launch-windows/`). An **11-rung zoom ladder** — five heliocentric views, the to-scale Earth & Moon, and one per planet that has large moons — plus a span slider (month/year/decade/century), a **playback speed** control, toggleable **asteroid-belt and comet** layers, and a **flight path** to Mars, Jupiter or Saturn. The ladder exists because the OUTER:INNER orbit ratio decides legibility: 4:1 out to Mars, 27:1 to Saturn, 81:1 to Neptune, where Mercury's whole orbit is 5px and the inner four are a labelled knot — the true shape of the system and the thing evenly-spaced textbook diagrams hide. **The frame is square** (`SOL_FRAME` in planets.mjs): the drawing is concentric circles, so a 16:9 frame is radius-limited by its short side and the corners hold nothing — squaring buys ~40% more radius. Pages use `.wrap-wide` (1500px) for the same reason. **The Earth & Moon rung is the only view to scale in size AND distance at once**; on a moon rung the planet's own disc IS to scale against its moons' orbits. Every physical figure on a child page is DERIVED — mass from GM, gravity from GM/r², year from Kepler, diameter from `PL_DIA` — so no number can drift from the picture beside it. Content (tilt, temperature, atmosphere, facts, **open questions**, dated **recent findings**) from `seo/_data/solar-facts.json` |
| 19e2 | `build-planets.mjs` | `/planets/` — **the section hub above the simulator**, and the page the home card, the nav and every planet page's breadcrumb point at. One card per world in orbital order, each a drawn globe from `globe.mjs`, two paragraphs of `overview` prose from `solar-facts.json`, five DERIVED figures and a link to that world's own page. The asteroid belt sits between Mars and Jupiter — same card shape, because that is where it is — and Pluto is last, labelled a dwarf planet in its own kicker. It repeats nothing a planet page says at length: it is a route, not a rival for the same queries. The belt picture is `solSvg` run at build (one source, two runtimes), so it cannot draw a belt in a different place from the page it links to |
| 19b | `build-eclipses.mjs` | `/moon/eclipses/` hub + one page per lunar eclipse, solved from `eclipse.mjs` (Meeus ch. 54 on the same series as the phase calendar). **Lunar only** — solar eclipses need Besselian elements for the visibility track, and a bare date sends people to look at the sun from outside the path |
| 19h | `build-concepts.mjs` + `build-glossary.mjs` | one-intent `/concepts/<slug>/` answers from `concepts.json`, the A–Z `/glossary/`, and `/questions/` as an experiment-first directory. The directory is not a second essay: three “try it” doors lead, followed by scannable questions grouped by phenomenon. Moon concepts select distinct Moon Lab states; non-Moon concepts keep their subject-specific graphics |
| 19c | `build-moon-events.mjs` | `/moon/supermoons/` + `/moon/blue-moons/`. The supermoon threshold (361,885 km) is NAMED on the page with every full moon's distance, because there is no official definition and a list without its rule presents an arbitrary choice as fact. Blue moons list the monthly definition only; the seasonal one is explained but not tabulated, since this site doesn't solve for the solstices |
| 19f | `build-daynight.mjs` | `/day-night-map/` — the home page's day-and-night card with time attached: a 7-day slider, Play and Now ON the map's bottom edge, jump buttons for the solstices and equinoxes (SOLVED by scanning a year of declinations, never tabulated), a location dot the page asks for ON LOAD (the My location button beside Now is only what is left when that is refused, and it is removed outright where there is no geolocation at all), and the four world-clock cities showing their local time and whether they are in daylight at the instant on show. The drawing is `daynight.mjs`, shared with the home card, so the two cannot draw different maps. Every figure in the prose — the tilt, the tropics, the polar circles, the solstice dates, the projection's stretch factor at each latitude — is derived from that same series; the only typed numbers on the page are two continent areas, which no formula produces |
| 19f2 | (same file) | `/earth-tilt-sun-seasons/` — the seasons LESSON, split from the map: the same day/night map, the side view of the sun's angle, and the Earth–Sun–Moon orbit through one year, all three drawn for ONE instant from one clock. **Three views, chosen by a `<select>` under the map**: Compact (default, `dn-view-compact`) is the three simulators alone with ONE slider and ONE season row under the map, the select shown once, the tab row hidden, and a grid tuned to fit all three on one 900px screen (1.25fr map column, orbit figure capped at 480px); Normal (`?view=normal`) gives each view its own slider and season row back plus Things to Try and the questions; Full (`?view=full`, and the old `?view=details`) is everything. A hash into the details opens the view that can show it. `dn-lite` rides on the two non-full views so "hide the explanations" is one selector |
| 19g | `build-moon-lab.mjs` | `/moon-simulator/` — one cacheable Moon learning engine with ten named string states (`?state=phases`, `tidal-locking`, `libration`, `eclipse-tilt`, etc.). A state selects a distinct question, task, starting value, control and observation. The same engine is embedded on the matching Moon concept pages through `data-state`, replacing the unrelated repeated Earth-orbit graphic. Its first SVG and answer are rendered at build time; the shared controller is a hashed deferred asset that only enables controls and repaints the complete first frame. The clean hub URL is canonical; query states are shareable tasks, not separate indexable copies |
| 20 | `build-sitemap.mjs` | `sitemap.xml` (date-only `<lastmod>`, from the newest git date across the generator AND every module it imports, walked transitively) + `seo/_data/sitemap-revs.json` (`url -> "date/rev"`, rev hashing those same files' content). The sources are DERIVED from the imports because hand-listing them meant a change to a shared module (`localtime.mjs`, `crosslinks.mjs`) moved no date, so IndexNow never announced the ~2,330 pages it had just changed; the rev exists because a date can't tell two edits on the same day apart |
| 21 | `build-inline.mjs` | probes each page and inlines only its critical section CSS, inlines small page-isolated JS, hoists repeated controllers to hashed deferred assets, and injects nav/logo/GA/favicon/landmarks. It also strips unused theme palettes and refuses a CSS probe that would leave matching markup unstyled |
| 21b | `check-crosslinks.mjs` | **gate**: walks every emitted `/sun/`, `/moon/`, `/tides/` page for `data-xlink` anchors and fails the build if any cross-link is one-way (target missing, or not linking back). `/world-clock/` pages are scanned too, target-exists-only — their strip is one-way by design, but a retired sun or moon city would still leave a dead link. A one-way link renders fine and dead-ends a crawl path silently, which is why it needed a gate rather than a convention |
| 22 | `check-pages.mjs` | **fail-safe gate, runs last**: scans every emitted page for a non-empty title, real body content, **no unresolved merge-conflict markers** (ten hand-maintained pages once shipped an empty `<<<<<<< HEAD` block in their `<head>`, which the parser treats as body text — every visitor to /about/, /privacy and eight others read conflict markers above the logo, and nothing else here could catch it), (where indexable) a description + H1, **and that every internal `href` resolves to something actually published** (on-disk page, asset, or a `_redirects` source); exits non-zero so Cloudflare aborts the deploy and the last good version keeps serving. The link check exists because 18 country-page links went on pointing at the retired share-link product long after it was retired |

Other scripts (not in the default build):
- `check-dates.mjs` / `check-links.mjs` — `npm run check` audit (stale dates, broken links).
- `check-planets.mjs` / `check-solar-data.mjs` — `npm run check:solar`: proves the
  orbital elements, the moon systems, the comets, the belt and the transfer solver
  (see the shared-modules notes). Not in the build — these tables are static, so
  this is what you run after touching one.
- `indexnow.mjs` — `npm run indexnow`: announces added, updated AND removed URLs
  to Bing/IndexNow. A URL goes when its entry in `seo/_data/sitemap-revs.json`
  differs from the one recorded in `seo/_data/indexnow-state.json`, or when it
  has left the sitemap — retired URLs are announced once, then dropped from the
  state. Nothing is written to the state unless IndexNow answered 200/202, and
  only for the URLs in that payload, so a submission that didn't happen can
  never be recorded as if it had. The hourly freshness rebuild never triggers a
  submission. Ownership is proved by the public key file at the site root
  (`<key>.txt`, key also in `site.json`) — don't redirect or gate root `.txt`
  files. Runs from `.github/workflows/indexnow.yml` on a push to `main` that
  changes `sitemap.xml` **or** the revs sidecar (a same-day edit leaves
  sitemap.xml byte-identical, so watching only it would miss exactly the case
  the rev was added for), plus a daily retry; `--dry-run` prints the plan.
- `block-countdown.mjs` — emergency takedown of a specific countdown.
- `build-waf.mjs` — also `npm run waf`.
- `measure-timing.mjs` — measures what a browser timer actually does (setInterval drift foreground and under 4x/20x CPU throttle, the nested-setTimeout clamp) and writes `seo/_data/browser-timing.json`, which `/methodology/browser-timing/` quotes. Dev-only dep (`npm i --no-save playwright`), output committed. **Chromium only** — Firefox and WebKit can't be installed in the dev environment, so there are no cross-browser numbers and there must not be invented ones. Three behaviours (hidden-tab throttling, rAF while hidden, page freezing, autoplay policy) go in the file's `unmeasured` list with the reason; the freeze test is kept as a CONTROL that asserts freezing FAILS here, so nobody adds meaningless numbers back. Rerun only when the claim needs refreshing.
- `measure-sun.mjs` — bounds the sunrise/sunset solver by re-solving the same −0.833° crossing iteratively and comparing; writes `seo/_data/sun-accuracy.json`. Bounds the SOLVER only (both sides share one solar series) and models no refraction/elevation/terrain — the page says so.
- `make-us-cities.mjs` — regenerates `seo/_data/us-cities.json` from the committed census CSV + vendored `tz-lookup` (rerun only when the city list or dedupe rules change).
- `make-elevations.mjs` — **needs a network; run it manually, commit the output.** Fetches a real elevation for all ~1,205 places (USGS EPQS for US, Open-Elevation/SRTM elsewhere) into `seo/_data/elevations.json`. Resumable, rate-limited, `--dry-run`/`--limit`/`--force`. `place.mjs` shows the elevation row and `GeoCoordinates.elevation` only for places present in that file; absent file or absent place = row omitted, never a zero or a guess.
- `make-coastal-map.mjs` — regenerates `seo/_data/coastal-links.json`, the shared tide↔sun mapping (each NOAA tide station → nearest `/sun/` city within 35 mi, same state). Read by `build-tides`, `build-sun` and `build-moon` via `coastal.mjs`, which exposes `stationToSun` (one pair) and `sunToStations` (**all** stations that chose a city — four cities are the nearest for two stations each, and linking back to only the closest left the other one-way). Reciprocity is now asserted, not assumed: see `check-crosslinks.mjs`. Rerun after adding tide stations or curated sun cities.
- `make-stopwatch-images.mjs` — regenerates the /stopwatch/ page's search & social
  images in three aspect ratios (`assets/img/stopwatch-{16x9,4x3,1x1}.webp` plus a
  16:9 PNG for `og:image`). Each ratio is composed at its own size from the site's own
  pieces (`segMarkup()` + `style.css`) — never one image cropped or stretched. Dev-only
  deps (`npm i --no-save playwright sharp`), output committed, so the build stays
  dependency-free. Rerun only when the stopwatch design changes.
- `make-timer-images.mjs` — the same for every `/timer/` duration and use-case page
  (`assets/img/timer/<slug>-{16x9,4x3,1x1}.webp`, 207 files). Whole-minute pages lead
  with the dial artwork; the rest (15 s, 90 s, 2 h…) have no dial, so the LED read-out
  becomes the picture. Both generators share `social-card.mjs` (card shell + the
  Playwright/sharp render loop, which refuses to emit an overflowing frame). Rerun when
  the dial art, the card design or the duration list changes.

### Other npm scripts
- `npm run dev` — `wrangler pages dev .` (runs the site **and** Functions locally).
- `npm run deploy` — `npm run build && wrangler pages deploy`.
- `npm run check` — date/link audit, plus the day/night shading proof.
- `npm run check:solar` — prove the orbital, moon, comet, belt and transfer tables.
- `npm run indexnow` — submit changed URLs to IndexNow (`--dry-run` to preview).

---

## Shared modules (the reusable core)

These are imported by multiple generators; they're where cross-page
consistency comes from. **Edit these, not the generated HTML.**

### `seo/tools/lib.mjs`
- `esc()` — HTML-escape.
- `GA`, `GA_SNIPPET` — analytics ID + deferred loader snippet.
- `brand({crumb, page, sub})` — breadcrumb + copy/share dropdown header.
- `breadcrumbLD()`, `appLd()`, `faqLd()`, `webSiteLd()` — JSON-LD structured data.
- `linkUrl()`, `hrefFor()`, `richMap()`, `loadEvents()` — countdown link/event resolution.
- `nextOccurrence()`, `epochFor()`, `when()`, `iso()` — date math (timezone-correct via `Intl`).
- `viewHash()` — stable per-page id for the view counter (must match `build-events.mjs`).
- **Timer helpers** — `timerSlug()`, `timerLabel()`, `timerPhrase()`, `timerSpoken()`,
  driven by internal `timerParts(sec)`. These define the timer URL/label scheme:
  whole hours → `2-hours`; otherwise whole minutes + leftover seconds
  (`90-minutes`, `1-minute-15-seconds`). **All three generators that touch timer
  URLs (build-timers, build-sitemap, build-inline) import these so slugs never
  drift.**
- **7-segment LED** — `segMarkup(str)` (static pre-lit display) and `SEG_JS`
  (`window.acSegDisplay(el)` factory for live updates). Shared by alarm/timer/stopwatch.
- `alarmTimes()` — the "set alarm for HH:MM" set: every half hour around the whole
  24-hour clock (48 pages, 12:00 AM → 11:30 PM).

### `seo/tools/alarm-widget.mjs`
The entire alarm clock: `PANEL_HTML`, `DIALOGS_HTML`, `WIDGET_JS` (full widget),
`HOME_CLOCK_JS` (display-only for the home page), `FS_ICON`. Alarms persist in
`localStorage` key `ac_alarms`. Used by `build-alarm.mjs`, `build-alarm-times.mjs`,
and the home page.

### `seo/tools/city-registry.mjs`
The one answer to "what pages exist for this place, and where". `CITIES` (slug →
city/area/lat/lon/tz + the `sun`, `moon`, `clock`, `tide` URLs, or null),
`cityRef(slug)`, `familyLinks(slug)`, `parity()`. No side effects, so any
generator can import it. The canonical set is curated `CITY_DB` + the census US
top-1000 — exactly what build-sun turns into pages and build-moon mirrors, so
**sun and moon can never diverge**. World clock is the family that can lag;
`parity()` reports the gap. **Tides are deliberately not expected to match**:
NOAA covers US coastal stations only, so `tide: null` is the correct answer for
most cities, not a gap. Replaces the copy of this logic that each generator used
to keep for itself.

### `seo/tools/clock-convert.mjs`
The 12-hour ⇄ 24-hour converter: `convForm(h, m)` (the widget, baked to a time),
`CONV_JS` (the same conversion in the browser), `hourChart()`, `spoken24()` /
`spoken12()`, `CONV_TIMES` / `CONV_SLUGS` / `convSlug()`. No side effects, so
`build-inline` and `build-sitemap` import the slug list without re-running the
49-page generator, and `build-alarm-times` links to each time's converter page
from the one shared `convSlug()`.
**Two complete clocks, not one set of fields:** converting only ever changes the
hour and the AM/PM label, so a shared minute field would be less markup and the
wrong answer — the reader is checking that the minutes did NOT move, and each
side has to be a whole clock they can type into. **No `<input type="time">` on
the 24-hour side**: a native time input renders in the BROWSER's locale, which on
a US device draws an AM/PM field — the one thing this page must not do. Every
page bakes its own time into the selects and both read-outs, so the conversion is
finished before the script runs; "Use the time now" ships `hidden` and is
revealed by the script, since without it the button could do nothing.

### `seo/tools/localtime.mjs`
`localTimeLine(place, tz)` + `LOCALTIME_JS` — the one-line "It's 5:35 PM in
Portland right now — Pacific Daylight Time on the world clock" strip that every
`/sun/`, `/moon/` and `/tides/` place page carries under its heading (~2,330
pages). Baked at build, ticked to the real minute on load. The onward link
resolves the page's IANA zone to the `/world-clock/<city>/` page representing
it — by exact zone id first, then by ICU's DST-independent zone name, so
America/Toronto reaches the Eastern Time page without a hand-kept alias table;
zones with no representative fall back to the hub. `LOCALTIME_JS` is injected
once by `build-inline` on any page containing the line, so the markup and its
ticker can't get separated. The city list itself lives in `wc-cities.mjs` (no
side effects) precisely so three generators can import it without re-running the
world-clock build.

### `seo/tools/units.mjs`
Metric or imperial, chosen once for the whole site. A figure is emitted ONCE, in
metric, wrapped in a span that carries the raw value, its unit and the precision
it was written to — `<span data-u="km" data-v="384400" data-s="6">384,400 km</span>`
— and `UNITS_JS` (injected with the nav by build-inline) rewrites every such
span when the reader's system is imperial, and again when they change it. So the
HTML a crawler or a no-JS visitor gets is complete and correct, there is no
second copy of any number to drift, and no round trip. **The default comes from
the browser's LOCALE, not an IP lookup** — the language a reader set is a
statement, an edge location is a guess — with the three imperial-distance
countries (US, LR, MM) named in `IMPERIAL_REGIONS`; a stored choice always wins.
`en-GB` is deliberately metric here: British road signs are miles, British
science is not. **Rounding travels with the figure** (`data-s`: significant
figures, or negative for decimal places), because 139,820 km quoted to five
figures must not become eleven in miles. The control is a two-state segmented
button in the nav menu, above Projector mode. Helpers: `km`, `kmSig`, `metres`,
`mm`, `kmPerS`, `kmPerH`, `miles` (that last one for figures written imperial —
the place pages' nearest-city distance — which stores the metric value and
converts the other way). A page whose script writes figures itself calls `window.acFmt(value, unit, sig)`
instead of emitting a span — the orbital simulator's read-outs, the moon page's
nearby-city `<option>`s (markup is impossible there), the tide chart — and
listens for `ac:units` to redraw. Data that arrives IMPERIAL has its own pair:
NOAA publishes tide heights in feet, so tides.js holds feet and asks
`acFromFt`. Temperatures live in prose, so `temps()` wraps the figure inside an
already-escaped sentence and leaves the words alone. **Never put a span in a
meta description or anything that becomes JSON-LD** — those paths take the
plain number.

### `seo/tools/crosslinks.mjs`
`astroStrip()` / `astroStripForStation()` — the single "Related astronomical
information" strip shared by `/sun/`, `/moon/` and `/tides/` city/station pages.
One tile per *other* family (sun times, moon phase, predicted tide station),
each carrying `data-xlink` so `check-crosslinks.mjs` can verify reciprocity.
Replaced three separately-written one-off blocks that had drifted to three
levels of detail and three voices. **Voice rule: these tiles state computed
astronomical facts and link onward — they never suggest an activity, rate
conditions, or imply the figures are fit for planning.** The framing line
(`CROSSLINK_NOTE`) is part of the component so it can't be dropped from one
family by accident. The tide tile deliberately bakes no tide times: NOAA is
fetched at runtime, and baking would put a network dependency behind ~2,200
sun and moon pages.
`tideNote(slug)` is the sentence under the orrery view: what the sun–moon angle
does to the tides (spring/neap), then the reader's own station. It links via
`cityRef(slug).tide` — the registry's "is this place coastal", NOT the strip's
reciprocal pair map, which says Los Angeles has no tides because its station
chose San Pedro. So it carries **no `data-xlink`**: a contextual link, not a
structural one. Inland and non-US places get the explanation and no link.

### `seo/tools/orrery.mjs`
The Sun–Earth–Moon view in the "Where the sun / moon is right now" card, shared
by `/sun/` and `/moon/` place pages and both any-location tools (~2,200 pages).
`orreryFigure()` emits the markup, `ORRERY_JS` ships the same drawing code to
the browser, and `orrPaint()` is the one painter both families call — the
moon.mjs one-source-two-runtimes pattern, so there is no Node twin to drift, and
it reads the sun and moon positions from MOON_CORE already on the page so the
picture cannot disagree with the numbers beside it. **The viewpoint is above the
Earth's ORBIT, from the reader's own hemisphere**: the one vantage where the
moon's separation from the sun (which *is* the phase) is not foreshortened, and
where a southern city does not spend its day hidden behind the globe.
**It deliberately does not draw Earth's shadow** — the real umbra reaches past
the moon's orbit, so a geometric cone would put the moon in it every full moon
and imply a monthly eclipse, and what actually decides an eclipse (the moon's
distance from the ecliptic) is exactly what this projection flattens.
It LEADS the "right now" card on both families, above the live stat rows: it
answers "where", the numbers answer "how high", and the explanation follows
both. It replaced a small horizon plot that drew the same two bodies against a
compass line — which is what the Direction and Azimuth rows already say.
Under the figure, the instant it is drawn for — and the controls that move it. A
**date+time field** (native `datetime-local`, holding the PLACE's clock, never
the visitor's) changes the DAY, and the host page follows it: sunrise, the
dial, the twilight bands, the 7-day table, the moon's rise and set. A **slider**
scrubs the time within that day and moves nothing but the card, because the
day's own facts have not changed — which is what makes it cheap enough to drag.
**Now** hands the picture back to the live clock. **Play** sits beside it, next
to the date field (there is no "Drawn for" label any more — it was taking the
width the buttons needed). **The slider spans ONE SYNODIC MONTH, not one day**
(`ORR_SPAN_MIN`, 42,524 minutes): what this picture draws is the moon's angle
from the sun, and that angle takes 29 days 13 hours to come round, so a day-long
bar bought a thirtieth of the one cycle it exists to show. End to end is now
exactly one lap — drag to the right-hand edge and the moon returns to the phase
it started in. The span is anchored at MIDNIGHT of the day the card is on and
re-anchors whenever the day is chosen elsewhere (`orrSpanFix`). Play walks the
same bar at one drawn day every 1.4 s — a lap in about 40 seconds — and WRAPS
inside the span, so Play and the slider are one journey rather than two.
Dragging crosses days, which the host page cannot follow per frame: `input`
moves the picture alone and `change` (once, on release) hands the page the day
it landed on. While Play runs the same rule holds — every frame is
`orrSet(…, false)` and the page catches up in ONE re-render when it stops.
Repaints are capped at ~15/s, and `.orr-spin` takes the city's NAME and leader
line off while it moves — the name is pinned to a spot on a turning Earth and
swings round the globe dragging its line, which is louder than the thing the
animation exists to show. Anything the reader touches stops it; the loop's own
`.value` writes fire no `input` event, so it cannot pause itself. `ORR_AT` is the whole of that
state (null = live) and `orrOnChange(fn)` is how each generator hears about it,
with a `dayChanged` flag deciding whether the page re-renders. The page's own
date pickers push back the other way, keeping the time of day, so the two can
never disagree. When the instant is not now, the card says so — heading ("Where
the sun **will be**"), row label ("At that time") and caption all change — because
a picture of next October under numbers labelled "right now" would be worse than
no control at all. Both controls ship inert (input `disabled`, Now `hidden`);
without JS neither could do anything. The tide sentence below that comes from
`crosslinks.tideNote()`, not from here: this module draws and knows nothing
about places. `ORR_GEOM` exports the drawing's own dimensions so the simulator's
scale disclaimer is computed from the picture rather than written beside it.

### `seo/tools/daynight.mjs`
The day-and-night world map, shared by the home page's world-clock card and
`/day-night-map/`. `DN_CORE` is the ES5 source that ships to the browser AND is
evaluated here at build time (the moon.mjs pattern), so a baked map and a live
one cannot disagree. Equirectangular projection; `landPath()` draws the same
coastline rings the globes use; `cityMark()` places a dot from the world-clock
registry's own coordinates.

**The shading is SOLVED, per meridian, in ABSOLUTE map coordinates.** For a
threshold altitude `a`, `A sin(lat) + B cos(lat) = C` is solved by the tangent
half-angle substitution, and the dark part of that meridian comes back as up to
three pieces: a cap off each pole, and — near the equinoxes at the twilight
thresholds, where both poles sit in twilight — a BAND across the middle with
both poles outside it. Feeding `a = 0` gives the day/night line and `a = -18`
the far edge of astronomical twilight; the two together, with
`fill-rule="evenodd"`, are what put a real dusk on the map instead of a hard
edge. **Nothing translates**: the card used to bake the curve relative to its
own subsolar meridian and slide the group, with a copy either side to cover the
wrap — fine at one repaint a minute, and it jumps a whole map width the moment
anything plays it. Re-solving per meridian means there is nothing to slide and
nothing to wrap.

`check-daynight.mjs` (`npm run check`) PROVES the shading against the altitude
formula at ~850,000 points. It is not decoration: writing it found a root
returning 275 degrees when it meant -85 (a lit meridian shaded dark) and an
`asin` handed 1.0000000000000002 (NaN instead of "straight up"). Run it after
touching the solver.

### `seo/tools/globe.mjs`
One planet, turning, drawn from real feature coordinates and real sizes (the
moon-face method). Two angles, kept apart on purpose: **`vlat`**, the latitude
the planet is SEEN FROM, which sets how the bands curve and how far open a ring
system looks, and **`pa`**, how far the drawing is leaned on screen. They used
to be one number — the axial tilt — which drew Saturn's rings open by 26.7°
while its bands were projected as if the viewer sat on its equator, two
viewpoints in one picture. For a ringed planet `glAspect()` now SOLVES the
sub-Earth latitude on the ring plane from the IAU pole direction and the
planet-to-Earth vector (and the sub-solar one, which casts the rings' shadow on
the globe), so the rings open by the real angle for the date — near zero around
a crossing, the full tilt only at solstice — and the planet is framed the way
every photograph of it is, ring plane flat to the viewer. `ringAspect()` exports
the pair so a page can quote the angle it is drawing. Each ring is a filled
annulus, not a stroked arc: a stroke is the same width in every direction and
made a nearly edge-on system a smudge.

### `seo/tools/planets.mjs`
Where the planets are: Keplerian elements with per-century rates (the standard
approximate-positions method), Kepler's equation by Newton–Raphson, heliocentric
ecliptic coordinates. Good to arcminutes over 1800–2050, which is far finer than
a 960px picture can show — it is not an ephemeris. `PLANETS_JS` is the shared ES5
source (one source, two runtimes, like moon.mjs); `SOLAR_JS` holds the drawing,
`RUNGS` the zoom ladder as data (build-solar writes copy ABOUT the ladder, so it
and the drawing must come from one table) and `SOL_FRAME`/`FRAME_R` the square
frame every scale figure in that copy is computed from.
**`check-planets.mjs` proves the element table** rather than
trusting it: Earth's heliocentric longitude against the sun's geocentric
longitude from moon.mjs (a different series — they agree to 0.16°), every derived
period against the known one, and Mercury's and Venus's greatest elongations
against 18–28° and 45–47°, which exercises both inner orbits and Earth's. Run it
after touching the table; a transposed digit fails at least one check.

### `seo/tools/satellites.mjs`, `smallbodies.mjs`, `transfer.mjs`
The three tables the solar-system pages are built on, each an ES5 source string
(the moon.mjs pattern) plus its own drawing layer, and **none of them trusted** —
`check-solar-data.mjs` (`npm run check:solar`) proves all three against numbers
they did not supply.

- **`satellites.mjs`** — the moon systems, and each planet's own GM, radius and
  rotation. Every moon carries a semi-major axis AND a period, which Kepler's
  third law ties together, so all nine of Saturn's moons must agree on one GM and
  it must be Saturn's; the Laplace resonance (n₁−3n₂+2n₃ = 0), Mimas:Tethys,
  Enceladus:Dione and Titan:Hyperion are checked too. Mercury and Venus are in
  the table with EMPTY moon lists because mass and gravity are derived from their
  GM. **Positions along the orbits are NOT solved for** — sizes, radii, periods
  and direction are real, the starting angles are a golden-angle spread, and the
  picture, the read-out and the page all say so. `frame` names the moon that sets
  the edge of each view (no rule gets it right: Callisto for Jupiter, but
  Saturn's Iapetus would shrink the rings to a smudge).
- **`smallbodies.mjs`** — the belt is **derived from Jupiter's semi-major axis**:
  every edge, Kirkwood gap, the Hildas and the Trojans are p:q resonances at
  a_J·(q/p)^⅔, so nothing is typed in beside the picture. Comets carry osculating
  elements plus a redundant period and perihelion distance, which must equal
  a^1.5 and a(1−e); their perihelion times must land on the apparitions they are
  known for. The four big asteroids are drawn as ORBIT RINGS, never dots — an
  orbit needs no epoch, a position does.
- **`transfer.mjs`** — launch windows solved, not tabulated: a minimum-energy
  transfer sweeps 180°, so the window is where the target will have reached the
  far end of the ellipse by the time the ship does. Iterated to a fixed point per
  candidate departure, then bisected. Coplanar, minimum-energy and heliocentric
  (the burn from low Earth orbit is reported separately) — all three stated on
  the page. Checked against the textbook Hohmann figures and the synodic cadence.

### `seo/tools/art.mjs`, `seo/tools/flags.mjs`
Inline SVG occasion artwork and country-flag glyphs (no external assets).

---

## Data files (`seo/_data/`)

| File | Drives |
|------|--------|
| `site.json` | `origin` (domain), `indexnowKey` |
| `timers.json` | `durations` (array of seconds → preset pages) + `useCases` (egg, meditation, study, etc.) |
| `events.json` | hand-written rich event landing pages |
| `people.json` | celebrity birthday profiles → birthday-countdown pages |
| `popular-countdowns.json` | curated category lists + hub structure (`categories[]` with `links`/`more`) |
| `countries.json` | per-country countdown pages |
| `us-cities.json` | census top-1000 US cities (slug/state/lat/lon/tz/pop) for the /sun/ pages, state hubs and search index; generated by `make-us-cities.mjs` from `us-cities-top-1k.csv` |
| `solar-facts.json` | the solar-system pages' prose, including the `overview` pair of paragraphs each body shows on `/planets/`: per body a tagline, axial tilt, temperature, atmosphere, facts, **open questions** and dated **recent findings**. Deliberately holds NOTHING derivable — diameter, mass, gravity, year, moon counts and belt positions are all computed, so this file cannot disagree with the drawing |
| `coastal-links.json` | tide↔sun coastal mapping (station→nearest sun city ≤35 mi, same state); generated by `make-coastal-map.mjs`, read by build-tides + build-sun via `coastal.mjs` for reciprocal links |

**Timer durations** are intentional and finite (controls what Google indexes):
every 15s to 2 min, every 30s to 10 min, every minute to 30 min, every 5 min to
2 hr (~62 values). Arbitrary durations are not generated, so they aren't indexed.

---

## Page conventions (enforced by the generators)

- **The solar family's tree is `Home / Planets / <page>`.** `solarCrumbs()` in
  `solar-pages.mjs` draws it under the H1 and the SAME array becomes the
  BreadcrumbList JSON-LD, so the visible trail and the structured one cannot
  disagree. `/planets/` is the section hub; the simulator is one of its
  children, not its parent.
- **Full screen on a solar page is a LANDSCAPE grid: picture in column one,
  everything else in column two.** The drawing is square, so height is the only
  thing that can make it bigger, and a square in a 16:9 frame leaves ~40% of the
  width unusable — that width is where the read-out, the date and the timeline
  go. Stacking them under the picture (the old layout) made full screen draw the
  picture SMALLER than the page's own 70vh cap. Don't move anything back under
  the figure in landscape without re-measuring the square.
- **A planet page carries a simulator only if it has a view of its OWN** — its
  moon system, or (Earth) the Earth-and-Moon pair. Mercury and Venus have
  neither, and giving them the inner-planets view put the solar system
  simulator on a page about one planet and shipped the whole drawing engine to
  do it. They get the turning globe and a link. `pageJs(needs, cfg, sim)` is
  what leaves the simulator out; the page then opens at no rung, so assertNeeds
  does not apply to it.
- **The zoom ladder belongs to the simulator hub and nowhere else.** On every
  other page it used to be six links into `/solar-system-simulator/?zoom=…`
  sitting inside that page's own settings panel — a control that looked like a
  zoom for the picture beside it and was actually navigation to a different
  page with a different subject. Planet pages link onward by NAME instead
  (`/planets/`, the hub, the neighbouring planets). Don't put a `?zoom=` link
  on a page whose picture is not the thing being zoomed.
- **Canonical follows search intent, not a blanket rule.** A page with a unique
  answer and stable URL is normally self-canonical. Query states such as the
  Moon Lab's `?state=` remain useful shareable tasks but canonicalize to the
  clean hub. Genuine near-duplicates should be consolidated, redirected or
  canonicalized instead of padded only to justify another indexable URL.
- **Choose CSS/JS delivery by measured first-load cost.** Inline the small
  critical CSS needed to paint the first view and tiny page-only behavior when
  that removes a blocking request. Hoist repeated or noncritical controllers to
  content-hashed `defer` assets so browsers can cache them; lazy-initialize a
  heavy below-fold interaction when that improves measured loading without
  making its first click feel broken. Source of truth is
  `assets/css/parts/*.css` and `assets/js/*.js` — never edit `style.css`
  (generated) or the emitted copies in generated HTML. PageSpeed/Lighthouse and
  real transfer/parse cost decide the exception, not "always inline" or
  "always external."
- **CSS is per-section**: each part is tagged with a section in
  `seo/tools/css-parts.mjs`, and `build-inline` picks a page's sections by
  probing its own markup, so a timer page ships no alarm/tide/home CSS, and no
  page ships the countdown display, the `/work/` widgets, the `/sun/` dial or the
  event-page shop rows unless it renders them. Two invariants keep it safe: parts
  are always emitted in SPEC (= original) order, so a page's cascade is a
  subsequence of the old one; and **`build-inline` fails the build if the probes
  give a page less CSS than its markup could use** — `sectionsNeeded()` in
  css-parts.mjs derives that from the CSS's own selectors, so a wrong probe regex
  cannot ship an unstyled page. A rule shared beyond its widget (`.tool-msg`,
  `.chip`, `.tool-about`, `.tool-uses`, `.ac-dialog`) belongs in a `core` part —
  several are carved out in place as slivers for exactly this reason.
- **JS is page-isolated**: the alarm page ships no timer/stopwatch JS and vice
  versa, to keep each page lean.
- **Shared controllers are hoisted, not inlined.** A `<script data-ac="shared"
  data-name="X">` is written once to `/assets/js/X.<contenthash>.js` and replaced
  with a `defer` tag (`build-inline.mjs`). The `/sun/` and `/moon/` city
  controllers and the tide bundle go this way — 61KB, 51KB and 76KB that are
  byte-identical across their families. Same technique for the moon-face sprite
  (`/assets/img/moon-face.<hash>.svg`, referenced by `<use>`). The hash is what
  makes the one-year `_headers` cache safe, and the files do not change when the
  hourly rebuild re-bakes today's times.
- **Moon Lab state is a string contract.** `/moon-simulator/?state=<name>` and
  concept-page `data-state="<name>"` must use an enum in
  `concepts.schema.json`, not an unvalidated free-form value. A new state must
  supply a different question and observable task, render a complete static
  first frame, and use the same painter at build time and in the controller.
- **JSON-LD** (`WebApplication`, `FAQPage`, `BreadcrumbList`) via lib helpers.
- **Favicon** is the logo SVG, written to `/favicon.svg` by `build-inline.mjs`.
- Commit + push to `main` to deploy; Cloudflare Pages publishes automatically.

---

## Cloudflare (Functions + config)

- `wrangler.toml` — `pages_build_output_dir = "."`, `nodejs_compat` flag,
  compatibility date (needed by the preview-image renderer). KV bindings:
  `RATE` (report submissions + per-IP throttle), `VIEWS` (per-countdown counter).
- `_routes.json` (repo root) — scopes Functions to `/api/*`. Without it Pages gives
  the `functions/` directory a catch-all route and every static page view invokes a
  Function. There is no `_middleware.js`: the moderation check moved into
  `functions/api/og.js`, the only route that renders visitor-supplied text.
- **Admin read APIs are gated.** `/api/reports`, `/api/views?stats=1`, GET
  `/api/purpose`, GET `/api/emails` and GET `/api/report` all require
  `MOD_LOG_KEY`, sent as an `X-Admin-Key` header (see `functions/api/_admin.js`);
  the dashboards prompt for it and keep it in `localStorage`.
- `functions/api/og.js` — 1200×630 social preview PNG via `workers-og` (only npm dep),
  used by curated event pages.
- `functions/api/views.js` — KV view counter; `popular.js`/`trending.js` — rankings.
- `functions/api/geo.js` — echoes the visitor's coarse edge lat/lon/city (Cloudflare IP
  geo, no external call). Currently unused (was used by the homepage tide card, removed).
- `functions/api/purpose.js` — KV tally endpoint for a since-removed tide-search purpose
  prompt; nothing writes new entries, GET still shows historical totals.
- `/admin/stats/` — noindex owner dashboard: per-main-page daily-unique visits (beacons injected by `build-inline` via `PAGEVIEW_IDS`), purpose tally, upstream-API health.
- `functions/api/report.js` + `reports.js` — abuse reports / site-idea suggestions → `/admin/`.
- `functions/api/emails.js` — log of emails the site has sent (currently just report-related), for `/admin/stats`.
- `functions/moderation.js` — shared moderation helpers.
- Edge moderation: `build-waf.mjs` generates a WAF/redirect rule from
  `cloudflare/blocklist.txt` (steps in `cloudflare/waf-rule.md`); banned
  content is blocked before any page or preview renders.
- **Custom, user-created countdowns were retired** (too much risk of impersonation/
  abuse from unmoderated public share links). `/c.html` and `/widget/` are now static
  "no longer available" notice pages; there is no dynamic countdown rendering, no
  countdown-creation data collection, and no related abuse-notification pipeline.

---

## What the site is about (the line every page should be able to answer to)

**Gravity, motion, time and space are one set of rules, and every page here is
one of them seen from a different side.** A day is the Earth turning; a year is
it going round; the seasons are that turn being tilted; the tides are the moon
pulling on an ocean; a planet, a moon and an asteroid all stay up for the same
reason; time zones exist because the planet is round and turning, and a clock
is how we agreed to count it. Taught separately those are facts to memorise.
Shown together they are one idea you can watch happen, which is the whole
premise of the site — and the reason the simulators matter more than the
countdowns do.

Two places carry that framing, and they are the two to keep in step:

- **`/about/`** — hand-maintained. The vision, then the owner's own story (a
  dad and his daughter, why it is free, what he wants from classrooms), then
  the invitation: **a class that comes up with an idea we build gets credited
  on the page**, and a teacher can bring a lesson before they teach it and have
  it published with them. That invitation is a promise the site has now made in
  public — keep `/classroom/#ask`, the privacy policy's class-request section
  and this page saying the same thing.
- **`/about/work-with-us/`** — hand-maintained, the invitation in full: the
  three ways in, what happens after you write, the credit line field by field,
  what is NEVER published (anything about a student), the shapes of idea that
  fit the site's "computed, never typed" rule and the ones that do not, and
  what cannot be promised. `/about/`, `/classroom/#ask` and the footer all
  point at it. **The worked example names Mr. Smith's 5th grade class at
  Paradise Elementary in Paradise, California** — the owner's own school and
  his own fifth-grade teacher, and the page says so, because an example that
  is quietly personal reads as an invitation rather than as a template. Keep
  the name and the note together: without the note it reads as a class that has
  asked for something. The note now says what is true — it is a real school and
  a real class, the owner's own, more than thirty years ago — and that no class
  has asked for anything yet.
- **The sitewide footer** (`build-inline.mjs`) — two lines under every page:
  the topical links (`TOPIC_LINKS`: the Sun/Earth/Moon, day & night, the solar
  system, the planets, gravity & orbits, sunrise, moon phases, time zones), and
  the classroom invitation with the credit promise in it. It replaced a row of
  countdown categories that sat under 4,000 pages mostly about the sky. The
  countdown hub link and the trademark line now appear ONLY on countdown-family
  pages (`EVENT_PAGE`), which are the pages that need them.

## Who the site is for

**Teachers, classrooms and children.** That is the audience the content is
chosen for, and it is a filter, not a preference: in August 2026 five families
were retired for failing it (the 420 countdowns, the /work/ office countdowns,
and the party, entertainment, anniversary and shopping categories) along with
fourteen celebrity birthday pages — adult catalogues, and partisan political
figures. Washington, Lincoln and MLK stayed, because they are curriculum;
elections and the inauguration stayed, because civics is.

Before adding anything, apply the same test: **would a teacher be comfortable
putting this on a projector in front of ten-year-olds, and a parent comfortable
finding it in a browser history?** In particular —

- **No alcohol anywhere.** A page can be entirely appropriate and still hand a
  child a link to something it should not.
- **Nothing is sold, and nothing is monetised by sending a reader away.** The
  site carried Amazon Associates links for years — a shop card on ten holiday
  pages, buy buttons beside a person's books and albums, an egg-timer card on
  the timer, and a paid-promotion pitch at `/promote-event/`. All of it was
  removed in August 2026, along with the affiliate tag in `site.json`, the
  `/affiliate-disclosure/` page, the shopping-sale cross-links and the
  disclosure clauses in the terms and privacy pages. Google Analytics is the
  one third party that stays, and it is named in the privacy page.

  **Do not write "never" about money.** The site may need to pay for itself one
  day — most likely a sponsor — and a promise the owner cannot keep is worse
  than no promise. `/about/#funding` is the one place that speaks for the site
  on this, and what it commits to is a STANDARD, not a ban: the tools stay
  free with no account; nothing tracks or profiles children; nothing is sold to
  students; anything paid for is labelled as paid for where it appears; a
  sponsor buys a name and a thank-you, never a number or a conclusion; and that
  page changes first if any of it changes. **`/sponsors/` is the practical half
  of it** — what a sponsor gets, what a sponsor cannot buy, and the technical
  terms (static-HTML credit, no third-party JS ever, an inlined SVG logo served
  from this domain, GA the only third party). It names CATEGORIES of
  organisation, never a company: a named target list on a public page implies
  an affiliation the site does not have. **Sponsorship is a YEAR at a time** —
  priced against the year's real traffic, renewable but never automatic, one
  sponsor sitewide by preference and a section sponsor where the fit is
  obvious, and the credit comes down when the term ends unless a longer deal
  was agreed in writing. **A long agreement is welcome — permanence is not for
  sale.** The owner's preference is ONE sponsor, sitewide, for the long term,
  structured so growth pays (a base plus steps tied to real traffic), reviewed
  once a year against the numbers. The only thing that outlasts a term is the
  published account of what the money built, which is a record rather than an
  advertisement.

  **No forever words in business copy.** The site's commitments come in two
  kinds and they are written differently. The ETHICAL floor is absolute and
  stays absolute — nothing about a student is ever published, nothing tracks or
  profiles a child, a page a ten-year-old is reading is not a shop, and no
  sponsorship brings third-party JavaScript with it. Everything else is a
  statement about TODAY plus an intention: "free … for as long as I am running
  the site", "no advertising as it stands", "if that ever had to change, this
  page would say so in advance". Words like *forever*, *permanently*, *ever* and
  *always* do not belong in the second kind, and an audit for them is worth
  repeating whenever this copy is touched. Copy elsewhere should describe the
  present ("the site carries no advertising and sells nothing today") and link
  there rather than restate the promise in its own words — one wording, in one
  place, is what keeps this honest. Adding an ad slot, an affiliate link or a
  product button without meeting that standard is still out.
- **No R-rated or TV-MA titles** in a person's "works" list, even where they are
  that person's most famous credit. Use their family-rated work.
- **No partisan framing.** Historical and civic material is welcome; a countdown
  to a sitting politician's birthday is not.
- Retiring a page means a **301 in `_redirects`** — every one of those 60 URLs
  was indexed, and a 404 throws away what the page earned.

## Slash-command skills (`.claude/commands/`)

- `/deploy` — build and fast-forward `main` so Cloudflare publishes.
- `/maintain` — full maintenance pass (verify dates, fix links, refresh, deploy).
- `/check` — audit only (stale dates, broken links), change nothing.
- `/add-event` — add a permanent event page.
- `/seo-pass` — improve the thinnest pages for search.
- `/review-reports` — read visitor reports from the Google Sheet and act on them.

---

## How to regenerate from scratch

1. `npm install` (fetches `workers-og` + `wrangler`).
2. `npm run build` — regenerates every `*/index.html`, `sitemap.xml`, and the
   theme rules in `style.css` from `seo/tools/` + `seo/_data/`.
3. `npm run check` — verify dates/links.
4. Commit and push to `main` (Cloudflare Pages auto-deploys), or
   `npm run deploy` for a direct wrangler deploy.

The generated content directories (`timer/`, `alarm-clock/`,
`*-countdowns/`, `world-clock/`, `sitemap.xml`, etc.) are committed to the repo
for convenience, but they are **fully reproducible** — `npm run build`
overwrites them. Only the sources under `seo/`, `assets/`, `functions/`, the
root HTML/config files, and this knowledge file are irreplaceable. (`.gitignore`
only excludes `node_modules/`, `.wrangler/`, `.dev.vars`, logs, `.DS_Store`.)
