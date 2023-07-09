import { PayloadAction, Dictionary, createSelector, createEntityAdapter } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	SortType,
	getAppTableDataSelectors,
	isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectMemberEntities, Member } from './members';
import { selectWorkingGroupName } from './groups';

export type { Dictionary };

const renderPct = (pct: number) => !isNaN(pct)? `${pct.toFixed(2)}%`: '';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Status: {label: 'Status'},
	ExpectedStatus: {label: 'Expected status'},
	Summary: {label: 'Summary'},
	session_0: {sortType: SortType.NUMERIC},
	session_1: {sortType: SortType.NUMERIC},
	session_2: {sortType: SortType.NUMERIC},
	session_3: {sortType: SortType.NUMERIC},
	session_4: {sortType: SortType.NUMERIC},
	session_5: {sortType: SortType.NUMERIC},
	session_6: {sortType: SortType.NUMERIC},
	session_7: {sortType: SortType.NUMERIC},
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

export const SessionTypeOptions = Object.entries(SessionTypeLabels).map(([value, label]) => ({value, label}));

export type SessionAttendanceSummary = {
    id: number;
    /** Session identifier */
    session_id: number;
    /** Percentage of meeting slots attended */
    AttendancePercentage: number;
    /** Declare attendance criteria met */
    DidAttend: boolean;
    /** Declare attendance criteria not met */
    DidNotAttend: boolean;
    /** SA PIN under which attendance was logged */
    SAPIN: number;
    Notes: string;
}

type RecentSessionAttendances = {
    SAPIN: number;
    sessionAttendanceSummaries: SessionAttendanceSummary[];
}

export type MemberAttendances = RecentSessionAttendances & {
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: string;
	ExpectedStatus: string;
	Summary: string;
}

/*
 * Slice
 */
const sessionsAdapter = createEntityAdapter<Session>();
const initialState = { sessions: sessionsAdapter.getInitialState() };

