# Integração com o plugin escrita-criativa

> **Decisões do autor (2026-11-01):** todas as recomendações deste documento foram aceitas. Em
> particular: (1) a integração é feita **no plugin**, e o MCP recebe só as medições que faltam
> (itens 1 a 3 da seção 3, já cobertos pelas fases 3 e 5 da arquitetura); (2) a bíblia fica **no
> binder do Scrivener**, e a do Scrivener é a canônica quando o projeto estiver lá (seção 2,
> opção (c), e seção 5).

Análise de 2026-11-01 de como o plugin `escrita-criativa` (v0.1.0) pode usar este MCP. Li o
README, os 6 comandos (`criar`, `pesquisar`, `escrever`, `editar`, `polir`, `validar`) e os 5
skills (`autor-escritor`, `editor-chefe`, `pesquisador`, `polidor-dialogos`, `revisor-tecnico`).
Nada foi alterado no plugin.

## 1. A diferença de fundo

| | Plugin hoje | MCP |
|---|---|---|
| Onde o texto vive | arquivos `.md` numa pasta (`capitulos/`, `outlines/`, `pesquisas/`) | projeto `.scriv` (binder, RTF, snapshots) |
| Ferramentas declaradas | `Read`, `Write`, `Glob`, `Edit`, `WebSearch` (`allowed-tools` em cada comando) | 82 ferramentas MCP |
| Bíblia do universo | `biblia-do-universo.md`, texto livre com template | `story_bible` (fatos tipados com procedência) e `remember` (memória livre) |
| Avaliação | julgamento do modelo guiado por checklists | evidência local localizada (linha, coluna, citação) + IA opcional |
| Aplicação de edições | `Edit` direto no `.md` após aprovação | `review_changes`: proposta, prévia, aprovação seletiva, snapshot nativo, desfazer |

O plugin julga e o MCP mede. A integração útil coloca as medições do MCP como evidência dentro do
julgamento dos skills, e passa a gravar no Scrivener em vez de em `.md` soltos quando o projeto
estiver lá.

## 2. Mapeamento por comando

### `/criar` → configuração do projeto no MCP
- Bíblia: personagens → `story_bible` com `kind: 'character'`; tecnologia, estrutura social e
  pseudociência → `kind: 'world-rule'`; nomes alternativos → `kind: 'alias'`.
- Premissa, logline, temas e estética não têm `kind` no `story_bible`. Vão para `remember`
  (memória de projeto) ou para um documento na pasta Research do binder.
