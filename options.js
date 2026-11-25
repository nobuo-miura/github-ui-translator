const {
  MAX_ISSUE_ENTRIES,
  buildIssueUrl,
  getDefaultLanguage,
  getMessage,
  loadBundledDictionary,
  loadLanguages,
  clearUserDictionary,
  loadUserDictionary,
  localizeDocument,
  mergeDictionaries,
  normalizeTranslation,
  saveUserEntries,
  stripJsonComments,
  updateUserEntry,
  userDictKeyPrefix,
  validateNoCycle,
  validateTranslation
} = globalThis.GitHubUITranslator;

async function loadDictInfo(languages) {
  const tbody = document.getElementById('dict-info');
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

// ==== ユーザー辞書の編集 ====
//
// 同梱辞書のキーごとに1行を表示し、その場で訳を上書き・「英語のまま表示」・リセットできる。
// 2,000件超の入力欄を一度に描画すると重いため、一致した行のうち先頭MAX_ROWS件だけを描画する
const MAX_ROWS = 200;
const EXPORT_FORMAT = 'github-ui-translator-user-dictionary';

const languageSelect = document.getElementById('ud-language');
const searchInput = document.getElementById('ud-search');
const editedOnlyCheckbox = document.getElementById('ud-edited-only');
const rowsBody = document.getElementById('ud-rows');
const moreNote = document.getElementById('ud-more');
const statusText = document.getElementById('ud-status');
const selectAllCheckbox = document.getElementById('ud-select-all');
const suggestSelectedButton = document.getElementById('ud-suggest-selected');

const state = {
  languages: [],
  language: null,
  bundled: Object.create(null),
  entries: {},
  // まとめて改善を提案するために選んだ原文
  selected: new Set(),
  // 言語の辞書を読み込み中か。読み込み中は表を空にし、編集を受け付けない
  loading: false,
  // 保存済みだが、訳文が循環するためページで無視される項目（mergeDictionariesのrejected）
  rejected: new Set()
};

// state.entriesを変えたら呼ぶ。循環で無視される項目を求め直し、増減した行の表示を更新する
function refreshRejected() {
  const previous = state.rejected;
  state.rejected = new Set(mergeDictionaries(state.bundled, state.entries).rejected);
  const changed = new Set([...previous, ...state.rejected].filter((source) => previous.has(source) !== state.rejected.has(source)));
  if (changed.size === 0) return;
  for (const tr of rowsBody.rows) if (changed.has(tr.dataset.source)) updateRow(tr);
}

// 言語を切り替えるたびに増やす。読み込み完了時に値が変わっていれば、
// その間に別の言語が選ばれたので結果を捨てる（遅れて完了した古い言語で表を上書きしない）
let loadSeq = 0;

// 保存は項目ごとなので別の項目どうしは上書きし合わないが、同じ項目を続けて編集した
// ときに保存の完了順が入れ替わらないよう、このページの保存はキューで1つずつ実行する
let saveQueue = Promise.resolve();
// 保存できていない入力がある間は、検索や言語の切り替えで行が見えていなくても、
// 古い保存済みの訳で提案・出力しない。
// キー -> { language, source, error, errorCell, input, keep }。入力した文字（input）と「英語のまま」（keep）は
// DOMとは別に持ち、検索や絞り込みで行を作り直しても復元する（renderRowを参照）。
// errorCellは、その入力を表示している行のエラー欄（行を作り直すと差し替える）
const unsavedEdits = new Map();
// このページが最後に保存した（または保存中の）値。キー -> JSON文字列（削除はnull）。
// storage.onChangedで届いた変更が自分の保存の通知かどうかを見分けるのに使う
const ownWrites = new Map();
// エラーのある（保存できていない）入力がeditsにあれば、理由をステータスに出してtrueを返す。
// 行が見えていないときはエラーの種類だけでは場所が分からないので、項目（と言語）を示す
function reportUnsavedError(edits) {
  const edit = edits.find((candidate) => candidate?.error);
  if (!edit) return false;
  if (edit.errorCell.isConnected) {
    setStatus(getMessage(edit.error));
  } else {
    const languageName = state.languages.find(({ code }) => code === edit.language)?.name ?? edit.language;
    const label = edit.language === state.language ? edit.source : `${languageName}: ${edit.source}`;
    setStatus(getMessage('unsavedEditHidden', label));
  }
  return true;
}

function enqueueSave(task) {
  const run = saveQueue.then(task);
  saveQueue = run.catch(() => {});
  return run;
}

function setStatus(text) {
  statusText.textContent = text;
}

function isEdited(source) {
  return source in state.entries;
}

function matches(source, query) {
  if (!query) return true;
  const entry = state.entries[source];
  return [source, state.bundled[source], entry?.t ?? '']
    .some((text) => String(text).toLowerCase().includes(query));
}

function updateSuggestSelectedButton() {
  for (const source of state.selected) {
    if (!isEdited(source)) state.selected.delete(source);
  }
  suggestSelectedButton.textContent = getMessage('suggestSelectedButton', String(state.selected.size));
  suggestSelectedButton.disabled = state.selected.size === 0;
}

// 表示中の言語が読み込み済みで、languageのままか
function isShowing(language) {
  return !state.loading && state.language === language;
}

// 編集を保存する。保存した結果をこの表に反映してよい（表示中の言語のまま）ときにtrueを返す
function applyEdit(source, value, errorCell) {
  // 編集した時点の言語と同梱の訳で検証・保存する。キューの順番を待つ間に言語が
  // 切り替わっても編集は捨てずに保存し、表示の更新だけを現在の言語で判定する
  const language = state.language;
  const { bundled } = state;
  const result = updateUserEntry({}, source, bundled[source], value);
  // ほかの自分の訳と循環して（A -> B -> A）反映されない訳は保存しない。ここでの判定は
  // 入力してすぐエラーを見せるためのもので、保存の直前にキューの中でもう一度確かめる
  const error = result.error || validateNoCycle(state.bundled, state.entries, source, result.entries[source]);
  const key = `${userDictKeyPrefix(language)}${source}`;
  const row = errorCell.closest('tr');
  const edit = {
    language,
    source,
    error,
    errorCell,
    input: row?.querySelector('input.translation')?.value ?? '',
    keep: row?.querySelector('input.keep')?.checked ?? false
  };
  unsavedEdits.set(key, edit);
  if (error) {
    errorCell.textContent = getMessage(error);
    return Promise.resolve(false);
  }
  const entry = result.entries[source];
  // エラーを表示して保存しない（この行に入力とエラーを残す）
  const reject = (message) => {
    edit.error = message;
    // 保存を待つ間に行が作り直されていても、今表示している行に出す
    if (isShowing(language) && unsavedEdits.get(key) === edit) {
      edit.errorCell.textContent = getMessage(message);
      setStatus('');
    }
    return false;
  };
  return enqueueSave(async () => {
    // 編集した項目だけを保存する。GitHubのタブ（Alt+クリック）やほかのオプションページで
    // 同時に保存された別の項目は消えない。失敗したら（容量超過など）入力を残してエラーを表示する
    try {
      // 先に保存した訳（このページで保存待ちだったもの、ほかの場所で保存されたもの）を
      // 含めた最新の辞書で、循環しないかを確かめ直す。キューに入る前の判定は、先の保存が
      // まだ終わっていない古い辞書で行われているため
      const cycle = validateNoCycle(bundled, await loadUserDictionary(language), source, entry);
      if (cycle) return reject(cycle);
      ownWrites.set(key, JSON.stringify(entry ?? null));
      await saveUserEntries(language, { [source]: entry });
    } catch (e) {
      console.error('[GitHub UI Translator] 訳を保存できませんでした', e);
      return reject('userDictSaveError');
    }
    const isLatest = unsavedEdits.get(key) === edit;
    if (isLatest) unsavedEdits.delete(key);
    if (!isShowing(language)) return false;
    if (isLatest) edit.errorCell.textContent = '';
    state.entries = { ...state.entries };
    if (entry === undefined) delete state.entries[source];
    else state.entries[source] = entry;
    refreshRejected();
    if (isLatest) {
      setStatus(getMessage('savedStatus'));
      // 保存を待つ間に行が作り直されていたら、今表示している行も更新する
      const current = edit.errorCell.closest('tr');
      if (current?.isConnected) updateRow(current);
    }
    return isLatest;
  });
}

function issueEntry(source) {
  const entry = state.entries[source];
  return { source, current: state.bundled[source], suggested: entry.t === null ? null : entry.t };
}

function openIssue(sources) {
  const language = state.language;
  const seq = loadSeq;
  // 入力欄のchangeで始まった保存の後に、確定した訳から提案内容を作る。
  return enqueueSave(() => {
    if (seq !== loadSeq || !isShowing(language)) return;
    if (reportUnsavedError(sources.map((source) => unsavedEdits.get(`${userDictKeyPrefix(language)}${source}`)))) return;
    const edited = sources.filter(isEdited);
    if (edited.length === 0) return;
    const version = chrome.runtime.getManifest().version;
    const url = buildIssueUrl(language, edited.map(issueEntry), version);
    if (!url) {
      setStatus(edited.length > MAX_ISSUE_ENTRIES
        ? getMessage('issueTooManyError', String(MAX_ISSUE_ENTRIES))
        : getMessage('issueTooLongError'));
      return;
    }
    // 保存待ちでユーザー操作の有効期間が切れても開ける拡張APIを使う（追加権限は不要）。
    return chrome.tabs.create({ url });
  });
}

// 行の要素とイベントを作る。編集状態に応じた表示はupdateRowで設定する
function renderRow(source) {
  const tr = document.createElement('tr');
  tr.dataset.source = source;

  const selectCell = document.createElement('td');
  const selectCheckbox = document.createElement('input');
  selectCheckbox.type = 'checkbox';
  selectCheckbox.className = 'select';
  selectCheckbox.setAttribute('aria-label', getMessage('selectRowLabel', source));
  selectCheckbox.addEventListener('change', () => {
    if (selectCheckbox.checked) state.selected.add(source);
    else state.selected.delete(source);
    updateSuggestSelectedButton();
  });
  selectCell.appendChild(selectCheckbox);

  const sourceCell = document.createElement('td');
  sourceCell.className = 'source';
  sourceCell.textContent = source;

  const bundledCell = document.createElement('td');
  bundledCell.className = 'bundled';
  const bundledText = document.createElement('span');
  bundledText.textContent = state.bundled[source];
  // 編集したあとに同梱の訳が変わった（提案が採用された等）ことを知らせる
  const note = document.createElement('div');
  note.className = 'note';
  note.textContent = getMessage('bundledChangedNote');
  bundledCell.append(bundledText, note);

  const translationCell = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'translation';
  input.placeholder = state.bundled[source];
  input.setAttribute('aria-label', getMessage('yourTranslationColumn'));
  const errorCell = document.createElement('div');
  errorCell.className = 'error';
  errorCell.setAttribute('role', 'alert');
  translationCell.append(input, errorCell);

  const keepCell = document.createElement('td');
  const keepCheckbox = document.createElement('input');
  keepCheckbox.type = 'checkbox';
  keepCheckbox.className = 'keep';
  keepCheckbox.setAttribute('aria-label', getMessage('keepEnglishLabel'));
  keepCell.appendChild(keepCheckbox);

  const actionsCell = document.createElement('td');
  const actions = document.createElement('div');
  actions.className = 'row-actions';
  const suggestButton = document.createElement('button');
  suggestButton.type = 'button';
  suggestButton.className = 'suggest';
  suggestButton.textContent = getMessage('suggestButton');
  suggestButton.addEventListener('click', () => openIssue([source]));
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'reset';
  resetButton.textContent = getMessage('resetButton');
  resetButton.addEventListener('click', async () => {
    if (await applyEdit(source, undefined, errorCell)) updateRow(tr);
  });
  actions.append(suggestButton, resetButton);
  actionsCell.appendChild(actions);

  // 空欄にすると上書きを削除し、同梱の訳に戻す
  input.addEventListener('change', async () => {
    const value = normalizeTranslation(input.value);
    if (await applyEdit(source, value ? value : undefined, errorCell)) updateRow(tr);
  });
  keepCheckbox.addEventListener('change', async () => {
    const value = keepCheckbox.checked ? null : normalizeTranslation(input.value) || undefined;
    if (await applyEdit(source, value, errorCell)) updateRow(tr);
  });

  // 保存していない入力（保存の失敗・不正な訳・保存待ち）があれば、作り直したこの行に戻す。
  // 先にエラー欄を差し替えておくと、updateRowはその入力とエラーを書き換えない
  const unsaved = unsavedEdits.get(`${userDictKeyPrefix(state.language)}${source}`);
  if (unsaved) unsaved.errorCell = errorCell;

  tr.append(selectCell, sourceCell, bundledCell, translationCell, keepCell, actionsCell);
  updateRow(tr);
  if (unsaved) {
    input.value = unsaved.input;
    keepCheckbox.checked = unsaved.keep;
    input.disabled = unsaved.keep;
    if (unsaved.error) errorCell.textContent = getMessage(unsaved.error);
  }
  return tr;
}

// 行の編集状態（背景色・入力欄・チェックボックス・ボタンの有効化）を表示に反映する。
// 行の要素は作り直さない。作り直すと、入力欄のchangeで保存が始まってからマウスを離すまでの
// 間に、押下中のチェックボックスやボタンがDOMから外れてクリックが成立しなかったり、
// Tabで移ったフォーカスが失われたりするため。
// 「編集済みのみ」の表示中にリセットしても、行はその場に残して見失わないようにする
function updateRow(tr) {
  const { source } = tr.dataset;
  const entry = state.entries[source];
  const select = tr.querySelector('input.select');
  const input = tr.querySelector('input.translation');
  const keep = tr.querySelector('input.keep');
  const active = document.activeElement;
  const errorCell = tr.querySelector('.error');
  // この行にまだ保存していない入力（保存待ち・不正な訳）があれば、入力とそのエラーは残す
  const unsaved = unsavedEdits.get(`${userDictKeyPrefix(state.language)}${source}`)?.errorCell === errorCell;

  tr.className = entry ? 'edited' : '';
  select.disabled = !entry;
  select.checked = state.selected.has(source);
  tr.querySelector('.note').hidden = !(entry && entry.base !== undefined && entry.base !== state.bundled[source]);
  // 入力中の文字は上書きしない
  if (input !== active && !unsaved) input.value = entry && entry.t !== null ? entry.t : '';
  input.disabled = entry?.t === null;
  keep.checked = entry?.t === null;
  tr.querySelector('button.suggest').disabled = !entry;
  tr.querySelector('button.reset').disabled = !entry;
  // 保存済みの訳がページに反映できない形（<code>の中を変えた等）なら、理由を表示する。
  // ページでは使われず、同梱の訳が表示される（mergeDictionariesを参照）
  // 循環して無視される訳（別の場所で保存された等）も理由を表示する
  const storedError = typeof entry?.t === 'string'
    ? validateTranslation(source, normalizeTranslation(entry.t)) || (state.rejected.has(source) ? 'userDictErrorCycle' : null)
    : null;
  // 保存していない入力があるときは、そのエラー表示を優先する
  if (!unsaved && storedError) {
    errorCell.textContent = getMessage(storedError);
    errorCell.dataset.stored = '';
  } else if (!unsaved && 'stored' in errorCell.dataset) {
    errorCell.textContent = '';
    delete errorCell.dataset.stored;
  }

  // フォーカスしていた要素が無効になった（リセット後のリセットボタン等）ときは、行の最初の有効な要素へ
  if (tr.contains(active) && active.disabled) {
    [...tr.querySelectorAll('input, button')].find((el) => !el.disabled)?.focus();
  }
  updateSuggestSelectedButton();
  return tr;
}

// 検索語と「編集済みのみ」の絞り込みに一致するか
function isListed(source) {
  const query = searchInput.value.trim().toLowerCase();
  return (!editedOnlyCheckbox.checked || isEdited(source)) && matches(source, query);
}

function listedSources() {
  return Object.keys(state.bundled).filter(isListed);
}

function updateMoreNote(total) {
  if (total === 0 && rowsBody.rows.length === 0) moreNote.textContent = getMessage('noMatchingRows');
  else if (total > MAX_ROWS) moreNote.textContent = getMessage('showingFirstRows', [String(MAX_ROWS), String(total)]);
  else moreNote.textContent = '';
}

function render() {
  const sources = listedSources();
  rowsBody.replaceChildren(...sources.slice(0, MAX_ROWS).map(renderRow));
  updateMoreNote(sources.length);
  selectAllCheckbox.checked = false;
  updateSuggestSelectedButton();
}

// 表にまだない行を、同梱辞書の並び順の位置に追加する。表が上限まで埋まっていて、
// 追加する位置が末尾より後ろになる場合は追加しない
function insertRow(source, rowsBySource) {
  const order = Object.keys(state.bundled);
  const after = order.slice(order.indexOf(source) + 1).find((other) => rowsBySource.has(other));
  if (!after && rowsBySource.size >= MAX_ROWS) return;
  const tr = renderRow(source);
  rowsBody.insertBefore(tr, after ? rowsBySource.get(after) : null);
  rowsBySource.set(source, tr);
}

async function selectLanguage(language) {
  const seq = ++loadSeq;
  state.language = language;
  state.loading = true;
  state.bundled = Object.create(null);
  state.entries = {};
  state.selected.clear();
  // 前の言語の行を残すと、読み込み中に編集されて別の言語へ保存されうるため空にする
  rowsBody.replaceChildren();
  moreNote.textContent = '';
  updateSuggestSelectedButton();
  setStatus('');
  let bundled;
  let loadError = false;
  try {
    bundled = await loadBundledDictionary(language);
  } catch (e) {
    console.error(`[GitHub UI Translator] 辞書(${language})の読み込みに失敗しました`, e);
    bundled = Object.create(null);
    loadError = true;
  }
  const entries = { ...(await loadUserDictionary(language)) };
  if (seq !== loadSeq) return;
  // 同梱辞書の更新で削除されたキーの訳は使われないので、ついでに取り除く（失敗しても表示は続ける）
  const stale = loadError ? [] : Object.keys(entries).filter((source) => !(source in bundled));
  stale.forEach((source) => delete entries[source]);
  if (stale.length > 0) {
    saveUserEntries(language, Object.fromEntries(stale.map((source) => [source, undefined]))).catch((e) => {
      console.error('[GitHub UI Translator] 使われない訳を削除できませんでした', e);
    });
  }
  state.bundled = bundled;
  state.entries = entries;
  state.rejected = new Set(mergeDictionaries(bundled, entries).rejected);
  state.loading = false;
  if (loadError) setStatus(getMessage('dictionaryLoadError'));
  render();
}

// 表示中の行のうち、編集済みのものをすべて選ぶ
selectAllCheckbox.addEventListener('change', () => {
  rowsBody.querySelectorAll('tr').forEach((tr) => {
    const { source } = tr.dataset;
    if (!isEdited(source)) return;
    if (selectAllCheckbox.checked) state.selected.add(source);
    else state.selected.delete(source);
    tr.querySelector('input.select').checked = selectAllCheckbox.checked;
  });
  updateSuggestSelectedButton();
});

suggestSelectedButton.addEventListener('click', () => {
  // 表の並び（同梱辞書の順）にそろえて送る
  const sources = Object.keys(state.bundled).filter((source) => state.selected.has(source));
  openIssue(sources);
});

// ほかの場所（GitHubのタブでのAlt+クリック、別のオプションページ）でユーザー辞書が
// 変わったら、表示中の言語のものだけ読み直し、内容が変わった行だけを描き直す。
// 表全体を描き直すと、別の行で入力中の文字やフォーカスが失われるため
async function syncFromStorage() {
  const language = state.language;
  // 読み込み中なら、読み込みの完了時に最新の内容で描かれる
  if (!isShowing(language)) return;
  const latest = { ...(await loadUserDictionary(language)) };
  if (!isShowing(language)) return;
  const previous = state.entries;
  state.entries = latest;
  const changed = new Set(
    [...Object.keys(previous), ...Object.keys(latest)]
      .filter((source) => JSON.stringify(previous[source]) !== JSON.stringify(latest[source]))
  );
  if (changed.size === 0) return;
  const rowsBySource = new Map([...rowsBody.rows].map((tr) => [tr.dataset.source, tr]));
  for (const source of changed) {
    const tr = rowsBySource.get(source);
    const key = `${userDictKeyPrefix(state.language)}${source}`;
    const unsaved = unsavedEdits.get(key);
    const ownEcho = ownWrites.get(key) === JSON.stringify(latest[source] ?? null);
    // 表にある行は表示だけ更新する（絞り込みに合わなくなっても、見失わないようその場に残す）。
    // 表にない行は、絞り込みに合うようになったものだけ追加する（「編集済みのみ」の表示中に
    // 別のタブで編集された項目など）。どちらもほかの行の入力中の文字には触れない
    if (tr) {
      // 入力欄はupdateRowで別の場所の保存結果に書き換わる（フォーカスがある入力中の欄は除く）。
      // 画面から消える未保存の入力の記録とエラー表示も消し、提案・エクスポートを止めたままにしない
      // ただし、このページ自身の保存の通知で、その後に入力したまだ保存していない内容
      // （保存待ち・不正な訳）が画面にあるときは、その入力とエラーを残す（行も書き換えない）
      if (ownEcho && unsaved) continue;
      if (tr.querySelector('input.translation') !== document.activeElement) {
        if (unsaved) tr.querySelector('.error').textContent = '';
        unsavedEdits.delete(key);
      }
      updateRow(tr);
    } else {
      // 見えていない行の保存していない入力も、別の場所の保存で置き換わったものとして捨てる
      // （見えている行で入力欄が書き換わるときと同じ扱い）。自分の保存の通知なら残す
      if (!ownEcho) unsavedEdits.delete(key);
      if (source in state.bundled && isListed(source)) insertRow(source, rowsBySource);
    }
  }
  refreshRejected();
  updateMoreNote(listedSources().length);
  updateSuggestSelectedButton();
}

chrome.storage.onChanged?.addListener((changes, area) => {
  if (area !== 'local' || !state.language) return;
  const prefix = userDictKeyPrefix(state.language);
  if (!Object.keys(changes).some((key) => key.startsWith(prefix))) return;
  syncFromStorage().catch((e) => {
    console.error('[GitHub UI Translator] ユーザー辞書の読み直しに失敗しました', e);
  });
});

searchInput.addEventListener('input', render);
editedOnlyCheckbox.addEventListener('change', render);
languageSelect.addEventListener('change', () => selectLanguage(languageSelect.value));

// ==== エクスポート・インポート ====

function exportUserDictionaries() {
  return enqueueSave(() => {
    // バックアップに古い訳を出さないよう、どの言語の行でも保存できていない入力があれば止める
    if (reportUnsavedError([...unsavedEdits.values()])) return;
    return exportUserDictionariesNow();
  });
}

async function exportUserDictionariesNow() {
  const dictionaries = {};
  for (const { code } of state.languages) {
    const entries = await loadUserDictionary(code);
    if (Object.keys(entries).length > 0) dictionaries[code] = { ...entries };
  }
  const data = {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    dictionaries
  };
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `github-ui-translator-user-dictionary-${data.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * エクスポートしたJSONを取り込み、現在のユーザー辞書に上書きでマージする。
 * 対応していない言語、同梱辞書にないキー、検証に通らない訳文、ほかの訳と循環する訳文は取り込まない
 * @returns {Promise<{ imported: number, skipped: number }>}
 */
function importUserDictionaries(text) {
  // ユーザー辞書の保存なので、ほかの編集と重ならないようキューで実行する
  return enqueueSave(() => importUserDictionariesNow(text));
}

async function importUserDictionariesNow(text) {
  const data = JSON.parse(text);
  if (!data || data.format !== EXPORT_FORMAT || typeof data.dictionaries !== 'object' || data.dictionaries === null) {
    throw new Error('Unsupported file format');
  }
  const codes = new Set(state.languages.map(({ code }) => code));
  let imported = 0;
  let skipped = 0;
  for (const [code, entries] of Object.entries(data.dictionaries)) {
    const list = entries && typeof entries === 'object' ? Object.entries(entries) : [];
    if (!codes.has(code)) {
      skipped += list.length;
      continue;
    }
    const bundled = await loadBundledDictionary(code);
    // 取り込んだあとの辞書。既存の自分の訳に、ファイルの項目を順に重ねていき、
    // ほかの訳と循環する（A -> B -> A）項目は取り込まない（循環するとページでは既存の訳まで無視される）
    const merged = { ...(await loadUserDictionary(code)) };
    // ファイルにある項目だけを保存する（ファイルにない自分の訳はそのまま残す）
    const changes = {};
    for (const [source, entry] of list) {
      const value = entry?.t === null ? null : typeof entry?.t === 'string' ? entry.t : undefined;
      if (!(source in bundled) || value === undefined) {
        skipped++;
        continue;
      }
      const result = updateUserEntry({}, source, bundled[source], value);
      if (result.error) {
        skipped++;
        continue;
      }
      const saved = result.entries[source];
      if (validateNoCycle(bundled, merged, source, saved)) {
        skipped++;
        continue;
      }
      // 編集した時点の同梱訳（base）と日時はファイルの値を引き継ぐ
      if (saved) {
        if (typeof entry.base === 'string') saved.base = entry.base;
        if (typeof entry.at === 'string') saved.at = entry.at;
      }
      // 同梱の訳と同じ訳はundefined（上書きを削除）になる
      changes[source] = saved;
      if (saved === undefined) delete merged[source];
      else merged[source] = saved;
      imported++;
    }
    if (Object.keys(changes).length > 0) {
      await saveUserEntries(code, changes);
      // 取り込んだ項目は、画面に残っている保存していない入力よりファイルの訳を優先する
      for (const source of Object.keys(changes)) unsavedEdits.delete(`${userDictKeyPrefix(code)}${source}`);
    }
  }
  return { imported, skipped };
}

document.getElementById('ud-export').addEventListener('click', () => {
  exportUserDictionaries().catch((e) => {
    console.error('[GitHub UI Translator] エクスポートに失敗しました', e);
  });
});

const importFile = document.getElementById('ud-import-file');
document.getElementById('ud-import').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const [file] = importFile.files;
  importFile.value = '';
  if (!file) return;
  try {
    const { imported, skipped } = await importUserDictionaries(await file.text());
    await selectLanguage(state.language);
    setStatus(getMessage('importResult', [String(imported), String(skipped)]));
  } catch (e) {
    console.error('[GitHub UI Translator] インポートに失敗しました', e);
    setStatus(getMessage('importError'));
  }
});

document.getElementById('ud-reset-all').addEventListener('click', async () => {
  const name = state.languages.find(({ code }) => code === state.language)?.name ?? state.language;
  if (!window.confirm(getMessage('resetAllConfirm', name))) return;
  const language = state.language;
  await enqueueSave(async () => {
    if (!isShowing(language)) return;
    try {
      await clearUserDictionary(language);
    } catch (e) {
      console.error('[GitHub UI Translator] 自分の訳を削除できませんでした', e);
      setStatus(getMessage('userDictSaveError'));
      return;
    }
    if (!isShowing(language)) return;
    // すべてリセットしたので、この言語の保存していない入力も捨てる（再描画で復元しない）
    const prefix = userDictKeyPrefix(language);
    for (const key of [...unsavedEdits.keys()]) if (key.startsWith(prefix)) unsavedEdits.delete(key);
    state.entries = {};
    state.rejected = new Set();
    setStatus(getMessage('savedStatus'));
    render();
  });
});

async function initUserDictionary(languages) {
  state.languages = languages;
  languages.forEach(({ code, name }) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    languageSelect.appendChild(option);
  });
  // 最初は、ポップアップで選んだ言語（未設定ならブラウザーの表示言語から判定した言語）を開く
  const { language } = await new Promise((resolve) => chrome.storage.local.get({ language: null }, resolve));
  const initial = [language, await getDefaultLanguage(), languages[0]?.code]
    .find((code) => code && languages.some((lang) => lang.code === code));
  languageSelect.value = initial;
  await selectLanguage(initial);
}

async function initialize() {
  localizeDocument();
  showVersion();
  let languages;
  try {
    languages = await loadLanguages();
  } catch (e) {
    console.error('[GitHub UI Translator] Failed to load languages', e);
    const tbody = document.getElementById('dict-info');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = getMessage('languageListLoadError');
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  await initUserDictionary(languages);
  await loadDictInfo(languages);
}

// 拡張機能の外（テスト）から呼べるようにする
globalThis.GitHubUITranslatorOptions = { importUserDictionaries, exportUserDictionaries };

initialize();
