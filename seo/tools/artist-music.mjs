/* artist-music.mjs — the "Artist Music Module" for musician birthday pages:
 * a press-play strip (official playlists), a latest-release callout, a
 * curated ~8-12 song list, and a link out to the full discography. Spec:
 * visitor delight, not commerce — no hosted lyrics/audio/art, every link
 * either goes to a real official page or is flagged as an unverified
 * fallback at build time so it can be fixed, never silently guessed.
 *
 * Per-artist data shape (see e.music in events.json / people.json):
 *   music: {
 *     playlists: { spotify?, apple?, youtube? },   // official only, omit if none
 *     latest: { title, year, spotifyId, appleUrl?, youtubeUrl? },
 *     songs: [ { title, nameUrl, spotifyId, appleUrl?, youtubeUrl? } ],
 *     discography,                                 // Spotify or Genius artist page
 *     tour?: { text, url },                        // official tour page only
 *   }
 * `appleUrl`/`youtubeUrl` are the *real, verified* direct link for that
 * exact track. When absent, the row falls back to a same-tab-safe search
 * link and prints a build-time warning — search fallbacks are meant to be
 * temporary, not shipped silently.
 */
import { esc, SONG_SVC } from "./lib.mjs";

const ico = (acc) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#15151c"/>` +
  `<circle cx="12" cy="12" r="7" fill="none" stroke="#2c2c37" stroke-width="1.2"/>` +
  `<circle cx="12" cy="12" r="3.4" fill="${acc}"/><circle cx="12" cy="12" r=".9" fill="#15151c"/></svg>`;

/* One service icon-button. Spotify is always a direct track link (an ID is
 * required in the data). Apple/YouTube use the verified direct link when
 * present; otherwise a search-link fallback, flagged via `warn` so it shows
 * up in the build log instead of shipping unnoticed. `market` tags Apple
 * links for the client-side region rewrite (see APPLE_REGION_JS). */
function svcBtn(service, { title, artist, href, isFallback, market }) {
  const label = isFallback ? `Search for ${title} on ${service.label}` : `Play ${title} on ${service.label}`;
  const cls = market ? ` class="amm-apple"` : "";
  return `<a${cls} href="${esc(href)}" target="_blank" rel="noopener nofollow" aria-label="${esc(label)}" title="${esc(service.label)}">${service.icon}</a>`;
}

const SPOTIFY = { label: "Spotify", icon: SONG_SVC.spotify };
const APPLE = { label: "Apple Music", icon: SONG_SVC.apple };
const YT = { label: "YouTube Music", icon: SONG_SVC.yt };

/* Resolves one track's three service links + whether Apple/YouTube had to
 * fall back to search (used both to render and to collect build warnings). */
function trackLinks({ title, artist, spotifyId, appleUrl, youtubeUrl }) {
  const q = encodeURIComponent(`${title} ${artist}`);
  const spotify = svcBtn(SPOTIFY, { title, artist, href: `https://open.spotify.com/track/${spotifyId}`, isFallback: false });
  const appleFallback = !appleUrl;
  const apple = svcBtn(APPLE, {
    title, artist, isFallback: appleFallback, market: true,
    href: appleUrl || `https://music.apple.com/us/search?term=${q}`,
  });
  const ytFallback = !youtubeUrl;
  const yt = svcBtn(YT, { title, artist, href: youtubeUrl || `https://music.youtube.com/search?q=${q}`, isFallback: ytFallback });
  return { html: spotify + apple + yt, appleFallback, ytFallback };
}

/* "Press play" strip: up to three buttons to the artist's own official
 * playlists. Never fabricated — a service is simply omitted if there's no
 * verified official playlist for it (per spec §1a). */
/* The curated songs list — the core of the module. Returns { html, warnings }
 * so the caller can log any search-fallback links at build time. */
function songsList(artist, songs) {
  if (!songs || !songs.length) return { html: "", warnings: [] };
  const warnings = [];
  const rows = songs.map((s, i) => {
    const { html, appleFallback, ytFallback } = trackLinks({ title: s.title, artist, spotifyId: s.spotifyId, appleUrl: s.appleUrl, youtubeUrl: s.youtubeUrl });
    if (appleFallback) warnings.push(`${artist} — "${s.title}": no verified Apple Music link, using search fallback`);
    if (ytFallback) warnings.push(`${artist} — "${s.title}": no verified YouTube Music link, using search fallback`);
    const name = s.nameUrl
      ? `<a href="${esc(s.nameUrl)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
      : esc(s.title);
    return `<div class="song-row"><span class="song-name">${name}</span><span class="song-links">${html}</span></div>`;
  }).join("\n      ");
  return {
    html: `
  <div class="card">
    <h2>${esc(artist)}'s songs</h2>
    <div class="song-list">
      ${rows}
    </div>
  </div>`,
    warnings,
  };
}

function discographyLink(artist, url) {
  if (!url) return "";
  return `<p class="amm-more"><a href="${esc(url)}" target="_blank" rel="noopener">Hear all of ${esc(artist)}'s music →</a></p>`;
}

function tourLine(tour) {
  if (!tour || !tour.url) return "";
  return `<p class="amm-tour">🎤 <a href="${esc(tour.url)}" target="_blank" rel="noopener">${esc(tour.text)}</a></p>`;
}

/* Top-level combiner. Returns { html, warnings } — html is "" (renders
 * nothing) when the artist has no `music` data at all. Just the curated songs
 * list (each song with its three streaming links), plus the tour line and
 * "hear all" discography link when present. (The "press play" playlist strip
 * and the single "latest release" callout were removed by request — the
 * per-song list is the one people want.) `daysAway` is retained in the
 * signature for callers but no longer used here. */
export function artistMusicModule(artist, daysAway, music) {
  if (!music) return { html: "", warnings: [] };
  const { html: songsHtml, warnings } = songsList(artist, music.songs);
  const more = discographyLink(artist, music.discography);
  const tour = tourLine(music.tour);
  return { html: `${songsHtml}${tour ? `\n  ${tour}` : ""}${more ? `\n  ${more}` : ""}`, warnings };
}

/* Best-effort Apple Music storefront rewrite: the build always emits /us/
 * links (since that's all we can verify at build time); this nudges every
 * .amm-apple link to the visitor's own storefront on load, so a UK or
 * Australian fan lands in their own store instead of the US one. Silently
 * no-ops (stays on /us/) for anything it can't confidently map. */
export const APPLE_REGION_JS = `(function(){
  var links=document.querySelectorAll('a.amm-apple');
  if(!links.length)return;
  var region=null;
  try{
    var langs=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||''];
    for(var i=0;i<langs.length;i++){
      var m=/-([A-Za-z]{2})$/.exec(langs[i]);
      if(m){region=m[1].toLowerCase();break;}
    }
  }catch(e){}
  if(!region||region==='us')return;
  [].forEach.call(links,function(a){a.href=a.href.replace('/us/','/'+region+'/');});
})();`;
