import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
// 自己マッピング（"Wiki": "Wiki"）は「意図的に未翻訳」の記録として妥当なので
// エラーにはしない。ただしcontent.jsが値の変わらない書き込みを避けそこねると
// MutationObserverの無限ループになる箇所なので、件数を可視化しておく
const warnings = [];

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

  const selfMapped = Object.entries(dictionary.translations)
    .filter(([source, translation]) => source === translation)
    .map(([source]) => source);
  if (selfMapped.length > 0) {
    warnings.push(`${dictionaryPath}: ${selfMapped.length} self-mapping(s) (translation equals source): ${selfMapped.join(', ')}`);
  }

  // 訳文が別のキーでもある場合、1巡目の置換結果が2巡目でさらに引かれる。
  // 長さ2以上の循環（A -> B -> A、A -> B -> C -> A、…）は毎回値が変わるため、
  // content.js側の「値が変わるときだけ書き込む」ガードでは止められず、画面の
  // 文字列が入れ替わり続ける無限ループになる。循環の長さに上限はないので、
  // 各キーから訳文を辿って任意長の循環を検出する。
  // 自己マッピング（長さ1の循環）は書き込み自体が起きないので許容する。
  //
  // 1つのキーには1つの訳文しかないため出次数は常に1で、開始点ごとに辿って
  // 訪問済みを覚えるだけで全体をO(キー数)で走査できる。
  const edges = new Map(Object.entries(dictionary.translations));
  const visited = new Set();
  const cyclicKeys = new Set();
  for (const start of edges.keys()) {
    if (visited.has(start)) continue;
    const path = [];
    const position = new Map();
    let node = start;
    // 訪問済みの節点に入った場合、その先の循環は既に報告済みなので打ち切る
    while (edges.has(node) && !visited.has(node)) {
      if (position.has(node)) {
        const cycle = path.slice(position.get(node));
        if (cycle.length >= 2) {
          cycle.forEach((key) => cyclicKeys.add(key));
          const trace = [...cycle, cycle[0]].map((key) => JSON.stringify(key)).join(' -> ');
          errors.push(`${dictionaryPath}: translation cycle ${trace} will never converge`);
        }
        break;
      }
      position.set(node, path.length);
      path.push(node);
      node = edges.get(node);
    }
    path.forEach((key) => visited.add(key));
  }

  // 循環しない連鎖（A -> B -> C で C は自己マッピングか辞書外）は収束するが、
  // 余分な再翻訳が1巡走るので気づけるようにしておく。
  // 循環を構成するキーと、その訳文が直接循環へ入るキーはここでは除外する。
  // それより上流の枝は、次巡でも再翻訳されることを示す警告が出る場合がある
  for (const [source, translation] of Object.entries(dictionary.translations)) {
    if (source === translation || cyclicKeys.has(source) || cyclicKeys.has(translation)) continue;
    const next = edges.get(translation);
    if (next === undefined || next === translation) continue;
    warnings.push(`${dictionaryPath}: chained translation "${source}" -> "${translation}" -> "${next}" (re-translated on the next pass)`);
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

if (warnings.length > 0) {
  console.warn(`\nWarnings:\n- ${warnings.join('\n- ')}`);
}

if (errors.length > 0) {
  console.error(`\nValidation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Locales: ${localeCodes.sort().join(', ')}`);
console.log('Validation passed.');
