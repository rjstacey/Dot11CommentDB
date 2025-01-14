// eslint-disable-next-line
export const parseNumber = (value: any) => {
	// Return the value as-is if it's already a number
	if (typeof value === "number") return value;

	// Build regex to strip out everything except digits, decimal point and minus sign
	const regex = new RegExp("[^0-9-.]", "g");
	const unformatted = parseFloat(("" + value).replace(regex, ""));

	// This will fail silently
	return !isNaN(unformatted) ? unformatted : 0;
};

// eslint-disable-next-line
export const isPlainObject = (obj: unknown): obj is Record<string, any> =>
	obj !== null &&
	typeof obj == "object" &&
	Object.getPrototypeOf(obj) == Object.prototype;
