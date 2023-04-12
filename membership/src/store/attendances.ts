import { PayloadAction, Dictionary, Update, createSelector } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	SortType,
	AppTableDataState,
	getAppTableDataSelectors
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectMemberEntities, Member } from './members';
import { upsertSessions, selectSessionEntities, Session } from './sessions';

const renderPct = (pct: number) => !isNaN(pct)? `${pct.toFixed(2)}%`: '';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Status: {label: 'Status'},
	ExpectedStatus: {label: 'Expected status'},
	AttendancePercentage: {label: 'Attendance', dataRenderer: renderPct, sortType: SortType.NUMERIC},
	DidAttend: {label: 'Did attend', sortType: SortType.NUMERIC},
	DidNotAttend: {label: 'Did not attend', sortType: SortType.NUMERIC},
};

export const dataSet = 'attendances';

export type SessionAttendance = {
	id: number;
    session_id: number;
    AttendancePercentage: number;
	DidAttend: boolean;
	DidNotAttend: boolean;
    Notes: string;
	SAPIN: number;
}

export type Attendances = {
	SAPIN: number;
	SessionAttendances: SessionAttendance[];
}

export type MemberAttendances = Attendances & {
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: string;
	ExpectedStatus: string;
}

/*
 * Slice
 */

type ExtraState = {
	sessionIds: number[];
};

type AttendancesState = ExtraState & AppTableDataState<Attendances>;

