import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import * as narrativeLens from '../../../src/locale/engines/narrative-lens.js';
import * as bluepencil from '../../../src/locale/engines/bluepencil.js';
import * as compromise from '../../../src/locale/engines/compromise.js';
import * as compromisePos from '../../../src/locale/engines/compromise-pos.js';
import * as textMetrics from '../../../src/locale/engines/text-metrics.js';

const ROOT = join(__dirname, '..', '..', '..');

const FACADES: Record<string, object> = {
	'narrative-lens': narrativeLens,
	bluepencil,
	compromise,
	'compromise-pos': compromisePos,
	'text-metrics': textMetrics,
};

const imported = JSON.parse(
	execFileSync(
		process.execPath,
		[join(ROOT, 'scripts', 'locale', 'check-locale-tools.mjs'), '--list-imports'],
		{ encoding: 'utf8' }
	)
) as Record<string, string[]>;

describe('facades export what upstream imports (R1.5)', () => {
	it('lists every facade', () => {
		expect(Object.keys(imported).sort()).toEqual(Object.keys(FACADES).sort());
	});

	it.each(Object.keys(FACADES))('%s', (facade) => {
		const exported = Object.keys(FACADES[facade]);
		for (const name of imported[facade]) expect(exported).toContain(name);
	});
});
