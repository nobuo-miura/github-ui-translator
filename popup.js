const { getMessage, loadLanguages, localizeDocument } = globalThis.GitHubUITranslator;

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const languageSelect = document.getElementById('language');
const globalHeaderToggle = document.getElementById('global-header-toggle');

// ポップアップを開いた直後（＝ポップアップが生きていることが保証されている間）に
// GitHubタブのIDを確定させておく。変更イベントの発生時にchrome.tabs.query()の
// 完了を待つ設計だと、<select>操作等でポップアップが途中で閉じた場合にその
// コールバック自体が実行されずリロードされないことがある。IDさえ先に分かって
// いれば、変更時はchrome.tabs.reload()を直接（別の非同期コールバックを挟まずに）
// 呼ぶだけで済むため、この経路には非同期の待ち合わせが残らない
let githubTabIds = [];
chrome.tabs.query({}, (tabs) => {
  githubTabIds = tabs
    .filter((tab) => tab.url && tab.url.startsWith('https://github.com/'))
    .map((tab) => tab.id);
});

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

  chrome.storage.local.get(
    { enabled: true, language: 'ja', translateGlobalHeader: true },
    (items) => {
      toggle.checked = items.enabled;
      updateStatus(items.enabled);
      languageSelect.value = items.language;
      globalHeaderToggle.checked = items.translateGlobalHeader;
    }
  );
}

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  updateStatus(enabled);
  chrome.storage.local.set({ enabled });
  reloadGithubTabs();
});

languageSelect.addEventListener('change', () => {
  chrome.storage.local.set({ language: languageSelect.value });
  reloadGithubTabs();
});

globalHeaderToggle.addEventListener('change', () => {
  chrome.storage.local.set({ translateGlobalHeader: globalHeaderToggle.checked });
  reloadGithubTabs();
});

function updateStatus(enabled) {
  status.textContent = enabled
    ? getMessage('translationEnabledStatus')
    : getMessage('translationDisabledStatus');
}

initialize();

// 各GitHubタブのcontent.js側もchrome.storage.onChangedを検知して自分自身を
// リロードするが、それは「更新後に読み込まれた新しいcontent.js」にしか効かない。
// 拡張機能の更新直後など、旧content.jsが動いたままのタブを救うにはこちらの
// 明示的なリロードが必要なため、両方を残す。
// 冒頭で確定させたgithubTabIdsをそのまま使い、ここでは新たな非同期コールバックを
// 挟まない（chrome.tabs.reload()自体はコールバックを待たなくても呼び出した時点で
// ブラウザ側に反映される）
function reloadGithubTabs() {
  for (const tabId of githubTabIds) {
    chrome.tabs.reload(tabId);
  }
}
