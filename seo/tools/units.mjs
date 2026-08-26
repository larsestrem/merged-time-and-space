/* units.mjs — one measurement, two systems, chosen once for the whole site.
 *
 * THE PROBLEM. Nearly every figure on the space pages is metric — a planet
 * 139,820 km across, a moon 384,400 km away, a rocket at 11.2 km/s — while the
 * place pages measure the next town in MILES. Most of the site's readers are in
 * a country that does not use kilometres for anything, and the ones who do use
 * them were being shown miles on the pages about their own town. Both halves
 * were wrong for somebody.
 *
 * HOW IT WORKS. A figure is emitted ONCE, in metric, wrapped in a span that
 * carries the raw value and its unit:
 *
 *     <span data-u="km" data-v="384400">384,400 km</span>
 *
 * A small script in the nav rewrites every one of those on load if the reader's
 * system is imperial, and again the moment they change it. So:
 *
 *   - the HTML a crawler or a no-JS visitor gets is complete and correct, in
 *     the system this site's subject matter is actually written in;
 *   - there is no second copy of any number to drift, and no round trip;
 *   - the choice is one line in localStorage, shared by all 4,000 pages.
 *
 * WHAT DECIDES THE DEFAULT. The browser's own locale, not an IP lookup: the
 * language a reader has set is a statement about how they want to be addressed,
 * an edge location is a guess about where their traffic exits, and one of those
 * is free. Three countries use imperial measure for everyday distance — the
 * United States, Liberia and Myanmar — and en-GB is deliberately NOT among them
 * here: British road signs are in miles but British science is metric, and this
 * is a science site. Anyone the default gets wrong changes it in two clicks and
 * is never asked again.
 *
 * ROUNDING IS NOT A FORMATTING DETAIL. 139,820 km converts to 86,881 miles, and
 * a figure quoted to five significant figures in one system must not become
 * eleven in the other. `sig` carries the source's precision so the converted
 * number is rounded the same way, which is why the raw value AND the rounding
 * live in the span rather than only the text.
 * ------------------------------------------------------------------------- */

/* the three countries whose everyday distances are imperial */
export const IMPERIAL_REGIONS = ["US", "LR", "MM"];

/* ---------------------------------------------------------------------------
 * The client. Injected once per page by build-inline, alongside the nav that
 * holds the control.
 * ------------------------------------------------------------------------- */
