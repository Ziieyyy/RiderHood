import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { COLORS } from '../../constants/theme';
import { LAYOUT } from '../../constants/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  noPadding?: boolean;
  backgroundColor?: string;
}

/**
 * ResponsiveContainer
 * Centers content and enforces max-content-width on large screens,
 * while providing responsive horizontal padding across Phone, Tablet, and Desktop.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  maxWidth = LAYOUT.MAX_CONTENT_WIDTH,
  noPadding = false,
  backgroundColor = 'transparent',
}) => {
  const { contentPadding, isDesktop } = useResponsive();

  return (
    <View style={[styles.outerContainer, { backgroundColor }]}>
      <View
        style={[
          styles.innerContainer,
          {
            maxWidth,
            paddingHorizontal: noPadding ? 0 : contentPadding,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
  innerContainer: {
    width: '100%',
    flex: 1,
  },
});
