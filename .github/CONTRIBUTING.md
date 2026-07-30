[English](CONTRIBUTING.md) | [日本語](CONTRIBUTING.ja.md)

# Contributing to GitHub UI Translator

Thank you for your interest in improving GitHub UI Translator. This document covers how to report problems, how to edit the translation dictionaries, and what your changes need to satisfy before they can be merged.

For how to install and use the extension, see the [README](../README.md).

## Ways to contribute

| What you want to do | Where to go |
| --- | --- |
| Report behavior that does not work | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| Suggest a translation for existing languages | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| Suggest a new feature or a new language | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| Ask a question or discuss an idea | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

Blank issues are disabled, so please pick the template that fits. Search the existing issues first — every template asks you to confirm this.

## Before you start

Read [Translation Scope](../docs/translation-scope.md) first. It defines the single most important rule in this project: **the extension translates fixed GitHub UI text only, and deliberately leaves user-created content untranslated.**

READMEs, issue bodies, comments, code blocks, file names, repository names, user names, and Wiki page titles are excluded on purpose, even when they exactly match a dictionary key. A change that translates any of these will not be merged, so it is worth understanding the boundary before you write code.

## Development setup

Clone the repository and load it as an unpacked extension.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", and select the cloned folder (the one containing `manifest.json`).
- **Firefox**: open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on…", and select `manifest.json`. A temporary add-on is removed when Firefox restarts, so reload it each session.

There is no build step and no dependency to install. After editing any file, reload the extension and refresh the GitHub page you are testing against.

Node.js is needed only to run the validator. CI uses Node 26.

## Editing the dictionaries

Translations live in `dictionaries/<code>.json` — currently [`ja.json`](../dictionaries/ja.json) and [`zh-CN.json`](../dictionaries/zh-CN.json).

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

Six rules matter. The validator checks the parts it can determine from the files; the remaining parts need care in review.

**1. Every dictionary must contain exactly the same set of keys.** This is the rule contributors trip over most often. If you add an entry to `ja.json` and not to `zh-CN.json`, CI fails with `missing keys`. Add the entry to *every* dictionary in the same pull request. If you cannot translate it into a language you do not speak, say so in the pull request rather than leaving the key out.

**2. Keys must match the original English text exactly.** Leading and trailing whitespace is trimmed before matching. For **visible text** the extension additionally collapses runs of whitespace — including line breaks — into a single space, so a key written on one line can match text that GitHub renders across several lines. **Attribute values are only trimmed, not collapsed**: `aria-label`, `placeholder`, button `value`, and `data-disable-with` are looked up as-is apart from surrounding whitespace, so a key intended for one of those must reproduce its internal spacing exactly. The validator rejects keys with leading or trailing whitespace, but whether a key matches GitHub's original text and internal spacing needs to be checked in review.

**3. Comments are whole-line only.** The files are JSON with `//` line comments (JSONC-style). The extension strips comment lines before parsing, because `JSON.parse` does not support comments. A trailing comment after a value on the same line will break parsing.

**4. Keep entries grouped by GitHub screen.** Each group is introduced by a `// ==== Section name ====` comment. Add new entries to the group they belong to rather than to the end of the file; this is what makes it possible to spot which section is affected when GitHub changes its UI. Nothing checks placement — an entry in the wrong group passes CI.

**5. Indent keys with four spaces.** The duplicate-key check reads the raw file line by line and recognizes keys only at that exact indentation. Different indentation does not raise an error; it silently removes those keys from the duplicate check, so a genuine duplicate can slip through unnoticed.

**6. Translation chains must converge.** A translation may intentionally be identical to its source—for example, `"Wiki": "Wiki"` records that the product name should remain untranslated. The validator reports these self-mappings as warnings, not errors. A cycle of two or more different values, such as `A → B → A`, never converges and is rejected. A non-cyclic chain whose output changes again on the next pass is also reported as a warning so that it can be reviewed.

Values must be non-empty strings. Duplicate keys within one file are an error.

## Translation guidelines

- When the same term appears in the official GitHub Docs, use its localized wording and capitalization as the primary reference. See the [Japanese documentation](https://docs.github.com/ja) and [Simplified Chinese documentation](https://docs.github.com/zh).
- Check the term on the current GitHub screen and consider every known place where the same English key appears. Because one dictionary key has one translation, prefer wording that remains clear across those contexts.
- Keep terminology consistent with related entries in the existing dictionary and preserve official product and feature names where GitHub does.
- GitHub Docs are a reference, not an absolute rule. If the documented wording is unnatural in the UI or does not fit the current context, prefer a clear, natural translation and explain the reason in the pull request.

## Adding a new language

1. Add `dictionaries/<code>.json` in the format above. Its `language` field must equal `<code>` and its `name` field must equal the display name you register in step 2.
2. Add `{ "code": "<code>", "name": "<display name>" }` to [`languages.json`](../languages.json). The popup and the options page both read this list.
3. Add `_locales/<locale-code>/messages.json` with the same message keys as [`_locales/en/messages.json`](../_locales/en/messages.json). This localizes the extension's own UI — the popup, the options page, and the extension name and description — and is separate from the GitHub translation dictionaries.

**The locale directory name is not always the same as the dictionary code.** WebExtensions requires `language_REGION` with an underscore, while dictionary codes use the BCP 47 form with a hyphen. Simplified Chinese is the existing example:

| | Dictionary code | Locale directory |
| --- | --- | --- |
| Japanese | `ja` | `_locales/ja` |
| Simplified Chinese | `zh-CN` | `_locales/zh_CN` |

A directory named `_locales/zh-CN` is ignored by the browser. Nothing catches this: `scripts/validate.mjs` compares message keys between whatever locale directories exist, but never checks them against the codes in `languages.json`. The extension UI and metadata silently fall back to English.

The new dictionary needs every key that the existing dictionaries have, so this is a large change. Please open a Feature request before starting so we can agree on scope.

## Validating your changes

Run the validator before opening a pull request:

```bash
node scripts/validate.mjs
```

It checks dictionary format and metadata, duplicate keys, empty or whitespace-padded keys, key parity across all dictionaries, key parity across all `_locales`, that every `__MSG_*__` placeholder in `manifest.json` resolves, and that `shared.js` loads before `content.js`. It also warns about self-mappings and translation chains that change again on the next pass, and rejects translation cycles of length two or greater. On success it prints the entry count per language and any informational warnings.

It does **not** check section placement, key indentation, or whether locale directory names correspond to the codes in `languages.json`. Those three need a human eye.

CI runs the same command on every pull request, along with `node --check` on each JavaScript file. Running it locally saves you a round trip.

## Pull requests

- `main` represents the current released version. For ordinary development, create your branch from the current `vX.Y.Z` development branch and open the pull request against that same development branch.
- If no `vX.Y.Z` development branch currently exists, ask the maintainers which branch to use before starting work. Do not target `main` by default.
- At release time, the maintainers open a pull request from the `vX.Y.Z` development branch to `main`. Do not target `main` directly unless you are preparing that release pull request.
- Write commit messages in English.
- Keep one logical change per pull request. Dictionary additions for a GitHub screen, a bug fix, and a documentation update are three pull requests, not one.
- Link the related issue if there is one.
- CI must pass.
- Screenshots of the before and after state are very helpful for translation changes.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](../LICENSE) that covers this project.
