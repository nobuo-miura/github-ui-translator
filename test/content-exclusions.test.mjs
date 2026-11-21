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
    ['リリース', '/octo/repo/releases/tag/v1.0.0'],
    ['Organizationのチーム', '/orgs/octo/teams/code'],
    ['比較範囲', '/octo/repo/compare/main...Code']
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

  it('プルリクエスト作成への比較リンク（?expand=1）は翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo',
      dict: DICT,
      body: '<nav><a id="cmp" href="/octo/repo/compare/feature?expand=1">Code</a><a id="range" href="/octo/repo/compare/main...Code">Code</a></nav>'
    });
    assert.equal(page.text('#cmp'), 'コード');
    assert.equal(page.text('#range'), 'Code');
  });

  it('チーム画面のタブ・ロール絞り込みとチーム作成ボタンは翻訳し、チーム名は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/orgs/octo/teams/core',
      dict: DICT,
      body: `<nav><a id="tab" href="/orgs/octo/teams/core/members">Code</a><a id="new" href="/orgs/octo/new-team">Code</a><a id="list" href="/orgs/octo/teams">Code</a>
        <a id="role" href="/orgs/octo/teams/core?query=role%3Amember">Code</a><a id="name" href="/orgs/octo/teams/code">Code</a></nav>`
    });
    assert.equal(page.text('#tab'), 'コード');
    assert.equal(page.text('#new'), 'コード');
    assert.equal(page.text('#list'), 'コード');
    assert.equal(page.text('#role'), 'コード');
    assert.equal(page.text('#name'), 'Code');
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

describe('Organizationのチーム作成画面の親チーム選択', () => {
  const menu = (checked) => `<dl><dt>General</dt><dd><details>
    <summary role="button" aria-haspopup="menu"><span id="team-search-button-text" data-menu-button>${checked ? 'Code' : 'General'}</span></summary>
    <details-menu role="menu">
      <span id="header">General</span>
      <div id="team-search-results">
        <button type="button" role="menuitemradio" aria-checked="${checked}" data-team-name="Code"><div data-menu-button-text><span id="team">Code</span></div></button>
      </div>
    </details-menu>
  </details></dd></dl>`;

  it('候補のチーム名は翻訳せず、未選択時のボタンの固定文言は翻訳する', async () => {
    page = await loadPage({ url: 'https://github.com/orgs/acme/new-team', dict: DICT, body: menu(false) });
    assert.equal(page.text('#team'), 'Code');
    assert.equal(page.text('#team-search-button-text'), '一般');
  });

  it('チームを選択したあとのボタンのチーム名は翻訳しない', async () => {
    page = await loadPage({ url: 'https://github.com/orgs/acme/new-team', dict: DICT, body: menu(true) });
    assert.equal(page.text('#team-search-button-text'), 'Code');
  });
});

describe('Organizationのチーム設定（コードレビュー）', () => {
  it('割り当てから外すメンバーの候補（ユーザー名）は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/orgs/acme/teams/core/edit/review_assignment',
      dict: DICT,
      body: `<details><summary role="button"><span id="btn">General</span></summary>
        <details-menu role="menu"><ul class="select-menu-list"><li>
          <label class="select-menu-item" role="menuitemcheckbox"><input type="checkbox"><span id="member" class="select-menu-item-text">Code</span></label>
        </li></ul></details-menu></details>`
    });
    assert.equal(page.text('#btn'), '一般');
    assert.equal(page.text('#member'), 'Code');
  });
});

describe('入力欄の内容', () => {
  it('親要素から走査してもtextareaの初期値（子テキスト）は翻訳せず、placeholderとaria-labelは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/1/changes',
      dict: DICT,
      body: `<fieldset aria-label="General"><div><span>
        <textarea id="ta" aria-label="General" placeholder="General">Code</textarea>
      </span></div></fieldset>`
    });
    const ta = page.document.querySelector('#ta');
    assert.equal(ta.defaultValue, 'Code');
    assert.equal(ta.getAttribute('placeholder'), '一般');
    assert.equal(ta.getAttribute('aria-label'), '一般');
  });
});

