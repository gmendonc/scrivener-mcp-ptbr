# Decisões e achados do planejamento (insumo para SPEC.md e PLAN.md)

Sessão de 2026-11-01. Complementa `arquitetura-locale.md` (seção 10), `integracao-escrita-criativa.md`
(topo) e `pesquisa-recursos-pt-br.md`. Quem escrever a SPEC deve ler os quatro.

## Respostas da entrevista (/planejar)

1. **Escopo da SPEC: todas as fases 0–7** numa SPEC só. (Recomendação era 0–3; o autor escolheu
   todas.) Consequência a tratar na SPEC: nas fases 4–7, requisitos de qualidade são expressos
   como **regras de medição e promoção**, não como limiares fixos inventados; listas e limiares
   saem do corpus.
2. **Branches:** `main` é o fork; remote `upstream` = `writerslogic/scrivener-mcp`; merges
   periódicos de `upstream/main` em `main`.
3. **Projeto sem idioma gravado:** detectar e usar (`languageSource: 'detected'`).
4. **Reescrita por IA que altera fala em outro idioma:** rejeitar a proposta inteira, informando
   o trecho que mudou de idioma.
5. **Promoção de detector pt-BR de `unavailable` para `implemented`:** precisão **≥ 0,80 em cada
   uma das três camadas** do corpus (clássicos, contemporâneos, escrita do autor).
6. **Anotação do corpus:** o agente pré-anota, o autor revisa e corrige.
7. **CI:** manter `.github/workflows/ci.yml` intocado e criar um workflow próprio pt-BR.
8. **Licenças:** a implementação verifica cada licença na fonte primária e registra em
   `SOURCES.md`; o que não estiver claro é sinalizado para o autor escrever aos autores, **sem
   bloquear** (uso pessoal e aprendizado).
9. **Dados de terceiros ficam fora do repositório** (que é público): um script baixa da fonte
   original para `~/.scrivener-mcp/locale/pt-BR/`; o repo guarda só script e procedência.
   Exemplo: SUBTLEX-PT-BR é CC BY-NC-ND 4.0 (site do autor), o que permite uso pessoal mas não
   redistribuir derivados.
10. Plugin escrita-criativa: integração feita no plugin; o MCP só ganha as medições que faltam;
    bíblia no binder, a do Scrivener é canônica.

## Achados no código que a SPEC precisa refletir

- **Ponto único de execução:** `executeRegisteredHandler` em `src/handlers/skill-registry.ts`
  (≈ linha 360); ferramentas entram no `handlerMap` em `activateSkill` (≈ linha 295, também 278
  e 338). Um invólucro `withLocale(tool)` aplicado ali injeta, num só lugar: o argumento opcional
  `language` no `inputSchema`, os campos de saída (`language`, `languageSource`, `coverage`,
  `excludedSpans`) no `outputSchema` e no `structuredContent`, e a conversão de
  `LanguageUnsupportedError` em resposta `available: false`.
- **Idioma por chamada sem passar argumento adiante:** `AsyncLocalStorage` (`node:async_hooks`)
  aberto pelo invólucro durante a execução do handler; `resolveLanguage` lê dele. Evita estado
  global mutável entre chamadas e "pass-through variable".
- **Imports nativos a desviar (20 arquivos):** `src/analysis/{advanced-readability,base-analyzer,
  context-analyzer,ml-word-classifier-pro}.ts`, `src/analysis/analyzers/{metrics,pacing,quality,
  structure,style}-analyzer.ts`, `src/analysis/analyzers/suggestion-generator.ts`,
  `src/handlers/analysis-handlers/document-analysis.ts`, `src/handlers/bluepencil-handlers.ts`,
  `src/handlers/narrative-lens-handlers.ts`, `src/services/analysis/nlp-sentiment-analyzer.ts`,
  `src/services/editorial/{narrative-analysis,narrative-context,workflow-service}.ts`,
  `src/services/enhancements/ai-content-enhancer.ts`, `src/services/queue/job-queue.ts`,
  `src/utils/text-metrics.ts`.
- **Superfície das fachadas** (funções de valor importadas hoje):
  - narrative-lens (20): `computeReadability`×7, `collectProseExamples`×5, `checkGrammar`×4,
    `extractDialogue`×3, `analyzeOpeningChecked`×2, `wordFrequencies`×2, `aggregatePacing`,
    `analyzePacing`, `explainPacing`, `detectThemesSmart`, `analyzeForeshadowing`,
    `analyzeSyntaxTension`, `buildTimeline`, `genreFromLabel`, `measureVoiceDriftFromText`,
    `trackWorldState`, `listManuscriptRules`, `listStructureTemplates`, `parseManuscriptReport`,
    `extractNamedEntities`.
  - bluepencil-node (7): `analyzeDialogue`, `analyzeRhythm`, `checkStyle`, `findEchoes`,
    `findRepeats`, `report`, `sentenceStarters`.
  - compromise: `import nlp from 'compromise'` em `text-metrics.ts`, `ml-word-classifier-pro.ts`,
    `nlp-sentiment-analyzer.ts`.
