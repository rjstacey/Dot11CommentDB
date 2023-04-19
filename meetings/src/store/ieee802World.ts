import { createSelector, Dictionary } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	AppTableDataState,
	SortType
} from 'dot11-components';

import {selectGroupsState} from './groups';
import {selectCurrentSessionId} from './current';
import {selectSessionEntities} from './sessions';
import { addMeetings, selectMeetingEntities, Meeting } from './meetings';
import { AppThunk, RootState } from '.';

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
	//meetingId: number;
}

function displayDate(isoDate: string) {
	// ISO date: "YYYY-MM-DD"
	const year = parseInt(isoDate.substr(0, 4));
	const month = parseInt(isoDate.substr(5, 7));
	const date = parseInt(isoDate.substr(8, 10));
	const monthStr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${year} ${monthStr[month] || '???'} ${date}`; 
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
	meetingId: {label: 'Meeting ID'}
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

type Ieee802WorldState = AppTableDataState<Ieee802WorldScheduleEntry>;

/*
 * Selectors
 */
export const select802WorldState = (state: RootState) => state[dataSet] as Ieee802WorldState;
export const select802WorldEntities = (state: RootState) => select802WorldState(state).entities;

type SyncedIeee802WorldScheduleEntry = Ieee802WorldScheduleEntry & {
	meetingId: number | null;
}

export const selectSynced802WorldEntities = createSelector(
	select802WorldEntities,
	selectMeetingEntities,
	(entities, meetingEntities) => {
		const newEntities: Dictionary<SyncedIeee802WorldScheduleEntry> = {};
		for (const [key, entry] of Object.entries(entities)) {
			/* Find a meeting that matches start, end and name */
			const m = Object.values(meetingEntities).find(m => {
				const entryStart = DateTime.fromFormat(`${entry!.breakoutDate} ${entry!.startTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: m!.timezone});
				const entryEnd = DateTime.fromFormat(`${entry!.breakoutDate} ${entry!.endTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: m!.timezone});
				const meetingSummary = m!.summary.replace('802.11', '').trim();
				return (entryStart.equals(DateTime.fromISO(m!.start, {zone: m!.timezone})) &&
						entryEnd.equals(DateTime.fromISO(m!.end, {zone: m!.timezone})) &&
						entry!.meeting.startsWith(meetingSummary));
			});
			newEntities[key] = {...entry!, meetingId: m?.id || null}
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

export const load802WorldSchedule = (): AppThunk => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
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

			let groupNames = entry.groupName.split('/');
			groupNames = groupNames.map(name => '802.' + name);
			const orgIds = groupNames.map(groupName => groupIds.find(id => groupEntities[id]!.name === groupName));
			if (!orgIds.every(name => typeof name !== 'undefined')) {
				dispatch(setError("Unknown groups in groupName", entry.groupName));
				return;
			}
			const groupName = groupEntities[orgIds[0]!]!.name;

			/* Meeting name is in the form:
			 *   TGbe (Joint) - Extremely High Throughput
			 *   Opening Plenary
			 *   Mid-week Plenary
			 *   etc.
			 */
			const [subgroupName] = entry.meeting.split(' - ');
			meeting.organizationId = groupIds.find(id => groupEntities[id]!.name === subgroupName && orgIds.includes(groupEntities[id]!.parent_id || '')) as string;
			if (!meeting.organizationId) {
				meeting.organizationId = orgIds[0] as string;
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
		//console.log(telecons);
		dispatch(addMeetings(meetings));
	}