const selectId = (attendance: RecentSessionAttendances) => attendance.SAPIN;
const dataSet = 'attendances';
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {
		setSessions(state, action: PayloadAction<Session[]>) {
			sessionsAdapter.setAll(state.sessions, action.payload);
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectAttendancesState = (state: RootState) => state[dataSet];

export const selectAttendancesEntities = (state: RootState) => selectAttendancesState(state).entities;
const selectAttendancesIds = (state: RootState) => selectAttendancesState(state).ids;

export const selectSessionEntities = (state: RootState) => selectAttendancesState(state).sessions.entities;
export const selectSessionIds = (state: RootState) => selectAttendancesState(state).sessions.ids as number[];
export const selectSessions = createSelector(
	selectSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map(id => entities[id]!)
);

export const selectSession = (state: RootState, sessionId: number) => selectSessionEntities(state)[sessionId];

export function memberAttendancesCount(member: Member, attendances: SessionAttendanceSummary[], sessionEntities: Dictionary<Session>) {
	let pCount = 0,		// Count of plenary sessions properly attended
		iCount = 0,		// Count of interim sessions properly attended
		lastP = 0;		// Last properly attended session was a plenary

	// Only care about attendance since becoming a 'Non-Voter'
	const h = member.StatusChangeHistory.find(h => h.NewStatus === 'Non-Voter');
	if (h)
		attendances = attendances.filter(a => DateTime.fromISO(sessionEntities[a.session_id]!.startDate) > DateTime.fromISO(h.Date));

	attendances.forEach(a => {
		const s = sessionEntities[a.session_id]!;
		if ((a.AttendancePercentage >= 75 && !a.DidNotAttend) || a.DidAttend) {
			if (s.type === 'p') {
				if (pCount === 0 && iCount === 0)
					lastP = 1;	// First properly attended and its a plenary
				pCount++;
			}
			else {
				iCount++;
			}
		}
	});

	// One interim can be substituted for a plenary
	let count = pCount + (iCount? 1: 0);

	return {count, lastP};
}

export function selectMemberAttendancesCount(state: RootState, SAPIN: number) {
	const attendancesEntities = selectAttendancesEntities(state);
	const sessionEntities = selectSessionEntities(state);
	const total = Object.values(sessionEntities).filter(s => s?.type === 'p').length;
	const member = selectMemberEntities(state)[SAPIN];
	const attendances = attendancesEntities[SAPIN]?.sessionAttendanceSummaries || [];
	let count = 0, lastP = 0;
	if (member) {
		const out = memberAttendancesCount(member, attendances, sessionEntities);
		count = out.count;
		lastP = out.lastP;
	}
	if (count > total)
		count = total;
	return {count, total, lastP};
}

function memberExpectedStatusFromAttendances(member: Member, count: number, lastP: number) {
	const status = member.Status;

	if (member.StatusChangeOverride || 
		(status !== 'Voter' && status !== 'Potential Voter' && status !== 'Aspirant' && status !== 'Non-Voter'))
		return '';

	/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
	 * One interim may be substited for a plenary session. */
	if (count === 0 && status !== 'Non-Voter')
		return 'Non-Voter';

	/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
	 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
	 * or intervening interim sessions. */
	if (count === 1 && status !== 'Aspirant')
		return 'Aspirant';

	/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
	 * interim meeting may be substituted for a plenary meeting. */
	if (count === 2 && status === 'Aspirant')
		return 'Potential Voter';

	/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary 
	 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
	if (((count === 3 && lastP) || count > 3) && status === 'Potential Voter')
		return 'Voter';

	return '';
}

export const selectAttendancesWithMembershipAndSummary = createSelector(
	selectMemberEntities,
	selectSessionEntities,
	selectAttendancesIds,
	selectAttendancesEntities,
	(memberEntities, sessionEntities, ids, entities) => {
		const newEntities: Dictionary<MemberAttendances> = {};
		const total = Object.values(sessionEntities).filter(s => s?.type === 'p').length;
		ids.forEach(id => {
			let entity = entities[id]!;
			let member = memberEntities[entity.SAPIN];
			let expectedStatus = '';
			let summary = '';
			if (member) {
				let {count, lastP} = member? memberAttendancesCount(member, entity.sessionAttendanceSummaries, sessionEntities): {count: 0, lastP: 0};
				if (count > total)
					count = total;
				expectedStatus = memberExpectedStatusFromAttendances(member, count, lastP);
				summary = `${count}/${total}`;
			}
			newEntities[id] = {
				...entity,
				Name: member? member.Name: '',
				Email: member? member.Email: '',
				Affiliation: member? member.Affiliation: '',
				Employer: member? member.Employer: '',
				Status: member? member.Status: 'New',
				ExpectedStatus: expectedStatus,
				Summary: summary
			}
		});
		return newEntities;
	}
);

function getField(entity: MemberAttendances, dataKey: string) {
	const m = /session_(\d+)/.exec(dataKey);
	if (m) {
		const i = Number(m[1]);
		const summary = entity.sessionAttendanceSummaries[i];
		return summary? renderPct(summary.AttendancePercentage): '';
	}
	return entity[dataKey as keyof MemberAttendances];
}

export const attendancesSelectors = getAppTableDataSelectors(selectAttendancesState, {selectEntities: selectAttendancesWithMembershipAndSummary, getField});

/*
 * Actions
 */
export const attendancesActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	setOne,
	setSessions
} = slice.actions;

function validResponse(response: any): response is {attendances: any; sessions: Session[]} {
	return isObject(response) &&
		Array.isArray(response.attendances) &&
		Array.isArray(response.sessions);
}

export const loadAttendances = (): AppThunk =>
	async (dispatch, getState) => {
		const loading = selectAttendancesState(getState()).loading;
		if (loading)
			return;
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendees`, error));
			return;
		}
		dispatch(setSessions(response.sessions));
		dispatch(getSuccess(response.attendances));
	}

export type SessionAttendanceUpdate = {
	session_id: number;
	changes: Partial<SessionAttendanceSummary>
};

export const updateAttendances = (sapin: number, updates: SessionAttendanceUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const groupName = selectWorkingGroupName(state);
		const url = `/api/${groupName}/attendances`;
		const entities = selectAttendancesEntities(state);
		let entity = entities[sapin];
		if (!entity) {
			console.error(`Entry for ${sapin} does not exist`);
			return;
		}
		const attendanceUpdates = [],
			attendanceAdds: SessionAttendanceSummary[] = [],
			attendanceDeletes: number[] = [];
		for (const update of updates) {
			const {session_id, changes} = update;
			let a = entity.sessionAttendanceSummaries.find(a => a.session_id === session_id);
			if (!a) {
				// Entry does not exist; generate null entry
				a = {
					id: 0,
					session_id,
					AttendancePercentage: 0,
					DidAttend: false,
					DidNotAttend: false,
					Notes: '',
					SAPIN: entity.SAPIN
				}
			}
			a = {...a, ...changes};
			if (a.id && !a.AttendancePercentage && !a.DidAttend && !a.DidNotAttend && !a.Notes) {
				// If change results in a null entry, then delete the entry
				attendanceDeletes.push(a.id);
			}
			else if (!a.id) {
				// If the id is zero, it needs to be added
				attendanceAdds.push(a);
			}
			else {
				attendanceUpdates.push({id: a.id, changes});
			}
		}
		let response;
		let updatedSessionAttendances = entity.sessionAttendanceSummaries;
		if (attendanceDeletes.length > 0) {
			try {
				await fetcher.delete(url, attendanceDeletes);
			}
			catch (error) {
				dispatch(setError('Unable to delete attendances', error));
			}
			updatedSessionAttendances = updatedSessionAttendances.filter(a => !attendanceDeletes.includes(a.id))
		}
		if (attendanceAdds.length > 0) {
			try {
				response = await fetcher.post(url, attendanceAdds);
				if (!Array.isArray(response))
					throw new TypeError('Uxpected response to POST ' + url);
			}
			catch (error) {
				dispatch(setError('Unable to add attendances', error));
			}
			updatedSessionAttendances = updatedSessionAttendances.concat(response as SessionAttendanceSummary[]);
		}
		if (attendanceUpdates.length > 0) {
			try {
				response = await fetcher.patch(url, attendanceUpdates);
				if (!Array.isArray(response))
					throw new TypeError('Uxpected response to PATCH ' + url);
			}
			catch (error) {
				dispatch(setError('Unable to update attendances', error));
			}
			const attendances = response as SessionAttendanceSummary[];
			updatedSessionAttendances = updatedSessionAttendances.map(aOrig => attendances.find(aUpdt => aUpdt.id === aOrig.id) || aOrig);
		}
		dispatch(setOne({...entity, sessionAttendanceSummaries: updatedSessionAttendances}));
	}

export const importAttendances = (session_id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/attendances/${session_id}/import`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validResponse(response)) {
				throw new TypeError('Unexpected response to POST ' + url);
			}
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to import attendance summary for session id=${session_id}`, error));
			return;
		}
		dispatch(setSessions(response.sessions));
		dispatch(getSuccess(response.attendances));
	}