export const UNITS_JS = `(function(){
  var KEY='ac_units';
  var IMP=${JSON.stringify(IMPERIAL_REGIONS)};
  /* WHAT THE READER HAS CHOSEN, or what their locale implies. A stored value
     always wins: it is an explicit answer to the question the guess is making. */
  function guess(){
    try{
      var ls=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']);
      for(var i=0;i<ls.length;i++){
        var m=/-([A-Za-z]{2})\\b/.exec(ls[i]||'');
        if(m){ var r=m[1].toUpperCase();
          /* the first tag that names a country decides it — a reader with
             en-US then en-GB is being told they are in the US */
          for(var j=0;j<IMP.length;j++) if(IMP[j]===r) return 'imperial';
          return 'metric';
        }
      }
      /* no region anywhere in the list: fall back to the time zone, which is
         the other thing every browser knows about where it is */
      var tz=(Intl.DateTimeFormat().resolvedOptions()||{}).timeZone||'';
      if(/^America\\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Indiana|Kentucky|Boise|Juneau|Nome|Adak|Menominee|North_Dakota|Sitka|Yakutat)/.test(tz)
         || tz==='Pacific/Honolulu' || tz==='America/Monrovia' || tz==='Asia/Yangon') return 'imperial';
    }catch(e){}
    return 'metric';
  }
  function get(){
    var v=null; try{ v=localStorage.getItem(KEY); }catch(e){}
    return (v==='imperial'||v==='metric')?v:guess();
  }
  function set(v){
    try{ localStorage.setItem(KEY,v); }catch(e){}
    apply(v); mark(v);
    /* pages that draw their own figures listen for this — the simulators, the
       tide chart, the nearby-city dropdown. Fired AFTER the spans are done, so
       a listener sees a consistent page. */
    try{ document.dispatchEvent(new Event('ac:units')); }catch(e){}
  }
  window.acUnits=get;

  /* ---- the conversions -------------------------------------------------
     Each entry: the imperial unit's name, how many of it there are in one
     metric unit, and how to write it. Nothing here is approximate — these are
     the defining ratios, so a converted figure is exact before it is rounded. */
  var C={
    km:   { u:'miles', f:0.621371192237334, one:'mile' },
    m:    { u:'ft',    f:3.280839895013123 },
    cm:   { u:'in',    f:0.393700787401575 },
    mm:   { u:'in',    f:0.0393700787401575 },
    'km/h':{ u:'mph',  f:0.621371192237334 },
    'km/s':{ u:'mi/s', f:0.621371192237334 },
    kg:   { u:'lb',    f:2.204622621848776 },
    C:    { u:'\\u00b0F', f:1.8, off:32, pre:'' }
  };
  /* Round the converted value to the same PRECISION the source was written
     with: sig is the number of significant figures the page chose, or a
     negative number meaning "this many decimal places". */
  function round(v,sig){
    if(sig==null) return v;
    if(sig<0){ var d=-sig; return +v.toFixed(d); }
    if(v===0) return 0;
    var mag=Math.floor(Math.log(Math.abs(v))/Math.LN10)+1;
    var p=Math.max(0,sig-mag);
    return +v.toFixed(p);
  }
  function fmt(v){
    var d=0, a=Math.abs(v);
    if(a<10) d=(a<1?3:2); else if(a<100) d=1;
    var s=v.toFixed(d);
    if(d) s=s.replace(/\\.?0+$/,'');
    return (+s).toLocaleString('en-US',{maximumFractionDigits:d});
  }
  function apply(sys){
    var ns=document.querySelectorAll('[data-u]'), i;
    for(i=0;i<ns.length;i++){
      var el=ns[i], u=el.getAttribute('data-u'), c=C[u];
      var raw=parseFloat(el.getAttribute('data-v'));
      if(!c||isNaN(raw)) continue;
      /* the metric text is what the page shipped with — kept verbatim, so
         switching back is exact rather than re-formatted */
      if(el.getAttribute('data-m')==null) el.setAttribute('data-m',el.textContent);
      if(sys!=='imperial'){ el.textContent=el.getAttribute('data-m'); continue; }
      var sig=el.getAttribute('data-s'); sig=(sig==null||sig==='')?null:+sig;
      var v=round(raw*c.f+(c.off||0),sig);
      var unit=(c.one&&Math.abs(v)===1)?c.one:c.u;
      el.textContent=fmt(v)+(u==='C'?'':' ')+unit;
    }
  }
  /* the control in the menu */
  function mark(sys){
    var bs=document.querySelectorAll('[data-uset]'), i;
    for(i=0;i<bs.length;i++)
      bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-uset')===sys?'true':'false');
  }
  var bs=document.querySelectorAll('[data-uset]');
  for(var i=0;i<bs.length;i++) bs[i].addEventListener('click',function(){ set(this.getAttribute('data-uset')); });
  /* ---- FOR FIGURES THE PAGE DRAWS ITSELF ---------------------------------
     A span works for anything baked into the HTML. It cannot work for a number
     a script writes every frame — the orbital simulator's speed read-out, a
     tide height fetched from NOAA, an <option> in a dropdown (which can hold
     no markup at all). Those call this instead: give it a metric value, its
     unit and the precision, and it returns the string in the reader's system.
     One conversion table, one rounding rule, both halves of the site. */
  /* written to the SAME number of decimals the caller asked for, in either
     system: a tide height is quoted to a tenth whether it is feet or metres,
     and fmt()'s own rules would print 0.85 m against 2.8 ft. */
  function fmtAs(v,sig){
    if(sig!=null&&sig<0) return (+v).toLocaleString('en-US',{minimumFractionDigits:-sig,maximumFractionDigits:-sig});
    return fmt(v);
  }
  window.acFmt=function(v,unit,sig){
    var c=C[unit];
    if(!c||v==null||isNaN(v)) return '';
    if(get()!=='imperial') return fmtAs(round(v,sig),sig)+(unit==='C'?' \u00b0C':' '+unit);
    var iv=round(v*c.f+(c.off||0),sig);
    return fmtAs(iv,sig)+(unit==='C'?'':' ')+((c.one&&Math.abs(iv)===1)?c.one:c.u);
  };
  /* the inverse, for data that arrives IMPERIAL: NOAA publishes tide heights in
     feet, so the page holds feet and asks for the reader's version of them. */
  window.acFromFt=function(ft,sig){ return window.acFmt(ft/3.280839895013123,'m',sig==null?-1:sig); };
  window.acUnitFt=function(){ return get()==='imperial'?'ft':'m'; };
  window.acFtVal=function(ft){ return get()==='imperial'?ft:ft/3.280839895013123; };
  var now=get(); mark(now); if(now==='imperial') apply(now);
  /* pages that draw figures after load (the sun and moon cards repaint every
     minute, the simulators every frame) tell us to run again */
  document.addEventListener('ac:units',function(){ apply(get()); });
})();`;

