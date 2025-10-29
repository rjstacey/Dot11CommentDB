import { createSelector, EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import { displayDate, getAppTableDataSelectors, FieldType } from "@common";

import type { RootState } from ".";
import { selectMeetingEntities } from "./meetingsSelectors";
import { selectTopLevelGroupByName, AccessLevel } from "./groups";

import {
	WebexMeeting,
	WebexMeetingOptions,
	WebexAudioConnectionOptions,
	WebexMeetingChange,
	WebexMeetingCreate,
	WebexEntryExitTone,
	WebexMeetingsQuery,
} from "@schemas/webex";
import { MeetingChangeWebexParams } from "./meetingsSelectors";

export type {
	WebexMeeting,
	WebexMeetingOptions,
	WebexAudioConnectionOptions,
	WebexMeetingChange,
	WebexMeetingCreate,
	WebexEntryExitTone,
	WebexMeetingsQuery,
};

export function webexMeetingToWebexMeetingParams(
	i: WebexMeeting
): MeetingChangeWebexParams {
	const { title, start, end, timezone, ...params } = i;
	return params;
}

export type SyncedWebexMeeting = WebexMeeting & {
	meetingId?: number;
};

export const defaultWebexMeetingParams = {
	accountId: 0,
	id: "",
	title: "",
	start: "",
	end: "",
	timezone: "",
	password: "wireless",
	enabledAutoRecordMeeting: false,
	enabledJoinBeforeHost: true,
	joinBeforeHostMinutes: 10,
	enableConnectAudioBeforeHost: true,
	publicMeeting: false,
	audioConnectionOptions: {
		allowAttendeeToUnmuteSelf: true,
		allowHostToUnmuteParticipants: false,
		//audioConnectionType: "webexAudio",
		enabledAudienceCallBack: false,
		//enabledGlobalCallIn: true,
		enabledTollFreeCallIn: false,
		entryAndExitTone: "noTone",
		muteAttendeeUponEntry: true,
	},
	meetingOptions: {
		enabledChat: true,
		enabledVideo: true,
		enabledNote: true,
		enabledClosedCaptions: true,
		enabledFileTransfer: false,
	},
	//templateId: null,
} satisfies WebexMeetingChange;

export function displayMeetingNumber(meetingNumber: string) {
	const s = meetingNumber; //.toString();
	return s.substring(0, 4) + " " + s.substring(4, 7) + " " + s.substring(7);
}

export const fields = {
	id: { label: "Group ID" },
	groupName: { label: "Group" },
	title: { label: "Title" },
	start: { label: "Start", dataRenderer: displayDate, type: FieldType.DATE },
	end: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	day: { label: "Day" },
	date: { label: "Date" },
	dayDate: { label: "Date" },
	timeRange: { label: "Time" },
	duration: { label: "Duration" },
	timezone: { label: "Time zone" },
	accountId: { label: "Webex account ID" },
	accountName: { label: "Webex account" },
	meetingNumber: { label: "Meeting number", type: FieldType.NUMERIC },
	hostKey: { label: "Host key", type: FieldType.NUMERIC },
	meeting: { label: "Associated meeting", dontSort: true, dontFilter: true },
};

/*
 * Fields derived from other fields
 */
export function getField(entity: WebexMeeting, key: string) {
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
	if (key === "meetingNumber")
		return displayMeetingNumber(entity.meetingNumber);
	return entity[key as keyof WebexMeeting];
}

/*
 * Selectors
 */
export const dataSet = "webexMeetings";

export const selectWebexMeetingsState = (state: RootState) => state[dataSet];
export const selectWebexMeetingsAge = (state: RootState) => {
	const lastLoad = selectWebexMeetingsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectWebexMeetingIds = (state: RootState) =>
	selectWebexMeetingsState(state).ids;
export const selectWebexMeetingEntities = (state: RootState) =>
	selectWebexMeetingsState(state).entities;

export const selectSyncedWebexMeetingEntities = createSelector(
	selectWebexMeetingEntities,
	selectMeetingEntities,
	(webexMeetingEntities, meetingEntities) => {
		const entities: Record<EntityId, SyncedWebexMeeting> = {};
		const meetings = Object.values(meetingEntities);
		for (const [id, webexMeeting] of Object.entries(webexMeetingEntities)) {
			const meeting = meetings.find(
				(m) => m!.webexMeetingId === webexMeeting!.id
			);
			entities[id] = { ...webexMeeting! };
			if (meeting) entities[id]!.meetingId = meeting.id;
		}
		return entities;
	}
);

export const webexMeetingsSelectors = getAppTableDataSelectors(
	selectWebexMeetingsState,
	{ selectEntities: selectSyncedWebexMeetingEntities, getField }
);

export const selectUserWebexMeetingsAccess = (state: RootState) => {
	const { groupName } = selectWebexMeetingsState(state);
	const group = groupName
		? selectTopLevelGroupByName(state, groupName)
		: undefined;
	return group?.permissions.meetings || AccessLevel.none;
};
