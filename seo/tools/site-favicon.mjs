/* The site-wide Earth mark: reuse the simulator's coastlines in an orthographic
 * Americas view. Flat contrasting fills survive tiny browser-tab sizes. */
import { createHash } from 'node:crypto';
import { COAST } from './globe.mjs';

const R = 31.5, radians = Math.PI / 180, latitude = 10 * radians;
const land = [2, 3, 19, 20].map(index => COAST[index].map(([lon, lat], i) => {
  const phi = lat * radians, lambda = (lon + 95) * radians;
  const x = 32 + R * Math.cos(phi) * Math.sin(lambda);
  const y = 32 - R * (Math.cos(latitude) * Math.sin(phi)
    - Math.sin(latitude) * Math.cos(phi) * Math.cos(lambda));
  return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
}).join('') + 'Z').join('');

export const SITE_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31.5" fill="#0754c9" stroke="#f1fcff" stroke-width=".5"/><path d="${land}" fill="#c0f578"/></svg>`;
export const FAVICON_HASH = createHash('sha256').update(SITE_FAVICON_SVG).digest('hex').slice(0, 10);
export const FAVICON_SVG_HREF = `/assets/favicon/earth.${FAVICON_HASH}.svg`;
export const FAVICON_PNG_HREF = `/assets/favicon/earth.${FAVICON_HASH}.png`;
