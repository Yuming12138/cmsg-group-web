/* Match the restrained headline typing of the standalone replica. The heading's
   accessible name is complete, and each line keeps its height while typing. */
(function () {
  'use strict';
  const lines = Array.from(document.querySelectorAll('[data-typewriter]'));
  if (!lines.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  let lineIndex = 0;
  let characterIndex = 0;
  const finish = function () {
    window.clearTimeout(timer);
    lines.forEach(function (line) {
      line.textContent = line.dataset.typewriter;
      line.classList.remove('is-typing');
    });
  };
  const tick = function () {
    const line = lines[lineIndex];
    line.classList.add('is-typing');
    line.textContent = line.dataset.typewriter.slice(0, ++characterIndex);
    if (characterIndex < line.dataset.typewriter.length) {
      timer = window.setTimeout(tick, 28);
    } else {
      line.classList.remove('is-typing');
      if (++lineIndex < lines.length) {
        characterIndex = 0;
        timer = window.setTimeout(tick, 100);
      }
    }
  };
  lines.forEach(function (line) { line.textContent = ''; });
  timer = window.setTimeout(tick, 450);
  motion.addEventListener('change', function (event) { if (event.matches) finish(); });
  window.addEventListener('pagehide', finish, { once: true });
  window.addEventListener('pageshow', function (event) { if (event.persisted) finish(); });
}());
