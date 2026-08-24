import { SupportedLanguage } from '../i18n/config';

export interface CategoryInfo {
  key: string;
  en: string;
  ms: string;
  aliases: string[];
}

export const CATEGORY_DEFINITIONS: CategoryInfo[] = [
  {
    key: 'All',
    en: 'All',
    ms: 'Semua',
    aliases: ['all', 'semua'],
  },
  {
    key: 'Full Service',
    en: 'Full Service',
    ms: 'Servis Lengkap',
    aliases: ['full service', 'servis lengkap', 'major service', 'pakej servis'],
  },
  {
    key: 'Minyak Hitam',
    en: 'Engine Oil',
    ms: 'Minyak Hitam',
    aliases: ['minyak hitam', 'engine oil', 'motor oil', 'minyak enjin', 'oil 4t', '4t', 'lubricant', 'engine lubricants'],
  },
  {
    key: 'Gear Oil',
    en: 'Gear Oil',
    ms: 'Minyak Gear',
    aliases: ['gear oil', 'minyak gear', 'scooter gear oil', 'scooter gear'],
  },
  {
    key: 'CVT',
    en: 'CVT',
    ms: 'CVT',
    aliases: ['cvt', 'belting', 'belt', 'tali sawat', 'roller', 'pulley'],
  },
  {
    key: 'Throttle Body',
    en: 'Throttle Body',
    ms: 'Throttle Body',
    aliases: ['throttle body', 'tb', 'cuci tb', 'throttle'],
  },
  {
    key: 'Brake Pad',
    en: 'Brake Pad',
    ms: 'Pad Brek',
    aliases: ['brake pad', 'pad brek', 'brake', 'brek', 'brake shoe', 'lining'],
  },
  {
    key: 'Chain & Sprocket',
    en: 'Chain & Sprocket',
    ms: 'Rantai & Sprocket',
    aliases: ['chain & sprocket', 'rantai & sprocket', 'chain', 'sprocket', 'rantai', 'spoket', 'rantai & spoket'],
  },
  {
    key: 'Tayar Depan',
    en: 'Front Tyre',
    ms: 'Tayar Depan',
    aliases: ['tayar depan', 'front tyre', 'front tire', 'tayar hadapan'],
  },
  {
    key: 'Tayar Belakang',
    en: 'Rear Tyre',
    ms: 'Tayar Belakang',
    aliases: ['tayar belakang', 'rear tyre', 'rear tire'],
  },
  {
    key: 'Spark Plug',
    en: 'Spark Plug',
    ms: 'Palam Pencucuh',
    aliases: ['spark plug', 'palam pencucuh', 'plug', 'ngk', 'denso'],
  },
  {
    key: 'Bateri',
    en: 'Battery',
    ms: 'Bateri',
    aliases: ['bateri', 'battery', 'batt', 'akumulator'],
  },
  {
    key: 'Coolant',
    en: 'Coolant',
    ms: 'Coolant',
    aliases: ['coolant', 'cecair penyejuk', 'radiator coolant'],
  },
  {
    key: 'Brake Fluid',
    en: 'Brake Fluid',
    ms: 'Minyak Brek',
    aliases: ['brake fluid', 'minyak brek', 'dot 4', 'dot 3'],
  },
  {
    key: 'Fork Oil',
    en: 'Fork Oil',
    ms: 'Minyak Fork',
    aliases: ['fork oil', 'minyak fork', 'front fork'],
  },
  {
    key: '2T',
    en: '2T Oil',
    ms: 'Minyak 2T',
    aliases: ['2t', '2t oil', 'minyak 2t', 'two stroke', '2 stroke'],
  },
];

export const SERVICE_CATEGORIES = CATEGORY_DEFINITIONS.map((c) => c.key);

/**
 * Formats a category name for display in the current active language.
 * E.g., 'Minyak Hitam' -> 'Engine Oil' (in en-GB), 'Minyak Hitam' (in ms-MY)
 */
export function formatCategoryName(
  category?: string | null,
  lang: SupportedLanguage = 'en-GB'
): string {
  if (!category) return '';

  const trimmed = category.trim();
  const lower = trimmed.toLowerCase();

  // Find matching definition
  const match = CATEGORY_DEFINITIONS.find(
    (def) =>
      def.key.toLowerCase() === lower ||
      def.en.toLowerCase() === lower ||
      def.ms.toLowerCase() === lower ||
      def.aliases.some((alias) => lower.includes(alias) || alias.includes(lower))
  );

  if (match) {
    return lang === 'ms-MY' ? match.ms : match.en;
  }

  // Workshop generic service fallback mappings
  if (lower === 'engine') return lang === 'ms-MY' ? 'Enjin' : 'Engine';
  if (lower === 'brake') return lang === 'ms-MY' ? 'Brek' : 'Brake';
  if (lower === 'oil & fluid') return lang === 'ms-MY' ? 'Minyak & Cecair' : 'Oil & Fluid';
  if (lower === 'suspension') return lang === 'ms-MY' ? 'Suspensi' : 'Suspension';
  if (lower === 'electrical') return lang === 'ms-MY' ? 'Elektrikal' : 'Electrical';
  if (lower === 'general') return lang === 'ms-MY' ? 'Umum' : 'General';
  if (lower === 'custom') return lang === 'ms-MY' ? 'Kustom' : 'Custom';

  return trimmed;
}

/**
 * Returns a localized list of categories for filter chips.
 */
export function getCategoryFilterList(
  lang: SupportedLanguage = 'en-GB'
): Array<{ key: string; label: string }> {
  return CATEGORY_DEFINITIONS.map((def) => ({
    key: def.key,
    label: lang === 'ms-MY' ? def.ms : def.en,
  }));
}

/**
 * Checks if a given item category matches the selected filter category.
 */
export function matchesCategoryFilter(
  itemCategory: string | null | undefined,
  filterCategory: string
): boolean {
  if (!filterCategory || filterCategory === 'All' || filterCategory === 'all' || filterCategory === 'Semua') {
    return true;
  }
  if (!itemCategory) return false;

  const fLower = filterCategory.trim().toLowerCase();
  const iLower = itemCategory.trim().toLowerCase();

  // Exact or contains match
  if (iLower === fLower || iLower.includes(fLower) || fLower.includes(iLower)) {
    return true;
  }

  // Look up filter category definition
  const filterDef = CATEGORY_DEFINITIONS.find(
    (def) =>
      def.key.toLowerCase() === fLower ||
      def.en.toLowerCase() === fLower ||
      def.ms.toLowerCase() === fLower ||
      def.aliases.some((a) => a === fLower)
  );

  if (filterDef) {
    // Check if item matches definition's key, en, ms, or aliases
    if (
      iLower === filterDef.key.toLowerCase() ||
      iLower === filterDef.en.toLowerCase() ||
      iLower === filterDef.ms.toLowerCase() ||
      filterDef.aliases.some((alias) => iLower.includes(alias) || alias.includes(iLower))
    ) {
      return true;
    }
  }

  // Look up item category definition
  const itemDef = CATEGORY_DEFINITIONS.find(
    (def) =>
      def.key.toLowerCase() === iLower ||
      def.en.toLowerCase() === iLower ||
      def.ms.toLowerCase() === iLower ||
      def.aliases.some((a) => a === iLower)
  );

  if (itemDef) {
    if (
      fLower === itemDef.key.toLowerCase() ||
      fLower === itemDef.en.toLowerCase() ||
      fLower === itemDef.ms.toLowerCase() ||
      itemDef.aliases.some((alias) => fLower.includes(alias) || alias.includes(fLower))
    ) {
      return true;
    }
  }

  return false;
}
