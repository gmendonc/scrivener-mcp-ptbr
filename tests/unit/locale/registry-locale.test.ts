import {
	activateSkill,
	executeRegisteredHandler,
	getRegisteredTools,
	initializeSkillRegistry,
} from '../../../src/handlers/skill-registry.js';
import { LOCALE_TOOLS } from '../../../src/locale/tool-policies.js';

describe('registry applies the locale wrapper (R1.10)', () => {
	const saved = process.env.SCRIVENER_MCP_EAGER_TOOLS;
	beforeAll(() => {
		process.env.SCRIVENER_MCP_EAGER_TOOLS = '1';
		initializeSkillRegistry();
	});
	afterAll(() => {
		if (saved === undefined) delete process.env.SCRIVENER_MCP_EAGER_TOOLS;
		else process.env.SCRIVENER_MCP_EAGER_TOOLS = saved;
	});

	it('adds language exactly to LOCALE_TOOLS', () => {
		const tools = getRegisteredTools();
		const withLanguage = tools
			.filter((t) => 'language' in (t.inputSchema.properties ?? {}))
			.map((t) => t.name)
			.sort();
		expect(withLanguage).toEqual(Object.keys(LOCALE_TOOLS).sort());
	});

	it('registers set_project_language', () => {
		expect(getRegisteredTools().map((t) => t.name)).toContain('set_project_language');
	});

	it('advertises the wrapped schemas through use_skill too', async () => {
		const result = await executeRegisteredHandler(
			'use_skill',
			{ name: 'analysis' },
			{ project: null, memoryManager: null, contentAnalyzer: {} as never }
		);
		const tools = (
			result.structuredContent as {
				tools: Array<{ name: string; inputSchema: { properties: object } }>;
			}
		).tools;
		const style = tools.find((t) => t.name === 'check_style_local');
		expect(style?.inputSchema.properties).toHaveProperty('language');
	});

	it('keeps tool identity stable across activations', () => {
		for (const skill of ['project', 'analysis', 'search', 'compilation', 'advanced']) {
			expect(activateSkill(skill)).toBe(false);
		}
	});
});
