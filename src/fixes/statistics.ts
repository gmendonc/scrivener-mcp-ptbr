import * as path from 'path';
import type { ProjectStatistics, ScrivenerDocument } from '../types/index.js';

/**
 * Fills the `get_statistics` fields the upstream declares but never computes (SPEC §9.L,
 * erro 12): per-folder counts, characters and a title fallback. `draftDocuments`,
 * `researchDocuments` and `trashedDocuments` count every non-folder item under the
 * DraftFolder, ResearchFolder and TrashFolder; `totalCharacters` is the length of the decoded
 * plain text of each text document outside the trash, the same set `totalWords` counts.
 */

const FOLDER_TYPES = new Set(['Folder', 'DraftFolder', 'ResearchFolder', 'TrashFolder']);

export interface StatisticsContext {
	/** Binder tree without the trash (what the upstream aggregates). */
	tree: ScrivenerDocument[];
	/** Binder tree with the trash. */
	treeWithTrash: ScrivenerDocument[];
	readDocument: (documentId: string) => Promise<string>;
	projectPath: string;
}

export async function completeStatistics(
	stats: ProjectStatistics,
	context: StatisticsContext
): Promise<ProjectStatistics> {
	stats.draftDocuments = countUnder(context.tree, 'DraftFolder');
	stats.researchDocuments = countUnder(context.tree, 'ResearchFolder');
	stats.trashedDocuments = countUnder(context.treeWithTrash, 'TrashFolder');
	stats.totalCharacters = 0;
	for (const doc of walk(context.tree)) {
		if (doc.type !== 'Text') continue;
		try {
			stats.totalCharacters += (await context.readDocument(doc.id)).length;
		} catch {
			// Unreadable documents count as zero, as they do for words.
		}
	}
	stats.metadata = { ...stats.metadata, title: stats.metadata?.title || bundleTitle(context) };
	return stats;
}

/** Project name from the `.scriv` bundle, used when Scrivener stores no title. */
function bundleTitle(context: StatisticsContext): string {
	return path.basename(context.projectPath).replace(/\.scriv$/i, '');
}

function countUnder(tree: ScrivenerDocument[], folderType: string): number {
	let count = 0;
	for (const root of tree.filter((node) => node.type === folderType))
		for (const doc of walk(root.children ?? [])) if (!FOLDER_TYPES.has(doc.type)) count++;
	return count;
}

function* walk(nodes: ScrivenerDocument[]): Generator<ScrivenerDocument> {
	for (const node of nodes) {
		yield node;
		if (node.children?.length) yield* walk(node.children);
	}
}
