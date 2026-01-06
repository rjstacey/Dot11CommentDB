import { PollingOK, PollingError } from "@schemas/poll.js";

type CallbackFunction = (response: unknown) => void;

export function validCallback(callback: unknown): callback is CallbackFunction {
	if (typeof callback === "function") return true;
	console.warn("Bad callback");
	return false;
}

export function okCallback<T extends object>(
	callback: CallbackFunction,
	data?: T
) {
	callback({ status: "OK", ...data } satisfies PollingOK);
}

export function errorCallback(callback: CallbackFunction, error: unknown) {
	console.log(error);
	let errorObj: { name: string; message: string };
	if (error instanceof Error) {
		errorObj = {
			name: error.name,
			message: error.message,
		};
	} else {
		errorObj = {
			name: "ServerError",
			message: "Unknown",
		};
	}
	callback({ status: "Error", error: errorObj } satisfies PollingError);
}
