# Arquitetura de locale bilíngue (en + pt-BR)

Status: decisões tomadas em 2026-11-01 (seção 10). Nada implementado ainda.
Base: [pesquisa de recursos pt-BR](pesquisa-recursos-pt-br.md).

## 1. Objetivo e restrições

- Todas as ferramentas funcionam em pt-BR com qualidade comparável à do inglês, ou dizem
  explicitamente que não funcionam. Nunca devolvem métrica inglesa aplicada a texto português.
- O caminho em inglês fica **byte a byte igual** ao do upstream. Mesmas bibliotecas, mesmas saídas.
- Um mesmo servidor atende projetos em inglês e em português na mesma sessão.
- O fork segue o `writerslogic/scrivener-mcp`, que recebe cerca de 335 commits a cada 90 dias. Cada
  linha alterada em arquivo do upstream vira conflito em potencial. A meta é concentrar tudo em
  `src/locale/` e deixar nos arquivos do upstream só trocas de import e chamadas pontuais.

## 2. O que o código atual impõe (verificado)

- **18 arquivos** importam `narrative-lens` ou `bluepencil-node` diretamente
  (`grep -rlE "from '(narrative-lens|bluepencil-node)'" src | wc -l`). As chamadas não ficam só nos
  handlers. `ai-content-enhancer.ts` usa `computeReadability` para medir o antes e o depois de uma
  reescrita, e o `job-queue.ts` e os analisadores em `src/analysis/` também usam as bibliotecas.
  Por isso o desvio precisa acontecer no import, não no registro de ferramentas.
- As funções nativas recebem só texto (`checkStyle(text, { format, tics })`), sem contexto de
  projeto.
- Os handlers declaram um `outputSchema` (por exemplo `counts.adverbs`, `counts.filterWords`) e
  devolvem `structuredContent` nesse formato. Esse é o contrato que a versão pt-BR precisa respeitar.
- Só existe um projeto ativo por processo (`context.project`, definido em
  `project-handlers/lifecycle.ts:118`).
- O build é só `tsc` (`package.json` → `"build": "... && tsc"`). Arquivos `.txt` em `src/` não vão
  para o `dist` sem um passo extra.
- `HIDDEN_TOOLS` em `skill-registry.ts:97` é estático, decidido na carga do módulo.
- Os prompts de IA são constantes em inglês sem instrução de idioma de saída, por exemplo
  `SYSTEM_PROMPT` em `ai-content-enhancer.ts`. Há seis arquivos assim (ver seção 7).
- Os conceitos da busca (`CONCEPTS` em `passage-search.ts:12`) entram no índice com
  `EMBEDDING_SPACE.revision: '1'`. Trocar os conceitos invalida índices já gravados.

## 3. Visão geral

```
                 handlers / services do upstream
                               │  (import trocado)
                               ▼
                   src/locale/engines/*.ts   ← fachadas com a mesma assinatura das libs
                               │
              resolveLanguage(text, hint?)  ← src/locale/language.ts
                 │                    │
        'en' ────┘                    └──── 'pt-BR'
         │                                     │
  narrative-lens / bluepencil-node      src/locale/pt-BR/*  (TypeScript + dados)
  (inalterado)                                 │
                                     opcional: sidecar NILC-Metrix / Portparser
```

### 3.1 Resolução de idioma

`src/locale/language.ts` exporta `resolveLanguage(text, hint?)`, com esta ordem de precedência:

1. argumento `language` passado na chamada da ferramenta (`'en' | 'pt-BR' | 'auto'`);
2. idioma gravado no projeto (seção 3.4);
3. variável de ambiente `SCRIVENER_MCP_LANGUAGE`;
4. detecção automática pelo texto;
5. `'en'`.

A detecção é determinística e sem dependência: proporção de palavras funcionais de cada idioma.
A decisão é tomada por documento, não por projeto, então um manuscrito com capítulos nos dois
idiomas funciona. Trechos em outros idiomas dentro de um documento são tratados na seção 3.5.

Toda resposta de análise ganha dois campos: `language` (o idioma usado) e `languageSource`
(`argument | project | env | detected | default`). Assim o cliente vê qual caminho foi seguido.

### 3.2 Fachadas com a mesma assinatura

