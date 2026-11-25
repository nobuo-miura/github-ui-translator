// ユーザー辞書（訳の上書き・英語のまま表示・Alt+クリック編集・オプションページ）と
// 改善Issueの送信URLのテスト
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadOptions, loadPage, loadPopup, readRepoFile } from './helpers.mjs';

const REPO_URL = 'https://github.com/octo/repo';
const DICT = {
  Code: 'コード',
  Settings: '設定',
  Star: 'スター',
  Wiki: 'Wiki',
  'Read the <a>guide</a>.': '<a>ガイド</a>を読む。'
};

// shared.jsだけを読み込んだ環境で、公開関数を返す
function loadShared() {
  const { window } = new JSDOM('', { runScripts: 'outside-only' });
  window.chrome = { runtime: { getURL: (p) => p }, i18n: { getMessage: () => '', getUILanguage: () => 'ja' } };
  window.eval(readRepoFile('shared.js'));
  return window.GitHubUITranslator;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

// ユーザー辞書は項目ごとのキー（"userDict:<code>:<原文>"）で保存する。
// テストの設定値はこの形に展開し、保存結果はこの形から言語ごとにまとめて読む
function ud(language, entries) {
  return Object.fromEntries(Object.entries(entries).map(([source, entry]) => [`userDict:${language}:${source}`, entry]));
}

function stored(store, language) {
  const prefix = `userDict:${language}:`;
  return Object.fromEntries(Object.entries(store)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, entry]) => [key.slice(prefix.length), entry]));
}

describe('ユーザー辞書のマージ（shared.js）', () => {
  const shared = loadShared();

  it('既存キーの訳を上書きし、英語のまま表示する項目は原文をそのまま訳文にする', () => {
    const { dictionary, rejected } = shared.mergeDictionaries(DICT, {
      Code: { t: 'ソース', base: 'コード' },
      Star: { t: null, base: 'スター' }
    });
    assert.equal(dictionary.Code, 'ソース');
    assert.equal(dictionary.Star, 'Star');
    assert.equal(dictionary.Settings, '設定');
    assert.deepEqual(plain(rejected), []);
  });

  it('同梱辞書にないキーは追加しない', () => {
    const { dictionary } = shared.mergeDictionaries(DICT, { Fork: { t: 'フォーク' } });
    assert.equal('Fork' in dictionary, false);
  });

  it('タグの種類・順序が原文と違う訳文は無視する', () => {
    const { dictionary } = shared.mergeDictionaries(DICT, { 'Read the <a>guide</a>.': { t: 'ガイドを読む。' } });
    assert.equal(dictionary['Read the <a>guide</a>.'], '<a>ガイド</a>を読む。');
  });

  it('上書きで訳文が循環する場合は、その上書きを同梱の訳に戻す', () => {
    const { dictionary, rejected } = shared.mergeDictionaries(DICT, {
      Code: { t: 'Settings' },
      Settings: { t: 'Code' }
    });
    assert.equal(dictionary.Code, 'コード');
    assert.equal(dictionary.Settings, '設定');
    assert.deepEqual(plain(rejected).sort(), ['Code', 'Settings']);
  });

  it('循環しない連鎖（訳文が別のキー）は許可する', () => {
    const { dictionary, rejected } = shared.mergeDictionaries(DICT, { Code: { t: 'Wiki' } });
    assert.equal(dictionary.Code, 'Wiki');
    assert.deepEqual(plain(rejected), []);
  });

  it('同梱の訳と同じ訳を保存すると、上書きを削除する', () => {
    const { entries, error } = shared.updateUserEntry({ Code: { t: 'ソース' } }, 'Code', 'コード', ' コード ');
    assert.equal(error, null);
    assert.deepEqual(plain(entries), {});
  });

  it('訳文の改行や連続空白は1つの空白にまとめて保存する', () => {
    const { entries } = shared.updateUserEntry({}, 'Code', 'コード', ' ソース\n  コード ');
    assert.equal(entries.Code.t, 'ソース コード');
    assert.equal(entries.Code.base, 'コード');
  });

  it('空の訳文やタグの不一致はエラーにする', () => {
    assert.equal(shared.updateUserEntry({}, 'Code', 'コード', '  ').error, 'userDictErrorEmpty');
    assert.equal(shared.validateTranslation('Read the <a>guide</a>.', '<b>ガイド</b>を読む。'), 'userDictErrorTags');
    assert.equal(shared.validateTranslation('Code', '<a>コード'), 'userDictErrorTags');
    assert.equal(shared.validateTranslation('Read the <a>guide</a>.', '<a>手引き</a>を読む。'), null);
  });
});

describe('改善Issueの送信URL', () => {
  const shared = loadShared();

  it('1件のときは、テンプレートの各項目を入力済みにしたURLを作る', () => {
    const url = new URL(shared.buildIssueUrl('ja', [{ source: 'Code', current: 'コード', suggested: 'ソース' }], '1.2.3'));
    assert.equal(url.origin + url.pathname, 'https://github.com/nobuo-miura/github-ui-translator/issues/new');
    const params = Object.fromEntries(url.searchParams);
    assert.equal(params.template, 'translation_request.yml');
    assert.equal(params.title, '[Translation]: (ja) Code');
    // ドロップダウンはクエリパラメーターで選択できないため、選ぶ値をContextに書く
    assert.equal('request-type' in params, false);
    assert.equal('language' in params, false);
    assert.match(params.context, /^Language: Japanese$/m);
    assert.match(params.context, /^Request type: A single string$/m);
    assert.equal(params['source-text'], 'Code');
    assert.equal(params['current-translation'], 'コード');
    assert.equal(params['suggested-translation'], 'ソース');
    assert.match(params.context, /v1\.2\.3/);
    // 閲覧中のページのURLは入れない（プライベートリポジトリ名の漏えいを防ぐ）
    assert.equal('affected-url' in params, false);
  });

  it('複数件は1行ずつ並べ、英語のまま表示する提案はContextに書く', () => {
    const url = new URL(shared.buildIssueUrl('de', [
      { source: 'Code', current: 'Code', suggested: 'Quellcode' },
      { source: 'Star', current: 'Stern', suggested: null }
    ]));
    const params = Object.fromEntries(url.searchParams);
    assert.match(params.context, /^Language: German$/m);
    assert.match(params.context, /^Request type: Multiple strings$/m);
    assert.equal(params['source-text'], 'Code\nStar');
    assert.equal(params['suggested-translation'], 'Quellcode\nStar');
    assert.match(params.context, /in English[\s\S]*- Star/);
  });

  it('件数の上限を超えるとnullを返す', () => {
    const entries = Array.from({ length: shared.MAX_ISSUE_ENTRIES + 1 }, (_, i) => ({ source: `S${i}`, current: 'x', suggested: 'y' }));
    assert.equal(shared.buildIssueUrl('ja', entries), null);
    assert.notEqual(shared.buildIssueUrl('ja', entries.slice(0, shared.MAX_ISSUE_ENTRIES)), null);
  });

  it('Issueテンプレートの項目id・選択肢と一致している', () => {
    const template = readRepoFile('.github/ISSUE_TEMPLATE/translation_request.yml');
    for (const id of ['request-type', 'language', 'source-text', 'current-translation', 'suggested-translation', 'context']) {
      assert.match(template, new RegExp(`id: ${id}\\n`), id);
    }
    for (const option of ['A single string', 'Multiple strings', ...Object.values(shared.ISSUE_LANGUAGE_LABELS)]) {
      assert.match(template, new RegExp(`- ${option.replace(/[()]/g, '\\$&')}\\n`), option);
    }
    const codes = JSON.parse(readRepoFile('languages.json')).languages.map(({ code }) => code);
    assert.deepEqual(Object.keys(shared.ISSUE_LANGUAGE_LABELS), codes);
  });
});

describe('ページへのユーザー辞書の適用', () => {
  let page;
  afterEach(() => page?.close());

  it('自分の訳で表示し、英語のまま表示する項目は翻訳しない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      settings: { ...ud('ja', { Code: { t: 'ソース', base: 'コード' }, Star: { t: null, base: 'スター' } }) },
      body: '<nav><a id="code" href="/octo/repo">Code</a><a id="settings" href="/octo/repo/settings">Settings</a></nav><button id="star">Star</button>'
    });
    assert.equal(page.text('#code'), 'ソース');
    assert.equal(page.text('#settings'), '設定');
    assert.equal(page.text('#star'), 'Star');
  });

  it('ほかの言語のユーザー辞書は使わない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      settings: { ...ud('de', { Code: { t: 'Quellcode' } }) },
      body: '<nav><a id="code" href="/octo/repo">Code</a></nav>'
    });
    assert.equal(page.text('#code'), 'コード');
  });
});

