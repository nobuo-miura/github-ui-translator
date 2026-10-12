// content.jsの翻訳挙動（完全一致・属性・スコープ・設定・動的DOM）のテスト
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, readRepoFile } from './helpers.mjs';

const DICT = {
  Code: 'コード',
  'Pull requests': 'プルリクエスト',
  Settings: '設定',
  Star: 'スター',
  Name: '名前',
  Description: '説明',
  'Save changes': '変更を保存',
  'Saving…': '保存中…',
  Search: '検索'
};

const REPO_URL = 'https://github.com/octo/repo';

let page;
afterEach(() => page?.close());

describe('基本の翻訳', () => {
  it('許可リスト要素内の完全一致したテキストを翻訳する', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="a" href="/octo/repo">Code</a></nav>' });
    assert.equal(page.text('#a'), 'コード');
  });

  it('許可リスト外の要素は翻訳しない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<p id="p">Code</p><div id="d">Code</div>' });
    assert.equal(page.text('#p'), 'Code');
    assert.equal(page.text('#d'), 'Code');
  });

  it('部分一致では翻訳しない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<button id="b">Code review</button>' });
    assert.equal(page.text('#b'), 'Code review');
  });

  it('改行やインデントを含むテキストも正規化して辞書を引く', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<button id="b">\n    Pull\n    requests\n  </button>' });
    assert.equal(page.text('#b').trim(), 'プルリクエスト');
  });

  it('aria-label・placeholder・ボタンのvalueも改行や連続空白を正規化して辞書を引く', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/issues',
      dict: DICT,
      body: `<button id="b" aria-label="Pull
        requests"></button>
        <input id="i" placeholder="  Save   changes ">
        <input id="s" type="submit" value="Save
          changes">`
    });
    assert.equal(page.document.querySelector('#b').getAttribute('aria-label'), 'プルリクエスト');
    assert.equal(page.document.querySelector('#i').getAttribute('placeholder'), '  変更を保存 ');
    assert.equal(page.document.querySelector('#s').value, '変更を保存');
  });

  it('aria-labelを翻訳する', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<button id="b" aria-label="Settings"></button>' });
    assert.equal(page.document.querySelector('#b').getAttribute('aria-label'), '設定');
  });

  it('訳文中の"$&"を置換パターンとして解釈しない', async () => {
    page = await loadPage({ url: REPO_URL, dict: { Star: '$& テスト' }, body: '<button id="b">Star</button>' });
    assert.equal(page.text('#b'), '$& テスト');
  });

  it('Object.prototypeのプロパティ名と一致するテキストを壊さない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<button id="a">toString</button><button id="b">constructor</button><button id="c">__proto__</button>'
    });
    assert.equal(page.text('#a'), 'toString');
    assert.equal(page.text('#b'), 'constructor');
    assert.equal(page.text('#c'), '__proto__');
    assert.deepEqual(page.consoleErrors, []);
  });

  it('送信ボタンのvalueとdata-disable-withを翻訳する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<input type="submit" id="s" value="Save changes" data-disable-with="Saving…">'
    });
    const input = page.document.querySelector('#s');
    assert.equal(input.value, '変更を保存');
    assert.equal(input.getAttribute('data-disable-with'), '保存中…');
  });

  it('テキスト入力欄のvalue（ユーザー入力）は翻訳せず、aria-labelだけ翻訳する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<input type="text" id="t" value="Save changes" aria-label="Search">'
    });
    const input = page.document.querySelector('#t');
    assert.equal(input.value, 'Save changes');
    assert.equal(input.getAttribute('aria-label'), '検索');
  });

  it('textareaの内容（ユーザー入力）は翻訳せず、placeholderだけ翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/settings/profile',
      dict: DICT,
      body: '<textarea id="ta" placeholder="Description">Name</textarea>'
    });
    const textarea = page.document.querySelector('#ta');
    assert.equal(textarea.value, 'Name');
    assert.equal(textarea.getAttribute('placeholder'), '説明');
  });

  it('selectのoptionは翻訳しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<select id="sel" aria-label="Name"><option id="o">Code</option></select>'
    });
    assert.equal(page.text('#o'), 'Code');
    assert.equal(page.document.querySelector('#sel').getAttribute('aria-label'), '名前');
  });

  it('テキストノードが100を超えるlistboxは走査しない', async () => {
    const small = '<span>Code</span>'.repeat(5);
    const large = '<span>Code</span>'.repeat(101);
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: `<div role="listbox" id="small">${small}</div><div role="listbox" id="large">${large}</div>`
    });
    const texts = (id) => [...page.document.querySelectorAll(`#${id} span`)].map((el) => el.textContent);
    assert.ok(texts('small').every((t) => t === 'コード'));
    assert.ok(texts('large').every((t) => t === 'Code'));
  });

  it('実際の日本語辞書（コメント付きJSON）を読み込んで翻訳できる', async () => {
    const raw = readRepoFile('dictionaries/ja.json');
    page = await loadPage({
      url: REPO_URL,
      fetchImpl: async () => ({ ok: true, text: async () => raw }),
      body: '<nav><a id="a" href="/octo/repo/pulls">Pull requests</a></nav>'
    });
    assert.equal(page.text('#a'), 'プルリクエスト');
  });
});

