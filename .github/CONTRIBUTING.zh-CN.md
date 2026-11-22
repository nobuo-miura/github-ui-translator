[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# 为 GitHub UI Translator 做贡献

感谢你有兴趣改进 GitHub UI Translator。本文档介绍如何报告问题、如何编辑翻译词典，以及变更合并前需要满足的条件。

扩展的安装和使用方法请参阅 [README](/README.zh-CN.md)。

## 贡献方式

| 你想做的事 | 前往 |
| --- | --- |
| 报告无法正常工作的行为 | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| 为已支持的语言提出翻译建议 | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| 提议新功能或新语言 | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| 提问或讨论想法 | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

空白 Issue 已被禁用，请选择合适的模板。每个模板都会要求你确认已经搜索过现有的 Issue。

## 开始之前

请先阅读[翻译范围（English）](/docs/translation-scope.md)。其中定义了本项目最重要的规则：**本扩展只翻译 GitHub 的固定界面文字，并有意不翻译用户创建的内容。**

README、Issue 正文、评论、代码块、文件名、仓库名、用户名和 Wiki 页面标题即使与词典的键完全一致，也会被有意排除。翻译这些内容的变更不会被合并，因此在编写代码之前，值得先理解这条边界。

## 准备开发环境

克隆仓库，并以开发版的形式加载。

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**：打开 `chrome://extensions`，启用开发者模式，点击“加载已解压的扩展程序”，然后选择克隆下来的文件夹（包含 `manifest.json` 的文件夹）。
- **Firefox**：打开 `about:debugging#/runtime/this-firefox`，点击“临时载入附加组件…”，然后选择 `manifest.json`。临时附加组件会在 Firefox 重启后被移除，因此每次会话都需要重新载入。

加载和运行扩展不需要构建步骤，也不需要安装依赖。编辑文件后，请重新加载扩展，并刷新正在测试的 GitHub 页面。

词典验证和测试需要 Node.js。请使用 pnpm 安装测试依赖，pnpm 版本应与 `package.json` 中的 `packageManager` 一致。CI 使用 Node 26。

## 编辑词典

翻译位于 `dictionaries/<语言代码>.json`。目前共有 9 个：[`ja.json`](/dictionaries/ja.json)、[`zh-CN.json`](/dictionaries/zh-CN.json)、[`zh-TW.json`](/dictionaries/zh-TW.json)、[`es.json`](/dictionaries/es.json)、[`de.json`](/dictionaries/de.json)、[`pt-BR.json`](/dictionaries/pt-BR.json)、[`ko.json`](/dictionaries/ko.json)、[`fr.json`](/dictionaries/fr.json)、[`ru.json`](/dictionaries/ru.json)。

```jsonc
{
  "language": "zh-CN",
  "name": "简体中文",
  "translations": {
    // ==== Repository navigation ====
    "Code": "代码",
    "Issues": "Issue"
  }
}
```

有 7 条重要规则。验证脚本会检查能从文件判断的部分，其余部分需要在审查时确认。

**1. 所有词典的键必须完全一致。** 这是最容易出错的地方。如果只在 `ja.json` 中添加条目而忘记添加到其他词典，CI 会以 `missing keys` 失败。请在同一个 Pull Request 中把条目添加到*所有*词典。如果你无法提供不熟悉的语言的译文，请在 Pull Request 中说明，而不是缺少这个键。

**2. 键必须与英文原文严格一致。** 匹配前会去除首尾空白。此外，仅对于**可见文字**，包括换行在内的连续空白会被规范化为一个空格，因此写在一行中的键也能匹配 GitHub 中折成多行显示的文字。**属性值不会被规范化，只会执行 `trim()`。** `aria-label`、`placeholder`、按钮的 `value` 和 `data-disable-with` 在去除首尾空白后按原样匹配，因此针对这些属性的键必须按原文还原内部空白。键的首尾有空白时验证脚本会报错，但是否与 GitHub 原文及内部空白一致，需要在审查时确认。

**3. 只能使用整行注释。** 文件是带有 `//` 行注释的 JSON（JSONC 形式）。`JSON.parse` 不支持注释，因此扩展会在解析前移除注释行。写在值同一行末尾的注释会导致解析错误。

**4. 按 GitHub 页面对条目分组。** 每个分组以 `// ==== 分区名 ====` 注释开头。请将新条目添加到对应的分组中，而不是文件末尾。这样在 GitHub 界面变化时，就能知道哪个分区受到影响。放置位置不会被检查，因此放错分组 CI 也会通过。

**5. 键使用 4 个半角空格缩进。** 重复键检查会逐行读取原始文件，只识别恰好是这个缩进的键。缩进不同不会报错，但这些键会被悄悄排除在重复检查之外，可能导致真正的重复被漏掉。

**6. 翻译链必须收敛。** 为了记录保留产品名不翻译的意图，例如 `"Wiki": "Wiki"`，译文有时会与原文相同。验证脚本会将这种自我映射作为警告而不是错误报告。另一方面，像 `A → B → A` 这样在两个以上不同值之间循环的翻译不会收敛，因此会报错。虽然不循环、但在下一次处理时译文仍会变化的翻译链，也会作为警告报告，以便确认。

**7. 保留行内标签的类型和顺序。** 如果键包含 `<a>`、`<strong>` 或 `<code>` 等标签，译文中也必须保留与原文相同类型、相同顺序的标签。请勿删除或重新排列标签。扩展只替换文字，不会重新排列现有的 DOM 元素。验证脚本也会检查标签的类型和顺序是否与原文一致。

值必须是非空字符串。同一文件内的键重复会报错。

## 翻译方针

- 译文优先使用各语言的母语开发者实际使用的说法。比起直译 GitHub 官方本地化，更重视在界面上读起来是否自然。
- GitHub 官方文档的译文和写法可作为参考。请参阅[日语文档](https://docs.github.com/ja)、[简体中文文档](https://docs.github.com/zh)、[西班牙语文档](https://docs.github.com/es)、[德语文档](https://docs.github.com/de)、[葡萄牙语文档](https://docs.github.com/pt)、[韩语文档](https://docs.github.com/ko)、[法语文档](https://docs.github.com/fr)和[俄语文档](https://docs.github.com/ru)。繁体中文没有官方文档。
- 请在当前的 GitHub 页面上确认上下文，并考虑使用同一英文键的已知位置。一个词典键只能设置一个译文，因此请优先选择在多个上下文中都说得通的表达。
- 与现有词典中相关的译文和写法保持一致；GitHub 保留英文原文的产品名和功能名时，也请保持原样。
- 如果你选择了与官方文档不同的译文，或修改了现有译文，请在 Pull Request 中说明理由。维护者与母语贡献者意见不一致时，以母语者的判断为准。

## 添加新语言

1. 按上述格式添加 `dictionaries/<语言代码>.json`。`language` 字段必须与 `<语言代码>` 一致，`name` 字段必须与第 2 步中登记的显示名称一致。
2. 在 [`languages.json`](/languages.json) 中添加 `{ "code": "<语言代码>", "name": "<显示名称>" }`。弹出窗口和选项页面都会读取这个列表。
3. 添加 `_locales/<区域设置代码>/messages.json`，其消息键与 [`_locales/en/messages.json`](/_locales/en/messages.json) 相同。这是扩展自身界面（弹出窗口、选项页面、扩展名称和描述）的本地化，与 GitHub 翻译词典是不同的机制。

**区域设置目录名不一定与词典代码相同。** WebExtensions 要求使用下划线分隔的 `语言_地区`，而词典代码使用连字符分隔的 BCP 47 形式。简体中文和巴西葡萄牙语就是现有的例子。

| | 词典代码 | 区域设置目录 |
| --- | --- | --- |
| 日语 | `ja` | `_locales/ja` |
| 简体中文 | `zh-CN` | `_locales/zh_CN` |
| 繁体中文 | `zh-TW` | `_locales/zh_TW` |
| 西班牙语 | `es` | `_locales/es` |
| 德语 | `de` | `_locales/de` |
| 巴西葡萄牙语 | `pt-BR` | `_locales/pt_BR` |
| 韩语 | `ko` | `_locales/ko` |
| 法语 | `fr` | `_locales/fr` |
| 俄语 | `ru` | `_locales/ru` |

浏览器会忽略名为 `_locales/zh-CN` 或 `_locales/pt-BR` 的目录，而且没有机制能发现这一点。[`scripts/validate.mjs`](/scripts/validate.mjs) 只比较现有区域设置目录之间的消息键，并不检查它们与 `languages.json` 中代码的对应关系。扩展的界面和元数据会悄悄回退到英文。

新词典需要包含现有词典的所有键，因此这是一个很大的变更。开始之前，请先创建 Feature request，商定范围。

## 验证变更

创建 Pull Request 之前，请安装依赖并运行词典验证和测试。

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

词典验证（`pnpm run validate`）会检查词典格式和元数据、重复键、空键或首尾有空白的键、所有词典之间的键一致性、所有 `_locales` 之间的键一致性、`manifest.json` 中的 `__MSG_*__` 占位符是否全部能够解析，以及 `shared.js` 是否先于 `content.js` 加载。它还会对自我映射和下一次处理时译文仍会变化的翻译链发出警告，并将长度为 2 以上的翻译循环视为错误。成功时会显示每种语言的条目数，以及相应的提示性警告。它也会检查行内标签的类型和顺序是否与原文一致。

另一方面，它**不会检查**分区的放置位置、键的缩进，以及区域设置目录名与 `languages.json` 中代码的对应关系。这 3 点需要人工确认。

CI 会对每个 Pull Request 运行上述词典验证和测试，以及 JavaScript 语法检查（`node --check`）。在本地先运行可以减少来回修改。

## Pull Request

- 请从 `main` 创建工作分支，并向 `main` 创建 Pull Request。
- `main` 会积累下一次发布要包含的变更。Pull Request 使用 squash 合并。
- 发布由维护者负责。合并提升 `manifest.json` 版本的 Pull Request 后，在 `main` 上打 `vX.Y.Z` 格式的标签，发布用的 zip 就会自动生成。
- 提交信息请使用英文书写。
- 一个 Pull Request 只包含一个逻辑上的变更。某个页面的词典添加、错误修复和文档更新应该是 3 个 Pull Request，而不是 1 个。
- 如果有相关的 Issue，请附上链接。
- CI 必须通过。
- 对于翻译变更，附上变更前后的截图会非常有帮助。

## 许可证

你提交的贡献将被视为同意按照本项目的 [MIT 许可证](/LICENSE)进行授权。
