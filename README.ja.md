# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md)

GitHubの英語UIを、ローカル辞書を使って日本語に翻訳するブラウザ拡張機能です（Chrome / Firefox対応）。
外部の翻訳APIやクラウドサービスには一切依存せず、すべてブラウザ内で完結します。

現在はMVP（Minimum Viable Product）です。

## 特徴

- 完全ローカル動作（外部通信なし）
- GitHub本文（README・Issue・コメント・コードブロックなど）には一切手を加えず、ナビゲーションやボタンなど固定UI文言のみを翻訳
- 翻訳のON/OFFをワンクリックで切り替え可能

## できないこと（MVPの制限事項）

- 日本語以外の言語には対応していません
- "3 commits" や "opened 2 days ago" のような、数値・日付・ユーザー名を含む動的な文言は翻訳されません（英語のまま表示されます）
- `github.com` 以外のドメイン（GitHub Enterprise等）には対応していません
- Chrome・Firefoxで動作確認済みです。その他のChromium系ブラウザ（Edge・Brave等）も動くと思われますが、明示的な検証はしていません

## インストール方法（開発者モード）

1. このリポジトリをクローンまたはダウンロードする
   ```
   git clone https://github.com/nobuo-miura/github-ui-translator.git
   ```

### Chrome

2. Chromeで `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をONにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、クローンしたフォルダ（`manifest.json` があるフォルダ）を選択する
5. GitHubのページ（`https://github.com/...`）を開くと、自動的にUIが日本語化される

### Firefox

2. Firefoxで `about:debugging#/runtime/this-firefox` を開く
3. 「一時的なアドオンを読み込む…」をクリックし、このリポジトリ内の `manifest.json` を選択する
4. GitHubのページ（`https://github.com/...`）を開くと、自動的にUIが日本語化される
5. 注意: 一時的なアドオンはFirefoxを再起動すると消えます。addons.mozilla.orgで署名・インストールしない限り、セッションごとに`about:debugging`から読み込み直す必要があります

## 使い方

- ツールバーの拡張機能アイコンをクリックすると、翻訳のON/OFFトグルと言語選択が表示される（現時点では日本語のみ）
- トグルまたは言語を変更すると、そのタブが自動的に再読み込みされる
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
├─ dictionaries/
│  └─ ja.json       … 日本語辞書
└─ icons/
```

## ライセンス

[MIT License](./LICENSE)
