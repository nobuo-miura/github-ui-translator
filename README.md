# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md)

GitHub UI Translator is a browser extension (Chrome and Firefox) that translates GitHub's English UI into Japanese using a local dictionary.
It does not rely on external translation APIs or cloud services; all translation runs locally in the browser.

This project is currently an MVP (Minimum Viable Product).

## Features

- Runs entirely locally, with no external network requests
- Translates fixed GitHub UI text such as navigation items and buttons while avoiding content areas such as READMEs, issues, comments, and code blocks
- Lets you turn translation on or off from the extension popup

## Current Limitations

- Only Japanese is supported.
- Dynamic text that includes numbers, dates, or user names, such as "3 commits" or "opened 2 days ago", is not translated.
- Only `github.com` is supported. GitHub Enterprise and other custom domains are not supported.
- Tested on Chrome and Firefox. Other Chromium-based browsers (Edge, Brave, etc.) should also work but have not been explicitly tested.

## Installation

1. Clone or download this repository.
   ```sh
   git clone https://github.com/nobuo-miura/github-ui-translator.git
   ```

### Chrome

2. Open `chrome://extensions` in Chrome.
3. Turn on Developer mode.
4. Click "Load unpacked" and select the folder that contains `manifest.json`.
5. Open a GitHub page such as `https://github.com/...`. Supported UI text will be translated automatically.

### Firefox

2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click "Load Temporary Add-on…" and select the `manifest.json` file inside this repository.
4. Open a GitHub page such as `https://github.com/...`. Supported UI text will be translated automatically.
5. Note: a temporary add-on is removed when Firefox restarts. It needs to be reloaded from `about:debugging` each session unless it is signed and installed via addons.mozilla.org.

## Usage

- Click the extension icon in the toolbar to open the on/off toggle and the language selector. Only Japanese is bundled today; the dropdown is ready for additional languages once more dictionaries are added.
- Changing the toggle or the language reloads the active GitHub tab.
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
- Dictionary keys must match the original English text exactly. Leading and trailing whitespace is ignored.
- After editing the dictionary, reload the extension (`chrome://extensions` on Chrome, `about:debugging` on Firefox).

### Adding a new language

1. Add `dictionaries/<code>.json` (e.g. `dictionaries/en.json`) in the same format.
2. Add `{ code: '<code>', name: '<display name>' }` to the `AVAILABLE_LANGUAGES` array in both `popup.js` and `options.js`. The extension cannot list the `dictionaries/` folder at runtime, so this list is maintained by hand.

## Project Structure

```text
github-ui-translator/
├─ manifest.json
├─ content.js       # Translation engine that scans the DOM using an allowlist
├─ popup.html/js    # Toolbar popup with the translation toggle
├─ options.html/js  # Dictionary information and version display
├─ dictionaries/
│  └─ ja.json       # Japanese dictionary
└─ icons/
```

## License

[MIT License](./LICENSE)
