/** ISO 4217 code for UI formatting (align with Paystack / EXPO_PUBLIC_DISPLAY_CURRENCY). */
const displayCurrency =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_DISPLAY_CURRENCY) || 'NGN';
const proximityThresholdRaw =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_PROXIMITY_THRESHOLD_METERS) || '100';
const proximityThreshold = Number.parseInt(proximityThresholdRaw, 10);

export const config = {
  appName: 'Knead',
  defaultSearchRadiusMiles: 25,
  /** PPV: platform keeps this fraction of gross (matches DB check). */
  platformFeePercent: 0.4,
  minTouchSize: 44,
  tabBarHeight: 60,
  proximityMatchThresholdMeters: Number.isFinite(proximityThreshold) ? proximityThreshold : 100,
  /** e.g. USD, NGN, GHS — set EXPO_PUBLIC_DISPLAY_CURRENCY in .env */
  displayCurrencyCode: displayCurrency,
} as const;
