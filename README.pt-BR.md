# GitHub UI Translator

[English](README.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Русский](README.ru.md)

[![Latest Release](https://img.shields.io/github/v/release/nobuo-miura/github-ui-translator?label=Latest%20Release)](https://github.com/nobuo-miura/github-ui-translator/releases/latest)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/igdplojdbbpfbedgoaokfcagpkofmngk?label=Chrome%20Web%20Store&logo=googlechrome)](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&logo=microsoftedge&query=%24.version&prefix=v&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Ffgjocjmjjghflobobinafkbkeildanoj)](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/github-ui-translator?label=Firefox%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/github-ui-translator/)
[![Validation](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml/badge.svg)](https://github.com/nobuo-miura/github-ui-translator/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

GitHub UI Translator é uma extensão para Chrome, Edge e Firefox que traduz a interface em inglês do GitHub para japonês, chinês simplificado, espanhol, alemão, português do Brasil, coreano, francês ou russo usando dicionários locais.
Ela não depende de APIs externas de tradução nem de serviços em nuvem: toda a tradução é feita localmente no navegador.

![Resultado da tradução para japonês](docs/images/jp.jpeg)

<details>
<summary>Capturas de tela dos 8 idiomas compatíveis</summary>

A primeira linha mostra a interface original do GitHub em inglês; as linhas seguintes mostram o resultado da tradução em cada idioma.

![Resultados da tradução nos 8 idiomas compatíveis](docs/images/languages.png)

</details>

## Recursos

- Faz toda a tradução localmente, sem enviar o conteúdo das páginas ou as configurações para serviços externos
- Traduz textos fixos da interface do GitHub, como itens de navegação e botões, evitando áreas de conteúdo criado por usuários, como READMEs, problemas, comentários e blocos de código
- Permite ativar ou desativar a tradução pela janela pop-up da extensão
- Traduz o cabeçalho global somente depois que a hidratação do React do GitHub termina, reduzindo o risco de interferir na pesquisa global; essa opção também pode ser desativada no pop-up

## Documentação

- [Escopo da tradução (English)](docs/translation-scope.md) ([日本語](docs/translation-scope.ja.md))

## Limitações

- Atualmente há suporte para japonês, chinês simplificado, espanhol, alemão, português do Brasil, coreano, francês e russo. Outros idiomas serão adicionados à medida que a cobertura de tradução aumentar.
- Textos dinâmicos que contêm números ou datas, como “3 commits” ou “opened 2 days ago”, não são traduzidos. Conteúdo criado por usuários, como nomes de usuário, também fica de fora. Consulte o [escopo da tradução](docs/translation-scope.md) para saber mais.
- Somente `github.com` é compatível. GitHub Enterprise e outros domínios personalizados não são compatíveis.
- A extensão foi testada no Chrome, Edge e Firefox. Outros navegadores baseados em Chromium também podem funcionar, mas não foram testados explicitamente.

## Instalação

### Chrome

Instale o [GitHub UI Translator pela Chrome Web Store](https://chromewebstore.google.com/detail/github-ui-translator/igdplojdbbpfbedgoaokfcagpkofmngk).

Se a Chrome Web Store não estiver disponível no seu ambiente, como em um dispositivo gerenciado pela empresa:

1. Baixe o arquivo `.zip` da [versão mais recente](https://github.com/nobuo-miura/github-ui-translator/releases/latest) e extraia-o.
2. Abra `chrome://extensions` no Chrome e ative o modo do desenvolvedor.
3. Clique em “Carregar sem compactação” e selecione a pasta extraída.

Extensões instaladas manualmente não são atualizadas de forma automática. Repita essas etapas quando uma nova versão for publicada. As políticas da sua organização também podem bloquear o modo do desenvolvedor ou extensões instaladas manualmente; nesse caso, entre em contato com o administrador.

### Edge

Instale o [GitHub UI Translator pelos Complementos do Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/fgjocjmjjghflobobinafkbkeildanoj).

### Firefox

É necessário usar o Firefox 142 ou uma versão mais recente.

Instale o [GitHub UI Translator pelos complementos do Firefox](https://addons.mozilla.org/firefox/addon/github-ui-translator/).

Após a instalação, abra uma página do GitHub, como `https://github.com/...`, e os textos compatíveis da interface serão traduzidos automaticamente para o idioma selecionado.

### Instalação para desenvolvimento (carregar pelo repositório)

Para personalizar um dicionário ou contribuir com o desenvolvimento, clone o repositório e carregue a extensão diretamente.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome / Edge**: abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge, ative o modo do desenvolvedor, clique em “Carregar sem compactação” e selecione a pasta clonada que contém `manifest.json`.
- **Firefox**: abra `about:debugging#/runtime/this-firefox`, clique em “Carregar extensão temporária…” e selecione o arquivo `manifest.json` do repositório. Extensões temporárias são removidas quando o Firefox é reiniciado, portanto precisam ser carregadas novamente em cada sessão.

## Uso

- Clique no ícone da extensão na barra de ferramentas para abrir o botão de ativação da tradução e o seletor de idioma. Japonês, chinês simplificado, espanhol, alemão, português do Brasil, coreano, francês e russo estão incluídos atualmente; a lista poderá receber novos idiomas quando outros dicionários forem adicionados.
- Ao alterar o botão de ativação ou o idioma, as abas abertas do GitHub são recarregadas para aplicar a nova configuração.
- O pop-up também permite escolher se o cabeçalho global será traduzido e contém um link para este repositório. Alterar essa opção também recarrega as abas do GitHub. A tradução do cabeçalho global fica ativada por padrão e aguarda o término da hidratação do React do GitHub; desative-a se a pesquisa global não abrir.
- Abra a página de opções da extensão (`chrome://extensions` no Chrome, `edge://extensions` no Edge ou `about:addons` no Firefox) para consultar as informações dos dicionários incluídos e a versão da extensão.

## Personalização do dicionário

Você pode adicionar ou alterar traduções editando diretamente o arquivo de dicionário do idioma desejado, por exemplo, `dictionaries/ja.json`, `dictionaries/zh-CN.json`, `dictionaries/es.json`, `dictionaries/de.json`, `dictionaries/pt-BR.json`, `dictionaries/ko.json`, `dictionaries/fr.json` ou `dictionaries/ru.json`.
As entradas são agrupadas por tela do GitHub (navegação do repositório, configurações do repositório, configurações da organização etc.). Cada grupo começa com uma linha de comentário `// ====`, facilitando a identificação da tela correspondente e a percepção de mudanças nos textos da interface do GitHub.

```jsonc
{
  "language": "ja",
  "name": "日本語",
  "translations": {
    // ==== Navegação do repositório ====
    "Code": "コード",
    "Issues": "イシュー"
  }
}
```

- O arquivo usa JSON com comentários de linha `//` (estilo JSONC). Somente comentários que ocupam a linha inteira são aceitos; comentários depois de um valor na mesma linha não são compatíveis. Como `JSON.parse` e `fetch().json()` não processam comentários, a extensão remove as linhas comentadas antes de analisar o arquivo.
- As chaves do dicionário precisam corresponder **exatamente** ao texto original em inglês. Espaços no início e no fim são ignorados tanto no texto visível quanto nos valores de atributos compatíveis. Somente no texto visível, espaços consecutivos — inclusive quebras de linha — são reduzidos a um único espaço. Valores de atributos como `aria-label`, `placeholder`, `value` de botões e `data-disable-with` mantêm os espaços internos durante a comparação. As próprias chaves do dicionário não podem conter espaços no início ou no fim.
- Depois de editar o dicionário, recarregue a extensão em `chrome://extensions` no Chrome, `edge://extensions` no Edge ou `about:debugging` no Firefox.

### Adição de um idioma

1. Adicione `dictionaries/<code>.json` (por exemplo, `dictionaries/en.json`) no mesmo formato.
2. Adicione `{ "code": "<code>", "name": "<display name>" }` a `languages.json`. O pop-up e a página de opções carregam essa lista compartilhada.
3. Execute `node scripts/validate.mjs` para verificar o formato dos dicionários, chaves duplicadas, metadados, igualdade das chaves entre os dicionários incluídos, automapeamentos, cadeias de tradução e ciclos que não convergem.

O pop-up, a página de opções e os metadados da extensão usam o mecanismo `_locales` das extensões de navegador, independentemente dos dicionários de tradução do GitHub. Para adicionar um idioma também à interface da extensão, crie `_locales/<code>/messages.json` com as mesmas chaves de mensagem de `_locales/en/messages.json`.

## Estrutura do projeto

```text
github-ui-translator/
├─ manifest.json
├─ shared.js        # Lista compartilhada de idiomas e utilitários de localização da interface
├─ languages.json   # Idiomas incluídos para a tradução do GitHub
├─ content.js       # Mecanismo de tradução que percorre o DOM usando uma lista de permissões
├─ popup.html/js    # Pop-up da barra de ferramentas com o botão de tradução
├─ options.html/js  # Informações dos dicionários e exibição da versão
├─ _locales/        # Mensagens localizadas do pop-up, das opções e dos metadados
├─ dictionaries/
│  ├─ ja.json       # Dicionário japonês
│  ├─ zh-CN.json    # Dicionário de chinês simplificado
│  ├─ es.json       # Dicionário espanhol
│  ├─ de.json       # Dicionário alemão
│  ├─ pt-BR.json    # Dicionário de português do Brasil
│  ├─ ko.json       # Dicionário coreano
│  ├─ fr.json       # Dicionário francês
│  └─ ru.json       # Dicionário russo
├─ docs/
│  ├─ translation-scope.md     # Versão em inglês
│  └─ translation-scope.ja.md  # Versão em japonês
├─ scripts/
│  └─ validate.mjs  # Validação dos dicionários e da localização
└─ icons/
```

## Licença

[Licença MIT](./LICENSE)
