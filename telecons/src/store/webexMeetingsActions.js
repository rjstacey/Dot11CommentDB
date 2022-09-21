import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

import {selectWebexMeetingsState} from './webexMeetingsSelectors';

import slice from './webexMeetingsSlice';

const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	removeAll,
	addMany,
	upsertMany,
	setSelected,
	setPanelIsSplit
} = slice.actions;

export {getSuccess as setWebexMeetings, upsertMany as upsertWebexMeetings, setSelected};

const baseUrl = '/api/webex/meetings';

export const setWebexMeetingsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});

export const loadWebexMeetings = ({groupId, ...params}) => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let url = baseUrl;
		if (groupId)
			url += `/${groupId}`;
		if (Object.keys(params).length === 0)
			params = undefined; 
		let meetings;
		try {
			meetings = await fetcher.get(url, params);
			if (!Array.isArray(meetings))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of meetings', error));
			return;
		}
		await dispatch(getSuccess(meetings));
	}

export const clearWebexMeetings = () => (dispatch) => dispatch(removeAll());

export const addWebexMeeting = (accountId, webexMeeting) =>
	async (dispatch, getState) => {
		const meetings = [{accountId, webexMeeting}];
		let response;
		try {
			response = await fetcher.post(baseUrl, meetings);
			if (!Array.isArray(response))
				throw new Error('Unexpected response to POST ' + baseUrl);
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return;
		}
		await dispatch(addMany(response));
	}

export const deleteWebexMeetings = (ids) =>
	async (dispatch, getState) => {
		const {entities} = selectWebexMeetingsState(getState());
		const meetings = ids.map(id => {
			return {
				accountId: entities[id].webexAccountId,
				meetingId: entities[id].id,
			}
		});
		try {
			await fetcher.delete(baseUrl, meetings);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete webex meetings ${ids}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}
