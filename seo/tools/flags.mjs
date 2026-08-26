/* flags.mjs — compact inline SVG country flags (3:2), used instead of emoji
 * flags so they render identically everywhere (emoji flags degrade to letter
 * codes like "JP" on Windows and some browsers). Simplified but recognizable;
 * each is ~20x14 with a hairline border via the .flag class in style.css.
 * Decorative — the country name always sits beside them, so aria-hidden. */

const wrap = (inner) =>
  `<svg class="flag" viewBox="0 0 24 16" width="20" height="14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

export const FLAGS = {
  "united-states": wrap(
    '<rect width="24" height="16" fill="#b22234"/>' +
    '<g fill="#fff"><rect y="1.23" width="24" height="1.23"/><rect y="3.69" width="24" height="1.23"/><rect y="6.15" width="24" height="1.23"/><rect y="8.62" width="24" height="1.23"/><rect y="11.08" width="24" height="1.23"/><rect y="13.54" width="24" height="1.23"/></g>' +
    '<rect width="9.6" height="8.62" fill="#3c3b6e"/>' +
    '<g fill="#fff"><circle cx="1.8" cy="1.6" r=".45"/><circle cx="4.8" cy="1.6" r=".45"/><circle cx="7.8" cy="1.6" r=".45"/><circle cx="3.3" cy="3.4" r=".45"/><circle cx="6.3" cy="3.4" r=".45"/><circle cx="1.8" cy="5.2" r=".45"/><circle cx="4.8" cy="5.2" r=".45"/><circle cx="7.8" cy="5.2" r=".45"/><circle cx="3.3" cy="7" r=".45"/><circle cx="6.3" cy="7" r=".45"/></g>'),
  "united-kingdom": wrap(
    '<rect width="24" height="16" fill="#012169"/>' +
    '<path d="M0 0L24 16M24 0L0 16" stroke="#fff" stroke-width="3.2"/>' +
    '<path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" stroke-width="1.3"/>' +
    '<path d="M12 0V16M0 8H24" stroke="#fff" stroke-width="5.3"/>' +
    '<path d="M12 0V16M0 8H24" stroke="#c8102e" stroke-width="3.2"/>'),
  "canada": wrap(
    '<rect width="24" height="16" fill="#fff"/>' +
    '<rect width="6" height="16" fill="#d52b1e"/><rect x="18" width="6" height="16" fill="#d52b1e"/>' +
    '<polygon fill="#d52b1e" points="12,4 12.7,6 14.6,5.5 13.6,7.2 15.6,7.7 14.1,8.7 14.7,10.2 12.8,9.7 12,11.8 11.2,9.7 9.3,10.2 9.9,8.7 8.4,7.7 10.4,7.2 9.4,5.5 11.3,6"/>'),
  "mexico": wrap(
    '<rect width="8" height="16" fill="#006847"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ce1126"/>' +
    '<ellipse cx="12" cy="8" rx="1.5" ry="1.1" fill="#7a4a1e"/>'),
  "india": wrap(
    '<rect width="24" height="5.33" fill="#ff9933"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.67" width="24" height="5.33" fill="#138808"/>' +
    '<circle cx="12" cy="8" r="1.8" fill="none" stroke="#000080" stroke-width=".5"/>' +
    '<g stroke="#000080" stroke-width=".25"><path d="M12 6.2V9.8M10.2 8H13.8M10.7 6.7l2.6 2.6M13.3 6.7l-2.6 2.6"/></g>' +
    '<circle cx="12" cy="8" r=".4" fill="#000080"/>'),
  "france": wrap(
    '<rect width="8" height="16" fill="#0055a4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ef4135"/>'),
  "japan": wrap(
    '<rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.2" fill="#bc002d"/>'),
  "australia": wrap(
    '<rect width="24" height="16" fill="#00247d"/>' +
    '<g><rect width="9.6" height="8" fill="#00247d"/>' +
    '<path d="M0 0L9.6 8M9.6 0L0 8" stroke="#fff" stroke-width="1.4"/>' +
    '<path d="M4.8 0V8M0 4H9.6" stroke="#fff" stroke-width="2"/>' +
    '<path d="M4.8 0V8M0 4H9.6" stroke="#c8102e" stroke-width="1"/></g>' +
    '<g fill="#fff"><circle cx="4.8" cy="12.5" r="1.1"/><circle cx="17" cy="4" r=".7"/><circle cx="20.5" cy="6.5" r=".7"/><circle cx="17.5" cy="9.5" r=".7"/><circle cx="21" cy="11" r=".55"/><circle cx="18.7" cy="12.8" r=".5"/></g>'),
};

export const flag = (code) => FLAGS[code] || "";
