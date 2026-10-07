export function localDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function displayDate(value, options = { month: 'short', day: 'numeric' }) {
  return new Date(value + 'T12:00:00').toLocaleDateString('en-US', options);
}
export function displayTime(value) {
  if (!value) return '';
  const [hour, minute] = value.split(':');
  return (Number(hour) % 12 || 12) + ':' + minute + (Number(hour) >= 12 ? ' PM' : ' AM');
}
