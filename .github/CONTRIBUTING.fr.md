[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# Contribuer à GitHub UI Translator

Merci de l’intérêt que vous portez à l’amélioration de GitHub UI Translator. Ce document explique comment signaler un problème, comment modifier les dictionnaires de traduction et quelles conditions vos modifications doivent remplir pour être fusionnées.

Pour installer et utiliser l’extension, consultez le [README](/README.fr.md).

## Comment contribuer

| Ce que vous voulez faire | Où aller |
| --- | --- |
| Signaler un comportement qui ne fonctionne pas | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| Proposer une traduction pour une langue déjà prise en charge | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| Proposer une nouvelle fonctionnalité ou une nouvelle langue | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| Poser une question ou discuter d’une idée | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

Les issues vierges sont désactivées : choisissez le modèle qui convient. Chaque modèle vous demande de confirmer que vous avez déjà cherché parmi les issues existantes.

## Avant de commencer

Lisez d’abord la [portée de la traduction (English)](/docs/translation-scope.md). Elle définit la règle la plus importante de ce projet : **l’extension traduit uniquement le texte fixe de l’interface de GitHub et laisse volontairement sans traduction le contenu créé par les utilisateurs.**

Les README, le corps des issues, les commentaires, les blocs de code, les noms de fichiers, les noms de dépôts, les noms d’utilisateur et les titres des pages du Wiki sont exclus délibérément, même lorsqu’ils correspondent exactement à une clé du dictionnaire. Une modification qui traduit l’un de ces éléments ne sera pas fusionnée : mieux vaut donc comprendre cette limite avant d’écrire du code.

## Préparer l’environnement de développement

Clonez le dépôt et chargez-le comme extension non empaquetée.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome** : ouvrez `chrome://extensions`, activez le mode développeur, cliquez sur « Charger l’extension non empaquetée » et sélectionnez le dossier cloné (celui qui contient `manifest.json`).
- **Firefox** : ouvrez `about:debugging#/runtime/this-firefox`, cliquez sur « Charger un module complémentaire temporaire… » et sélectionnez `manifest.json`. Un module temporaire est supprimé au redémarrage de Firefox : rechargez-le à chaque session.

Aucune étape de build ni installation de dépendances n’est nécessaire pour charger et utiliser l’extension. Après avoir modifié un fichier, rechargez l’extension et actualisez la page GitHub sur laquelle vous faites vos tests.

La validation des dictionnaires et les tests nécessitent Node.js. Installez les dépendances de test avec la version de pnpm indiquée par `packageManager` dans `package.json`. La CI utilise Node 26.

## Modifier les dictionnaires

Les traductions se trouvent dans `dictionaries/<code>.json`. Il y en a actuellement neuf : [`ja.json`](/dictionaries/ja.json), [`zh-CN.json`](/dictionaries/zh-CN.json), [`zh-TW.json`](/dictionaries/zh-TW.json), [`es.json`](/dictionaries/es.json), [`de.json`](/dictionaries/de.json), [`pt-BR.json`](/dictionaries/pt-BR.json), [`ko.json`](/dictionaries/ko.json), [`fr.json`](/dictionaries/fr.json) et [`ru.json`](/dictionaries/ru.json).

```jsonc
{
  "language": "fr",
  "name": "Français",
  "translations": {
    // ==== Repository navigation ====
    "Code": "Code",
    "Issues": "Issues"
  }
}
```

Sept règles sont importantes. Le script de validation vérifie ce qu’il peut déterminer à partir des fichiers ; le reste doit être contrôlé lors de la revue.

**1. Tous les dictionnaires doivent contenir exactement les mêmes clés.** C’est l’erreur la plus fréquente. Si vous ajoutez une entrée uniquement à `ja.json` sans l’ajouter aux autres dictionnaires, la CI échoue avec `missing keys`. Ajoutez l’entrée à *tous* les dictionnaires dans la même pull request. Si vous ne pouvez pas la traduire dans une langue que vous ne maîtrisez pas, indiquez-le dans la pull request plutôt que d’omettre la clé.

**2. Les clés doivent correspondre exactement au texte anglais d’origine.** Les espaces en début et en fin sont supprimés avant la comparaison. De plus, pour le **texte visible** uniquement, les suites d’espaces, retours à la ligne compris, sont normalisées en un seul espace : une clé écrite sur une ligne correspond donc aussi à un texte que GitHub affiche sur plusieurs lignes. **Les valeurs d’attributs ne sont pas normalisées ; seul `trim()` leur est appliqué.** `aria-label`, `placeholder`, la `value` des boutons et `data-disable-with` sont comparés tels quels, hormis les espaces aux extrémités : les clés qui les visent doivent donc reproduire exactement les espaces internes de l’original. Le script de validation signale une erreur si une clé commence ou se termine par un espace, mais la correspondance avec le texte d’origine de GitHub et ses espaces internes doit être vérifiée lors de la revue.

**3. Les commentaires doivent occuper une ligne entière.** Les fichiers sont au format JSON avec des commentaires de ligne `//` (format JSONC). Comme `JSON.parse` ne prend pas en charge les commentaires, l’extension supprime les lignes de commentaire avant l’analyse. Un commentaire placé en fin de ligne après une valeur provoque une erreur d’analyse.

**4. Regroupez les entrées par écran de GitHub.** Chaque groupe commence par un commentaire `// ==== Nom de la section ====`. Ajoutez les nouvelles entrées dans le groupe correspondant, et non à la fin du fichier. C’est ce qui permet de savoir quelle section est concernée lorsque GitHub modifie son interface. L’emplacement n’est pas vérifié : une entrée placée dans le mauvais groupe passe la CI.

**5. Indentez les clés avec quatre espaces.** La détection des clés en double lit le fichier brut ligne par ligne et ne reconnaît que les clés ayant exactement cette indentation. Une indentation différente ne provoque pas d’erreur : elle exclut silencieusement ces clés de la vérification, si bien qu’un vrai doublon peut passer inaperçu.

**6. Les chaînes de traduction doivent converger.** Une traduction est parfois identique à l’original pour indiquer qu’un nom de produit ne doit pas être traduit, comme `"Wiki": "Wiki"`. Le script de validation signale ces auto-correspondances comme des avertissements, et non comme des erreurs. En revanche, une traduction qui alterne entre deux valeurs différentes ou plus, comme `A → B → A`, ne converge jamais et provoque une erreur. Une chaîne qui ne forme pas de cycle mais dont le résultat change encore au passage suivant est aussi signalée comme avertissement pour pouvoir être revue.

**7. Conservez les types et l’ordre des balises en ligne.** Si une clé contient des balises telles que `<a>`, `<strong>` ou `<code>`, la traduction doit conserver les mêmes types de balises dans le même ordre. Ne supprimez pas les balises et ne les réorganisez pas. L’extension remplace uniquement le texte, sans réorganiser les éléments DOM existants. Le script de validation vérifie aussi que les types et l’ordre des balises correspondent à l’original.

Les valeurs doivent être des chaînes non vides. Une clé en double dans un même fichier est une erreur.

## Principes de traduction

- Privilégiez les termes que les développeurs dont c’est la langue maternelle utilisent réellement. Une traduction qui se lit naturellement à l’écran compte davantage qu’une reprise littérale de la localisation officielle de GitHub.
- Servez-vous de la traduction et de l’écriture de la documentation officielle de GitHub comme référence. Consultez la [documentation en japonais](https://docs.github.com/ja), [en chinois simplifié](https://docs.github.com/zh), [en espagnol](https://docs.github.com/es), [en allemand](https://docs.github.com/de), [en portugais](https://docs.github.com/pt), [en coréen](https://docs.github.com/ko), [en français](https://docs.github.com/fr) et [en russe](https://docs.github.com/ru). Il n’existe pas de documentation officielle en chinois traditionnel.
- Vérifiez le contexte sur l’écran actuel de GitHub et tenez compte des endroits connus où la même clé anglaise est utilisée. Comme une clé de dictionnaire ne peut avoir qu’une seule traduction, privilégiez une formulation qui reste claire dans tous ces contextes.
- Restez cohérent avec les traductions et l’écriture associées du dictionnaire existant, et conservez les noms de produits et de fonctionnalités que GitHub laisse en anglais.
- Si vous choisissez une traduction différente de la documentation officielle ou modifiez une traduction existante, expliquez pourquoi dans la pull request. En cas de désaccord entre les mainteneurs et les contributeurs natifs, l’avis des locuteurs natifs prévaut.

## Ajouter une nouvelle langue

1. Ajoutez `dictionaries/<code>.json` au format ci-dessus. Le champ `language` doit être égal à `<code>` et le champ `name` doit être égal au nom d’affichage que vous enregistrez à l’étape 2.
2. Ajoutez `{ "code": "<code>", "name": "<nom d’affichage>" }` à [`languages.json`](/languages.json). La fenêtre contextuelle et la page d’options lisent toutes deux cette liste.
3. Ajoutez `_locales/<code de paramètres régionaux>/messages.json` avec les mêmes clés de message que [`_locales/en/messages.json`](/_locales/en/messages.json). Cela localise l’interface propre à l’extension (la fenêtre contextuelle, la page d’options, ainsi que le nom et la description de l’extension) ; c’est un mécanisme distinct des dictionnaires de traduction de GitHub.

**Le nom du répertoire de paramètres régionaux n’est pas toujours identique au code du dictionnaire.** WebExtensions exige le format `langue_RÉGION` séparé par un tiret bas, alors que les codes de dictionnaire utilisent le format BCP 47 séparé par un trait d’union. Le chinois simplifié et le portugais brésilien en sont des exemples existants.

| | Code du dictionnaire | Répertoire de paramètres régionaux |
| --- | --- | --- |
| Japonais | `ja` | `_locales/ja` |
| Chinois simplifié | `zh-CN` | `_locales/zh_CN` |
| Chinois traditionnel | `zh-TW` | `_locales/zh_TW` |
| Espagnol | `es` | `_locales/es` |
| Allemand | `de` | `_locales/de` |
| Portugais brésilien | `pt-BR` | `_locales/pt_BR` |
| Coréen | `ko` | `_locales/ko` |
| Français | `fr` | `_locales/fr` |
| Russe | `ru` | `_locales/ru` |

Le navigateur ignore les répertoires nommés `_locales/zh-CN` ou `_locales/pt-BR`, et rien ne le détecte. [`scripts/validate.mjs`](/scripts/validate.mjs) compare seulement les clés de message entre les répertoires de paramètres régionaux existants et ne vérifie pas leur correspondance avec les codes de `languages.json`. L’interface et les métadonnées de l’extension reviennent alors silencieusement à l’anglais.

Un nouveau dictionnaire doit contenir toutes les clés des dictionnaires existants : c’est donc une modification importante. Avant de commencer, ouvrez un Feature request pour que nous nous mettions d’accord sur la portée.

## Valider vos modifications

Avant d’ouvrir une pull request, installez les dépendances et exécutez la validation des dictionnaires et les tests.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

Le validateur de dictionnaires (`pnpm run validate`) vérifie le format et les métadonnées des dictionnaires, les clés en double, les clés vides ou entourées d’espaces, la correspondance des clés entre tous les dictionnaires et entre tous les `_locales`, la résolution de tous les espaces réservés `__MSG_*__` de `manifest.json`, et le chargement de `shared.js` avant `content.js`. Il signale aussi les auto-correspondances et les chaînes de traduction dont le résultat change encore au passage suivant, et rejette les cycles de traduction de longueur deux ou plus. En cas de succès, il affiche le nombre d’entrées par langue et les éventuels avertissements informatifs. Il vérifie aussi que les types et l’ordre des balises en ligne correspondent à l’original.

En revanche, il **ne vérifie pas** l’emplacement des sections, l’indentation des clés, ni la correspondance entre les noms des répertoires de paramètres régionaux et les codes de `languages.json`. Ces trois points doivent être vérifiés à la main.

La CI exécute la validation des dictionnaires et les tests ci-dessus, ainsi que les vérifications de syntaxe JavaScript (`node --check`), sur chaque pull request. Les exécuter en local vous évite des allers-retours.

## Pull requests

- Créez votre branche de travail à partir de `main` et ouvrez la pull request vers `main`.
- `main` accumule les modifications de la prochaine version. Les pull requests sont fusionnées en squash.
- Les versions sont publiées par les mainteneurs. Une fois fusionnée la pull request qui augmente la version dans `manifest.json`, un tag au format `vX.Y.Z` est ajouté sur `main` et le zip de la version est créé automatiquement.
- Rédigez les messages de commit en anglais.
- Limitez chaque pull request à une seule modification logique. L’ajout d’entrées au dictionnaire pour un écran, une correction de bug et une mise à jour de la documentation font trois pull requests, et non une.
- Si une issue est liée, ajoutez son lien.
- La CI doit réussir.
- Pour les modifications de traduction, des captures d’écran avant et après sont très utiles.

## Licence

En contribuant, vous acceptez que vos contributions soient placées sous la [licence MIT](/LICENSE) de ce projet.
