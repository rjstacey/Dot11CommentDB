import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const name = "errMsg";

export type ErrorMsg = {
	summary: string;
	detail: string;
};

export type ErrorsState = ErrorMsg[];

const initialState: ErrorsState = [];

export const selectErrors = (state: { [name]: ErrorsState }) => state[name];

export const errorsSlice = createSlice({
	name,
	initialState,
	reducers: {
		setError(state, action: PayloadAction<ErrorMsg>) {
			state.push(action.payload);
		},
		clearOne(state, action: PayloadAction<number | undefined>) {
			if (state.length) {
				const n = action.payload || 0;
				state.splice(n, 1);
			}
		},
		clearAll() {
			return initialState;
		},
	},
});

export const { clearOne, clearAll } = errorsSlice.actions;

type ErrorObject = {
	name: string;
	message: string;
};

function isErrorObject(error: unknown): error is ErrorObject {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		"message" in error &&
		typeof error.name === "string" &&
		typeof error.message === "string"
	);
}

export function setError(summary: string, error: any) {
	let detail: string;
	if (typeof error === "string") {
		detail = error;
	} else if (error instanceof Error) {
		detail = error.name + "\n" + error.message;
	} else if (isErrorObject(error)) {
		detail = error.name + "\n" + error.message;
	} else {
		detail = JSON.stringify(error);
	}
	return errorsSlice.actions.setError({ summary, detail });
}
