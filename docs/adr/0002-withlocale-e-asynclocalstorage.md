# ADR 0002 — Invólucro `withLocale` no registro + `AsyncLocalStorage`

Status: aceito, 2026-11-01. SPEC §6.2, §6.7, §8, §9.C.

## Contexto

As fachadas (ADR 0001) recebem só texto, mas a resolução de idioma precisa do argumento
`language` da chamada e do idioma gravado no projeto. Toda ferramenta passa por um ponto único:
`executeRegisteredHandler` em `src/handlers/skill-registry.ts`, que despacha pelo `handlerMap`
preenchido em `activateSkill`. Os gates do CI (`check-tool-registry.mjs`,
`check-output-conformance.mjs`) leem `getRegisteredTools()` e executam por
`executeRegisteredHandler`. O servidor atende chamadas concorrentes e pode ter projetos nos dois
idiomas na mesma sessão.

## Decisão

`withLocale(tool)` é aplicado em `activateSkill` (`visibleTools(skill).map(withLocale)`), uma
linha. Para ferramentas de `LOCALE_TOOLS` ele, num só lugar: acrescenta `language` ao
`inputSchema`; acrescenta `language`, `languageSource`, `coverage`, `excludedSpans` e a forma
"indisponível" ao `outputSchema` e ao `structuredContent`; converte `LanguageUnsupportedError`
em `isError: false, available: false`; e decide, antes do handler, as ferramentas que chegam ao
processo filho do narrative-lens. Durante o handler abre um `AsyncLocalStorage`
(`node:async_hooks`) com o contexto da chamada; `resolveLanguage` lê dele. O resultado é
memoizado num `WeakMap`, porque `activateSkill` compara identidade.

## Alternativas descartadas

- **Argumento `language` em cada handler e repassado às funções.** *Pass-through variable* por
  todas as camadas do upstream; edita dezenas de assinaturas.
- **Estado global mutável** (`src/locale/state.ts` da arquitetura §4, atualizado ao abrir e
  fechar o projeto). Simples, mas mistura chamadas concorrentes e não carrega o argumento
  `language` nem o `documentId` de cada chamada.
- **Editar cada `ToolDefinition`.** Dezenas de edições em handlers do upstream.

## Consequências

- Dependência implícita: o contexto some em fronteiras de processo (processo filho do
  narrative-lens) e de fila (BullMQ). Os dois casos são tratados explicitamente (SPEC §8.1,
  §8.2) e cobertos por testes (R1.13, R2.4).
- Testes do upstream que chamam `tool.handler` direto não veem o invólucro e continuam passando
  sem alteração.
- A saída em inglês ganha campos novos, só como acréscimo (decisão D15).
- Ferramentas novas do upstream não entram em `LOCALE_TOOLS` sozinhas; `check-locale-tools.mjs`
  e a revisão pós-merge decidem.