- "Extensão alvo: 80k palavras" → `set_writing_goal`.
- POV, tom → `set_writing_preferences`.
- Idioma → `locale.primary = 'pt-BR'` (arquitetura, seção 3.4); falas em inglês preservado ("com
  terminologia técnica em inglês preservada", diz o README do plugin) → `locale.embedded`.

**Atrito encontrado:** no `story_bible`, `confidence: 'confirmed'` exige pelo menos uma citação
verificada do texto salvo (descrição do campo `sources`: "confirmed canon requires at least one").
Uma bíblia escrita **antes** do texto não tem o que citar, então os fatos entram como `inferred`.
Isso inverte a autoridade: para o autor, a bíblia é cânone por decisão, não por evidência. Opções:

- (a) importar como `inferred` e confirmar à medida que o texto for escrito. Não muda nada no MCP,
  mas o `check_consistency` vai tratar a bíblia como candidata, não como regra;
- (b) adicionar uma procedência "declarado pelo autor" (`authorDeclared`) que conta como cânone
  sem citação. É uma mudança no schema do upstream (`story-handlers.ts`), com conflito de merge;
- (c) manter a bíblia como documento do binder e citar dele. Funciona com o schema atual se o
  documento estiver salvo no projeto e o validador aceitar citações de fora do Draft. **Não
  verifiquei** se aceita.

Recomendo testar (c) primeiro, porque não toca no upstream.

### `/pesquisar` → Research do binder + memória
- O briefing vira documento na pasta Research (`create_document` aceita `parentId`).
- Fatos de época viram `remember` ou `story_bible` (`chronology`).
- A pesquisa web continua no plugin; o MCP não faz busca externa.

### `/escrever` → binder e geração com contexto
- Outline → sinopses dos documentos (`update_document` com `synopsis`) e estrutura do binder
  (`create_document`, `move_document`).
- Prosa → `create_document` ou `write_document` no Draft, passando por `review_changes`.
- `generate_content` usa trechos salvos e perfis de personagem como contexto, o que substitui o
  "procure capítulos anteriores com Glob".
- O `speculative-prose` continua gerando; o MCP grava, versiona e mede.

### `/editar` (editor-chefe) → métricas como evidência do checklist
O checklist de prosa do editor-chefe tem itens mensuráveis:

| Item do checklist | Ferramenta MCP | Depende do suporte pt-BR? |
|---|---|---|
| "Wordcount dentro do alvo?" | `get_manuscript_briefing`, `get_writing_goals` | não (contagem neutra, arquitetura 6.4) |
| "Pacing equilibrado? (diálogo 30–40%…)" | `analyze_dialogue_tags_local` (proporção de diálogo) | **sim**: hoje ignora travessão |
| ritmo, redundâncias (macro) | `analyze_rhythm_local`, `find_repetition_local`, `manuscript_style_report_local` | parcial (6.9: funciona com adaptador) |
| "Show don't tell aplicado?" | `check_style_local` (filter words, verbos de percepção) | **sim** |
| "POV consistente?" | nenhuma ferramenta local hoje | – |
| "Cada cena tem mudança de estado?" | `analyze_document` (IA) | não |
| Save the Cat (percentuais 10%, 50%, 75%) | `get_structure` + contagens por documento dão a posição de cada cena no total | não |

O editor-chefe continua dando o veredito; o MCP fornece números e citações, e o
"Onde: cap. 3, cena 2, linha X" passa a vir com linha e coluna reais.

### `/polir` (polidor-dialogos) → voz, tags e limites de balão
- Voz por personagem → `measure_voice_drift_local`, que **depende de atribuir cada fala a um
  falante**, o que em pt-BR depende da segmentação com travessão (arquitetura 3.5 e 6.3).
- A regra do plugin "tags de ação preferidas a tags de emoção" (`— disse, angustiado.` ❌) é
  exatamente a classificação `adverb`/`showy` do `analyze_dialogue_tags_local`. Em pt-BR, isso
  exige a lista de verbos de elocução e a detecção de adjetivo ou advérbio na tag.
- Limites de balão (HQ 25–30 palavras, mangá 20–25, GN 30–35) → contagem por fala. Não existe
  ferramenta para isso hoje. A segmentação de falas pt-BR produz o dado de graça, e um parâmetro
  `maxWordsPerLine` no `analyze_dialogue_tags_local` resolveria (é um parâmetro novo num handler
  do upstream).
- Aplicar as revisões aprovadas → `review_changes` em vez de `Edit`: aprovação por trecho e
  snapshot antes, que o `Edit` num `.md` não dá.

### `/validar` (revisor-tecnico) → continuidade com evidência
- "Worldbuilding: contradições com a bíblia" → `check_consistency`, `check_continuity_local`,
  `continuity_findings` (confirmar, descartar, resolver, rechecar, com persistência).
- "Anacronismo linguístico": nenhuma ferramenta local. Um detector por lista de termos datados
  por projeto seria novo; o julgamento continua com o revisor.
- `find_mentions` e `get_entity_references` respondem "onde este personagem ou tecnologia
  aparece", que hoje o revisor faz lendo.
- O glossário técnico que o revisor "mantém" pode ser `story_bible` (`world-rule`) ou `remember`.

## 3. Requisitos que isso acrescenta à extensão pt-BR

Nenhum muda a arquitetura; alguns reforçam prioridades já definidas:

1. **Segmentação de falas com travessão e atribuição de falante** (fase 3). É o requisito mais
   citado: proporção de diálogo, voz por personagem, tags, limites de balão. O plugin manda usar
   travessão em toda prosa.
2. **Classificação de tags de diálogo pt-BR** (fase 5): neutras, enfáticas, com advérbio ou
   adjetivo.
3. **Contagem de palavras por fala** (fase 5): um campo a mais na saída do diálogo.
4. **Preservação de termos em inglês** (seção 3.5): o plugin preserva "terminologia técnica em
   inglês", então o `locale.allowlist` e o `embedded` vão ser usados desde o primeiro projeto.
5. **Perfil de estilo da casa**: as regras do `autor-escritor` (artigos, alternância de parágrafos,
   dois sentidos por ambiente) e do `polidor-dialogos` são convenções do autor, não do português
   em geral. Elas cabem como um perfil opcional por projeto, separado das regras pt-BR padrão,
   para não impor a casa a qualquer texto. Fica fora das fases atuais; registrar como item futuro.

## 4. Onde fazer as mudanças

| Opção | O que muda | Custo |
|---|---|---|
| **No plugin** (recomendada) | acrescentar `mcp__scrivener__*` ao `allowed-tools` dos comandos; nos skills, um passo "se houver projeto Scrivener aberto, use X; senão, siga o fluxo de arquivos" | o plugin passa a ter dois caminhos; o MCP não muda |
| No MCP, via MCP prompts | o servidor expõe prompts equivalentes aos comandos | duplica o plugin dentro do fork; mais conflito com o upstream |
| No MCP, ferramentas novas | balão por fala, densidade sensorial, termos datados | só onde a medição local agrega; cada uma é código do fork |

Recomendo mudar o plugin e acrescentar ao MCP só as medições que faltam (itens 1 a 3 da seção 3,
que já estão nas fases). O plugin é seu e não tem upstream, então editá-lo não gera conflito.

## 5. Riscos

- **Duas fontes de verdade** para a bíblia (`.md` e `.scriv`). É preciso escolher uma canônica por
  projeto. Recomendo o `.scriv` quando o projeto estiver no Scrivener, com o `.md` gerado como
  visão de leitura.
- **Escrita concorrente:** o README do MCP alerta que o projeto aberto e não salvo no Scrivener
  pode sobrescrever gravações do servidor e vice-versa. Comandos de escrita do plugin (`/escrever`,
  `/polir`) precisam lembrar de salvar ou fechar no Scrivener antes.
- **HQ e mangá:** o MCP lê o texto como prosa simples (`FORMAT = 'plain'` em
  `bluepencil-handlers.ts`). Roteiros de painel e koma vão ter métricas de prosa aplicadas a
  roteiro. O bluepencil aceita `format: 'fountain'` para roteiro de cinema, mas não há formato de
  HQ. **Não testei** como os roteiros do plugin ficam nas métricas.
