#!/usr/bin/env node
/* build-events.mjs — rich, evergreen landing pages for major events from
 * seo/_data/events.json. Output: /<type>/<slug>/index.html (slug "" -> the
 * type root, e.g. /christmas-countdown/). Each page has a live countdown to
 * the NEXT occurrence (computed client-side at the listed local time, so 8am
 * means 8am in the viewer's timezone), history/significance content, Event
 * JSON-LD, a link to the full themed countdown experience, and a create CTA.
 *
 *   node seo/tools/build-events.mjs   (run before build-inline)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { esc, GA_SNIPPET, brand, breadcrumbLD, nextOccurrence, iso, loadEvents, epochFor, songRow } from "./lib.mjs";
import { artistMusicModule, APPLE_REGION_JS } from "./artist-music.mjs";
import { ART } from "./art.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/* ---- the hero illustration ------------------------------------------------
 * These are the LCP element on the seven pages that have one, so they carry
 * fetchpriority and are eager-loaded. Two things about them were wrong.
 *
 * FIRST, THE BOX WAS THE WRONG SHAPE. Every one of them was emitted as
 * 704x536 — a single hardcoded pair — while the files are 700x546, 700x499,
 * 704x532, 704x543 and 700x540. With `width:100%;height:auto` the browser
 * reserves a box from those numbers and then reflows when the real image
 * decodes: about 17px of shift on Beyonce at the 340px breakpoint, on the
 * site's most-shared pages. So the dimensions are now READ FROM THE FILE, by
 * the ten lines below rather than by a dependency.
 *
 * SECOND, ONE SIZE IN ONE FORMAT FOR EVERYONE. make-event-images.mjs writes an
 * AVIF (the same picture at ~70% of the bytes — line art is what AVIF is good
 * at) and a 384px-wide variant of each, which is the width this image is
 * actually displayed at on any screen wide enough to put it beside the text.
 * Every variant is PROBED on disk: an image with none gets exactly the plain
 * <img> it always had, so adding a picture to events.json can never emit a
 * <source> pointing at a file nobody generated. */
const NARROW = 384;

/* A WebP header is enough to know the size, and reading it here means no build
 * dependency and nothing to keep in sync in a data file. Three chunk types
 * carry the dimensions; VP8X is the extended form these files use. */
function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8X") return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  if (kind === "VP8 ") {                                     /* lossy */
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (kind === "VP8L") {                                     /* lossless */
    if (buf[20] !== 0x2f) return null;
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  return null;
}

