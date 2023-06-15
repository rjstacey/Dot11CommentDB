import {
	fetcher,
	setError
} from 'dot11-components';

import slice from './webexMeetingsSlice';
import type { AppThunk } from '.';
import { selectWorkingGroup, selectWorkingGroupName } from './groups';
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

function validateResponse(method: string, response: any): asserts response is WebexMeeting[] {
	if (!Array.isArray(response))
		throw new TypeError(`Unexpected response to ${method}`);
}

export type LoadWebexMeetingsConstrains = {
	fromDate?: string;
	toDate?: string;
	timezone?: string;
	sessionId?: number;
}

export const loadWebexMeetings = (constraints: LoadWebexMeetingsConstrains): AppThunk => 
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/meetings`;
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
		dispatch(getSuccess(response));
	}

export const clearWebexMeetings = (): AppThunk =>
	(dispatch) => {
		dispatch(removeAll());
		return Promise.resolve();
	}

export const addWebexMeeting = (accountId: number, webexMeeting: Omit<WebexMeetingParams, "accountId" | "id">): AppThunk<string | null> =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/meetings`;
		const meetings = [{accountId, ...webexMeeting}];
		let response: any;
		try {
			response = await fetcher.post(url, meetings);
			validateResponse('POST', response);
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return null;
		}
		dispatch(addMany(response));
		return response[0].id;
	}

export type WebexMeetingUpdate = Partial<WebexMeetingParams> & {
	accountId: number;
	id: string;
}

export const updateWebexMeetings = (webexMeetingsIn: WebexMeetingUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/meetings`;
		let response: any;
		try {
			response = await fetcher.patch(url, webexMeetingsIn);
			validateResponse('PATCH', response);
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return;
		}
		dispatch(setMany(response));
	}

export const deleteWebexMeetings = (webexMeetings: {accountId: number; id: string}[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/meetings`;
		const meetings = webexMeetings.map(({accountId, id}) => ({accountId, id}));
		const ids = meetings.map(m => m.id);
		try {
			await fetcher.delete(url, meetings);
		}
		catch(error) {
			dispatch(setError(`Unable to delete webex meetings ${ids}`, error));
			return;
		}
		dispatch(removeMany(ids));
	}
