# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Русский](README.ru.md)

[![Latest Release](https://img.shields.io/github/v/release/nobuo-miura/github-ui-translator?label=Latest%20Release)](https://github.com/nobuo-miura/github-ui-translator/releases/latest)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/igdplojdbbpfbedgoaokfcagpkofmngk?label=Chrome%20Web%20Store&logo=googlechrome)](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&logo=microsoftedge&query=%24.version&prefix=v&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffgjocjmjjghflobobinafkbkeildanoj)](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/github-ui-translator?label=Firefox%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/github-ui-translator/)
[![Validation](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml/badge.svg)](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GitHub UI Translator es una extensión para Chrome, Edge y Firefox que traduce la interfaz en inglés de GitHub al japonés, chino simplificado, español, alemán, portugués de Brasil, coreano, francés o ruso mediante diccionarios locales.
No depende de API de traducción ni de servicios en la nube externos: toda la traducción se realiza localmente en el navegador.

![Resultado de la traducción al japonés](docs/images/jp.jpeg)

<details>
<summary>Capturas de los 8 idiomas compatibles</summary>

La primera fila muestra la interfaz original de GitHub en inglés; las filas siguientes muestran el resultado en cada idioma.

![Resultados de traducción en los 8 idiomas compatibles](docs/images/languages.png)

</details>

## Características

- Realiza toda la traducción de forma local, sin enviar el contenido de las páginas ni la configuración a servicios externos
- Traduce textos fijos de la interfaz de GitHub, como elementos de navegación y botones, y evita las áreas con contenido creado por usuarios, como archivos README, incidencias, comentarios y bloques de código
- Permite activar o desactivar la traducción desde la ventana emergente de la extensión
- Traduce el encabezado global después de que finalice la hidratación de React de GitHub para reducir el riesgo de interferir con la búsqueda global; esta opción también se puede desactivar desde la ventana emergente

## Documentación

- [Ámbito de traducción (English)](docs/translation-scope.md) ([日本語](docs/translation-scope.ja.md))

## Limitaciones

- Actualmente se admiten japonés, chino simplificado, español, alemán, portugués de Brasil, coreano, francés y ruso. Se añadirán más idiomas a medida que se amplíe la cobertura.
- No se traducen textos dinámicos que contienen números o fechas, como «3 commits» u «opened 2 days ago». También se excluye el contenido creado por usuarios, como los nombres de usuario. Consulta el [ámbito de traducción](docs/translation-scope.md) para obtener más información.
- Solo se admite `github.com`. GitHub Enterprise y otros dominios personalizados no son compatibles.
- Se ha probado en Chrome, Edge y Firefox. Es posible que también funcione en otros navegadores basados en Chromium, pero no se han probado expresamente.

## Instalación

### Chrome

Instala [GitHub UI Translator desde Chrome Web Store](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk).

Si Chrome Web Store no está disponible en tu entorno, por ejemplo, en un dispositivo administrado por una empresa:

1. Descarga el archivo `.zip` de la [versión más reciente](https://github.com/nobuo-miura/github-ui-translator/releases/latest) y extráelo.
2. Abre `chrome://extensions` en Chrome y activa el modo de desarrollador.
3. Haz clic en «Cargar descomprimida» y selecciona la carpeta extraída.

Las extensiones instaladas manualmente no se actualizan de forma automática. Repite estos pasos cuando se publique una versión nueva. Es posible que las políticas de tu organización también bloqueen el modo de desarrollador o las extensiones instaladas manualmente; en ese caso, ponte en contacto con el administrador.

### Edge

Instala [GitHub UI Translator desde Complementos de Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj).

### Firefox

Se necesita Firefox 142 o una versión posterior.

Instala [GitHub UI Translator desde Complementos para Firefox](https://addons.mozilla.org/firefox/addon/github-ui-translator/).

Después de instalarlo, abre una página de GitHub como `https://github.com/...` y los textos compatibles de la interfaz se traducirán automáticamente al idioma seleccionado.

### Instalación para desarrollo (cargar desde el repositorio)

Para personalizar un diccionario o colaborar con el desarrollo, clona el repositorio y carga la extensión directamente.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome / Edge**: abre `chrome://extensions` en Chrome o `edge://extensions` en Edge, activa el modo de desarrollador, haz clic en «Cargar descomprimida» y selecciona la carpeta clonada que contiene `manifest.json`.
- **Firefox**: abre `about:debugging#/runtime/this-firefox`, haz clic en «Cargar complemento temporal…» y selecciona el archivo `manifest.json` del repositorio. Los complementos temporales se eliminan al reiniciar Firefox, por lo que hay que volver a cargarlos en cada sesión.

## Uso

- Haz clic en el icono de la extensión en la barra de herramientas para abrir el interruptor de traducción y el selector de idioma. Actualmente se incluyen japonés, chino simplificado, español, alemán, portugués de Brasil, coreano, francés y ruso; la lista desplegable puede ampliarse cuando se añadan nuevos diccionarios.
- Al cambiar el interruptor o el idioma, las pestañas de GitHub abiertas se vuelven a cargar para aplicar la nueva configuración.
- La ventana emergente también permite decidir si se traduce el encabezado global e incluye un enlace a este repositorio. Cambiar esta opción también vuelve a cargar las pestañas de GitHub. La traducción del encabezado global está activada de forma predeterminada y espera a que termine la hidratación de React de GitHub; desactívala si la búsqueda global no se abre.
- Abre la página de opciones de la extensión (`chrome://extensions` en Chrome, `edge://extensions` en Edge o `about:addons` en Firefox) para consultar la información de los diccionarios incluidos y la versión de la extensión.

## Personalización del diccionario

Puedes añadir o modificar traducciones editando directamente el diccionario del idioma correspondiente, por ejemplo, `dictionaries/ja.json`, `dictionaries/zh-CN.json`, `dictionaries/es.json`, `dictionaries/de.json`, `dictionaries/pt-BR.json`, `dictionaries/ko.json`, `dictionaries/fr.json` o `dictionaries/ru.json`.
Las entradas se agrupan por pantalla de GitHub (navegación del repositorio, configuración del repositorio, configuración de la organización, etc.) y cada grupo comienza con una línea de comentario `// ====`. Así es más fácil identificar dónde aparece cada entrada y detectar cambios en los textos de la interfaz de GitHub.

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== Navegación del repositorio ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- El archivo es JSON con comentarios de línea `//` (estilo JSONC). Solo se admiten comentarios que ocupen toda la línea; no se admiten comentarios al final de una línea después de un valor. La extensión elimina las líneas de comentarios antes de analizar el archivo, ya que `JSON.parse` y `fetch().json()` no admiten comentarios.
- Las claves del diccionario deben coincidir **exactamente** con el texto original en inglés. Se ignoran los espacios iniciales y finales tanto en el texto visible como en los valores de atributo compatibles. Solo en el texto visible, los espacios consecutivos —incluidos los saltos de línea— se reducen a un único espacio. Los valores de atributos como `aria-label`, `placeholder`, `value` de los botones y `data-disable-with` conservan sus espacios internos al compararlos. Las claves del diccionario no deben contener espacios iniciales ni finales.
- Después de editar el diccionario, vuelve a cargar la extensión desde `chrome://extensions` en Chrome, `edge://extensions` en Edge o `about:debugging` en Firefox.

### Añadir un idioma

1. Añade `dictionaries/<code>.json` (por ejemplo, `dictionaries/en.json`) con el mismo formato.
2. Añade `{ "code": "<code>", "name": "<display name>" }` a `languages.json`. Tanto la ventana emergente como la página de opciones cargan esta lista compartida.
3. Ejecuta `node scripts/validate.mjs` para comprobar el formato de los diccionarios, las claves duplicadas, los metadatos, la igualdad de claves entre los diccionarios incluidos, las asignaciones a sí mismas, las cadenas de traducción y los ciclos que no convergen.

La ventana emergente, la página de opciones y los metadatos de la extensión utilizan el mecanismo `_locales` de las extensiones del navegador de forma independiente a los diccionarios de traducción de GitHub. Para añadir un idioma a la propia interfaz de la extensión, crea también `_locales/<code>/messages.json` con las mismas claves que `_locales/en/messages.json`.

## Estructura del proyecto

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # Lista de idiomas compartida y funciones auxiliares de localización de la interfaz
├─ languages.json   # Idiomas incluidos para traducir GitHub
├─ content.js       # Motor de traducción que examina el DOM mediante una lista permitida
├─ popup.html/js    # Ventana emergente de la barra de herramientas con el interruptor de traducción
├─ options.html/js  # Información de los diccionarios y versión
├─ _locales/        # Mensajes localizados de la ventana emergente, las opciones y los metadatos
├─ dictionaries/
│  ├─ ja.json       # Diccionario japonés
│  ├─ zh-CN.json    # Diccionario de chino simplificado
│  ├─ es.json       # Diccionario español
│  ├─ de.json       # Diccionario alemán
│  ├─ pt-BR.json    # Diccionario de portugués de Brasil
│  ├─ ko.json       # Diccionario coreano
│  ├─ fr.json       # Diccionario francés
│  └─ ru.json       # Diccionario ruso
├─ docs/
│  ├─ translation-scope.md     # Versión en inglés
│  └─ translation-scope.ja.md  # Versión en japonés
├─ scripts/
│  └─ validate.mjs  # Validación de diccionarios y localización
└─ icons/
```

## Licencia

[Licencia MIT](./LICENSE)
