# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Русский](README.ru.md)

[![Latest Release](https://img.shields.io/github/v/release/nobuo-miura/github-ui-translator?label=Latest%20Release)](https://github.com/nobuo-miura/github-ui-translator/releases/latest)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/igdplojdbbpfbedgoaokfcagpkofmngk?label=Chrome%20Web%20Store&logo=googlechrome)](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&logo=microsoftedge&query=%24.version&prefix=v&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffgjocjmjjghflobobinafkbkeildanoj)](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/github-ui-translator?label=Firefox%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/github-ui-translator/)
[![Validation](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml/badge.svg)](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GitHub UI Translator ist eine Browsererweiterung für Chrome, Edge und Firefox. Sie übersetzt die englische GitHub-Oberfläche mithilfe lokaler Wörterbücher auf Japanisch, vereinfachtes Chinesisch, Spanisch, Deutsch, brasilianisches Portugiesisch, Koreanisch, Französisch oder Russisch.
Die Erweiterung benötigt weder externe Übersetzungs-APIs noch Cloud-Dienste; sämtliche Übersetzungen erfolgen lokal im Browser.

![Ergebnis der japanischen Übersetzung](docs/images/jp.jpeg)

<details>
<summary>Screenshots aller 8 unterstützten Sprachen</summary>

Die erste Zeile zeigt die englische Originaloberfläche von GitHub. Darunter ist jeweils das Übersetzungsergebnis für eine Sprache zu sehen.

![Übersetzungsergebnisse für alle 8 unterstützten Sprachen](docs/images/languages.png)

</details>

## Funktionen

- Führt sämtliche Übersetzungen lokal aus, ohne Seiteninhalte oder Einstellungen an externe Dienste zu senden
- Übersetzt feste Texte der GitHub-Oberfläche wie Navigationselemente und Schaltflächen, lässt aber von Benutzern erstellte Bereiche wie READMEs, Probleme, Kommentare und Codeblöcke unverändert
- Ermöglicht das Ein- und Ausschalten der Übersetzung über das Erweiterungs-Pop-up
- Übersetzt den globalen Header erst nach Abschluss der React-Hydration von GitHub, um Konflikte mit der globalen Suche möglichst zu vermeiden; die Funktion lässt sich im Pop-up deaktivieren

## Dokumentation

- [Übersetzungsumfang (English)](docs/translation-scope.md) ([日本語](docs/translation-scope.ja.md))

## Einschränkungen

- Derzeit werden Japanisch, vereinfachtes Chinesisch, Spanisch, Deutsch, brasilianisches Portugiesisch, Koreanisch, Französisch und Russisch unterstützt. Weitere Sprachen sind geplant, sobald die jeweilige Abdeckung ausreichend ist.
- Dynamische Texte mit Zahlen oder Datumsangaben wie „3 commits“ oder „opened 2 days ago“ werden nicht übersetzt. Auch benutzergenerierte Inhalte wie Benutzernamen bleiben unverändert. Weitere Informationen enthält der [Übersetzungsumfang](docs/translation-scope.md).
- Es wird ausschließlich `github.com` unterstützt. GitHub Enterprise und andere benutzerdefinierte Domains werden nicht unterstützt.
- Die Erweiterung wurde mit Chrome, Edge und Firefox getestet. Andere Chromium-basierte Browser funktionieren möglicherweise ebenfalls, wurden jedoch nicht ausdrücklich getestet.

## Installation

### Chrome

Installiere [GitHub UI Translator aus dem Chrome Web Store](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk).

Falls der Chrome Web Store in deiner Umgebung nicht verfügbar ist, etwa auf einem vom Unternehmen verwalteten Gerät:

1. Lade die `.zip`-Datei der [neuesten Version](https://github.com/nobuo-miura/github-ui-translator/releases/latest) herunter und entpacke sie.
2. Öffne `chrome://extensions` in Chrome und aktiviere den Entwicklermodus.
3. Klicke auf „Entpackte Erweiterung laden“ und wähle den entpackten Ordner aus.

Manuell installierte Erweiterungen werden nicht automatisch aktualisiert. Wiederhole diese Schritte, sobald eine neue Version veröffentlicht wird. Möglicherweise untersagen die Richtlinien deiner Organisation auch den Entwicklermodus oder manuell installierte Erweiterungen. Wende dich in diesem Fall an die zuständige Administration.

### Edge

Installiere [GitHub UI Translator aus Microsoft Edge-Add-Ons](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj).

### Firefox

Firefox 142 oder neuer ist erforderlich.

Installiere [GitHub UI Translator von Firefox Add-ons](https://addons.mozilla.org/firefox/addon/github-ui-translator/).

Öffne nach der Installation eine GitHub-Seite wie `https://github.com/...`. Unterstützte Oberflächentexte werden automatisch in die ausgewählte Sprache übersetzt.

### Entwicklungsinstallation (direkt aus dem Repository laden)

Klone das Repository und lade die Erweiterung direkt, wenn du ein Wörterbuch anpassen oder an der Entwicklung mitwirken möchtest.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome / Edge**: Öffne `chrome://extensions` in Chrome oder `edge://extensions` in Edge, aktiviere den Entwicklermodus, klicke auf „Entpackte Erweiterung laden“ und wähle den geklonten Ordner aus, der `manifest.json` enthält.
- **Firefox**: Öffne `about:debugging#/runtime/this-firefox`, klicke auf „Temporäres Add-on laden…“ und wähle `manifest.json` aus dem Repository aus. Temporäre Add-ons werden beim Neustart von Firefox entfernt und müssen daher in jeder Sitzung erneut geladen werden.

## Verwendung

- Klicke auf das Erweiterungssymbol in der Symbolleiste, um den Übersetzungsschalter und die Sprachauswahl zu öffnen. Derzeit sind Japanisch, vereinfachtes Chinesisch, Spanisch, Deutsch, brasilianisches Portugiesisch, Koreanisch, Französisch und Russisch enthalten. Die Auswahlliste lässt sich durch weitere Wörterbücher ergänzen.
- Wenn du den Schalter oder die Sprache änderst, werden geöffnete GitHub-Tabs neu geladen, damit die neue Einstellung wirksam wird.
- Im Pop-up kannst du außerdem die Übersetzung des globalen Headers festlegen und dieses Repository öffnen. Auch eine Änderung dieser Option lädt geöffnete GitHub-Tabs neu. Die Header-Übersetzung ist standardmäßig aktiviert und wartet auf den Abschluss der React-Hydration von GitHub. Deaktiviere sie, falls sich die globale Suche nicht öffnen lässt.
- Auf der Optionsseite der Erweiterung (`chrome://extensions` in Chrome, `edge://extensions` in Edge oder `about:addons` in Firefox) findest du Informationen zu den enthaltenen Wörterbüchern und zur Erweiterungsversion.

## Wörterbuch anpassen

Übersetzungen lassen sich hinzufügen oder ändern, indem du die Wörterbuchdatei der gewünschten Sprache direkt bearbeitest, zum Beispiel `dictionaries/ja.json`, `dictionaries/zh-CN.json`, `dictionaries/es.json`, `dictionaries/de.json`, `dictionaries/pt-BR.json`, `dictionaries/ko.json`, `dictionaries/fr.json` oder `dictionaries/ru.json`.
Die Einträge sind nach GitHub-Seiten gruppiert (Repository-Navigation, Repository-Einstellungen, Organisationseinstellungen usw.). Jede Gruppe beginnt mit einer `// ====`-Kommentarzeile. So ist sofort erkennbar, zu welcher Seite ein Eintrag gehört, und Änderungen an GitHubs Oberflächentexten fallen leichter auf.

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== Repository-Navigation ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- Die Datei ist JSON mit `//`-Zeilenkommentaren (JSONC-Stil). Unterstützt werden nur vollständige Kommentarzeilen, nicht jedoch Kommentare hinter einem Wert. Da `JSON.parse` und `fetch().json()` keine Kommentare unterstützen, entfernt die Erweiterung die Kommentarzeilen vor dem Einlesen.
- Wörterbuchschlüssel müssen **exakt** dem englischen Originaltext entsprechen. Führende und nachgestellte Leerzeichen werden sowohl bei sichtbarem Text als auch bei unterstützten Attributwerten ignoriert. Nur bei sichtbarem Text werden aufeinanderfolgende Leerzeichen einschließlich Zeilenumbrüchen zu einem Leerzeichen zusammengefasst. Attributwerte wie `aria-label`, `placeholder`, die Schaltflächen-Eigenschaft `value` und `data-disable-with` behalten beim Abgleich ihre inneren Leerzeichen. Die Wörterbuchschlüssel selbst dürfen keine führenden oder nachgestellten Leerzeichen enthalten.
- Lade die Erweiterung nach der Bearbeitung neu (`chrome://extensions` in Chrome, `edge://extensions` in Edge oder `about:debugging` in Firefox).

### Neue Sprache hinzufügen

1. Lege `dictionaries/<code>.json` (z. B. `dictionaries/en.json`) im gleichen Format an.
2. Ergänze `{ "code": "<code>", "name": "<display name>" }` in `languages.json`. Das Pop-up und die Optionsseite laden beide diese gemeinsame Liste.
3. Führe `node scripts/validate.mjs` aus, um Wörterbuchformat, doppelte Schlüssel, Metadaten, die Schlüsselgleichheit aller enthaltenen Wörterbücher, Selbstzuordnungen, Übersetzungsketten und nicht konvergierende Zyklen zu prüfen.

Pop-up, Optionsseite und Erweiterungsmetadaten verwenden unabhängig von den GitHub-Übersetzungswörterbüchern den `_locales`-Mechanismus für Browsererweiterungen. Um auch die Oberfläche der Erweiterung in einer neuen Sprache anzubieten, lege zusätzlich `_locales/<code>/messages.json` mit denselben Nachrichtenschlüsseln wie `_locales/en/messages.json` an.

## Projektstruktur

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # Gemeinsame Sprachliste und Hilfsfunktionen zur Lokalisierung der Erweiterungsoberfläche
├─ languages.json   # Enthaltene Sprachen für die GitHub-Übersetzung
├─ content.js       # Übersetzungsmodul, das das DOM anhand einer Positivliste durchsucht
├─ popup.html/js    # Symbolleisten-Pop-up mit Übersetzungsschalter
├─ options.html/js  # Wörterbuchinformationen und Versionsanzeige
├─ _locales/        # Lokalisierte Meldungen für Pop-up, Optionen und Erweiterungsmetadaten
├─ dictionaries/
│  ├─ ja.json       # Japanisches Wörterbuch
│  ├─ zh-CN.json    # Wörterbuch für vereinfachtes Chinesisch
│  ├─ es.json       # Spanisches Wörterbuch
│  ├─ de.json       # Deutsches Wörterbuch
│  ├─ pt-BR.json    # Wörterbuch für brasilianisches Portugiesisch
│  ├─ ko.json       # Koreanisches Wörterbuch
│  ├─ fr.json       # Französisches Wörterbuch
│  └─ ru.json       # Russisches Wörterbuch
├─ docs/
│  ├─ translation-scope.md     # Englische Version
│  └─ translation-scope.ja.md  # Japanische Version
├─ scripts/
│  └─ validate.mjs  # Prüfung von Wörterbüchern und Lokalisierung
└─ icons/
```

## Lizenz

[MIT-Lizenz](./LICENSE)
