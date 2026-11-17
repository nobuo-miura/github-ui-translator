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
    // Chromeの_localesと同じアンダースコア区切り、大文字小文字の違い
    ['pt_BR', 'pt-BR'],
    ['ZH-cn', 'zh-CN'],
    // 地域違いは言語部分が同じ辞書を使う
    ['de-AT', 'de'],
    ['es-419', 'es'],
    ['pt-PT', 'pt-BR'],
    ['zh-TW', 'zh-CN'],
    // 対応していない言語・不明な値はjaにする
    ['en-US', 'ja'],
    ['it', 'ja'],
    ['', 'ja'],
    [undefined, 'ja']
  ]) {
    it(`${JSON.stringify(uiLanguage)} → ${expected}`, async () => {
      page = await loadPage({ url: REPO_URL, body: '' });
      const { resolveDefaultLanguage } = page.window.GitHubUITranslator;
      assert.equal(resolveDefaultLanguage(uiLanguage, CODES), expected);
    });
  }
});

describe('content.jsの初期言語', () => {
  it('言語が未設定なら、ブラウザーの表示言語の辞書を読み込む', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: BODY, uiLanguage: 'de' });
    assert.deepEqual(dictionaryUrls(), ['chrome-extension://test/dictionaries/de.json']);
    assert.equal(page.text('#a'), 'translated');
  });

  it('対応していない表示言語ならjaの辞書を読み込む', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: BODY, uiLanguage: 'en-US' });
    assert.deepEqual(dictionaryUrls(), ['chrome-extension://test/dictionaries/ja.json']);
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

  it('言語一覧を読み込めなくてもjaで翻訳を続ける', async () => {
    page = await loadPage({
      url: REPO_URL,
      body: BODY,
      uiLanguage: 'de',
      fetchImpl: async (url) => {
        if (String(url).endsWith('/languages.json')) throw new Error('network error');
        return { ok: true, text: async () => JSON.stringify({ translations: DICT }) };
      }
    });
    assert.deepEqual(dictionaryUrls(), ['chrome-extension://test/dictionaries/ja.json']);
    assert.equal(page.text('#a'), 'translated');
  });

  it('翻訳がOFFなら言語一覧も辞書も読み込まない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: BODY, uiLanguage: 'de', settings: { enabled: false } });
    assert.deepEqual(page.fetchedUrls, []);
    assert.equal(page.text('#a'), 'Code');
  });
});
