import { createSelector, EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	displayDate,
	getAppTableDataSelectors,
	FieldType,
} from "dot11-components";

import type { RootState } from ".";
import { selectMeetingEntities } from "./meetingsSelectors";
import { selectWorkingGroupByName } from "./groups";
import { AccessLevel } from "./user";

export type WebexMeetingOptions = {
	enabledChat: boolean;
	enabledVideo: boolean;
	enabledNote: boolean;
	enabledClosedCaptions?: boolean;
	enabledFileTransfer: boolean;
};

export type WebexMeetingAudioConnectionOptions = {
	allowAttendeeToUnmuteSelf: boolean;
	muteAttendeeUponEntry: boolean;
	entryAndExitTone: string;
	allowHostToUnmuteParticipants: boolean;
	audioConnectionType?: "webexAudio" | "VoIP" | "other" | "none";
	enabledAudienceCallBack: boolean;
	enabledGlobalCallIn?: boolean;
	enabledTollFreeCallIn: boolean;
};

/** Configurable Webex meeting paramters */
export type WebexMeetingParams = {
	accountId: number;
	id: string;
	templateId: string | null;
	title: string;
	start: string;
	end: string;
	timezone: string;
	password: string;
	enabledAutoRecordMeeting: boolean;
	enabledJoinBeforeHost: boolean;
	joinBeforeHostMinutes: number;
	enableConnectAudioBeforeHost: boolean;
	publicMeeting: boolean;
	meetingOptions: WebexMeetingOptions;
	audioConnectionOptions: WebexMeetingAudioConnectionOptions;
	integrationTags?: string[];
	/** Indentifier for the associated meeting */
	meetingId?: number;
};

/** All Webex meeting info */
export type WebexMeeting = WebexMeetingParams & {
	accountName: string;
	meetingNumber: number;
	webLink: string;
	hostKey: string;
	telephony: { callInNumbers: any[] };
};

export const webexMeetingToWebexMeetingParams = (
	i: WebexMeeting
): WebexMeetingParams => ({
	accountId: i.accountId,
	id: i.id,
	templateId: i.templateId,
	title: i.title,
	start: i.start,
	end: i.end,
	timezone: i.timezone,
	password: i.password,
	enabledAutoRecordMeeting: i.enabledAutoRecordMeeting,
	enabledJoinBeforeHost: i.enabledJoinBeforeHost,
	joinBeforeHostMinutes: i.joinBeforeHostMinutes,
	enableConnectAudioBeforeHost: i.enableConnectAudioBeforeHost,
	publicMeeting: i.publicMeeting,
	meetingOptions: i.meetingOptions,
	audioConnectionOptions: i.audioConnectionOptions,
	...(i.integrationTags ? { integrationTags: i.integrationTags } : {}),
	...(i.meetingId ? { meetingId: i.meetingId } : {}),
});

export type SyncedWebexMeeting = WebexMeeting & {
	meetingId?: number;
};

export const defaultWebexMeetingParams: WebexMeetingParams = {
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
	templateId: null,
};

export function displayMeetingNumber(meetingNumber: number) {
	const s = meetingNumber.toString();
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
		? selectWorkingGroupByName(state, groupName)
		: undefined;
	return group?.permissions.meetings || AccessLevel.none;
};
