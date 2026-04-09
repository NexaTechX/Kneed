/**
 * Semantic colors for light/dark. Prefer `useAppTheme()` in components over raw hex.
 */
export type AppTheme = {
  scheme: 'light' | 'dark';
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
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
  background: '#F3F0EA',
  backgroundSecondary: '#E8E4DC',
  surface: '#FFFCF8',
  surfaceElevated: '#FFFFFF',
  border: '#E2DDD4',
  borderStrong: '#CFC7BA',
  text: '#161412',
  textSecondary: '#5E5852',
  textTertiary: '#8C8680',
  primary: '#C25645',
  primaryMuted: '#EDD9D4',
  onPrimary: '#FFFFFF',
  secondary: '#5F6F5C',
  onSecondary: '#FFFFFF',
  error: '#B84040',
  success: '#2F6F4B',
  warning: '#B86A2C',
  tabBar: '#FFFCF8',
  tabBarBorder: '#E2DDD4',
  shadow: 'rgba(22, 20, 18, 0.12)',
  chipBackground: '#FFFCF8',
  chipBorder: '#D4CEC4',
  chipText: '#161412',
  chipActiveBackground: '#C25645',
  chipActiveText: '#FFFFFF',
  inputBackground: '#FFFFFF',
  link: '#C25645',
};

export const darkTheme: AppTheme = {
  scheme: 'dark',
  background: '#0F0E0D',
  backgroundSecondary: '#181716',
  surface: '#1A1917',
  surfaceElevated: '#22211E',
  border: '#2F2D29',
  borderStrong: '#3D3A35',
  text: '#F5F2EC',
  textSecondary: '#A9A39A',
  textTertiary: '#7A756D',
  primary: '#E07A66',
  primaryMuted: '#3D2824',
  onPrimary: '#1A0F0D',
  secondary: '#8FA38C',
  onSecondary: '#121110',
  error: '#E07070',
  success: '#6BC49A',
  warning: '#E0A050',
  tabBar: '#1A1917',
  tabBarBorder: '#2F2D29',
  shadow: 'rgba(0, 0, 0, 0.45)',
  chipBackground: '#22211E',
  chipBorder: '#3D3A35',
  chipText: '#F5F2EC',
  chipActiveBackground: '#E07A66',
  chipActiveText: '#1A0F0D',
  inputBackground: '#22211E',
  link: '#E07A66',
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
