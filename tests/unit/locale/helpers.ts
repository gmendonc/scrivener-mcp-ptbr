import { loadDataset } from '../../../src/locale/pt-BR/data/loader.js';

/**
 * `describe` that runs only when the datasets are fetched (SPEC §11.3); otherwise it becomes
 * `describe.skip` and says how to fetch them, so tests never depend on downloaded data in CI
 * runs that skipped `fetch-data.mjs`.
 */
export function describeWithData(ids: readonly string[], name: string, fn: () => void): void {
	const missing = ids.filter((id) => !loadDataset(id));
	if (!missing.length) {
		describe(name, fn);
		return;
	}
	describe.skip(
		`${name} [missing data: ${missing.join(', ')}; run node scripts/locale/fetch-data.mjs]`,
		fn
	);
}
