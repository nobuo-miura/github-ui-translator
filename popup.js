const { getMessage, loadLanguages, localizeDocument, resolveDefaultLanguage } = globalThis.GitHubUITranslator;

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const languageSelect = document.getElementById('language');
const globalHeaderToggle = document.getElementById('global-header-toggle');
const showOriginalToggle = document.getElementById('show-original-toggle');

// 言語選択の「自動」（ブラウザの表示言語に従う）を表す<option>の値
const AUTO_LANGUAGE = '';

// 「自動」で判定した結果、対応する辞書がない（翻訳しない）かどうか
let autoLanguageUnsupported = false;

// 設定を変更したあとのGitHubタブの再読み込みは、各タブのcontent.jsが
// chrome.storage.onChangedを検知して行う。ポップアップ側からタブを探すには
// "tabs"権限かホスト権限が必要になるため、ここでは再読み込みしない

async function initialize() {
  localizeDocument();

  try {
    const languages = await loadLanguages();

    // 先頭に「自動」を置く。値は空文字で、選ぶとstorageのlanguageを削除して
    // 未設定に戻す。括弧内には、content.jsと同じ判定で決まる言語名を表示する。
    // 対応する辞書がなければ「翻訳しない」と表示する
    const defaultLanguage = resolveDefaultLanguage(
      chrome.i18n.getUILanguage(),
      languages.map(({ code }) => code)
    );
    autoLanguageUnsupported = !defaultLanguage;
    const defaultName = defaultLanguage
      ? languages.find(({ code }) => code === defaultLanguage)?.name ?? defaultLanguage
      : getMessage('noTranslationOption');
    const autoOption = document.createElement('option');
    autoOption.value = AUTO_LANGUAGE;
    autoOption.textContent = getMessage('autoLanguageOption', [defaultName]);
    languageSelect.appendChild(autoOption);

    languages.forEach(({ code, name }) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      languageSelect.appendChild(option);
    });
  } catch (e) {
    console.error('[GitHub UI Translator] Failed to load languages', e);
    languageSelect.disabled = true;
  }

  chrome.storage.local.get(
    { enabled: true, language: null, translateGlobalHeader: true, showOriginalOnHover: false },
    (items) => {
      toggle.checked = items.enabled;
      languageSelect.value = items.language || AUTO_LANGUAGE;
      updateStatus(items.enabled);
      globalHeaderToggle.checked = items.translateGlobalHeader;
      showOriginalToggle.checked = items.showOriginalOnHover;
    }
  );
}

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  updateStatus(enabled);
  chrome.storage.local.set({ enabled });
});

languageSelect.addEventListener('change', () => {
  updateStatus(toggle.checked);
  if (languageSelect.value === AUTO_LANGUAGE) {
    chrome.storage.local.remove('language');
  } else {
    chrome.storage.local.set({ language: languageSelect.value });
  }
});

globalHeaderToggle.addEventListener('change', () => {
  chrome.storage.local.set({ translateGlobalHeader: globalHeaderToggle.checked });
});

showOriginalToggle.addEventListener('change', () => {
  chrome.storage.local.set({ showOriginalOnHover: showOriginalToggle.checked });
});

// ONでも「自動」で対応する辞書がなければ翻訳されないので、言語を選ぶよう案内する
function updateStatus(enabled) {
  if (!enabled) {
    status.textContent = getMessage('translationDisabledStatus');
  } else if (languageSelect.value === AUTO_LANGUAGE && autoLanguageUnsupported) {
    status.textContent = getMessage('unsupportedBrowserLanguageStatus');
  } else {
    status.textContent = getMessage('translationEnabledStatus');
  }
}

initialize();
