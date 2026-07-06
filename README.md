# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md)

GitHub UI Translator is a Chrome extension that translates GitHub's English UI into Japanese using a local dictionary.
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
- Browsers other than Chrome have not been tested.

## Installation

1. Clone or download this repository.
   ```sh
   git clone <repository-url>
   ```
2. Open `chrome://extensions` in Chrome.
3. Turn on Developer mode.
4. Click "Load unpacked" and select the folder that contains `manifest.json`.
5. Open a GitHub page such as `https://github.com/...`. Supported UI text will be translated automatically.

## Usage

- Click the extension icon in the toolbar to open the on/off toggle.
- When translation is turned off, the active GitHub tab is reloaded and shown in the original English UI.
- Open the extension options page from `chrome://extensions` to view the bundled dictionary information and extension version.

## Customizing the Dictionary

You can add or change translations by editing `dictionaries/ja.json` directly.

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

- Dictionary keys must match the original English text exactly. Leading and trailing whitespace is ignored.
- After editing the dictionary, reload the extension from `chrome://extensions`.

## Project Structure

```text
github-ui-translator/
├─ manifest.json
├─ content.js       # Translation engine that scans the DOM using an allowlist
├─ background.js    # Sets the default enabled state on installation
├─ popup.html/js    # Toolbar popup with the translation toggle
├─ options.html/js  # Dictionary information and version display
├─ dictionaries/
│  └─ ja.json       # Japanese dictionary
└─ icons/
```

## License

[MIT License](./LICENSE)
