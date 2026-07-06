// 辞書ファイルは画面ごとの区切りが分かるよう "//" 行コメント付き(JSONC風)で
// 管理しているため、標準のJSON.parseに渡す前にコメント行を取り除く。
function stripJsonComments(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

// 同梱している辞書の一覧。新しい言語辞書(dictionaries/xx.json)を追加したら
// popup.jsのAVAILABLE_LANGUAGESとあわせてここにも追記する。
const AVAILABLE_LANGUAGES = [{ code: 'ja', name: '日本語' }];

async function loadDictInfo() {
  const tbody = document.getElementById('dict-info');
  for (const { code } of AVAILABLE_LANGUAGES) {
    const url = chrome.runtime.getURL(`dictionaries/${code}.json`);
    const res = await fetch(url);
    const text = await res.text();
    const data = JSON.parse(stripJsonComments(text));
    const tr = document.createElement('tr');
    const count = Object.keys(data.translations || {}).length;
    const tdName = document.createElement('td');
    tdName.textContent = data.name;
    const tdCount = document.createElement('td');
    tdCount.textContent = `${count} 件`;
    tr.append(tdName, tdCount);
    tbody.appendChild(tr);
  }
}

function showVersion() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `バージョン: ${manifest.version}`;
}

loadDictInfo();
showVersion();
