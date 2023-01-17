import {fetcher} from 'dot11-components/lib';
import {setError} from 'dot11-components/store/error';

import slice from './webexMeetingsSlice';

const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	removeAll,
	addMany,
	upsertMany,
	updateMany,
	setSelected,
} = slice.actions;

export {getSuccess as setWebexMeetings, upsertMany as upsertWebexMeetings, setSelected};

const baseUrl = '/api/webex/meetings';

function validateResponse(method, response) {
	if (!Array.isArray(response))
		throw new TypeError(`Unexpected response to ${method} ${baseUrl}`);
}

export const loadWebexMeetings = (constraints) => 
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
		await dispatch(getSuccess(response));
	}

export const clearWebexMeetings = () => (dispatch) => dispatch(removeAll());

export const addWebexMeeting = (accountId, webexMeeting) =>
	async (dispatch, getState) => {
		const meetings = [{accountId, ...webexMeeting}];
		let response;
		try {
			response = await fetcher.post(baseUrl, meetings);
			validateResponse('POST', response);
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return;
		}
		await dispatch(addMany(response));
	}

export const updateWebexMeetings = (webexMeetings) =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.patch(baseUrl, webexMeetings);
			validateResponse('PATCH', response);
		}
		catch (error) {
			dispatch(setError('Unable to add webex meeting', error));
			return;
		}
		await dispatch(updateMany(response));
	}

export const deleteWebexMeetings = (webexMeetings) =>
	async (dispatch, getState) => {
		const meetings = webexMeetings.map(({accountId, id}) => ({accountId, id}));
		const ids = meetings.map(m => m.id);
		try {
			await fetcher.delete(baseUrl, meetings);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete webex meetings ${ids}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}
