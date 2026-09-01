import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    phone?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * ResponsiveGrid
 * Layouts child elements across 1, 2, 3, or 4 columns depending on device width.
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { phone: 1, tablet: 2, desktop: 3 },
  gap,
  style,
}) => {
  const { isPhone, isTablet, isDesktop, cardGap } = useResponsive();

  const activeGap = gap !== undefined ? gap : cardGap;

  let activeCols = columns.phone || 1;
  if (isDesktop) {
    activeCols = columns.desktop || 3;
  } else if (isTablet) {
    activeCols = columns.tablet || 2;
  }

  // Wrap children with width calculations
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.gridContainer, { gap: activeGap }, style]}>
      {childArray.map((child, index) => {
        const itemWidth = activeCols === 1 ? '100%' : `${100 / activeCols - (activeGap * (activeCols - 1)) / (activeCols * 100) * 100}%`;

        // Calculate flexible basis
        return (
          <View
            key={index}
            style={[
              styles.gridItem,
              activeCols === 1
                ? { width: '100%' }
                : {
                    flexBasis: activeCols === 2 ? '48%' : activeCols === 3 ? '31.5%' : '23.5%',
                    flexGrow: 1,
                    flexShrink: 1,
                    minWidth: isPhone ? 140 : activeCols > 1 ? 260 : '100%',
                  },
            ]}
          >
            {child}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridItem: {
    // child wrapper
  },
});
