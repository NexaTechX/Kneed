import { describe, expect, it } from 'vitest';
import { calculateFees, PLATFORM_FEE_PERCENT } from './utils';

describe('calculateFees', () => {
  it('applies platform fee percent from gross', () => {
    const { platformFee } = calculateFees(10000);
    expect(platformFee).toBe(Math.round(10000 * PLATFORM_FEE_PERCENT));
  });
});
