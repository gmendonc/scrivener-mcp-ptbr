# ADR 0004 — Fork permanente com `main` + remote `upstream`

Status: aceito, 2026-11-01. SPEC §2 (D2), §9, §14.

## Contexto

O suporte pt-BR não será contribuído ao `writerslogic/scrivener-mcp`. O upstream muda rápido
(cerca de 335 commits a cada 90 dias) e o fork quer as correções e ferramentas novas dele. O
repositório `gmendonc/scrivener-mcp-ptbr` é público; hoje só tem o remote `origin`.

## Decisão

`main` é o fork. O remote `upstream` aponta para
`https://github.com/writerslogic/scrivener-mcp.git`. Periodicamente, `git fetch upstream` e
merge de `upstream/main` em `main` (merge, não rebase, para preservar a história publicada).
Depois de cada merge: `npm run lint`, `node scripts/locale/check-native-escapes.mjs`,
`node scripts/locale/check-locale-tools.mjs` e a verificação ponta a ponta da SPEC §14.
`.github/workflows/ci.yml` não é editado; o fork tem `ptbr.yml` próprio.

## Alternativas descartadas

- **Branch de feature rebaseado sobre o upstream.** Reescreve história de um repositório
  público e repete a resolução de conflitos a cada rebase.
- **Contribuir ao upstream.** Fora de escopo por decisão do autor.
- **Patches aplicados no build** (estilo quilt). Mais ferramental e conflitos menos visíveis.

## Consequências

- Conflito de merge é custo recorrente. A defesa é concentrar tudo em `src/locale/` e manter a
  lista exaustiva de pontos de injeção (SPEC §9), conferida por script.
- Issues pontuais nas bibliotecas nativas continuam possíveis, porque não dependem do fork ser
  aceito.
- Se o upstream reorganizar arquivos da lista de injeção, a revisão pós-merge registra o desvio no
  `PLAN.md` e devolve a atualização da SPEC §9 ao autor.
