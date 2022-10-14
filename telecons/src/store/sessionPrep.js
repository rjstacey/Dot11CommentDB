import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';
import {isObject} from 'dot11-components/lib';

import {selectSessionEntities, setSessionsSelected} from './sessions';

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
export const selectSessionId = (state) => selectSessionPrepState(state).sessionId;

export const selectSession = (state) => {
	const entities = selectSessionEntities(state);
	const id = selectSessionId(state);
	return entities[id];
}

export const selectSessionDates = createSelector(
	selectSession,
	(session) => {
		let dates = [];
		if (session) {
			const start = DateTime.fromISO(session.startDate);
			const end = DateTime.fromISO(session.endDate).plus({days: 1});
			const nDays = end.diff(start, 'days').days;
			if (nDays > 0) {
				dates = new Array(nDays)
					.fill(null)
					.map((d, i) => start.plus({days: i}).toISODate());
			}
		}
		return dates;
	}
);

export const selectRooms = (state) => selectSession(state)?.rooms;
export const selectTimeslots = (state) => selectSession(state)?.timeslots;

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

function toggleListItems(list, items) {
	for (let id of items) {
		const i = list.indexOf(id);
		if (i >= 0)
			list.splice(i, 1);
		else
			list.push(id);
	}
}

const dataAdapter = createEntityAdapter({sortComparer});

const slice = createSlice({
	name: dataSet,
	initialState: {
		sessionId: 0,
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
		setSessionId(state, action) {
			state.sessionId = action.payload;
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
	setSessionId: setLocalSessionId,
	setSelectedSlots,
	toggleSelectedSlots,
	setSelectedMeetings,
	toggleSelectedMeetings,
} = slice.actions;

export {setSelectedSlots, toggleSelectedSlots, setSelectedMeetings, toggleSelectedMeetings};

export const setSessionId = (id) =>
	async (dispatch, getState) => {
		dispatch(setLocalSessionId(id));
		dispatch(setSessionsSelected([id]));
	}

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
