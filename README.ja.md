# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md)

GitHubの英語UIを、ローカル辞書を使って日本語に翻訳するブラウザ拡張機能です（Chrome / Firefox対応）。
外部の翻訳APIやクラウドサービスには一切依存せず、すべてブラウザ内で完結します。

現在はMVP（Minimum Viable Product）です。

## 特徴

- 翻訳は完全ローカルで動作し、ページ内容や設定を外部サービスへ送信しない
- GitHub本文（README・Issue・コメント・コードブロックなど）には一切手を加えず、ナビゲーションやボタンなど固定UI文言のみを翻訳
- 翻訳のON/OFFをワンクリックで切り替え可能

## できないこと（MVPの制限事項）

- 日本語以外の言語には対応していません
- "3 commits" や "opened 2 days ago" のような、数値・日付・ユーザー名を含む動的な文言は翻訳されません（英語のまま表示されます）
- `github.com` 以外のドメイン（GitHub Enterprise等）には対応していません
- Chrome・Firefoxで動作確認済みです。その他のChromium系ブラウザ（Edge・Brave等）も動くと思われますが、明示的な検証はしていません

## インストール方法

### Chrome

[Chrome ウェブストア](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)からインストールしてください。

社内端末など、Chrome ウェブストアを利用できない環境では、以下の手順で手動インストールできます。

1. [最新リリース](https://github.com/nobuo-miura/github-ui-translator/releases/latest)から `.zip` ファイルをダウンロードして展開する
2. Chromeで `chrome://extensions` を開き、右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリックし、展開したフォルダを選択する

手動でインストールした拡張機能は自動更新されません。新しいバージョンが公開されたら、同じ手順で入れ替えてください。組織のポリシーによってデベロッパーモードや手動インストールも禁止されている場合は、管理者に確認してください。

### Firefox

1. Firefoxで[最新リリース](https://github.com/nobuo-miura/github-ui-translator/releases/latest)ページを開き、添付されている `.xpi` ファイルをクリックする
2. インストールの確認ダイアログが表示されたら「追加」を選択する

ダイアログが表示されない場合は、ダウンロードした `.xpi` ファイルを `about:addons` の画面にドラッグ&ドロップしてください。署名済みのため、インストール後はFirefoxを再起動しても有効なままです。

自動更新対応版では、このリポジトリの`updates.json`を確認し、新しい署名済みXPIへ自動更新します。バージョン0.1.1以前をインストールしている場合は、最初の自動更新対応版のみ手動でインストールしてください。以降は自動更新されます。

インストール後、GitHubのページ（`https://github.com/...`）を開くと自動的にUIが日本語化されます。

### 開発用（リポジトリから直接読み込む）

辞書のカスタマイズや開発に参加する場合は、リポジトリをクローンして読み込みます。

```
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: `chrome://extensions` →「デベロッパーモード」ON →「パッケージ化されていない拡張機能を読み込む」でクローンしたフォルダ（`manifest.json` があるフォルダ）を選択
- **Firefox**: `about:debugging#/runtime/this-firefox` →「一時的なアドオンを読み込む…」でリポジトリ内の `manifest.json` を選択（一時的なアドオンはFirefoxを再起動すると消えるため、セッションごとに読み込み直す必要があります）

## 使い方

- ツールバーの拡張機能アイコンをクリックすると、翻訳のON/OFFトグルと言語選択が表示される（現時点では日本語のみ）
- トグルまたは言語を変更すると、開いているGitHubのタブが自動的に再読み込みされ、設定が反映される
- Popup下部にはこのリポジトリへのリンクがある
- 拡張機能のオプション画面（Chromeは`chrome://extensions`の詳細から、Firefoxは`about:addons`から開く）で、同梱している辞書の情報とバージョンを確認できる

## 辞書のカスタマイズ

`dictionaries/ja.json` を直接編集することで、翻訳される文言を追加・変更できます。
エントリはGitHubの画面（リポジトリナビゲーション、リポジトリSettings、Organization Settingsなど）ごとにセクション分けされており、各セクションの先頭に `// ====` というコメント行を入れています。どの文言がどの画面のものか一目で分かり、GitHub側のUI変更にも気付きやすくなっています。

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== リポジトリナビゲーション ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- このファイルは`//`行コメント付きのJSON（JSONC形式）です。行全体がコメントである場合のみ対応しており、値の後ろに続けて書くコメントには対応していません。標準の`JSON.parse`/`fetch().json()`はコメントを解釈できないため、拡張機能側でコメント行を除去してから読み込んでいます
- キーは英語の原文と**完全一致**している必要があります（前後の空白は自動的に無視されます）
- 編集後は拡張機能を再読み込みしてください（Chromeは`chrome://extensions`、Firefoxは`about:debugging`から）

### 新しい言語を追加する場合

1. 同じ形式で`dictionaries/<言語コード>.json`（例: `dictionaries/en.json`）を追加する
2. `popup.js`と`options.js`の両方にある`AVAILABLE_LANGUAGES`配列に`{ code: '<言語コード>', name: '<表示名>' }`を追加する。拡張機能は実行時に`dictionaries/`フォルダの中身を一覧取得できないため、この配列は手動で管理する必要がある

## ディレクトリ構成

```
github-ui-translator/
├─ manifest.json
├─ content.js       … 翻訳エンジン本体（許可リスト方式でDOMを走査）
├─ popup.html/js    … ツールバーのON/OFFトグル
├─ options.html/js  … 辞書情報・バージョン表示
├─ updates.json     … Firefox自己配布版の更新マニフェスト
├─ dictionaries/
│  └─ ja.json       … 日本語辞書
└─ icons/
```

## ライセンス

[MIT License](./LICENSE)
