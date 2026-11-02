import type { BinderContainer, BinderItem } from '../types/internal.js';
import type { ScrivenerDocument } from '../types/index.js';
import {
	addBinderChild,
	addBinderItem,
	findBinderItemById,
	iterateBinderItems,
	removeBinderItem,
} from '../services/document-manager-helpers.js';
import { generateScrivenerUUID } from '../utils/scrivener-utils.js';

/**
 * Native Scrivener trash for delete and restore (SPEC §9.L, erros 8 e 10). The upstream
 * `BinderEditor` parked deleted items under `<Binder><SearchResults>` and looked for them only
 * there, so the real `TrashFolder` stayed empty and items trashed in Scrivener could not be
 * restored.
 */

export function findNativeTrash(binder: BinderContainer): BinderItem | undefined {
	for (const item of iterateBinderItems(binder)) if (item.Type === 'TrashFolder') return item;
	return undefined;
}

/** Puts `item` at the end of the `TrashFolder`, creating one at the end of the binder if absent. */
export function moveToNativeTrash(binder: BinderContainer, item: BinderItem): void {
	let trash = findNativeTrash(binder);
	if (!trash) {
		trash = { UUID: generateScrivenerUUID(), Type: 'TrashFolder', Title: 'Trash' };
		addBinderItem(binder, trash);
	}
	addBinderChild(trash, item);
}

/**
 * True when `id` is the TrashFolder or lies inside it. A restore target there is invalid: with
 * the trash inside the binder tree, restoring a folder into itself (or into another trashed
 * folder) would detach it from the binder and lose it on the next save.
 */
export function isInTrash(binder: BinderContainer, id: string): boolean {
	const trash = findNativeTrash(binder);
	if (!trash) return false;
	if (trash.UUID === id || (trash as { ID?: string }).ID === id) return true;
	return trash.Children ? findBinderItemById(trash.Children, id) !== undefined : false;
}

/** True when neither the TrashFolder nor a legacy `SearchResults` container holds anything. */
export function trashIsEmpty(binder: BinderContainer): boolean {
	const legacy = binder.SearchResults;
	const containers = [
		findNativeTrash(binder)?.Children,
		...(Array.isArray(legacy) ? legacy : legacy ? [legacy] : []).map((r) => r.Children),
	];
	return containers.every((c) => !c || [...iterateBinderItems(c)].filter(Boolean).length === 0);
}

/**
 * Removes `documentId` from the trash and returns it: the `TrashFolder` first, then the
 * legacy `SearchResults` containers written by earlier versions of this server.
 */
export function takeFromTrash(binder: BinderContainer, documentId: string): BinderItem | undefined {
	const trash = findNativeTrash(binder);
	const fromTrash = trash?.Children ? removeBinderItem(trash.Children, documentId) : undefined;
	if (fromTrash) return fromTrash;
	const legacy = binder.SearchResults;
	for (const results of Array.isArray(legacy) ? legacy : legacy ? [legacy] : []) {
		const removed = results.Children
			? removeBinderItem(results.Children, documentId)
			: undefined;
		if (removed) return removed;
	}
	return undefined;
}

/**
 * Every document inside the trash, flattened. The upstream `getTrashDocuments` scanned only
 * the top level of the binder tree, so it listed the TrashFolder itself and never its contents.
 */
export function trashedDocuments(tree: ScrivenerDocument[]): ScrivenerDocument[] {
	const out: ScrivenerDocument[] = [];
	const walk = (nodes: ScrivenerDocument[]) => {
		for (const node of nodes) {
			out.push(node);
			if (node.children?.length) walk(node.children);
		}
	};
	// The declared type omits the native folder types the tree carries at runtime.
	for (const root of tree) if ((root.type as string) === 'TrashFolder') walk(root.children ?? []);
	return out;
}
