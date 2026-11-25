// content.jsをjsdom上で実行するためのテストヘルパー
//
// content.jsは即時関数で何もexportしないため、関数単位ではなく
// 「疑似的なGitHubページにスクリプトを注入し、翻訳後のDOMを検証する」形でテストする。
// chrome.* APIとfetchは最小限のモックに差し替える。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharedSource = fs.readFileSync(path.join(root, 'shared.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

export function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// jsdomのセレクターエンジン（@asamuzakjp/dom-selector）は2048文字を超える
// セレクターを例外にするが、実ブラウザにはこの制限がない。content.jsの除外
// セレクターはこれを超えるため、長いセレクターリストだけトップレベルのカンマで
// 分割して評価するようにDOM APIを包む（テスト環境専用の回避策）
const JSDOM_SELECTOR_MAX_LENGTH = 2048;

function splitSelectorList(selector) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(' || ch === '[') {
      depth++;
    } else if (ch === ')' || ch === ']') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      parts.push(selector.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selector.slice(start).trim());
  return parts.filter(Boolean);
}

function patchLongSelectors(window) {
  const isLong = (selector) => typeof selector === 'string' && selector.length > JSDOM_SELECTOR_MAX_LENGTH;
  const { Element, Document } = window;
  const { matches, closest, querySelectorAll: elementQsa } = Element.prototype;
  const documentQsa = Document.prototype.querySelectorAll;

  Element.prototype.matches = function (selector) {
    if (!isLong(selector)) return matches.call(this, selector);
    return splitSelectorList(selector).some((part) => matches.call(this, part));
  };
  Element.prototype.closest = function (selector) {
    if (!isLong(selector)) return closest.call(this, selector);
    const parts = splitSelectorList(selector);
    for (let el = this; el; el = el.parentElement) {
      if (parts.some((part) => matches.call(el, part))) return el;
    }
    return null;
  };
  // 戻り値はNodeListではなく配列だが、content.jsはforEachしか使わない
  const patchQsa = (original) => function (selector) {
    if (!isLong(selector)) return original.call(this, selector);
    const parts = splitSelectorList(selector);
    return [...original.call(this, '*')].filter((el) => parts.some((part) => matches.call(el, part)));
  };
  Element.prototype.querySelectorAll = patchQsa(elementQsa);
  Document.prototype.querySelectorAll = patchQsa(documentQsa);
}

// マクロタスク1回分待つ。初回翻訳（設定取得→辞書fetch→translateAll）の
// Promiseチェーンはこれで完了する
// chrome.storageの書き込み失敗と同じく、コールバックの実行中だけchrome.runtime.lastErrorを設定する
function failWithLastError(window, message, callback) {
  window.chrome.runtime.lastError = { message };
  try {
    callback?.();
  } finally {
    delete window.chrome.runtime.lastError;
  }
}

