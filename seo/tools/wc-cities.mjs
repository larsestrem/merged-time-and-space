/* wc-cities.mjs — the world clock's city list, in two tiers.
 *
 * TIER 1 (below) is one city per UTC offset, west→east: it covers every
 * distinct clock on earth, including the half-hour and 45-minute zones, and it
 * is what the /world-clock/ grid shows. lat/lon drive sunrise/sunset.
 *
 * TIER 2 is the demand list: cities people search "current time in ___" for
 * that happen to SHARE a tier-1 offset (Toronto is Eastern, Berlin is Central
 * European, Singapore has its own zone but no offset of its own). They get
 * their own /world-clock/<city>/ page but stay OUT of the hub grid, because the
 * grid's whole premise is one card per offset — adding Toronto next to New York
 * would show the same clock twice. The hub links them in a separate list.
 *
 * Tier 2 is defined by NAME against cities.mjs, so the zone and coordinates
 * come from the same table the /sun/ and /moon/ pages use and cannot drift from
 * them (which also means every tier-2 city has a sun and moon page to link to).
 *
 * It lives in its own module with NO side effects because two things need it:
 * build-world-clock.mjs, which writes the hub and the city pages, and
 * localtime.mjs, which every sun/moon/tide page uses to point its "local time
 * right now" line at the matching world-clock page. Importing the generator for
 * the list would have re-run the whole world-clock build from inside three
 * other generators.
 */
import { CITY_DB, citySlug } from "./cities.mjs";

const TIER1 = [
  { tz: "Pacific/Pago_Pago", city: "Pago Pago", area: "American Samoa", lat: -14.28, lon: -170.70 },
  { tz: "Pacific/Honolulu", city: "Honolulu", area: "USA", region: "HI", lat: 21.31, lon: -157.86 },
  { tz: "America/Anchorage", city: "Anchorage", area: "USA", region: "AK", lat: 61.22, lon: -149.90 },
  { tz: "America/Los_Angeles", city: "Los Angeles", area: "USA", region: "CA", lat: 34.05, lon: -118.24 },
  { tz: "America/Denver", city: "Denver", area: "USA", region: "CO", lat: 39.74, lon: -104.99 },
  { tz: "America/Chicago", city: "Chicago", area: "USA", region: "IL", lat: 41.88, lon: -87.63 },
  { tz: "America/New_York", city: "New York", area: "USA", region: "NY", lat: 40.71, lon: -74.01 },
  { tz: "America/Halifax", city: "Halifax", area: "Canada", region: "NS", lat: 44.65, lon: -63.57 },
  { tz: "America/St_Johns", city: "St. John's", area: "Canada", region: "NL", lat: 47.56, lon: -52.71 },
  { tz: "America/Sao_Paulo", city: "São Paulo", area: "Brazil", region: "SP", lat: -23.55, lon: -46.63 },
  { tz: "Atlantic/Azores", city: "Azores", area: "Portugal", lat: 37.74, lon: -25.67 },
  { tz: "Europe/London", city: "London", area: "UK", lat: 51.51, lon: -0.13 },
  { tz: "Europe/Paris", city: "Paris", area: "France", lat: 48.85, lon: 2.35 },
  { tz: "Europe/Athens", city: "Athens", area: "Greece", lat: 37.98, lon: 23.73 },
  { tz: "Europe/Moscow", city: "Moscow", area: "Russia", lat: 55.76, lon: 37.62 },
  { tz: "Asia/Tehran", city: "Tehran", area: "Iran", lat: 35.69, lon: 51.39 },
  { tz: "Asia/Dubai", city: "Dubai", area: "UAE", lat: 25.20, lon: 55.27 },
  { tz: "Asia/Kabul", city: "Kabul", area: "Afghanistan", lat: 34.53, lon: 69.17 },
  { tz: "Asia/Karachi", city: "Karachi", area: "Pakistan", lat: 24.86, lon: 67.01 },
  { tz: "Asia/Kolkata", city: "Mumbai", area: "India", lat: 19.08, lon: 72.88 },
  { tz: "Asia/Kathmandu", city: "Kathmandu", area: "Nepal", lat: 27.70, lon: 85.32 },
  { tz: "Asia/Dhaka", city: "Dhaka", area: "Bangladesh", lat: 23.81, lon: 90.41 },
  { tz: "Asia/Bangkok", city: "Bangkok", area: "Thailand", lat: 13.76, lon: 100.50 },
  { tz: "Asia/Shanghai", city: "Shanghai", area: "China", lat: 31.23, lon: 121.47 },
  { tz: "Asia/Tokyo", city: "Tokyo", area: "Japan", lat: 35.68, lon: 139.65 },
  { tz: "Australia/Adelaide", city: "Adelaide", area: "Australia", region: "SA", lat: -34.93, lon: 138.60 },
  { tz: "Australia/Sydney", city: "Sydney", area: "Australia", region: "NSW", lat: -33.87, lon: 151.21 },
  { tz: "Pacific/Noumea", city: "Nouméa", area: "New Caledonia", lat: -22.28, lon: 166.46 },
  { tz: "Pacific/Auckland", city: "Auckland", area: "New Zealand", lat: -36.85, lon: 174.76 },
  { tz: "Pacific/Apia", city: "Apia", area: "Samoa", lat: -13.83, lon: -171.77 },
];

