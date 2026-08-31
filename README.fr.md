# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Русский](README.ru.md)

[![Latest Release](https://img.shields.io/github/v/release/nobuo-miura/github-ui-translator?label=Latest%20Release)](https://github.com/nobuo-miura/github-ui-translator/releases/latest)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/igdplojdbbpfbedgoaokfcagpkofmngk?label=Chrome%20Web%20Store&logo=googlechrome)](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&logo=microsoftedge&query=%24.version&prefix=v&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffgjocjmjjghflobobinafkbkeildanoj)](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/github-ui-translator?label=Firefox%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/github-ui-translator/)
[![Validation](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml/badge.svg)](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GitHub UI Translator est une extension pour Chrome, Edge et Firefox qui traduit l’interface anglaise de GitHub en japonais, chinois simplifié, espagnol, allemand, portugais brésilien, coréen, français ou russe à l’aide de dictionnaires locaux.
Elle ne dépend d’aucune API de traduction ni d’aucun service cloud externe : toute la traduction s’effectue localement dans le navigateur.

![Résultat de la traduction en japonais](docs/images/jp.jpeg)

<details>
<summary>Captures d’écran des 8 langues prises en charge</summary>

La première ligne montre l’interface anglaise d’origine de GitHub ; chaque ligne suivante présente le résultat dans une langue.

![Résultats de traduction dans les 8 langues prises en charge](docs/images/languages.png)

</details>

## Fonctionnalités

- Effectue toutes les traductions localement, sans envoyer le contenu des pages ni les paramètres à des services externes
- Traduit les textes fixes de l’interface de GitHub, tels que les éléments de navigation et les boutons, tout en évitant les zones de contenu créées par les utilisateurs, comme les fichiers README, les problèmes, les commentaires et les blocs de code
- Permet d’activer ou de désactiver la traduction depuis la fenêtre contextuelle de l’extension
- Attend la fin de l’hydratation React de GitHub avant de traduire l’en-tête global afin de réduire le risque d’interférence avec la recherche globale ; cette fonction peut aussi être désactivée dans la fenêtre contextuelle

## Documentation

- [Périmètre de traduction (English)](docs/translation-scope.md) ([日本語](docs/translation-scope.ja.md))

## Limitations

- Le japonais, le chinois simplifié, l’espagnol, l’allemand, le portugais brésilien, le coréen, le français et le russe sont actuellement pris en charge. D’autres langues seront ajoutées à mesure que leur couverture progressera.
- Les textes dynamiques contenant des nombres ou des dates, tels que « 3 commits » ou « opened 2 days ago », ne sont pas traduits. Le contenu créé par les utilisateurs, comme les noms d’utilisateur, est également exclu. Consultez le [périmètre de traduction](docs/translation-scope.md) pour plus de détails.
- Seul `github.com` est pris en charge. GitHub Enterprise et les autres domaines personnalisés ne le sont pas.
- L’extension a été testée sur Chrome, Edge et Firefox. D’autres navigateurs basés sur Chromium peuvent également fonctionner, mais n’ont pas été testés explicitement.

## Installation

### Chrome

Installez [GitHub UI Translator depuis le Chrome Web Store](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk).

Si le Chrome Web Store n’est pas accessible dans votre environnement, par exemple sur un appareil administré par une entreprise :

1. Téléchargez le fichier `.zip` de la [dernière version](https://github.com/nobuo-miura/github-ui-translator/releases/latest), puis extrayez-le.
2. Ouvrez `chrome://extensions` dans Chrome et activez le mode développeur.
3. Cliquez sur « Charger l’extension non empaquetée », puis sélectionnez le dossier extrait.

Les extensions installées manuellement ne se mettent pas à jour automatiquement. Répétez ces étapes lorsqu’une nouvelle version est publiée. Les règles de votre organisation peuvent également interdire le mode développeur ou les extensions installées manuellement ; dans ce cas, contactez votre administrateur.

### Edge

Installez [GitHub UI Translator depuis les modules complémentaires Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj).

### Firefox

Firefox 142 ou une version ultérieure est requis.

Installez [GitHub UI Translator depuis Firefox Add-ons](https://addons.mozilla.org/firefox/addon/github-ui-translator/).

Après l’installation, ouvrez une page GitHub telle que `https://github.com/...` : les textes d’interface pris en charge seront automatiquement traduits dans la langue sélectionnée.

### Installation pour le développement (chargement depuis le dépôt)

Pour personnaliser un dictionnaire ou contribuer au développement, clonez le dépôt et chargez directement l’extension.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome / Edge** : ouvrez `chrome://extensions` dans Chrome ou `edge://extensions` dans Edge, activez le mode développeur, cliquez sur « Charger l’extension non empaquetée », puis sélectionnez le dossier cloné qui contient `manifest.json`.
- **Firefox** : ouvrez `about:debugging#/runtime/this-firefox`, cliquez sur « Charger un module complémentaire temporaire… », puis sélectionnez le fichier `manifest.json` du dépôt. Un module temporaire est supprimé au redémarrage de Firefox et doit donc être rechargé à chaque session.

## Utilisation

- Cliquez sur l’icône de l’extension dans la barre d’outils pour afficher l’interrupteur de traduction et le sélecteur de langue. Le japonais, le chinois simplifié, l’espagnol, l’allemand, le portugais brésilien, le coréen, le français et le russe sont actuellement inclus ; la liste pourra accueillir d’autres langues lorsque de nouveaux dictionnaires seront ajoutés.
- Toute modification de l’interrupteur ou de la langue recharge les onglets GitHub ouverts afin d’appliquer le nouveau paramètre.
- La fenêtre contextuelle permet aussi de choisir si l’en-tête global doit être traduit et contient un lien vers ce dépôt. La modification de cette option recharge également les onglets GitHub. La traduction de l’en-tête global est activée par défaut et attend la fin de l’hydratation React de GitHub ; désactivez-la si la recherche globale ne s’ouvre pas.
- Ouvrez la page des options de l’extension (`chrome://extensions` dans Chrome, `edge://extensions` dans Edge ou `about:addons` dans Firefox) pour consulter les informations sur les dictionnaires inclus et la version de l’extension.

## Personnalisation du dictionnaire

Vous pouvez ajouter ou modifier des traductions en éditant directement le dictionnaire de la langue concernée, par exemple `dictionaries/ja.json`, `dictionaries/zh-CN.json`, `dictionaries/es.json`, `dictionaries/de.json`, `dictionaries/pt-BR.json`, `dictionaries/ko.json`, `dictionaries/fr.json` ou `dictionaries/ru.json`.
Les entrées sont regroupées par écran GitHub (navigation du dépôt, paramètres du dépôt, paramètres de l’organisation, etc.). Chaque groupe commence par une ligne de commentaire `// ====`, ce qui permet d’identifier rapidement l’écran correspondant et de repérer les changements dans les textes de l’interface GitHub.

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== Navigation du dépôt ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- Le fichier est au format JSON avec des commentaires de ligne `//` (style JSONC). Seuls les commentaires occupant une ligne entière sont pris en charge ; les commentaires placés après une valeur ne le sont pas. Comme `JSON.parse` et `fetch().json()` ne gèrent pas les commentaires, l’extension supprime les lignes de commentaire avant l’analyse.
- Les clés du dictionnaire doivent correspondre **exactement** au texte anglais d’origine. Les espaces en début et en fin de chaîne sont ignorés pour le texte visible et les valeurs d’attribut prises en charge. Pour le texte visible uniquement, les suites d’espaces — y compris les sauts de ligne — sont réduites à un seul espace. Les valeurs d’attribut comme `aria-label`, `placeholder`, la propriété `value` des boutons et `data-disable-with` conservent leurs espaces internes lors de la comparaison. Les clés elles-mêmes ne doivent pas comporter d’espaces initiaux ou finaux.
- Après avoir modifié un dictionnaire, rechargez l’extension depuis `chrome://extensions` dans Chrome, `edge://extensions` dans Edge ou `about:debugging` dans Firefox.

### Ajout d’une langue

1. Ajoutez `dictionaries/<code>.json` (par exemple `dictionaries/en.json`) en conservant le même format.
2. Ajoutez `{ "code": "<code>", "name": "<display name>" }` à `languages.json`. La fenêtre contextuelle et la page des options utilisent toutes deux cette liste commune.
3. Exécutez `node scripts/validate.mjs` pour vérifier le format des dictionnaires, les clés en double, les métadonnées, l’égalité des clés entre les dictionnaires inclus, les auto-correspondances, les chaînes de traduction et les cycles qui ne convergent pas.

La fenêtre contextuelle, la page des options et les métadonnées de l’extension utilisent le mécanisme `_locales` des extensions de navigateur, indépendamment des dictionnaires de traduction de GitHub. Pour proposer également l’interface de l’extension dans une nouvelle langue, ajoutez `_locales/<code>/messages.json` avec les mêmes clés de message que `_locales/en/messages.json`.

## Structure du projet

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # Liste de langues partagée et utilitaires de localisation de l’interface
├─ languages.json   # Langues incluses pour la traduction de GitHub
├─ content.js       # Moteur de traduction qui parcourt le DOM à l’aide d’une liste d’autorisation
├─ popup.html/js    # Fenêtre contextuelle de la barre d’outils avec interrupteur de traduction
├─ options.html/js  # Informations sur les dictionnaires et affichage de la version
├─ _locales/        # Messages localisés de la fenêtre contextuelle, des options et des métadonnées
├─ dictionaries/
│  ├─ ja.json       # Dictionnaire japonais
│  ├─ zh-CN.json    # Dictionnaire chinois simplifié
│  ├─ es.json       # Dictionnaire espagnol
│  ├─ de.json       # Dictionnaire allemand
│  ├─ pt-BR.json    # Dictionnaire portugais brésilien
│  ├─ ko.json       # Dictionnaire coréen
│  ├─ fr.json       # Dictionnaire français
│  └─ ru.json       # Dictionnaire russe
├─ docs/
│  ├─ translation-scope.md     # Version anglaise
│  └─ translation-scope.ja.md  # Version japonaise
├─ scripts/
│  └─ validate.mjs  # Validation des dictionnaires et de la localisation
└─ icons/
```

## Licence

[Licence MIT](./LICENSE)
