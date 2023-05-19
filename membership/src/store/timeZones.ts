import {createSlice, PayloadAction} from '@reduxjs/toolkit'
import {fetcher, setError} from 'dot11-components';
import type {RootState, AppThunk} from '.';

export const dataSet = 'timeZones';

type TimeZonesState = {
	loading: boolean;
	valid: boolean;
	timeZones: string[];
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
		}
	}
});

export default slice;

/*
 * Selectors
 */
export const selectTimeZonesState = (state: RootState) => state[dataSet];

/*
 * Actions
 */
const {getSuccess, getPending, getFailure, setTimezone} = slice.actions;

const url = '/api/timeZones';

function validResponse(response: any): response is string[] {
	return Array.isArray(response) && response.every(t => typeof t === 'string');
}

export const loadTimeZones = (): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		let timeZones: any;
		try {
			timeZones = await fetcher.get(url);
			if (!validResponse(timeZones))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch (error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get time zones list', error));
			return;
		}
		dispatch(getSuccess(timeZones));
	}

export {setTimezone};

