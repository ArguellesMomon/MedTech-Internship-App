import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { ThemeContext, useTheme } from './ThemeContext';
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('medtech-theme') || 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    try {
      localStorage.setItem('medtech-theme', theme);
    } catch {
      /* preference remains available for this session */
    }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = ['system', 'light', 'dark'];
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const next = options[(options.indexOf(theme) + 1) % options.length];
  return (
    <button
      className="theme-toggle icon-button"
      onClick={() => setTheme(next)}
      aria-label={'Theme: ' + theme + '. Switch to ' + next + ' mode'}
      title={'Theme: ' + theme}
    >
      <Icon size={19} />
    </button>
  );
}
