import { site } from '@/config/site';
import type { Branch } from '@/data/places';

/**
 * "Now" expressed in UAE wall-clock time (GST, UTC+4, no DST).
 * The returned Date's UTC fields hold the UAE time — use getUTC* on it.
 */
export function uaeNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + site.utcOffsetHours * 3600_000);
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export type BranchStatus =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string | null; opensDay: number | null };

/** Open/closed status of a branch, computed from its hours in UAE time. */
export function branchStatus(b: Branch, now: Date = new Date()): BranchStatus {
  const u = uaeNow(now);
  const day = u.getUTCDay();
  const mins = u.getUTCHours() * 60 + u.getUTCMinutes();

  for (const [o, c] of b.hours[day] ?? []) {
    if (mins >= toMin(o) && mins < toMin(c)) return { open: true, closesAt: c };
  }
  // Next opening: later today, else the following days.
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    for (const [o] of b.hours[d] ?? []) {
      if (i > 0 || toMin(o) > mins) return { open: false, opensAt: o, opensDay: i === 0 ? null : d };
    }
  }
  return { open: false, opensAt: null, opensDay: null };
}

export type SlotDay = { offset: number; date: string; weekday: number };

/** Next N calendar days in UAE time (offset 0 = today). */
export function slotDays(n: number, now: Date = new Date()): SlotDay[] {
  const u = uaeNow(now);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate() + i));
    return { offset: i, date: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
  });
}

/** Whether a delivery slot can still be booked (same-day slots close before they start). */
export function slotAvailable(dayOffset: number, startHour: number, now: Date = new Date()): boolean {
  if (dayOffset > 0) return true;
  const u = uaeNow(now);
  const mins = u.getUTCHours() * 60 + u.getUTCMinutes();
  return startHour * 60 - mins >= site.delivery.cutoffMinutes;
}

/** First bookable slot, used for the "delivered by" estimate. */
export function firstSlot(now: Date = new Date()) {
  for (const day of slotDays(site.delivery.daysAhead, now)) {
    const s = site.delivery.slots.find((sl) => slotAvailable(day.offset, sl.start, now));
    if (s) return { day, slot: s };
  }
  return null;
}
