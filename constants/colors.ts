export const colors = {
  coral: '#E07A5F',
  dustyrose: '#D4A5A5',
  cream: '#F5F1ED',
  charcoal: '#2C2C2C',
  stone: '#8B8B8B',
  white: '#FFFFFF',
  error: '#C45C5C',
  success: '#5C8C5C',
} as const;

export type ColorKey = keyof typeof colors;
