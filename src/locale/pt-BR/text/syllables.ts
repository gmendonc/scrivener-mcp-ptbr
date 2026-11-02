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
}

/** Letras → unidades: consoantes (dígrafos juntos) e vogais. */
function units(word: string): Unit[] {
	const lower = word.toLowerCase();
	const out: Unit[] = [];
	let i = 0;
	while (i < lower.length) {
		const ch = lower[i];
		const next = lower[i + 1];
		if (!isVowel(ch)) {
			const pair = ch + (next ?? '');
			if (pair === 'ch' || pair === 'lh' || pair === 'nh') {
				out.push({ text: word.slice(i, i + 2), vowel: false });
				i += 2;
				continue;
			}
			// qu e gu antes de vogal: o u pertence ao ataque ("que", "guerra", "quatro", "água").
			if (
				(ch === 'q' || ch === 'g') &&
				(next === 'u' || next === 'ü') &&
				isVowel(lower[i + 2])
			) {
				out.push({ text: word.slice(i, i + 2), vowel: false });
				i += 2;
				continue;
			}
			out.push({ text: word[i], vowel: false });
			i++;
			continue;
		}
		out.push({ text: word[i], vowel: true });
		i++;
	}
	markGlides(out);
	return out;
}

function lowerOf(unit: Unit | undefined): string {
	return unit ? unit.text.toLowerCase() : '';
}

/** Marca semivogais: i/u depois de vogal (ditongo decrescente) e o/e depois de ã/õ. */
function markGlides(list: Unit[]): void {
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
		if (closesOwnSyllable(list, k)) continue;
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
