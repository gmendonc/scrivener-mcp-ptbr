---
title: scrivener-mcp 0.12.0 — erros encontrados e correções
tags: [scrivener-mcp, mcp, bugs, pt-br]
data: 2026-11-01
fonte: testes com o projeto Zeppelin_zombies.scriv (Scrivener 3, macOS, Claude desktop)
---

# scrivener-mcp 0.12.0 — erros encontrados e correções

Registro dos defeitos encontrados no `scrivener-mcp` 0.12.0 (pacote npm, `/opt/homebrew/lib/node_modules/scrivener-mcp/dist`) durante a tradução e a análise de *Zumbis no Zeppelin*. Para cada erro: sintoma, causa, correção (aplicada ou proposta) e como testar.

Os patches locais estão no `dist/` instalado, com backups `*.bak-20261101` e `*.bak-20261101b`. São correções de emergência no JavaScript compilado; no projeto PT-BR elas devem ser refeitas no código-fonte TypeScript, com testes.

> [!warning] Mais importante para o PT-BR
> Os erros **#4 (leitor RTF)**, **#5 (aspas e travessões)** e **#9 (`write_document` perde a formatação)** quebram texto em português. Acentos gravados pelo Scrivener como `\'e9`, `\'e3`… somem na leitura, e o travessão de diálogo (—) passa pelo mesmo mapa de caracteres defeituoso. Corrija esses três antes de qualquer outra coisa.

## Resumo

| # | Área | Erro | Gravidade | Status local |
|---|---|---|---|---|
| 1 | Protocolo | Ferramentas de escrita não aparecem no Claude desktop | Alta | Contornado (variável de ambiente) |
| 2 | Ambiente | Servidor trava em pasta do iCloud | Alta | Contornado (projeto local) |
| 3 | RTF (escrita) | Corpo do documento gravado vazio | Crítica | Corrigido |
| 4 | RTF (leitura) | Leitor descarta `\'hh` (acentos, aspas, travessões) e quebra linha no itálico | Crítica | Corrigido |
| 5 | RTF (escrita) | `"` vira `\rdblquote` e `'` vira `\rquote` sempre | Alta | **Aberto** |
| 6 | Binder | `.scrivx` regravado com atributos como elementos; Scrivener cria "Recovered Files" | Crítica | **Aberto** |
| 7 | Binder | Pai ignorado, DraftFolder recusado, `Children` array/objeto | Alta | Corrigido |
| 8 | Binder | `move_document` ignora pai e posição; `delete_document` manda para SearchResults | Alta | Corrigido |
| 9 | Escrita | `write_document` não preserva a formatação | Crítica | **Aberto** |
| 10 | Binder | `restore_document` não encontra a lixeira | Média | **Aberto** |
| 11 | Projeto | `close_project` dá timeout | Baixa | **Aberto** |
| 12 | Estatísticas | `get_statistics` devolve campos errados | Média | **Aberto** |
| 13 | Análise | Resumo do `analyze_document` com `readability=?` e `[object Object]`; issues escondidos | Média | **Aberto** |
| 14 | Análise | `ContentAnalyzer` só em inglês; diálogo 0% com aspas tipográficas | Alta (PT-BR) | **Aberto** |
| 15 | IA | Modelos de raciocínio da OpenAI recusam `max_tokens`/`temperature` | Alta | Corrigido |
| 16 | IA | `suggest_improvements` ignora o `documentId` | Média | Corrigido |
| 17 | IA | Sem chave nem *sampling*, as ferramentas de IA falham sem explicar | Média | **Aberto** |
| 18 | Consistência | `check_consistency` não usa os personagens do Binder | Média | **Aberto** |
| 19 | Cache | Leituras devolvem conteúdo antigo após edição externa | Média | **Aberto** |
| 20 | Escrita | Gravação adiada (~5 s) sem confirmação | Baixa | Documentar |
| 21 | Compilação | `compile_documents` grava o resultado em `/tmp` | Baixa | **Aberto** |
| 22 | Fila | Modo assíncrono exige Redis | Baixa | Documentar |
| 23 | Prompts | Todos os prompts de IA em inglês | Alta (PT-BR) | **Aberto** |

