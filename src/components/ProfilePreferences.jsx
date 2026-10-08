import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
export default function ProfilePreferences() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="preferences-card">
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h2>Your little preferences</h2>
      <div className="preference-row">
        <div>
          <strong>Appearance</strong>
          <p>A softer workspace, day or night.</p>
        </div>
        <div className="theme-segment" role="group" aria-label="Color theme">
          {[
            ['system', Monitor],
            ['light', Sun],
            ['dark', Moon],
          ].map(([value, Icon]) => (
            <button key={value} onClick={() => setTheme(value)} aria-pressed={theme === value}>
              <Icon size={15} />
              {value}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
