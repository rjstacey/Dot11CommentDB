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
	title: {label: 'Title'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	day: {label: 'Day'},
	date: {label: 'Date'},
	dayDate: {label: 'Date'},
	timeRange: {label: 'Time'},
	duration: {label: 'Duration'},
	timezone: {label: 'Time zone'},
	accountId: {label: 'Webex account ID'},
	accountName: {label: 'Webex account'},
	meetingNumber: {label: 'Meeting number', sortType: SortType.NUMERIC},
	hostKey: {label: 'Host key', sortType: SortType.NUMERIC},
	meeting: {label: 'Associated meeting'}
};

/*
 * Fields derived from other fields
 */
export function getField(entity, key) {
	if (key === 'day')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).weekdayShort;
	if (key === 'date')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('dd LLL yyyy');
	if (key === 'dayDate')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('EEE, dd LLL yyyy');
	if (key === 'startTime')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('HH:mm');
	if (key === 'endTime')
		return DateTime.fromISO(entity.end, {zone: entity.timezone}).toFormat('HH:mm');
	if (key === 'timeRange')
		return DateTime.fromISO(entity.start, {zone: entity.timezone}).toFormat('HH:mm') + '-' +
			   DateTime.fromISO(entity.end, {zone: entity.timezone}).toFormat('HH:mm');
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