Para cada biblioteca nativa existe um módulo em `src/locale/engines/` que reexporta **as mesmas
funções com as mesmas assinaturas**:

```ts
// src/locale/engines/bluepencil.ts
import * as native from 'bluepencil-node';
import * as pt from '../pt-BR/style/index.js';
import { resolveLanguage } from '../language.js';

export function checkStyle(text: string, options?: native.StyleOptions) {
	return resolveLanguage(text) === 'pt-BR' ? pt.checkStyle(text, options) : native.checkStyle(text, options);
}
```

Nos arquivos do upstream, a mudança é uma linha por arquivo:
`from 'bluepencil-node'` passa a ser `from '../locale/engines/bluepencil.js'`.

Uma regra `no-restricted-imports` no `eslint.config.js` proíbe importar as bibliotecas nativas fora
de `src/locale/`. Depois de cada merge do upstream, o `npm run lint` acusa qualquer import novo que
tenha escapado das fachadas. Essa é a proteção mais importante contra regressões silenciosas.

### 3.3 Funções sem implementação em pt-BR

Para cada função da fachada, o mapa `src/locale/pt-BR/coverage.ts` declara um destes estados:

- `implemented`: existe implementação própria;
- `language-neutral`: a função nativa serve para qualquer idioma, às vezes com um adaptador
  (testado: ritmo, ecos, repetições e aberturas de frase; ver 6.9);
- `unavailable`: a fachada lança `LanguageUnsupportedError`, o handler devolve `isError: false` com
  `available: false`, o motivo e a ferramenta alternativa (por exemplo `analyze_document` via IA).

Isso implementa a opção A sem esconder ferramentas. **Mudei a proposta anterior aqui.** O
`HIDDEN_TOOLS` é estático e a sessão pode ter projetos nos dois idiomas, então esconder uma
ferramenta pt-BR a esconderia também do inglês. Responder "indisponível" é honesto nos dois casos.
O custo é a ferramenta continuar listada e gastar tokens de descrição mesmo quando não serve.

Nenhuma função chega à fase de entrega como `unavailable` sem decisão explícita. O estado existe
para a transição.

### 3.4 Idioma do projeto

**Decidido:** o idioma é gravado na memória de projeto que já viaja dentro do `.scriv`
(`memory-manager.ts`), numa chave `locale` com esta forma:

```ts
interface ProjectLocale {
	primary: 'en' | 'pt-BR';
	// documento inteiro em outro idioma (um capítulo em inglês, uma carta em francês)
	documents?: Record<string, 'en' | 'pt-BR' | 'other'>;
	// idiomas que aparecem em falas e citações; orienta a detecção de trechos (seção 3.5)
	embedded?: string[]; // BCP-47, ex.: ['en', 'es']
	// palavras estrangeiras intencionais que não devem virar erro ortográfico
	allowlist?: string[];
}
```

Ele é definido de duas formas:

- explicitamente, por uma ferramenta nova `set_project_language` (ou um campo extra em
  `set_writing_preferences`, a decidir);
- por sugestão no `open_project`: o servidor detecta o idioma em uma amostra do Draft e **informa**
  na resposta, sem gravar. Gravar sem pedir seria uma escrita silenciosa no projeto do usuário.

O idioma ativo do projeto fica num módulo de estado (`src/locale/state.ts`), atualizado ao abrir e
ao fechar o projeto. É estado global, e isso só é aceitável porque o servidor já tem um projeto
ativo por vez.

### 3.5 Trechos em outros idiomas (personagens multilíngues)

Cenário: romance em pt-BR em que um personagem fala inglês, outro espanhol, e há uma carta em
francês. Testei um detector simples por palavras funcionais (pt, en, es, fr) em trechos assim.
Resultados (script `probe-detect.mjs` no scratchpad):

| Trecho | Resultado | Problema |
|---|---|---|
| narrativa pt (13 palavras) | pt, margem 0,31 | – |
| `— I told you, this is not the place for that — disse John.` | en, margem 0,67 | – |
| `— No sé lo que quieres de mí, pero no voy a quedarme aquí — respondeu Carmen.` | **empate pt/es (margem 0)** | a tag "respondeu Carmen" contamina a fala |
| espanhol puro (11 palavras) | es, margem 0,27 | – |
| pt parecido com es ("Não sei o que você quer…") | pt, margem 0,58 | – |
| `"Okay."`, `— Sim.` | **sem sinal (0 em tudo)** | curto demais |
| pt com empréstimos ("laptop", "e-mail", "board", "meeting") | pt, margem 0,33 | – |

