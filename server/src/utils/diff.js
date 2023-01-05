/*
 * Compare two objects and return an object that only has properties that differ
 *
 * @param original - object with original content
 * @param modified - object with modified content
 * @returns changes - object with content from modified that differs from original
 */
export function shallowDiff(original, modified) {
	const changes = {};
	for (let key in modified)
		if (modified[key] !== original[key])
			changes[key] = modified[key];
	return changes;
}
