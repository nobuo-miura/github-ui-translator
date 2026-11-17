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

describe('グローバルヘッダーのクイック検索', () => {
  it('入力語のオーバーレイと候補行は翻訳せず、候補グループ名は翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo',
      dict: DICT,
      body: `<div role="dialog" aria-label="Quick search">
        <div data-testid="quick-search-input-overlay"><span id="query">Code</span></div>
        <ul role="group" aria-label="Code">
          <li data-testid="quick-search-suggestion"><span id="file">Code</span></li>
        </ul>
      </div>
      <button id="open" aria-label="Open quick search dialog, type / to search"><span id="btn">Code</span></button>`
    });
    assert.equal(page.text('#query'), 'Code');
    assert.equal(page.text('#file'), 'Code');
    assert.equal(page.text('#btn'), 'Code');
    assert.equal(page.document.querySelector('[role="group"]').getAttribute('aria-label'), 'コード');
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

  it('新しいPR画面のタブはPRへのリンクでも翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/2',
      dict: DICT,
      body: `<nav>
        <a id="tab" data-dd-action-name="pull_requests.navigation.commits" href="/octo/repo/pull/2/commits"><span>Code</span></a>
        <a id="title" href="/octo/repo/pull/2"><span>Code</span></a>
      </nav>`
    });
    assert.equal(page.text('#tab'), 'コード');
    assert.equal(page.text('#title'), 'Code');
  });

  it('表示中のPRのコメント絞り込みボタン（View your comments）は翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/2',
      dict: DICT,
      body: `<section aria-label="Merge status">
        <a id="btn" data-component="LinkButton" href="/octo/repo/pull/2?comments=mode:mine#overview-comments"><span>Code</span></a>
        <a id="title" href="/octo/repo/pull/2"><span>Code</span></a>
      </section>`
    });
    assert.equal(page.text('#btn'), 'コード');
    assert.equal(page.text('#title'), 'Code');
  });

  it('ボタン形式でも、Issue/PRへのリンクに出るユーザー作成タイトルは翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/2',
      dict: DICT,
      body: `<section aria-label="Merge status">
        <a id="issue" data-component="LinkButton" href="/octo/repo/issues/3"><span>Code</span></a>
        <a id="other-pr" data-component="LinkButton" href="/octo/repo/pull/5?comments=mode:mine"><span>Code</span></a>
        <a id="no-query" data-component="LinkButton" href="/octo/repo/pull/2"><span>Code</span></a>
        <a id="commit" data-component="LinkButton" href="/octo/repo/commit/abc123"><span>Code</span></a>
      </section>`
    });
    assert.equal(page.text('#issue'), 'Code');
    assert.equal(page.text('#other-pr'), 'Code');
    assert.equal(page.text('#no-query'), 'Code');
    assert.equal(page.text('#commit'), 'Code');
  });
});

describe('リポジトリのコード画面', () => {
  it('タイトルのリポジトリ名は翻訳せず、隣のボタンは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/Code',
      dict: DICT,
      body: `<div id="repo-title-component">
        <div data-testid="repo-name-wrapper" title="Code"><strong><a id="name" data-testid="repo-name-link" href="/octo/Code">Code</a></strong></div>
        <button id="btn">Code</button>
      </div>`
    });
    assert.equal(page.text('#name'), 'Code');
    assert.equal(page.text('#btn'), 'コード');
  });
});

describe('CSS Modulesのクラス名に依存する除外（新旧どちらの形式でも効く）', () => {
  const cases = [
    ['/repos のリポジトリ名', 'https://github.com/repos', 'ReposListItem-module__NwoTitle__a1b2c', 'ReposListItem-module_3U0AWW_NwoTitle'],
    ['/repos の説明文', 'https://github.com/repos', 'ReposListItem-module__FormattedDescription__a1b2c', 'ReposListItem-module_iipd_W_FormattedDescription'],
    ['イシューフォーム', 'https://github.com/octo/repo/issues/new', 'IssueFormElements-module__formElementsContainer__a1b2c', 'formElementsContainer__uAB4Ti']
  ];

  for (const [name, url, oldClass, newClass] of cases) {
    it(name, async () => {
      page = await loadPage({
        url,
        dict: DICT,
        body: `<nav>
          <div class="${oldClass}"><span id="old">Code</span></div>
          <div class="${newClass}"><span id="new">Code</span></div>
          <span id="ok">Code</span>
        </nav>`
      });
      assert.equal(page.text('#old'), 'Code');
      assert.equal(page.text('#new'), 'Code');
      assert.equal(page.text('#ok'), 'コード');
    });
  }

  it('テンプレート選択ダイアログのテンプレート名', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/issues',
      dict: DICT,
      body: `<div role="dialog"><ul data-testid="template-list">
        <li><span id="old" class="IssueTemplateItem-module__actionListTitle__a1b2c">Code</span></li>
        <li><span id="new" class="actionListTitle__MASHts">Code</span></li>
      </ul><h2 id="title">Code</h2></div>`
    });
    assert.equal(page.text('#old'), 'Code');
    assert.equal(page.text('#new'), 'Code');
    assert.equal(page.text('#title'), 'コード');
  });
});

