# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md)

GitHub UI Translator is a browser extension (Chrome and Firefox) that translates GitHub's English UI into Japanese using a local dictionary.
It does not rely on external translation APIs or cloud services; all translation runs locally in the browser.

## Features

- Performs all translation locally without sending page content or settings to external services
- Translates fixed GitHub UI text such as navigation items and buttons while avoiding user-created content areas such as READMEs, issues, comments, and code blocks
- Lets you turn translation on or off from the extension popup

## Documentation

- [Translation scope](docs/translation-scope.md) ([Japanese](docs/translation-scope.ja.md))

## Limitations

- Japanese is currently the only supported language. Additional languages are planned after Japanese coverage is more complete.
- Dynamic text containing numbers or dates, such as "3 commits" or "opened 2 days ago", is not translated. User-created content such as user names is also excluded. See [Translation scope](docs/translation-scope.md) for details.
- Only `github.com` is supported. GitHub Enterprise and other custom domains are not supported.
- Tested on Chrome and Firefox. Other Chromium-based browsers (Edge, Brave, etc.) should also work but have not been explicitly tested.

## Installation

### Chrome

Install [GitHub UI Translator from the Chrome Web Store](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk).

If the Chrome Web Store is unavailable in your environment, such as on a company-managed device:

1. Download the `.zip` file from the [latest release](https://github.com/nobuo-miura/github-ui-translator/releases/latest) and extract it.
2. Open `chrome://extensions` in Chrome and turn on Developer mode.
3. Click "Load unpacked" and select the extracted folder.

Extensions installed manually do not update automatically. Repeat these steps when a new version is released. Your organization may also block Developer mode or manually installed extensions; in that case, contact your administrator.

### Firefox

Firefox 142 or later is required.

1. Open the [latest release](https://github.com/nobuo-miura/github-ui-translator/releases/latest) page in Firefox and click the attached `.xpi` file.
2. When the installation confirmation dialog appears, click "Add".

If the dialog does not appear, drag and drop the downloaded `.xpi` file onto the `about:addons` page. The file is signed, so the extension stays installed across Firefox restarts.

Version 0.1.2 and later of the extension check `updates.json` in this repository and install newer signed XPI releases automatically. If you installed version 0.1.1 or earlier, manually install v0.1.2 once to enable future automatic updates.

After installation, open a GitHub page such as `https://github.com/...` and supported UI text will be translated automatically.

### Development install (load from the repository)

To customize the dictionary or contribute, clone the repository and load it directly.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", and select the cloned folder (the one that contains `manifest.json`).
- **Firefox**: open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on…", and select `manifest.json` inside the repository. A temporary add-on is removed when Firefox restarts, so it needs to be reloaded each session.

## Usage

- Click the extension icon in the toolbar to open the on/off toggle and the language selector. Only Japanese is bundled today; the dropdown is ready for additional languages once more dictionaries are added.
- Changing the toggle or the language reloads open GitHub tabs so the new setting takes effect.
- The popup also has a link to this repository.
- Open the extension options page (`chrome://extensions` on Chrome, `about:addons` on Firefox) to view the bundled dictionary information and extension version.

## Customizing the Dictionary

You can add or change translations by editing `dictionaries/ja.json` directly.
Entries are grouped into sections by GitHub screen (repository navigation, repository Settings, organization Settings, etc.), each preceded by a `// ====` comment line, so you can tell at a glance which screen an entry belongs to and quickly spot when GitHub's UI text changes.

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

- The file is JSON with `//` line comments (JSONC-style). Only whole-line comments are supported — trailing comments after a value on the same line are not. The extension strips comment lines before parsing, since standard `JSON.parse`/`fetch().json()` do not support comments.
- Dictionary keys must match the original English text exactly. Before matching, leading and trailing whitespace is ignored and consecutive whitespace—including line breaks—is collapsed to a single space. Dictionary keys themselves must not contain leading or trailing whitespace.
- After editing the dictionary, reload the extension (`chrome://extensions` on Chrome, `about:debugging` on Firefox).

### Adding a new language

1. Add `dictionaries/<code>.json` (e.g. `dictionaries/en.json`) in the same format.
2. Add `{ "code": "<code>", "name": "<display name>" }` to `languages.json`. The popup and options page both load this shared list.
3. Run `node scripts/validate.mjs` to check the dictionary format, duplicate keys, metadata, and key parity with the other bundled dictionaries.

The popup, options page, and extension metadata use the browser extension `_locales` mechanism independently of the GitHub translation dictionaries. To add a new language for the extension's own UI, also add `_locales/<code>/messages.json` with the same message keys as `_locales/en/messages.json`.

## Project Structure

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # Shared language list and extension UI localization helpers
├─ languages.json   # Bundled GitHub translation languages
├─ content.js       # Translation engine that scans the DOM using an allowlist
├─ popup.html/js    # Toolbar popup with the translation toggle
├─ options.html/js  # Dictionary information and version display
├─ updates.json     # Update manifest for the self-distributed Firefox extension
├─ _locales/        # Localized popup, options, and extension metadata messages
├─ dictionaries/
│  └─ ja.json       # Japanese dictionary
├─ docs/
│  ├─ translation-scope.md     # English version
│  └─ translation-scope.ja.md  # Japanese version
├─ scripts/
│  └─ validate.mjs  # Dictionary and localization validation
└─ icons/
```

## License

[MIT License](./LICENSE)
