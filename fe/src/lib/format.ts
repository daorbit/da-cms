const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const sameYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const otherYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** "just now", "5 minutes ago", "yesterday", then a short date once it is over a week old. */
export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const at = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.round((at.getTime() - Date.now()) / 1000);
  const elapsed = Math.abs(seconds);

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return relative.format(Math.round(seconds / MINUTE), 'minute');
  if (elapsed < DAY) return relative.format(Math.round(seconds / HOUR), 'hour');
  if (elapsed < WEEK) return relative.format(Math.round(seconds / DAY), 'day');

  return (at.getFullYear() === new Date().getFullYear() ? sameYear : otherYear).format(at);
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
