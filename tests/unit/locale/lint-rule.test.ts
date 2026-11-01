import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
// O script JS pelo próprio Node: no Windows, node_modules/.bin/eslint é um .cmd que o
// spawnSync sem shell não executa.
const ESLINT = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');

interface LintResult {
	messages: Array<{ ruleId: string | null }>;
}

// O código vai por stdin: um arquivo temporário em src/ com import nativo faria o
// check-native-escapes, rodando em paralelo, falhar. Sem arquivo em disco, o programa
// TypeScript não o contém, então o `project` do parser é desligado (a regra não usa tipos).
function lint(filename: string, source: string): string[] {
	const result = spawnSync(
		process.execPath,
		[
			ESLINT,
			'--stdin',
			'--stdin-filename',
			filename,
			'--parser-options=project:false',
			'--format',
			'json',
		],
		{ cwd: ROOT, input: source, encoding: 'utf8' }
	);
	if (result.error) throw result.error;
	if (!result.stdout) throw new Error(`eslint exited ${result.status}: ${result.stderr}`);
	const [report] = JSON.parse(result.stdout) as LintResult[];
	return report.messages.map((m) => m.ruleId ?? 'parse-error');
}

const VALUE_IMPORT =
	"import { checkStyle } from 'bluepencil-node';\nexport const f = checkStyle;\n";
const TYPE_IMPORT =
	"import type { StyleReport } from 'bluepencil-node';\nexport type R = StyleReport;\n";

describe('lint rule against native imports (R1.3)', () => {
	it('flags a value import outside the facades', () => {
		expect(lint('src/__probe__.ts', VALUE_IMPORT)).toEqual(['no-restricted-imports']);
	});

	it('allows a type-only import', () => {
		expect(lint('src/__probe__.ts', TYPE_IMPORT)).toEqual([]);
	});

	it('allows the value import inside src/locale/engines/', () => {
		expect(lint('src/locale/engines/__probe__.ts', VALUE_IMPORT)).toEqual([]);
	});

	it('restricts the neutral compromise re-export to text-metrics', () => {
		const source = "import nlp from './locale/engines/compromise.js';\nexport const f = nlp;\n";
		expect(lint('src/__probe__.ts', source)).toEqual(['no-restricted-imports']);
		const allowed =
			"import nlp from '../locale/engines/compromise.js';\nexport const f = nlp;\n";
		expect(lint('src/utils/text-metrics.ts', allowed)).toEqual([]);
	});
});
