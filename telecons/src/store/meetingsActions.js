import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

import slice from './meetingsSlice';

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

export const setMeetingsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});

export {
	setProperty as setUiProperty,
	setSelected as setSelectedMeetings,
	toggleSelected as toggleSelectedMeetings,
	setSelectedSlots,
	toggleSelectedSlots,
	upsertMany as upsertMeetings
}

const baseUrl = '/api/meetings';

export const loadMeetings = (groupId, constraints) => 
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
			dispatch(setError('Unable to get list of meetings', error));
			return;
		}
		await dispatch(getSuccess(response.meetings));
		if (response.webexMeetings)
			await dispatch(setWebexMeetings(response.webexMeetings));
	}

export const clearMeetings = () =>
	async (dispatch) => {
		dispatch(removeAll());
	}

export const updateMeetings = (updates) =>
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
		if (response.webexMeetings)
			await dispatch(upsertWebexMeetings(response.webexMeetings));
	}

export const addMeetings = (meetings) =>
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

export const deleteMeetings = (ids) =>
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
