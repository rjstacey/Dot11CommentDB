import {
	fetcher,
	setError,
	isObject,
	EntityId
} from 'dot11-components';

import slice from './meetingsSlice';

import { setWebexMeetings, upsertWebexMeetings } from './webexMeetings';
import { setBreakouts, upsertBreakouts } from './imatBreakouts';
import type { AppThunk } from '.';

import type { Meeting, MeetingAdd } from './meetingsSelectors';

export const meetingsActions = slice.actions;

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

export const setMeetingsCurrentPanelIsSplit = (isSplit: boolean) => setPanelIsSplit({isSplit});

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

function validateResponse(method: string, response: any) {
	if (!isObject(response) ||
		!Array.isArray(response.meetings) ||
		(response.webexMeetings && !Array.isArray(response.webexMeetings)) ||
		(response.breakouts && !Array.isArray(response.breakouts))) {
		throw new TypeError(`Unexpected response to ${method} ${baseUrl}`);
	}
}

export type LoadMeetingsConstraints = {
	fromDate?: string;
	toDate?: string;
	timezone?: string;
	sessionId?: number;
	groupId?: string;
}

export const loadMeetings = (constraints?: LoadMeetingsConstraints): AppThunk => 
	async (dispatch) => {
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
		dispatch(getSuccess(meetings));
		dispatch(setSelectedSlots([]));
		if (webexMeetings)
			dispatch(setWebexMeetings(webexMeetings));
		if (breakouts)
			dispatch(setBreakouts(breakouts));
	}

export const clearMeetings = (): AppThunk =>
	(dispatch) => {
		dispatch(removeAll());
		return Promise.resolve();
	}

type Update<T> = {
	id: EntityId;
	changes: Partial<T>
}

export const updateMeetings = (updates: Update<MeetingAdd>[]): AppThunk =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.patch(baseUrl, updates);
			validateResponse('PATCH', response);
		}
		catch(error) {
			dispatch(setError(`Unable to update meetings`, error));
			return;
		}
		const {meetings, webexMeetings, breakouts} = response;
		dispatch(setMany(meetings));
		if (webexMeetings)
			dispatch(upsertWebexMeetings(webexMeetings));
		if (breakouts)
			dispatch(upsertBreakouts(breakouts));
	}

export const addMeetings = (meetingsToAdd: MeetingAdd[]): AppThunk<EntityId[]> =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, meetingsToAdd);
			validateResponse('POST', response);
		}
		catch(error) {
			dispatch(setError('Unable to add meetings:', error));
			return [];
		}
		const {meetings, webexMeetings, breakouts} = response;
		dispatch(addMany(meetings));
		if (webexMeetings)
			dispatch(upsertWebexMeetings(webexMeetings));
		if (breakouts)
			dispatch(upsertBreakouts(breakouts));
		return meetings.map((e: Meeting) => e.id);
	}

export const deleteMeetings = (ids: EntityId[]): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			dispatch(setError(`Unable to delete meetings ${ids}`, error));
			return;
		}
		dispatch(removeMany(ids));
	}
