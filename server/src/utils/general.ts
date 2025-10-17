// eslint-disable-next-line
export const isPlainObject = (obj: unknown): obj is Record<string, any> =>
	obj !== null &&
	typeof obj == "object" &&
	Object.getPrototypeOf(obj) == Object.prototype;
