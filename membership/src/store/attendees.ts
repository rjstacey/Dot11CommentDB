import { PayloadAction, Dictionary } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	SortType,
	AppTableDataState,
	getAppTableDataSelectors
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import type { Session } from './sessions';
import type { Breakout } from './breakouts';

import { upsertMembers, Member, MemberAdd } from './members';
import { updateSessionSuccess } from './sessions';
import { StringLiteral } from 'typescript';

const renderPct = (pct: number) => !isNaN(pct)? `${pct.toFixed(2)}%`: '';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Status: {label: 'Status'},
	SessionCredit: {label: 'Session credit', sortType: SortType.NUMERIC},
	SessionCreditPct: {label: 'Session credit', sortType: SortType.NUMERIC},
	AttendancePercentage: {label: 'Attendance', dataRenderer: renderPct, sortType: SortType.NUMERIC}
};

export const dataSet = 'attendees';

export type Attendee = {
	id: number;
	SAPIN: number;
	Name: string;
	Email: string;
	Affiliation: string;
	Status: string;
}

/*
 * Slice
 */

type ExtraState = {
	session: Session | null;
	breakout: Breakout | null;
};

type AttendeesState = ExtraState & AppTableDataState<Member>;

const selectId = (member: Member) => member.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		session: null,
		breakout: null,
	} as ExtraState,
	reducers: {
		setSession(state: ExtraState, action: PayloadAction<Session | null>) {
			state.session = action.payload;
		},
		setBreakout(state: ExtraState, action: PayloadAction<Breakout | null>) {
			state.breakout = action.payload;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectAttendeesState = (state: RootState) => state[dataSet] as AttendeesState;

export const attendeesSelectors = getAppTableDataSelectors(selectAttendeesState);

/*
 * Actions
 */

const {
	getPending,
	getSuccess,
	getFailure,
	setSession,
	setBreakout
} = slice.actions;

export const attendeesActions = slice.actions;

export const loadAttendees = (session_id: number, breakout_id: number): AppThunk =>
	async (dispatch, getState) => {
		const loading = selectAttendeesState(getState()).loading;
		if (loading)
			return;
		dispatch(getPending());
		const url = breakout_id?
			`/api/sessions/${session_id}/breakout/${breakout_id}/attendees`:
			`/api/sessions/${session_id}/attendees`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || 
				!response.hasOwnProperty('session') ||
				!response.hasOwnProperty('attendees') ||
				(breakout_id && !response.hasOwnProperty('breakout')))
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get attendees for ${breakout_id}`, error))
			]);
			return;
		}
		await Promise.all([
			dispatch(setSession(response.session)),
			dispatch(setBreakout(response.breakout)),
			dispatch(getSuccess(response.attendees)),
		]);
	}

export const importSelectedAttendees = (): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const {selected, entities: attendees} = selectAttendeesState(state);
		const shown = attendeesSelectors.selectSortedFilteredIds(state);
		const newMembers: MemberAdd[] = [];
		for (const id of selected) {
			if (shown.includes(id)) {
				const a = attendees[id]!;
				newMembers.push({
					SAPIN: a.SAPIN,
					Name: a.Name,
					Email: a.Email,
					Affiliation: a.Affiliation,
					Status: 'Non-Voter',
					Access: 0
				});
			}
		}
		return dispatch(upsertMembers(newMembers));
	}

export const importAttendances = (session_id: number): AppThunk =>
	async (dispatch, state) => {
		dispatch(getPending());
		const url = `/api/sessions/${session_id}/attendance_summary/import`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' ||	typeof response.session !== 'object' ||	!Array.isArray(response.attendees))
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get attendance summary', error))
			]);
			return;
		}
		const {session} = response;
		await Promise.all([
			dispatch(getSuccess(response.attendees)),
			dispatch(updateSessionSuccess(session.id, session))]);
	}
