import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveFormProps {
  children: React.ReactNode;
  columns?: {
    phone?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

interface FormFieldProps {
  children: React.ReactNode;
  colSpan?: {
    phone?: number;
    tablet?: number;
    desktop?: number;
  };
  style?: StyleProp<ViewStyle>;
}

/**
 * ResponsiveForm
 * Organizes input fields into 1 column on phone, 2 on tablet, and 2-3 on desktop.
 */
export const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  columns = { phone: 1, tablet: 2, desktop: 2 },
  gap = 14,
  style,
}) => {
  const { isDesktop, isTablet } = useResponsive();

  let activeCols = columns.phone || 1;
  if (isDesktop) {
    activeCols = columns.desktop || 2;
  } else if (isTablet) {
    activeCols = columns.tablet || 2;
  }

  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.formContainer, { gap }, style]}>
      {childArray.map((child, index) => (
        <View
          key={index}
          style={[
            styles.fieldWrapper,
            activeCols === 1
              ? { width: '100%' }
              : {
                  flexBasis: activeCols === 2 ? '48%' : '31.5%',
                  flexGrow: 1,
                  minWidth: 240,
                },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

/**
 * FormField (Full Width override)
 */
export const FormFieldFullWidth: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => {
  return <View style={[{ width: '100%' }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  formContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  fieldWrapper: {
    //
  },
});
