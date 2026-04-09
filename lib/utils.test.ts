import { describe, expect, it } from 'vitest';
import { addHours, formatISO } from 'date-fns';
import type { Availability, Booking } from '../types/database';
import { calculateFees, canCancel, generateTimeSlots, PLATFORM_FEE_PERCENT } from './utils';

describe('calculateFees', () => {
  it('applies platform fee percent and totals', () => {
    const { platformFee, total } = calculateFees(10000);
    expect(platformFee).toBe(Math.round(10000 * PLATFORM_FEE_PERCENT));
    expect(total).toBe(10000 + platformFee);
  });
});

describe('canCancel', () => {
  const base: Booking = {
    id: '1',
    client_id: 'c',
    provider_id: 'p',
    service_id: 's',
    scheduled_at: formatISO(addHours(new Date(), 48)),
    location_type: 'studio',
    address: null,
    status: 'pending',
    price_cents: 1000,
    platform_fee_cents: 150,
    total_cents: 1150,
    notes: null,
    created_at: new Date().toISOString(),
    cancelled_at: null,
    cancellation_reason: null,
    paystack_reference: null,
    payment_status: 'unpaid',
  };

  it('allows cancel when more than 24h before', () => {
    expect(canCancel(base)).toBe(true);
  });

  it('disallows cancel inside 24h', () => {
    const soon: Booking = {
      ...base,
      scheduled_at: formatISO(addHours(new Date(), 2)),
    };
    expect(canCancel(soon)).toBe(false);
  });

  it('disallows cancel when already cancelled or completed', () => {
    expect(canCancel({ ...base, status: 'cancelled' })).toBe(false);
    expect(canCancel({ ...base, status: 'completed' })).toBe(false);
  });
});

describe('generateTimeSlots', () => {
  const day = new Date(2026, 5, 15, 12, 0, 0);
  const availability: Availability = {
    id: 'a',
    provider_id: 'p',
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '10:00:00',
    is_active: true,
  };

  it('returns empty when no availability', () => {
    expect(generateTimeSlots(null, day, [])).toEqual([]);
  });

  it('returns empty when day is inactive', () => {
    expect(generateTimeSlots({ ...availability, is_active: false }, day, [])).toEqual([]);
  });
});
