import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {isObject} from 'dot11-components/lib';

import {selectMeetingEntities, upsertMeetings} from './meetings';

const displayGroup = (group) => {
	const parts = group.split('/');
	return parts[parts.length-1];
}

export const fields = {
	id: {label: 'Breakout ID', sortType: SortType.NUMERIC},
	meetingId: {label: 'Meeting number', sortType: SortType.NUMERIC},
	start: {label: 'Start', sortType: SortType.DATE},
	end: {label: 'End', sortType: SortType.DATE},
	weekDay: {label: 'Day'},
	date: {label: 'Date'},
	dayDate: {label: 'Date'},
	timeRange: {label: 'Time'},
	startTime: {label: 'Start time'},
	endTime: {label: 'End time'},
	location: {label: 'Location'},
	group: {label: 'Group', dataRenderer: displayGroup},
	name: {label: 'Name'},
	credit: {label: 'Credit'},
};

export const dataSet = 'imatBreakouts';

export const getField = (entity, dataKey) => {
	if (dataKey === 'weekDay')
		return DateTime.fromISO(entity.start, {setZone: true}).weekdayShort;
	if (dataKey === 'date')
		return DateTime.fromISO(entity.start, {setZone: true}).toFormat('dd LLL yyyy');
	if (dataKey === 'dayDate')
		return DateTime.fromISO(entity.start, {setZone: true}).toFormat('EEE, d LLL yyyy');
	if (dataKey === 'startTime')
		return DateTime.fromISO(entity.start, {setZone: true}).toFormat('HH:mm');
	if (dataKey === 'endTime')
		return DateTime.fromISO(entity.end, {setZone: true}).toFormat('HH:mm');
	if (dataKey === 'timeRange')
		return DateTime.fromISO(entity.start, {setZone: true}).toFormat('HH:mm') + '-' +
			   DateTime.fromISO(entity.end, {setZone: true}).toFormat('HH:mm');
	if (dataKey === 'duration')
		return DateTime.fromISO(entity.end).diff(DateTime.fromISO(entity.start), 'hours').hours;
	return entity[dataKey];
}

/*
 * Selectors
 */
export const selectBreakoutsState = (state) => state[dataSet];
export const selectBreakoutEntities = (state) => selectBreakoutsState(state).entities;
const selectBreakoutMeetingId = (state) => selectBreakoutsState(state).meetingId;
export const selectBreakoutRooms = (state) => selectBreakoutsState(state).rooms;
export const selectBreakoutTimeslots = (state) => selectBreakoutsState(state).timeslots;

/*
 * selectSyncedBreakoutEntities(state)
 */
export const selectSyncedBreakoutEntities = createSelector(
	selectBreakoutMeetingId,
	selectBreakoutEntities,
	selectMeetingEntities,
	(meetingId, breakoutEntities, meetingEntities) =>
		Object.values(breakoutEntities).reduce((entities, breakout) => {
			const meeting = Object.values(meetingEntities).find(m => m.imatMeetingId === meetingId && m.imatBreakoutId === breakout.id);
			entities[breakout.id] = {
				...breakout,
				meetingId,
				teleconId: meeting? meeting.id: null
			};
			return entities;
		}, {})
);

const sortComparer = (a, b) => {
	// Sort by start
	const v1 = DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis();
	if (v1 === 0) {
		// If equal, sort by end
		return DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis();
	}
	return v1;
}

