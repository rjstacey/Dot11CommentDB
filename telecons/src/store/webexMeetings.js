import {createSelector} from '@reduxjs/toolkit';
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig, setPanelIsSplit} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';
import {DateTime} from 'luxon';

import {selectTeleconDefaults, selectTeleconEntities} from './telecons';

export function displayMeetingNumber(meetingNumber) {
	const s = meetingNumber.toString();
	return s.substring(0,4) + ' ' + s.substring(4,7) + ' ' + s.substring(7);
}

export const fields = {
	id: {label: 'Group ID'},
	groupName: {label: 'Group'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	day: {label: 'Day'},
	dayDate: {label: 'Date'},
	title: {label: 'Title'},
	date: {label: 'Date'},
	time: {label: 'Time'},
	timezone: {label: 'Time zone'},
	duration: {label: 'Duration'},
	meetingNumber: {label: 'Meeting number'},
	webexAccountName: {label: 'Webex account'},
};

/*
 * Fields derived from other fields
 */
export function getField(entity, key) {
	if (key === 'dayDate')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('EEE, d LLL yyyy');
	if (key === 'time') {
		const start = DateTime.fromISO(entity.start, {zone: entity.timezone});
		const end = DateTime.fromISO(entity.end, {zone: entity.timezone});
		return start.toFormat('HH:mm') + ' - ' + end.toFormat('HH:mm');
	}
	if (key === 'day')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).weekdayShort;
	if (key === 'date')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('yyyy LLL dd');
	if (key === 'duration')
		return DateTime.fromISO(entity.end).diff(DateTime.fromISO(entity.start), 'hours').hours;
	if (key === 'meetingNumber')
		return displayMeetingNumber(entity.meetingNumber);
	return entity[key];
}

export const dataSet = 'webexMeetings';

/*
 * Selectors
 */
export const selectWebexMeetingsState = (state) => state[dataSet];

export const selectWebexMeetingEntities = (state) => selectWebexMeetingsState(state).entities;
const selectDefaultTimezone = (state) => selectTeleconDefaults(state).timezone || 'UTC';
export const selectSyncedWebexMeetingEntities = createSelector(
	selectWebexMeetingEntities,
	selectTeleconEntities,
	selectDefaultTimezone,
	(webexMeetingEntities, teleconEntities, timezone) => {
		const entities = {...webexMeetingEntities};
		for (const id in teleconEntities) {
			const telecon = teleconEntities[id];
			const webexMeeting = entities[telecon.webexMeetingId];
			if (webexMeeting)
				entities[telecon.webexMeetingId] = {...webexMeeting, teleconId: telecon.id, timezone: telecon.timezone};
		}
		// For webex meetings without an associated telecon entry, add the default timezone
		for (const id in entities) {
			const webexMeeting = entities[id];
			if (!webexMeeting.teleconId)
				entities[id] = {...webexMeeting, teleconId: null, timezone};
		}
		return entities;
	}
);

export const selectWebexMeetingsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	selectEntities: selectSyncedWebexMeetingEntities,
	initialState: {},
});

/*
 * Reducer
 */
export default slice.reducer;


/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
} = slice.actions;

const baseUrl = '/api/webex/meetings';

export const setWebexMeetingsCurrentPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

export const loadWebexMeetings = (groupId) => 
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseUrl}/${groupId}`;
		let meetings;
		try {
			meetings = await fetcher.get(url);
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

export const deleteWebexMeetings = (ids) =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete webex meetings ${ids}`, error));
			return;
		}
		await dispatch(removeMany(ids));
	}