/**
 * Chat-completions parameters per OpenAI model family (SPEC §9.L, erro 15). Reasoning models
 * (o-series, GPT-5 and later) reject `max_tokens` and a non-default `temperature`, and spend
 * part of the completion budget on hidden reasoning; sending the classic parameters fails or
 * returns empty text. OpenRouter ids carry an `openai/` prefix.
 */

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';
const EFFORTS: readonly string[] = ['minimal', 'low', 'medium', 'high'];

export function isReasoningModel(model: string): boolean {
	const id = model.replace(/^openai\//i, '').toLowerCase();
	if (/^o\d/.test(id)) return true;
	const gpt = /^gpt-(\d+)/.exec(id);
	return gpt !== null && Number(gpt[1]) >= 5;
}

export type OpenAICompletionParams =
	| { max_tokens: number; temperature: number }
	| { max_completion_tokens: number; reasoning_effort: ReasoningEffort };

export function openAICompletionParams(
	model: string,
	maxTokens: number,
	temperature: number
): OpenAICompletionParams {
	if (!isReasoningModel(model)) return { max_tokens: maxTokens, temperature };
	const configured = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();
	const effort = (
		configured && EFFORTS.includes(configured) ? configured : 'low'
	) as ReasoningEffort;
	return { max_completion_tokens: Math.max(maxTokens * 4, 4000), reasoning_effort: effort };
}
