import { useWindowDimensions, Platform } from 'react-native';
import { useMemo } from 'react';
import {
  BREAKPOINTS,
  LAYOUT,
  RESPONSIVE_SPACING,
  BreakpointKey,
} from '../constants/responsive';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isWeb: boolean;

  // Device Category Flags
  isSmallPhone: boolean; // < 360px
  isPhone: boolean; // < 768px
  isTablet: boolean; // 768px - 1023px
  isDesktop: boolean; // >= 1024px
  isLargeDesktop: boolean; // >= 1440px
  isLaptop: boolean; // 1024px - 1279px

  // Granular breakpoint name
  breakpoint: BreakpointKey;

  // Dynamic Layout Values
  contentPadding: number;
  sectionGap: number;
  cardGap: number;
  cardPadding: number;
  maxContentWidth: number;

  // Helper functions
  getGridColumns: (phoneCols?: number, tabletCols?: number, desktopCols?: number) => number;
  getColumnWidthPercent: (cols: number, gap?: number) => string;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPortrait = height >= width;
    const isLandscape = width > height;
    const isWeb = Platform.OS === 'web';

    let breakpoint: BreakpointKey = 'sm';
    if (width < BREAKPOINTS.xs) {
      breakpoint = 'xs';
    } else if (width < BREAKPOINTS.sm) {
      breakpoint = 'sm';
    } else if (width < BREAKPOINTS.md) {
      breakpoint = 'md';
    } else if (width < BREAKPOINTS.tablet) {
      breakpoint = 'tablet';
    } else if (width < BREAKPOINTS.lg) {
      breakpoint = 'lg';
    } else if (width < BREAKPOINTS.xl) {
      breakpoint = 'xl';
    } else {
      breakpoint = 'xxl';
    }

    const isSmallPhone = width < BREAKPOINTS.xs;
    const isPhone = width < BREAKPOINTS.md;
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.tablet;
    const isLaptop = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.lg;
    const isLargeDesktop = width >= LAYOUT.MAX_CONTENT_WIDTH;

    let spacingProfile = RESPONSIVE_SPACING.phone;
    if (isDesktop) {
      spacingProfile = RESPONSIVE_SPACING.desktop;
    } else if (isTablet) {
      spacingProfile = RESPONSIVE_SPACING.tablet;
    }

    const getGridColumns = (phoneCols = 1, tabletCols = 2, desktopCols = 3): number => {
      if (isDesktop) return desktopCols;
      if (isTablet) return tabletCols;
      return phoneCols;
    };

    const getColumnWidthPercent = (cols: number, gap = 16): string => {
      if (cols <= 1) return '100%';
      // For flexWrap grids with gap
      const totalGap = gap * (cols - 1);
      return `calc(${100 / cols}% - ${totalGap / cols}px)`;
    };

    return {
      width,
      height,
      isPortrait,
      isLandscape,
      isWeb,
      isSmallPhone,
      isPhone,
      isTablet,
      isDesktop,
      isLargeDesktop,
      isLaptop,
      breakpoint,
      contentPadding: spacingProfile.screenPadding,
      sectionGap: spacingProfile.sectionGap,
      cardGap: spacingProfile.cardGap,
      cardPadding: spacingProfile.cardPadding,
      maxContentWidth: LAYOUT.MAX_CONTENT_WIDTH,
      getGridColumns,
      getColumnWidthPercent,
    };
  }, [width, height]);
}
