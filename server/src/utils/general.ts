export const parseNumber = (value: any) => {
	// Return the value as-is if it's already a number
	if (typeof value === "number") return value;

	// Build regex to strip out everything except digits, decimal point and minus sign
	let regex = new RegExp("[^0-9-.]", "g");
	let unformatted = parseFloat(("" + value).replace(regex, ""));

	// This will fail silently
	return !isNaN(unformatted) ? unformatted : 0;
};

export const isPlainObject = (obj: any) =>
	obj !== null &&
	typeof obj == "object" &&
	Object.getPrototypeOf(obj) == Object.prototype;
