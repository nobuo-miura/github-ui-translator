// テストヘルパー自体が、ページ内の非同期な未捕捉例外を検出できることの確認
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './helpers.mjs';

const URL = 'https://github.com/octo/repo';

describe('loadPageの未捕捉例外の検出', () => {
  for (const [name, source] of [
    ['setTimeout', 'setTimeout(() => { throw new Error("boom"); }, 0);'],
    ['requestAnimationFrame', 'requestAnimationFrame(() => { throw new Error("boom"); });'],
    [
      'MutationObserver',
      'new MutationObserver(() => { throw new Error("boom"); }).observe(document.body, { childList: true });' +
        'document.body.append("x");'
    ]
  ]) {
    it(`${name}のコールバック内の例外でsettle()が失敗する`, async () => {
      const page = await loadPage({ url: URL, body: '' });
      page.window.eval(source);
      await assert.rejects(page.settle(), /Unhandled exception in page: boom/);
      page.exceptions.length = 0;
      page.close();
    });
  }

  it('settle()を呼ばなくてもclose()で例外を検出する', async () => {
    const page = await loadPage({ url: URL, body: '' });
    page.window.eval('setTimeout(() => { throw new Error("boom"); }, 0);');
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.throws(() => page.close(), /Unhandled exception in page: boom/);
  });

  it('console.errorは例外として扱わずconsoleErrorsに記録する', async () => {
    const page = await loadPage({ url: URL, body: '' });
    page.window.eval('console.error("expected");');
    await page.settle();
    assert.equal(page.consoleErrors.length, 1);
    page.close();
  });
});