describe('Alt+クリックでの訳の編集', () => {
  let page;
  afterEach(() => page?.close());

  function altClick(target, extra = {}) {
    const event = new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true, ...extra });
    target.dispatchEvent(event);
    return event;
  }

  function editor() {
    const host = page.document.querySelector('[data-github-ui-translator-editor]');
    return host?.shadowRoot ?? null;
  }

  function buttonByText(root, text) {
    return [...root.querySelectorAll('button')].find((button) => button.textContent === text);
  }

  async function openOn(selector, options = {}) {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a></nav><button id="wiki">Wiki</button><p id="p">Code</p>', ...options });
    const event = altClick(page.document.querySelector(selector));
    await page.settle();
    return event;
  }

  it('翻訳した文字をAlt+クリックすると、リンクの遷移を止めて編集ダイアログを開く', async () => {
    const event = await openOn('#code');
    assert.equal(event.defaultPrevented, true);
    const root = editor();
    assert.ok(root);
    assert.equal(root.querySelector('textarea').value, 'コード');
    assert.match(root.textContent, /Code/);
  });

  it('保存するとユーザー辞書に書き込む', async () => {
    await openOn('#code');
    const root = editor();
    root.querySelector('textarea').value = 'ソース';
    buttonByText(root, 'saveButton').click();
    await page.settle();
    // 編集した項目のキーだけを書き込む
    assert.deepEqual(page.storageCalls.map(({ method, items }) => [method, Object.keys(items)]), [['set', ['userDict:ja:Code']]]);
    const entry = page.storageCalls[0].items['userDict:ja:Code'];
    assert.equal(entry.t, 'ソース');
    assert.equal(entry.base, 'コード');
    assert.equal(editor(), null);
  });

  it('「英語のまま表示」を選んで保存すると、訳文をnullで保存する', async () => {
    await openOn('#code');
    const root = editor();
    const checkbox = root.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new page.window.Event('change'));
    buttonByText(root, 'saveButton').click();
    await page.settle();
    assert.equal(page.storageCalls[0].items['userDict:ja:Code'].t, null);
  });

  it('タグが原文と合わない訳文は保存せず、エラーを表示する', async () => {
    page = await loadPage({ url: `${REPO_URL}/settings`, dict: DICT, body: '<p id="m">Read the <a href="https://docs.github.com/x">guide</a>.</p>' });
    assert.equal(page.text('#m'), 'ガイドを読む。');
    altClick(page.document.querySelector('#m a'));
    await page.settle();
    const root = editor();
    assert.equal(root.querySelector('textarea').value, '<a>ガイド</a>を読む。');
    root.querySelector('textarea').value = 'ガイドを読む。';
    buttonByText(root, 'saveButton').click();
    await page.settle();
    assert.deepEqual(page.storageCalls, []);
    assert.equal(root.querySelector('[role="alert"]').textContent, 'userDictErrorTags');
  });

  it('自己マッピング（訳しても表示が変わらない文字）も編集できる', async () => {
    await openOn('#wiki');
    assert.equal(editor().querySelector('textarea').value, 'Wiki');
  });

  it('改善を提案すると、入力中の訳でIssue作成画面を開く', async () => {
    await openOn('#code');
    const root = editor();
    root.querySelector('textarea').value = 'ソース';
    buttonByText(root, 'suggestImprovementButton').click();
    assert.equal(page.openedUrls.length, 1);
    const params = new URL(page.openedUrls[0]).searchParams;
    assert.equal(params.get('source-text'), 'Code');
    assert.equal(params.get('current-translation'), 'コード');
    assert.equal(params.get('suggested-translation'), 'ソース');
    // 提案だけでは保存しない
    assert.deepEqual(page.storageCalls, []);
  });

  it('翻訳していない文字のAlt+クリックには何もしない', async () => {
    const event = await openOn('#p');
    assert.equal(event.defaultPrevented, false);
    assert.equal(editor(), null);
  });

  it('Alt以外の修飾キーと一緒のクリックには何もしない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a></nav>' });
    const event = altClick(page.document.querySelector('#code'), { shiftKey: true });
    assert.equal(event.defaultPrevented, false);
    assert.equal(editor(), null);
  });

  it('ポップアップで無効にしているときは何もしない', async () => {
    const event = await openOn('#code', { settings: { editOnAltClick: false } });
    assert.equal(event.defaultPrevented, false);
    assert.equal(editor(), null);
  });
});

describe('オプションページのユーザー辞書', () => {
  let options;
  afterEach(() => options?.close());

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  function change(el, value) {
    if (el.type === 'checkbox') el.checked = value;
    else el.value = value;
    el.dispatchEvent(new options.window.Event('change'));
  }

  it('選択中の言語の同梱辞書を一覧にし、保存済みの訳を表示する', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース', base: 'コード' } }) }
    });
    assert.equal(options.document.querySelector('#ud-language').value, 'ja');
    assert.equal(options.document.querySelectorAll('#ud-rows tr').length, Object.keys(DICT).length);
    assert.equal(row('Code').querySelector('input.translation').value, 'ソース');
    assert.equal(row('Code').className, 'edited');
    assert.equal(row('Settings').querySelector('input.translation').placeholder, '設定');
  });

  it('訳を入力すると保存し、空欄にすると上書きを削除する', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    change(row('Settings').querySelector('input.translation'), '構成');
    await options.flush();
    assert.equal(stored(options.store, 'ja').Settings.t, '構成');
    change(row('Settings').querySelector('input.translation'), '');
    await options.flush();
    assert.equal(Object.keys(stored(options.store, 'ja')).length > 0, false);
  });

  it('「英語のまま」をオンにすると、訳文をnullで保存する', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    change(row('Star').querySelector('input.keep'), true);
    await options.flush();
    assert.equal(stored(options.store, 'ja').Star.t, null);
    assert.equal(row('Star').querySelector('input.translation').disabled, true);
  });

  it('検索と「編集済みのみ」で絞り込む', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース', base: 'コード' } }) }
    });
    const search = options.document.querySelector('#ud-search');
    search.value = '設定';
    search.dispatchEvent(new options.window.Event('input'));
    assert.deepEqual([...options.document.querySelectorAll('#ud-rows tr')].map((tr) => tr.dataset.source), ['Settings']);
    search.value = '';
    search.dispatchEvent(new options.window.Event('input'));
    change(options.document.querySelector('#ud-edited-only'), true);
    assert.deepEqual([...options.document.querySelectorAll('#ud-rows tr')].map((tr) => tr.dataset.source), ['Code']);
  });

  it('編集した後に同梱の訳が変わっていれば知らせる', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース', base: '古い訳' } }) }
    });
    assert.match(row('Code').textContent, /bundledChangedNote/);
  });

  it('選択した編集をまとめて1件のIssueとして提案する', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' }, Star: { t: null } }) }
    });
    const button = options.document.querySelector('#ud-suggest-selected');
    assert.equal(button.disabled, true);
    change(options.document.querySelector('#ud-select-all'), true);
    assert.equal(button.textContent, 'suggestSelectedButton(2)');
    button.click();
    await options.flush();
    const params = new URL(options.openedUrls[0]).searchParams;
    assert.equal(params.get('source-text'), 'Code\nStar');
    assert.equal(params.get('current-translation'), 'コード\nスター');
    assert.equal(params.get('suggested-translation'), 'ソース\nStar');
  });

  it('行ごとの提案ボタンで1件ずつ提案できる', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' } }) } });
    assert.equal(row('Settings').querySelector('button.suggest').disabled, true);
    row('Code').querySelector('button.suggest').click();
    await options.flush();
    const params = new URL(options.openedUrls[0]).searchParams;
    assert.equal(params.get('source-text'), 'Code');
    assert.match(params.get('context'), /^Request type: A single string$/m);
  });

  it('インポートは、対応言語の既存キーで検証を通る訳だけを取り込む', async () => {
    options = await loadOptions({ dicts: { ja: DICT, de: { Code: 'Code' } }, settings: { language: 'ja' } });
    const file = JSON.stringify({
      format: 'github-ui-translator-user-dictionary',
      version: 1,
      dictionaries: {
        ja: {
          Code: { t: 'ソース', base: 'コード', at: '2026-01-01T00:00:00.000Z' },
          Star: { t: null },
          Unknown: { t: '不明' },
          'Read the <a>guide</a>.': { t: 'ガイドを読む。' }
        },
        de: { Code: { t: 'Quellcode' } },
        xx: { Code: { t: '?' } }
      }
    });
    const result = await options.window.GitHubUITranslatorOptions.importUserDictionaries(file);
    assert.deepEqual(plain(result), { imported: 3, skipped: 3 });
    assert.deepEqual(stored(options.store, 'ja'), {
      Code: { t: 'ソース', base: 'コード', at: '2026-01-01T00:00:00.000Z' },
      Star: stored(options.store, 'ja').Star
    });
    assert.equal(stored(options.store, 'ja').Star.t, null);
    assert.equal(stored(options.store, 'de').Code.t, 'Quellcode');
  });

  it('形式の違うファイルはインポートしない', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    await assert.rejects(options.window.GitHubUITranslatorOptions.importUserDictionaries('{"translations":{}}'));
    assert.deepEqual(options.storageCalls, []);
  });

  it('この言語の訳をすべてリセットできる', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' } }) } });
    options.document.querySelector('#ud-reset-all').click();
    await options.flush();
    assert.equal(Object.keys(stored(options.store, 'ja')).length > 0, false);
    assert.equal(row('Code').className, '');
  });
});

describe('ポップアップのAlt+クリック編集の設定', () => {
  let popup;
  afterEach(() => popup?.close());

  it('既定でオンになっており、オフにすると保存する', async () => {
    popup = await loadPopup();
    const toggle = popup.document.querySelector('#alt-click-edit-toggle');
    assert.equal(toggle.checked, true);
    toggle.checked = false;
    toggle.dispatchEvent(new popup.window.Event('change'));
    assert.deepEqual(popup.storageCalls, [{ method: 'set', items: { editOnAltClick: false } }]);
  });

  it('「自分の訳を管理」でオプションページを開く', async () => {
    popup = await loadPopup();
    popup.window.close = () => {};
    popup.document.querySelector('#user-dictionary-link').click();
    assert.deepEqual(popup.storageCalls, [{ method: 'openOptionsPage' }]);
  });
});

describe('ユーザー辞書の変更とタブの再読み込み', () => {
  let page;
  afterEach(() => page?.close());

  const body = '<nav><a id="code" href="/octo/repo">Code</a></nav><button id="star">Star</button>';

  it('ほかの場所でユーザー辞書が変わっても、開いているタブは再読み込みしない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body });
    page.fireStorageChange({ 'userDict:ja:Code': { newValue: { t: 'ソース', base: 'コード' } } });
    await page.settle();
    assert.equal(page.reloads, 0);
  });

  it('設定（言語など）が変わったときは、これまでどおり再読み込みする', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body });
    page.fireStorageChange({ language: { newValue: 'de' } });
    assert.equal(page.reloads, 1);
  });

  it('Alt+クリックで保存すると、そのタブだけを再読み込みする', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body });
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    const root = page.document.querySelector('[data-github-ui-translator-editor]').shadowRoot;
    root.querySelector('textarea').value = 'ソース';
    [...root.querySelectorAll('button')].find((button) => button.textContent === 'saveButton').click();
    await page.settle();
    assert.equal(page.reloads, 1);
  });

  it('ダイアログを開いたあとにほかで保存された訳を、保存時に消さない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body });
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    // ダイアログを開いている間に、オプションページで「Star」を編集した
    Object.assign(page.store, ud('ja', { Star: { t: 'お気に入り', base: 'スター' } }));
    const root = page.document.querySelector('[data-github-ui-translator-editor]').shadowRoot;
    root.querySelector('textarea').value = 'ソース';
    [...root.querySelectorAll('button')].find((button) => button.textContent === 'saveButton').click();
    await page.settle();
    const saved = stored(page.store, 'ja');
    assert.equal(saved.Code.t, 'ソース');
    assert.equal(saved.Star.t, 'お気に入り');
  });
});

