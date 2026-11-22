[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# 為 GitHub UI Translator 做出貢獻

感謝你有興趣改善 GitHub UI Translator。本文件說明如何回報問題、如何編輯翻譯字典，以及變更合併前需要符合的條件。

擴充功能的安裝與使用方式請參閱 [README](/README.zh-TW.md)。

## 貢獻方式

| 你想做的事 | 前往 |
| --- | --- |
| 回報無法正常運作的行為 | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| 為已支援的語言提出翻譯建議 | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| 提議新功能或新語言 | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| 提問或討論想法 | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

空白 Issue 已停用，請選擇合適的範本。每個範本都會請你確認已經搜尋過現有的 Issue。

## 開始之前

請先閱讀[翻譯範圍（English）](/docs/translation-scope.md)。其中定義了本專案最重要的規則：**本擴充功能只翻譯 GitHub 的固定介面文字，並刻意不翻譯使用者建立的內容。**

README、Issue 內文、留言、程式碼區塊、檔案名稱、儲存庫名稱、使用者名稱和 Wiki 頁面標題，即使與字典的鍵完全一致，也會被刻意排除。翻譯這些內容的變更不會被合併，因此在撰寫程式碼之前，值得先了解這條界線。

## 準備開發環境

複製儲存庫，並以開發版的形式載入。

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**：開啟 `chrome://extensions`，啟用開發人員模式，點選「載入未封裝項目」，然後選擇複製下來的資料夾（包含 `manifest.json` 的資料夾）。
- **Firefox**：開啟 `about:debugging#/runtime/this-firefox`，點選「暫時載入附加元件…」，然後選擇 `manifest.json`。暫時附加元件會在 Firefox 重新啟動後被移除，因此每次工作階段都需要重新載入。

載入和執行擴充功能不需要建置步驟，也不需要安裝相依套件。編輯檔案後，請重新載入擴充功能，並重新整理正在測試的 GitHub 頁面。

字典驗證和測試需要 Node.js。請使用 pnpm 安裝測試用的相依套件，pnpm 版本應與 `package.json` 中的 `packageManager` 一致。CI 使用 Node 26。

## 編輯字典

翻譯位於 `dictionaries/<語言代碼>.json`。目前共有 9 個：[`ja.json`](/dictionaries/ja.json)、[`zh-CN.json`](/dictionaries/zh-CN.json)、[`zh-TW.json`](/dictionaries/zh-TW.json)、[`es.json`](/dictionaries/es.json)、[`de.json`](/dictionaries/de.json)、[`pt-BR.json`](/dictionaries/pt-BR.json)、[`ko.json`](/dictionaries/ko.json)、[`fr.json`](/dictionaries/fr.json)、[`ru.json`](/dictionaries/ru.json)。

```jsonc
{
  "language": "zh-TW",
  "name": "繁體中文",
  "translations": {
    // ==== Repository navigation ====
    "Code": "程式碼",
    "Issues": "Issue"
  }
}
```

有 7 條重要規則。驗證腳本會檢查能從檔案判斷的部分，其餘部分需要在審查時確認。

**1. 所有字典的鍵必須完全一致。** 這是最容易出錯的地方。如果只在 `ja.json` 新增條目而忘了新增到其他字典，CI 會以 `missing keys` 失敗。請在同一個 Pull Request 中把條目新增到*所有*字典。如果你無法提供不熟悉的語言的譯文，請在 Pull Request 中說明，而不是缺少這個鍵。

**2. 鍵必須與英文原文嚴格一致。** 比對前會移除首尾空白。此外，僅對於**可見文字**，包括換行在內的連續空白會被正規化為一個空格，因此寫成一行的鍵也能符合 GitHub 中折成多行顯示的文字。**屬性值不會被正規化，只會執行 `trim()`。** `aria-label`、`placeholder`、按鈕的 `value` 和 `data-disable-with` 在移除首尾空白後按原樣比對，因此針對這些屬性的鍵必須照原文重現內部空白。鍵的首尾有空白時驗證腳本會報錯，但是否與 GitHub 原文及內部空白一致，需要在審查時確認。

**3. 只能使用整行註解。** 檔案是帶有 `//` 行註解的 JSON（JSONC 形式）。`JSON.parse` 不支援註解，因此擴充功能會在解析前移除註解行。寫在值同一行末尾的註解會造成解析錯誤。

**4. 依 GitHub 頁面將條目分組。** 每個分組以 `// ==== 區段名稱 ====` 註解開頭。請將新條目新增到對應的分組中，而不是檔案末尾。這樣在 GitHub 介面變更時，就能知道哪個區段受到影響。放置位置不會被檢查，因此放錯分組 CI 也會通過。

**5. 鍵使用 4 個半形空格縮排。** 重複鍵檢查會逐行讀取原始檔案，只辨識恰好是這個縮排的鍵。縮排不同不會報錯，但這些鍵會被悄悄排除在重複檢查之外，可能讓真正的重複被漏掉。

**6. 翻譯鏈必須收斂。** 為了記錄保留產品名稱不翻譯的意圖，例如 `"Wiki": "Wiki"`，譯文有時會與原文相同。驗證腳本會將這種自我對應以警告而不是錯誤回報。另一方面，像 `A → B → A` 這樣在兩個以上不同值之間循環的翻譯不會收斂，因此會報錯。雖然不循環、但在下一次處理時譯文仍會變化的翻譯鏈，也會以警告回報，以便確認。

**7. 保留行內標籤的種類和順序。** 如果鍵包含 `<a>`、`<strong>` 或 `<code>` 等標籤，譯文中也必須保留與原文相同種類、相同順序的標籤。請勿刪除或重新排列標籤。擴充功能只替換文字，不會重新排列現有的 DOM 元素。驗證腳本也會檢查標籤的種類和順序是否與原文一致。

值必須是非空字串。同一檔案內的鍵重複會報錯。

## 翻譯方針

- 譯文優先使用各語言的母語開發者實際使用的說法。比起直譯 GitHub 官方在地化，更重視在介面上讀起來是否自然。
- GitHub 官方文件的譯文和寫法可作為參考。請參閱[日文文件](https://docs.github.com/ja)、[簡體中文文件](https://docs.github.com/zh)、[西班牙文文件](https://docs.github.com/es)、[德文文件](https://docs.github.com/de)、[葡萄牙文文件](https://docs.github.com/pt)、[韓文文件](https://docs.github.com/ko)、[法文文件](https://docs.github.com/fr)和[俄文文件](https://docs.github.com/ru)。繁體中文沒有官方文件。
- 請在目前的 GitHub 頁面上確認上下文，並考慮使用同一英文鍵的已知位置。一個字典鍵只能設定一個譯文，因此請優先選擇在多個上下文中都說得通的說法。
- 與現有字典中相關的譯文和寫法保持一致；GitHub 保留英文原文的產品名稱和功能名稱時，也請保持原樣。
- 如果你選擇了與官方文件不同的譯文，或修改了現有譯文，請在 Pull Request 中說明理由。維護者與母語貢獻者意見不同時，以母語者的判斷為準。

## 新增語言

1. 依上述格式新增 `dictionaries/<語言代碼>.json`。`language` 欄位必須與 `<語言代碼>` 一致，`name` 欄位必須與第 2 步登記的顯示名稱一致。
2. 在 [`languages.json`](/languages.json) 中新增 `{ "code": "<語言代碼>", "name": "<顯示名稱>" }`。彈出視窗和選項頁面都會讀取這份清單。
3. 新增 `_locales/<地區設定代碼>/messages.json`，其訊息鍵與 [`_locales/en/messages.json`](/_locales/en/messages.json) 相同。這是擴充功能本身介面（彈出視窗、選項頁面、擴充功能名稱和說明）的在地化，與 GitHub 翻譯字典是不同的機制。

**地區設定目錄名稱不一定與字典代碼相同。** WebExtensions 要求使用底線分隔的 `語言_地區`，而字典代碼使用連字號分隔的 BCP 47 形式。簡體中文和巴西葡萄牙文就是現有的例子。

| | 字典代碼 | 地區設定目錄 |
| --- | --- | --- |
| 日文 | `ja` | `_locales/ja` |
| 簡體中文 | `zh-CN` | `_locales/zh_CN` |
| 繁體中文 | `zh-TW` | `_locales/zh_TW` |
| 西班牙文 | `es` | `_locales/es` |
| 德文 | `de` | `_locales/de` |
| 巴西葡萄牙文 | `pt-BR` | `_locales/pt_BR` |
| 韓文 | `ko` | `_locales/ko` |
| 法文 | `fr` | `_locales/fr` |
| 俄文 | `ru` | `_locales/ru` |

瀏覽器會忽略名為 `_locales/zh-CN` 或 `_locales/pt-BR` 的目錄，而且沒有機制能發現這一點。[`scripts/validate.mjs`](/scripts/validate.mjs) 只比較現有地區設定目錄之間的訊息鍵，並不檢查它們與 `languages.json` 中代碼的對應關係。擴充功能的介面和中繼資料會悄悄改用英文。

新字典需要包含現有字典的所有鍵，因此這是一項很大的變更。開始之前，請先建立 Feature request，討論好範圍。

## 驗證變更

建立 Pull Request 之前，請安裝相依套件並執行字典驗證和測試。

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

字典驗證（`pnpm run validate`）會檢查字典格式和中繼資料、重複鍵、空白鍵或首尾有空白的鍵、所有字典之間的鍵一致性、所有 `_locales` 之間的鍵一致性、`manifest.json` 中的 `__MSG_*__` 預留位置是否全部能夠解析，以及 `shared.js` 是否比 `content.js` 先載入。它也會對自我對應和下一次處理時譯文仍會變化的翻譯鏈發出警告，並將長度為 2 以上的翻譯循環視為錯誤。成功時會顯示每種語言的條目數，以及相應的提示性警告。它也會檢查行內標籤的種類和順序是否與原文一致。

另一方面，它**不會檢查**區段的放置位置、鍵的縮排，以及地區設定目錄名稱與 `languages.json` 中代碼的對應關係。這 3 點需要人工確認。

CI 會對每個 Pull Request 執行上述字典驗證和測試，以及 JavaScript 語法檢查（`node --check`）。先在本機執行可以減少來回修改。

## Pull Request

- 請從 `main` 建立工作分支，並向 `main` 建立 Pull Request。
- `main` 會累積下一次發行要包含的變更。Pull Request 使用 squash 合併。
- 發行由維護者負責。合併提升 `manifest.json` 版本的 Pull Request 後，在 `main` 上加上 `vX.Y.Z` 格式的標籤，發行用的 zip 就會自動產生。
- 提交訊息請使用英文撰寫。
- 一個 Pull Request 只包含一項邏輯上的變更。某個頁面的字典新增、錯誤修正和文件更新應該是 3 個 Pull Request，而不是 1 個。
- 如果有相關的 Issue，請附上連結。
- CI 必須通過。
- 對於翻譯變更，附上變更前後的截圖會非常有幫助。

## 授權條款

你提交的貢獻將視為同意依照本專案的 [MIT 授權條款](/LICENSE)進行授權。
