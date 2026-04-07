/** Knead design tokens — warm neutrals, coral, dusty rose (matches hi-fi mockups) */
export const colors = {
  // Core PRD
  coral: '#E07A5F',
  dustyrose: '#D4A5A5',
  cream: '#F5F1ED',
  charcoal: '#2C2C2C',
  stone: '#8B8B8B',
  white: '#FFFFFF',

  // Extended UI
  background: '#FDFBF7',
  backgroundAlt: '#FFFBF7',
  mauve: '#4A3731',
  brown: '#4D3636',
  brownDark: '#5C3D3D',
  coralBright: '#F58E71',
  coralAccent: '#FF8C69',
  terracotta: '#A0522D',
  dustyRoseCard: '#C99696',
  teal: '#2D6B6B',
  tealDeep: '#1F4F4F',
  badgePink: '#FCE4E4',
  badgeRose: '#E8C4C4',
  segmentBg: '#E8D5D5',
  outline: '#D4B5B0',
  borderLight: '#E8E0DC',

  error: '#C45C5C',
  success: '#5C8C5C',
  verifiedGreen: '#3D8B6E',
} as const;

export type ColorKey = keyof typeof colors;
