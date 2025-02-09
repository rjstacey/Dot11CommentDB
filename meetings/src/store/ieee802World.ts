import { createSelector, isPlainObject, EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	AppTableDataState,
	Fields,
} from "dot11-components";

import type { AppThunk, RootState } from ".";
import { selectGroupsState, selectTopLevelGroup } from "./groups";
import { selectCurrentSessionId } from "./current";
import { selectSessionEntities, selectCurrentSession } from "./sessions";
import { addMeetings, selectMeetingEntities, MeetingCreate } from "./meetings";
import {
	defaultWebexMeetingParams,
	WebexMeetingCreate,
} from "./webexMeetingsSelectors";
import { selectWebexAccountDefaultId } from "./webexAccounts";
import { selectCalendarAccountDefaultId } from "./calendarAccounts";

export type Ieee802WorldScheduleEntry = {
	id: number;
	breakoutDate: string;
	date: string;
	day: string;
	startTime: string;
	endTime: string;
	timeRange: string;
	postAs: string;
	meeting: string;
	comments: string;
	mtgRoom: string;
	mtgHotel: string;
	mtgLevel: string;
	mtgLocation: string;
	groupName: string;
};

export type SyncedIeee802WorldScheduleEntry = Ieee802WorldScheduleEntry & {
	meetingId: number | null;
};

export const fields: Fields = {
	id: { label: "ID", type: FieldType.NUMERIC },
	breakoutDate: { label: "Date", dataRenderer: displayDate },
	date: { label: "Date" },
	day: { label: "Day" },
	dayDate: { label: "Day, Date" },
	startTime: { label: "Start time" },
	endTime: { label: "End time" },
	timeRange: { label: "Time" },
	postAs: { label: "Summary" },
	meeting: { label: "Meeting" },
	comments: { label: "Comments" },
	mtgRoom: { label: "Room" },
	mtgHotel: { label: "Hotel" },
	mtgLevel: { label: "Level" },
	mtgLocation: { label: "Location" },
	groupName: { label: "Group" },
	meetingId: { label: "Meeting ID", dontSort: true, dontFilter: true },
};

/*
 * Fields derived from other fields
 */
export function getField(entity: Ieee802WorldScheduleEntry, key: string) {
	if (key === "day")
		return DateTime.fromISO(entity.breakoutDate).weekdayShort;
	if (key === "date")
		return DateTime.fromISO(entity.breakoutDate).toFormat("dd LLL yyyy");
	if (key === "dayDate")
		return DateTime.fromISO(entity.breakoutDate).toFormat(
			"EEE, dd LLL yyyy"
		);
	if (key === "timeRange")
		return (
			entity.startTime.substring(0, 5) +
			"-" +
			entity.endTime.substring(0, 5)
		);
	if (!(key in entity)) console.warn(dataSet + " has no field " + key);
	return entity[key as keyof Ieee802WorldScheduleEntry];
}

/* Slice */
const dataSet = "ieee802World";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {},
});

export default slice;

/* Slice actions */
export const ieee802WorldActions = slice.actions;
const { getPending, getSuccess, getFailure } = slice.actions;

/* Selectors */
export const select802WorldState = (state: RootState) =>
	state[dataSet] as AppTableDataState<Ieee802WorldScheduleEntry>;
export const select802WorldEntities = (state: RootState) =>
	select802WorldState(state).entities;
export const select802WorldIds = (state: RootState) =>
	select802WorldState(state).ids;

export const selectSynced802WorldEntities = createSelector(
	select802WorldIds,
	select802WorldEntities,
	selectMeetingEntities,
	selectCurrentSession,
	selectTopLevelGroup,
	(ids, entities, meetingEntities, session, workingGroup) => {
		const newEntities: Record<EntityId, SyncedIeee802WorldScheduleEntry> =
			{};
		ids.forEach((id) => {
			const entity = entities[id]!;
			let meetingId = null;
			const entityGroupName = entity.groupName.startsWith("802")
				? "802"
				: "802." + entity.groupName;
			if (entityGroupName === workingGroup?.name) {
				const entityRoomId =
					session?.rooms.find((room) => room!.name === entity.mtgRoom)
						?.id || null;
				const entityStart = DateTime.fromFormat(
					`${entity.breakoutDate} ${entity.startTime}`,
					"yyyy-MM-dd HH:mm:ss",
					{ zone: session?.timezone || "America/New_York" }
				);
				/* Find a meeting that matches group, start, and room */
				const m = Object.values(meetingEntities).find(
					(m) =>
						entityStart.equals(
							DateTime.fromISO(m!.start, { zone: m!.timezone })
						) && entityRoomId === m!.roomId
				);
				if (m) meetingId = m.id;
			}
			newEntities[id] = {
				...entity,
				meetingId,
			};
		});
		//console.log(newEntities)
		return newEntities;
	}
);