---

## 1. Ferramentas de escrita não aparecem no Claude desktop

- **Sintoma:** só as ferramentas de leitura aparecem; `write_document`, `create_document` etc. não existem para o cliente.
- **Causa:** o servidor usa *progressive tool disclosure*: começa com poucas ferramentas e emite `notifications/tools/list_changed`. A ponte do Claude desktop ignora essa notificação.
- **Contorno:** `"SCRIVENER_MCP_EAGER_TOOLS": "1"` no bloco `env` do `claude_desktop_config.json`, seguido de reinício do Claude.
- **Correção proposta:** carregar tudo de uma vez por padrão, ou detectar no `initialize` se o cliente declara `tools.listChanged`.

## 2. Servidor trava em pasta do iCloud

- **Sintoma:** `open_project` não responde quando o `.scriv` está em `~/Library/Mobile Documents/…`.
- **Causa:** o TCC e o File Provider do macOS bloqueiam o acesso de processos iniciados pelo Claude; a leitura fica pendurada sem erro.
- **Contorno:** mover o projeto para uma pasta local (`~/Documents/Scrivener`).
- **Correção proposta:** *timeout* nas leituras de arquivo e mensagem clara ("pasta do iCloud inacessível; mova o projeto ou conceda acesso").

## 3. Corpo do documento gravado vazio

- **Arquivo:** `services/parsers/rtf-handler.js`, `unifiedConvertToRTF`.
- **Sintoma:** `write_document` cria o RTF só com cabeçalho; o texto some.
- **Causa:** a função só codificava `formattedText`; quando ele vinha vazio, `plainText` era ignorado.
- **Correção aplicada:** se `formattedText` estiver vazio, codificar `plainText`.
- **Extra:** acrescentei `markdownEmphasisSegments(text)`, que converte `**negrito**` e `*itálico*` em RTF quando `SCRIVENER_MCP_MARKDOWN_EMPHASIS=1`.
- **Teste:** gravar um parágrafo e conferir com `textutil -convert txt` que o texto está no `content.rtf`.

## 4. Leitor RTF descarta acentos e quebra linha no itálico

- **Arquivo:** `services/parsers/rtf-handler.js` (`enhancedRTFParse`), usado por `services/document-manager.js` (`readDocument`).
- **Sintoma:** o `read_document` devolve "Germanys" em vez de "Germany’s", sem aspas nem travessões. Cada troca de fonte (itálico) vira uma quebra de linha. A IA então critica "pontuação corrompida" que não existe no arquivo.
- **Causa:** o Scrivener salva em `\ansicpg1252` e escreve caracteres não ASCII como `\'hh` (`\'97` é o travessão, `\'92` o apóstrofo, `\'93`/`\'94` as aspas, `\'e9` o é, `\'e3` o ã…). O parser não decodifica `\'hh` e trata a quebra de linha crua do RTF como parágrafo.
- **Impacto no PT-BR:** **todo acento some**. É o erro mais grave para português.
- **Correção aplicada:** novo `utils/rtf-plain.js` (`rtfToPlainText`). O `readDocumentFormatted` agora substitui `plainText` pela saída dele, com *fallback* para o parser antigo.
  - Decodifica `\'hh` com `TextDecoder('windows-1252')`.
  - Trata `\uN` respeitando `\ucN`, pulando o caractere de *fallback*.
  - Converte `\par`, `\line` e `\` seguido de quebra de linha em quebra de linha; ignora quebras cruas.
  - Converte `\emdash`, `\endash`, `\lquote`, `\rquote`, `\ldblquote`, `\rdblquote`, `\bullet`, `\tab`, `\~`, `\_`.
  - Ignora grupos de destino: `{\*…}`, `fonttbl`, `colortbl`, `stylesheet`, `info`, `pict`, cabeçalhos e rodapés.
- **Teste:** a saída tem de ser idêntica, caractere por caractere, à de `textutil -convert txt -stdout content.rtf`. No capítulo I deu 10.462 caracteres, idênticos.

## 5. `"` vira `\rdblquote` e `'` vira `\rquote` sempre

