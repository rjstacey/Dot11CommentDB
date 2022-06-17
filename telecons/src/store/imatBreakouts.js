import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';
import { v4 as genUuid } from 'uuid';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {isObject} from 'dot11-components/lib';

import {selectSyncedTeleconEntities} from './telecons';
import {selectImatMeetingsEntities} from './imatMeetings';

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
			const start = DateTime.fromISO(entity.start, {zone: entity.TimeZone});
			return start.toFormat('EEE, d LLL yyyy');
		}
		if (dataKey === 'weekDay') {
			const start = DateTime.fromISO(entity.start, {zone: entity.TimeZone});
			return start.weekdayShort();
		}
		if (dataKey === 'time') {
			const start = DateTime.fromISO(entity.start, {zone: entity.TimeZone});
			const end = DateTime.fromISO(entity.end, {zone: entity.TimeZone});
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
const selectBreakoutMeetingNumber = (state) => selectBreakoutsState(state).meetingNumber;

/*
 * selectSyncedBreakouts(state)
 *
 */
export const selectSyncedBreakoutEntities = createSelector(
	selectBreakoutMeetingNumber,
	selectImatMeetingsEntities,
	selectBreakoutEntities,
	selectSyncedTeleconEntities,
	(meetingNumber, meetingEntities, breakoutEntities, teleconEntities) => {
		const meeting = meetingEntities[meetingNumber];
		const tEntities = {};
		if (meeting) {
			for (const t of Object.values(teleconEntities)) {
				if (DateTime.fromISO(t.start) >= DateTime.fromISO(meeting.Start) &&
					DateTime.fromISO(t.end) <= DateTime.fromISO(meeting.End))
					tEntities[t.id] = t;
			}
		}
		const bEntities = {};
		for (const breakout of Object.values(breakoutEntities)) {
			let b = {...breakout, meetingNumber};
			for (const t of Object.values(tEntities)) {
				if (t.imatMeetingId === meetingNumber && t.imatBreakoutId === b.id) {
					b.teleconId = t.id;
					break;
				}
			}
			bEntities[b.uuid] = b;
		}
		for (const t of Object.values(tEntities)) {
			if (!t.imatBreakoutId) {
				const uuid = genUuid();
				bEntities[uuid] = {
					uuid,
					name: t.groupName,
					location: "location",
					group: t.groupName,
					start: t.start,
					end: t.end,
					credit: "Zero",
					teleconId: t.id,
				}
			}
		}
		return bEntities;
	}
);

export const selectBreakoutIds = createSelector(
	selectSyncedBreakoutEntities,
	(entities) => Object.keys(entities)
			.sort((a, b) => (entities[a].start < entities[b].start) ? -1 : ((entities[a].start > entities[b].start) ? 1 : 0))
);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId: (entity) => entity.uuid,
	selectField: getField,
	selectEntities: selectSyncedBreakoutEntities,
	selectIds: selectBreakoutIds,
	initialState: {
		meetingNumber: 0,
		timeslots: [],
		committees: [],
	},
	reducers: {
		setDetails(state, action) {
			state.meetingNumber = action.payload.meetingNumber;
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
	setDetails
} = slice.actions;

export const loadBreakouts = (meetingNumber) =>
	async (dispatch, getState) => {
		const state = getState();
		if (selectBreakoutsState(state).loading)
			return;
		dispatch(getPending());
		const url = `/api/imat/breakouts/${meetingNumber}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!isObject(response) ||
				!Array.isArray(response.breakouts) ||
				!Array.isArray(response.timeslots) ||
				!Array.isArray(response.committees) ||
				!isObject(response.session) ||
				response.session.MeetingNumber != meetingNumber) {
				console.log(typeof meetingNumber, typeof response.session.MeetingNumber)
				throw new TypeError(`Unexpected response to GET ${url}`);
			}
		}
		catch(error) {
			console.log(error)
			dispatch(getFailure());
			dispatch(setError(`Unable to get breakouts for ${meetingNumber}`, error));
			return;
		}
		const breakouts = response.breakouts.map(b => ({uuid: genUuid(), ...b}));
		dispatch(getSuccess(breakouts));
		dispatch(setDetails({...response, meetingNumber, breakouts}));
	}
