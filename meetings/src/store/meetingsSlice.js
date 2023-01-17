import {DateTime} from 'luxon';

import {createAppTableDataSlice} from 'dot11-components/store/appTableData';

import {dataSet, fields, getField, selectSyncedMeetingEntities} from './meetingsSelectors';

const sortComparer = (a, b) => {
	// Sort by start
	const v1 = DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis();
	if (v1 === 0) {
		// If equal, sort by end
		return DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis();
	}
	return v1;
}

function toggleListItems(list, items) {
	for (let id of items) {
		const i = list.indexOf(id);
		if (i >= 0)
			list.splice(i, 1);
		else
			list.push(id);
	}
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectField: getField,
	sortComparer,
	selectEntities: selectSyncedMeetingEntities,
	initialState: {
		selectedSlots: []
	},
	reducers: {
		setSelectedSlots(state, action) {
			state.selectedSlots = action.payload;
		},
		toggleSelectedSlots(state, action) {
			toggleListItems(state.selectedSlots, action.payload);
		},
	}
});

export default slice;
