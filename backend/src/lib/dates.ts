// Users are in Indonesia; "today" and "this week" follow Western Indonesia Time (UTC+7, no DST).
export const APP_TIME_ZONE = "Asia/Jakarta";
const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day in Jakarta, e.g. "2026-10-06". */
export function localDayKey(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of the current Jakarta week (Monday 00:00), as a UTC instant. */
export function startOfLocalWeek(now = new Date()): Date {
  const local = new Date(now.getTime() + OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocalMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday);
  return new Date(mondayLocalMidnight - OFFSET_MS);
}

/** Consecutive active days ending today (or yesterday, so the streak survives until the day ends). */
export function streakDays(activityDays: Iterable<string>, now = new Date()): number {
  const days = new Set(activityDays);
  let cursor = now.getTime();
  if (!days.has(localDayKey(new Date(cursor)))) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(localDayKey(new Date(cursor)))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export function formatLocal(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleString("en-GB", { timeZone: APP_TIME_ZONE, ...options });
}

/** Week number (1-based) of `date` within a plan that started on `startDate`. */
export function planWeekNumber(startDate: Date, date = new Date()): number {
  const start = startOfLocalWeek(startDate);
  return Math.floor((date.getTime() - start.getTime()) / (7 * DAY_MS)) + 1;
}
