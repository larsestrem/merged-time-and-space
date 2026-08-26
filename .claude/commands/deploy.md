---
description: Build and deploy - fast-forward main so Cloudflare publishes the latest
---

Deploy the current state of the site.

1. Confirm the working tree is clean (`git status`); if there are uncommitted changes, show them and ask before proceeding.
2. Run `npm run build` and confirm it succeeds (this also rolls any passed recurring dates forward via roll-dates.mjs). If the build changed generated files, commit them with a brief message.
3. Push the working branch, then fast-forward `main` to it and push `main` (with the usual retry-on-network-error backoff).
4. Report the new `origin/main` commit and remind me that Cloudflare rebuilds in about 2 minutes.
