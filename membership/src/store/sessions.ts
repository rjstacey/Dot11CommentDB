import { createSlice, createEntityAdapter, createSelector, type EntityId } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	fetcher,
	setError,
	isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectWorkingGroupName } from './groups';

export interface Session {
	id: number;
	number: number | null;
	name: string;
	type: SessionType;
	groupId: string | null;
	imatMeetingId: number | null;
	OrganizerID: string;
	timezone: string;
	startDate: string;
	endDate: string;
	attendees: number;
}

export type SessionAdd = Omit<Session, "id" | "Attendees">;

export const SessionTypeLabels = {
	p: 'Plenary',
	i: 'Interim',
	o: 'Other',
	g: 'General'
} as const;

export type SessionType = keyof typeof SessionTypeLabels;

export const SessionTypeOptions = Object.entries(SessionTypeLabels).map(([value, label]) => ({value, label} as {value: SessionType; label: string}));

export const displaySessionType = (type: SessionType) => SessionTypeLabels[type] || 'Unknown';

/*
 * Selectors
 */
const dataSet = 'sessions';
export const selectSessionsState = (state: RootState) => state[dataSet];
export const selectSessionIds = (state: RootState) => selectSessionsState(state).ids;
export const selectSessionEntities = (state: RootState) => selectSessionsState(state).entities;

export const selectSessions = createSelector(
	selectSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map(id => entities[id]!)
);

export const selectRecentSessions = createSelector(
	selectSessions,
	(sessions) => {
		const today = new Date();
		return sessions
			.filter(s => new Date(s.startDate) < today)
			.slice(0, 8);
	}
);

export const selectSession = (state: RootState, id: EntityId) => selectSessionEntities(state)[id];

/*
 * Slice
 */
const sortComparer = (a: Session, b: Session) => DateTime.fromISO(b.startDate).toMillis() - DateTime.fromISO(a.startDate).toMillis();
const dataAdapter = createEntityAdapter<Session>({sortComparer});
const initialState = dataAdapter.getInitialState({loading: false, valid: false});

const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		upsertMany: dataAdapter.upsertMany,
	},
});

export default slice;

/*
 * Actions
 */
export const sessionsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	upsertMany
} = slice.actions;

export {upsertMany as upsertSessions};

function validSession(session: any): session is Session {
	return isObject(session) &&
		typeof session.id === 'number' &&
		(session.number === null || typeof session.number === 'number') &&
		typeof session.name === 'string' &&
		['p', 'i', 'o', 'g'].includes(session.type) &&
		(session.groupId === null || typeof session.groupId === 'string') &&
		(session.imatMeetingId === null || typeof session.imatMeetingId === 'number') &&
		/\d{4}-\d{2}-\d{2}/.test(session.startDate) &&
		/\d{4}-\d{2}-\d{2}/.test(session.endDate) &&
		typeof session.timezone === 'string';
}

function validSessions(sessions: any): sessions is Session[] {
	return Array.isArray(sessions) && sessions.every(validSession);
}

export const loadSessions = (): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const groupName = selectWorkingGroupName(state);
		const loading = selectSessionsState(state).loading;
		if (!groupName || loading)
			return;
		dispatch(getPending());
		const url = `/api/${groupName}/sessions`;
		let response: any;
		try {
			response = await fetcher.get(url, {type: ['p', 'i']});
			if (!validSessions(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get sessions', error));
			return;
		}
		dispatch(getSuccess(response));
	}