/* ---------------------------------------------------------------------------
 * The build side: one function per shape of figure.
 *
 * `sig` is how precisely the page wrote the metric number — significant figures
 * as a positive number, decimal places as a negative one — so the imperial
 * version can be rounded to match instead of inventing precision.
 * ------------------------------------------------------------------------- */
const nf = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/** A measurement, in the unit the page is written in, ready to be converted. */
export function u(value, unit, text, sig = null) {
  return `<span data-u="${unit}" data-v="${value}"${sig == null ? "" : ` data-s="${sig}"`}>${text}</span>`;
}
/** kilometres, written with `d` decimal places */
export const km = (v, d = 0) => u(v, "km", `${nf(v, d)} km`, -d);
/** kilometres, written to `s` significant figures (the usual case for space) */
export const kmSig = (v, s = 4) => u(v, "km", `${nf(v, 0)} km`, s);
/** metres / millimetres / centimetres */
export const metres = (v, d = 0) => u(v, "m", `${nf(v, d)} m`, -d);
export const mm = (v, d = 1) => u(v, "mm", `${nf(v, d)} mm`, -d);
export const cm = (v, d = 0) => u(v, "cm", `${nf(v, d)} cm`, -d);
/** speeds */
export const kmPerS = (v, d = 2) => u(v, "km/s", `${nf(v, d)} km/s`, -d);
export const kmPerH = (v, d = 0) => u(v, "km/h", `${nf(v, d)} km/h`, -d);
/** MILES first — the place pages measure the next town, and a metric reader
 *  wants that in km. Written imperial and converted the other way, so the
 *  span's raw value is still the metric one. */
export const miles = (v, d = 0) => {
  const kmv = v / 0.621371192237334;
  return u(+kmv.toFixed(3), "km", `${nf(v, d)} mi`, -d);
};

/* ---------------------------------------------------------------------------
 * The control that lives in the nav, above Projector mode.
 * ------------------------------------------------------------------------- */
export const UNITS_MENU_ITEM = (ico) =>
  `<li class="menu-units"><span class="menu-ulab">${ico("ruler")} <span>Units</span></span>`
  + `<span class="menu-useg" role="group" aria-label="Measurement units">`
  + `<button type="button" class="menu-ubtn" data-uset="metric" aria-pressed="false">Metric</button>`
  + `<button type="button" class="menu-ubtn" data-uset="imperial" aria-pressed="false">Imperial</button>`
  + `</span></li>`;

/* ---------------------------------------------------------------------------
 * TEMPERATURES IN PROSE.
 *
 * The planet pages carry their temperatures as sentences — "−110 °C at the
 * cloud tops", "about 465 °C everywhere" — because that is what they are: a
 * fact with a caveat attached, not a number in a cell. The figure inside them
 * is still worth converting, so this wraps every "<number> °C" it finds and
 * leaves the rest of the sentence alone.
 *
 * It takes text that is ALREADY ESCAPED and returns HTML, because the escape
 * has to happen before the spans go in. Both minus signs are matched: the data
 * uses a real U+2212, and a hyphen would otherwise slip past.
 * ------------------------------------------------------------------------- */
export function temps(escaped) {
  return String(escaped).replace(/(−|-)?(\d[\d,]*(?:\.\d+)?)\s?°C/g, (m, sign, digits) => {
    const v = (sign ? -1 : 1) * Number(digits.replace(/,/g, ""));
    if (!Number.isFinite(v)) return m;
    /* decimal places as written, so −229 stays whole and 36.6 keeps its tenth */
    const dp = (digits.split(".")[1] || "").length;
    return u(v, "C", m, -dp);
  });
}
