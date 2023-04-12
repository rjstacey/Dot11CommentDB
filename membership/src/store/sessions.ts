import { createSelector, PayloadAction, EntityId, Dictionary } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';
import {
	createAppTableDataSlice,
	SortType,
	getAppTableDataSelectors,
	fetcher,
	setError,
	displayDate
} from 'dot11-components';
import type { AppTableDataState } from 'dot11-components';

import type { RootState, AppThunk } from '.';

const SessionType = {
	Plenary: 'p',
	Interim: 'i',
	Other: 'o',
	General: 'g',
};

export const SessionTypeLabels = {
	[SessionType.Plenary]: 'Plenary',
	[SessionType.Interim]: 'Interim',
	[SessionType.Other]: 'Other',
	[SessionType.General]: 'General'
};

export type Session = {
	id: number;
	imatMeetingId: number;
	startDate: string;
	endDate: string;
	name: string;
	type: string;
	timezone: string;
	Attendees?: any[];
	Breakouts?: any[];
	OrganizerID: string;
};

export type { Dictionary };

export const SessionTypeOptions = Object.entries(SessionTypeLabels).map(([value, label]) => ({value, label}));

export const displaySessionType = (type: string) => SessionTypeLabels[type] || 'Unknown';

export const fields = {
	id: {label: 'ID', isId: true, sortType: SortType.NUMERIC},
	imatMeetingId: {label: 'IMAT meeting number'},
	startDate: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	endDate: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE}, 
	name: {label: 'Session name'},
	type: {label: 'Session type', dataRenderer: displaySessionType, options: SessionTypeOptions},
	timezone: {label: 'Time zone'}
};

export const dataSet = 'sessions';

type ExtraState = {
	loadingTimeZones: boolean;
	timeZones: string[];
}

type SessionsState = ExtraState & AppTableDataState<Session>;

/*
 * Slice
 */
const sortComparer = (s1: Session, s2: Session) => DateTime.fromISO(s2.startDate).valueOf() - DateTime.fromISO(s1.startDate).valueOf();

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		loadingTimeZones: false,
		timeZones: [],
	},
	reducers: {
		getTimeZonesPending(state: ExtraState) {
			state.loadingTimeZones = true;
		},
		getTimeZonesSuccess(state: ExtraState, action: PayloadAction<string[]>) {
			state.loadingTimeZones = false;
			state.timeZones = action.payload;
		},
		getTimeZonesFailure(state: ExtraState) {
			state.loadingTimeZones = false;
		},
	},
});

export default slice;

export const sessionsActions = slice.actions;


/*
 * Selectors
 */
export const selectSessionsState = (state: RootState): SessionsState => state[dataSet] as SessionsState;

export const sessionsSelectors = getAppTableDataSelectors(selectSessionsState);

export const selectSessionEntities = (state: RootState) => selectSessionsState(state).entities;

export const selectTimeZonesState = createSelector(
	selectSessionsState,
	(state) => ({
		timeZones: state.timeZones,
		loading: state.loadingTimeZones,
		valid: state.timeZones.length > 0
	})
);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	addOne,
	removeMany,
	upsertMany,
	setProperty
} = slice.actions;

export {setProperty, upsertMany as upsertSessions};

export const loadSessions = (): AppThunk =>
	async (dispatch, getState) => {
		const {loading} = selectSessionsState(getState());
		if (loading)
			return;
		dispatch(getPending());
		let sessions;
		try {
			sessions = await fetcher.get('/api/sessions');
			if (!Array.isArray(sessions))
				throw new TypeError('Unexpected response to GET: /api/sessions');
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get sessions', error));
			return;
		}
		dispatch(getSuccess(sessions));
	}

export const updateSessionSuccess = (id: EntityId, changes: Partial<Session>) => updateOne({id, changes});

export const updateSession = (id: number, session: Partial<Session>): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes: session}));
		const url = `/api/sessions/${id}`;
		let updatedSession;
		try {
			updatedSession = await fetcher.patch(url, session);
			if (typeof updatedSession !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			dispatch(setError(`Unable to update session`, error));
			return;
		}
		dispatch(updateOne({id, changes: updatedSession}));
	}

export const addSession = (session: Session): AppThunk =>
	async (dispatch) => {
		let newSession;
		try {
			newSession = await fetcher.post('/api/sessions', session);
			if (typeof newSession !== 'object')
				throw new TypeError('Unexpected response to POST: /api/session');
		}
		catch(error) {
			dispatch(setError('Unable to add session', error));
			return;
		}
		dispatch(addOne(newSession));
	}

export const deleteSessions = (ids: number[]): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete('/api/sessions', ids);
		}
		catch(error) {
			dispatch(setError(`Unable to delete meetings ${ids}`, error));
		}
		dispatch(removeMany(ids));
	}

const {getTimeZonesPending, getTimeZonesSuccess, getTimeZonesFailure} = slice.actions;

export const loadTimeZones = (): AppThunk =>
	async (dispatch, getState) => {
		dispatch(getTimeZonesPending());
		let timeZones;
		try {
			timeZones = await fetcher.get('/api/timeZones');
			if (!Array.isArray(timeZones))
				throw new TypeError('Unexpected response to GET: /api/timeZones');
		}
		catch(error) {
			dispatch(getTimeZonesFailure());
			dispatch(setError('Unable to get time zones list', error));
			return;
		}
		dispatch(getTimeZonesSuccess(timeZones));
	}
