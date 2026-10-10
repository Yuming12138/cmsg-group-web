/**
 * Google Antigravity Particle Wave Engine (Jellyfish Undulation Model)
 * Computational Materials Science Group (CMSG)
 *
 * Visual Characteristics:
 * - Highly uniform hexagonal dot distribution (clean, balanced packing)
 * - Radial size gradient: very small in the center, progressively larger towards the exterior
 * - Organic jellyfish-like bell pulsation: rhythmic outward expansion and gentle relaxation
 * - Radiating streamlines aligned along wave contours
 * - Continuous chromatic transformation across Google spectrum (Cobalt, Cyan, Purple, Magenta, Coral, Amber)
 * - Pure crisp white canvas background with headline breathing room
 */
(function () {
  'use strict';

  const canvas = document.querySelector('[data-particles-canvas]');
  if (!canvas) return;

  const heroSection = canvas.closest('.hero') || canvas.parentElement || document.body;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let isVisible = true;
  let animFrameId = null;

  // Interaction State
  const mouse = {
    currX: 0,
    currY: 0,
    active: false,
    lastMoveTime: 0
  };

  const ringPos = { x: 0, y: 0 };
  let clickWave = -1.0;
  const clickPos = { x: 0, y: 0 };

  // =========================================================================
  // GLSL SHADER DEFINITIONS
  // =========================================================================
  const vsSource = `
    precision highp float;

    attribute vec2 aPosition;
    attribute vec2 aSeed;

    uniform float uTime;
    uniform vec2 uRingPos;
    uniform vec2 uResolution;
    uniform float uPixelRatio;
    uniform float uParticleScale;
    uniform vec2 uMousePos;
    uniform float uMouseActive;
    uniform float uClickWave;
    uniform vec2 uClickPos;

    varying float vAngle;
    varying float vScale;
    varying float vColorPhase;
    varying float vAlpha;

    // Simplex 3D Noise (Ian McEwan, Ashima Arts)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      vec2 pos = aPosition;
      vec2 aspectPos = vec2(pos.x * aspect, pos.y);
      vec2 aspectRing = vec2(uRingPos.x * aspect, uRingPos.y);

      float dist = distance(aspectPos, aspectRing);

      // Jellyfish wave dynamics: rhythmic radial pulsation
      float t = uTime * 0.55;
      float pulsePhase = dist * 10.5 - t * 3.0;
      float pulseWave = sin(pulsePhase);
      // Asymmetric bell contraction/expansion stroke (jellyfish bell propulsive pulse)
      float bellStroke = pow(sin(pulsePhase) * 0.5 + 0.5, 2.4);

      // Multi-octave organic simplex noise
      float n1 = snoise(vec3(pos * 2.2 + vec2(18.5, 73.0), t * 0.55));
      float n2 = snoise(vec3(pos * 2.2 + vec2(50.9, 121.0), t * 0.55));
      float nFine = snoise(vec3(pos * 6.5, t * 0.85)) * 0.014;

      // Radial unit vector from pulsation center
      vec2 diff = aspectPos - aspectRing;
      float dLen = length(diff);
      vec2 radialDir = dLen > 0.0001 ? (diff / dLen) : vec2(0.0, 1.0);

      // Radial displacement: outward bell propulsion + relaxation
      vec2 disp = vec2(n1, n2) * 0.024 + vec2(nFine);
      disp += (radialDir / vec2(aspect, 1.0)) * (bellStroke * 0.042 + pulseWave * 0.016);

      // Interactive mouse deflection
      if (uMouseActive > 0.5) {
        vec2 aspectMouse = vec2(uMousePos.x * aspect, uMousePos.y);
        float mDist = distance(aspectPos, aspectMouse);
        float mForce = smoothstep(0.42, 0.0, mDist);
        vec2 mDiff = aspectPos - aspectMouse;
        float mLen = length(mDiff);
        vec2 mDir = mLen > 0.0001 ? (mDiff / mLen) : vec2(0.0, 1.0);
        disp += (mDir / vec2(aspect, 1.0)) * mForce * 0.038;
      }

      // Click shockwave expansion
      if (uClickWave >= 0.0) {
        vec2 aspectClick = vec2(uClickPos.x * aspect, uClickPos.y);
        float clickDist = distance(aspectPos, aspectClick);
        float waveFront = uClickWave * 2.5;
        float pulse = smoothstep(waveFront - 0.16, waveFront, clickDist)
                    - smoothstep(waveFront, waveFront + 0.16, clickDist);
        disp += (radialDir / vec2(aspect, 1.0)) * pulse * 0.06;
      }

      vec2 finalPos = pos + disp;

      // Streamline rotation angle: aligned radially along the jellyfish umbrella ribs
      float angle = atan(aspectPos.y - aspectRing.y, aspectPos.x - aspectRing.x);
      float noiseAngle = snoise(vec3(pos * 3.2 + vec2(12.3, 45.6), t * 0.6));
      vAngle = angle + noiseAngle * 0.28;

      // REQUIREMENT 1: "点的大小中间小外面大" (Smaller in the middle, larger outside)
      // Clean negative space with soft delicate micro-dots in center (increased center density)
      float centerCut = smoothstep(0.04, 0.16, dist);
      // Progressive radial size expansion from inner micro-specks to outer capsules
      float radialSizeGradient = 0.22 + 1.25 * pow(clamp(dist, 0.0, 1.35), 1.25);

      // Jellyfish wave dynamic swelling during bell pulse wave crest
      float waveSwelling = 1.0 + bellStroke * 0.7 + pulseWave * 0.28;
      vScale = radialSizeGradient * centerCut * waveSwelling * (0.85 + aSeed.y * 0.3);

      // Continuous Chromatic Transformation
      float noiseColor = snoise(vec3(pos * 1.5 + vec2(74.6, 91.5), uTime * 0.28));
      float spatialPhase = (angle / 6.283185) + dist * 0.35;
      float timePhase = uTime * 0.075;
      vColorPhase = fract(spatialPhase + noiseColor * 0.25 + timePhase + aSeed.x * 0.1);

      // Soft perimeter fadeout to preserve crisp edge white background
      float edgeFade = smoothstep(1.35, 1.05, dist);
      vAlpha = smoothstep(0.05, 0.20, vScale) * edgeFade;


      gl_Position = vec4(finalPos.x, finalPos.y, 0.0, 1.0);

      // Point size: 2px-3.5px in center -> 8px-14px on perimeter
      gl_PointSize = vScale * 7.5 * uPixelRatio * uParticleScale;
    }
  `;

  const fsSource = `
    precision highp float;

    varying float vAngle;
    varying float vScale;
    varying float vColorPhase;
    varying float vAlpha;

    // Signed Distance Function for rounded pill capsule
    float sdRoundBox(in vec2 p, in vec2 b, in vec4 r) {
      r.xy = (p.x > 0.0) ? r.xy : r.zw;
      r.x  = (p.y > 0.0) ? r.x  : r.y;
      vec2 q = abs(p) - b + r.x;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
    }

    vec2 rotateUV(vec2 v, float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, s, -s, c) * v;
    }

    // Google Antigravity multi-color spectrum ramp
    vec3 getGoogleColor(float phase) {
      vec3 cBlue    = vec3(0.102, 0.337, 0.859); // Deep Cobalt #1a56db
      vec3 cCyan    = vec3(0.008, 0.518, 0.780); // Electric Cyan #0284c7
      vec3 cPurple  = vec3(0.486, 0.227, 0.929); // Royal Purple #7c3aed
      vec3 cMagenta = vec3(0.859, 0.153, 0.467); // Vivid Magenta #db2777
      vec3 cCoral   = vec3(0.918, 0.263, 0.208); // Coral Red #ea4335
      vec3 cAmber   = vec3(0.961, 0.620, 0.043); // Golden Amber #f59e0b

      float p = fract(phase) * 6.0;
      if (p < 1.0) return mix(cBlue, cCyan, p);
      if (p < 2.0) return mix(cCyan, cPurple, p - 1.0);
      if (p < 3.0) return mix(cPurple, cMagenta, p - 2.0);
      if (p < 4.0) return mix(cMagenta, cCoral, p - 3.0);
      if (p < 5.0) return mix(cCoral, cAmber, p - 4.0);
      return mix(cAmber, cBlue, p - 5.0);
    }

    void main() {
      if (vAlpha < 0.02) {
        discard;
      }

      vec2 uv = gl_PointCoord.xy - vec2(0.5);
      uv.y = -uv.y;

      uv = rotateUV(uv, -vAngle);

      // Fine elongated pill capsule
      float d = sdRoundBox(uv, vec2(0.42, 0.16), vec4(0.15));
      float shape = smoothstep(0.06, -0.06, d);

      float alpha = vAlpha * shape;
      if (alpha < 0.02) {
        discard;
      }

      vec3 color = getGoogleColor(vColorPhase);
      gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
    }
  `;

  // =========================================================================
  // WEBGL INITIALIZATION & COMPILATION
  // =========================================================================
  let gl = null;
  let program = null;
  let numParticles = 0;
  let positionBuffer = null;
  let seedBuffer = null;

  // Uniform locations
  let uTimeLoc, uRingPosLoc, uResolutionLoc, uPixelRatioLoc;
  let uParticleScaleLoc, uMousePosLoc, uMouseActiveLoc, uClickWaveLoc, uClickPosLoc;

  function initWebGL() {
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
        || canvas.getContext('experimental-webgl', { alpha: true });
    } catch (e) {
      gl = null;
    }

    if (!gl) {
      console.warn('[Particles] WebGL unavailable, falling back to Canvas 2D engine');
      initCanvas2D();
      return false;
    }

    // Compile vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('[Particles] Vertex shader compilation failed:', gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      initCanvas2D();
      return false;
    }

    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('[Particles] Fragment shader compilation failed:', gl.getShaderInfoLog(fs));
      gl.deleteShader(fs);
      initCanvas2D();
      return false;
    }

    // Link shader program
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[Particles] Shader program link failed:', gl.getProgramInfoLog(program));
      initCanvas2D();
      return false;
    }

    gl.useProgram(program);

    // Look up uniforms
    uTimeLoc = gl.getUniformLocation(program, 'uTime');
    uRingPosLoc = gl.getUniformLocation(program, 'uRingPos');
    uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    uPixelRatioLoc = gl.getUniformLocation(program, 'uPixelRatio');
    uParticleScaleLoc = gl.getUniformLocation(program, 'uParticleScale');
    uMousePosLoc = gl.getUniformLocation(program, 'uMousePos');
    uMouseActiveLoc = gl.getUniformLocation(program, 'uMouseActive');
    uClickWaveLoc = gl.getUniformLocation(program, 'uClickWave');
    uClickPosLoc = gl.getUniformLocation(program, 'uClickPos');

    // Create particle coordinates
    generateParticles();

    // Configure WebGL blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(1.0, 1.0, 1.0, 0.0);

    return true;
  }

  function generateParticles() {
    // REQUIREMENT: "点要更均匀一些" (Evenly distributed hexagonal lattice)
    // Hexagonal packing ensures constant distance between all neighboring dots
    const cols = 64;
    const rows = 46;

    const points = [];
    const seedsList = [];

    const spacingX = 2.4 / cols;
    const spacingY = 2.4 / rows;

    for (let r = 0; r < rows; r++) {
      // Offset alternate rows for hexagonal honeycomb packing
      const rowOffset = (r % 2 === 0) ? 0 : spacingX * 0.5;
      const v = (r / (rows - 1)) * 2.4 - 1.2;

      for (let c = 0; c < cols; c++) {
        const u = (c / (cols - 1)) * 2.4 - 1.2 + rowOffset;

        // Subtle micro-jitter (<15% of spacing) for natural organic feel
        const jx = (Math.random() - 0.5) * (spacingX * 0.16);
        const jy = (Math.random() - 0.5) * (spacingY * 0.16);

        points.push(u + jx, v + jy);
        seedsList.push(Math.random(), Math.random());
      }
    }

    numParticles = points.length / 2;
    const positions = new Float32Array(points);
    const seeds = new Float32Array(seedsList);

    if (!positionBuffer) positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    if (!seedBuffer) seedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

    const aSeedLoc = gl.getAttribLocation(program, 'aSeed');
    gl.enableVertexAttribArray(aSeedLoc);
    gl.vertexAttribPointer(aSeedLoc, 2, gl.FLOAT, false, 0, 0);
  }

  // =========================================================================
  // RESIZE & VIEWPORT
  // =========================================================================
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  // =========================================================================
  // ANIMATION LOOP (WEBGL)
  // =========================================================================
  const startTime = performance.now();

  function renderWebGL(now) {
    if (!isVisible) return;

    const time = (now - startTime) * 0.001;

    // Smooth inertial tracking of pulsation center
    let targetX = 0;
    let targetY = 0;

    const isHoverActive = mouse.active && (now - mouse.lastMoveTime < 4000);
    if (isHoverActive) {
      targetX = (mouse.currX / width) * 2 - 1;
      targetY = -((mouse.currY / height) * 2 - 1);
      ringPos.x += (targetX - ringPos.x) * 0.035;
      ringPos.y += (targetY - ringPos.y) * 0.035;
    } else {
      // Gentle breathing Lissajous wander
      targetX = Math.sin(time * 0.5) * 0.10 + Math.cos(time * 1.1) * 0.03;
      targetY = Math.cos(time * 0.4) * 0.08 + Math.sin(time * 0.9) * 0.03;
      ringPos.x += (targetX - ringPos.x) * 0.015;
      ringPos.y += (targetY - ringPos.y) * 0.015;
    }

    // Advance click shockwave
    if (clickWave >= 0.0) {
      clickWave += 0.015;
      if (clickWave > 1.2) {
        clickWave = -1.0;
      }
    }

    // Clear and draw
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform1f(uTimeLoc, time);
    gl.uniform2f(uRingPosLoc, ringPos.x, ringPos.y);
    gl.uniform2f(uResolutionLoc, width, height);
    gl.uniform1f(uPixelRatioLoc, dpr);
    gl.uniform1f(uParticleScaleLoc, 1.0);

    const mouseXNorm = (mouse.currX / width) * 2 - 1;
    const mouseYNorm = -((mouse.currY / height) * 2 - 1);
    gl.uniform2f(uMousePosLoc, mouseXNorm, mouseYNorm);
    gl.uniform1f(uMouseActiveLoc, isHoverActive ? 1.0 : 0.0);

    gl.uniform1f(uClickWaveLoc, clickWave);
    gl.uniform2f(uClickPosLoc, clickPos.x, clickPos.y);

    gl.drawArrays(gl.POINTS, 0, numParticles);

    animFrameId = requestAnimationFrame(renderWebGL);
  }

  // =========================================================================
  // FALLBACK CANVAS 2D ENGINE (FOR UNCOMMON ENVIRONMENTS WITHOUT WEBGL)
  // =========================================================================
  let ctx2d = null;
  let particles2D = [];

  function initCanvas2D() {
    ctx2d = canvas.getContext('2d', { alpha: true });
    if (!ctx2d) return;

    const cols = 40;
    const rows = 28;
    particles2D = [];

    for (let r = 0; r < rows; r++) {
      const rowOffset = (r % 2 === 0) ? 0 : (1.0 / cols) * 0.5;
      for (let c = 0; c < cols; c++) {
        particles2D.push({
          u: (c / (cols - 1)) * 2 - 1 + rowOffset,
          v: (r / (rows - 1)) * 2 - 1,
          seedX: Math.random(),
          seedY: Math.random()
        });
      }
    }

    function render2D(now) {
      if (!isVisible) return;
      const time = (now - startTime) * 0.001;
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);

      ctx2d.save();
      ctx2d.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < particles2D.length; i++) {
        const p = particles2D[i];
        const px = cx + p.u * (width * 0.52);
        const py = cy + p.v * (height * 0.52);

        const dx = px - (cx + ringPos.x * (width * 0.5));
        const dy = py - (cy - ringPos.y * (height * 0.5));
        const dist = Math.sqrt(dx * dx + dy * dy) / (Math.min(width, height) * 0.5);

        if (dist < 0.05) continue; // Center negative space


        const angle = Math.atan2(dy, dx);
        const pulse = Math.sin(dist * 9.0 - time * 2.8);
        const baseSize = 0.2 + 1.2 * Math.pow(Math.min(dist, 1.2), 1.2);
        const scale = baseSize * (1.0 + pulse * 0.4);

        const hue = (angle * 57.29 + time * 30 + p.seedX * 35) % 360;
        ctx2d.save();
        ctx2d.translate(px, py);
        ctx2d.rotate(angle);

        ctx2d.fillStyle = `hsla(${hue}, 85%, 52%, 0.85)`;
        const wPill = 7.5 * scale;
        const hPill = 3.0 * scale;
        ctx2d.beginPath();
        if (ctx2d.roundRect) {
          ctx2d.roundRect(-wPill / 2, -hPill / 2, wPill, hPill, hPill / 2);
        } else {
          ctx2d.arc(0, 0, hPill / 2, 0, Math.PI * 2);
        }
        ctx2d.fill();
        ctx2d.restore();
      }

      ctx2d.restore();
      animFrameId = requestAnimationFrame(render2D);
    }

    animFrameId = requestAnimationFrame(render2D);
  }

  // =========================================================================
  // EVENT LISTENERS (INTERACTION & RESPONSIVENESS)
  // =========================================================================
  heroSection.addEventListener('mousemove', function (e) {
    const rect = canvas.getBoundingClientRect();
    mouse.currX = e.clientX - rect.left;
    mouse.currY = e.clientY - rect.top;
    mouse.active = true;
    mouse.lastMoveTime = performance.now();
  }, { passive: true });

  heroSection.addEventListener('mouseleave', function () {
    mouse.active = false;
  }, { passive: true });

  heroSection.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    clickPos.x = (cx / width) * 2 - 1;
    clickPos.y = -((cy / height) * 2 - 1);
    clickWave = 0.0;
  }, { passive: true });

  window.addEventListener('resize', function () {
    resize();
  }, { passive: true });

  // IntersectionObserver: Pause rendering when scrolled out of view to save 100% resources
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isVisible = entry.isIntersecting;
        if (isVisible && !animFrameId) {
          if (gl) animFrameId = requestAnimationFrame(renderWebGL);
        }
      });
    }, { root: null, threshold: 0.05 });
    observer.observe(heroSection);
  }

  // Initial startup
  resize();
  const hasGL = initWebGL();
  if (hasGL) {
    animFrameId = requestAnimationFrame(renderWebGL);
  }
})();
