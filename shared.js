// 拡張機能内で共有する辞書・言語・UIローカライズ処理
(() => {
  function stripJsonComments(text) {
    return text
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
  }

  async function loadLanguages() {
    const url = chrome.runtime.getURL('languages.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load languages: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.languages)) throw new Error('Invalid languages.json');
    return data.languages;
  }

  // ブラウザーの表示言語（"de"、"pt-BR"、"zh_CN"等）から、同梱辞書の言語コードを選ぶ。
  // 完全一致を優先し、中国語は文字体系・地域、それ以外は言語部分（"pt-PT" → "pt-BR"等）で選ぶ。
  // どれにも当てはまらなければnullを返し、翻訳しない（未対応の言語で別の言語に変わるのを防ぐ）
  function resolveDefaultLanguage(uiLanguage, codes) {
    const normalized = String(uiLanguage || '').replace(/_/g, '-').toLowerCase();
    if (!normalized) return null;

    const exact = codes.find((code) => code.toLowerCase() === normalized);
    if (exact) return exact;

    const base = normalized.split('-')[0];
    // 中国語は文字体系を優先する。明示されたHans/Hantがなければ地域で選ぶ。
    // 香港・マカオには、同梱する台湾向けの繁体字辞書を使う。
    if (base === 'zh') {
      const parts = normalized.split('-');
      const script = parts.find((part) => part === 'hans' || part === 'hant');
      const traditional = script ? script === 'hant' : parts.some((part) => ['tw', 'hk', 'mo'].includes(part));
      const preferred = codes.find((code) => code.toLowerCase() === (traditional ? 'zh-tw' : 'zh-cn'));
      if (preferred) return preferred;
    }

    const sameBase = codes.find((code) => code.toLowerCase().split('-')[0] === base);
    return sameBase || null;
  }

  // 言語が未設定（インストール直後など）のときの初期言語を返す。
  // 対応する辞書がない場合や、言語一覧を読み込めなかった場合はnullを返す
  async function getDefaultLanguage() {
    try {
      const languages = await loadLanguages();
      return resolveDefaultLanguage(chrome.i18n.getUILanguage(), languages.map(({ code }) => code));
    } catch {
      return null;
    }
  }

  function getMessage(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }

  function localizeDocument() {
    const uiLanguage = chrome.i18n.getUILanguage();
    document.documentElement.lang = uiLanguage ? uiLanguage.split('-')[0] : 'en';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = getMessage(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', getMessage(el.dataset.i18nAriaLabel));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', getMessage(el.dataset.i18nPlaceholder));
    });
  }

  // 同梱辞書（dictionaries/<code>.json）を読み込み、translationsをプロトタイプなし
  // オブジェクトで返す。通常オブジェクトだと画面上のテキストが "toString" や
  // "hasOwnProperty" のときObject.prototypeの継承プロパティが辞書ヒット扱いになるため
  async function loadBundledDictionary(language) {
    const url = chrome.runtime.getURL(`dictionaries/${language}.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const data = JSON.parse(stripJsonComments(text));
    return Object.assign(Object.create(null), data.translations || {});
  }

  // ==== ユーザー辞書 ====
  //
  // 同梱辞書の既存キーの訳だけを、利用者がローカルで上書きできる（新しいキーは追加しない。
  // 許可リスト方式・完全一致の方針を保ち、リポジトリ名などとの偶然一致を増やさないため）。
  // chrome.storage.localに、1項目ごとに別のキー "userDict:<code>:<原文>" で次の形で保存する:
  //   { t: "<訳文>" | null, base: "<編集時点の同梱訳>", at: "<ISO日時>" }
  // t が null の項目は「英語のまま表示する（訳さない）」。
  // base は、あとで同梱辞書の訳が変わった（提案が採用された等）ことに気づくために持つ。
  // 言語ごとに1つのキーへまとめて保存すると、オプションページとGitHubのタブのように
  // 別の画面で同時に別の項目を保存したとき、後の保存が先の編集を上書きする。画面をまたいだ
  // 排他制御はできないため、項目ごとのキーにして、保存は編集した項目だけを書き換える。
  // storage.syncは合計約100KB・1項目8KBの上限があり全件の上書きに足りないため使わない
  const USER_DICT_PREFIX = 'userDict:';
  // content.jsのINLINE_TAGS / INLINE_TAG_PATTERN、scripts/validate.mjsと揃える
  const INLINE_TAG_PATTERN = /<([a-z]+)>([^<]*)<\/\1>/g;
  const MAX_TRANSLATION_LENGTH = 1000;
  // 訳文でも中身を変えられないインラインタグ。content.jsの除外セレクター（EXCLUDE_SELECTOR_BASE）に
  // タグ名で入っているもので、ページ側は中身が原文と同じ場合だけ文全体を訳す（scripts/validate.mjsと揃える）
  const PROTECTED_INLINE_TAGS = new Set(['code']);

  // その言語のユーザー辞書の項目キーに共通する接頭辞（"userDict:ja:"）
  function userDictKeyPrefix(language) {
    return `${USER_DICT_PREFIX}${language}:`;
  }

  function userDictEntryKey(language, source) {
    return `${userDictKeyPrefix(language)}${source}`;
  }

  // chrome.storage.localの呼び出しをPromiseにする。容量超過などで失敗したときは
  // chrome.runtime.lastErrorが設定されるので、rejectして呼び出し元へ伝える
  function storageCall(method, arg) {
    return new Promise((resolve, reject) => {
      chrome.storage.local[method](arg, (result) => {
        const error = chrome.runtime?.lastError;
        if (error) reject(new Error(error.message || String(error)));
        else resolve(result);
      });
    });
  }

  async function loadUserDictionary(language) {
    const prefix = userDictKeyPrefix(language);
    const items = (await storageCall('get', null)) || {};
    const result = Object.create(null);
    for (const [key, entry] of Object.entries(items)) {
      if (key.startsWith(prefix) && isValidEntry(entry)) result[key.slice(prefix.length)] = entry;
    }
    return result;
  }

  /**
   * 指定した項目だけを保存・削除する。ほかの項目には触れない。
   * @param {string} language 言語コード
   * @param {Record<string, object | undefined>} changes 原文 -> 保存する項目（undefinedなら削除）
   * @returns {Promise<void>} 保存に失敗したらreject
   */
  async function saveUserEntries(language, changes) {
    const toSet = {};
    const toRemove = [];
    for (const [source, entry] of Object.entries(changes)) {
      if (entry === undefined) toRemove.push(userDictEntryKey(language, source));
      else toSet[userDictEntryKey(language, source)] = entry;
    }
    if (Object.keys(toSet).length > 0) await storageCall('set', toSet);
    if (toRemove.length > 0) await storageCall('remove', toRemove);
  }

  // その言語のユーザー辞書をすべて削除する
  async function clearUserDictionary(language) {
    const prefix = userDictKeyPrefix(language);
    const items = (await storageCall('get', null)) || {};
    const keys = Object.keys(items).filter((key) => key.startsWith(prefix));
    if (keys.length > 0) await storageCall('remove', keys);
  }

  function isValidEntry(entry) {
    return Boolean(entry) && typeof entry === 'object' &&
      (entry.t === null || typeof entry.t === 'string');
  }

  // 訳文の入力値を、同梱辞書と同じ1行の形に整える（画面上でも改行は空白として表示される）
  function normalizeTranslation(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
  }

  // 訳文として保存できるか検証する。問題がなければnull、あればメッセージキーを返す。
  // タグ付きキー（"… <a>Learn more</a>."）は既存の要素を並べ替えずにテキストだけを
  // 書き換えるため、訳文のタグの種類・順序が原文と一致しないと画面に反映できない
  function validateTranslation(source, translation) {
    if (!translation) return 'userDictErrorEmpty';
    if (translation.length > MAX_TRANSLATION_LENGTH) return 'userDictErrorTooLong';
    const tagsOf = (text) => [...text.matchAll(INLINE_TAG_PATTERN)].map((match) => match[1]).join(',');
    const sourceTags = tagsOf(source);
    if (sourceTags || /<\/?[a-z]+>/.test(translation)) {
      if (tagsOf(translation) !== sourceTags) return 'userDictErrorTags';
      // 対応の取れていないタグ（"<a>…" だけ等）が残っていないか
      if (/<\/?[a-z]+>/.test(translation.replace(INLINE_TAG_PATTERN, ''))) return 'userDictErrorTags';
      // 原文で文字がない位置（文頭・文末・タグとタグの間）に訳文の文字を置いていないか。
      // content.jsは既存のテキストノードに訳文を書き込み、ノードを新しく作らない（GitHubの
      // DOMを変えないため）ので、ページにその位置のノードがないと文全体が英語のままになる
      // <code>などの中身を変えていないか。変えるとページ側で文全体が訳されず英語のままになる
      const protectedTexts = (text) => [...text.matchAll(INLINE_TAG_PATTERN)]
        .filter((match) => PROTECTED_INLINE_TAGS.has(match[1])).map((match) => match[2]);
      if (protectedTexts(translation).join('\u0000') !== protectedTexts(source).join('\u0000')) return 'userDictErrorCodeText';
      const gapsOf = (text) => text.replace(INLINE_TAG_PATTERN, '\u0000').split('\u0000');
      const sourceGaps = gapsOf(source);
      if (gapsOf(translation).some((gap, i) => gap.trim() && !sourceGaps[i].trim())) return 'userDictErrorTagPosition';
    }
    return null;
  }

  // 1件の編集をユーザー辞書（entries）に反映した新しいオブジェクトを返す。
  // value が null なら「英語のまま表示する」、undefined なら上書きを削除する。
  // 訳文が同梱の訳と同じになった場合も、上書きは不要なので削除する
  function updateUserEntry(entries, source, bundledTranslation, value) {
    const next = { ...entries };
    if (value === undefined) {
      delete next[source];
      return { entries: next, error: null };
    }
    if (value === null) {
      next[source] = { t: null, base: bundledTranslation, at: new Date().toISOString() };
      return { entries: next, error: null };
    }
    const translation = normalizeTranslation(value);
    const error = validateTranslation(source, translation);
    if (error) return { entries, error };
    if (translation === bundledTranslation) delete next[source];
    else next[source] = { t: translation, base: bundledTranslation, at: new Date().toISOString() };
    return { entries: next, error: null };
  }

  // 同梱辞書にユーザー辞書を重ねた辞書を返す（同梱辞書は変更しない）。
  // 「英語のまま表示する」項目は辞書から消さず、原文をそのまま訳文にする（自己マッピング）。
  // 同梱辞書の "Wiki": "Wiki" と同じ扱いになり、ページ上でもAlt+クリックで編集し直せる。
  // 同梱辞書にないキー（辞書の更新で削除されたもの）と不正な訳文は無視する。
  // 訳文が別のキーでもあると次の巡回でさらに引かれるため、ユーザーの上書きで
  // 循環（A -> B -> A）ができる場合は、その上書きを捨てて無限ループを防ぐ
  function mergeDictionaries(bundled, userEntries) {
    const merged = Object.assign(Object.create(null), bundled);
    const applied = [];
    for (const [source, entry] of Object.entries(userEntries || {})) {
      if (!(source in bundled) || !isValidEntry(entry)) continue;
      if (entry.t === null) {
        merged[source] = source;
        continue;
      }
      const translation = normalizeTranslation(entry.t);
      if (validateTranslation(source, translation)) continue;
      merged[source] = translation;
      applied.push(source);
    }
    // 同梱辞書には循環がない（scripts/validate.mjsで検証）ため、循環には必ずユーザーの
    // 上書きが含まれる。循環に含まれる上書きを同梱の訳に戻し、循環がなくなるまで繰り返す
    const overridden = new Set(applied);
    const rejected = [];
    let cycle;
    while ((cycle = findCycle(merged, overridden))) {
      for (const source of cycle) {
        if (!overridden.has(source)) continue;
        merged[source] = bundled[source];
        overridden.delete(source);
        rejected.push(source);
      }
    }
    return { dictionary: merged, rejected };
  }

  // sourceの項目をentryで保存する（entryがundefinedなら上書きを削除する）と、訳文が循環して
  // （A -> B -> A）無視される上書きが出る場合にエラーのメッセージキーを返す。循環すると保存しても
  // 反映されないうえ、先に使えていた訳まで同梱の訳に戻るため、保存前に止める。
  // 削除（リセット）でも、戻った同梱の訳がほかの上書きと循環しうるので確かめる
  // （"Wiki" -> "Wikis" を上書きした状態で "Wikis" をリセットすると、同梱の "Wikis" -> "Wiki" と循環する）
  function validateNoCycle(bundled, entries, source, entry) {
    const next = { ...entries };
    if (entry === undefined) delete next[source];
    else next[source] = entry;
    const before = new Set(mergeDictionaries(bundled, entries).rejected);
    const after = mergeDictionaries(bundled, next).rejected;
    // 保存する項目自体が無視される（もともと循環していて、直しても循環が解けない場合を含む）
    if (entry !== undefined && after.includes(source)) return 'userDictErrorCycle';
    // ほかの上書きが新たに無視されるようになる
    if (after.some((other) => other !== source && !before.has(other))) {
      return entry === undefined ? 'userDictErrorCycleOnReset' : 'userDictErrorCycle';
    }
    return null;
  }

  // startsの各キーから訳文を辿り、長さ2以上の循環があればその節点の配列を返す。
  // 1つのキーには1つの訳文しかないので、辿る道は一本道になる
  function findCycle(dict, starts) {
    for (const start of starts) {
      const path = [];
      const position = new Map();
      let node = start;
      while (node in dict) {
        if (position.has(node)) {
          const cycle = path.slice(position.get(node));
          if (cycle.length >= 2) return cycle;
          break;
        }
        position.set(node, path.length);
        path.push(node);
        node = dict[node];
      }
    }
    return null;
  }

  // ==== 改善Issueの送信 ====
  //
  // トークンやAPIは使わず、.github/ISSUE_TEMPLATE/translation_request.ymlの各項目の
  // idをクエリパラメーターにした「入力済みのIssue作成画面」のURLを作る。
  // 実際の送信は、GitHubにログインした利用者本人が内容を確認してから行う。
  // クエリパラメーターで入力できるのはテキスト欄だけで、ドロップダウン（Request type・
  // Language）は選択されない（実際のGitHubで確認）。そのため選ぶべき値をContextに書き、
  // ドロップダウンは送信する人に選んでもらう
  const ISSUE_NEW_URL = 'https://github.com/nobuo-miura/github-ui-translator/issues/new';
  const ISSUE_TEMPLATE = 'translation_request.yml';
  // テンプレートの「Language」ドロップダウンの選択肢（英語名）。Contextに書く
  const ISSUE_LANGUAGE_LABELS = {
    ja: 'Japanese',
    'zh-CN': 'Simplified Chinese',
    'zh-TW': 'Traditional Chinese',
    es: 'Spanish',
    de: 'German',
    'pt-BR': 'Portuguese (Brazil)',
    ko: 'Korean',
    fr: 'French',
    ru: 'Russian'
  };
  // まとめて送る件数の上限。URLが長すぎるとGitHubが受け付けないため
  const MAX_ISSUE_ENTRIES = 20;
  const MAX_ISSUE_URL_LENGTH = 8000;

  /**
   * @param {string} language 言語コード
   * @param {{ source: string, current: string, suggested: string | null }[]} entries
   *   suggested が null の項目は「英語のまま表示する」提案
   * @param {string} [version] 拡張機能のバージョン（Contextに記載する）
   * @returns {string | null} 件数・長さの上限を超える場合はnull
   */
  function buildIssueUrl(language, entries, version) {
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ISSUE_ENTRIES) return null;
    const single = entries.length === 1;
    const lines = (pick) => entries.map(pick).join('\n');
    const keepEnglish = entries.filter((entry) => entry.suggested === null).map((entry) => entry.source);
    const requestType = single ? 'A single string' : 'Multiple strings';
    const context = [
      `Submitted from the user dictionary of GitHub UI Translator${version ? ` v${version}` : ''}.`,
      `Language: ${ISSUE_LANGUAGE_LABELS[language] || language}`,
      `Request type: ${requestType}`,
      ...(keepEnglish.length > 0
        ? ['', 'Suggest leaving the following text in English (not translated):', ...keepEnglish.map((source) => `- ${source}`)]
        : [])
    ].join('\n');
    const params = new URLSearchParams({
      template: ISSUE_TEMPLATE,
      title: single
        ? `[Translation]: (${language}) ${entries[0].source}`
        : `[Translation]: (${language}) ${entries.length} strings`,
      'source-text': lines((entry) => entry.source),
      'current-translation': lines((entry) => entry.current),
      'suggested-translation': lines((entry) => (entry.suggested === null ? entry.source : entry.suggested)),
      context
    });
    const url = `${ISSUE_NEW_URL}?${params}`;
    return url.length > MAX_ISSUE_URL_LENGTH ? null : url;
  }

  globalThis.GitHubUITranslator = {
    ISSUE_LANGUAGE_LABELS,
    MAX_ISSUE_ENTRIES,
    buildIssueUrl,
    clearUserDictionary,
    getDefaultLanguage,
    getMessage,
    loadBundledDictionary,
    loadLanguages,
    loadUserDictionary,
    localizeDocument,
    mergeDictionaries,
    normalizeTranslation,
    resolveDefaultLanguage,
    saveUserEntries,
    stripJsonComments,
    updateUserEntry,
    userDictKeyPrefix,
    validateNoCycle,
    validateTranslation
  };
})();
