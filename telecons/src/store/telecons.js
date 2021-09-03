import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import {setError} from 'dot11-components/store/error'

const dataAdapter = createEntityAdapter({})

const dataSet = 'telecons'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state, action) {
			state.loading = false;
		},
	},
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadTelecons = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let telecons;
		try {
			telecons = await fetcher.get('/api/telecons');
			if (!Array.isArray(telecons))
				throw new TypeError("Unexpected response to GET: /api/telecons");
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of telecons', error));
			return;
		}
		await dispatch(getSuccess(telecons));
	}
