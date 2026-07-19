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
    getMessage,
    loadLanguages,
    localizeDocument,
    stripJsonComments
  };
})();
