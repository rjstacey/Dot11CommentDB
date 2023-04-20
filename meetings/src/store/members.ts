import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';
import type { RootState, AppThunk } from '.';

import {fetcher, setError} from 'dot11-components';

export interface Member {
	SAPIN: number;
	Name: string;
	Email: string;
	Permissions: Array<string>;
	Status: string;
};

const dataAdapter = createEntityAdapter<Member>({
	selectId: (user) => user.SAPIN
});

const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});

export const dataSet = 'members';

const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
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
export const selectMembersState = (state: RootState) => state[dataSet];

export const selectMember = (state: RootState, sapin: number) => selectMembersState(state).entities[sapin];

export const selectMemberName = (state: RootState, sapin: number) => {
	const m = selectMember(state, sapin);
	return m? m.Name: 'Unknown';
}

 /*
  * Actions
  */
const {getPending, getSuccess, getFailure} = slice.actions;

const url = '/api/users';

export const loadMembers = (): AppThunk => 
	async (dispatch) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response.users))
				throw new TypeError("Unexpected response to GET: " + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get users list', error));
			return;
		}
		dispatch(getSuccess(response.users));
	}

