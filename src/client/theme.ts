// Theme system — sync with OpenClaw Control UI

const STORAGE_KEY = 'openclaw.control.settings.v1.theme';
const DASHBOARD_THEME_KEY = 'openclaw-dashboard-theme';

export type Theme = 'dark' | 'light' | 'system';

export function getTheme(): Theme {
  // Try Control UI setting first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.theme) return settings.theme as Theme;
    }
  } catch { /* ignore */ }

  // Fall back to dashboard's own setting
  const dashTheme = localStorage.getItem(DASHBOARD_THEME_KEY);
  if (dashTheme) return dashTheme as Theme;

  return 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(DASHBOARD_THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme?: Theme): void {
  const t = theme ?? getTheme();
  const resolved = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;

  document.documentElement.setAttribute('data-theme', resolved);
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system');
  });
}