describe('Issue/PRのタイトル', () => {
  it('.markdown-titleと新しい形式のmarkdownTitle__<hash>のタイトルは翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/pull/1',
      dict: DICT,
      body: `<div data-component="PageHeader"><h1 data-component="Heading">
        <span id="new" class="f1 text-normal markdownTitle__jQX53G" data-component="Text" title="Code">Code</span>
      </h1></div>
      <h2><span id="old" class="markdown-title">Code</span></h2>
      <h3 id="heading">General</h3>`
    });
    assert.equal(page.text('#new'), 'Code');
    assert.equal(page.text('#old'), 'Code');
    assert.equal(page.text('#heading'), '一般');
  });
});

describe('Actionsの実行一覧', () => {
  it('ワークフロー別の一覧では見出しと各行のワークフロー名を翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/actions/workflows/code.yml',
      dict: DICT,
      body: `<div data-component="PageHeader"><h1 id="title" data-component="PH_Title">Code</h1></div>
      <section aria-label="Workflow runs for Code"><h2 id="sr">General</h2><ul role="list"><li>
        <div><strong id="wf" title="Code">Code</strong><span>#1:</span><span>Manually run</span></div>
      </li></ul></section>`
    });
    assert.equal(page.text('#title'), 'Code');
    assert.equal(page.text('#wf'), 'Code');
    assert.equal(page.text('#sr'), '一般');
  });

  it('全ワークフローの一覧でも各行のワークフロー名を翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/actions',
      dict: DICT,
      body: `<section aria-label="Workflow runs"><ul role="list"><li><div><strong id="wf">Code</strong><span>#1:</span></div></li></ul></section>`
    });
    assert.equal(page.text('#wf'), 'Code');
  });
});

describe('Organizationのリポジトリ一覧とチーム画面', () => {
  it('/orgs/<org>/repositories のリポジトリ名・説明は翻訳せず、可視性ラベルは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/orgs/acme/repositories',
      dict: { ...DICT, Private: 'プライベート' },
      body: `<div class="ReposListContainer__20MJPz"><ul role="list"><li aria-label="Code.">
        <div class="DefaultItemTitleContainer__Wu0ri7">
          <h4 class="heading__fzQskI DefaultItemTitle__ITneTl"><a href="/acme/Code"><span id="name">Code</span></a></h4>
          <span id="label" data-component="Label">Private</span>
        </div>
        <div class="FormattedDescription__JqeVHv"><div id="desc">General</div></div>
      </li></ul></div>`
    });
    assert.equal(page.text('#name'), 'Code');
    assert.equal(page.text('#desc'), 'General');
    assert.equal(page.text('#label'), 'プライベート');
  });

  it('チーム画面のサイドバーのチーム名は翻訳せず、Aboutの見出しは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/orgs/acme/teams/code',
      dict: DICT,
      body: `<div class="Layout-sidebar">
        <div class="d-flex border-bottom"><h2 id="name">Code</h2></div>
        <div class="d-flex"><h3 id="about">General</h3></div>
        <div><p id="desc" class="description">General</p></div>
      </div>`
    });
    assert.equal(page.text('#name'), 'Code');
    assert.equal(page.text('#about'), '一般');
    assert.equal(page.text('#desc'), 'General');
  });
});

