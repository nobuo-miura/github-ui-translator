// 拡張機能内で共有する辞書・言語・UIローカライズ処理
(() => {
  function stripJsonComments(text) {
    return text
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
  }

  async function loadLanguages() {
    const url = chrome.runtime.getURL('languages.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load languages: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.languages)) throw new Error('Invalid languages.json');
    return data.languages;
  }

  // ブラウザーの表示言語に対応する辞書がないときに使う言語
  const FALLBACK_LANGUAGE = 'ja';

  // ブラウザーの表示言語（"de"、"pt-BR"、"zh_CN"等）から、同梱辞書の言語コードを選ぶ。
  // 完全一致を優先し、中国語は文字体系・地域、それ以外は言語部分（"pt-PT" → "pt-BR"等）で選ぶ。
  // どれにも当てはまらなければFALLBACK_LANGUAGEを返す
  function resolveDefaultLanguage(uiLanguage, codes) {
    const normalized = String(uiLanguage || '').replace(/_/g, '-').toLowerCase();
    if (!normalized) return FALLBACK_LANGUAGE;

    const exact = codes.find((code) => code.toLowerCase() === normalized);
    if (exact) return exact;

    const base = normalized.split('-')[0];
    // 中国語は文字体系を優先する。明示されたHans/Hantがなければ地域で選ぶ。
    // 香港・マカオには、同梱する台湾向けの繁体字辞書を使う。
    if (base === 'zh') {
      const parts = normalized.split('-');
      const script = parts.find((part) => part === 'hans' || part === 'hant');
      const traditional = script ? script === 'hant' : parts.some((part) => ['tw', 'hk', 'mo'].includes(part));
      const preferred = codes.find((code) => code.toLowerCase() === (traditional ? 'zh-tw' : 'zh-cn'));
      if (preferred) return preferred;
    }

    const sameBase = codes.find((code) => code.toLowerCase().split('-')[0] === base);
    return sameBase || FALLBACK_LANGUAGE;
  }

  // 言語が未設定（インストール直後など）のときの初期言語を返す。
  // 言語一覧を読み込めなかった場合はFALLBACK_LANGUAGEにする
  async function getDefaultLanguage() {
    try {
      const languages = await loadLanguages();
      return resolveDefaultLanguage(chrome.i18n.getUILanguage(), languages.map(({ code }) => code));
    } catch {
      return FALLBACK_LANGUAGE;
    }
  }

  function getMessage(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }

  function localizeDocument() {
    const uiLanguage = chrome.i18n.getUILanguage();
    document.documentElement.lang = uiLanguage ? uiLanguage.split('-')[0] : 'en';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = getMessage(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', getMessage(el.dataset.i18nAriaLabel));
    });
  }

  globalThis.GitHubUITranslator = {
    getDefaultLanguage,
    getMessage,
    loadLanguages,
    localizeDocument,
    resolveDefaultLanguage,
    stripJsonComments
  };
})();
