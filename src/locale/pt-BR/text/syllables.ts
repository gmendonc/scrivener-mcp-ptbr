// fonte: curadoria própria

/**
 * Orthographic syllabification for Brazilian Portuguese (SPEC §6.8, R3.2), by the school rules
 * of division: consonant digraphs (ch, lh, nh, qu, gu) and onset clusters (bl, br, cl, cr, dr,
 * fl, fr, gl, gr, pl, pr, tr, vr) stay together; rr, ss, sc, sç, xc and other consonant pairs
 * split; two strong vowels are a hiatus; i/u after a vowel is a semivowel (falling diphthong)
 * unless accented, followed by nh, or closed in its own syllable by r, l, z, m or n.
 *
 * Known limit: final unstressed rising diphthongs ("história") are kept as hiatus
 * ("his-tó-ri-a"), one of the two divisions grammars accept; prefixes that break a cluster
 * ("sub-li-nhar") are not recognized.
 */

const VOWELS = 'aáàâãeéêiíoóôõuúüy';
const HIGH = new Set([...'iu']);
const ACCENTED_HIGH = new Set([...'íúü']);
const NASAL = new Set([...'ãõ']);
const ONSET_CLUSTERS = new Set([
	'bl',
	'br',
	'cl',
	'cr',
	'dr',
	'fl',
	'fr',
	'gl',
	'gr',
	'pl',
	'pr',
	'tr',
	'vr',
]);
const CODA_CLOSERS = new Set([...'rlzmn']);

function isVowel(ch: string | undefined): boolean {
	return ch !== undefined && VOWELS.includes(ch);
}

interface Unit {
	text: string;
	vowel: boolean;
	/** Vogal que não forma núcleo: semivogal de ditongo. */
	glide?: boolean;
	/** Índice da primeira letra da unidade na palavra. */
	at: number;
}

// Hiatos que só a formação da palavra explica (pro-i-bir, re-u-nir, sa-i-ri-a): o i/u logo
// depois da primeira vogal do prefixo é núcleo (revisão do estágio 3a).
const HIATUS_PREFIXES = [/^proib/, /^reun/, /^reut/, /^(?:sa|ca|tra|atra|distra)ir(?:i|á|e|ão|am)/];

/** Letras → unidades: consoantes (dígrafos juntos) e vogais. */
function units(word: string): Unit[] {
	const lower = word.toLowerCase();
	const out: Unit[] = [];
	let i = 0;
	while (i < lower.length) {
		const ch = lower[i];
		const next = lower[i + 1];
		// y antes de vogal é consoante ("Yara", "yoga").
		if (!isVowel(ch) || (ch === 'y' && isVowel(next))) {
			const pair = ch + (next ?? '');
			if (pair === 'ch' || pair === 'lh' || pair === 'nh') {
				out.push({ text: word.slice(i, i + 2), vowel: false, at: i });
				i += 2;
				continue;
			}
			// qu e gu antes de vogal: o u pertence ao ataque ("que", "guerra", "quatro", "água").
			if (
				(ch === 'q' || ch === 'g') &&
				(next === 'u' || next === 'ü') &&
				isVowel(lower[i + 2])
			) {
				out.push({ text: word.slice(i, i + 2), vowel: false, at: i });
				i += 2;
				continue;
			}
			out.push({ text: word[i], vowel: false, at: i });
			i++;
			continue;
		}
		out.push({ text: word[i], vowel: true, at: i });
		i++;
	}
	markGlides(out, forcedHiatus(lower));
	return out;
}

function lowerOf(unit: Unit | undefined): string {
	return unit ? unit.text.toLowerCase() : '';
}

/** Marca semivogais: i/u depois de vogal (ditongo decrescente) e o/e depois de ã/õ. */
function forcedHiatus(lower: string): number | undefined {
	const prefix = HIATUS_PREFIXES.map((p) => p.exec(lower)?.[0]).find(Boolean);
	if (!prefix) return undefined;
	const first = [...prefix].findIndex((ch) => isVowel(ch));
	return first >= 0 && HIGH.has(prefix[first + 1]) ? first + 1 : undefined;
}