describe('ページごとの翻訳スコープ', () => {
  it('通常ページではlabelや見出しを翻訳しない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<label id="l">Name</label><h2 id="h">Code</h2>' });
    assert.equal(page.text('#l'), 'Name');
    assert.equal(page.text('#h'), 'Code');
  });

  it('Settings配下ではlabelや見出しまで翻訳する', async () => {
    page = await loadPage({
      url: 'https://github.com/settings/emails',
      dict: DICT,
      body: '<label id="l">Name</label><h2 id="h">Code</h2>'
    });
    assert.equal(page.text('#l'), '名前');
    assert.equal(page.text('#h'), 'コード');
  });

  it('Organization Settingsでは確認済みの画面でのみpを翻訳する', async () => {
    page = await loadPage({ url: 'https://github.com/organizations/acme/settings/member_privileges', dict: DICT, body: '<p id="p">Name</p>' });
    assert.equal(page.text('#p'), '名前');
    page.close();

    // 未確認の画面（例: People）はpを許可しない
    page = await loadPage({ url: 'https://github.com/organizations/acme/settings/people', dict: DICT, body: '<p id="p">Name</p>' });
    assert.equal(page.text('#p'), 'Name');
  });

  it('個別に確認済みのページでのみpを翻訳する', async () => {
    page = await loadPage({ url: 'https://github.com/settings/profile', dict: DICT, body: '<p id="p">Name</p>' });
    assert.equal(page.text('#p'), '名前');
    page.close();

    page = await loadPage({ url: 'https://github.com/settings/emails', dict: DICT, body: '<p id="p">Name</p>' });
    assert.equal(page.text('#p'), 'Name');
  });

  it('パターン指定のページ（リポジトリSettings > General）でpを翻訳する', async () => {
    page = await loadPage({ url: 'https://github.com/octo/repo/settings', dict: DICT, body: '<p id="p">Name</p>' });
    assert.equal(page.text('#p'), '名前');
  });
});

describe('設定', () => {
  it('無効化されている場合は何も翻訳しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      settings: { enabled: false },
      body: '<button id="b">Code</button>'
    });
    assert.equal(page.text('#b'), 'Code');
  });

  it('グローバルヘッダーは既定で翻訳する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<header role="banner"><button id="g">Code</button></header>'
    });
    assert.equal(page.text('#g'), 'コード');
  });

  it('グローバルヘッダーの翻訳をOFFにするとヘッダー内だけ翻訳しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      settings: { translateGlobalHeader: false },
      body: '<header role="banner"><button id="g">Code</button></header><nav><button id="n">Code</button></nav>'
    });
    assert.equal(page.text('#g'), 'Code');
    assert.equal(page.text('#n'), 'コード');
  });

  it('辞書の読み込みに失敗しても例外を投げず原文のまま表示する', async () => {
    page = await loadPage({
      url: REPO_URL,
      fetchImpl: async () => { throw new Error('network error'); },
      body: '<button id="b">Code</button>'
    });
    assert.equal(page.text('#b'), 'Code');
    assert.equal(page.consoleErrors.length, 1);
  });

  it('辞書の取得がHTTPエラーの場合は本文を使わず、原文のまま表示してエラーを記録する', async () => {
    page = await loadPage({
      url: REPO_URL,
      // 本文がJSONとして読めてしまう場合でも、HTTPエラーの応答は辞書として扱わない
      fetchImpl: async () => ({ ok: false, status: 404, text: async () => JSON.stringify({ translations: DICT }) }),
      body: '<button id="b">Code</button>'
    });
    assert.equal(page.text('#b'), 'Code');
    assert.equal(page.consoleErrors.length, 1);
  });
});

