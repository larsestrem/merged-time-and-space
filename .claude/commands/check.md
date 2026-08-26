---
description: Audit only - report stale dates and broken links, change nothing
---

Audit the site without changing anything.

1. Run `node seo/tools/check-dates.mjs` and `node seo/tools/check-links.mjs`.
2. Summarize the findings in plain language, grouped into: dates that passed, date tables running low, broken links, bot-blocked links (usually fine).
3. For each finding, say what the fix would be and roughly how confident you are, but do NOT edit anything.
4. End by asking whether I want you to run the fixes (equivalent to /maintain).
