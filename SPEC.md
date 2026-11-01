# SPEC — Extensão bilíngue en + pt-BR do scrivener-mcp

Status: aprovada para implementação em 2026-11-01. Fases 0 a 7.
Revisões: 2026-11-01, campos de locale agrupados em `structuredContent.locale` (D15, decisão do
autor depois da revisão do estágio 1; ver Decisões devolvidas no `PLAN.md`).
Insumos: `docs/pt-br/decisoes-planejamento.md`, `docs/pt-br/arquitetura-locale.md`,
`docs/pt-br/integracao-escrita-criativa.md`, `docs/pt-br/pesquisa-recursos-pt-br.md`.
Decisões estruturais: `docs/adr/0001` a `0004`.

## 0. Como usar este documento

- Toda sessão de implementação começa lendo este arquivo e depois `PLAN.md`.
- Requisitos têm ID `R<fase>.<n>`. Cada um aponta um teste: arquivo, entrada, saída esperada.
  Prosa só aparece para intenção, fora de escopo e porquê.
- Se a implementação precisar divergir de um requisito, registre na tabela **Desvios** do
  `PLAN.md` antes do commit. Se a divergência exigir uma decisão do autor, registre em
  **Decisões devolvidas** e pare o estágio. Não edite esta SPEC para acomodar o código.
- "Upstream" é `writerslogic/scrivener-mcp`. "Arquivo do upstream" é qualquer arquivo fora de
  `src/locale/`, `scripts/locale/`, `tests/unit/locale/`, `tests/integration/locale/`,
  `tests/fixtures/pt-BR/`, `docs/pt-br/`, `docs/adr/`, `.github/workflows/ptbr.yml`, `SPEC.md`
  e `PLAN.md`.

## 1. Objetivo

Todas as ferramentas do servidor funcionam em pt-BR com qualidade medida, ou respondem
explicitamente que não funcionam. Nenhuma ferramenta devolve métrica calculada por regra inglesa
sobre texto português. O comportamento em inglês não muda: todo campo que o upstream devolve
mantém o mesmo valor. Um mesmo processo atende projetos nos dois idiomas.

## 2. Decisões de partida (não reabrir)

| # | Decisão | Origem |
|---|---|---|
| D1 | Uma SPEC para as fases 0–7; nas fases 4–7 a qualidade é regra de medição e promoção | decisoes §1 |
| D2 | `main` é o fork; remote `upstream` = `writerslogic/scrivener-mcp`; merges periódicos de `upstream/main` | decisoes §2, ADR 0004 |
| D3 | Projeto sem idioma gravado: detectar e usar (`locale.languageSource: 'detected'`) | decisoes §3 |
| D4 | Reescrita por IA que altera fala em outro idioma: rejeitar a proposta inteira e informar o trecho | decisoes §4 |
| D5 | Promoção `unavailable` → `implemented`: precisão ≥ 0,80 em **cada** camada do corpus | decisoes §5 |
| D6 | Corpus: o agente pré-anota, o autor revisa e corrige | decisoes §6 |
| D7 | `.github/workflows/ci.yml` intocado; workflow pt-BR próprio | decisoes §7 |
| D8 | Licença verificada na fonte primária e registrada em `docs/pt-br/SOURCES.md`; o que não estiver claro é sinalizado ao autor, sem bloquear | decisoes §8 |
| D9 | Dados de terceiros fora do repositório, baixados por script para `~/.scrivener-mcp/locale/pt-BR/` | decisoes §9, ADR 0003 |
| D10 | Integração com o plugin escrita-criativa é feita no plugin; o MCP só ganha as medições que faltam | decisoes §10 |
| D11 | Ferramentas não são escondidas; em pt-BR sem implementação respondem `locale.available: false` | arquitetura §10.1 |
| D12 | Idioma do projeto na memória de projeto (`customContext.locale`) | arquitetura §10.3 |
| D13 | Descrições das ferramentas continuam em inglês | arquitetura §10.4 |
| D14 | `compromise`: fachada parcial sobre `text-metrics` | arquitetura §6.4 |
| D15 | Um bloco `locale` com `language`, `languageSource`, `coverage` e `excludedSpans` aparece **sempre**, em todos os idiomas, como acréscimo no `structuredContent` (`structuredContent.locale`); os demais campos de locale (`available`, `reason`, `alternative`, `unavailableMetrics`, `changedSpans`) ficam no mesmo bloco. Nenhum campo de locale fica solto no topo: `coverage` já existe no upstream em 5 ferramentas. O texto de `content` não muda em inglês. Paridade em inglês = todo campo do upstream com o mesmo valor | autor, 2026-11-01 (sessão da SPEC; agrupamento em `locale` decidido na revisão do estágio 1) |
| D16 | Promoção exige pelo menos **30 predições revisadas por camada**; abaixo disso o relatório marca `insufficient-sample` e não promove. O limite inferior de Wilson (95%) é reportado só como informação | autor, 2026-11-01 |
| D17 | Busca por conceito pt-BR segue D5 com **precision@10 ≥ 0,80 por camada**; recall é medido e reportado, sem bloquear | autor, 2026-11-01 |
| D18 | Abreviações no bluepencil: contorno (a) por substituição do ponto (arquitetura §6.9) | arquitetura §6.9 |
| D19 | Dados grandes: resolvido por D9 (fora do repo, por script). Substitui a alternativa "subconjunto derivado no repositório" da arquitetura §5 | decisoes §9 |
| D20 | Palavras por fala (`wordCount` em `attributions`) só em pt-BR, acrescentadas pela fachada do bluepencil; a saída em inglês fica sem o campo e nenhum handler do upstream muda | autor, 2026-11-01 |

## 3. Fora de escopo

- Traduzir descrições de ferramentas, mensagens de erro ou textos de interface (D13).
- Analisar idiomas além de en e pt-BR. es, fr, it e de são só **detectados**, para exclusão.
- Português europeu como variante analisada. Texto pt-PT é tratado como pt-BR, sem garantia.
- Contribuir com o upstream do scrivener-mcp. Issues pontuais nas bibliotecas nativas são
  permitidas (por exemplo, abreviações configuráveis no bluepencil), mas nada depende delas.
- Mudanças no plugin `escrita-criativa` (repositório próprio).
- Perfil de estilo da casa (regras do autor-escritor e do polidor-dialogos) como perfil de
  projeto: registrado como item futuro (integracao §3.5).
- Passiva sintética ("vendem-se casas") na primeira versão do detector de passiva.
- Formatos de roteiro de HQ e mangá: as métricas continuam tratando o texto como prosa.
- Esconder ferramentas por idioma (`HIDDEN_TOOLS` não muda).
- Nova dependência npm de runtime sem ADR próprio. As fases 0–5 não adicionam nenhuma.
- Embeddings ou modelos neurais na busca semântica (o upstream usa vetores de conceito fixos).
- Versionar texto protegido por direito autoral ou escrita do autor (só métricas agregadas).

## 4. Avaliação estrutural (Ousterhout e Martin)

### 4.1 O desenho em uma frase

Os arquivos do upstream trocam o import das bibliotecas nativas por fachadas em
`src/locale/engines/` com a mesma assinatura; as fachadas despacham por idioma; o idioma de cada
chamada vem de um `AsyncLocalStorage` aberto por um invólucro `withLocale` aplicado no registro
de ferramentas.

### 4.2 Ousterhout

- **Pass-Through Method.** As fachadas passam no teste só em parte: além de repassar, elas
  despacham por idioma e registram cobertura, mas expõem a mesma abstração da biblioteca, sem
  esconder nada novo. **Custo assumido de propósito.** A alternativa mais profunda, uma interface
  `ProseEngine` injetada no contexto, exigiria editar cada chamada nos 19 arquivos do upstream que
  usam as bibliotecas. Isso é *change amplification* justamente no código que mais gera conflito
  de merge (cerca de 335 commits do upstream a cada 90 dias). Trocamos profundidade de módulo
  por um custo de merge de uma linha por arquivo (ADR 0001).
- **Information hiding / information leakage.** Cada decisão vive num módulo só:
  - "qual é o idioma deste texto": `resolveLanguage` em `src/locale/language.ts`;
  - "o que existe em pt-BR": `src/locale/pt-BR/coverage.ts`;
  - "como a ausência vira resposta": `src/locale/with-locale.ts`;
  - "quais ferramentas escapam das fachadas": `src/locale/tool-policies.ts`.
  Uma mudança em qualquer uma toca um módulo.
- **Pass-through variable evitada.** O idioma não desce como argumento pelas camadas do
  upstream; o `AsyncLocalStorage` carrega o contexto da chamada (ADR 0002). Custo: dependência
  implícita, que some em fronteiras de processo e de fila. Por isso a seção 8 trata esses
  caminhos explicitamente e um teste de contrato os cobre.

### 4.3 Martin

- **Regra da dependência:** upstream → `src/locale/engines` → (biblioteca nativa |
  `src/locale/pt-BR`). `src/locale/pt-BR` não importa nada de `src/handlers`, `src/services` nem
  das bibliotecas nativas. `src/locale/*.ts` (raiz) pode importar **tipos** do upstream
  (`ToolDefinition`, `HandlerContext`, `MemoryManager`), não valores, exceto `with-locale.ts`,
  que importa `HandlerError` de `src/handlers/types.ts`.