describe('動的なDOM変更への追従', () => {
  it('後から追加された要素を翻訳する', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<div id="root"></div>' });
    page.document.querySelector('#root').innerHTML = '<button id="b">Settings</button>';
    await page.settle();
    assert.equal(page.text('#b'), '設定');
  });

  it('既存要素のテキストが書き換えられたら再翻訳する', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<button id="b">Code</button>' });
    page.document.querySelector('#b').firstChild.nodeValue = 'Settings';
    await page.settle();
    assert.equal(page.text('#b'), '設定');
  });

  it('自己マッピングの辞書でも書き込みが無限に続かない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: { Wiki: 'Wiki', Wikis: 'Wiki' },
      body: '<nav id="nav"><button id="b">Wikis</button></nav>'
    });
    assert.equal(page.text('#b'), 'Wiki');

    const records = [];
    const observer = new page.window.MutationObserver((mutations) => records.push(...mutations));
    observer.observe(page.document.documentElement, { subtree: true, characterData: true });

    // 再走査を発生させ、同じ値の書き込み（characterDataミューテーション）が起きないことを確認する
    page.document.querySelector('#nav').insertAdjacentHTML('beforeend', '<button>Wiki</button>');
    await page.settle();
    await page.settle();
    observer.disconnect();
    assert.equal(records.length, 0);
  });

  it('拡張自身の書き込みでは再走査しない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav id="nav"></nav>' });
    let walks = 0;
    const createTreeWalker = page.document.createTreeWalker.bind(page.document);
    page.document.createTreeWalker = (...args) => {
      walks++;
      return createTreeWalker(...args);
    };

    page.document.querySelector('#nav').insertAdjacentHTML('beforeend', '<button id="b">Code</button>');
    await page.settle();
    assert.equal(page.text('#b'), 'コード');

    // 翻訳時の書き込み（characterData）を契機とした次フレームの再走査が起きないこと
    walks = 0;
    await page.settle();
    assert.equal(walks, 0);
  });

  it('SPA遷移でパスが変わると翻訳スコープも切り替わる', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<h1 id="before">Code</h1><div id="d"></div>' });
    assert.equal(page.text('#before'), 'Code');

    page.window.history.pushState({}, '', '/octo/repo/issues');
    page.document.querySelector('#d').innerHTML = '<h1 id="after">Code</h1>';
    await page.settle();
    assert.equal(page.text('#after'), 'コード');
  });

  it('hydration前のreact-partialは翻訳せず、loaded付与後に翻訳する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<react-partial id="rp"><button id="b">Code</button></react-partial>'
    });
    assert.equal(page.text('#b'), 'Code');

    page.document.querySelector('#rp').classList.add('loaded');
    await page.settle();
    assert.equal(page.text('#b'), 'コード');
  });
});

describe('インライン要素で分割された文の翻訳', () => {
  const SETTINGS_URL = 'https://github.com/octo/repo/settings';
  const MIXED_DICT = {
    'Learn more': '詳しく見る',
    'Template repositories let users generate new repositories. <a>Learn more</a>.': 'テンプレートリポジトリで新しいリポジトリを生成できます。<a>詳しく見る</a>。',
    'You can add a <code>.github/FUNDING.yml</code> file to <a>override</a>': '<code>.github/FUNDING.yml</code>を追加して<a>上書き</a>できます',
    'See <a>Code</a>.': '<a>コード</a>を参照。',
    'Swap <a>Code</a> and <strong>Star</strong>.': '<strong>スター</strong>と<a>コード</a>を入れ替え。'
  };

  it('リンクを含む文をタグ付きキーで文全体として翻訳し、リンク要素は保持する', async () => {
    page = await loadPage({
      url: SETTINGS_URL,
      dict: MIXED_DICT,
      body: '<p id="p">\n  Template repositories let users generate new repositories.\n  <a id="a" href="https://docs.github.com/x">Learn more</a>.\n</p>'
    });
    const link = page.document.querySelector('#a');
    assert.equal(page.text('#p').trim(), 'テンプレートリポジトリで新しいリポジトリを生成できます。詳しく見る。');
    assert.equal(link.getAttribute('href'), 'https://docs.github.com/x');
    assert.equal(page.document.querySelector('#p a'), link);
  });

  it('code等の除外要素は原文のまま残して文を翻訳する', async () => {
    page = await loadPage({
      url: SETTINGS_URL,
      dict: MIXED_DICT,
      body: '<p id="p">You can add a <code id="c">.github/FUNDING.yml</code> file to <a href="https://docs.github.com/x">override</a> </p>'
    });
    assert.equal(page.text('#p'), '.github/FUNDING.ymlを追加して上書きできます');
    assert.equal(page.text('#c'), '.github/FUNDING.yml');
  });

  it('訳文を置く既存テキストノードがない位置があれば、要素を生成せず翻訳を見送る', async () => {
    page = await loadPage({
      url: SETTINGS_URL,
      dict: MIXED_DICT,
      body: '<p id="p">You can add a <code>.github/FUNDING.yml</code> file to <a href="https://docs.github.com/x">override</a></p>'
    });
    assert.equal(page.text('#p'), 'You can add a .github/FUNDING.yml file to override');
  });

  it('除外セレクターに該当するリンク（ユーザーのhovercard等）の文言を変える文は翻訳しない', async () => {
    page = await loadPage({
      url: SETTINGS_URL,
      dict: MIXED_DICT,
      body: '<p id="p">See <a href="/octo" data-hovercard-type="user">Code</a>.</p>'
    });
    assert.equal(page.text('#p'), 'See Code.');
  });

  it('URL判定で除外されるリンク（blob等）でも、文全体が一致すれば翻訳する', async () => {
    page = await loadPage({
      url: SETTINGS_URL,
      dict: MIXED_DICT,
      body: '<p id="p">See <a href="/octo/.github/blob/main/FUNDING.yml">Code</a>.</p>'
    });
    assert.equal(page.text('#p'), 'コードを参照。');
  });

  it('訳文のタグ順序が原文と異なる場合は翻訳しない', async () => {
    page = await loadPage({
      url: SETTINGS_URL,
      dict: MIXED_DICT,
      body: '<p id="p">Swap <a href="https://docs.github.com/x">Code</a> and <strong>Star</strong>.</p>'
    });
    assert.equal(page.text('#p'), 'Swap Code and Star.');
  });

  it('pが許可されていないページでは翻訳しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: MIXED_DICT,
      body: '<p id="p">Template repositories let users generate new repositories. <a href="https://docs.github.com/x">Learn more</a>.</p>'
    });
    assert.equal(page.text('#p'), 'Template repositories let users generate new repositories. Learn more.');
  });

  it('動的に追加された文も翻訳する', async () => {
    page = await loadPage({ url: SETTINGS_URL, dict: MIXED_DICT, body: '<div id="d"></div>' });
    page.document.querySelector('#d').innerHTML =
      '<p id="p">Template repositories let users generate new repositories. <a href="https://docs.github.com/x">Learn more</a>.</p>';
    await page.settle();
    assert.equal(page.text('#p'), 'テンプレートリポジトリで新しいリポジトリを生成できます。詳しく見る。');
  });
});