O que acontece hoje, sem tratamento, se o documento é classificado como pt-BR e tem falas em
outro idioma:

- **Ortografia:** cada palavra estrangeira vira erro;
- **estilo:** advérbios, passiva e hedges em inglês somem da contagem, e palavras estrangeiras
  podem casar com padrões portugueses por acaso (o espanhol "para" e "muy" são próximos);
- **legibilidade:** frases estrangeiras entram na média de sílabas e palavras por frase com a
  silabificação errada;
- **voz do personagem** (`measure_voice_drift_local`): um personagem que alterna idiomas parece
  ter "deriva de voz" quando só mudou de língua;
- **busca semântica:** falas estrangeiras não casam com conceitos pt-BR (perda de recall, não
  erro);
- **reescrita por IA** (`enhance_content`): o risco mais sério, porque o modelo pode **traduzir**
  a fala de um personagem para português, alterando o texto do autor.

Desenho:

1. **Segmentar antes de detectar.** A unidade de detecção é a fala separada da tag (travessão,
   aspas, aspas angulares) e, na narração, a frase. A tag de diálogo ("respondeu Carmen") é
   atribuída ao idioma do documento, não da fala.
2. **Herdar quando não há sinal.** Abaixo de cerca de 5 palavras, ou com margem menor que um limiar,
   o trecho herda o idioma do contexto (a fala anterior do mesmo personagem, se houver, senão o
   documento). Os limiares saem do corpus de teste, não deste exemplo.
3. **Indeterminado é um estado.** Empate não vira palpite: o trecho fica `undetermined` e é
   excluído das métricas dependentes de idioma, com aviso.
4. **Detectar mais idiomas do que se analisa.** O detector conhece en, pt, es, fr, it, de, só para
   **excluir** o que não é o idioma em análise. Analisar, só en e pt-BR.
5. **Exclusão com transparência.** Cada resposta de análise traz
   `excludedSpans: [{ start, end, language, reason }]` e `coverage` (a fração do texto analisada).
   Uma métrica calculada sobre 70% do texto diz isso.
6. **`embedded` ajuda a desempatar.** Se o projeto declara `embedded: ['es']`, um empate pt/es
   numa fala tende a es; sem declaração, fica `undetermined`.
7. **Prompts preservam idiomas.** A instrução de idioma diz: responder em pt-BR e **não traduzir
   falas, citações ou trechos em outro idioma**; trechos excluídos são marcados no texto enviado.
   Depois da reescrita, um verificador compara os trechos estrangeiros antes e depois e rejeita a
   proposta se algum mudou de idioma. Isso vai no `review_changes`, que já existe para aprovação.
8. **Funções neutras recebem o texto inteiro.** Contagem de palavras, ritmo e ecos não excluem
   trechos estrangeiros (ver 6.4 e 6.9), para não divergir da contagem do Scrivener.

Custo: a segmentação de falas é pré-requisito, o que puxa parte da fase 5 (diálogo) para a fase 3
(texto base). A tabela de fases reflete isso.

### 3.6 Contrato de saída

A implementação pt-BR devolve o mesmo tipo que a nativa (`StyleResult`, `ReadabilityResult`…).
Quando a semântica muda, o campo continua lá e a diferença fica documentada:

- `counts.adverbs` em pt-BR conta advérbios em -mente confirmados pelo PortiLexicon-UD, e não
  qualquer palavra terminada em "mente" ("mente", "semente" e "demente" não contam);
- `fleschEase` usa a fórmula adaptada de Martins et al.; `gradeLevels` usa faixas de escolaridade
  brasileiras em vez de "7th grade";
- `smog`, que não tem adaptação validada, volta com `smogAvailable: false` (o campo já existe no
  tipo nativo).

As descrições das ferramentas continuam em inglês, porque o cliente é um modelo de linguagem, e
ganham uma frase sobre o suporte a pt-BR. Traduzir as descrições não traz ganho funcional e aumenta
os conflitos.

## 4. Organização de `src/locale/`

