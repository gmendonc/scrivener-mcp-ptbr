# ADR 0001 — Fachadas no import + regra de lint

Status: aceito, 2026-11-01. SPEC §4, §6.6, §9.A–B, §9.D.

## Contexto

`narrative-lens`, `bluepencil-node` e `compromise` só funcionam em inglês e falham em silêncio
em português: zero achados ou métricas falsas, nunca erro. As chamadas não ficam só nos handlers:
19 arquivos do upstream importam funções de valor dessas bibliotecas (analisadores em
`src/analysis/`, `ai-content-enhancer.ts`, `job-queue.ts`, `text-metrics.ts`…). O upstream
recebe cerca de 335 commits a cada 90 dias, e cada linha alterada num arquivo dele é um conflito
de merge em potencial. As funções nativas recebem só texto, sem contexto de projeto.

## Decisão

Para cada biblioteca, um módulo em `src/locale/engines/` reexporta as mesmas funções com as
mesmas assinaturas e despacha por idioma (`resolveLanguage`): inglês chama o nativo com os mesmos
argumentos; pt-BR consulta `coverage.ts` e chama a implementação pt-BR, a nativa com adaptador ou
lança `LanguageUnsupportedError`. Nos arquivos do upstream a mudança é trocar o especificador do
import. `compromise` ganha duas fachadas (`compromise.ts` neutra, só para `text-metrics.ts`, e
`compromise-pos.ts` com gate), e `text-metrics` ganha fachada própria (D14).

Uma regra `no-restricted-imports` (com `allowTypeImports: true`) proíbe importar as bibliotecas
fora de `src/locale/engines/`. O script `check-native-escapes.mjs` cobre o que o lint não vê
(`require.resolve`, `createRequire`).

## Alternativas descartadas

- **Interface `ProseEngine` injetada no contexto.** Mais profunda (Ousterhout): esconderia o
  idioma atrás de uma abstração própria. Exigiria editar cada chamada nos 19 arquivos, isto é,
  *change amplification* no código que mais gera conflito.
- **Desviar no registro de ferramentas.** Não pega as chamadas fora dos handlers
  (`ai-content-enhancer.ts` mede legibilidade antes e depois de uma reescrita; `job-queue.ts`;
  analisadores).
- **Patch nas bibliotecas nativas.** Rust/WASM de terceiros com regras fixas no código
  (`ends_with("ly")`); manter um fork delas é outro upstream para acompanhar.

## Consequências

- As fachadas são rasas (*pass-through* com despacho). Custo aceito de propósito.
- Merge do upstream: conflito só na linha do import; import novo que escape é barrado por lint e
  pelo script de escapes.
- `export type *` nas fachadas mantém os tipos do upstream sem dependência de valor.
- O processo filho do narrative-lens (`lens-native.cts`) escapa da fachada por construção e é
  tratado no nível da ferramenta (SPEC §8.1).
