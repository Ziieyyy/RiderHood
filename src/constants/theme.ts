import { Platform } from 'react-native';

export const COLORS = {
  background: '#111111',
  surface: '#1C1C1E',
  surfaceContainer: '#252525',
  surfaceElevated: '#2A2A2A',
  surfaceHighest: '#353534',
  
  primary: '#FF7A00', // Safety Orange
  primaryHover: '#FF8F2B',
  primaryLight: '#FF9533',
  primaryDim: '#FFB68B',
  primaryDark: '#522300',
  primaryGlow: 'rgba(255, 122, 0, 0.25)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#70655E',

  border: '#2D2D2D',
  borderHighlight: '#584235',
  borderActive: '#FF7A00',

  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#FACC15',
  warningBg: 'rgba(250, 204, 21, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  
  glassBackground: 'rgba(28, 28, 30, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // Compat for Expo template components
  text: '#FFFFFF',
  tint: '#FF7A00',
  icon: '#A0A0A0',
  tabIconDefault: '#A0A0A0',
  tabIconSelected: '#FF7A00',
  backgroundElement: '#252525',
  backgroundSelected: '#FF8F2B',
};

export const RADIUS = {
  card: 20,
  button: 18,
  chip: 12,
  round: 9999,
};

export const Colors = {
  light: COLORS,
  dark: COLORS,
};

export type ThemeColor = keyof typeof COLORS;

export const Fonts = {
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
};

export const Spacing = {
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 40,
  six: 48,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const MaxContentWidth = 1200;
export const BottomTabInset = 80;

export const SHADOWS = {
  orangeGlow: {
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
};
