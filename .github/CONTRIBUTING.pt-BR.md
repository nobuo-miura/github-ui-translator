[English](/.github/CONTRIBUTING.md) | [日本語](/.github/CONTRIBUTING.ja.md) | [简体中文](/.github/CONTRIBUTING.zh-CN.md) | [繁體中文](/.github/CONTRIBUTING.zh-TW.md) | [Español](/.github/CONTRIBUTING.es.md) | [Deutsch](/.github/CONTRIBUTING.de.md) | [Português (Brasil)](/.github/CONTRIBUTING.pt-BR.md) | [한국어](/.github/CONTRIBUTING.ko.md) | [Français](/.github/CONTRIBUTING.fr.md) | [Русский](/.github/CONTRIBUTING.ru.md)

# Como contribuir com o GitHub UI Translator

Obrigado pelo interesse em melhorar o GitHub UI Translator. Este documento explica como relatar problemas, como editar os dicionários de tradução e quais condições suas alterações precisam cumprir para serem mescladas.

Para instalar e usar a extensão, consulte o [README](/README.pt-BR.md).

## Formas de contribuir

| O que você quer fazer | Onde |
| --- | --- |
| Relatar um comportamento que não funciona | [Bug report](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=bug_report.yml) |
| Sugerir uma tradução para um idioma já suportado | [Translation request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=translation_request.yml) |
| Propor um novo recurso ou um novo idioma | [Feature request](https://github.com/nobuo-miura/github-ui-translator/issues/new?template=feature_request.yml) |
| Fazer uma pergunta ou discutir uma ideia | [Discussions](https://github.com/nobuo-miura/github-ui-translator/discussions) |

Issues em branco estão desativadas, então escolha o modelo adequado. Cada modelo pede que você confirme que já pesquisou as issues existentes.

## Antes de começar

Leia primeiro o [escopo da tradução (English)](/docs/translation-scope.md). Ele define a regra mais importante deste projeto: **a extensão traduz apenas o texto fixo da interface do GitHub e, de propósito, não traduz o conteúdo criado pelos usuários.**

READMEs, o corpo das issues, comentários, blocos de código, nomes de arquivos, nomes de repositórios, nomes de usuário e títulos de páginas da Wiki são excluídos intencionalmente, mesmo quando correspondem exatamente a uma chave do dicionário. Uma alteração que traduza qualquer um deles não será mesclada, então vale a pena entender esse limite antes de escrever código.

## Preparar o ambiente de desenvolvimento

Clone o repositório e carregue-o como extensão sem pacote.

```sh
git clone https://github.com/nobuo-miura/github-ui-translator.git
```

- **Chrome**: abra `chrome://extensions`, ative o modo do desenvolvedor, clique em "Carregar sem compactação" e selecione a pasta clonada (a que contém `manifest.json`).
- **Firefox**: abra `about:debugging#/runtime/this-firefox`, clique em "Carregar extensão temporária…" e selecione `manifest.json`. Extensões temporárias são removidas quando o Firefox é reiniciado, então carregue-a novamente a cada sessão.

Não é necessário fazer build nem instalar dependências para carregar e executar a extensão. Depois de editar um arquivo, recarregue a extensão e atualize a página do GitHub que você está testando.

A validação dos dicionários e os testes precisam do Node.js. Instale as dependências dos testes com a versão do pnpm indicada em `packageManager` no `package.json`. A CI usa o Node 26.

## Editar os dicionários

As traduções ficam em `dictionaries/<código>.json`. Atualmente são nove: [`ja.json`](/dictionaries/ja.json), [`zh-CN.json`](/dictionaries/zh-CN.json), [`zh-TW.json`](/dictionaries/zh-TW.json), [`es.json`](/dictionaries/es.json), [`de.json`](/dictionaries/de.json), [`pt-BR.json`](/dictionaries/pt-BR.json), [`ko.json`](/dictionaries/ko.json), [`fr.json`](/dictionaries/fr.json) e [`ru.json`](/dictionaries/ru.json).

```jsonc
{
  "language": "pt-BR",
  "name": "Português (Brasil)",
  "translations": {
    // ==== Repository navigation ====
    "Code": "Código",
    "Issues": "Issues"
  }
}
```

Há sete regras importantes. O script de validação verifica o que pode ser determinado a partir dos arquivos; o restante precisa ser conferido na revisão.

**1. Todos os dicionários devem ter exatamente as mesmas chaves.** É onde as pessoas mais costumam errar. Se você adicionar uma entrada apenas em `ja.json` e esquecer os outros dicionários, a CI falha com `missing keys`. Adicione a entrada a *todos* os dicionários no mesmo pull request. Se você não conseguir traduzir para um idioma que não conhece, explique isso no pull request em vez de deixar a chave de fora.

**2. As chaves devem corresponder exatamente ao texto original em inglês.** Antes da comparação, os espaços no início e no fim são removidos. Além disso, apenas no **texto visível**, sequências de espaços, incluindo quebras de linha, são normalizadas para um único espaço, de modo que uma chave escrita em uma linha também corresponde a um texto que o GitHub exibe em várias linhas. **Os valores de atributos não são normalizados; recebem apenas `trim()`**. `aria-label`, `placeholder`, o `value` dos botões e `data-disable-with` são comparados como estão, exceto pelos espaços nas extremidades, então as chaves destinadas a eles precisam reproduzir exatamente os espaços internos do original. O script de validação dá erro se uma chave tiver espaços no início ou no fim, mas se ela corresponde ao texto original do GitHub e aos espaços internos precisa ser conferido na revisão.

**3. Comentários só podem ocupar a linha inteira.** Os arquivos são JSON com comentários de linha `//` (formato JSONC). Como o `JSON.parse` não suporta comentários, a extensão remove as linhas de comentário antes da análise. Um comentário no fim da mesma linha de um valor causa erro de análise.

**4. Agrupe as entradas por tela do GitHub.** Cada grupo começa com um comentário `// ==== Nome da seção ====`. Adicione as novas entradas no grupo correspondente, e não no fim do arquivo. Assim, quando a interface do GitHub mudar, é possível saber qual seção foi afetada. A posição não é verificada, então uma entrada no grupo errado passa na CI.

**5. Indente as chaves com quatro espaços.** A verificação de chaves duplicadas lê o arquivo bruto linha por linha e reconhece apenas as chaves com essa indentação exata. Uma indentação diferente não gera erro; ela apenas remove silenciosamente essas chaves da verificação, e uma duplicata real pode passar despercebida.

**6. As cadeias de tradução precisam convergir.** Às vezes a tradução é igual ao original para registrar a intenção de não traduzir o nome de um produto, como em `"Wiki": "Wiki"`. O script de validação relata esses automapeamentos como avisos, não como erros. Por outro lado, uma tradução que alterna entre dois ou mais valores diferentes, como `A → B → A`, nunca converge e gera erro. Cadeias que não formam um ciclo, mas cujo resultado muda de novo na próxima passada, também são relatadas como avisos para que possam ser revisadas.

**7. Preserve os tipos e a ordem das tags inline.** Se uma chave contiver tags como `<a>`, `<strong>` ou `<code>`, a tradução deve manter os mesmos tipos de tags na mesma ordem. Não remova nem reordene as tags. A extensão apenas substitui o texto, sem reordenar os elementos DOM existentes. O script de validação também verifica se os tipos e a ordem das tags correspondem ao original.

Os valores devem ser strings não vazias. Chaves duplicadas no mesmo arquivo são um erro.

## Critérios de tradução

- Dê preferência aos termos que os desenvolvedores nativos de cada idioma realmente usam. Uma tradução que soe natural na tela importa mais do que traduzir literalmente a localização oficial do GitHub.
- Use a tradução e a grafia da documentação oficial do GitHub como referência. Consulte a [documentação em japonês](https://docs.github.com/ja), [em chinês simplificado](https://docs.github.com/zh), [em espanhol](https://docs.github.com/es), [em alemão](https://docs.github.com/de), [em português](https://docs.github.com/pt), [em coreano](https://docs.github.com/ko), [em francês](https://docs.github.com/fr) e [em russo](https://docs.github.com/ru). Não há documentação oficial em chinês tradicional.
- Confira o contexto na tela atual do GitHub e considere os lugares conhecidos em que a mesma chave em inglês é usada. Como cada chave do dicionário só pode ter uma tradução, dê preferência a expressões que façam sentido em todos esses contextos.
- Mantenha a consistência com as traduções e a grafia relacionadas do dicionário existente e preserve os nomes de produtos e recursos que o GitHub mantém em inglês.
- Se você escolher uma tradução diferente da documentação oficial ou alterar uma tradução existente, explique o motivo no pull request. Quando mantenedores e colaboradores nativos discordarem, prevalece a avaliação dos falantes nativos.

## Adicionar um novo idioma

1. Adicione `dictionaries/<código>.json` no formato acima. O campo `language` deve ser igual a `<código>`, e o campo `name` deve ser igual ao nome de exibição que você registrar na etapa 2.
2. Adicione `{ "code": "<código>", "name": "<nome de exibição>" }` a [`languages.json`](/languages.json). Tanto o pop-up quanto a página de opções leem essa lista.
3. Adicione `_locales/<código de localidade>/messages.json` com as mesmas chaves de mensagem de [`_locales/en/messages.json`](/_locales/en/messages.json). Isso localiza a interface da própria extensão (o pop-up, a página de opções e o nome e a descrição da extensão) e é um mecanismo separado dos dicionários de tradução do GitHub.

**O nome do diretório de localidade nem sempre é igual ao código do dicionário.** O WebExtensions exige o formato `idioma_REGIÃO` separado por sublinhado, enquanto os códigos de dicionário usam o formato BCP 47 separado por hífen. O chinês simplificado e o português do Brasil são exemplos existentes.

| | Código do dicionário | Diretório de localidade |
| --- | --- | --- |
| Japonês | `ja` | `_locales/ja` |
| Chinês simplificado | `zh-CN` | `_locales/zh_CN` |
| Chinês tradicional | `zh-TW` | `_locales/zh_TW` |
| Espanhol | `es` | `_locales/es` |
| Alemão | `de` | `_locales/de` |
| Português do Brasil | `pt-BR` | `_locales/pt_BR` |
| Coreano | `ko` | `_locales/ko` |
| Francês | `fr` | `_locales/fr` |
| Russo | `ru` | `_locales/ru` |

O navegador ignora diretórios chamados `_locales/zh-CN` ou `_locales/pt-BR`, e nada detecta isso. O [`scripts/validate.mjs`](/scripts/validate.mjs) apenas compara as chaves de mensagem entre os diretórios de localidade existentes e não verifica a correspondência com os códigos de `languages.json`. A interface e os metadados da extensão voltam silenciosamente para o inglês.

Um novo dicionário precisa de todas as chaves dos dicionários existentes, então é uma alteração grande. Antes de começar, abra um Feature request para alinharmos o escopo.

## Validar as alterações

Antes de abrir um pull request, instale as dependências e execute a validação dos dicionários e os testes.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm test
```

O validador de dicionários (`pnpm run validate`) verifica o formato e os metadados dos dicionários, chaves duplicadas, chaves vazias ou com espaços nas extremidades, se as chaves coincidem em todos os dicionários, se as chaves coincidem em todos os `_locales`, se todos os marcadores `__MSG_*__` de `manifest.json` são resolvidos e se `shared.js` é carregado antes de `content.js`. Ele também avisa sobre automapeamentos e cadeias de tradução cujo resultado muda de novo na próxima passada, e trata como erro ciclos de tradução de comprimento dois ou mais. Quando tudo está certo, mostra o número de entradas por idioma e os avisos informativos aplicáveis. Ele também verifica se os tipos e a ordem das tags inline correspondem ao original.

Por outro lado, ele **não verifica** a posição das seções, a indentação das chaves nem a correspondência entre os nomes dos diretórios de localidade e os códigos de `languages.json`. Esses três pontos precisam ser conferidos manualmente.

A CI executa a validação dos dicionários e os testes acima, além de verificações de sintaxe de JavaScript (`node --check`), em todos os pull requests. Executá-los localmente antes economiza idas e vindas.

## Pull requests

- Crie sua branch de trabalho a partir de `main` e abra o pull request para `main`.
- A `main` acumula as alterações da próxima versão. Os pull requests são mesclados com squash.
- As versões são publicadas pelos mantenedores. Depois que um pull request que aumenta a versão em `manifest.json` é mesclado, uma tag no formato `vX.Y.Z` é adicionada à `main`, e o zip da versão é gerado automaticamente.
- Escreva as mensagens de commit em inglês.
- Mantenha uma única alteração lógica por pull request. Adicionar entradas ao dicionário de uma tela, corrigir um bug e atualizar a documentação são três pull requests, não um.
- Se houver uma issue relacionada, inclua o link.
- A CI precisa passar.
- Em alterações de tradução, capturas de tela de antes e depois ajudam muito.

## Licença

Ao contribuir, você concorda que suas contribuições sejam licenciadas sob a [Licença MIT](/LICENSE) deste projeto.
