// インストール時にON/OFF設定のデフォルト値（enabled: true）を一度だけ設定する
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled'], (items) => {
    if (items.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
    }
  });
});
