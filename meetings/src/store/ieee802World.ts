import { createSelector, Dictionary } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType,
	AppTableDataState,
	isObject,
	//displayDateRange
} from 'dot11-components';

import type { AppThunk, RootState } from '.';
import { selectGroupEntities, selectGroupsState } from './groups';
import { selectCurrentSessionId } from './current';
import { selectSessionEntities, selectCurrentSession } from './sessions';
import { addMeetings, selectMeetingEntities, Meeting } from './meetings';

type Ieee802WorldScheduleEntry = {
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
}

type SyncedIeee802WorldScheduleEntry = Ieee802WorldScheduleEntry & {
	meetingId: number | null;
}

export const dataSet = 'ieee802World';

export const fields = {
	id: {label: 'ID', sortType: SortType.NUMERIC},
	breakoutDate: {label: 'Date', dataRenderer: displayDate},
	date: {label: 'Date'},
	day: {label: 'Day'},
	dayDate: {label: 'Day, Date'},
	startTime: {label: 'Start time'},
	endTime: {label: 'End time'},
	timeRange: {label: 'Time'},
	postAs: {label: 'Summary'},
	meeting: {label: 'Meeting'},
	comments: {label: 'Comments'},
	mtgRoom: {label: 'Room'},
	mtgHotel: {label: 'Hotel'},
	mtgLevel: {label: 'Level'},
	mtgLocation: {label: 'Location'},
	groupName: {label: 'Group'},
	meetingId: {label: 'Meeting ID', dontSort: true, dontFilter: true},
};

/*
 * Fields derived from other fields
 */
export function getField(entity: Ieee802WorldScheduleEntry, key: string) {
	if (key === 'day')
		return DateTime.fromISO(entity.breakoutDate).weekdayShort;
	if (key === 'date')
		return DateTime.fromISO(entity.breakoutDate).toFormat('dd LLL yyyy');
	if (key === 'dayDate')
		return DateTime.fromISO(entity.breakoutDate).toFormat('EEE, dd LLL yyyy');
	if (key === 'timeRange')
		return entity.startTime.substring(0, 5) + '-' + entity.endTime.substring(0, 5);
	if (!entity.hasOwnProperty(key))
		console.warn(dataSet + ' has no field ' + key);
	return entity[key as keyof Ieee802WorldScheduleEntry];
}

/*
 * Selectors
 */
export const select802WorldState = (state: RootState) => state[dataSet] as AppTableDataState<Ieee802WorldScheduleEntry>;
export const select802WorldEntities = (state: RootState) => select802WorldState(state).entities;
export const select802WorldIds = (state: RootState) => select802WorldState(state).ids;

export const selectSynced802WorldEntities = createSelector(
	select802WorldIds,
	select802WorldEntities,
	selectMeetingEntities,
	selectGroupEntities,
	selectCurrentSession,
	(ids, entities, meetingEntities, groupEntities, session) => {
		const newEntities: Dictionary<SyncedIeee802WorldScheduleEntry> = {};
		for (const id of ids) {
			const entity = entities[id]!;
			const entityGroupName = entity.groupName.startsWith('802')? '802': '802.' + (entity.groupName);
			const entityGroupId = Object.values(groupEntities).find(group => group!.name === entityGroupName)?.id || null;
			const entityRoomId = session?.rooms.find(room => room!.name === entity.mtgRoom)?.id || null;
			const entityStart = DateTime.fromFormat(`${entity.breakoutDate} ${entity.startTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: session?.timezone || 'America/New_York'});
			/* Find a meeting that matches group, start, and room */
			const m = Object.values(meetingEntities).find(m => {
				const groupId = m!.organizationId;
				const parentGroupId = groupId? (groupEntities[groupId]?.parent_id || null): null;
				const start = DateTime.fromISO(m!.start, {zone: m!.timezone});
				const roomId = m!.roomId;
				return ((entityGroupId === groupId || entityGroupId === parentGroupId) &&
						entityStart.equals(start) &&
						entityRoomId === roomId);
			});
			const meetingId = m?.id || null;
			//const meetingSummary = m? `${m.summary} ${m.roomName} ${displayDateRange(m.start, m.end)}`: '';
			newEntities[id] = {
				...entity,
				meetingId,
			}
		}
		return newEntities;
	}
);

export const ieee802WorldSelectors = getAppTableDataSelectors(select802WorldState, {selectEntities: selectSynced802WorldEntities, getField});

/*
 * Slice
 */
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {}
});

export default slice;


 /*
  * Actions
  */
export const ieee802WorldActions = slice.actions;

const {getPending, getSuccess, getFailure} = slice.actions;

const url = '/api/802world';

function validEntry(entry: any): entry is Ieee802WorldScheduleEntry {
	return isObject(entry) &&
		typeof entry.id === 'number' &&
		typeof entry.startTime === 'string' &&
		typeof entry.endTime === 'string';
}

function validResponse(response: any): response is Ieee802WorldScheduleEntry[] {
	return Array.isArray(response) && response.every(validEntry);
}

export const load802WorldSchedule = (): AppThunk => 
	async (dispatch) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			console.warn(error)
			dispatch(getFailure());
			dispatch(setError('Unable to get 802world schedule', error));
			return;
		}
		dispatch(getSuccess(response));
	}

export const importSelectedAsMeetings = (): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const {selected, entities} = select802WorldState(state);
		const {ids: groupIds, entities: groupEntities} = selectGroupsState(state);
		const sessionId = selectCurrentSessionId(state)!;
		const session = selectSessionEntities(state)[sessionId];

		if (!session) {
			dispatch(setError('Session not selected', null));
			return;
		}

		const meetings: Meeting[] = [];
		for (const id of selected) {
			const entry = entities[id]!;
			const meeting: Partial<Meeting> = {sessionId};

			let groupName = entry.groupName.split('/')[0];	// Sometimes: "11/15/18/19"
			groupName = groupName.startsWith('802')? '802': ('802.' + groupName);	// Sometimes "802W"
			const groupId = groupIds.find(id => groupEntities[id]!.name === groupName);

			/* Meeting name is in the form:
			 *   TGbe (Joint) - Extremely High Throughput
			 *   Opening Plenary
			 *   Mid-week Plenary
			 *   etc.
			 */
			const [subgroupName] = entry.meeting.split(' - ');
			meeting.organizationId = (groupIds.find(id => groupEntities[id]!.name === subgroupName && groupEntities[id]!.parent_id === groupId) as string) || null;
			if (!meeting.organizationId) {
				meeting.organizationId = groupId as string || null;
				if (!meeting.organizationId) {
					dispatch(setError("Can't determine group/subgroup", `group=${entry.groupName} meeting=${entry.meeting}`));
					return;
				}
			}

			meeting.summary = `${groupName} ${subgroupName}`;
			meeting.start = DateTime.fromFormat(`${entry.breakoutDate} ${entry.startTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: session.timezone}).toISO()!;
			meeting.end = DateTime.fromFormat(`${entry.breakoutDate} ${entry.endTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: session.timezone}).toISO()!;
			meeting.timezone = session.timezone;
			meeting.location = entry.mtgRoom;
			meetings.push(meeting as Meeting);
		}
		dispatch(addMeetings(meetings));
	}
