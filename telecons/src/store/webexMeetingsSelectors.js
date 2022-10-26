import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import {displayDate} from 'dot11-components/lib';
import {SortType, selectCurrentPanelConfig} from 'dot11-components/store/appTableData';

import {selectCurrentSession} from './imatMeetings';
import {selectMeetingEntities} from './meetingsSelectors';

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
	webexAccountName: {label: 'Webex account'},
	meetingNumber: {label: 'Meeting number', sortType: SortType.NUMERIC},
	hostKey: {label: 'Host key', sortType: SortType.NUMERIC},
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

const selectTimezone = (state) => {
	const session = selectCurrentSession(state);
	return session? session.timezone: 'America/New_York';
}

export const selectSyncedWebexMeetingEntities = createSelector(
	selectWebexMeetingEntities,
	selectMeetingEntities,
	selectTimezone,
	(webexMeetingEntities, meetingEntities, timezone) => {
		const meetings = Object.values(meetingEntities);
		return Object.values(webexMeetingEntities).reduce((entities, webexMeeting) => {
			const entry = {...webexMeeting};
			const meeting = meetings.find(m => m.webexMeetingId === webexMeeting.id);
			entry.meetingId = meeting? meeting.id: null;
			entry.timezone = meeting? meeting.timezone: timezone;
			return {...entities, [entry.id]: entry};
		}, {});
	}
);

export const selectWebexMeetingsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);
