import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

import slice from './teleconsSlice';

import {setWebexMeetings, upsertWebexMeetings} from './webexMeetings';

const {
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
	toggleSelected,
	setSelectedSlots,
	toggleSelectedSlots,
	setPanelIsSplit
} = slice.actions;

export const setTeleconsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});

export {
	setProperty as setUiProperty,
	setSelected as setSelectedTelecons,
	toggleSelected as toggleSelectedTelecons,
	setSelectedSlots,
	toggleSelectedSlots,
	upsertMany as upsertTelecons
}

const baseUrl = '/api/meetings';

export const loadTelecons = (groupId, constraints) => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let url = baseUrl;
		if (groupId)
			url += `/${groupId}`;
		let response;
		try {
			response = await fetcher.get(url, constraints);
			if (!Array.isArray(response.meetings))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of telecons', error));
			return;
		}
		await dispatch(getSuccess(response.meetings));
		if (response.webexMeetings)
			await dispatch(setWebexMeetings(response.webexMeetings));
	}

export const clearTelecons = () =>
	async (dispatch, getState) => {
		dispatch(removeAll());
	}

export const updateTelecons = (updates) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.patch(baseUrl, updates);
			if (!Array.isArray(response.meetings))
				throw new TypeError('Unexpected response to PATCH ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError(`Unable to update meetings`, error));
			return;
		}
		await dispatch(setMany(response.meetings));
	}

export const addTelecons = (meetings) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, meetings);
			if (!Array.isArray(response.meetings))
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add meetings:', error));
			return [];
		}
		await dispatch(addMany(response.meetings));
		if (response.webexMeetings)
			await dispatch(upsertWebexMeetings(response.webexMeetings));
		return response.meetings.map(e => e.id);
	}

export const deleteTelecons = (ids) =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete meetings ${ids}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}
