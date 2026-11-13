/**
 * Date helpers. The API process runs with TZ=Asia/Manila (see main.ts) and MySQL stores
 * DATETIME values in Manila time, so "local" here always means Philippine time.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Current time without milliseconds. MySQL DATETIME rounds fractions (12:00:03.6 -> 12:00:04), which
 * could put an event after a later "time out". Always use this for timestamps that get saved.
 */
export function currentDateTime(): Date {
  const now = new Date();
  now.setMilliseconds(0);
  return now;
}

/** Formats a Date as YYYY-MM-DD (local time). */
export function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateOnlyString(): string {
  return toDateOnlyString(new Date());
}

/** Parses YYYY-MM-DD into a local Date at the given time (default 00:00:00). */
export function parseDateOnly(dateOnly: string, hours = 0, minutes = 0, seconds = 0): Date {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Payment date chosen by the user (YYYY-MM-DD). If it is today, keep the current time;
 * otherwise record it at 12:00 noon of that day.
 */
export function resolvePaymentDateTime(paidOn: string | undefined): Date {
  if (!paidOn || paidOn === todayDateOnlyString()) return currentDateTime();
  return parseDateOnly(paidOn, 12);
}

/** Compact date stamp used in order numbers, e.g. 261109 for 2026-11-09. */
export function toCompactDateStamp(date: Date): string {
  return `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
