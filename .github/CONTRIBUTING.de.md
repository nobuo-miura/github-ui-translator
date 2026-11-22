[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# Zu GitHub UI Translator beitragen

Danke für dein Interesse, GitHub UI Translator zu verbessern. Dieses Dokument erklärt, wie du Probleme meldest, wie du die Übersetzungswörterbücher bearbeitest und welche Bedingungen deine Änderungen erfüllen müssen, bevor sie gemergt werden können.

Wie du die Erweiterung installierst und verwendest, steht in der [README](/README.de.md).

## Möglichkeiten, beizutragen

| Was du tun möchtest | Wo |
| --- | --- |
| Ein Verhalten melden, das nicht funktioniert | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| Eine Übersetzung für eine bereits unterstützte Sprache vorschlagen | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| Eine neue Funktion oder eine neue Sprache vorschlagen | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| Eine Frage stellen oder eine Idee besprechen | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

Leere Issues sind deaktiviert, wähle also bitte die passende Vorlage. Jede Vorlage bittet dich zu bestätigen, dass du die vorhandenen Issues bereits durchsucht hast.

## Bevor du anfängst

Lies zuerst den [Übersetzungsumfang (English)](/docs/translation-scope.md). Dort ist die wichtigste Regel dieses Projekts festgelegt: **Die Erweiterung übersetzt nur feste Texte der GitHub-Oberfläche und lässt von Nutzern erstellte Inhalte bewusst unübersetzt.**

READMEs, Issue-Texte, Kommentare, Codeblöcke, Dateinamen, Repository-Namen, Benutzernamen und Titel von Wiki-Seiten werden absichtlich ausgeschlossen, auch wenn sie genau einem Schlüssel im Wörterbuch entsprechen. Eine Änderung, die einen dieser Inhalte übersetzt, wird nicht gemergt. Es lohnt sich also, diese Grenze zu verstehen, bevor du Code schreibst.

## Entwicklungsumgebung einrichten

Klone das Repository und lade es als entpackte Erweiterung.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: Öffne `chrome://extensions`, aktiviere den Entwicklermodus, klicke auf „Entpackte Erweiterung laden“ und wähle den geklonten Ordner (den Ordner mit `manifest.json`).
- **Firefox**: Öffne `about:debugging#/runtime/this-firefox`, klicke auf „Temporäres Add-on laden…“ und wähle `manifest.json`. Ein temporäres Add-on wird beim Neustart von Firefox entfernt, lade es also in jeder Sitzung neu.

Zum Laden und Ausführen der Erweiterung sind weder ein Build-Schritt noch die Installation von Abhängigkeiten nötig. Lade nach jeder Dateiänderung die Erweiterung neu und aktualisiere die GitHub-Seite, auf der du testest.

Für die Wörterbuchvalidierung und die Tests brauchst du Node.js. Installiere die Testabhängigkeiten mit pnpm in der Version, die unter `packageManager` in `package.json` angegeben ist. Die CI verwendet Node 26.

## Wörterbücher bearbeiten

Die Übersetzungen liegen in `dictionaries/<Code>.json`. Derzeit sind es neun: [`ja.json`](/dictionaries/ja.json), [`zh-CN.json`](/dictionaries/zh-CN.json), [`zh-TW.json`](/dictionaries/zh-TW.json), [`es.json`](/dictionaries/es.json), [`de.json`](/dictionaries/de.json), [`pt-BR.json`](/dictionaries/pt-BR.json), [`ko.json`](/dictionaries/ko.json), [`fr.json`](/dictionaries/fr.json) und [`ru.json`](/dictionaries/ru.json).

```jsonc
{
  "language": "de",
  "name": "Deutsch",
  "translations": {
    // ==== Repository navigation ====
    "Code": "Code",
    "Issues": "Issues"
  }
}
```

Sieben Regeln sind wichtig. Das Validierungsskript prüft, was sich aus den Dateien ermitteln lässt; der Rest muss im Review geprüft werden.

**1. Alle Wörterbücher müssen genau dieselben Schlüssel enthalten.** Hier passieren die meisten Fehler. Wenn du einen Eintrag nur zu `ja.json` hinzufügst und die anderen Wörterbücher vergisst, schlägt die CI mit `missing keys` fehl. Füge den Eintrag im selben Pull Request zu *allen* Wörterbüchern hinzu. Wenn du ihn in eine Sprache, die du nicht sprichst, nicht übersetzen kannst, schreib das in den Pull Request, statt den Schlüssel wegzulassen.

**2. Schlüssel müssen genau dem englischen Originaltext entsprechen.** Vor dem Abgleich werden Leerzeichen am Anfang und Ende entfernt. Außerdem werden nur bei **sichtbarem Text** Folgen von Leerzeichen, einschließlich Zeilenumbrüchen, zu einem einzelnen Leerzeichen zusammengefasst. Ein einzeilig geschriebener Schlüssel passt daher auch zu Text, den GitHub über mehrere Zeilen umbricht. **Attributwerte werden nicht normalisiert, sondern nur mit `trim()` bereinigt.** `aria-label`, `placeholder`, der `value` von Schaltflächen und `data-disable-with` werden bis auf die Leerzeichen an den Rändern unverändert abgeglichen. Schlüssel für diese Attribute müssen die inneren Leerzeichen des Originals also genau wiedergeben. Das Validierungsskript meldet einen Fehler, wenn ein Schlüssel mit Leerzeichen beginnt oder endet. Ob er dem Originaltext von GitHub und dessen inneren Leerzeichen entspricht, muss aber im Review geprüft werden.

**3. Kommentare sind nur als ganze Zeilen erlaubt.** Die Dateien sind JSON mit `//`-Zeilenkommentaren (JSONC-Format). Da `JSON.parse` keine Kommentare unterstützt, entfernt die Erweiterung Kommentarzeilen vor dem Parsen. Ein Kommentar am Ende derselben Zeile wie ein Wert führt zu einem Parse-Fehler.

**4. Gruppiere die Einträge nach GitHub-Seite.** Jede Gruppe beginnt mit einem Kommentar `// ==== Abschnittsname ====`. Füge neue Einträge in die passende Gruppe ein und nicht ans Ende der Datei. So lässt sich erkennen, welcher Abschnitt betroffen ist, wenn GitHub seine Oberfläche ändert. Die Platzierung wird nicht geprüft, ein Eintrag in der falschen Gruppe besteht die CI also trotzdem.

**5. Rücke Schlüssel mit vier Leerzeichen ein.** Die Prüfung auf doppelte Schlüssel liest die Rohdatei Zeile für Zeile und erkennt nur Schlüssel mit genau dieser Einrückung. Eine andere Einrückung erzeugt keinen Fehler, sondern nimmt diese Schlüssel stillschweigend aus der Prüfung heraus, sodass ein echtes Duplikat unbemerkt bleiben kann.

**6. Übersetzungsketten müssen konvergieren.** Manchmal ist eine Übersetzung absichtlich identisch mit dem Original, etwa `"Wiki": "Wiki"`, um festzuhalten, dass ein Produktname nicht übersetzt wird. Das Validierungsskript meldet solche Selbstzuordnungen als Warnungen, nicht als Fehler. Eine Übersetzung, die zwischen zwei oder mehr verschiedenen Werten wechselt, etwa `A → B → A`, konvergiert dagegen nie und wird als Fehler gemeldet. Ketten ohne Zyklus, deren Ergebnis sich beim nächsten Durchlauf erneut ändert, werden ebenfalls als Warnung gemeldet, damit sie geprüft werden können.

**7. Behalte Typ und Reihenfolge der Inline-Tags bei.** Enthält ein Schlüssel Tags wie `<a>`, `<strong>` oder `<code>`, muss die Übersetzung dieselben Tag-Typen in derselben Reihenfolge enthalten. Entferne keine Tags und ändere ihre Reihenfolge nicht. Die Erweiterung ersetzt nur Text, ohne bestehende DOM-Elemente umzuordnen. Das Validierungsskript prüft ebenfalls, ob Typ und Reihenfolge der Tags mit dem Original übereinstimmen.

Werte müssen nicht leere Strings sein. Doppelte Schlüssel innerhalb einer Datei sind ein Fehler.

## Übersetzungsrichtlinien

- Bevorzuge die Begriffe, die Entwicklerinnen und Entwickler mit der jeweiligen Muttersprache tatsächlich verwenden. Eine Übersetzung, die sich in der Oberfläche natürlich liest, ist wichtiger als eine wörtliche Übernahme der offiziellen GitHub-Lokalisierung.
- Nimm Übersetzung und Schreibweise der offiziellen GitHub-Dokumentation als Referenz. Siehe die [japanische](https://docs.github.com/ja), [vereinfacht chinesische](https://docs.github.com/zh), [spanische](https://docs.github.com/es), [deutsche](https://docs.github.com/de), [portugiesische](https://docs.github.com/pt), [koreanische](https://docs.github.com/ko), [französische](https://docs.github.com/fr) und [russische Dokumentation](https://docs.github.com/ru). Für traditionelles Chinesisch gibt es keine offizielle Dokumentation.
- Prüfe den Kontext auf der aktuellen GitHub-Seite und berücksichtige die bekannten Stellen, an denen derselbe englische Schlüssel verwendet wird. Da ein Wörterbuchschlüssel nur eine Übersetzung haben kann, bevorzuge Formulierungen, die in all diesen Kontexten verständlich sind.
- Halte Übersetzungen und Schreibweisen einheitlich mit verwandten Einträgen im bestehenden Wörterbuch und behalte Produkt- und Funktionsnamen bei, die GitHub auf Englisch lässt.
- Wenn du eine andere Übersetzung als die offizielle Dokumentation wählst oder eine bestehende Übersetzung änderst, begründe das im Pull Request. Wenn Maintainer und muttersprachliche Mitwirkende unterschiedlicher Meinung sind, hat das Urteil der Muttersprachler Vorrang.

## Eine neue Sprache hinzufügen

1. Füge `dictionaries/<Code>.json` im obigen Format hinzu. Das Feld `language` muss `<Code>` entsprechen und das Feld `name` dem Anzeigenamen, den du in Schritt 2 einträgst.
2. Füge `{ "code": "<Code>", "name": "<Anzeigename>" }` zu [`languages.json`](/languages.json) hinzu. Das Pop-up und die Optionsseite lesen beide diese Liste.
3. Füge `_locales/<Locale-Code>/messages.json` mit denselben Nachrichtenschlüsseln wie [`_locales/en/messages.json`](/_locales/en/messages.json) hinzu. Damit wird die Oberfläche der Erweiterung selbst lokalisiert (das Pop-up, die Optionsseite sowie Name und Beschreibung der Erweiterung). Das ist ein anderer Mechanismus als die Übersetzungswörterbücher für GitHub.

**Der Name des Locale-Verzeichnisses ist nicht immer gleich dem Wörterbuch-Code.** WebExtensions verlangt `Sprache_REGION` mit Unterstrich, während die Wörterbuch-Codes die BCP-47-Form mit Bindestrich verwenden. Vereinfachtes Chinesisch und brasilianisches Portugiesisch sind bestehende Beispiele.

| | Wörterbuch-Code | Locale-Verzeichnis |
| --- | --- | --- |
| Japanisch | `ja` | `_locales/ja` |
| Vereinfachtes Chinesisch | `zh-CN` | `_locales/zh_CN` |
| Traditionelles Chinesisch | `zh-TW` | `_locales/zh_TW` |
| Spanisch | `es` | `_locales/es` |
| Deutsch | `de` | `_locales/de` |
| Brasilianisches Portugiesisch | `pt-BR` | `_locales/pt_BR` |
| Koreanisch | `ko` | `_locales/ko` |
| Französisch | `fr` | `_locales/fr` |
| Russisch | `ru` | `_locales/ru` |

Der Browser ignoriert Verzeichnisse mit den Namen `_locales/zh-CN` oder `_locales/pt-BR`, und nichts erkennt das. [`scripts/validate.mjs`](/scripts/validate.mjs) vergleicht nur die Nachrichtenschlüssel zwischen den vorhandenen Locale-Verzeichnissen und prüft nicht, ob sie zu den Codes in `languages.json` passen. Oberfläche und Metadaten der Erweiterung fallen dann stillschweigend auf Englisch zurück.

Ein neues Wörterbuch braucht alle Schlüssel der bestehenden Wörterbücher, es ist also eine große Änderung. Erstelle vor dem Start bitte einen Feature request, damit wir den Umfang abstimmen können.

## Änderungen validieren

Installiere vor dem Erstellen eines Pull Requests die Abhängigkeiten und führe die Wörterbuchvalidierung und die Tests aus.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

Die Wörterbuchvalidierung (`pnpm run validate`) prüft Format und Metadaten der Wörterbücher, doppelte Schlüssel, leere Schlüssel oder Schlüssel mit Leerzeichen an den Rändern, ob die Schlüssel in allen Wörterbüchern und in allen `_locales` übereinstimmen, ob alle `__MSG_*__`-Platzhalter in `manifest.json` aufgelöst werden und ob `shared.js` vor `content.js` geladen wird. Außerdem warnt es vor Selbstzuordnungen und Übersetzungsketten, deren Ergebnis sich beim nächsten Durchlauf erneut ändert, und lehnt Übersetzungszyklen der Länge zwei oder mehr als Fehler ab. Bei Erfolg zeigt es die Anzahl der Einträge pro Sprache und gegebenenfalls informative Warnungen an. Sie prüft auch, ob Typ und Reihenfolge der Inline-Tags mit dem Original übereinstimmen.

Es prüft dagegen **nicht** die Platzierung der Abschnitte, die Einrückung der Schlüssel und ob die Namen der Locale-Verzeichnisse zu den Codes in `languages.json` passen. Diese drei Punkte müssen von Hand geprüft werden.

Die CI führt bei jedem Pull Request die oben genannten Wörterbuchprüfungen und Tests sowie JavaScript-Syntaxprüfungen (`node --check`) aus. Wenn du sie vorher lokal ausführst, sparst du dir Rückfragen.

## Pull Requests

- Erstelle deinen Branch von `main` und öffne den Pull Request gegen `main`.
- In `main` sammeln sich die Änderungen für das nächste Release. Pull Requests werden per Squash gemergt.
- Releases übernehmen die Maintainer. Nachdem ein Pull Request gemergt wurde, der die Version in `manifest.json` erhöht, wird auf `main` ein Tag im Format `vX.Y.Z` gesetzt und das Release-Zip automatisch erstellt.
- Schreibe Commit-Nachrichten auf Englisch.
- Beschränke jeden Pull Request auf eine logische Änderung. Wörterbucheinträge für eine GitHub-Seite, ein Bugfix und ein Doku-Update sind drei Pull Requests, nicht einer.
- Verlinke das zugehörige Issue, falls es eines gibt.
- Die CI muss erfolgreich sein.
- Bei Übersetzungsänderungen helfen Screenshots vom Zustand vorher und nachher sehr.

## Lizenz

Mit deinem Beitrag erklärst du dich einverstanden, dass er unter der [MIT-Lizenz](/LICENSE) dieses Projekts lizenziert wird.
