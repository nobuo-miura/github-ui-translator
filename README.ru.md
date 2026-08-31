# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Русский](README.ru.md)

[![Latest Release](https://img.shields.io/github/v/release/nobuo-miura/github-ui-translator?label=Latest%20Release)](https://github.com/nobuo-miura/github-ui-translator/releases/latest)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/igdplojdbbpfbedgoaokfcagpkofmngk?label=Chrome%20Web%20Store&logo=googlechrome)](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&logo=microsoftedge&query=%24.version&prefix=v&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffgjocjmjjghflobobinafkbkeildanoj)](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/github-ui-translator?label=Firefox%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/github-ui-translator/)
[![Validation](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml/badge.svg)](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GitHub UI Translator — расширение для Chrome, Edge и Firefox, которое с помощью локальных словарей переводит англоязычный интерфейс GitHub на японский, упрощённый китайский, испанский, немецкий, бразильский португальский, корейский, французский или русский язык.
Расширение не использует внешние API перевода или облачные сервисы: весь перевод выполняется локально в браузере.

![Результат перевода на японский язык](docs/images/jp.jpeg)

<details>
<summary>Снимки экрана для всех 8 поддерживаемых языков</summary>

В первой строке показан исходный английский интерфейс GitHub, а в следующих строках — результат перевода на каждый язык.

![Результаты перевода на все 8 поддерживаемых языков](docs/images/languages.png)

</details>

## Возможности

- Выполняет весь перевод локально, не отправляя содержимое страниц или настройки во внешние сервисы
- Переводит статичные элементы интерфейса GitHub, например пункты навигации и кнопки, но не затрагивает области с пользовательским содержимым: файлы README, проблемы, комментарии и блоки кода
- Позволяет включать и выключать перевод во всплывающем окне расширения
- Переводит глобальный заголовок только после завершения гидратации React на GitHub, чтобы снизить риск помех для глобального поиска; эту функцию также можно отключить во всплывающем окне

## Документация

- [Область перевода (English)](docs/translation-scope.md) ([日本語](docs/translation-scope.ja.md))

## Ограничения

- Сейчас поддерживаются японский, упрощённый китайский, испанский, немецкий, бразильский португальский, корейский, французский и русский языки. По мере расширения покрытия будут добавляться и другие языки.
- Динамический текст с числами или датами, например «3 commits» или «opened 2 days ago», не переводится. Пользовательское содержимое, такое как имена пользователей, также исключено. Подробнее см. в разделе об [области перевода](docs/translation-scope.md).
- Поддерживается только `github.com`. GitHub Enterprise и другие пользовательские домены не поддерживаются.
- Расширение протестировано в Chrome, Edge и Firefox. Другие браузеры на базе Chromium тоже могут работать, но специально не тестировались.

## Установка

### Chrome

Установите [GitHub UI Translator из Интернет-магазина Chrome](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk).

Если Интернет-магазин Chrome недоступен в вашей среде, например на устройстве под управлением организации:

1. Скачайте файл `.zip` из [последнего выпуска](https://github.com/nobuo-miura/github-ui-translator/releases/latest) и распакуйте его.
2. Откройте `chrome://extensions` в Chrome и включите режим разработчика.
3. Нажмите «Загрузить распакованное расширение» и выберите распакованную папку.

Расширения, установленные вручную, не обновляются автоматически. Повторяйте эти действия после выхода новой версии. Политики вашей организации также могут запрещать режим разработчика или расширения, установленные вручную; в таком случае обратитесь к администратору.

### Edge

Установите [GitHub UI Translator из каталога дополнений Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj).

### Firefox

Требуется Firefox 142 или более поздней версии.

Установите [GitHub UI Translator из каталога дополнений Firefox](https://addons.mozilla.org/firefox/addon/github-ui-translator/).

После установки откройте страницу GitHub, например `https://github.com/...`. Поддерживаемые элементы интерфейса будут автоматически переведены на выбранный язык.

### Установка для разработки (загрузка из репозитория)

Чтобы настроить словарь или принять участие в разработке, клонируйте репозиторий и загрузите расширение напрямую.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome / Edge**: откройте `chrome://extensions` в Chrome или `edge://extensions` в Edge, включите режим разработчика, нажмите «Загрузить распакованное расширение» и выберите клонированную папку, содержащую `manifest.json`.
- **Firefox**: откройте `about:debugging#/runtime/this-firefox`, нажмите «Загрузить временное дополнение…» и выберите файл `manifest.json` из репозитория. Временные дополнения удаляются при перезапуске Firefox, поэтому их нужно загружать заново в каждом сеансе.

## Использование

- Нажмите значок расширения на панели инструментов, чтобы открыть переключатель перевода и выбор языка. Сейчас в комплект входят японский, упрощённый китайский, испанский, немецкий, бразильский португальский, корейский, французский и русский языки; после добавления новых словарей список можно расширить.
- При изменении переключателя или языка открытые вкладки GitHub перезагружаются, чтобы применить новую настройку.
- Во всплывающем окне также можно включить или отключить перевод глобального заголовка и перейти к этому репозиторию. Изменение этой настройки также перезагружает открытые вкладки GitHub. Перевод глобального заголовка включён по умолчанию и ожидает завершения гидратации React на GitHub; отключите его, если глобальный поиск не открывается.
- На странице настроек расширения (`chrome://extensions` в Chrome, `edge://extensions` в Edge или `about:addons` в Firefox) можно посмотреть сведения о встроенных словарях и версию расширения.

## Настройка словаря

Добавить или изменить переводы можно непосредственно в файле словаря нужного языка, например `dictionaries/ja.json`, `dictionaries/zh-CN.json`, `dictionaries/es.json`, `dictionaries/de.json`, `dictionaries/pt-BR.json`, `dictionaries/ko.json`, `dictionaries/fr.json` или `dictionaries/ru.json`.
Записи сгруппированы по экранам GitHub (навигация по репозиторию, настройки репозитория, настройки организации и т. д.). Каждая группа начинается со строки комментария `// ====`, поэтому можно быстро определить, к какому экрану относится запись, и заметить изменения в текстах интерфейса GitHub.

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== Навигация по репозиторию ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- Файл представляет собой JSON со строчными комментариями `//` в стиле JSONC. Поддерживаются только комментарии, занимающие всю строку; комментарии после значения в той же строке не поддерживаются. Стандартные `JSON.parse` и `fetch().json()` не обрабатывают комментарии, поэтому расширение удаляет строки комментариев перед разбором файла.
- Ключи словаря должны **точно совпадать** с исходным английским текстом. Начальные и конечные пробелы игнорируются как в видимом тексте, так и в поддерживаемых значениях атрибутов. Только для видимого текста последовательности пробелов, включая переводы строк, сворачиваются в один пробел. При сопоставлении значений атрибутов, таких как `aria-label`, `placeholder`, `value` кнопки и `data-disable-with`, внутренние пробелы сохраняются. Сами ключи словаря не должны содержать начальных или конечных пробелов.
- После изменения словаря перезагрузите расширение через `chrome://extensions` в Chrome, `edge://extensions` в Edge или `about:debugging` в Firefox.

### Добавление языка

1. Добавьте `dictionaries/<code>.json` (например, `dictionaries/en.json`) в том же формате.
2. Добавьте `{ "code": "<code>", "name": "<display name>" }` в `languages.json`. Всплывающее окно и страница настроек загружают этот общий список.
3. Запустите `node scripts/validate.mjs`, чтобы проверить формат словарей, повторяющиеся ключи, метаданные, совпадение наборов ключей во всех встроенных словарях, самосопоставления, цепочки переводов и несходящиеся циклы.

Всплывающее окно, страница настроек и метаданные расширения используют механизм `_locales` для браузерных расширений независимо от словарей перевода GitHub. Чтобы добавить новый язык и в интерфейс самого расширения, создайте `_locales/<code>/messages.json` с теми же ключами сообщений, что и в `_locales/en/messages.json`.

## Структура проекта

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # Общий список языков и вспомогательные функции локализации интерфейса расширения
├─ languages.json   # Встроенные языки перевода GitHub
├─ content.js       # Модуль перевода, сканирующий DOM по списку разрешённых элементов
├─ popup.html/js    # Всплывающее окно панели инструментов с переключателем перевода
├─ options.html/js  # Сведения о словарях и версия расширения
├─ _locales/        # Локализованные сообщения всплывающего окна, настроек и метаданных
├─ dictionaries/
│  ├─ ja.json       # Японский словарь
│  ├─ zh-CN.json    # Словарь упрощённого китайского языка
│  ├─ es.json       # Испанский словарь
│  ├─ de.json       # Немецкий словарь
│  ├─ pt-BR.json    # Словарь бразильского португальского языка
│  ├─ ko.json       # Корейский словарь
│  ├─ fr.json       # Французский словарь
│  └─ ru.json       # Русский словарь
├─ docs/
│  ├─ translation-scope.md     # Английская версия
│  └─ translation-scope.ja.md  # Японская версия
├─ scripts/
│  └─ validate.mjs  # Проверка словарей и локализации
└─ icons/
```

## Лицензия

[Лицензия MIT](./LICENSE)