```
src/locale/
  language.ts          resolveLanguage, detecção, tipos Language/LanguageSource
  state.ts             idioma do projeto ativo
  errors.ts            LanguageUnsupportedError
  engines/
    narrative-lens.ts  fachada
    bluepencil.ts      fachada
    compromise.ts      fachada (ou substituição; ver 6.4)
  pt-BR/
    coverage.ts        estado de cada função
    text/              tokenização, silabificação, segmentação de frases, travessão
    readability/       Flesch adaptado, Dale-Chall adaptado, Brunet, Honoré
    style/             advérbios, filter words, hedges, clichês, passiva, nominalizações
    dialogue/          extração de falas (travessão e aspas), verbos de elocução
    search/            conceitos pt-BR para passage-search
    continuity/        padrões de fatos (olhos, cabelo, nascimento…), expressões temporais
    emotion/           léxicos de emoção e sentimento
    prompts.ts         instrução de idioma e definições pt-BR dos tipos de melhoria
    data/              listas geradas (ver seção 5)
  sidecar/
    nilc-metrix.ts     cliente HTTP opcional (SCRIVENER_MCP_NILC_METRIX_URL)
```

## 5. Dados e licenças

**Listas pequenas e curadas** (clichês, hedges, verbos de elocução, palavras funcionais, conceitos):
ficam como módulos TypeScript (`data/*.ts`, `export const HEDGES = [...] as const`). Assim entram
no `tsc` sem mudar o build.

**Léxicos grandes** (PortiLexicon-UD, com 1,2 milhão de formas): não entram inteiros. Um script em
`scripts/locale/` gera **subconjuntos derivados** (advérbios em -mente, particípios, lemas de
verbos de percepção) e grava em `data/` com cabeçalho de procedência. Isso é viável para fontes MIT
e Apache. Se um subconjunto passar de cerca de 1 MB, a alternativa é baixar sob demanda para
`~/.scrivener-mcp/locale/pt-BR/` com hash de integridade. Isso adiciona rede e não deveria ser o
padrão.

Cada arquivo de dados declara fonte, versão, licença e data num comentário, e `data/SOURCES.md`
consolida tudo. Regras derivadas da seção 5 da pesquisa:

- MIT, Apache e LGPL (PortiLexicon-UD, Portparser, listas do LanguageTool) entram como dados
  derivados, com atribuição;
- AGPL e GPL (NILC-Metrix, Coh-Metrix-Port) entram só como sidecar opcional, nunca no pacote;
- NC e ND (SUBTLEX-PT-BR) não entram;
- licença desconhecida (CorPop, OBras, OpLexicon, TeP, VERO) fica bloqueada até ser verificada.

## 6. Mapa de implementação por área

### 6.1 Texto base (`pt-BR/text/`)
A base de todo o resto, então vem primeiro:
- segmentação de frases que respeita abreviações ("Sr.", "Dra.", "pág.") e reticências;
- silabificação por regras (as fontes indicam que regras superam aprendizado de máquina);
- tokenização com fronteiras `\p{L}`;
- extração de falas com travessão, aspas e aspas angulares.

### 6.2 Legibilidade
Flesch adaptado e Dale-Chall adaptado, com coeficientes verificados no NILC-Metrix. A Dale-Chall
precisa de uma lista de palavras simples. A do NILC vem do *Dicionário de Palavras Simples*
(Biderman), cuja licença não sei. A alternativa é o CorPop26, também com licença a verificar.
Sem lista liberada, a Dale-Chall fica `unavailable`.

### 6.3 Estilo e diálogo
- advérbios: `-mente` confirmado no léxico;
- passiva: "ser/estar/ficar + particípio" concordando em gênero e número; a passiva sintética
  ("vendem-se casas") fica fora da primeira versão;
- filter words e hedges: curadoria própria a partir de `weaselwords.txt` e `wordiness.txt` do
  LanguageTool, mais os verbos de percepção (sentir, ver, notar, perceber, ouvir);
- tags de diálogo: verbos de elocução classificados como neutros ("disse", "perguntou") ou
  enfáticos ("sibilou", "trovejou"), com detecção de advérbio na tag.

### 6.4 `compromise`
Li os três arquivos que o usam e testei a versão fixada (14.15.1) com texto em português
(`probe-compromise.mjs` e `probe-pos.mjs` no scratchpad).

