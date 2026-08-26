# Edge caching — Cloudflare dashboard configuration

**Status: not yet applied.** Tick the boxes below as each part is turned on, so
this file stays a record of what the dashboard actually holds rather than a plan.

`_headers` is the versioned half of the caching story; this file is the other
half, because these three pieces live in the Cloudflare account and leave no
trace in the repo. Same reason `waf-rule.md` exists.

> ### The domain move reset all of this
>
> Everything below is **per zone**, and the site now lives on the
> `timeandspace.science` zone. Nothing configured on the alarm-clock.org zone
> carries over: not the Tiered Cache toggle, not a Cache Rule, not an API
> token's zone scope, not the Zone ID. If any part of this was ever set up on
> the old zone, it is now decoration — redo all three parts here, on the new
> zone, and collect a fresh Zone ID. The new zone also starts **completely
> cold**: no page has ever been cached at any edge, so until this is done every
> first visit everywhere is an origin MISS.
>
> **The domain has no hyphens.** It is `timeandspace.science`, not
> `time-and-space.science` — the hyphenated name is unregistered and once went
> live in a redirect rule. Anywhere below that takes a hostname or URL, copy it
> from `origin` in `seo/_data/site.json` rather than typing it.
>
> Leave the **alarm-clock.org zone out of it**: no cache rule there, and never
> point the warmer at it. Its only job is the 301 (see `domain-redirect.md`),
> which is cheap at the edge as it is.

## The problem this solves

First loads run 600–800 ms, second loads ~200 ms. That gap is an edge MISS:
`_headers` serves `s-maxage=300`, Cloudflare's cache is per data centre (~300 of
them), and there are ~4,150 pages — so for most first visits in most places, the
five-minute copy has already expired and Cloudflare fetches from Pages origin.

`s-maxage=300` buys almost no freshness in exchange for that. Origin content
only changes when a deploy lands (hourly), so an edge copy 55 minutes old is
byte-identical to what origin would serve. The *only* thing the short TTL buys
is that a new deploy becomes visible within five minutes — and that is much
better bought with an explicit purge, which then frees the TTL to be long.

Nothing pre-warms anything today. There is no such workflow and there never was
one; `rebuild.yml` POSTs the deploy hook and stops.

- [ ] **Part 1 — Smart Tiered Cache** (a toggle, 2 minutes)
- [x] **Part 2 — Cache Rule**, 2-hour Edge TTL on pages (5 minutes) — applied
  2026-08-09
- [ ] **Part 3 — deploy-aware purge + warm Worker** (~20 minutes, one-time)

Part 3 is the one that makes Part 2 safe. Do not do Part 2 without it, or a
deploy can stay invisible for up to two hours — which is exactly the problem that drove
`s-maxage` down to 300 in the first place (see the comment in `_headers`).

---

## Part 1 — Smart Tiered Cache

Zone → **Caching → Tiered Cache** → enable **Smart Tiered Caching**.

Lower-tier data centres then fetch a miss through a regional upper-tier one
instead of each going to Pages origin independently. Two effects: every miss
worldwide gets cheaper, and warming (Part 3) starts to mean something, because
one warm request seeds an upper tier that all nearby data centres draw from.
Reversible with the same toggle.

---

## Part 2 — Cache Rule: 2-hour Edge TTL for pages

Zone → **Rules → Cache Rules → Create rule**. Name: `HTML edge TTL 1h`.
(The name says 1h because that was the plan; the dashboard's "Ignore
cache-control" dropdown turned out to bottom at **2 hours on the Free zone
plan**, so 2 hours is what is actually set — see the Edge TTL bullet.)

Check the zone name at the top of the page first — this rule belongs on
**timeandspace.science**, and the host in the expression must match it exactly
(copy it from `site.json`; a mistyped host makes the rule match nothing, which
fails silently — pages just go on missing).

**Custom filter expression:**

```
(http.host eq "timeandspace.science")
and not starts_with(http.request.uri.path, "/api/")
and not starts_with(http.request.uri.path, "/assets/")
and not ends_with(http.request.uri.path, "/sw.js")
and not starts_with(http.request.uri.path, "/favicon")
and not starts_with(http.request.uri.path, "/apple-touch-icon")
```

