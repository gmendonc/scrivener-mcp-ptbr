import { countText } from './counts.js';
import { daleChall } from './dale-chall.js';
import { fleschBand, fleschEase } from './flesch.js';
import { gunningFog } from './gunning-fog.js';

/**
 * `computeReadability` for pt-BR, with the native result's shape (SPEC §7, R3.6–R3.8; field by
 * field in docs/pt-br/semantica-campos.md). Fields without a validated pt-BR formula are 0 and
 * listed in `unavailable`; SMOG goes through its own flag.
 */
export interface ReadabilityPtBR {
	fkgl: number;
	gunningFog: number;
	smog: number;
	smogAvailable: boolean;
	ari: number;
	colemanLiau: number;
	fleschEase: number;
	daleChall: number;
	sentenceCount: number;
	wordCount: number;
	syllableCount: number;
	charCount: number;
	polysyllableCount: number;
	gradeLevels: {
		fkgl: string;
		gunningFog: string;
		ari: string;
		colemanLiau: string;
		fleschEase: string;
		daleChall: string;
	};
	readabilityVariance: number;
}

export const UNAVAILABLE_GRADE = 'indisponível em pt-BR';
const ALWAYS_UNAVAILABLE = ['fkgl', 'ari', 'colemanLiau', 'readabilityVariance'] as const;

export function computeReadabilityPtBR(
	text: string,
	simpleWords?: ReadonlySet<string>
): { result: ReadabilityPtBR; unavailable: string[] } {
	const counts = countText(text);
	const flesch = fleschEase(counts);
	const unavailable: string[] = [...ALWAYS_UNAVAILABLE];
	if (!simpleWords) unavailable.push('daleChall');
	return {
		result: {
			fkgl: 0,
			gunningFog: gunningFog(counts),
			smog: 0,
			smogAvailable: false,
			ari: 0,
			colemanLiau: 0,
			fleschEase: flesch,
			daleChall: simpleWords ? daleChall(counts, simpleWords) : 0,
			sentenceCount: counts.sentences,
			wordCount: counts.words,
			syllableCount: counts.syllables,
			charCount: counts.letters,
			polysyllableCount: counts.polysyllables,
			gradeLevels: {
				fkgl: UNAVAILABLE_GRADE,
				gunningFog: UNAVAILABLE_GRADE,
				ari: UNAVAILABLE_GRADE,
				colemanLiau: UNAVAILABLE_GRADE,
				fleschEase: counts.words ? fleschBand(flesch) : UNAVAILABLE_GRADE,
				daleChall: UNAVAILABLE_GRADE,
			},
			readabilityVariance: 0,
		},
		unavailable,
	};
}
