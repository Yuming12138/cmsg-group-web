(function () {
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-site-nav]');

  if (header && toggle && nav) {
    const isSmallScreen = function () {
      return window.matchMedia('(max-width: 980px)').matches;
    };
    const closeMenu = function (restoreFocus) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      header.removeAttribute('data-nav-open');
      document.body.classList.remove('has-nav-open');
      if (restoreFocus) toggle.focus();
    };
    const openMenu = function () {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      header.setAttribute('data-nav-open', '');
      document.body.classList.add('has-nav-open');
      const firstLink = nav.querySelector('a');
      if (isSmallScreen() && firstLink) {
        window.requestAnimationFrame(function () { firstLink.focus(); });
      }
    };

    toggle.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeMenu(true);
      else openMenu();
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { closeMenu(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        closeMenu(true);
      }
    });

    document.addEventListener('click', function (event) {
      if (nav.classList.contains('is-open') && !header.contains(event.target)) {
        closeMenu(false);
      }
    });

    window.addEventListener('resize', function () {
      if (!isSmallScreen() && nav.classList.contains('is-open')) closeMenu(false);
    });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('[data-hero]');
  if (hero && !reduced) {
    let scrollFrame = 0;
    const updateHeroScroll = function () {
      scrollFrame = 0;
      hero.classList.toggle('is-scrolled', window.scrollY > hero.offsetHeight * 0.12);
    };
    window.addEventListener('scroll', function () {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(updateHeroScroll);
    }, { passive: true });
    updateHeroScroll();
  }

  /* Hero artwork interaction: a magnifying lens plus colour sampling that reads
     the painting under the cursor. The artwork is same-origin, so it can be drawn
     into an offscreen canvas once and read back pixel-exactly — no baked palette.

     The lens magnifies about the cursor, so the pixel under the cursor is exactly
     what the lens centre shows; sampling there keeps the accent colour honest. */
  const lens = document.querySelector('[data-hero-lens]');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // the canvas the manifest and the layer images share
  const ART_WIDTH = 1440;
  const ART_HEIGHT = 1008;

  /* Map a point in source-artwork pixels onto the page, following the same
     centre/cover placement the artwork's CSS background uses. The layers and the
     colour sampler both need this, so it lives here once. */
  const artworkBox = function () {
    const art = document.querySelector('[data-hero-art]');
    if (!art) return null;
    const box = art.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const scale = Math.max(box.width / ART_WIDTH, box.height / ART_HEIGHT);
    return {
      box: box,
      scale: scale,
      left: box.left + (box.width - ART_WIDTH * scale) / 2,
      top: box.top + (box.height - ART_HEIGHT * scale) / 2,
    };
  };

  /* Orb breathing: only the two solid circles on the left react. Each orb layer
     is an opaque copy of its disc, so scaling it can never expose the painted
     disc underneath — which is exactly why the motion is a scale and not a
     translation. The pointer brings the nearer orb up a little; the CSS
     animation keeps a slow breath running underneath either way. */
  const orbs = Array.prototype.map.call(
    document.querySelectorAll('[data-orb]'),
    function (element) {
      return {
        element: element,
        cx: parseFloat(element.dataset.cx) || 0,
        cy: parseFloat(element.dataset.cy) || 0,
        r: parseFloat(element.dataset.r) || 0,
      };
    },
  );
  if (hero && orbs.length && finePointer && !reduced) {
    const ORB_LIFT = 0.075;   // scale added at the orb's centre
    const ORB_REACH = 2.2;    // how many radii away the pointer stops mattering
    let orbFrame = 0;
    let orbX = -1e6;
    let orbY = -1e6;

    const renderOrbs = function () {
      orbFrame = 0;
      const view = artworkBox();
      if (!view) return;
      orbs.forEach(function (orb) {
        const centreX = view.left + orb.cx * ART_WIDTH * view.scale;
        const centreY = view.top + orb.cy * ART_HEIGHT * view.scale;
        const radius = Math.max(48, orb.r * ART_WIDTH * view.scale);
        const dx = orbX - centreX;
        const dy = orbY - centreY;
        const pull = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (radius * ORB_REACH));
        const eased = pull * pull * (3 - 2 * pull);   // smoothstep
        orb.element.style.setProperty('--orb-scale', (1 + eased * ORB_LIFT).toFixed(4));
      });
    };

    const requestOrbs = function () {
      if (!orbFrame) orbFrame = window.requestAnimationFrame(renderOrbs);
    };

    hero.addEventListener('pointermove', function (event) {
      orbX = event.clientX;
      orbY = event.clientY;
      requestOrbs();
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      orbX = -1e6;
      orbY = -1e6;
      requestOrbs();
    });
  }

  // Colour sampling is a static recolour rather than motion, so it stays available
  // to reduced-motion visitors (their transitions are disabled by CSS anyway) and
  // does not depend on the lens being rendered.
  if (hero && finePointer) {
    const SAMPLE_RADIUS = 3;

    let lensFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let palette = null;
    let paletteWidth = 0;
    let paletteHeight = 0;

    const relativeLuminance = function (red, green, blue) {
      const linear = [red, green, blue].map(function (value) {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    const ratio = function (one, two) {
      const first = relativeLuminance(one[0], one[1], one[2]);
      const second = relativeLuminance(two[0], two[1], two[2]);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };

    const WHITE = [255, 255, 255];
    const INK = [16, 25, 35];

    /* Wear the colour under the cursor: hue and saturation come straight from the
       sampled pixel, so the button always reads as "that colour"; only lightness
       is reined into button depth (0.22–0.62) so a pale area of the painting can
       never turn the CTA into a washed-out chip. Ink flips white/ink to keep
       WCAG AA, and a hairline border keeps dark fills off the dark backdrop. */
    const buttonColour = function (red, green, blue) {
      const r = red / 255;
      const g = green / 255;
      const b = blue / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      const delta = max - min;
      let hue = 0;
      let saturation = 0;
      if (delta > 0) {
        saturation = delta / (1 - Math.abs(2 * lightness - 1));
        if (max === r) hue = 60 * (((g - b) / delta) % 6);
        else if (max === g) hue = 60 * ((b - r) / delta + 2);
        else hue = 60 * ((r - g) / delta + 4);
      }
      if (hue < 0) hue += 360;

      const toRgb = function (level) {
        const chroma = (1 - Math.abs(2 * level - 1)) * saturation;
        const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
        const offset = level - chroma / 2;
        let parts;
        if (hue < 60) parts = [chroma, second, 0];
        else if (hue < 120) parts = [second, chroma, 0];
        else if (hue < 180) parts = [0, chroma, second];
        else if (hue < 240) parts = [0, second, chroma];
        else if (hue < 300) parts = [second, 0, chroma];
        else parts = [chroma, 0, second];
        return parts.map(function (part) { return Math.round((part + offset) * 255); });
      };

      let level = Math.min(0.62, Math.max(0.2, lightness));
      let colour = toRgb(level);
      let ink = ratio(colour, INK) >= ratio(colour, WHITE) ? INK : WHITE;
      for (let step = 0; step < 20 && ratio(colour, ink) < 4.5; step += 1) {
        level = ink === WHITE ? Math.max(0.12, level - 0.02) : Math.min(0.68, level + 0.02);
        colour = toRgb(level);
      }
      return {
        accent: 'rgb(' + colour.join(',') + ')',
        ink: ink === WHITE ? '#ffffff' : '#101923',
      };
    };

    /* Resolve the artwork URL used for sampling. Prefer the responsive variant the
       browser already fetched for the background (zero extra requests); otherwise
       fall back to the smallest variant declared in CSS, resolved against the
       stylesheet so the relative url() inside tokens.css lands in the right place.
       The background may not be requested yet on a cold load, so this retries. */
    const paletteUrl = function () {
      const entries = window.performance && window.performance.getEntriesByType
        ? window.performance.getEntriesByType('resource')
        : [];
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const name = entries[index].name || '';
        // the artwork layer; older URLs naming the kandinsky source are still
        // valid if the browser has them cached
        const isArtwork = /\/site\/hero\/(art-|ground-)|kandinsky-composition-viii/i.test(name);
        if (isArtwork && /\.(webp|jpe?g)($|\?)/i.test(name)) {
          return name;
        }
      }
      const tokensLink = document.querySelector('link[href*="tokens.css"]');
      if (!tokensLink) return null;
      const declared = window.getComputedStyle(document.documentElement);
      const raw = declared.getPropertyValue('--hero-art');
      const match = /url\(\s*["']?([^"')]+)["']?\s*\)/i.exec(raw || '');
      if (!match) return null;
      try {
        return new URL(match[1], tokensLink.href).href;
      } catch (error) {
        return null;
      }
    };

    const readPalette = function (url) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = Math.round(360 * (ART_HEIGHT / ART_WIDTH));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        try {
          const data = context.getImageData(0, 0, canvas.width, canvas.height);
          palette = data.data;
          paletteWidth = canvas.width;
          paletteHeight = canvas.height;
          document.documentElement.dataset.heroAccent = 'ready';
        } catch (error) {
          palette = null;
          document.documentElement.dataset.heroAccent = 'blocked';
        }
      };
      image.onerror = function () {
        document.documentElement.dataset.heroAccent = 'unavailable';
      };
      image.src = url;
    };

    const preparePalette = function (attempt) {
      const url = paletteUrl();
      if (url) {
        readPalette(url);
        return;
      }
      document.documentElement.dataset.heroAccent = 'waiting';
      if ((attempt || 0) < 4) {
        window.setTimeout(function () { preparePalette((attempt || 0) + 1); }, 700);
      }
    };

    preparePalette();

    /* Map a pointer position onto a pixel of the source artwork. */
    const sampleArtwork = function (clientX, clientY) {
      if (!palette) return null;
      const view = artworkBox();
      if (!view) return null;

      const sourceX = (clientX - view.left) / view.scale;
      const sourceY = (clientY - view.top) / view.scale;

      const centreX = Math.round((sourceX / ART_WIDTH) * paletteWidth);
      const centreY = Math.round((sourceY / ART_HEIGHT) * paletteHeight);
      if (centreX < 0 || centreY < 0 || centreX >= paletteWidth || centreY >= paletteHeight) return null;

      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let row = centreY - SAMPLE_RADIUS; row <= centreY + SAMPLE_RADIUS; row += 1) {
        if (row < 0 || row >= paletteHeight) continue;
        for (let col = centreX - SAMPLE_RADIUS; col <= centreX + SAMPLE_RADIUS; col += 1) {
          if (col < 0 || col >= paletteWidth) continue;
          const offset = (row * paletteWidth + col) * 4;
          red += palette[offset];
          green += palette[offset + 1];
          blue += palette[offset + 2];
          count += 1;
        }
      }
      if (!count) return null;
      return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
    };

    const paintLens = function () {
      lensFrame = 0;
      const bounds = hero.getBoundingClientRect();
      const x = pointerX - bounds.left;
      const y = pointerY - bounds.top;

      hero.style.setProperty('--mx', x.toFixed(1) + 'px');
      hero.style.setProperty('--my', y.toFixed(1) + 'px');

      if (lens) lens.classList.add('is-active');

      const sample = sampleArtwork(pointerX, pointerY);
      if (sample) {
        const pair = buttonColour(sample[0], sample[1], sample[2]);
        hero.style.setProperty('--hero-accent', pair.accent);
        hero.style.setProperty('--hero-accent-ink', pair.ink);
      }
    };

    hero.addEventListener('pointermove', function (event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (lens) lens.classList.add('is-active');
      if (!lensFrame) lensFrame = window.requestAnimationFrame(paintLens);
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      if (lens) lens.classList.remove('is-active');
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
    return;
  }

  const observer = new IntersectionObserver(function (entries, instance) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      instance.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px' });

  revealItems.forEach(function (item) {
    // Keep above-the-fold content visible while the observer is being
    // initialised. Only offscreen sections opt into the reveal animation;
    // a delayed script can never turn the page into a blank white panel.
    const bounds = item.getBoundingClientRect();
    const inInitialViewport = bounds.top < window.innerHeight && bounds.bottom > 0;
    if (!inInitialViewport) item.classList.add('reveal--pending');
    observer.observe(item);
  });
}());
