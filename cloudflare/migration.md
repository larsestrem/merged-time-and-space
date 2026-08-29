# Migration: time-and-space → merged-time-and-space (August 2026)

The site moved repos. A Cloudflare Pages project is permanently tied to the
repo it was created from, so the move is: finish outfitting the NEW project
(`merged-time-and-space`), move the domain, retire the old pair. Everything
in the repo itself — workflows, Functions, `_headers`, `_redirects`,
`wrangler.toml` — is already identical or better here; this file is the
dashboard half, same reason `cache-setup.md` exists. Tick boxes as you go.

Zone-level things need NO action: DNS, the Cache Rule, the WAF/redirect
moderation rule, Zaraz/GA, and the alarm-clock.org 301 all belong to the
`timeandspace.science` zone, not to either Pages project.

## On the NEW Pages project (dashboard → Workers & Pages → merged-time-and-space)

- [ ] **1. Build settings** (Settings → Builds & deployments): build command
      `npm run build`, output directory `/` (wrangler.toml also declares it).
      The build-on-deploy is what bakes fresh sun/tide/countdown numbers each
      hour with no commit — without the build command the hourly hook is a no-op.
- [ ] **2. KV bindings**: after the next deploy (wrangler.toml now names this
      project, so its `[[kv_namespaces]]` apply), check Settings → Bindings
      shows `RATE` and `VIEWS`. If they don't appear, add them by hand with
      the SAME namespace ids from wrangler.toml — same namespaces = every
      view count and stored report carries over untouched.
- [ ] **3. Environment variables** (Settings → Environment variables,
      Production). Secrets can't be read back out of the old project, so
      enter the values from your own records:
      - `MOD_LOG_KEY` — the key you type into /admin/reports (your browser
        on that page has it in localStorage if you've forgotten it).
      - `REPORT_WEBHOOK` — the Apps Script /exec URL (same value as the
        GitHub Actions secret).
      - `VIEW_HASH_KEY` — same value as before if you have it; if not, any
        new long random string (the only cost is one day's unique-visitor
        dedupe restarting).
      - `RESEND_API_KEY`, `FROM_EMAIL`, `REPORT_EMAIL` — only if the old
        project had them (Resend email path; the webhook covers delivery
        without them).
- [ ] **4. Deploy hook** (Settings → Builds & deployments → Deploy hooks):
      create one, name it e.g. `hourly-rebuild`, copy the URL for step 6.
- [ ] **5. Custom domain**: on the OLD project remove `timeandspace.science`
      (and `www` if present), then add both on the NEW project. Minutes to
      take effect; verify /alarm-clock/ and one /sun/ city page load.

## On GitHub (merged-time-and-space → Settings → Secrets and variables → Actions)

- [ ] **6.** `CF_DEPLOY_HOOK` = the URL from step 4. Without it, rebuild.yml
      (hourly freshness) and maintenance.yml's rebuild step silently skip.
- [ ] **7.** `REPORT_WEBHOOK` = the Apps Script /exec URL. Without it, the
      daily maintenance email silently skips.
      (fetch-tides.yml and indexnow.yml need no secrets — already running.)

## Retire the old pair

- [ ] **8.** Old repo (time-and-space) → Actions tab → disable all five
      workflows (rebuild, maintenance, fetch-tides, indexnow, ci). Otherwise:
      double maintenance emails, and ~720 wasted builds/month rebuilding a
      project nothing serves.
- [ ] **9.** Keep the old Pages project a week as rollback, then delete it;
      archive the old repo.
- [ ] **10.** Re-create the deployment-failure notification (dashboard →
      Notifications) for the new project, if one existed for the old.

## After the move — five-minute test list

- [ ] A countdown page increments its view counter (needs KV `VIEWS`).
- [ ] The report form on /report submits and lands in the Sheet/Gmail
      (needs `REPORT_WEBHOOK` on the project).
- [ ] /admin/reports opens with `MOD_LOG_KEY`.
- [ ] /api/og?name=test returns a PNG (needs nodejs_compat via wrangler.toml).
- [ ] GitHub → Actions → run "Hourly rebuild" manually once; confirm a new
      deployment appears on the NEW project.
- [ ] Next morning: exactly ONE maintenance email (or none — since the
      August 2026 rework it only sends when something is actionable).

## Still open from cache-setup.md (unrelated to the move, but bit us already)

The 2-hour edge Cache Rule (Part 2) is live without the deploy-purge worker
(Part 3), so a deploy can stay invisible on the custom domain for up to two
hours. Either build Part 3 — pointed at the `merged-time-and-space` project —
or pause the Cache Rule until it exists.
