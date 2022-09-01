import {createSlice} from '@reduxjs/toolkit'
import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

export const dataSet = 'timeZones';

const slice = createSlice({
	name: dataSet,
	initialState: {
		loading: false,
		valid: false,
		timeZones: [],
		timeZone: 'America/New_York'
	},
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			state.timeZones = action.payload;
		},
		getFailure(state, action) {
			state.loading = false;
		},
		setTimezone(state, action) {
			state.timeZone = action.payload;
		}
	}
});

export default slice;

/*
 * Selectors
 */
export const selectTimeZonesState = (state) => state[dataSet];

/*
 * Actions
 */
const {getSuccess, getPending, getFailure, setTimezone} = slice.actions;

const url = '/api/timeZones';

export const loadTimeZones = () =>
	async (dispatch, getState) => {
		await dispatch(getPending());
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
		await dispatch(getSuccess(timeZones));
	}

export {setTimezone};

