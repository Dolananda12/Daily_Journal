const LATE_NIGHT_CUTOFF_HOUR = 2; // entries editable until 2 AM

export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the "effective today" for journalling.
 * Before 2 AM, rolls back to yesterday so you can still finish last night's entry.
 */
export function getEffectiveTodayString(): string {
  const now = new Date();
  if (now.getHours() < LATE_NIGHT_CUTOFF_HOUR) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return localDateString(yesterday);
  }
  return localDateString(now);
}

export function getTodayString(): string {
  return localDateString();
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > localDateString();
}

export function isToday(dateStr: string): boolean {
  return dateStr === getEffectiveTodayString();
}

export function isPastDate(dateStr: string): boolean {
  return dateStr < getEffectiveTodayString();
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getMissedDaysThisWeek(entryDates: string[]): number {
  const today = localDateString();
  const base = new Date();
  let missed = 0;
  for (let i = 6; i >= 1; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const dStr = localDateString(d);
    if (dStr < today && !entryDates.includes(dStr)) {
      missed++;
    }
  }
  return missed;
}