const imgMeta = new Map();
function heroMeta(src) {
  if (imgMeta.has(src)) return imgMeta.get(src);
  const file = join(root, src.replace(/^\//, ""));
  let m = null;
  if (/\.webp$/i.test(src) && existsSync(file)) {
    try { m = webpSize(readFileSync(file)); } catch { m = null; }
  }
  const base = src.replace(/\.webp$/i, "");
  const has = (p) => existsSync(join(root, p.replace(/^\//, "")));
  const meta = {
    ...(m || {}),
    avif: has(`${base}.avif`) ? `${base}.avif` : null,
    avifNarrow: has(`${base}-${NARROW}.avif`) ? `${base}-${NARROW}.avif` : null,
    webpNarrow: has(`${base}-${NARROW}.webp`) ? `${base}-${NARROW}.webp` : null,
  };
  imgMeta.set(src, meta);
  return meta;
}

/* .cd-profile-img is 42% (max 340px) beside the text above 640px, and the full
   column below it — which is what `sizes` has to say, or the browser assumes
   100vw everywhere and picks the widest candidate on every desktop visit. */
const HERO_SIZES = "(min-width: 640px) 340px, 100vw";

function heroImg(src, alt) {
  const m = heroMeta(src);
  const dim = m.w && m.h ? ` width="${m.w}" height="${m.h}"` : "";
  const attrs = `alt="${esc(alt)}"${dim} loading="eager" decoding="async" fetchpriority="high"`;
  const set = (full, narrow) => (narrow ? ` srcset="${narrow} ${NARROW}w, ${full} ${m.w || 704}w" sizes="${HERO_SIZES}"` : "");
  const img = `<img src="${esc(src)}"${set(src, m.webpNarrow)} ${attrs}>`;
  if (!m.avif) return img;
  return `<picture><source type="image/avif" srcset="${m.avifNarrow ? `${m.avifNarrow} ${NARROW}w, ` : ""}${m.avif} ${m.w || 704}w" sizes="${HERO_SIZES}">${img}</picture>`;
}
const SITE = JSON.parse(readFileSync(join(root, "seo/_data/site.json"), "utf8")).origin;

/* An event page never linked the country pages: Diwali did not link
 * /countries/india/, Bastille Day did not link France, and the whole
 * /countries/ family's only inbound link from anywhere was /countdown/.
 * countries.json already says which events belong to which country, so the
 * map is derived rather than hand-kept — and an event in several countries
 * (Christmas) links all of them. */
const COUNTRY_OF = new Map();
{
  const { countries } = JSON.parse(readFileSync(join(root, "seo/_data/countries.json"), "utf8"));
  for (const c of countries)
    for (const l of c.events || []) {
      const key = l.slug ? `${l.path}/${l.slug}` : l.path;
      if (!COUNTRY_OF.has(key)) COUNTRY_OF.set(key, []);
      COUNTRY_OF.get(key).push({ code: c.code, name: c.name });
    }
}

const events = loadEvents(readFileSync, join, root);
/* type[/slug] -> nested URL, for resolving cross-links between events. */
const urlByKey = new Map(events.map((e) => [e.slug ? `${e.type}/${e.slug}` : e.type, e.urlPath]));
/* slug -> {label,url} for celebrity birthdays, to render "frequently works with" cross-links. */
const peopleBySlug = new Map(events.filter((e) => e.type === "birthday-countdown" && e.slug).map((e) => [e.slug, { label: e.label, url: e.urlPath }]));

/* stable short id (<=16 chars, [a-z0-9]) per page, keyed on the URL so the
 * count accumulates across years — used by the /api/views counter. */
function viewHash(s) {
  let h1 = 2166136261 >>> 0, h2 = 2246822519 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2654435761) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, 16);
}

function page(e) {
  /* `once` = a one-off event at a real moment in a real timezone (kickoff,
   * ceremony, election day); otherwise an annual recurrence to the viewer-
   * local time. */
  const once = !!e.once;
  const table = Array.isArray(e.dates); /* movable feast: explicit date table */
  const tz = e.tz || "America/New_York";
  const next = once ? null : nextOccurrence(e);
  /* A date table whose last entry is in the past leaves nextOccurrence with
   * nothing to return. check-dates' exhaustion gate normally fires first, but
   * falling back to the last known date beats crashing the whole build — the
   * client script already does exactly this. */
  const dateISO = once ? e.once : (next ? iso(next) : (table ? e.dates[e.dates.length - 1] : null));
  if (!dateISO) throw new Error(`build-events: no resolvable date for /${e.type}/${e.slug || ""}`);

  /* Concrete, evergreen-at-build-time copy: {YEAR}/{DATE} tokens in the
   * editable prose are replaced with the next occurrence's year and full
   * date (e.g. "2027" / "February 14, 2027"), so titles and intros can name a
   * specific year for search instead of a vague "the next one" — and refresh
   * to the following year automatically on the next rebuild. */
  const year = dateISO.slice(0, 4);
  const dateLong = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(dateISO + "T00:00:00Z"));
  /* {NTH}: ordinal age/anniversary at the next occurrence (needs e.born) —
   * "Taylor Swift's 37th birthday", "the 295th anniversary of his birth". */
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][Math.min(n % 10, 4)] || "th");
  const nth = e.born ? ord(+year - e.born) : "";
  const sub = (s) => String(s).replace(/\{YEAR\}/g, year).replace(/\{DATE\}/g, dateLong).replace(/\{NTH\}/g, nth);
  /* Lead the heading with the event, not the word "Countdown": flip
   * "Countdown to [the] X" -> "X Countdown" (shorter, event-first).
   *
   * Three things the naive flip got wrong, all visible in emitted H1s:
   *   - It only capitalised "birthday", so anniversary pages read
   *     "Beckhams' anniversary Countdown".
   *   - It ate a leading "The" unconditionally, so "The Beckhams" — a
   *     plural surname where the article is part of the name — lost it.
   *   - Memorial pages start "Countdown to what would be Dr. Seuss' 123rd
   *     Birthday", and flipping that produced a heading beginning with a
   *     lowercase "what". Those keep the original order instead. */
  const flipH1 = (s) => {
    const m = /^Countdown to (the )?(.+)$/i.exec(s);
    if (!m) return s;
    const rest = m[2];
    const titleCase = (t) => t.replace(/\b(birthday|anniversary|what|would|be)\b/gi, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    /* "what would be X's Nth Birthday" cannot be flipped into a heading —
       "what would be … Countdown" reads as a fragment and starts lowercase */
    if (/^what would be\b/i.test(rest)) return "Countdown to " + (m[1] || "") + titleCase(rest);
    const cased = rest.replace(/\b(birthday|anniversary)\b/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
    /* keep "The" where it belongs to the name (The Beckhams', The Masters) */
    const keepThe = m[1] && /^[A-Z][a-z]+s['\u2019]/.test(cased);
    return (keepThe ? "The " : "") + cased + " Countdown";
  };
  e.title = sub(e.title); e.desc = sub(e.desc); e.h1 = flipH1(sub(e.h1)); e.intro = sub(e.intro); e.name = sub(e.name);
  if (e.message) e.message = sub(e.message);
  e.sections = e.sections.map((s) => ({ ...s, h: sub(s.h), p: sub(s.p) }));
  e.facts = e.facts.map(sub);

  /* Static "how many days until" answer, baked at build time so crawlers and
   * snippet extraction get the number without running JS. The live clock above
   * still updates by the second; this is refreshed on every rebuild (the
   * maintenance workflow rebuilds daily, so it stays within ~24h). */
  const MS = 86400000;
  const daysAway = Math.max(0, Math.round((Date.UTC(+dateISO.slice(0, 4), +dateISO.slice(5, 7) - 1, +dateISO.slice(8, 10)) - Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())) / MS));
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(dateISO + "T00:00:00Z"));
  const dayWord = daysAway === 1 ? "day" : "days";
  /* "CALENDAR days": this is a date-to-date count, while the clock above counts
     elapsed time to a moment later in the day — so the two legitimately differ
     by one, and saying which kind of day this is costs a word and removes an
     apparent contradiction. */
  const answer = daysAway === 0
    ? `${e.name} is today, ${weekday}, ${dateLong}.`
    : `${e.name} is on ${weekday}, ${dateLong}, which is ${daysAway} calendar ${dayWord} away. The live countdown above ticks down to the exact moment, to the second.`;
  /* The FAQ answers the same question as the card above it. Repeating the card
     verbatim a screen later reads like a glitch, so the FAQ leads with the
     number instead of the date. */
  const answerFaq = daysAway === 0
    ? `${e.name} is today — ${weekday}, ${dateLong}.`
    : `${daysAway} calendar ${dayWord}, counting from today: ${e.name} falls on ${weekday}, ${dateLong}. The clock at the top of the page counts down to the exact second.`;
  /* Page version: wrap the day count in a span so the client can correct it
   * (see the hydration script). JSON-LD keeps the plain `answer` string. */
  const answerHtml = daysAway === 0
    ? esc(answer)
    : `${esc(e.name)} is on ${weekday}, ${dateLong}. From today’s calendar that is <span id="cd-days-away">${daysAway} calendar ${dayWord}</span>. The clock above is elapsed time to that moment — currently <span id="cd-elapsed"></span>.`;

  /* SEO snippet: lead the meta description with the fresh "N days until" count
   * (baked at build, refreshed every rebuild) so the search result shows the
   * current number, then as much of the evergreen description as fits under
   * Google's ~157-char truncation. og:/twitter: keep the evergreen desc — the
   * social card's OG image already carries the live date, and share previews
   * shouldn't read as stale if re-shared between rebuilds. Title stays stable
   * (a live number in the title invites Google to rewrite it). */
  const clampDesc = (s, max = 157) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…");
  const countLead = daysAway === 0
    ? `${e.name} is today — ${weekday}, ${dateLong}.`
    : `${daysAway} ${dayWord} until ${e.name} — ${weekday}, ${dateLong}.`;
  const metaDesc = clampDesc(`${countLead} ${e.desc}`);

  /* Build-time snapshot for the D/H/M/S digits — same rationale as the
   * world-clock/420/home mini-widgets: a crawler, or a visitor a moment
   * before JS runs, sees real numbers instead of four "--" placeholders.
   * dateISO is already the resolved next-occurrence date (once/table/recur
   * all funnel through it above), so one epochFor() call covers all three
   * modes; tick() overwrites this within the same second the page loads, so
   * real visitors see no behavior change. */
  const snapDiff = Math.max(0, epochFor(dateISO, e.time || "08:00", tz) - Date.now());
  const snapS = Math.floor(snapDiff / 1000);
  const pad2 = (n) => String(n).padStart(2, "0");
  const snap = { d: Math.floor(snapS / 86400), h: pad2(Math.floor(snapS % 86400 / 3600)), m: pad2(Math.floor(snapS % 3600 / 60)), s: pad2(snapS % 60) };

  /* estimated:true events (see check-dates.mjs) haven't had this occurrence's
   * date officially announced yet — the stored date is our best guess from
   * past years' pattern. Surface that to visitors, not just the maintenance
   * check, so nobody mistakes a guess for a confirmed date. */
  const estimateNote = e.estimated
    ? `<p class="hint cd-estimate">📅 Heads up: this date isn't officially confirmed yet — it's our best estimate based on past years' schedule, and we'll update it the moment the real date is announced.</p>`
    : "";

  /* LinkedIn-style "at a glance" detail list shown beside the profile image.
   * Birthday pages show born date / next birthday; other profile pages (e.g.
   * Independence Day) show when they were established / the next occurrence. */
  const fmtFull = (d) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
  const profileMeta = !e.profile
    ? ""
    : e.type === "birthday-countdown"
    ? `<ul class="cd-meta">${[
        e.born ? `<li><span class="k">Born</span> ${fmtFull(new Date(Date.UTC(e.born, (e.month || 1) - 1, e.day || 1)))}</li>` : "",
        `<li><span class="k">Next birthday</span> ${weekday}, ${dateLong}</li>`,
        `<li><span class="k">Countdown</span> ${daysAway === 0 ? "Today! 🎉" : `${daysAway} ${dayWord} away`}</li>`,
      ].filter(Boolean).join("")}</ul>`
    : `<ul class="cd-meta">${[
        e.born ? `<li><span class="k">Established</span> ${e.born}</li>` : "",
        `<li><span class="k">Next ${esc(e.name)}</span> ${weekday}, ${dateLong}</li>`,
        `<li><span class="k">Countdown</span> ${daysAway === 0 ? "Today! 🎉" : `${daysAway} ${dayWord} away`}</li>`,
      ].filter(Boolean).join("")}</ul>`;

  /* Title reframe toward the click-worthy query: pages titled "When is X"
   * (Google answers those in the SERP with zero clicks) lead instead with
   * "How Many Days Until X". Already-good "How Many Days" titles are left be. */
  if (/\bwhen (is|are|does|do|will|'s)\b/i.test(e.title) && !/how many days/i.test(e.title)) {
    let lead = e.name
      .replace(/\s+(Release|Premiere|Opening Ceremony|Final|Ball Drop|Fireworks)$/i, "")
      .replace(/^The\s+/i, "");
    e.title = `How Many Days Until ${lead}? ${year} Countdown`;
  }

  const canonical = `${SITE}${e.urlPath}`;
  const viewId = viewHash(e.urlPath);
  /* Social/preview image (1200x630). By default the dynamic /api/og renderer
   * (which outputs exactly 1200x630); a per-event `hero` (an absolute path to a
   * static 1200x630 image) overrides it. Shared by og:image, twitter:image and
   * the Event JSON-LD so all three always agree. */
  const ogImage = e.hero
    ? `${SITE}${e.hero}`
    : `${SITE}/api/og?${new URLSearchParams({ name: e.name, date: dateISO, time: e.time || "", tz, theme: e.theme, art: e.art }).toString()}`;
  const [hh, mm] = (e.time || "08:00").split(":").map(Number);
  const recur = (once || table) ? null : (e.day
    ? `{m:${e.month},d:${e.day}}`
    : `{m:${e.month},nth:${e.nth},dow:${e.weekday}}`);
  const clockScript = once
    ? `var target=new Date(${epochFor(e.once, e.time, tz)});`
    : table
    ? `var hh=${hh},mm=${mm};var DT=${JSON.stringify(e.dates)};
  function next(){var n=Date.now();for(var i=0;i<DT.length;i++){var p=DT[i].split("-");
    var t=new Date(+p[0],+p[1]-1,+p[2],hh,mm,0);if(t.getTime()>n)return t;}
    var l=DT[DT.length-1].split("-");return new Date(+l[0],+l[1]-1,+l[2],hh,mm,0);}
  var target=next();`
    : `var r=${recur}, hh=${hh}, mm=${mm};
  function occ(y){if(r.d)return new Date(y,r.m-1,r.d,hh,mm,0);
    if(r.nth===-1){var L=new Date(y,r.m,0);
      return new Date(y,r.m-1,L.getDate()-((L.getDay()-r.dow+7)%7),hh,mm,0);}
    var f=new Date(y,r.m-1,1),off=(r.dow-f.getDay()+7)%7;
    return new Date(y,r.m-1,1+off+(r.nth-1)*7,hh,mm,0);}
  function next(){var n=new Date(),t=occ(n.getFullYear());if(t-n<=0)t=occ(n.getFullYear()+1);return t;}
  var target=next();`;

  /* "is the event happening today?" — used to fire the themed celebration the
   * moment someone opens the page on the day itself (e.g. a star's birthday),
   * regardless of whether the countdown's target time has already passed. */
  const todayCheck = once
    ? `(function(){var o=${JSON.stringify(e.once)}.split('-');return n.getFullYear()==+o[0]&&n.getMonth()+1==+o[1]&&n.getDate()==+o[2];})()`
    : table
    ? `(function(){var z=function(x){return x<10?'0'+x:''+x;};var ti=n.getFullYear()+'-'+z(n.getMonth()+1)+'-'+z(n.getDate());return DT.indexOf(ti)>=0;})()`
    : (e.day
      ? `(n.getMonth()+1===r.m&&n.getDate()===r.d)`
      : `(function(){var c=occ(n.getFullYear());return c.getMonth()===n.getMonth()&&c.getDate()===n.getDate();})()`);

  /* static share + add-to-calendar links — the rich page IS the full
   * experience; the event's date is fixed in our data, not editable */
  const encName = encodeURIComponent(e.name);
  const encText = encodeURIComponent(`Live countdown to ${e.name}`);
  const encUrl = encodeURIComponent(canonical);
  /* An event at 23:xx (tax day) used to clamp DTEND to hour 23, producing a
     zero-length — or negative — calendar entry. Roll into the next day
     instead, which is what an hour after 23:59 actually is. */
  const stamp = (h) => {
    const d = new Date(Date.parse(dateISO + "T00:00:00Z") + h * 3600000);
    const p2 = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(mm)}00`;
  };
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encName}` +
    `&dates=${stamp(hh)}/${stamp(hh + 1)}&details=${encodeURIComponent("Countdown: " + canonical)}&ctz=${encodeURIComponent(tz)}`;
  /* Apple/Outlook .ics as a no-JS data URI (downloads and imports anywhere). */
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//timeandspace.science//EN", "BEGIN:VEVENT",
    "UID:" + e.type + (e.slug ? "-" + e.slug : "") + "@timeandspace.science",
    "DTSTAMP:" + stamp(0), "DTSTART:" + stamp(hh), "DTEND:" + stamp(hh + 1),
    "SUMMARY:" + e.name.replace(/[,;\\\n]/g, " "), "URL:" + canonical,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\\r\\n").replace(/\\r\\n/g, "\r\n");
  const icsHref = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);

  /* WebPage JSON-LD, not Event. Google's Event structured data is for
   * attendable events at a real time and place; a countdown PAGE about a date
   * is not the event itself, and celebrity birthdays / abstract dates don't
   * qualify at all — the old markup declared every page an online virtual
   * event at its own URL, which misrepresented the visible content (the
   * thing structured data must never do). WebPage + about entity accurately
   * says what each page is: a page about a person or occasion. The date
   * still reaches crawlers through the visible answer block and FAQ markup. */
  const ld = JSON.stringify({
    "@context": "https://schema.org", "@type": "WebPage",
    name: e.title,
    description: e.desc, url: canonical,
    image: [ogImage],
    ...(e.type === "birthday-countdown" && e.label
      ? { about: { "@type": "Person", name: e.label,
          ...(e.born && e.month && e.day ? { birthDate: `${e.born}-${pad2(e.month)}-${pad2(e.day)}` } : {}) } }
      : { about: { "@type": "Thing", name: e.name } }),
    publisher: { "@type": "Organization", name: "Time and Space Science", url: `${SITE}/` },
  }).replace(/</g, "\\u003c");

  /* Shared FAQ list: one source of truth for both the FAQPage JSON-LD and the
   * visible <details> accordion, so structured data always matches what's on
   * the page. Two universal questions, plus birthday-specific ones (age this
   * year, day of the week), plus any hand-written `faqExtra` from the data. */
  const age = e.born ? +year - e.born : null;
  const turnsVerb = e.late ? "would have turned" : "turns";
  /* `faqCustom` fully replaces the auto date/birthday questions (for pages where
   * the countdown + answer block already cover "when/how many days" and a
   * subject-specific FAQ is more useful). `faqExtra` just appends to the auto
   * set. Both feed the visible accordion and the FAQPage JSON-LD. */
  /* "How many days until The Kentucky Derby?" — a leading "The" that is part of
     a title reads wrong mid-sentence. It is kept for plural-surname couples
     ("The Beckhams' Anniversary"), where the article belongs to the name. */
  const midName = (n) => (/^The [A-Z][a-z]+s['\u2019]/.test(n) ? n : n.replace(/^The /, "the "));
  /* "More holidays in India →" — see COUNTRY_OF at the top of this file. */
  const inCountries = COUNTRY_OF.get(e.slug ? `${e.type}/${e.slug}` : e.type) || [];
  const countryLinks = inCountries.length
    ? `${inCountries.map((c) => `<a href="/countries/${c.code}/">More holidays in ${esc(c.name)}</a>`).join(" · ")} · `
    : "";
  let faqItems;
  if (e.faqCustom && e.faqCustom.length) {
    faqItems = e.faqCustom.map((f) => ({ q: sub(f.q), a: sub(f.a) }));
  } else {
    faqItems = [
      { q: `When is ${e.name}?`, a: `${e.name} is on ${weekday}, ${dateLong}.` },
      { q: `How many days until ${midName(e.name)}?`, a: answerFaq },
    ];
    if (e.type === "birthday-countdown" && age != null) {
      faqItems.push({ q: `How old is ${e.label} turning in ${year}?`,
        a: `${e.label} ${turnsVerb} ${age} on ${weekday}, ${dateLong}${e.born ? ` (born in ${e.born})` : ""}.` });
      faqItems.push({ q: `What day of the week is ${e.label}'s birthday in ${year}?`,
        a: `In ${year}, ${e.label}'s birthday (${dateLong}) falls on a ${weekday}.` });
    }
    for (const f of e.faqExtra || []) faqItems.push({ q: sub(f.q), a: sub(f.a) });
  }

  /* FAQPage JSON-LD from the shared list. (Google restricts FAQ rich results to
   * authoritative sites, but the markup is valid and a hedge if that loosens.) */
  const faq = JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }).replace(/</g, "\\u003c");

  /* breadcrumb: Time and Space Science / <hub-folder> / <this page> */
  const bc = breadcrumbLD(SITE, [
    { name: "Time and Space Science", url: "/" },
    { name: e.category.nav, url: `/${e.category.hub}/` },
    { name: e.name, url: e.urlPath },
  ]).replace(/</g, "\\u003c");

  /* ---- inline links: hyperlink the first mention of each "Learn more" target
   * (a brand/org/page) inside the intro and section prose, plus a few of our
   * own related event pages. Built from e.links (a generic "Wikipedia"/
   * "(official)" suffix or " Black Friday"/" Prime Day" qualifier is stripped
   * to the core brand), an optional e.linkify list, and a small cross-link
   * table. Longest phrases first; first occurrence each; never inside an
   * existing anchor; one link per destination per page. ---- */
  const ESCRX = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const phrases = [], takenP = new Set();
  const addP = (text, url, ext) => {
    text = (text || "").trim(); const k = text.toLowerCase();
    if (!text || takenP.has(k) || /^wikipedia$/i.test(text)) return;
    takenP.add(k); phrases.push({ text, url, ext });
  };
  for (const l of e.links || []) {
    const core = (l.label || "").replace(/\s*\(official\)\s*$/i, "")
      .replace(/\s+(Black Friday|Deals(?: Event)?|NYE|Fireworks)$/i, "").trim();
    addP(core, l.url, !l.url.startsWith("/"));
  }
  for (const x of e.linkify || []) addP(x.text, x.url, !x.url.startsWith("/"));
  /* The shopping-sale entries (Black Friday, Prime Day, Singles' Day…) went
   * with the rest of the site's commerce: nothing here sends a reader to a
   * sale. */
  const CROSS = [
    ["Thanksgiving", "thanksgiving-countdown"],
    ["Halloween", "halloween-countdown"], ["Easter", "easter-countdown"],
  ];
  for (const [text, type] of CROSS) { const url = urlByKey.get(type); if (url && type !== e.type) addP(text, url, false); }
  phrases.sort((a, b) => b.text.length - a.text.length);

  function replaceOutsideAnchors(html, rx, build) {
    const parts = html.split(/(<a\b[^>]*>.*?<\/a>)/g);
    for (let i = 0; i < parts.length; i++) {
      if (/^<a\b/.test(parts[i])) continue;
      const m = rx.exec(parts[i]);
      if (m) { parts[i] = parts[i].slice(0, m.index) + build(m[1], m[2]) + parts[i].slice(m.index + m[0].length); return parts.join(""); }
    }
    return html;
  }
  function linkify(raw) {
    let html = esc(raw); const usedUrls = new Set();
    for (const { text, url, ext } of phrases) {
      if (usedUrls.has(url)) continue;
      const rx = new RegExp(`(^|[^A-Za-z0-9])(${ESCRX(esc(text))})(?![A-Za-z0-9])`, "i");
      const before = html;
      html = replaceOutsideAnchors(html, rx, (pre, m) =>
        `${pre}<a href="${esc(url)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${m}</a>`);
      if (html !== before) usedUrls.add(url);
    }
    return html;
  }

  const sections = e.sections.map((s) =>
    `  <div class="card">\n    <h2>${esc(s.h)}</h2>\n    <p>${linkify(s.p)}</p>\n  </div>`).join("\n");
  const facts = e.facts.map((f) => `      <li>${linkify(f)}</li>`).join("\n");
  /* optional career/life timeline — a compact, verified-facts-only year list.
   * Evergreen and low-risk by design: real dated milestones, never
   * speculation about the future or a person's private life. */
  const timeline = (e.timeline || []).length ? `
  <div class="card">
    <h2>${esc(e.timelineLabel || `The story of ${e.label || e.name}`)}</h2>
    <div class="tl-list">
      ${e.timeline.map((t) => `<div class="tl-row"><span class="tl-year">${esc(t.year)}</span><span class="tl-text">${linkify(t.text)}</span></div>`).join("\n      ")}
    </div>
  </div>
` : "";
  /* optional "records" card — verified superlatives (most titles, biggest
   * margin, youngest winner, etc.), one label/value row each. Distinct from
   * `timeline` (dated milestones) and `champions` (a year-by-year winners
   * list) below. */
  const records = (e.records || []).length ? `
  <div class="card">
    <h2>${esc(e.recordsLabel || `${e.label || e.name} records`)}</h2>
    <div class="rec-list">
      ${e.records.map((r) => `<div class="rec-row"><span class="rec-label">${esc(r.label)}</span><span class="rec-value">${esc(r.value)}</span></div>`).join("\n      ")}
    </div>
  </div>
` : "";
  /* optional "champions" card — the last N winners, newest first. High-
   * intent query ("who won X last year"); reuses the timeline's row layout
   * (year + text) since the shape is identical. */
  const champions = (e.champions || []).length ? `
  <div class="card">
    <h2>${esc(e.championsLabel || `${e.label || e.name} champions`)}</h2>
    <div class="tl-list">
      ${e.champions.map((c) => `<div class="tl-row"><span class="tl-year">${esc(c.year)}</span><span class="tl-text">${esc(c.winner)}${c.note ? ` <span class="champ-note">— ${esc(c.note)}</span>` : ""}</span></div>`).join("\n      ")}
    </div>
  </div>
` : "";
  /* optional evergreen "how to watch" card — channel/streamer info that
   * doesn't go stale season to season, plus optional outbound links. */
  const howToWatch = e.howToWatch ? `
  <div class="card">
    <h2>How to watch ${esc(e.label || e.name)}</h2>
    <p>${linkify(e.howToWatch.text)}</p>${(e.howToWatch.links || []).length ? `
    <div class="more-links works-links">
      ${e.howToWatch.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("\n      ")}
    </div>` : ""}
  </div>
` : "";
  /* Federal holidays used to cross-link to /work/holiday/ and
   * /work/long-weekend/. Those pages were written for an office worker
   * counting down to time off, and went with the rest of that family in
   * August 2026 — so this card now points at the calendar, which is where a
   * class would look up the term's holidays anyway. */
  const fedCard = e.federal ? `
  <div class="card">
    <h2>A U.S. federal holiday</h2>
    <p>${esc(e.name)} is one of the 11 official U.S. federal holidays. The <a href="/calendar/">event calendar</a> lists them all, month by month, alongside everything else the site counts down to.</p>
  </div>` : "";
  /* "celebrate by giving" callout — one verified, actionable way fans can
   * support a cause the person champions (birthday pages) */
  const give = e.give && e.give.text ? `
  <div class="more give-cta">
    <div class="more-label">Celebrate by giving</div>
    <p class="give-line">🎁 ${esc(e.give.text)}${e.give.url ? ` <a href="${esc(e.give.url)}" target="_blank" rel="noopener">${esc(e.give.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/.*$/, ""))}</a>` : ""}</p>
  </div>
` : "";
  const links = (e.links || []).length ? `
  <div class="more">
    <div class="more-label">Learn more</div>
    <div class="more-links">
      ${e.links.filter((l) => l.url).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("\n      ")}
    </div>
  </div>
` : "";
  /* notable works (albums, films, ventures) as a card of outbound chips —
   * good context for visitors and good entity signals for search */
  const works = (e.works || []).length ? `
  <div class="card">
    <h2>${esc(e.worksLabel || "Highlights")}</h2>
    <div class="more-links works-links">
      ${e.works.map((w) => (w.url
        ? `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.label)}</a>`
        : `<span class="work-name">${esc(w.label)}</span>`)).join("\n      ")}
    </div>
  </div>
` : "";
  /* musician birthday pages: songs to actually listen to instead of a shop
   * card. `e.music` (artist-music.mjs's richer module — press-play strip,
   * latest release, curated songs with direct service links, discography
   * link) takes priority; `e.songs` (the older, simpler song-list-only
   * shape from lib.mjs songRow()) is the fallback for artists not yet
   * migrated to the richer module. Search-fallback links inside `e.music`
   * are logged so they don't ship silently — see artist-music.mjs. */
  const SONG_ACCENTS = ["#f2c94c", "#fda4af", "#a78bfa", "#6ee7b7", "#93c5fd", "#fcd34d"];
  let songs = "";
  if (e.music) {
    const mod = artistMusicModule(e.label, daysAway, e.music);
    songs = mod.html;
    for (const w of mod.warnings) console.warn(`! ${w}`);
  } else if ((e.songs || []).length) {
    songs = `
  <div class="card">
    <h2>${esc(e.songsLabel || `${e.label}'s songs`)}</h2>
    <div class="song-list">
      ${e.songs.map((s, i) => songRow({ title: s.title, artist: e.label, url: s.url, spotifyId: s.spotifyId, acc: SONG_ACCENTS[i % SONG_ACCENTS.length] })).join("\n      ")}
    </div>
  </div>
`;
  }
  /* optional extra link card (e.g. the election page's per-state voter
   * registration grid) — heading + short pitch + a wall of compact links */
  const extra = e.extra ? `
  <div class="card">
    <h2>${esc(sub(e.extra.h))}</h2>
    <p>${esc(sub(e.extra.p))}</p>
    <div class="more-links works-links">
      ${e.extra.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("\n      ")}
    </div>
  </div>
` : "";
  /* internal cross-links to frequent collaborators' own birthday pages */
  const relatedList = (e.related || []).map((sl) => peopleBySlug.get(sl)).filter(Boolean);
  const relatedCard = relatedList.length ? `
  <div class="card">
    <h2>${e.type === "birthday-countdown" ? "Frequently works with" : "Fans also count down to"}</h2>
    <div class="more-links works-links">
      ${relatedList.map((r) => `<a href="${esc(r.url)}">${esc(r.label)}</a>`).join("\n      ")}
    </div>
  </div>
` : "";

  /* Optional "How <fans> celebrate" section (Phase 4), data-driven via
   * e.celebrate = { h, p, items:[...] }. Each item is either a plain string or
   * an object { t, link:{label,url} } so a tradition can carry an inline link
   * (e.g. a recipe). */
  const celItems = e.celebrate ? (e.celebrate.items || []) : [];
  const renderCelItem = (i) => {
    if (typeof i === "string") return `      <li>${esc(sub(i))}</li>`;
    const link = i.link ? ` <a href="${esc(i.link.url)}" target="_blank" rel="noopener">${esc(i.link.label)}</a>` : "";
    return `      <li>${esc(sub(i.t))}${link}</li>`;
  };
  const celebrate = e.celebrate ? `
  <div class="card">
    <h2>${esc(sub(e.celebrate.h))}</h2>${e.celebrate.p ? `\n    <p>${linkify(sub(e.celebrate.p))}</p>` : ""}${celItems.length ? `
    <ul class="facts celebrate-list">
${celItems.map(renderCelItem).join("\n")}
    </ul>` : ""}
  </div>
` : "";

  /* Visible FAQ accordion (Phase 4) — the on-page counterpart to the FAQPage
   * JSON-LD, from the same faqItems so they never disagree. */
  /* When the FAQ is a custom subject-specific set, title it after the subject
   * (e.g. "Taylor Swift") rather than the event ("Taylor Swift's Birthday"). */
  const faqHeading = (e.faqCustom && e.faqCustom.length && e.label) ? e.label : e.name;
  const faqSection = `
  <div class="card faq-card">
    <h2>${esc(faqHeading)} — frequently asked questions</h2>
    ${faqItems.map((f) => `<details><summary>${esc(f.q)}</summary><p class="faq-a">${esc(f.a)}</p></details>`).join("\n    ")}
  </div>
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(e.title)}</title>
<meta name="description" content="${esc(metaDesc)}">
<meta name="robots" content="max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(e.title)}">
<meta property="og:description" content="${esc(e.desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(e.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(e.title)}">
<meta name="twitter:description" content="${esc(e.desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${ld}</script>
<script type="application/ld+json">${faq}</script>
<script type="application/ld+json">${bc}</script>
${GA_SNIPPET}
</head>
<body>
<div class="wrap">
  ${brand({ crumb: { slug: e.category.hub, url: `/${e.category.hub}/` }, page: { label: e.name, url: e.urlPath } })}
  ${e.profile
    ? `<h1 class="cd-profile-h1">${esc(e.h1)}</h1>`
    : `${e.type === "birthday-countdown"
        ? `<div class="cd-hero cd-hero-pair">${ART.star}${ART.birthday}</div>`
        : `<div class="cd-hero">${ART[e.art] || ART.generic}</div>`}
  <h1>${esc(e.h1)}</h1>
  <p class="sub">${linkify(e.intro)}</p>${estimateNote}`}

  <div class="cd-clockrow">
  <p class="visually-hidden">${esc(answer)}</p>
  <div class="clock" aria-hidden="true">
    <div class="unit"><div class="num" id="d">${snap.d}</div><div class="lab">Days</div></div>
    <div class="unit"><div class="num" id="h">${snap.h}</div><div class="lab">Hours</div></div>
    <div class="unit"><div class="num" id="m">${snap.m}</div><div class="lab">Minutes</div></div>
    <div class="unit"><div class="num" id="s">${snap.s}</div><div class="lab">Seconds</div></div>
  </div>
  <p class="cd-views" id="views"></p>
  </div>
  <p class="cd-localtime" id="when2"></p>
  <div id="msg" class="cd-msg"></div>
