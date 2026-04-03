/**
 * Theme toggle — dark / light
 * Persists preference in localStorage; falls back to system preference.
 */
(function () {
    const STORAGE_KEY = 'workai-theme';
    const html = document.documentElement;
    const toggle = document.getElementById('theme-toggle');

    // Resolve initial theme
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    html.setAttribute('data-theme', initial);
    updateIcon(initial);

    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            localStorage.setItem(STORAGE_KEY, next);
            updateIcon(next);
        });
    }

    function updateIcon(theme) {
        if (!toggle) return;
        // Sun for dark mode (click to switch to light), moon for light mode
        toggle.textContent = theme === 'dark' ? '\u2600' : '\u263E';
    }
})();
