# PLAN — Extensão bilíngue en + pt-BR

Executa a `SPEC.md`. Os estágios rodam na ordem; cada `- [ ]` aponta a seção ou o requisito da
SPEC.

## Regras de uso

1. **Toda sessão começa lendo `SPEC.md` e depois este `PLAN.md`.** Retome do primeiro item
   `- [ ]` do primeiro estágio que não estiver fechado.
2. **Atualize este arquivo antes do commit de cada estágio:** marque os itens `- [x]`, cole o
   resumo da saída do comando "Pronto quando", preencha a linha de commit (hash e mensagem) e
   registre desvios e decisões devolvidas.
3. Divergência da SPEC → linha em **Desvios** antes do commit. Não edite a SPEC para acomodar o
   código.
4. Decisão que só o autor pode tomar → linha em **Decisões devolvidas** e pare o estágio.
5. Um estágio só fecha com o comando "Pronto quando" verde e a saída registrada. Sem forma de
   verificar, escreva "não verificado" e o motivo.
6. Edições em arquivos do upstream só nos pontos da SPEC §9.

---

## Esqueleto andante (estágios 0 e 1)

### Estágio 0 — Ambiente (SPEC §13 Fase 0)

- [x] R0.1 Node ≥ 24.22.1 (`node -v`)
- [x] R0.2 `npm ci` sem `EACCES` (correção do cache `~/.npm` é do autor; não rode sudo)
- [x] R0.3 `git remote add upstream https://github.com/writerslogic/scrivener-mcp.git` (ADR 0004)
- [x] R0.4 Linha de base do upstream registrada abaixo; falhas preexistentes em Desvios

**Pronto quando:**

```bash
node -v && npm ci && git remote get-url upstream && npm run typecheck && npm run lint && npm run build && npm test -- --testTimeout=30000 && node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs
```

Saída (resumo, 2026-11-01, base `a48ef5b`):

- `node -v` → `v24.22.2`
- `npm ci` → `added 627 packages`, 0 vulnerabilidades, sem `EACCES`. Aviso: 6 pacotes com
  install scripts fora de `allowScripts` (`better-sqlite3`, `esbuild`, `@parcel/watcher`,
  `fsevents`, `msgpackr-extract`, `unrs-resolver`); `better-sqlite3` carrega e executa
  `select 1` mesmo assim.
- `git remote get-url upstream` → `https://github.com/writerslogic/scrivener-mcp.git`
  (push desativado: `no-push`)
- `typecheck`, `lint`, `format:check`, `build` → exit 0 (C2PA 0.91.7 verificado)
- `npm test -- --testTimeout=30000` → exit 0; suites 150 passed, 2 skipped (152); tests 2515
  passed, 12 skipped (2527); 119 s
- `check-tool-registry.mjs` → 82 tools, 0 duplicados, 68 data tools, OK
- `check-output-conformance.mjs` → 36 pass, 0 fail, 0 skip
- `check-runtime-policy.mjs` → ok (N-API 10)

Nenhuma falha preexistente.

Commit: ver `git log` — `chore: registra SPEC, PLAN e linha de base do upstream (estágio 0)`

### Estágio 1 — Esqueleto com CI pt-BR verde (SPEC §13 Fase 1)

Núcleo:
- [x] `src/locale/language.ts` (SPEC §6.1) — R1.1, R1.2
- [x] `src/locale/context.ts` (§6.2) — R1.6
- [x] `src/locale/project-locale.ts` (§6.3, §6.10) — R1.7
- [x] `src/locale/errors.ts` (§6.4)
- [x] `src/locale/pt-BR/data/function-words.ts` (curadoria própria; pt, en, es, fr, it, de)

Fachadas e imports:
- [x] `src/locale/engines/*` delegando ao nativo em todos os idiomas (§6.6) — R1.4, R1.5
- [x] Troca de imports da §9.A (19 arquivos) e §9.B (13 arquivos)
- [x] Regra de lint (§9.D) — R1.3
- [x] `scripts/locale/check-native-escapes.mjs` (§8.3) — R1.18
- [x] Teste de `\b`/`\w` — R1.12