const otherRoom = {id: 0, name: 'Other', description: 'Not a room'};

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	selectField: getField,
	selectEntities: selectSyncedBreakoutEntities,
	initialState: {
		meetingId: 0,
		timeslots: [],
		committees: [],
		rooms: [otherRoom]
	},
	reducers: {
		setDetails(state, action) {
			return {...state, ...action.payload};
		},
		addTimeslot(state, action) {
			const slot = action.payload;
			const {timeslots} = state;
			const id = timeslots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0) + 1;
			timeslots.push({...slot, id});
		},
		removeTimeslot(state, action) {
			const id = action.payload;
			const {timeslots} = state;
			const i = timeslots.findIndex(slot => slot.id === id);
			if (i >= 0)
				timeslots.splice(i, 1);
		},
		updateTimeslot(state, action) {
			const {id, changes} = action.payload;
			const {timeslots} = state;
			const i = timeslots.findIndex(slot => slot.id === id);
			if (i >= 0)
				timeslots[i] = {...timeslots[i], ...changes};
		},
		setRooms(state, action) {
			const rooms = action.payload.slice();
			rooms.unshift(otherRoom);
			state.rooms = rooms;
		},
		addRoom(state, action) {
			const room = action.payload;
			const {rooms} = state;
			const id = rooms.reduce((maxId, room) => Math.max(maxId, room.id), 0) + 1;
			rooms.push({...room, id});
		},
		removeRoom(state, action) {
			const id = action.payload;
			if (id) {
				const {rooms} = state;
				const i = rooms.findIndex(room => room.id === id);
				if (i >= 0)
					rooms.splice(i, 1);
			}
		},
		updateRoom(state, action) {
			const {id, changes} = action.payload;
			if (id) {
				const {rooms} = state;
				const i = rooms.findIndex(room => room.id === id);
				if (i >= 0)
					rooms[i] = {...rooms[i], ...changes};
			}
		}
	},
});

export default slice;


/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
	addMany,
	removeMany,
	setSelected,
	toggleSelected
} = slice.actions;

export {setSelected as setSelectedBreakouts, toggleSelected as toggleSelectedBreakouts};

const baseUrl = '/api/imat/breakouts';

export const loadBreakouts = (meetingId) =>
	async (dispatch, getState) => {
		const state = getState();
		if (selectBreakoutsState(state).loading)
			return;
		dispatch(getPending());
		const url = `${baseUrl}/${meetingId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!isObject(response) ||
				!Array.isArray(response.breakouts) ||
				!Array.isArray(response.timeslots) ||
				!Array.isArray(response.committees) ||
				!isObject(response.session) ||
				response.session.id !== meetingId) {
				throw new TypeError(`Unexpected response to GET ${url}`);
			}
		}
		catch(error) {
			console.log(error)
			dispatch(getFailure());
			dispatch(setError(`Unable to get breakouts for ${meetingId}`, error));
			return;
		}
		dispatch(getSuccess(response.breakouts));
		dispatch(setDetails({...response, meetingId}));
	}

export const addBreakouts = (meetingId, breakouts) => 
	async (dispatch, getState) => {
		const url = `${baseUrl}/${meetingId}`;
		let response;
		try {
			response = await fetcher.post(url, breakouts);
			if (!isObject(response) ||
				!Array.isArray(response.breakouts) ||
				!Array.isArray(response.telecons))
				throw new TypeError(`Unexpected response to POST ${url}`);
		}
		catch (error) {
			dispatch(setError('Unable to add breakouts', error));
			return;
		}
		dispatch(addMany(response.breakouts));
		dispatch(upsertMeetings(response.telecons));
	}

export const updateBreakouts = (meetingId, updates) => 
	async (dispatch, getState) => {
		const url = `${baseUrl}/${meetingId}`;
		let response;
		try {
			response = await fetcher.put(url, updates);
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to PUT ${url}`);
		}
		catch (error) {
			dispatch(setError('Unable to update breakouts', error));
			return;
		}
		//dispatch(updateMany(response));
	}

export const deleteBreakouts = (meetingId, ids) => 
	async (dispatch, getState) => {
		const url = `${baseUrl}/${meetingId}`;
		try {
			await fetcher.delete(url, ids);
		}
		catch (error) {
			dispatch(setError('Unable to delete breakouts', error));
			return;
		}
		dispatch(removeMany(ids));
	}

const {setRooms, addRoom, updateRoom, removeRoom} = slice.actions;

export {addRoom, updateRoom, removeRoom};

export const deriveRoomsFromBreakouts = () =>
	async (dispatch, getState) => {
		const entities = selectBreakoutEntities(getState());
		let rooms = Object.values(entities).reduce((rooms, breakout) => {
			if (breakout.location)
				rooms.add(breakout.location)
			return rooms;
		}, new Set());
		rooms = [...rooms].map((name, i) => ({id: i+1, name, description: ''}));
		dispatch(setRooms(rooms));
	}


const {addTimeslot, updateTimeslot, removeTimeslot} = slice.actions;

export {addTimeslot, updateTimeslot, removeTimeslot};
