import { config } from '@/constants/config';

/** Portion retained by platform on creator PPV (40%). */
export const PLATFORM_FEE_PERCENT = config.platformFeePercent;

/** Legacy helper: platform fee from a gross charge amount. */
export function calculateFees(priceCents: number) {
  const platformFee = Math.round(priceCents * PLATFORM_FEE_PERCENT);
  const total = priceCents;
  return { platformFee, total };
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: config.displayCurrencyCode,
  }).format(cents / 100);
}
