/** Folder types that can hold binder items as a move or restore target (erro 7). */
export const CONTAINER_TYPES: ReadonlySet<string> = new Set([
	'Folder',
	'DraftFolder',
	'ResearchFolder',
]);

export function isContainerType(type: string | undefined): boolean {
	return type !== undefined && CONTAINER_TYPES.has(type);
}

/**
 * After removing a container's only child, drop the key instead of setting it to `null`: the
 * upstream wrote `null`, which xml2js serializes as an empty `<BinderItem/>` with no UUID.
 */
export function dropEmptyBinderItem(
	container: { BinderItem?: unknown },
	remaining: readonly unknown[]
): void {
	if (remaining.length) container.BinderItem = remaining[0];
	else delete container.BinderItem;
}
