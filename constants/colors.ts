/**
 * Light-mode brand primitives. New UI should use `useAppTheme()` from `@/hooks/useAppTheme`.
 */
export const colors = {
  coral: '#C25645',
  dustyrose: '#9A8F8C',
  cream: '#F3F0EA',
  charcoal: '#161412',
  stone: '#8C8680',
  white: '#FFFCF8',
  error: '#B84040',
  success: '#2F6F4B',
} as const;

export type ColorKey = keyof typeof colors;
