import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface AppLogoProps {
  size?: number;
  width?: number;
  height?: number;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  alwaysDarkBg?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 38,
  width,
  height,
  containerStyle,
  imageStyle,
  resizeMode = 'contain',
  alwaysDarkBg = false,
}) => {
  const { isDark } = useTheme();
  const actualWidth = width || size;
  const actualHeight = height || size;
  const shouldApplyDarkBg = alwaysDarkBg || !isDark;

  return (
    <View
      style={[
        styles.baseContainer,
        shouldApplyDarkBg && styles.darkBackground,
        containerStyle,
      ]}
    >
      <Image
        source={require('../../assets/images/riderhood-logo.png')}
        style={[
          { width: actualWidth, height: actualHeight },
          imageStyle,
        ]}
        resizeMode={resizeMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBackground: {
    backgroundColor: '#0d0f14',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2430',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
});
