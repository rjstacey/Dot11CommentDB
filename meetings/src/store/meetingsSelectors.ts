import { createSelector, EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	displayDate,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "dot11-components";

import type { RootState } from ".";
import {
	selectGroupEntities,
	selectTopLevelGroupByName,
	type Group,
} from "./groups";
import { selectWebexAccountEntities, WebexAccount } from "./webexAccounts";
import {
	selectCalendarAccountEntities,
	CalendarAccount,
} from "./calendarAccounts";
import { selectImatMeetingEntities, ImatMeeting } from "./imatMeetings";
import {
	selectWebexMeetingEntities,
	WebexMeeting,
	displayMeetingNumber,
} from "./webexMeetingsSelectors";
import { selectSessionEntities } from "./sessions";
//import { selectCurrentSessionId, selectShowDateRange } from "./current";
import { AccessLevel } from "./user";

import {
	Meeting,
	MeetingCreate,
	MeetingUpdate,
	MeetingChangeWebexParams,
	MeetingsQuery,
} from "@schemas/meetings";

export type {
	Meeting,
	MeetingCreate,
	MeetingUpdate,
	MeetingChangeWebexParams,
	MeetingsQuery,
};

/** `Meeting` record with additional fields from referenced entities */
export type SyncedMeeting = Meeting & {
	groupName: string;
	webexAccountName: string;
	calendarAccountName: string;
	sessionName: string;
	imatMeetingName: string;
	webexMeeting?: WebexMeeting;
	roomName: string;
};

/** `SyncedMeeting` record plus additional derived fields */
export type DerivedMeeting = SyncedMeeting & {
	day: string;
	date: string;
	dayDate: string;
	timeRange: string;
	location: string;
};

export const fields: Fields = {
	id: { label: "ID" },
	organizationId: { label: "Group ID" },
	groupName: { label: "Group" },
	start: { label: "Start", dataRenderer: displayDate, type: FieldType.DATE },
	end: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	startTime: { label: "Start time" },
	endTime: { label: "End time" },
	day: { label: "Day" },
	date: { label: "Date" },
	dayDate: { label: "Day/Date" },
	timeRange: { label: "Time" },
	duration: { label: "Duration" },
	summary: { label: "Summary" },
	location: { label: "Location/Room" },
	hasMotions: { label: "Motions" },
	isCancelled: { label: "Cancelled" },
	webexAccountName: { label: "Webex account" },
	calendarAccountName: { label: "Calendar account" },
	imatMeetingName: { label: "IMAT session" },
};

/*
 * Fields derived from other fields
 */
export function getField(entity: SyncedMeeting, key: string) {
	if (key === "day")
		return DateTime.fromISO(entity.start, { zone: entity.timezone })
			.weekdayShort;
	if (key === "date")
		return DateTime.fromISO(entity.start, {
			zone: entity.timezone,
		}).toFormat("dd LLL yyyy");
	if (key === "dayDate")
		return DateTime.fromISO(entity.start, {
			zone: entity.timezone,
		}).toFormat("EEE, dd LLL yyyy");
	if (key === "startTime")
		return DateTime.fromISO(entity.start, {
			zone: entity.timezone,
		}).toFormat("HH:mm");
	if (key === "endTime")
		return DateTime.fromISO(entity.end, { zone: entity.timezone }).toFormat(
			"HH:mm"
		);
	if (key === "timeRange")
		return (
			DateTime.fromISO(entity.start, { zone: entity.timezone }).toFormat(
				"HH:mm"
			) +
			"-" +
			DateTime.fromISO(entity.end, { zone: entity.timezone }).toFormat(
				"HH:mm"
			)
		);
	if (key === "duration")
		return DateTime.fromISO(entity.end).diff(
			DateTime.fromISO(entity.start),
			"hours"
		).hours;
	if (key === "location") {
		if (entity.roomId)
			return "roomName" in entity ? entity.roomName : "Unknown";
		if (entity.location) return entity.location;
		const webexMeeting = entity.webexMeeting;
		const webexAccountName =
			"webexAccountName" in entity ? entity.webexAccountName : "Unknown";
		return webexMeeting
			? `${webexAccountName}: ${displayMeetingNumber(
					webexMeeting.meetingNumber
				)}`
			: "";
	}
	if (key === "meetingNumber")
		return entity.webexMeeting
			? displayMeetingNumber(entity.webexMeeting.meetingNumber)
			: "";
	if (!(key in entity)) console.warn(dataSet + " has no field " + key);
	return entity[key as keyof Meeting];
}

/*
 * Selectors
 */
export const dataSet = "meetings";

export const selectMeetingsState = (state: RootState) => state[dataSet];
export const selectMeetingsAge = (state: RootState) => {
	const lastLoad = selectMeetingsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export function selectMeetingEntities(state: RootState) {
	return selectMeetingsState(state).entities;
}
export const selectMeetingIds = (state: RootState) =>
	selectMeetingsState(state).ids;

export const selectSyncedMeetingEntities = createSelector(
	selectMeetingEntities,
	selectGroupEntities,
	selectWebexAccountEntities,
	selectCalendarAccountEntities,
	selectImatMeetingEntities,
	selectWebexMeetingEntities,
	selectSessionEntities,
	(
		meetingEntities,
		groupEntities,
		webexAccountEntities,
		calendarAccountEntities,
		imatMeetingEntities,
		webexMeetingEntities,
		sessionEntities
	) => {
		const entities: Record<EntityId, SyncedMeeting> = {};
		for (const [id, meeting] of Object.entries(meetingEntities) as [
			string,
			Meeting,
		][]) {
			const group: Group | undefined = meeting.organizationId
				? groupEntities[meeting.organizationId]
				: undefined;
			const webexAccount: WebexAccount | undefined =
				meeting.webexAccountId
					? webexAccountEntities[meeting.webexAccountId]
					: undefined;
			const calendarAccount: CalendarAccount | undefined =
				meeting.calendarAccountId
					? calendarAccountEntities[meeting.calendarAccountId]
					: undefined;
			const imatMeeting: ImatMeeting | undefined = meeting.imatMeetingId
				? imatMeetingEntities[meeting.imatMeetingId]
				: undefined;
			const webexMeeting: WebexMeeting | undefined =
				meeting.webexMeetingId
					? webexMeetingEntities[meeting.webexMeetingId]
					: undefined;
			const room = meeting!.sessionId
				? sessionEntities[meeting.sessionId]!.rooms?.find(
						(room) => room.id === meeting.roomId
					)
				: undefined;
			const sessionName = meeting!.sessionId
				? sessionEntities[meeting.sessionId]!.name
				: "None";
			entities[id] = {
				...meeting!,
				groupName: group ? group.name : "Unknown",
				webexAccountName: webexAccount ? webexAccount.name : "None",
				calendarAccountName: calendarAccount
					? calendarAccount.name
					: "None",
				sessionName,
				imatMeetingName: imatMeeting ? imatMeeting.name : "None",
				webexMeeting,
				roomName: room ? room.name : "",
			};
		}
		return entities;
	}
);

export const meetingsSelectors = getAppTableDataSelectors(selectMeetingsState, {
	selectEntities: selectSyncedMeetingEntities,
	getField,
});

export const selectSelectedMeetings = (state: RootState) =>
	selectMeetingsState(state).selected;
export const selectSelectedSlots = (state: RootState) =>
	selectMeetingsState(state).selectedSlots;
export const selectUiProperties = (state: RootState) =>
	selectMeetingsState(state).ui;

export const selectUserMeetingsAccess = (state: RootState) => {
	const { groupName } = selectMeetingsState(state);
	const group = groupName
		? selectTopLevelGroupByName(state, groupName)
		: undefined;
	return group?.permissions.meetings || AccessLevel.none;
};
