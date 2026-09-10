(function () {
  const dialog = document.querySelector('[data-alumni-profile-dialog]');
  const triggers = document.querySelectorAll('[data-alumni-profile-trigger]');
  if (!dialog || !triggers.length) return;

  const image = dialog.querySelector('[data-alumni-profile-image]');
  const name = dialog.querySelector('[data-alumni-profile-name]');
  const role = dialog.querySelector('[data-alumni-profile-role]');
  const destination = dialog.querySelector('[data-alumni-profile-destination]');
  const email = dialog.querySelector('[data-alumni-profile-email]');
  const closeButtons = dialog.querySelectorAll('[data-alumni-profile-close]');
  let activeTrigger = null;

  const setOptionalText = function (element, value) {
    element.textContent = value;
    element.hidden = !value;
  };

  const closeDialog = function () {
    if (dialog.open) dialog.close();
  };

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      const photoSrc = trigger.dataset.photoSrc;
      const memberName = trigger.dataset.memberName || '';

      if (typeof dialog.showModal !== 'function') {
        if (photoSrc) window.open(photoSrc, '_blank', 'noopener,noreferrer');
        return;
      }

      activeTrigger = trigger;
      name.textContent = memberName;
      setOptionalText(role, trigger.dataset.memberRole || '');
      setOptionalText(destination, trigger.dataset.memberDestination || '');
      const memberEmail = trigger.dataset.memberEmail || '';
      email.textContent = memberEmail;
      email.href = memberEmail ? `mailto:${memberEmail}` : '';
      email.hidden = !memberEmail;
      if (photoSrc) {
        image.alt = memberName;
        image.src = photoSrc;
        image.hidden = false;
      }
      document.documentElement.classList.add('has-alumni-dialog');
      dialog.showModal();
      window.requestAnimationFrame(function () {
        const initialFocus = dialog.querySelector('.alumni-profile-dialog__icon-close');
        if (initialFocus) initialFocus.focus();
      });
    });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener('click', closeDialog);
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) closeDialog();
  });

  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('has-alumni-dialog');
    image.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
    name.textContent = '';
    setOptionalText(role, '');
    setOptionalText(destination, '');
    email.textContent = '';
    email.removeAttribute('href');
    email.hidden = true;
    if (activeTrigger) activeTrigger.focus();
    activeTrigger = null;
  });
}());
