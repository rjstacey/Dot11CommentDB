import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {isObject} from 'dot11-components/lib';

import {selectTeleconEntities, upsertTelecons} from './telecons';

export const dataSet = 'sessionPrep';

export const toSlotId = (date, slot, room) => `${date}/${slot.id}/${room.id}`;
export const fromSlotId = (id) => {
	const p = id.split('/');
	return [p[0], parseInt(p[1]), parseInt(p[2])];
}

/*
 * Selectors
 */
export const selectSessionPrepState = (state) => state[dataSet];
export const selectSessionPrepEntities = (state) => selectSessionPrepState(state).entities;
export const selectSessionPrepIds = (state) => selectSessionPrepState(state).ids;
export const selectSessionPrepRooms = (state) => selectSessionPrepState(state).rooms;
export const selectSessionPrepTimeslots = (state) => selectSessionPrepState(state).timeslots;
export const selectSession = (state) => selectSessionPrepState(state).session;
export const selectSessionPrepDates = createSelector(
	selectSession,
	(session) => {
		const start = DateTime.fromISO(session.start);
		const end = DateTime.fromISO(session.end).plus({days: 1});
		const nDays = end.diff(start, 'days').days;
		let dates = [];
		if (nDays >= 0) {
			dates = new Array(nDays)
				.fill(null)
				.map((d, i) => start.plus({days: i}).toISODate());
		}
		return dates;
	}
);

export const selectSelectedMeetings = (state) => selectSessionPrepState(state).selectedMeetings;
export const selectSelectedSlots = (state) => selectSessionPrepState(state).selectedSlots;

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

function toggleListItems(list, items) {
	for (let id of items) {
		const i = list.indexOf(id);
		if (i >= 0)
			list.splice(i, 1);
		else
			list.push(id);
	}
}

const defaultSession = {
	name: '',
	type: 'p',
	start: new Date().toISOString().substring(0,10),
	end: new Date().toISOString().substring(0,10),
	timezone: 'America/New_York'
}

const dataAdapter = createEntityAdapter({sortComparer});

const slice = createSlice({
	name: dataSet,
	initialState: {
		meetingId: 0,
		session: defaultSession,
		timeslots: [],
		committees: [],
		rooms: [otherRoom],
		selectedSlots: [],
		selectedMeetings: [],
		loading: false,
		valid: false,
		...dataAdapter.getInitialState()
	},
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
			getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		setAll: dataAdapter.setAll,
		setOne: dataAdapter.setOne,
		setMany: dataAdapter.setMany,
		addOne: dataAdapter.addOne,
		addMany: dataAdapter.addMany,
		updateOne: dataAdapter.updateOne,
		updateMany: dataAdapter.updateMany,
		upsertOne: dataAdapter.upsertOne,
		upsertMany: dataAdapter.upsertMany,
		removeOne: dataAdapter.removeOne,
		removeMany: dataAdapter.removeMany,
		removeAll: dataAdapter.removeAll,
		setDetails(state, action) {
			return {...state, ...action.payload};
		},
		setSession(state, action) {
			state.session = action.payload;
		},
		updateSession(state, action) {
			const {session} = state;
			state.session = {...session, ...action.payload};
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
		},
		setSelectedMeetings(state, action) {
			state.selectedMeetings = action.payload;
		},
		toggleSelectedMeetings(state, action) {
			toggleListItems(state.selectedMeetings, action.payload);
		},
		setSelectedSlots(state, action) {
			state.selectedSlots = action.payload;
		},
		toggleSelectedSlots(state, action) {
			toggleListItems(state.selectedSlots, action.payload);
		},
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
	updateMany,
	removeMany,
	setSession,
	updateSession,
	setSelectedSlots,
	toggleSelectedSlots,
	setSelectedMeetings,
	toggleSelectedMeetings,
} = slice.actions;

export {setSelectedSlots, toggleSelectedSlots, setSelectedMeetings, toggleSelectedMeetings};

export {setSession, updateSession};

const baseUrl = '/api/imat/breakouts';

export const loadBreakouts = (meetingId) =>
	async (dispatch, getState) => {
		const state = getState();
		if (selectSessionPrepState(state).loading)
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

export const addMeetings = (meetings) => 
	async (dispatch, getState) => {
		/*const url = `${baseUrl}/${meetingId}`;
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
		}*/
		const ids = selectSessionPrepIds(getState());
		let maxId = ids.reduce((maxId, id) => Math.max(maxId, id), 0) + 1;
		const newMeetings = meetings.map(m => {
			return {id: maxId++, ...m}
		});
		dispatch(addMany(newMeetings));
		return newMeetings;
	}

export const updateMeetings = (updates) => 
	async (dispatch, getState) => {
		/*const url = `${baseUrl}/${meetingId}`;
		let response;
		try {
			response = await fetcher.put(url, updates);
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to PUT ${url}`);
		}
		catch (error) {
			dispatch(setError('Unable to update breakouts', error));
			return;
		}*/
		dispatch(updateMany(updates));
	}

export const deleteMeetings = (ids) => 
	async (dispatch, getState) => {
		/*const url = `${baseUrl}/${meetingId}`;
		try {
			await fetcher.delete(url, ids);
		}
		catch (error) {
			dispatch(setError('Unable to delete breakouts', error));
			return;
		}*/
		dispatch(removeMany(ids));
	}

const {setRooms, addRoom, updateRoom, removeRoom} = slice.actions;

export {addRoom, updateRoom, removeRoom};

export const deriveRoomsFromBreakouts = () =>
	async (dispatch, getState) => {
		const entities = selectSessionPrepEntities(getState());
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
