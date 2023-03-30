import {DateTime} from 'luxon';
import { PayloadAction } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType,
	AppTableDataState,
} from 'dot11-components';

import type { RootState, AppThunk } from '../store';

import { updateSessionSuccess, Session } from './sessions';

const fields = {
	id: {label: 'ID', isId: true, sortType: SortType.NUMERIC},
	MeetingNumber: {label: 'MeetingNumber', sortType: SortType.NUMERIC},
	BreakoutID: {label: 'Breakout ID', sortType: SortType.NUMERIC},
	DayDate: {label: 'DayDate'},
	Start: {label: 'Start', sortType: SortType.DATE},
	End: {label: 'End', sortType: SortType.DATE},
	Time: {label: 'Time'},
	Location: {label: 'Location'},
	Group: {label: 'Group'},
	Name: {label: 'Name'},
	Credit: {label: 'Credit'},
	Attendees: {label: 'Attendees'}
};

export const dataSet = 'breakouts';

export const getField = (entity: any, dataKey: string) => {
	if (!entity.hasOwnProperty(dataKey)) {
		if (dataKey === 'DayDate') {
			const start = DateTime.fromISO(entity.Start, {zone: entity.TimeZone});
			return start.toFormat('EEE, yyyy LLL dd');
		}
		if (dataKey === 'Day') {
			const start = DateTime.fromISO(entity.Start, {zone: entity.TimeZone});
			return start.weekdayShort;
		}
		if (dataKey === 'Time') {
			const start = DateTime.fromISO(entity.Start, {zone: entity.TimeZone});
			const end = DateTime.fromISO(entity.End, {zone: entity.TimeZone});
			return start.toFormat('HH:mm') + ' - ' + end.toFormat('HH:mm');
		}
	}
	return entity[dataKey];
}

export type Breakout = {
	id: number;
	session_id: number;
	MeetingNumber: number;
	BreakoutID: number;
	Name: string;
	Credit: string;
	Group: string;
}

type ExtraState = {
	session: Session | null;
};

type BreakoutsState = ExtraState & AppTableDataState<Breakout>;

/*
 * Slice
 */
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {session: null} as ExtraState,
	reducers: {
		setSession(state: BreakoutsState, action: PayloadAction<Session | null>) {
			state.session = action.payload;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectBreakoutsState = (state: RootState) => state[dataSet] as BreakoutsState;

export const breakoutsSelectors = getAppTableDataSelectors(selectBreakoutsState);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setSession
} = slice.actions;

export const breakoutsActions = slice.actions;

export const loadBreakouts = (session_id: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectBreakoutsState(getState()).loading)
			return;
		dispatch(getPending());
		const url = `/api/sessions/${session_id}/breakouts`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get breakouts for ${session_id}`, error));
			return;
		}
		const {breakouts, session} = response;
		breakouts.forEach((b: any) => b.TimeZone = session.TimeZone);
		dispatch(getSuccess(breakouts));
		dispatch(setSession(session));
	}

export const importBreakouts = (session_id: number): AppThunk =>
	async (dispatch) => {
		const url = `/api/sessions/${session_id}/breakouts/import`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			console.log(error)
			await dispatch(setError('Unable to import breakouts', error))
			return;
		}
		const {breakouts, session} = response;
		breakouts.forEach((b: any) => b.TimeZone = session.TimeZone);
		dispatch(getSuccess(breakouts));
		dispatch(updateSessionSuccess(session.id, session));
	}
