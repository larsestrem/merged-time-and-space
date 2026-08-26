# timeandspace.science — Backlog

Durable task list for future sessions, building on the "fan page" work
(music modules + timelines shipped 2026-07-15 for all 63 people entries).
Read this alongside `docs/PROGRESS.md` at session start. Per the project's
one-feature-per-session convention, pick one numbered section per session
rather than spanning several.

---

## 1. Sports events (18 pages in `sports-countdowns/`)

Add records blocks to all 18: World Cup, Super Bowl, Olympics, March
Madness, World Series, Masters, Daytona 500, Indy 500, Kentucky Derby,
Boston Marathon, NFL Kickoff, NFL Draft, MLB Opening Day, Selection
Sunday, WrestleMania, Tour de France, Wimbledon, Monaco Grand Prix.

- **Champions list** (last 10-15 winners) per event — highest-intent query
  ("who won X last year"), strong for snippets/backlinks. May need a new
  schema field distinct from `records`, e.g.
  `champions: [{year, winner, note}]`.
- **"How to watch" evergreen block** (channel/streamer) — high search
  volume, currently missing entirely.
- **Fix march-madness-countdown art gap**: its `art: "trophy"` key
  doesn't exist in `art.mjs`'s `ART` map, so it silently falls back to
  the generic clock icon.

## 2. Holidays (`holiday-countdowns/`, ~33 pages)

- Audit which are thin (some like Star Wars Day are already rich; others
  may only have 1-2 sections/facts).
- Add history/origin depth + a records block where a holiday has genuine
  superlatives (e.g. tallest Christmas tree, largest Halloween
  gathering).

## 3. Remaining celebrities (`people.json`, 63 entries + `birthday-countdowns/`)

- Most already have about/facts/2-3 sections + a `timeline`; none
  currently use the `records` field. Decide which deserve it (athletes
  especially — a natural fit for LeBron, Messi, Serena, etc.) vs. which
  should stay prose-only.
- Consider extending `records` (or a similar field) into people.json →
  `lib.mjs`'s `fromPeople` mapping, since it's currently only wired for
  events.json.

## 4. Cross-cutting ideas not yet built

- `SportsEvent` schema.org type instead of generic `Event` for the 18
  sports pages.
- Stat-driven title/meta description hooks for CTR (e.g. bake a record
  into `desc`).
- OG share-image fact overlay (`functions/api/og.js`) for social CTR,
  not just search.
- Surface the verified fact-check date in the UI (currently the footer
  shows build date, not the per-event verified field).