- **Arquivo:** `services/parsers/rtf-handler.js`, `SPECIAL_CHARS_REVERSE`.
- **Sintoma:** ao gravar, toda aspa reta dupla vira aspa de fechamento e todo apóstrofo vira aspa simples de fechamento. Diálogos ficam “assim” só no fim.
- **Causa:** o `Map` é construído invertendo `SPECIAL_CHARS`. Como `\ldblquote` e `\rdblquote` mapeiam ambos para `"`, a chave duplicada fica só com o último valor.
- **Contorno usado:** enviar o texto já com aspas tipográficas (“ ” ‘ ’).
- **Correção proposta:**
  - Não mapear ASCII reto para aspas curvas; gravar `"` e `'` literais, ou converter com regra de abertura/fechamento (início de palavra abre, fim fecha).
  - Gravar todo caractere não ASCII como `\uN?` (ou `\'hh` em cp1252); nunca por um mapa reverso com chaves repetidas.
  - **PT-BR:** o travessão de diálogo (—) e as aspas angulares (« ») precisam sair corretos; inclua os dois nos testes.

## 6. `.scrivx` regravado num formato que o Scrivener recusa

- **Arquivos:** `services/project-loader.js` (xml2js com `mergeAttrs: true`, `explicitArray: false`) e o *builder* que regrava o binder.
- **Sintoma:** depois de qualquer ferramenta que altera o Binder (`create_document`, `move_document`, `delete_document`, `update_document`), o Scrivener abre o projeto, não reconhece o binder e cria uma pasta "Recovered Files" com todos os documentos sob UUIDs novos.
- **Causa:** o Scrivener grava `UUID`, `Type`, `Created` e `Modified` como **atributos** de `<BinderItem>`. Com `mergeAttrs: true`, o xml2js os mistura às propriedades filhas, e o *builder* os regrava como **elementos** (`<UUID>…</UUID>`).
- **Recuperação usada:** reconstruir o binder com ElementTree sobre o `.scrivx` que o próprio Scrivener salvou, ligando cada arquivo recuperado ao UUID original pelo início do texto. Os backups ficaram em `~/Documents/Scrivener/_backup-binder-*`.
- **Correção proposta:**
  - Parsear com `mergeAttrs: false` (atributos em `$`) e regravar com o `Builder` usando `attrkey: '$'`.
  - Melhor ainda: editar o XML com um DOM (`@xmldom/xmldom` ou `fast-xml-parser` com `preserveOrder`), alterando só o nó afetado.
  - Gravar de forma atômica (arquivo temporário e `rename`) e manter `binder.backup`.
- **Teste:** ida e volta (*round-trip*) sem alterações deve produzir um `.scrivx` igual ao original (salvo espaços); depois de criar um documento, o Scrivener tem de abrir o projeto sem "Recovered Files".
- **Enquanto não corrigir:** marcar as quatro ferramentas como `destructiveHint: true` ou desligá-las.

## 7. Binder: pai ignorado, DraftFolder recusado, `Children` inconsistente

- **Arquivo:** `utils/document-operations.js`.
- **Sintomas e causas:**
  - O pai era resolvido com `parseInt(uuid)`, então todo UUID virava `NaN` e o documento caía na raiz.
  - Só `Folder` era aceito como pai; `DraftFolder` e `ResearchFolder` eram recusados.
  - `Children.BinderItem` ora é objeto (um filho), ora array (vários), por causa do `explicitArray: false`; inserir quebrava a estrutura.
- **Correção aplicada:**
  - Aceitar `['Folder','DraftFolder','ResearchFolder']` como pai.
  - Novas funções `binderChildrenArray(children)` (normaliza para array) e `pushIntoBinderChildren(parentItem, newItem)`.
  - Pastas novas nascem com `Children: undefined`.

## 8. `move_document` e `delete_document`

- **Arquivos:** `services/document-manager.js`, `scrivener-project.js`.
- **Sintomas:**
  - O `move_document` ignorava a posição e não achava o contêiner do pai real.
  - O `delete_document` movia o item para **SearchResults** em vez de **TrashFolder**.