describe('Organization Settings > カスタムプロパティ（Set values）', () => {
  it('リポジトリの行（名前・説明文・値）は翻訳せず、見出しは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/organizations/acme/settings/custom-properties?tab=set-values',
      dict: DICT,
      body: `<h1 id="title">General</h1>
      <div data-testid="targets-properties-list"><ul role="list">
        <li aria-label="Code. More information available">
          <h4><a id="name" href="/acme/Code"><span>Code</span></a></h4>
          <div id="desc">General</div>
          <span id="value">Code</span>
        </li>
      </ul></div>`
    });
    assert.equal(page.text('#title'), '一般');
    assert.equal(page.text('#name'), 'Code');
    assert.equal(page.text('#desc'), 'General');
    assert.equal(page.text('#value'), 'Code');
  });

  it('Propertiesタブのプロパティ定義（名前・説明）は翻訳せず、新規作成ボタンは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/organizations/acme/settings/custom-properties?tab=properties',
      dict: DICT,
      body: `<a id="new" href="/organizations/acme/settings/custom-property"><span>Code</span></a>
      <div data-testid="repos-definitions-list"><h2 id="heading">General</h2><ul role="list">
        <li aria-label="Code. Code."><h4><a id="name" href="/organizations/acme/settings/custom-property/Code"><span>Code</span></a></h4><div id="desc">General</div></li>
      </ul></div>`
    });
    assert.equal(page.text('#new'), 'コード');
    assert.equal(page.text('#heading'), '一般');
    assert.equal(page.text('#name'), 'Code');
    assert.equal(page.text('#desc'), 'General');
  });

  it('値を設定するフォームのプロパティ行（名前・説明）は翻訳せず、ボタンは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/organizations/acme/settings/custom-properties?tab=set-values',
      dict: DICT,
      body: `<form data-testid="properties-editing-form"><div role="list">
        <div role="listitem" data-testid="property-row"><div data-component="FormControl">
          <label id="name" data-testid="property-name" for="v">Code</label><span id="desc">General</span><input id="v">
        </div></div>
      </div><button id="save">General</button></form>`
    });
    assert.equal(page.text('#name'), 'Code');
    assert.equal(page.text('#desc'), 'General');
    assert.equal(page.text('#save'), '一般');
  });

  for (const path of ['/organizations/acme/settings/custom-property', '/organizations/acme/settings/custom-property/Star']) {
    it(`作成・編集フォーム（${path}）の選択肢と既定値は翻訳せず、ラベルと説明は翻訳する`, async () => {
      page = await loadPage({
        url: `https://github.com${path}`,
        dict: DICT,
        body: `<div data-testid="property-definition-form">
          <label id="label">General</label>
          <span id="caption" data-component="FormControl.Caption">General</span>
          <ul><li aria-label="Code"><div id="opt">Code</div></li></ul>
          <span id="property-default-value-label">General</span>
          <button id="default" aria-labelledby="property-default-value-label"><span>Code</span></button>
        </div>
        <div data-component="Portal"><div role="dialog"><div data-testid="filtered-action-list">
          <ul role="listbox"><li role="option" id="candidate">Code</li></ul>
        </div></div></div>`
      });
      assert.equal(page.text('#label'), '一般');
      assert.equal(page.text('#caption'), '一般');
      assert.equal(page.text('#opt'), 'Code');
      assert.equal(page.text('#default'), 'Code');
      assert.equal(page.text('#candidate'), 'Code');
    });
  }

  it('値設定画面でPortalに描画される選択肢の候補は翻訳せず、フォームのボタンは翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/organizations/acme/settings/custom-properties?tab=set-values',
      dict: DICT,
      body: `<form data-testid="properties-editing-form"><div role="list">
        <div role="listitem" data-testid="property-row"><button id="value" aria-haspopup="true">Code</button></div>
      </div><button id="save">General</button></form>
      <div data-component="Portal"><div role="dialog"><div data-testid="filtered-action-list">
        <ul role="listbox"><li role="option" id="candidate">Code</li></ul>
      </div></div></div>`
    });
    assert.equal(page.text('#value'), 'Code');
    assert.equal(page.text('#candidate'), 'Code');
    assert.equal(page.text('#save'), '一般');
  });

  it('プロパティ詳細画面の見出しとパンくず末尾（プロパティ名）は翻訳しない', async () => {
    page = await loadPage({
      url: 'https://github.com/organizations/acme/settings/custom-property/Code',
      dict: DICT,
      body: `<nav aria-label="Breadcrumbs"><ol>
        <li><a id="bc1" data-component="Breadcrumbs.Item" href="/organizations/acme/settings/custom-properties">General</a></li>
        <li><a id="bc2" data-component="Breadcrumbs.Item" aria-current="page">Code</a></li>
      </ol></nav>
      <h1 id="title" data-component="PH_Title">Code</h1><button id="edit">General</button>`
    });
    assert.equal(page.text('#bc1'), '一般');
    assert.equal(page.text('#bc2'), 'Code');
    assert.equal(page.text('#title'), 'Code');
    assert.equal(page.text('#edit'), '一般');
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
