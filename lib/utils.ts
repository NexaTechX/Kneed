import { config } from '@/constants/config';

/** Portion retained by platform on creator PPV (40%). */
export const PLATFORM_FEE_PERCENT = config.platformFeePercent;

/** Legacy helper: platform fee from a gross charge amount. */
export function calculateFees(priceCents: number) {
  const platformFee = Math.round(priceCents * PLATFORM_FEE_PERCENT);
  const total = priceCents;
  return { platformFee, total };
}

/** A stored media value is a public URL (free content) or a private object path (paid/private). */
export function isPublicUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: config.displayCurrencyCode,
  }).format(cents / 100);
}
