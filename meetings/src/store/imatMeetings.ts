import {
	fetcher,
	setError,
	displayDate,
	displayDateRange,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	AppTableDataState,
	SortType,
} from 'dot11-components';

import { selectCurrentSession } from './sessions';
import { RootState, AppThunk } from '.';

export type ImatMeeting = {
	id: number;
	organizerId: string;
	organizerSymbol: string;
	organizerName: string;
	name: string;
	type: string;
	start: string;
	end: string;
	timezone: string;
}

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
export function getField(entity: ImatMeeting, dataKey: string) {
	if (dataKey === 'dateRange')
		return displayDateRange(entity.start, entity.end);
	return entity[dataKey as keyof ImatMeeting];
}

type ImatMeetingsState = AppTableDataState<ImatMeeting>;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {}
});

export default slice;

/*
 * Selectors
 */
export const selectImatMeetingsState = (state: RootState) => state[dataSet] as ImatMeetingsState;
export const selectImatMeetingEntities = (state: RootState) => selectImatMeetingsState(state).entities;

export const selectCurrentImatMeeting = (state: RootState) => {
	const session = selectCurrentSession(state);
	const imatMeetingId = session?.imatMeetingId;
	return imatMeetingId? selectImatMeetingEntities(state)[imatMeetingId]: undefined;
}

export const imatMeetingsSelectors = getAppTableDataSelectors(selectImatMeetingsState, {getField});

/*
 * Actions
 */

export const imatMeetingsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	removeAll,
} = slice.actions;

const baseUrl = '/api/imat/meetings';

export const loadImatMeetings = (): AppThunk =>
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
		dispatch(getSuccess(meetings));
	}

export const clearImatMeetings = (): AppThunk => (dispatch) => {dispatch(removeAll()); return Promise.resolve(); };
