import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@little-office/shared';

const KEY = 'little-office:theme';

function readSaved(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage blocked — fall through to default */
  }
  return 'light';
}

/**
 * Day/night preference. Milestone 1 keeps it in localStorage (a harmless
 * preference, not identity); Milestone 3 moves it to the user's DB row.
 * Setting data-theme on <html> lets plain CSS variables re-skin the UI.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readSaved);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  return { theme, toggle };
}
