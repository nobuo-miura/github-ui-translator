const {
  getMessage,
  loadLanguages,
  localizeDocument,
  stripJsonComments
} = globalThis.GitHubUITranslator;

async function loadDictInfo() {
  const tbody = document.getElementById('dict-info');
  const languages = await loadLanguages();
  for (const { code, name } of languages) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    const tdCount = document.createElement('td');
    try {
      const url = chrome.runtime.getURL(`dictionaries/${code}.json`);
      const res = await fetch(url);
      const text = await res.text();
      const data = JSON.parse(stripJsonComments(text));
      const count = Object.keys(data.translations || {}).length;
      tdName.textContent = data.name;
      tdCount.textContent = getMessage('dictionaryCount', String(count));
    } catch (e) {
      // 辞書が壊れていても他の言語の表示は続行し、エラー行として見えるようにする
      console.error(`[GitHub UI Translator] 辞書(${code})の読み込みに失敗しました`, e);
      tdName.textContent = name;
      tdCount.textContent = getMessage('dictionaryLoadError');
    }
    tr.append(tdName, tdCount);
    tbody.appendChild(tr);
  }
}

function showVersion() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = getMessage('versionLabel', manifest.version);
}

async function initialize() {
  localizeDocument();
  showVersion();
  try {
    await loadDictInfo();
  } catch (e) {
    console.error('[GitHub UI Translator] Failed to load languages', e);
    const tbody = document.getElementById('dict-info');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = getMessage('languageListLoadError');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

initialize();
