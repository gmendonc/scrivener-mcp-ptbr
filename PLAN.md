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
- [ ] `.github/workflows/ptbr.yml` com os passos 1–7 da §10.2 — R1.17 (arquivo escrito; execução no Actions depende de push, não autorizado ainda)
- [x] Gates do upstream verdes — R1.16

**Pronto quando:**

```bash
npm run typecheck && npm run format:check && npm run lint && npm run build && node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs && npm test -- --testTimeout=30000 && node scripts/locale/check-native-escapes.mjs && node scripts/locale/check-locale-tools.mjs
```

e o workflow `ptbr.yml` verde no GitHub Actions (link: _a preencher; depende de push autorizado pelo autor_).

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

R1.17 não verificado: o `ptbr.yml` ainda não rodou no GitHub Actions (exige push).

Commit: ver `git log` — `feat(locale): esqueleto andante pt-BR (estágio 1)`

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

Incorporados à SPEC em 2026-11-01, a pedido do autor: o agrupamento em `structuredContent.locale`
(D15, D3, D11, §4.4, §6.7, §7, §8.1, §10.1, R1.9, R2.3–R2.6, R3.11, §14), a decoração de
resultados com `isError` (§6.7 f) e a idempotência de `withLocale` (§6.7, item 1). Os demais
desvios seguem só aqui.

## Decisões devolvidas ao autor

| Data | Estágio | Pergunta | Opções e custo | Resposta | Data da resposta |
|---|---|---|---|---|---|
| 2026-11-01 | — | `Dicionário de Palavras Simples` (Biderman) ou CorPop26 para Dale-Chall: licença desconhecida | verificar na fonte; se não ficar clara, Dale-Chall fica indisponível (R3.7) | licença considerada ok pelo autor; registrar em `SOURCES.md` com `licenseVerified.status: "author-accepted"`; usar a lista de Biderman, porque os coeficientes da fórmula adaptada foram calibrados com ela | 2026-11-01 |
| 2026-11-01 | 1 | O campo `coverage` de D15 colide com `coverage` do upstream em `analyze_document`, `analyze_writing_style`, `enhance_content`, `check_consistency`, `check_plot_consistency` e o sobrescreve em inglês (§7) | (a) renomear para `languageCoverage`: editar D15/§6.2/§6.7/§7/R1.9, sem colisão hoje; (b) agrupar em `structuredContent.locale`: muda a forma de D15, protege contra colisões futuras; (c) não sobrescrever quando existe: D15 deixa de ser uniforme | (b) agrupar numa chave `locale` | 2026-11-01 |

## Itens futuros (fora das fases)

- Perfil de estilo da casa por projeto (integracao §3.5).
- Issue no bluepencil para abreviações configuráveis (arquitetura §6.9, opção b).
- Passiva sintética.
