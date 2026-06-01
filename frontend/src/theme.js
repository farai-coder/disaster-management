// Lightweight theme (light/dark) manager. Persists the choice in localStorage
// and reflects it on <html data-theme="..."> so CSS variables can switch.

const STORAGE_KEY = 'dm-theme';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Call once, before React renders, to avoid a flash of the wrong theme.
export function initTheme() {
  applyTheme(getTheme());
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event('dm-themechange'));
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
