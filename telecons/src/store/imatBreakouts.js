import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {isObject} from 'dot11-components/lib';

import {selectTeleconEntities} from './telecons';

const fields = {
	uuid: {label: 'ID', isId: true},
	id: {label: 'Breakout ID', sortType: SortType.NUMERIC},
	start: {label: 'Start', sortType: SortType.DATE},
	end: {label: 'End', sortType: SortType.DATE},
	weekDay: {label: 'Day'},
	dayDate: {label: 'Date'},
	time: {label: 'Time'},
	location: {label: 'Location'},
	group: {label: 'Group'},
	name: {label: 'Name'},
	credit: {label: 'Credit'},
};

export const dataSet = 'imatBreakouts';

export const getField = (entity, dataKey) => {
	if (!entity.hasOwnProperty(dataKey)) {
		if (dataKey === 'dayDate') {
			const start = DateTime.fromISO(entity.start, {zone: entity.timezone});
			return start.toFormat('EEE, d LLL yyyy');
		}
		if (dataKey === 'weekDay') {
			const start = DateTime.fromISO(entity.start, {zone: entity.timezone});
			return start.weekdayShort();
		}
		if (dataKey === 'time') {
			const start = DateTime.fromISO(entity.start, {zone: entity.timezone});
			const end = DateTime.fromISO(entity.end, {zone: entity.timezone});
			return start.toFormat('HH:mm') + ' - ' + end.toFormat('HH:mm');
		}
	}
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

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
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

/*
 * Reducer
 */
export default slice.reducer;


/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
	addMany
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
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to POST ${url}`);
		}
		catch (error) {
			dispatch(setError('Unable to add breakouts', error));
			return;
		}
		dispatch(addMany(response.breakouts));
	}

export const updateBreakout = (meetingId, updates) => 
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