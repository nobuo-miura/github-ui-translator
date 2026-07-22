[English](translation-scope.md) | [日本語](translation-scope.ja.md)

# 翻訳対象の範囲

このドキュメントは、GitHub UI Translatorが「何を翻訳し、何を意図的に翻訳しないか」を整理したものです。
実装の詳細は `content.js` と `dictionaries/ja.json` を参照してください。

GitHubの固定UIのみを辞書で翻訳し、ユーザーが作成したコンテンツや動的な文字列は原則として原文のまま表示します。

## 基本方針

- **許可リスト方式**: `nav` / `header` / `button` / `role="tab"` などの意味を持つHTMLタグ・ARIA属性だけを走査対象にする。CSSクラス名や`data-testid`には基本的に依存しない。
- **完全一致のみ**: 前後の空白を除去し、連続する空白を単一スペースに正規化した文字列が辞書に完全一致した場合だけ置換する。一致しなければ原文のまま表示される（翻訳失敗時のフォールバック）。
- **ユーザー作成コンテンツは対象外**: README・Issue本文・コメント・コードブロック・ファイル名・リポジトリ名・ユーザー名・Wikiページ名などは、辞書に完全一致しても書き換えないよう積極的に除外する。

## 翻訳される範囲

GitHubの固定UI文言（ナビゲーション、ボタン、見出し、ラベル、フォームの説明文など）を、確認済みの画面ごとに辞書へ登録している。2026年7月時点で **1293件**（`node scripts/validate.mjs` で件数を確認可能）。

対応済みの主な画面（`dictionaries/ja.json` 内のセクション見出しに対応）:

- **リポジトリ**: ナビゲーション（Code/Issues/Pull requests/Discussions/Actions/Projects/Wiki等のタブ）、Issue/PRの一覧・詳細・作成画面、Markdownエディタツールバー、差分表示、Discussions、Wiki編集画面・トップページの空状態、Milestones、Labels
- **リポジトリ管理**: Settings全般（General、Access、Danger Zone、Rules、Actions、Pages、シークレットと変数、デプロイキー、Webhook、Copilot、高度なセキュリティ、Collaborators and teams、モデレーションオプション）、Insights（Pulse、Community、Graphs、Network）、Security画面
- **個人・Organization**: ユーザー設定全般（Public profile、Account、Appearance、Accessibility、Notifications、Billing、Emails、Password and authentication、SSH/GPGキー、Credentials、Repositories、Organization、Code security、Applications、Codespaces、Packages）、Organizationのトップページ・Settings・People・Repositories・Sponsoring・Packages・Actions Insights
- **その他**: Models画面、検索、フィードバック、Cookie同意、フッター、汎用UI文言

## 翻訳されない範囲と理由

### 1. 動的な文字列（数値・日付・件数）

`"3 commits"` や `"opened 2 days ago"` のような、数値・日付・カウントを含む文言は翻訳しない。

- 完全一致方式のため、可変の数値を含む文字列はそもそも辞書と一致しない。
- 相対時刻（`opened 2 days ago`）はGitHubの`<relative-time>`というカスタム要素のShadow DOM内に描画されており、通常のDOM走査では原理的に到達できない。要素自体も定期的に再描画されるため、仮に書き換えても上書きされる。

一時的に、`"3 commits"` のような数値混じりの文言を正規表現で翻訳する `patterns` 機構を実装したが、以下の理由から撤回した。

1. 安全に翻訳できる対象が実質的に「commits」「1 participant」程度しかなく、実装・保守コストに見合わなかった。
2. スター・フォーク・ウォッチ数、PRタブの件数バッジなどは軒並みテキストノードが分割されており対応不可だった。
3. 数値は元々英語のままでも意味が通じるため、翻訳できないことによるユーザー体験への影響は小さいと判断した。

### 2. ユーザー作成コンテンツ

以下は、たとえ辞書のキーと文字列として完全一致しても、意図的に翻訳対象から除外している。

