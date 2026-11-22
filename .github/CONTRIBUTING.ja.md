[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# GitHub UI Translator への貢献

GitHub UI Translatorの改善に関心を持っていただきありがとうございます。このドキュメントでは、問題の報告方法、翻訳辞書の編集方法、変更をマージするために満たす必要がある条件を説明します。

拡張機能のインストール方法と使い方は[README](/README.ja.md)を参照してください。

## 貢献の方法

| やりたいこと | 場所 |
| --- | --- |
| 動作しない挙動を報告する | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| 対応済み言語の翻訳を提案する | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| 新機能や新しい言語を提案する | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| 質問する・アイデアを相談する | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

空のIssueは無効にしているため、いずれかのテンプレートを選んでください。各テンプレートで、既存のIssueを検索済みであることの確認を求めています。

## 始める前に

まず[翻訳対象の範囲](/docs/translation-scope.ja.md)を読んでください。このプロジェクトで最も重要なルールが定義されています。**この拡張機能はGitHubの固定UIのみを翻訳し、ユーザーが作成したコンテンツは意図的に翻訳しません。**

README・Issue本文・コメント・コードブロック・ファイル名・リポジトリ名・ユーザー名・Wikiページ名は、辞書のキーに完全一致していても意図的に除外しています。これらを翻訳する変更はマージできませんので、コードを書く前に境界を理解しておく価値があります。

## 開発環境の準備

リポジトリをクローンし、開発版として読み込みます。

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: `chrome://extensions`を開き、デベロッパーモードを有効にして「パッケージ化されていない拡張機能を読み込む」から、クローンしたフォルダ（`manifest.json`があるフォルダ）を選択します。
- **Firefox**: `about:debugging#/runtime/this-firefox`を開き、「一時的なアドオンを読み込む」から`manifest.json`を選択します。一時的なアドオンはFirefoxの再起動で削除されるため、セッションごとに読み込み直してください。

拡張機能を読み込んで動かすためのビルドや依存関係のインストールは不要です。ファイルを編集したら拡張機能を再読み込みし、動作確認しているGitHubのページを更新してください。

辞書検証とテストにはNode.jsを使います。テスト用の依存関係はpnpmでインストールしてください。pnpmのバージョンは`package.json`の`packageManager`に合わせます。CIはNode 26を使用しています。

## 辞書の編集

翻訳は`dictionaries/<言語コード>.json`にあります。現在は[`ja.json`](/dictionaries/ja.json)、[`zh-CN.json`](/dictionaries/zh-CN.json)、[`zh-TW.json`](/dictionaries/zh-TW.json)、[`es.json`](/dictionaries/es.json)、[`de.json`](/dictionaries/de.json)、[`pt-BR.json`](/dictionaries/pt-BR.json)、[`ko.json`](/dictionaries/ko.json)、[`fr.json`](/dictionaries/fr.json)、[`ru.json`](/dictionaries/ru.json)の9つです。

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== Repository navigation ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

重要なルールが7つあります。検証スクリプトはファイルから判定できる部分をチェックしますが、それ以外はレビューで確認する必要があります。

**1. すべての辞書のキーが完全に一致している必要があります。** ここが最も引っかかりやすい点です。`ja.json`だけにエントリを追加して他の辞書に追加し忘れると、CIが`missing keys`で失敗します。1つのプルリクエストの中で*すべての*辞書に追加してください。分からない言語の訳を用意できない場合は、キーを欠けさせるのではなく、その旨をプルリクエストに書いてください。

**2. キーは英語の原文と厳密に一致させます。** 照合の前に前後の空白が除去されます。さらに**表示テキスト**に限り、改行を含む連続した空白が単一スペースに正規化されるため、1行で書いたキーがGitHub側で複数行に折り返されたテキストにも一致します。**属性値は正規化されず、`trim()`のみ**です。`aria-label`・`placeholder`・ボタンの`value`・`data-disable-with`は前後の空白を除いた状態でそのまま照合されるため、これらを対象とするキーは内部の空白まで原文どおりに再現する必要があります。キーの前後に空白がある場合は検証スクリプトがエラーにしますが、GitHubの原文や内部の空白と一致するかはレビューで確認する必要があります。

**3. コメントは行まるごとのみです。** ファイルは`//`行コメントを含むJSON（JSONC形式）です。`JSON.parse`はコメントに対応していないため、拡張機能は解析前にコメント行を除去しています。値と同じ行の末尾に書いたコメントは解析エラーになります。

**4. エントリはGitHubの画面ごとにグループ分けします。** 各グループは`// ==== セクション名 ====`のコメントで始まります。新しいエントリはファイル末尾ではなく、該当するグループに追加してください。GitHub側のUIが変わったときに、どのセクションが影響を受けるか把握できるようにするためです。配置は何も検査していないため、誤ったグループに入れてもCIは通ります。

**5. キーは半角スペース4つでインデントします。** 重複キーの検査は生のファイルを1行ずつ読み、このインデントちょうどのキーだけを認識します。インデントが異なってもエラーにはならず、そのキーが重複検査の対象から静かに外れるため、本当の重複が見逃される可能性があります。

**6. 翻訳の連鎖は収束する必要があります。** `"Wiki": "Wiki"`のように、製品名を翻訳せず残す意図を記録するため、訳文が原文と同じになる場合があります。検証スクリプトは、このような自己マッピングをエラーではなく警告として報告します。一方、`A → B → A`のように2つ以上の異なる値を循環する翻訳は収束しないため、エラーになります。循環はしないものの、次の処理でもう一度訳文が変化する連鎖も、確認できるよう警告として報告します。

**7. インラインタグの種類と順序を保ちます。** `<a>`・`<strong>`・`<code>`などのタグを含むキーでは、訳文でも原文と同じ種類・順序でタグを残してください。タグを削除したり並べ替えたりしないでください。拡張機能は既存のDOM要素を並べ替えず、テキストだけを書き換えます。検証スクリプトもタグの種類と順序の一致を検査します。

値は空でない文字列である必要があります。同一ファイル内でのキーの重複はエラーです。

## 翻訳方針

- 訳語は、各言語のネイティブの開発者が実際に使う言葉を優先します。GitHub公式ローカライズの直訳よりも、画面上で自然に読めることを重視してください。
- GitHub公式ドキュメントの訳語と表記は参考にします。[日本語ドキュメント](https://docs.github.com/ja)、[簡体字中国語ドキュメント](https://docs.github.com/zh)、[スペイン語ドキュメント](https://docs.github.com/es)、[ドイツ語ドキュメント](https://docs.github.com/de)、[ポルトガル語ドキュメント](https://docs.github.com/pt)、[韓国語ドキュメント](https://docs.github.com/ko)、[フランス語ドキュメント](https://docs.github.com/fr)、[ロシア語ドキュメント](https://docs.github.com/ru)を参照してください。繁体字中国語の公式ドキュメントはありません。
- 現在のGitHub画面で文脈を確認し、同じ英語キーが使われる既知の箇所も考慮します。1つの辞書キーには1つの訳しか設定できないため、複数の文脈で意味が通る表現を優先してください。
- 既存辞書の関連する訳語と表記を統一し、GitHubが製品名や機能名を原文のまま使用している場合はその表記を維持します。
- 公式ドキュメントと異なる訳語を選んだ場合や、既存の訳語を変える場合は、その理由をプルリクエストに書いてください。メンテナーとネイティブのコントリビューターの意見が分かれたときは、ネイティブの判断を優先します。

## 新しい言語を追加する場合

1. 上記の形式で`dictionaries/<言語コード>.json`を追加します。`language`フィールドは`<言語コード>`と、`name`フィールドは手順2で登録する表示名と一致させる必要があります。
2. [`languages.json`](/languages.json)に`{ "code": "<言語コード>", "name": "<表示名>" }`を追加します。Popupとオプション画面はどちらもこのリストを読み込みます。
3. [`_locales/en/messages.json`](/_locales/en/messages.json)と同じメッセージキーを持つ`_locales/<ロケールコード>/messages.json`を追加します。これは拡張機能自身のUI（Popup、オプション画面、拡張機能の名前と説明）の多言語化で、GitHub翻訳用の辞書とは別の仕組みです。

**ロケールディレクトリ名は辞書のコードと同じとは限りません。** WebExtensionsはアンダースコア区切りの`言語_地域`を要求しますが、辞書のコードはハイフン区切りのBCP 47形式です。既存の例が簡体字中国語とブラジルポルトガル語です。

| | 辞書のコード | ロケールディレクトリ |
| --- | --- | --- |
| 日本語 | `ja` | `_locales/ja` |
| 簡体字中国語 | `zh-CN` | `_locales/zh_CN` |
| 繁体字中国語 | `zh-TW` | `_locales/zh_TW` |
| スペイン語 | `es` | `_locales/es` |
| ドイツ語 | `de` | `_locales/de` |
| ブラジルポルトガル語 | `pt-BR` | `_locales/pt_BR` |
| 韓国語 | `ko` | `_locales/ko` |
| フランス語 | `fr` | `_locales/fr` |
| ロシア語 | `ru` | `_locales/ru` |

`_locales/zh-CN`や`_locales/pt-BR`というディレクトリ名はブラウザに無視されます。これを検出する仕組みはありません。[`scripts/validate.mjs`](/scripts/validate.mjs)は存在するロケールディレクトリ同士でメッセージキーを比較するだけで、`languages.json`のコードとの対応は検査していないためです。拡張機能のUIとメタデータは黙って英語にフォールバックします。

新しい辞書には既存の辞書が持つすべてのキーが必要になるため、大きな変更になります。着手前にFeature requestを作成し、範囲をすり合わせてください。

## 変更の検証

プルリクエストを作成する前に、依存関係をインストールして辞書検証とテストを実行してください。

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

辞書検証（`pnpm run validate`）では、辞書の形式とメタデータ、キーの重複、空・前後に空白があるキー、全辞書間のキーの一致、全`_locales`間のキーの一致、`manifest.json`内の`__MSG_*__`プレースホルダーがすべて解決すること、`shared.js`が`content.js`より先に読み込まれることを検査します。また、自己マッピングと、次の処理でもう一度訳文が変化する翻訳連鎖を警告し、長さ2以上の翻訳サイクルをエラーにします。成功すると言語ごとのエントリ数と、該当する情報提供目的の警告を表示します。インラインタグの種類と順序が原文と一致することも検査します。

一方、セクションの配置、キーのインデント、ロケールディレクトリ名と`languages.json`のコードの対応は**検査しません**。この3点は人の目で確認する必要があります。

CIはすべてのプルリクエストで上記の辞書検証とテスト、およびJavaScriptの構文チェック（`node --check`）を実行します。ローカルで実行しておくと往復を減らせます。

## プルリクエスト

- 作業ブランチは`main`から作成し、プルリクエストは`main`に向けて作成してください。
- `main`には次のリリースに含める変更がたまっていきます。プルリクエストはsquashマージします。
- リリースはメンテナーが行います。`manifest.json`のバージョンを上げるプルリクエストをマージしたあと、`main`に`vX.Y.Z`形式のタグを付けると、リリース用のzipが自動で作成されます。
- コミットメッセージは英語で書いてください。
- 1つのプルリクエストには1つの論理的な変更にとどめてください。ある画面の辞書追加、バグ修正、ドキュメント更新は、1つではなく3つのプルリクエストです。
- 関連するIssueがあればリンクしてください。
- CIが通っている必要があります。
- 翻訳の変更では、変更前後のスクリーンショットがあると非常に助かります。

## ライセンス

貢献していただいた内容は、このプロジェクトの[MITライセンス](/LICENSE)の下でライセンスされることに同意したものとみなします。
