// 実際の繁体字辞書を使い、固定UIとユーザーコンテンツの境界を検証する
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, readRepoFile } from './helpers.mjs';

const rawDictionary = readRepoFile('dictionaries/zh-TW.json');
let page;
afterEach(() => page?.close());

function loadTraditionalPage(body) {
  return loadPage({
    url: 'https://github.com/octo/repo/settings',
    body,
    settings: { language: 'zh-TW' },
    fetchImpl: async () => ({ ok: true, text: async () => rawDictionary })
  });
}

describe('台湾向けの繁体字辞書', () => {
  it('JSONC辞書から固定UIを翻訳し、READMEやコードは保持する', async () => {
    page = await loadTraditionalPage(`
      <nav><a id="settings" href="/octo/repo/settings">Settings</a></nav>
      <button id="repository">New repository</button>
      <button id="save">Save</button>
      <button id="token">Generate token</button>
      <relative-time id="time" datetime="2026-11-22T00:00:00Z"></relative-time>
      <div class="markdown-body"><p id="readme">Settings</p></div>
      <pre><code id="code">Save</code></pre>
    `);
    assert.deepEqual(page.fetchedUrls, ['chrome-extension://test/dictionaries/zh-TW.json']);
    assert.equal(page.text('#settings'), '設定');
    assert.equal(page.text('#repository'), '新增儲存庫');
    assert.equal(page.text('#save'), '儲存');
    assert.equal(page.text('#token'), '產生權杖');
    assert.equal(page.document.querySelector('#time').getAttribute('lang'), 'zh-TW');
    assert.equal(page.text('#readme'), 'Settings');
    assert.equal(page.text('#code'), 'Save');
  });

  it('インラインリンクとcode要素を保ったまま設定の説明文を翻訳する', async () => {
    page = await loadTraditionalPage(`
      <p id="branch"><a id="link" href="https://docs.github.com/example">Changing your default branch</a> can have unintended consequences that can affect new pull requests and clones.</p>
      <p id="funding">You can add a <code id="path">.github/FUNDING.yml</code> file to this repository to override the <a href="https://docs.github.com/funding">organization funding file</a> </p>
      <p id="sponsors">Before you can delete your account, you must unpublish your Sponsors profile. This can be done from the <a id="sponsors-link" href="/sponsors/accounts">Sponsors Dashboard settings page</a></p>
    `);
    assert.equal(page.text('#branch'), '變更預設分支可能會產生意外後果，影響新的 Pull Request 和 Clone。');
    assert.equal(page.text('#link'), '變更預設分支');
    assert.equal(page.document.querySelector('#link').getAttribute('href'), 'https://docs.github.com/example');
    assert.equal(page.text('#funding'), '你可以向此儲存庫新增 .github/FUNDING.yml 檔案，以覆蓋組織資助檔案');
    assert.equal(page.text('#path'), '.github/FUNDING.yml');
    assert.equal(page.text('#sponsors'), '刪除帳號前，你必須先取消公開 Sponsors 個人資料。操作位置：Sponsors 儀表板設定頁面');
    assert.equal(page.text('#sponsors-link'), 'Sponsors 儀表板設定頁面');
    assert.equal(page.document.querySelector('#sponsors-link').getAttribute('href'), '/sponsors/accounts');

    page.document.querySelector('#branch').insertAdjacentHTML('afterend', '<button id="later">Default branch</button>');
    await page.settle();
    assert.equal(page.text('#later'), '預設分支');
  });
});
