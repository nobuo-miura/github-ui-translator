import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

function parseDictionary(relativePath) {
  const raw = readText(relativePath);
  const clean = raw
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');

  const keys = [];
  for (const line of raw.split('\n')) {
    const match = line.match(/^ {4}"((?:\\.|[^"\\])+)"\s*:/);
    if (match) keys.push(JSON.parse(`"${match[1]}"`));
  }

  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    errors.push(`${relativePath}: duplicate translation keys: ${[...new Set(duplicateKeys)].join(', ')}`);
  }

  try {
    return JSON.parse(clean);
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

function compareKeys(label, expected, actual) {
  const missing = [...expected].filter((key) => !actual.has(key));
  const extra = [...actual].filter((key) => !expected.has(key));
  if (missing.length > 0) errors.push(`${label}: missing keys: ${missing.join(', ')}`);
  if (extra.length > 0) errors.push(`${label}: extra keys: ${extra.join(', ')}`);
}

const manifest = readJson('manifest.json');
const languageConfig = readJson('languages.json');

if (!manifest || !languageConfig) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const languages = languageConfig.languages;
if (!Array.isArray(languages) || languages.length === 0) {
  errors.push('languages.json: languages must be a non-empty array');
}

const seenCodes = new Set();
let referenceKeys = null;
for (const language of Array.isArray(languages) ? languages : []) {
  if (!language || typeof language.code !== 'string' || typeof language.name !== 'string') {
    errors.push('languages.json: every language requires string code and name fields');
    continue;
  }
  if (seenCodes.has(language.code)) errors.push(`languages.json: duplicate language code: ${language.code}`);
  seenCodes.add(language.code);

  const dictionaryPath = `dictionaries/${language.code}.json`;
  if (!fs.existsSync(path.join(root, dictionaryPath))) {
    errors.push(`${dictionaryPath}: file not found`);
    continue;
  }

  const dictionary = parseDictionary(dictionaryPath);
  if (!dictionary) continue;
  if (dictionary.language !== language.code) errors.push(`${dictionaryPath}: language metadata must be ${language.code}`);
  if (dictionary.name !== language.name) errors.push(`${dictionaryPath}: name metadata must be ${language.name}`);
  if (!dictionary.translations || typeof dictionary.translations !== 'object' || Array.isArray(dictionary.translations)) {
    errors.push(`${dictionaryPath}: translations must be an object`);
    continue;
  }

  for (const [source, translation] of Object.entries(dictionary.translations)) {
    if (!source.trim()) errors.push(`${dictionaryPath}: translation source must not be empty`);
    // content.jsは辞書照合前に原文をtrim()するため、前後に空白のあるキーは絶対に一致しない
    else if (source !== source.trim()) {
      errors.push(`${dictionaryPath}: translation source "${source}" has leading/trailing whitespace and will never match (content.js trims before lookup)`);
    }
    if (typeof translation !== 'string' || !translation.trim()) {
      errors.push(`${dictionaryPath}: translation for "${source}" must be a non-empty string`);
    }
  }

  const currentKeys = new Set(Object.keys(dictionary.translations));
  if (referenceKeys === null) referenceKeys = currentKeys;
  else compareKeys(dictionaryPath, referenceKeys, currentKeys);

  console.log(`${language.code}: ${currentKeys.size} translations`);
}

const localeRoot = path.join(root, '_locales');
const localeCodes = fs.existsSync(localeRoot)
  ? fs.readdirSync(localeRoot).filter((entry) => fs.statSync(path.join(localeRoot, entry)).isDirectory())
  : [];
const defaultLocale = manifest.default_locale;
const defaultMessages = readJson(`_locales/${defaultLocale}/messages.json`);
const defaultMessageKeys = new Set(Object.keys(defaultMessages || {}));

for (const locale of localeCodes) {
  const messages = readJson(`_locales/${locale}/messages.json`);
  if (messages) compareKeys(`_locales/${locale}/messages.json`, defaultMessageKeys, new Set(Object.keys(messages)));
}

for (const match of JSON.stringify(manifest).matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) {
  if (!defaultMessageKeys.has(match[1])) errors.push(`manifest.json: missing default locale message: ${match[1]}`);
}

if (!manifest.content_scripts?.some((entry) => {
  const sharedIndex = entry.js?.indexOf('shared.js') ?? -1;
  const contentIndex = entry.js?.indexOf('content.js') ?? -1;
  return sharedIndex >= 0 && contentIndex >= 0 && sharedIndex < contentIndex;
})) {
  errors.push('manifest.json: shared.js must load before content.js');
}

if (errors.length > 0) {
  console.error(`\nValidation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Locales: ${localeCodes.sort().join(', ')}`);
console.log('Validation passed.');