describe('オプションページとほかの場所での編集の同期', () => {
  let options;
  afterEach(() => options?.close());

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  it('ほかの場所で保存された訳を、その行だけ描き直して表示する', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const settingsInput = row('Settings').querySelector('input.translation');
    settingsInput.value = '入力中';
    const value = { t: 'ソース', base: 'コード' };
    options.store['userDict:ja:Code'] = value;
    options.fireStorageChange({ 'userDict:ja:Code': { newValue: value } });
    await options.flush();
    assert.equal(row('Code').querySelector('input.translation').value, 'ソース');
    assert.equal(row('Code').className, 'edited');
    // 変わっていない行の入力中の文字は残す
    assert.equal(row('Settings').querySelector('input.translation'), settingsInput);
    assert.equal(settingsInput.value, '入力中');
  });

  it('別の言語のユーザー辞書の変更は無視する', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const before = row('Code');
    options.store['userDict:de:Code'] = { t: 'Quellcode', base: 'Code' };
    options.fireStorageChange({ 'userDict:de:Code': { newValue: options.store['userDict:de:Code'] } });
    await options.flush();
    assert.equal(row('Code'), before);
  });

  it('通知の前に別の行を編集しても、ほかの場所で保存された訳を消さない', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    // GitHubのタブで保存されたが、まだonChangedが届いていない
    options.store['userDict:ja:Code'] = { t: 'ソース', base: 'コード' };
    const input = row('Settings').querySelector('input.translation');
    input.value = '環境設定';
    input.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    assert.equal(stored(options.store, 'ja').Code.t, 'ソース');
    assert.equal(stored(options.store, 'ja').Settings.t, '環境設定');
  });
});

describe('「英語のまま表示」にした項目の再編集', () => {
  let page;
  afterEach(() => page?.close());

  const altClick = (target) =>
    target.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true }));
  const editor = () => page.document.querySelector('[data-github-ui-translator-editor]')?.shadowRoot ?? null;

  it('英語のまま表示している文字もAlt+クリックで編集でき、チェックが入った状態で開く', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<nav><a id="code" href="/octo/repo">Code</a></nav>',
      settings: { ...ud('ja', { Code: { t: null, base: 'コード' } }) }
    });
    assert.equal(page.text('#code'), 'Code');
    altClick(page.document.querySelector('#code'));
    await page.settle();
    const root = editor();
    assert.ok(root);
    assert.equal(root.querySelector('input[type="checkbox"]').checked, true);
    assert.equal(root.querySelector('textarea').disabled, true);
  });

  it('タグを含む文も、英語のまま表示してAlt+クリックで編集できる', async () => {
    page = await loadPage({
      url: `${REPO_URL}/settings`,
      dict: DICT,
      body: '<p id="m">Read the <a href="https://docs.github.com/x">guide</a>.</p>',
      settings: { showOriginalOnHover: true, ...ud('ja', { 'Read the <a>guide</a>.': { t: null, base: '<a>ガイド</a>を読む。' } }) }
    });
    assert.equal(page.text('#m'), 'Read the guide.');
    // 表示が変わらないので、原文のツールチップは付けない
    assert.equal(page.document.querySelector('#m').hasAttribute('title'), false);
    altClick(page.document.querySelector('#m a'));
    await page.settle();
    assert.ok(editor());
  });

  it('自己マッピングのplaceholderもAlt+クリックで編集できる', async () => {
    page = await loadPage({
      url: `${REPO_URL}/issues`,
      dict: { ...DICT, Filter: 'Filter' },
      body: '<input id="f" type="text" placeholder="Filter">'
    });
    altClick(page.document.querySelector('#f'));
    await page.settle();
    assert.ok(editor());
  });
});

describe('編集ダイアログのフォーカス', () => {
  let page;
  afterEach(() => page?.close());

  async function open() {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<button id="before">x</button><nav><a id="code" href="/octo/repo">Code</a></nav>' });
    page.document.querySelector('#before').focus();
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    return page.document.querySelector('[data-github-ui-translator-editor]').shadowRoot;
  }

  function pressTab(root, shiftKey = false) {
    const event = new page.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, composed: true, cancelable: true });
    root.activeElement.dispatchEvent(event);
    return event;
  }

  it('最後のボタンでTabを押すと最初の入力欄に戻り、最初でShift+Tabを押すと最後に移る', async () => {
    const root = await open();
    const buttons = [...root.querySelectorAll('button')];
    const last = buttons[buttons.length - 1];
    const first = root.querySelector('textarea');
    assert.equal(root.activeElement, first);
    // 単一キーのダイアログでは、textareaが最初のフォーカス可能な要素
    const shiftTab = pressTab(root, true);
    assert.equal(shiftTab.defaultPrevented, true);
    assert.equal(root.activeElement, last);
    const tab = pressTab(root);
    assert.equal(tab.defaultPrevented, true);
    assert.equal(root.activeElement, first);
  });

  it('途中の要素ではTabを止めない', async () => {
    const root = await open();
    root.querySelector('input[type="checkbox"]').focus();
    assert.equal(pressTab(root).defaultPrevented, false);
  });

  it('閉じると、開く前にフォーカスがあった要素へ戻す', async () => {
    const root = await open();
    [...root.querySelectorAll('button')].find((button) => button.textContent === 'cancelButton').click();
    assert.equal(page.document.activeElement, page.document.querySelector('#before'));
  });
});

describe('オプションページの並行処理', () => {
  let options;
  afterEach(() => options?.close());

  const wait = (ms) => new Promise((resolve) => options.window.setTimeout(resolve, ms));
  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }
  function edit(source, value) {
    const input = row(source).querySelector('input.translation');
    input.value = value;
    input.dispatchEvent(new options.window.Event('change'));
  }

  it('保存処理が重なっても、先に編集した訳を消さない', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    // 実際のchrome.storageと同じく、読み込みと書き込みの完了を遅らせる
    const local = options.window.chrome.storage.local;
    const { get, set } = local;
    local.get = (defaults, callback) => options.window.setTimeout(() => get(defaults, callback), 5);
    local.set = (items, callback) => options.window.setTimeout(() => set(items, callback), 5);
    edit('Code', 'ソース');
    edit('Star', 'お気に入り');
    await wait(50);
    assert.equal(stored(options.store, 'ja').Code.t, 'ソース');
    assert.equal(stored(options.store, 'ja').Star.t, 'お気に入り');
  });

  it('言語を続けて切り替えても、遅れて読み込まれた前の言語で表を上書きしない', async () => {
    options = await loadOptions({
      dicts: { ja: DICT, de: { Code: 'Quellcode' }, fr: { Code: 'Code source' } },
      settings: { language: 'ja' }
    });
    const { fetch } = options.window;
    // ドイツ語の辞書だけ読み込みを遅らせる
    options.window.fetch = async (url) => {
      if (String(url).endsWith('/de.json')) await wait(20);
      return fetch(url);
    };
    const select = options.document.querySelector('#ud-language');
    select.value = 'de';
    select.dispatchEvent(new options.window.Event('change'));
    // 読み込み中は前の言語の行を残さない（編集して別の言語へ保存されないように）
    assert.equal(options.document.querySelectorAll('#ud-rows tr').length, 0);
    select.value = 'fr';
    select.dispatchEvent(new options.window.Event('change'));
    await wait(50);
    assert.equal(select.value, 'fr');
    assert.equal(row('Code').querySelector('input.translation').placeholder, 'Code source');
    edit('Code', 'Source');
    await options.flush();
    assert.equal(stored(options.store, 'fr').Code.base, 'Code source');
    assert.equal(Object.keys(stored(options.store, 'de')).length > 0, false);
  });
});

describe('別の辞書キーと同じ訳文の再翻訳', () => {
  let page;
  afterEach(() => page?.close());

  it('自分の訳が別のキーと一致しても、再走査で引き直さず、編集対象も元のキーのまま', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<nav id="nav"><a id="code" href="/octo/repo">Code</a></nav>',
      settings: { ...ud('ja', { Code: { t: 'Settings', base: 'コード' } }) }
    });
    assert.equal(page.text('#code'), 'Settings');
    // 周辺のDOM更新で再走査させる
    page.document.querySelector('#nav').appendChild(page.document.createElement('span'));
    await page.settle();
    assert.equal(page.text('#code'), 'Settings');
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    const root = page.document.querySelector('[data-github-ui-translator-editor]').shadowRoot;
    assert.match(root.textContent, /Code/);
    assert.equal(root.querySelector('textarea').value, 'Settings');
  });

  it('GitHubが同じ箇所を原文で描き直したときは、あらためて翻訳する', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a></nav>' });
    assert.equal(page.text('#code'), 'コード');
    page.document.querySelector('#code').firstChild.nodeValue = 'Code';
    await page.settle();
    assert.equal(page.text('#code'), 'コード');
  });

  it('属性も、書き込んだ訳文を別のキーとして引き直さない', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<nav><button id="b" aria-label="Code"><span>x</span></button></nav>',
      settings: { ...ud('ja', { Code: { t: 'Settings', base: 'コード' } }) }
    });
    const button = page.document.querySelector('#b');
    assert.equal(button.getAttribute('aria-label'), 'Settings');
    // ボタンの内側の変更で、ボタン（許可リスト要素）ごと再走査させる
    button.appendChild(page.document.createElement('span'));
    await page.settle();
    assert.equal(button.getAttribute('aria-label'), 'Settings');
  });
});

