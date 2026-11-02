# Semântica dos campos em pt-BR

Quando uma implementação pt-BR devolve o mesmo tipo da função nativa, mas um campo muda de
sentido ou fica sem fórmula validada, a diferença fica registrada aqui (SPEC §7, R3.8). Campo
sem fórmula: se o tipo tem flag de disponibilidade, ela vai `false`; senão o valor é `0` e o
nome entra em `locale.unavailableMetrics`.

## `computeReadability` (`ReadabilityResultJs`, narrative-lens)

Tipo conferido em 2026-11-01 em `node_modules/narrative-lens/index.d.ts:334`. Fonte das fórmulas:
Leal et al., *NILC-Metrix: assessing the complexity of written and spoken language in Brazilian
Portuguese*, arXiv 2201.03445, seção de fórmulas clássicas (conferida em 2026-11-02 no PDF).

Frases, palavras e sílabas vêm de `src/locale/pt-BR/text/` (`splitSentences`, `tokenize`,
`syllabify`), sobre o texto sem os trechos em outro idioma (`excludedSpans`).

| Campo | Em inglês (nativo) | Em pt-BR | Estado |
|---|---|---|---|
| `fleschEase` | Flesch Reading Ease | Flesch adaptado por Martins et al. (1996): `248,835 − 1,015 × (palavras/frase) − 84,6 × (sílabas/palavra)` | fórmula publicada, conferida (R3.6) |
| `gunningFog` | Gunning Fog | `0,4 × (palavras/frase + % de palavras com mais de duas sílabas)`, como no NILC-Metrix, com as sílabas pt-BR | fórmula publicada, conferida |
| `daleChall` | Dale-Chall | `0,1579 × % de palavras fora do Dicionário de Palavras Simples (Biderman) + 0,0496 × palavras/frase + 3,6365` | indisponível enquanto a lista não estiver no manifesto (R3.7, Decisões devolvidas): `0` e `unavailableMetrics` |
| `fkgl` | Flesch-Kincaid Grade Level | sem adaptação validada para o português | `0` e `unavailableMetrics` |
| `smog` / `smogAvailable` | SMOG | sem adaptação validada | `smog: 0`, `smogAvailable: false` |
| `ari` | Automated Readability Index | sem adaptação validada | `0` e `unavailableMetrics` |
| `colemanLiau` | Coleman-Liau | sem adaptação validada | `0` e `unavailableMetrics` |
| `readabilityVariance` | variação entre frases (semântica nativa não documentada) | sem definição pt-BR | `0` e `unavailableMetrics` |
| `sentenceCount` | frases | frases por `splitSentences` (abreviações pt-BR) | contagem |
| `wordCount` | palavras | palavras por `tokenize` (letras, com hífen e apóstrofo internos) | contagem |
| `syllableCount` | sílabas | sílabas por `syllabify` (divisão ortográfica) | contagem |
| `charCount` | letras (no nativo, só letras: 42 em "The bird flew over the distant mountain. It was late.") | letras, inclusive acentuadas | contagem |
| `polysyllableCount` | palavras com 3 ou mais sílabas | palavras com 3 ou mais sílabas, pela divisão pt-BR | contagem |

### `gradeLevels`

| Campo | Em pt-BR |
|---|---|
| `fleschEase` | faixas de Martins et al. (1996), com os rótulos do artigo: 75–100 "muito fácil (1ª a 4ª série)"; 50–75 "fácil (5ª a 8ª série)"; 25–50 "pouco difícil (colegial e nível superior)"; abaixo de 25 "muito difícil (textos acadêmicos)" |
| `gunningFog`, `fkgl`, `ari`, `colemanLiau`, `daleChall` | `"indisponível em pt-BR"`: as faixas dessas fórmulas são da escola americana e não há correspondência validada |

As faixas do Flesch foram conferidas em 2026-11-02 no artigo original: Martins, Ghiraldelo, Nunes
e Oliveira Jr., *Readability formulas applied to textbooks in Brazilian Portuguese*, Notas do
ICMC-USP n. 28, 1996 (resumo em inglês e em português). Os rótulos mantêm a nomenclatura do
artigo ("série", "colegial"); converter para o ensino fundamental de nove anos seria
interpretação minha.
