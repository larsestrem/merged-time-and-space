---
description: Improve the thinnest pages for search (titles, intros, facts, internal links)
argument-hint: [optional: number of pages, default 5]
---

Do a conservative SEO improvement pass on the $ARGUMENTS (default 5) thinnest event pages.

1. Scan `seo/_data/events.json` and `people.json` for pages with the weakest titles/descriptions/intros: vague phrasing, missing "when is / countdown / time until" intent, intros that do not state the concrete date, fewer than 3 facts, or no internal cross-links to related events.
2. Rewrite only what is weak, matching house style exactly: concrete dates via {YEAR}/{DATE}/{NTH} tokens, no em or en dashes, titles with a colon separator, natural sentences (no keyword stuffing).
3. Where it genuinely helps a reader, add a cross-link phrase the inline-linkifier will pick up (see the CROSS table in build-events.mjs) or an official outbound link.
4. Run `npm run build`, spot-check the changed pages, commit with a before/after summary per page, push the branch, fast-forward `main` and push to deploy.
5. Report each page changed with the old and new title/description so I can judge the improvements.
