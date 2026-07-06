async function loadDictInfo() {
  const url = chrome.runtime.getURL('dictionaries/ja.json');
  const res = await fetch(url);
  const data = await res.json();
  const tbody = document.getElementById('dict-info');
  const tr = document.createElement('tr');
  const count = Object.keys(data.translations || {}).length;
  const tdName = document.createElement('td');
  tdName.textContent = data.name;
  const tdCount = document.createElement('td');
  tdCount.textContent = `${count} 件`;
  tr.append(tdName, tdCount);
  tbody.appendChild(tr);
}

function showVersion() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `バージョン: ${manifest.version}`;
}

loadDictInfo();
showVersion();
