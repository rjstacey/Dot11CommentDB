import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import {fetcher, isObject} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

import {selectMeetingEntities} from './meetings';
import {selectImatMeetingEntities} from './imatMeetings';

const displayGroup = (group) => {
	const parts = group.split('/');
	return parts[parts.length-1];
}

export const fields = {
	id: {label: 'Breakout ID', sortType: SortType.NUMERIC},
	imatMeetingId: {label: 'Meeting number', sortType: SortType.NUMERIC},
	start: {label: 'Start', sortType: SortType.DATE},
	end: {label: 'End', sortType: SortType.DATE},
	weekDay: {label: 'Day'},
	date: {label: 'Date'},
	dayDate: {label: 'Date'},
	timeRange: {label: 'Time'},
	startTime: {label: 'Start time'},
	endTime: {label: 'End time'},
	location: {label: 'Location'},
	symbol: {label: 'Group', dataRenderer: displayGroup},
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
export const selectBreakoutMeetingId = (state) => selectBreakoutsState(state).imatMeetingId;
export const selectBreakoutRooms = (state) => selectBreakoutsState(state).rooms;
export const selectBreakoutTimeslots = (state) => selectBreakoutsState(state).timeslots;
export const selectImatMeeting = (state) => {
	const imatMeetingId = selectBreakoutMeetingId(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingEntities[imatMeetingId];
}

/*
 * selectSyncedBreakoutEntities(state)
 */
export const selectSyncedBreakoutEntities = createSelector(
	selectBreakoutMeetingId,
	selectBreakoutEntities,
	selectMeetingEntities,
	(imatMeetingId, breakoutEntities, meetingEntities) =>
		Object.values(breakoutEntities).reduce((entities, breakout) => {
			const meeting = Object.values(meetingEntities).find(m => m.imatMeetingId === imatMeetingId && m.imatBreakoutId === breakout.id);
			entities[breakout.id] = {
				...breakout,
				imatMeetingId,
				meetingId: meeting? meeting.id: null
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
		imatMeetingId: 0,
		timeslots: [],
		committees: [],
	},
	reducers: {
		setDetails(state, action) {
			return {...state, ...action.payload};
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
	setMany,
	upsertMany,
	removeMany,
	removeAll,
	setSelected,
	toggleSelected,
	setPanelIsSplit
} = slice.actions;

export {getSuccess as setBreakouts, upsertMany as upsertBreakouts};

export {setSelected as setSelectedBreakouts, toggleSelected as toggleSelectedBreakouts};

export const setBreakoutsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});

const baseUrl = '/api/imat/breakouts';

export const loadBreakouts = (imatMeetingId) =>
	async (dispatch, getState) => {
		const state = getState();
		if (selectBreakoutsState(state).loading)
			return;
		dispatch(getPending());
		const url = `${baseUrl}/${imatMeetingId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!isObject(response) ||
				!Array.isArray(response.breakouts) ||
				!Array.isArray(response.timeslots) ||
				!Array.isArray(response.committees)) {
				throw new TypeError(`Unexpected response to GET ${url}`);
			}
		}
		catch(error) {
			console.log(error)
			dispatch(getFailure());
			dispatch(setError(`Unable to get breakouts for ${imatMeetingId}`, error));
			return;
		}
		dispatch(getSuccess(response.breakouts));
		const {timeslots, committees} = response;
		dispatch(setDetails({timeslots, committees, imatMeetingId}));
	}

export const clearBreakouts = () =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setDetails({timeslots: [], committees: [], imatMeetingId: null}));
	}

export const addBreakouts = (imatMeetingId, breakouts) => 
	async (dispatch, getState) => {
		const url = `${baseUrl}/${imatMeetingId}`;
		let response;
		try {
			response = await fetcher.post(url, breakouts);
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to POST ${url}`);
		}
		catch (error) {
			dispatch(setError('Unable to add breakouts', error));
			return;
		}
		dispatch(addMany(response));
	}

export const updateBreakouts = (imatMeetingId, breakouts) => 
	async (dispatch, getState) => {
		const url = `${baseUrl}/${imatMeetingId}`;
		let response;
		try {
			response = await fetcher.put(url, breakouts);
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to PUT ${url}`);
		}
		catch (error) {
			dispatch(setError('Unable to update breakouts', error));
			return;
		}
		dispatch(setMany(response));
	}

export const deleteBreakouts = (imatMeetingId, ids) => 
	async (dispatch, getState) => {
		const url = `${baseUrl}/${imatMeetingId}`;
		try {
			await fetcher.delete(url, ids);
		}
		catch (error) {
			dispatch(setError('Unable to delete breakouts', error));
			return;
		}
		dispatch(removeMany(ids));
	}

export const selectBreakoutsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);