describe('Issueのタイプ・フィールド', () => {
  it('サイドバーのフィールド名・値と、ItemPickerの候補行は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/issues/8',
      dict: DICT,
      body: `<div data-testid="sidebar-section">
        <h3 id="heading">General</h3>
        <button aria-label="Set Code, none">
          <span id="label" class="issueFieldLabel__N54pYB">Code</span>
          <span id="value" class="issueFieldValueText__AruN-Y">Code</span>
        </button>
        <ul data-testid="item-picker-root" role="listbox" aria-label="Issue Type results">
          <li role="option" id="opt">Code</li>
        </ul>
      </div>`
    });
    assert.equal(page.text('#heading'), '一般');
    assert.equal(page.text('#label'), 'Code');
    assert.equal(page.text('#value'), 'Code');
    assert.equal(page.text('#opt'), 'Code');
  });

  it('設定済みのタイプ名（type:で絞り込むリンク）は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/issues',
      dict: DICT,
      body: `<div data-testid="issue-type-container"><div class="issueTypeTokenContainer__5d1">
        <a id="type" href="/octo/repo/issues?q=type:%22Code%22"><span class="prc-Token-TokenBase-te5-F"><span>Code</span></span></a>
      </div></div>
      <a id="nav" href="/octo/repo">Code</a>`
    });
    assert.equal(page.text('#type'), 'Code');
    assert.equal(page.text('#nav'), 'コード');
  });

  for (const base of ['/settings', '/organizations/acme/settings']) {
    it(`${base}/issue-types の一覧のタイプ名・説明文は翻訳せず、固定文言は翻訳する`, async () => {
      page = await loadPage({
        url: `https://github.com${base}/issue-types`,
        dict: DICT,
        body: `<p id="intro">General</p>
        <ul><li data-testid="1" aria-label="&quot;Code&quot; Issue type list item">
          <a id="name" href="${base}/issue-types/1"><span>Code</span></a>
          <span id="desc">General</span>
        </li></ul>`
      });
      assert.equal(page.text('#intro'), '一般');
      assert.equal(page.text('#name'), 'Code');
      assert.equal(page.text('#desc'), 'General');
    });
  }

  it('Issue fieldsの編集画面の選択肢（Token）は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/settings/issue-fields/1',
      dict: DICT,
      body: `<label id="field">General</label>
      <ul aria-label="Single select options"><li><span class="prc-Token-TokenBase-te5-F"><span id="opt">Code</span></span></li></ul>`
    });
    assert.equal(page.text('#field'), '一般');
    assert.equal(page.text('#opt'), 'Code');
  });
});

describe('レビュー送信ポップアップの保留中コメント', () => {
  it('コメント見出しのファイル名とツールチップは翻訳せず、ダイアログの見出しは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/2',
      dict: DICT,
      body: `<div role="dialog">
        <h2 id="title">General</h2>
        <h3><a id="file" href="/octo/repo/pull/2/changes#r123">Code</a><span id="tip" data-component="Tooltip" aria-hidden="true">Code</span><span>Line 1</span></h3>
      </div>`
    });
    assert.equal(page.text('#title'), '一般');
    assert.equal(page.text('#file'), 'Code');
    assert.equal(page.text('#tip'), 'Code');
  });
});

describe('新しいPR画面のマージボックス', () => {
  it('カード内の<p>は翻訳し、カード外の<p>は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/2',
      dict: DICT,
      body: `<section aria-label="Merge status">
        <section aria-label="Approvals" data-testid="mini-status"><div><p id="card">General</p></div></section>
        <p id="outside">General</p>
      </section>`
    });
    assert.equal(page.text('#card'), '一般');
    assert.equal(page.text('#outside'), 'General');
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
