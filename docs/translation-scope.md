[English](translation-scope.md) | [日本語](translation-scope.ja.md)

# Translation Scope

This document explains what GitHub UI Translator translates and what it intentionally leaves unchanged.
For implementation details, see `content.js` and `dictionaries/ja.json` (other language dictionaries follow the same format).

The extension uses its dictionary only for fixed GitHub UI text. User-created content and dynamic text are generally left in the original language.

## Core principles

- **Allowlist-based scanning**: The extension scans only semantic HTML elements and ARIA roles such as `nav`, `header`, `button`, and `role="tab"`. The allowlist generally does not rely on CSS class names or `data-testid` attributes.
- **Exact matches only**: Visible text and supported attribute values are replaced only when they exactly match a dictionary key after trimming leading and trailing whitespace. For visible text only, consecutive whitespace—including line breaks—is also collapsed to a single space before lookup. Attribute values such as `aria-label`, `placeholder`, button `value`, and `data-disable-with` retain their internal whitespace. If there is no match, the original value remains unchanged.
- **User-created content is excluded**: The extension actively excludes content such as READMEs, issue bodies, comments, code blocks, file names, repository names, user names, and Wiki page titles, even when the text exactly matches a dictionary key.

## What is translated

Fixed GitHub UI text—such as navigation items, buttons, headings, labels, and form descriptions—is added to the dictionary after being verified on each supported page. Run `node scripts/validate.mjs` to see the current entry count for each language. Every bundled language dictionary is validated to contain exactly the same set of keys.

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
| Rows in the global repositories list (`/repos`): owner/repo names and descriptions | Exclude `[class*="ReposListItem-module"][class*="NwoTitle"]` and `[class*="ReposListItem-module"][class*="FormattedDescription"]` (matches both the old and new CSS Modules class name formats). The organization repository list (`/orgs/<org>/repositories`) is excluded with `[class*="ReposListContainer"] li h4` and `[class*="ReposListContainer"] [class*="FormattedDescription"]` |
| User name links | Exclude `[data-hovercard-type="user"]` |
| Issue, pull request, and discussion titles | Exclude `<bdi>` (which GitHub uses for bidirectional text isolation) and the `.markdown-title` class (detail-view headings and sticky headers, the "Link an issue" menu under a pull request's Development section, and anywhere else the title is reused). The new pull request page renders its title with the CSS Modules class `markdownTitle__<hash>`, so `[class*="markdownTitle__"]` is excluded too |
| Issue template names and descriptions (`name:` / `description:`) | On `/issues/new/choose`, exclude template links by URL pattern; in the picker dialog opened from list views, exclude item titles and descriptions inside `[data-testid="template-list"]` |
| Issue form content (labels, descriptions, and Markdown defined in YAML) | Exclude `[class*="formElementsContainer__"]` (shared by the `/issues/new` page and the create dialog) |
| Branch and tag names in the ref selector popup | Exclude `[data-testid="overlay-content"][aria-labelledby^="ref-picker-"] [role="menuitemradio"]` (the dialog's `aria-label` is not used because the extension translates it) |
| Milestone and project names in the sidebar picker menus | Exclude `#milestone-select-menu .select-menu-item:not(.select-menu-new-item-form)` and `#projects-select-menu [role="menuitemcheckbox"]` |
| Parent team picker on the organization team create and edit pages (team names in the options, and in the button after one is selected) | Exclude `#team-search-results [role="menuitemradio"]`, and `#team-search-button-text` while an option is selected (`aria-checked="true"`) |
| Organization team names (rows in the team list, breadcrumbs on team pages) | Exclude links to `/orgs/<org>/teams/<slug>` without a query by URL pattern. Team tabs (`/teams/<slug>/members` etc.) and role filters (`?query=role:…`) are still translated |
| Compare ranges (branch and tag names) listed on the compare page, such as "Example comparisons" | Exclude links to `/<owner>/<repo>/compare/<range>` by URL pattern. Links with `?expand=1` (such as "Compare & pull request") are still translated |
| Workflow names in Actions run lists (all workflows and per workflow) | On `/actions` and `/actions/workflows/<file>` only, exclude `li strong` in each row, and the page title (`h1[data-component="PH_Title"]`) on per-workflow pages |
| Team name and description in the sidebar of organization team pages | On team pages (`/orgs/<org>/teams/<slug>` and below) only, exclude `.Layout-sidebar .border-bottom > h2` and `.Layout-sidebar p.description` |
| Repository rows on the "Set values" tab of organization custom properties (names, descriptions, and property values) | Exclude `[data-testid="targets-properties-list"] li` (fixed text such as "No properties" stays untranslated too) |
| Custom property names, descriptions, and options (the "Properties" tab list, the form for setting values, and the property detail page) | Exclude `[data-testid="repos-definitions-list"] li` and `[data-testid="property-row"]`. Exclude links to the detail page (`/settings/custom-property/<name>`) by URL pattern, and on the detail page only, the page title (`h1[data-component="PH_Title"]`) and the last breadcrumb |
| Options and default values in the custom property create and edit form | On the create and edit pages only, exclude `[data-testid="property-definition-form"] li` (option list), `button[aria-labelledby="property-default-value-label"]` (default value button), and `[data-testid="filtered-action-list"] [role="option"]` (default value candidates). On the page for setting values (`/settings/custom-properties`), the option candidates rendered in a Portal (`[data-testid="filtered-action-list"] [role="option"]`) are excluded too |
| Member options (user names) for excluding members from auto assignment on the team code review settings page | Exclude `[role="menuitemcheckbox"] .select-menu-item-text` on that page only |
| Issue type, field, and field value options in the issue sidebar | Exclude `[data-testid="item-picker-root"] [role="option"]` |
| Field names and values under "Fields" in the issue sidebar | Exclude `[class*="issueFieldLabel__"]` and `[class*="issueFieldValueText__"]` |
| Issue type names set on issues (below the title and in the sidebar of the issue page, and in issue lists) | Exclude `[class*="issueTypeTokenContainer__"]` |
| File names in the tooltips of pending comment headings in the review popup | Exclude `h3 > a[href*="/changes#r"] + [data-component="Tooltip"]` (the link itself is excluded as a pull request link) |
| Type names, field names, descriptions, and options on the Issue types / Issue fields settings pages (personal and organization) | Exclude name links (`/settings/issue-types/<id>`, `/settings/issue-fields/<id>`) by URL pattern, and on these pages only, list descriptions (`li[data-testid] > span`), options (`[class*="prc-Token-"]`), and pinned field names (`[class*="PinnedIssueFieldItemContent"]`) |
| Saved issue view names in the views list (`/issues/views`) | Exclude links matching `/issues/views/<id>` (numeric or base64, excluding `new`) by URL pattern |
| SelectPanel option rows ("Add target", "Add environments", etc.) on the ruleset editor (`/settings/rules/…`) | Exclude `[data-testid="filtered-action-list"] [role="option"]` (environment / team / user / ref names) |
| Links to individual issues, pull requests, discussions, and commits | Exclude matching URL patterns such as `/issues/N` |
| Wiki page names in headings, sidebars, and tables of contents | Exclude `.gh-header-title`, `.js-wiki-sidebar-toc-container`, and matching internal Wiki links |
| File and directory names in repository listings | Exclude links matching `/tree/` and `/blob/` URL patterns |
| React partials during hydration | Exclude `react-partial:not(.loaded)`. Rewriting server-rendered HTML before React hydration completes causes a hydration mismatch that can break the partial (e.g. the global search button disappearing on a cold browser start). Once GitHub marks a partial with the `loaded` class, it is translated |
| Global navigation header | Translated by default, but only after its `react-partial` finishes hydration (see above). Translation can be turned off from the popup, which excludes `header[role="banner"]` entirely |
| Global search UI | Exclude the search trigger button, `qbsearch-input`, and `modal-dialog#search-suggestions-dialog` to prevent interference with initialization and protect user, organization, and repository names |
| Inline code and code blocks | Exclude `pre` and `code` elements |
| Editable fields such as bios and comment bodies | Exclude `[contenteditable="true"]`. Text inside `<textarea>` elements (their initial value) is never rewritten, whether the scan starts at the textarea or at an ancestor |

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
- `react-partial` and its `loaded` class, GitHub's marker for React hydration completion, to postpone translation until touching the DOM is safe. If GitHub renames this marker, the affected partials simply stay untranslated
- `header[role="banner"]` to exclude the global header entirely when its translation is turned off from the popup
- The global search trigger button, `qbsearch-input`, and `modal-dialog#search-suggestions-dialog` to prevent interference with initialization and display control and to avoid mistranslating search suggestions

These safeguards reduce the risk of mistranslation; they do not guarantee that user-created content can never be translated. If a GitHub DOM change causes an exclusion to stop matching, a string inside an allowlisted ancestor or element could be translated when it matches a dictionary key.

#### Extending translation on a verified page

Each of these is limited to settings pages that have been individually verified to contain no user input, and is needed because the description text for each setting lives in a bare `<span>` / `<div>` container.

- `[data-component="FormControl.Caption"]` / `[data-component="RadioGroup.Caption"]` on ruleset creation/editing pages and Agent suggestions for issues (`/settings/suggestions`). These attributes are part of Primer's published component interface and are expected to be more stable than an internal `data-testid`.
- `[class*="Description-module__Box__"]` / `.descriptionBox` on repository Settings > Copilot pages (`/settings/copilot/…`). Each feature setting's description sits in this container. GitHub changed its CSS Modules class name format, so the current pages are matched by the unhashed `descriptionBox` class.
- `p` on `/settings/suggestions` and `/settings/copilot/…`; `span` on `/settings/copilot/features` only (feature names, badges, and descriptions are all bare `<span>`, so this is limited to that single page).
- On all of these pages, description sentences that contain links stay untranslated because their text nodes are split.
- `[data-testid="mini-status"] p` (the cards in the merge box of the new pull request page). These cards show only fixed text such as "No approvals required" in `<p>`, so they are left out of the `p` exclusion on every page.
- `[data-component="Label"]` on issue and pull request pages only (status badges such as "Resolved" on conversations and "Owner" on comments). Labels that users add are a separate component, `prc-Token-IssueLabel`, which stays excluded.

### Page-specific scope extensions

Some pages contain fixed headings, labels, and descriptions that are not covered by `nav`, `header`, `button`, ARIA roles, or `[aria-label]`. On individually verified pages, the extension expands the allowlist to elements such as `h1`–`h6`, `label`, `a`, `p`, and `span`. See `EXTRA_SELECTOR`, `EXACT_PATH_EXTRA_SELECTOR`, and `PATTERN_EXTRA_SELECTOR` in `content.js`.

The `p` and `span` elements are enabled only on pages that have been checked to ensure that user-created content does not appear in those elements (see "Extending translation on a verified page" above for the concrete list).

`/branches` and `/tags` are also extended-scope pages (allowing `h1`–`h6`, `label`, `a`, `strong`). Branch and tag names remain protected by the `/tree/` and `/releases/tag/` URL patterns.

The GitHub Sponsors dashboard (`/sponsors/<user>/dashboard/…`) is also extended-scope (allowing `h1`–`h6`, `label`, `a`, `p`, `[data-component="FormControl.Caption"]`). Only the parts users actually author are excluded — not the whole `featured-work` element, which also contains fixed UI (headings, descriptions, the "Edit featured work" button): `featured-work .js-sponsors-sortable-list` (the visible featured repository cards), `#edit-sponsors-featured-work [class*="pinned-item-name"]` (repository names in the picker), and `#edit-featured-sponsorships-dialog` (the sponsor picker dialog).
