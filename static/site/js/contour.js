/* Contour hero — the group's topographic field, animated.
 *
 * The artwork is the source: an SVG of blue contour lines on deep navy. Every
 * path in it is sampled once into a polyline, and from then on the canvas draws
 * those polylines itself, which lets the pointer push on the real lines instead
 * of painting a second picture on top of them.
 *
 * Two distortions, both displacements of the original vertices:
 *   hover — a gaussian dimple that draws the contours in towards the cursor
 *   click — a ring gaussian that travels outwards, so a wave visibly runs
 *           through the standing contours and leaves them as they were
 * Plus a breath so slow it is felt rather than seen. Nothing is redrawn from
 * noise; the lines move because the artwork's own vertices moved.
 */
(function () {
  'use strict';

  var SVG_URL = '/static/site/contour/field.svg';
  var canvas = document.querySelector('[data-contour]');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Vertices sit closer together than the displacement gradient can fold them,
  // which is what keeps the lines from tying knots where the crest passes.
  var SAMPLE_SPACING = 3;    // viewBox units between sampled vertices
  var RIPPLE_SPEED = 300;    // px/s the wave travels outwards
  var RIPPLE_WIDTH = 62;     // px thickness of the travelling ring
  var RIPPLE_LIFE = 3.2;     // s
  var RIPPLE_AMP = 44;       // px the crest displaces the contours by
  var CURSOR_SIGMA = 240;    // px
  var CURSOR_AMP = 15;       // px the dimple pulls the contours in by
  var CURSOR_EASE = 5;       // 1/s, how fast the dimple chases the pointer
  var BREATHE = 0.006;       // fractional scale of the slow breath

  // The field sits back as texture; anything the wave is passing through is
  // lifted towards full strength, so the ripple reads as light travelling
  // along the contours rather than as another line among many.
  var HEAVY_WIDTH = 2.6;
  var LIGHT_WIDTH = 1;
  var HEAVY_ALPHA = 0.5;
  var LIGHT_ALPHA = 0.26;
  var WAVE_LIFT = 0.62;
  var HOT = 0.22;            // disturbance above which a run counts as lit

  var polylines = [];
  var viewBox = { w: 750, h: 500 };
  var scale = 1;
  var originX = 0;
  var originY = 0;
  var width = 0;
  var height = 0;

  var time = 0;
  var raf = 0;
  var last = 0;
  var ripples = [];

  var cursorX = -1e6;
  var cursorY = -1e6;
  var cursorTargetX = -1e6;
  var cursorTargetY = -1e6;
  var cursorAmp = 0;
  var cursorTargetAmp = 0;
  var cursorInside = false;

  var lineRGB = '0, 167, 216';
  var background = '#001337';

  function readTheme() {
    var cs = window.getComputedStyle(canvas);
    var rgb = cs.getPropertyValue('--contour-line-rgb');
    if (rgb && rgb.trim()) lineRGB = rgb.trim();
    var bg = cs.getPropertyValue('--contour-bg');
    if (bg && bg.trim()) background = bg.trim();
  }

  /* ---- geometry: the artwork, sampled once ---------------------------- */

  function samplePaths(doc) {
    var svg = doc.querySelector('svg');
    if (!svg) return [];

    var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/);
    if (vb.length === 4) {
      viewBox.w = parseFloat(vb[2]) || viewBox.w;
      viewBox.h = parseFloat(vb[3]) || viewBox.h;
    }

    // getTotalLength/getPointAtLength only report on elements attached to a
    // live document, so the source paths get a hidden host for the duration.
    var host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('width', '0');
    host.setAttribute('height', '0');
    host.style.position = 'absolute';
    host.style.opacity = '0';
    host.style.pointerEvents = 'none';
    document.body.appendChild(host);

    var out = [];
    var nodes = svg.querySelectorAll('path');
    for (var n = 0; n < nodes.length; n++) {
      var src = nodes[n];
      var d = src.getAttribute('d');
      if (!d) continue;

      var probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      probe.setAttribute('d', d);
      host.appendChild(probe);

      var length = 0;
      try { length = probe.getTotalLength(); } catch (error) { length = 0; }
      if (!length || !isFinite(length)) { host.removeChild(probe); continue; }

      var count = Math.max(2, Math.round(length / SAMPLE_SPACING));
      var pts = new Float32Array(count * 2);
      for (var i = 0; i < count; i++) {
        var p = probe.getPointAtLength((length * i) / (count - 1));
        pts[i * 2] = p.x;
        pts[i * 2 + 1] = p.y;
      }
      host.removeChild(probe);

      // the source draws its index contours at 6px and the rest at 1px
      var cls = src.getAttribute('class') || '';
      out.push({ local: pts, heavy: /(^|\s)st2(\s|$)/.test(cls), screen: null, box: null });
    }

    document.body.removeChild(host);
    return out;
  }

  /* Project the sampled vertices from viewBox units into screen pixels, and
     cache each polyline's bounds so the render loop can skip untouched ones. */
  function project() {
    scale = Math.max(width / viewBox.w, height / viewBox.h);
    originX = (width - viewBox.w * scale) / 2;
    originY = (height - viewBox.h * scale) / 2;

    for (var i = 0; i < polylines.length; i++) {
      var pl = polylines[i];
      var src = pl.local;
      var count = src.length / 2;
      if (!pl.screen || pl.screen.length !== src.length) pl.screen = new Float32Array(src.length);

      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (var k = 0; k < count; k++) {
        var x = src[k * 2] * scale + originX;
        var y = src[k * 2 + 1] * scale + originY;
        pl.screen[k * 2] = x;
        pl.screen[k * 2 + 1] = y;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
      pl.box = { x0: x0, y0: y0, x1: x1, y1: y1 };
    }
  }

  function resize() {
    var box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (polylines.length) project();
    return true;
  }

  /* ---- the field the pointer writes into ------------------------------ */

  // A polyline only needs per-vertex work if it overlaps a live disturbance.
  // The return value is how strongly it is being disturbed, 0 to 1, which the
  // draw loop turns into extra weight on the stroke.
  function disturbed(box) {
    if (!box) return 0;
    var strength = 0;

    if (cursorAmp > 0.5) {
      var reach = CURSOR_SIGMA * 3;
      if (box.x1 > cursorX - reach && box.x0 < cursorX + reach &&
          box.y1 > cursorY - reach && box.y0 < cursorY + reach) {
        strength = Math.max(strength, 0.4 * (cursorAmp / CURSOR_AMP));
      }
    }

    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var outer = r.radius + RIPPLE_WIDTH * 1.6;
      if (box.x1 > r.x - outer && box.x0 < r.x + outer &&
          box.y1 > r.y - outer && box.y0 < r.y + outer) {
        strength = Math.max(strength, r.amp / RIPPLE_AMP);
      }
    }

    return Math.min(1, strength);
  }

  var px = 0;
  var py = 0;
  // displaced vertices, shared between the two passes over a polyline
  var tmp = new Float32Array(2048);

  function ensureTmp(n) {
    if (tmp.length < n * 2) tmp = new Float32Array(n * 2);
  }

  function displace(x, y, active) {
    var dx = 0;
    var dy = 0;

    if (active) {
      for (var k = 0; k < ripples.length; k++) {
        var r = ripples[k];
        var vx = x - r.x;
        var vy = y - r.y;
        var d = Math.sqrt(vx * vx + vy * vy) || 1;
        var ring = (d - r.radius) / RIPPLE_WIDTH;
        // the drop point itself is left undisturbed: without this the lines
        // pile onto one another at the epicentre and fold into a knot
        var fade = Math.min(1, d / (r.radius + 1));
        var push = r.amp * Math.exp(-ring * ring) * fade;
        dx += (vx / d) * push;
        dy += (vy / d) * push;
      }

      if (cursorAmp > 0.002) {
        var cx = x - cursorX;
        var cy = y - cursorY;
        var cd = Math.sqrt(cx * cx + cy * cy) || 1;
        var pull = cursorAmp * Math.exp(-(cx * cx + cy * cy) / (2 * CURSOR_SIGMA * CURSOR_SIGMA));
        dx -= (cx / cd) * pull;
        dy -= (cy / cd) * pull;
      }
    }

    // the breath: a scale about the centre of the canvas
    var breath = 1 + BREATHE * Math.sin(time * 0.26);
    var mx = width / 2;
    var my = height / 2;
    px = mx + (x - mx) * breath + dx;
    py = my + (y - my) * breath + dy;
  }

  function draw() {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (var i = 0; i < polylines.length; i++) {
      var pl = polylines[i];
      var pts = pl.screen;
      if (!pts) continue;
      var count = pts.length / 2;
      if (!count) continue;

      var active = disturbed(pl.box) > 0.001;
      ensureTmp(count);

      // Pass one: the line drawn whole, so its stroke is never broken. The
      // displaced points are kept because pass two needs exactly the same ones.
      ctx.beginPath();
      for (var k = 0; k < count; k++) {
        displace(pts[k * 2], pts[k * 2 + 1], active);
        tmp[k * 2] = px;
        tmp[k * 2 + 1] = py;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      strokeRun(pl.heavy, false);
      if (!active) continue;

      // Pass two: the part of the line the crest is crossing, laid over the
      // top. Laying it over rather than splitting the stroke is what stops the
      // round caps from showing up as a seam.
      var open = false;
      for (var m = 0; m < count; m++) {
        var st = localStrength(pts[m * 2], pts[m * 2 + 1]);
        var lit = open ? st > HOT * 0.6 : st > HOT;   // a little hysteresis
        if (lit && !open) {
          ctx.beginPath();
          ctx.moveTo(tmp[m * 2], tmp[m * 2 + 1]);
          open = true;
        } else if (lit) {
          ctx.lineTo(tmp[m * 2], tmp[m * 2 + 1]);
        } else if (open) {
          strokeRun(pl.heavy, true);
          open = false;
        }
      }
      if (open) strokeRun(pl.heavy, true);
    }

    drawFronts();
  }

  function strokeRun(heavy, hot) {
    ctx.lineWidth = (heavy ? HEAVY_WIDTH : LIGHT_WIDTH) + (hot ? 1.5 : 0);
    var alpha = (heavy ? HEAVY_ALPHA : LIGHT_ALPHA) + (hot ? WAVE_LIFT : 0);
    ctx.strokeStyle = 'rgba(' + lineRGB + ',' + Math.min(1, alpha).toFixed(3) + ')';
    ctx.stroke();
  }

  /* How strongly the field is disturbed at one point — the same shape the
     displacement uses, sampled per vertex in the draw loop. */
  function localStrength(x, y) {
    var strength = 0;
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var dx = x - r.x;
      var dy = y - r.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var ring = (d - r.radius) / RIPPLE_WIDTH;
      var v = Math.exp(-ring * ring) * (r.amp / RIPPLE_AMP);
      if (v > strength) strength = v;
    }
    if (cursorAmp > 0.5) {
      var cx = x - cursorX;
      var cy = y - cursorY;
      var c = Math.exp(-(cx * cx + cy * cy) / (2 * CURSOR_SIGMA * CURSOR_SIGMA));
      c *= (cursorAmp / CURSOR_AMP) * 0.75;
      if (c > strength) strength = c;
    }
    return strength;
  }

  /* The crest itself, added rather than painted: a very faint annulus that
     travels with the ring and lets the eye find the wave even where the
     contours run close together. */
  function drawFronts() {
    if (!ripples.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var intensity = r.amp / RIPPLE_AMP;
      if (intensity <= 0.02) continue;
      var inner = Math.max(1, r.radius - RIPPLE_WIDTH);
      var outer = r.radius + RIPPLE_WIDTH;
      var grad = ctx.createRadialGradient(r.x, r.y, inner, r.x, r.y, outer);
      grad.addColorStop(0, 'rgba(0, 167, 216, 0)');
      grad.addColorStop(0.5, 'rgba(96, 226, 255, ' + (0.15 * intensity).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(0, 167, 216, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(r.x, r.y, outer, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function stepRipples(dt) {
    for (var k = ripples.length - 1; k >= 0; k--) {
      var r = ripples[k];
      r.age += dt;
      r.radius += RIPPLE_SPEED * dt;
      var life = r.age / RIPPLE_LIFE;
      if (life >= 1) { ripples.splice(k, 1); continue; }
      // reach full crest almost at once — the drop has to read as an impact —
      // then fade on a squared curve so the wave dissolves as it widens
      r.amp = RIPPLE_AMP * (1 - life) * (1 - life) * Math.min(1, life * 14);
    }
  }

  function stepCursor(dt) {
    var k = Math.min(1, CURSOR_EASE * dt);
    cursorX += (cursorTargetX - cursorX) * k;
    cursorY += (cursorTargetY - cursorY) * k;
    cursorAmp += (cursorTargetAmp - cursorAmp) * k;
  }

  function frame(now) {
    raf = 0;
    if (!last) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    stepRipples(dt);
    stepCursor(dt);
    draw();
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (raf || reduce) return;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (!raf) return;
    window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function localPoint(event) {
    var box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function spawnRipple(x, y) {
    if (ripples.length > 10) ripples.shift();
    ripples.push({ x: x, y: y, radius: 0, amp: 0, age: 0 });
  }

  function bindPointer() {
    var host = canvas.parentNode || canvas;

    host.addEventListener('pointermove', function (event) {
      var p = localPoint(event);
      cursorTargetX = p.x;
      cursorTargetY = p.y;
      if (!cursorInside) {
        cursorX = p.x;
        cursorY = p.y;
        cursorInside = true;
      }
      cursorTargetAmp = CURSOR_AMP;
    }, { passive: true });

    host.addEventListener('pointerleave', function () {
      cursorInside = false;
      cursorTargetAmp = 0;
    });

    host.addEventListener('pointerdown', function (event) {
      var p = localPoint(event);
      spawnRipple(p.x, p.y);
      if (reduce) draw();
    });
  }

  function boot() {
    readTheme();
    if (!resize()) {
      window.requestAnimationFrame(boot);
      return;
    }
    draw();

    fetch(SVG_URL).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      polylines = samplePaths(doc);
      project();
      draw();
      if (!reduce) start();
    }).catch(function (error) {
      // without the artwork there is nothing worth animating; the painted
      // background and the headline carry the screen on their own
      if (window.console) console.warn('contour: ' + error.message);
    });

    if (reduce) return;
    if (fine) bindPointer();

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { if (resize()) draw(); }, 120);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  boot();
})();
