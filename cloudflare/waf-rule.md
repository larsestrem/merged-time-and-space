# Edge moderation — Cloudflare rule (free plan)

This blocks inappropriate countdowns **at Cloudflare's edge, before the page is
served** — so a hand-crafted URL like `/c?name=<something vile>` never renders,
and social-media scrapers never get a preview either. No application code, no
Function, works on the **free plan** (no $200 regex tier needed).

## How it works
We use a **Redirect Rule** with an expression that checks the URL's query string
(lowercased + URL-decoded) for any banned substring from `blocklist.txt`. On a
match it 302-redirects to `/not-found` ("Page unavailable").

## Setup (5 minutes)

1. Cloudflare dashboard → your domain → **Rules → Redirect Rules → Create rule**.
2. Name: `Block inappropriate countdowns`.
3. **When incoming requests match → Edit expression** (the "Expression Preview" /
   text editor), and paste an expression of this shape, one `contains` per term:

```
(lower(url_decode(http.request.uri.query)) contains "kkk") or
(lower(url_decode(http.request.uri.query)) contains "nazi") or
(lower(url_decode(http.request.uri.query)) contains "assassinat") or
(lower(url_decode(http.request.uri.query)) contains "massacre") or
(lower(url_decode(http.request.uri.query)) contains "mass shooting") or
(lower(url_decode(http.request.uri.query)) contains "lynch") or
(lower(url_decode(http.request.uri.query)) contains "kill") or
(lower(url_decode(http.request.uri.query)) contains "murder") or
(lower(url_decode(http.request.uri.query)) contains "homicide") or
(lower(url_decode(http.request.uri.query)) contains "bomb") or
(lower(url_decode(http.request.uri.query)) contains "terrorist")
/* …one line per entry in blocklist.txt… */
```

4. **Then → Static redirect**, Type **Dynamic**? No — choose **Static**:
   - URL: `https://YOURDOMAIN/not-found`
   - Status code: **302**
   - Preserve query string: **off**
5. **Deploy.**

> Tip: keep the rule scoped to the countdown route by prefixing the expression
> with `(http.request.uri.path eq "/c" or http.request.uri.path eq "/c.html" or http.request.uri.path eq "/api/og") and ( … )`
> so the blocklist only runs on countdown pages **and their social-preview image**
> (`/api/og`) — that way banned text can't be baked into a preview card either.
> `build-waf.mjs` already emits this scope for you.

## Generating the expression
Don't hand-write it. Run the generator to turn `blocklist.txt` into the full
expression, then paste the output:

```
node ../seo/tools/build-waf.mjs   # prints the expression to stdout
```

(That script is included — see `seo/tools/build-waf.mjs`.)

## Free-plan limits & notes
- Redirect Rules: the free plan includes a small number of rules; **one rule**
  holds the whole blocklist via chained `or`, so you're well within limits.
- `lower()` and `url_decode()` are standard expression functions and free.
- Regex (`matches`) is a paid (Business+) feature — **we deliberately don't need
  it**; `contains` covers us, and we accept the minor over-blocking.
- **Limitation:** substring matching can be evaded by deliberate misspelling /
  homoglyphs. It stops the obvious, headline-making abuse. If you ever see
  evasion in the wild, add a Workers AI semantic check as a Phase-2 backstop
  (see ../README.md → Roadmap).