const selectId = (attendance: Attendances) => attendance.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		sessionIds: []
	} as ExtraState,
	reducers: {
		setAttendancesSessionIds(state: ExtraState, action: PayloadAction<number[]>) {
			state.sessionIds = action.payload;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectAttendancesState = (state: RootState) => state[dataSet] as AttendancesState;

export const selectAttendancesEntities = (state: RootState) => selectAttendancesState(state).entities;
//const selectAttendancesIds = (state: RootState) => selectAttendancesState(state).ids;

export function memberAttendancesCount(member: Member, attendances: SessionAttendance[], sessionEntities: Dictionary<Session>) {
	let total = 0,		// Total plenary sessions (should be 4 since we only track last 4)
		pCount = 0,		// Count of plenary sessions properly attended
		iCount = 0,		// Count of interim sessions properly attended
		lastP = 0;		// Last properly attended session was a plenary

	// Only care about attendance since becoming a 'Non-Voter'
	const h = member.StatusChangeHistory.find(h => h.NewStatus === 'Non-Voter');
	if (h)
		attendances = attendances.filter(a => DateTime.fromISO(sessionEntities[a.session_id]!.startDate) > DateTime.fromISO(h.Date));

	attendances.forEach(a => {
		const s = sessionEntities[a.session_id]!;
		if (s.type === 'p')
			total++;
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

	// One interim can be substituted for a plenary, but don't let it exceed total
	let count = pCount + (iCount? 1: 0);
	if (count > total)
		count = total;

	return {count, total, lastP};
}

export const selectMemberAttendancesCount = (state: RootState, member: Member) => {
	const attendancesEntities = selectAttendancesEntities(state);
	const sessionEntities = selectSessionEntities(state);
	const attendances = attendancesEntities[member.SAPIN]?.SessionAttendances || [];
	return memberAttendancesCount(member, attendances, sessionEntities);
}

function memberExpectedStatusFromAttendances(member: Member, attendances: SessionAttendance[], sessionEntities: Dictionary<Session>) {
	const status = member.Status;

	if (member.StatusChangeOverride || 
		(status !== 'Voter' && status !== 'Potential Voter' && status !== 'Aspirant' && status !== 'Non-Voter'))
		return '';

	const {count, lastP} = memberAttendancesCount(member, attendances, sessionEntities);

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

const selectAttendancesWithMembership = createSelector(
	selectAttendancesState,
	selectMemberEntities,
	selectSessionEntities,
	(attendancesState, memberEntities, sessionEntities) => {
		const {ids, entities} = attendancesState;
		const newEntities: Dictionary<MemberAttendances> = {};
		ids.forEach(id => {
			let entity = entities[id]!;
			let member = memberEntities[entity.SAPIN];
			while (member && member.Status === 'Obsolete' && member.ReplacedBySAPIN)
				member = memberEntities[member.ReplacedBySAPIN];
			const expectedStatus = member? memberExpectedStatusFromAttendances(member, entity.SessionAttendances, sessionEntities): '';
			newEntities[id] = {
				...entity,
				Name: member? member.Name: '',
				Email: member? member.Email: '',
				Affiliation: member? member.Affiliation: '',
				Employer: member? member.Employer: '',
				Status: member? member.Status: 'New',
				ExpectedStatus: expectedStatus
			}
		});
		return newEntities;
	}
);

export const attendancesSelectors = getAppTableDataSelectors(selectAttendancesState, selectAttendancesWithMembership);

/*
 * Actions
 */

const {
	getPending,
	getSuccess,
	getFailure,
	setOne,
	setAttendancesSessionIds
} = slice.actions;

export const attendancesActions = slice.actions;

const baseUrl = '/api/attendances';

export const loadAttendances = (): AppThunk =>
	async (dispatch, getState) => {
		const loading = selectAttendancesState(getState()).loading;
		if (loading)
			return;
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(baseUrl);
			if (typeof response !== 'object' ||
				!Array.isArray(response.attendances) ||
				!Array.isArray(response.sessions)) {
				throw new TypeError('Unexpected response to GET: ' + baseUrl);
			}
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendees`, error));
			return;
		}
		dispatch(upsertSessions(response.sessions));
		dispatch(setAttendancesSessionIds(response.sessions.map((s: Session) => s.id)));
		dispatch(getSuccess(response.attendances));
	}

export type SessionAttendanceUpdate = {
	session_id: number;
	changes: Partial<SessionAttendance>
};

export const updateAttendances = (sapin: number, updates: SessionAttendanceUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const entities = selectAttendancesEntities(getState());
		let entity = entities[sapin];
		if (!entity) {
			console.error(`Entry for ${sapin} does not exist`);
			return;
		}
		const attendanceUpdates = [],
			attendanceAdds: SessionAttendance[] = [],
			attendanceDeletes: number[] = [];
		for (const update of updates) {
			const {session_id, changes} = update;
			let a = entity.SessionAttendances.find(a => a.session_id === session_id);
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
		let updatedSessionAttendances = entity.SessionAttendances;
		if (attendanceDeletes.length > 0) {
			try {
				await fetcher.delete(baseUrl, attendanceDeletes);
			}
			catch (error) {
				dispatch(setError(`Unable to delete attendances`, error));
			}
			updatedSessionAttendances = updatedSessionAttendances.filter(a => !attendanceDeletes.includes(a.id))
		}
		if (attendanceAdds.length > 0) {
			try {
				response = await fetcher.post(baseUrl, attendanceAdds);
			}
			catch (error) {
				dispatch(setError(`Unable to delete attendances`, error));
			}
			updatedSessionAttendances = updatedSessionAttendances.concat(response as unknown as SessionAttendance[]);
		}
		if (attendanceUpdates.length > 0) {
			try {
				response = await fetcher.patch(baseUrl, attendanceUpdates);
			}
			catch (error) {
				dispatch(setError(`Unable to delete attendances`, error));
			}
			const attendances = response as unknown as SessionAttendance[];
			updatedSessionAttendances = updatedSessionAttendances.map(aOrig => attendances.find(aUpdt => aUpdt.id === aOrig.id) || aOrig);
		}
		dispatch(setOne({...entity, SessionAttendances: updatedSessionAttendances}));
	}

export const importAttendances = (session_id: number): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `${baseUrl}/${session_id}/import`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' ||
				!Array.isArray(response.attendances) ||
				!Array.isArray(response.sessions)) {
				throw new TypeError('Unexpected response to POST: ' + url);
			}
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to import attendance summary for session id=${session_id}`, error));
			return;
		}
		dispatch(upsertSessions(response.sessions));
		dispatch(setAttendancesSessionIds(response.sessions.map((s: Session) => s.id)));
		dispatch(getSuccess(response.attendances));
	}