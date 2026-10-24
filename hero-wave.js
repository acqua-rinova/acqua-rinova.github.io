// Acqua Rinova Group: hero droplet wave.
// A field of connected dots rolls like a slow digital wave, with glossy
// droplets floating above it. The wave lifts gently towards the mouse.
// Hover over a droplet (or tap it) and it falls into the wave, splashes and
// sends ripples across the mesh, then a new droplet forms in its place.
// Visitors who prefer reduced motion see a still wave that still answers
// the mouse and the droplets. Drawing pauses when the hero is off screen.
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
  var WATER_LIGHT = [214, 242, 248];  // crest highlight
  var WATER_MID = [150, 214, 230];    // light blue water
  var WATER_DEEP = [92, 178, 204];    // trough

  // Tuning
  var DROP_SCALE = 1.04;       // droplet size (was 1.3, now 20% smaller)
  var MOUSE_LIFT = 31;         // how far the wave rises to the mouse (20% more than before)
  var GRAVITY = 1500;          // px/s² for a falling droplet
  var RESPAWN_AFTER = 3.2;     // seconds before a new droplet forms
  var STILL_TIME = 4;          // wave pose used under reduced motion
  var MOUSE_FOLLOW = 0.2;      // how quickly the wave follows the mouse (was 0.08)
  var WAKE = true;             // small ripples trail behind a moving mouse

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var W = 0, H = 0, dpr = 1, cols = 0, rows = 0, mobile = false;
  var running = false, visible = true, rafId = 0, start = performance.now();
  var clock = 0, lastNow = 0;  // real seconds, used for drops and ripples
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, px: 0.5, py: 0.5, tpx: 0.5, tpy: 0.5 };
  var drops = [], ripples = [], splashes = [], grid = [];

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function easeOutBack(x) { var c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

  function makeDrops() {
    // x, y as fractions of the hero; size in px; depth drives parallax
    var set = mobile
      ? [[0.80, 0.16, 15, 0.9], [0.92, 0.30, 9, 0.5], [0.66, 0.08, 7, 0.4]]
      : [[0.62, 0.20, 24, 1.0], [0.74, 0.40, 14, 0.6], [0.86, 0.16, 18, 0.8],
         [0.93, 0.46, 10, 0.4], [0.55, 0.50, 9, 0.35], [0.79, 0.07, 8, 0.3],
         [0.98, 0.28, 12, 0.5]];
    drops = set.map(function (d, i) {
      return { x: d[0], y: d[1], r: d[2] * DROP_SCALE, depth: d[3], phase: i * 1.7,
               state: "float", sx: 0, sy: 0, fy: 0, vy: 0, t0: 0 };
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
    ripples = []; splashes = [];
    if (!running) draw(waveTime());
  }

  function waveTime() {
    return reduceMotion.matches ? STILL_TIME : (performance.now() - start) / 1000;
  }

  // Ripple height at a grid point: rings spreading out from where a drop landed
  function rippleAt(c, r) {
    var h = 0, glow = 0;
    for (var i = 0; i < ripples.length; i++) {
      var rp = ripples[i];
      var age = clock - rp.t0;
      var dist = Math.sqrt((c - rp.c) * (c - rp.c) + (r - rp.r) * (r - rp.r) * 2.2);
      var front = age * 7.5;                         // how far the rings have travelled
      if (dist > front + 1) continue;
      var edge = Math.min(1, (front + 1 - dist));    // soft leading edge
      var fade = Math.exp(-age * rp.decay) * Math.exp(-dist * 0.08);
      var wave = Math.sin(dist * 1.35 - age * 9.5);
      h += wave * rp.amp * fade * edge;
      glow += Math.max(0, wave) * fade * edge * 1.1;
    }
    return { h: h, glow: Math.min(glow, 1) };
  }

  // Screen position of a wave point, with mouse lift and ripples applied
  function point(c, r, t) {
    var depth = r / (rows - 1);                    // 0 = far, 1 = near
    var s = 0.35 + 0.85 * Math.pow(depth, 1.2);    // perspective scale
    var top = mobile ? 0.72 : 0.46;
    var baseY = H * (top + (1.12 - top) * Math.pow(depth, 1.35));
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
    y -= pull * MOUSE_LIFT * s;
    // Ripples from fallen drops
    var rip = ripples.length ? rippleAt(c, r) : { h: 0, glow: 0 };
    y -= rip.h * s;
    return { x: x, y: y, s: s, d: depth, glow: Math.min(1, pull + rip.glow) };
  }

  function buildGrid(t) {
    for (var r = 0; r < rows; r++) {
      grid[r] = grid[r] || [];
      for (var c = 0; c < cols; c++) grid[r][c] = point(c, r, t);
    }
    grid.length = rows;
  }

  // Translucent light-blue water surface between the mesh lines. Each cell
  // is shaded by its slope, so crests catch the light and troughs deepen.
  function drawWater() {
    for (var r = 0; r < rows - 1; r++) {
      for (var c = 0; c < cols - 1; c++) {
        var a = grid[r][c], b = grid[r][c + 1], e = grid[r + 1][c + 1], f = grid[r + 1][c];
        var depth = (a.d + f.d) / 2;
        var cell = Math.max(4, f.y - a.y);
        var slope = ((b.y - a.y) + (e.y - f.y)) / (2 * cell);      // side-to-side tilt
        var rise = ((f.y - a.y) - (e.y - b.y)) / (2 * cell);         // towards or away from us
        var light = Math.max(-1, Math.min(1, slope * 1.6 + rise * 1.2));
        var col = light > 0 ? mix(WATER_MID, WATER_LIGHT, light) : mix(WATER_MID, WATER_DEEP, -light);
        var glow = (a.glow + b.glow + e.glow + f.glow) / 4;
        var alpha = 0.10 + 0.24 * depth + glow * 0.18;
        ctx.fillStyle = rgba(glow > 0.05 ? mix(col, WATER_LIGHT, Math.min(1, glow)) : col, alpha);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(e.x, e.y); ctx.lineTo(f.x, f.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawWave() {
    var c, r;
    drawWater();
    ctx.lineWidth = 1;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var p = grid[r][c];
        var col = mix(DEEP, AQUA, p.d);
        var a = 0.08 + 0.22 * p.d + p.glow * 0.3;
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
        ctx.fillStyle = rgba(dot, Math.min(1, 0.35 + 0.55 * q.d + q.glow * 0.35));
        ctx.beginPath();
        ctx.arc(q.x, q.y, 0.8 + 1.9 * q.s + q.glow * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function dropPath(r) {
    ctx.beginPath();
    ctx.moveTo(0, -1.75 * r);
    ctx.bezierCurveTo(0.3 * r, -1.15 * r, r, -0.55 * r, r, 0);
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.bezierCurveTo(-r, -0.55 * r, -0.3 * r, -1.15 * r, 0, -1.75 * r);
    ctx.closePath();
  }

  // A glossy teardrop in the style of the logo: clear glass above,
  // teal water below, with a curved waterline and a highlight.
  function teardrop(x, y, r, tilt, phase, sx, sy, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(sx, sy);

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
    var lvl = -0.15 * r, wob = Math.sin(clock * 1.4 + phase) * 0.12 * r;
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

  // Where a falling drop meets the wave: a row set by the drop's depth,
  // at the column nearest the drop
  function landingPoint(d, x) {
    var r = Math.round((rows - 1) * (0.2 + 0.55 * d.depth));
    var row = grid[r], best = 0, bestDx = Infinity;
    for (var c = 0; c < cols; c++) {
      var dx = Math.abs(row[c].x - x);
      if (dx < bestDx) { bestDx = dx; best = c; }
    }
    return { c: best, r: r, y: row[best].y, s: row[best].s };
  }

  function addRipple(c, r, amp, decay) {
    ripples.push({ c: c, r: r, t0: clock, amp: amp, decay: decay });
    if (ripples.length > 16) ripples.shift();
  }

  // Wake: as the mouse moves across the water it leaves small ripples,
  // stronger when it moves faster
  var lastWake = { x: 0, y: 0, t: 0 };
  function wake(x, y) {
    if (!WAKE || !grid.length) return;
    var dx = x - lastWake.x, dy = y - lastWake.y;
    var moved = Math.sqrt(dx * dx + dy * dy);
    if (moved < 38 || clock - lastWake.t < 0.09) return;
    var speed = moved / Math.max(0.016, clock - lastWake.t);
    lastWake = { x: x, y: y, t: clock };
    var best = null, bestD = Infinity;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var p = grid[r][c];
        var d2 = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (d2 < bestD) { bestD = d2; best = { c: c, r: r }; }
      }
    }
    // Only when the mouse is actually over the water
    if (!best || bestD > 60 * 60) return;
    addRipple(best.c, best.r, Math.min(22, 6 + speed / 120), 1.6);
  }

  function knock(d) {
    if (d.state !== "float") return;
    d.state = "fall";
    d.fy = d.sy;
    d.vy = -40;          // a tiny hop before it falls
    d.t0 = clock;
    play(true);
  }

  function splash(d, land) {
    var size = d.r / 20;
    addRipple(land.c, land.r, 34 * size + 14, 0.85);
    var n = mobile ? 5 : 7;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.1 + (Math.random() - 0.5) * 0.3;
      var sp = (160 + Math.random() * 170) * (0.6 + 0.5 * size);
      splashes.push({
        x: d.sx, y: land.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: (1.8 + Math.random() * 2) * (0.75 + 0.5 * size), t0: clock, life: 0.7 + Math.random() * 0.3
      });
    }
    // A ring on the surface, flattened to sit in the wave's perspective
    splashes.push({ ring: true, x: d.sx, y: land.y, s: land.s, t0: clock, life: 1.1, size: size });
    d.state = "gone";
    d.t0 = clock;
  }

  function drawSplashes(dt) {
    for (var i = splashes.length - 1; i >= 0; i--) {
      var p = splashes[i], age = clock - p.t0;
      if (age > p.life) { splashes.splice(i, 1); continue; }
      var k = 1 - age / p.life;
      if (p.ring) {
        for (var j = 0; j < 2; j++) {
          var ra = age - j * 0.18;
          if (ra <= 0) continue;
          var rx = (6 + ra * 150 * (0.7 + p.size * 0.5)) * p.s;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rx, rx * 0.28, 0, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(TEAL, 0.6 * k * (j ? 0.6 : 1));
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        continue;
      }
      p.vy += GRAVITY * 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(mix(AQUA, TEAL, 1 - k), Math.min(1, 1.3 * k));
      ctx.fill();
    }
  }

  function drawDrops(t, dt) {
    drops.forEach(function (d) {
      if (d.state === "gone") {
        if (clock - d.t0 > RESPAWN_AFTER) { d.state = "spawn"; d.t0 = clock; }
        else return;
      }
      var px = (mouse.px - 0.5) * 26 * d.depth;
      var py = (mouse.py - 0.5) * 16 * d.depth;
      var fx = d.x * W + Math.sin(t * 0.25 + d.phase) * 14 + px;
      var fy = d.y * H + Math.sin(t * 0.6 + d.phase) * 11 + py;
      var tilt = Math.sin(t * 0.45 + d.phase) * 0.09;

      if (d.state === "fall") {
        d.vy += GRAVITY * dt;
        d.fy += d.vy * dt;
        var land = landingPoint(d, d.sx);
        // Stretch as it speeds up, like a real falling drop
        var stretch = Math.min(0.3, d.vy / 2600);
        if (d.fy >= land.y) { splash(d, land); return; }
        teardrop(d.sx, d.fy, d.r, 0, d.phase, 1 - stretch * 0.5, 1 + stretch, 1);
        return;
      }

      var scale = 1, alpha = 1;
      if (d.state === "spawn") {
        var k = Math.min(1, (clock - d.t0) / 0.9);
        scale = Math.max(0.01, easeOutBack(k));
        alpha = Math.min(1, k * 1.6);
        if (k >= 1) d.state = "float";
      }
      d.sx = fx; d.sy = fy;
      teardrop(fx, fy, d.r, tilt, d.phase, scale, scale, alpha);
    });
  }

  function draw(t, dt) {
    dt = dt || 0;
    ctx.clearRect(0, 0, W, H);
    ripples = ripples.filter(function (rp) { return clock - rp.t0 < 4.5; });
    buildGrid(t);
    drawWave();
    drawSplashes(dt);
    drawDrops(t, dt);
  }

  function busy() {
    if (ripples.length || splashes.length) return true;
    for (var i = 0; i < drops.length; i++) if (drops[i].state !== "float") return true;
    return false;
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    clock += dt;
    // Ease the mouse so the response feels soft, not twitchy
    mouse.x += (mouse.tx - mouse.x) * MOUSE_FOLLOW;
    mouse.y += (mouse.ty - mouse.y) * MOUSE_FOLLOW;
    mouse.px += (mouse.tpx - mouse.px) * MOUSE_FOLLOW * 0.6;
    mouse.py += (mouse.tpy - mouse.py) * MOUSE_FOLLOW * 0.6;
    draw(waveTime(), dt);
    // Under reduced motion, only draw while something the visitor did is still moving
    if (reduceMotion.matches && !busy() &&
        Math.abs(mouse.tx - mouse.x) < 0.5 && Math.abs(mouse.ty - mouse.y) < 0.5 &&
        Math.abs(mouse.tpx - mouse.px) < 0.001 && Math.abs(mouse.tpy - mouse.py) < 0.001) {
      running = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function play(fromVisitor) {
    if (running || !visible || document.hidden) return;
    if (reduceMotion.matches && !fromVisitor) return;
    running = true;
    lastNow = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // Is the pointer over a floating drop? (generous target for fingers)
  function hitDrop(x, y, slack) {
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.state !== "float") continue;
      var cy = d.sy - 0.35 * d.r;
      var dx = x - d.sx, dy = y - cy;
      var reach = d.r * 1.25 + slack;
      if (dx * dx + dy * dy < reach * reach) return d;
    }
    return null;
  }

  function local(e) {
    var rect = hero.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  }

  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var p = local(e);
    mouse.tx = p.x; mouse.ty = p.y;
    mouse.tpx = p.x / p.w; mouse.tpy = p.y / p.h;
    if (mouse.x < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    var d = hitDrop(p.x, p.y, 2);
    if (d) knock(d);
    wake(p.x, p.y);
    play(true);
  });
  hero.addEventListener("pointerdown", function (e) {
    var p = local(e);
    var d = hitDrop(p.x, p.y, e.pointerType === "mouse" ? 2 : 14);
    if (d) knock(d);
  });
  hero.addEventListener("pointerleave", function () {
    mouse.tx = -9999; mouse.ty = -9999; mouse.tpx = 0.5; mouse.tpy = 0.5;
    mouse.x = -9999; mouse.y = -9999;
    play(true);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) play(busy()); else pause();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause(); else play(busy());
  });
  var onMotionChange = function () {
    if (reduceMotion.matches) { pause(); draw(STILL_TIME); } else { play(); }
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", onMotionChange);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();
  play();
  canvas.classList.add("is-ready");
})();
