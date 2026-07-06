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
    '[role="menu"]',
    '[role="dialog"]',
    '[role="listbox"]',
    '[aria-label]'
  ];

  // Settings、Organization管理、リポジトリ作成、Issue/PR画面では
  // 見出しやラベルにも固定UI文言が多いため、翻訳対象を広げる。
  // README/Issue本文などのコンテンツ領域は .markdown-body で除外する。
  const isExtendedScopePage =
    /\/settings(\/|$)/.test(location.pathname) ||
    /^\/orgs\/[^/]+\/(people|teams|security-managers)(\/|$)/.test(location.pathname) ||
    /^\/new(\/|$)/.test(location.pathname) ||
    /^\/organizations\/[^/]+\/repositories\/new$/.test(location.pathname) ||
    /^\/[^/]+\/[^/]+\/(issues|pulls)(\/|$)/.test(location.pathname);
  const EXTRA_SELECTOR = ['label', 'legend', 'h1', 'h2', 'h3', 'dt', 'strong'];
  // 万一Settings画面内にMarkdown本文的な領域があっても対象から除外する安全策
  const EXCLUDE_SELECTOR = '.markdown-body, .markdown-body *';

  const ALLOWLIST_SELECTOR = (isExtendedScopePage
    ? BASE_SELECTOR.concat(EXTRA_SELECTOR)
    : BASE_SELECTOR
  ).join(',');

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
      return data.translations || {};
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
        el.setAttribute('aria-label', label.replace(trimmed, translated));
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
        textNode.nodeValue = value.replace(trimmed, translated);
      }
    }
  }

  function translateAll(root, dict) {
    if (root.matches && root.matches(ALLOWLIST_SELECTOR) && !root.closest(EXCLUDE_SELECTOR)) {
      translateElement(root, dict);
    }
    root.querySelectorAll(ALLOWLIST_SELECTOR).forEach((el) => {
      if (!el.closest(EXCLUDE_SELECTOR)) translateElement(el, dict);
    });
  }

  (async () => {
    const { enabled, language } = await getSettings();
    if (!enabled) return;

    const dict = await loadDictionary(language);
    if (Object.keys(dict).length === 0) return;

    translateAll(document.body, dict);

    // SPA対応: GitHubの動的DOM更新に追従する
    // 完全一致した文字列は翻訳後の日本語になり辞書のキー（英語）と再度一致しないため、
    // 再走査してもループしない。複数ミューテーションはrequestAnimationFrameで1回にまとめる
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        translateAll(document.body, dict);
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  })();
})();
