# Recursos de PLN para português brasileiro: pesquisa para a extensão pt-BR

Pesquisa feita em 2026-11-01 para orientar a extensão bilíngue do scrivener-mcp (opções A + B:
gate de idioma e camada de locale em TypeScript, mantendo o inglês ativo).

Convenção de confiança em cada item:

- **verificado**: conferi no repositório, no código ou na página primária;
- **relatado**: aparece em artigo ou resumo de busca, não abri a fonte primária;
- **não verificado**: dado ausente ou contraditório nas fontes.

## 1. Diagnóstico de partida (testado)

Rodei as bibliotecas nativas do upstream sobre o mesmo trecho em inglês e em português
(script em scratchpad, Node 22.19):

| Função | Inglês | Português |
|---|---|---|
| `bluepencil.checkStyle` | 3 advérbios, 2 filter words, 5 hedges, 1 passiva | zero em tudo |
| `bluepencil.analyzeDialogue` | fala e tag reconhecidas | fala com travessão ignorada; "sussurrou" não é tag |
| `narrative-lens.checkGrammar` | `[]` | toda palavra vira erro ortográfico, sugestões em inglês |
| `narrative-lens.computeReadability` | Flesch 77 | Flesch 35, Dale-Chall "Graduate level" para texto simples |

Também verifiquei em JavaScript que `/\búnica\b/u` e `/\bavó\b/u` não casam (`\b` e `\w` são ASCII
mesmo com a flag `u`), enquanto `(?<![\p{L}\p{N}_])avó(?![\p{L}\p{N}_])` casa.

Estrutura do bluepencil (verificado no GitHub `writerslogic/bluepencil`): os léxicos ficam em
`crates/bluepencil-core/data/*.txt`, embutidos via `include_str!` em `src/lexicon/embedded.rs`,
mas há regras fixas no código, por exemplo `ends_with("ly")` em `analysis/adverbs.rs:8`.

## 2. Centros e grupos de pesquisa

| Grupo | Instituição | Relevância para o projeto |
|---|---|---|
| **NILC** – Núcleo Interinstitucional de Linguística Computacional | ICMC-USP São Carlos (com UFSCar, UNESP) | NILC-Metrix, Coh-Metrix-Port, PortiLexicon-UD, Unitex-PB/DELAF-PB, TeP 2.0, Flesch adaptado |
| **C4AI / NLP2 (POeTiSA)** | USP, financiado por IBM e FAPESP | Porttinari (treebank UD), Portparser, Corpus Carolina |
| **TEXTECC / PorLexBras** (Maria José Finatto) | UFRGS | CorPop e listas de frequência de português popular, simplificação |
| **Linguateca / Literateca** (Diana Santos) | Portugal, com nós no Brasil (PUC-Rio, PUCRS) | OBras (corpus literário brasileiro anotado), anotação de personagens e correferência literária |
| **PUCRS** (Renata Vieira) | PUCRS, hoje também Évora | OpLexicon, CORP / Corref-PT (correferência) |
| **PUC-Rio** (Cláudia Freitas) | PUC-Rio | OBras, Bosque-UD, Emocionário |
| **Brasileiras em PLN** | rede, sede em São Carlos | livro aberto *PLN: conceitos, técnicas e aplicações em português* (4ª ed. em curso) |
| **NLX** (Universidade de Lisboa) | Portugal | Albertina PT-BR, LX-Syllabifier |

Não encontrei grupos com recursos publicados de forma específica para este uso na UFMG ou na
UNICAMP; isso é ausência nos resultados de busca, não evidência de que não existam.

## 3. Recursos por necessidade do MCP

### 3.1 Legibilidade e complexidade (substitui `computeReadability`, `analyze_craft_local`)

