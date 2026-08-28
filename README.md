# timeandspace.science — merged

This repository is a copy of **[larsestrem/time-and-space](https://github.com/larsestrem/time-and-space)** with the **question / concept content model** from **[larsestrem/new-time-and-space](https://github.com/larsestrem/new-time-and-space)**.

**Kept from the original:** every simulator and drawing — tilt, speed, Now, date/time slider, zoom, moon toggles — and the tools that build them (`seo/tools/`, `assets/js/`, `assets/img/`). The rebuild's primitive pictures were not used.

**Taken from the rebuild:** one intent per URL. A hub (simulator, map, clock) puts the interactive first, then a short “what this is and how it works”, then 4–8 questions. **The question is the link.** A one-sentence answer sits on the hub; “Get more” opens `/concepts/<slug>/` for the drawing and the deeper pass.

See [docs/CONTENT-MODEL.md](docs/CONTENT-MODEL.md).

---

Free, no-sign-up clock and astronomy tools, as a static site on Cloudflare Pages.
Formerly **alarm-clock.org** — same site, new domain.

- **Time** — [alarm clock](https://timeandspace.science/alarm-clock/),
  [timer](https://timeandspace.science/timer/) (three at once),
  [stopwatch](https://timeandspace.science/stopwatch/) and
  [up to six at once](https://timeandspace.science/stopwatch/multiple/),
  [world clock](https://timeandspace.science/world-clock/),
  [countdowns](https://timeandspace.science/countdown/).
- **Earth** — [sunrise & sunset](https://timeandspace.science/sun/) for ~1,100 cities,
  [moon phases and moonrise](https://timeandspace.science/moon/),
  [NOAA tide charts](https://timeandspace.science/tides/).
- **Space** — [Sun–Earth–Moon simulator](https://timeandspace.science/sun-moon-earth-movement-simulator/),
  [solar system simulator](https://timeandspace.science/solar-system-simulator/)
  with a page per planet, [rocket launch windows](https://timeandspace.science/rocket-launches/),
  [orbits & gravity](https://timeandspace.science/orbital-velocity-simulator/).
- **Learn** — [glossary](https://timeandspace.science/glossary/),
  [concepts](https://timeandspace.science/glossary/) (one question per URL).
- **For teachers** — [the classroom guide](https://timeandspace.science/classroom/).

## Two rules the whole repo rests on

**Every number is derived, never typed in.** Mass comes from GM, gravity from
GM/r², a planet's year from Kepler, sunrise from the real solar position. Where a
picture is *not* to scale, the page says so **in numbers computed from the
drawing itself**, so the disclaimer cannot go stale when the drawing changes.

**The generated HTML is disposable.** The ~4,150 `*/index.html` directories are
committed for convenience but are fully reproducible: `npm run build` rewrites
every one of them from `seo/tools/` + `seo/_data/`. The irreplaceable sources are:

```
seo/tools/*.mjs        the generators
seo/_data/*.json       the content they read
assets/css/parts/*.css one file per section, assembled by build-css
assets/js/*.js         tool page scripts (inlined at build)
functions/             Cloudflare Pages Functions (/api/* only)
CLAUDE.md              the architectural source of truth — read this first
```

## Build

```bash
npm install
npm run build      # ~2 min, regenerates the whole site + sitemap
npm run check      # date/link audit
npm run dev        # wrangler pages dev . (site + Functions locally)
```

The build is gated. `check-dates --gate` fails it if anything dated is still
presented as upcoming after its date has passed; `check-crosslinks` fails it if a
sun/moon/tide cross-link is one-way; `check-pages` fails it if any page is
missing a title, an H1, the nav, or has an internal link that resolves to
nothing. A failed build aborts the deploy and the last good version keeps
serving — which is the point: a countdown to a day that has been and gone is the
site failing at the one thing it exists to do.

Deploy = push to `main`; Cloudflare Pages publishes automatically.

See **[CLAUDE.md](CLAUDE.md)** for the full architecture: the generator order and
what each one produces, the shared modules, the page conventions, and the
reasoning behind the parts that look odd on purpose.
