import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppThunk } from '.';

import { fetcher, setError } from 'dot11-components';

export const dataSet = 'timeZones';

interface TimeZonesState {
	loading: boolean;
	valid: boolean;
	timeZones: Array<string>;
	timeZone: string;
}

const initialState: TimeZonesState = {
	loading: false,
	valid: false,
	timeZones: [],
	timeZone: 'America/New_York'
};

const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state: TimeZonesState) {
			state.loading = true;
		},
		getSuccess(state: TimeZonesState, action: PayloadAction<Array<string>>) {
			state.loading = false;
			state.valid = true;
			state.timeZones = action.payload;
		},
		getFailure(state: TimeZonesState) {
			state.loading = false;
		},
		setTimezone(state: TimeZonesState, action: PayloadAction<string>) {
			state.timeZone = action.payload;
		}
	}
});

export default slice;

/*
 * Selectors
 */
export const selectTimeZonesState = (state: RootState): TimeZonesState => state[dataSet];

/*
 * Actions
 */
const {getSuccess, getPending, getFailure, setTimezone} = slice.actions;

const url = '/api/timeZones';

export const loadTimeZones = (): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		let timeZones;
		try {
			timeZones = await fetcher.get(url);
			if (!Array.isArray(timeZones))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get time zones list', error))
			])
			return;
		}
		dispatch(getSuccess(timeZones));
	}

export {setTimezone};

