[English](translation-scope.md) | [日本語](translation-scope.ja.md)

# Translation Scope

This document explains what GitHub UI Translator translates and what it intentionally leaves unchanged.
For implementation details, see `content.js` and `dictionaries/ja.json`.

The extension uses its dictionary only for fixed GitHub UI text. User-created content and dynamic text are generally left in the original language.

## Core principles

- **Allowlist-based scanning**: The extension scans only semantic HTML elements and ARIA roles such as `nav`, `header`, `button`, and `role="tab"`. The allowlist generally does not rely on CSS class names or `data-testid` attributes.
- **Exact matches only**: Text is replaced only when the string, after trimming leading and trailing whitespace and collapsing consecutive whitespace to a single space, exactly matches a dictionary key. If there is no match, the original text remains unchanged.
- **User-created content is excluded**: The extension actively excludes content such as READMEs, issue bodies, comments, code blocks, file names, repository names, user names, and Wiki page titles, even when the text exactly matches a dictionary key.

## What is translated

Fixed GitHub UI text—such as navigation items, buttons, headings, labels, and form descriptions—is added to the dictionary after being verified on each supported page. As of July 2026, the Japanese dictionary contains **1,293 entries**. Run `node scripts/validate.mjs` to confirm the current count.

The main supported areas, corresponding to section headings in `dictionaries/ja.json`, include:

- **Repositories**: Repository navigation tabs such as Code, Issues, Pull requests, Discussions, Actions, Projects, and Wiki; issue and pull request lists, detail pages, and creation forms; the Markdown editor toolbar; diffs; Discussions; the Wiki editor and empty-state landing page; Milestones; and Labels
- **Repository administration**: Settings pages including General, Access, Danger Zone, Rules, Actions, Pages, secrets and variables, deploy keys, webhooks, Copilot, advanced security, collaborators and teams, and moderation options; Insights pages including Pulse, Community, Graphs, and Network; and Security pages
- **Personal and organization areas**: User settings including Public profile, Account, Appearance, Accessibility, Notifications, Billing, Emails, Password and authentication, SSH and GPG keys, Credentials, Repositories, Organizations, Code security, Applications, Codespaces, and Packages; as well as organization landing pages, Settings, People, Repositories, Sponsoring, Packages, and Actions Insights
- **Other areas**: Models, search, feedback, cookie consent, the footer, and common UI text

## What is not translated, and why

### 1. Dynamic text containing numbers, dates, or counts

Dynamic strings such as `"3 commits"` and `"opened 2 days ago"` are not translated.

- Because translation requires an exact dictionary match, strings containing variable numbers do not match dictionary entries.
- Relative times such as `opened 2 days ago` are rendered inside the Shadow DOM of GitHub's `<relative-time>` custom element. Standard DOM traversal cannot reach that text, and the element periodically renders it again, overwriting any attempted change.

The extension briefly included a `patterns` mechanism that used regular expressions to translate text containing numbers, such as `"3 commits"`. It was removed for the following reasons:

1. The only strings that could be translated safely were effectively limited to cases such as "commits" and "1 participant," which did not justify the implementation and maintenance cost.
2. Star, fork, and watch counts, along with pull request count badges, generally split their text across multiple text nodes and could not be handled by the mechanism.
3. Numeric information remains understandable in English, so leaving it untranslated has little effect on usability.

### 2. User-created content

The following content is intentionally excluded even when its text exactly matches a dictionary key.

| Content | How it is excluded |
|---|---|
| README, issue, comment, and code block content | Exclude elements inside `.markdown-body` |
| Repository name links | Exclude `[data-hovercard-type="repository"]` |
| User name links | Exclude `[data-hovercard-type="user"]` |
| Issue, pull request, and discussion titles | Exclude `<bdi>`, which GitHub uses for bidirectional text isolation |
| Links to individual issues, pull requests, discussions, and commits | Exclude matching URL patterns such as `/issues/N` |
| Wiki page names in headings, sidebars, and tables of contents | Exclude `.gh-header-title`, `.js-wiki-sidebar-toc-container`, and matching internal Wiki links |
| File and directory names in repository listings | Exclude links matching `/tree/` and `/blob/` URL patterns |
| Inline code and code blocks | Exclude `pre` and `code` elements |
| Editable fields such as bios and comment bodies | Exclude `[contenteditable="true"]` and text inside `<textarea>` elements |

## Implementation details

The following sections are primarily intended for maintainers. They describe cases the extension cannot translate and the limited exceptions to its general design rules.

### Text split across multiple nodes

Even when text represents a single phrase, exact matching cannot handle it if GitHub splits the phrase across multiple text nodes.

- Example: `"Save"` and `" changes"` are separate nodes. Because "Save" is also used independently on other pages, translating it alone would produce a mixed-language label such as "保存 changes."
- Example: `"3"` and `" stars"` are separate nodes in a count label.
- Example: `"Ruleset"` and `" Name"` are separate nodes.
- Example: Links in a Wiki sidebar table of contents use user-created headings as their link text.

`content.js` scans each text node independently. It trims surrounding whitespace, collapses consecutive whitespace—including line breaks—to a single space, and then checks whether the resulting string exactly matches a dictionary key.

As a result:

- It does not combine adjacent text nodes into a single phrase for translation.
- Translating only one node could produce a confusing mixed-language label such as `"保存 changes"`.

Supporting combined or reordered nodes would require a broader design change: the extension would need to determine which adjacent nodes form a single sentence and replace their content without breaking event handlers or React's DOM reconciliation. The added complexity is not justified by the limited benefit, so this behavior is intentionally unsupported.

### Elements without ARIA attributes or semantic tags

The extension does not translate plain `<div>` or `<span>` elements that can be identified only through CSS classes such as `class="f6 tmp-mb-3 color-fg-muted"`. CSS classes can change during GitHub refactoring, making them fragile selectors and conflicting with the project's policy of avoiding CSS-class dependencies.

### Limited implementation-specific exceptions

The extension generally avoids CSS class names and `data-testid` attributes, but it relies on a small number of GitHub-specific markers for the following purposes.

#### Excluding user-created content and temporary elements

- `.gh-header-title` for Wiki page titles
- `.js-wiki-sidebar-toc-container` for automatically generated Wiki tables of contents
- `include-fragment`, GitHub's custom element for deferred content, to prevent mistranslation and flickering of loading placeholders

These safeguards reduce the risk of mistranslation; they do not guarantee that user-created content can never be translated. If a GitHub DOM change causes an exclusion to stop matching, a string inside an allowlisted ancestor or element could be translated when it matches a dictionary key.

#### Extending translation on a verified page

- `[data-component="FormControl.Caption"]` on repository ruleset creation and editing pages. This attribute is part of Primer's published component interface and is expected to be more stable than an internal `data-testid`.

### Page-specific scope extensions

Some pages contain fixed headings, labels, and descriptions that are not covered by `nav`, `header`, `button`, ARIA roles, or `[aria-label]`. On individually verified pages, the extension expands the allowlist to elements such as `h1`–`h6`, `label`, `a`, and `p`. See `EXTRA_SELECTOR`, `EXACT_PATH_EXTRA_SELECTOR`, and `PATTERN_EXTRA_SELECTOR` in `content.js`.

The `p` element is enabled only on pages that have been checked to ensure that user-created content does not appear in those elements.
