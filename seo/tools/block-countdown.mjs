#!/usr/bin/env node
/* block-countdown.mjs — add a blocklist term (raw phrase, or name/message
 * pulled out of an old /c?name=…&message=… link) to cloudflare/blocklist.txt.
 *
 * Custom user-created countdowns (/c.html, /widget/) have been retired, so
 * this mainly guards /api/og — the still-live social-preview endpoint that
 * renders visitor-supplied ?name=&message= text into an image for curated
 * event pages. Pick a distinctive phrase; block terms are substring matches,
 * so an over-broad word (e.g. "party") would also catch innocent content.
 *
 * After running, regenerate + deploy:
 *     npm run waf      # rebuilds functions/moderation.js (the edge middleware)
 *     npm run build && <push to main>
 *
 *   node seo/tools/block-countdown.mjs "some phrase to block"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = join(root, "cloudflare", "blocklist.txt");
const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node seo/tools/block-countdown.mjs "<countdown link or phrase>" [more…]');
  process.exit(1);
}

/* Pull the human text to block out of a /c link (name + message), or take a raw
 * phrase as-is. Lower-cased to match how build-waf normalises the blocklist. */
function phrasesFrom(input) {
  const out = [];
  const s = input.trim();
  try {
    if (/^https?:\/\//i.test(s) || s.startsWith("/c")) {
      const u = new URL(s, "https://timeandspace.science");
      for (const k of ["name", "message"]) { const v = u.searchParams.get(k); if (v) out.push(v); }
    } else out.push(s);
  } catch (e) { out.push(s); }
  return out.map((p) => p.trim().toLowerCase()).filter(Boolean);
}

const txt = readFileSync(FILE, "utf8");
const existing = new Set(txt.split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith("#")));
const add = [];
for (const a of args) for (const p of phrasesFrom(a)) if (!existing.has(p)) { existing.add(p); add.push(p); }

if (!add.length) { console.log("block-countdown: nothing new to add (already blocked?)."); process.exit(0); }

const block = "\n# takedown " + new Date().toISOString().slice(0, 10) + "\n" + add.join("\n") + "\n";
writeFileSync(FILE, txt.replace(/\s*$/, "\n") + block);
console.log("block-countdown: added " + add.length + " block term(s):");
add.forEach((p) => console.log("   • " + p));
console.log("\nNext:  npm run waf   (then  npm run build  and push to main to deploy)");
