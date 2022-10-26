import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import {displayDate} from 'dot11-components/lib';
import {SortType, selectCurrentPanelConfig} from 'dot11-components/store/appTableData';

import {selectGroupEntities} from './groups';
import {selectWebexAccountEntities} from './webexAccounts';
import {selectCalendarAccountEntities} from './calendarAccounts';
import {selectImatMeetingEntities} from './imatMeetings';
import {selectWebexMeetingEntities} from './webexMeetingsSelectors';

export const dataSet = 'meetings';

export function displayMeetingNumber(meetingNumber) {
	const s = meetingNumber.toString();
	return s.substring(0,4) + ' ' + s.substring(4,7) + ' ' + s.substring(7);
}

export const fields = {
	organizationId: {label: 'Group ID'},
	groupName: {label: 'Group'},
	start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	end: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	startTime: {label: 'Start time'},
	endTime: {label: 'End time'},
	day: {label: 'Day'},
	date: {label: 'Date'},
	dayDate: {label: 'Day/Date'},
	timeRange: {label: 'Time'},
	duration: {label: 'Duration'},
	summary: {label: 'Summary'},
	location: {label: 'Location/Room'},
	hasMotions: {label: 'Motions'},
	isCancelled: {label: 'Cancelled'},
	webexAccountName: {label: 'Webex account'},
	calendarAccountName: {label: 'Calendar account'},
	imatMeetingName: {label: 'IMAT session'}
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
	if (key === 'location')
		return entity.webexMeeting? `${entity.webexAccountName}: ${displayMeetingNumber(entity.webexMeeting.meetingNumber)}`: '';
	if (key === 'meetingNumber')
		return entity.webexMeeting? displayMeetingNumber(entity.webexMeeting.meetingNumber): '';
	if (!entity.hasOwnProperty(key))
		console.warn(dataSet + ' has no field ' + key);
	return entity[key];
}

export function summarizeTelecon(entity) {
	const date = getField(entity, 'date');
	const timeRange = getField(entity, 'timeRange');
	return `${date} ${timeRange} ${entity.summary}`;
}

/*
 * Selectors
 */
export const selectMeetingsState = (state) => state[dataSet];

export function selectMeetingEntities(state) {return selectMeetingsState(state).entities}

export const selectMeetingIds = (state) => selectMeetingsState(state).ids;

export const selectMeetingsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

export const selectSyncedMeetingEntities = createSelector(
	selectMeetingEntities,
	selectGroupEntities,
	selectWebexAccountEntities,
	selectCalendarAccountEntities,
	selectImatMeetingEntities,
	selectWebexMeetingEntities,
	(meetingEntities, groupEntities, webexAccountEntities, calendarAccountEntities, imatMeetingEntities, webexMeetingEntities) =>
		Object.values(meetingEntities).reduce((entities, meeting) => {
			const group = groupEntities[meeting.organizationId];
			const webexAccount = webexAccountEntities[meeting.webexAccountId];
			const calendarAccount = calendarAccountEntities[meeting.calendarAccountId];
			const imatMeeting = imatMeetingEntities[meeting.imatMeetingId];
			const webexMeeting = webexMeetingEntities[meeting.webexMeetingId];
			return {
				...entities,
				[meeting.id]: {
					...meeting,
					groupName: group? group.name: 'Unknown',
					webexAccountName: webexAccount? webexAccount.name: 'None',
					calendarAccountName: calendarAccount? calendarAccount.name: 'None',
					imatMeetingName: imatMeeting? imatMeeting.name: 'None',
					webexMeeting
				}
			}
		}, {})
);

export const selectSelectedMeetings = (state) => selectMeetingsState(state).selected;

export const selectSelectedSlots = (state) => selectMeetingsState(state).selectedSlots;