describe('タグを含む文の「英語のまま表示」', () => {
  let page;
  afterEach(() => page?.close());

  const SENTENCE = 'Secrets are encrypted. <a>Learn more</a>.';
  const TAGGED_DICT = { [SENTENCE]: 'シークレットは暗号化されます。<a>詳しく見る</a>。', 'Learn more': '詳しく見る' };
  const BODY = '<div id="wrap"><p id="m">Secrets are encrypted. <a href="https://docs.github.com/x">Learn more</a>.</p></div>';

  it('リンク部分だけが単独のキーとして翻訳されず、本文をAlt+クリックで再編集できる', async () => {
    page = await loadPage({
      url: `${REPO_URL}/settings`,
      dict: TAGGED_DICT,
      body: BODY,
      settings: { ...ud('ja', { [SENTENCE]: { t: null, base: TAGGED_DICT[SENTENCE] } }) }
    });
    assert.equal(page.text('#m'), 'Secrets are encrypted. Learn more.');
    // 周辺のDOM更新で再走査させても変わらない
    page.document.querySelector('#wrap').appendChild(page.document.createElement('span'));
    await page.settle();
    assert.equal(page.text('#m'), 'Secrets are encrypted. Learn more.');
    page.document.querySelector('#m').firstChild.parentElement.dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    const root = page.document.querySelector('[data-github-ui-translator-editor]').shadowRoot;
    assert.equal(root.querySelector('input[type="checkbox"]').checked, true);
    assert.match(root.textContent, /Secrets are encrypted\. <a>Learn more<\/a>\./);
  });

  it('同梱辞書で文全体が自己マッピングの場合も、リンク部分を個別に翻訳しない', async () => {
    page = await loadPage({
      url: `${REPO_URL}/settings`,
      dict: { [SENTENCE]: SENTENCE, 'Learn more': '詳しく見る' },
      body: BODY
    });
    assert.equal(page.text('#m'), 'Secrets are encrypted. Learn more.');
  });

  it('リンク単独の文言は、これまでどおり翻訳する', async () => {
    page = await loadPage({
      url: `${REPO_URL}/settings`,
      dict: TAGGED_DICT,
      body: '<p><a id="l" href="https://docs.github.com/x">Learn more</a></p>'
    });
    assert.equal(page.text('#l'), '詳しく見る');
  });
});

describe('編集ダイアログが意図せず閉じないこと', () => {
  let page;
  afterEach(() => page?.close());

  const hosts = () => page.document.querySelectorAll('[data-github-ui-translator-editor]');
  const altClick = (target) =>
    target.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true }));

  async function open() {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a></nav>' });
    altClick(page.document.querySelector('#code'));
    await page.settle();
    const root = hosts()[0].shadowRoot;
    // 背景はパネルの親（shadow rootの最初の要素）
    return { root, backdrop: root.firstElementChild, textarea: root.querySelector('textarea') };
  }

  const mouse = (type, target) =>
    target.dispatchEvent(new page.window.MouseEvent(type, { bubbles: true, composed: true, cancelable: true }));

  it('入力欄で押してパネルの外で離しても閉じない（ドラッグでの文字選択）', async () => {
    const { backdrop, textarea } = await open();
    mouse('mousedown', textarea);
    // 押した要素と離した要素の共通の祖先（背景）でclickが発生する
    mouse('mouseup', backdrop);
    mouse('click', backdrop);
    assert.equal(hosts().length, 1);
  });

  it('背景で押して背景で離したときは閉じる', async () => {
    const { backdrop } = await open();
    mouse('mousedown', backdrop);
    mouse('click', backdrop);
    assert.equal(hosts().length, 0);
  });

  it('IMEの変換をEscで取り消したときは閉じず、変換中でないEscでは閉じる', async () => {
    const { textarea } = await open();
    const esc = (isComposing) => textarea.dispatchEvent(new page.window.KeyboardEvent('keydown', {
      key: 'Escape', isComposing, bubbles: true, composed: true, cancelable: true
    }));
    esc(true);
    assert.equal(hosts().length, 1);
    esc(false);
    assert.equal(hosts().length, 0);
  });

  it('続けてAlt+クリックしても、ダイアログは1つだけ開く', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a><a id="star" href="/octo/repo/stargazers">Star</a></nav>' });
    altClick(page.document.querySelector('#code'));
    altClick(page.document.querySelector('#star'));
    await page.settle();
    assert.equal(hosts().length, 1);
    // 後からクリックした文字のダイアログが残る
    assert.equal(hosts()[0].shadowRoot.querySelector('textarea').value, 'スター');
  });
});

describe('ユーザー辞書の項目ごとの保存', () => {
  let options;
  let page;
  afterEach(() => {
    options?.close();
    page?.close();
    options = null;
    page = null;
  });

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  it('別の画面が同じ辞書を読んだあとに別々の項目を保存しても、両方残る', async () => {
    // 2つの画面（オプションページとGitHubのタブ）が、同じ保存領域を共有している状況を再現する
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a></nav>' });
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    // 両方の画面が開いた（読み込んだ）あとで、それぞれ別の項目を保存する
    const input = row('Star').querySelector('input.translation');
    input.value = 'お気に入り';
    input.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    const root = page.document.querySelector('[data-github-ui-translator-editor]').shadowRoot;
    root.querySelector('textarea').value = 'ソース';
    [...root.querySelectorAll('button')].find((button) => button.textContent === 'saveButton').click();
    await page.settle();
    // どちらも編集した項目のキーだけを書き込むので、共有の保存領域に重ねても両方残る
    const shared = {};
    for (const { method, items } of [...options.storageCalls, ...page.storageCalls]) {
      if (method === 'set') Object.assign(shared, items);
    }
    assert.deepEqual(Object.keys(shared).sort(), ['userDict:ja:Code', 'userDict:ja:Star']);
    assert.equal(shared['userDict:ja:Star'].t, 'お気に入り');
    assert.equal(shared['userDict:ja:Code'].t, 'ソース');
  });

  it('リセットは、その項目のキーだけを削除する', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' }, Star: { t: null } }) }
    });
    row('Code').querySelector('button.reset').click();
    await options.flush();
    assert.deepEqual(plain(options.storageCalls), [{ method: 'remove', keys: ['userDict:ja:Code'] }]);
    assert.equal(stored(options.store, 'ja').Star.t, null);
  });
});

describe('ユーザー辞書の保存の失敗', () => {
  let options;
  let page;
  afterEach(() => {
    options?.close();
    page?.close();
    options = null;
    page = null;
  });

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  it('オプションページで保存に失敗したら、入力を残してエラーを表示し、保存済みと表示しない', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    options.failStorageWrites();
    const tr = row('Code');
    const input = tr.querySelector('input.translation');
    input.value = 'ソース';
    input.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    // 行を作り直さないので、入力欄と入力した文字はそのまま
    assert.equal(row('Code'), tr);
    assert.equal(input.value, 'ソース');
    assert.equal(tr.className, '');
    assert.equal(tr.querySelector('.error').textContent, 'userDictSaveError');
    assert.notEqual(options.document.querySelector('#ud-status').textContent, 'savedStatus');
    assert.deepEqual(stored(options.store, 'ja'), {});
  });

  it('すべてリセットに失敗したら、エラーを表示して一覧を消さない', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' } }) }
    });
    options.failStorageWrites();
    options.document.querySelector('#ud-reset-all').click();
    await options.flush();
    assert.equal(options.document.querySelector('#ud-status').textContent, 'userDictSaveError');
    assert.equal(row('Code').className, 'edited');
    assert.equal(stored(options.store, 'ja').Code.t, 'ソース');
  });

  it('Alt+クリックの編集で保存に失敗したら、ダイアログと入力を残し、再読み込みしない', async () => {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<nav><a id="code" href="/octo/repo">Code</a></nav>' });
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    page.failStorageWrites();
    const host = page.document.querySelector('[data-github-ui-translator-editor]');
    const textarea = host.shadowRoot.querySelector('textarea');
    textarea.value = 'ソース';
    [...host.shadowRoot.querySelectorAll('button')].find((button) => button.textContent === 'saveButton').click();
    await page.settle();
    assert.equal(host.isConnected, true);
    assert.equal(textarea.value, 'ソース');
    assert.equal(page.reloads, 0);
    assert.equal(page.consoleErrors.length, 1);
  });
});

describe('キーボード操作とフォーカス', () => {
  let options;
  let page;
  afterEach(() => {
    options?.close();
    page?.close();
    options = null;
    page = null;
  });

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  it('訳を入力してTabで同じ行のチェックボックスへ移ると、保存後もそのチェックボックスにフォーカスが残る', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const input = row('Code').querySelector('input.translation');
    input.focus();
    input.value = 'ソース';
    // Tabでフォーカスが移ったあとにchangeが発生し、保存が終わると行が作り直される
    row('Code').querySelector('input.keep').focus();
    input.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    const active = options.document.activeElement;
    assert.equal(active, row('Code').querySelector('input.keep'));
    assert.equal(row('Code').className, 'edited');
  });

  it('リセットしてボタンが無効になったら、行の最初の有効な要素へフォーカスを移す', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' } }) } });
    const reset = row('Code').querySelector('button.reset');
    reset.focus();
    reset.click();
    await options.flush();
    assert.equal(options.document.activeElement, row('Code').querySelector('input.translation'));
  });

  it('「英語のまま表示」の項目を開くと、チェックボックスにフォーカスが入り、Escapeで閉じられる', async () => {
    page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<nav><a id="code" href="/octo/repo">Code</a></nav>',
      settings: ud('ja', { Code: { t: null, base: 'コード' } })
    });
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    const host = page.document.querySelector('[data-github-ui-translator-editor]');
    const active = host.shadowRoot.activeElement;
    assert.equal(active, host.shadowRoot.querySelector('input[type="checkbox"]'));
    active.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    assert.equal(host.isConnected, false);
  });
});

