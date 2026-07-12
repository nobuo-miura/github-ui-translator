# Privacy Policy — GitHub UI Translator

[English](PRIVACY.md) | [日本語](PRIVACY.ja.md)

Last updated: July 12, 2026

## Summary

**GitHub UI Translator does not collect or transmit personal or sensitive user data. It stores only the extension's on/off state and selected language locally on your device.**

## Details

### No data collection

This extension does not collect any personal information, browsing history, page content, or usage analytics. There is no telemetry of any kind.

### No external communication for translation

All translation is performed entirely within your browser using dictionary files bundled with the extension. The extension makes no network requests to translation APIs, analytics services, or cloud services, and the content of the pages you view never leaves your browser.

Firefox may periodically request update metadata from GitHub to check for a newer signed version of the extension. This standard browser update request does not include page content, browsing history, or extension settings.

### Page content is processed locally only

To perform translation, the extension accesses visible GitHub UI text (such as labels, buttons, and menu items) only to translate it locally in your browser. Page content is not recorded, retained, or transmitted.

### Local settings only

The extension stores two settings — the translation on/off state and the selected language — using the browser's extension storage (`chrome.storage.local` / `browser.storage.local`). These settings remain on your device and are never transmitted anywhere.

### Permissions

- **storage**: Used solely to save the on/off state and language selection described above.
- **Host access to `https://github.com/*`**: Required to run the translation script on GitHub pages. It is used only to replace UI text with translations from the bundled dictionaries and to reload GitHub tabs when you change settings.

### No third parties

No data is shared with, sold to, or processed by any third party, because no data ever leaves your device.

## Changes to this policy

If this policy ever changes (for example, if a future version adds an optional online feature), the changes will be described here and in the release notes before they take effect.

## Contact

If you have any questions about this policy, please open an issue at:
https://github.com/nobuo-miura/github-ui-translator/issues
