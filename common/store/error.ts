import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NetworkError } from "../lib/fetcher";

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
		}
	},
});

export const { clearOne, clearAll } = errorsSlice.actions;

export function setError(summary: string, error: any) {
	let detail: string;
	if (error instanceof NetworkError) {
		const { response } = error;
		if (typeof response === "object" && "message" in response)
			detail = response.message as string;
		else if (typeof response === "string") detail = response;
		else detail = JSON.stringify(response);
	} else if (typeof error === "string") {
		detail = error;
	} else {
		detail = error.toString();
	}
	return errorsSlice.actions.setError({ summary, detail });
}
