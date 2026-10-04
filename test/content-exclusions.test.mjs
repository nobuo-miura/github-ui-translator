// ユーザー作成コンテンツ（リポジトリ名・ファイル名・タイトル等）を誤訳しないためのテスト
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './helpers.mjs';

const DICT = {
  Code: 'コード',
  General: '一般',
  Inbox: '受信トレイ',
  'Set up job': 'ジョブのセットアップ',
  Build: 'ビルド',
  'Target:': 'ターゲット:'
};

let page;
afterEach(() => page?.close());

describe('共通の除外セレクター', () => {
  it('.markdown-body・code・ユーザーのホバーカード内は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo',
      dict: DICT,
      body: `<nav>
        <div class="markdown-body"><span id="md">Code</span></div>
        <code id="code">Code</code>
        <span data-hovercard-type="user" id="user">Code</span>
        <span id="ok">Code</span>
      </nav>`
    });
    assert.equal(page.text('#md'), 'Code');
    assert.equal(page.text('#code'), 'Code');
    assert.equal(page.text('#user'), 'Code');
    assert.equal(page.text('#ok'), 'コード');
  });

  it('用途が明示されたlistboxの候補行（ラベル名等）は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/issues/1',
      dict: DICT,
      body: `<div role="dialog">
        <h2 id="title">General</h2>
        <div role="listbox" aria-label="Label results"><div role="option" id="opt">Code</div></div>
      </div>`
    });
    assert.equal(page.text('#title'), '一般');
    assert.equal(page.text('#opt'), 'Code');
  });
});

describe('ユーザー作成コンテンツへのリンク', () => {
  const cases = [
    ['Issue', '/octo/repo/issues/1'],
    ['Pull request', '/octo/repo/pull/2'],
    ['ファイル・ディレクトリ', '/octo/repo/tree/main/Code'],
    ['コミット', '/octo/repo/commit/abc123'],
    ['Wikiページ', '/octo/repo/wiki/Code'],
    ['マイルストーン', '/octo/repo/milestones/Code'],
    ['リリース', '/octo/repo/releases/tag/v1.0.0']
  ];

  for (const [name, href] of cases) {
    it(`${name}へのリンク（${href}）は翻訳しない`, async () => {
      page = await loadPage({ url: 'https://github.com/octo/repo', dict: DICT, body: `<nav><a id="a" href="${href}">Code</a></nav>` });
      assert.equal(page.text('#a'), 'Code');
    });
  }

  it('新規作成への固定リンクは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo',
      dict: DICT,
      body: '<nav><a id="wiki" href="/octo/repo/wiki/_new">Code</a><a id="ms" href="/octo/repo/milestones/new">Code</a></nav>'
    });
    assert.equal(page.text('#wiki'), 'コード');
    assert.equal(page.text('#ms'), 'コード');
  });
});

describe('画面固有の除外', () => {
  it('マイルストーン詳細のh1（マイルストーン名）は翻訳しない', async () => {
    page = await loadPage({ url: 'https://github.com/octo/repo/milestone/3', dict: DICT, body: '<h1 id="h">Code</h1>' });
    assert.equal(page.text('#h'), 'Code');
    page.close();

    page = await loadPage({ url: 'https://github.com/octo/repo/milestones', dict: DICT, body: '<h1 id="h">Code</h1>' });
    assert.equal(page.text('#h'), 'コード');
  });

  it('ダッシュボードのサイドバーで2番目以降のnav（保存済みビュー）は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/pulls',
      dict: DICT,
      body: `<aside>
        <nav><a id="fixed" href="/pulls/inbox">Inbox</a></nav>
        <nav><a id="saved" href="/pulls?view=1">Inbox</a></nav>
      </aside>`
    });
    assert.equal(page.text('#fixed'), '受信トレイ');
    assert.equal(page.text('#saved'), 'Inbox');
  });

  it('Actionsのジョブログでは固定Stepだけ翻訳し、ユーザー定義Stepは翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/actions/runs/1/job/2',
      dict: DICT,
      body: `<nav>
        <span class="CheckStep-titleName" id="fixed">Set up job</span>
        <span class="CheckStep-titleName" id="user">Build</span>
      </nav>`
    });
    assert.equal(page.text('#fixed'), 'ジョブのセットアップ');
    assert.equal(page.text('#user'), 'Build');
  });

  it('Discussionの標準カテゴリは翻訳し、カスタムカテゴリは翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/discussions',
      dict: DICT,
      body: `<nav>
        <a id="standard" href="/octo/repo/discussions/categories/general">General</a>
        <a id="custom" href="/octo/repo/discussions/categories/team-general">General</a>
      </nav>`
    });
    assert.equal(page.text('#standard'), '一般');
    assert.equal(page.text('#custom'), 'General');
  });

  it('リリース作成画面のTargetボタンは固定ラベルだけ訳し、ブランチ名は保持する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/releases/new',
      dict: DICT,
      body: '<div class="js-release-target-wrapper"><button id="t" aria-label="Target: Code">Target: Code</button></div>'
    });
    assert.equal(page.text('#t'), 'ターゲット: Code');
    assert.equal(page.document.querySelector('#t').getAttribute('aria-label'), 'ターゲット: Code');
  });
});
