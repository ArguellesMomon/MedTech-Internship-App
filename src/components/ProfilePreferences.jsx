import { useState } from 'react';
import { Sun, Moon, Monitor, Download, RotateCcw, X } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
import { isDemoMode, resetDemo } from '../lib/demo';
import { localDate } from '../lib/dates';
import Dialog from './ui/Dialog';
export default function ProfilePreferences() {
  const { theme, setTheme } = useTheme();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  async function exportData() {
    setBusy(true);
    setMessage('');
    try {
      const tables = [
        'rotations',
        'shifts',
        'exams',
        'daily_reports',
        'quotas',
        'notes',
        'documents',
        'mood_logs',
        'chat_messages',
      ];
      const rows = await Promise.all(
        tables.map((table) => supabase.from(table).select('*').eq('user_id', user.id)),
      );
      if (rows.some((row) => row.error))
        throw new Error('Your backup couldn’t finish. Please try again.');
      const data = {
        exported_at: new Date().toISOString(),
        profile,
        ...Object.fromEntries(tables.map((table, i) => [table, rows[i].data])),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'medtech-mate-' + localDate() + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        'Your workspace backup is ready. Document files remain in your library; the backup contains their details.',
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
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
      <div className="preference-row">
        <div>
          <strong>A copy of your journey</strong>
          <p>Download your records as a JSON backup.</p>
        </div>
        <button className="button secondary" disabled={busy} onClick={exportData}>
          <Download size={16} />
          {busy ? 'Preparing…' : 'Export data'}
        </button>
      </div>
      {isDemoMode() && (
        <div className="preference-row">
          <div>
            <strong>A fresh demo</strong>
            <p>Reset sample records on this device.</p>
          </div>
          <button className="button secondary" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} />
            Reset demo
          </button>
        </div>
      )}
      <p className="preferences-message" role="status">
        {message}
      </p>
      {confirm && (
        <Dialog onClose={() => setConfirm(false)} label="Reset demo">
          <div className="quick-add-sheet">
            <div className="sheet-heading">
              <h2>A fresh start?</h2>
              <button
                className="icon-button"
                onClick={() => setConfirm(false)}
                aria-label="Close reset confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <p>
              Resetting replaces changes in this demo with the original sample records. Your real
              account is unaffected.
            </p>
            <div className="reset-actions">
              <button className="button secondary" onClick={() => setConfirm(false)}>
                Keep my changes
              </button>
              <button className="button primary" onClick={resetDemo}>
                Reset demo
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
