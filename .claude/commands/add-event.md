---
description: Add a new permanent event page (name/date supplied or researched)
argument-hint: [event name, e.g. "Groundhog Day"]
---

Add a permanent countdown page for: $ARGUMENTS

1. If the event name above is empty, ask me what event to add. Research the event's date pattern with web search and official sources: fixed date, nth weekday, movable (use a `dates` table for 5+ future years), or one-off (`once` + time + tz).
2. Add the event to `seo/_data/events.json` following the existing schema and house style:
   - title targeting "when is / countdown" search intent, with a colon instead of a dash
   - concrete intro using the {YEAR}/{DATE} tokens where the year varies
   - 2-3 short sections, 4 quick facts, official + Wikipedia links, a fitting zero `message`, and a `plan` CTA if a watch party or gathering makes sense
   - pick an existing art/theme that fits, or draw a new flat SVG (viewBox 0 0 120 120) in seo/tools/art.mjs if nothing fits - render and eyeball it before committing
   - never use em or en dashes in visitor-facing text
3. Add it to the right category in `seo/_data/popular-countdowns.json` (and a country page if it is country-specific).
4. Run `npm run build`, verify the new page generated correctly (title, intro, countdown script, links).
5. Commit, push the working branch, fast-forward `main` and push to deploy. Show me the new page path.
