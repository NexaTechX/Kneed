import type { TextStyle } from 'react-native';
import { colors } from '@/constants/colors';

/** Font family names must match useFonts() keys in app/_layout.tsx */
export const fonts = {
  serifBold: 'Cormorant_700Bold',
  serifSemi: 'Cormorant_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const textStyles = {
  heroSerif: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.brown,
  },
  titleSerif: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.brownDark,
  },
  screenTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.brownDark,
  },
  headline: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.brown,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brown,
  },
  bodyMuted: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.stone,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.stone,
  },
  overline: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.stone,
  },
} as const satisfies Record<string, TextStyle>;
