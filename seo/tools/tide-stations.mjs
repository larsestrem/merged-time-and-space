/* tide-stations.mjs — curated NOAA CO-OPS tide-prediction stations that get
 * their own /tides/<slug>/ page (and power the tool's instant search +
 * "nearest to me"). This is a deliberate, finite list of well-known harbors —
 * same philosophy as the timer durations: a clean set Google can index, not
 * thousands of thin pages. The client can still search ALL ~3,300 NOAA
 * stations live (mdapi fetch in assets/js/tides.js); this list is just the
 * curated tier. id = NOAA station id; lat/lng drive the weather overlay and
 * nearest-station math. Sorted by state, then city. */

export const TIDE_STATIONS = [
  { slug: "eastport-me",         city: "Eastport",            st: "ME", county: "Washington County", id: "8410140", name: "Eastport",                 lat: 44.90,  lng: -66.98 },
  { slug: "bar-harbor-me",       city: "Bar Harbor",          st: "ME", county: "Hancock County", id: "8413320", name: "Bar Harbor",               lat: 44.39,  lng: -68.21 },
  { slug: "portland-me",         city: "Portland",            st: "ME", county: "Cumberland County", id: "8418150", name: "Portland",                 lat: 43.66,  lng: -70.24 },
  { slug: "boston-ma",           city: "Boston",              st: "MA", county: "Suffolk County", id: "8443970", name: "Boston",                   lat: 42.35,  lng: -71.05 },
  { slug: "woods-hole-ma",       city: "Woods Hole",          st: "MA", county: "Barnstable County", id: "8447930", name: "Woods Hole",               lat: 41.52,  lng: -70.67 },
  { slug: "nantucket-ma",        city: "Nantucket",           st: "MA", county: "Nantucket County", id: "8449130", name: "Nantucket Island",         lat: 41.29,  lng: -70.10 },
  { slug: "newport-ri",          city: "Newport",             st: "RI", county: "Newport County", id: "8452660", name: "Newport",                  lat: 41.51,  lng: -71.33 },
  { slug: "providence-ri",       city: "Providence",          st: "RI", county: "Providence County", id: "8454000", name: "Providence",               lat: 41.81,  lng: -71.40 },
  { slug: "new-london-ct",       city: "New London",          st: "CT", county: "New London County", id: "8461490", name: "New London",               lat: 41.36,  lng: -72.09 },
  { slug: "bridgeport-ct",       city: "Bridgeport",          st: "CT", county: "Fairfield County", id: "8467150", name: "Bridgeport",               lat: 41.17,  lng: -73.18 },
  { slug: "montauk-ny",          city: "Montauk",             st: "NY", county: "Suffolk County", id: "8510560", name: "Montauk",                  lat: 41.05,  lng: -71.96 },
  { slug: "kings-point-ny",      city: "Kings Point",         st: "NY", county: "Nassau County", id: "8516945", name: "Kings Point",              lat: 40.81,  lng: -73.76 },
  { slug: "new-york-ny",         city: "New York",            st: "NY", county: "New York County", id: "8518750", name: "The Battery, New York Harbor", lat: 40.70, lng: -74.01 },
  { slug: "sandy-hook-nj",       city: "Sandy Hook",          st: "NJ", county: "Monmouth County", id: "8531680", name: "Sandy Hook",               lat: 40.47,  lng: -74.01 },
  { slug: "atlantic-city-nj",    city: "Atlantic City",       st: "NJ", county: "Atlantic County", id: "8534720", name: "Atlantic City",            lat: 39.36,  lng: -74.42 },
  { slug: "cape-may-nj",         city: "Cape May",            st: "NJ", county: "Cape May County", id: "8536110", name: "Cape May",                 lat: 38.97,  lng: -74.96 },
  { slug: "lewes-de",            city: "Lewes",               st: "DE", county: "Sussex County", id: "8557380", name: "Lewes",                    lat: 38.78,  lng: -75.12 },
  { slug: "ocean-city-md",       city: "Ocean City",          st: "MD", county: "Worcester County", id: "8570283", name: "Ocean City Inlet",         lat: 38.33,  lng: -75.09 },
  { slug: "baltimore-md",        city: "Baltimore",           st: "MD", county: "Baltimore City", id: "8574680", name: "Baltimore",                lat: 39.27,  lng: -76.58 },
  { slug: "annapolis-md",        city: "Annapolis",           st: "MD", county: "Anne Arundel County", id: "8575512", name: "Annapolis",                lat: 38.98,  lng: -76.48 },
  { slug: "washington-dc",       city: "Washington",          st: "DC", county: "District of Columbia", id: "8594900", name: "Washington",               lat: 38.87,  lng: -77.02 },
  { slug: "kiptopeke-va",        city: "Kiptopeke",           st: "VA", county: "Northampton County", id: "8632200", name: "Kiptopeke",                lat: 37.17,  lng: -75.99 },
  { slug: "norfolk-va",          city: "Norfolk",             st: "VA", county: "Norfolk City", id: "8638610", name: "Sewells Point",            lat: 36.95,  lng: -76.33 },
  { slug: "duck-nc",             city: "Duck",                st: "NC", county: "Dare County", id: "8651370", name: "Duck",                     lat: 36.18,  lng: -75.75 },
  { slug: "beaufort-nc",         city: "Beaufort",            st: "NC", county: "Carteret County", id: "8656483", name: "Beaufort, Duke Marine Lab", lat: 34.72, lng: -76.67 },
  { slug: "wrightsville-beach-nc", city: "Wrightsville Beach", st: "NC", county: "New Hanover County", id: "8658163", name: "Wrightsville Beach",      lat: 34.21,  lng: -77.79 },
  { slug: "myrtle-beach-sc",     city: "Myrtle Beach",        st: "SC", county: "Horry County", id: "8661070", name: "Springmaid Pier",          lat: 33.65,  lng: -78.92 },
  { slug: "charleston-sc",       city: "Charleston",          st: "SC", county: "Charleston County", id: "8665530", name: "Charleston",               lat: 32.78,  lng: -79.92 },
  { slug: "savannah-ga",         city: "Savannah",            st: "GA", county: "Chatham County", id: "8670870", name: "Fort Pulaski",             lat: 32.03,  lng: -80.90 },
  { slug: "jacksonville-fl",     city: "Jacksonville",        st: "FL", county: "Duval County", id: "8720218", name: "Mayport (Bar Pilots Dock)", lat: 30.40, lng: -81.43 },
  { slug: "cape-canaveral-fl",   city: "Cape Canaveral",      st: "FL", county: "Brevard County", id: "8721604", name: "Trident Pier, Port Canaveral", lat: 28.42, lng: -80.59 },
  { slug: "palm-beach-fl",       city: "Palm Beach",          st: "FL", county: "Palm Beach County", id: "8722670", name: "Lake Worth Pier",          lat: 26.61,  lng: -80.03 },
  { slug: "miami-fl",            city: "Miami",               st: "FL", county: "Miami-Dade County", id: "8723214", name: "Virginia Key",             lat: 25.73,  lng: -80.16 },
  { slug: "key-west-fl",         city: "Key West",            st: "FL", county: "Monroe County", id: "8724580", name: "Key West",                 lat: 24.55,  lng: -81.81 },
  { slug: "naples-fl",           city: "Naples",              st: "FL", county: "Collier County", id: "8725110", name: "Naples",                   lat: 26.13,  lng: -81.81 },
  { slug: "st-petersburg-fl",    city: "St. Petersburg",      st: "FL", county: "Pinellas County", id: "8726520", name: "St. Petersburg",           lat: 27.76,  lng: -82.63 },
  { slug: "pensacola-fl",        city: "Pensacola",           st: "FL", county: "Escambia County", id: "8729840", name: "Pensacola",                lat: 30.40,  lng: -87.21 },
  { slug: "dauphin-island-al",   city: "Dauphin Island",      st: "AL", county: "Mobile County", id: "8735180", name: "Dauphin Island",           lat: 30.25,  lng: -88.08 },
  { slug: "bay-st-louis-ms",     city: "Bay St. Louis",       st: "MS", county: "Hancock County", id: "8747437", name: "Bay Waveland Yacht Club",  lat: 30.33,  lng: -89.33 },
  { slug: "grand-isle-la",       city: "Grand Isle",          st: "LA", county: "Jefferson Parish", id: "8761724", name: "Grand Isle",               lat: 29.26,  lng: -89.96 },
  { slug: "galveston-tx",        city: "Galveston",           st: "TX", county: "Galveston County", id: "8771450", name: "Galveston Pier 21",        lat: 29.31,  lng: -94.79 },
  { slug: "port-isabel-tx",      city: "Port Isabel",         st: "TX", county: "Cameron County", id: "8779770", name: "Port Isabel",              lat: 26.06,  lng: -97.22 },
  { slug: "san-diego-ca",        city: "San Diego",           st: "CA", county: "San Diego County", id: "9410170", name: "San Diego, San Diego Bay", lat: 32.71,  lng: -117.17 },
  { slug: "los-angeles-ca",      city: "Los Angeles",         st: "CA", county: "Los Angeles County", id: "9410660", name: "Los Angeles",              lat: 33.72,  lng: -118.27 },
  { slug: "santa-monica-ca",     city: "Santa Monica",        st: "CA", county: "Los Angeles County", id: "9410840", name: "Santa Monica",             lat: 34.01,  lng: -118.50 },
  { slug: "santa-barbara-ca",    city: "Santa Barbara",       st: "CA", county: "Santa Barbara County", id: "9411340", name: "Santa Barbara",            lat: 34.40,  lng: -119.69 },
  { slug: "monterey-ca",         city: "Monterey",            st: "CA", county: "Monterey County", id: "9413450", name: "Monterey",                 lat: 36.61,  lng: -121.89 },
  { slug: "san-francisco-ca",    city: "San Francisco",       st: "CA", county: "San Francisco County", id: "9414290", name: "San Francisco",            lat: 37.81,  lng: -122.47 },
  { slug: "alameda-ca",          city: "Alameda",             st: "CA", county: "Alameda County", id: "9414750", name: "Alameda",                  lat: 37.77,  lng: -122.30 },
  { slug: "humboldt-bay-ca",     city: "Humboldt Bay",        st: "CA", county: "Humboldt County", id: "9418767", name: "North Spit, Humboldt Bay", lat: 40.77,  lng: -124.22 },
  { slug: "crescent-city-ca",    city: "Crescent City",       st: "CA", county: "Del Norte County", id: "9419750", name: "Crescent City",            lat: 41.75,  lng: -124.18 },
  { slug: "charleston-or",       city: "Charleston",          st: "OR", county: "Coos County", id: "9432780", name: "Charleston",               lat: 43.35,  lng: -124.32 },
  { slug: "newport-or",          city: "Newport",             st: "OR", county: "Lincoln County", id: "9435380", name: "South Beach",              lat: 44.63,  lng: -124.04 },
  { slug: "astoria-or",          city: "Astoria",             st: "OR", county: "Clatsop County", id: "9439040", name: "Astoria",                  lat: 46.21,  lng: -123.77 },
  { slug: "toke-point-wa",       city: "Toke Point",          st: "WA", county: "Pacific County", id: "9440910", name: "Toke Point",               lat: 46.71,  lng: -123.97 },
  { slug: "neah-bay-wa",         city: "Neah Bay",            st: "WA", county: "Clallam County", id: "9443090", name: "Neah Bay",                 lat: 48.37,  lng: -124.60 },
  { slug: "port-townsend-wa",    city: "Port Townsend",       st: "WA", county: "Jefferson County", id: "9444900", name: "Port Townsend",            lat: 48.11,  lng: -122.76 },
  { slug: "seattle-wa",          city: "Seattle",             st: "WA", county: "King County", id: "9447130", name: "Seattle",                  lat: 47.60,  lng: -122.34 },
  { slug: "friday-harbor-wa",    city: "Friday Harbor",       st: "WA", county: "San Juan County", id: "9449880", name: "Friday Harbor",            lat: 48.55,  lng: -123.01 },
  { slug: "sitka-ak",            city: "Sitka",               st: "AK", county: "Sitka Borough", id: "9451600", name: "Sitka",                    lat: 57.05,  lng: -135.34 },
  { slug: "juneau-ak",           city: "Juneau",              st: "AK", county: "Juneau Borough", id: "9452210", name: "Juneau",                   lat: 58.30,  lng: -134.41 },
  { slug: "anchorage-ak",        city: "Anchorage",           st: "AK", county: "Anchorage Municipality", id: "9455920", name: "Anchorage",                lat: 61.24,  lng: -149.89 },
  { slug: "kauai-hi",            city: "Kauai (Nawiliwili)",  st: "HI", county: "Kauai County", id: "1611400", name: "Nawiliwili",               lat: 21.95,  lng: -159.36 },
  { slug: "honolulu-hi",         city: "Honolulu",            st: "HI", county: "Honolulu County", id: "1612340", name: "Honolulu",                 lat: 21.31,  lng: -157.87 },
  { slug: "maui-hi",             city: "Maui (Kahului)",      st: "HI", county: "Maui County", id: "1615680", name: "Kahului, Kahului Harbor",  lat: 20.89,  lng: -156.48 },
  { slug: "hilo-hi",             city: "Hilo",                st: "HI", county: "Hawaii County", id: "1617760", name: "Hilo, Hilo Bay",           lat: 19.73,  lng: -155.06 },
  { slug: "san-juan-pr",         city: "San Juan",            st: "PR", county: "San Juan Municipality", id: "9755371", name: "San Juan, La Puntilla",    lat: 18.46,  lng: -66.12 },
  /* second wave: big-city gaps, famous beaches, and the giant-tide stations */
  { slug: "portsmouth-nh",       city: "Portsmouth",          st: "NH", county: "Rockingham County", id: "8423898", name: "Fort Point",               lat: 43.07,  lng: -70.71 },
  { slug: "new-haven-ct",        city: "New Haven",           st: "CT", county: "New Haven County", id: "8465705", name: "New Haven",                lat: 41.28,  lng: -72.91 },
  { slug: "philadelphia-pa",     city: "Philadelphia",        st: "PA", county: "Philadelphia County", id: "8545240", name: "Philadelphia, Pier 11 North", lat: 39.93, lng: -75.14 },
  { slug: "virginia-beach-va",   city: "Virginia Beach",      st: "VA", county: "Virginia Beach City", id: "8638863", name: "Chesapeake Bay Bridge Tunnel", lat: 36.97, lng: -76.11 },
  { slug: "outer-banks-nc",      city: "Outer Banks",         st: "NC", county: "Dare County", id: "8652587", name: "Oregon Inlet Marina",      lat: 35.80,  lng: -75.55 },
  { slug: "wilmington-nc",       city: "Wilmington",          st: "NC", county: "New Hanover County", id: "8658120", name: "Wilmington",               lat: 34.23,  lng: -77.95 },
  { slug: "st-simons-island-ga", city: "St. Simons Island",   st: "GA", county: "Glynn County", id: "8677344", name: "St. Simons Island",        lat: 31.13,  lng: -81.40 },
  { slug: "fernandina-beach-fl", city: "Fernandina Beach",    st: "FL", county: "Nassau County", id: "8720030", name: "Fernandina Beach",         lat: 30.67,  lng: -81.47 },
  { slug: "st-augustine-fl",     city: "St. Augustine",       st: "FL", county: "St. Johns County", id: "8720587", name: "St. Augustine Beach",      lat: 29.86,  lng: -81.26 },
  { slug: "marathon-fl",         city: "Marathon",            st: "FL", county: "Monroe County", id: "8723970", name: "Vaca Key, Florida Bay",    lat: 24.71,  lng: -81.11 },
  { slug: "fort-myers-fl",       city: "Fort Myers",          st: "FL", county: "Lee County", id: "8725520", name: "Fort Myers",               lat: 26.65,  lng: -81.87 },
  { slug: "clearwater-beach-fl", city: "Clearwater Beach",    st: "FL", county: "Pinellas County", id: "8726724", name: "Clearwater Beach",         lat: 27.98,  lng: -82.83 },
  { slug: "cedar-key-fl",        city: "Cedar Key",           st: "FL", county: "Levy County", id: "8727520", name: "Cedar Key",                lat: 29.14,  lng: -83.03 },
  { slug: "apalachicola-fl",     city: "Apalachicola",        st: "FL", county: "Franklin County", id: "8728690", name: "Apalachicola",             lat: 29.73,  lng: -84.98 },
  { slug: "panama-city-fl",      city: "Panama City",         st: "FL", county: "Bay County", id: "8729108", name: "Panama City",              lat: 30.15,  lng: -85.67 },
  { slug: "mobile-al",           city: "Mobile",              st: "AL", county: "Mobile County", id: "8737048", name: "Mobile State Docks",       lat: 30.71,  lng: -88.04 },
  { slug: "new-orleans-la",      city: "New Orleans",         st: "LA", county: "Orleans Parish", id: "8761927", name: "New Canal Station, Lake Pontchartrain", lat: 30.03, lng: -90.11 },
  { slug: "sabine-pass-tx",      city: "Sabine Pass",         st: "TX", county: "Jefferson County", id: "8770570", name: "Sabine Pass North",        lat: 29.73,  lng: -93.87 },
  { slug: "rockport-tx",         city: "Rockport",            st: "TX", county: "Aransas County", id: "8774770", name: "Rockport",                 lat: 28.02,  lng: -97.05 },
  { slug: "la-jolla-ca",         city: "La Jolla",            st: "CA", county: "San Diego County", id: "9410230", name: "La Jolla, Scripps Pier",   lat: 32.87,  lng: -117.26 },
  { slug: "newport-beach-ca",    city: "Newport Beach",       st: "CA", county: "Orange County", id: "9410580", name: "Newport Bay Entrance",     lat: 33.60,  lng: -117.88 },
  { slug: "port-san-luis-ca",    city: "Port San Luis",       st: "CA", county: "San Luis Obispo County", id: "9412110", name: "Port San Luis",            lat: 35.18,  lng: -120.76 },
  { slug: "point-reyes-ca",      city: "Point Reyes",         st: "CA", county: "Marin County", id: "9415020", name: "Point Reyes",              lat: 38.00,  lng: -122.98 },
  { slug: "mendocino-ca",        city: "Mendocino Coast",     st: "CA", county: "Mendocino County", id: "9416841", name: "Arena Cove",               lat: 38.91,  lng: -123.71 },
  { slug: "port-angeles-wa",     city: "Port Angeles",        st: "WA", county: "Clallam County", id: "9444090", name: "Port Angeles",             lat: 48.13,  lng: -123.44 },
  { slug: "tacoma-wa",           city: "Tacoma",              st: "WA", county: "Pierce County", id: "9446484", name: "Tacoma",                   lat: 47.27,  lng: -122.41 },
  { slug: "ketchikan-ak",        city: "Ketchikan",           st: "AK", county: "Ketchikan Gateway Borough", id: "9450460", name: "Ketchikan",                lat: 55.33,  lng: -131.63 },
  { slug: "skagway-ak",          city: "Skagway",             st: "AK", county: "Skagway Borough", id: "9452400", name: "Skagway, Taiya Inlet",     lat: 59.45,  lng: -135.32 },
  { slug: "valdez-ak",           city: "Valdez",              st: "AK", county: "Chugach Census Area", id: "9454240", name: "Valdez",                   lat: 61.13,  lng: -146.36 },
  { slug: "seward-ak",           city: "Seward",              st: "AK", county: "Kenai Peninsula Borough", id: "9455090", name: "Seward",                   lat: 60.12,  lng: -149.43 },
  { slug: "nikiski-ak",          city: "Nikiski (Cook Inlet)", st: "AK", county: "Kenai Peninsula Borough", id: "9455760", name: "Nikiski",                 lat: 60.68,  lng: -151.40 },
  { slug: "kodiak-ak",           city: "Kodiak",              st: "AK", county: "Kodiak Island Borough", id: "9457292", name: "Kodiak Island",            lat: 57.73,  lng: -152.51 },
  { slug: "guam",                city: "Guam (Apra Harbor)",  st: "GU", county: "Guam", id: "1630000", name: "Apra Harbor",              lat: 13.44,  lng: 144.65 },
  { slug: "pago-pago-as",        city: "Pago Pago",           st: "AS", county: "American Samoa", id: "1770000", name: "Pago Pago",                lat: -14.28, lng: -170.69 },
];

