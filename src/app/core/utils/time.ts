// Small date/time helpers shared by the calendar and the event editor.

const pad = (n: number) => `${n}`.padStart(2, '0');

/** 'HH:mm' → minutes since midnight. */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → 'HH:mm' (clamped to the same day). */
export function minToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Date → 'yyyy-MM-dd' (local). */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'yyyy-MM-dd' → local Date at midnight. */
export function fromDateInput(key: string): Date {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

/** Date → 'HH:mm' (local). */
export function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
