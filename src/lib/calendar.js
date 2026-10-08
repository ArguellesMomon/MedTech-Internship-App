import { localDate } from './dates.js';
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function calendarDates(cursor, view) {
  const date = new Date(cursor);
  date.setHours(12, 0, 0, 0);
  if (view === 'week') {
    date.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(date);
      day.setDate(date.getDate() + i);
      return localDate(day);
    });
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: count }, (_, i) =>
      localDate(new Date(date.getFullYear(), date.getMonth(), i + 1, 12)),
    ),
  ];
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function moveCalendar(cursor, view, direction) {
  const date = new Date(cursor);
  if (view === 'month') return new Date(date.getFullYear(), date.getMonth() + direction, 1, 12);
  date.setDate(date.getDate() + direction * 7);
  return date;
}
export function uniqueDates(dates) {
  return [...new Set(dates)]
    .filter(
      (date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) && localDate(new Date(date + 'T12:00:00')) === date,
    )
    .sort();
}