- **NILC-Metrix**: cerca de 200 métricas em 14 categorias (descritivas, coesão referencial e
  semântica, psicolinguísticas, diversidade lexical, conectivos, léxico temporal, complexidade
  sintática). Sucessor do Coh-Metrix-Port. Python + PostgreSQL, API Docker na porta 8080, pacote de
  ferramentas de ~2 GB; algumas métricas dependem do parser PALAVRAS (comercial).
  Licença **AGPL-3.0** (verificado: `sidleal/nilcmetrix`, atualizado em 2026-06-21).
  Artigo: Leal et al., *Language Resources and Evaluation*, 2023; arXiv
  [2201.03445](https://arxiv.org/abs/2201.03445).
- **Coh-Metrix-Port 2.0**: 48 métricas, Python, GPL-3.0
  ([nilc-nlp/coh-metrix-port](https://github.com/nilc-nlp/coh-metrix-port)) (relatado).
- **Flesch adaptado (Martins et al., 1996, Notas do ICMSC nº 28)**: +42 pontos sobre o Flesch
  original. **Verificado** no texto do NILC-Metrix (arXiv 2201.03445, seção de legibilidade):
  "248.835 - [1.015 x (average words per sentence)] - [84.6 x (average syllables per word)]". O
  relatório de 1996 em si não foi aberto.
- **Dale-Chall adaptado** (verificado no mesmo texto): `0,1579 × % de palavras não familiares +
  0,0496 × palavras por frase + 3,6365`, onde "não familiares" são as ausentes do *Dicionário de
  Palavras Simples* (Biderman, 1998). O NILC-Metrix também implementa Brunet, Honoré e Gunning Fog.
- **ALT**: software web com fórmulas adaptadas ao português (ARI e outras); arXiv
  [2210.00553](https://arxiv.org/abs/2210.00553) (relatado).
- **Pylinguistics**: biblioteca Python de legibilidade para português (relatado, ResearchGate).
- Classificação de complexidade por série escolar: arXiv
  [1704.03013](https://arxiv.org/abs/1704.03013) (relatado).

### 3.2 Sílabas (pré-requisito de qualquer fórmula de legibilidade e de ritmo)

- **silabificador** (TigreGotico): regras fonotáticas, trata tonicidade, relata 99,87% de acordo
  com o Portuguese Unified Pronunciation Lexicon; versões pré-release (relatado).
- **LX-Syllabifier** (NLX/Lisboa): baseado em regras, serviço online; Rodrigues, Costa e Branco
  (2016) concluíram que regras superam aprendizado de máquina para essa tarefa (relatado).
- Por ser baseado em regras, um silabificador em TypeScript é viável e sem dependência pesada.

### 3.3 Estilo e revisão de linha (substitui `check_style_local`, `analyze_dialogue_tags_local`)

- **LanguageTool, módulo `pt`** (verificado no GitHub, LGPL-2.1, atualizado em 2026-11-01):
  `style.xml` (1,25 MB), `grammar.xml` (2,85 MB), listas `cliches.txt`, `wordiness.txt`,
  `redundancies.txt`, `weaselwords.txt`, `barbarisms.txt`, `archaisms.txt`,
  `confusion_pairs.txt`, e uma pasta `pt-BR/` com regras próprias (`style.xml` 47 KB,
  `grammar.xml` 92 KB, `cliches.txt`, `redundancies.txt`…). É a fonte mais rica encontrada para
  equivalentes de hedges, clichês e prolixidade. Java; as listas `.txt` podem ser reaproveitadas
  como dados, as regras XML exigiriam um interpretador ou o servidor LanguageTool como sidecar.
- **CoGrOO**: corretor gramatical da USP (2006, concordância, crase, regência); a dissertação de
  2013 aponta falta de avaliação desde 2006. Não encontrei repositório ativo (relatado).
- **Advérbios em -mente, passiva, particípios**: dependem de morfologia; ver 3.6.
- **Verbos de elocução e travessão**: não encontrei trabalho computacional específico de detecção
  de fala com travessão em ficção. A heurística descrita em material didático é travessão no início
  da linha + fala + verbo de elocução ou nome após o travessão de fechamento; falha no discurso
  indireto livre. Uma dissertação de 2024 (UPF) extraiu diálogos de literatura brasileira por regex
  com spaCy e um léxico de 26 emoções (relatado). Aqui há espaço para trabalho original.

### 3.4 Ortografia (substitui `checkGrammar` na parte ortográfica)

- **VERO** (dicionário Hunspell pt-BR do LibreOffice): versão 3.2, licenças LGPL-3 e MPL-2 em
  alguns empacotamentos, LGPL-2.1 em README antigo. **Licença varia por pacote; conferir no
  `.oxt` usado.**
- **npm `dictionary-pt`** (wooorm/dictionaries) + **`nspell`**: caminho nativo em Node, ESM. O
  `@cspell/dict-pt-br` sincroniza dele, o que sugere que é pt-BR, mas **não confirmei** variante
  nem licença.

### 3.5 Frequência lexical (palavras raras, repetição, Dale-Chall equivalente)

- **SUBTLEX-PT-BR** (Tang, 2012): ~61 milhões de tokens de legendas, 136 mil types; subconjunto
  com correção ortográfica de ~59 milhões. **CC BY-NC-ND 4.0**, verificado em 2026-11-01 no site
  do autor ([kevintang.org/Tools.html](https://www.kevintang.org/Tools.html)). O projeto no OSF
  (`vb5yp`) mostra a licença como "Other" sem texto e o wiki só pede citação, o que dá a
  impressão de não haver restrição. Uso pessoal não comercial é permitido; redistribuir dados
  derivados não é. Ver seção 5.
- **CorPop** (UFRGS): frequências de português popular escrito, lista lematizada de 5.229
  lemas; **CorPop26** (STIL 2026) atualiza as 3.000 palavras mais frequentes, dados no Kaggle.
  Bom candidato para "lista de palavras familiares" no lugar da Dale-Chall (relatado; licença não
  verificada).
- **Corpus Carolina** (C4AI/LaViHD-USP): 823 milhões de tokens (versão 1.2 Ada), licença por
  texto no cabeçalho TEI; útil para gerar frequências próprias (relatado).
- O NILC-Metrix usa frequências de brWaC (`freq_brwac`) (relatado).

### 3.6 Morfologia, POS e sintaxe (base para advérbios, passiva, nominalizações, ritmo)

- **PortiLexicon-UD**: mais de 1,2 milhão de formas com traços morfológicos UD, baseado no
  Unitex-PB; **MIT** (verificado: `LuceleneL/PortiLexicon-UD`). Sem multipalavras na versão de
  demonstração. Por ser só dados, é o recurso mais fácil de usar a partir de TypeScript: permite
  identificar `-mente` adverbial real, particípios para passiva ("ser + particípio") e lemas.
- **DELAF-PB / Unitex-PB** (NILC): ~880 mil formas flexionadas; revisão de 2015 adaptada ao Acordo
  Ortográfico (relatado).
- **Porttinari**: treebank UD multigênero, 8.418 sentenças revisadas e ~4 milhões automáticas;
  POS > 99% e dependências ~95% (relatado). Está no repositório oficial UD
  (`UniversalDependencies/UD_Portuguese-Porttinari`, atualizado em 2026-10-11).
- **Portparser**: UDPipe 2 treinado no Porttinari-base, **MIT** (verificado:
  `LuceleneL/Portparser`, atualizado em 2026-08-17). Python.
- **spaCy `pt_core_news_lg`**: lemas 0,973, UPOS 0,969, morfologia 0,959, treinado no Bosque v2.8
  (relatado, model card). Python.
- **Stanza**: não encontrei números de acurácia para português.
- Não encontrei um tagger UD de português nativo em JavaScript; o UDPipe em WASM só existe embutido
  num pacote Flutter.

### 3.7 Emoção e sentimento (substitui listas de `emotion-analyzer.ts` e `nlp-sentiment-analyzer.ts`)

- **OpLexicon v3.0** (PUCRS): 32.191 entradas com polaridade (relatado).
- **SentiLex-PT02** (Lisboa): 7.014 entradas, foco em entidades humanas (relatado). Português europeu.
- **LIWC 2015pt**: supera o 2007pt em três tarefas (relatado); LIWC é licenciado, conferir termos.
- **WordNetAffect-BR** e **Emocionário** (PUC-Rio): léxicos de emoção em português (relatado).
- **Normas psicolinguísticas** (SciELO, *Psicologia: Teoria e Pesquisa*): valência e alerta para
  908 palavras (escala SAM), concretude para 909 (Janczura et al., 2007), tamanho de categoria para
  906; imageabilidade só encontrada para português europeu (relatado).
- Benchmark de 2025 (MDPI *AI*): BERTimbau superou o léxico EmoAtlas na detecção de emoção em
  português, em textos não literários (relatado).
- O NRC EmoLex não tem versão pt-BR validada; só tradução automática, com ressalvas culturais.

### 3.8 Entidades, correferência e tempo (continuidade, linha do tempo, rede de personagens)

- **NER**: HAREM é o padrão de avaliação. Há exportações ONNX de BERTimbau para NER
  (`rchuluc/bertimbau-large-ner-total-onnx`, HAREM, 10 classes; saída por subtoken, agregação BIO
  fica com o chamador) que rodam em Node via transformers.js (relatado, model cards). Nenhum
  modelo encontrado é treinado em ficção.
- **Correferência**: CORP (regras determinísticas, PUCRS) e Corref-PT (182 textos, 3.898 cadeias,
  majoritariamente notícias) (relatado). A **Linguateca publicou em 2026 anotação de correferência
  de personagens em corpora literários** (Vercial, NOBRE), com dados e programas na página
  Gramateca/Literateca/Corref (relatado; é o recurso mais próximo do caso de uso de ficção).
- **Tempo**: HeidelTime tem versão para português (normalização TIMEX3); TimeBankPT é o corpus
  anotado (relatado). Útil para `check_continuity_local` e linha do tempo.

### 3.9 Busca semântica (substitui os 30 conceitos de `passage-search.ts`)

- **BERTimbau** (base 110M, large 330M, brWaC), **Albertina PT-BR** (DeBERTa, licença
  permissiva, inclui 100M para eficiência), **PeLLE** (encoders com dados abertos), **Tucano**
  (decoder, Apache-2.0) (relatado, arXiv
  [2305.06721](https://arxiv.org/abs/2305.06721), [2403.01897](https://arxiv.org/abs/2403.01897),
  [2402.19204](https://arxiv.org/abs/2402.19204), [2411.07854](https://arxiv.org/abs/2411.07854)).
- **TeP 2.0** (NILC, sinônimos e antônimos) e **OpenWordNet-PT**: para expandir conceitos e
  sugerir alternativas em repetição (relatado; download não verificado).
- O upstream usa vetores de conceito fixos por decisão de projeto (offline, sem modelo). Manter
  essa propriedade em pt-BR significa padrões e sinônimos curados (TeP); trocar por embeddings é
  uma mudança de arquitetura a discutir com o upstream.

### 3.10 Corpora literários (avaliação e calibração)

- **OBras** (Linguateca, Santos, Freitas e Bick): obras literárias brasileiras em domínio público,
  272 textos, 43 autores, 7,2 milhões de palavras, anotação completa com revisão humana parcial
  (relatado; números de 2018, licença não verificada).
- **Literateca** (Vercial, NOBRE, OBras): ~28,6 milhões de palavras na versão 2.7 (relatado).
- **CLIMA/CLIC** (PUC-SP): Machado de Assis, 9 romances e 76 contos, mais corpus de referência de
  23 autores de 1850–1910 (relatado).
- **Machado de Assis corpus** no Hugging Face e **Brazilian Portuguese Literature Corpus** no
  Kaggle (1840–1908) (relatado).
- **MegaLitePT** (Springer, 2022) (relatado).
- Esses corpora servem para calibrar limiares (densidade de advérbios, ritmo, proporção de diálogo)
  em prosa brasileira real, em vez de importar limiares do inglês.

### 3.11 Estilometria e voz (`measure_voice_drift_local`, `analyze_writing_style`)

- Palavras funcionais são o traço clássico (Stamatatos, 2009); em literatura brasileira uma
  dissertação da UFPB obteve ~88% com palavras funcionais + SVM e ~93% com compressão PPM
  (relatado).
- n-gramas de caracteres para atribuição de autoria em português (Markov et al., 2017) (relatado).
- Conjunto estilométrico para português baseado em conjunções e advérbios (J.UCS, 2008) (relatado).

## 4. Cruzamento com as ferramentas do MCP

| Ferramenta (upstream) | Problema em pt-BR | Recurso principal | Caminho de integração |
|---|---|---|---|
| `check_style_local`, `manuscript_style_report_local` | zero achados | LanguageTool pt/pt-BR (listas), PortiLexicon-UD | dados em TS |
| `analyze_dialogue_tags_local` | ignora travessão | heurística própria + verbos de elocução | TS, trabalho original |
| `analyze_rhythm_local`, `find_repetition_local` | provavelmente funcionam (não testado) | silabificador, stopwords pt | testar antes de mexer |
| `analyze_craft_local` (legibilidade, gramática) | métricas falsas | Flesch adaptado, NILC-Metrix, dictionary-pt | TS para fórmulas; NILC-Metrix como sidecar opcional |
| `semantic_search`, `search_passages` | conceitos em inglês | padrões pt + TeP 2.0 | dados em TS |
| `check_consistency`, `check_continuity_local` | padrões "X's eyes were" | regras pt, HeidelTime-pt, correferência Literateca | TS + sidecar opcional |
| `analyze_document` (local), emoção, sentimento | listas em inglês | OpLexicon, normas SciELO, LIWC 2015pt | dados em TS |
| `measure_voice_drift_local`, `analyze_writing_style` | depende de tokenização e palavras funcionais | listas de palavras funcionais pt | dados em TS |
| `enhance_content`, `generate_content` | prompts sem idioma de saída | instrução de idioma + definições pt dos 12 tipos | TS, baixo esforço |
| NER interno (opcional, ONNX) | modelo inglês | BERTimbau NER ONNX | transformers.js |

## 5. Alertas de licença

O scrivener-mcp é **AGPL-3.0** e a WritersLogic oferece **licença comercial dupla**
(`COMMERCIAL_LICENSE.md`). Consequências:

- **MIT, Apache-2.0, LGPL**: compatíveis com o fork (PortiLexicon-UD, Portparser, LanguageTool,
  Tucano).
- **AGPL-3.0 / GPL-3.0** (NILC-Metrix, Coh-Metrix-Port): compatíveis com o fork AGPL, mas impedem
  que o upstream relicencie esse código comercialmente. Se a intenção for contribuir ao upstream,
  usar como sidecar separado, não incorporar.
- **CC BY-NC-ND** (SUBTLEX-PT-BR): proíbe uso comercial e obras derivadas; incompatível com
  redistribuir dentro do pacote e com a licença comercial. Usar só para pesquisa ou substituir por
  frequências derivadas do Carolina ou do CorPop (licenças a confirmar).
- **LIWC**: licenciado, não redistribuível sem verificar termos.
- **VERO, CorPop, OBras, OpLexicon, TeP**: licença não verificada; conferir antes de empacotar.

## 6. Restrição de runtime

O servidor é Node/TypeScript. Divisão prática do que foi encontrado:

- **Usável direto em Node**: listas e léxicos (PortiLexicon-UD, LanguageTool `.txt`, OpLexicon,
  normas), `nspell` + `dictionary-pt`, modelos ONNX via transformers.js, fórmulas e silabificação
  reimplementadas.
- **Exige processo Python separado**: NILC-Metrix, Coh-Metrix-Port, spaCy, Stanza, Portparser,
  HeidelTime (Java). Isso adiciona instalação pesada; tratar como recurso opcional, com o mesmo
  padrão que o upstream usa para Neo4j e Redis (funciona sem, melhora com).

## 7. Lacunas encontradas

- Detecção e atribuição de fala com travessão em ficção brasileira: sem ferramenta pronta.
- Modelos de NER e correferência treinados em ficção brasileira: só a anotação da Literateca (2026).
- Listas de "filter words" no sentido da oficina de escrita em inglês (verbos de percepção que
  afastam o leitor) não aparecem como recurso de PLN em português; terão de ser curadas.
- Coeficientes de Martins et al. (1996) conferidos via NILC-Metrix, não no relatório de 1996.

## 8. Fontes

Legibilidade e complexidade:
[NILC-Metrix, arXiv 2201.03445](https://arxiv.org/abs/2201.03445) ·
[nilcmetrix (GitHub)](https://github.com/sidleal/nilcmetrix) ·
[Coh-Metrix-Port](https://github.com/nilc-nlp/coh-metrix-port) ·
[ALT, arXiv 2210.00553](https://arxiv.org/abs/2210.00553) ·
[Complexidade para séries iniciais, arXiv 1704.03013](https://arxiv.org/abs/1704.03013) ·
[Avaliação de eficiência na leitura, arXiv 2508.15824](https://arxiv.org/abs/2508.15824) ·
[Martins et al. 1996 (USP)](https://repositorio.usp.br/bitstreams/73fba911-601e-4040-bda6-f17c07aad52b) ·
[Flesch em português (UFRGS Bioética)](https://www.ufrgs.br/bioetica/ilfk.htm) ·
[Capítulo de complexidade textual, Brasileiras em PLN](https://brasileiraspln.com/livro-pln/2a-edicao/parte-aplicacoes/cap-complexidade-textual/cap-complexidade-textual.html)

Sílabas: [silabificador (PyPI)](https://pypi.org/project/silabificador/2.1.1a1/) ·
[LX-Syllabifier, Rodrigues, Costa e Branco 2016](https://www.portulanclarin.net/static/docs/lxsyllabifier/2016RodriguesCostaBranco.pdf)

Estilo e ortografia:
[LanguageTool](https://github.com/languagetool-org/languagetool) ·
[CoGrOO, LREC 2006](https://preview.aclanthology.org/setup/L06-1429) ·
[Aprimorando o CoGrOO (USP)](https://www.teses.usp.br/teses/disponiveis/45/45134/tde-02052013-135414/en.php) ·
[VERO](https://extensions.openoffice.org/fr/node/1375.html) ·
[hunspell pt-BR (MacPorts)](https://ports.macports.org/port/hunspell-dict-pt_BR/details) ·
[dictionary-pt](https://repos.data.code.gouv.fr/usage/npm/dictionary-pt) ·
[@cspell/dict-pt-br](https://app.unpkg.com/@cspell/dict-pt-br@2.4.2/files/README.md)

Frequência:
[SUBTLEX-PT-BR (OSF)](https://osf.io/vb5yp/wiki) ·
[Tang 2012](https://slam.phil-fak.uni-duesseldorf.de/papers/older_than_2020/Tang_2012_SUBTLEXPTBR_UCLWPL2.pdf) ·
[CorPop](https://www.ufrgs.br/textecc/porlexbras/corpop) ·
[CorPop26, STIL 2026](https://sol.sbc.org.br/index.php/stil/article/view/44611) ·
[Corpus Carolina](https://corpuscarolina.ime.usp.br/en/about)

Morfologia e sintaxe:
[PortiLexicon-UD, LREC 2022](https://aclanthology.org/2022.lrec-1.715) ·
[PortiLexicon-UD (GitHub)](https://github.com/LuceleneL/PortiLexicon-UD) ·
[DELAF-PB revisão 2015](https://sol.sbc.org.br/index.php/stil/article/view/3978) ·
[Porttinari, STIL 2021](https://sol.sbc.org.br/index.php/stil/article/view/17778) ·
[UD_Portuguese-Porttinari](https://github.com/UniversalDependencies/UD_Portuguese-Porttinari) ·
[Portparser](https://github.com/LuceleneL/Portparser) ·
[spaCy pt_core_news_lg](https://huggingface.co/spacy/pt_core_news_lg) ·
[UDPipe × spaCy (2018)](https://github.com/jwijffels/udpipe-spacy-comparison)

Emoção e sentimento:
[lexiconPT (OpLexicon, SentiLex)](https://sillasgonzaga.r-universe.dev/lexiconPT/doc/manual.html) ·
[SentiLex-PT](https://doaj.org/article/da902481fb2c43ecac9bf0b746dbb97a) ·
[LIWC 2015pt](https://sol.sbc.org.br/index.php/brasnam/article/view/6545) ·
[WordNetAffect-BR](https://seer.ufrgs.br/renote/article/download/14693/8602) ·
[Emocionário (PUC-Rio)](https://www.maxwell.vrac.puc-rio.br/62706/62706.PDF) ·
[Normas de valência e alerta](http://www.scielo.br/j/ptp/a/xrbnTPjpTGnWK5TKrhgqdcT/?lang=pt) ·
[Normas de listas associadas](https://www.scielo.br/j/ptp/a/f4w7gsfh5XMKbCFntBhTHfq/?lang=pt) ·
[Benchmark de emoção pt-BR (MDPI)](https://mdpi.com/2673-2688/6/10/249) ·
[Emoções em literatura brasileira (UPF)](https://repositori.upf.edu/items/f24c70ab-8e1f-49c5-b574-e4ae3d141048/full)

Entidades, correferência, tempo:
[BERTimbau NER ONNX](https://huggingface.co/rchuluc/bertimbau-large-ner-total-onnx) ·
[REN com BERTimbau (USP)](https://www.teses.usp.br/teses/disponiveis/8/8139/tde-06042021-192617/publico/2020_AndressaVieiraESilva_VCorr.pdf) ·
[Corref-PT](https://cys.cic.ipn.mx/index.php/CyS/article/view/3063) ·
[Correferência de personagens, Linguateca 2026](https://www.linguateca.pt/Diana/download/AprCoRefPROPOR2026.pdf) ·
[TimeBankPT, LREC 2012](https://aclanthology.org/L12-1096/)

Modelos: [Albertina, arXiv 2305.06721](https://arxiv.org/abs/2305.06721) ·
[Albertina 1.5B/100M, arXiv 2403.01897](https://arxiv.org/abs/2403.01897) ·
[PeLLE, arXiv 2402.19204](https://arxiv.org/abs/2402.19204) ·
[Tucano, arXiv 2411.07854](https://arxiv.org/abs/2411.07854) ·
[TeP 2.0](https://portulanclarin.net/repository/browse/thesaurus-for-portuguese-version-20/86bf0708284511eb8a2502420a0004110cff28a259e84cdca2dd0212a6e7c07a/) ·
[Survey de bases lexicais (MDPI)](https://mdpi.com/2078-2489/9/2/34)

Corpora literários e estilometria:
[OBras (Linguateca)](https://www.linguateca.pt/Diana/download/SantosFreitasLopesHDRio2018_completo.pdf) ·
[OBras (OpenCor)](https://opencor.gitlab.io/corpora/santos18obras) ·
[Gramateca e Literateca](https://seer.ufu.br/index.php/dominiosdelinguagem/article/view/63848) ·
[Machado de Assis, CLIMA (PUC-SP)](https://sapientia.pucsp.br/handle/handle/23128) ·
[machado-de-assis-corpus (HF)](https://huggingface.co/datasets/ronenfilho/machado-de-assis-corpus) ·
[Brazilian Portuguese Literature Corpus (Kaggle)](https://www.kaggle.com/datasets/rtatman/brazilian-portuguese-literature-corpus) ·
[MegaLitePT](https://link.springer.com/chapter/10.1007/978-3-031-21689-3_19) ·
[Atribuição de autoria em literatura brasileira (UFPB)](https://repositorio.ufpb.br/jspui/handle/tede/6121) ·
[n-gramas de caracteres em português](https://ipn.elsevierpure.com/en/publications/authorship-attribution-in-portuguese-using-character-n-grams) ·
[Estilo de tradutor, PROPOR 2024](https://aclanthology.org/2024.propor-2.15.pdf)

Panorama: [Livro Brasileiras em PLN, 4ª ed.](https://brasileiraspln.ufscar.br/livro-pln-4ed-vol1/desafios-e-perspectivas/cap-futuro/cap-futuro.pdf) ·
[POeTiSA / NILC (Pardo)](https://sites.icmc.usp.br/taspardo/Projects.htm)
