const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

chrome.storage.local.get({ enabled: true }, (items) => {
  toggle.checked = items.enabled;
  updateStatus(items.enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled }, () => {
    updateStatus(enabled);
    reloadActiveGithubTab();
  });
});

function updateStatus(enabled) {
  status.textContent = enabled
    ? 'ON: GitHubのUIを翻訳します'
    : 'OFF: 原文（英語）を表示します';
}

function reloadActiveGithubTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.startsWith('https://github.com/')) {
      chrome.tabs.reload(tab.id);
    }
  });
}