describe('「編集済みのみ」表示中の同期', () => {
  let options;
  afterEach(() => options?.close());

  const sources = () => [...options.document.querySelectorAll('#ud-rows tr')].map((tr) => tr.dataset.source);
  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }
  async function showEditedOnly() {
    const checkbox = options.document.querySelector('#ud-edited-only');
    checkbox.checked = true;
    checkbox.dispatchEvent(new options.window.Event('change'));
    await options.flush();
  }
  async function editElsewhere(source, entry) {
    options.store[`userDict:ja:${source}`] = entry;
    options.fireStorageChange({ [`userDict:ja:${source}`]: { newValue: entry } });
    await options.flush();
  }

  it('別のタブで新しく編集された項目を、同梱辞書の順の位置に追加し、ほかの行の入力は残す', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' }, Wiki: { t: 'ウィキ' } }) }
    });
    await showEditedOnly();
    assert.deepEqual(sources(), ['Code', 'Wiki']);
    const typing = row('Code').querySelector('input.translation');
    typing.value = '入力中';
    await editElsewhere('Star', { t: 'お気に入り', base: 'スター' });
    assert.deepEqual(sources(), ['Code', 'Star', 'Wiki']);
    assert.equal(row('Star').querySelector('input.translation').value, 'お気に入り');
    assert.equal(row('Code').querySelector('input.translation'), typing);
    assert.equal(typing.value, '入力中');
  });

  it('一致する行がなかった一覧に追加したら、「一致する項目がありません」を消す', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    await showEditedOnly();
    assert.equal(options.document.querySelector('#ud-more').textContent, 'noMatchingRows');
    await editElsewhere('Star', { t: 'お気に入り', base: 'スター' });
    assert.deepEqual(sources(), ['Star']);
    assert.equal(options.document.querySelector('#ud-more').textContent, '');
  });

  it('検索語に一致しない項目は追加しない', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: 'ソース' } }) } });
    await showEditedOnly();
    const search = options.document.querySelector('#ud-search');
    search.value = 'Code';
    search.dispatchEvent(new options.window.Event('input'));
    await editElsewhere('Star', { t: 'お気に入り', base: 'スター' });
    assert.deepEqual(sources(), ['Code']);
  });
});

describe('複数項目の同期', () => {
  let options;
  afterEach(() => options?.close());

  const sources = () => [...options.document.querySelectorAll('#ud-rows tr')].map((tr) => tr.dataset.source);
  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  it('既存の行の更新と新しい行の追加が同時に届いても、両方を反映する', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Wiki: { t: 'ウィキ' } }) }
    });
    const checkbox = options.document.querySelector('#ud-edited-only');
    checkbox.checked = true;
    checkbox.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    assert.deepEqual(sources(), ['Wiki']);
    // 別の画面から、Wikiの更新とStarの新規編集をまとめて保存した
    // （Wikiを先に処理するので、置き換え前のWikiの行がStarの挿入先になる）
    const changes = {
      'userDict:ja:Wiki': { t: 'ウィキページ' },
      'userDict:ja:Star': { t: 'お気に入り' }
    };
    Object.assign(options.store, changes);
    options.fireStorageChange(Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, { newValue: value }])));
    await options.flush();
    assert.deepEqual(sources(), ['Star', 'Wiki']);
    assert.equal(row('Wiki').querySelector('input.translation').value, 'ウィキページ');
    assert.equal(row('Star').querySelector('input.translation').value, 'お気に入り');
  });
});

describe('タグを含む文のDOM更新', () => {
  let page;
  afterEach(() => page?.close());

  it('リンクのテキストノードが同じ文字列で作り直されても、文中で英語のまま残した訳を個別に訳さない', async () => {
    const sentence = 'Secrets are encrypted. <a>Learn more</a>.';
    page = await loadPage({
      url: `${REPO_URL}/settings`,
      dict: { [sentence]: 'シークレットは暗号化されます。<a>詳しく見る</a>。', 'Learn more': '詳しく見る' },
      body: '<p id="m">Secrets are encrypted. <a id="l" href="https://docs.github.com/x">Learn more</a>.</p>',
      settings: ud('ja', { [sentence]: { t: 'シークレットは暗号化されます。<a>Learn more</a>。' } })
    });
    assert.equal(page.text('#m'), 'シークレットは暗号化されます。Learn more。');
    // GitHubがリンクのテキストノードを同じ文字列で作り直した
    const link = page.document.querySelector('#l');
    link.replaceChildren(page.document.createTextNode('Learn more'));
    await page.settle();
    assert.equal(page.text('#m'), 'シークレットは暗号化されます。Learn more。');
  });
});

describe('保存中のクリック', () => {
  let options;
  afterEach(() => options?.close());

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  it('入力欄のchangeで保存が終わっても、行の要素を作り直さない（押下中のクリックを失わない）', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const tr = row('Code');
    const input = tr.querySelector('input.translation');
    const keep = tr.querySelector('input.keep');
    const reset = tr.querySelector('button.reset');
    input.value = 'ソース';
    // チェックボックスを押下した時点で入力欄からフォーカスが外れ、保存が始まる
    keep.dispatchEvent(new options.window.MouseEvent('mousedown', { bubbles: true }));
    input.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    // マウスを離す前に保存が終わっても、押下中の要素は同じ行に残っている
    assert.equal(keep.isConnected, true);
    assert.equal(row('Code'), tr);
    assert.equal(tr.querySelector('input.keep'), keep);
    assert.equal(tr.querySelector('button.reset'), reset);
    assert.equal(tr.className, 'edited');
    assert.equal(reset.disabled, false);
  });
});

describe('保存待ちの編集と言語の切り替え', () => {
  let options;
  afterEach(() => options?.close());

  const wait = (ms) => new Promise((resolve) => options.window.setTimeout(resolve, ms));
  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }
  function edit(source, value) {
    const input = row(source).querySelector('input.translation');
    input.value = value;
    input.dispatchEvent(new options.window.Event('change'));
  }

  it('保存待ちの間に言語を切り替えても、編集した時点の言語と同梱訳で保存する', async () => {
    options = await loadOptions({
      dicts: { ja: DICT, de: { Code: 'Quellcode' } },
      settings: { language: 'ja' }
    });
    // 1件目の保存を遅らせ、2件目を保存待ちにする
    const local = options.window.chrome.storage.local;
    const { set } = local;
    local.set = (items, callback) => options.window.setTimeout(() => set(items, callback), 10);
    edit('Code', 'ソース');
    edit('Star', 'お気に入り');
    const select = options.document.querySelector('#ud-language');
    select.value = 'de';
    select.dispatchEvent(new options.window.Event('change'));
    await wait(60);
    const saved = stored(options.store, 'ja');
    assert.equal(saved.Code.t, 'ソース');
    assert.equal(saved.Star.t, 'お気に入り');
    assert.equal(saved.Star.base, 'スター');
    assert.deepEqual(stored(options.store, 'de'), {});
    // 表示はドイツ語のまま
    assert.equal(row('Code').querySelector('input.translation').placeholder, 'Quellcode');
  });
});

describe('タグ付き訳文の文字の位置', () => {
  const shared = loadShared();
  const SOURCE = 'Making a note in your <a>organization README</a>';

  it('原文で文字がない位置（文末）に文字を置いた訳文は、保存前にエラーにする', () => {
    assert.equal(shared.validateTranslation(SOURCE, '<a>OrganizationのREADME</a>にメモを残す。'), 'userDictErrorTagPosition');
    assert.equal(shared.validateTranslation(SOURCE, 'メモを残す: <a>OrganizationのREADME</a>'), null);
  });

  it('文頭やタグとタグの間も同じく確認し、空白だけなら許可する', () => {
    const source = '<a>Docs</a> and <code>x</code>';
    assert.equal(shared.validateTranslation(source, '詳細は<a>ドキュメント</a>と<code>x</code>'), 'userDictErrorTagPosition');
    assert.equal(shared.validateTranslation(source, '<a>ドキュメント</a>と<code>x</code> '), null);
    assert.equal(shared.validateTranslation('<a>A</a><a>B</a>', '<a>A</a>、<a>B</a>'), 'userDictErrorTagPosition');
  });

  it('保存済みの反映できない訳文は無視し、同梱の訳を使う', () => {
    const { dictionary } = shared.mergeDictionaries(
      { [SOURCE]: 'メモを残す: <a>OrganizationのREADME</a>' },
      { [SOURCE]: { t: '<a>OrganizationのREADME</a>にメモを残す。' } }
    );
    assert.equal(dictionary[SOURCE], 'メモを残す: <a>OrganizationのREADME</a>');
  });

  it('オプションページで反映できない訳文を入力すると、保存せずにエラーを表示する', async () => {
    const options = await loadOptions({
      dicts: { ja: { [SOURCE]: 'メモを残す: <a>OrganizationのREADME</a>' } },
      settings: { language: 'ja' }
    });
    try {
      const tr = options.document.querySelector('#ud-rows tr');
      const input = tr.querySelector('input.translation');
      input.value = '<a>OrganizationのREADME</a>にメモを残す。';
      input.dispatchEvent(new options.window.Event('change'));
      await options.flush();
      assert.equal(tr.querySelector('.error').textContent, 'userDictErrorTagPosition');
      assert.deepEqual(options.storageCalls, []);
    } finally {
      options.close();
    }
  });
});

describe('編集ダイアログのモーダル表示', () => {
  let page;
  afterEach(() => page?.close());

  async function openWithShowModal() {
    page = await loadPage({ url: REPO_URL, dict: DICT, body: '<dialog id="gh" open><nav><a id="code" href="/octo/repo">Code</a></nav></dialog>' });
    assert.equal(page.text('#code'), 'コード');
    // jsdomはshowModal()を実装していないため、呼び出しを記録するだけの実装を入れる
    const calls = [];
    page.window.HTMLDialogElement.prototype.showModal = function showModal() {
      calls.push(this);
      this.setAttribute('open', '');
    };
    page.document.querySelector('#code').dispatchEvent(
      new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
    );
    await page.settle();
    const host = page.document.querySelector('[data-github-ui-translator-editor]');
    return { calls, host, dialog: host.shadowRoot.querySelector('dialog') };
  }

  it('GitHubのモーダルの中からでも操作できるよう、編集画面をshowModal()で開く', async () => {
    const { calls, dialog } = await openWithShowModal();
    assert.equal(calls.length, 1);
    assert.equal(calls[0], dialog);
    assert.equal(dialog.querySelector('textarea'), dialog.getRootNode().activeElement);
  });

  it('Escapeによるcancelは止め、閉じるかどうかはkeydownで判断する', async () => {
    const { host, dialog } = await openWithShowModal();
    const cancel = new page.window.Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    assert.equal(cancel.defaultPrevented, true);
    assert.equal(host.isConnected, true);
  });

  it('Escapeで閉じるときはkeydownを取り消し、背面のGitHubのモーダルまで閉じさせない', async () => {
    const { host, dialog } = await openWithShowModal();
    const escape = new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true });
    dialog.querySelector('textarea').dispatchEvent(escape);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(host.isConnected, false);
    assert.equal(page.document.querySelector('#gh').open, true);
  });

  it('ブラウザーがダイアログを閉じたときは、後片付けして元の要素へフォーカスを戻す', async () => {
    const { host, dialog } = await openWithShowModal();
    dialog.dispatchEvent(new page.window.Event('close'));
    assert.equal(host.isConnected, false);
    assert.equal(page.document.querySelector('[data-github-ui-translator-editor]'), null);
  });
});

