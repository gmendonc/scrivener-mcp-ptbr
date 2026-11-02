import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const SPOOL_DIR_ENV = 'SCRIVENER_MCP_SPOOL_DIR';

/**
 * Where large results spill (SPEC §9.L, erro 21). The upstream always used `os.tmpdir()`,
 * which sandboxed clients cannot read; `SCRIVENER_MCP_SPOOL_DIR` points it at a folder the
 * client can reach. The per-process `scrivener-mcp-spool-*` directory is still created inside.
 */
export function spoolBaseDir(): string {
	const configured = process.env[SPOOL_DIR_ENV]?.trim();
	if (!configured) return os.tmpdir();
	const dir = path.resolve(configured);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}
