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

const dataSet = 'breakouts';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {
		setSession(state, action) {
			state.session = action.payload;
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
	setSession
} = slice.actions;

export const loadBreakouts = (session_id) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		await dispatch(getPending());
		const url = `/api/session/${session_id}/breakouts`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get breakouts for ${session_id}`, error))
			]);
			return;
		}
		await Promise.all([
			dispatch(getSuccess(response.breakouts)),
			dispatch(setSession(response.session))
		]);
	}

export const importBreakouts = (session_id) =>
	async (dispatch, getState) => {
		console.log('import breakouts')
		const url = `/api/session/${session_id}/breakouts/import`;
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
		const {session} = response;
		await Promise.all([
			dispatch(getSuccess(response)),
			dispatch(updateSessionSuccess(session.id, session))
		]);
	}
