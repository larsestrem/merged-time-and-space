/* util.js */
/* util.js — shared helpers: timezone-correct instant math, URL params, hashing. */

(function (global) {
  "use strict";

  /* Offset (ms) between a given IANA timezone and UTC at a specific instant. */
  function tzOffset(tz, date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const p = {};
    dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    const asUTC = Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return asUTC - date.getTime();
  }

  /* Convert a wall-clock time *in tz* to a UTC timestamp (ms).
   * Two-pass to settle DST boundaries. */
  function wallTimeToUTC(y, mo, d, h, mi, tz) {
    const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    let off = tzOffset(tz, new Date(guess));
    let utc = guess - off;
    const off2 = tzOffset(tz, new Date(utc));
    if (off2 !== off) utc = guess - off2;
    return utc;
  }

  /* date "YYYY-MM-DD" + time "HH:MM" + IANA tz -> target Date */
  function targetDate(dateStr, timeStr, tz) {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr || "00:00");
    if (!dm) return null;
    const ms = wallTimeToUTC(+dm[1], +dm[2], +dm[3], tm ? +tm[1] : 0, tm ? +tm[2] : 0, tz || guessTz());
    return new Date(ms);
  }

  function guessTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
    catch (e) { return "UTC"; }
  }

  /* read query string into a plain object */
  function params() {
    const o = {}, q = new URLSearchParams(global.location.search);
    q.forEach(function (v, k) { o[k] = v; });
    return o;
  }

  /* small stable hash for a string -> short base36 id (for the view counter) */
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* compact integers like 1234 -> "1,234" */
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* list of common timezones for the picker (label + IANA id) */
  const TIMEZONES = [
    "Pacific/Honolulu","America/Anchorage","America/Los_Angeles","America/Denver",
    "America/Chicago","America/New_York","America/Sao_Paulo","Atlantic/Reykjavik",
    "Europe/London","Europe/Paris","Europe/Berlin","Europe/Athens","Europe/Moscow",
    "Africa/Cairo","Asia/Dubai","Asia/Karachi","Asia/Kolkata","Asia/Bangkok",
    "Asia/Shanghai","Asia/Tokyo","Australia/Sydney","Pacific/Auckland","UTC"
  ];

  global.AC_UTIL = {
    tzOffset: tzOffset, wallTimeToUTC: wallTimeToUTC, targetDate: targetDate,
    guessTz: guessTz, params: params, hash: hash, commas: commas, TIMEZONES: TIMEZONES
  };
})(window);

/* effects.js */
/* effects.js — lightweight canvas celebration engine.
 * One full-screen canvas, requestAnimationFrame particle loop.
 * Exposes AC_FX.burst(type) for a one-shot and AC_FX.start/stop for ambient. */

