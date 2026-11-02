/**
 * Message for AI tools when no provider is usable (SPEC §9.L, erro 17). The upstream said only
 * "AI writing provider is unavailable" / "AI writing service not available", which left the
 * author guessing; this names the configuration. The error codes do not change.
 */
export const PROVIDER_UNAVAILABLE_MESSAGE =
	'AI writing provider is unavailable: set ANTHROPIC_API_KEY, OPENAI_API_KEY or ' +
	'OPENROUTER_API_KEY in the env block of the MCP server configuration and restart the ' +
	'client. MCP sampling is used only when the connected client offers it, and not every ' +
	'client does.';