describe('Targetボタンの編集', () => {
  let page;
  afterEach(() => page?.close());

  it('「Target: main」をAlt+クリックすると、実際に引いた「Target:」の項目を編集する', async () => {
    page = await loadPage({
      url: 'https://github.com/octo/repo/releases/new',
      dict: { 'Target:': 'ターゲット:' },
      body: '<div class="js-release-target-wrapper"><button id="t">Target: main</button></div>',
      settings: { showOriginalOnHover: true }
    });
    const button = page.document.querySelector('#t');
    assert.equal(button.textContent, 'ターゲット: main');
    // ツールチップには画面上の原文全体を表示する
    assert.equal(button.getAttribute('title'), 'Target: main');
    button.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true }));
    await page.settle();
    const host = page.document.querySelector('[data-github-ui-translator-editor]');
    assert.ok(host);
    assert.equal(host.shadowRoot.querySelector('textarea').value, 'ターゲット:');
    assert.match(host.shadowRoot.textContent, /Target:/);
  });
});

describe('<code>の中身を変えた訳文', () => {
  const shared = loadShared();
  const SOURCE = 'Just the <code>push</code> event.';
  const BUNDLED = { [SOURCE]: '<code>push</code> イベントのみ。' };

  it('<code>の中身を変えた訳文は、保存前にエラーにする', () => {
    assert.equal(shared.validateTranslation(SOURCE, '<code>プッシュ</code>イベントのみ。'), 'userDictErrorCodeText');
    assert.equal(shared.validateTranslation(SOURCE, '<code>push</code> イベントだけ。'), null);
  });

  it('保存済みの<code>の中身を変えた訳は無視し、ページでは同梱の訳を表示する', async () => {
    const page = await loadPage({
      url: `${REPO_URL}/settings`,
      dict: BUNDLED,
      body: '<p id="m">Just the <code>push</code> event.</p>',
      settings: ud('ja', { [SOURCE]: { t: '<code>プッシュ</code>イベントのみ。' } })
    });
    try {
      assert.equal(page.text('#m'), 'push イベントのみ。');
    } finally {
      page.close();
    }
  });

  it('オプションページでは、保存済みの反映できない訳に理由を表示し、新しく入力したものは保存しない', async () => {
    const options = await loadOptions({
      dicts: { ja: { ...BUNDLED, Code: 'コード' } },
      settings: { language: 'ja', ...ud('ja', { [SOURCE]: { t: '<code>プッシュ</code>イベントのみ。' } }) }
    });
    try {
      const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
      assert.equal(row(SOURCE).querySelector('.error').textContent, 'userDictErrorCodeText');
      // 正しい訳に直すと、理由の表示は消える
      const input = row(SOURCE).querySelector('input.translation');
      input.value = '<code>push</code> イベントだけ。';
      input.dispatchEvent(new options.window.Event('change'));
      await options.flush();
      assert.equal(row(SOURCE).querySelector('.error').textContent, '');
      assert.equal(stored(options.store, 'ja')[SOURCE].t, '<code>push</code> イベントだけ。');
      // <code>の中を変えた訳は保存しない
      input.value = '<code>プッシュ</code>イベント。';
      input.dispatchEvent(new options.window.Event('change'));
      await options.flush();
      assert.equal(row(SOURCE).querySelector('.error').textContent, 'userDictErrorCodeText');
      assert.equal(stored(options.store, 'ja')[SOURCE].t, '<code>push</code> イベントだけ。');
    } finally {
      options.close();
    }
  });
});

describe('保存待ちの提案とエクスポート', () => {
  let options;
  afterEach(() => options?.close());

  async function setup() {
    options = await loadOptions({
      dicts: { ja: DICT, de: { Code: 'Quellcode' } },
      settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' }, Star: { t: '星' } }) }
    });
  }

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }

  function edit(source, value) {
    const input = row(source).querySelector('input.translation');
    input.value = value;
    input.dispatchEvent(new options.window.Event('change'));
  }

  function pauseWrites(method = 'set') {
    const local = options.window.chrome.storage.local;
    const original = local[method];
    let release;
    local[method] = (items, callback) => {
      release = () => original(items, callback);
    };
    return () => {
      local[method] = original;
      release();
    };
  }

  function captureExport() {
    const blobs = [];
    options.window.URL.createObjectURL = (blob) => {
      blobs.push(blob);
      return 'blob:test';
    };
    options.window.URL.revokeObjectURL = () => {};
    options.window.HTMLAnchorElement.prototype.click = () => {};
    return blobs;
  }

  async function exportedData(blob) {
    const reader = new options.window.FileReader();
    const text = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    return JSON.parse(text);
  }

  it('行ごとの提案は、先に入力した複数の保存が完了してから最新の訳で開く', async () => {
    await setup();
    const release = pauseWrites();
    edit('Code', '途中の訳');
    edit('Code', '最新の訳');
    row('Code').querySelector('button.suggest').click();
    await options.flush();
    assert.deepEqual(options.openedUrls, []);
    release();
    await options.flush();
    assert.equal(new URL(options.openedUrls[0]).searchParams.get('suggested-translation'), '最新の訳');
  });

  it('まとめて提案するときも、保存中の訳を待つ', async () => {
    await setup();
    const select = options.document.querySelector('#ud-select-all');
    select.checked = true;
    select.dispatchEvent(new options.window.Event('change'));
    const release = pauseWrites();
    edit('Code', '最新の訳');
    options.document.querySelector('#ud-suggest-selected').click();
    await options.flush();
    assert.deepEqual(options.openedUrls, []);
    release();
    await options.flush();
    assert.equal(new URL(options.openedUrls[0]).searchParams.get('suggested-translation'), '最新の訳\n星');
  });

  it('エクスポートは言語を切り替える前後の保存を待ち、両方の最新の訳を含む', async () => {
    await setup();
    const blobs = captureExport();
    const release = pauseWrites();
    edit('Code', '最新の訳');
    await options.flush();
    const select = options.document.querySelector('#ud-language');
    select.value = 'de';
    select.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    edit('Code', 'Eigene Übersetzung');
    const exporting = options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    await options.flush();
    assert.equal(blobs.length, 0);
    release();
    await exporting;
    const data = await exportedData(blobs[0]);
    assert.equal(data.dictionaries.ja.Code.t, '最新の訳');
    assert.equal(data.dictionaries.de.Code.t, 'Eigene Übersetzung');
  });

  it('保存に失敗したら古い訳の提案・出力を止め、再保存できたら再開する', async () => {
    await setup();
    const blobs = captureExport();
    const release = pauseWrites();
    edit('Code', '最新の訳');
    row('Code').querySelector('button.suggest').click();
    const exporting = options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    await options.flush();
    options.failStorageWrites();
    release();
    await exporting;
    assert.deepEqual(options.openedUrls, []);
    assert.equal(blobs.length, 0);
    assert.equal(row('Code').querySelector('input.translation').value, '最新の訳');
    assert.equal(options.document.querySelector('#ud-status').textContent, 'userDictSaveError');
    // 容量が空いたあとに保存し直せる状態を再現する。
    options.window.chrome.storage.local.set = (items, callback) => {
      Object.assign(options.store, plain(items));
      callback();
    };
    edit('Code', '再保存した訳');
    row('Code').querySelector('button.suggest').click();
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(new URL(options.openedUrls[0]).searchParams.get('suggested-translation'), '再保存した訳');
    assert.equal((await exportedData(blobs[0])).dictionaries.ja.Code.t, '再保存した訳');
  });

  it('リセットの保存を待つ間に提案しても、削除された項目ではフォームを開かない', async () => {
    await setup();
    const release = pauseWrites('remove');
    edit('Code', '');
    row('Code').querySelector('button.suggest').click();
    await options.flush();
    release();
    await options.flush();
    assert.deepEqual(options.openedUrls, []);
    assert.equal(stored(options.store, 'ja').Code, undefined);
  });

  it('提案を待つ間に言語を切り替えたら、別の言語では提案しない', async () => {
    await setup();
    const release = pauseWrites();
    edit('Code', '最新の訳');
    row('Code').querySelector('button.suggest').click();
    await options.flush();
    const select = options.document.querySelector('#ud-language');
    select.value = 'de';
    select.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    release();
    await options.flush();
    assert.deepEqual(options.openedUrls, []);
    assert.equal(stored(options.store, 'ja').Code.t, '最新の訳');
  });

  it('保存待ちの間に不正な入力に変えても、先の保存成功でエラーを消して提案・出力しない', async () => {
    await setup();
    const blobs = captureExport();
    const release = pauseWrites();
    edit('Code', '途中の訳');
    await options.flush();
    edit('Code', '<a>不正な訳</a>');
    row('Code').querySelector('button.suggest').click();
    const exporting = options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    release();
    await exporting;
    assert.deepEqual(options.openedUrls, []);
    assert.equal(blobs.length, 0);
    assert.equal(row('Code').querySelector('.error').textContent, 'userDictErrorTags');
    assert.equal(row('Code').querySelector('input.translation').value, '<a>不正な訳</a>');
    edit('Code', '修正した訳');
    row('Code').querySelector('button.suggest').click();
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(new URL(options.openedUrls[0]).searchParams.get('suggested-translation'), '修正した訳');
    assert.equal((await exportedData(blobs[0])).dictionaries.ja.Code.t, '修正した訳');
  });
});

