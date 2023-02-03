import {DateTime} from 'luxon';
import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {updateSessionSuccess} from './sessions';

const fields = {
	id: {label: 'ID', isId: true, sortType: SortType.NUMERIC},
	MeetingNumber: {label: 'MeetingNumber', sortType: SortType.NUMERIC},
	BreakoutID: {label: 'Breakout ID', sortType: SortType.NUMERIC},
	DayDate: {label: 'DayDate'},
	Start: {label: 'Start', sortType: SortType.DATE},
	End: {label: 'End', sortType: SortType.DATE},
	Time: {label: 'Time'},
	Location: {label: 'Location'},
	Group: {label: 'Group'},
	Name: {label: 'Name'},
	Credit: {label: 'Credit'},
	Attendees: {label: 'Attendees'}
};

export const dataSet = 'breakouts';

export const getField = (entity, dataKey) => {
	if (!entity.hasOwnProperty(dataKey)) {
		if (dataKey === 'DayDate') {
			const start = DateTime.fromISO(entity.Start, {zone: entity.TimeZone});
			return start.toFormat('EEE, yyyy LLL dd');
		}
		if (dataKey === 'Day') {
			const start = DateTime.fromISO(entity.Start, {zone: entity.TimeZone});
			return start.weekdayShort();
		}
		if (dataKey === 'Time') {
			const start = DateTime.fromISO(entity.Start, {zone: entity.TimeZone});
			const end = DateTime.fromISO(entity.End, {zone: entity.TimeZone});
			return start.toFormat('HH:mm') + ' - ' + end.toFormat('HH:mm');
		}
	}
	return entity[dataKey];
}

/*
 * Slice
 */
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	initialState: {session: null},
	reducers: {
		setSession(state, action) {
			state.session = action.payload;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectBreakoutsState = (state) => state[dataSet];

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setSession
} = slice.actions;

export const loadBreakouts = (session_id) =>
	async (dispatch, getState) => {
		if (selectBreakoutsState(getState()).loading)
			return;
		dispatch(getPending());
		const url = `/api/sessions/${session_id}/breakouts`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get breakouts for ${session_id}`, error));
			return;
		}
		const {breakouts, session} = response;
		breakouts.forEach(b => b.TimeZone = session.TimeZone);
		dispatch(getSuccess(breakouts));
		dispatch(setSession(session));
	}

export const importBreakouts = (session_id) =>
	async (dispatch, getState) => {
		const url = `/api/sessions/${session_id}/breakouts/import`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			console.log(error)
			await dispatch(setError('Unable to import breakouts', error))
			return;
		}
		const {breakouts, session} = response;
		breakouts.forEach(b => b.TimeZone = session.TimeZone);
		dispatch(getSuccess(breakouts));
		dispatch(updateSessionSuccess(session.id, session));
	}
