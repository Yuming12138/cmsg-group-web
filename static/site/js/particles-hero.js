(function () {

'use strict';

/* Antigravity hero particle wave - faithful WebGL2 port of
   antigravity.google MainParticlesComponent (GPGPU particles).
   Hero (light theme) parameters from the site markup:
   ringWidth 0.006, ringWidth2 0.107, ringDisplacement 0.62,
   density 230, particlesScale 0.59, colors #2c64ed #f84242 #ffcf03. */

var CONFIG = {
  simSize: 256,
  density: 230,
  particlesScale: 0.59,
  ringWidth: 0.006,
  ringWidth2: 0.107,
  ringDisplacement: 0.62,
  cameraZ: 3.1,
  fovDeg: 40,
  color1: [0x2c / 255, 0x64 / 255, 0xed / 255],
  color2: [0xf8 / 255, 0x42 / 255, 0x42 / 255],
  color3: [0xff / 255, 0xcf / 255, 0x03 / 255],
};

var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise1D(seed) {
  var rand = mulberry32(seed);
  var perm = [];
  var i;
  for (i = 0; i < 256; i++) perm.push(i);
  for (i = 255; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
  }
  var p = new Uint8Array(512);
  for (i = 0; i < 512; i++) p[i] = perm[i & 255];
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x) { return (h & 1) ? -x : x; }
  return function (x) {
    var X = Math.floor(x);
    var xf = x - X;
    var u = fade(xf);
    var a = grad(p[X & 255], xf);
    var b = grad(p[(X + 1) & 255], xf - 1);
    return (a + u * (b - a)) * 0.5 + 0.5;
  };
}

function poissonDisc(size, minDist, tries, rand) {
  var cell = minDist / Math.SQRT2;
  var gw = Math.ceil(size / cell);
  var grid = new Int32Array(gw * gw).fill(-1);
  var pts = [];
  var active = [];
  function fits(x, y) {
    var cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    for (var j = Math.max(0, cy - 2); j <= Math.min(gw - 1, cy + 2); j++) {
      for (var i = Math.max(0, cx - 2); i <= Math.min(gw - 1, cx + 2); i++) {
        var idx = grid[j * gw + i];
        if (idx >= 0) {
          var dx = pts[idx * 2] - x, dy = pts[idx * 2 + 1] - y;
          if (dx * dx + dy * dy < minDist * minDist) return false;
        }
      }
    }
    return true;
  }
  function insert(x, y) {
    var idx = pts.length / 2;
    pts.push(x, y);
    grid[Math.floor(y / cell) * gw + Math.floor(x / cell)] = idx;
    active.push(idx);
  }
  insert(rand() * size, rand() * size);
  while (active.length) {
    var ai = Math.floor(rand() * active.length);
    var pi = active[ai];
    var px = pts[pi * 2], py = pts[pi * 2 + 1];
    var found = false;
    for (var k = 0; k < tries; k++) {
      var ang = rand() * Math.PI * 2;
      var rad = minDist * (1 + rand());
      var nx = px + Math.cos(ang) * rad, ny = py + Math.sin(ang) * rad;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (!fits(nx, ny)) continue;
      insert(nx, ny);
      found = true;
      break;
    }
    if (!found) active.splice(ai, 1);
  }
  return pts;
}

function shaderSource(id) {
  var el = document.getElementById(id);
  return el.textContent.replace(/^\s+/, '');
}

function createParticles(host) {
  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false
  });
  if (!gl) return null;

  var extCBF = gl.getExtension('EXT_color_buffer_float');
  var extCBHF = extCBF ? null : gl.getExtension('EXT_color_buffer_half_float');
  if (!extCBF && !extCBHF) return null;
  var INTERNAL = extCBF ? gl.RGBA32F : gl.RGBA16F;

  var SNOISE = shaderSource('snoise-src');
  var SIM_VS = shaderSource('sim-vs');
  var SIM_FS = shaderSource('sim-fs').replace('/*__SNOISE__*/', SNOISE);
  var RENDER_VS = shaderSource('render-vs');
  var RENDER_FS = shaderSource('render-fs').replace('/*__SNOISE__*/', SNOISE);

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('shader compile: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }
  function link(vsSrc, fsSrc) {
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('program link: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  var SIZE = CONFIG.simSize;
  var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  var minDist = ((CONFIG.density - 0) * (2 - 10)) / (300 - 0) + 10;
  var rawPts = poissonDisc(500, minDist, 20, mulberry32(20251118));
  var count = rawPts.length / 2;

  var refData = new Float32Array(SIZE * SIZE * 4);
  for (var i = 0; i < count; i++) {
    refData[i * 4 + 0] = (rawPts[i * 2] - 250) / 250;
    refData[i * 4 + 1] = (rawPts[i * 2 + 1] - 250) / 250;
  }

  function makeTexture(data) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, INTERNAL, SIZE, SIZE, 0, gl.RGBA, gl.FLOAT, data);
    return tex;
  }
  function makeTarget() {
    var tex = makeTexture(null);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) throw new Error('float framebuffer incomplete');
    return { tex: tex, fb: fb };
  }

  var posTex = makeTexture(refData);
  var rt1 = makeTarget();
  var rt2 = makeTarget();
  var everRendered = false;

  var simProg = link(SIM_VS, SIM_FS);
  var simU = {};
  ['uPosition', 'uPosRefs', 'uRingPos', 'uTime', 'uDeltaTime', 'uRingRadius', 'uRingWidth', 'uRingWidth2', 'uRingDisplacement'].forEach(function (name) {
    simU[name] = gl.getUniformLocation(simProg, name);
  });

  var drawProg = link(RENDER_VS, RENDER_FS);
  var drawU = {};
  ['uPosition', 'uParticleScale', 'uPixelRatio', 'uAspect', 'uColor1', 'uColor2', 'uColor3', 'uRingPos', 'uAlpha', 'uTime'].forEach(function (name) {
    drawU[name] = gl.getUniformLocation(drawProg, name);
  });

  var uvs = new Float32Array(count * 2);
  for (var q = 0; q < count; q++) {
    uvs[q * 2] = (q % SIZE) / SIZE;
    uvs[q * 2 + 1] = Math.floor(q / SIZE) / SIZE;
  }
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  var uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  var aUV = gl.getAttribLocation(drawProg, 'aUV');
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  var emptyVao = gl.createVertexArray();

  var noiseT = makeNoise1D(421);
  var noiseN = makeNoise1D(977);
  var ringPos = { x: 0, y: 0 };
  var mouse = { x: 0, y: 0, over: false };
  var startTime = performance.now();
  var lastTime = 0;
  var time = 0;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    var w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.max(1, Math.round(w * pixelRatio));
    canvas.height = Math.max(1, Math.round(h * pixelRatio));
  }
  resize();
  window.addEventListener('resize', resize);

  function onPointerMove(e) {
    if (e.pointerType === 'touch' || REDUCED) return;
    var rect = host.getBoundingClientRect();
    var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouse.over = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1;
    mouse.x = nx;
    mouse.y = ny;
  }
  var hero = host.parentElement;
  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  function onPointerLeave() { mouse.over = false; }
  hero.addEventListener('pointerleave', onPointerLeave);
  var resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  var tanHalf = Math.tan((CONFIG.fovDeg / 2) * Math.PI / 180);

  function step(dtOverride) {
    var now = (performance.now() - startTime) / 1000;
    var dt = (dtOverride != null) ? dtOverride : Math.min(now - lastTime, 0.1);
    lastTime = now;
    time += dt;

    var wt = (noiseT(time * 0.66 + 94.234) - 0.5) * 2;
    var wn = (noiseN(time * 0.75 + 21.028) - 0.5) * 2;
    var aspect = canvas.width / canvas.height;
    var cx, cy, ease;
    if (mouse.over) {
      var worldX = mouse.x * CONFIG.cameraZ * tanHalf * aspect;
      var worldY = mouse.y * CONFIG.cameraZ * tanHalf;
      cx = worldX * 0.175 + wt * 0.1;
      cy = worldY * 0.175 + wn * 0.1;
      ease = 0.02;
    } else {
      cx = wt * 0.2;
      cy = wn * 0.1;
      ease = 0.01;
    }
    ringPos.x += (cx - ringPos.x) * ease;
    ringPos.y += (cy - ringPos.y) * ease;

    var ringRadius = 0.175 + Math.sin(time * 1) * 0.03 + Math.cos(time * 3) * 0.02;

    gl.bindFramebuffer(gl.FRAMEBUFFER, rt2.fb);
    gl.viewport(0, 0, SIZE, SIZE);
    gl.disable(gl.BLEND);
    gl.useProgram(simProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, everRendered ? rt1.tex : posTex);
    gl.uniform1i(simU.uPosition, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, posTex);
    gl.uniform1i(simU.uPosRefs, 1);
    gl.uniform2f(simU.uRingPos, ringPos.x, ringPos.y);
    gl.uniform1f(simU.uTime, time);
    gl.uniform1f(simU.uDeltaTime, dt);
    gl.uniform1f(simU.uRingRadius, ringRadius);
    gl.uniform1f(simU.uRingWidth, CONFIG.ringWidth);
    gl.uniform1f(simU.uRingWidth2, CONFIG.ringWidth2);
    gl.uniform1f(simU.uRingDisplacement, CONFIG.ringDisplacement);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(drawProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, rt2.tex);
    gl.uniform1i(drawU.uPosition, 0);
    gl.uniform1f(drawU.uTime, time);
    gl.uniform2f(drawU.uRingPos, ringPos.x, ringPos.y);
    gl.uniform1f(drawU.uAspect, aspect);
    gl.uniform1f(drawU.uPixelRatio, pixelRatio);
    // Keep the reference scale on desktop; retain readable capsules on phones.
    gl.uniform1f(drawU.uParticleScale, Math.max(0.45, canvas.width / pixelRatio / 2000) * CONFIG.particlesScale);
    gl.uniform3fv(drawU.uColor1, CONFIG.color1);
    gl.uniform3fv(drawU.uColor2, CONFIG.color2);
    gl.uniform3fv(drawU.uColor3, CONFIG.color3);
    gl.uniform1f(drawU.uAlpha, 1);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.bindVertexArray(null);

    var swap = rt1; rt1 = rt2; rt2 = swap;
    everRendered = true;
  }

  function dispose() {
    window.removeEventListener('resize', resize);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    resizeObserver.disconnect();
    [posTex, rt1.tex, rt2.tex].forEach(function (texture) { gl.deleteTexture(texture); });
    [rt1.fb, rt2.fb].forEach(function (framebuffer) { gl.deleteFramebuffer(framebuffer); });
    [simProg, drawProg].forEach(function (program) { gl.deleteProgram(program); });
    [vao, emptyVao].forEach(function (array) { gl.deleteVertexArray(array); });
    gl.deleteBuffer(uvBuf);
    canvas.remove();
  }
  return { step: step, canvas: canvas, count: count, dispose: dispose };
}