Registro e ferramenta:
- [x] `src/locale/tool-policies.ts` com as 26 ferramentas (§6.7)
- [x] `src/locale/with-locale.ts` (§6.7, §7) — R1.8, R1.9
- [x] Injeção em `skill-registry.ts` (§9.C) — R1.10
- [x] `src/locale/set-project-language.ts` (§6.9) — R1.11
- [x] Sugestão no `open_project` (§6.10, §9.E) e fixture `tests/fixtures/pt-BR/sample-project-pt.scriv` — R1.15
- [x] `src/locale/jobs.ts` + injeção em `job-queue.ts` (§8.2, §9.F) — R1.13

CI:
- [x] `scripts/locale/check-locale-tools.mjs` (comparação com §9 e `--list-imports`) — R1.14
- [x] `.github/workflows/ptbr.yml` com os passos 1–7 da §10.2 — R1.17
- [x] Gates do upstream verdes — R1.16

**Pronto quando:**

```bash
npm run typecheck && npm run format:check && npm run lint && npm run build && node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs && npm test -- --testTimeout=30000 && node scripts/locale/check-native-escapes.mjs && node scripts/locale/check-locale-tools.mjs
```

e o workflow `ptbr.yml` verde no GitHub Actions (link: https://github.com/gmendonc/scrivener-mcp-ptbr/actions/runs/41351996460, commit `8f11023`).

Saída (resumo, 2026-11-01, depois das correções da revisão):

- `typecheck`, `format:check`, `lint`, `build` → exit 0
- `check-tool-registry.mjs` → 83 tools (82 + `set_project_language`), 0 duplicados, 69 data tools, OK
- `check-output-conformance.mjs` → 36 pass, 0 fail, 0 skip
- `npm test -- --testTimeout=30000` → exit 0; suites 164 passed, 2 skipped (166); tests 2633
  passed, 12 skipped (2645); 83 s. Linha de base: 2515 passed → +118 testes de locale
- `check-native-escapes.mjs` → nenhum escape (exceção: `lens-native.cts`)
- `check-locale-tools.mjs` → 30 pontos de injeção tocados, nenhum fora da §9
- `check-runtime-policy.mjs` → ok
- Revisão em contexto fresco (subagente `revisor`): 2 bloqueios (colisão de `coverage`;
  `__locale` quebrando `suggest_improvements` assíncrono), ambos corrigidos com teste que falha
  sem a correção; ver Desvios.

GitHub Actions no commit `8f11023`:

- `pt-BR` (`ptbr.yml`): success — R1.17 verde.
- `CI` (`ci.yml` do upstream): failure só no Windows (`windows-latest` 24.x e `windows-2022`
  22.23.4), 4 testes em `tests/unit/locale/lint-rule.test.ts`: o teste chamava
  `node_modules/.bin/eslint`, que no Windows é `.cmd` e o `spawnSync` sem shell não executa.
  Corrigido para `process.execPath` + `node_modules/eslint/bin/eslint.js`; Linux e macOS
  passaram nas 7 combinações. "Release verification" falha por depender da matriz completa.
  Correção verificada em `9a59893` (abaixo).
- `Changelog` (workflow do upstream): failure em "Open changelog PR" — "GitHub Actions is not
  permitted to create or approve pull requests" (configuração do fork, não código). Workflow
  desativado no fork a pedido do autor.
- `CodeQL`, `Scorecard`: success.

GitHub Actions no commit `9a59893` (correção do `lint-rule` no Windows):

- `CI` run 41359219068: `lint-rule.test.ts` passa no Windows. `windows-2022` verde nas duas
  tentativas; `windows-latest` 24.x falhou nas duas, cada vez num caso diferente de
  `tests/integration/server-shutdown.test.ts` (`cancel-zero`: timeout no
  `analyze_manuscript_local`; no rerun, `cancel-empty`: servidor não saiu em 2 s).
  Linux e macOS verdes.
- Aceito como instabilidade do upstream, decisão do autor (Windows fora do uso atual): o mesmo
  teste falhou no Windows no CI do próprio upstream (run 41243134078, commit `4fc8895`), e
  localmente fork e upstream `a48ef5b` passam 5/5 em ~11 s. Não descartado: a amostragem do
  Draft que o fork faz antes de liberar ferramentas de processo filho sem idioma configurado
  pode pesar no prazo do teste no Windows; não reproduzível no macOS. Ver Desvios.

Commit: ver `git log` — `feat(locale): esqueleto andante pt-BR (estágio 1)`

---

## Correções do upstream (estágio C)

### Estágio C — Correções do upstream (SPEC §13 Fase C, §9.L, §15; D21, D22)

Roda antes do estágio 2. Ordem: o leitor primeiro, porque o splice, as estatísticas e todas as
métricas leem por ele. Cada item começa por um teste de caracterização que falha no código
atual; cole aqui a saída da falha antes de corrigir.

Leitura e gravação RTF:
- [x] Fixture `tests/fixtures/fixes/cocoa-cp1252.rtf` (texto próprio) e `.txt` gerado com
  `textutil -convert txt -stdout` — RC.2
- [x] `src/fixes/rtf-decode.ts` e injeção no `rtf-handler.ts` e no `rtf-splice.ts` (§9.L) — RC.1, RC.2
- [x] Regressão: `npm test`; nenhum teste do upstream mudou com o leitor novo — RC.5
- [x] `src/fixes/rtf-encode.ts` — RC.3
- [x] `src/fixes/rtf-header.ts` e injeção no `project-writer.ts` — RC.4

Binder:
- [x] `src/fixes/binder-trash.ts` e injeção no `binder-editor.ts` — RC.6, RC.7 (mais
  `binder-containers.ts`, `project-trash.ts` e `document-manager-helpers.ts`; ver Desvios)
- [ ] Verificação manual no Scrivener, **pelo autor** — RC.8 (adiada pelo autor para a próxima
  etapa, 2026-11-02)

Demais:
- [x] `src/fixes/statistics.ts` e injeção no `project-reports.ts` — RC.9 (título: uma linha em
  `compilation-handlers.ts`; ver Desvios)
- [x] `src/fixes/openai-params.ts` e injeção no `ai-client.ts` — RC.10
- [x] `src/fixes/spool.ts` e injeção no `response-formatter.ts` — RC.11
- [x] `src/fixes/messages.ts` e injeção no `async-handlers.ts`, `job-queue.ts` e
  `writing-suggestions.ts` — RC.12
- [x] `docs/pt-br/configuracao-cliente.md` — RC.13
- [x] Investigação do `close_project` — RC.14 (resultado: não reproduzido; ver abaixo)

Ferramentas:
- [x] `check-locale-tools.mjs`: fase C em `DELIVERED_PHASES` e os pontos de §9.L — RC.15
- [x] `ptbr.yml`, passo 4 com `tests/unit/fixes tests/integration/fixes` (§10.2)
- [x] Fixture pt-BR do estágio 1: testes de locale verdes com os travessões `\'97` lidos como `—`

Caracterização (testes novos rodados contra o código do upstream, com `src/fixes/` presente mas
sem as injeções), 2026-11-02:

- RC.2 `rtf-reader.test.ts`: 2 de 3 falham. Recebido: `" Ninguém sobe ao convés antes do
  amanhecer  disse a capitã"` (travessões `\'97` viram U+0097), `"O dirigível \nAlbatroz\n
  balançava"` (quebra crua depois do itálico), `"escrevera proibido fumar"` (aspas `\'93`/`\'94`
  somem). O terceiro (scanner = leitor) passava porque os dois erravam igual.
- RC.3 `rtf-encode.test.ts`: falha "never turns straight quotes into curly-quote control
  words". A ida e volta passava: o leitor traduz `\rdblquote` de volta para `"`.
- RC.4 `write-preserving.test.ts`: 3 de 3 falham; o arquivo era regravado com
  `{\rtf1\ansi\deff0\uc1…Helvetica…Cochin…Optima}` e sem `\ansicpg1252`.
- RC.6/RC.7/erro 7 `binder-trash.test.ts`: 6 de 7 falham (só passa a recusa da TrashFolder
  como destino de `move`).
- RC.9 `statistics.test.ts`: `draftDocuments: 0`, `totalCharacters: 0`, `title: "Untitled"`.
- RC.10 `openai-params.test.ts` › AIClient: falha, `max_tokens` e `temperature` enviados.
- RC.11 `spool.test.ts`: falha com a variável definida.
- RC.12 `provider-message.test.ts`: falha, mensagem sem as variáveis.

RC.14: `close-project.test.ts` passa (`close_project` < 5 s depois de `open_project` no
fixture). O Jest avisa "did not exit one second after the test run" e o processo sai sozinho em
cerca de 2 s; `--detectOpenHandles` não aponta handle. Timeout do relatório não reproduzido.

**Pronto quando:**

```bash
npm run typecheck && npm run format:check && npm run lint && npm run build && npx jest tests/unit/fixes tests/integration/fixes tests/unit/locale tests/integration/locale --testTimeout=30000 && npm test -- --testTimeout=30000 && node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs && node scripts/locale/check-native-escapes.mjs && node scripts/locale/check-locale-tools.mjs
```

mais RC.8 registrado pelo autor e o `ptbr.yml` verde no GitHub Actions.

Saída (resumo, 2026-11-02, antes do commit):

- `typecheck`, `format:check`, `lint`, `build` → exit 0
- `jest tests/unit/fixes tests/integration/fixes tests/unit/locale tests/integration/locale`
  → 24 suites, 167 testes, todos passando
- `npm test -- --testTimeout=30000` → exit 0; suites 174 passed, 2 skipped (176); tests 2682
  passed, 12 skipped (2694); 64 s
- `check-tool-registry.mjs` → 83 tools, 0 duplicados, 69 data tools
- `check-output-conformance.mjs` → 36 pass, 0 fail, 0 skip
- `check-native-escapes.mjs` → nenhum escape
- `check-locale-tools.mjs` → 42 pontos de injeção, nenhum fora da §9
- Revisão em contexto fresco (`revisor`): **interrompida** pelo limite de uso da API; o autor
  autorizou o commit sem ela (2026-11-02). Fica pendente, para rodar sobre este commit
- RC.8 (Scrivener, autor): adiado pelo autor para a próxima etapa
- `ptbr.yml` no Actions: pendente (sem push)

Commit: `________` — _mensagem_

---

### Estágio 2 — Gate, opção A (SPEC §13 Fase 2)

- [ ] `src/locale/pt-BR/coverage.ts` e `dispatchPtBR` nas fachadas (§6.5, §6.6) — R2.1
- [ ] `check-locale-tools.mjs` confere `LOCALE_TOOLS` e `coverage.ts` — R2.2
- [ ] `tests/integration/locale/gate.test.ts` — R2.3, R2.4, R2.5, R2.6

**Pronto quando:**

```bash
npx jest tests/unit/locale tests/integration/locale --testTimeout=30000 && node scripts/locale/check-locale-tools.mjs && node scripts/check-output-conformance.mjs && npm test -- --testTimeout=30000
```

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

### Estágio 3a — Dados e texto base (SPEC §11, §6.8, §13 Fase 3)

- [ ] `scripts/locale/sources.json`, `fetch-data.mjs`, `loader.ts`, `describeWithData` (§11)
- [ ] `docs/pt-br/SOURCES.md` com licença verificada na fonte primária para cada fonte (D8)
- [ ] `tokens.ts`, `sentences.ts`, `syllables.ts` — R3.1, R3.2
- [ ] `segments.ts`, `spans.ts` — R3.3, R3.4
- [ ] Exclusão de trechos e `recordCoverage` nas fachadas — R3.5
- [ ] Adaptador do bluepencil (D18) — R3.12

**Pronto quando:**

```bash
node scripts/locale/fetch-data.mjs --check && npx jest tests/unit/locale --testTimeout=30000 && npm run lint
```

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

### Estágio 3b — Legibilidade e prompts (SPEC §6.11, §7, §9.G, §13 Fase 3)

- [ ] `docs/pt-br/semantica-campos.md` a partir do tipo `ReadabilityResult` — R3.8
- [ ] Flesch adaptado — R3.6; Dale-Chall adaptado ou indisponível — R3.7
- [ ] `prompts.ts` e injeção nos 6 arquivos (§9.G) — R3.10
- [ ] `foreign-guard.ts` e chamada em `ai-content-enhancer.ts` — R3.11

**Pronto quando:**

```bash
npx jest tests/unit/locale tests/integration/locale --testTimeout=30000 && npm test -- --testTimeout=30000 && node scripts/check-output-conformance.mjs
```

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

### Estágio 3c — Corpus e calibração (SPEC §12, §13 Fase 3)

- [ ] `evaluate-corpus.mjs` e `preannotate.mjs` (§12.3, §12.4)
- [ ] ≥ 3 textos clássicos pré-anotados; **revisão do autor** (D6) — R3.14
- [ ] Camadas `contemporaneos` e `autor` pré-anotadas em `$SCRIVENER_PTBR_CORPUS_DIR`; revisão do autor
- [ ] Calibração de `DETECTION_MIN_TOKENS` e `DETECTION_MIN_MARGIN` — R3.9 (valores finais: _a preencher_)
- [ ] Promoções da fase em `coverage.ts` — R3.13
- [ ] Passo 8 da §10.2 ativado no `ptbr.yml`

**Pronto quando:**

```bash
SCRIVENER_PTBR_CORPUS_DIR=<dir> node scripts/locale/evaluate-corpus.mjs --layer all --check
```

Saída (resumo, só números): _a preencher_

Commit: `________` — _mensagem_

### Estágio 4 — Busca e continuidade (SPEC §9.H, §9.I, §13 Fase 4)

- [ ] `conceptsFor` e revisão de índice por idioma — R4.1, R4.2
- [ ] Julgamento de relevância (`queries`) nas três camadas; revisão do autor — R4.3
- [ ] Padrões de continuidade pt-BR — R4.4, R4.5

**Pronto quando:**

```bash
npx jest tests/unit/locale --testTimeout=30000 && SCRIVENER_PTBR_CORPUS_DIR=<dir> node scripts/locale/evaluate-corpus.mjs --layer all --check
```

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

### Estágio 5 — Estilo e diálogo (SPEC §13 Fase 5; §9.J sem injeção, D20)

- [ ] Advérbios, passiva, filter words, hedges, clichês — R5.1, R5.2, R5.3
- [ ] Tags de diálogo — R5.4
- [ ] Palavras por fala na fachada `analyzeDialogue`, só em pt-BR (D20) — R5.5
- [ ] Anotação e revisão do autor; promoção por detector — R5.6

**Pronto quando:** mesmo comando do estágio 4, mais `node scripts/check-output-conformance.mjs`.

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

### Estágio 6 — Emoção, voz, `compromise` (SPEC §13 Fase 6)

- [ ] Relatório de escolha do POS — R6.1 (se sidecar: decisão devolvida ao autor)
- [ ] `compromise-pos` em pt-BR — R6.2
- [ ] Emoção e sentimento — R6.3
- [ ] Voz — R6.4
- [ ] Revisão das ferramentas do processo filho — R6.5

**Pronto quando:** mesmo comando do estágio 4.

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

### Estágio 7 — Sidecar NILC-Metrix e verificação final (SPEC §13 Fase 7, §14)

- [ ] `src/locale/sidecar/nilc-metrix.ts` — R7.1, R7.2, R7.3
- [ ] Verificação ponta a ponta completa (§14, passos 1–8)

**Pronto quando:** os 8 passos da SPEC §14 com saída registrada.

Saída (resumo): _a preencher_

Commit: `________` — _mensagem_

---

## Desvios

| Data | Estágio | Requisito / seção | O que mudou | Por quê | Evidência |
|---|---|---|---|---|---|
| 2026-11-01 | 1 | D15, §6.2, §6.7, §7, R1.9 | Campos de locale agrupados em `structuredContent.locale` (`language`, `languageSource`, `coverage`, `excludedSpans`, `unavailableMetrics`, `available`, `reason`, `alternative`, `changedSpans`); `outputSchema` exige só `locale` no topo; resposta indisponível = `{ locale: { available: false, … } }`; `withLocale` lança se o upstream declarar `locale` | Decisão do autor (opção b, ver Decisões devolvidas): `coverage` solto colidia com o `coverage` do upstream em 5 ferramentas e o sobrescrevia em inglês | `with-locale.test.ts` (forma, ramos `oneOf` fechados, colisão); `registry-locale.test.ts` envolve as 26 ferramentas reais sem lançar |
| 2026-11-01 | 1 | §9.C | `.map(withLocale)` dentro de `visibleTools`, não só em `activateSkill` | O handler de `use_skill` monta os schemas a partir de `visibleTools(skill)` e anunciaria ferramentas sem `language`; `getRegisteredTools` já leria o `handlerMap` | `registry-locale.test.ts` › "advertises the wrapped schemas through use_skill too" falha sem o desvio (mutação conferida) |
| 2026-11-01 | 1 | §9.C | Prettier quebrou a lista `tools` do skill `project` em 6 linhas | Formato imposto por `format:check` | `git diff src/handlers/skill-registry.ts` |
| 2026-11-01 | 1 | §9.F | `runWithJobLocale(jobPayload(...), …)` envolve as duas chamadas a `processJob` (worker BullMQ e fila embutida): 3 chamadas no total, não 2; `runWithJobLocale` retira `__locale` do payload antes de processar e `withJobLocale` não grava bloco vazio | Envolver dentro de `processJob` reindentaria o `switch`; `writing-suggestions` rejeita chaves desconhecidas e `suggest_improvements` com `async: true` falhava sempre (achado do revisor) | `queue-locale.test.ts`: sem a remoção, falha com "Suggestion request contains unsupported fields" (mutação conferida) |
| 2026-11-01 | 1 | §4.3 | `project-locale.ts` importa `getLogger` (valor) de `src/core/logger.ts`; `set-project-language.ts` importa `HandlerError`, `requireProject`, `requireMemoryManager` de `src/handlers/types.ts` | A própria SPEC pede `logger.warn` (§6.3) e "erro de projeto ausente" (R1.11) | typecheck, lint |
| 2026-11-01 | 1 | R1.3 | Teste roda o CLI do ESLint por `--stdin` com `--parser-options=project:false`, não a API programática | `eslint.config.js` é ESM e o Jest roda em CJS; arquivo temporário em `src/` disputava com o teste de escapes em paralelo | `lint-rule.test.ts` |
| 2026-11-01 | 1 | R1.4 | `jest.mock` em vez de `jest.unstable_mockModule` | O Jest do upstream roda em CJS (sem `--experimental-vm-modules`) | `engines-parity.test.ts` |
| 2026-11-01 | 1 | §6.10 | `localeSuggestionText` devolve a linha já prefixada com `\n\n` e nunca lança | A injeção no `open_project` continua uma concatenação só; a sugestão não pode impedir a abertura (um mock do upstream sem `getCustomContext` derrubava o `open_project`) | `project-locale.test.ts` › "never throws"; `handler-error-messages.test.ts` do upstream |
| 2026-11-01 | 1 | §6.7 f | Resultados com `isError: true` e `structuredContent` também recebem o bloco `locale` | O SDK valida esse `structuredContent` contra o `outputSchema`; `tool-protocol.test.ts` falhava em `enhance_content` | `with-locale.test.ts` › "adds the locale block to isError results" |
| 2026-11-01 | 1 | §6.7 | `withLocale` é idempotente: envolver um invólucro devolve ele mesmo | Com a checagem de colisão, reenvolver acusaria colisão consigo mesmo | `with-locale.test.ts` (R1.8) |
| 2026-11-01 | 1 | §6.6 | `aggregatePacing`, `analyzePacing`, `explainPacing` resolvem idioma só pelo contexto (passos 1–3), como as 4 funções sem texto | Recebem números já derivados do texto; `resolveContextLanguage` não registra o padrão `en` para não gerar `mixed` falso | `engines-parity.test.ts` |
| 2026-11-01 | 1 | §10.2 | Passo 3 (`fetch-data.mjs --ci`) fora do `ptbr.yml`; passo extra que busca `upstream/main` | O script só existe no estágio 3a; `check-locale-tools` precisa do ref | `.github/workflows/ptbr.yml` |
| 2026-11-01 | 1 | §8.3, R1.14 | `check-native-escapes.mjs --root <dir>` para teste hermético; `check-locale-tools.mjs` conta também mudanças não commitadas e arquivos não rastreados | Testar sem escrever em `src/`; valer antes do commit | `check-native-escapes.test.ts`; arquivo `src/zz-probe.ts` fez o script sair com 1 |
| 2026-11-01 | 1 | §6.7 f | Mantida a linha `pt-BR:` anexada ao último bloco de texto, embora deixe inválido o JSON em texto de ferramentas que usam `formatPayload` (só em pt-BR) | Segue a SPEC; clientes devem ler `structuredContent` | achado do revisor; sem teste |
| 2026-11-01 | 1 | — | Observação: `tests/integration/locale/open-project.test.ts` deixa um worker do Jest sem encerrar (aviso "failed to exit gracefully"); persiste sem a injeção do fork, vem do ciclo `open_project`/`close_project` do upstream rodado no processo de teste | Corrigir exigiria mexer no upstream; os testes passam | bissecção por arquivo e por caso; `--detectOpenHandles` em série não aponta handle |
| 2026-11-01 | 1 | R1.17 | `ci.yml` do upstream aceito vermelho no `windows-latest` por `server-shutdown.test.ts` instável; R1.17 cobre só o `ptbr.yml`, que está verde | Decisão do autor: Windows fora do uso atual; o teste já falhava no Windows no upstream. Mitigação possível, não aplicada: amostragem menor no gate de processo filho | runs 41359219068 (fork, 2 tentativas) e 41243134078 (upstream); 5/5 local em fork e upstream |
| 2026-11-02 | C | §15.1 (erro 7), §9.L | `findParentFolder` (`document-manager-helpers.ts`) aceita `DraftFolder` e `ResearchFolder` como destino, via `src/fixes/binder-containers.ts` | A triagem da §15 deu o erro 7 como corrigido; está aberto na 0.14: `move_document` e `restore_document` para o Draft respondiam "Target parent folder … not found" (só `create_document` aceitava) | `binder-trash.test.ts` › "moves a document into the DraftFolder" falha sem a correção; sonda no `dist` antes da mudança |
| 2026-11-02 | C | §9.L | `removeBinderItem` apaga a chave em vez de gravar `null` quando a pasta fica vazia (`dropEmptyBinderItem`) | Defeito novo: o `null` vira `<BinderItem/>` sem UUID no `.scrivx` ao tirar o único filho de uma pasta (apagar, mover, restaurar). Pode sobrar `<Children/>` vazio; aceitação pelo Scrivener entra na RC.8 | `binder-trash.test.ts` (asserção `not.toMatch(/<BinderItem\s*\/>/)`); dump do `.scrivx` antes da correção |
| 2026-11-02 | C | RC.6, §9.L | `getTrashDocuments` (`project-trash.ts`) usa `trashedDocuments`, que percorre a lixeira inteira | Defeito novo: só olhava o primeiro nível da árvore e listava a própria TrashFolder, nunca o conteúdo; o `list_trash` nunca mostrou documentos apagados. Itens legados em `SearchResults` continuam fora do `list_trash` (a árvore não os inclui), mas o `restore_document` os acha | `binder-trash.test.ts` › primeiro caso |
| 2026-11-02 | C | RC.7 | Lixeira vazia mantém "Trash is empty"; "not found in trash" só com itens na lixeira | Evita mudar uma mensagem do upstream sem necessidade; o teste do upstream que a cobre continua igual | `document-manager.test.ts` (upstream) e `binder-trash.test.ts` |
| 2026-11-02 | C | RC.9, §9.L | Uma linha em `compilation-handlers.ts`: `title: metadata.title \|\| stats.metadata?.title \|\| 'Untitled'`; `completeStatistics` grava o nome do pacote em `stats.metadata.title` | O título é montado no handler, não no `getStatistics`; mexer no `getProjectMetadata` mudaria também o texto do `open_project` | `statistics.test.ts` |
| 2026-11-02 | C | RC.12, §9.L | A mensagem foi trocada também em `job-queue.ts` e `writing-suggestions.ts` ("AI writing provider is unavailable") | Na 0.14 é essa a mensagem do `analyze_writing_style` e do `suggest_improvements`; as duas de `async-handlers.ts` são de `build_vector_store` e `semantic_search`. A mensagem nova começa com a frase antiga | `provider-message.test.ts` falha sem a correção |
| 2026-11-02 | C | §4.3 | `src/fixes/rtf-header.ts` importa `scanRawText` de `rtf-splice.ts`; `binder-trash.ts` importa helpers de `document-manager-helpers.ts` e `generateScrivenerUUID` | Funções sem estado do upstream; duplicá-las criaria um terceiro decodificador | typecheck, lint |
| 2026-11-02 | C | §9.L | `rtf-handler.ts`: o corpo de `encodeTextForRTF` (20 linhas) foi substituído pela chamada; `tokenizeRTF` ganhou parâmetro e quebra de linha na assinatura (Prettier) | Delegar exige remover o corpo antigo; código morto confundiria | `git diff src/services/parsers/rtf-handler.ts` |
| 2026-11-02 | C | R1.14 | Dois testes do upstream ajustados (`document-manager.test.ts`, `document-manager-binder-moves.test.ts`), com comentário "pt-BR fork" | Afirmavam o defeito: lixeira em `SearchResults[0]` e `Children: { BinderItem: null }` | `npm test` verde; `check-locale-tools.mjs` os aceita na fase C |
| 2026-11-02 | C | — | Observação: o leitor ainda mapeia `\ldblquote`/`\rdblquote` para `"` reta (`RTF_TEXT_CONTROLS`), e `\~` vira `~` (o regex de palavra de controle não casa símbolos) | Fora da §9.L; o Scrivener grava `\'93`/`\'94`, já corrigidos. Arquivos gravados pelo MCP 0.12–0.14 com `\rdblquote` são lidos com aspa reta | leitura de `rtf-handler.ts:16-28`, `384` |

Incorporados à SPEC em 2026-11-01, a pedido do autor: o agrupamento em `structuredContent.locale`
(D15, D3, D11, §4.4, §6.7, §7, §8.1, §10.1, R1.9, R2.3–R2.6, R3.11, §14), a decoração de
resultados com `isError` (§6.7 f) e a idempotência de `withLocale` (§6.7, item 1). Os demais
desvios seguem só aqui.

## Decisões devolvidas ao autor

| Data | Estágio | Pergunta | Opções e custo | Resposta | Data da resposta |
|---|---|---|---|---|---|
| 2026-11-01 | — | `Dicionário de Palavras Simples` (Biderman) ou CorPop26 para Dale-Chall: licença desconhecida | verificar na fonte; se não ficar clara, Dale-Chall fica indisponível (R3.7) | licença considerada ok pelo autor; registrar em `SOURCES.md` com `licenseVerified.status: "author-accepted"`; usar a lista de Biderman, porque os coeficientes da fórmula adaptada foram calibrados com ela | 2026-11-01 |
| 2026-11-01 | 1 | O campo `coverage` de D15 colide com `coverage` do upstream em `analyze_document`, `analyze_writing_style`, `enhance_content`, `check_consistency`, `check_plot_consistency` e o sobrescreve em inglês (§7) | (a) renomear para `languageCoverage`: editar D15/§6.2/§6.7/§7/R1.9, sem colisão hoje; (b) agrupar em `structuredContent.locale`: muda a forma de D15, protege contra colisões futuras; (c) não sobrescrever quando existe: D15 deixa de ser uniforme | (b) agrupar numa chave `locale` | 2026-11-01 |
| 2026-11-01 | C | Onde ficam as correções dos defeitos do upstream do relatório de erros (D21) | (a) `src/fixes/` + uma chamada por correção em §9.L: poucos conflitos, módulo removível quando o upstream corrigir; custo, indireção e mais uma lista; (b) editar o upstream direto: mais simples, conflitos maiores (`rtf-handler.ts` teve 9 commits do upstream em 90 dias); (c) PR no upstream + patch: reabre §3, prazo do mantenedor | (a) `src/fixes/` com injeção mínima | 2026-11-01 |
| 2026-11-01 | C | Quais erros entram (D22) | críticos + médios; só RTF/binder; todos os abertos (o 2 é difícil de testar sem o TCC) | críticos + médios: 4, 5, 9, 8/10, 12, 15, 21 com teste; 1, 2, 22 em documentação; 17 mensagem; 11 investigar | 2026-11-01 |

## Itens futuros (fora das fases)

- Perfil de estilo da casa por projeto (integracao §3.5).
- Issue no bluepencil para abreviações configuráveis (arquitetura §6.9, opção b).
- Passiva sintética.