- **Cache eligibility:** Eligible for cache
- **Edge TTL:** *Ignore cache-control header and use this TTL* → **2 hours**
  (the dropdown's minimum on the Free zone plan; 1 hour needs a paid *zone*
  plan — Workers Paid is a different subscription and doesn't unlock it).
  2 hours is fine because freshness never came from the TTL: the Part 3
  Worker purges within ~2 minutes of every deploy, and deploys land hourly,
  so a copy almost never lives past ~62 minutes anyway. The TTL only decides
  the worst case when the purge FAILS — up to 2 hours stale instead of 1 —
  which makes Part 3 more load-bearing, not less. Do not run this rule
  without it.
- **Browser TTL:** *Respect origin TTL* — leave this alone. Browsers must keep
  seeing `max-age=0, stale-while-revalidate=300` from `_headers`, so a repeat
  visitor paints from cache and revalidates behind the paint, and never holds a
  page across a deploy without checking. Only the EDGE holds the two hours.

Every exclusion protects a deliberate behaviour that `_headers` or a Function
already sets, and "Ignore cache-control header" would otherwise override it:

| Excluded | Why |
|---|---|
| `/api/*` | Functions set their own `Cache-Control` (`no-store` for the view counter and reports); `/api/og` manages its own long cache |
| `/assets/*` | `_headers` gives images a week/year and content-hashed JS a year `immutable` — a blanket hour would SHORTEN them |
| `*/sw.js` | the timer and alarm service workers are `no-cache` on purpose, so a notification fix ships immediately |
| `/favicon*`, `/apple-touch-icon*` | marks, not pages; `_headers` gives them a week/year |

`/calendar/events.ics` is deliberately **not** excluded: `_headers` gives it
`s-maxage=3600` already, so the rule agrees with it rather than fighting it.

Once this rule is live, the `s-maxage=300` in `_headers` no longer governs HTML
at the edge — the rule overrides it. Leave the line as it is anyway: it is the
correct fallback if the rule is ever deleted, and the comment above it explains
the relationship.

---

## Part 3 — Deploy-aware purge + warm Worker

Cloudflare has no "purge the zone when a Pages deploy finishes" switch, and a
fixed-time purge breaks whenever GitHub's scheduler runs the `:20` trigger late
or the build runs long. So: a Worker on a 2-minute cron that asks the Pages API
whether there is a new *finished* production deployment since it last looked,
and only then purges and re-warms. Staleness after any deploy is bounded at one
cron interval regardless of when the build actually ran.

### 3a. API token

**My Profile → API Tokens → Create Token → Custom token**, with exactly two
permissions and nothing more:

- **Zone → Cache Purge → Purge**, scoped to *Specific zone: timeandspace.science*
- **Account → Cloudflare Pages → Read**, scoped to the account

A token created before the move, scoped to the alarm-clock.org zone, cannot
purge this one — the purge call answers 403 and the Worker quietly retries
forever. Make a fresh token scoped to the new zone.

The token lives as a Worker secret. Nothing goes in GitHub secrets and nothing
goes in this repo.

### 3b. IDs to collect

- **Zone ID** and **Account ID** — the **timeandspace.science** zone →
  Overview, right-hand API box. The Zone ID changed with the move; the Account
  ID did not.
- **Pages project name** — Workers & Pages, then **identify the project by its
  custom domains, not by its name**: the right one is whichever lists
  `timeandspace.science` under Custom domains. The name is an account-level
  label that has been changed at least once (`wrangler.toml` currently says
  `time-and-space`), so a name written here would only go stale. Use whatever
  the dashboard shows as the project slug at the time you set `PROJECT`.

### 3c. KV namespace

**Storage & Databases → KV → Create namespace** → `cache-warmer-state`.
It stores one key: the id of the last deployment already purged for.

### 3d. The Worker

**Workers & Pages → Create → Worker**, name `cache-warmer`, then Edit code:

```js
// cache-warmer: after each finished Pages production deploy,
// purge the zone cache and re-warm the top pages.

const WARM_URLS = [
  // hubs + highest-traffic pages; edit freely. Keep well under ~900 entries.
  "/", "/alarm-clock/", "/timer/", "/stopwatch/", "/stopwatch/multiple/",
  "/world-clock/", "/countdown/", "/calendar/", "/sun/", "/moon/", "/tides/",
  "/classroom/", "/methodology/",
  "/sun-moon-earth-movement-simulator/", "/solar-system-simulator/",
  "/timer/5-minutes/", "/timer/10-minutes/", "/timer/15-minutes/",
  "/alarm-clock/7-00-am/", "/alarm-clock/6-30-am/",
  "/holiday-countdowns/christmas/", "/holiday-countdowns/halloween/",
];

export default {
  async scheduled(event, env, ctx) {
    const dep = await latestProdDeploy(env);
    if (!dep) return;                       // API hiccup — try again next tick
    if (dep.stage !== "deploy" || dep.status !== "success") return; // building
    const seen = await env.STATE.get("last_deploy");
    if (seen === dep.id) return;            // nothing new since last purge

    const purged = await purgeAll(env);
    if (!purged) return;                    // keep old id -> retry next tick
    await env.STATE.put("last_deploy", dep.id);
    ctx.waitUntil(warm(env));               // best-effort, after the response
  },
};

async function latestProdDeploy(env) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}` +
    `/pages/projects/${env.PROJECT}/deployments?env=production&per_page=1`,
    { headers: { Authorization: `Bearer ${env.CF_TOKEN}` } }
  );
  if (!r.ok) return null;
  const j = await r.json();
  const d = j.result && j.result[0];
  if (!d) return null;
  return {
    id: d.id,
    stage: d.latest_stage && d.latest_stage.name,
    status: d.latest_stage && d.latest_stage.status,
  };
}

