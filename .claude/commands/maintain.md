---
description: Full maintenance pass - verify dates, fix broken links, refresh, deploy
---

Run a full maintenance pass on timeandspace.science. Work carefully; accuracy beats volume.

1. Run `node seo/tools/check-dates.mjs` and `node seo/tools/check-links.mjs` and collect the FINDING lines.
2. For every date finding, research the real current date with web search against official sources (league, organizer, retailer sites). Update `seo/_data/events.json` (and `popular-countdowns.json` / `countries.json` where the same event appears):
   - one-off events (`once`): set the next confirmed date/time/tz and refresh any year-specific copy.
   - date tables (`dates`): append future years. Estimates are fine only if the page copy already says dates are estimates; otherwise add that caveat.
   - if an official date is not yet announced, use a documented typical-pattern estimate plus "dates are estimates until announced" wording. Never guess silently.
3. For every broken (not bot-blocked) link, find the working official replacement and update the data. Remove a link only if no good replacement exists.
4. Site conventions: never use em or en dashes in visitor-facing text (commas, colons, periods instead); keep the {YEAR}/{DATE}/{NTH} tokens in evergreen copy; JSON files are 2-space indented; never hand-edit generated HTML.
5. Run `npm run build` and confirm it succeeds cleanly.
6. Commit with a summary that lists each date/link change and the official source you verified it against, push the working branch, then fast-forward `main` and push it to deploy (the established flow for this repo).
7. Finish with a short report: what changed, what was verified-unchanged, and anything that needs my decision.

If both audits come back clean, say so and stop; do not invent work.
