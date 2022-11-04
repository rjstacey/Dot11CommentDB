import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

import {selectImatMeetingEntities} from './imatMeetings';
import {selectBreakoutMeetingId, selectBreakoutEntities} from './imatBreakouts';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Timestamp: {label: 'Timestamp', sortType: SortType.DATE},
};

export const dataSet = 'imatBreakoutAttendance';
const selectId = (member) => member.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		imatMeetingId: 0,
		imatBreakoutId: 0,
	},
	reducers: {
		setDetails(state, action) {
			return {...state, ...action.payload};
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectBreakoutAttendanceState = (state) => state[dataSet];

export const selectImatMeeting = (state) => {
	const {imatMeetingId} = selectBreakoutAttendanceState(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingEntities[imatMeetingId];
}

export const selectImatBreakout = (state) => {
	const {imatMeetingId, imatBreakoutId} = selectBreakoutAttendanceState(state);
	if (imatMeetingId === selectBreakoutMeetingId(state)) {
		const imatBreakoutEntities = selectBreakoutEntities(state);
		return imatBreakoutEntities[imatBreakoutId];
	}
}

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
} = slice.actions;

const baseUrl = '/api/imat/attendance';

export const loadBreakoutAttendance = (imatMeetingId, imatBreakoutId) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		const url = `${baseUrl}/${imatMeetingId}/${imatBreakoutId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendance for ${imatMeetingId}/${imatBreakoutId}`, error));
			return;
		}
		dispatch(setDetails({imatMeetingId, imatBreakoutId}));
		await dispatch(getSuccess(response));
	}