describe('未保存の入力を破棄した後のエクスポート', () => {
  let options;
  afterEach(() => options?.close());

  for (const action of ['reset', 'import']) {
    it(`${action}で不正な入力を置き換えたら、エクスポートを再開できる`, async () => {
      options = await loadOptions({
        dicts: { ja: DICT },
        settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' } }) }
      });
      let exported = 0;
      options.window.URL.createObjectURL = () => {
        exported++;
        return 'blob:test';
      };
      options.window.URL.revokeObjectURL = () => {};
      options.window.HTMLAnchorElement.prototype.click = () => {};
      const input = options.document.querySelector('#ud-rows input.translation');
      input.value = '<a>不正な訳</a>';
      input.dispatchEvent(new options.window.Event('change'));
      await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
      assert.equal(exported, 0);
      if (action === 'reset') options.document.querySelector('#ud-reset-all').click();
      else {
        const data = JSON.stringify({
          format: 'github-ui-translator-user-dictionary', version: 1,
          dictionaries: { ja: { Code: { t: '取り込んだ訳' } } }
        });
        const fileInput = options.document.querySelector('#ud-import-file');
        Object.defineProperty(fileInput, 'files', { value: [{ text: async () => data }] });
        fileInput.dispatchEvent(new options.window.Event('change'));
      }
      await options.flush();
      await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
      assert.equal(exported, 1);
      assert.equal(stored(options.store, 'ja').Code?.t, action === 'reset' ? undefined : '取り込んだ訳');
    });
  }
});

describe('別のタブの保存で置き換わった未保存の入力', () => {
  let options;
  afterEach(() => options?.close());

  async function setup() {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' } }) }
    });
    let exported = 0;
    options.window.URL.createObjectURL = () => {
      exported++;
      return 'blob:test';
    };
    options.window.URL.revokeObjectURL = () => {};
    options.window.HTMLAnchorElement.prototype.click = () => {};
    const tr = [...options.document.querySelectorAll('#ud-rows tr')].find((row) => row.dataset.source === 'Code');
    const input = tr.querySelector('input.translation');
    input.value = '<a>不正な訳</a>';
    input.dispatchEvent(new options.window.Event('change'));
    return { tr, input, exported: () => exported };
  }

  async function saveElsewhere() {
    const entry = { t: '別タブの訳' };
    options.store['userDict:ja:Code'] = entry;
    options.fireStorageChange({ 'userDict:ja:Code': { newValue: entry } });
    await options.flush();
  }

  it('入力欄が別の場所の訳に置き換わったら、エラーを消してエクスポートと提案を再開する', async () => {
    const { tr, input, exported } = await setup();
    await saveElsewhere();
    assert.equal(input.value, '別タブの訳');
    assert.equal(tr.querySelector('.error').textContent, '');
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(exported(), 1);
    tr.querySelector('button.suggest').click();
    await options.flush();
    assert.equal(new URL(options.openedUrls[0]).searchParams.get('suggested-translation'), '別タブの訳');
  });

  it('入力中（フォーカスあり）の欄は置き換えないので、エラーとエクスポートの停止を残す', async () => {
    const { tr, input, exported } = await setup();
    input.focus();
    await saveElsewhere();
    assert.equal(input.value, '<a>不正な訳</a>');
    assert.equal(tr.querySelector('.error').textContent, 'userDictErrorTags');
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(exported(), 0);
  });
});

describe('自分の保存の通知と、その後の未保存の入力', () => {
  let options;
  afterEach(() => options?.close());

  function row(source) {
    return [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  }
  function edit(source, value) {
    const input = row(source).querySelector('input.translation');
    input.value = value;
    input.dispatchEvent(new options.window.Event('change'));
  }

  async function setupWithPausedWrite() {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' } }) } });
    const local = options.window.chrome.storage.local;
    const { set } = local;
    let release;
    local.set = (items, callback) => {
      // 保存自体は先に終わり、onChangedが完了のコールバックより先に届く状況を再現する
      set(items, () => {});
      options.fireStorageChange(Object.fromEntries(Object.entries(items).map(([key, value]) => [key, { newValue: value }])));
      release = () => {
        local.set = set;
        callback();
      };
    };
    return () => release();
  }

  it('保存待ちの間に入力した不正な訳とエラーを、先の保存の通知で消さない', async () => {
    const release = await setupWithPausedWrite();
    edit('Code', '途中の訳');
    edit('Code', '<a>不正な訳</a>');
    await options.flush();
    const input = row('Code').querySelector('input.translation');
    assert.equal(input.value, '<a>不正な訳</a>');
    assert.equal(row('Code').querySelector('.error').textContent, 'userDictErrorTags');
    release();
    await options.flush();
    assert.equal(input.value, '<a>不正な訳</a>');
    assert.equal(row('Code').querySelector('.error').textContent, 'userDictErrorTags');
    // 古い訳で提案しない
    row('Code').querySelector('button.suggest').click();
    await options.flush();
    assert.deepEqual(options.openedUrls, []);
  });

  it('保存待ちの正しい訳も、先の保存の通知で古い訳に戻さない', async () => {
    const release = await setupWithPausedWrite();
    edit('Code', '途中の訳');
    edit('Code', '最新の訳');
    await options.flush();
    assert.equal(row('Code').querySelector('input.translation').value, '最新の訳');
    release();
    await options.flush();
    assert.equal(row('Code').querySelector('input.translation').value, '最新の訳');
    assert.equal(stored(options.store, 'ja').Code.t, '最新の訳');
  });
});

describe('循環する自分の訳', () => {
  const shared = loadShared();

  it('ほかの自分の訳と循環する訳は、保存前にエラーにする', () => {
    const entries = { Code: { t: 'Settings' } };
    assert.equal(shared.validateNoCycle(DICT, entries, 'Settings', { t: 'Code' }), 'userDictErrorCycle');
    assert.equal(shared.validateNoCycle(DICT, entries, 'Settings', { t: '構成' }), null);
    assert.equal(shared.validateNoCycle(DICT, entries, 'Settings', { t: null }), null);
  });

  it('オプションページでは循環する訳を保存せず、先に保存した訳は残す', async () => {
    const options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    try {
      const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
      const edit = (source, value) => {
        const input = row(source).querySelector('input.translation');
        input.value = value;
        input.dispatchEvent(new options.window.Event('change'));
      };
      edit('Code', 'Settings');
      await options.flush();
      edit('Settings', 'Code');
      await options.flush();
      assert.equal(row('Settings').querySelector('.error').textContent, 'userDictErrorCycle');
      assert.equal(stored(options.store, 'ja').Code.t, 'Settings');
      assert.equal(stored(options.store, 'ja').Settings, undefined);
    } finally {
      options.close();
    }
  });

  it('保存済みの循環する訳には、両方の行に理由を表示する', async () => {
    const options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'Settings' }, Settings: { t: 'Code' } }) }
    });
    try {
      const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
      assert.equal(row('Code').querySelector('.error').textContent, 'userDictErrorCycle');
      assert.equal(row('Settings').querySelector('.error').textContent, 'userDictErrorCycle');
      // 片方をリセットすると循環が解け、もう片方の理由も消える
      row('Settings').querySelector('button.reset').click();
      await options.flush();
      assert.equal(row('Code').querySelector('.error').textContent, '');
    } finally {
      options.close();
    }
  });

  it('Alt+クリックの編集でも、循環する訳は保存しない', async () => {
    const page = await loadPage({
      url: REPO_URL,
      dict: DICT,
      body: '<nav><a id="s" href="/octo/repo/settings">Settings</a></nav>',
      settings: ud('ja', { Code: { t: 'Settings' } })
    });
    try {
      page.document.querySelector('#s').dispatchEvent(
        new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
      );
      await page.settle();
      const host = page.document.querySelector('[data-github-ui-translator-editor]');
      host.shadowRoot.querySelector('textarea').value = 'Code';
      [...host.shadowRoot.querySelectorAll('button')].find((button) => button.textContent === 'saveButton').click();
      await page.settle();
      assert.equal(host.isConnected, true);
      assert.deepEqual(page.storageCalls, []);
      assert.equal(page.reloads, 0);
    } finally {
      page.close();
    }
  });
});

describe('保存待ちの編集と循環', () => {
  let options;
  afterEach(() => options?.close());

  it('先の保存が終わる前に入力した循環する訳は、保存の直前に確かめ直して保存しない', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
    const edit = (source, value) => {
      const input = row(source).querySelector('input.translation');
      input.value = value;
      input.dispatchEvent(new options.window.Event('change'));
    };
    // 1件目（Code -> Settings）の保存を止めておく
    const local = options.window.chrome.storage.local;
    const { set } = local;
    let release;
    local.set = (items, callback) => {
      release = () => {
        local.set = set;
        set(items, callback);
      };
    };
    edit('Code', 'Settings');
    await options.flush();
    // 保存待ちの間に、循環する2件目を入力する（この時点の辞書にはまだCodeの訳がない）
    edit('Settings', 'Code');
    await options.flush();
    release();
    await options.flush();
    assert.equal(stored(options.store, 'ja').Code.t, 'Settings');
    assert.equal(stored(options.store, 'ja').Settings, undefined);
    assert.equal(row('Settings').querySelector('.error').textContent, 'userDictErrorCycle');
    assert.equal(row('Settings').querySelector('input.translation').value, 'Code');
    assert.notEqual(options.document.querySelector('#ud-status').textContent, 'savedStatus');
  });
});