/* [city name in cities.mjs, US/CA/AU state or province for the label]. Ordered
 * by region for readability; the pages are generated in this order. */
const TIER2_NAMES = [
  /* United States */
  ["San Francisco", "CA"], ["San Diego", "CA"], ["Las Vegas", "NV"], ["Phoenix", "AZ"], ["Seattle", "WA"],
  ["Portland", "OR"], ["Salt Lake City", "UT"], ["Houston", "TX"], ["Dallas", "TX"], ["Austin", "TX"],
  ["Minneapolis", "MN"], ["New Orleans", "LA"], ["Nashville", "TN"], ["Atlanta", "GA"], ["Miami", "FL"],
  ["Detroit", "MI"], ["Philadelphia", "PA"], ["Boston", "MA"], ["Washington, D.C.", "DC"],
  /* Canada */
  ["Vancouver", "BC"], ["Calgary", "AB"], ["Toronto", "ON"], ["Montreal", "QC"],
  /* Latin America */
  ["Mexico City"], ["Havana"], ["Bogotá"], ["Lima"], ["Caracas"], ["Santiago"], ["Buenos Aires"], ["Rio de Janeiro"],
  /* Europe */
  ["Dublin"], ["Edinburgh"], ["Lisbon"], ["Reykjavík"], ["Madrid"], ["Barcelona"], ["Amsterdam"], ["Brussels"],
  ["Berlin"], ["Frankfurt"], ["Zurich"], ["Geneva"], ["Vienna"], ["Prague"], ["Warsaw"], ["Copenhagen"],
  ["Oslo"], ["Stockholm"], ["Helsinki"], ["Rome"], ["Milan"], ["Kyiv"], ["Istanbul"],
  /* Africa & Middle East */
  ["Casablanca"], ["Lagos"], ["Cairo"], ["Johannesburg"], ["Cape Town"], ["Nairobi"], ["Jerusalem"], ["Tel Aviv"],
  ["Baghdad"], ["Riyadh"],
  /* Asia */
  ["Delhi"], ["Hanoi"], ["Ho Chi Minh City"], ["Jakarta"], ["Kuala Lumpur"], ["Singapore"], ["Manila"],
  ["Hong Kong"], ["Taipei"], ["Beijing"], ["Seoul"], ["Osaka"],
  /* Oceania */
  ["Perth"], ["Brisbane"], ["Melbourne"],
];

const DB = new Map(CITY_DB.map(([city, area, tz, lat, lon]) => [city, { city, area, tz, lat, lon }]));
const TIER2 = TIER2_NAMES.map(([name, region]) => {
  const c = DB.get(name);
  /* a typo here would silently drop a page, so it fails the build instead */
  if (!c) throw new Error(`wc-cities: "${name}" is not in cities.mjs CITY_DB`);
  return { ...c, ...(region ? { region } : {}), tier: 2 };
});

export const WC_CITY_LIST = [...TIER1.map((c) => ({ ...c, tier: 1 })), ...TIER2];
{
  const seen = new Set();
  for (const c of WC_CITY_LIST) {
    const slug = citySlug(c.city);
    if (seen.has(slug)) throw new Error(`wc-cities: two cities share the slug "${slug}"`);
    seen.add(slug);
  }
}

/* IANA zone -> the world-clock page for it. Tier 1 goes in FIRST, so a zone
 * that has a tier-1 representative keeps it (America/New_York -> new-york) and
 * tier 2 only ever adds zones of its own (America/Toronto -> toronto). Zones in
 * neither list fall back to the hub — see localtime.mjs. */
/* every city that HAS a page, by slug — so a caller holding a place name can
 * ask "is there a world clock page for this exact city?" before falling back to
 * asking "…for this city's zone?" (localtime.mjs does exactly that). */
export const WC_SLUGS = new Set(WC_CITY_LIST.map((c) => citySlug(c.city)));

export const WC_BY_TZ = new Map();
/* first writer wins — the list is tier 1 then tier 2, and `new Map(pairs)` would
 * have done the opposite, quietly handing America/New_York to a tier-2 city. */
for (const c of WC_CITY_LIST) if (!WC_BY_TZ.has(c.tz)) WC_BY_TZ.set(c.tz, citySlug(c.city));
