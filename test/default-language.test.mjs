// 言語が未設定のときに、ブラウザーの表示言語から初期言語を決める処理のテスト
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, readRepoFile } from './helpers.mjs';

const REPO_URL = 'https://github.com/octo/repo';
const BODY = '<nav><a id="a" href="/octo/repo">Code</a></nav>';
const DICT = { Code: 'translated' };
const CODES = JSON.parse(readRepoFile('languages.json')).languages.map(({ code }) => code);

let page;
afterEach(() => page?.close());

function dictionaryUrls() {
  return page.fetchedUrls.filter((url) => url.includes('/dictionaries/'));
}

describe('resolveDefaultLanguage', () => {
  for (const [uiLanguage, expected] of [
    ['ja', 'ja'],
    ['de', 'de'],
    ['pt-BR', 'pt-BR'],
    ['zh-CN', 'zh-CN'],
    ['zh-TW', 'zh-TW'],
    ['zh_TW', 'zh-TW'],
    ['ZH-hAnT', 'zh-TW'],
    ['zh-Hant-TW', 'zh-TW'],
    ['zh_Hant_HK', 'zh-TW'],
    ['zh-HK', 'zh-TW'],
    ['zh-MO', 'zh-TW'],
    ['zh-Hant-CN', 'zh-TW'],
    ['zh-Hans', 'zh-CN'],
    ['zh-Hans-TW', 'zh-CN'],
    ['zh-Hans-HK', 'zh-CN'],
    ['zh-SG', 'zh-CN'],
    ['zh', 'zh-CN'],
    // Chromeの_localesと同じアンダースコア区切り、大文字小文字の違い
    ['pt_BR', 'pt-BR'],
    ['ZH-cn', 'zh-CN'],
    // 地域違いは言語部分が同じ辞書を使う
    ['de-AT', 'de'],
    ['es-419', 'es'],
    ['pt-PT', 'pt-BR'],
    // 対応していない言語・不明な値はnull（翻訳しない）にする
    ['en-US', null],
    ['it', null],
    ['', null],
    [undefined, null]
  ]) {
    it(`${JSON.stringify(uiLanguage)} → ${expected}`, async () => {
      page = await loadPage({ url: REPO_URL, body: '' });
      const { resolveDefaultLanguage } = page.window.GitHubUITranslator;
      assert.equal(resolveDefaultLanguage(uiLanguage, CODES), expected);
    });
  }

  it('中国語の汎用コードは辞書の並び順によらず簡体字にする', async () => {
    page = await loadPage({ url: REPO_URL, body: '' });
    const { resolveDefaultLanguage } = page.window.GitHubUITranslator;
    assert.equal(resolveDefaultLanguage('zh', ['zh-TW', 'zh-CN', 'ja']), 'zh-CN');
  });

  it('希望する文字体系の辞書がなければ既存の言語フォールバックを使う', async () => {
    page = await loadPage({ url: REPO_URL, body: '' });
    const { resolveDefaultLanguage } = page.window.GitHubUITranslator;
    assert.equal(resolveDefaultLanguage('zh-Hant', ['ja', 'zh-CN']), 'zh-CN');
    assert.equal(resolveDefaultLanguage('zh-Hans', ['ja', 'zh-TW']), 'zh-TW');
    assert.equal(resolveDefaultLanguage('zh-Hant', ['ja']), null);
  });
});

describe('content.jsの初期言語', () => {
  it('繁体字の表示言語なら台湾向けの辞書を読み込む', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: `${BODY}<relative-time id="time" datetime="2026-11-22T00:00:00Z"></relative-time>`,
      uiLanguage: 'zh-Hant'
    });
    assert.deepEqual(dictionaryUrls(), ['chrome-extension://test/dictionaries/zh-TW.json']);
    assert.equal(page.text('#a'), 'translated');
    assert.equal(page.document.querySelector('#time').getAttribute('lang'), 'zh-TW');
  });

  it('言語が未設定なら、ブラウザーの表示言語の辞書を読み込む', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: BODY, uiLanguage: 'de' });
    assert.deepEqual(dictionaryUrls(), ['chrome-extension://test/dictionaries/de.json']);
    assert.equal(page.text('#a'), 'translated');
  });

  it('対応していない表示言語なら辞書を読み込まず、翻訳しない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: BODY, uiLanguage: 'en-US' });
    assert.deepEqual(dictionaryUrls(), []);
    assert.equal(page.text('#a'), 'Code');
  });

  it('対応していない表示言語でも、保存済みの言語があれば翻訳する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: BODY,
      uiLanguage: 'en-US',
      settings: { language: 'ja' }
    });
    assert.deepEqual(dictionaryUrls(), ['chrome-extension://test/dictionaries/ja.json']);
    assert.equal(page.text('#a'), 'translated');
  });

  it('保存済みの言語があれば、表示言語より優先する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: BODY,
      uiLanguage: 'de',
      settings: { language: 'fr' }
    });
    assert.deepEqual(page.fetchedUrls, ['chrome-extension://test/dictionaries/fr.json']);
  });

  it('言語一覧を読み込めなければ、言語を判定できないので翻訳しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      body: BODY,
      uiLanguage: 'de',
      fetchImpl: async (url) => {
        if (String(url).endsWith('/languages.json')) throw new Error('network error');
        return { ok: true, text: async () => JSON.stringify({ translations: DICT }) };
      }
    });
    assert.deepEqual(dictionaryUrls(), []);
    assert.equal(page.text('#a'), 'Code');
  });

  it('翻訳がOFFなら言語一覧も辞書も読み込まない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: BODY, uiLanguage: 'de', settings: { enabled: false } });
    assert.deepEqual(page.fetchedUrls, []);
    assert.equal(page.text('#a'), 'Code');
  });
});
