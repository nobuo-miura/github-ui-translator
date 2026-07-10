// GitHub UI Translator - content script
//
// 実装方針:
// - 走査対象は許可リスト方式（nav, header, button, role=tab, role=menuitem, aria-label）のみ
// - CSSクラス名やdata-testidには依存しない
// - 辞書に完全一致した文字列のみ置換し、動的文字列（数値・日付混じり）は対象外
// - 一致しない場合は原文表示のまま（翻訳失敗時のフォールバック）

(() => {
  const BASE_SELECTOR = [
    'nav',
    'header',
    'button',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemradio"]',
    '[role="menuitemcheckbox"]',
    '[role="menu"]',
    '[role="dialog"]',
    '[role="listbox"]',
    '[role="button"]',
    '[aria-label]'
  ];

  // Settings、Organization管理、リポジトリ作成、Issue/PR画面では
  // 見出しやラベルにも固定UI文言が多いため、翻訳対象を広げる。
  // "a"は、GitHubが<button>ではなくPrimerのButtonクラスを当てた<a>タグで
  // ボタンを実装しているケース（例: 「New pull request」）に対応するために追加。
  // roleもaria-labelも付いていないためaria-labelでは拾えないが、<a>自体は
  // CSSクラスに依存しない正規のセマンティックHTMLタグなので方針上問題ない。
  // README/Issue本文などのコンテンツ領域は .markdown-body で除外する。
  const EXTRA_SELECTOR = ['label', 'legend', 'h1', 'h2', 'h3', 'dt', 'strong', 'a'];
  // 万一Settings画面内にMarkdown本文的な領域があっても対象から除外する安全策
  const EXCLUDE_SELECTOR = '.markdown-body, .markdown-body *';

  function getAllowlistSelector() {
    const isExtendedScopePage =
      /\/settings(\/|$)/.test(location.pathname) ||
      /^\/orgs\/[^/]+\/(people|teams|security-managers)(\/|$)/.test(location.pathname) ||
      /^\/new(\/|$)/.test(location.pathname) ||
      /^\/organizations\/[^/]+\/repositories\/new$/.test(location.pathname) ||
      // 個別PRページはURLが/pull/123（単数形）、一覧ページは/pulls（複数形）と
      // GitHub側でURL規則が不統一なため、両方にマッチさせる（pulls?）
      /^\/[^/]+\/[^/]+\/(issues|pulls?|compare|wiki|security)(\/|$)/.test(location.pathname);

    return (isExtendedScopePage
      ? BASE_SELECTOR.concat(EXTRA_SELECTOR)
      : BASE_SELECTOR
    ).join(',');
  }

  // 辞書ファイルは画面ごとの区切りが分かるよう "//" 行コメント付き(JSONC風)で
  // 管理しているため、標準のJSON.parseに渡す前にコメント行を取り除く。
  function stripJsonComments(text) {
    return text
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
  }

  async function loadDictionary(language) {
    try {
      const url = chrome.runtime.getURL(`dictionaries/${language}.json`);
      const res = await fetch(url);
      const text = await res.text();
      const data = JSON.parse(stripJsonComments(text));
      // プロトタイプなしオブジェクトに詰め替える。通常オブジェクトだと画面上の
      // テキストが "toString" や "hasOwnProperty" のときObject.prototypeの
      // 継承プロパティが辞書ヒット扱いになり、テキスト破壊や例外の原因になる
      return Object.assign(Object.create(null), data.translations || {});
    } catch (e) {
      console.error('[GitHub UI Translator] 辞書の読み込みに失敗しました', e);
      return {};
    }
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ enabled: true, language: 'ja' }, (items) => resolve(items));
    });
  }

  function translateElement(el, dict) {
    const label = el.getAttribute('aria-label');
    if (label) {
      const trimmed = label.trim();
      const translated = dict[trimmed];
      if (translated) {
        // 置換文字列中の "$&" 等が特殊解釈されないよう関数形式で渡す
        el.setAttribute('aria-label', label.replace(trimmed, () => translated));
      }
    }

    // <select>の<option>群（国名一覧など巨大な参照データ）は翻訳対象外
    if (el.tagName === 'SELECT') return;

    // role="menu"/"listbox"は国名・タイムゾーン一覧のような巨大な参照データが
    // 丸ごと隠し要素として含まれることがあるため、件数上限を設ける。
    // nav/header/dialog/label/heading等の一般的なUI領域には上限を適用しない
    // （Settingsサイドバーのような正規のナビゲーションを誤って除外しないため）
    const role = el.getAttribute('role');
    const isBoundedContainer = role === 'menu' || role === 'listbox';

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
      if (isBoundedContainer && textNodes.length > 100) return;
    }

    for (const textNode of textNodes) {
      const value = textNode.nodeValue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      const translated = dict[trimmed];
      if (translated) {
        // 置換文字列中の "$&" 等が特殊解釈されないよう関数形式で渡す
        textNode.nodeValue = value.replace(trimmed, () => translated);
      }
    }
  }

  function translateAll(root, dict) {
    const allowlistSelector = getAllowlistSelector();
    if (root.matches && root.matches(allowlistSelector) && !root.closest(EXCLUDE_SELECTOR)) {
      translateElement(root, dict);
    }
    root.querySelectorAll(allowlistSelector).forEach((el) => {
      if (!el.closest(EXCLUDE_SELECTOR)) translateElement(el, dict);
    });
  }

  (async () => {
    const { enabled, language } = await getSettings();
    if (!enabled) return;

    const dict = await loadDictionary(language);
    if (Object.keys(dict).length === 0) return;

    // SPA対応: GitHubの動的DOM更新に追従する
    // 完全一致した文字列は翻訳後の日本語になり辞書のキー（英語）と再度一致しないため、
    // 再走査してもループしない。複数ミューテーションはrequestAnimationFrameで1回にまとめる
    //
    // 監視対象はdocument.bodyではなくdocumentElement（<html>）にする。
    // GitHubのTurboナビゲーション（特に「戻る/進む」の履歴復元）は<body>要素ごと
    // 置き換えるため、bodyを監視していると置換後に一切検知できなくなる。
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        translateAll(document.body, dict);
      });
    });
    // 初回翻訳より先に監視を開始し、その間のDOM変更を取りこぼさないようにする
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    translateAll(document.body, dict);

    // ブラウザの「戻る/進む」でbfcacheからページが復元された場合、
    // DOM変更を伴わないことがありMutationObserverだけでは検知できないため、
    // pageshowイベントでも再翻訳する。
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        translateAll(document.body, dict);
      }
    });
  })();
})();
