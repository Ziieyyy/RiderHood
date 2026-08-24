import { Platform } from 'react-native';

/**
 * RiderHood Centralized Responsive Breakpoints
 * xs: 0-359px (small phone, e.g. iPhone SE / compact Android)
 * sm: 360-639px (standard phone, e.g. iPhone 14/15, Galaxy S23)
 * md: 640-767px (large phone / phablet / mini tablet)
 * tablet: 768-1023px (tablets portrait & landscape, iPad 10.2", iPad Air)
 * lg: 1024-1279px (laptops, iPad Pro landscape, compact desktops)
 * xl: 1280-1535px (standard desktops, 1080p scaled)
 * xxl: 1536px+ (large desktops, 2K / 4K monitors)
 */
export const BREAKPOINTS = {
  xs: 360,
  sm: 640,
  md: 768,
  tablet: 1024,
  lg: 1280,
  xl: 1536,
} as const;

export const LAYOUT = {
  MAX_CONTENT_WIDTH: 1440,
  SIDEBAR_WIDTH_EXPANDED: 270,
  SIDEBAR_WIDTH_COLLAPSED: 80,
  HEADER_HEIGHT: 64,
  BOTTOM_TAB_HEIGHT: 64,
  MODAL_MAX_WIDTH: 620,
  DIALOG_MAX_WIDTH: 480,
  AUTH_CARD_MAX_WIDTH: 460,
} as const;

export interface ResponsiveSpacingProfile {
  screenPadding: number;
  sectionGap: number;
  cardGap: number;
  cardPadding: number;
}

export const RESPONSIVE_SPACING: Record<'phone' | 'tablet' | 'desktop', ResponsiveSpacingProfile> = {
  phone: {
    screenPadding: 16,
    sectionGap: 20,
    cardGap: 12,
    cardPadding: 14,
  },
  tablet: {
    screenPadding: 24,
    sectionGap: 24,
    cardGap: 16,
    cardPadding: 18,
  },
  desktop: {
    screenPadding: 32,
    sectionGap: 32,
    cardGap: 20,
    cardPadding: 22,
  },
};


export const TOUCH_TARGET = {
  min: 44,
  standard: 48,
  large: 54,
} as const;

export const RESPONSIVE_TYPOGRAPHY = {
  display: {
    phone: { fontSize: 26, lineHeight: 32, fontWeight: '900' as const },
    tablet: { fontSize: 32, lineHeight: 38, fontWeight: '900' as const },
    desktop: { fontSize: 36, lineHeight: 44, fontWeight: '900' as const },
  },
  h1: {
    phone: { fontSize: 20, lineHeight: 26, fontWeight: '800' as const },
    tablet: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const },
    desktop: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  },
  h2: {
    phone: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
    tablet: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
    desktop: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  },
  h3: {
    phone: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
    tablet: { fontSize: 15, lineHeight: 21, fontWeight: '700' as const },
    desktop: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  },
  body: {
    phone: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
    tablet: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    desktop: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  },
  bodyBold: {
    phone: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
    tablet: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
    desktop: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  },
  caption: {
    phone: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
    tablet: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
    desktop: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  },
  badge: {
    phone: { fontSize: 9, lineHeight: 12, fontWeight: '800' as const },
    tablet: { fontSize: 10, lineHeight: 13, fontWeight: '800' as const },
    desktop: { fontSize: 10, lineHeight: 13, fontWeight: '800' as const },
  },
} as const;

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'tablet' | 'lg' | 'xl' | 'xxl';