| Arquivo | Uso | Quem depende dele | Resultado em pt-BR |
|---|---|---|---|
| `src/utils/text-metrics.ts` | `wordCount`, divisão em frases (`sentences`, `abbreviations`, `#Honorific`), frequência de palavras sem stopwords (`#Determiner`, `#Preposition`…), `terms` | 10 módulos, inclusive `compilation-handlers.ts`, `project-snapshots.ts` e `content-generation.ts` | **contagem de palavras correta** (31 contra 32 tokens por espaço, a diferença é o travessão, igual ao inglês: 28 contra 29); **frases erradas**: 7 em vez de 5, quebrou em "A Dra." e "na pág."; reconhece só "Sr."; **stopwords não filtradas** (ver POS abaixo) |
| `src/analysis/ml-word-classifier-pro.ts` | POS por palavra (`verbs`, `nouns`, `adjectives`, `adverbs`, `conjugate`), `#Adverb` + `-ly` para hedges, `#Copula` para verbos fracos | `base-analyzer.ts`, `quality-analyzer.ts` | inutilizável |
| `src/services/analysis/nlp-sentiment-analyzer.ts` | frases, termos normalizados, `#Question`/`#Imperative`/`#Conditional`, contagem de verbos | `ml-word-classifier-pro.ts`, `job-queue.ts` | inutilizável |

POS do `compromise` para palavras portuguesas: "de" é `Determiner`; "que" é
`Abbreviation,Noun,Place`; "não", "uma", "com", "ele", "os", "em", "correu", "rapidamente",
"foi" e "estava" são todos `Noun,Singular`; **"ela" e "bonita" são `FemaleName`**. Para comparar:
"the" é `Determiner`, "of" é `Preposition`, "quickly" é `Adverb`.

**Decisão:** fachada em `src/locale/engines/text-metrics.ts`, não sobre o `compromise` inteiro.

- `countWords`: neutro. Mantém o `compromise` nos dois idiomas, para não mudar as contagens que
  aparecem em metas, snapshots e compilação. A contagem pt-BR já bate com a tokenização por
  espaço.
- divisão em frases: pt-BR usa a segmentação própria de `pt-BR/text/` (abreviações "Sr.", "Sra.",
  "Dr.", "Dra.", "pág.", "p.", "cap.", "etc.", "V. Exa.").
- frequência sem stopwords: pt-BR usa a lista de palavras funcionais de `pt-BR/data/`.
- POS e sentimento (`ml-word-classifier-pro.ts`, `nlp-sentiment-analyzer.ts`): em pt-BR viram
  `unavailable` na fase 2 e são reimplementados na fase 6 com o PortiLexicon-UD (POS por consulta
  de forma, sem desambiguação contextual) e o léxico de sentimento escolhido.

Custo: o POS por consulta de forma erra palavras ambíguas ("canto" verbo ou substantivo, "como"
verbo ou conjunção). A alternativa com contexto é um tagger de verdade (Portparser ou spaCy como
sidecar), mais pesado. A escolha fica para a fase 6, com medição no corpus.

### 6.5 Busca semântica
Uma lista pt-BR de `CONCEPTS` com os mesmos 30 nomes de conceito, para que a saída e as consultas
sejam comparáveis entre idiomas, mas com padrões em português e expansão por sinônimos. O índice
grava o idioma, e `EMBEDDING_SPACE.revision` passa a incluí-lo (`'1-pt-BR'`), para que índices
antigos sejam reconstruídos e não misturados. Esse é um dos poucos pontos que exigem mudança dentro
de um arquivo do upstream que muda com frequência (`passage-search.ts`, 8 commits em 90 dias): uma
função `conceptsFor(language)` no lugar da constante.

### 6.6 Continuidade
Padrões pt-BR ("os olhos de X eram", "X tinha olhos", "X nasceu em") e cores em português com
flexão de gênero e número. `normalized()` passa a usar `toLocaleLowerCase(language)`. Expressões
temporais: começar com regras próprias. O HeidelTime (Java) fica como sidecar futuro.

