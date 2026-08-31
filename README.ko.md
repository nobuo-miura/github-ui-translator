# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Русский](README.ru.md)

[![Latest Release](https://img.shields.io/github/v/release/nobuo-miura/github-ui-translator?label=Latest%20Release)](https://github.com/nobuo-miura/github-ui-translator/releases/latest)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/igdplojdbbpfbedgoaokfcagpkofmngk?label=Chrome%20Web%20Store&logo=googlechrome)](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&logo=microsoftedge&query=%24.version&prefix=v&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffgjocjmjjghflobobinafkbkeildanoj)](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/github-ui-translator?label=Firefox%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/github-ui-translator/)
[![Validation](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml/badge.svg)](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GitHub UI Translator는 로컬 사전을 사용해 GitHub의 영어 UI를 일본어, 중국어 간체, 스페인어, 독일어, 브라질 포르투갈어, 한국어, 프랑스어 또는 러시아어로 번역하는 Chrome, Edge 및 Firefox용 브라우저 확장 프로그램입니다.
외부 번역 API나 클라우드 서비스에 의존하지 않으며 모든 번역은 브라우저 안에서 로컬로 처리됩니다.

![일본어 번역 결과](docs/images/jp.jpeg)

<details>
<summary>지원하는 8개 언어의 스크린샷</summary>

첫 번째 행은 GitHub의 원본 영어 UI이며, 그 아래 각 행은 언어별 번역 결과입니다.

![지원하는 8개 언어의 번역 결과](docs/images/languages.png)

</details>

## 주요 기능

- 페이지 내용이나 설정을 외부 서비스로 보내지 않고 모든 번역을 로컬에서 처리합니다
- 탐색 항목과 버튼 같은 GitHub의 고정 UI 문구만 번역하고 README, 이슈, 댓글, 코드 블록 등 사용자가 작성한 콘텐츠 영역은 제외합니다
- 확장 프로그램 팝업에서 번역을 간편하게 켜거나 끌 수 있습니다
- GitHub의 React 하이드레이션이 완료된 뒤 전역 헤더를 번역하여 전역 검색과 충돌할 가능성을 낮춥니다. 이 기능은 팝업에서 끌 수도 있습니다

## 문서

- [번역 범위(English)](docs/translation-scope.md) ([日本語](docs/translation-scope.ja.md))

## 제한 사항

- 현재 일본어, 중국어 간체, 스페인어, 독일어, 브라질 포르투갈어, 한국어, 프랑스어, 러시아어를 지원합니다. 번역 범위가 충분히 갖춰지는 대로 다른 언어도 추가할 예정입니다.
- “3 commits”나 “opened 2 days ago”처럼 숫자 또는 날짜가 포함된 동적 문구는 번역하지 않습니다. 사용자 이름 등 사용자가 작성한 콘텐츠도 번역 대상에서 제외됩니다. 자세한 내용은 [번역 범위](docs/translation-scope.md)를 참고하세요.
- `github.com`만 지원합니다. GitHub Enterprise 및 기타 사용자 지정 도메인은 지원하지 않습니다.
- Chrome, Edge 및 Firefox에서 테스트했습니다. 다른 Chromium 기반 브라우저에서도 작동할 수 있지만 명시적으로 테스트하지는 않았습니다.

## 설치

### Chrome

[Chrome 웹 스토어](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)에서 GitHub UI Translator를 설치하세요.

회사에서 관리하는 기기 등 Chrome 웹 스토어를 사용할 수 없는 환경에서는 다음과 같이 수동으로 설치할 수 있습니다.

1. [최신 릴리스](https://github.com/nobuo-miura/github-ui-translator/releases/latest)에서 `.zip` 파일을 내려받아 압축을 풉니다.
2. Chrome에서 `chrome://extensions`를 열고 개발자 모드를 켭니다.
3. “압축해제된 확장 프로그램을 로드합니다”를 클릭한 뒤 압축을 푼 폴더를 선택합니다.

수동으로 설치한 확장 프로그램은 자동으로 업데이트되지 않습니다. 새 버전이 출시되면 위 단계를 반복하세요. 조직 정책에 따라 개발자 모드나 수동 설치 확장 프로그램이 차단될 수도 있습니다. 이 경우 관리자에게 문의하세요.

### Edge

[Microsoft Edge 추가 기능](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)에서 GitHub UI Translator를 설치하세요.

### Firefox

Firefox 142 이상이 필요합니다.

[Firefox 부가 기능](https://addons.mozilla.org/firefox/addon/github-ui-translator/)에서 GitHub UI Translator를 설치하세요.

설치한 뒤 `https://github.com/...` 같은 GitHub 페이지를 열면 지원되는 UI 문구가 선택한 언어로 자동 번역됩니다.

### 개발용 설치(저장소에서 직접 로드)

사전을 사용자 지정하거나 개발에 참여하려면 저장소를 복제한 뒤 확장 프로그램을 직접 로드하세요.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome / Edge**: Chrome에서는 `chrome://extensions`, Edge에서는 `edge://extensions`를 열고 개발자 모드를 켭니다. “압축해제된 확장 프로그램을 로드합니다”를 클릭한 뒤 `manifest.json`이 들어 있는 복제 폴더를 선택합니다.
- **Firefox**: `about:debugging#/runtime/this-firefox`를 열고 “임시 부가 기능 로드…”를 클릭한 다음 저장소의 `manifest.json`을 선택합니다. 임시 부가 기능은 Firefox를 다시 시작하면 제거되므로 세션마다 다시 로드해야 합니다.

## 사용 방법

- 도구 모음에서 확장 프로그램 아이콘을 클릭하면 번역 켜기/끄기 스위치와 언어 선택기가 열립니다. 현재 일본어, 중국어 간체, 스페인어, 독일어, 브라질 포르투갈어, 한국어, 프랑스어, 러시아어가 포함되어 있으며 사전을 추가하면 목록에 새 언어를 더할 수 있습니다.
- 번역 스위치나 언어를 변경하면 열려 있는 GitHub 탭이 새로고침되어 새 설정이 적용됩니다.
- 팝업에서는 전역 헤더 번역 여부를 선택할 수 있으며 이 저장소로 이동하는 링크도 제공합니다. 이 옵션을 변경해도 열려 있는 GitHub 탭이 새로고침됩니다. 전역 헤더 번역은 기본적으로 켜져 있고 GitHub의 React 하이드레이션이 끝날 때까지 기다린 뒤 동작합니다. 전역 검색이 열리지 않는 경우 이 옵션을 끄세요.
- 확장 프로그램 옵션 페이지(Chrome의 `chrome://extensions`, Edge의 `edge://extensions`, Firefox의 `about:addons`)에서 포함된 사전 정보와 확장 프로그램 버전을 확인할 수 있습니다.

## 사전 사용자 지정

원하는 언어의 사전 파일을 직접 편집하여 번역을 추가하거나 변경할 수 있습니다. 예: `dictionaries/ja.json`, `dictionaries/zh-CN.json`, `dictionaries/es.json`, `dictionaries/de.json`, `dictionaries/pt-BR.json`, `dictionaries/ko.json`, `dictionaries/fr.json`, `dictionaries/ru.json`.
항목은 저장소 탐색, 저장소 Settings, 조직 Settings 등 GitHub 화면별로 그룹화되어 있으며 각 그룹 앞에는 `// ====` 주석 줄이 있습니다. 이를 통해 항목이 어느 화면에 속하는지 빠르게 파악하고 GitHub UI 문구 변경도 쉽게 발견할 수 있습니다.

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== 저장소 탐색 ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- 이 파일은 `//` 줄 주석이 포함된 JSON(JSONC 형식)입니다. 줄 전체가 주석인 경우만 지원하며 값 뒤에 이어지는 인라인 주석은 지원하지 않습니다. 표준 `JSON.parse`와 `fetch().json()`은 주석을 처리하지 못하므로 확장 프로그램이 주석 줄을 제거한 뒤 파일을 파싱합니다.
- 사전 키는 원본 영어 텍스트와 **정확히 일치**해야 합니다. 표시 텍스트와 지원되는 속성 값 모두 앞뒤 공백을 무시합니다. 표시 텍스트에 한해서는 줄바꿈을 포함한 연속 공백을 하나의 공백으로 합칩니다. `aria-label`, `placeholder`, 버튼의 `value`, `data-disable-with` 같은 속성 값은 비교할 때 내부 공백을 유지합니다. 사전 키 자체에는 앞뒤 공백을 넣을 수 없습니다.
- 사전을 편집한 뒤 확장 프로그램을 다시 로드하세요. Chrome은 `chrome://extensions`, Edge는 `edge://extensions`, Firefox는 `about:debugging`을 사용합니다.

### 새 언어 추가

1. 같은 형식으로 `dictionaries/<code>.json`(예: `dictionaries/en.json`)을 추가합니다.
2. `languages.json`에 `{ "code": "<code>", "name": "<display name>" }`을 추가합니다. 팝업과 옵션 페이지는 모두 이 공통 목록을 불러옵니다.
3. `node scripts/validate.mjs`를 실행하여 사전 형식, 중복 키, 메타데이터, 포함된 사전 간 키 일치 여부, 자기 매핑, 번역 체인 및 수렴하지 않는 순환을 검사합니다.

팝업, 옵션 페이지 및 확장 프로그램 메타데이터는 GitHub 번역 사전과 별도로 브라우저 확장의 `_locales` 메커니즘을 사용합니다. 확장 프로그램 자체 UI에도 새 언어를 추가하려면 `_locales/en/messages.json`과 동일한 메시지 키를 가진 `_locales/<code>/messages.json`도 추가하세요.

## 프로젝트 구조

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # 공통 언어 목록 및 확장 프로그램 UI 현지화 도우미
├─ languages.json   # 포함된 GitHub 번역 언어
├─ content.js       # 허용 목록을 사용해 DOM을 탐색하는 번역 엔진
├─ popup.html/js    # 번역 스위치가 있는 도구 모음 팝업
├─ options.html/js  # 사전 정보 및 버전 표시
├─ _locales/        # 팝업, 옵션 및 확장 프로그램 메타데이터의 현지화 메시지
├─ dictionaries/
│  ├─ ja.json       # 일본어 사전
│  ├─ zh-CN.json    # 중국어 간체 사전
│  ├─ es.json       # 스페인어 사전
│  ├─ de.json       # 독일어 사전
│  ├─ pt-BR.json    # 브라질 포르투갈어 사전
│  ├─ ko.json       # 한국어 사전
│  ├─ fr.json       # 프랑스어 사전
│  └─ ru.json       # 러시아어 사전
├─ docs/
│  ├─ translation-scope.md     # 영어 버전
│  └─ translation-scope.ja.md  # 일본어 버전
├─ scripts/
│  └─ validate.mjs  # 사전 및 현지화 검증
└─ icons/
```

## 라이선스

[MIT 라이선스](./LICENSE)