| 対象 | 除外の仕組み |
|---|---|
| README・Issue・コメント・コードブロック等の本文 | `.markdown-body` を除外セレクタに指定 |
| リポジトリ名リンク | `[data-hovercard-type="repository"]` を除外 |
| ユーザー名リンク | `[data-hovercard-type="user"]` を除外 |
| Issue/PR/Discussionのタイトル | `<bdi>` タグ（GitHubが双方向テキスト対応のため使用）を除外 |
| Issue/PR/Discussion/commitへの個別ページリンク | URLパターン（`/issues/N` 等）で除外 |
| Wikiページ名（見出し・サイドバーのページ一覧・目次） | `.gh-header-title`、`.js-wiki-sidebar-toc-container`、Wikiページ内部リンクのURLパターンで除外 |
| ファイル・ディレクトリ一覧の各行（ファイル名・フォルダ名） | `/tree/`・`/blob/` へのリンクをURLパターンで除外 |
| インラインコード・コードブロック | `pre`、`code` タグを除外 |
| 編集中の入力欄（bio、コメント本文等） | `[contenteditable="true"]`、`<textarea>` の子テキストを除外 |

## 実装上の詳細

以下は、翻訳できないケースや限定的な例外についての、主に保守者向けの説明です。

### GitHub側でテキストノードが分割されているケース

同じ意味の文言でも、GitHub側の実装でテキストノードが複数に分かれていると、完全一致方式では拾えない。

- 例: `"Save"` + `" changes"` が別ノード（"Save"は他の画面で汎用的に使うため、これだけ訳すと「保存 changes」という中途半端な混在表示になる）
- 例: `"3"` + `" stars"` が別ノード（件数バッジ）
- 例: `"Ruleset"` + `" Name"` が別ノード
- 例: Wikiサイドバーの目次アンカーリンク（見出しがそのままリンクテキストになる）

`content.js`はテキストノードを1つずつ独立に走査し、それぞれの前後の空白を除去した上で、改行を含む連続空白を単一スペースに正規化し、その文字列が辞書のキーと完全一致するかだけを見る設計になっている。
そのため、

- 隣接するテキストノードをまたいで文字列を結合する処理がなく、分割された文言をまとめて1つの訳文にできない
- 一部のノードだけ訳すと、"Save" + " changes" → "保存 changes" のように英日混在の中途半端な表示になり、かえって分かりにくくなる

複数ノードの結合・並び替えに対応するには、TreeWalkerで拾った隣接ノード群をどこまで1文として扱うかの判定や、置換後にDOM構造をどう保つか（イベントハンドラやReactの差分検出を壊さないか等）といった設計変更が必要になる。効果に対して複雑さが大きいと判断し、対応しない方針としている。

### ARIA属性・意味のあるタグを持たない要素

`class="f6 tmp-mb-3 color-fg-muted"` のような、CSSクラス名でしか識別できない `<div>`/`<span>` は、方針上翻訳対象にしない。CSSクラス名はGitHub側のリファクタリングで簡単に変わりうるため、これに依存すると壊れやすく、かつ「CSSクラス名に依存しない」という設計方針にも反する。

### 設計方針の例外と限定的な実装依存

原則としてCSSクラス名や`data-testid`には依存しないが、以下の用途ではGitHub固有の目印へ限定的に依存している。

#### ユーザー作成コンテンツや一時的な要素の除外

- `.gh-header-title`（Wikiページ見出し）
- `.js-wiki-sidebar-toc-container`（Wiki自動目次）
- `include-fragment`（GitHubの遅延読み込みカスタム要素。読み込み中プレースホルダーの誤訳・点滅を防止）

これらは誤翻訳のリスクを低減するための防御策であり、ユーザー作成コンテンツが翻訳されないことを完全に保証するものではない。GitHub側のDOM変更で除外が効かなくなると、許可リストに含まれる祖先要素やタグの内側で辞書に一致した文字列が翻訳される可能性がある。

#### 確認済みページでの翻訳範囲の拡張

- `[data-component="FormControl.Caption"]`（ルールセット作成・編集画面限定。Primerの公開コンポーネント仕様の一部として、内部実装用の`data-testid`より変更されにくいと判断）

### ページ単位でスコープを広げている箇所

`nav`/`header`/`button`/`role=...`/`[aria-label]` だけでは拾えない見出し・ラベル・説明文がある画面では、確認済みのページに限定して `h1`〜`h6`/`label`/`a`/`p` 等を追加で許可している（`content.js` の `EXTRA_SELECTOR` / `EXACT_PATH_EXTRA_SELECTOR` / `PATTERN_EXTRA_SELECTOR` を参照）。特に `p` タグは、そのページにユーザー作成コンテンツが紛れ込まないことを個別に確認した上で、画面ごとに許可している。
