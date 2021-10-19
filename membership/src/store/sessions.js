import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType, SortDirection} from 'dot11-components/store/appTableData';
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
	MeetingNumber: {label: 'Meeting number'},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE}, 
	Name: {label: 'Session name'},
	Type: {label: 'Session type', dataRenderer: displaySessionType, options: SessionTypeOptions},
	TimeZone: {label: 'TimeZone'}
};

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = Object.keys(fields).reduce((entries, dataKey) => {
	let options;
	if (dataKey === 'Type')
		options = SessionTypeOptions;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = Object.keys(fields).reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'id':
			type = SortType.NUMERIC
			break
		case 'Start':
		case 'End':
			type = SortType.DATE
			break
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


function correctEntry(session) {
	let s = session;
	if (typeof s.Start === 'string')
		s = {...s, Start: new Date(s.Start)};
	if (typeof s.End === 'string')
		s = {...s, End: new Date(s.End)};
	return s;
}

const dataSet = 'sessions'

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
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

/*
 * Export reducer as default
 */
export default slice.reducer;

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
		const url = `/api/session/${id}`;
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
			newSession = await fetcher.post('/api/session', session);
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
		await dispatch(removeMany(ids));
		try {
			await fetcher.delete('/api/sessions', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete meetings ${ids}`, error));
		}
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
			console.log(error)
			await Promise.all([
				dispatch(getTimeZonesFailure()),
				dispatch(setError('Unable to get time zones list', error))
			])
			return;
		}
		await dispatch(getTimeZonesSuccess(timeZones));
	}

export const setSessionsUiProperty = (property, value) => slice.actions.setProperty({property, value});
