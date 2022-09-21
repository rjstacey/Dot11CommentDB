import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';

import {fetcher} from 'dot11-components/lib';
import {setError} from 'dot11-components/store/error';

const dataAdapter = createEntityAdapter({
	selectId: (user) => user.SAPIN
})

export const dataSet = 'members';

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
 * Reducer
 */
export default slice;

/*
 * Selectors
 */
export const selectMembersState = (state) => state[dataSet];

export const selectMember = (state, sapin) => selectMembersState(state).entities[sapin];

export const selectMemberName = (state, sapin) => {
	const m = selectMember(state, sapin);
	return m? m.Name: 'Unknown';
}

 /*
  * Actions
  */
const {getPending, getSuccess, getFailure} = slice.actions;

const url = '/api/users';

export const loadMembers = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response.users))
				throw new TypeError("Unexpected response to GET: " + url);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get users list', error));
			return;
		}
		await dispatch(getSuccess(response.users));
	}

