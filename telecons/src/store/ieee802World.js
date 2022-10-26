import {createSelector} from '@reduxjs/toolkit';
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error'
import {DateTime} from 'luxon';

import {selectGroupsState} from './groups';
import {selectCurrentSessionId} from './current';
import {selectSessionEntities} from './sessions';
import {addMeetings, selectMeetingEntities} from './meetings';

function displayDate(isoDate) {
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
export function getField(entity, key) {
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
	return entity[key];
}

/*
 * Selectors
 */
export const select802WorldState = (state) => state[dataSet];
export const select802WorldEntities = (state) => select802WorldState(state).entities;

export const selectSynced802WorldEntities = createSelector(
	select802WorldEntities,
	selectMeetingEntities,
	(entities, meetingEntities) => 
		Object.entries(entities).reduce((entities, [key, entry]) => {
			/* Find a meeting that matches start, end and name */
			const m = Object.values(meetingEntities).find(m => {
				const entryStart = DateTime.fromFormat(`${entry.breakoutDate} ${entry.startTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: m.timezone});
				const entryEnd = DateTime.fromFormat(`${entry.breakoutDate} ${entry.endTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: m.timezone});
				const meetingSummary = m.summary.replace('802.11', '').trim();
				return (entryStart.equals(DateTime.fromISO(m.start, {zone: m.timezone})) &&
						entryEnd.equals(DateTime.fromISO(m.end, {zone: m.timezone})) &&
						entry.meeting.startsWith(meetingSummary));
			});
			const meetingId = m? m.id: null;
			return {...entities, [key]: {...entry, meetingId}};
		}, {})
);

/*
 * Slice
 */
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	initialState: {},
	selectEntities: selectSynced802WorldEntities,
});

export default slice;


 /*
  * Actions
  */
const {getPending, getSuccess, getFailure} = slice.actions;

const url = '/api/802world';

export const load802WorldSchedule = () => 
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
			await dispatch(getFailure());
			await dispatch(setError('Unable to get 802world schedule', error));
			return;
		}
		await dispatch(getSuccess(response));
	}

export const importSelectedAsMeetings = () =>
	async (dispatch, getState) => {
		const state = getState();
		const {selected, entities} = select802WorldState(state);
		const {ids: groupIds, entities: groupEntities} = selectGroupsState(state);
		const sessionId = selectCurrentSessionId(state);
		const session = selectSessionEntities(state)[sessionId];

		if (!session) {
			dispatch(setError('Session not selected'));
			return;
		}

		const telecons = [];
		for (const id of selected) {
			const entry = entities[id];
			const telecon = {sessionId};

			let groupNames = entry.groupName.split('/');
			groupNames = groupNames.map(name => '802.' + name);
			const orgIds = groupNames.map(groupName => groupIds.find(id => groupEntities[id].name === groupName));
			if (!orgIds.every(name => typeof name !== 'undefined')) {
				dispatch(setError("Unknown groups in groupName", entry.groupName));
				return;
			}
			const groupName = groupEntities[orgIds[0]].name;

			/* Meeting name is in the form:
			 *   TGbe (Joint) - Extremely High Throughput
			 *   Opening Plenary
			 *   Mid-week Plenary
			 *   etc.
			 */
			const [subgroupName] = entry.meeting.split(' - ');
			telecon.organizationId = groupIds.find(id => groupEntities[id].name === subgroupName && orgIds.includes(groupEntities[id].parent_id));
			if (!telecon.organizationId) {
				telecon.organizationId = orgIds[0];
				if (!telecon.organizationId) {
					dispatch(setError("Can't determine group/subgroup", `group=${entry.groupName} meeting=${entry.meeting}`));
					return;
				}
			}

			telecon.summary = `${groupName} ${subgroupName}`;
			telecon.start = DateTime.fromFormat(`${entry.breakoutDate} ${entry.startTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: session.timezone});
			telecon.end = DateTime.fromFormat(`${entry.breakoutDate} ${entry.endTime}`, 'yyyy-MM-dd HH:mm:ss', {zone: session.timezone});
			telecon.timezone = session.timezone;
			telecon.location = entry.mtgRoom;
			telecons.push(telecon);
		}
		//console.log(telecons);
		dispatch(addMeetings(telecons));
	}