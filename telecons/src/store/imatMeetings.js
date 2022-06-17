import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error'

function displayDate(isoDate) {
	// ISO date: "YYYY-MM-DD"
	const year = parseInt(isoDate.substr(0, 4));
	const month = parseInt(isoDate.substr(5, 7));
	const date = parseInt(isoDate.substr(8, 10));
	const monthStr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${year} ${monthStr[month] || '???'} ${date}`; 
}

export const fields = {
	id: {label: 'ID'},
	Start: {label: 'Start', dataRenderer: displayDate},
	End: {label: 'End', dataRenderer: displayDate},
	Name: {label: 'Name'},
	Type: {label: 'Type'/*, dataRenderer: displaySessionType, options: SessionTypeOptions*/},
	TimeZone: {label: 'TimeZone'},
	MeetingNumber: {label: 'MeetingNumber', sortType: SortType.NUMERIC}
};

export const dataSet = 'imatMeetings';
const selectId = (meeting) => meeting.MeetingNumber;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {},
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectImatMeetingsState = (state) => state[dataSet];
export const selectImatMeetingsEntities = (state) => selectImatMeetingsState(state).entities;

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure
} = slice.actions;

const baseUrl = '/api/imat/meetings';

export const loadImatMeetings = (n) =>
	async (dispatch, getState) => {
		dispatch(getPending());
		let meetings;
		try {
			meetings = await fetcher.get(baseUrl);
			if (!Array.isArray(meetings))
				throw new TypeError('Unexpected response to GET ' + baseUrl);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get meetings list', error));
			return;
		}
		await dispatch(getSuccess(meetings));
	}

