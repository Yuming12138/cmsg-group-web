(function () {
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-site-nav]');

  if (header && toggle && nav) {
    toggle.addEventListener('click', function () {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      header.toggleAttribute('data-nav-open', open);
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        header.removeAttribute('data-nav-open');
      });
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

  /* Hero artwork interaction: a magnifying lens plus colour sampling from the
     painting. The palette is pre-sampled (18x12 grid) from the source artwork so
     no canvas read-back is needed — that would taint on cross-origin images. */
  const lens = document.querySelector('[data-hero-lens]');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (hero && lens && !reduced && finePointer) {
    const GRID_COLS = 18;
    const GRID_ROWS = 12;
    const GRID = ['#dcb6a2','#ac837b','#9a706a','#cea896','#ecdcc9','#eee4d5','#efe5da','#f0e8df','#efe8e1','#eae3dc','#e4dcd3','#ebe1cf','#ddd2c6','#ece2d6','#e9dfd2','#e7dcce','#e1d5c4','#d3c7b7','#90615d','#44283b','#4b2b44','#69494d','#debea9','#e7d9bd','#e8dcca','#eee6dd','#e9e2dd','#e0d9d3','#dfd7cc','#dbd0af','#d6cdc7','#e8dcce','#e4d9ce','#d2cac4','#c5bfbc','#d2c7c3','#643e42','#532b4e','#713b6c','#4b2e3b','#cfa692','#e6d9c1','#dfd3c0','#e7dfd7','#e6dbd5','#e7ded8','#e2dcd9','#dfd7d1','#decec6','#b9a08d','#b8aaa2','#beb5b6','#aba19e','#d3c8c3','#ab7973','#4c2d36','#462736','#803b37','#deb596','#c4bdb4','#bebdbf','#e2deda','#dfd7d3','#dbd2cd','#d8d1cc','#d6cbc6','#d8c2bc','#ac9493','#c6b3aa','#baa6a4','#b9a5a4','#d7cac4','#e8d2c7','#d2aa9f','#c69585','#d97150','#dbb895','#c5c4c3','#b6c1cc','#b6c3cf','#cecac9','#cac0bd','#d8cbc9','#c8b8b1','#c1b5a9','#aba2a3','#989ea8','#bfb6b4','#c2b5b3','#cdb5b4','#eadfd2','#ebdfd2','#d1c4b8','#d4c4ae','#cec6ba','#b3ada5','#b2b2b2','#afb4bc','#bab9bc','#dad2cf','#decdc0','#c1a692','#98908b','#aea4a1','#697b90','#c5bab7','#d7c9c6','#c8b3b3','#e9e0d9','#ebe3dc','#ded7d2','#e8e3df','#cec8bc','#918d8a','#888081','#b9b1b2','#ccc9ca','#c4b7aa','#bda58b','#c7ab8e','#a9907d','#c4b2a4','#cec0bb','#c0aea7','#d3c6c3','#ddd0cd','#e7dfda','#dad4ce','#cec8c6','#d4c9c1','#c1a993','#a8a19b','#b5a9a7','#ccbebc','#ccc0be','#d5cac1','#d8ccc3','#cbbbb5','#d0c1ba','#ddd3c7','#e6dcd8','#d7c9c5','#ddd0ce','#e1d3d1','#ddd6d3','#ccba81','#cac1a8','#d4cac7','#b19d91','#c3b9ae','#e6ddd4','#e8e1dc','#dfd7d4','#dcd5d2','#c4bcbb','#d2c8c6','#ded3d2','#cbbec7','#d8c9bb','#dbc6a5','#dfd2cf','#e2d4d1','#e6ddd7','#d6cdc4','#ddd6d2','#ebe4e0','#e9e5e2','#e9e5e1','#e0ded8','#d8d4cd','#e0dbd8','#e5e4e5','#d4d0d2','#dad4d1','#dfd7d9','#beadc4','#ccbaa9','#b09073','#cdbfba','#e1d4d0','#e8dfdb','#e8ded9','#eae2de','#ece8e6','#ece8e6','#e7e3e2','#aabec1','#aebebc','#e7e4e3','#e5e4e7','#dad7d8','#e3dddb','#e5dedc','#e0d8d6','#d3c9c8','#ac9f9f','#b69494','#d4c2bd','#e3dedc','#e4dfdc','#e6e2e0','#e6e3e4','#e6e3e5','#e7e5e8','#e4e3e1','#e6e3e0','#e9e7e8','#e7e4e6','#dfdcdd','#e3dfde','#e5dfde','#e5dcdb','#e4dad9','#e0d4d3','#d6c2c1','#d6c7c4'];

    let lensFrame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const channels = function (hex) {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ];
    };

    const shift = function (parts, amount) {
      const target = amount < 0 ? 0 : 255;
      return parts.map(function (value) {
        return Math.round(value + (target - value) * Math.abs(amount));
      });
    };

    const relativeLuminance = function (parts) {
      const linear = parts.map(function (value) {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    const contrast = function (a, b) {
      const la = relativeLuminance(a);
      const lb = relativeLuminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    /* Keep the CTA believable as a button: hold the sampled hue but darken it
       until white text reaches WCAG AA, so every colour of the painting can be
       worn without ever looking washed out or unreadable. */
    const legiblePair = function (parts) {
      const white = [255, 255, 255];
      let colour = parts.slice();
      for (let step = 0; step < 14 && contrast(colour, white) < 4.5; step += 1) {
        colour = shift(colour, -0.09);
      }
      return { accent: 'rgb(' + colour.join(',') + ')', ink: '#ffffff' };
    };

    const paintLens = function () {
      lensFrame = 0;
      const bounds = hero.getBoundingClientRect();
      const x = pointerX - bounds.left;
      const y = pointerY - bounds.top;

      hero.style.setProperty('--mx', x.toFixed(1) + 'px');
      hero.style.setProperty('--my', y.toFixed(1) + 'px');

      const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(x / bounds.width * GRID_COLS)));
      const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y / bounds.height * GRID_ROWS)));
      const pair = legiblePair(channels(GRID[row * GRID_COLS + col]));
      hero.style.setProperty('--hero-accent', pair.accent);
      hero.style.setProperty('--hero-accent-ink', pair.ink);
    };

    hero.addEventListener('pointermove', function (event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      lens.classList.add('is-active');
      if (!lensFrame) lensFrame = window.requestAnimationFrame(paintLens);
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      lens.classList.remove('is-active');
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
