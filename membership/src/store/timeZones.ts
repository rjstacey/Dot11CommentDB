import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetcher, setError } from "dot11-components";
import type { RootState, AppThunk } from ".";

type TimeZonesState = {
	loading: boolean;
	valid: boolean;
	timeZones: string[];
	timeZone: string;
};

const initialState: TimeZonesState = {
	loading: false,
	valid: false,
	timeZones: [],
	timeZone: "America/New_York",
};

/* Create slice */
const dataSet = "timeZones";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
		},
		getSuccess(state, action: PayloadAction<string[]>) {
			state.loading = false;
			state.valid = true;
			state.timeZones = action.payload;
		},
		getFailure(state) {
			state.loading = false;
		},
		setTimezone(state, action: PayloadAction<string>) {
			state.timeZone = action.payload;
		},
	},
});

export default slice;

/* Slice actions */
const { getSuccess, getPending, getFailure, setTimezone } = slice.actions;
export { setTimezone };

/* Selectors */
export const selectTimeZonesState = (state: RootState) => state[dataSet];

/* Thunk actions */
function validResponse(response: any): response is string[] {
	return (
		Array.isArray(response) && response.every((t) => typeof t === "string")
	);
}

export const loadTimeZones = (): AppThunk => (dispatch) => {
	dispatch(getPending());
	const url = "/api/timeZones";
	return fetcher
		.get(url)
		.then((response: any) => {
			if (!validResponse(response))
				throw new TypeError("Unexpected response to GET " + url);
			dispatch(getSuccess(response));
		})
		.catch((error: any) => {
			dispatch(getFailure());
			dispatch(setError("Unable to get time zones list", error));
		});
};
