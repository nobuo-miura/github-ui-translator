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