- **Fronteiras formais além disso seriam excesso** nesta escala (um autor, um processo). Uma
  regra de lint (`no-restricted-imports`) e um script de escapes (seção 8.3) bastam.

### 4.4 Custos assumidos (resumo)

| Custo | Por que aceito | Mitigação |
|---|---|---|
| Fachadas rasas | evita editar chamadas no upstream | testes de contrato por função |
| Contexto implícito (ALS) | evita pass-through variable em 19 arquivos | seção 8 + teste de propagação |
| Ferramentas listadas mesmo quando indisponíveis em pt-BR | sessão pode ter projetos nos dois idiomas | `locale.available: false` com alternativa |
| Bloco `locale` novo na saída em inglês (D15) | schema único, cliente sempre vê o caminho | só acréscimo numa chave própria; valores do upstream iguais; `withLocale` lança se o upstream declarar `locale` |
| Ferramentas do processo filho indisponíveis em pt-BR até reimplementação | o ALS não atravessa processo | gate no nível da ferramenta (8.1) |

## 5. Estrutura de arquivos

```
src/locale/
  language.ts           tipos, detecção, resolveLanguage
  context.ts            AsyncLocalStorage da chamada
  project-locale.ts     ProjectLocale sobre customContext.locale
  errors.ts             LanguageUnsupportedError, ForeignSpanChangedError
  with-locale.ts        invólucro aplicado em activateSkill
  tool-policies.ts      LOCALE_TOOLS: política por ferramenta
  set-project-language.ts  ferramenta set_project_language
  jobs.ts               idioma em job.data da fila
  engines/
    narrative-lens.ts   fachada (mesmas exportações de valor + export type *)
    bluepencil.ts       fachada
    compromise.ts       reexportação neutra, só para src/utils/text-metrics.ts
    compromise-pos.ts   nlp com gate (POS e sentimento)
    text-metrics.ts     fachada sobre src/utils/text-metrics.ts
  pt-BR/
    coverage.ts         estado de cada função de fachada
    text/               tokens.ts, sentences.ts, syllables.ts, segments.ts, spans.ts, foreign-guard.ts
    readability/        flesch.ts, dale-chall.ts, index.ts
    style/  dialogue/  search/  continuity/  emotion/  voice/   (fases 4–6)
    prompts.ts          languageDirective, definições pt-BR dos 12 tipos de melhoria
    data/               listas de curadoria própria (.ts) + loader.ts para dados baixados
  sidecar/
    nilc-metrix.ts      fase 7
scripts/locale/
  sources.json          manifesto de dados de terceiros
  fetch-data.mjs        download para ~/.scrivener-mcp/locale/pt-BR/
  derive-*.mjs          geração de subconjuntos a partir do download
  check-native-escapes.mjs
  check-locale-tools.mjs
  evaluate-corpus.mjs
  preannotate.mjs
tests/unit/locale/      um arquivo por módulo
tests/integration/locale/
tests/fixtures/pt-BR/   classicos/ (versionado), sample-project-pt.scriv/
docs/pt-br/SOURCES.md   procedência e licença de cada fonte
```

Todo código novo segue as convenções do upstream: tabs, prettier, ESM com sufixo `.js` nos
imports, `npm run lint` com `--max-warnings=0`. Regex com fronteira de palavra usam
`(?<![\p{L}\p{N}_])` e `(?![\p{L}\p{N}_])` com flag `u`; `\b` e `\w` são proibidos em
`src/locale/pt-BR/` (R1.12).

## 6. Interfaces

### 6.1 `src/locale/language.ts`

```ts
export type Language = 'en' | 'pt-BR';
export type RequestedLanguage = Language | 'auto';
export type DetectedLanguage = Language | 'es' | 'fr' | 'it' | 'de' | 'undetermined';
export type LanguageSource = 'argument' | 'project' | 'env' | 'detected' | 'default';

export interface Detection {
	language: DetectedLanguage;
	margin: number; // diferença entre a 1ª e a 2ª proporção de palavras funcionais, 0..1
	tokens: number;
	scores: Readonly<Record<Exclude<DetectedLanguage, 'undetermined'>, number>>;
}
export interface Resolution {
	language: Language;
	source: LanguageSource;
	detection?: Detection; // presente quando source === 'detected'
}

export const ENV_VAR = 'SCRIVENER_MCP_LANGUAGE';
export const DETECTION_MIN_TOKENS: number; // inicial 5; calibrado na fase 3 (R3.9)
export const DETECTION_MIN_MARGIN: number; // inicial 0.05; calibrado na fase 3 (R3.9)

export function detectLanguage(
	text: string,
	options?: { candidates?: readonly DetectedLanguage[]; embedded?: readonly string[] }
): Detection;
export function resolveLanguage(text: string, hint?: RequestedLanguage): Resolution;
export function isLanguage(value: unknown): value is Language;
```

Precedência de `resolveLanguage` (a primeira que se aplica vence):

1. `hint` ou o argumento `language` da chamada, se for `'en'` ou `'pt-BR'` → `argument`;
   se for `'auto'`, pula 2 e 3;
2. `ProjectLocale.documents[documentId]` da chamada, se `'en' | 'pt-BR'`, senão
   `ProjectLocale.primary` → `project`;
3. `process.env.SCRIVENER_MCP_LANGUAGE` válido → `env`;
4. `detectLanguage(text)`: se o resultado for `'en'` ou `'pt-BR'` e passar os limiares →
   `detected`;
5. `'en'` → `default`.

A detecção é determinística, sem dependência, por proporção de palavras funcionais (listas em
`src/locale/pt-BR/data/function-words.ts`, curadoria própria, para pt, en, es, fr, it, de).
Toda chamada de `resolveLanguage` dentro de um contexto aberto é registrada nele (6.2).

Limitação conhecida: `documents[documentId]` só vale quando a chamada da ferramenta traz
`documentId`. Ferramentas de vários documentos usam `primary`; trechos em outro idioma dentro de
cada documento são tratados por `excludedSpans` (6.8).

### 6.2 `src/locale/context.ts`

```ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface ExcludedSpan {
	documentId?: string;
	start: number; // offset UTF-16 no texto recebido pela fachada
	end: number;
	language: DetectedLanguage;
	reason: 'foreign-language' | 'undetermined' | 'document-other';
}
export interface LocaleCallContext {
	readonly toolName: string;
	readonly requested?: RequestedLanguage;
	readonly documentId?: string;
	readonly project?: ProjectLocale;
	readonly resolutions: Resolution[];
	readonly excluded: ExcludedSpan[];
	analyzedChars: number; // caracteres usados por funções dependentes de idioma
	totalChars: number;    // caracteres recebidos por essas funções
	readonly unavailableMetrics: Set<string>;
}

export function runWithLocale<T>(ctx: LocaleCallContext, fn: () => T): T;
export function currentLocale(): LocaleCallContext | undefined;
export function createCallContext(init: {
	toolName: string; requested?: RequestedLanguage; documentId?: string; project?: ProjectLocale;
}): LocaleCallContext;
export function recordResolution(resolution: Resolution): void;
export function recordCoverage(analyzed: number, total: number, excluded: ExcludedSpan[]): void;
export function recordUnavailableMetric(name: string): void;
export function summarize(ctx: LocaleCallContext): {
	language: Language | 'mixed';
	languageSource: LanguageSource;
	coverage: number; // analyzedChars / totalChars; 1 quando totalChars === 0
	excludedSpans: ExcludedSpan[]; // no máximo 200; o restante só conta em coverage
};
```

Fora de um contexto (testes do upstream que chamam o handler direto), `currentLocale()` é
`undefined`, as funções `record*` não fazem nada e `resolveLanguage` segue a precedência sem o
passo 2. Não há estado global mutável: o `src/locale/state.ts` da arquitetura §4 é substituído
por este módulo (ADR 0002).

`summarize`: `language` é o único idioma resolvido, `'mixed'` se houve mais de um, e o idioma do
passo 1–3 se nenhuma fachada foi chamada. `languageSource` é a fonte da primeira resolução, ou
`'detected'` quando `language === 'mixed'`.

### 6.3 `src/locale/project-locale.ts`

```ts
export interface ProjectLocale {
	primary: Language;
	documents?: Record<string, Language | 'other'>;
	embedded?: string[];  // BCP-47
	allowlist?: string[]; // palavras estrangeiras intencionais
}
export const PROJECT_LOCALE_KEY = 'locale';

type MemoryReader = Pick<MemoryManager, 'getCustomContext'>;
type MemoryWriter = Pick<MemoryManager, 'setCustomContext' | 'saveMemory'>;

export function parseProjectLocale(value: unknown): ProjectLocale; // lança Error com o campo inválido
export function readProjectLocale(memory: MemoryReader | null | undefined): ProjectLocale | undefined;
export async function writeProjectLocale(memory: MemoryWriter, locale: ProjectLocale): Promise<void>;
export async function suggestProjectLanguage(
	sample: () => Promise<string>, // amostra do Draft, até 2000 palavras
): Promise<Detection>;
```

`readProjectLocale` devolve `undefined` para valor ausente **ou inválido** (valor inválido gera
`logger.warn` uma vez por projeto, sem lançar). `writeProjectLocale` chama
`setCustomContext(PROJECT_LOCALE_KEY, locale)` e depois `saveMemory()`. `memory-manager.ts` não
muda.