### 6.7 Prompts de IA
`pt-BR/prompts.ts` exporta `languageDirective(language)`, que é anexado a cada prompt de sistema
("Responda em português do Brasil, no mesmo registro do texto"), e definições pt-BR dos 12 tipos de
melhoria. São seis arquivos com prompts (`ai-document-analyzer.ts`, `content-generation.ts`,
`ai-content-enhancer.ts`, `ai-collaboration.ts`, `ai-compiler.ts`, `ai-writing-service.ts`). Em
cada um, a mudança é uma concatenação.

### 6.8 Sidecar opcional
Um cliente HTTP para a API do NILC-Metrix (porta 8080), ativado por
`SCRIVENER_MCP_NILC_METRIX_URL`. Sem a variável, as métricas extras simplesmente não aparecem.
Segue o mesmo padrão "funciona sem, melhora com" que o upstream usa para Neo4j e Redis.

### 6.9 Ritmo, ecos, repetições e aberturas de frase (testado)

Mesmo texto nos dois idiomas, com repetições plantadas: "chuva" 3 vezes, "olhou para a janela" 2
vezes, 3 frases seguidas começando com "Ela" (`probe-rhythm.mjs` no scratchpad, bluepencil 0.2.0):

| Função | Inglês | Português | Leitura |
|---|---|---|---|
| `analyzeRhythm` | 7 frases `[4,6,10,3,11,11,24]` | 8 frases `[5,5,9,4,9,13,2,21]` | funciona; **"A Dra." virou uma frase de 2 palavras**. "Sr." foi respeitado |
| `findEchoes` | rain, rain, looked, window | chuva, chuva, olhou, **para**, janela | funciona; **"para" é falso positivo** (palavra funcional; "at" não apareceu no inglês) |
| `findRepeats` | "looked at the window" ×2 | "olhou para a janela" ×2, "o sr almeida" ×2 | funciona; o inglês não reportou "mr almeida", diferença de filtro, não de idioma |
| `sentenceStarters` | "she" ×3, achado `repeated-starter` | "ela" ×3, achado `repeated-starter` | funciona igual |

**Decisão:** `language-neutral` com adaptador.

- `findEchoes` e `findRepeats` recebem a lista de palavras funcionais pt-BR pela opção `ignore`,
  que já existe na API (`EchoOptions.ignore`).
- abreviações pt-BR: o bluepencil não aceita uma lista de abreviações pela API (ela fica embutida
  em `data/abbreviations.txt`). Há duas saídas:
  - (a) antes de chamar, trocar o ponto das abreviações conhecidas por um caractere de mesmo
    comprimento UTF-16 (por exemplo U+2024), o que preserva linha e coluna dos achados, e
    restaurar no excerto. É barato, mas é um contorno;
  - (b) contribuir com uma lista de abreviações configurável ao bluepencil. É limpo, mas depende
    do upstream.

  Recomendo (a) agora e abrir (b) como issue.
- frases curtas (`— Sim.`) entram no ritmo normalmente; isso é o comportamento desejado.

## 7. Pontos de injeção no código do upstream

O conflito de merge acontece justamente nessas edições; tudo o mais vive em `src/locale/`.

| Arquivo | Mudança | Commits em 90 dias |
|---|---|---|
| 18 arquivos com import nativo | troca de 1 linha de import | variado |
| `eslint.config.js` | regra `no-restricted-imports` | – |
| `passage-search.ts` | `CONCEPTS` → `conceptsFor(language)`, revisão do índice | 8 |
| `continuity-service.ts` | padrões por idioma, `toLocaleLowerCase` | 5 |
| 6 arquivos de prompt | `+ languageDirective(language)` | 1 a 2 cada |
| `project-handlers/lifecycle.ts` | atualizar `locale/state` ao abrir e fechar | não medido |
| handlers de análise | campos `language`/`languageSource` na saída | variado |

## 8. Testes e avaliação

- **Paridade em inglês:** a suíte atual do upstream roda sem alteração e precisa passar. Isso prova
  que o caminho em inglês não mudou. Node já está em 24.22.2 (`node -v`); falta resolver o cache do
  npm com EACCES.
