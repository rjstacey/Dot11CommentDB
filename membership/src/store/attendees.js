import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, selectSortedFilteredIds} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

import {upsertMembers} from './members';
import {updateSessionSuccess} from './sessions';

const renderPct = (pct) => !isNaN(pct)? `${pct.toFixed(2)}%`: '';
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
const selectId = (member) => member.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		session: {},
		breakout: {},
	},
	reducers: {
		setSession(state, action) {
			state.session = action.payload;
		},
		setBreakout(state, action) {
			state.breakout = action.payload || {};
		},
	},
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectAttendeesState = (state) => state[dataSet];

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

export const loadAttendees = (session_id, breakout_id) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
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

export const importSelectedAttendees = () =>
	async (dispatch, getState) => {
		const state = getState();
		const selected = state[dataSet].selected;
		const attendees = state[dataSet].entities;
		const shown = selectSortedFilteredIds(state, dataSet);
		const newMembers = {};
		for (const id of selected) {
			if (shown.includes(id)) {
				const a = attendees[id];
				newMembers[id] = {
					Name: a.Name,
					Email: a.Email,
					Affiliation: a.Affiliation,
				};
			}
		}
		return dispatch(upsertMembers(newMembers));
	}

export const importAttendances = (session_id) =>
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
