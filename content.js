// GitHub UI Translator - content script
//
// 実装方針:
// - 走査対象は許可リスト方式（nav, header, button, role=tab, role=menuitem, aria-label）のみ
// - 走査対象（許可リスト）はCSSクラス名やdata-testidには依存しない
//   （ユーザー作成コンテンツの除外のみ、CSSクラス名への限定的な例外あり）
// - 辞書に完全一致した文字列のみ置換し、動的文字列（数値・日付混じり）は対象外
// - 一致しない場合は原文表示のまま（翻訳失敗時のフォールバック）

(() => {
  const BASE_SELECTOR = [
    'nav',
    'header',
    'button',
    'input[type="submit"]',
    'input[type="button"]',
    'input[type="reset"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemradio"]',
    '[role="menuitemcheckbox"]',
    '[role="menu"]',
    '[role="dialog"]',
    '[role="listbox"]',
    '[role="button"]',
    '[aria-label]'
  ];

  // Settings、Organization管理、リポジトリ作成、Issue/PR画面では
  // 見出しやラベルにも固定UI文言が多いため、翻訳対象を広げる。
  // "a"は、GitHubが<button>ではなくPrimerのButtonクラスを当てた<a>タグで
  // ボタンを実装しているケース（例: 「New pull request」）に対応するために追加。
  // roleもaria-labelも付いていないためaria-labelでは拾えないが、<a>自体は
  // CSSクラスに依存しない正規のセマンティックHTMLタグなので方針上問題ない。
  // README/Issue本文などのコンテンツ領域は .markdown-body で除外する。
  const EXTRA_SELECTOR = [
    'label',
    'legend',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'dt',
    'strong',
    'a',
    'input[placeholder]',
    'textarea[placeholder]'
  ];
  // ユーザーが作成した本文・タイトル・識別子を翻訳しないための安全策。
  // 親要素（navやdialog）を走査するときも、各テキストノードに対してこの判定を行う。
  // "p"は原則除外だが、個別に安全性を確認したページ（EXACT_PATH_EXTRA_SELECTOR）
  // でのみ、そのページ限定で許可リスト側に回す。
  const EXCLUDE_SELECTOR_BASE = [
    '.markdown-body',
    'pre',
    'code',
    'bdi',
    '[contenteditable="true"]',
    '[data-hovercard-type="repository"]',
    '[data-hovercard-type="user"]',
    // GitHubの遅延読み込み用カスタム要素。読み込み中はaria-label="Loading ..."が
    // 付いており、[aria-label]に無条件でマッチしてしまう。中身は読み込み完了後に
    // Ajaxで丸ごと置き換わる仮のプレースホルダーなので、翻訳しても意味がなく、
    // 一瞬翻訳されてすぐ元の英語コンテンツに置き換わる点滅の原因になっていた
    'include-fragment',
    // Wikiページの見出し（ページ名そのもの）。issue/PRのタイトルとは異なりbdiで
    // 保護されておらず、Wiki固有のクラスのためこのタグ自体はaria/role等を
    // 持たない。.markdown-body同様、除外専用の目印としてCSSクラスに頼る例外とする
    '.gh-header-title',
    // カスタムサイドバーがないWikiページで自動生成される目次。現在のページ自身の
    // 見出しをそのままアンカーリンクとして列挙するため、ページ内フラグメントへの
    // リンク（#見出し名）となりisUserContentLinkのURLパターンでは捕捉できない
    '.js-wiki-sidebar-toc-container'
  ];

  // URLパスプレフィックス単位ではなく、中身を個別に確認した画面（完全一致）
  // でのみ翻訳範囲を広げるための対応表。例えば/settings配下は画面によって
  // ユーザー入力（bio、トークン名等）が<p>に出るか異なるため、確認済みの
  // 画面だけをここに追記していく方針とする。
  const EXACT_PATH_EXTRA_SELECTOR = {
    '/settings/profile': ['p'],
    '/settings/admin': ['p'],
    '/settings/notifications': ['p'],
    '/settings/security_analysis': ['p'],
    '/settings/keys': ['p'],
    '/settings/repositories': ['p'],
    '/settings/codespaces': ['p'],
    '/settings/packages': ['p'],
    // .FormControl-captionはdata-component="FormControl.Caption"と同様、
    // 古い世代のPrimer CSSクラスだがハッシュ化されていない安定した公式クラス名。
    // このページの権限選択欄の説明文（例:「Read-only access to public
    // repositories.」）がこの構造で実装されているため、この画面限定で許可する。
    '/settings/personal-access-tokens/new': ['p', '.FormControl-caption'],
    '/settings/tokens/new': ['p']
  };

  // owner/repoのように可変のパスセグメントを含むため完全一致では表現できない
  // 画面向け。末尾を$で固定し、確認済みのサブページ以外へ意図せず広がらないようにする。
  const PATTERN_EXTRA_SELECTOR = [
    // リポジトリSettings > General。リポジトリのフルネームが素のテキストとして
    // 出現するが、常に"owner/repo"の複合形か長文中への埋め込みでしか現れず、
    // 単語単位の辞書キーと衝突する実質的なリスクはないため許可する。
    { pattern: /^\/(?!orgs\/)[^/]+\/[^/]+\/settings$/, selectors: ['p'] },
    // リポジトリSettings > Rules（ルールセット作成・編集画面）。各ルールの説明文は
    // <p>ではなくPrimerの[data-component="FormControl.Caption"]という素の<span>で
    // 実装されており、拾うにはこの属性が必須。data-testidと同種の依存だが、
    // Primerの公開コンポーネント仕様の一部でありCSSクラスや内部実装用の
    // testidより変更されにくいと判断し、この画面限定で許可する。
    { pattern: /^\/[^/]+\/[^/]+\/settings\/rules\/(new|\d+)$/, selectors: ['[data-component="FormControl.Caption"]'] },
    // Wikiのトップページ（/wiki自体、個別ページの/wiki/Xは対象外）。ページが
    // 1つもない場合の案内文のみを想定しており、実際のWiki本文は.markdown-body
    // 側で常に保護されるため安全。
    { pattern: /^\/[^/]+\/[^/]+\/wiki$/, selectors: ['p'] },
    // リポジトリSettings > Actions（一般設定）。フォーク許可等の一部説明文には
    // オーナー名が埋め込まれるが、それらは辞書キーと衝突しない完全な単語単位では
    // ないため許可する
    { pattern: /^\/[^/]+\/[^/]+\/settings\/actions$/, selectors: ['p'] },
    // リポジトリSettings > Pages
    { pattern: /^\/[^/]+\/[^/]+\/settings\/pages$/, selectors: ['p'] },
    // リポジトリSettings > 高度なセキュリティ
    { pattern: /^\/[^/]+\/[^/]+\/settings\/security_analysis$/, selectors: ['p'] }
  ];

  // 許可リストを広げたページのうち、その画面固有のユーザー作成コンテンツ
  // （トークン名、リソースの所有者名等）が同じ拡張スコープ内に現れる場合、
  // 個別に確認したうえでその要素だけを除外リストに追加する対応表。
  // "Events"/"Plan"/"Metadata"等、権限名の翻訳に使った短い単語は
  // Organization名やユーザー名としても有効なため、この保護がないと
  // 誤訳されるおそれがある。
  const EXACT_PATH_EXTRA_EXCLUDE_SELECTOR = {
    // 「リソースの所有者」選択ボタンのラベルは選択中のユーザー/Organization名
    // そのものであり、select-panel（GitHub共通の選択パネル用カスタム要素）の
    // ボタンラベルとして表示される
    '/settings/personal-access-tokens/new': ['select-panel .Button-label']
  };

  const PATTERN_EXTRA_EXCLUDE_SELECTOR = [
    // Fine-grained tokenの詳細画面。トークン名はh2.Subhead-heading見出しとして
    // ユーザーがつけた名前がそのまま表示される。「Access on」見出し（h3、f3修飾
    // クラス付き）配下のリンクはリソースの所有者名（ユーザー/Organization名）で、
    // data-hovercard-type等は付与されていないため専用の除外が必要
    {
      pattern: /^\/settings\/personal-access-tokens\/\d+$/,
      selectors: ['form.js-user-programmatic-access-form h2.Subhead-heading', 'h3.Subhead-heading a']
    }
  ];

  function getPathExtraSelector() {
    const exact = EXACT_PATH_EXTRA_SELECTOR[location.pathname] || [];
    const pattern = PATTERN_EXTRA_SELECTOR
      .filter((rule) => rule.pattern.test(location.pathname))
      .flatMap((rule) => rule.selectors);
    return [...new Set([...exact, ...pattern])];
  }

  function getPathExtraExcludeSelector() {
    const exact = EXACT_PATH_EXTRA_EXCLUDE_SELECTOR[location.pathname] || [];
    const pattern = PATTERN_EXTRA_EXCLUDE_SELECTOR
      .filter((rule) => rule.pattern.test(location.pathname))
      .flatMap((rule) => rule.selectors);
    return [...new Set([...exact, ...pattern])];
  }

  function getAllowlistSelector() {
    const isExtendedScopePage =
      /\/settings(\/|$)/.test(location.pathname) ||
      /^\/orgs\/[^/]+\/(people|teams|security-managers|packages|sponsoring|repositories|actions)(\/|$)/.test(location.pathname) ||
      /^\/new(\/|$)/.test(location.pathname) ||
      /^\/organizations\/[^/]+\/repositories\/new$/.test(location.pathname) ||
      // 個別PRページはURLが/pull/123（単数形）、一覧ページは/pulls（複数形）と
      // GitHub側でURL規則が不統一なため、両方にマッチさせる（pulls?）
      // マイルストーン詳細ページはURLが/milestone/2（単数形）、一覧ページは
      // /milestones（複数形）とGitHub側でURL規則が不統一なため、両方にマッチさせる
      /^\/[^/]+\/[^/]+\/(issues|pulls?|compare|wiki|security|pulse|graphs|community|network|discussions|actions|models|milestones?|labels)(\/|$)/.test(location.pathname);

    const selector = isExtendedScopePage
      ? BASE_SELECTOR.concat(EXTRA_SELECTOR)
      : BASE_SELECTOR.slice();

    return selector.concat(getPathExtraSelector()).join(',');
  }

  function getExcludeSelector() {
    const pathExtra = getPathExtraSelector();
    const exclude = EXCLUDE_SELECTOR_BASE.concat(getPathExtraExcludeSelector());
    // このページでpを許可リスト側に回した場合のみ、除外リストからは外す
    if (!pathExtra.includes('p')) exclude.push('p');
    return exclude.join(',');
  }

  function isUserContentLink(el) {
    const link = el.closest('a[href]');
    if (!link) return false;

    let path;
    try {
      path = new URL(link.getAttribute('href'), location.href).pathname;
    } catch {
      return false;
    }

    return /^\/[^/]+\/[^/]+\/(issues|pull|discussions)\/\d+(\/|$)/.test(path) ||
      /^\/[^/]+\/[^/]+\/commit\/[0-9a-f]+(\/|$)/i.test(path) ||
      // Wikiページ名へのリンク（サイドバーのページ一覧等）。ページ名はユーザーが
      // 付けたタイトルであり、辞書のキーと偶然完全一致すると誤訳されうる。
      // Homeページ自体へのリンクは末尾にページ名が付かず/wikiのみになるため、
      // ページ名部分を省略可能にする。"_new"は新規ページ作成への固定リンクで
      // ページ名ではないため除外する
      /^\/[^/]+\/[^/]+\/wiki(\/(?!_new$)[^/]+)?$/.test(path) ||
      // ファイル・ディレクトリ一覧の各行へのリンク（/tree/ブランチ/パス、/blob/ブランチ/パス）。
      // ファイル名・フォルダ名はユーザーが付けたものであり、"Code"や"Packages"の
      // ように辞書キーと偶然完全一致することがある。これらの行はGitHub側で
      // aria-label="Packages, (Directory)"のような形式が付与されており、
      // [aria-label]自体はBASE_SELECTORで無条件に許可されているため、
      // ファイル名・フォルダ名のテキストノードまでTreeWalkerで走査され誤訳が
      // 発生していた。isExcludedElementはtranslateElement呼び出し自体を止める
      // ため、この行はaria-label属性・可視テキストとも一切書き換えなくなる
      /^\/[^/]+\/[^/]+\/(tree|blob)\/.+/.test(path);
  }

  function isExcludedElement(el) {
    return !el || Boolean(el.closest(getExcludeSelector())) || isUserContentLink(el);
  }

  async function loadDictionary(language) {
    try {
      const url = chrome.runtime.getURL(`dictionaries/${language}.json`);
      const res = await fetch(url);
      const text = await res.text();
      const data = JSON.parse(globalThis.GitHubUITranslator.stripJsonComments(text));
      // プロトタイプなしオブジェクトに詰め替える。通常オブジェクトだと画面上の
      // テキストが "toString" や "hasOwnProperty" のときObject.prototypeの
      // 継承プロパティが辞書ヒット扱いになり、テキスト破壊や例外の原因になる
      return Object.assign(Object.create(null), data.translations || {});
    } catch (e) {
      console.error('[GitHub UI Translator] 辞書の読み込みに失敗しました', e);
      return {};
    }
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ enabled: true, language: 'ja' }, (items) => resolve(items));
    });
  }

  function translateElement(el, dict) {
    const label = el.getAttribute('aria-label');
    if (label) {
      const trimmed = label.trim();
      const translated = dict[trimmed];
      if (translated) {
        // 置換文字列中の "$&" 等が特殊解釈されないよう関数形式で渡す
        el.setAttribute('aria-label', label.replace(trimmed, () => translated));
      }
    }

    // placeholder属性もテキストノードではないため個別に処理する
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      const trimmed = placeholder.trim();
      const translated = dict[trimmed];
      if (translated) {
        el.setAttribute('placeholder', placeholder.replace(trimmed, () => translated));
      }
    }

    // <select>の<option>群（国名一覧など巨大な参照データ）は翻訳対象外
    if (el.tagName === 'SELECT') return;

    // <textarea>の子テキストノードは表示用のテキストではなくユーザーの入力内容
    // （例: 自己紹介欄）そのものであり、placeholder属性を持つ場合は許可リストの
    // textarea[placeholder]にマッチしてここまで到達しうる。INPUTのvalueと同様、
    // 完全一致すると入力内容を書き換えてしまうため、placeholder処理後は必ず抜ける
    if (el.tagName === 'TEXTAREA') return;

    // <input type="submit"/"button"/"reset">はテキストノードではなくvalue属性が
    // ボタンラベルとして表示されるため、個別に処理する。
    // data-disable-withは送信中に一時的に表示されるラベルなのであわせて処理する。
    // valueの翻訳はボタン系typeに限定する。テキスト入力欄のvalueはユーザーの
    // 入力内容そのものであり、翻訳すると入力中の値を書き換えてしまうため
    if (el.tagName === 'INPUT') {
      if (el.type !== 'submit' && el.type !== 'button' && el.type !== 'reset') return;
      const value = el.value;
      const trimmed = value.trim();
      const translated = dict[trimmed];
      if (translated) {
        el.value = value.replace(trimmed, () => translated);
      }
      const disableWith = el.getAttribute('data-disable-with');
      if (disableWith) {
        const disableWithTrimmed = disableWith.trim();
        const disableWithTranslated = dict[disableWithTrimmed];
        if (disableWithTranslated) {
          el.setAttribute('data-disable-with', disableWith.replace(disableWithTrimmed, () => disableWithTranslated));
        }
      }
      return;
    }

    // role="menu"/"listbox"は国名・タイムゾーン一覧のような巨大な参照データが
    // 丸ごと隠し要素として含まれることがあるため、件数上限を設ける。
    // nav/header/dialog/label/heading等の一般的なUI領域には上限を適用しない
    // （Settingsサイドバーのような正規のナビゲーションを誤って除外しないため）
    const role = el.getAttribute('role');
    const isBoundedContainer = role === 'menu' || role === 'listbox';

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
      if (isBoundedContainer && textNodes.length > 100) return;
    }

    for (const textNode of textNodes) {
      if (isExcludedElement(textNode.parentElement)) continue;
      const value = textNode.nodeValue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      // 改行やインデントを含む複数行のテキストノードも辞書の1行キーと
      // 一致させるため、辞書引き用にのみ連続空白を単一スペースに正規化する
      // （置換対象は元のtrimmedのままなので、余分な改行も訳文で解消される）
      const lookupText = trimmed.replace(/\s+/g, ' ');
      const translated = dict[lookupText];
      if (translated) {
        // 置換文字列中の "$&" 等が特殊解釈されないよう関数形式で渡す
        textNode.nodeValue = value.replace(trimmed, () => translated);
      }
    }
  }

  function translateAll(root, dict) {
    const allowlistSelector = getAllowlistSelector();
    if (root.matches && root.matches(allowlistSelector) && !isExcludedElement(root)) {
      translateElement(root, dict);
    }
    root.querySelectorAll(allowlistSelector).forEach((el) => {
      if (!isExcludedElement(el)) translateElement(el, dict);
    });
  }

  (async () => {
    const { enabled, language } = await getSettings();
    if (!enabled) return;

    const dict = await loadDictionary(language);
    if (Object.keys(dict).length === 0) return;

    // SPA対応: GitHubの動的DOM更新に追従する
    // 完全一致した文字列は翻訳後の日本語になり辞書のキー（英語）と再度一致しないため、
    // 再走査してもループしない。複数ミューテーションはrequestAnimationFrameで1回にまとめる
    //
    // 監視対象はdocument.bodyではなくdocumentElement（<html>）にする。
    // GitHubのTurboナビゲーション（特に「戻る/進む」の履歴復元）は<body>要素ごと
    // 置き換えるため、bodyを監視していると置換後に一切検知できなくなる。
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        translateAll(document.body, dict);
      });
    });
    // 初回翻訳より先に監視を開始し、その間のDOM変更を取りこぼさないようにする
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    translateAll(document.body, dict);

    // ブラウザの「戻る/進む」でbfcacheからページが復元された場合、
    // DOM変更を伴わないことがありMutationObserverだけでは検知できないため、
    // pageshowイベントでも再翻訳する。
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        translateAll(document.body, dict);
      }
    });
  })();
})();
