import {fetcher, isObject} from 'dot11-components/lib';
import {setError} from 'dot11-components/store/error';

import slice from './meetingsSlice';

import {setWebexMeetings, upsertWebexMeetings} from './webexMeetings';
import {setBreakouts, upsertBreakouts} from './imatBreakouts';

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
	setUiProperties,
	setSelected,
	toggleSelected,
	setSelectedSlots,
	toggleSelectedSlots,
	setPanelIsSplit
} = slice.actions;

export const setMeetingsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});

export {
	setProperty as setUiProperty,
	setUiProperties,
	setSelected as setSelectedMeetings,
	toggleSelected as toggleSelectedMeetings,
	setSelectedSlots,
	toggleSelectedSlots,
	upsertMany as upsertMeetings
}

const baseUrl = '/api/meetings';

function validateResponse(method, response) {
	if (!isObject(response) ||
		!Array.isArray(response.meetings) ||
		(response.webexMeetings && !Array.isArray(response.webexMeetings)) ||
		(response.breakouts && !Array.isArray(response.breakouts))) {
		throw new TypeError(`Unexpected response to ${method} ${baseUrl}`);
	}
}

export const loadMeetings = (constraints) => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(baseUrl, constraints);
			validateResponse('GET', response);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of meetings', error));
			return;
		}
		const {meetings, webexMeetings, breakouts} = response;
		await dispatch(getSuccess(meetings));
		if (webexMeetings)
			await dispatch(setWebexMeetings(webexMeetings));
		if (breakouts)
			await dispatch(setBreakouts(breakouts));
	}

export const clearMeetings = () =>
	(dispatch) => {
		dispatch(removeAll());
	}

export const updateMeetings = (updates) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.patch(baseUrl, updates);
			validateResponse('PATCH', response);
		}
		catch(error) {
			await dispatch(setError(`Unable to update meetings`, error));
			return;
		}
		const {meetings, webexMeetings, breakouts} = response;
		await dispatch(setMany(meetings));
		if (webexMeetings)
			await dispatch(upsertWebexMeetings(webexMeetings));
		if (breakouts)
			await dispatch(upsertBreakouts(breakouts));
	}

export const addMeetings = (meetings_) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, meetings_);
			validateResponse('POST', response);
		}
		catch(error) {
			await dispatch(setError('Unable to add meetings:', error));
			return [];
		}
		const {meetings, webexMeetings, breakouts} = response;
		await dispatch(addMany(meetings));
		if (webexMeetings)
			await dispatch(upsertWebexMeetings(webexMeetings));
		if (breakouts)
			await dispatch(upsertBreakouts(breakouts));
		return meetings.map(e => e.id);
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