### 6.4 `src/locale/errors.ts`

```ts
export class LanguageUnsupportedError extends Error {
	readonly code = 'LANGUAGE_UNSUPPORTED';
	constructor(
		readonly feature: string,       // ex.: 'bluepencil.checkStyle', 'tool:analyze_manuscript_local'
		readonly language: Language,
		readonly reason: 'not-implemented' | 'data-missing' | 'child-process' | 'sidecar-missing',
		readonly alternative?: string,  // nome de ferramenta ou comando
	);
}
export class ForeignSpanChangedError extends Error {
	readonly code = 'FOREIGN_SPAN_CHANGED';
	constructor(readonly changed: Array<{
		start: number; end: number; before: string; after: string;
		languageBefore: DetectedLanguage; languageAfter: DetectedLanguage;
	}>);
}
```

### 6.5 `src/locale/pt-BR/coverage.ts`

```ts
export type CoverageState = 'implemented' | 'language-neutral' | 'unavailable';
export interface FeatureCoverage {
	state: CoverageState;
	reason?: LanguageUnsupportedError['reason'];
	alternative?: string;
	evaluation?: string; // caminho do relatório que promoveu (fase ≥ 3)
}
export type FacadeFeature = `${'narrative-lens' | 'bluepencil' | 'text-metrics' | 'compromise-pos'}.${string}`;
export const PT_BR_COVERAGE: Readonly<Record<FacadeFeature, FeatureCoverage>>;
export function coverageOf(feature: FacadeFeature): FeatureCoverage; // lança se a chave não existir
```

Toda função de valor exportada por uma fachada tem exatamente uma chave aqui, e vice-versa
(R2.1). `implemented` só entra com `evaluation` apontando um relatório que cumpre D5/D16
(exceto fórmulas de legibilidade, R3.6).

### 6.6 Fachadas `src/locale/engines/`

Contrato comum de cada função `f` de valor:

```ts
export function f(...args: Parameters<typeof native.f>): ReturnType<typeof native.f> {
	const text = /* argumento de texto de f */;
	const { language } = resolveLanguage(text);
	if (language === 'en') return native.f(...args);   // caminho inglês: chamada idêntica
	return dispatchPtBR('bluepencil.f', () => pt.f(...args), () => native.f(...adapt(args)));
}
```

`dispatchPtBR(feature, implemented, neutral)` lê `coverageOf(feature)`: `implemented` chama a
implementação pt-BR; `language-neutral` chama a nativa (com adaptador, se houver);
`unavailable` lança `LanguageUnsupportedError`. Funções sem argumento de texto
(`listManuscriptRules`, `listStructureTemplates`, `genreFromLabel`, `parseManuscriptReport`)
resolvem pelo contexto (passos 1–3) e são `language-neutral` desde a fase 2: são metadados ou
parse, não métricas sobre texto.

| Fachada | Funções de valor | Quem importa |
|---|---|---|
| `narrative-lens.ts` | `computeReadability`, `collectProseExamples`, `checkGrammar`, `extractDialogue`, `analyzeOpeningChecked`, `wordFrequencies`, `aggregatePacing`, `analyzePacing`, `explainPacing`, `detectThemesSmart`, `analyzeForeshadowing`, `analyzeSyntaxTension`, `buildTimeline`, `genreFromLabel`, `measureVoiceDriftFromText`, `trackWorldState`, `listManuscriptRules`, `listStructureTemplates`, `parseManuscriptReport`, `extractNamedEntities`, mais `export type * from 'narrative-lens'` | arquivos da seção 9.A |
| `bluepencil.ts` | `analyzeDialogue`, `analyzeRhythm`, `checkStyle`, `findEchoes`, `findRepeats`, `report`, `sentenceStarters`, mais `export type *` | idem |
| `compromise.ts` | `export { default } from 'compromise'` sem despacho | só `src/utils/text-metrics.ts` |
| `compromise-pos.ts` | `default nlp(text)`: em pt-BR lança `LanguageUnsupportedError('compromise-pos.nlp', …)` até a fase 6 | `ml-word-classifier-pro.ts`, `nlp-sentiment-analyzer.ts` |
| `text-metrics.ts` | todas as exportações de `src/utils/text-metrics.ts`; `getAccurateWordCount`, `countWords`, `getCharacterCount`, `getAccurateParagraphCount` são `language-neutral`; `splitIntoSentences`, `getAccurateSentenceCount` usam `pt-BR/text/sentences.ts` a partir da fase 3; `getWordFrequency` usa as palavras funcionais pt-BR a partir da fase 3; `getWritingTextMetrics` compõe as anteriores | os 13 arquivos da seção 9.B |

Se a lista de funções importadas no upstream mudar num merge, o lint (R1.3) e
`check-locale-tools.mjs` (R2.2) acusam.

### 6.7 `src/locale/with-locale.ts` e `src/locale/tool-policies.ts`

```ts
// tool-policies.ts
export interface LocaleToolPolicy {
	/** 'facade': o handler roda e as fachadas decidem por texto.
	 *  'child-process': antes do handler, o invólucro decide se a chamada chega ao processo
	 *  filho do narrative-lens; em pt-BR, responde indisponível sem chamar o handler. */
	mode: 'facade' | 'child-process';
	/** Para 'child-process': true quando estes argumentos chegam ao processo filho. */
	reachesChildProcess?: (args: Record<string, unknown>) => boolean;
	/** Texto usado para decidir o idioma quando não há argumento, projeto nem env. */
	sample?: (args: Record<string, unknown>, context: HandlerContext) => Promise<string>;
	alternative?: string;
}
export const LOCALE_TOOLS: Readonly<Record<string, LocaleToolPolicy>>;

// with-locale.ts
export const LANGUAGE_INPUT_PROPERTY: JSONValue;      // { type:'string', enum:['en','pt-BR','auto'], description: ≥ 1 frase }
export const LOCALE_OUTPUT_PROPERTIES: Record<string, JSONValue>; // language, languageSource, coverage, excludedSpans, available, reason, alternative, unavailableMetrics, changedSpans
export const LOCALE_OUTPUT_KEY = 'locale';
export const LOCALE_OUTPUT_PROPERTY: JSONValue; // { type:'object', properties: LOCALE_OUTPUT_PROPERTIES, required: [language, languageSource, coverage, excludedSpans] }
export function withLocale(tool: ToolDefinition): ToolDefinition;
```

`withLocale(tool)`:

1. Se `tool.name` não está em `LOCALE_TOOLS`, ou se `tool` já é um invólucro, devolve o **mesmo
   objeto** `tool`.
2. Senão devolve um objeto memoizado (`WeakMap<ToolDefinition, ToolDefinition>`; chamar duas
   vezes devolve o mesmo objeto, porque `activateSkill` compara identidade) com:
   - `inputSchema.properties.language = LANGUAGE_INPUT_PROPERTY` (nunca em `required`);
   - `description` igual à original + `" Supports Brazilian Portuguese (pt-BR) via the optional
     language argument; unsupported analyses answer locale.available: false."` (em inglês, D13);
   - se `tool.outputSchema` existe: `properties` = originais + `locale: LOCALE_OUTPUT_PROPERTY`,
     também dentro dos ramos de `anyOf`/`oneOf`/`allOf` que enumeram propriedades ou têm
     `additionalProperties: false`; `required` do topo = `['locale']`; `required`/`anyOf`/
     `oneOf`/`allOf` originais movidos para um ramo de `anyOf`, junto de um ramo
     `{ properties: { locale: { required: ['available', 'reason', 'language'] } } }` para a
     resposta indisponível. Se o schema original já declara `locale` em qualquer desses níveis,
     `withLocale` lança (um merge do upstream que crie o campo falha no registro, não é
     sobrescrito). Se não existe `outputSchema`, nenhum é criado (o gate exige isso para
     ferramentas `TEXT_ONLY`);
   - `handler` envolto:
     a. retira `language` de `args` antes de chamar o handler original;
     b. lê `ProjectLocale` com `readProjectLocale(context.memoryManager)`;
     c. abre `runWithLocale(createCallContext(...))` com `documentId` de `args.documentId`
        quando for string;
     d. se `mode === 'child-process'` e `reachesChildProcess(args)`: resolve o idioma pelos
        passos 1–3 ou, sem eles, por `detectLanguage(await sample(args, context))`; se pt-BR,
        não chama o handler e devolve a resposta indisponível com
        `reason: 'child-process'`;
     e. chama o handler; se ele lançar `LanguageUnsupportedError`, devolve a resposta
        indisponível com o `reason` e a `alternative` do erro; se lançar
        `ForeignSpanChangedError`, devolve `isError: false` e `locale` com `available: false`,
        `reason: 'foreign-span-changed'` e a lista de trechos em `changedSpans`;
     f. na resposta do handler, inclusive com `isError: true` (o SDK valida esse
        `structuredContent` contra o `outputSchema`), acrescenta
        `structuredContent.locale = { ...summarize(ctx), unavailableMetrics? }` (se houver
        `outputSchema` e `structuredContent`). Em idioma ≠ `en`, acrescenta ao fim do último bloco de texto de
        `content` uma linha `pt-BR: …` com cobertura e métricas indisponíveis; em `en`, `content`
        fica byte a byte igual (D15).

Resposta indisponível:

```json
{
  "isError": false,
  "content": [{ "type": "text", "text": "pt-BR: <feature> is not available for Brazilian Portuguese yet (<reason>). Try <alternative>." }],
  "structuredContent": {
    "locale": {
      "available": false, "reason": "not-implemented", "alternative": "analyze_document",
      "language": "pt-BR", "languageSource": "project", "coverage": 0, "excludedSpans": []
    }
  }
}
```

Os campos do upstream não aparecem na resposta indisponível; só o bloco `locale`.

`LOCALE_TOOLS` contém exatamente estas 26 ferramentas:

| Ferramenta | Modo | `reachesChildProcess` |
|---|---|---|
| `analyze_manuscript_local` | child-process | `action ∈ {analyze, configure, accept_finding, dismiss_finding, recheck_finding}` |
| `analyze_narrative_annotations` | child-process | sempre |
| `analyze_craft_local` | child-process | `policy === 'configured'` |
| `editorial_workflow` | child-process | `action ∈ {start, resume}` |
| `analyze_dialogue_tags_local`, `analyze_document`, `analyze_foreshadowing_local`, `analyze_opening_local`, `analyze_rhythm_local`, `analyze_writing_style`, `check_consistency`, `check_continuity_local`, `check_plot_consistency`, `check_style_local`, `continuity_findings`, `enhance_content`, `find_repetition_local`, `generate_content`, `manuscript_style_report_local`, `measure_voice_drift_local`, `search_passages`, `semantic_search`, `suggest_improvements`, `compile_documents`, `queue_document_analysis`, `queue_project_analysis` | facade | – |

`analyze_craft_local` sem `policy: 'configured'` segue como `facade`. As ações de
`analyze_manuscript_local` fora da lista (`capabilities`, `controls`, `read_report`,
`read_baseline`, `delete_baseline`) leem estado já calculado e não são bloqueadas.

### 6.8 Texto base pt-BR (`src/locale/pt-BR/text/`)

```ts
// tokens.ts
export interface Token { text: string; start: number; end: number; kind: 'word' | 'number' | 'punct' }
export function tokenize(text: string): Token[];
// sentences.ts
export const ABBREVIATIONS: readonly string[]; // Sr., Sra., Dr., Dra., pág., p., cap., etc., V. Exa., ...
export function splitSentences(text: string): Array<{ text: string; start: number; end: number }>;
// syllables.ts
export function syllabify(word: string): string[];
export function countSyllables(word: string): number;
// segments.ts
export type SegmentKind = 'narration' | 'speech' | 'tag' | 'quote';
export interface Segment {
	kind: SegmentKind; start: number; end: number; text: string;
	marker?: 'dash' | 'double' | 'angle' | 'single'; speakerHint?: string;
}
export function segmentText(text: string): Segment[];
// spans.ts
export interface LanguageSpan {
	start: number; end: number; language: DetectedLanguage;
	reason: 'detected' | 'inherited' | 'undetermined' | 'document-override' | 'allowlist';
	margin: number;
}
export function detectSpans(text: string, options: {
	documentLanguage: Language; embedded?: readonly string[]; allowlist?: readonly string[];
}): LanguageSpan[];
// foreign-guard.ts
export function assertForeignSpansPreserved(before: string, after: string, options: {
	documentLanguage: Language; embedded?: readonly string[];
}): void; // lança ForeignSpanChangedError
```

Regras (arquitetura §3.5): segmentar antes de detectar; a tag de diálogo herda o idioma do
documento; abaixo de `DETECTION_MIN_TOKENS` ou da margem mínima o trecho herda (fala anterior do
mesmo falante, senão o documento); empate sem `embedded` que desempate é `undetermined`;
`embedded` desempata a favor do idioma declarado; palavras do `allowlist` não contam como sinal
estrangeiro. Funções `language-neutral` recebem o texto inteiro; funções dependentes de idioma
recebem o texto com os trechos excluídos e registram `recordCoverage`.

### 6.9 Ferramenta `set_project_language` (`src/locale/set-project-language.ts`)

```ts
export const setProjectLanguageHandler: ToolDefinition;
```

- `name: 'set_project_language'`, `title: 'Set Project Language'`, `annotations:
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }`.
- `description` em inglês, ≥ 60 caracteres, toda propriedade com `description`.
- Entrada: `primary` (obrigatório, `'en' | 'pt-BR'`), `documents`, `embedded`, `allowlist`
  (opcionais), `clear` (boolean opcional: remove a chave `locale`).
- Exige projeto aberto e `context.memoryManager`; valida com `parseProjectLocale`; grava com
  `writeProjectLocale`.
- `outputSchema`: `{ locale, previous }`, ambos com descrição. Não está em `LOCALE_TOOLS`.
- Registrada no skill `project` (seção 9.C).

### 6.10 Sugestão no `open_project`

`src/locale/project-locale.ts` exporta também
`localeSuggestionText(memory, sample): Promise<string>`: devolve `''` se já há `locale` gravado
ou se a detecção do Draft der `'en'`; senão uma linha em inglês
`"Detected language: pt-BR (margin 0.31). Save it with set_project_language."`. Nada é gravado.

### 6.11 Prompts e preservação de idioma

```ts
// src/locale/pt-BR/prompts.ts
export function languageDirective(language: Language): string; // '' para 'en'
export function promptLanguage(text: string): Language;        // resolveLanguage(text).language
export const IMPROVEMENT_DEFINITIONS_PT_BR: Readonly<Record<string, string>>; // os 12 tipos
```

A diretiva pt-BR manda responder em português do Brasil, no registro do texto, e **não traduzir
falas, citações ou trechos em outro idioma**; os trechos excluídos chegam marcados no texto
enviado. Em `ai-content-enhancer.ts`, o texto reescrito passa por
`assertForeignSpansPreserved(original, reescrito, …)` antes de virar resultado (D4).

## 7. Contrato de saída

- Ferramentas em `LOCALE_TOOLS` com `outputSchema`: o `structuredContent` sempre tem o bloco
  `locale` com `language` (`'en' | 'pt-BR' | 'mixed'`), `languageSource`, `coverage` (0..1) e
  `excludedSpans` (D15). Todos os campos do upstream mantêm nome, tipo e valor em inglês,
  inclusive os que têm o mesmo nome de um campo de locale (`coverage` em `analyze_document`,
  `analyze_writing_style`, `enhance_content`, `check_consistency`, `check_plot_consistency`).
- Implementações pt-BR devolvem o mesmo tipo da nativa (`StyleResult`, `ReadabilityResult`…).
  Quando a semântica muda, o campo fica e a diferença é documentada em
  `docs/pt-br/semantica-campos.md` (por exemplo `counts.adverbs` = advérbios em -mente
  confirmados no léxico).
- Campo numérico sem fórmula pt-BR validada: se o tipo nativo tem flag de disponibilidade
  (`smogAvailable`), ela vai `false`; senão o valor é `0` e o nome entra em
  `unavailableMetrics` (via `recordUnavailableMetric`), que o invólucro expõe em
  `structuredContent.locale.unavailableMetrics` e na linha `pt-BR:` do texto.
- `locale.excludedSpans` vem truncado em 200 itens; `locale.coverage` sempre considera todos.

## 8. Caminhos que escapam das fachadas

### 8.1 Processo filho do narrative-lens

Verificado no código: `src/services/editorial/narrative-worker.ts` (`execFile`) e
`narrative-context.ts` (`spawn`) iniciam **processos filhos** de `process.execPath`, que fazem
`require(narrativeModulePath())` (`lens-native.cts`). O Worker de dentro é só um watchdog. O
`AsyncLocalStorage` não atravessa processo, a fachada não é carregada no filho e a regra de lint
não vê `require.resolve('narrative-lens')`.

Ferramentas que chegam ao filho (por `NarrativeAnalysis.analyzeDocument`, `suggestEdits`,
`serializedAnalysis`, `setControls`, `recordFindingDecision`, `recheckFinding`, `annotations`):
`analyze_manuscript_local`, `analyze_narrative_annotations`, `analyze_craft_local`
(`policy: 'configured'`) e `editorial_workflow` (passos `analyze` e `propose`).

Tratamento: no nível da ferramenta, pelo modo `child-process` de 6.7. Em pt-BR elas respondem
`locale.available: false`, `locale.reason: 'child-process'`, com `alternative` (`analyze_craft_local` sem
`policy`, `check_style_local`, `analyze_document`), até uma fase que as implemente. Nenhum
arquivo de `src/services/editorial/` muda. `narrativeVersion()` em `analysis-envelope.ts` é
metadado e continua igual.

### 8.2 Fila (`src/services/queue/job-queue.ts`)

O `Worker` desse arquivo é do BullMQ: o job é processado fora da cadeia assíncrona de quem o
enfileirou, então o contexto se perde. `src/locale/jobs.ts`:

```ts
export function withJobLocale<T extends object>(data: T): T & { __locale?: JobLocale };
export function runWithJobLocale<R>(data: { __locale?: JobLocale } | undefined, toolName: string, fn: () => R): R;
export interface JobLocale { requested?: RequestedLanguage; documentId?: string; project?: ProjectLocale }
```

Ao enfileirar, `data` passa por `withJobLocale`; ao processar, `processJob` roda dentro de
`runWithJobLocale`. Sem `__locale` (jobs antigos), roda sem contexto, como hoje.

### 8.3 Script de escapes

