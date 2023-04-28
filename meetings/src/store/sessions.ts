import { createSelector, EntityId, Dictionary } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	createAppTableDataSlice,
	SortType,
	fetcher,
	setError,
	displayDate,
	AppTableDataState,
	getAppTableDataSelectors
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectCurrentSessionId } from './current';
import { selectGroupEntities } from './groups';

export type Room = {
	id: number;
	name: string;
	description: string;
}

export type Timeslot = {
	id: number;
	name: string;
	startTime: string;
	endTime: string;
}

export type DayCredit = { [slotName: string]: string };
export type SessionCredits = DayCredit[];

export interface Session {
	id: number;
	name: string;
	type: SessionType | null;
	groupId: string | null;
	imatMeetingId: number | null;
	OrganizerID: string;
	timezone: string;
	startDate: string;
	endDate: string;
	rooms: Room[];
	timeslots: Timeslot[];
	defaultCredits: SessionCredits;
	Attendees: number;
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

//const displayImatMeetingId = (imatMeetingId: number) => imatMeetingId || <span style={{fontStyle: 'italic'}}>(Blank)</span>

export const fields = {
	id: {label: 'ID', isId: true, sortType: SortType.NUMERIC},
	name: {label: 'Session name'},
	type: {label: 'Session type', dataRenderer: displaySessionType, options: SessionTypeOptions},
	groupId: {label: 'Organizing group ID'},
	groupName: {label: 'Organizing group'},
	imatMeetingId: {label: 'IMAT meeting'/*, dataRenderer: displayImatMeetingId*/},
	startDate: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	endDate: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE}, 
	timezone: {label: 'Timezone'}
};

export const dataSet = 'sessions';

type SessionsState = AppTableDataState<Session>;

/*
 * Selectors
 */
export const selectSessionsState = (state: RootState) => state[dataSet] as SessionsState;
export const selectSessionEntities = (state: RootState) => selectSessionsState(state).entities;

export const selectSessionsSelected = (state: RootState) => selectSessionsState(state).selected;

export const selectCurrentSession = (state: RootState) => {
	const id = selectCurrentSessionId(state);
	const entities = selectSessionEntities(state);
	return entities[id!];
}

export const selectCurrentSessionDates = createSelector(
	selectCurrentSession,
	(session) => {
		let dates: string[] = [];
		if (session) {
			const start = DateTime.fromISO(session.startDate);
			const end = DateTime.fromISO(session.endDate).plus({days: 1});
			const nDays = end.diff(start, 'days').days;
			if (nDays > 0) {
				dates = new Array(nDays)
					.fill(null)
					.map((d, i) => start.plus({days: i}).toISODate()!);
			}
		}
		return dates;
	}
);

type SyncedSession = Session & {
	groupName: string;
}

export const selectSyncedSessionEntities = createSelector(
	selectSessionEntities,
	selectGroupEntities,
	(sessions, groupEntities) => {
		const entities: Dictionary<SyncedSession> = {};
		for (const [id, session] of Object.entries(sessions)) {
			const group = session!.groupId? groupEntities[session!.groupId]: undefined;
			entities[id] = {
				...session!,
				groupName: group? group.name: 'Unknown',
			}
		}
		return entities;
	}
);

export const sessionsSelectors = getAppTableDataSelectors(selectSessionsState, {selectEntities: selectSyncedSessionEntities});


/*
 * Slice
 */
const sortComparer = (a: Session, b: Session) => DateTime.fromISO(b.startDate).toMillis() - DateTime.fromISO(a.startDate).toMillis();

const slice = createAppTableDataSlice({
	name: dataSet,
	sortComparer,
	fields,
	initialState: {},
	reducers: {}
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
	updateOne,
	addOne,
	removeMany,
	setSelected,
	setUiProperties,
	setPanelIsSplit,
} = slice.actions;

export {setSelected, setUiProperties, setPanelIsSplit}

const baseUrl = '/api/sessions';

export const loadSessions = (): AppThunk =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		let sessions;
		try {
			sessions = await fetcher.get(baseUrl);
			if (!Array.isArray(sessions))
				throw new TypeError('Unexpected response to GET ' + baseUrl);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get sessions', error));
			return;
		}
		dispatch(getSuccess(sessions));
	}

export const updateSession = (id: EntityId, changes: Partial<Session>): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let updatedSession;
		try {
			updatedSession = await fetcher.patch(url, changes);
			if (typeof updatedSession !== 'object')
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			dispatch(setError(`Unable to update session`, error));
			return;
		}
		dispatch(updateOne({id, changes: updatedSession}));
	}

export const addSession = (session: SessionAdd): AppThunk<EntityId> =>
	async (dispatch) => {
		let newSession;
		try {
			newSession = await fetcher.post(baseUrl, session);
			if (typeof newSession !== 'object')
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch(error) {
			dispatch(setError('Unable to add session', error));
			return;
		}
		dispatch(addOne(newSession));
		return newSession.id;
	}

export const deleteSessions = (ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			dispatch(setError(`Unable to delete meetings ${ids}`, error));
		}
		dispatch(removeMany(ids));
	}


/*
 * Functions to convert date/slot/room to/from id
 */
export const toSlotId = (date: string, slot: Timeslot, room: Room) => `${date}/${slot.id}/${room.id}`;
export const fromSlotId = (id: string) => {
	const p = id.split('/');
	return [p[0], parseInt(p[1]), parseInt(p[2])] as const;
}
