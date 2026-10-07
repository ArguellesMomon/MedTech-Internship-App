import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  MapPin,
  Microscope,
  Plus,
  NotebookPen,
  Check,
  ChevronRight,
} from 'lucide-react';
import { localDate, displayDate, displayTime } from '../../lib/dates';
export function SectionHeading({ eyebrow, title, to, action = 'View all' }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {to && (
        <Link to={to}>
          {action}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function EmptyCard({ text, to, action }) {
  return (
    <div className="overview-empty">
      <span className="empty-spark">✦</span>
      <p>{text}</p>
      <Link to={to}>
        {action}
        <Plus size={14} />
      </Link>
    </div>
  );
}
export function RotationCard({ rotation }) {
  if (!rotation)
    return (
      <section className="overview-card rotation-overview">
        <SectionHeading eyebrow="ONE SECTION AT A TIME" title="Your next chapter" />
        <EmptyCard
          text="Give your internship a starting point."
          to="/rotations?new=1"
          action="Add your first rotation"
        />
      </section>
    );
  const start = new Date(rotation.start_date + 'T12:00:00'),
    end = new Date(rotation.end_date + 'T12:00:00'),
    today = new Date(localDate() + 'T12:00:00');
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const elapsed = Math.max(0, Math.min(days, Math.round((today - start) / 86400000) + 1));
  const pct = Math.round((elapsed / days) * 100);
  const left = Math.max(0, Math.round((end - today) / 86400000));
  return (
    <section className="overview-card rotation-overview">
      <div className="rotation-main">
        <p className="eyebrow">
          <span className="status-dot" />
          YOUR CURRENT ROTATION
        </p>
        <h2>{rotation.section_name}</h2>
        <p className="rotation-location">
          <MapPin size={15} />
          {rotation.hospital_site || 'Your clinical laboratory'}
        </p>
        <div className="rotation-dates">
          <CalendarDays size={15} />
          {displayDate(rotation.start_date)} — {displayDate(rotation.end_date)}
        </div>
        <Link to="/rotations" className="rotation-link">
          Explore your rotation
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="rotation-visual">
        <div className="rotation-ring" style={{ '--progress': pct + '%' }}>
          <div>
            <Microscope size={27} strokeWidth={1.5} />
            <strong>
              {left}
              <span>days to go</span>
            </strong>
          </div>
        </div>
        <span className="rotation-day">
          Day {elapsed} of {days} <span>✦</span>
        </span>
      </div>
    </section>
  );
}
export function ScheduleCard({ shifts, exams }) {
  const today = localDate();
  const agenda = [
    ...shifts
      .filter((s) => s.shift_date >= today)
      .map((s) => ({ ...s, date: s.shift_date, type: 'shift' })),
    ...exams
      .filter((e) => e.exam_date >= today)
      .map((e) => ({ ...e, date: e.exam_date, type: 'exam' })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  return (
    <section className="overview-card">
      <SectionHeading title="Coming up" to="/shifts" action="Your schedule" />
      {!agenda.length ? (
        <EmptyCard
          text="A clear calendar, a fresh start."
          to="/shifts?new=1"
          action="Plan a shift"
        />
      ) : (
        <div className="agenda-list">
          {agenda.map((item) => (
            <Link
              to="/shifts"
              state={{ tab: item.type === 'exam' ? 'exams' : 'shifts' }}
              key={item.type + item.id}
              className="agenda-row"
            >
              <div className={'agenda-date ' + (item.type === 'exam' ? 'lavender' : '')}>
                <span>{displayDate(item.date, { month: 'short' })}</span>
                <strong>{displayDate(item.date, { day: '2-digit' })}</strong>
              </div>
              <div className="agenda-copy">
                <strong>{item.type === 'exam' ? item.exam_name : item.section_name}</strong>
                <span>
                  <Clock size={12} />
                  {item.type === 'exam'
                    ? 'Practical / exam'
                    : displayTime(item.start_time) + ' – ' + displayTime(item.end_time)}
                </span>
              </div>
              <span className={'agenda-tag ' + (item.type === 'exam' ? 'lavender' : '')}>
                {item.date === today ? 'Today' : item.type === 'exam' ? 'Exam' : item.shift_type}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export function QuotaCard({ quotas }) {
  const visible = [...quotas]
    .sort(
      (a, b) =>
        a.completed_count / Math.max(1, a.target_count) -
        b.completed_count / Math.max(1, b.target_count),
    )
    .slice(0, 3);
  return (
    <section className="overview-card">
      <SectionHeading title="Every bit counts" to="/reports" action="Your quotas" />
      <p className="card-description">Small steps. Real progress.</p>
      {!visible.length ? (
        <EmptyCard
          text="Set a target and watch yourself grow."
          to="/reports"
          action="Set up quotas"
        />
      ) : (
        <div className="quota-preview-list">
          {visible.map((quota) => {
            const pct = Math.min(
              100,
              Math.round((quota.completed_count / Math.max(1, quota.target_count)) * 100),
            );
            return (
              <Link to="/reports" key={quota.id} className="quota-preview">
                <div>
                  <span>{quota.task_name}</span>
                  <strong>
                    {quota.completed_count}
                    <small> / {quota.target_count}</small>
                    {pct === 100 && <Check size={13} />}
                  </strong>
                </div>
                <div
                  className="overview-progress"
                  role="progressbar"
                  aria-label={quota.task_name}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <span style={{ width: pct + '%' }} />
                </div>
                <small>{quota.section_name}</small>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
export function NotesCard({ notes }) {
  const recent = [...notes]
    .sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at))
    .slice(0, 2);
  return (
    <section className="overview-card notebook-overview">
      <SectionHeading title="From your notebook" to="/notes" />
      {!recent.length ? (
        <EmptyCard
          text="Save the things you want to remember."
          to="/notes?new=1"
          action="Write a little note"
        />
      ) : (
        <div className="notebook-list">
          {recent.map((note) => (
            <Link to="/notes" key={note.id}>
              <div className={'notebook-icon ' + (note.is_staff_tip ? 'lavender' : '')}>
                <NotebookPen size={20} />
              </div>
              <div>
                <small>
                  {note.is_staff_tip
                    ? 'A TIP FROM YOUR SENIOR'
                    : note.section_name || 'PERSONAL NOTE'}
                </small>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
              </div>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
