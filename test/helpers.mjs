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
function tick(window) {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

/**
 * @param {object} options
 * @param {string} options.url ページのURL（パスで翻訳スコープが変わる）
 * @param {string} options.body <body>の中身
 * @param {Record<string, string>} [options.dict] 辞書（translationsの中身）
 * @param {object} [options.settings] chrome.storage.localの値（既定値を上書き）
 * @param {() => Promise<Response>} [options.fetchImpl] fetchの差し替え
 */
export async function loadPage({ url, body, dict = {}, settings = {}, fetchImpl } = {}) {
  // console.error()の出力（辞書読み込み失敗時など、content.jsが意図して出すもの）
  const consoleErrors = [];
  // タイマー・requestAnimationFrame・MutationObserver等のコールバック内で発生した
  // 未捕捉例外。jsdomはこれを'error'ではなく'jsdomError'として通知するため、
  // 購読しないと握りつぶされ、「翻訳されないこと」を確認するテストが例外による
  // 処理中断でも誤って成功してしまう。検出したらテストを失敗させる
  const exceptions = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (...args) => consoleErrors.push(args));
  virtualConsole.on('jsdomError', (error) => {
    if (error.type === 'unhandled-exception') exceptions.push(error.cause ?? error);
  });

  const dom = new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  patchLongSelectors(window);

  window.chrome = {
    runtime: { getURL: (p) => `chrome-extension://test/${p}` },
    i18n: { getMessage: () => '', getUILanguage: () => 'ja' },
    storage: {
      local: { get: (defaults, callback) => callback({ ...defaults, ...settings }) },
      onChanged: { addListener: () => {} }
    }
  };
  window.fetch = fetchImpl || (async () => ({
    ok: true,
    text: async () => JSON.stringify({ translations: dict })
  }));

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
