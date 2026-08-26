# alarm-clock.org → timeandspace.science (301)

The site changed domains. Every URL that was indexed on the old domain has an
identical path on the new one, so the redirect must be **path-preserving**: the
old `/sun/tokyo/` goes to the new `/sun/tokyo/`, not to the homepage. A blanket
redirect to `/` throws away the ranking signal on all ~4,150 URLs, and Google
treats it as a soft 404 rather than a move.

This is a Cloudflare dashboard job on the **alarm-clock.org zone**. Nothing in
this repo serves the old domain, so nothing here can do it.

> ### The domain has NO hyphens
>
> It is **`timeandspace.science`**. Not `time-and-space.science` — that name is
> not registered and does not resolve. An earlier version of this file used the
> hyphenated form throughout, which sent every alarm-clock.org visitor to a dead
> domain until the rule was corrected. The single source of truth is `origin` in
> `seo/_data/site.json`; if you are copying a URL into the dashboard, copy it
> from there.

---

## What NOT to do

**Do not add alarm-clock.org as a Custom Domain on the Pages project.** Pages
would then *serve the whole site* on the old domain, and the two would compete
as duplicate content — the opposite of a move. `_redirects` cannot help either:
it is per-project and has no hostname condition, so it cannot tell the two
domains apart.

**Do not turn on "Always Use HTTPS" on the old zone.** The redirect rule below
already matches plain http, and it sends one 301 straight to the final https
URL. Always Use HTTPS would insert a second hop (http → https on the old
domain → https on the new one). One hop is better for crawlers and faster for
people.

---

## Setup

> Cloudflare renames its navigation from time to time. Where a menu name below
> doesn't match what you see, the **search box at the top of the dashboard**
> finds any of these screens by name ("Redirect Rules", "Custom domains", "DNS").

### 0. Is alarm-clock.org still attached to the Pages project?

Do this first — while Pages owns the hostname, the old domain serves a full copy
of the site, and that is the one configuration that actively fights the move.

**Check it in one command:**

```sh
curl -sSI https://alarm-clock.org/ | head -1
```

- `HTTP/2 200` → it is still being served. Detach it below.
- `HTTP/2 301` → already redirecting; skip to step 3 and confirm the details.
- A connection or certificate error → nothing is attached. Skip to step 1.

**To detach it:**

1. **dash.cloudflare.com** → pick the **account** (not a domain) from the top-left
   account switcher.
2. Left sidebar → **Workers & Pages** (newer dashboards: **Compute → Workers &
   Pages**).
3. Open the Pages project that serves the site. **Identify it by its custom
   domains, not by its name** — the project name is an account-level label that
   has been changed at least once (`wrangler.toml` currently says
   `time-and-space`), so the name in this file would only go stale again. The
   right project is whichever one lists `timeandspace.science` under Custom
   domains. The old and new sites are the same project.
4. Open the **Custom domains** tab (on some dashboards: **Settings → Domains**).
5. You should see the domains this project answers on. Remove **only** the old
   ones:
   - `alarm-clock.org`
   - `www.alarm-clock.org`

   For each: the **⋯** menu at the right of the row (or click the domain) →
   **Remove domain** → confirm.
6. **Leave `timeandspace.science` and `www.timeandspace.science` exactly as
   they are.** Removing those takes the live site down.

The project's `*.pages.dev` URL keeps working throughout — the site does not go
offline while you do this.

**Then check DNS on the old zone.** Attaching a Pages custom domain creates a
`CNAME` record pointing at `<project>.pages.dev`, and removing the custom domain
does not always remove it:

7. Dashboard → **Websites** → **alarm-clock.org** → **DNS → Records**.
8. Delete any `CNAME` on `@`/`alarm-clock.org` or `www` pointing at
   `…pages.dev`. Step 3 below replaces them.

### 1. Keep the domain registered
The 301 lives only as long as you own alarm-clock.org. Renew it well past the
point where the old URLs stop getting traffic — see "How long" below.

### 2. Confirm the zone is on Cloudflare
alarm-clock.org must still be a zone in your Cloudflare account with its
registrar nameservers pointed at Cloudflare, status **Active**. If it was
removed when the site moved, add it back and re-point the nameservers.

### 3. DNS — a proxied placeholder
A redirect rule only runs on traffic that reaches Cloudflare's edge, so the
hostname needs a **proxied** record. It never actually serves anything.

**Websites → alarm-clock.org → DNS → Records → Add record**, twice:

| Type | Name  | IPv6 address | Proxy status     | TTL  |
|------|-------|--------------|------------------|------|
| AAAA | `@`   | `100::`      | Proxied (orange) | Auto |
| AAAA | `www` | `100::`      | Proxied (orange) | Auto |

`100::` is the IPv6 discard prefix — the proxy intercepts before anything is
ever routed there, which is why a record that points nowhere is the right answer
for a domain that only redirects.

The **proxy toggle must be orange, not grey**. Grey (DNS-only) means the request
never reaches Cloudflare's rules and the browser tries to connect to `100::`
directly, which fails. This is the single most common way this setup breaks.

