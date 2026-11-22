[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# GitHub UI Translator에 기여하기

GitHub UI Translator 개선에 관심을 가져 주셔서 감사합니다. 이 문서에서는 문제를 보고하는 방법, 번역 사전을 편집하는 방법, 변경 사항이 병합되기 위해 충족해야 하는 조건을 설명합니다.

확장 프로그램의 설치 방법과 사용법은 [README](/README.ko.md)를 참고하세요.

## 기여 방법

| 하고 싶은 일 | 위치 |
| --- | --- |
| 제대로 동작하지 않는 문제 보고 | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| 지원 중인 언어의 번역 제안 | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| 새 기능이나 새 언어 제안 | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| 질문하기, 아이디어 논의하기 | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

빈 이슈는 비활성화되어 있으므로 알맞은 템플릿을 선택해 주세요. 모든 템플릿에서 기존 이슈를 검색했는지 확인을 요청합니다.

## 시작하기 전에

먼저 [번역 범위(English)](/docs/translation-scope.md)를 읽어 주세요. 이 프로젝트에서 가장 중요한 규칙이 정의되어 있습니다. **이 확장 프로그램은 GitHub의 고정 UI 텍스트만 번역하며, 사용자가 작성한 콘텐츠는 의도적으로 번역하지 않습니다.**

README, 이슈 본문, 댓글, 코드 블록, 파일 이름, 리포지토리 이름, 사용자 이름, Wiki 페이지 제목은 사전의 키와 정확히 일치하더라도 의도적으로 제외합니다. 이런 콘텐츠를 번역하는 변경은 병합할 수 없으므로, 코드를 작성하기 전에 이 경계를 이해해 두는 것이 좋습니다.

## 개발 환경 준비

리포지토리를 클론하고 압축 해제된 확장 프로그램으로 로드합니다.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: `chrome://extensions`를 열고 개발자 모드를 켠 다음, "압축해제된 확장 프로그램을 로드합니다"를 클릭해 클론한 폴더(`manifest.json`이 있는 폴더)를 선택합니다.
- **Firefox**: `about:debugging#/runtime/this-firefox`를 열고 "임시 부가 기능 로드…"를 클릭한 다음 `manifest.json`을 선택합니다. 임시 부가 기능은 Firefox를 다시 시작하면 제거되므로 세션마다 다시 로드해 주세요.

확장 프로그램을 로드하고 실행하는 데는 빌드나 의존성 설치가 필요하지 않습니다. 파일을 편집한 후에는 확장 프로그램을 다시 로드하고 테스트 중인 GitHub 페이지를 새로 고침하세요.

사전 검증과 테스트에는 Node.js가 필요합니다. `package.json`의 `packageManager`에 지정된 버전의 pnpm으로 테스트 의존성을 설치해 주세요. CI는 Node 26을 사용합니다.

## 사전 편집

번역은 `dictionaries/<언어 코드>.json`에 있습니다. 현재 [`ja.json`](/dictionaries/ja.json), [`zh-CN.json`](/dictionaries/zh-CN.json), [`zh-TW.json`](/dictionaries/zh-TW.json), [`es.json`](/dictionaries/es.json), [`de.json`](/dictionaries/de.json), [`pt-BR.json`](/dictionaries/pt-BR.json), [`ko.json`](/dictionaries/ko.json), [`fr.json`](/dictionaries/fr.json), [`ru.json`](/dictionaries/ru.json)의 9개가 있습니다.

```jsonc
{
  "language": "ko",
  "name": "한국어",
  "translations": {
    // ==== Repository navigation ====
    "Code": "코드",
    "Issues": "이슈"
  }
}
```

중요한 규칙이 7가지 있습니다. 검증 스크립트는 파일에서 판단할 수 있는 부분을 검사하지만, 나머지는 리뷰에서 확인해야 합니다.

**1. 모든 사전의 키가 정확히 일치해야 합니다.** 가장 실수하기 쉬운 부분입니다. `ja.json`에만 항목을 추가하고 다른 사전에 추가하는 것을 잊으면 CI가 `missing keys`로 실패합니다. 하나의 풀 리퀘스트 안에서 *모든* 사전에 추가해 주세요. 모르는 언어의 번역을 준비할 수 없다면, 키를 빠뜨리지 말고 그 사실을 풀 리퀘스트에 적어 주세요.

**2. 키는 영어 원문과 정확히 일치해야 합니다.** 비교하기 전에 앞뒤 공백이 제거됩니다. 또한 **표시 텍스트**에 한해 줄바꿈을 포함한 연속된 공백이 공백 하나로 정규화되므로, 한 줄로 쓴 키도 GitHub에서 여러 줄로 줄바꿈되어 표시되는 텍스트와 일치합니다. **속성 값은 정규화되지 않고 `trim()`만 적용됩니다.** `aria-label`, `placeholder`, 버튼의 `value`, `data-disable-with`는 앞뒤 공백을 제외하고 그대로 비교되므로, 이런 속성을 대상으로 하는 키는 내부 공백까지 원문 그대로 재현해야 합니다. 키 앞뒤에 공백이 있으면 검증 스크립트가 오류를 내지만, GitHub 원문 및 내부 공백과 일치하는지는 리뷰에서 확인해야 합니다.

**3. 주석은 한 줄 전체로만 작성합니다.** 파일은 `//` 줄 주석을 포함한 JSON(JSONC 형식)입니다. `JSON.parse`는 주석을 지원하지 않기 때문에, 확장 프로그램은 파싱 전에 주석 줄을 제거합니다. 값과 같은 줄 끝에 쓴 주석은 파싱 오류를 일으킵니다.

**4. 항목은 GitHub 화면별로 그룹을 나눕니다.** 각 그룹은 `// ==== 섹션 이름 ====` 주석으로 시작합니다. 새 항목은 파일 끝이 아니라 해당하는 그룹에 추가해 주세요. 그래야 GitHub의 UI가 바뀌었을 때 어떤 섹션이 영향을 받는지 파악할 수 있습니다. 위치는 검사하지 않으므로 잘못된 그룹에 넣어도 CI는 통과합니다.

**5. 키는 공백 4칸으로 들여씁니다.** 중복 키 검사는 원본 파일을 한 줄씩 읽고, 정확히 이 들여쓰기를 가진 키만 인식합니다. 들여쓰기가 다르면 오류가 나지 않는 대신 해당 키가 중복 검사 대상에서 조용히 빠지므로, 실제 중복을 놓칠 수 있습니다.

**6. 번역 체인은 수렴해야 합니다.** `"Wiki": "Wiki"`처럼 제품 이름을 번역하지 않는다는 의도를 기록하기 위해 번역이 원문과 같을 때가 있습니다. 검증 스크립트는 이런 자기 매핑을 오류가 아닌 경고로 보고합니다. 반면 `A → B → A`처럼 두 개 이상의 서로 다른 값 사이를 순환하는 번역은 수렴하지 않으므로 오류가 됩니다. 순환하지는 않지만 다음 처리에서 번역이 다시 바뀌는 체인도 확인할 수 있도록 경고로 보고합니다.

**7. 인라인 태그의 종류와 순서를 유지합니다.** 키에 `<a>`, `<strong>`, `<code>` 같은 태그가 포함되어 있다면 번역에서도 원문과 같은 종류의 태그를 같은 순서로 유지해 주세요. 태그를 삭제하거나 순서를 바꾸지 마세요. 확장 프로그램은 기존 DOM 요소의 순서를 바꾸지 않고 텍스트만 바꿉니다. 검증 스크립트도 태그의 종류와 순서가 원문과 일치하는지 검사합니다.

값은 비어 있지 않은 문자열이어야 합니다. 같은 파일 안에서 키가 중복되면 오류입니다.

## 번역 방침

- 번역어는 각 언어의 원어민 개발자가 실제로 쓰는 말을 우선합니다. GitHub 공식 현지화를 직역하는 것보다 화면에서 자연스럽게 읽히는 것을 중요하게 생각해 주세요.
- GitHub 공식 문서의 번역과 표기는 참고로 삼습니다. [일본어 문서](https://docs.github.com/ja), [중국어 간체 문서](https://docs.github.com/zh), [스페인어 문서](https://docs.github.com/es), [독일어 문서](https://docs.github.com/de), [포르투갈어 문서](https://docs.github.com/pt), [한국어 문서](https://docs.github.com/ko), [프랑스어 문서](https://docs.github.com/fr), [러시아어 문서](https://docs.github.com/ru)를 참고하세요. 중국어 번체 공식 문서는 없습니다.
- 현재 GitHub 화면에서 문맥을 확인하고, 같은 영어 키가 쓰이는 알려진 위치도 고려합니다. 사전 키 하나에는 번역을 하나만 설정할 수 있으므로, 여러 문맥에서 뜻이 통하는 표현을 우선해 주세요.
- 기존 사전의 관련 번역 및 표기와 통일하고, GitHub가 제품 이름이나 기능 이름을 영어 그대로 사용하는 경우에는 그 표기를 유지합니다.
- 공식 문서와 다른 번역어를 고르거나 기존 번역어를 바꾸는 경우에는 그 이유를 풀 리퀘스트에 적어 주세요. 메인테이너와 원어민 기여자의 의견이 다를 때는 원어민의 판단을 우선합니다.

## 새 언어를 추가하는 경우

1. 위의 형식으로 `dictionaries/<언어 코드>.json`을 추가합니다. `language` 필드는 `<언어 코드>`와, `name` 필드는 2단계에서 등록하는 표시 이름과 일치해야 합니다.
2. [`languages.json`](/languages.json)에 `{ "code": "<언어 코드>", "name": "<표시 이름>" }`를 추가합니다. 팝업과 옵션 페이지 모두 이 목록을 읽습니다.
3. [`_locales/en/messages.json`](/_locales/en/messages.json)과 같은 메시지 키를 가진 `_locales/<로캘 코드>/messages.json`을 추가합니다. 이는 확장 프로그램 자체 UI(팝업, 옵션 페이지, 확장 프로그램 이름과 설명)의 다국어화로, GitHub 번역용 사전과는 별개의 구조입니다.

**로캘 디렉터리 이름이 사전 코드와 항상 같은 것은 아닙니다.** WebExtensions는 밑줄로 구분한 `언어_지역` 형식을 요구하지만, 사전 코드는 하이픈으로 구분한 BCP 47 형식입니다. 중국어 간체와 브라질 포르투갈어가 기존의 예입니다.

| | 사전 코드 | 로캘 디렉터리 |
| --- | --- | --- |
| 일본어 | `ja` | `_locales/ja` |
| 중국어 간체 | `zh-CN` | `_locales/zh_CN` |
| 중국어 번체 | `zh-TW` | `_locales/zh_TW` |
| 스페인어 | `es` | `_locales/es` |
| 독일어 | `de` | `_locales/de` |
| 브라질 포르투갈어 | `pt-BR` | `_locales/pt_BR` |
| 한국어 | `ko` | `_locales/ko` |
| 프랑스어 | `fr` | `_locales/fr` |
| 러시아어 | `ru` | `_locales/ru` |

`_locales/zh-CN`이나 `_locales/pt-BR`라는 디렉터리 이름은 브라우저가 무시합니다. 이를 감지하는 장치는 없습니다. [`scripts/validate.mjs`](/scripts/validate.mjs)는 존재하는 로캘 디렉터리끼리 메시지 키를 비교할 뿐, `languages.json`의 코드와의 대응은 검사하지 않기 때문입니다. 확장 프로그램의 UI와 메타데이터는 아무 알림 없이 영어로 대체됩니다.

새 사전에는 기존 사전이 가진 모든 키가 필요하므로 큰 변경이 됩니다. 시작하기 전에 Feature request를 만들어 범위를 맞춰 주세요.

## 변경 사항 검증

풀 리퀘스트를 만들기 전에 의존성을 설치하고 사전 검증과 테스트를 실행해 주세요.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

사전 검증(`pnpm run validate`)은 사전의 형식과 메타데이터, 키 중복, 비어 있거나 앞뒤에 공백이 있는 키, 모든 사전 간의 키 일치, 모든 `_locales` 간의 키 일치, `manifest.json`의 `__MSG_*__` 자리 표시자가 모두 해석되는지, `shared.js`가 `content.js`보다 먼저 로드되는지를 검사합니다. 또한 자기 매핑과 다음 처리에서 번역이 다시 바뀌는 번역 체인을 경고하고, 길이 2 이상의 번역 순환을 오류로 처리합니다. 성공하면 언어별 항목 수와 해당하는 참고용 경고를 표시합니다. 인라인 태그의 종류와 순서가 원문과 일치하는지도 검사합니다.

반면 섹션의 위치, 키의 들여쓰기, 로캘 디렉터리 이름과 `languages.json` 코드의 대응은 **검사하지 않습니다.** 이 세 가지는 사람이 직접 확인해야 합니다.

CI는 모든 풀 리퀘스트에서 위의 사전 검증과 테스트, JavaScript 구문 검사(`node --check`)를 실행합니다. 로컬에서 미리 실행해 두면 주고받는 횟수를 줄일 수 있습니다.

## 풀 리퀘스트

- 작업 브랜치는 `main`에서 만들고, 풀 리퀘스트는 `main`을 대상으로 만들어 주세요.
- `main`에는 다음 릴리스에 포함할 변경 사항이 쌓입니다. 풀 리퀘스트는 squash 병합합니다.
- 릴리스는 메인테이너가 담당합니다. `manifest.json`의 버전을 올리는 풀 리퀘스트를 병합한 후 `main`에 `vX.Y.Z` 형식의 태그를 붙이면 릴리스용 zip이 자동으로 만들어집니다.
- 커밋 메시지는 영어로 작성해 주세요.
- 하나의 풀 리퀘스트에는 하나의 논리적인 변경만 담아 주세요. 어떤 화면의 사전 추가, 버그 수정, 문서 업데이트는 하나가 아니라 세 개의 풀 리퀘스트입니다.
- 관련 이슈가 있다면 링크해 주세요.
- CI를 통과해야 합니다.
- 번역 변경에서는 변경 전후의 스크린샷이 있으면 큰 도움이 됩니다.

## 라이선스

기여하신 내용은 이 프로젝트의 [MIT 라이선스](/LICENSE)에 따라 라이선스가 부여되는 데 동의한 것으로 간주합니다.
