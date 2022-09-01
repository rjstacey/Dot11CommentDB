import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

import slice from './teleconsSlice';

import {setWebexMeetings} from './webexMeetings';

const {
	setGroupId,
	setDefaults,
	clearDefaults,
	getPending,
	getSuccess,
	getFailure,
	upsertMany,
	setMany,
	addMany,
	removeMany,
	removeAll,
	setProperty,
	setSelected,
	setPanelIsSplit
} = slice.actions;

export const setTeleconsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});

export {setProperty as setUiProperty, setSelected as setSelectedTelecons, setGroupId, upsertMany as upsertTelecons};

export const setTeleconDefaults = setDefaults;
export const clearTeleconDefaults = clearDefaults;

const baseUrl = '/api/telecons';

export const loadTelecons = ({groupId, ...params}) => 
	async (dispatch, getState) => {
		dispatch(setGroupId(groupId));
		dispatch(getPending());
		let url = baseUrl;
		if (groupId)
			url += `/${groupId}`;
		let response;
		try {
			response = await fetcher.get(url, params);
			if (!Array.isArray(response.telecons))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of telecons', error));
			return;
		}
		await dispatch(getSuccess(response.telecons));
		if (response.webexMeetings)
			await dispatch(setWebexMeetings(response.webexMeetings));
	}

export const clearTelecons = () =>
	async (dispatch, getState) => {
		dispatch(removeAll());
		dispatch(setGroupId(0));
	}

export const updateTelecons = (updates) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.patch(baseUrl, updates);
			if (!Array.isArray(response.telecons))
				throw new TypeError('Unexpected response to PATCH ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError(`Unable to update telecons`, error));
			return;
		}
		await dispatch(setMany(response.telecons));
	}

export const addTelecons = (telecons) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, telecons);
			if (!Array.isArray(response.telecons))
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add telecons:', error));
			return [];
		}
		await dispatch(addMany(response.telecons));
		return response.telecons.map(e => e.id);
	}

export const deleteTelecons = (ids) =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete telecons ${ids}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}
