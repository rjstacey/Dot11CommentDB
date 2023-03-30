import {createSlice} from '@reduxjs/toolkit'
import {fetcher, setError} from 'dot11-components';
import type {RootState, AppThunk} from '.';

export const dataSet = 'permissions';

export type Permission = {
	scope: string;
	description: string;
};

type PermissionsState = {
	loading: boolean;
	valid: boolean;
	permissions: Permission[];
}

const initialState: PermissionsState = {
	loading: false,
	valid: false,
	permissions: [],
}

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
			state.permissions = action.payload;
		},
		getFailure(state) {
			state.loading = false;
		},
	}
});

export default slice;

/*
 * Selectors
 */
export const selectPermissionsState = (state: RootState) => state[dataSet];
export const selectPermissions = (state: RootState) => selectPermissionsState(state).permissions;

/*
 * Actions
 */
const {getSuccess, getPending, getFailure} = slice.actions;

const url = '/api/permissions';

export const loadPermissions = (): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		let permissions;
		try {
			permissions = await fetcher.get(url);
			if (!Array.isArray(permissions))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get permissions list', error));
			return;
		}
		dispatch(getSuccess(permissions));
	}
