const { getMessage, loadLanguages, localizeDocument } = globalThis.GitHubUITranslator;

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const languageSelect = document.getElementById('language');

async function initialize() {
  localizeDocument();

  try {
    const languages = await loadLanguages();
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

  chrome.storage.local.get({ enabled: true, language: 'ja' }, (items) => {
    toggle.checked = items.enabled;
    updateStatus(items.enabled);
    languageSelect.value = items.language;
  });
}

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled }, () => {
    updateStatus(enabled);
    reloadGithubTabs();
  });
});

languageSelect.addEventListener('change', () => {
  chrome.storage.local.set({ language: languageSelect.value }, () => {
    reloadGithubTabs();
  });
});

function updateStatus(enabled) {
  status.textContent = enabled
    ? getMessage('translationEnabledStatus')
    : getMessage('translationDisabledStatus');
}

initialize();

// 開いている全ウィンドウのGitHubタブをリロードして設定変更を反映する。
// tab.urlはホスト権限のあるタブ（content_scriptsのmatches由来）でのみ参照できるため、
// GitHub以外のタブはurlがundefinedになりフィルタで自然に除外される
function reloadGithubTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && tab.url.startsWith('https://github.com/')) {
        chrome.tabs.reload(tab.id);
      }
    }
  });
}
