import { createAppTableDataSlice, AppTableDataState } from 'dot11-components';

import {
	dataSet,
	fields,
	WebexMeeting
} from './webexMeetingsSelectors';

export type WebexMeetingsState = AppTableDataState<WebexMeeting>;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === dataSet + '/getPending',
				(state, action) => {dataAdapter.setAll(state, [])}
			)
	}
});

export default slice;
