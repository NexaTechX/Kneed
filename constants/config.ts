/** ISO 4217 code for UI formatting (align with Paystack / EXPO_PUBLIC_DISPLAY_CURRENCY). */
const displayCurrency =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_DISPLAY_CURRENCY) || 'NGN';

export const config = {
  appName: 'Knead',
  defaultSearchRadiusMiles: 25,
  platformFeePercent: 0.15,
  minTouchSize: 44,
  tabBarHeight: 60,
  /** e.g. USD, NGN, GHS — set EXPO_PUBLIC_DISPLAY_CURRENCY in .env */
  displayCurrencyCode: displayCurrency,
} as const;
