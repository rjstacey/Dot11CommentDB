import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import {setError} from 'dot11-components/store/error'

const dataAdapter = createEntityAdapter({})

export const dataSet = 'webexAccounts'

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
		updateOne(state, action) {
			dataAdapter.updateOne(state, action.payload);
		},
		addOne(state, action) {
			dataAdapter.addOne(state, action.payload);
		},
		removeOne(state, action) {
			dataAdapter.removeOne(state, action.payload);
		},
	},
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadWebexAccounts = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = '/api/webex/accounts';
		let telecons;
		try {
			telecons = await fetcher.get(url);
			if (!Array.isArray(telecons))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of webex accounts', error));
			return;
		}
		await dispatch(getSuccess(telecons));
	}

const {updateOne} = slice.actions;

export const updateWebexAccount = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `/api/webex/account/${id}`;
		let updates;
		try {
			updates = await fetcher.patch(url, changes);
			if (typeof updates !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update webex account`, error));
			return;
		}
		await dispatch(updateOne({id, updates}));
	}

const {addOne} = slice.actions;

export const addWebexAccount = (account) =>
	async (dispatch) => {
		const url = `/api/webex/account`;
		let newAccount;
		try {
			newAccount = await fetcher.post(url, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to add webex account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

const {removeOne} = slice.actions;

export const deleteWebexAccount = (id) =>
	async (dispatch) => {
		await dispatch(removeOne(id));
		try {
			const url = `/api/webex/account/${id}`;
			await fetcher.delete(url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete webex account`, error));
		}
	}

export const authWebexAccount = (id, code, redirect_uri) =>
	async (dispatch) => {
		let updates;
		try {
			const url = `/api/webex/auth/${id}`;
			updates = await fetcher.post(url, {code, redirect_uri});
			if (typeof updates !== 'object')
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to authorize webex account`, error));
			return;
		}
		await dispatch(updateOne({id, updates}));
	}
