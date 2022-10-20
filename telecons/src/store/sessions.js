import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';

import {selectCurrentSessionId} from './current';

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

export const displaySessionType = (type) => SessionTypeLabels[type] || 'Unknown';

const displayImatMeetingId = (imatMeetingId) => imatMeetingId || <span style={{fontStyle: 'italic'}}>(Blank)</span>

export const fields = {
	id: {label: 'ID', isId: true, sortType: SortType.NUMERIC},
	name: {label: 'Session name'},
	type: {label: 'Session type', dataRenderer: displaySessionType, options: SessionTypeOptions},
	imatMeetingId: {label: 'IMAT meeting', dataRenderer: displayImatMeetingId},
	startDate: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	endDate: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE}, 
	timezone: {label: 'Timezone'}
};

export const dataSet = 'sessions';

const sortComparer = (a, b) => DateTime.fromISO(b.startDate).toMillis() - DateTime.fromISO(a.startDate).toMillis();

const slice = createAppTableDataSlice({
	name: dataSet,
	sortComparer,
	fields,
});

export default slice;

/*
 * Selectors
 */
export const selectSessionsState = (state) => state[dataSet];
export const selectSessionEntities = (state) => selectSessionsState(state).entities;

export const selectSessionsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

export const selectSessionsSelected = (state) => selectSessionsState(state).selected;

export const selectCurrentSession = (state) => {
	const id = selectCurrentSessionId(state);
	const entities = selectSessionEntities(state);
	return entities[id];
}

export const selectCurrentSessionDates = createSelector(
	selectCurrentSession,
	(session) => {
		let dates = [];
		if (session) {
			const start = DateTime.fromISO(session.startDate);
			const end = DateTime.fromISO(session.endDate).plus({days: 1});
			const nDays = end.diff(start, 'days').days;
			if (nDays > 0) {
				dates = new Array(nDays)
					.fill(null)
					.map((d, i) => start.plus({days: i}).toISODate());
			}
		}
		return dates;
	}
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
	setSelected,
	setProperty,
	setPanelIsSplit,
} = slice.actions;

export const setSessionsCurrentPanelIsSplit = (isSplit) => setPanelIsSplit({isSplit});
export const setSessionsUiProperty = (property, value) => setProperty({property, value});
export {setSelected as setSessionsSelected}

const baseUrl = '/api/sessions';

export const loadSessions = () =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		await dispatch(getPending());
		let sessions;
		try {
			sessions = await fetcher.get(baseUrl);
			if (!Array.isArray(sessions))
				throw new TypeError('Unexpected response to GET ' + baseUrl);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get sessions', error))
			]);
			return;
		}
		await dispatch(getSuccess(sessions));
	}

export const updateSession = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let updatedSession;
		try {
			updatedSession = await fetcher.patch(url, changes);
			if (typeof updatedSession !== 'object')
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update session`, error));
			return;
		}
		await dispatch(updateOne({id, changes: updatedSession}));
	}

export const addSession = (session) =>
	async (dispatch) => {
		let newSession;
		try {
			newSession = await fetcher.post(baseUrl, session);
			if (typeof newSession !== 'object')
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add session', error));
			return;
		}
		dispatch(addOne(newSession));
		return newSession.id;
	}

export const deleteSessions = (ids) =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete meetings ${ids}`, error));
		}
		await dispatch(removeMany(ids));
	}


/*
 * Functions to convert date/slot/room to/from id
 */
export const toSlotId = (date, slot, room) => `${date}/${slot.id}/${room.id}`;
export const fromSlotId = (id) => {
	const p = id.split('/');
	return [p[0], parseInt(p[1]), parseInt(p[2])];
}
