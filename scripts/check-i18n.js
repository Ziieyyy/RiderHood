// Translation Key Integrity Check Script
const fs = require('fs');
const path = require('path');

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getKeys(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

// Simple extractor for TS object exports
function extractDictionary(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match export const enGB / msMY: TranslationSchema = { ... };
  const jsonLike = content
    .replace(/import\s+.*?;\s*/g, '')
    .replace(/export\s+const\s+\w+:\s*TranslationSchema\s*=\s*/g, '')
    .replace(/;\s*$/g, '');
  
  try {
    // Evaluate safely in module context
    const fn = new Function(`return (${jsonLike});`);
    return fn();
  } catch (err) {
    console.error(`Failed to parse dictionary at ${filePath}:`, err);
    process.exit(1);
  }
}

const enPath = path.join(__dirname, '../src/i18n/locales/en-GB.ts');
const msPath = path.join(__dirname, '../src/i18n/locales/ms-MY.ts');

const enDict = extractDictionary(enPath);
const msDict = extractDictionary(msPath);

const enKeys = getKeys(enDict);
const msKeys = getKeys(msDict);

const missingInMs = enKeys.filter(k => !msKeys.includes(k));
const missingInEn = msKeys.filter(k => !enKeys.includes(k));

console.log('----------------------------------------------------');
console.log('🌐 RiderHood i18n Translation Completeness Checker');
console.log('----------------------------------------------------');
console.log(`🇬🇧 English (UK) keys: ${enKeys.length}`);
console.log(`🇲🇾 Bahasa Melayu keys: ${msKeys.length}`);

let hasErrors = false;

if (missingInMs.length > 0) {
  hasErrors = true;
  console.error('\n❌ Missing translation keys in ms-MY (Bahasa Melayu):');
  missingInMs.forEach(k => console.error(`  - ${k}`));
}

if (missingInEn.length > 0) {
  hasErrors = true;
  console.error('\n❌ Missing translation keys in en-GB (English UK):');
  missingInEn.forEach(k => console.error(`  - ${k}`));
}

if (!hasErrors) {
  console.log('\n✅ All translation keys match perfectly across en-GB and ms-MY!');
  process.exit(0);
} else {
  console.error('\n🚨 Translation integrity check failed. Please sync dictionary keys.');
  process.exit(1);
}
