import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  Check,
  X,
  Clock,
  GraduationCap,
  Edit3,
  ArrowRight,
} from 'lucide-react';
import Dialog from '../ui/Dialog';
import CardScrollRegion from '../ui/CardScrollRegion';
import { localDate, displayDate, displayTime } from '../../lib/dates';
import { WEEKDAYS, calendarDates, moveCalendar } from '../../lib/calendar';
import '../../styles/calendar.css';
export default function ScheduleCalendar({
  shifts = [],
  exams = [],
  kind = 'shift',
  cursor,
  onCursorChange,
  onAdd,
  onEdit,
  initialView = 'week',
}) {
  const [view, setView] = useState(initialView);
  const [expanded, setExpanded] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [focused, setFocused] = useState(localDate(cursor));
  const cells = useMemo(() => calendarDates(cursor, view), [cursor, view]);
  const label =
    view === 'month'
      ? cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : displayDate(cells.find(Boolean), { month: 'short', day: 'numeric' }) +
        ' – ' +
        displayDate(cells.filter(Boolean).at(-1), { month: 'short', day: 'numeric' });
  const events = useMemo(
    () => [
      ...shifts.map((s) => ({
        ...s,
        date: s.shift_date,
        kind: 'shift',
        title: s.section_name || s.shift_type,
        subtitle:
          s.shift_type === 'rest'
            ? 'Rest day'
            : displayTime(s.start_time) + ' – ' + displayTime(s.end_time),
      })),
      ...exams.map((e) => ({
        ...e,
        date: e.exam_date,
        kind: 'exam',
        title: e.exam_name,
        subtitle: e.section_name,
      })),
    ],
    [shifts, exams],
  );
  const dayEvents = events.filter((e) => e.date === focused);
  const title = kind === 'exam' ? 'Exam calendar' : 'Your schedule';
  function navigate(direction) {
    const next = moveCalendar(cursor, view, direction);
    onCursorChange(next);
    setFocused(calendarDates(next, view).find(Boolean));
  }
  function toggleDate(date) {
    setFocused(date);
    if (selecting)
      setSelected((prev) =>
        prev.includes(date)
          ? prev.filter((d) => d !== date)
          : prev.length < 31
            ? [...prev, date]
            : prev,
      );
  }
  function add(dates) {
    setExpanded(false);
    setSelecting(false);
    setSelected([]);
    onAdd(dates);
  }
  const body = (
    <>
      <div className="schedule-toolbar">
        <div className="schedule-views" aria-label="Calendar view">
          {['week', 'month'].map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
              {v === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
        <button
          className="button secondary small"
          aria-pressed={selecting}
          onClick={() => {
            setSelecting(!selecting);
            setSelected([]);
          }}
        >
          <Check size={14} />
          {selecting ? 'Cancel selection' : 'Select days'}
        </button>
        {!selecting && (
          <button className="button primary small schedule-add" onClick={() => add(focused)}>
            <Plus size={14} />
            {kind === 'exam' ? 'Add exam' : 'Add shift'}
          </button>
        )}
      </div>
      <div className="schedule-nav">
        <button
          className="icon-button"
          aria-label="Previous calendar period"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <h4 aria-live="polite">{label}</h4>
        <button
          className="icon-button"
          aria-label="Next calendar period"
          onClick={() => navigate(1)}
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="schedule-today"
          onClick={() => {
            onCursorChange(new Date());
            setFocused(localDate());
          }}
        >
          Today
        </button>
      </div>
      {selecting && <p className="schedule-instruction">Select up to 31 dates.</p>}
      <div className={'schedule-grid ' + view} aria-label={title}>
        {WEEKDAYS.map((d) => (
          <span className="schedule-weekday" key={d}>
            {d}
          </span>
        ))}
        {cells.map((date, i) =>
          date ? (
            <div
              key={date}
              className={
                'schedule-cell' +
                (date === localDate() ? ' is-today' : '') +
                (date === focused ? ' is-focused' : '') +
                (selected.includes(date) ? ' is-selected' : '')
              }
            >
              <button
                className="schedule-day"
                aria-current={date === localDate() ? 'date' : undefined}
                aria-pressed={selecting ? selected.includes(date) : date === focused}
                aria-label={
                  (selecting ? 'Select ' : 'Show plans for ') +
                  displayDate(date, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }
                onClick={() => toggleDate(date)}
              >
                <span>{Number(date.slice(-2))}</span>
                <span className="schedule-markers" aria-hidden="true">
                  {events
                    .filter((e) => e.date === date)
                    .slice(0, 3)
                    .map((e) => (
                      <i key={e.kind + e.id} className={e.kind} />
                    ))}
                </span>
                <span className="sr-only">
                  {events.filter((e) => e.date === date).length} plans
                </span>
              </button>
              <div className="schedule-cell-events">
                {events
                  .filter((e) => e.date === date)
                  .slice(0, 2)
                  .map((e) => (
                    <button
                      key={e.kind + e.id}
                      className={'schedule-event ' + e.kind}
                      onClick={() => {
                        setFocused(date);
                        if (e.kind === kind) {
                          setExpanded(false);
                          onEdit(e);
                        }
                      }}
                      title={e.title}
                    >
                      {e.kind === 'exam' ? <GraduationCap size={12} /> : <Clock size={12} />}
                      <span>{e.title}</span>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div key={'blank' + i} className="schedule-cell blank" aria-hidden="true" />
          ),
        )}
      </div>
      {selecting ? (
        <div className="schedule-selection" role="status">
          <div>
            <strong>{selected.length} selected</strong>
          </div>
          <button
            className="button primary small schedule-continue"
            disabled={!selected.length}
            onClick={() => add([...selected].sort())}
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <section className="schedule-agenda" aria-label="Selected day plans">
          <div className="schedule-agenda-heading">
            <h4>{displayDate(focused, { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            <span>
              {dayEvents.length} plan{dayEvents.length === 1 ? '' : 's'}
            </span>
          </div>
          {dayEvents.length ? (
            <CardScrollRegion label="Plans for the selected day">
              {dayEvents.map((e) => (
                <div className="schedule-agenda-row" key={e.kind + e.id}>
                  <span className={'schedule-agenda-icon ' + e.kind}>
                    {e.kind === 'exam' ? <GraduationCap size={17} /> : <Clock size={17} />}
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <small>{e.subtitle}</small>
                  </div>
                  {e.kind === kind && (
                    <button
                      className="icon-button"
                      aria-label={'Edit ' + e.title}
                      onClick={() => {
                        setExpanded(false);
                        onEdit(e);
                      }}
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </CardScrollRegion>
          ) : (
            <p className="schedule-free">No plans for this day.</p>
          )}
        </section>
      )}
    </>
  );
  return (
    <section className="sp-card schedule-card">
      <div className="schedule-heading">
        <span className="schedule-heading-icon">
          <CalendarDays size={22} />
        </span>
        <div>
          <h3>Calendar</h3>
        </div>
        <button
          className="icon-button"
          aria-label="Expand calendar"
          onClick={() => setExpanded(true)}
        >
          <Maximize2 size={18} />
        </button>
      </div>
      {!expanded && body}
      {expanded && (
        <Dialog onClose={() => setExpanded(false)} label={title}>
          <div className="schedule-expanded">
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">YOUR PLANS</p>
                <h2>{title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close expanded calendar"
                onClick={() => setExpanded(false)}
              >
                <X size={20} />
              </button>
            </div>
            {body}
          </div>
        </Dialog>
      )}
    </section>
  );
}
