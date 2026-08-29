#!/usr/bin/env node
/* check-links.mjs — fetches every external URL referenced by event pages
 * (Learn-more links, celebrity works, the election-day state links) and
 * reports any that look broken. Run by the scheduled maintenance workflow.
 *
 * A link counts as broken on HTTP >= 400 or a network error. Sites that
 * block HEAD get a GET retry; sites that block bots entirely (403/999 from
 * e.g. LinkedIn-style WAFs) are reported as "blocked" so a human can decide.
 *
 * Output: "FINDING\tbroken|blocked\t<status>\t<url>\t<used on>" lines.
 * Exit code is always 0.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEvents } from "./lib.mjs";

const root = join(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..", "..");
const events = loadEvents(readFileSync, join, root);

/* collect url -> [pages that use it] */
const usage = new Map();
const add = (url, where) => {
  if (!/^https?:\/\//.test(url || "")) return;
  if (!usage.has(url)) usage.set(url, []);
  usage.get(url).push(where);
};
for (const e of events) {
  const page = `/${e.type}/${e.slug ? e.slug + "/" : ""}`;
  for (const l of e.links || []) add(l.url, page);
  for (const w of e.works || []) add(w.url, page);
  for (const x of e.extra?.links || []) add(x.url, page);
}

/* Outbound links written straight into a generator rather than into
 * events.json were invisible to this audit — the classroom guide's two
 * citations are the only ones, and they are exactly the kind of third-party
 * article that quietly disappears. Read out of the emitted page so the list
 * cannot drift from what is actually published. */
try {
  const html = readFileSync(join(root, "classroom", "index.html"), "utf8");
  for (const m of html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"/g)) add(m[1], "/classroom/");
} catch (e) { /* not built yet — nothing to check */ }

const UA = "Mozilla/5.0 (compatible; timeandspace.science link checker; +https://timeandspace.science)";
async function probe(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method, redirect: "follow",
        headers: { "User-Agent": UA, "Accept": "text/html,*/*" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok || res.status === 304) return { ok: true, status: res.status };
      if (method === "GET") {
        /* ONLY a status that means "this page is gone" is actionable: 404 and
           410. Everything else a live site can throw at a crawler — 401/403
           bot walls, 405, 429 rate limits, 5xx hiccups, 999 — proves nothing
           about whether the page exists, and reporting each one daily is what
           turned the maintenance email into fifty lines of state election
           sites that block robots. Those are counted, not listed. */
        const dead = res.status === 404 || res.status === 410;
        return { ok: false, status: res.status, blocked: !dead };
      }
      /* HEAD failed; retry with GET */
    } catch (e) {
      const code = e.cause?.code || e.name;
      if (method === "GET") {
        /* a domain that no longer resolves is genuinely dead; a timeout or a
           reset is a site defending itself and proves nothing */
        const dead = code === "ENOTFOUND" || String(code).startsWith("CERT_") || code === "ERR_TLS_CERT_ALTNAME_INVALID";
        return { ok: false, status: "ERR " + code, blocked: !dead };
      }
    }
  }
  return { ok: false, status: "ERR", blocked: true };
}

const urls = [...usage.keys()];
console.log(`Checking ${urls.length} external URL(s)...`);
const findings = [];
const POOL = 8;
let i = 0;
async function worker() {
  while (i < urls.length) {
    const url = urls[i++];
    const r = await probe(url);
    if (!r.ok) findings.push({ url, status: r.status, blocked: r.blocked, where: usage.get(url).slice(0, 3).join(" ") });
  }
}
await Promise.all(Array.from({ length: POOL }, worker));

/* Two classes, two fates. DEAD links (404/410/no-such-domain) are FINDINGs —
 * each one is an edit to events.json a person can actually make. UNVERIFIABLE
 * links (bot walls, rate limits, timeouts) become ONE summary line, because
 * fifty of them a day taught the owner to stop reading the email. They are
 * still printed plain below for the workflow log, where a human debugging a
 * specific link can find them. */
const dead = findings.filter((f) => !f.blocked);
const unver = findings.filter((f) => f.blocked);
if (!findings.length) {
  console.log("OK: all external links healthy.");
} else {
  for (const f of dead)
    console.log(`FINDING\tdead link\t${f.status}\t${f.url}\tused on ${f.where}`);
  if (unver.length) {
    const domains = new Set(unver.map((f) => { try { return new URL(f.url).hostname; } catch { return f.url; } }));
    console.log(`NOTE\t${unver.length} of ${urls.length} external link(s) (${domains.size} domain(s)) could not be verified — bot-blocked or timing out, which proves nothing about the page. Routine; no action needed.`);
    for (const f of unver) console.log(`  unverifiable ${f.status} ${f.url} (${f.where})`);
  }
  console.log(`\n${dead.length} dead, ${unver.length} unverifiable, out of ${urls.length}.`);
}
