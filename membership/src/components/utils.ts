export function hasChangesStyle<O extends object>(
	edited: O,
	saved: O | undefined,
	dataKey: keyof O
) {
	return !saved || edited[dataKey] !== saved[dataKey]
		? { backgroundColor: "#ffff003d" }
		: undefined;
}
