// fonte: curadoria própria
//
// Palavras funcionais (artigos, preposições, contrações, pronomes, conjunções e auxiliares
// frequentes) usadas só para detectar idioma por proporção. As listas se sobrepõem de
// propósito ("de", "que", "a"): o que decide é o conjunto, não uma palavra isolada.

export type FunctionWordLanguage = 'pt-BR' | 'en' | 'es' | 'fr' | 'it' | 'de';

const PT = `
o a os as um uma uns umas de do da dos das em no na nos nas num numa por pelo pela pelos pelas
para pra com sem sob sobre entre até após ao aos à às e ou mas porém nem que se como quando onde
porque pois já não sim muito mais menos também ainda só eu tu ele ela nós vós eles elas você
vocês me te lhe nos lhes meu minha meus minhas seu sua seus suas teu tua nosso nossa este esta
isto esse essa isso aquele aquela aquilo é era foi são estava está estão tinha tem havia há ser
estar ter fazer disse então depois antes lá aqui aí quem qual cujo cuja
`;

const EN = `
the a an of in on at to for with from by about into over after before and or but nor so yet
that which who whom whose what when where why how not no yes very more less also still only i
you he she it we they me him her us them my your his its our their this these those there here
is was are were be been being have has had do does did will would shall should can could may
might must said then than as if because while
`;

const ES = `
el la los las un una unos unas a de del al en por para con sin sobre entre hasta desde y o pero
sino ni que si como cuando donde porque pues ya no sí muy más menos también todavía solo yo tú
él ella nosotros nosotras vosotros ellos ellas usted ustedes me te le lo nos les mi mis tu tus su
sus nuestro nuestra este esta esto ese esa eso aquel aquella es era fue son estaba está están
había hay ser estar tener hacer dijo entonces después antes allí aquí quien cual mí sé voy
`;

const FR = `
le la les un une des de du au aux en dans par pour avec sans sur sous entre vers chez et ou mais
donc ni car que qui quoi si comme quand où parce ne pas plus moins aussi encore seulement je tu
il elle nous vous ils elles me te se lui leur mon ma mes ton ta tes son sa ses notre votre ce
cette ces cela ça est était sont étaient être avoir a ai avait fait dit alors après avant ici là
y
`;

const IT = `
il lo la i gli le un uno una di del della dei degli delle in nel nella nei per con su sul sulla
tra fra da dal dalla e o ma però né che se come quando dove perché già non sì molto più meno
anche ancora solo io tu lui lei noi voi loro mi ti gli ci vi mio mia miei tuo tua suo sua nostro
questo questa quello quella è era fu sono erano essere avere ha hanno aveva fatto detto allora
dopo prima qui lì chi quale
`;

const DE = `
der die das den dem des ein eine einen einem einer eines von zu mit aus bei nach seit für gegen
ohne um durch über unter vor zwischen und oder aber denn sondern dass ob wie wenn als wo warum
nicht kein keine ja sehr mehr weniger auch noch nur ich du er sie es wir ihr mich dich sich ihn
ihm uns euch mein meine dein deine sein seine unser dieser diese dieses jener ist war sind waren
sein haben hat hatte wird wurde werden kann konnte muss sagte dann hier dort
`;

function wordSet(list: string): ReadonlySet<string> {
	return new Set(list.split(/\s+/u).filter(Boolean));
}

export const FUNCTION_WORDS: Readonly<Record<FunctionWordLanguage, ReadonlySet<string>>> = {
	'pt-BR': wordSet(PT),
	en: wordSet(EN),
	es: wordSet(ES),
	fr: wordSet(FR),
	it: wordSet(IT),
	de: wordSet(DE),
};