`scripts/locale/check-native-escapes.mjs` falha (exit 1) quando encontra em `src/`, fora de
`src/locale/engines/`, qualquer string `'narrative-lens'`, `'bluepencil-node'` ou `'compromise'`
usada em `require`, `require.resolve`, `createRequire(...).resolve`, `import()` ou
`import ... from` de valor. Exceções fixas, com motivo no próprio script:
`src/services/editorial/lens-native.cts` (tratado por 8.1) e `import type` em qualquer arquivo.
Roda no workflow pt-BR e depois de cada merge do upstream.

## 9. Pontos de injeção em arquivos do upstream (lista exaustiva)

Qualquer edição fora desta lista é desvio e vai para o `PLAN.md`. `check-locale-tools.mjs`
compara `git diff --name-only upstream/main...HEAD` com esta lista (R1.14).

**A. Troca de import nativo → fachada (fase 1, uma linha por declaração de import):**

| Arquivo | De → para |
|---|---|
| `src/analysis/advanced-readability.ts` | narrative-lens/bluepencil-node → `../locale/engines/*.js` |
| `src/analysis/base-analyzer.ts` | idem |
| `src/analysis/context-analyzer.ts` | idem |
| `src/analysis/ml-word-classifier-pro.ts` | `compromise` → `../locale/engines/compromise-pos.js` (e nativas, se houver) |
| `src/analysis/analyzers/metrics-analyzer.ts` | nativas → `../../locale/engines/*.js` |
| `src/analysis/analyzers/pacing-analyzer.ts` | idem |
| `src/analysis/analyzers/quality-analyzer.ts` | idem |
| `src/analysis/analyzers/structure-analyzer.ts` | idem |
| `src/analysis/analyzers/style-analyzer.ts` | idem |
| `src/analysis/analyzers/suggestion-generator.ts` | idem |
| `src/handlers/analysis-handlers/document-analysis.ts` | idem |
| `src/handlers/bluepencil-handlers.ts` | idem |
| `src/handlers/narrative-lens-handlers.ts` | idem |
| `src/services/analysis/nlp-sentiment-analyzer.ts` | `compromise` → `compromise-pos.js` |
| `src/services/editorial/narrative-analysis.ts` | duas declarações → fachada (tipos via `export type *`) |
| `src/services/editorial/workflow-service.ts` | nativas → fachada |
| `src/services/enhancements/ai-content-enhancer.ts` | idem |
| `src/services/queue/job-queue.ts` | idem |
| `src/utils/text-metrics.ts` | `compromise` → `../locale/engines/compromise.js` |

`src/services/editorial/narrative-context.ts` tem só `import type` e não muda.

**B. Troca de import de `utils/text-metrics.js` → `locale/engines/text-metrics.js` (fase 1):**
`src/analysis/analyzers/emotion-analyzer.ts`, `metrics-analyzer.ts`, `pacing-analyzer.ts`,
`quality-analyzer.ts`, `style-analyzer.ts`, `src/analysis/base-analyzer.ts`,
`src/handlers/analysis-handlers/content-generation.ts`, `src/handlers/compilation-handlers.ts`,
`src/services/compilation-service.ts`, `src/services/compilation/ai-compiler.ts`,
`src/services/document-indexer.ts`, `src/services/project-reports.ts`,
`src/services/project-snapshots.ts`.

**C. Registro (fase 1):** `src/handlers/skill-registry.ts`: (1) `import { withLocale } from
'../locale/with-locale.js'` e `import { setProjectLanguageHandler } from
'../locale/set-project-language.js'`; (2) em `activateSkill`,
`const tools = visibleTools(skill).map(withLocale);`; (3) no skill `project`,
`tools: [...projectHandlers, ...integrityHandlers, dashboardHandler, setProjectLanguageHandler]`.

**D. Lint (fase 1):** `eslint.config.js`: um bloco `no-restricted-imports` para `src/**` com
`paths` `narrative-lens`, `bluepencil-node`, `compromise` (`allowTypeImports: true`) e
`patterns` `**/locale/engines/compromise.js` (permitido só em `src/utils/text-metrics.ts`); um
bloco com `ignores` para `src/locale/engines/**`.

**E. Ciclo de vida (fase 1):** `src/handlers/project-handlers/lifecycle.ts`, `open_project`: uma
concatenação de `await localeSuggestionText(...)` ao texto da resposta.

**F. Fila (fase 1):** `src/services/queue/job-queue.ts`: `withJobLocale(data)` ao enfileirar e
`runWithJobLocale(...)` em volta de `processJob` (duas chamadas).

**G. Prompts (fase 3):** `+ languageDirective(promptLanguage(texto))` no prompt de sistema de
`src/analysis/ai-document-analyzer.ts`, `src/handlers/analysis-handlers/content-generation.ts`,
`src/services/agents/ai-collaboration.ts`, `src/services/ai/ai-writing-service.ts`,
`src/services/compilation/ai-compiler.ts`, `src/services/enhancements/ai-content-enhancer.ts`;
em `ai-content-enhancer.ts`, também a chamada a `assertForeignSpansPreserved`.

**H. Busca (fase 4):** `src/services/editorial/passage-search.ts`: `CONCEPTS` →
`conceptsFor(language)`; `EMBEDDING_SPACE.revision` inclui o idioma (`'1'` em en, `'1-pt-BR'`).

**I. Continuidade (fase 4):** `src/services/editorial/continuity-service.ts`: padrões por idioma
via `continuityPatternsFor(language)`; `normalized()` usa `toLocaleLowerCase(language)`.

**J. Diálogo (fase 5):** nenhum. A contagem de palavras por fala (integracao §3.3) entra na
fachada `bluepencil.analyzeDialogue`, só em pt-BR (D20). Conferido em 2026-11-01: o handler de
`analyze_dialogue_tags_local` repassa os itens de `attributions` sem alterá-los, e o
`outputSchema` declara `attributions` só como `type: 'array'`, sem `items`.

**K. Sidecar (fase 7):** nenhum. Métricas extras entram pela fachada.

Fora desta lista, arquivos novos do fork: `.github/workflows/ptbr.yml`, `docs/adr/*`,
`docs/pt-br/*`, `SPEC.md`, `PLAN.md` e os diretórios da seção 5.

## 10. CI

### 10.1 Gates do upstream que continuam passando

`.github/workflows/ci.yml` não muda (D7). Todos os passos passam no fork, em especial:

- `npm run typecheck`, `npm run format:check` (cobre `src/locale/**`), `npm run lint`
  (`--max-warnings=0`), `npm run build`, `node scripts/check-runtime-policy.mjs`;
- `node scripts/check-tool-registry.mjs`: lê `getRegisteredTools()` com
  `SCRIVENER_MCP_EAGER_TOOLS=1`, portanto vê os schemas aumentados. Exige ≥ 60 caracteres de
  descrição e `description` em **toda** propriedade, em qualquer profundidade, inclusive
  `language`, o bloco `locale` e os campos de `LOCALE_OUTPUT_PROPERTIES`, os ramos de `anyOf` e a ferramenta
  `set_project_language`;
- `node scripts/check-output-conformance.mjs`: executa ferramentas reais por
  `executeRegisteredHandler` contra o fixture inglês e valida o `structuredContent` contra o
  `outputSchema` anunciado; o bloco `locale` de D15 precisa aparecer e validar;
- `npm test -- --testTimeout=30000`: a suíte do upstream sem alteração, mais os testes novos em
  `tests/unit/locale/` (que não podem depender de dados baixados; usam `describeWithData`, 11.3).

### 10.2 Workflow pt-BR (`.github/workflows/ptbr.yml`)

Dispara em `push` e `pull_request` para `main`. Um job, `ubuntu-latest`, Node `24.22.x`:

1. `npm ci`
2. `npm run typecheck && npm run lint && npm run build`
3. `node scripts/locale/fetch-data.mjs --ci` (só fontes com `"ci": true` no manifesto; cache do
   diretório de dados com chave = hash de `scripts/locale/sources.json`)
4. `npx jest tests/unit/locale tests/integration/locale --testTimeout=30000`
5. `node scripts/locale/check-native-escapes.mjs`
6. `node scripts/locale/check-locale-tools.mjs`
7. `node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs`
8. `node scripts/locale/evaluate-corpus.mjs --layer classicos --check` (a partir da fase 3)

`package.json` não ganha scripts novos (evita conflito); o workflow chama os comandos direto.

## 11. Dados de terceiros

### 11.1 Manifesto `scripts/locale/sources.json`

```json
{
  "schema": "scrivener-ptbr-sources/1",
  "sources": [{
    "id": "portilexicon-ud",
    "url": "https://…",
    "version": "…",
    "sha256": "…",
    "license": "MIT",
    "licenseUrl": "https://…",
    "licenseVerified": { "status": "verified", "date": "2026-11-…", "evidence": "LICENSE no repositório" },
    "redistributable": true,
    "ci": true,
    "usedBy": ["style.adverb", "style.passive"],
    "derive": "scripts/locale/derive-portilexicon.mjs"
  }]
}
```

`licenseVerified.status ∈ {verified, author-accepted, unclear, restricted}`. `author-accepted`
é uma fonte cuja licença o autor declarou aceitável para uso pessoal, sem texto de licença
primário (caso da lista de palavras simples de Biderman, 2026-11-01). `unclear` não bloqueia
(D8): o script avisa e `docs/pt-br/SOURCES.md` lista a fonte em "Escrever aos autores".
`ci: true` só para `verified` com licença que permite download automatizado.

