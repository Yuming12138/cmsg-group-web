/**
 * Google Antigravity Style Interactive Particle Wave Canvas
 * Computational Materials Science Group (CMSG)
 * Simulates a dynamic quantum-mechanical undulating dot matrix / atomic lattice
 * with smooth physics-based mouse gravitation and ripple response.
 */
(function () {
  'use strict';

  const canvas = document.querySelector('[data-particles-canvas]');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Mouse interaction tracker
  const mouse = {
    x: -9999,
    y: -9999,
    currX: -9999,
    currY: -9999,
    radius: 200,
    active: false
  };

  // Click ripples
  const ripples = [];

  // Grid configuration
  const SPACING_X = 32;
  const SPACING_Y = 28;
  let cols = 0;
  let rows = 0;
  let dots = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.scale(dpr, dpr);

    cols = Math.ceil(width / SPACING_X) + 2;
    rows = Math.ceil(height / SPACING_Y) + 2;

    dots = [];
    const offsetX = (width - (cols - 1) * SPACING_X) / 2;
    const offsetY = (height - (rows - 1) * SPACING_Y) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          baseX: offsetX + c * SPACING_X,
          baseY: offsetY + r * SPACING_Y,
          col: c,
          row: r,
          x: offsetX + c * SPACING_X,
          y: offsetY + r * SPACING_Y,
          vx: 0,
          vy: 0,
          elevation: 0,
          targetElevation: 0
        });
      }
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Mouse listeners on hero section
  const heroSection = canvas.closest('.hero') || window;

  heroSection.addEventListener('mousemove', function (e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  heroSection.addEventListener('mouseleave', function () {
    mouse.active = false;
  }, { passive: true });

  heroSection.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    ripples.push({
      x: cx,
      y: cy,
      radius: 0,
      maxRadius: Math.max(width, height) * 0.9,
      speed: 400,
      strength: 32,
      life: 1.0
    });
  });

  // Touch support for mobile
  heroSection.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  heroSection.addEventListener('touchend', function () {
    mouse.active = false;
  }, { passive: true });

  let lastTime = performance.now();
  let time = 0;

  function render(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    time += dt;

    // Smoothly interpolate mouse position
    if (mouse.active) {
      mouse.currX += (mouse.x - mouse.currX) * 0.15;
      mouse.currY += (mouse.y - mouse.currY) * 0.15;
    } else {
      mouse.currX = -9999;
      mouse.currY = -9999;
    }

    // Update ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.radius += rip.speed * dt;
      rip.life -= dt * 0.65;
      if (rip.life <= 0 || rip.radius > rip.maxRadius) {
        ripples.splice(i, 1);
      }
    }

    ctx.clearRect(0, 0, width, height);

    // Background gradient glow
    const centerGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, Math.max(width, height) * 0.7);
    centerGrad.addColorStop(0, 'rgba(0, 24, 64, 0.35)');
    centerGrad.addColorStop(0.6, 'rgba(0, 15, 42, 0.6)');
    centerGrad.addColorStop(1, 'rgba(0, 10, 28, 0.88)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, width, height);

    // Render dot wave matrix
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];

      // Multi-frequency wave calculation (atomic lattice wave oscillation)
      const w1 = Math.sin(dot.col * 0.16 + time * 1.6);
      const w2 = Math.cos(dot.row * 0.18 + time * 1.3);
      const w3 = Math.sin((dot.col + dot.row) * 0.11 - time * 1.0);
      let waveZ = (w1 * w2 * 9 + w3 * 6);

      // Mouse gravitation / Antigravity lift
      let mouseLift = 0;
      let pushX = 0;
      let pushY = 0;

      if (mouse.active) {
        const dx = dot.baseX - mouse.currX;
        const dy = dot.baseY - mouse.currY;
        const dist = Math.hypot(dx, dy);

        if (dist < mouse.radius && dist > 0) {
          const ratio = (1 - dist / mouse.radius);
          const easeRatio = ratio * ratio; // quadratic ease
          mouseLift = easeRatio * 26; // lift upwards
          pushX = (dx / dist) * easeRatio * 14;
          pushY = (dy / dist) * easeRatio * 14;
        }
      }

      // Ripple effects
      let ripLift = 0;
      for (let j = 0; j < ripples.length; j++) {
        const rip = ripples[j];
        const rDist = Math.hypot(dot.baseX - rip.x, dot.baseY - rip.y);
        const waveDist = Math.abs(rDist - rip.radius);
        if (waveDist < 60) {
          const ripFactor = Math.cos((waveDist / 60) * Math.PI) * rip.life * rip.strength;
          ripLift += ripFactor;
        }
      }

      const totalZ = waveZ + mouseLift + ripLift;

      // Position with physical displacement
      const posX = dot.baseX + pushX;
      const posY = dot.baseY + pushY - totalZ * 0.85;

      // Color and size based on total elevation
      // Normalize elevation roughly from -15 to +40
      const normZ = Math.max(0, Math.min(1, (totalZ + 15) / 55));
      const radius = 1.4 + normZ * 2.2; // dot radius between 1.4px and 3.6px

      // Opacity and color interpolation:
      // Base: soft cyan rgba(0, 167, 216, 0.28)
      // Crest / High: bright radiant cyan/white rgba(125, 237, 255, 0.95)
      let alpha = 0.22 + normZ * 0.65;
      if (mouseLift > 4) {
        alpha = Math.min(1, alpha + 0.25);
      }

      ctx.beginPath();
      ctx.arc(posX, posY, radius, 0, Math.PI * 2);

      if (normZ > 0.75 || mouseLift > 10) {
        // High crest or near mouse: glowing bright electric cyan
        ctx.fillStyle = `rgba(186, 245, 255, ${alpha.toFixed(2)})`;
        ctx.shadowColor = 'rgba(0, 217, 255, 0.7)';
        ctx.shadowBlur = 8;
      } else if (normZ > 0.45) {
        // Medium wave: Google Antigravity vibrant cyan
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
        ctx.shadowColor = 'rgba(0, 167, 216, 0.4)';
        ctx.shadowBlur = 4;
      } else {
        // Ground: calm deep cyan dot
        ctx.fillStyle = `rgba(0, 167, 216, ${alpha.toFixed(2)})`;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
