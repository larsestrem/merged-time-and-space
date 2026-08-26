/* Shared IP pseudonymisation for the Pages Functions.
 *
 * The tag an IP address is stored under: HMAC-SHA-256 keyed with the
 * VIEW_HASH_KEY environment variable, truncated to 12 hex characters. The
 * whole IPv4 space is 2^32 addresses, so any UNKEYED hash of one — however
 * "one-way" the function — is a lookup table away from the address it came
 * from. With the key, a tag is meaningless to anyone holding only the KV
 * contents.
 *
 * The key never needs rotating for correctness: tags only have to agree with
 * themselves for as long as the keys they appear in live (a day for the view
 * counter's dedupe, a day for the report rate limit), because every such key
 * carries the date. If VIEW_HASH_KEY is not set the raw input passes through
 * a short unkeyed hash instead, so a deployment that has not configured the
 * secret degrades to the old behaviour rather than breaking — but set it:
 * Pages -> Settings -> Environment variables -> VIEW_HASH_KEY = any long
 * random string.
 *
 * Files whose names start with "_" are not routed by Pages Functions, so this
 * is a module, not an endpoint.
 */

/* tiny non-crypto fallback — the pre-key behaviour, kept so nothing breaks
 * on an unconfigured deployment */
export function h36(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h.toString(36);
}

export async function ipTag(ip, env) {
  if (!env.VIEW_HASH_KEY) return h36(ip);
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.VIEW_HASH_KEY),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(ip));
  return [...new Uint8Array(sig).slice(0, 6)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
