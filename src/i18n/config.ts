export type SupportedLanguage = 'en-GB' | 'ms-MY';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en-GB',
    label: 'English (UK)',
    nativeLabel: 'English (UK)',
    flag: '🇬🇧',
  },
  {
    code: 'ms-MY',
    label: 'Malay',
    nativeLabel: 'Bahasa Melayu',
    flag: '🇲🇾',
  },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en-GB';
export const LANGUAGE_STORAGE_KEY = 'riderhood_user_language';
