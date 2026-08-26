#!/usr/bin/env node
/* indexnow.mjs — tell Bing (and the other IndexNow engines) which URLs actually
 * changed, instead of waiting for a recrawl.
 *
 *   node seo/tools/indexnow.mjs --dry-run   # print what would be submitted
 *   node seo/tools/indexnow.mjs             # submit, then record what was sent
 *
 * WHAT COUNTS AS A CHANGE. The site rebuilds hourly, so "the HTML differs from
 * last hour" is true of nearly every page nearly always — the baked clock values
 * move even when nothing about the page did. Submitting on that basis would be
 * noise, and Bing explicitly discourages it (the same reasoning behind their
 * warning about sitemap lastmod set to the generation time).
 *
 * The trigger is seo/_data/sitemap-revs.json, written by build-sitemap.mjs: for
 * every URL, "<lastmod>/<rev>", where rev hashes the CONTENT of the generator
 * and every module it imports. The public sitemap keeps date-only <lastmod>,
 * which is what the spec wants; this file is where the precision lives. It has
 * to be finer than a date because two edits on the same day are normal here,
 * and under date-only comparison the second one was invisible — same date, same
 * state entry, never submitted.
 *
 * REMOVED URLS ARE SUBMITTED, NOT JUST FORGOTTEN. IndexNow is for added,
 * updated AND deleted URLs: telling the engine about a retired page is how it
 * learns to drop it, instead of holding a stale result until it happens to
 * recrawl. A URL in the state file but no longer in the sitemap goes into the
 * payload, and is only removed from the state once that payload was accepted.
 * (Retired URLs here 301 to a live page, which is what the engine finds.)
 *
 * STATE lives in seo/_data/indexnow-state.json (committed): url -> the value we
 * last submitted for it. Sorted keys, so a diff reads as "these URLs were
 * announced". NOTHING is written unless IndexNow answered 200 or 202, and only
 * for the URLs actually in that payload — a state entry means "we told them",
 * so recording one we didn't send would strand the page forever. Deleting the
 * file makes the next run re-announce everything, which is a legitimate reset.
 *
 * The KEY is public by design: IndexNow verifies ownership by fetching
 * https://<host>/<key>.txt and checking it contains the key. Both the key and
 * that file are in the repo, and this script refuses to run if they disagree.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dry = process.argv.includes("--dry-run");

const site = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8"));
const ORIGIN = site.origin;
const KEY = site.indexnowKey;
const HOST = new URL(ORIGIN).host;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
/* the API's documented ceiling for one POST */
const MAX_PER_RUN = 10000;

if (!KEY || !/^[a-zA-Z0-9-]{8,128}$/.test(KEY))
  throw new Error(`seo/_data/site.json needs an "indexnowKey" of 8-128 url-safe characters (got ${JSON.stringify(KEY)})`);
/* the key file is what proves ownership; a mismatch means every submission
 * would be rejected, so fail here rather than at the API */
const keyFile = join(root, `${KEY}.txt`);
if (!existsSync(keyFile))
  throw new Error(`${KEY}.txt is missing from the site root — IndexNow verifies ownership by fetching ${ORIGIN}/${KEY}.txt`);
if (readFileSync(keyFile, "utf8").trim() !== KEY)
  throw new Error(`${KEY}.txt does not contain the key from site.json`);

const revPath = join(root, "seo/_data/sitemap-revs.json");
if (!existsSync(revPath))
  throw new Error("seo/_data/sitemap-revs.json is missing — run npm run build first (build-sitemap writes it)");
const live = JSON.parse(readFileSync(revPath, "utf8"));
const liveUrls = Object.keys(live);
if (!liveUrls.length) throw new Error("sitemap-revs.json is empty — run npm run build first");

const statePath = join(root, "seo/_data/indexnow-state.json");
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};

/* MIGRATION. The state used to hold a bare date ("2026-07-31"); it now holds
 * "date/rev". A legacy entry is deliberately treated as STALE rather than
 * matched on its date half. Date-matching looked tempting — it avoids one bulk
 * re-announce — but it re-creates the exact bug this change exists to kill: a
 * legacy entry only upgrades when it is submitted, it is only submitted when it
 * looks changed, and under date-matching a same-day edit never looks changed.
 * The entries would sit in the old format indefinitely, silently blind. So:
 * one full re-announce, once, and every run after it is exact. */
