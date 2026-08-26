/* cities.mjs — well-known world cities with IANA zone + coordinates.
 * Shared by the world clock (add-a-city picker) and the /sun/ sunrise-sunset
 * pages, so the two lists can never drift. [city, area, tz, lat, lon] */
export const CITY_DB = [
  ["Amsterdam", "Netherlands", "Europe/Amsterdam", 52.37, 4.90], ["Athens", "Greece", "Europe/Athens", 37.98, 23.73],
  ["Atlanta", "USA", "America/New_York", 33.75, -84.39], ["Auckland", "New Zealand", "Pacific/Auckland", -36.85, 174.76],
  ["Austin", "USA", "America/Chicago", 30.27, -97.74], ["Baghdad", "Iraq", "Asia/Baghdad", 33.31, 44.36],
  ["Bangkok", "Thailand", "Asia/Bangkok", 13.76, 100.50], ["Barcelona", "Spain", "Europe/Madrid", 41.39, 2.17],
  ["Beijing", "China", "Asia/Shanghai", 39.90, 116.41], ["Berlin", "Germany", "Europe/Berlin", 52.52, 13.40],
  ["Bogotá", "Colombia", "America/Bogota", 4.71, -74.07], ["Boston", "USA", "America/New_York", 42.36, -71.06],
  ["Brisbane", "Australia", "Australia/Brisbane", -27.47, 153.03], ["Brussels", "Belgium", "Europe/Brussels", 50.85, 4.35],
  ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires", -34.60, -58.38], ["Cairo", "Egypt", "Africa/Cairo", 30.04, 31.24],
  ["Calgary", "Canada", "America/Edmonton", 51.05, -114.07], ["Cape Town", "South Africa", "Africa/Johannesburg", -33.92, 18.42],
  ["Caracas", "Venezuela", "America/Caracas", 10.48, -66.90], ["Casablanca", "Morocco", "Africa/Casablanca", 33.57, -7.59],
  ["Chicago", "USA", "America/Chicago", 41.88, -87.63], ["Copenhagen", "Denmark", "Europe/Copenhagen", 55.68, 12.57],
  ["Dallas", "USA", "America/Chicago", 32.78, -96.80], ["Delhi", "India", "Asia/Kolkata", 28.61, 77.21],
  ["Denver", "USA", "America/Denver", 39.74, -104.99], ["Detroit", "USA", "America/Detroit", 42.33, -83.05],
  ["Dubai", "UAE", "Asia/Dubai", 25.20, 55.27], ["Dublin", "Ireland", "Europe/Dublin", 53.35, -6.26],
  ["Edinburgh", "UK", "Europe/London", 55.95, -3.19], ["Frankfurt", "Germany", "Europe/Berlin", 50.11, 8.68],
  ["Geneva", "Switzerland", "Europe/Zurich", 46.20, 6.14], ["Hanoi", "Vietnam", "Asia/Bangkok", 21.03, 105.85],
  ["Havana", "Cuba", "America/Havana", 23.11, -82.37], ["Helsinki", "Finland", "Europe/Helsinki", 60.17, 24.94],
  ["Ho Chi Minh City", "Vietnam", "Asia/Ho_Chi_Minh", 10.82, 106.63], ["Hong Kong", "China", "Asia/Hong_Kong", 22.32, 114.17],
  ["Honolulu", "USA", "Pacific/Honolulu", 21.31, -157.86], ["Houston", "USA", "America/Chicago", 29.76, -95.37],
  ["Istanbul", "Türkiye", "Europe/Istanbul", 41.01, 28.98], ["Jakarta", "Indonesia", "Asia/Jakarta", -6.21, 106.85],
  ["Jerusalem", "Israel", "Asia/Jerusalem", 31.77, 35.21], ["Johannesburg", "South Africa", "Africa/Johannesburg", -26.20, 28.05],
  ["Karachi", "Pakistan", "Asia/Karachi", 24.86, 67.01], ["Kathmandu", "Nepal", "Asia/Kathmandu", 27.70, 85.32],
  ["Kyiv", "Ukraine", "Europe/Kyiv", 50.45, 30.52], ["Kuala Lumpur", "Malaysia", "Asia/Kuala_Lumpur", 3.14, 101.69],
  ["Lagos", "Nigeria", "Africa/Lagos", 6.52, 3.38], ["Las Vegas", "USA", "America/Los_Angeles", 36.17, -115.14],
  ["Lima", "Peru", "America/Lima", -12.05, -77.04], ["Lisbon", "Portugal", "Europe/Lisbon", 38.72, -9.14],
  ["London", "UK", "Europe/London", 51.51, -0.13], ["Los Angeles", "USA", "America/Los_Angeles", 34.05, -118.24],
  ["Madrid", "Spain", "Europe/Madrid", 40.42, -3.70], ["Manila", "Philippines", "Asia/Manila", 14.60, 120.98],
  ["Melbourne", "Australia", "Australia/Melbourne", -37.81, 144.96], ["Mexico City", "Mexico", "America/Mexico_City", 19.43, -99.13],
  ["Miami", "USA", "America/New_York", 25.76, -80.19], ["Milan", "Italy", "Europe/Rome", 45.46, 9.19],
  ["Minneapolis", "USA", "America/Chicago", 44.98, -93.27], ["Montreal", "Canada", "America/Toronto", 45.50, -73.57],
  ["Moscow", "Russia", "Europe/Moscow", 55.76, 37.62], ["Mumbai", "India", "Asia/Kolkata", 19.08, 72.88],
  ["Nairobi", "Kenya", "Africa/Nairobi", -1.29, 36.82], ["Nashville", "USA", "America/Chicago", 36.16, -86.78],
  ["New Orleans", "USA", "America/Chicago", 29.95, -90.07], ["New York", "USA", "America/New_York", 40.71, -74.01],
  ["Nome", "USA", "America/Nome", 64.50, -165.41],
  ["Osaka", "Japan", "Asia/Tokyo", 34.69, 135.50], ["Oslo", "Norway", "Europe/Oslo", 59.91, 10.75],
  ["Paris", "France", "Europe/Paris", 48.85, 2.35], ["Perth", "Australia", "Australia/Perth", -31.95, 115.86],
  ["Philadelphia", "USA", "America/New_York", 39.95, -75.17], ["Phoenix", "USA", "America/Phoenix", 33.45, -112.07],
  ["Portland", "USA", "America/Los_Angeles", 45.52, -122.68], ["Prague", "Czechia", "Europe/Prague", 50.08, 14.44],
  ["Reykjavík", "Iceland", "Atlantic/Reykjavik", 64.15, -21.94], ["Rio de Janeiro", "Brazil", "America/Sao_Paulo", -22.91, -43.17],
  ["Riyadh", "Saudi Arabia", "Asia/Riyadh", 24.71, 46.68], ["Rome", "Italy", "Europe/Rome", 41.90, 12.50],
  ["Salt Lake City", "USA", "America/Denver", 40.76, -111.89], ["San Diego", "USA", "America/Los_Angeles", 32.72, -117.16],
  ["San Francisco", "USA", "America/Los_Angeles", 37.77, -122.42], ["Santiago", "Chile", "America/Santiago", -33.45, -70.67],
  ["São Paulo", "Brazil", "America/Sao_Paulo", -23.55, -46.63], ["Seattle", "USA", "America/Los_Angeles", 47.61, -122.33],
  ["Seoul", "South Korea", "Asia/Seoul", 37.57, 126.98], ["Shanghai", "China", "Asia/Shanghai", 31.23, 121.47],
  ["Singapore", "Singapore", "Asia/Singapore", 1.35, 103.82], ["Stockholm", "Sweden", "Europe/Stockholm", 59.33, 18.07],
  ["Sydney", "Australia", "Australia/Sydney", -33.87, 151.21], ["Taipei", "Taiwan", "Asia/Taipei", 25.03, 121.57],
  ["Tel Aviv", "Israel", "Asia/Jerusalem", 32.09, 34.78], ["Tokyo", "Japan", "Asia/Tokyo", 35.68, 139.65],
  ["Toronto", "Canada", "America/Toronto", 43.65, -79.38], ["Vancouver", "Canada", "America/Vancouver", 49.28, -123.12],
  ["Vienna", "Austria", "Europe/Vienna", 48.21, 16.37], ["Warsaw", "Poland", "Europe/Warsaw", 52.23, 21.01],
  ["Washington, D.C.", "USA", "America/New_York", 38.91, -77.04], ["Zurich", "Switzerland", "Europe/Zurich", 47.38, 8.54],
  /* iconic sunrise / sunset destinations — popular spots for watching (and
   * photographing) the sun, added for the /sun/ pages; they read fine as
   * world-clock entries too. [city, area, tz, lat, lon] */
  ["Bali", "Indonesia", "Asia/Makassar", -8.41, 115.19], ["Bar Harbor", "USA", "America/New_York", 44.39, -68.20],
  ["Cabo San Lucas", "Mexico", "America/Mazatlan", 22.89, -109.91], ["Cancún", "Mexico", "America/Cancun", 21.16, -86.85],
  ["Cannon Beach", "USA", "America/Los_Angeles", 45.89, -123.96], ["Dubrovnik", "Croatia", "Europe/Zagreb", 42.64, 18.11],
  ["Ibiza", "Spain", "Europe/Madrid", 38.91, 1.43], ["Key West", "USA", "America/New_York", 24.56, -81.78],
  ["Malé", "Maldives", "Indian/Maldives", 4.18, 73.51], ["Malibu", "USA", "America/Los_Angeles", 34.03, -118.69],
  ["Marrakech", "Morocco", "Africa/Casablanca", 31.63, -7.99], ["Nice", "France", "Europe/Paris", 43.70, 7.27],
  ["Papeete", "French Polynesia", "Pacific/Tahiti", -17.54, -149.57], ["Phuket", "Thailand", "Asia/Bangkok", 7.88, 98.39],
  ["Queenstown", "New Zealand", "Pacific/Auckland", -45.03, 168.66], ["Santorini", "Greece", "Europe/Athens", 36.39, 25.46],
  ["Sedona", "USA", "America/Phoenix", 34.87, -111.76], ["Zanzibar", "Tanzania", "Africa/Dar_es_Salaam", -6.16, 39.19],
  /* World-clock tier-1 offset representatives, added so every city with a clock
   * page also has sun and moon pages — the three families now cross-reference
   * a single list rather than three overlapping ones. */
  ["Pago Pago", "American Samoa", "Pacific/Pago_Pago", -14.28, -170.70], ["Anchorage", "USA", "America/Anchorage", 61.22, -149.90],
  ["Halifax", "Canada", "America/Halifax", 44.65, -63.57], ["St. John's", "Canada", "America/St_Johns", 47.56, -52.71],
  ["Azores", "Portugal", "Atlantic/Azores", 37.74, -25.67], ["Tehran", "Iran", "Asia/Tehran", 35.69, 51.39],
  ["Kabul", "Afghanistan", "Asia/Kabul", 34.53, 69.17], ["Dhaka", "Bangladesh", "Asia/Dhaka", 23.81, 90.41],
  ["Adelaide", "Australia", "Australia/Adelaide", -34.93, 138.60], ["Nouméa", "New Caledonia", "Pacific/Noumea", -22.28, 166.46],
  ["Apia", "Samoa", "Pacific/Apia", -13.83, -171.77],
];

/* URL slug for a city name: diacritics stripped, punctuation collapsed
 * ("São Paulo" -> sao-paulo, "Washington, D.C." -> washington-dc). */
export const citySlug = (name) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
