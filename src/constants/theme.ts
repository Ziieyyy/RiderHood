import { Platform } from 'react-native';

export const COLORS = {
  // Theme Backgrounds
  background: '#0A0C10',
  secondaryBackground: '#101318',
  cards: '#151922',
  elevatedCards: '#1B202A',
  
  // Legacy aliases for components
  surface: '#101318',
  surfaceContainer: '#151922',
  surfaceElevated: '#1B202A',
  surfaceHighest: '#242B38',

  // Brand Oranges
  primary: '#FF6B00',        // Primary Orange
  secondaryOrange: '#F59E0B', // Secondary Orange
  primaryHover: '#FF8533',
  primaryLight: '#FF994D',
  primaryDim: '#FFB880',
  primaryDark: '#662B00',
  primaryGlow: 'rgba(255, 107, 0, 0.25)',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Borders
  border: '#1E2530',
  borderHighlight: '#28303F',
  borderActive: '#FF6B00',

  // Status & Accents
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  
  glassBackground: 'rgba(21, 25, 34, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // Compatibility tokens
  text: '#FFFFFF',
  tint: '#FF6B00',
  icon: '#A1A1AA',
  tabIconDefault: '#A1A1AA',
  tabIconSelected: '#FF6B00',
  backgroundElement: '#151922',
  backgroundSelected: '#FF6B00',
};

export const RADIUS = {
  card: 16,
  button: 12,
  chip: 8,
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

export const MaxContentWidth = 1400;
export const BottomTabInset = 80;

export const SHADOWS = {
  orangeGlow: {
    shadowColor: '#FF6B00',
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