### 11.2 `scripts/locale/fetch-data.mjs`

- Destino: `${SCRIVENER_MCP_LOCALE_DATA_DIR ?? ~/.scrivener-mcp/locale/pt-BR}/<id>/<version>/`.
- Baixa da `url` original, confere `sha256` (diferente → apaga o parcial, exit 1), roda o
  `derive` se houver, grava `<destino>/manifest.lock.json` com id, versão, hash, data e licença.
- Flags: `--only <id>`, `--ci`, `--check` (não baixa; lista presente/ausente/hash divergente,
  exit 1 se faltar algo usado por feature `implemented`), `--force`.
- Nunca escreve dentro do repositório.

### 11.3 Uso em runtime e testes

`src/locale/pt-BR/data/loader.ts`: `loadDataset(id: string): Dataset | undefined`, com cache em
memória. Feature que depende de dataset ausente lança `LanguageUnsupportedError(...,
'data-missing', 'node scripts/locale/fetch-data.mjs --only <id>')`. Nos testes,
`tests/unit/locale/helpers.ts` exporta `describeWithData(ids, name, fn)`, que vira
`describe.skip` com mensagem quando falta dado. Listas de curadoria própria (palavras funcionais,
abreviações, verbos de elocução escritos no fork) ficam em `src/locale/pt-BR/data/*.ts` com
cabeçalho `// fonte: curadoria própria`. Nada derivado de arquivo de terceiro entra no repo (D9).

## 12. Corpus e avaliação

### 12.1 Camadas

| Camada | Onde | Versionado |
|---|---|---|
| `classicos` | `tests/fixtures/pt-BR/classicos/` | sim (domínio público) |
| `contemporaneos` | `$SCRIVENER_PTBR_CORPUS_DIR/contemporaneos/` | não; só métricas agregadas |
| `autor` | `$SCRIVENER_PTBR_CORPUS_DIR/autor/` | não; idem |

### 12.2 Formato de anotação

Para cada `<nome>.txt` (UTF-8, LF), um `<nome>.annotations.json` ao lado:

```json
{
  "schema": "scrivener-ptbr-corpus/1",
  "text": "machado-dom-casmurro-cap-01.txt",
  "sha256": "<sha256 do .txt>",
  "layer": "classicos",
  "source": { "title": "Dom Casmurro", "author": "Machado de Assis", "year": 1899, "rights": "public-domain", "url": "https://…" },
  "status": "draft",
  "preannotatedBy": { "tool": "scripts/locale/preannotate.mjs", "commit": "<sha>", "date": "2026-…" },
  "reviewedBy": null,
  "scope": ["style.adverb", "dialogue.speech", "language.span"],
  "spans": [
    { "id": "a1", "detector": "style.adverb", "start": 120, "end": 131, "text": "rapidamente", "label": "positive" },
    { "id": "a2", "detector": "language.span", "start": 300, "end": 352, "text": "No sé lo que…", "label": "positive", "value": "es" }
  ],
  "queries": [
    { "concept": "fear", "relevant": [[1200, 1480]], "notRelevant": [[90, 300]] }
  ]
}
```

- `start`/`end`: offsets UTF-16, `end` exclusivo; `text` precisa ser igual a
  `texto.slice(start, end)` (o avaliador confere e falha se não for).
- `status: "draft"` (pré-anotado) → `"reviewed"` quando o autor revisou; aí `reviewedBy` =
  `{ "name": "…", "date": "…" }`. Só textos `reviewed` contam (D6).
- `scope`: detectores anotados por completo neste texto. Predições de detector fora do `scope`
  são ignoradas.
- `label ∈ {positive, negative}`; `negative` registra um falso positivo conhecido.
- `sha256` divergente do `.txt` invalida a anotação.

### 12.3 `scripts/locale/evaluate-corpus.mjs`

- Uso: `--layer <classicos|contemporaneos|autor|all>`, `--detector <id>` (opcional),
  `--check` (exit 1 se alguma feature `implemented` em `coverage.ts` não cumprir a regra na
  camada pedida), `--out <arquivo>`.
- Casamento: predição e anotação `positive` do mesmo detector casam se a sobreposição for
  ≥ 50% do menor dos dois trechos; cada anotação casa no máximo uma predição.
- Métricas por detector e camada: `predictions`, `tp`, `fp`, `precision = tp/(tp+fp)`,
  `recall = tp/positivos`, `wilsonLower95` (informativo). Busca: `precisionAt10` por conceito e
  média por camada, `recall` reportado.
- Regra de promoção (D5, D16, D17): para cada camada, `predictions ≥ 30` e
  `precision ≥ 0,80` (busca: `precisionAt10 ≥ 0,80` com ≥ 30 trechos julgados). Abaixo de 30:
  `status: "insufficient-sample"`, sem promoção.
- Saída: só números e ids, nunca trechos de texto. Para `contemporaneos` e `autor`, grava em
  `docs/pt-br/avaliacao/<data>-<detector>.json` (versionado). Para `classicos`, pode incluir
  ids de anotação.

### 12.4 `scripts/locale/preannotate.mjs`

Roda os detectores atuais (mesmo `unavailable`, chamando a implementação pt-BR direto) sobre um
`.txt` e grava `<nome>.annotations.json` com `status: "draft"`. Nunca sobrescreve um arquivo
`reviewed` (exit 1).

## 13. Fases e requisitos

Testes unitários ficam em `tests/unit/locale/<módulo>.test.ts`; integração em
`tests/integration/locale/`. "Verde" quer dizer saída do comando registrada no `PLAN.md`.

### Fase 0 — Ambiente

| ID | Requisito | Verificação |
|---|---|---|
| R0.1 | Node ≥ 24.22.1 | `node -v` → `v24.22.2` ou maior |
| R0.2 | `npm ci` conclui sem `EACCES` (correção do cache é do autor) | `npm ci` exit 0 |
| R0.3 | Remote `upstream` configurado | `git remote get-url upstream` → `https://github.com/writerslogic/scrivener-mcp.git` |
| R0.4 | Linha de base do upstream registrada | `npm run typecheck && npm run lint && npm run build && npm test -- --testTimeout=30000 && node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs` com resumo (tests passed/failed) no `PLAN.md`. Falhas preexistentes viram linhas em Desvios, não correções |

### Fase 1 — Esqueleto andante

| ID | Requisito | Teste |
|---|---|---|
| R1.1 | `detectLanguage` | `language.test.ts`: narrativa pt de 13 palavras → `pt-BR`, margem > 0; `"I told you, this is not the place for that"` → `en`; `"No sé lo que quieres de mí, pero no voy a quedarme aquí"` → `es`; `"Okay."` → `undetermined` (tokens < mínimo); texto vazio → `undetermined`, `tokens: 0` |
| R1.2 | Precedência de `resolveLanguage` | `language.test.ts`, tabela: (hint `pt-BR`, projeto `en`, env `en`, texto en) → `pt-BR/argument`; (sem hint, projeto `pt-BR`) → `pt-BR/project`; (projeto com `documents.d1='en'`, documentId `d1`) → `en/project`; (só env `pt-BR`) → `pt-BR/env`; (hint `auto`, projeto `en`, texto pt) → `pt-BR/detected`; (nada, `"Okay."`) → `en/default`; env inválida `'fr'` é ignorada |
| R1.3 | Lint barra import nativo fora das fachadas | `lint-rule.test.ts`: `ESLint` programático sobre um arquivo temporário em `src/` com `import { checkStyle } from 'bluepencil-node'` → 1 erro `no-restricted-imports`; com `import type { StyleResult } from 'bluepencil-node'` → 0 erros; mesmo import dentro de `src/locale/engines/` → 0 erros |
| R1.4 | Fachadas delegam ao nativo em inglês | `engines-parity.test.ts`: para cada função de valor de cada fachada, com o nativo mockado (`jest.unstable_mockModule`), a fachada chamada com texto inglês repassa os mesmos argumentos (`toHaveBeenCalledWith`) e devolve o mesmo objeto (`toBe`) |
| R1.5 | Fachadas exportam o mesmo conjunto | `engines-surface.test.ts`: `Object.keys(fachada)` ⊇ nomes de valor importados no upstream (lista gerada por `check-locale-tools.mjs --list-imports`) |
| R1.6 | `context.ts` | `context.test.ts`: dentro de `runWithLocale`, `currentLocale()` é o contexto mesmo após `await` e `setTimeout`; duas chamadas concorrentes com `Promise.all` não misturam `resolutions`; fora, `undefined` e `record*` não lançam |
| R1.7 | `project-locale.ts` | `project-locale.test.ts`: `parseProjectLocale({primary:'pt-BR', embedded:['en']})` ok; `{primary:'fr'}` lança citando `primary`; `readProjectLocale` com valor inválido → `undefined`; `writeProjectLocale` chama `setCustomContext('locale', …)` e depois `saveMemory` (mock, ordem verificada) |
| R1.8 | `withLocale` identidade e memoização | `with-locale.test.ts`: ferramenta fora de `LOCALE_TOOLS` → mesmo objeto; dentro → objeto novo, e `withLocale` duas vezes → `toBe` o mesmo; `inputSchema.properties.language.enum` = `['en','pt-BR','auto']`; `language` não está em `required`; handler original não recebe `language` em `args` |
| R1.9 | Campos de saída em inglês (D15) | `with-locale.test.ts`: handler falso devolve `{content:[{type:'text',text:'X'}], structuredContent:{a:1}}`; envolto, em en → `content` idêntico (`toEqual`), `structuredContent` = `{a:1, locale:{language:'en', languageSource:'default', coverage:1, excludedSpans:[]}}`; resultado com `isError: true` e `structuredContent` também recebe `locale`; schema original que declara `locale` faz `withLocale` lançar |
| R1.10 | Registro aplica o invólucro | `registry-locale.test.ts`: após `initializeSkillRegistry()` com `SCRIVENER_MCP_EAGER_TOOLS=1`, cada nome de `LOCALE_TOOLS` em `getRegisteredTools()` tem `inputSchema.properties.language`; nenhum outro tem; `activateSkill` chamado de novo devolve `false` (identidade estável) |
| R1.11 | `set_project_language` | `set-project-language.test.ts`: sem projeto → erro de projeto ausente; com `memoryManager` mock, `{primary:'pt-BR', embedded:['en']}` grava e devolve `{locale, previous: undefined}`; `{clear:true}` remove; `{primary:'xx'}` → `INVALID_ARGUMENT` |
| R1.12 | Proibição de `\b`/`\w` em pt-BR | `no-ascii-boundaries.test.ts`: varre `src/locale/pt-BR/**/*.ts` e falha se achar `\\b` ou `\\w` em literal de regex |
| R1.13 | Propagação na fila | `jobs.test.ts`: `withJobLocale` dentro de um contexto pt-BR grava `__locale`; `runWithJobLocale(data, …)` reabre o contexto (`currentLocale().project.primary === 'pt-BR'`); sem `__locale`, `currentLocale()` é `undefined` |
| R1.14 | Só os pontos de injeção listados | `node scripts/locale/check-locale-tools.mjs` compara `git diff --name-only upstream/main...HEAD` com a seção 9 (fases já entregues) e falha listando arquivos extras |
| R1.15 | Sugestão no `open_project` | `tests/integration/locale/open-project.test.ts`: fixture `sample-project-pt.scriv` sem `locale` → texto da resposta contém `Detected language: pt-BR`; e `project-memory.json` não ganhou `locale`; fixture inglês → texto igual ao do upstream |
| R1.16 | Gates do upstream verdes | `npm run lint && npm run format:check && npm run build && node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs && npm test -- --testTimeout=30000` exit 0 |
| R1.17 | Workflow pt-BR verde | `.github/workflows/ptbr.yml` com os passos 1–7 de 10.2; execução verde no GitHub Actions (link no `PLAN.md`) |
| R1.18 | Escapes | `node scripts/locale/check-native-escapes.mjs` exit 0; teste `check-native-escapes.test.ts` com um arquivo temporário contendo `createRequire(x).resolve('narrative-lens')` fora das exceções → exit 1 |