// A quiet static field for devices without WebGL float render targets.
function staticField(host) {
  host.replaceChildren();
  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var context = canvas.getContext('2d');
  if (!context) return;
  function draw() {
    var width = host.clientWidth, height = host.clientHeight;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    var random = mulberry32(20251118);
    for (var y = 4; y < height; y += 10) {
      for (var x = 4; x < width; x += 10) {
        var px = x + random() * 5, py = y + random() * 5;
        var distance = Math.hypot(px - width / 2, py - height / 2);
        var ring = Math.exp(-Math.pow((distance - height * .38) / (height * .14), 2));
        var size = .5 + ring * 2.6;
        var phase = Math.sin(x * .004 + y * .002);
        context.fillStyle = phase > .4 ? '#477bed' : phase < -.4 ? '#ee765f' : '#ae77b5';
        context.globalAlpha = .4 + ring * .35;
        context.beginPath();
        context.ellipse(px, py, size, Math.max(.35, size * .38), Math.atan2(py - height / 2, px - width / 2), 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }
  draw();
  var observer = new ResizeObserver(draw);
  observer.observe(host);
  host.dataset.particleState = 'static';
  return function () { observer.disconnect(); canvas.remove(); };
}

function boot() {
  var host = document.querySelector('[data-antigravity-particles]');
  if (!host) return;
  var engine;
  try { engine = createParticles(host); }
  catch (error) { console.warn('Particle background unavailable:', error.message); }
  if (!engine) {
    var clearStatic = staticField(host);
    if (clearStatic) window.addEventListener('pagehide', clearStatic, { once: true });
    return;
  }
  host.dataset.particleCount = String(engine.count);
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var visible = true;
  var frame = 0;
  var disposed = false;
  var frames = 0;
  function renderStatic() {
    for (var i = 0; i < 90; i++) engine.step(1 / 30);
    host.dataset.particleState = 'reduced';
  }
  function canAnimate() { return !disposed && visible && !document.hidden && !motion.matches; }
  function loop() {
    frame = 0;
    if (!canAnimate()) return;
    engine.step();
    if (++frames % 60 === 0) host.dataset.particleFrames = String(frames);
    frame = requestAnimationFrame(loop);
  }
  function update() {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    if (canAnimate()) {
      host.dataset.particleState = 'running';
      frame = requestAnimationFrame(loop);
    } else if (!motion.matches) {
      host.dataset.particleState = 'paused';
    }
  }
  function onMotionChange() {
    REDUCED = motion.matches;
    if (REDUCED) renderStatic();
    update();
  }
  var observer = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    update();
  }, { threshold: 0 });
  observer.observe(host);
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', onMotionChange);
  engine.canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault();
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect();
    staticField(host);
  }, { once: true });
  if (REDUCED) renderStatic();
  else update();
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) { if (frame) cancelAnimationFrame(frame); frame = 0; return; }
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', update);
    motion.removeEventListener('change', onMotionChange);
    engine.dispose();
  });
  window.addEventListener('pageshow', update);
}
boot();

}());
