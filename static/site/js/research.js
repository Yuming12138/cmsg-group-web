(() => {
  const language = document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  document.querySelectorAll('.research-detail [data-lang]').forEach((node) => {
    node.hidden = node.dataset.lang !== language;
  });
})();
