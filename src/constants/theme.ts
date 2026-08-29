import { Platform } from 'react-native';

export interface ThemeColors {
  mode: 'light' | 'dark';
  background: {
    primary: string;    // Main screen background
    secondary: string;  // Cards, panels, surfaces
    tertiary: string;   // Input fields, chips, subtle containers
    elevated: string;   // Modals, popups, tooltips
  };
  text: {
    primary: string;    // Headings and high-emphasis body
    secondary: string;  // Subtitles, metadata, secondary body
    muted: string;      // Placeholders, disabled text
    inverse: string;    // Text on high-contrast accent backgrounds
  };
  accent: {
    primary: string;    // Primary brand/action color
    secondary: string;  // Supporting brand color
  };
  status: {
    success: string;    // Success alerts, verified badges
    warning: string;    // Pending states, warnings
    danger: string;     // Errors, destructive actions
    info: string;       // Notifications, informative badges
  };
  border: {
    subtle: string;     // Card borders, list dividers
    strong: string;     // Focused inputs, active tabs
  };
}

export const DARK_THEME_TOKENS: ThemeColors = {
  mode: 'dark',
  background: {
    primary: '#0A0C10',
    secondary: '#151922',
    tertiary: '#101318',
    elevated: '#1B202A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    muted: '#71717A',
    inverse: '#0A0C10',
  },
  accent: {
    primary: '#FF6B00',
    secondary: '#F59E0B',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
  },
  border: {
    subtle: '#1E2530',
    strong: '#FF6B00',
  },
};

export const LIGHT_THEME_TOKENS: ThemeColors = {
  mode: 'light',
  background: {
    primary: '#F8FAFC',
    secondary: '#FFFFFF',
    tertiary: '#F1F5F9',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },
  accent: {
    primary: '#FF6B00',
    secondary: '#D97706',
  },
  status: {
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#0284C7',
  },
  border: {
    subtle: '#E2E8F0',
    strong: '#FF6B00',
  },
};

export type ThemeColorMode = 'light' | 'dark';

export interface AppThemeColors {
  tokens: ThemeColors;
  mode: ThemeColorMode;

  // Theme Backgrounds
  background: string;
  secondaryBackground: string;
  cards: string;
  elevatedCards: string;
  
  // Surfaces
  surface: string;
  surfaceContainer: string;
  surfaceElevated: string;
  surfaceHighest: string;

  // Brand Oranges
  primary: string;
  secondaryOrange: string;
  primaryHover: string;
  primaryLight: string;
  primaryDim: string;
  primaryDark: string;
  primaryGlow: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderHighlight: string;
  borderActive: string;

  // Status & Accents
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  
  glassBackground: string;
  glassBorder: string;

  // Structured token aliases for direct convenience
  accent: ThemeColors['accent'];
  status: ThemeColors['status'];
  borders: ThemeColors['border'];
  bg: ThemeColors['background'];
  txt: ThemeColors['text'];

  // Compatibility tokens
  text: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  backgroundElement: string;
  backgroundSelected: string;
}

export const DARK_COLORS: AppThemeColors = {
  // Semantic Token Namespace (supports tokens.background.primary etc.)
  tokens: DARK_THEME_TOKENS,
  mode: 'dark',

  // Theme Backgrounds
  background: '#0A0C10',
  secondaryBackground: '#101318',
  cards: '#151922',
  elevatedCards: '#1B202A',
  
  // Surfaces
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
  info: '#38BDF8',
  infoBg: 'rgba(56, 189, 248, 0.15)',
  
  glassBackground: 'rgba(21, 25, 34, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // Structured token aliases for direct convenience
  accent: DARK_THEME_TOKENS.accent,
  status: DARK_THEME_TOKENS.status,
  borders: DARK_THEME_TOKENS.border,
  bg: DARK_THEME_TOKENS.background,
  txt: DARK_THEME_TOKENS.text,

  // Compatibility tokens
  text: '#FFFFFF',
  tint: '#FF6B00',
  icon: '#A1A1AA',
  tabIconDefault: '#A1A1AA',
  tabIconSelected: '#FF6B00',
  backgroundElement: '#151922',
  backgroundSelected: '#FF6B00',
};

export const LIGHT_COLORS: AppThemeColors = {
  // Semantic Token Namespace
  tokens: LIGHT_THEME_TOKENS,
  mode: 'light',

  // Theme Backgrounds
  background: '#F8FAFC',
  secondaryBackground: '#FFFFFF',
  cards: '#FFFFFF',
  elevatedCards: '#F1F5F9',
  
  // Surfaces
  surface: '#FFFFFF',
  surfaceContainer: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHighest: '#E2E8F0',

  // Brand Oranges
  primary: '#FF6B00',        // Primary Orange
  secondaryOrange: '#D97706', // Deep Orange
  primaryHover: '#EA580C',
  primaryLight: '#FFEDD5',
  primaryDim: '#C2410C',
  primaryDark: '#FFF7ED',
  primaryGlow: 'rgba(255, 107, 0, 0.15)',

  // Text Colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Borders
  border: '#E2E8F0',
  borderHighlight: '#CBD5E1',
  borderActive: '#FF6B00',

  // Status & Accents
  success: '#059669',
  successBg: 'rgba(5, 150, 105, 0.12)',
  warning: '#D97706',
  warningBg: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.12)',
  info: '#0284C7',
  infoBg: 'rgba(2, 132, 199, 0.12)',
  
  glassBackground: 'rgba(255, 255, 255, 0.90)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',

  // Structured token aliases for direct convenience
  accent: LIGHT_THEME_TOKENS.accent,
  status: LIGHT_THEME_TOKENS.status,
  borders: LIGHT_THEME_TOKENS.border,
  bg: LIGHT_THEME_TOKENS.background,
  txt: LIGHT_THEME_TOKENS.text,

  // Compatibility tokens
  text: '#0F172A',
  tint: '#FF6B00',
  icon: '#64748B',
  tabIconDefault: '#64748B',
  tabIconSelected: '#FF6B00',
  backgroundElement: '#F1F5F9',
  backgroundSelected: '#FF6B00',
};

export function getThemeColors(mode: 'dark' | 'light'): AppThemeColors {
  return mode === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

export function getThemeTokens(mode: 'dark' | 'light'): ThemeColors {
  return mode === 'light' ? LIGHT_THEME_TOKENS : DARK_THEME_TOKENS;
}

// Default export is DARK_COLORS (default mode)
export const COLORS = DARK_COLORS;

export const RADIUS = {
  card: 16,
  button: 12,
  chip: 8,
  round: 9999,
};

export const Colors = {
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
};

export type ThemeColor = keyof AppThemeColors;

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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};
