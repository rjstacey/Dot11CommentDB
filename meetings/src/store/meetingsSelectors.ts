import { createSelector, Dictionary } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	displayDate,
	getAppTableDataSelectors,
	SortType
} from 'dot11-components';

import type { RootState } from '.';
import { selectGroupEntities, Group } from './groups';
import { selectWebexAccountEntities, WebexAccount } from './webexAccounts';
import { selectCalendarAccountEntities, CalendarAccount } from './calendarAccounts';
import { selectImatMeetingEntities, ImatMeeting } from './imatMeetings';
import { selectWebexMeetingEntities, WebexMeeting, WebexMeetingParams } from './webexMeetingsSelectors';
import { selectSessionEntities } from './sessions';

import type { MeetingsState } from './meetingsSlice';

export interface Meeting {
	id: number;
	organizationId: string | null;
	start: string;
	end: string;
	timezone: string;
	summary: string;
	location: string;
	isCancelled: boolean;
	hasMotions: boolean;
	webexAccountId: number | null;
	webexAccountName: string | null;
	webexMeetingId: string | null;
	webexMeeting?: WebexMeeting;
	calendarAccountId: number | null;
	calendarEventId: string | null;
	imatMeetingId: number | null;
	imatBreakoutId: number | '$add' | null;
	sessionId: number | null;
	roomId: number | null;
	roomName: string;
}

export type MeetingAdd = Omit<Meeting, "id" | "webexMeeting"> & {
	webexMeeting?: WebexMeetingParams;
}

/** `Meeting` record with additional fields from referenced entities */
export type SyncedMeeting = Meeting & {
	groupName: string;
	webexAccountName: string;
	calendarAccountName: string;
	imatMeetingName: string;
	webexMeeting?: WebexMeeting;
	roomName: string;
}

/** `SyncedMeeting` record plus additional derived fields */
export type DerivedMeeting = SyncedMeeting & {
	day: string;
	date: string;
	dayDate: string;
	timeRange: string;
	location: string;
}

export const dataSet = 'meetings';

export function displayMeetingNumber(meetingNumber: number) {
	const s = meetingNumber.toString();
	return s.substring(0,4) + ' ' + s.substring(4,7) + ' ' + s.substring(7);
}

export const fields = {
	id: {label: 'ID'},
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
export function getField(entity: Meeting, key: string) {
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
	if (key === 'location') {
		return entity.roomName ||
			entity.location ||
			(entity.webexMeeting? `${entity.webexAccountName}: ${displayMeetingNumber(entity.webexMeeting.meetingNumber)}`: '');
	}
	if (key === 'meetingNumber')
		return entity.webexMeeting? displayMeetingNumber(entity.webexMeeting.meetingNumber): '';
	if (!entity.hasOwnProperty(key))
		console.warn(dataSet + ' has no field ' + key);
	return entity[key as keyof Meeting];
}

export function summarizeTelecon(entity: Meeting) {
	const date = getField(entity, 'date');
	const timeRange = getField(entity, 'timeRange');
	return `${date} ${timeRange} ${entity.summary}`;
}

/*
 * Selectors
 */
export const selectMeetingsState = (state: RootState) => state[dataSet] as MeetingsState;
export function selectMeetingEntities(state: RootState) {return selectMeetingsState(state).entities}
export const selectMeetingIds = (state: RootState) => selectMeetingsState(state).ids;

export const selectSyncedMeetingEntities = createSelector(
	selectMeetingEntities,
	selectGroupEntities,
	selectWebexAccountEntities,
	selectCalendarAccountEntities,
	selectImatMeetingEntities,
	selectWebexMeetingEntities,
	selectSessionEntities,
	(meetingEntities, groupEntities, webexAccountEntities, calendarAccountEntities, imatMeetingEntities, webexMeetingEntities, sessionEntities) => {
		const entities: Dictionary<SyncedMeeting> = {};
		for (const [id, meeting] of (Object.entries(meetingEntities) as [string, Meeting][])) {
			const group: Group | undefined = meeting.organizationId? groupEntities[meeting.organizationId]: undefined;
			const webexAccount: WebexAccount | undefined = meeting.webexAccountId? webexAccountEntities[meeting.webexAccountId]: undefined;
			const calendarAccount: CalendarAccount | undefined = meeting.calendarAccountId? calendarAccountEntities[meeting.calendarAccountId]: undefined;
			const imatMeeting: ImatMeeting | undefined = meeting.imatMeetingId? imatMeetingEntities[meeting.imatMeetingId]: undefined;
			const webexMeeting: WebexMeeting | undefined = meeting.webexMeetingId? webexMeetingEntities[meeting.webexMeetingId]: undefined;
			const room = meeting!.sessionId? sessionEntities[meeting.sessionId]!.rooms?.find(room => room.id === meeting.roomId): undefined;
			entities[id] = {
				...meeting!,
				groupName: group? group.name: 'Unknown',
				webexAccountName: webexAccount? webexAccount.name: 'None',
				calendarAccountName: calendarAccount? calendarAccount.name: 'None',
				imatMeetingName: imatMeeting? imatMeeting.name: 'None',
				webexMeeting,
				roomName: room? room.name: ''
			}
		}
		return entities;
	}
);

export const meetingsSelectors = getAppTableDataSelectors(selectMeetingsState, {selectEntities: selectSyncedMeetingEntities, getField})

export const selectSelectedMeetings = (state: RootState) => selectMeetingsState(state).selected;
export const selectSelectedSlots = (state: RootState) => selectMeetingsState(state).selectedSlots;
export const selectUiProperties = (state: RootState) => selectMeetingsState(state).ui;
