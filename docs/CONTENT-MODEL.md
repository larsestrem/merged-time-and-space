# Content model — hub, concept, glossary

## Why this exists

The live site ranks for tool queries (`day night map`, `world clock`) and then
asks those pages to also rank for definition queries (`what is the tropic of
cancer`). That makes hubs too long and splits the internal-link signal.

**One intent per URL.**

| Intent | URL | H1 | First 80 words |
|---|---|---|---|
| Use the tool | `/day-night-map/` | Day and night map | How to read the map |
| Ask the question | `/concepts/what-is-the-tropic-of-cancer/` | What is the Tropic of Cancer? | The answer |
| Look up the word | `/glossary/` | Glossary | How to use the list |

## Hub

1. Interactive (map, simulator, clock) at the top
2. How to read it, in a few lines
3. 4–8 teasers. **The question is the link.** One sentence after the link, not the essay.
4. Hash ids (`#tropics`, `#terminator`, …) stay on the teaser so old inbound links land
5. “See also” into sibling hubs, never a second copy of a concept

City/date pages: live numbers + 1–2 concept links. No 800-word essay.

## Concept

```
H1 = question
shortAnswer (grade 5–12, ≤80 words)
graphic (reuse live-site math; caption + alt state the geometry)
simulatorState (when interactive: a validated string selecting one distinct task)
sections[]  — band "5-12" then "deeper"
seeItLive[] — back to the hub / simulator
relatedSlugs[] — other questions, as links whose text is the question
```

Unique `<title>` and meta description. `hreflang="en"`. Canonical = this URL.

FAQ JSON-LD only for real Q/A (the H1 + shortAnswer counts as one).

For Moon questions, use the shared Moon Lab instead of a decorative generic
orbit. `simulatorState` selects the question, starting value, controls and
observation in both the concept embed and `/moon-simulator/?state=<name>`.
Each page still ships a complete static SVG, task and result before JavaScript;
the deferred shared controller adds exploration rather than supplying the
meaning. Do not create a new state unless changing it can reveal something the
visitor can explain.

## Glossary

Built from the same `concepts.json`. Do not write a second definitions file.

Each row:

- **Term** (DefinedTerm.name)
- **Question** as the `<a href="/concepts/<slug>/">`
- **shortAnswer** (the definition)

A–Z headings. Search/filter is optional enhancement; the HTML must be complete without JS.

`/concepts/` with no slug redirects to `/glossary/` (or lists the same set). It is not a competing essay.

## Redirects

See `_redirects` and `AGENTS.md`. Hubs never 301. Essay-only URLs 301 into `/concepts/`.

## Voice

- Grade 5–12 in the answer and the first sections
- More complex further down, labelled by the `deeper` band
- Tabular numerals on every digit in the UI
- No emoji as icons
- No “forever” claims about funding
- Original sentences. Do not paraphrase another publisher's essays.
- Facts, ideas, and the pattern of a page are not copyright. Copied sentences, pictures, tables, and code are.

## First cluster slugs

**Day/night**

- `what-is-the-tropic-of-cancer`
- `what-is-the-tropic-of-capricorn`
- `what-is-the-subsolar-point`
- `what-is-the-terminator`
- `what-is-earths-axial-tilt`
- `what-are-the-polar-circles`
- `what-is-twilight`
- `why-is-this-map-flat`

**Questions (one concept page each; the glossary is the A–Z door)**

- `why-dont-planets-fall-into-the-sun`
- `how-does-an-orbit-work`
- `why-do-we-have-seasons`
- `why-does-the-moon-change-shape`
- `what-causes-tides`
- `why-does-jupiter-have-so-many-moons`
- `why-is-the-night-sky-dark`

**Simulator**

- `what-is-a-synodic-month`
- `what-is-tidal-locking`
- `what-is-libration`
- `why-does-moonrise-get-later`
- `why-isnt-there-an-eclipse-every-month`