describe('日付表示（relative-time）', () => {
  it('lang属性に翻訳先の言語を設定し、未指定のprefixを空にする', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<relative-time id="a" datetime="2026-09-09T00:00:00Z"></relative-time><relative-time id="b" prefix="" datetime="2026-09-09T00:00:00Z"></relative-time><relative-time id="c" prefix="since" datetime="2026-09-09T00:00:00Z"></relative-time>'
    });
    const el = (id) => page.document.querySelector(id);
    assert.equal(el('#a').getAttribute('lang'), 'ja');
    assert.equal(el('#a').getAttribute('prefix'), '');
    // GitHubが明示したprefixは変更しない
    assert.equal(el('#c').getAttribute('prefix'), 'since');
    assert.equal(el('#b').getAttribute('lang'), 'ja');
  });

  it('設定で選んだ言語コードをそのまま使う', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      settings: { language: 'zh-CN' },
      body: '<relative-time id="a" datetime="2026-09-09T00:00:00Z"></relative-time>'
    });
    assert.equal(page.document.querySelector('#a').getAttribute('lang'), 'zh-CN');
  });

  it('後から追加された要素は、ユーザー作成コンテンツへのリンク内でも処理する', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<div id="d"></div>' });
    page.document.querySelector('#d').innerHTML =
      '<a href="/octo/repo/issues/1">Code <relative-time id="a" datetime="2026-09-09T00:00:00Z"></relative-time></a>';
    await page.settle();
    assert.equal(page.document.querySelector('#a').getAttribute('lang'), 'ja');
    // リンク文言自体は従来どおり翻訳しない
    assert.equal(page.document.querySelector('#d a').firstChild.nodeValue, 'Code ');
  });

  it('hydration前のreact-partial内は触らず、loaded付与後に処理する', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<react-partial id="rp"><relative-time id="a" datetime="2026-09-09T00:00:00Z"></relative-time></react-partial>'
    });
    assert.equal(page.document.querySelector('#a').hasAttribute('lang'), false);

    page.document.querySelector('#rp').classList.add('loaded');
    await page.settle();
    assert.equal(page.document.querySelector('#a').getAttribute('lang'), 'ja');
  });

  it('拡張が無効の場合は変更しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      settings: { enabled: false },
      body: '<relative-time id="a" datetime="2026-09-09T00:00:00Z"></relative-time>'
    });
    assert.equal(page.document.querySelector('#a').hasAttribute('lang'), false);
  });
});
