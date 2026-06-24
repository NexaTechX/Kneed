import { describe, expect, it } from 'vitest';
import { calculateFees, formatCents, isPublicUrl, PLATFORM_FEE_PERCENT } from './utils';

describe('calculateFees', () => {
  it('applies platform fee percent from gross', () => {
    const { platformFee } = calculateFees(10000);
    expect(platformFee).toBe(Math.round(10000 * PLATFORM_FEE_PERCENT));
  });
});

describe('formatCents', () => {
  it('formats kobo into a currency string with the major unit', () => {
    expect(formatCents(150000)).toContain('1,500');
  });
});

describe('isPublicUrl', () => {
  it('treats http(s) values as public URLs', () => {
    expect(isPublicUrl('https://cdn.example.com/a.jpg')).toBe(true);
    expect(isPublicUrl('http://example.com/x')).toBe(true);
  });
  it('treats storage object paths and empties as private', () => {
    expect(isPublicUrl('user-id/posts/123.jpg')).toBe(false);
    expect(isPublicUrl('')).toBe(false);
    expect(isPublicUrl(null)).toBe(false);
    expect(isPublicUrl(undefined)).toBe(false);
  });
});
