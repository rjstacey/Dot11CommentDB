import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

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
		meetingNumber: 0,
		breakoutNumber: 0,
	},
	reducers: {
		setDetails(state, action) {
			state.meetingNumber = action.payload.meetingNumber;
			state.breakoutNumber = action.payload.breakoutNumber;
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
export const selectBreakoutAttendanceState = (state) => state[dataSet];

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

export const loadBreakoutAttendance = (meetingNumber, breakoutNumber) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		const url = `${baseUrl}/${meetingNumber}/${breakoutNumber}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendance for ${breakoutNumber}`, error));
			return;
		}
		dispatch(setDetails({meetingNumber, breakoutNumber}));
		await dispatch(getSuccess(response));
	}