async function purgeAll(env) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ purge_everything: true }),
    }
  );
  return r.ok;
}

async function warm(env) {
  const base = "https://timeandspace.science";
  for (let i = 0; i < WARM_URLS.length; i += 6) {
    const batch = WARM_URLS.slice(i, i + 6).map((p) =>
      fetch(base + p, { redirect: "manual" }).then((r) => r.body && r.body.cancel())
        .catch(() => {})
    );
    await Promise.allSettled(batch);
  }
}
```

Then:

- **Settings → Variables and Secrets** — secret `CF_TOKEN`; plain variables
  `ACCOUNT_ID`, `ZONE_ID`, `PROJECT`
- **Settings → Bindings → KV namespace** — bind `STATE` → `cache-warmer-state`
- **Settings → Triggers → Cron Triggers** — `*/2 * * * *`

Give the Worker **no route**. It is cron-only, and a route on this zone would
put it in the path of its own warming subrequests.

**The first tick is the prewarm.** The KV namespace starts empty, so the
Worker's first run sees the latest deployment as new, "purges" a cache that is
already cold (a harmless no-op) and warms the top pages. There is no separate
first-time warming step — finishing this section *is* prewarming the new zone's
edge for the hub pages. Everything after that is automatic.

### Timing, end to end

```
:20        GitHub cron fires rebuild.yml -> POSTs the deploy hook
:20-:2x    Cloudflare Pages builds and deploys (a few minutes)
<= 2 min   cache-warmer's next tick sees a new deployment id at
           stage=deploy/status=success -> purges the zone -> warms the top pages
```

### Caveats worth keeping in mind

- **Warming is a top-pages game, not an all-pages game.** The Worker warms
  through whichever data centre it runs in; Tiered Cache is what turns that into
  a regional benefit. A long-tail city page's first visitor in a given region
  still takes one miss — a cheaper one, via the upper tier. Keep `WARM_URLS` to
  the hubs and whatever `/admin/stats/` says is actually being visited.
- **`purge_everything` also evicts `/assets/*`** — images and hashed JS. They
  re-warm on first use and browsers still hold them (the hashed ones are a year
  `immutable`), so this costs little. It does make **Cache Reserve** (paid) a
  poor fit for this site: hourly full purges would have it refilling constantly.
- **The rebuild budget is unchanged.** This adds ~30 Pages-API reads per hour
  from the Worker, not builds.
- **The "~900 entries" ceiling assumes the Workers Paid plan**, which the
  account already needs for the hourly rebuilds (see `rebuild.yml`): a paid
  invocation may make ~1,000 subrequests. On the Free plan the limit is **50**,
  so if the account ever drops back, `WARM_URLS` has to shrink to ~45 or the
  warm silently stops partway through the list.

---

## Optional — a one-time full warm after the move

The Worker warms the hubs on every deploy; it deliberately never walks all
~4,150 pages. After the domain move, though, the whole zone is cold at once,
and one manual pass from your own machine fills your region's upper tier for
everything in the sitemap:

```sh
curl -s https://timeandspace.science/sitemap.xml \
  | grep -o '<loc>[^<]*' | cut -c6- \
  | xargs -P 8 -n 1 curl -so /dev/null
```

Do this **only after Parts 1 and 2 are live**, or the copies it plants expire
in five minutes (`s-maxage=300`) and the pass warms nothing. And know what it
buys: requests from your machine land in *your nearest* data centre, so this
seeds your own region's upper tier — visitors elsewhere still take one
(tier-cheapened) miss per page. It is a launch-day nicety, not a maintenance
task; the hourly purge would undo it within the hour anyway, which is exactly
why the recurring warm sticks to the hubs.

---

## Verifying

A few hours after setup, so a rebuild has cycled:

```
curl -sI https://timeandspace.science/timer/ | grep -iE "cf-cache-status|^age"
```

Expect `cf-cache-status: HIT` with an `Age:` climbing toward ~3600 and dropping
back near 0 shortly after each hourly deploy — that drop is the purge landing.
The rhythm comes from the hourly purge, not the 2-hour TTL; an `Age` above 3600
means an hourly cycle was missed (skipped rebuild or a broken Worker) and the
TTL is serving as the backstop, capping it at 7200. A
first request in a quiet region may show `MISS` or `EXPIRED`; the next should
HIT. Worker → **Logs** shows most ticks exiting quietly and one purge+warm an
hour.

## Rollback

Each part is independently reversible and none of them touch the repo: delete
the Cache Rule (the edge falls back to `_headers`' `s-maxage=300`), disable the
Worker's cron trigger, toggle Tiered Cache off.
