import { PayloadAction, Dictionary, createSelector, type EntityId } from '@reduxjs/toolkit';
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
import { selectMemberEntities, type Member } from './members';
import { selectWorkingGroupName } from './groups';
import { selectSessionEntities, selectSession, upsertSessions, type Session } from './sessions';

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
	LastSessionId: number;
	NonVoterDate: string | undefined;
}

/*
 * Slice
 */
//const sessionsAdapter = createEntityAdapter<Session>();
type ExtraState = {
	sessionIds: EntityId[];
}

const initialState: ExtraState = { sessionIds: [] };

const selectId = (attendance: RecentSessionAttendances) => attendance.SAPIN;
const dataSet = 'attendances';
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {
		setDetails(state, action: PayloadAction<ExtraState>) {
			return {...state, ...action.payload};
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
export const selectAttendanceSessionIds = (state: RootState) => selectAttendancesState(state).sessionIds;
export const selectAttendanceSessions = createSelector(
	selectAttendanceSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map(id => entities[id]!).filter(s => s)
);
export const selectMostRecentAttendedSession = (state: RootState) => {
	const sessions = selectAttendanceSessions(state);
	return sessions[sessions.length - 1];
}

function recentAttendanceStats(attendances: SessionAttendanceSummary[], sessionIds: EntityId[], sessionEntities: Dictionary<Session>, startDate?: string, sapin?: number) {

	let plenaryCount = 0;
	sessionIds = sessionIds
		.filter(id => sessionEntities[id])		// make sure session data is available
		.sort((id1, id2) => DateTime.fromISO(sessionEntities[id2]!.startDate).toMillis() - DateTime.fromISO(sessionEntities[id1]!.startDate).toMillis())	// Sort latest to oldest
		.filter(id => {
			const s = sessionEntities[id]!;
			if (startDate && DateTime.fromISO(s.startDate) < DateTime.fromISO(startDate)) // Only consider attendance after startDate
				return false;
			if (s.type === 'p' && plenaryCount < 4)
				plenaryCount++;
			return plenaryCount <= 4;	// Keep last 4 planaries and any intervening interims
		});

	// Total plenaries considered
	let total = plenaryCount;

	attendances = attendances
		.filter(a => sessionIds.includes(a.session_id))		// only relevant sessions
		.sort((a1, a2) => DateTime.fromISO(sessionEntities[a2.session_id]!.startDate).toMillis() - DateTime.fromISO(sessionEntities[a1.session_id]!.startDate).toMillis())	// Sort latest to oldest

	if (sapin === 4181)
		console.log(attendances.length)

	// Keep properly attended sessions
	attendances = attendances.filter(a => (a.AttendancePercentage >= 75 && !a.DidNotAttend) || a.DidAttend);

	// One interim may be substituted for a plenary; only keep latest properly attended interim
	let interimCount = 0;
	attendances = attendances.filter(a => {
		const s = sessionEntities[a.session_id]!;
		if (s.type === 'i')
			interimCount++;
		return s.type === 'p' || interimCount === 1;
	});

	// Keep at most the last 4 properly attended sessions
	let attendendedSessionIds = attendances.slice(0, 4).map(a => a.session_id);

	return {
		total,	// total considered
		count: attendendedSessionIds.length,	// properly attended sessions
		lastP: attendendedSessionIds.length > 0 && sessionEntities[attendendedSessionIds[0]]!.type === 'p',	// last attended was a plenary
		lastSessionId: attendendedSessionIds[0] || 0
	};
}

export function selectMemberAttendanceStats(state: RootState, SAPIN: number) {
	const attendancesEntities = selectAttendancesEntities(state);
	const attendances = attendancesEntities[SAPIN]?.sessionAttendanceSummaries || [];
	const sessionIds = selectAttendanceSessionIds(state);
	const sessionEntities = selectSessionEntities(state);
	const member = selectMemberEntities(state)[SAPIN];
	const since = member?.StatusChangeHistory.find(h => h.NewStatus === 'Non-Voter')?.Date;
	return recentAttendanceStats(attendances, sessionIds, sessionEntities, since, SAPIN);
}

function memberExpectedStatusFromAttendanceStats(member: Member, count: number, lastP: boolean) {
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
	selectAttendanceSessionIds,
	selectSessionEntities,
	selectAttendancesIds,
	selectAttendancesEntities,
	(memberEntities, sessionIds, sessionEntities, ids, entities) => {
		const newEntities: Dictionary<MemberAttendances> = {};
		ids.forEach(id => {
			let entity = entities[id]!;
			let member = memberEntities[entity.SAPIN];
			let expectedStatus = '';
			let summary = '';
			let lastSessionId = 0;
			let nonVoterDate: string | undefined;
			if (member) {
				// Only care about attendance since becoming a 'Non-Voter'
				nonVoterDate = member.StatusChangeHistory.find(h => h.NewStatus === 'Non-Voter')?.Date;
				let stats = recentAttendanceStats(entity.sessionAttendanceSummaries, sessionIds, sessionEntities, nonVoterDate);
				let {total, count, lastP} = stats;
				expectedStatus = memberExpectedStatusFromAttendanceStats(member, count, lastP);
				summary = `${count}/${total}`;
				lastSessionId = stats.lastSessionId;
			}
			newEntities[id] = {
				...entity,
				Name: member? member.Name: '',
				Email: member? member.Email: '',
				Affiliation: member? member.Affiliation: '',
				Employer: member? member.Employer: '',
				Status: member? member.Status: 'New',
				ExpectedStatus: expectedStatus,
				Summary: summary,
				LastSessionId: lastSessionId,
				NonVoterDate: nonVoterDate
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
	setDetails
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
		if (!groupName)
			return;
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
		dispatch(upsertSessions(response.sessions));
		dispatch(setDetails({sessionIds: response.sessions.map(s => s.id)}));
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

export const importAttendances = (session_id: number, useDailyAttendance?: boolean): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		let url = `/api/${groupName}/attendances/${session_id}/import`;
		if (useDailyAttendance)
			url += '?use=daily-attendance';
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validResponse(response))
				throw new TypeError('Unexpected response to POST ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			const session = selectSession(getState(), session_id);
			dispatch(setError('Unable to import attendance summary for session ' + session?.number || `id=${session_id}`, error));
			return;
		}
		dispatch(upsertSessions(response.sessions));
		dispatch(setDetails({sessionIds: response.sessions.map(s => s.id)}));
		dispatch(getSuccess(response.attendances));
	}