function tick(window) {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

/**
 * popup.htmlをjsdom上で開き、shared.jsとpopup.jsを実行する。
 * chrome.storage.localへの書き込みはstorageCallsに記録する。
 *
 * @param {object} [options]
 * @param {object} [options.settings] chrome.storage.localに保存済みの値
 * @param {string} [options.uiLanguage] chrome.i18n.getUILanguage()の戻り値
 */
export async function loadPopup({ settings = {}, uiLanguage = 'ja' } = {}) {
  const dom = new JSDOM(readRepoFile('popup.html'), {
    url: 'chrome-extension://test/popup.html',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  const storageCalls = [];
  const languages = readRepoFile('languages.json');

  window.chrome = {
    runtime: { getURL: (p) => `chrome-extension://test/${p}`, openOptionsPage: () => storageCalls.push({ method: 'openOptionsPage' }) },
    i18n: {
      // 置換文字列がどう渡されたか分かるよう、"キー(置換文字列)"の形で返す
      getMessage: (key, substitutions) =>
        substitutions ? `${key}(${[].concat(substitutions).join(',')})` : key,
      getUILanguage: () => uiLanguage
    },
    storage: {
      local: {
        get: (defaults, callback) => callback({ ...defaults, ...settings }),
        // jsdom側で作られたオブジェクトはプロトタイプが別物でdeepEqualが通らないため詰め替える
        set: (items) => storageCalls.push({ method: 'set', items: { ...items } }),
        remove: (keys) => storageCalls.push({ method: 'remove', keys })
      }
    }
  };
  window.fetch = async () => ({ ok: true, json: async () => JSON.parse(languages) });

  window.eval(sharedSource);
  window.eval(readRepoFile('popup.js'));
  await tick(window);

  return {
    window,
    document: window.document,
    storageCalls,
    // <select>の値を変えてchangeイベントを発火する
    select(selector, value) {
      const el = window.document.querySelector(selector);
      el.value = value;
      el.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    close() {
      window.close();
    }
  };
}

/**
 * @param {object} options
 * @param {string} options.url ページのURL（パスで翻訳スコープが変わる）
 * @param {string} options.body <body>の中身
 * @param {Record<string, string>} [options.dict] 辞書（translationsの中身）
 * @param {object} [options.settings] chrome.storage.localの値（既定値を上書き）
 * @param {() => Promise<Response>} [options.fetchImpl] fetchの差し替え
 * @param {string} [options.uiLanguage] chrome.i18n.getUILanguage()の戻り値
 */
export async function loadPage({ url, body, dict = {}, settings = {}, fetchImpl, uiLanguage = 'ja' } = {}) {
  // fetchされたURL。どの言語の辞書を読みに行ったかの確認に使う
  const fetchedUrls = [];
  // console.error()の出力（辞書読み込み失敗時など、content.jsが意図して出すもの）
  const consoleErrors = [];
  // タイマー・requestAnimationFrame・MutationObserver等のコールバック内で発生した
  // 未捕捉例外。jsdomはこれを'error'ではなく'jsdomError'として通知するため、
  // 購読しないと握りつぶされ、「翻訳されないこと」を確認するテストが例外による
  // 処理中断でも誤って成功してしまう。検出したらテストを失敗させる
  const exceptions = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (...args) => consoleErrors.push(args));
  // location.reload()の回数。jsdomは画面遷移を実装しておらず'not-implemented'として通知する
  let reloads = 0;
  virtualConsole.on('jsdomError', (error) => {
    if (error.type === 'unhandled-exception') exceptions.push(error.cause ?? error);
    else if (error.type === 'not-implemented' && /navigation/.test(error.message)) reloads++;
  });

  const dom = new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  patchLongSelectors(window);

  // chrome.storage.localへの書き込みと、window.openで開いたURL
  const storageCalls = [];
  const openedUrls = [];
  // 書き込みはstoreにも反映し、あとの読み込みで返す
  const store = JSON.parse(JSON.stringify(settings));
  const changeListeners = [];
  // failStorageWrites()で設定する、書き込み失敗時のエラーメッセージ
  let writeError = null;
  window.chrome = {
    runtime: { getURL: (p) => `chrome-extension://test/${p}`, getManifest: () => ({ version: '9.9.9' }) },
    i18n: { getMessage: () => '', getUILanguage: () => uiLanguage },
    storage: {
      local: {
        get: (defaults, callback) => callback({ ...defaults, ...JSON.parse(JSON.stringify(store)) }),
        // jsdom側で作られたオブジェクトはプロトタイプが別物でdeepEqualが通らないため詰め替える
        set: (items, callback) => {
          if (writeError) return failWithLastError(window, writeError, callback);
          storageCalls.push({ method: 'set', items: JSON.parse(JSON.stringify(items)) });
          Object.assign(store, JSON.parse(JSON.stringify(items)));
          callback?.();
        },
        remove: (keys, callback) => {
          if (writeError) return failWithLastError(window, writeError, callback);
          storageCalls.push({ method: 'remove', keys });
          [].concat(keys).forEach((key) => delete store[key]);
          callback?.();
        }
      },
      onChanged: { addListener: (listener) => changeListeners.push(listener) }
    }
  };
  window.open = (openUrl) => {
    openedUrls.push(String(openUrl));
    return null;
  };
  // languages.jsonだけは実ファイルを返し、それ以外（辞書）はdictを返す
  const defaultFetch = async (requestUrl) => {
    if (String(requestUrl).endsWith('/languages.json')) {
      const languages = readRepoFile('languages.json');
      return { ok: true, text: async () => languages, json: async () => JSON.parse(languages) };
    }
    return { ok: true, text: async () => JSON.stringify({ translations: dict }) };
  };
  window.fetch = (requestUrl, ...rest) => {
    fetchedUrls.push(String(requestUrl));
    return (fetchImpl || defaultFetch)(requestUrl, ...rest);
  };

  function throwIfExceptions() {
    if (exceptions.length === 0) return;
    const [first] = exceptions;
    throw new Error(`Unhandled exception in page: ${first?.message ?? first}`, { cause: first });
  }

  window.eval(sharedSource);
  window.eval(contentSource);
  await tick(window);
  throwIfExceptions();

  return {
    window,
    document: window.document,
    consoleErrors,
    exceptions,
    fetchedUrls,
    storageCalls,
    openedUrls,
    store,
    get reloads() {
      return reloads;
    },
    // 以降のchrome.storage.localへの書き込みを失敗させる（容量超過など）
    failStorageWrites(message = 'QUOTA_BYTES quota exceeded') {
      writeError = message;
    },
    // ほかのタブ等でchrome.storage.localが変わったことを通知する（storeは呼び出し側で更新する）
    fireStorageChange(changes) {
      changeListeners.forEach((listener) => listener(changes, 'local'));
    },
    // DOM変更後、MutationObserver→requestAnimationFrame→再翻訳が終わるまで待つ
    async settle() {
      await tick(window);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await tick(window);
      throwIfExceptions();
    },
    text(selector) {
      return window.document.querySelector(selector).textContent;
    },
    // afterEachから呼ぶ。settle()を挟まずに終わるテストでも例外を見逃さない
    close() {
      window.close();
      throwIfExceptions();
    }
  };
}

/**
 * options.htmlをjsdom上で開き、shared.jsとoptions.jsを実行する。
 * chrome.storage.localは読み書きできるメモリ上のストアで、書き込みはstorageCallsにも記録する。
 *
 * @param {object} [options]
 * @param {Record<string, Record<string, string>>} [options.dicts] 言語コードごとの辞書（translationsの中身）
 * @param {object} [options.settings] chrome.storage.localに保存済みの値
 * @param {string} [options.uiLanguage] chrome.i18n.getUILanguage()の戻り値
 * @param {boolean} [options.confirmResult] window.confirm()の戻り値
 */
export async function loadOptions({ dicts = {}, settings = {}, uiLanguage = 'ja', confirmResult = true } = {}) {
  const dom = new JSDOM(readRepoFile('options.html'), {
    url: 'chrome-extension://test/options.html',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  const store = JSON.parse(JSON.stringify(settings));
  const storageCalls = [];
  const openedUrls = [];
  const languages = readRepoFile('languages.json');
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const changeListeners = [];
  // failStorageWrites()で設定する、書き込み失敗時のエラーメッセージ
  let writeError = null;

  window.chrome = {
    runtime: { getURL: (p) => `chrome-extension://test/${p}`, getManifest: () => ({ version: '9.9.9' }) },
    i18n: {
      getMessage: (key, substitutions) =>
        substitutions ? `${key}(${[].concat(substitutions).join(',')})` : key,
      getUILanguage: () => uiLanguage
    },
    storage: {
      local: {
        // nullを渡すと、chrome.storageと同じくすべての値を返す
        get: (defaults, callback) => {
          if (defaults === null) return callback(copy(store));
          const result = { ...defaults };
          for (const key of Object.keys(defaults)) if (key in store) result[key] = copy(store[key]);
          callback(result);
        },
        set: (items, callback) => {
          if (writeError) return failWithLastError(window, writeError, callback);
          storageCalls.push({ method: 'set', items: copy(items) });
          Object.assign(store, copy(items));
          callback?.();
        },
        remove: (keys, callback) => {
          if (writeError) return failWithLastError(window, writeError, callback);
          storageCalls.push({ method: 'remove', keys });
          [].concat(keys).forEach((key) => delete store[key]);
          callback?.();
        }
      },
      onChanged: { addListener: (listener) => changeListeners.push(listener) }
    }
  };
  window.fetch = async (requestUrl) => {
    const url = String(requestUrl);
    if (url.endsWith('/languages.json')) {
      return { ok: true, text: async () => languages, json: async () => JSON.parse(languages) };
    }
    const code = url.match(/dictionaries\/(.+)\.json$/)?.[1];
    const name = JSON.parse(languages).languages.find((language) => language.code === code)?.name;
    return { ok: true, text: async () => JSON.stringify({ language: code, name, translations: dicts[code] || {} }) };
  };
  window.open = (openUrl) => {
    openedUrls.push(String(openUrl));
    return null;
  };
  window.chrome.tabs = {
    create: async ({ url }) => {
      openedUrls.push(String(url));
    }
  };
  window.confirm = () => confirmResult;

  window.eval(sharedSource);
  window.eval(readRepoFile('options.js'));
  // 言語一覧→保存済み設定→辞書→ユーザー辞書の順に非同期で読み込むため、数回待つ
  for (let i = 0; i < 5; i++) await tick(window);

  return {
    window,
    document: window.document,
    store,
    storageCalls,
    openedUrls,
    // ほかのタブ等でchrome.storage.localが変わったことを通知する（storeは呼び出し側で更新する）
    fireStorageChange(changes) {
      changeListeners.forEach((listener) => listener(changes, 'local'));
    },
    // 以降のchrome.storage.localへの書き込みを失敗させる（容量超過など）
    failStorageWrites(message = 'QUOTA_BYTES quota exceeded') {
      writeError = message;
    },
    tick: () => tick(window),
    async flush() {
      for (let i = 0; i < 5; i++) await tick(window);
    },
    close() {
      window.close();
    }
  };
}