const legacy = Object.entries(state).filter(([, v]) => !String(v).includes("/")).length;
if (legacy) console.log(`IndexNow: ${legacy} state entries are in the old date-only format — re-announcing them once to upgrade to per-URL revisions.`);

const updated = liveUrls.filter((u) => state[u] !== live[u]);
/* in the state but gone from the sitemap — retired pages, still worth telling
 * the engine about exactly once */
const removed = Object.keys(state).filter((u) => !(u in live));

if (!updated.length && !removed.length) {
  console.log(`IndexNow: nothing to submit (${liveUrls.length} URLs, all previously announced at their current revision).`);
  process.exit(0);
}

/* Removals first: a dead URL sitting in an index is a worse result than a stale
 * live one, and removals are rare enough that they never crowd out updates.
 * Never truncate silently — if a run is over the cap, say what is left. */
const queue = [...removed.map((u) => ({ url: u, gone: true })), ...updated.map((u) => ({ url: u, gone: false }))];
const batch = queue.slice(0, MAX_PER_RUN);
if (queue.length > batch.length)
  console.log(`IndexNow: ${queue.length} URLs to announce, submitting the first ${batch.length} (API cap); the remaining ${queue.length - batch.length} go on the next run.`);

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `${ORIGIN}/${KEY}.txt`,
  urlList: batch.map((b) => b.url),
};

const brand = (n) => (n === 1 ? "URL" : "URLs");
if (dry) {
  const nUp = batch.filter((b) => !b.gone).length, nGone = batch.length - nUp;
  console.log(`IndexNow (dry run): would submit ${batch.length} ${brand(batch.length)} to ${ENDPOINT} as ${HOST} — ${nUp} added/updated, ${nGone} removed.`);
  console.log(batch.slice(0, 10).map((b) => (b.gone
    ? `  ${b.url}  (REMOVED — was ${state[b.url]})`
    : `  ${b.url}  (${live[b.url]}${state[b.url] ? `, was ${state[b.url]}` : ", new"})`)).join("\n"));
  if (batch.length > 10) console.log(`  … and ${batch.length - 10} more`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});
const body = res.status === 200 ? "" : await res.text().catch(() => "");

/* PENDING VERIFICATION IS NOT A FAILURE. A new key is not live the moment the
 * key file is: Bing fetches it and runs its own verification, and until that
 * finishes every submission comes back 403 SiteVerificationNotCompleted, whose
 * own message says to wait and try again. The first run here raced its own
 * deploy — the key file only became reachable when Cloudflare published the
 * commit that added it. Treating that as fatal put a red X on the repo for a
 * condition that resolves itself, and worse, required a new push to retry.
 * So: say so, record NOTHING (the same URLs go again next run), exit clean.
 * The workflow's daily schedule is what actually retries it. */
if (res.status === 403 && /SiteVerificationNotCompleted/i.test(body)) {
  console.log(`IndexNow: key not verified yet — ${batch.length} ${brand(batch.length)} not submitted, nothing recorded. Bing is still fetching ${ORIGIN}/${KEY}.txt; the next run retries the same set.`);
  process.exit(0);
}
/* 200 = accepted, 202 = accepted, key validation pending on their side (this one
 * IS a success — the URLs are queued). Anything else (400 bad request, 403 with
 * any other reason, 422 URL/host mismatch, 429 too many) fails the run:
 * recording a submission that never happened would mean those URLs are never
 * announced again. */
if (res.status !== 200 && res.status !== 202)
  throw new Error(`IndexNow returned ${res.status} ${res.statusText}: ${body.slice(0, 400)}`);

/* PAST THIS POINT THE SUBMISSION HAPPENED. Only now is the state touched, and
 * only for the URLs that were actually in the payload: a removal that was
 * capped out of this batch stays in the file so the next run still announces
 * it, rather than being dropped silently. */
let nUp = 0, nGone = 0;
for (const b of batch) {
  if (b.gone) { delete state[b.url]; nGone++; } else { state[b.url] = live[b.url]; nUp++; }
}
const sorted = Object.fromEntries(Object.keys(state).sort().map((k) => [k, state[k]]));
writeFileSync(statePath, `${JSON.stringify(sorted, null, 1)}\n`);
console.log(`IndexNow: submitted ${batch.length} ${brand(batch.length)} (HTTP ${res.status}) — ${nUp} added/updated, ${nGone} removed; state file now tracks ${Object.keys(sorted).length}.`);