export const ieee802WorldSelectors = getAppTableDataSelectors(
	select802WorldState,
	{ selectEntities: selectSynced802WorldEntities, getField }
);

/* Thunk actions */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGenericObject(o: unknown): o is Record<string, any> {
	return isPlainObject(o);
}

function validEntry(entry: unknown): entry is Ieee802WorldScheduleEntry {
	return (
		isGenericObject(entry) &&
		typeof entry.id === "number" &&
		typeof entry.startTime === "string" &&
		typeof entry.endTime === "string"
	);
}

function validResponse(
	response: unknown
): response is Ieee802WorldScheduleEntry[] {
	return Array.isArray(response) && response.every(validEntry);
}

const url = "/api/802world";
export const load802WorldSchedule = (): AppThunk => async (dispatch) => {
	dispatch(getPending());
	let response: unknown;
	try {
		response = await fetcher.get(url);
		if (!validResponse(response))
			throw new TypeError("Unexpected response");
	} catch (error) {
		dispatch(getFailure());
		dispatch(setError("Unable to get 802world schedule", error));
		return;
	}
	dispatch(getSuccess(response));
};

export const importSelectedAsMeetings =
	(): AppThunk => async (dispatch, getState) => {
		const state = getState();
		const { selected, entities } = select802WorldState(state);
		const { ids: groupIds, entities: groupEntities } =
			selectGroupsState(state);
		const sessionId = selectCurrentSessionId(state)!;
		const session = selectSessionEntities(state)[sessionId];
		const defaultWebexAccountId = selectWebexAccountDefaultId(state);
		const defaultCalendarAccountId = selectCalendarAccountDefaultId(state);

		if (!session) {
			dispatch(setError("Session not selected", null));
			return;
		}

		const meetings: MeetingCreate[] = [];
		for (const id of selected) {
			const entry = entities[id]!;

			let groupName = entry.groupName.split("/")[0]; // Sometimes: "11/15/18/19"
			groupName = groupName.startsWith("802")
				? "802"
				: "802." + groupName; // Sometimes "802W"
			const groupId = groupIds.find(
				(id) => groupEntities[id]!.name === groupName
			);

			/* Meeting name is in the form:
			 *   TGbe (Joint) - Extremely High Throughput
			 *   Opening Plenary
			 *   Mid-week Plenary
			 *   etc.
			 */
			const [subgroupName] = entry.meeting.split(" - ");
			let organizationId =
				(groupIds.find(
					(id) =>
						groupEntities[id]!.name === subgroupName &&
						groupEntities[id]!.parent_id === groupId
				) as string) || null;
			if (!organizationId) {
				organizationId = (groupId as string) || null;
				if (!organizationId) {
					dispatch(
						setError(
							"Can't determine group/subgroup",
							`group=${entry.groupName} meeting=${entry.meeting}`
						)
					);
					return;
				}
			}

			const room = session.rooms.find((r) => r.name === entry.mtgRoom);

			let webexMeeting: WebexMeetingCreate | undefined;
			if (defaultWebexAccountId) {
				webexMeeting = {
					...defaultWebexMeetingParams,
					accountId: defaultWebexAccountId,
				};
			}

			const meeting: MeetingCreate = {
				organizationId,
				summary: subgroupName.trim(),
				start: DateTime.fromFormat(
					`${entry.breakoutDate} ${entry.startTime}`,
					"yyyy-MM-dd HH:mm:ss",
					{ zone: session.timezone }
				).toISO()!,
				end: DateTime.fromFormat(
					`${entry.breakoutDate} ${entry.endTime}`,
					"yyyy-MM-dd HH:mm:ss",
					{ zone: session.timezone }
				).toISO()!,
				timezone: session.timezone,
				sessionId: session.id,
				location: entry.mtgRoom,
				roomId: room?.id || null,
				imatMeetingId: session.imatMeetingId || null,
				imatBreakoutId: session.imatMeetingId ? "$add" : null,
				hasMotions: false,
				isCancelled: false,
				webexAccountId: defaultWebexAccountId,
				webexMeetingId: defaultWebexAccountId ? "$add" : null,
				calendarAccountId: defaultCalendarAccountId,
				calendarEventId: null,
				webexMeeting,
			};
			meetings.push(meeting);
		}
		dispatch(addMeetings(meetings));
	};
