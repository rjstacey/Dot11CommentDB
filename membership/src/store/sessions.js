import {createSelector} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig, setPanelIsSplit} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate} from 'dot11-components/lib';

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

/*
 * Slice
 */
const sortComparer = (s1, s2) => DateTime.fromISO(s2.startDate).valueOf() - DateTime.fromISO(s1.startDate).valueOf();

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		loadingTimeZones: false,
		timeZones: [],
	},
	reducers: {
		getTimeZonesPending(state, action) {
			state.loadingTimeZones = true;
		},
		getTimeZonesSuccess(state, action) {
			state.loadingTimeZones = false;
			state.timeZones = action.payload;
		},
		getimeZonesFailure(state, action) {
			state.loadingTimeZones = false;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectSessionsState = (state) => state[dataSet];
export const selectSessionEntities = (state) => selectSessionsState(state).entities;

export const selectTimeZonesState = createSelector(
	selectSessionsState,
	(state) => ({
		timeZones: state.timeZones,
		loading: state.loadingTimeZones,
		valid: state.timeZones.length > 0
	})
);

export const selectSessionsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

/*
 * Actions
 */
export const setSessionsCurrentPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	addOne,
	removeMany,
} = slice.actions;

export const loadSessions = () =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		await dispatch(getPending());
		let sessions;
		try {
			sessions = await fetcher.get('/api/sessions');
			if (!Array.isArray(sessions))
				throw new TypeError('Unexpected response to GET: /api/sessions');
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

export const updateSessionSuccess = (id, changes) => updateOne({id, changes});

export const updateSession = (id, session) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes: session}));
		const url = `/api/sessions/${id}`;
		let updatedSession;
		try {
			updatedSession = await fetcher.patch(url, session);
			if (typeof updatedSession !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
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
			newSession = await fetcher.post('/api/sessions', session);
			if (typeof newSession !== 'object')
				throw new TypeError('Unexpected response to POST: /api/session');
		}
		catch(error) {
			await dispatch(setError('Unable to add session', error));
			return;
		}
		dispatch(addOne(newSession));
	}

export const deleteSessions = (ids) =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete('/api/sessions', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete meetings ${ids}`, error));
		}
		await dispatch(removeMany(ids));
	}

const {getTimeZonesPending, getTimeZonesSuccess, getTimeZonesFailure} = slice.actions;

export const loadTimeZones = () =>
	async (dispatch, getState) => {
		await dispatch(getTimeZonesPending());
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
		await dispatch(getTimeZonesSuccess(timeZones));
	}

export const setSessionsUiProperty = (property, value) => slice.actions.setProperty({property, value});