${e.profile ? `
  <div class="cd-profile">
    <div class="cd-profile-img">${/^\/|\.(webp|png|jpe?g|gif)$/i.test(e.profile)
        ? heroImg(e.profile, e.profileAlt || (e.type === "birthday-countdown" ? `Cartoon of ${e.label} celebrating a birthday` : `Illustration celebrating ${e.name}`))
        : (ART[e.profile] || "")}</div>
    <div class="cd-profile-body">
      <p class="sub">${linkify(e.intro)}</p>${estimateNote}
      ${profileMeta}
    </div>
  </div>` : ""}
  <div class="card cd-answer">
    <h2>How many days until ${esc(midName(e.name))}?</h2>
    <p>${answerHtml}</p>
    <p class="hint">${countryLinks}See where this falls among everything else — <a href="/calendar/">the event calendar</a>.</p>
  </div>
  <div class="share-row">
    <span class="share-label">Share:</span>
    <button type="button" class="ico copy" title="Copy link" aria-label="Copy link" onclick="var b=this;if(navigator.clipboard){navigator.clipboard.writeText(location.href);b.classList.add('ok');var o=b.getAttribute('aria-label');b.setAttribute('aria-label','Link copied');setTimeout(function(){b.classList.remove('ok');b.setAttribute('aria-label',o);},1500);}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg></button>
    <a class="ico wa" href="https://wa.me/?text=${encText}%20${encUrl}" target="_blank" rel="noopener" aria-label="Share on WhatsApp" title="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3a8.2 8.2 0 1 1 6.9 3.7zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.1-.3.2-.5 0a6.6 6.6 0 0 1-3.3-2.8c-.2-.4.2-.4.6-1.2 0-.2 0-.3 0-.4 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.3.3-1 .9-1 2.2s1 2.6 1.1 2.7c.1.2 2 3 4.7 4.1 2.7 1 2.7.7 3.2.7.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2z"/></svg></a>
    <a class="ico fb" href="https://www.facebook.com/sharer/sharer.php?u=${encUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook" title="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7h2.3l.4-3h-2.7V9.1c0-.9.3-1.4 1.5-1.4H16V5.1c-.3 0-1.3-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9V11H7.5v3h2.4v7h3.6z"/></svg></a>
    <a class="ico x" href="https://twitter.com/intent/tweet?text=${encText}&amp;url=${encUrl}" target="_blank" rel="noopener" aria-label="Share on X" title="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 3h3l-6.6 7.5L21.8 21h-6l-4.7-6.1L5.7 21h-3l7-8L2.5 3h6.1l4.2 5.6L17.5 3zm-1 16.1h1.6L7.6 4.8H5.8l10.7 14.3z"/></svg></a>
    <a class="ico tg" href="https://t.me/share/url?url=${encUrl}&amp;text=${encText}" target="_blank" rel="noopener" aria-label="Share on Telegram" title="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.6l-3.1 14.7c-.2 1-.8 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.9L18.3 6.6c.4-.4-.1-.6-.6-.2L7 13.1l-4.7-1.5c-1-.3-1-1 .2-1.5l18.1-7c.8-.3 1.5.2 1.3 1.5z"/></svg></a>
    <a class="ico sms" href="sms:?&amp;body=${encText}%20${encUrl}" aria-label="Share by text message" title="Text message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.3 1.2 4.3 3.1 5.8-.1 1-.5 2.3-1.6 3.5 1.9-.2 3.4-.9 4.5-1.6 1.2.3 2.6.5 4 .5 5.5 0 10-3.6 10-8.2S17.5 3 12 3z"/></svg></a>
    <a class="ico em" href="mailto:?subject=${encName}&amp;body=${encText}%0A%0A${encUrl}" aria-label="Share by email" title="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.3 2L12 12l7.7-5H4.3zM20 8.3l-8 5.2-8-5.2V17h16V8.3z"/></svg></a>
  </div>
  <div class="cal-row">
    <span class="share-label">Add to calendar:</span>
    <a class="btn small secondary" href="${gcal}" target="_blank" rel="noopener">📅 Google</a>
    <a class="btn small secondary" href="${icsHref}" download="${(e.slug || e.type).replace(/[^a-z0-9-]/g, "")}.ics">📅 Apple / Outlook</a>
  </div>
