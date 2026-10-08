import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDates, moveCalendar, uniqueDates } from '../src/lib/calendar.js';
test('calendar grids cover leap months and week/year boundaries using local dates', () => {
  const feb = calendarDates(new Date(2024, 1, 19), 'month');
  assert.equal(feb.filter(Boolean).length, 29);
  assert.equal(feb.length % 7, 0);
  assert.equal(feb.filter(Boolean).at(-1), '2024-02-29');
  assert.deepEqual(calendarDates(new Date(2026, 0, 1), 'week'), [
    '2025-12-28',
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
  ]);
});
test('month navigation cannot skip February when moving from the 31st', () => {
  const next = moveCalendar(new Date(2026, 0, 31), 'month', 1);
  assert.equal(next.getMonth(), 1);
  assert.equal(next.getDate(), 1);
  assert.equal(moveCalendar(next, 'month', -1).getMonth(), 0);
});
test('batch dates reject impossible dates and remove duplicates', () => {
  assert.deepEqual(
    uniqueDates(['2026-10-10', '2026-10-08', '2026-10-10', '2026-02-30', 'invalid', '']),
    ['2026-10-08', '2026-10-10'],
  );
});
