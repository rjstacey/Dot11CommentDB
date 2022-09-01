import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {displayDate, displayDateRange} from 'dot11-components/lib';

export const fields = {
	id: {label: 'Meeting number', sortType: SortType.NUMERIC},
	start: {label: 'Start', dataRenderer: displayDate},
	end: {label: 'End', dataRenderer: displayDate},
	dateRange: {label: 'Dates'},
	name: {label: 'Name'},
	type: {label: 'Type'/*, dataRenderer: displaySessionType, options: SessionTypeOptions*/},
	timezone: {label: 'Time zone'},
};

export const dataSet = 'imatMeetings';

/*
 * Fields derived from other fields
 */
export function getField(entity, dataKey) {
	if (dataKey === 'dateRange')
		return displayDateRange(entity.start, entity.end);
	return entity[dataKey];
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	initialState: {},
});

export default slice;

/*
 * Selectors
 */
export const selectImatMeetingsState = (state) => state[dataSet];
export const selectImatMeetingEntities = (state) => selectImatMeetingsState(state).entities;

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
		catch (error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get meetings list', error));
			return;
		}
		await dispatch(getSuccess(meetings));
	}

