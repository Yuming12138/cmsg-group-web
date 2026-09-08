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
    const layers = hero.querySelectorAll('.geometry-layer');
    const focusItems = hero.querySelectorAll('.geometry-focus');
    if (hasFinePointer && layers.length) {
      let pointerFrame = 0;
      let pointerX = 0;
      let pointerY = 0;
      let pointerClientX = 0;
      let pointerClientY = 0;
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

  revealItems.forEach(function (item) { observer.observe(item); });
}());