describe('インポートと循環', () => {
  let options;
  afterEach(() => options?.close());

  const file = (entries) => JSON.stringify({ format: 'github-ui-translator-user-dictionary', version: 1, dictionaries: { ja: entries } });

  it('既存の訳と循環する項目は取り込まず、スキップした件数に数える', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'Settings' } }) }
    });
    const result = await options.window.GitHubUITranslatorOptions.importUserDictionaries(
      file({ Settings: { t: 'Code' }, Star: { t: 'お気に入り' } })
    );
    assert.deepEqual(plain(result), { imported: 1, skipped: 1 });
    assert.equal(stored(options.store, 'ja').Code.t, 'Settings');
    assert.equal(stored(options.store, 'ja').Settings, undefined);
    assert.equal(stored(options.store, 'ja').Star.t, 'お気に入り');
  });

  it('ファイルの中だけで循環する場合は、先の項目を取り込み、循環を作る後の項目をスキップする', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const result = await options.window.GitHubUITranslatorOptions.importUserDictionaries(
      file({ Code: { t: 'Settings' }, Settings: { t: 'Code' } })
    );
    assert.deepEqual(plain(result), { imported: 1, skipped: 1 });
    assert.equal(stored(options.store, 'ja').Code.t, 'Settings');
    assert.equal(stored(options.store, 'ja').Settings, undefined);
  });

  it('既存の循環する訳を同じファイルで書き換えて循環が解けるなら、取り込む', async () => {
    options = await loadOptions({
      dicts: { ja: DICT },
      settings: { language: 'ja', ...ud('ja', { Code: { t: 'Settings' } }) }
    });
    const result = await options.window.GitHubUITranslatorOptions.importUserDictionaries(
      file({ Code: { t: 'ソース' }, Settings: { t: 'Code' } })
    );
    assert.deepEqual(plain(result), { imported: 2, skipped: 0 });
    assert.equal(stored(options.store, 'ja').Code.t, 'ソース');
    assert.equal(stored(options.store, 'ja').Settings.t, 'Code');
  });
});

describe('再描画と保存していない入力', () => {
  let options;
  afterEach(() => options?.close());

  const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  function edit(source, value) {
    const input = row(source).querySelector('input.translation');
    input.value = value;
    input.dispatchEvent(new options.window.Event('change'));
  }
  async function search(query) {
    const input = options.document.querySelector('#ud-search');
    input.value = query;
    input.dispatchEvent(new options.window.Event('input'));
    await options.flush();
  }

  it('保存に失敗した入力は、検索で行を作り直しても入力とエラーを復元する', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' } }) } });
    options.failStorageWrites();
    edit('Code', '新しい訳');
    await options.flush();
    await search('Code');
    assert.equal(row('Code').querySelector('input.translation').value, '新しい訳');
    assert.equal(row('Code').querySelector('.error').textContent, 'userDictSaveError');
    // 絞り込みで一度見えなくなっても、戻すと復元する
    await search('Star');
    assert.equal(row('Code'), undefined);
    await search('');
    assert.equal(row('Code').querySelector('input.translation').value, '新しい訳');
    assert.equal(row('Code').querySelector('.error').textContent, 'userDictSaveError');
    assert.equal(stored(options.store, 'ja').Code.t, '以前の訳');
  });

  it('不正な訳や「英語のまま」も、「編集済みのみ」の切り替えで復元する', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' }, Star: { t: '星' } }) } });
    edit('Code', '<a>不正な訳</a>');
    options.failStorageWrites();
    const keep = row('Star').querySelector('input.keep');
    keep.checked = true;
    keep.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    const editedOnly = options.document.querySelector('#ud-edited-only');
    editedOnly.checked = true;
    editedOnly.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    assert.equal(row('Code').querySelector('input.translation').value, '<a>不正な訳</a>');
    assert.equal(row('Code').querySelector('.error').textContent, 'userDictErrorTags');
    assert.equal(row('Star').querySelector('input.keep').checked, true);
    assert.equal(row('Star').querySelector('input.translation').disabled, true);
    assert.equal(row('Star').querySelector('.error').textContent, 'userDictSaveError');
  });

  it('保存待ちの間に行を作り直しても、保存が終わると今の行を保存済みの表示にする', async () => {
    options = await loadOptions({ dicts: { ja: DICT }, settings: { language: 'ja' } });
    const local = options.window.chrome.storage.local;
    const { set } = local;
    let release;
    local.set = (items, callback) => {
      release = () => {
        local.set = set;
        set(items, callback);
      };
    };
    edit('Code', 'ソース');
    await options.flush();
    await search('Co');
    assert.equal(row('Code').querySelector('input.translation').value, 'ソース');
    release();
    await options.flush();
    assert.equal(row('Code').className, 'edited');
    assert.equal(row('Code').querySelector('button.reset').disabled, false);
    assert.equal(options.document.querySelector('#ud-status').textContent, 'savedStatus');
  });
});

describe('見えていない行の保存できていない入力', () => {
  let options;
  let exported;
  afterEach(() => options?.close());

  const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
  const status = () => options.document.querySelector('#ud-status').textContent;
  function edit(source, value) {
    const input = row(source).querySelector('input.translation');
    input.value = value;
    input.dispatchEvent(new options.window.Event('change'));
  }
  async function search(query) {
    const input = options.document.querySelector('#ud-search');
    input.value = query;
    input.dispatchEvent(new options.window.Event('input'));
    await options.flush();
  }
  async function setupWithFailedSave() {
    options = await loadOptions({
      dicts: { ja: DICT, de: { Code: 'Quellcode' } },
      settings: { language: 'ja', ...ud('ja', { Code: { t: '以前の訳' }, Star: { t: '星' } }) }
    });
    exported = 0;
    options.window.URL.createObjectURL = () => {
      exported++;
      return 'blob:test';
    };
    options.window.URL.revokeObjectURL = () => {};
    options.window.HTMLAnchorElement.prototype.click = () => {};
    const { set } = options.window.chrome.storage.local;
    options.failStorageWrites();
    edit('Code', '新しい訳');
    await options.flush();
    return () => {
      options.window.chrome.storage.local.set = set;
    };
  }

  it('検索で行が見えなくなっても、エクスポートを止めて項目名を示す', async () => {
    await setupWithFailedSave();
    await search('Star');
    assert.equal(row('Code'), undefined);
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(exported, 0);
    assert.equal(status(), 'unsavedEditHidden(Code)');
  });

  it('言語を切り替えても、エクスポートを止めて言語と項目名を示す', async () => {
    await setupWithFailedSave();
    const select = options.document.querySelector('#ud-language');
    select.value = 'de';
    select.dispatchEvent(new options.window.Event('change'));
    await options.flush();
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(exported, 0);
    assert.equal(status(), 'unsavedEditHidden(日本語: Code)');
  });

  it('まとめて提案するときも、見えていない選択中の行の保存できていない入力で止める', async () => {
    await setupWithFailedSave();
    const selectAll = options.document.querySelector('#ud-select-all');
    selectAll.checked = true;
    selectAll.dispatchEvent(new options.window.Event('change'));
    await search('Star');
    options.document.querySelector('#ud-suggest-selected').click();
    await options.flush();
    assert.deepEqual(options.openedUrls, []);
    assert.equal(status(), 'unsavedEditHidden(Code)');
  });

  it('見えていない行の項目が別の場所で保存されたら、その入力を捨ててエクスポートを再開する', async () => {
    await setupWithFailedSave();
    await search('Star');
    const entry = { t: '別タブの訳' };
    options.store['userDict:ja:Code'] = entry;
    options.fireStorageChange({ 'userDict:ja:Code': { newValue: entry } });
    await options.flush();
    await options.window.GitHubUITranslatorOptions.exportUserDictionaries();
    assert.equal(exported, 1);
    await search('');
    assert.equal(row('Code').querySelector('input.translation').value, '別タブの訳');
  });
});

describe('リセットで生じる循環', () => {
  const shared = loadShared();
  // 日本語の同梱辞書と同じく、"Wikis" は "Wiki" に、"Wiki" は自己マッピングで訳す
  const WIKI_DICT = { ...DICT, Wikis: 'Wiki' };
  const USER = { Wikis: { t: 'ウィキ一覧' }, Wiki: { t: 'Wikis' } };

  it('リセットで戻る同梱の訳がほかの上書きと循環するなら、エラーにする', () => {
    assert.equal(shared.validateNoCycle(WIKI_DICT, USER, 'Wikis', undefined), 'userDictErrorCycleOnReset');
    // 循環に関わらない項目のリセットや、循環を解くリセットは許可する
    assert.equal(shared.validateNoCycle(WIKI_DICT, USER, 'Wiki', undefined), null);
    assert.equal(shared.validateNoCycle(DICT, { Code: { t: 'Settings' }, Settings: { t: 'Code' } }, 'Settings', undefined), null);
  });

  it('もともと循環している訳を、循環したままの訳に変えても保存しない', () => {
    const entries = { Code: { t: 'Settings' }, Settings: { t: 'Code' } };
    assert.equal(shared.validateNoCycle(DICT, entries, 'Settings', { t: 'Code' }), 'userDictErrorCycle');
    assert.equal(shared.validateNoCycle(DICT, entries, 'Settings', { t: '構成' }), null);
  });

  it('オプションページのリセットボタンでも、循環が生じるなら削除しない', async () => {
    const options = await loadOptions({ dicts: { ja: WIKI_DICT }, settings: { language: 'ja', ...ud('ja', USER) } });
    try {
      const row = (source) => [...options.document.querySelectorAll('#ud-rows tr')].find((tr) => tr.dataset.source === source);
      row('Wikis').querySelector('button.reset').click();
      await options.flush();
      assert.equal(row('Wikis').querySelector('.error').textContent, 'userDictErrorCycleOnReset');
      assert.equal(stored(options.store, 'ja').Wikis.t, 'ウィキ一覧');
      assert.equal(stored(options.store, 'ja').Wiki.t, 'Wikis');
    } finally {
      options.close();
    }
  });

  it('Alt+クリックの編集の「同梱の訳に戻す」でも、循環が生じるなら削除しない', async () => {
    const page = await loadPage({
      url: REPO_URL,
      dict: WIKI_DICT,
      body: '<nav><button id="w">Wikis</button></nav>',
      settings: ud('ja', USER)
    });
    try {
      assert.equal(page.text('#w'), 'ウィキ一覧');
      page.document.querySelector('#w').dispatchEvent(
        new page.window.MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
      );
      await page.settle();
      const host = page.document.querySelector('[data-github-ui-translator-editor]');
      [...host.shadowRoot.querySelectorAll('button')].find((button) => button.textContent === 'resetToBundledButton').click();
      await page.settle();
      assert.equal(host.isConnected, true);
      assert.deepEqual(page.storageCalls, []);
      assert.equal(page.reloads, 0);
    } finally {
      page.close();
    }
  });
});
