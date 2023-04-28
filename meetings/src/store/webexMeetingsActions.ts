import {
	fetcher,
	setError
} from 'dot11-components';

import slice from './webexMeetingsSlice';
import type { AppThunk } from '.';

import { WebexMeeting, WebexMeetingParams } from './webexMeetingsSelectors';

export const webexMeetingsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	removeAll,
	addMany,
	upsertMany,
	setMany,
	setSelected,
	setProperty,
} = slice.actions;

export {getSuccess as setWebexMeetings, upsertMany as upsertWebexMeetings, setSelected, setProperty as setUiProperty};

const baseUrl = '/api/webex/meetings';

function validateResponse(method: string, response: unknown): response is WebexMeeting[] {
	if (!Array.isArray(response))
		throw new TypeError(`Unexpected response to ${method} ${baseUrl}`);
	return true;
}

export type LoadWebexMeetingsConstrains = {
	fromDate?: string;
	toDate?: string;
	timezone?: string;
	sessionId?: number;
	groupId?: string;
}

export const loadWebexMeetings = (constraints: LoadWebexMeetingsConstrains): AppThunk => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let webexMeetings: WebexMeeting[];
		try {
			let response = await fetcher.get(baseUrl, constraints);
			webexMeetings = validateResponse('GET', response)? response: [];
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of meetings', error));
			return;
		}
		dispatch(getSuccess(webexMeetings));
	}

export const clearWebexMeetings = (): AppThunk =>
	(dispatch) => {
		dispatch(removeAll());
		return Promise.resolve();
	}

export const addWebexMeeting = (accountId: number, webexMeeting: Omit<WebexMeetingParams, "accountId" | "id">): AppThunk<string | null> =>
	async (dispatch) => {
		const meetings = [{accountId, ...webexMeeting}];
		let webexMeetings: WebexMeeting[];
		try {
			let response = await fetcher.post(baseUrl, meetings);
			webexMeetings = validateResponse('POST', response)? response: [];
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return null;
		}
		dispatch(addMany(webexMeetings));
		return webexMeetings[0].id;
	}

export type WebexMeetingUpdate = Partial<WebexMeetingParams> & {
	accountId: number;
	id: string;
}

export const updateWebexMeetings = (webexMeetingsIn: WebexMeetingUpdate[]): AppThunk =>
	async (dispatch) => {
		let webexMeetings: WebexMeeting[];
		try {
			let response = await fetcher.patch(baseUrl, webexMeetingsIn);
			webexMeetings = validateResponse('PATCH', response)? response: [];
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return;
		}
		dispatch(setMany(webexMeetings));
	}

export const deleteWebexMeetings = (webexMeetings: {accountId: number; id: string}[]): AppThunk =>
	async (dispatch) => {
		const meetings = webexMeetings.map(({accountId, id}) => ({accountId, id}));
		const ids = meetings.map(m => m.id);
		try {
			await fetcher.delete(baseUrl, meetings);
		}
		catch(error) {
			dispatch(setError(`Unable to delete webex meetings ${ids}`, error));
			return;
		}
		dispatch(removeMany(ids));
	}
