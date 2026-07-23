(function () {
  const toggle = document.getElementById('theme-toggle');

  function syncLabel() {
    const dark = document.documentElement.classList.contains('dark');
    if (toggle) {
      toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    syncLabel();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      applyTheme(!document.documentElement.classList.contains('dark'));
    });
  }

  syncLabel();
})();
