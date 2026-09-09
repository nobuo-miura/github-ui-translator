// GitHub UI Translator - content script
//
// 実装方針:
// - 走査対象は許可リスト方式（nav, header, button, role=tab, role=menuitem, aria-label）のみ
// - 走査対象（許可リスト）はCSSクラス名やdata-testidには依存しない
//   （ユーザー作成コンテンツの除外のみ、CSSクラス名への限定的な例外あり）
// - 辞書に完全一致した文字列のみ置換し、動的文字列（数値・日付混じり）は対象外
// - 一致しない場合は原文表示のまま（翻訳失敗時のフォールバック）

(() => {
  const GLOBAL_HEADER_SELECTOR = 'header[role="banner"]';
  let translateGlobalHeader = false;

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
    // グローバルパンくず内のリポジトリ名。repoPickerCrumbはGitHubのReactヘッダーで
    // リポジトリ切替対象を示す要素で、表示テキストはユーザーが付けたリポジトリ名
    '[class*="repoPickerCrumb"]',
    // リポジトリのコード画面上部に表示されるリポジトリ名。Starボタン等の固定UIを
    // 除外しないよう、CodeViewHeaderのタイトル内にあるstrongだけに限定する
    '[class*="CodeViewHeader-module__TitleWrapper__"] strong',
    // グローバルなリポジトリ一覧（/repos）の各行。React製のReposListItemが付与する
    // NwoTitleは「オーナー名 / リポジトリ名」の複合表示、FormattedDescriptionは
    // リポジトリの説明文で、いずれもユーザーが入力した内容。辞書キーと完全一致すると
    // 誤訳されるため、行内の更新日時や可視性バッジ等の固定UIは残してこの2つを除外する
    '[class*="ReposListItem-module__NwoTitle__"]',
    '[class*="ReposListItem-module__FormattedDescription__"]',
    // 「新しいイシュー」ボタンから開くテンプレート選択ダイアログ（CreateIssueDialog）。
    // /issues/new/choose ページと違い各テンプレートは<a href>ではなくReactの
    // ActionList項目としてレンダリングされURLパターンでは保護できない。テンプレート名
    // （name:）と説明（description:）はリポジトリ内のYAMLでユーザーが自由に付ける値
    // なので、data-testid="template-list"配下の項目タイトルと説明を除外する。
    // 「空のイシュー」等の固定行の文言もここに含まれ訳されなくなるが、誤訳を防ぐ側を優先する
    '[data-testid="template-list"] [class*="IssueTemplateItem-module__actionListTitle__"]',
    '[data-testid="template-list"] [class*="prc-ActionList-Description-"]',
    // Issue Form本体のラベル・説明・Markdownはリポジトリ内のYAMLで定義される内容。
    // /issues/new ページに加え、一覧などから開くCreateIssueDialog内のフォームでも
    // 同じコンテナが使われる。パスに依存せずコンテナ単位で保護する（右側の担当者等の
    // 固定UIはコンテナ外なので影響しない）
    '[class*="IssueFormElements-module__formElementsContainer__"]',
    // リポジトリコード画面のReactファイルツリー。treeitemはリンクではないため
    // isUserContentLinkでは保護できず、遅延描画後にファイル名・ディレクトリ名が
    // 辞書キーと完全一致すると誤訳される。固定UIを残してtree本体だけを除外する
    'nav[aria-label="File Tree Navigation"] [role="tree"]',
    // Issue/PRに付くラベルとラベル作成フォームのプレビュー。ラベル名はユーザーが
    // 自由に設定できるため、PrimerのIssueLabelトークン全体を翻訳対象から除外する。
    // 末尾はビルドごとに変わるハッシュなので、公開コンポーネント名の接頭辞だけを使う
    '[class*="prc-Token-IssueLabel-"]',
    // Issue/PR右サイドバーの編集ポップアップに表示される候補名。ラベル名・
    // マイルストーン名・プロジェクト名・担当者名はいずれもユーザーが設定する内容。
    // dialog全体を除外すると見出しや検索欄などの固定UIまで翻訳できなくなるため、
    // 用途が明示されたlistbox内の候補行だけを保護する。ラベルの説明文も候補行の
    // 内側にあるので、行単位の除外により名前と合わせて保護される
    '[role="listbox"][aria-label="Label results"] [role="option"]',
    '[role="listbox"][aria-label="Milestone results"] [role="option"]',
    '[role="listbox"][aria-label="Project results"] [role="option"]',
    '[role="listbox"][aria-label="User results"] [role="option"]',
    // Issueの「Create a branch」ダイアログ。ベースリポジトリとベースブランチは
    // ユーザーが付けた識別子なので、候補行と選択後にボタン内へ表示される値を保護する。
    // ボタン自体のaria-labelは固定UIとして翻訳できるよう、表示値のspanだけを除外する
    '[role="listbox"][aria-label="Repository results"] [role="option"]',
    '[role="listbox"][aria-label="Branch results"] [role="option"]',
    // Issue右サイドバーの「開発」メニューに表示されるPull request候補。
    // 候補行のタイトルはユーザー作成コンテンツで、リポジトリ名や番号も含む
    '[role="listbox"][aria-label="Pull request results"] [role="option"]',
    'button[aria-label^="Selected repository:"] [data-component="text"]',
    'button[aria-label="Select a branch"] [data-component="text"]',
    // PRとDiscussionの右サイドバーでは、上のReact製listboxではなく旧式の
    // details-menuが使われている。各フォーム・候補行にGitHubが付けている用途別の
    // クラス／aria-labelに限定し、「No milestone」等の固定UIや新規作成フォームは
    // 除外せず、ユーザーが設定した候補名と付随する説明だけを保護する
    '.js-discussion-sidebar-menu .js-filterable-label',
    // Issue/PR一覧の絞り込みメニュー。ラベル名・説明、マイルストーン名、
    // プロジェクト名、ユーザー名はユーザー作成コンテンツなので候補行を保護し、
    // 「担当者なし」等の固定選択肢やフィルター見出しは翻訳対象に残す。
    // 新しいIssues一覧の同種候補は上の* results listboxで保護される
    '.js-issues-label-select-menu-item',
    '#milestones-select-menu [role="menuitemradio"][href*="milestone%3A"]',
    '#project-select-menu virtual-list [role="menuitemcheckbox"]',
    '#author-select-menu [role="menuitemradio"][href*="author%3A"]',
    '#assignees-select-menu [role="menuitemradio"][href*="assignee%3A"]',
    'form[aria-label="Select milestones"] .select-menu-item:not(.select-menu-new-item-form)',
    'form[aria-label="Select projects"] [role="menuitemcheckbox"]',
    'form[aria-label="Select assignees"] .select-menu-item',
    'form[aria-label="Select reviewers"] .select-menu-item',
    // PR作成（/compare）・Issue/PR詳細のサイドバーで開くマイルストーン／プロジェクト
    // 選択メニュー。直上の form[aria-label="Select …"] は拡張自身がその aria-label を
    // 翻訳すると一致しなくなるため、言語非依存な details の id で候補行を特定する。
    // マイルストーン名・プロジェクト名はユーザーが付ける名前。タブ（オープン/クローズ等）と
    // 「新しいマイルストーンを作成」フォーム行は固定UIとして翻訳対象に残す
    '#milestone-select-menu .select-menu-item:not(.select-menu-new-item-form)',
    '#projects-select-menu [role="menuitemcheckbox"]',
    // リポジトリ画面で現在選択されているブランチ。aria-labelは「<ブランチ名> branch」
    // で、内部の表示テキストはユーザーが付けたブランチ名そのものになる
    'button[aria-label$=" branch"]',
    // ブランチ／タグ選択ポップアップの候補行（リポジトリのコード画面上部の
    // ブランチ切替、リリース作成・編集画面のタグ選択などで共通のReact SelectPanel）。
    // ブランチ名・タグ名はいずれもユーザーが付けた識別子なので、固定UIのタブ
    // （Branches/Tags）や検索欄、「Create branch」等の操作は残して候補行だけを除外する。
    // ダイアログのaria-label（"Select a branch"等）は辞書キーと一致し拡張自身が
    // 翻訳してしまうため除外条件には使えない。言語非依存なaria-labelledbyの接頭辞
    // （ref-picker-…）とrole="menuitemradio"で候補行を特定する
    '[data-testid="overlay-content"][aria-labelledby^="ref-picker-"] [role="menuitemradio"]',
    // リリース作成・編集画面で選択中のタグ名。Tag:の固定ラベルとタグ名は別spanに
    // 分かれているため、ラベルは翻訳対象に残し、その直後の値だけを保護する
    'button[aria-label^="Tag:"] .fgColor-muted + span',
    // リリース作成画面のターゲット候補。ブランチ一覧と最近のコミット一覧が同じ
    // コンテナ内で切り替わるため、ブランチ名だけでなくコミットメッセージを含む
    // 候補行も保護する。js-release-target-wrapperはこの用途を示すGitHub側のクラス
    '.js-release-target-wrapper [role="menuitemradio"]',
    // Discussionの投票タイトル・選択肢・結果はすべてユーザーが作成する内容。
    // 作成後の表示だけでなく投票作成・編集時のプレビューもコンポーネント単位で保護する
    '.js-discussion-poll-component',
    // GitHubの遅延読み込み用カスタム要素。読み込み中はaria-label="Loading ..."が
    // 付いており、[aria-label]に無条件でマッチしてしまう。中身は読み込み完了後に
    // Ajaxで丸ごと置き換わる仮のプレースホルダーなので、翻訳しても意味がなく、
    // 一瞬翻訳されてすぐ元の英語コンテンツに置き換わる点滅の原因になっていた
    'include-fragment',
    // GitHubのReactパーシャル（グローバルヘッダー全体を含むreact-partial要素）は、
    // サーバーレンダリング済みHTMLをクライアント側でhydrateする。hydration完了前に
    // 内部のテキストやaria-labelを書き換えるとサーバーHTMLとの不一致でhydrationが
    // 失敗し、検索ボタンが消えて検索画面が開かなくなる（ブラウザ冷間起動時など
    // GitHubのJS初期化より翻訳が先に走った場合のみ発生）。hydration完了時に
    // GitHubが付与するloadedクラスを目印に、完了前のパーシャルには一切触れない。
    // 完了後の書き換えは安全（Reactは自分の仮想DOMと差分が出ない限りテキストを
    // 戻さない）で、loadedクラスの付与は下のhydration監視で検知して翻訳する
    'react-partial:not(.loaded)',
    // グローバルヘッダーの翻訳を設定でOFFにした場合のみ除外する
    // （既定はON。hydration完了後にのみ翻訳するため検索UIとは競合しない）
    GLOBAL_HEADER_SELECTOR,
    // グローバル検索はReact製の起動ボタンとquery-builder製の候補モーダルが
    // 別々に初期化される。GitHub側で配置が変わりヘッダー外へ移動した場合も
    // 書き換えないよう、検索UI自体も個別に除外する。候補に含まれるユーザー名・
    // Organization名・リポジトリ名の誤訳防止も兼ねる
    'button[aria-label="Search or jump to…"]',
    'button[aria-label="Search or jump to..."]',
    'qbsearch-input',
    'modal-dialog#search-suggestions-dialog',
    // Wikiページの見出し（ページ名そのもの）。issue/PRのタイトルとは異なりbdiで
    // 保護されておらず、Wiki固有のクラスのためこのタグ自体はaria/role等を
    // 持たない。.markdown-body同様、除外専用の目印としてCSSクラスに頼る例外とする
    '.gh-header-title',
    // GitHubがIssue/PR/Discussionのタイトルをレンダリングする際に付与する専用クラス。
    // 詳細画面のh1/追従ヘッダーだけでなく、PR右サイドバーの「開発（Development）」で
    // イシューをリンクする選択メニューなど、タイトルが再利用されるあらゆる箇所に付く。
    // 常にユーザーが入力したタイトルなので、クラス単体を除外専用の目印として使う
    '.markdown-title',
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
    '/settings/tokens/new': ['p'],
    // アカウントのCopilot設定（機能トグル一覧）。機能名・バッジ・説明文が素の
    // <span>/<p>でレンダリングされており、この画面はユーザー入力を一切含まないため
    // spanまで許可する。リンクを含む説明文はテキストノードが分割され訳されない
    '/settings/copilot/features': ['p', 'span']
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
    { pattern: /^\/[^/]+\/[^/]+\/settings\/security_analysis$/, selectors: ['p'] },
    // リポジトリSettings > Agent suggestions for issues（/settings/suggestions）。
    // 概要文は<p>、各自動化レベルの説明はRulesと同じ[data-component="FormControl.Caption"]
    // /"RadioGroup.Caption"という素の<span>で実装されている。この画面はユーザー入力を
    // 含まないため、これらの説明文を許可する
    {
      pattern: /^\/[^/]+\/[^/]+\/settings\/suggestions$/,
      selectors: ['p', '[data-component="FormControl.Caption"]', '[data-component="RadioGroup.Caption"]']
    },
    // リポジトリSettings > Copilot（/settings/copilot/code_review・/mcp 等）。
    // 各設定項目の説明文はPrimerのDescription-module__Box__という素のコンテナに
    // テキストノードとして入っており、拾うにはこのクラスが必要。リンクを含む
    // 一部の説明はテキストノードが分割されるため翻訳されないが、この画面は
    // ユーザー入力を含まないため許可できる部分だけを許可する
    {
      pattern: /^\/[^/]+\/[^/]+\/settings\/copilot\/[a-z_]+$/,
      selectors: ['p', '[class*="Description-module__Box__"]', '[data-component="FormControl.Caption"]']
    },
    // リリース作成画面。説明欄はtextarea、タグ・ブランチ・コミット候補は専用の
    // 除外セレクターで保護済みのため、画面下部の固定ガイド文だけを許可する
    { pattern: /^\/[^/]+\/[^/]+\/releases\/new$/, selectors: ['p'] },
    // GitHub Sponsorsダッシュボード。見出し・説明文・フォームのキャプションを許可。
    // リポジトリ説明・自己紹介プレビュー・スポンサー名などのユーザーコンテンツは
    // 下のPATTERN_EXTRA_EXCLUDE_SELECTORで個別に除外する
    { pattern: /^\/sponsors\/[^/]+\/dashboard(\/[a-z_]+)?$/, selectors: ['p', '[data-component="FormControl.Caption"]'] }
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
    },
    // リポジトリ固有の保存済みIssueビュー詳細画面。h1はGitHub固定の見出しではなく、
    // ユーザーが自由に付けたビュー名そのものなので翻訳対象から除外する。
    {
      pattern: /^\/[^/]+\/[^/]+\/issues\/views\/(?!new$)[^/]+$/,
      selectors: ['h1']
    },
    // マイルストーン詳細画面。h1はGitHub固定の見出しではなく、ユーザーが自由に
    // 付けたマイルストーン名そのものなので翻訳対象から除外する。
    {
      pattern: /^\/[^/]+\/[^/]+\/milestone\/\d+$/,
      selectors: ['h1']
    },
    // リリース詳細のh1はGitHub固定の見出しではなくユーザーが入力したリリース名。
    // タグ名と同じ場合も異なる場合もあるため、URLではなく見出し自体を保護する
    {
      pattern: /^\/[^/]+\/[^/]+\/releases\/tag\/[^/]+$/,
      selectors: ['main .border-top > h1.sr-only']
    },
    // リリース一覧の各sectionにある非表示見出しはリリース名そのもの。
    // section全体を除外するとAssets等の固定UIまで翻訳できないため見出しだけを保護する
    {
      pattern: /^\/[^/]+\/[^/]+\/releases$/,
      selectors: ['section[id^="release-"] > h2.sr-only', 'nav[aria-label="Release list navigation"] a[href^="#release-"]']
    },
    // Issue作成画面のカスタムIssue Template / Issue Formカード。名前と説明は
    // リポジトリ内の設定ファイルで自由に指定できる。Blank issueは固定UIなので残す
    {
      pattern: /^\/[^/]+\/[^/]+\/issues\/new\/choose$/,
      selectors: ['a[href*="/issues/new?template="]:not([href*="template=BLANK_ISSUE"])']
    },
    // ラベル管理一覧。各行のラベル名と説明はどちらもユーザーが編集できるため、
    // React ListViewが付与する明示的なlistitemロールを行単位で除外する。
    {
      pattern: /^\/[^/]+\/[^/]+\/labels$/,
      selectors: ['main [role="listitem"]']
    },
    // ユーザーまたはOrganization所有のProjects画面。h1はGitHub固定の見出しではなく、
    // ユーザーが自由に付けたプロジェクト名そのものなので翻訳対象から除外する。
    {
      pattern: /^\/(users|orgs)\/[^/]+\/projects\/\d+(\/|$)/,
      selectors: ['h1']
    },
    // Issue/PR/Discussion詳細のタイトル。従来はbdiや.gh-header-titleで保護されていたが、
    // 新しいReact画面ではh1内の.markdown-titleとなり、スクロール時にはh2の
    // 追従ヘッダーにも複製される。どちらもユーザーが付けたタイトルなので除外する。
    {
      pattern: /^\/[^/]+\/[^/]+\/(issues|pull|discussions)\/\d+$/,
      selectors: ['h1 .markdown-title', 'h2 .markdown-title', '.sticky-header-container .markdown-title']
    },
    // Actions実行詳細のタイトルとJob詳細見出し。Workflow名とJob名はWorkflow YAMLで
    // ユーザーが設定するため、実行番号や固定のステータスUIとは分けて保護する
    {
      pattern: /^\/[^/]+\/[^/]+\/actions\/runs\/\d+(\/job\/\d+)?$/,
      selectors: ['h1 .markdown-title', '.CheckRun-log-title']
    },
    // GitHub Sponsorsダッシュボードのユーザーコンテンツ領域だけを除外する。
    // featured-work要素には見出し・説明文・「Edit featured work」ボタンといった
    // 固定UIも含まれるため要素ごと除外はせず、実際にユーザーが用意した内容
    // （表示中の注目リポジトリカード、各編集ダイアログの選択候補）に絞る。
    {
      pattern: /^\/sponsors\/[^/]+\/dashboard(\/[a-z_]+)?$/,
      selectors: [
        // 表示中の「Featured work」カード（リポジトリ名・説明）
        'featured-work .js-sponsors-sortable-list',
        // 「Featured work」編集ダイアログのリポジトリ選択候補（名前）。
        // ダイアログの見出し・キャプション等の固定UIは翻訳対象に残す
        '#edit-sponsors-featured-work [class*="pinned-item-name"]',
        // 「Featured sponsors」編集ダイアログ。中身はほぼ候補行（スポンサー名）で
        // 固定UIはSave/Cancel程度のため、ダイアログごと除外する
        '#edit-featured-sponsorships-dialog'
      ]
    },
    // ルールセット作成・編集画面のテキスト入力欄。ルールセット名やrefパターンなど
    // ユーザー設定値を保持し、現在値がplaceholderへ複製された場合も誤訳を防ぐ。
    // また「対象を追加」「バイパスを追加」「Add environments」等で開くSelectPanelの
    // 候補行は、Environment名・チーム名・ユーザー名・refパターンなどユーザーが
    // 付けた識別子なので、role="option"の候補行を除外する（見出し・検索欄は残す）。
    {
      pattern: /^\/[^/]+\/[^/]+\/settings\/rules\/(new|\d+)$/,
      selectors: ['input[type="text"]', '[data-testid="filtered-action-list"] [role="option"]']
    },
    // Environment編集画面の見出し。h2内の省略表示対象はGitHub固定文言ではなく、
    // ユーザーが自由に付けたEnvironment名なので翻訳対象から除外する。
    {
      pattern: /^\/[^/]+\/[^/]+\/settings\/environments\/\d+\/edit$/,
      selectors: ['h2 .css-truncate-target']
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
      // GitHub Sponsorsのダッシュボード（/sponsors/<user>/dashboard 配下）。見出し・
      // ラベル・説明文が nav/button/[aria-label] の外に多数出るため拡張スコープが必要
      /^\/sponsors\/[^/]+\/dashboard(\/|$)/.test(location.pathname) ||
      /^\/new(\/|$)/.test(location.pathname) ||
      /^\/organizations\/[^/]+\/repositories\/new$/.test(location.pathname) ||
      // 個別PRページはURLが/pull/123（単数形）、一覧ページは/pulls（複数形）と
      // GitHub側でURL規則が不統一なため、両方にマッチさせる（pulls?）
      // マイルストーン詳細ページはURLが/milestone/2（単数形）、一覧ページは
      // /milestones（複数形）とGitHub側でURL規則が不統一なため、両方にマッチさせる
      /^\/[^/]+\/[^/]+\/(issues|pulls?|compare|wiki|security|pulse|graphs|community|network|discussions|actions|models|milestones?|labels|releases?|branches|tags)(\/|$)/.test(location.pathname) ||
      // グローバルなPull requestsダッシュボード（/pulls、/pulls/inbox、
      // /pulls/assigned等）。セクション見出し（h2）やページタイトル（h1）が
      // nav/header/button外の素のテキストとして出るため拡張スコープが必要
      /^\/pulls(\/|$)/.test(location.pathname) ||
      // グローバルなIssuesダッシュボード（/issues、/issues/assigned等）。
      // 上と同様にページタイトル（h1）がnav/header/button外に出るため必要
      /^\/issues(\/|$)/.test(location.pathname) ||
      // グローバルなリポジトリ一覧（/repos）。ページタイトル（h1）や
      // 「New repository」等のPrimer Buttonクラス付き<a>タグが対象になる
      /^\/repos(\/|$)/.test(location.pathname);

    const selector = isExtendedScopePage
      ? BASE_SELECTOR.concat(EXTRA_SELECTOR)
      : BASE_SELECTOR.slice();

    return selector.concat(getPathExtraSelector()).join(',');
  }

  function getExcludeSelector() {
    const pathExtra = getPathExtraSelector();
    const exclude = EXCLUDE_SELECTOR_BASE
      .filter((selector) => !translateGlobalHeader || selector !== GLOBAL_HEADER_SELECTOR)
      .concat(getPathExtraExcludeSelector());
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
      // リポジトリ固有の保存済みIssueビュー一覧（/issues/views）に表示されるビュー名。
      // リンク先のIDはGitHubが付与し（数値のこともbase64風のこともある）、
      // リンクの表示名はユーザーが自由に設定する。「新規作成」への固定リンクは除く
      /^\/[^/]+\/[^/]+\/issues\/views\/(?!new$)[^/]+$/.test(path) ||
      // リリース一覧・詳細に表示されるリリース名。リンク先にはユーザーが付けた
      // タグ名が入るため、辞書キーと完全一致しても表示名を翻訳しない
      /^\/[^/]+\/[^/]+\/releases\/tag\/[^/]+$/.test(path) ||
      // リリースに手動アップロードされたAssetのファイル名。末尾のパス部分は
      // ユーザーが付けた名前で、一覧・詳細のダウンロードリンクにそのまま表示される
      /^\/[^/]+\/[^/]+\/releases\/download\/[^/]+\/.+$/.test(path) ||
      // ActionsのWorkflow名・実行名・Job名。リンク表示はWorkflow YAMLで自由に
      // 設定でき、StarやActions等の辞書キーと完全一致しうる
      /^\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+$/.test(path) ||
      /^\/[^/]+\/[^/]+\/actions\/runs\/\d+(\/job\/\d+)?$/.test(path) ||
      // ユーザーまたはOrganization所有のProjects。プロジェクト名はパンくずリンク、
      // ビュー名は各ビューへのタブリンクとして表示され、どちらもユーザーが変更できる
      /^\/(users|orgs)\/[^/]+\/projects\/\d+(\/views\/\d+)?$/.test(path) ||
      // リポジトリRulesets一覧に表示されるルールセット名。リンク先の数値IDは
      // GitHubが付与し、リンクの表示名はユーザーが自由に設定する
      /^\/[^/]+\/[^/]+\/settings\/rules\/\d+$/.test(path) ||
      // Environment一覧に表示されるEnvironment名。リンク先の数値IDはGitHubが
      // 付与し、リンクの表示名はユーザーが自由に設定する
      /^\/[^/]+\/[^/]+\/settings\/environments\/\d+\/edit$/.test(path) ||
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
      /^\/[^/]+\/[^/]+\/(tree|blob)\/.+/.test(path) ||
      // Issue/PR一覧の各行に付くマイルストーンリンク（/owner/repo/milestones/<name>）。
      // GitHubはID（/milestone/2、単数形）ではなくユーザーが付けたマイルストーン名を
      // スラッグとしてそのままリンク先に使うため、"Actions"や"Draft"等の辞書キーと
      // 偶然完全一致すると誤訳されうる。新規作成への固定リンク（.../milestones/new）
      // はマイルストーン名ではないため除外対象から外す
      /^\/[^/]+\/[^/]+\/milestones?\/(?!new$)[^/]+$/.test(path);
  }

  // Pull requests/Issues/リポジトリのダッシュボード（サイドバーaside）には、
  // GitHub固定のフィルターリンク（Inbox、Assigned to me等）を並べたnavと、
  // ユーザーが名前を付けて保存した「Views」の一覧を並べたnavの2つが並ぶ。
  // 後者はユーザーが自由に名付けられるため、"My repositories"のように辞書の
  // キーと偶然完全一致すると誤訳されうる。両navにはハッシュ化されたPrimerの
  // 汎用クラスしか付いておらずCSSセレクタでは区別できないが、GitHub側の実装で
  // 固定リンクのnavが常にaside内で最初のnavとしてレンダリングされ、保存された
  // Viewsのnavはそれ以降に続くため、aside内で2番目以降のnavをユーザー作成
  // コンテンツとして除外する
  function isSavedViewsLink(el) {
    if (!/^\/(pulls|issues|repos)(\/|$)/.test(location.pathname)) return false;

    const nav = el.closest('nav');
    if (!nav) return false;
    const aside = nav.closest('aside');
    if (!aside) return false;
    return aside.querySelector('nav') !== nav;
  }

  // ActionsのJobログではユーザー定義StepとGitHub固定Stepが同じ要素構造を使う。
  // 固定の開始・終了Stepは翻訳対象に残し、それ以外のWorkflow YAML由来の名前を保護する
  function isWorkflowUserStep(el) {
    const stepName = el.closest('.CheckStep-titleName');
    if (!stepName) return false;
    const text = stepName.textContent.trim();
    return text !== 'Set up job' && text !== 'Complete job';
  }

  // グローバルパンくずのリポジトリ切り替えは、候補listboxに用途を示す属性がなく、
  // ダイアログ名も動的ID経由のaria-labelledbyで付く。専用のトリガーボタンが開いて
  // いる間だけ、同時に表示されているSelectPanel内のoptionをリポジトリ名として保護する
  function isRepositorySwitcherOption(el) {
    const option = el.closest('[role="option"]');
    if (!option || !option.closest('[class*="prc-SelectPanel-Overlay-"]')) return false;
    return Boolean(document.querySelector('[class*="repoPickerDropdownButton"][aria-expanded="true"]'));
  }

  const STANDARD_DISCUSSION_CATEGORIES = new Set([
    'announcements', 'general', 'ideas', 'polls', 'q-a', 'q&a', 'show-and-tell'
  ]);

  // Discussionカテゴリはリポジトリ管理者が作成・命名できる。一方、GitHub標準の
  // 6カテゴリは辞書で意図的に翻訳しているため、標準スラッグ以外だけを保護する。
  // 一覧のカテゴリリンク、新規Discussionのカテゴリカード、検索リンクに対応する
  function isCustomDiscussionCategory(el) {
    // セクション作成・編集画面のカテゴリチェック項目。数値IDしか持たないため、
    // labelの先頭テキストノードにあるカテゴリ名で標準カテゴリかを判定する
    if (/^\/[^/]+\/[^/]+\/discussions\/sections\/(new|\d+\/edit)$/.test(location.pathname)) {
      const label = el.closest('label');
      const checkbox = label?.querySelector('input[name="section[category_ids][]"]');
      if (checkbox) {
        const nameNode = [...label.childNodes]
          .find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const name = (nameNode?.textContent || '').trim().toLowerCase().replaceAll(' ', '-');
        return Boolean(name) && !STANDARD_DISCUSSION_CATEGORIES.has(name);
      }
    }

    // カテゴリ管理一覧はリンク先が数値IDのためURLからスラッグを取得できない。
    // 各行のEditリンクに含まれるカテゴリ名で標準カテゴリかを判定し、カスタム行では
    // 名前だけでなく管理者が入力した説明もまとめて保護する
    if (/^\/[^/]+\/[^/]+\/discussions\/categories$/.test(location.pathname)) {
      const row = el.closest('li.Box-row');
      const editLink = row?.querySelector('a[aria-label^="Edit "][aria-label$=" category"]');
      if (editLink) {
        const name = editLink.getAttribute('aria-label').slice(5, -9).toLowerCase().replaceAll(' ', '-');
        return !STANDARD_DISCUSSION_CATEGORIES.has(name);
      }
    }

    let link = el.closest('a[href]');
    let protectCard = false;
    if (!link) {
      const card = el.closest('li');
      link = card?.querySelector('a[href*="/discussions/new?category="]') || null;
      protectCard = Boolean(link);
    }
    if (!link) return false;

    let url;
    try {
      url = new URL(link.getAttribute('href'), location.href);
    } catch {
      return false;
    }

    const categoryPath = url.pathname.match(/^\/[^/]+\/[^/]+\/discussions\/categories\/([^/]+)$/);
    if (categoryPath) return !STANDARD_DISCUSSION_CATEGORIES.has(categoryPath[1]);

    if (/^\/[^/]+\/[^/]+\/discussions\/new$/.test(url.pathname)) {
      const category = url.searchParams.get('category');
      return protectCard && Boolean(category) && !STANDARD_DISCUSSION_CATEGORIES.has(category);
    }

    if (/^\/[^/]+\/[^/]+\/discussions$/.test(url.pathname)) {
      const query = url.searchParams.get('discussions_q') || '';
      const match = query.match(/category:(?:"([^"]+)"|([^\s]+))/);
      const name = (match?.[1] || match?.[2] || '').toLowerCase().replaceAll(' ', '-');
      return Boolean(name) && !STANDARD_DISCUSSION_CATEGORIES.has(name);
    }
    return false;
  }

  function isExcludedElement(el) {
    return !el || Boolean(el.closest(getExcludeSelector())) || isUserContentLink(el) || isSavedViewsLink(el) || isWorkflowUserStep(el) || isRepositorySwitcherOption(el) || isCustomDiscussionCategory(el);
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
      chrome.storage.local.get(
        { enabled: true, language: 'ja', translateGlobalHeader: true },
        (items) => resolve(items)
      );
    });
  }

  function translateElement(el, dict) {
    const label = el.getAttribute('aria-label');
    if (label) {
      const trimmed = label.trim();
      const targetMatch = el.closest('.js-release-target-wrapper') && trimmed.match(/^Target:\s+(.+)$/);
      const translated = dict[trimmed] || (targetMatch && dict['Target:'] && `${dict['Target:']} ${targetMatch[1]}`);
      if (translated) {
        // 置換文字列中の "$&" 等が特殊解釈されないよう関数形式で渡す
        const replacement = label.replace(trimmed, () => translated);
        // 書き込みは値が変わるときだけ（理由はテキストノード側の同じガードを参照）
        if (replacement !== label) el.setAttribute('aria-label', replacement);
      }
    }

    // placeholder属性もテキストノードではないため個別に処理する
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      const trimmed = placeholder.trim();
      const translated = dict[trimmed];
      if (translated) {
        const replacement = placeholder.replace(trimmed, () => translated);
        if (replacement !== placeholder) el.setAttribute('placeholder', replacement);
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
        const replacement = value.replace(trimmed, () => translated);
        if (replacement !== value) el.value = replacement;
      }
      const disableWith = el.getAttribute('data-disable-with');
      if (disableWith) {
        const disableWithTrimmed = disableWith.trim();
        const disableWithTranslated = dict[disableWithTrimmed];
        if (disableWithTranslated) {
          const replacement = disableWith.replace(disableWithTrimmed, () => disableWithTranslated);
          if (replacement !== disableWith) el.setAttribute('data-disable-with', replacement);
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
      // リリース作成画面のTargetボタンは固定ラベルとユーザーが選択したブランチ名を
      // 1つのテキストノード（例: "Target: main"）に結合する。完全一致の原則を保ち
      // つつ、用途を限定して固定の接頭辞だけを訳し、選択値は原文のまま保持する
      const targetMatch = textNode.parentElement.closest('.js-release-target-wrapper') && lookupText.match(/^Target:\s+(.+)$/);
      const translated = dict[lookupText] || (targetMatch && dict['Target:'] && `${dict['Target:']} ${targetMatch[1]}`);
      if (translated) {
        // 置換文字列中の "$&" 等が特殊解釈されないよう関数形式で渡す
        const replacement = value.replace(trimmed, () => translated);
        // 値が変わらない場合は書き込まない。nodeValueへの代入は同じ文字列でも
        // characterDataミューテーションを発火させる仕様のため、辞書に
        // "Wiki": "Wiki" のような自己マッピング（意図的に未翻訳の固有名詞）が
        // あると収束せず、requestAnimationFrameが実行されるたびに同じ処理が続く。
        // 表示は一切変わらないので気づきにくいが、不要な再走査が継続する。
        // "Wikis" -> "Wiki" のように訳文が別のキーでもある場合も、2巡目でここに
        // 到達して同じループになるため、書き込み直前の比較で止めるのが確実
        if (replacement !== value) textNode.nodeValue = replacement;
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
    const { enabled, language, translateGlobalHeader: globalHeaderEnabled } = await getSettings();
    if (!enabled) return;
    translateGlobalHeader = globalHeaderEnabled;

    const dict = await loadDictionary(language);
    if (Object.keys(dict).length === 0) return;

    // SPA対応: GitHubの動的DOM更新に追従する
    // 自分の書き込みもcharacterDataミューテーションとして観測されるため、再走査が
    // ループしないことはtranslateElement側の「値が変わるときだけ書き込む」ガードに
    // 依存している（訳文が原文と同じ自己マッピングでも止まる）。
    // 複数ミューテーションはrequestAnimationFrameで1回にまとめる
    //
    // 監視対象はdocument.bodyではなくdocumentElement（<html>）にする。
    // GitHubのTurboナビゲーション（特に「戻る/進む」の履歴復元）は<body>要素ごと
    // 置き換えるため、bodyを監視していると置換後に一切検知できなくなる。
    let scheduled = false;
    const pendingRoots = new Set();

    function addPendingRoot(node) {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!(element instanceof Element) || !element.isConnected || isExcludedElement(element)) return;

      // 許可リスト要素の内側に追加された通常のspan等も拾うため、最も近い
      // 許可リスト祖先を走査起点にする。該当祖先がなければ追加された部分木だけを
      // 起点にし、内部にあるbutton等の許可リスト要素をtranslateAllで探索する。
      const root = element.closest(getAllowlistSelector()) || element;

      // 同じフレーム内で親子両方が変更された場合は、より外側の起点だけを残す。
      for (const pending of pendingRoots) {
        if (pending.contains(root)) return;
        if (root.contains(pending)) pendingRoots.delete(pending);
      }
      pendingRoots.add(root);
    }

    // hydration未完了のReactパーシャルは除外リストで翻訳を保留しているため、
    // loadedクラスが付いた時点（＝hydration完了）を検知してそこから翻訳する。
    // クラス変化は属性ミューテーションで、メインのobserverはchildList/
    // characterDataしか監視していないため、パーシャルごとに専用のobserverを張る。
    // loadedが付かないままの場合は翻訳されないだけで、動作は壊れない
    const watchedPartials = new WeakSet();

    function watchPartialHydration(partial) {
      if (watchedPartials.has(partial)) return;
      watchedPartials.add(partial);
      const hydrationObserver = new MutationObserver(() => {
        if (!partial.classList.contains('loaded')) return;
        hydrationObserver.disconnect();
        translateAll(partial, dict);
      });
      hydrationObserver.observe(partial, { attributes: true, attributeFilter: ['class'] });
    }

    function watchPendingPartials(node) {
      if (!(node instanceof Element)) return;
      const selector = 'react-partial:not(.loaded)';
      if (node.matches(selector)) watchPartialHydration(node);
      node.querySelectorAll(selector).forEach(watchPartialHydration);
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          addPendingRoot(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          watchPendingPartials(node);
          addPendingRoot(node);
        });
      }

      if (scheduled || pendingRoots.size === 0) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const roots = [...pendingRoots];
        pendingRoots.clear();
        for (const root of roots) {
          if (root.isConnected) translateAll(root, dict);
        }
      });
    });
    // 初回翻訳より先に監視を開始し、その間のDOM変更を取りこぼさないようにする
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // 初回翻訳の時点で既に存在するhydration待ちパーシャルにも監視を張る
    watchPendingPartials(document.body);
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

  // ポップアップで設定（ON/OFF・言語）を変更したら、このタブ自身をリロードして
  // 反映する。ポップアップ側でもchrome.tabs.reload()を呼んでいるが、<select>操作時に
  // ポップアップがフォーカスを失って閉じるとchrome.storage.local.set()のコールバックが
  // 実行されずリロードされないことがあるため、その保険としてここでも検知する。
  // （ポップアップ側のリロードは、拡張機能更新直後などまだ新しいcontent.jsが
  // 注入されていないタブを救うために残してある。両方が発火しても単に
  // リロードが重複するだけで害はない）
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('enabled' in changes || 'language' in changes || 'translateGlobalHeader' in changes) {
      location.reload();
    }
  });
})();
