// Acqua Rinova Group: hero droplet wave.
// A field of connected dots rolls like a slow digital wave, with glossy
// droplets floating above it. The wave lifts gently towards the mouse.
// Draws one still frame for visitors who prefer reduced motion, and pauses
// when the hero is off screen or the tab is hidden.
(function () {
  "use strict";

  var canvas = document.querySelector(".hero-wave");
  if (!canvas || !canvas.getContext) return;
  var hero = canvas.parentElement;
  var ctx = canvas.getContext("2d");

  // Brand palette (from the logo and document header)
  var DEEP = [8, 86, 140];     // #08568C
  var TEAL = [14, 111, 136];   // #0E6F88
  var AQUA = [38, 170, 185];   // #26AAB9

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var W = 0, H = 0, dpr = 1, cols = 0, rows = 0, mobile = false;
  var running = false, visible = true, rafId = 0, start = 0;
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, px: 0.5, py: 0.5, tpx: 0.5, tpy: 0.5 };
  var drops = [];

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function makeDrops() {
    // x, y as fractions of the hero; size in px; depth drives parallax
    var set = mobile
      ? [[0.80, 0.16, 15, 0.9], [0.92, 0.30, 9, 0.5], [0.66, 0.08, 7, 0.4]]
      : [[0.62, 0.20, 24, 1.0], [0.74, 0.40, 14, 0.6], [0.86, 0.16, 18, 0.8],
         [0.93, 0.46, 10, 0.4], [0.55, 0.50, 9, 0.35], [0.79, 0.07, 8, 0.3],
         [0.98, 0.28, 12, 0.5]];
    drops = set.map(function (d, i) {
      return { x: d[0], y: d[1], r: d[2], depth: d[3], phase: i * 1.7 };
    });
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mobile = W < 760;
    cols = mobile ? 22 : Math.min(56, Math.round(W / 26));
    rows = mobile ? 12 : 18;
    makeDrops();
    if (!running) draw(reduceMotion.matches ? 4 : (performance.now() - start) / 1000);
  }

  // Screen position of a wave point, with the mouse lift applied
  function point(c, r, t) {
    var depth = r / (rows - 1);                    // 0 = far, 1 = near
    var s = 0.35 + 0.85 * Math.pow(depth, 1.2);    // perspective scale
    var top = mobile ? 0.72 : 0.46;
    var baseY = H * (top + (1.02 - top) * Math.pow(depth, 1.35));
    var u = c / (cols - 1) - 0.5;
    var x = W * 0.5 + u * W * (0.9 + 1.1 * s);
    var amp = H * (mobile ? 0.035 : 0.05) * s;
    var y = baseY
      + Math.sin(c * 0.32 + t * 0.55 + r * 0.22) * amp
      + Math.sin(c * 0.11 - t * 0.35 + r * 0.47) * amp * 0.9;
    // Gentle lift towards the mouse
    var dx = x - mouse.x, dy = y - mouse.y;
    var reach = mobile ? 90 : 170;
    var pull = Math.exp(-(dx * dx + dy * dy) / (2 * reach * reach));
    y -= pull * 26 * s;
    return { x: x, y: y, s: s, d: depth, glow: pull };
  }

  function drawWave(t) {
    var grid = [], c, r;
    for (r = 0; r < rows; r++) {
      grid[r] = [];
      for (c = 0; c < cols; c++) grid[r][c] = point(c, r, t);
    }
    ctx.lineWidth = 1;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var p = grid[r][c];
        var col = mix(DEEP, AQUA, p.d);
        var a = 0.08 + 0.22 * p.d + p.glow * 0.25;
        ctx.strokeStyle = rgba(col, a);
        ctx.beginPath();
        if (c < cols - 1) { ctx.moveTo(p.x, p.y); ctx.lineTo(grid[r][c + 1].x, grid[r][c + 1].y); }
        if (r < rows - 1) { ctx.moveTo(p.x, p.y); ctx.lineTo(grid[r + 1][c].x, grid[r + 1][c].y); }
        // The occasional diagonal gives the "connected data" look
        if (r < rows - 1 && c < cols - 1 && (c + r * 3) % 5 === 0) {
          ctx.moveTo(p.x, p.y); ctx.lineTo(grid[r + 1][c + 1].x, grid[r + 1][c + 1].y);
        }
        ctx.stroke();
      }
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var q = grid[r][c];
        var dot = mix(TEAL, AQUA, q.d);
        ctx.fillStyle = rgba(dot, 0.35 + 0.55 * q.d + q.glow * 0.3);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 0.8 + 1.9 * q.s + q.glow * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // A glossy teardrop in the style of the logo: clear glass above,
  // teal water below, with a curved waterline and a highlight.
  function dropPath(r) {
    ctx.beginPath();
    ctx.moveTo(0, -1.75 * r);
    ctx.bezierCurveTo(0.3 * r, -1.15 * r, r, -0.55 * r, r, 0);
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.bezierCurveTo(-r, -0.55 * r, -0.3 * r, -1.15 * r, 0, -1.75 * r);
    ctx.closePath();
  }

  function teardrop(x, y, r, tilt, t, phase) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    dropPath(r);
    ctx.shadowColor = "rgba(8, 86, 140, 0.25)";
    ctx.shadowBlur = r * 0.9;
    ctx.shadowOffsetY = r * 0.35;
    var glass = ctx.createLinearGradient(0, -1.75 * r, 0, r);
    glass.addColorStop(0, "rgb(236,248,251)");
    glass.addColorStop(0.5, "rgb(196,233,242)");
    glass.addColorStop(1, "rgb(150,212,228)");
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Water inside the drop, with a softly moving waterline
    ctx.save();
    dropPath(r);
    ctx.clip();
    var lvl = -0.15 * r, wob = Math.sin(t * 1.4 + phase) * 0.12 * r;
    ctx.beginPath();
    ctx.moveTo(-1.2 * r, lvl + wob);
    ctx.bezierCurveTo(-0.4 * r, lvl - 0.45 * r - wob, 0.4 * r, lvl + 0.35 * r + wob, 1.2 * r, lvl - 0.2 * r);
    ctx.lineTo(1.2 * r, 1.2 * r);
    ctx.lineTo(-1.2 * r, 1.2 * r);
    ctx.closePath();
    var water = ctx.createLinearGradient(0, lvl - 0.4 * r, 0, r);
    water.addColorStop(0, "rgb(38,170,185)");
    water.addColorStop(0.6, "rgb(14,111,136)");
    water.addColorStop(1, "rgb(8,86,140)");
    ctx.fillStyle = water;
    ctx.fill();
    ctx.restore();

    // Rim and highlight
    dropPath(r);
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = "rgba(14,111,136,0.7)";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-0.42 * r, -0.55 * r, 0.16 * r, 0.42 * r, 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
    ctx.restore();
  }

  function drawDrops(t) {
    drops.forEach(function (d) {
      var px = (mouse.px - 0.5) * 26 * d.depth;
      var py = (mouse.py - 0.5) * 16 * d.depth;
      var x = d.x * W + Math.sin(t * 0.25 + d.phase) * 14 + px;
      var y = d.y * H + Math.sin(t * 0.6 + d.phase) * 11 + py;
      var tilt = Math.sin(t * 0.45 + d.phase) * 0.09;
      teardrop(x, y, d.r * 1.3, tilt, t, d.phase);
    });
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    drawWave(t);
    drawDrops(t);
  }

  function frame(now) {
    if (!running) return;
    // Ease the mouse so the response feels soft, not twitchy
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.px += (mouse.tpx - mouse.px) * 0.05;
    mouse.py += (mouse.tpy - mouse.py) * 0.05;
    var still = reduceMotion.matches;
    draw(still ? 4 : (now - start) / 1000);
    // Under reduced motion the wave only moves in answer to the mouse,
    // so stop drawing once the mouse has settled.
    if (still && Math.abs(mouse.tx - mouse.x) < 0.5 && Math.abs(mouse.ty - mouse.y) < 0.5 &&
        Math.abs(mouse.tpx - mouse.px) < 0.001 && Math.abs(mouse.tpy - mouse.py) < 0.001) {
      running = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function play(fromMouse) {
    if (running || !visible || document.hidden) return;
    if (reduceMotion.matches && !fromMouse) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var rect = hero.getBoundingClientRect();
    mouse.tx = e.clientX - rect.left;
    mouse.ty = e.clientY - rect.top;
    mouse.tpx = mouse.tx / rect.width;
    mouse.tpy = mouse.ty / rect.height;
    if (mouse.x < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    play(true);
  });
  hero.addEventListener("pointerleave", function () {
    mouse.tx = -9999; mouse.ty = -9999; mouse.tpx = 0.5; mouse.tpy = 0.5;
    mouse.x = -9999; mouse.y = -9999;
    play(true);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? play() : pause();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () {
    document.hidden ? pause() : play();
  });
  var onMotionChange = function () {
    if (reduceMotion.matches) { pause(); draw(4); } else { play(); }
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", onMotionChange);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  start = performance.now();
  resize();
  if (reduceMotion.matches) draw(4); else play();
  canvas.classList.add("is-ready");
})();
