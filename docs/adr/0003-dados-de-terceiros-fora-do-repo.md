# ADR 0003 — Dados de terceiros fora do repositório, baixados por script

Status: aceito, 2026-11-01. SPEC §11.

## Contexto

A qualidade em pt-BR depende de léxicos e listas de terceiros (PortiLexicon-UD, listas do
LanguageTool, léxicos de emoção, lista de palavras simples para Dale-Chall). As licenças variam:
MIT, LGPL, AGPL, CC BY-NC-ND (SUBTLEX-PT-BR) e várias desconhecidas. O repositório do fork é
público, e redistribuir dados derivados pode violar licenças NC/ND ou ainda não verificadas. O
build é só `tsc`; arquivos que não são `.ts` não vão para o `dist`. O uso é pessoal e de
aprendizado.

## Decisão

O repositório guarda só o manifesto (`scripts/locale/sources.json`: url, versão, sha256,
licença, estado da verificação), os scripts de download e derivação e a procedência
(`docs/pt-br/SOURCES.md`). `scripts/locale/fetch-data.mjs` baixa da fonte original para
`~/.scrivener-mcp/locale/pt-BR/` (ou `SCRIVENER_MCP_LOCALE_DATA_DIR`), confere o hash e roda a
derivação. Em runtime, dado ausente vira `LanguageUnsupportedError` com `reason: 'data-missing'`
e o comando para baixar. Listas escritas no próprio fork ficam em `src/locale/pt-BR/data/*.ts`.
Licença pouco clara é sinalizada ao autor, sem bloquear.

## Alternativas descartadas

- **Subconjuntos derivados versionados no repositório** (recomendação anterior da arquitetura
  §5). Simples de usar e entra no `tsc`, mas redistribui derivados, o que não é permitido para
  NC/ND e é arriscado para licença desconhecida.
- **Empacotar no npm.** Mesmo problema de redistribuição, e o tamanho cresce.
- **Download sob demanda em runtime.** Rede durante a análise, falhas imprevisíveis e um servidor
  stdio que passa a fazer requisições externas sem pedido.

## Consequências

- Primeira execução exige rodar o script; sem ele, features dependentes respondem indisponível
  com instrução.
- CI baixa só fontes `verified` com `ci: true`; testes que precisam de outras ficam em
  `describeWithData` e são pulados com mensagem.
- Hash fixo no manifesto: atualização de fonte é uma mudança revisável.
- O fork não pode ser distribuído com essas features prontas para terceiros sem que cada um rode
  o script.
