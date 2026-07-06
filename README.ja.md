# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md)

GitHubの英語UIを、ローカル辞書を使って日本語に翻訳するChrome拡張機能です。
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
- Chrome以外のブラウザでの動作は未検証です

## インストール方法（開発者モード）

1. このリポジトリをクローンまたはダウンロードする
   ```
   git clone <このリポジトリのURL>
   ```
2. Chromeで `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をONにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、クローンしたフォルダ（`manifest.json` があるフォルダ）を選択する
5. GitHubのページ（`https://github.com/...`）を開くと、自動的にUIが日本語化される

## 使い方

- ツールバーの拡張機能アイコンをクリックすると、翻訳のON/OFFトグルが表示される
- OFFにすると、次にそのタブが再読み込みされたタイミングで原文（英語）表示に戻る
- `chrome://extensions` の詳細から「拡張機能のオプション」を開くと、同梱している辞書の情報とバージョンを確認できる

## 辞書のカスタマイズ

`dictionaries/ja.json` を直接編集することで、翻訳される文言を追加・変更できます。

```json
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    "Code": "コード",
    "Issues": "課題"
  }
}
```

- キーは英語の原文と**完全一致**している必要があります（前後の空白は自動的に無視されます）
- 編集後は `chrome://extensions` の該当拡張機能で「再読み込み」を行ってください

## ディレクトリ構成

```
github-ui-translator/
├─ manifest.json
├─ content.js       … 翻訳エンジン本体（許可リスト方式でDOMを走査）
├─ background.js    … インストール時の初期設定
├─ popup.html/js    … ツールバーのON/OFFトグル
├─ options.html/js  … 辞書情報・バージョン表示
├─ dictionaries/
│  └─ ja.json       … 日本語辞書
└─ icons/
```

## ライセンス

[MIT License](./LICENSE)
