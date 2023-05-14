/**
 * Compare two objects and return an object that only has properties that differ
 *
 * @param original - object with original content
 * @param modified - object with modified content
 * @returns object with content from modified that differs from original
 */
export function shallowDiff(original: {}, modified: {}) {
	const changes = {};
	for (let key in modified)
		if (modified[key] !== original[key])
			changes[key] = modified[key];
	return changes;
}

/**
 * Compare content of two objects
 * 
 * @param object first object
 * @param object second object
 * @returns true if content of first object matches content of second object
 */
export function shallowEqual(o1: object, o2: object): boolean {
	for (let key in o1)
		if (o2[key] !== o1[key])
			return false;
	return true;
}