(function (global) {
  "use strict";

  let canvas, ctx, particles = [], raf = null, ambient = null, W = 0, H = 0;

  function ensure() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "50"
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    global.addEventListener("resize", resize);
  }

  function resize() {
    const dpr = global.devicePixelRatio || 1;
    W = global.innerWidth; H = global.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  const COLORS = ["#fde047","#f472b6","#38bdf8","#a78bfa","#34d399","#fb923c","#f43f5e"];

  /* particle factories per effect type */
  const make = {
    confetti: function (x, y) {
      return { x, y, vx: rand(-4, 4), vy: rand(-11, -4), g: 0.3, life: rand(80, 140),
        s: rand(5, 10), rot: rand(0, 6.28), vr: rand(-0.2, 0.2), c: COLORS[(Math.random()*COLORS.length)|0], shape: "rect" };
    },
    fireworks: function (x, y) {
      const c = COLORS[(Math.random()*COLORS.length)|0];
      const out = [];
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * 6.28, sp = rand(2, 6);
        out.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, life: rand(40, 70), s: rand(2, 4), c, shape: "dot" });
      }
      return out;
    },
    hearts:   function (x, y) { return { x, y, vx: rand(-1, 1), vy: rand(-3, -1), g: -0.02, life: rand(90, 150), s: rand(12, 22), c: ["#f43f5e","#fb7185","#fda4af"][(Math.random()*3)|0], shape: "heart" }; },
    snow:     function (x, y) { return { x, y, vx: rand(-0.6, 0.6), vy: rand(0.6, 2), g: 0, life: rand(200, 320), s: rand(2, 5), c: "#ffffff", shape: "dot", sway: rand(0, 6.28) }; },
    balloons: function (x, y) { return { x, y, vx: rand(-0.5, 0.5), vy: rand(-2, -0.8), g: 0, life: rand(160, 260), s: rand(14, 24), c: COLORS[(Math.random()*COLORS.length)|0], shape: "balloon", sway: rand(0, 6.28) }; },
    stars:    function (x, y) { return { x, y, vx: rand(-2, 2), vy: rand(-2, 2), g: 0, life: rand(40, 90), s: rand(2, 5), c: ["#fde047","#fff","#fcd34d"][(Math.random()*3)|0], shape: "dot" }; },
    bats:     function (x, y) { return { x, y, vx: rand(-0.8, 0.8), vy: rand(0.8, 2.2), g: 0, life: rand(180, 300), s: rand(10, 18), c: "#1f2937", shape: "bat", sway: rand(0, 6.28) }; },
    leaves:   function (x, y) { return { x, y, vx: rand(-0.8, 0.8), vy: rand(0.8, 2.2), g: 0, life: rand(200, 340), s: rand(8, 14), c: ["#b45309","#d97706","#ea580c","#92400e","#ca8a04"][(Math.random()*5)|0], shape: "leaf", rot: rand(0, 6.28), vr: rand(-0.1, 0.1), sway: rand(0, 6.28) }; }
  };

  function spawn(type, x, y, n) {
    const f = make[type] || make.confetti;
    for (let i = 0; i < n; i++) {
      const r = f(x + rand(-20, 20), y + rand(-20, 20));
      Array.isArray(r) ? particles.push.apply(particles, r) : particles.push(r);
    }
  }

  function draw(p) {
    ctx.save();
    /* cap opacity so celebration particles stay semi-transparent and never
     * overpower the page text behind them */
    ctx.globalAlpha = 0.6 * Math.max(0, Math.min(1, p.life / 40));
    ctx.fillStyle = p.c;
    if (p.shape === "rect") {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
    } else if (p.shape === "heart") {
      ctx.translate(p.x, p.y); const s = p.s / 22;
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 6); ctx.bezierCurveTo(-12, -6, -12, -16, 0, -10);
      ctx.bezierCurveTo(12, -16, 12, -6, 0, 6); ctx.fill();
    } else if (p.shape === "balloon") {
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.7, p.s, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.s); ctx.lineTo(p.x, p.y + p.s + 14); ctx.stroke();
    } else if (p.shape === "bat") {
      ctx.translate(p.x, p.y); const s = p.s / 18; ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-4, -6, -10, -7, -14, -2);
      ctx.bezierCurveTo(-11, -2, -10, 2, -7, 1);
      ctx.bezierCurveTo(-5, 4, -2, 3, 0, 5);
      ctx.bezierCurveTo(2, 3, 5, 4, 7, 1);
      ctx.bezierCurveTo(10, 2, 11, -2, 14, -2);
      ctx.bezierCurveTo(10, -7, 4, -6, 0, 0);
      ctx.fill();
    } else if (p.shape === "leaf") {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); const s = p.s / 14; ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(7, 0, 0, 8);
      ctx.quadraticCurveTo(-7, 0, 0, -8);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life--;
      if (p.sway !== undefined) { p.sway += 0.04; p.x += Math.sin(p.sway) * 0.6; }
      p.vy += p.g; p.x += p.vx; p.y += p.vy;
      if (p.rot !== undefined) p.rot += p.vr;
      if (p.life <= 0 || p.y > H + 40) particles.splice(i, 1); else draw(p);
    }
    if (particles.length || ambient) raf = requestAnimationFrame(tick);
    else { raf = null; ctx.clearRect(0, 0, W, H); }
  }

  function loop() { if (!raf) raf = requestAnimationFrame(tick); }
  /* the pending auto-stop from burst("snow"/"balloons"), so start()/stop() can
     cancel it instead of being overruled by it later */
  let burstStop = 0;

  const API = {
    /* one-shot celebration appropriate to the type */
    burst: function (type) {
      ensure();
      if (type === "fireworks") {
        /* The first shell has to go up NOW. Scheduling it 280 ms out meant
           loop()'s first frame (~16 ms later) found no particles and no ambient
           effect, stopped the rAF loop, and every shell after that piled up
           unrendered until some later effect happened to restart it — at which
           point a few hundred stale fireworks flashed in at once. So: spawn
           immediately, and re-arm the loop after each spawn. */
        spawn("fireworks", rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.5), 1);
        let n = 0;
        const iv = setInterval(function () {
          spawn("fireworks", rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.5), 1);
          loop();
          if (++n > 7) clearInterval(iv);
        }, 280);
      } else if (type === "snow" || type === "balloons") {
        this.start(type);
        /* Keep the id: an un-cancelled auto-stop from an earlier burst used to
           come round nine seconds later and kill an ambient effect that had
           been started since. */
        clearTimeout(burstStop);
        burstStop = setTimeout(this.stop.bind(this), 9000);
      } else {
        spawn(type, W / 2, H * 0.35, type === "confetti" ? 120 : 80);
        spawn(type, W * 0.2, H * 0.4, 40);
        spawn(type, W * 0.8, H * 0.4, 40);
      }
      loop();
    },
    /* ambient continuous emission (for previews / falling snow etc.) */
    start: function (type) {
      ensure();
      this.stop();
      clearTimeout(burstStop); burstStop = 0;   /* a stale burst auto-stop must not kill this */
      ambient = setInterval(function () {
        spawn(type, rand(0, W), type === "snow" ? -10 : H + 10, 2);
      }, 200);
      loop();
    },
    stop: function () { clearTimeout(burstStop); burstStop = 0; if (ambient) { clearInterval(ambient); ambient = null; } }
  };

  global.AC_FX = API;
})(window);
