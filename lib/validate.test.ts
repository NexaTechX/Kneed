import { describe, expect, it } from 'vitest';
import { ageFromDob, isValidEmail, parseAmountToCents, passwordIssue } from './validate';

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('passwordIssue', () => {
  it('flags short passwords', () => {
    expect(passwordIssue('short')).toBeTruthy();
  });
  it('accepts 8+ characters', () => {
    expect(passwordIssue('longenough')).toBeNull();
  });
});

describe('ageFromDob', () => {
  const now = new Date(2026, 5, 3); // 2026-06-03

  it('computes age before and after birthday', () => {
    expect(ageFromDob('2000-01-01', now)).toBe(26);
    expect(ageFromDob('2008-12-31', now)).toBe(17);
    expect(ageFromDob('2008-06-03', now)).toBe(18); // birthday today
  });

  it('rejects invalid dates', () => {
    expect(ageFromDob('not-a-date', now)).toBeNull();
    expect(ageFromDob('2020-13-01', now)).toBeNull();
    expect(ageFromDob('2020-02-31', now)).toBeNull();
  });
});

describe('parseAmountToCents', () => {
  it('converts NGN to integer kobo', () => {
    expect(parseAmountToCents('10')).toBe(1000);
    expect(parseAmountToCents('10.5')).toBe(1050);
  });
  it('returns 0 for invalid or negative input', () => {
    expect(parseAmountToCents('abc')).toBe(0);
    expect(parseAmountToCents('-5')).toBe(0);
    expect(parseAmountToCents('')).toBe(0);
  });
});
