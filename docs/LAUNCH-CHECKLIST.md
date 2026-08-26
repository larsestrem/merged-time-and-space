# timeandspace.science — launch verification checklist

Every page that depends on a backend, and the browser test that proves it.
Tick items as verified. (State as of 2026-08-09; ✅ = proven in session,
⬜ = needs doing or needs a check.)

## Already proven — no action

- ✅ **Domain correct everywhere** — canonicals, sitemap, JSON-LD, og:image,
  hand-maintained pages all say timeandspace.science (commits e1b7eca, 54d8eae).
- ✅ **IndexNow → Bing** — submission of all 4,146 URLs accepted and recorded
  (commit 0c17dda). The push→submit pipeline is live.
- ✅ **Hourly rebuild** — CF_DEPLOY_HOOK tested; deployments run hourly.
- ✅ **BingSiteAuth.xml** — served from the site root (same account token as
  the old site).
- ✅ **/api/og moderation** — in code (functions/moderation.js via og.js), no
  zone rule needed. Spot-check: `/api/og?name=killer%20party` renders (allowlist),
  a query containing a real slur 302s to /not-found.
- ✅ **fetch-tides.yml** — needs no secrets (default token, contents:write);
  Mondays 09:40 UTC. First run confirms itself with a commit.

## A. Cloudflare-backend pages — test each in a browser

- ⬜ **The one-call backend check** (proves MOD_LOG_KEY + RATE binding +
  REPORT_WEBHOOK at once). PowerShell:
  `Invoke-RestMethod -Uri "https://timeandspace.science/api/report" -Headers @{ "X-Admin-Key" = "<MOD_LOG_KEY>" }`
  Want: `kv_bound: True, webhook_set: True, webhook_looks_right: True`.
  (501 = MOD_LOG_KEY missing from the Pages project; 401 = wrong key.)
- ⬜ **/popular/** — shows real historical view counts → the VIEWS KV binding
  carried over. Empty/zeroed = wrong namespace bound.
- ⬜ **/trending/** — shows a last-7-days ranking (same namespace, hourly buckets).
- ⬜ **Any event page** (e.g. /holiday-countdowns/christmas/) — the view
  counter renders; page's social card at /api/og loads as a PNG.
- ⬜ **/report/** — submit a real test report → row lands in the Google Sheet
  AND the 🚩 email arrives. This is the live path (the earlier health check
  proved the Apps Script; this proves Cloudflare → Apps Script).
- ⬜ **/wrong-date/ and /suggest-event/** — same pipeline, one submission each.
- ⬜ **/admin/reports** — enter MOD_LOG_KEY when prompted → the test report
  from above is listed.
- ⬜ **/admin/stats** — loads with the key; per-page beacons start populating
  within a day.

## B. Google tools

- ⬜ **Zaraz (= all of GA4)** — zone → Zaraz → add Google Analytics 4, ID
  `G-Z6VS7WYEP7`; enable Consent Management (the cookie banner calls
  `zaraz.consent.set()` — silent no-op without it). Verify: DevTools Network
  shows `/cdn-cgi/zaraz/` requests, and GA4 **Realtime** shows your own visit.
  In GA4 admin, update the data stream URL to timeandspace.science (same
  property — history continues) and add an annotation for the cutover.
- ⬜ **Google Search Console** — Add property → Domain → timeandspace.science
  → add the TXT record in Cloudflare DNS → Verify → Sitemaps → submit
  `sitemap.xml`. (Change of Address waits for the 301.)
- ⬜ **Google Sheet report sink** — proven by the /report/ test in section A.

## C. Bing

- ⬜ **Bing Webmaster Tools** — site verified (XML file method) and
  `sitemap.xml` submitted. The IndexNow panel should show the 4,146-URL
  submission within a few days.

## D. Client-side external APIs (no setup — CSP already allows; one test each)

- ⬜ A **/tides/** station page draws its chart (NOAA CO-OPS fetch).
- ⬜ **/sun/near-me/** resolves a place name (geolocation + BigDataCloud).
- ⬜ **/sun/anywhere/** search finds a town (Open-Meteo geocoding).

## E. Origin-change side effects (expected, not bugs)

- Notification permission re-prompts on the new origin — grant once and test
  a short timer's notification (/timer/) and an alarm (/alarm-clock/).
- localStorage started empty here: saved alarms/favourites from
  alarm-clock.org do not carry over (origin-scoped, by design).

## F. Off-site

- ⬜ **Amazon Associates** — add timeandspace.science to the approved website
  list BEFORE real traffic clicks an affiliate link (unlisted-site commissions
  can be voided).

## G. Waiting on the 301 decision (not yet)

- The 301 Redirect Rule on the alarm-clock.org zone (Dynamic:
  `concat("https://timeandspace.science", http.request.uri.path)`, 301,
  preserve query string).
- Freeze the old repo's workflows (rebuild / maintenance / indexnow).
- Search Console **Change of Address**; Bing **Site Move**.
- Until then: two live indexable copies exist; the established domain will
  keep winning searches. Expected, temporary, resolved by the 301.
