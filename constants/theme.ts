/**
 * Semantic colors for light/dark. Prefer `useAppTheme()` in components over raw hex.
 * Light theme is tuned for a calm, editorial social surface (neutral base + warm accent).
 */
export type AppTheme = {
  scheme: 'light' | 'dark';
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  /** Subtle strip behind composer / secondary panels */
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Primary actions (solid buttons) */
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  /** Brand accent — links, badges, highlights */
  accent: string;
  accentMuted: string;
  error: string;
  success: string;
  warning: string;
  tabBar: string;
  tabBarBorder: string;
  /** iOS shadow color */
  shadow: string;
  chipBackground: string;
  chipBorder: string;
  chipText: string;
  chipActiveBackground: string;
  chipActiveText: string;
  inputBackground: string;
  link: string;
};

export const lightTheme: AppTheme = {
  scheme: 'light',
  background: '#F4F4F5',
  backgroundSecondary: '#E4E4E7',
  surface: '#FAFAFA',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  text: '#09090B',
  textSecondary: '#52525B',
  textTertiary: '#71717A',
  primary: '#18181B',
  primaryMuted: '#E4E4E7',
  onPrimary: '#FAFAFA',
  secondary: '#3F3F46',
  onSecondary: '#FAFAFA',
  accent: '#C24133',
  accentMuted: '#FCE8E6',
  error: '#BE123C',
  success: '#15803D',
  warning: '#C2410C',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
  shadow: 'rgba(9, 9, 11, 0.08)',
  chipBackground: '#FFFFFF',
  chipBorder: '#E4E4E7',
  chipText: '#18181B',
  chipActiveBackground: '#18181B',
  chipActiveText: '#FAFAFA',
  inputBackground: '#FFFFFF',
  link: '#C24133',
};

export const darkTheme: AppTheme = {
  scheme: 'dark',
  background: '#09090B',
  backgroundSecondary: '#18181B',
  surface: '#0C0C0E',
  surfaceElevated: '#18181B',
  surfaceMuted: '#121214',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  primary: '#FAFAFA',
  primaryMuted: '#27272A',
  onPrimary: '#09090B',
  secondary: '#A1A1AA',
  onSecondary: '#09090B',
  accent: '#F87171',
  accentMuted: '#450A0A',
  error: '#FB7185',
  success: '#4ADE80',
  warning: '#FDBA74',
  tabBar: '#09090B',
  tabBarBorder: '#27272A',
  shadow: 'rgba(0, 0, 0, 0.55)',
  chipBackground: '#18181B',
  chipBorder: '#3F3F46',
  chipText: '#FAFAFA',
  chipActiveBackground: '#FAFAFA',
  chipActiveText: '#09090B',
  inputBackground: '#18181B',
  link: '#F87171',
};

export function navigationThemeColors(t: AppTheme) {
  return {
    primary: t.primary,
    background: t.background,
    card: t.surfaceElevated,
    text: t.text,
    border: t.border,
    notification: t.primary,
  };
}
