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
  for (const { code, name } of AVAILABLE_LANGUAGES) {
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
      tdCount.textContent = `${count} 件`;
    } catch (e) {
      // 辞書が壊れていても他の言語の表示は続行し、エラー行として見えるようにする
      console.error(`[GitHub UI Translator] 辞書(${code})の読み込みに失敗しました`, e);
      tdName.textContent = name;
      tdCount.textContent = '読み込みエラー';
    }
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
