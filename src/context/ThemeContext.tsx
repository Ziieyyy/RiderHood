import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DARK_COLORS,
  LIGHT_COLORS,
  ThemeColors,
  AppThemeColors,
  getThemeColors,
  getThemeTokens,
} from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

export interface ThemeContextType {
  /** The configured user preference: 'light', 'dark', or 'system' */
  themeMode: ThemeMode;
  /** Backwards compatible alias for themeMode */
  theme: ThemeMode;
  /** The actively rendered theme: 'light' or 'dark' */
  activeTheme: ActiveTheme;
  /** Boolean flag: true if activeTheme is 'dark' */
  isDark: boolean;
  /** Active color tokens (includes both structured semantic tokens and flat keys) */
  colors: AppThemeColors;
  /** Structured semantic design tokens */
  tokens: ThemeColors;
  /** Update theme mode with persistence */
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  /** Backwards compatible alias for setThemeMode */
  setTheme: (mode: ThemeMode) => Promise<void>;
  /** Toggle between themes */
  toggleTheme: () => Promise<void>;
}

export const THEME_STORAGE_KEY = '@riderhood_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  theme: 'dark',
  activeTheme: 'dark',
  isDark: true,
  colors: DARK_COLORS,
  tokens: DARK_COLORS.tokens,
  setThemeMode: async () => {},
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(() => Appearance.getColorScheme());

  // Listen to live OS system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Load saved preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        } else {
          // Default is dark mode
          setThemeModeState('dark');
        }
      } catch {
        setThemeModeState('dark');
      }
    };

    loadThemePreference();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Failed to persist theme preference:', err);
    }
  };

  const toggleTheme = async () => {
    if (themeMode === 'dark') {
      await setThemeMode('light');
    } else if (themeMode === 'light') {
      await setThemeMode('system');
    } else {
      await setThemeMode('dark');
    }
  };

  // Resolve active theme: when 'system', check systemScheme, default to 'dark'
  const activeTheme: ActiveTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  const isDark = activeTheme === 'dark';
  const colors = useMemo(() => getThemeColors(activeTheme), [activeTheme]);
  const tokens = useMemo(() => getThemeTokens(activeTheme), [activeTheme]);

  // Synchronize document background on Web platform
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.body) {
      document.documentElement.style.backgroundColor = colors.background;
      document.documentElement.style.colorScheme = activeTheme;
      document.body.style.backgroundColor = colors.background;
      document.body.style.color = colors.textPrimary;
    }
  }, [colors, activeTheme]);

  const contextValue = useMemo<ThemeContextType>(() => ({
    themeMode,
    theme: themeMode,
    activeTheme,
    isDark,
    colors,
    tokens,
    setThemeMode,
    setTheme: setThemeMode,
    toggleTheme,
  }), [themeMode, activeTheme, isDark, colors, tokens]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Hook to create memoized StyleSheet objects that react dynamically to theme changes.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: AppThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => factory(colors, isDark), [colors, isDark]);
}
