# Fontes de dados de terceiros

Procedência e licença de cada fonte usada pelo suporte pt-BR (SPEC §11, D8, D9). Os dados ficam
fora do repositório, baixados por `node scripts/locale/fetch-data.mjs` para
`~/.scrivener-mcp/locale/pt-BR/` (ou `SCRIVENER_MCP_LOCALE_DATA_DIR`). Nada derivado de arquivo
de terceiro entra no repositório. O manifesto é `scripts/locale/sources.json`.

## No manifesto

| Fonte | Versão | Licença | Verificação | CI | Usada por |
|---|---|---|---|---|---|
| PortiLexicon-UD (Lucelene Lopes) | commit `315e063` (2024-11-16) | MIT | `verified`, 2026-11-02: arquivo `LICENSE` no repositório ("MIT License, Copyright (c) 2023 Lucelene Lopes") e `license.spdx_id = MIT` na API do GitHub | sim | `style.adverb` (R5.1), `style.passive` (R5.2) |

Arquivos baixados do PortiLexicon-UD, por URL fixada no commit (`raw.githubusercontent.com`) e
conferidos por sha256: `ADV.tsv` (159.958 bytes) e `VERB.tsv` (71.016.248 bytes).

## Pendente de decisão do autor

- **Dicionário de Palavras Simples (Biderman, 1998)**, lista de palavras familiares da
  Dale-Chall adaptada (R3.7). Licença aceita pelo autor (`author-accepted`, 2026-11-01), mas não
  achei fonte primária para download: o repositório público do NILC-Metrix (`sidleal/nilcmetrix`,
  AGPL-3.0) não traz a lista como arquivo; ela parece vir do banco PostgreSQL que o projeto
  restaura (`env/cohmetrix_pt_br`). Sem a lista, `daleChall` fica em `unavailableMetrics` (R3.7).
  Ver Decisões devolvidas no `PLAN.md`.

## Escrever aos autores

Nenhuma fonte do manifesto tem licença `unclear`. Candidatas citadas na pesquisa
(`pesquisa-recursos-pt-br.md` §5) e ainda fora do manifesto, todas com licença não verificada:
CorPop/CorPop26, VERO, OBras, OpLexicon, TeP, SUBTLEX-PT-BR. Entram no manifesto só depois de
verificadas.
