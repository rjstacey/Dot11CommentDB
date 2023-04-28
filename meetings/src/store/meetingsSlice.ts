import type { PayloadAction } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import {
	createAppTableDataSlice,
	AppTableDataState
} from 'dot11-components';

import {
	dataSet,
	fields,
	Meeting
} from './meetingsSelectors';

const sortComparer = (a: Meeting, b: Meeting) => {
	// Sort by start
	const v1 = DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis();
	if (v1 === 0) {
		// If equal, sort by end
		return DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis();
	}
	return v1;
}

function toggleListItems(list: string[], items: string[]) {
	for (let id of items) {
		const i = list.indexOf(id);
		if (i >= 0)
			list.splice(i, 1);
		else
			list.push(id);
	}
}

type ExtraState = {
	selectedSlots: string[];
}

export type MeetingsState = ExtraState & AppTableDataState<Meeting>;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		selectedSlots: []
	} as ExtraState,
	reducers: {
		setSelectedSlots(state: ExtraState, action: PayloadAction<string[]>) {
			state.selectedSlots = action.payload;
		},
		toggleSelectedSlots(state: ExtraState, action: PayloadAction<string[]>) {
			toggleListItems(state.selectedSlots, action.payload);
		},
	}
});

export default slice;
