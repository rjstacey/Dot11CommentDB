import {createAppTableDataSlice} from 'dot11-components/store/appTableData';

import {dataSet, fields, getField, selectSyncedWebexMeetingEntities} from './webexMeetingsSelectors';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	selectEntities: selectSyncedWebexMeetingEntities,
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === dataSet + '/getPending',
				(state, action) => {dataAdapter.setAll(state, [])}
			)
	}
});

export default slice;