Nesta fase, em pt-BR, todas as fachadas ainda delegam ao nativo (o gate vem na fase 2). O
esqueleto só prova o caminho: idioma resolvido, campos na saída, gates verdes.

### Fase 2 — Gate (opção A)

| ID | Requisito | Teste |
|---|---|---|
| R2.1 | `coverage.ts` completo | `coverage.test.ts`: conjunto de chaves = conjunto de funções de valor das fachadas (as duas direções); toda chave tem `state`; nesta fase só são `language-neutral`: `text-metrics.getAccurateWordCount`, `text-metrics.countWords`, `text-metrics.getCharacterCount`, `text-metrics.getAccurateParagraphCount`, `narrative-lens.listManuscriptRules`, `narrative-lens.listStructureTemplates`, `narrative-lens.genreFromLabel`, `narrative-lens.parseManuscriptReport`; o resto é `unavailable` com `alternative` |
| R2.2 | Ferramentas e fachadas consistentes | `check-locale-tools.mjs`: todo nome de `LOCALE_TOOLS` existe no registro; toda função de valor importada no upstream existe na fachada e em `coverage.ts` |
| R2.3 | Nenhuma métrica inglesa sobre texto português | `tests/integration/locale/gate.test.ts`: para cada ferramenta em `LOCALE_TOOLS` com argumentos mínimos sobre `sample-project-pt.scriv` (projeto com `locale.primary='pt-BR'`), a resposta tem `isError: false` e ou `locale.available: false` com `reason` e `alternative`, ou só campos de funções `language-neutral`; validada contra o `outputSchema` aumentado (Ajv) |
| R2.4 | Gate do processo filho | `gate.test.ts`: `analyze_manuscript_local {action:'analyze'}` em pt-BR → `locale: {available:false, reason:'child-process'}` e o spy em `NarrativeAnalysis.prototype.serializedAnalysis` não foi chamado; `{action:'capabilities'}` → resposta normal; `analyze_craft_local {policy:'configured'}` → indisponível; sem `policy` → passa pela fachada; `editorial_workflow {action:'list'}` → normal, `{action:'start',…}` → indisponível |
| R2.5 | Paridade inglesa intacta | `gate.test.ts` sobre `tests/sample-project.scriv`: para cada ferramenta de `LOCALE_TOOLS`, o `structuredContent` sem a chave `locale` é `toEqual` ao do handler original chamado sem invólucro (inclusive o `coverage` do upstream nas 5 ferramentas que o têm) |
| R2.6 | Detecção sem projeto | projeto pt sem `locale` gravado → `locale.languageSource: 'detected'`, `locale.language: 'pt-BR'`, resposta indisponível (D3) |

### Fase 3 — Texto base, legibilidade, prompts

| ID | Requisito | Teste |
|---|---|---|
| R3.1 | Frases | `sentences.test.ts`: `'A Dra. Ana chegou. Viu a pág. 3 e saiu.'` → 2 frases; `'O Sr. Almeida, a Sra. Lima e o V. Exa. chegaram... Tarde.'` → 2; `'— Sim. — Não.'` → 2; offsets batem com `text.slice` |
| R3.2 | Sílabas | `syllables.test.ts`: `janela`→`ja-ne-la`, `saudade`→`sau-da-de`, `país`→`pa-ís`, `rainha`→`ra-i-nha`, `guerra`→`guer-ra`, `pássaro`→`pás-sa-ro`, `voava`→`vo-a-va`, `montanha`→`mon-ta-nha`; mais uma lista de 200 palavras em `tests/fixtures/pt-BR/silabas.tsv` (curadoria própria) com acerto 100% |
| R3.3 | Segmentação de falas | `segments.test.ts`: `'— No sé lo que quieres de mí, pero no voy a quedarme aquí — respondeu Carmen.'` → `speech` (`No sé … aquí`) + `tag` (`respondeu Carmen.`); aspas `"…"`, `«…»` e travessão de abertura sem fechamento (fala até o fim do parágrafo) |
| R3.4 | Trechos de idioma | `spans.test.ts`: a fala acima em documento pt-BR com `embedded:['es']` → span `es`, tag herda `pt-BR`; `'— Sim.'` → `inherited`; `'"Okay."'` → `inherited`; empate sem `embedded` → `undetermined` e excluído; `allowlist:['laptop']` não gera sinal `en`; texto pt com "e-mail", "board", "meeting" → nenhum span estrangeiro |
| R3.5 | Cobertura registrada | `coverage-record.test.ts`: `checkStyle` (fachada) sobre texto pt com uma fala inglesa de 40 caracteres em 400 → `coverage ≈ 0.9` e 1 `excludedSpan` com `language:'en'`; `countWords` não exclui nada |
| R3.6 | Flesch adaptado | `readability.test.ts`: `'O pássaro voava sobre a montanha distante.'` → 7 palavras, 16 sílabas, `fleschEase = 248.835 − 1.015×7 − 84.6×(16/7) ≈ 48.36` (±0,01); fórmula conferida contra arXiv 2201.03445 (citação no teste). Fórmulas publicadas são promovidas por conferência com a fonte, não por D5 |
| R3.7 | Dale-Chall adaptado | com a lista de palavras simples de Biderman disponível (`author-accepted`, §11.1; os coeficientes foram calibrados com ela, então não trocar por CorPop26 sem recalibrar): `0.1579×%não familiares + 0.0496×palavras por frase + 3.6365`, caso numérico no teste; sem lista → `unavailableMetrics` contém `daleChall` |
| R3.8 | Campos sem fórmula | Tipo conferido em 2026-11-01 (`ReadabilityResultJs`, `node_modules/narrative-lens/index.d.ts:334`): `fkgl`, `gunningFog`, `smog` + `smogAvailable`, `ari`, `colemanLiau`, `fleschEase`, `daleChall`, `sentenceCount`, `wordCount`, `syllableCount`, `charCount`, `polysyllableCount`, `readabilityVariance` e `gradeLevels` (strings para `fkgl`, `gunningFog`, `ari`, `colemanLiau`, `fleschEase`, `daleChall`). Só `smog` tem flag de disponibilidade. `readability.test.ts`: tabela de `docs/pt-br/semantica-campos.md` (escrita no passo 1 da fase); todo campo marcado indisponível aparece com flag `false` ou em `unavailableMetrics`; `gradeLevels` usa faixas brasileiras |
| R3.9 | Limiares de detecção calibrados | `evaluate-corpus.mjs --detector language.span` nas três camadas cumpre D5/D16; os valores finais de `DETECTION_MIN_TOKENS`/`MIN_MARGIN` e o relatório entram no `PLAN.md` |
| R3.10 | Diretiva de idioma | `prompts.test.ts`: `languageDirective('en') === ''`; em pt-BR contém "português do Brasil" e "não traduza"; para cada um dos 6 arquivos de prompt, com provedor mockado, o prompt de sistema em en é byte a byte o do upstream e em pt-BR termina com a diretiva |
| R3.11 | Rejeição de tradução (D4) | `tests/integration/locale/enhance-foreign.test.ts`: `enhance_content` em texto pt com `— I told you, this is not the place for that — disse John.`; provedor mockado devolve a fala traduzida → `locale.available:false`, `locale.reason:'foreign-span-changed'`, trecho em `locale.changedSpans` com `languageBefore:'en'`, `languageAfter:'pt-BR'`; nenhuma proposta criada em `review_changes`; provedor que preserva a fala → resposta normal |
| R3.12 | Adaptador do bluepencil (D18) | `bluepencil-adapter.test.ts`: `analyzeRhythm` sobre `'A Dra. Ana chegou. Ela saiu.'` → 2 frases; linha/coluna dos achados iguais às do texto original; excerto restaurado com `.`; `findEchoes` ignora palavras funcionais pt (`para` não aparece) |
| R3.13 | Promoções da fase | `analyzeRhythm`, `findEchoes`, `findRepeats`, `sentenceStarters` → `language-neutral` com adaptador; `computeReadability` → `implemented` (R3.6–R3.8); `splitIntoSentences`, `getAccurateSentenceCount`, `getWordFrequency` → `implemented` com relatório de frases do corpus cumprindo D5/D16 |
| R3.14 | Corpus clássico inicial | ≥ 3 textos em `tests/fixtures/pt-BR/classicos/` com anotações `reviewed` para `language.span` e `dialogue.speech`; `evaluate-corpus.mjs --layer classicos --check` verde no workflow pt-BR |