- **Unitários pt-BR:** em `tests/unit/locale/`, um arquivo por módulo.
- **Corpus de referência**, com três camadas e regras diferentes de armazenamento:

  | Camada | Exemplos | Onde fica | Por quê |
  |---|---|---|---|
  | clássicos | Machado de Assis, Aluísio Azevedo, Lima Barreto (domínio público) | `tests/fixtures/pt-BR/classicos/`, versionado | livre para redistribuir |
  | contemporâneos | ficção brasileira recente | **fora do repositório**, em diretório configurado por `SCRIVENER_PTBR_CORPUS_DIR` | protegido por direito autoral; só os resultados agregados (precisão, cobertura) são versionados |
  | escrita do autor | seus textos | **fora do repositório**, mesmo mecanismo, subpasta própria | privado; idem |

  Cada trecho tem achados anotados à mão num arquivo de anotação ao lado do texto (formato a
  definir no plano). Os testes da camada versionada rodam no CI; as outras duas rodam localmente
  por um script de avaliação que grava só métricas. Cada detector mede precisão e cobertura em cada
  camada separadamente, porque um limiar calibrado em Machado pode errar em prosa contemporânea.
- **Detecção de idioma e trechos multilíngues:** casos curtos, mistos, com tag de diálogo, com
  empréstimos, espanhol e português próximos (seção 3.5), mais falas reais de personagens
  multilíngues do corpus.
- **Preservação de idioma na reescrita:** dado um trecho com falas em inglês, `enhance_content`
  com provedor simulado deve rejeitar uma resposta que traduziu a fala.
- **Fixture Scrivener em pt-BR:** uma cópia de `tests/sample-project.scriv` com conteúdo em
  português, para testes de integração dos handlers.

## 9. Fases

| Fase | Entrega | Critério de pronto |
|---|---|---|
| 0 | Ambiente: Node ≥ 24.22.1 (feito: 24.22.2), cache npm corrigido, suíte do upstream passando | `npm test` verde, saída registrada |
| 1 | Esqueleto: `language.ts`, `state.ts`, fachadas que delegam ao nativo, regra de lint, campos `language` na saída | suíte inglesa verde; lint barra import direto |
| 2 | Gate (opção A): `coverage.ts` com tudo `unavailable` em pt-BR | nenhuma métrica inglesa sobre texto português |
| 3 | Texto base (inclui segmentação de falas e detecção de trechos, seção 3.5) + legibilidade + prompts | Flesch e Dale-Chall corretos no corpus; respostas de IA em pt-BR sem traduzir falas estrangeiras |
| 4 | Busca e continuidade | consultas de conceito pt-BR com recall medido |
| 5 | Estilo e diálogo | precisão medida por detector no corpus |
| 6 | Emoção, voz, `compromise` | idem |
| 7 | Sidecar NILC-Metrix | métricas extras com a variável definida; nada muda sem ela |

As fases 1 e 2 sozinhas já cumprem a opção A. As fases 3 a 6 são a opção B.

## 10. Decisões

Tomadas pelo autor em 2026-11-01:

1. **Responder "indisponível"**, sem esconder ferramentas (seção 3.3).
2. **Fork permanente.** Não há contribuição planejada ao upstream. Consequências: os conflitos de
   merge são custo recorrente, e a regra de lint da seção 3.2 e a tabela da seção 7 são a defesa
   contra eles. Issues pontuais nas bibliotecas (abreviações configuráveis no bluepencil, 6.9)
   continuam possíveis, porque não dependem do fork ser aceito.
3. **Idioma gravado na memória de projeto** que acompanha o `.scriv`, com suporte a documentos e
   trechos em outros idiomas (seções 3.4 e 3.5).
4. **Descrições das ferramentas continuam em inglês**; o suporte a pt-BR é funcional, não de
   tradução da interface.
5. **Fases mantidas** como na seção 9. A segmentação de falas entra na fase 3 como parte do texto
   base, sem criar fase nova.
6. **Corpus de teste em três camadas**: clássicos, contemporâneos e escrita do autor (seção 8).
7. **`compromise`:** fachada parcial sobre `text-metrics` (seção 6.4).

Ainda em aberto:

- **Dados grandes:** subconjunto derivado no repositório (recomendado) ou download sob demanda.
- **Abreviações no bluepencil:** contorno (a) ou issue (b), seção 6.9 (recomendo os dois: (a) já,
  (b) em paralelo).
- **POS em pt-BR:** consulta ao léxico ou tagger em sidecar, a decidir na fase 6 com medição.
