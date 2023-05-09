import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { fetcher, setError } from 'dot11-components';
import type { RootState, AppThunk } from '.';

export type UserMember = {
	SAPIN: number;
	Name: string;
	Status: string;
	Email?: string;
	Access?: number;
	Permissions?: string[];
}

const dataAdapter = createEntityAdapter({
	selectId: (user: UserMember) => user.SAPIN
})

export const dataSet = 'members';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
	}),
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action: PayloadAction<UserMember[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectMembersState = (state: RootState) => state[dataSet];
export const selectMemberIds = (state: RootState) => selectMembersState(state).ids;
export const selectMemberEntities = (state: RootState) => selectMembersState(state).entities;

 
 /*
  * Actions
  */
const {getPending, getSuccess, getFailure} = slice.actions;

export const loadMembers = (): AppThunk => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/users');
			if (!response.hasOwnProperty('users') || typeof response.users !== 'object')
				throw new TypeError("Unexpected response to GET: /api/users");
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get users list', error));
			return;
		}
		dispatch(getSuccess(response.users));
	}