### Fase 4 — Busca e continuidade

| ID | Requisito | Teste / regra |
|---|---|---|
| R4.1 | Conceitos pt-BR | `search-concepts.test.ts`: `conceptsFor('pt-BR')` tem os mesmos 30 nomes de `conceptsFor('en')`; `conceptsFor('en')` é `toBe` a constante original |
| R4.2 | Índice separado por idioma | `passage-search-locale.test.ts`: índice gravado com revisão `'1'` é reconstruído ao consultar em pt-BR (`'1-pt-BR'`) e vice-versa; nunca mistura |
| R4.3 | Promoção da busca (D17) | `evaluate-corpus.mjs --detector search.concept`: `precisionAt10 ≥ 0,80` e ≥ 30 trechos julgados em cada camada; recall reportado |
| R4.4 | Padrões de continuidade | `continuity-ptbr.test.ts`: `'Os olhos de Ana eram verdes.'`, `'Ana tinha olhos verdes.'`, `'Ana nasceu em Recife.'` geram fatos; `'Os olhos de Ana eram castanhos.'` depois do primeiro gera contradição; cores com gênero e número (`verdes`, `castanha`) |
| R4.5 | Promoção da continuidade | cada detector (`continuity.eyes`, `continuity.hair`, `continuity.birth`, `continuity.temporal`) segue D5/D16 em cada camada antes de virar `implemented` |

### Fase 5 — Estilo e diálogo

| ID | Requisito | Teste / regra |
|---|---|---|
| R5.1 | Advérbios | unitário: `rapidamente` conta; `mente`, `semente`, `demente` não; depende de `portilexicon-ud` (`describeWithData`) |
| R5.2 | Passiva analítica | unitário: `'A carta foi escrita por Ana.'` → 1; `'As cartas foram escritas.'` → 1; `'Ana foi embora.'` → 0 |
| R5.3 | Filter words, hedges, clichês | listas derivadas por `derive-*.mjs` a partir das fontes do manifesto, mais verbos de percepção de curadoria própria; unitário com 1 positivo e 1 negativo por lista |
| R5.4 | Tags de diálogo | unitário: `— Vamos — disse Ana.` → `neutral`; `— Vamos — sibilou Ana.` → `showy`; `— Vamos — disse Ana, angustiada.` → `adverb`/adjetivo na tag |
| R5.5 | Palavras por fala (D20) | unitário: a fachada `bluepencil.analyzeDialogue` em pt-BR devolve cada item de `attributions` com `wordCount` = palavras de `text.slice(dialogue.offset, dialogue.offset + dialogue.length)`; `— Não vou ficar aqui — disse Ana.` → `wordCount: 4`. Em en, a fachada continua repassando o objeto nativo sem `wordCount` (R1.4 sem exceção). Integração: `analyze_dialogue_tags_local` em pt-BR devolve `wordCount` em `attributions` e valida contra o `outputSchema` atual (que declara só `type: 'array'`); `bluepencil-handlers.ts` não muda |
| R5.6 | Promoção | cada detector (`style.adverb`, `style.passive`, `style.filter`, `style.hedge`, `style.cliche`, `dialogue.speech`, `dialogue.tag`) só vira `implemented` com D5/D16 nas três camadas; relatórios em `docs/pt-br/avaliacao/` |

### Fase 6 — Emoção, voz, `compromise`

| ID | Requisito | Teste / regra |
|---|---|---|
| R6.1 | Escolha do POS | relatório comparando consulta ao PortiLexicon-UD e tagger em sidecar no corpus; a escolha e o motivo entram no `PLAN.md` (decisão devolvida ao autor se o sidecar for o escolhido, porque adiciona dependência Python) |
| R6.2 | `compromise-pos` em pt-BR | `ml-word-classifier-pro` e `nlp-sentiment-analyzer` deixam de lançar em pt-BR só quando o detector correspondente (`pos.*`, `sentiment.*`) cumprir D5/D16 |
| R6.3 | Emoção e sentimento | léxico escolhido com licença registrada em `SOURCES.md`; detectores `emotion.*` seguem D5/D16 |
| R6.4 | Voz | `measure_voice_drift_local` em pt-BR usa palavras funcionais pt e exclui falas em outro idioma; teste: personagem que alterna pt/en sem mudar estilo não gera deriva acima da gerada por texto monolíngue equivalente |
| R6.5 | Processo filho | se alguma ferramenta da seção 8.1 for reimplementada em pt-BR, o modo dela em `LOCALE_TOOLS` muda e R2.4 é atualizado; sem reimplementação, continuam indisponíveis e isso é registrado |

### Fase 7 — Sidecar NILC-Metrix

| ID | Requisito | Teste |
|---|---|---|
| R7.1 | Sem variável, nada muda | `nilc-metrix.test.ts`: sem `SCRIVENER_MCP_NILC_METRIX_URL`, `computeReadability` em pt-BR devolve exatamente o mesmo objeto da fase 3 (`toEqual`) e nenhuma requisição HTTP sai (`fetch` espionado) |
| R7.2 | Com variável, métricas extras | servidor HTTP falso em porta local devolvendo um payload gravado do NILC-Metrix → resultado ganha `extra.nilcMetrix` com as métricas; timeout ou erro → resultado da fase 3 e aviso em `unavailableMetrics: ['nilcMetrix']` |
| R7.3 | Licença | NILC-Metrix (AGPL-3.0) só como processo separado; nenhum código dele no pacote; registrado em `SOURCES.md` |

## 14. Verificação ponta a ponta

Roda ao fim de cada fase (no que a fase já entregou) e obrigatoriamente ao fim da fase 7.
Saídas resumidas no `PLAN.md`.

1. Linha de base: `git fetch upstream && git merge --no-commit --no-ff upstream/main` num branch
   de ensaio; depois `npm run lint` e `node scripts/locale/check-native-escapes.mjs` acusam
   qualquer import nativo novo; aborte o ensaio (`git merge --abort`).
2. Gates: `npm ci && npm run typecheck && npm run format:check && npm run lint && npm run build`.
3. `node scripts/check-tool-registry.mjs && node scripts/check-output-conformance.mjs`.
4. `npm test -- --testTimeout=30000` (upstream + locale) exit 0.
5. `node scripts/locale/fetch-data.mjs --check && node scripts/locale/check-locale-tools.mjs`.
6. `node scripts/locale/evaluate-corpus.mjs --layer all --check` com
   `SCRIVENER_PTBR_CORPUS_DIR` definido; toda feature `implemented` cumpre D5/D16/D17 em cada
   camada.
7. Sessão real por stdio (`node dist/index.js` num cliente MCP): `open_project` no
   `sample-project-pt.scriv` mostra a sugestão; `set_project_language {primary:'pt-BR',
   embedded:['en']}`; `check_style_local` num documento com fala inglesa devolve
   `locale.language:'pt-BR'`, `locale.languageSource:'project'`, `locale.coverage < 1` e o
   span inglês em `locale.excludedSpans`; `analyze_manuscript_local {action:'analyze'}`
   devolve `locale.available:false`, `locale.reason:'child-process'`; `open_project` em
   `tests/sample-project.scriv` e `check_style_local` devolvem os mesmos valores do upstream
   mais o bloco `locale` de D15 com `language:'en'`.
8. Workflow `ptbr.yml` e `ci.yml` verdes no GitHub Actions para o commit final.
