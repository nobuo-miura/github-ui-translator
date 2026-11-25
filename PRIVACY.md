# Privacy Policy — GitHub UI Translator

[English](PRIVACY.md) | [日本語](PRIVACY.ja.md)

Last updated: November 25, 2026

## Summary

**GitHub UI Translator does not collect or transmit personal or sensitive user data. It stores only your settings and the translations you edit yourself (your user dictionary) locally on your device.**

## Details

### No data collection

This extension does not collect any personal information, browsing history, page content, or usage analytics. There is no telemetry of any kind.

### No external communication for translation

All translation is performed entirely within your browser using dictionary files bundled with the extension. The extension makes no network requests to translation APIs, analytics services, or cloud services, and the content of the pages you view never leaves your browser.

### Page content is processed locally only

To perform translation, the extension accesses visible GitHub UI text (such as labels, buttons, and menu items) only to translate it locally in your browser. Page content is not recorded, retained, or transmitted.

### Local settings only

The extension stores the following using the browser's extension storage (`chrome.storage.local` / `browser.storage.local`):

- Settings: the translation on/off state, the selected language, the global header translation on/off state, whether to show the original text on hover, and whether to edit translations with Alt+click
- Your user dictionary: translations you changed on the options page or with Alt+click, including the English UI text they apply to, the bundled translation at the time of the edit, and the time of the edit

This data remains on your device, and the extension never transmits it automatically. Parts of your user dictionary are sent only when you choose "Suggest on GitHub" (see the next section). The extension does not use `storage.sync`, so it is not synchronized across devices. When you export your user dictionary, the file is saved only where you choose.

### Suggesting improvements on GitHub

When you choose "Suggest on GitHub", the extension opens GitHub's new issue page for this project in a new tab, with the English UI text, the bundled translation, and your suggested translation filled in. This content is included in the URL of the new issue page, so it is sent to GitHub when the page opens and is handled under GitHub's privacy policy. The extension uses no tokens or APIs. No issue is created or made public unless you review the page and submit the issue yourself, signed in to GitHub. The URL of the page you were viewing is not included.

### Permissions

- **storage**: Used solely to save the settings and user dictionary described above.
- **Host access to `https://github.com/*`**: Required to run the translation script on GitHub pages. It is used only to replace UI text with translations from the bundled dictionaries and to reload GitHub tabs when you change settings.

### Sending data to third parties

Only when you choose "Suggest on GitHub" does the extension send the English UI text, the bundled translation, and your suggested translation to GitHub. Apart from this, the extension does not transmit stored settings or your user dictionary to third parties. No data is sold.

## Changes to this policy

If this policy ever changes (for example, if a future version adds an optional online feature), the changes will be described here and in the release notes before they take effect.

## Contact

If you have any questions about this policy, please open an issue at:
https://github.com/nobuo-miura/github-ui-translator/issues