- **Caminho que escapa das fachadas:** `src/services/editorial/lens-native.cts` resolve o módulo
  `narrative-lens` por caminho, e `narrative-worker.ts` e `narrative-context.ts` o carregam
  **dentro de Worker threads**. A regra de lint não pega isso, e o `AsyncLocalStorage` não
  atravessa o worker. A SPEC precisa tratar no nível da ferramenta: as ferramentas que usam o
  worker (verificar quais; `analyze_manuscript_local` é a candidata) ficam `unavailable` em pt-BR
  até a fase que as implementar, decididas pelo invólucro antes de chamar o handler.
- **Gates do CI que afetam o desenho** (`ci.yml`):
  - `scripts/check-output-conformance.mjs` valida resultados reais contra o `outputSchema`; os
    campos novos precisam estar no schema (o invólucro aumenta o schema);
  - `scripts/check-tool-registry.mjs` exige descrição em todo campo de schema e em toda
    ferramenta (≥ 60 caracteres); vale para `language` e para a ferramenta nova
    `set_project_language`.
- **Memória de projeto:** `MemoryManager` grava em `<projeto>.scriv/.ai-memory/project-memory.json`
  e tem `setCustomContext(key, value)` / `getCustomContext(key)`. O `ProjectLocale` cabe em
  `customContext.locale` **sem alterar `memory-manager.ts`**.
- **Ferramentas candidatas a `withLocale`:** `analyze_craft_local`, `analyze_dialogue_tags_local`,
  `analyze_document`, `analyze_foreshadowing_local`, `analyze_manuscript_local`,
  `analyze_narrative_annotations`, `analyze_opening_local`, `analyze_rhythm_local`,
  `analyze_writing_style`, `check_consistency`, `check_continuity_local`, `check_plot_consistency`,
  `check_style_local`, `continuity_findings`, `enhance_content`, `find_repetition_local`,
  `generate_content`, `manuscript_style_report_local`, `measure_voice_drift_local`,
  `search_passages`, `semantic_search`, `suggest_improvements`, `compile_documents`.
- **Prompts (6 arquivos):** `src/analysis/ai-document-analyzer.ts`,
  `src/handlers/analysis-handlers/content-generation.ts`, `src/services/agents/ai-collaboration.ts`,
  `src/services/ai/ai-writing-service.ts`, `src/services/compilation/ai-compiler.ts`,
  `src/services/enhancements/ai-content-enhancer.ts`.
- Testes: Jest com `ts-jest` ESM (`jest.config.js`); já existem
  `tests/unit/handlers/bluepencil-handlers.test.ts` e `narrative-lens-handlers.test.ts`; quatro
  testes mocam bibliotecas nativas com `jest.mock`.

## Avaliação estrutural já feita (Ousterhout)

- **Fachadas com assinatura idêntica** passam no teste de *Pass-Through Method* só em parte: há
  despacho por idioma além do repasse, mas a abstração é a mesma da biblioteca. Custo assumido
  de propósito: a alternativa mais profunda (uma interface `ProseEngine` injetada no contexto)
  exigiria editar cada chamada nos 20 arquivos do upstream, ou seja, *change amplification* no
  código que mais gera conflito de merge.
- **Information Leakage:** a decisão "qual é o idioma deste texto" vive só em `resolveLanguage`;
  a decisão "o que existe em pt-BR" vive só em `coverage.ts`; a conversão em resposta
  "indisponível" vive só em `withLocale`. Uma mudança em qualquer delas toca um módulo.
- **Martin:** dependência de upstream → `src/locale/engines` → (nativo | `src/locale/pt-BR`);
  `src/locale/pt-BR` não importa nada de `src/handlers`. Uma regra de lint basta nesta escala;
  fronteiras formais além disso seriam excesso.

## ADRs previstos

1. Fachadas no import + regra de lint (alternativa descartada: `ProseEngine` injetado).
2. Invólucro `withLocale` no registro + `AsyncLocalStorage` (alternativas: argumento em cada
   handler; estado global).
3. Dados de terceiros fora do repositório, baixados por script.
4. Fork permanente com `main` + remote `upstream`.

## Ambiente

- Node 24.22.2 (ok). `npm ci` ainda falha com `EACCES`: há subdiretórios de `~/.npm/_cacache`
  que não pertencem ao usuário; correção é do autor (`sudo chown -R $(whoami) ~/.npm`).
- A sessão anterior caiu 3 vezes com `EPROTO` (TLS); provável interferência da Trend Micro
  (configuração XDR alterada às 11h37, primeiro erro às 11h38). Manter turnos curtos.
