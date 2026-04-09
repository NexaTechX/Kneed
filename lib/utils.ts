import { addMinutes, differenceInHours, isSameDay, parseISO, setHours, setMinutes } from 'date-fns';
import type { Availability, Booking } from '@/types/database';
import { config } from '@/constants/config';

export const PLATFORM_FEE_PERCENT = config.platformFeePercent;

export function calculateFees(priceCents: number) {
  const platformFee = Math.round(priceCents * PLATFORM_FEE_PERCENT);
  const total = priceCents + platformFee;
  return { platformFee, total };
}

export function canCancel(booking: Booking): boolean {
  const hoursUntil = differenceInHours(parseISO(booking.scheduled_at), new Date());
  return hoursUntil >= 24 && booking.status !== 'cancelled' && booking.status !== 'completed';
}

function parseTimeOnDate(day: Date, timeStr: string): Date {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  let d = setHours(day, h);
  d = setMinutes(d, m);
  return d;
}

export type BookingBlock = {
  scheduled_at: string;
  duration_min: number;
  status: Booking['status'];
};

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function generateTimeSlots(
  availability: Availability | null | undefined,
  day: Date,
  existingBookings: BookingBlock[],
  slotMinutes = 30,
): Date[] {
  if (!availability || !availability.is_active) return [];

  const start = parseTimeOnDate(day, availability.start_time);
  const end = parseTimeOnDate(day, availability.end_time);

  const slots: Date[] = [];
  let cursor = start;
  while (cursor < end) {
    const slotEnd = addMinutes(cursor, slotMinutes);
    if (slotEnd > end) break;

    const overlaps = existingBookings.some((b) => {
      if (b.status === 'cancelled') return false;
      const bStart = parseISO(b.scheduled_at);
      if (!isSameDay(bStart, day)) return false;
      const bEnd = addMinutes(bStart, b.duration_min);
      return rangesOverlap(cursor, slotEnd, bStart, bEnd);
    });

    if (!overlaps) slots.push(cursor);
    cursor = slotEnd;
  }

  return slots;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: config.displayCurrencyCode,
  }).format(cents / 100);
}