function markGlides(list: Unit[], hiatusAt?: number): void {
	for (let k = 1; k < list.length; k++) {
		const prev = list[k - 1];
		const cur = list[k];
		if (!prev.vowel || !cur.vowel || prev.glide) continue;
		const p = lowerOf(prev);
		const c = lowerOf(cur);
		if (NASAL.has(p) && (c === 'o' || c === 'e')) {
			cur.glide = true;
			continue;
		}
		if (!HIGH.has(c) || ACCENTED_HIGH.has(c)) continue;
		// "iu", "ui" contam como ditongo; i/u seguido de i/u igual não.
		if (HIGH.has(p) && p === c) continue;
		if (cur.at === hiatusAt) continue;
		if (closesOwnSyllable(list, k)) continue;
		const next = lowerOf(list[k + 1]);
		// "sa-iu", "ca-iu", "cons-tru-iu": i seguido de u final forma ditongo com ele.
		if (c === 'i' && next === 'u' && !list[k + 2]?.vowel) continue;
		// "tra-i-ção", "in-tu-i-ção" (mas "fei-ção", "e-lei-ção", "cai-ça-ra"): só antes de -ção/-ções.
		if (
			c === 'i' &&
			(p === 'a' || p === 'u') &&
			next === 'ç' &&
			/^[ãõ]/u.test(lowerOf(list[k + 2]))
		)
			continue;
		cur.glide = true;
	}
}

/** i/u em hiato: seguido de nh, ou de r/l/z/m/n que fecha a sílaba (fim ou outra consoante). */
function closesOwnSyllable(list: Unit[], k: number): boolean {
	const next = list[k + 1];
	if (!next || next.vowel) return false;
	const n = lowerOf(next);
	if (n === 'nh') return true;
	if (!CODA_CLOSERS.has(n)) return false;
	const after = list[k + 2];
	// "ca-ir", "ra-iz", "a-in-da"; mas "Rai-mun-do" (m abre a sílaba seguinte)
	return !after || !after.vowel;
}

export function syllabify(word: string): string[] {
	// Compostos com hífen ("guarda-chuva", "pegá-lo"): cada parte se divide sozinha.
	if (word.includes('-')) return word.split('-').filter(Boolean).flatMap(syllabifySimple);
	return syllabifySimple(word);
}

function syllabifySimple(word: string): string[] {
	const list = units(word);
	const nuclei = list.map((u, i) => (u.vowel && !u.glide ? i : -1)).filter((i) => i >= 0);
	if (nuclei.length <= 1) return [word];
	const cuts: number[] = []; // índice da unidade que abre cada sílaba depois da primeira
	for (let n = 1; n < nuclei.length; n++) {
		const left = nuclei[n - 1];
		const right = nuclei[n];
		// Semivogais logo depois do núcleo esquerdo ficam com ele.
		let from = left + 1;
		while (from < right && list[from].vowel && list[from].glide) from++;
		const consonants = list.slice(from, right).filter((u) => !u.vowel);
		const between = right - from;
		if (between === 0 || consonants.length === 0) {
			cuts.push(from === right ? right : from);
			continue;
		}
		cuts.push(from + (between - onsetLength(list.slice(from, right))));
	}
	const syllables: string[] = [];
	let start = 0;
	for (const cut of cuts) {
		syllables.push(
			list
				.slice(start, cut)
				.map((u) => u.text)
				.join('')
		);
		start = cut;
	}
	syllables.push(
		list
			.slice(start)
			.map((u) => u.text)
			.join('')
	);
	return syllables;
}

/** Quantas consoantes do fim do grupo formam o ataque da sílaba seguinte. */
function onsetLength(group: Unit[]): number {
	if (group.length >= 2) {
		const pair = lowerOf(group[group.length - 2]) + lowerOf(group[group.length - 1]);
		if (ONSET_CLUSTERS.has(pair)) return 2;
	}
	return 1;
}

export function countSyllables(word: string): number {
	return syllabify(word).length;
}
