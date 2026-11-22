[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# Cómo contribuir a GitHub UI Translator

Gracias por tu interés en mejorar GitHub UI Translator. Este documento explica cómo reportar problemas, cómo editar los diccionarios de traducción y qué condiciones deben cumplir tus cambios para poder fusionarse.

Para instalar y usar la extensión, consulta el [README](/README.es.md).

## Formas de contribuir

| Lo que quieres hacer | Dónde |
| --- | --- |
| Reportar un comportamiento que no funciona | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| Sugerir una traducción para un idioma ya admitido | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| Proponer una nueva función o un nuevo idioma | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| Hacer una pregunta o comentar una idea | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

Los issues en blanco están desactivados, así que elige la plantilla que corresponda. Cada plantilla te pide confirmar que ya buscaste entre los issues existentes.

## Antes de empezar

Lee primero el [alcance de la traducción (English)](/docs/translation-scope.md). Ahí se define la regla más importante de este proyecto: **la extensión solo traduce el texto fijo de la interfaz de GitHub y deja sin traducir, a propósito, el contenido creado por los usuarios.**

Los README, el cuerpo de los issues, los comentarios, los bloques de código, los nombres de archivos, los nombres de repositorios, los nombres de usuario y los títulos de las páginas de la Wiki se excluyen intencionadamente, aunque coincidan exactamente con una clave del diccionario. Un cambio que traduzca cualquiera de ellos no se fusionará, así que vale la pena entender este límite antes de escribir código.

## Preparar el entorno de desarrollo

Clona el repositorio y cárgalo como extensión sin empaquetar.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: abre `chrome://extensions`, activa el modo de desarrollador, haz clic en «Cargar descomprimida» y selecciona la carpeta clonada (la que contiene `manifest.json`).
- **Firefox**: abre `about:debugging#/runtime/this-firefox`, haz clic en «Cargar complemento temporal…» y selecciona `manifest.json`. Los complementos temporales se eliminan al reiniciar Firefox, así que vuelve a cargarlo en cada sesión.

Para cargar y ejecutar la extensión no hace falta compilar ni instalar dependencias. Después de editar un archivo, recarga la extensión y actualiza la página de GitHub en la que estés probando.

La validación de diccionarios y las pruebas necesitan Node.js. Instala las dependencias de las pruebas con la versión de pnpm indicada en `packageManager` en `package.json`. La CI usa Node 26.

## Editar los diccionarios

Las traducciones están en `dictionaries/<código>.json`. Actualmente hay nueve: [`ja.json`](/dictionaries/ja.json), [`zh-CN.json`](/dictionaries/zh-CN.json), [`zh-TW.json`](/dictionaries/zh-TW.json), [`es.json`](/dictionaries/es.json), [`de.json`](/dictionaries/de.json), [`pt-BR.json`](/dictionaries/pt-BR.json), [`ko.json`](/dictionaries/ko.json), [`fr.json`](/dictionaries/fr.json) y [`ru.json`](/dictionaries/ru.json).

```jsonc
{
  "language": "es",
  "name": "Español",
  "translations": {
    // ==== Repository navigation ====
    "Code": "Código",
    "Issues": "Issues"
  }
}
```

Hay siete reglas importantes. El script de validación comprueba lo que puede determinar a partir de los archivos; el resto debe revisarse en la revisión.

**1. Todos los diccionarios deben tener exactamente las mismas claves.** Es el punto en el que más se suele fallar. Si agregas una entrada solo a `ja.json` y olvidas agregarla a los demás diccionarios, la CI falla con `missing keys`. Agrega la entrada a *todos* los diccionarios en la misma pull request. Si no puedes traducirla a un idioma que no conoces, indícalo en la pull request en lugar de omitir la clave.

**2. Las claves deben coincidir exactamente con el texto original en inglés.** Antes de comparar, se eliminan los espacios al principio y al final. Además, solo en el **texto visible**, las secuencias de espacios, incluidos los saltos de línea, se normalizan a un único espacio, de modo que una clave escrita en una línea coincide con un texto que GitHub muestra en varias líneas. **Los valores de atributos no se normalizan; solo se les aplica `trim()`**. `aria-label`, `placeholder`, el `value` de los botones y `data-disable-with` se comparan tal cual, salvo los espacios de los extremos, así que las claves dirigidas a ellos deben reproducir exactamente los espacios internos del original. El script de validación da error si una clave tiene espacios al principio o al final, pero si coincide con el texto original de GitHub y sus espacios internos debe comprobarse en la revisión.

**3. Los comentarios solo pueden ocupar líneas completas.** Los archivos son JSON con comentarios de línea `//` (formato JSONC). Como `JSON.parse` no admite comentarios, la extensión elimina las líneas de comentario antes de analizar el archivo. Un comentario al final de la misma línea que un valor provoca un error de análisis.

**4. Agrupa las entradas por pantalla de GitHub.** Cada grupo empieza con un comentario `// ==== Nombre de la sección ====`. Agrega las entradas nuevas en el grupo que les corresponde y no al final del archivo. Así, cuando GitHub cambia su interfaz, se puede ver qué sección se ve afectada. La ubicación no se comprueba, por lo que una entrada en el grupo equivocado pasa la CI.

**5. Indenta las claves con cuatro espacios.** La comprobación de claves duplicadas lee el archivo sin procesar línea por línea y solo reconoce las claves con esa indentación exacta. Una indentación distinta no produce un error, sino que excluye silenciosamente esas claves de la comprobación, por lo que un duplicado real podría pasar desapercibido.

**6. Las cadenas de traducción deben converger.** A veces la traducción es igual al original para dejar constancia de que el nombre del producto no se traduce, como en `"Wiki": "Wiki"`. El script de validación informa de estas autoasignaciones como advertencias, no como errores. En cambio, una traducción que alterna entre dos o más valores distintos, como `A → B → A`, nunca converge y produce un error. Las cadenas que no forman un ciclo pero cuyo resultado vuelve a cambiar en la siguiente pasada también se informan como advertencias para que puedan revisarse.

**7. Conserva los tipos y el orden de las etiquetas en línea.** Si una clave contiene etiquetas como `<a>`, `<strong>` o `<code>`, la traducción debe mantener los mismos tipos de etiquetas en el mismo orden. No elimines ni reordenes las etiquetas. La extensión solo sustituye el texto, sin reordenar los elementos DOM existentes. El script de validación también comprueba que los tipos y el orden de las etiquetas coincidan con el original.

Los valores deben ser cadenas no vacías. Las claves duplicadas dentro de un mismo archivo son un error.

## Criterios de traducción

- Prioriza los términos que usan realmente los desarrolladores nativos de cada idioma. Importa más que la traducción se lea con naturalidad en la pantalla que traducir literalmente la localización oficial de GitHub.
- Usa como referencia la traducción y la escritura de la documentación oficial de GitHub. Consulta la [documentación en japonés](https://docs.github.com/ja), [en chino simplificado](https://docs.github.com/zh), [en español](https://docs.github.com/es), [en alemán](https://docs.github.com/de), [en portugués](https://docs.github.com/pt), [en coreano](https://docs.github.com/ko), [en francés](https://docs.github.com/fr) y [en ruso](https://docs.github.com/ru). No existe documentación oficial en chino tradicional.
- Comprueba el contexto en la pantalla actual de GitHub y ten en cuenta los lugares conocidos en los que se usa la misma clave en inglés. Como cada clave del diccionario solo admite una traducción, prioriza expresiones que tengan sentido en todos esos contextos.
- Mantén la coherencia con las traducciones y la escritura relacionadas del diccionario existente, y conserva los nombres de productos y funciones que GitHub deja en inglés.
- Si eliges una traducción distinta de la documentación oficial o cambias una traducción existente, explica el motivo en la pull request. Cuando los mantenedores y los colaboradores nativos no estén de acuerdo, prevalece el criterio de los hablantes nativos.

## Agregar un idioma nuevo

1. Agrega `dictionaries/<código>.json` con el formato anterior. El campo `language` debe ser igual a `<código>` y el campo `name` debe ser igual al nombre visible que registres en el paso 2.
2. Agrega `{ "code": "<código>", "name": "<nombre visible>" }` a [`languages.json`](/languages.json). Tanto la ventana emergente como la página de opciones leen esta lista.
3. Agrega `_locales/<código de configuración regional>/messages.json` con las mismas claves de mensaje que [`_locales/en/messages.json`](/_locales/en/messages.json). Esto localiza la interfaz propia de la extensión (la ventana emergente, la página de opciones y el nombre y la descripción de la extensión) y es un mecanismo distinto de los diccionarios de traducción de GitHub.

**El nombre del directorio de configuración regional no siempre coincide con el código del diccionario.** WebExtensions exige el formato `idioma_REGIÓN` separado por guion bajo, mientras que los códigos de diccionario usan el formato BCP 47 separado por guion. El chino simplificado y el portugués de Brasil son ejemplos existentes.

| | Código del diccionario | Directorio de configuración regional |
| --- | --- | --- |
| Japonés | `ja` | `_locales/ja` |
| Chino simplificado | `zh-CN` | `_locales/zh_CN` |
| Chino tradicional | `zh-TW` | `_locales/zh_TW` |
| Español | `es` | `_locales/es` |
| Alemán | `de` | `_locales/de` |
| Portugués de Brasil | `pt-BR` | `_locales/pt_BR` |
| Coreano | `ko` | `_locales/ko` |
| Francés | `fr` | `_locales/fr` |
| Ruso | `ru` | `_locales/ru` |

El navegador ignora los directorios llamados `_locales/zh-CN` o `_locales/pt-BR`, y no hay nada que lo detecte. [`scripts/validate.mjs`](/scripts/validate.mjs) solo compara las claves de mensaje entre los directorios de configuración regional que existen y no comprueba su correspondencia con los códigos de `languages.json`. La interfaz y los metadatos de la extensión vuelven al inglés sin avisar.

Un diccionario nuevo necesita todas las claves de los diccionarios existentes, así que es un cambio grande. Antes de empezar, crea un Feature request para acordar el alcance.

## Validar los cambios

Antes de crear una pull request, instala las dependencias y ejecuta la validación de diccionarios y las pruebas.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

El validador de diccionarios (`pnpm run validate`) comprueba el formato y los metadatos de los diccionarios, las claves duplicadas, las claves vacías o con espacios en los extremos, que las claves coincidan en todos los diccionarios, que las claves coincidan en todos los `_locales`, que se resuelvan todos los marcadores `__MSG_*__` de `manifest.json` y que `shared.js` se cargue antes que `content.js`. También advierte sobre las autoasignaciones y las cadenas de traducción cuyo resultado vuelve a cambiar en la siguiente pasada, y trata como error los ciclos de traducción de longitud dos o más. Si todo es correcto, muestra el número de entradas por idioma y las advertencias informativas que correspondan. También comprueba que los tipos y el orden de las etiquetas en línea coincidan con el original.

En cambio, **no comprueba** la ubicación de las secciones, la indentación de las claves ni la correspondencia entre los nombres de los directorios de configuración regional y los códigos de `languages.json`. Estos tres puntos deben revisarse a mano.

La CI ejecuta la validación de diccionarios y las pruebas anteriores, además de comprobaciones de sintaxis de JavaScript (`node --check`), en cada pull request. Ejecutarlas en local te ahorra idas y vueltas.

## Pull requests

- Crea tu rama de trabajo a partir de `main` y abre la pull request contra `main`.
- En `main` se acumulan los cambios de la próxima versión. Las pull requests se fusionan con squash.
- Los mantenedores se encargan de las versiones. Después de fusionar una pull request que sube la versión de `manifest.json`, se agrega a `main` una etiqueta con el formato `vX.Y.Z` y el zip de la versión se crea automáticamente.
- Escribe los mensajes de commit en inglés.
- Limita cada pull request a un solo cambio lógico. Agregar entradas al diccionario de una pantalla, corregir un error y actualizar la documentación son tres pull requests, no una.
- Si hay un issue relacionado, enlázalo.
- La CI debe pasar.
- En los cambios de traducción, las capturas de pantalla del antes y el después son de gran ayuda.

## Licencia

Al contribuir, aceptas que tus contribuciones se publiquen bajo la [licencia MIT](/LICENSE) de este proyecto.
