import { EntityId } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	isObject,
} from 'dot11-components';

import slice from './meetingsSlice';

import type { AppThunk } from '.';
import { selectWorkingGroupName } from './groups';
import { setWebexMeetings, upsertWebexMeetings } from './webexMeetings';
import { setBreakouts, upsertBreakouts } from './imatBreakouts';

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

function validateResponse(method: string, response: any) {
	if (!isObject(response) ||
		!Array.isArray(response.meetings) ||
		(response.webexMeetings && !Array.isArray(response.webexMeetings)) ||
		(response.breakouts && !Array.isArray(response.breakouts))) {
		throw new TypeError(`Unexpected response to ${method}`);
	}
}

export type LoadMeetingsConstraints = {
	fromDate?: string;
	toDate?: string;
	timezone?: string;
	sessionId?: number;
}

export const loadMeetings = (constraints?: LoadMeetingsConstraints): AppThunk => 
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/meetings`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(url, constraints);
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
	async (dispatch) => {
		dispatch(removeAll());
	}

type Update<T> = {
	id: EntityId;
	changes: Partial<T>
}

export const updateMeetings = (updates: Update<MeetingAdd>[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/meetings`;
		let response: any;
		try {
			response = await fetcher.patch(url, updates);
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
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/meetings`;
		let response: any;
		try {
			response = await fetcher.post(url, meetingsToAdd);
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
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/meetings`;
		return fetcher.delete(url, ids)
			.then(() => dispatch(removeMany(ids)))
			.catch((error: any) => dispatch(setError(`Unable to delete meetings ${ids}`, error)));
	}
