import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SupportedLanguage, LANGUAGE_OPTIONS } from './config';
import { enGB } from './locales/en-GB';
import { msMY } from './locales/ms-MY';
import { TranslationKey, TranslationSchema } from './types';

const DICTIONARIES: Record<SupportedLanguage, TranslationSchema> = {
  'en-GB': enGB,
  'ms-MY': msMY,
};

// In-memory active language for fast synchronous access outside React components
let currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatDate: (dateInput: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number) => string;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
  t: (key: TranslationKey) => key,
  formatDate: (d) => String(d),
  formatCurrency: (a) => `RM ${a.toFixed(2)}`,
  isReady: false,
});

/**
 * Universal lookup helper for nested translation keys
 */
export function getTranslation(
  lang: SupportedLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dictionary = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANGUAGE];
  const keys = key.split('.');
  let result: any = dictionary;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      // Fallback to default language dictionary
      let fallback: any = DICTIONARIES[DEFAULT_LANGUAGE];
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          fallback = key;
          break;
        }
      }
      result = fallback;
      break;
    }
  }

  if (typeof result !== 'string') {
    return key;
  }

  // Parameter interpolation e.g. {count}, {name}
  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
    }, result);
  }

  return result;
}

/**
 * Static translate helper usable outside React component trees
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return getTranslation(currentLanguage, key, params);
}

/**
 * Universal Locale-Aware Date Formatter
 */
export function formatDate(
  dateInput: string | Date | number,
  options?: Intl.DateTimeFormatOptions,
  lang: SupportedLanguage = currentLanguage
): string {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };

    return new Intl.DateTimeFormat(lang, defaultOptions).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Universal Currency Formatter (Fixed Malaysian Ringgit RM)
 */
export function formatCurrency(amount: number): string {
  const formattedNumber = (Number(amount) || 0).toFixed(2);
  return `RM ${formattedNumber}`;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en-GB' || stored === 'ms-MY') {
          currentLanguage = stored;
          setLanguageState(stored);
        }
      } catch (e) {
        console.warn('[i18n] Failed to load stored language preference:', e);
      } finally {
        setIsReady(true);
      }
    };
    loadStoredLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    try {
      currentLanguage = newLang;
      setLanguageState(newLang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('[i18n] Failed to persist language preference:', e);
    }
  }, []);

  const translate = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return getTranslation(language, key, params);
    },
    [language]
  );

  const localizedDate = useCallback(
    (dateInput: string | Date | number, options?: Intl.DateTimeFormatOptions) => {
      return formatDate(dateInput, options, language);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translate,
      formatDate: localizedDate,
      formatCurrency,
      isReady,
    }),
    [language, setLanguage, translate, localizedDate, isReady]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export function useLanguage() {
  return useTranslation();
}
