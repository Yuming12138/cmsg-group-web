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

    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const svg = hero.querySelector('.hero__geometry');
    const layers = hero.querySelectorAll('.geometry-layer');
    const focusItems = hero.querySelectorAll('.geometry-focus');
    const eye = hero.querySelector('[data-eye]');
    const eyePupil = eye && eye.querySelector('[data-eye-pupil]');
    const eyeCenter = eye ? {
      x: Number(eye.dataset.eyeCenterX || 0),
      y: Number(eye.dataset.eyeCenterY || 0),
    } : null;
    if (hasFinePointer && (layers.length || eye)) {
      let pointerFrame = 0;
      let eyeFrame = 0;
      let pointerX = 0;
      let pointerY = 0;
      let pointerClientX = 0;
      let pointerClientY = 0;
      let eyeCurrentX = 0;
      let eyeCurrentY = 0;
      let eyeTargetX = 0;
      let eyeTargetY = 0;
      let eyeReturning = false;
      const toSvgPoint = function (clientX, clientY) {
        if (!svg || !svg.getScreenCTM) return null;
        const matrix = svg.getScreenCTM();
        if (!matrix) return null;
        const point = typeof DOMPoint === 'function' ? new DOMPoint(clientX, clientY) : svg.createSVGPoint();
        if (typeof DOMPoint !== 'function') {
          point.x = clientX;
          point.y = clientY;
        }
        const transformed = point.matrixTransform(matrix.inverse());
        return { x: transformed.x, y: transformed.y };
      };
      const renderEye = function () {
        eyeFrame = 0;
        if (!eyePupil || !eyeCenter) return;

        eyeCurrentX += (eyeTargetX - eyeCurrentX) * .28;
        eyeCurrentY += (eyeTargetY - eyeCurrentY) * .28;
        eyePupil.setAttribute('transform', `translate(${eyeCurrentX.toFixed(2)} ${eyeCurrentY.toFixed(2)})`);

        const pupilSettled = Math.hypot(eyeTargetX - eyeCurrentX, eyeTargetY - eyeCurrentY) < .08;
        if (!pupilSettled) {
          eyeFrame = window.requestAnimationFrame(renderEye);
          return;
        }

        eyeCurrentX = eyeTargetX;
        eyeCurrentY = eyeTargetY;
        if (eyeReturning) {
          eyePupil.removeAttribute('transform');
        }
      };
      const requestEyeRender = function () {
        if (!eyeFrame) eyeFrame = window.requestAnimationFrame(renderEye);
      };
      const renderGeometry = function () {
        pointerFrame = 0;
        layers.forEach(function (layer) {
          const depth = Number(layer.dataset.depth || 2);
          const x = (pointerX * depth).toFixed(2);
          const y = (pointerY * depth * .65).toFixed(2);
          const rotate = (pointerX * depth * .018).toFixed(3);
          layer.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
        });

        focusItems.forEach(function (item) {
          const bounds = item.getBoundingClientRect();
          const centerX = bounds.left + bounds.width / 2;
          const centerY = bounds.top + bounds.height / 2;
          const distance = Math.hypot(pointerClientX - centerX, pointerClientY - centerY);
          item.classList.toggle('is-near', distance < 170);
        });

        if (eye && eyePupil && eyeCenter) {
          const point = toSvgPoint(pointerClientX, pointerClientY);
          if (point) {
            const offsetX = point.x - eyeCenter.x;
            const offsetY = point.y - eyeCenter.y;
            const distance = Math.hypot(offsetX, offsetY);
            const pupilTravel = 36;
            const scale = Math.min(1, pupilTravel / Math.max(distance, pupilTravel));
            eyeTargetX = offsetX * scale;
            eyeTargetY = offsetY * scale;
            eyeReturning = false;
            requestEyeRender();
          }
        }
      };

      hero.addEventListener('pointermove', function (event) {
        const bounds = hero.getBoundingClientRect();
        pointerClientX = event.clientX;
        pointerClientY = event.clientY;
        pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
        if (pointerFrame) return;
        pointerFrame = window.requestAnimationFrame(renderGeometry);
      });

      hero.addEventListener('pointerleave', function () {
        pointerX = 0;
        pointerY = 0;
        pointerClientX = 0;
        pointerClientY = 0;
        layers.forEach(function (layer) { layer.style.transform = ''; });
        focusItems.forEach(function (item) { item.classList.remove('is-near'); });
        eyeTargetX = 0;
        eyeTargetY = 0;
        eyeReturning = true;
        requestEyeRender();
      });
    }
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
