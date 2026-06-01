import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, toggleTheme } from '../theme';

// Icon button that flips between light and dark mode. Stays in sync with any
// other toggle on the page via the custom 'dm-themechange' event.
export default function ThemeToggle({ className = '' }) {
  const [theme, setThemeState] = useState(getTheme());

  useEffect(() => {
    const sync = () => setThemeState(getTheme());
    window.addEventListener('dm-themechange', sync);
    return () => window.removeEventListener('dm-themechange', sync);
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={() => setThemeState(toggleTheme())}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
