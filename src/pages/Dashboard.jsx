import ThemedIcon from '../components/ui/ThemedIcon';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowUpRight,
  Microscope,
  CalendarDays,
  NotebookPen,
  TrendingUp,
  ClipboardList,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import useOverview from '../hooks/useOverview';
import { localDate } from '../lib/dates';
import Dialog from '../components/ui/Dialog';
import {
  RotationCard,
  ScheduleCard,
  QuotaCard,
  NotesCard,
} from '../components/dashboard/OverviewCards';
import CareCard from '../components/dashboard/CareCard';
export default function Dashboard() {
  const { profile } = useAuth();
  const data = useOverview();
  const [quickAdd, setQuickAdd] = useState(false);
  const today = localDate();
  const current = data.rotations.find(
    (rotation) => rotation.start_date <= today && rotation.end_date >= today,
  );
  const target = data.quotas.reduce((sum, q) => sum + q.target_count, 0);
  const completed = data.quotas.reduce(
    (sum, q) => sum + Math.min(q.completed_count, q.target_count),
    0,
  );
  const pct = target ? Math.round((completed / target) * 100) : 0;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const shiftsThisWeek = data.shifts.filter(
    (s) =>
      s.shift_type !== 'rest' &&
      s.shift_date >= localDate(weekStart) &&
      s.shift_date <= localDate(weekEnd),
  ).length;
  const stats = [
    {
      icon: Microscope,
      value: data.rotations.filter((r) => r.end_date < today).length,
      label: 'Rotations completed',
      color: 'rose',
      caption: 'Your journey so far',
    },
    {
      icon: TrendingUp,
      value: pct + '%',
      label: 'Quota progress',
      color: 'sage',
      caption: completed + ' of ' + target + ' procedures',
    },
    {
      icon: CalendarDays,
      value: shiftsThisWeek,
      label: 'Shifts this week',
      color: 'lavender',
      caption: 'A little planning helps',
    },
    {
      icon: NotebookPen,
      value: data.notes.length,
      label: 'Notes collected',
      color: 'peach',
      caption: 'Your growing knowledge',
    },
  ];
  return (
    <div className="overview-page">
      <div className="overview-heading">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <h1>
            A little more confident,
            <br />
            <em>every day.</em>
            <span className="heading-spark">
              <ThemedIcon name="Sparkles" />
            </span>
          </h1>
          <p>
            Welcome back, {profile?.full_name?.trim().split(/\s+/)[0] || 'intern'}. Let’s make room
            for a good day.
          </p>
        </div>
        <button className="button primary" onClick={() => setQuickAdd(true)}>
          <Plus size={18} />
          Quick add
        </button>
      </div>
      {data.error ? (
        <div className="overview-error" role="alert">
          <p>{data.error}</p>
          <button className="button secondary" onClick={data.retry}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="overview-stat-grid" aria-busy={data.loading}>
            {stats.map(({ icon: Icon, value, label, color, caption }) => (
              <div className="overview-stat" key={label}>
                <div className={'stat-icon ' + color}>
                  <Icon size={19} />
                </div>
                <strong>{data.loading ? '—' : value}</strong>
                <span>{label}</span>
                <small>{caption}</small>
              </div>
            ))}
          </div>
          {data.loading ? (
            <div className="overview-skeleton" role="status" aria-label="Loading your overview">
              <div />
              <div />
              <div />
            </div>
          ) : (
            <div className="overview-grid">
              <RotationCard rotation={current} />
              <ScheduleCard shifts={data.shifts} exams={data.exams} />
              <QuotaCard quotas={data.quotas} />
              <NotesCard notes={data.notes} />
            </div>
          )}
        </>
      )}
      <div className="overview-quick-links">
        <Link to="/reports?new=1">
          <ClipboardList size={18} />
          <span>Log today’s little wins</span>
          <ArrowUpRight size={16} />
        </Link>
        <Link to="/documents">
          <NotebookPen size={18} />
          <span>Keep your references close</span>
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <CareCard />
      {quickAdd && (
        <Dialog onClose={() => setQuickAdd(false)} label="Quick add">
          <div className="quick-add-sheet">
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">MAKE A LITTLE PROGRESS</p>
                <h2>What would you like to add?</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setQuickAdd(false)}
                aria-label="Close quick add"
              >
                <X size={20} />
              </button>
            </div>
            <div className="quick-add-options">
              {[
                [
                  '/reports?new=1',
                  ClipboardList,
                  'Daily report',
                  'Capture a procedure or a little win.',
                ],
                ['/shifts?new=1', CalendarDays, 'Duty shift', 'Make a plan for your next shift.'],
                ['/notes?new=1', NotebookPen, 'Personal note', 'Keep a tip or thought for later.'],
                [
                  '/rotations?new=1',
                  Microscope,
                  'Rotation',
                  'Map out the next part of your journey.',
                ],
              ].map(([to, Icon, title, description]) => (
                <Link key={to} to={to} onClick={() => setQuickAdd(false)}>
                  <span className="stat-icon rose">
                    <Icon size={21} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
