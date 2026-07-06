// 同梱している辞書の一覧。新しい言語辞書(dictionaries/xx.json)を追加したら
// ここにも追記する（拡張機能はディレクトリ一覧を動的に取得できないため）。
const AVAILABLE_LANGUAGES = [{ code: 'ja', name: '日本語' }];

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const languageSelect = document.getElementById('language');

AVAILABLE_LANGUAGES.forEach(({ code, name }) => {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  languageSelect.appendChild(option);
});

chrome.storage.local.get({ enabled: true, language: 'ja' }, (items) => {
  toggle.checked = items.enabled;
  updateStatus(items.enabled);
  languageSelect.value = items.language;
});

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
    ? 'ON: GitHubのUIを翻訳します'
    : 'OFF: 原文（英語）を表示します';
}

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