Delete any other A/AAAA/CNAME left on `@` or `www` — including the `…pages.dev`
CNAME from step 0.

### 4. SSL
People and crawlers will arrive on `https://alarm-clock.org/…`, and a cert error
happens *before* any redirect can run. On the old zone:

- **SSL/TLS → Edge Certificates → Universal SSL**: enabled, and the certificate
  shows **Active** covering both `alarm-clock.org` and `www.alarm-clock.org`.
  Issuance can take a few minutes to a couple of hours after step 3.
- **SSL/TLS → Overview**: **Full (strict)** is fine. There is no origin to talk
  to, so the mode barely matters, but don't leave it on Flexible.
- Leave **Always Use HTTPS** *off* (see "What NOT to do").

### 5. The redirect rule

**Websites → alarm-clock.org → Rules → Redirect Rules → Create rule.**

Check the domain name at the top of the page before you start. This rule belongs
on the **old** zone; created on timeandspace.science it would redirect the live
site to itself in a loop.

Fill in:

| Field | Value |
|-------|-------|
| Rule name | `alarm-clock.org → timeandspace.science` |
| When incoming requests match… | **All incoming requests** |
| Then… → Type | **Dynamic** |
| Expression | `concat("https://timeandspace.science", http.request.uri.path)` |
| Status code | **301** (Permanent Redirect) |
| Preserve query string | **on** |

Two fields decide whether this works:

- **Type must be Dynamic, not Static.** Static takes a fixed URL and would send
  every one of ~4,150 old URLs to the same page. Dynamic takes the expression
  above, and `http.request.uri.path` is what carries `/sun/tokyo/` across.
  Selecting Dynamic is what makes the expression box appear.
- **Preserve query string** keeps the dated links working — the sun and moon
  pages take `?date=YYYY-MM-DD`, and those URLs are shared and indexed.

Then **Deploy**. It takes effect within seconds.

`http.request.uri.path` is what keeps `/sun/tokyo/` pointing at `/sun/tokyo/`.
Preserve query string is what keeps the dated variants working — the sun and
moon pages take `?date=YYYY-MM-DD`, and those links are out in the world.

One rule is well within the free plan's allowance.

---

## Verify

Run these once the rule is saved. Every one should answer `301` with a
`location:` on the new domain and the **same path**.

```sh
# apex, path preserved
curl -sSI https://alarm-clock.org/timer/            | grep -iE '^(HTTP|location)'
# query string preserved
curl -sSI "https://alarm-clock.org/sun/tokyo/?date=2026-09-01" | grep -i location
# www
curl -sSI https://www.alarm-clock.org/stopwatch/    | grep -i location
# plain http — should be ONE hop straight to the new https URL
curl -sSI http://alarm-clock.org/moon/              | grep -iE '^(HTTP|location)'
# the whole chain, end to end: expect exactly one 301 then 200
curl -sSIL https://alarm-clock.org/alarm-clock/     | grep -iE '^(HTTP|location)'
```

Expected for the first: `HTTP/2 301` and
`location: https://timeandspace.science/timer/`.

### If it doesn't

| Symptom | Cause |
|---------|-------|
| `HTTP/2 200`, the site loads on the old domain | Still attached to the Pages project — step 0 |
| Certificate / SSL error | Universal SSL not issued yet — step 4, give it longer |
| Connection refused, or a timeout | The DNS record is grey-clouded (DNS-only) instead of orange — step 3 |
| `location:` is the new homepage for every URL | Rule type is Static instead of Dynamic — step 5 |
| `?date=…` is dropped from the target | "Preserve query string" is off — step 5 |
| Two 301s before the 200 | Always Use HTTPS is on for the old zone — turn it off |
| `NXDOMAIN` / nothing resolves | Nameservers no longer point at Cloudflare — step 2 |

Give DNS and certificate changes time before concluding something is wrong: the
record propagates in seconds through Cloudflare, but a certificate can take
anywhere from a few minutes to a couple of hours.

---

## Tell the search engines

1. **Google Search Console → old property → Settings → Change of address.**
   Both properties must be verified and the 301 must already be live. This is
   what actually accelerates the move; the redirect alone is slower.
2. Submit `https://timeandspace.science/sitemap.xml` on the **new** property.
3. **Bing Webmaster Tools** has the same thing under **Site Move**.
4. IndexNow already announces the new domain's URLs (`npm run indexnow`, key
   file at the new site root). Nothing to do on the old domain.

---

## How long to keep it

Google's guidance is **at least a year**; permanent is better, and the cost is
one DNS zone and a domain renewal. Note this outlives the on-site notice by a
long way — the "we've changed our name" banner retires itself after three
months (`NOTICE_END` in `seo/tools/build-inline.mjs`), because it is for people
who are surprised by the new name. The redirect is for links and crawlers, and
those do not stop arriving after three months. **Retiring the banner is not a
signal to retire the redirect.**