/* full state names + the per-state hub pages (/tides/<state>/), generated
 * only for states with 2+ stations so no page is thin. Shared by
 * build-tides, build-inline and build-sitemap so URLs never drift. */
export const TIDE_STATE_NAMES = { ME: "Maine", NH: "New Hampshire", MA: "Massachusetts", RI: "Rhode Island",
  CT: "Connecticut", NY: "New York", NJ: "New Jersey", PA: "Pennsylvania", DE: "Delaware", MD: "Maryland",
  DC: "Washington, D.C.", VA: "Virginia", NC: "North Carolina", SC: "South Carolina", GA: "Georgia",
  FL: "Florida", AL: "Alabama", MS: "Mississippi", LA: "Louisiana", TX: "Texas", CA: "California",
  OR: "Oregon", WA: "Washington", AK: "Alaska", HI: "Hawaii", PR: "Puerto Rico", GU: "Guam", AS: "American Samoa" };

export function tideStatePages() {
  const byState = {};
  for (const s of TIDE_STATIONS) (byState[s.st] = byState[s.st] || []).push(s);
  return Object.keys(byState)
    .filter((st) => byState[st].length >= 2)
    .map((st) => ({
      st,
      name: TIDE_STATE_NAMES[st] || st,
      slug: (TIDE_STATE_NAMES[st] || st).toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/ +/g, "-"),
      stations: byState[st],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