- **Correção aplicada:**
  - Novo `resolveBinderContainer(binder, parentId)`.
  - `moveDocument(documentId, newParentId, position)` usa o contêiner real, e o `scrivener-project.js` agora repassa a `position`.
  - `deleteDocument` move para a `TrashFolder`.
- **Observação:** mesmo corrigidas, essas ferramentas continuam sujeitas ao erro #6.

## 9. `write_document` não preserva a formatação

- **Sintoma:** a descrição promete preservar "byte a byte" a formatação não tocada. Gravei o capítulo XV com texto idêntico ao original, salvo poucas frases, e a ferramenta respondeu "formatting could not be preserved". O novo RTF saiu com cabeçalho próprio (`\deff0`, Helvetica, Cochin, Optima, `\fs24`, sem `\ansicpg1252`), perdeu a Palatino e os itálicos (nome do dirigível, pensamentos). Antes de gravar, a ferramenta tirou um snapshot.
- **Causa provável:** o *diff* de preservação compara o texto novo com o `plainText` do parser antigo, que está errado (#4). Como nada casa, o código cai no caminho de regravar tudo.
- **Contorno usado:** aplicar as edições direto no RTF original. O texto antigo e o novo são codificados no mesmo formato (`\'hh` cp1252, parágrafo = `\` + quebra de linha), e o trecho é substituído só onde casa uma única vez. Validação: converter o RTF resultante para texto e comparar com o texto esperado.
- **Correção proposta:**
  - Mapear as posições do texto plano para posições no RTF: o decodificador do #4 pode registrar, para cada caractere emitido, o *offset* de origem.
  - Calcular o *diff* no texto (`diff-match-patch`) e reescrever só os intervalos alterados no RTF, herdando a formatação do caractere vizinho.
  - Nunca trocar o cabeçalho (`fonttbl`, `colortbl`, `\ansicpg`) de um documento existente.
  - Teste: gravar o mesmo texto lido não pode mudar nenhum byte; trocar uma palavra só pode mudar aquela palavra.

## 10. `restore_document` não encontra a lixeira

- **Sintoma:** responde "Trash is empty" ou "target not found" com itens na `TrashFolder`.
- **Correção proposta:** localizar a `TrashFolder` pelo `Type` (não pelo título), restaurar para o pai anterior guardado em metadado ou, na falta dele, para o Draft.

## 11. `close_project` dá timeout

- **Correção proposta:** esvaziar a fila de gravação com *timeout* próprio, fechar *watchers* e responder mesmo se algum serviço opcional (Redis, banco de vetores) não estiver ativo.

## 12. `get_statistics` com campos errados

- **Sintoma:** título "Untitled"; contagens de Draft, Research e Trash em 0; `totalCharacters` 0. Só o total de palavras estava plausível.
- **Correção proposta:** ler título e autor do `.scrivx` e do `docs.checksum` ou dos metadados do projeto; contar por tipo de pasta; calcular caracteres a partir do texto decodificado (#4).

## 13. Resumo do `analyze_document`

- **Arquivo:** handler do `analyze_document` (`handlers/analysis-handlers.js`) e `analysis/ai-document-analyzer.js`.
- **Sintomas:**
  - O resumo imprime `readability=?` e `pacing=[object Object]`.
  - O argumento `analysisTypes` é ignorado.
  - Só os 3 primeiros problemas aparecem; o resto fica atrás de "Full analysis available via deep_analyze_content", ferramenta que não existe.
- **Correção proposta:** formatar os campos de verdade, respeitar `analysisTypes`, devolver todos os problemas no `structuredContent` e remover a referência à ferramenta inexistente.

## 14. `ContentAnalyzer` só funciona para inglês

- **Arquivo:** `analysis/base-analyzer.js` e analisadores auxiliares (`ml-word-classifier-pro.js` etc.).
- **Problemas:**
  - `dialoguePercentage` só conta aspas retas, então dá 0% com aspas tipográficas. **Em PT-BR o diálogo usa travessão no início do parágrafo** e também daria 0%.
  - Os números de legibilidade (Flesch) saíam errados (36 contra 67 reais no capítulo I) porque eram calculados sobre o texto corrompido (#4).
  - Listas de *filter words* e clichês, contador de sílabas e Flesch-Kincaid são do inglês.
  - `sensoryDetails: 'lacking'` e as sugestões são genéricos, sem relação com o texto.
- **Correção proposta para o PT-BR:**
  - Detector de diálogo: parágrafo que começa com `—` ou `–`, mais trechos entre “ ” e « ».
  - Contador de sílabas para português (separação por núcleos vocálicos, tratando ditongos e hiatos).
  - Legibilidade: adaptação do Flesch para o português de Martins et al. (1996), `248,835 − 1,015 × (palavras/frase) − 84,6 × (sílabas/palavra)`. Confira a fórmula na fonte antes de implementar.
  - *Filter words* em português: "apenas", "muito", "realmente", "de repente", "começou a", "parecia", "sentiu", "viu", "ouviu", "percebeu" etc.
  - Voz passiva: "foi/era/está/estava sendo" + particípio, e o "se" apassivador.
  - Lista de clichês em português e de repetições por n-gramas (3 e 4 palavras), que se mostraram mais úteis do que a lista fixa.

## 15. Modelos de raciocínio da OpenAI recusam `max_tokens` e `temperature`

- **Arquivo:** `services/ai/ai-client.js`, `chatWith`.
- **Sintoma:** com `OPENAI_MODEL=gpt-6.1-terra` (ou qualquer GPT-5+ ou série o), a chamada falha ou devolve texto vazio, porque o raciocínio consome o limite.
- **Correção aplicada:** detectar modelos de raciocínio (`/^(gpt-[5-9]|o\d)/` após remover o prefixo `openai/`) e, para eles:
  - enviar `max_completion_tokens: max(maxTokens*4, 4000)` no lugar de `max_tokens`;
  - enviar `reasoning_effort` (variável `OPENAI_REASONING_EFFORT`, padrão `low`);
  - omitir `temperature`.
- **Observações:**
  - O modelo padrão é `gpt-4o-mini`; dá para trocar com `OPENAI_MODEL`.
  - Ordem de preferência: Anthropic, OpenAI, OpenRouter e, por último, *sampling*.
  - Nos modelos de raciocínio, as temperaturas dos prompts (0,2 para análise, 0,8 para geração) deixam de valer. Documente isso.

## 16. `suggest_improvements` ignora o `documentId`

- **Arquivos:** `handlers/async-handler-definitions.js`, `handlers/async-handlers.js`, `services/ai/ai-writing-service.js`.
- **Sintoma:** com `documentId` e `useContext: true`, o modelo responde "please share the chapter". O documento nunca é enviado, e o contexto depende de um banco de vetores vazio.
- **Correção aplicada:**
  - O handler recebe `(args, context)`, lê o documento com `context.project.readDocument` e repassa `documentText`.
  - O `generateWithContext` antepõe "Document under review:" (até 12.000 caracteres) ao contexto do banco de vetores.

## 17. Falha das ferramentas de IA sem chave nem *sampling*

- **Sintoma:** o Claude desktop não suporta *sampling* do MCP. Sem chave de API, `analyze_document` cai num *fallback* ruim e `analyze_writing_style` responde só "AI writing service not available".
- **Correção proposta:** na inicialização, registrar qual provedor está ativo; no erro, dizer como configurar (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` no `env` do cliente) e que o cliente não suporta *sampling*.

## 18. `check_consistency` não usa os personagens do Binder

- **Sintoma:** as regras (personagem que some por mais de 3 ou 5 capítulos, mistura de "yesterday/today/tomorrow", locais citados mas não registrados, fios de trama) só funcionam com entidades gravadas por `remember`. Num projeto novo, nada é verificado.
- **Correção proposta:** popular o registro a partir das pastas de personagens e de mundo do Binder (com *aliases* configuráveis) e trocar as palavras de tempo e a regex de locais por versões em português ("ontem", "hoje", "amanhã", "semana passada"; "em/no/na/num + Maiúscula").

## 19. Cache devolve conteúdo antigo

- **Sintoma:** depois de editar um `content.rtf` fora do MCP, o `read_document` pode devolver a versão em cache (`documentCache`, um LRU).
- **Correção proposta:** invalidar a entrada quando o `mtime` do arquivo mudar, ou observar `Files/Data` com um *watcher*.

## 20. Gravação adiada

- **Sintoma:** as gravações entram numa fila descarregada a cada ~5 s; a resposta chega antes de o arquivo ser escrito.
- **Correção proposta:** devolver confirmação depois do `fsync`, ou um parâmetro `flush: true`.

## 21. `compile_documents` grava o resultado em `/tmp`

- **Sintoma:** resultados grandes vão para `/tmp/scrivener-mcp-spool/…json`, fora das pastas a que o cliente tem acesso.
- **Correção proposta:** pasta de *spool* configurável (por exemplo, `<projeto>/../_compile/`) ou parâmetro `outputPath`.

## 22. Modo assíncrono exige Redis

- **Sintoma:** `async: true` e as filas de análise (`queue_*`) dependem de Redis; sem ele, caem no modo síncrono ou falham.
- **Correção proposta:** fila em memória como *fallback* e aviso claro.

## 23. Prompts de IA em inglês

Lista para tradução (mantenha as **chaves JSON** em inglês, para não quebrar os parsers, e peça os **valores** em português):

| Ferramenta | Prompt de sistema atual |
|---|---|
| `analyze_document` | "You are a developmental editor reviewing a fiction passage… STRICT JSON only" + esquema `{readability, pacing, issues[{description,severity}]}` |
| `analyze_writing_style` | "You are a writing-style analyst. Respond with STRICT JSON only." + `{voice, tone, sentenceStructure, vocabularyComplexity, pacing, strengths[], improvements[]}` |
| `check_plot_consistency` | "You are a developmental editor. Respond with STRICT JSON only." + `[{issue, severity, locations[], suggestion}]` |
| `suggest_improvements` | "You are a professional writing assistant…" |
| `enhance_content` | "You are a careful line editor for a fiction writer…" + 19 instruções por tipo (`grammar`, `show-dont-tell`, `strengthen-verbs`…) |
| `generate_content` | "You are a creative writing assistant. Write ${style} prose…" |

No `enhance_content`, `grammar` deve seguir a norma brasileira (crase, colocação pronominal, Acordo Ortográfico de 1990) e `strengthen-dialogue` deve respeitar a pontuação com travessão.

---

## Ferramentas seguras e inseguras (estado atual, sem correções)

- **Seguras:** `open_project`, `get_structure`, `get_manuscript_briefing`, `read_document` (com o patch #4), `search`, `find_mentions`, `export_project`, `compile_documents`, `create_snapshot`, `analyze_*` (só leitura).
- **Inseguras:** `create_document`, `move_document`, `delete_document`, `update_document` (#6) e `write_document` (#9).

## Checklist de testes para o projeto PT-BR

- [ ] Ler um capítulo com acentos, travessões e itálicos: o texto deve ser idêntico ao do `textutil`.
- [ ] Gravar o mesmo texto lido: zero bytes alterados no `content.rtf`.
- [ ] Trocar uma palavra: só aquela palavra muda, e a fonte e os itálicos ficam.
- [ ] Gravar “aspas”, ‘aspas’, «aspas» e — travessão: tudo sai correto no Scrivener.
- [ ] Criar, mover e apagar um documento: o Scrivener abre sem "Recovered Files".
- [ ] *Round-trip* do `.scrivx` sem alterações: arquivo igual.
- [ ] `analyze_document` com diálogo em travessão: percentual de diálogo maior que 0.
- [ ] Legibilidade em PT-BR com a fórmula adaptada; sílabas conferidas numa amostra.
- [ ] `suggest_improvements` com `documentId`: a resposta cita o texto do documento.
- [ ] Modelo de raciocínio (GPT-5+ ou série o) responde sem erro de parâmetro.
