import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {isObject} from 'dot11-components/lib';

import {selectTeleconEntities, upsertTelecons} from './telecons';

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

/*
 * selectSyncedBreakoutEntities(state)
 */
export const selectSyncedBreakoutEntities = createSelector(
	selectBreakoutMeetingId,
	selectBreakoutEntities,
	selectTeleconEntities,
	(meetingId, breakoutEntities, teleconEntities) =>
		Object.values(breakoutEntities).reduce((entities, breakout) => {
			const telecon = Object.values(teleconEntities).find(t => t.imatMeetingId === meetingId && t.imatBreakoutId === breakout.id);
			entities[breakout.id] = {
				...breakout,
				meetingId,
				teleconId: telecon? telecon.id: null
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
	},
	reducers: {
		setDetails(state, action) {
			state.meetingId = action.payload.meetingId;
			state.timeslots = action.payload.timeslots;
			state.committees = action.payload.committees;
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
	removeMany
} = slice.actions;

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
		dispatch(upsertTelecons(response.telecons));
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