${songs}
${timeline}
${records}
${champions}
${extra}
${sections}
${celebrate}
  <div class="card">
    <h2>Quick facts</h2>
    <ul class="facts">
${facts}
    </ul>
  </div>${fedCard}
${howToWatch}
${relatedCard}${give}${works}${links}
${faqSection}
  <p class="updated">${e.verified ? `Fact-checked ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(e.verified + "T00:00:00Z"))} · ` : ""}Updated ${new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})} · Time and Space Science</p>
  <p class="footer"><a href="/wrong-date/?url=${canonical}">Wrong date?</a> · <a href="/browser-limitations/">Browser limitations</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</div>
<script src="/assets/js/effects.js"></script>
<script>
(function(){
  ${clockScript}
  /* The "N days away" prose is baked server-side for crawlers, but can drift
   * between daily rebuilds (or behind edge caching). Correct it client-side to
   * the visitor's own local calendar-day difference so it's never wrong. */
  (function(){var A=document.getElementById('cd-days-away');if(!A)return;
    var t=new Date(target.getFullYear(),target.getMonth(),target.getDate());
    var n=new Date(),td=new Date(n.getFullYear(),n.getMonth(),n.getDate());
    var d=Math.max(0,Math.round((t-td)/86400000));
    A.textContent=d+' calendar '+(d===1?'day':'days');})();
  /* show the exact target moment in the visitor's own timezone, so they know
   * when it goes off for them (their local time + their tz abbreviation) */
  (function(){var W2=document.getElementById('when2');if(!W2)return;
    try{W2.textContent='⏰ Counts down to '+new Intl.DateTimeFormat(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(target)+' your time';}catch(_){}})();
  function p(n){return n<10?'0'+n:n;}
  function tick(){var diff=target-new Date();
    if(diff<=0){document.getElementById('msg').textContent=diff>-86400000?${JSON.stringify(e.message || "🎉 It's today!")}:"This event has passed.";}
    if(diff<0)diff=0;var s=Math.floor(diff/1000);
    var dd=Math.floor(s/86400), hh=Math.floor(s%86400/3600);
    document.getElementById('d').textContent=dd;
    document.getElementById('h').textContent=p(hh);
    document.getElementById('m').textContent=p(Math.floor(s%3600/60));
    document.getElementById('s').textContent=p(s%60);
    var E=document.getElementById('cd-elapsed');
    if(E) E.textContent=dd+' day'+(dd===1?'':'s')+' '+hh+' hour'+(hh===1?'':'s');}
  tick();setInterval(tick,1000);
  /* small view counter (Cloudflare Function + KV). Degrades silently. */
  (function(){var V=document.getElementById('views');if(!V)return;
    var vid;try{vid=localStorage.getItem('ac_vid');if(!vid){vid=Date.now().toString(36)+Math.random().toString(36).slice(2,10);localStorage.setItem('ac_vid',vid);}}catch(_){vid='';}
    fetch('/api/views?id=${viewId}'+(vid?'&v='+encodeURIComponent(vid):''),{method:'POST'}).then(function(r){return r.ok?r.json():null;})
      .then(function(d){if(d&&typeof d.count==='number'){V.textContent='\\uD83D\\uDC41 '+d.count.toLocaleString()+' view'+(d.count===1?'':'s');}}).catch(function(){});})();
  ${e.music ? `/* nudge Apple Music links to the visitor's own storefront */\n  ${APPLE_REGION_JS}` : ""}
  /* fire the themed celebration if the page is opened on the day itself */
  try{var n=new Date();if(${todayCheck}&&window.AC_FX)AC_FX.burst(${JSON.stringify(e.effect || "confetti")});}catch(_){}
})();
</script>
</body>
</html>
`;
}

let n = 0;
for (const e of events) {
  const dir = join(root, e.urlPath.replace(/^\/|\/$/g, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(e));
  n++;
}
console.log(`Generated ${n} rich event landing pages.`);
