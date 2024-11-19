import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from ".";

import { fetcher, setError } from "dot11-components";

interface TimeZonesState {
	loading: boolean;
	valid: boolean;
	timeZones: Array<string>;
	timeZone: string;
	lastLoad: string | null;
}

const initialState: TimeZonesState = {
	loading: false,
	valid: false,
	timeZones: [],
	timeZone: "America/New_York",
	lastLoad: null,
};

const dataSet = "timeZones";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state: TimeZonesState) {
			state.loading = true;
			state.lastLoad = new Date().toISOString();
		},
		getSuccess(
			state: TimeZonesState,
			action: PayloadAction<Array<string>>
		) {
			state.loading = false;
			state.valid = true;
			state.timeZones = action.payload;
		},
		getFailure(state: TimeZonesState) {
			state.loading = false;
			state.lastLoad = null;
		},
		setTimezone(state: TimeZonesState, action: PayloadAction<string>) {
			state.timeZone = action.payload;
		},
	},
});

export default slice;

/* Slice actions */
const { getSuccess, getPending, getFailure, setTimezone } = slice.actions;

/* Selectors */
export const selectTimeZonesState = (state: RootState): TimeZonesState =>
	state[dataSet];
export const selectDefaultTimeZone = (state: RootState) =>
	selectTimeZonesState(state).timeZone;
export const selectTimeZonesAge = (state: RootState) => {
	let lastLoad = selectTimeZonesState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

const url = "/api/timeZones";
export const loadTimeZones = (): AppThunk => async (dispatch, getState) => {
	const age = selectTimeZonesAge(getState());
	if (age && age < AGE_STALE) return;
	dispatch(getPending());
	let timeZones;
	try {
		timeZones = await fetcher.get(url);
		if (!Array.isArray(timeZones))
			throw new TypeError("Unexpected response to GET " + url);
	} catch (error) {
		dispatch(getFailure());
		dispatch(setError("Unable to get time zones list", error));
		return;
	}
	dispatch(getSuccess(timeZones));
};

export { setTimezone };
