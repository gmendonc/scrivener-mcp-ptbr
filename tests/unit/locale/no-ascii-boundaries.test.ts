import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const PT_BR = join(ROOT, 'src', 'locale', 'pt-BR');

function* tsFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* tsFiles(path);
		else if (entry.name.endsWith('.ts')) yield path;
	}
}

/** `\b` e `\w` são ASCII em JS mesmo com a flag `u`: "única" não casa `\búnica\b`. */
function asciiBoundaries(source: string): string[] {
	const found: string[] = [];
	// Numa string, '\\w' vira \w no RegExp; por isso a forma escapada também conta.
	for (const match of source.matchAll(/\\+[bwBW]/g)) {
		const line = source.slice(0, match.index).split('\n').length;
		found.push(`line ${line}: ${match[0]}`);
	}
	return found;
}

describe('no ASCII word boundaries in pt-BR code (R1.12)', () => {
	it('detects the forbidden escapes', () => {
		expect(asciiBoundaries(String.raw`const re = /\bnão\b/u;`)).toHaveLength(2);
		expect(asciiBoundaries(String.raw`new RegExp('\\w+')`)).toHaveLength(1);
		expect(asciiBoundaries(String.raw`new RegExp("\w+")`)).toHaveLength(1);
		expect(asciiBoundaries(String.raw`/(?<![\p{L}\p{N}_])não(?![\p{L}\p{N}_])/u`)).toEqual([]);
	});

	it('finds none under src/locale/pt-BR', () => {
		const offenders = [...tsFiles(PT_BR)].flatMap((file) =>
			asciiBoundaries(readFileSync(file, 'utf8')).map(
				(hit) => `${relative(ROOT, file)} ${hit}`
			)
		);
		expect(offenders).toEqual([]);
	});
});
