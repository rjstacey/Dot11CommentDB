import {createSlice} from '@reduxjs/toolkit'
import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

export const dataSet = 'permissions';

const slice = createSlice({
	name: dataSet,
	initialState: {
		loading: false,
		valid: false,
		permissions: [],
	},
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			state.permissions = action.payload;
		},
		getFailure(state, action) {
			state.loading = false;
		},
	}
});

export default slice;

/*
 * Selectors
 */
export const selectPermissionsState = (state) => state[dataSet];
export const selectPermissions = (state) => selectPermissionsState(state).permissions;

/*
 * Actions
 */
const {getSuccess, getPending, getFailure} = slice.actions;

const url = '/api/permissions';

export const loadPermissions = () =>
	async (dispatch, getState) => {
		await dispatch(getPending());
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
		await dispatch(getSuccess(permissions));
	}
