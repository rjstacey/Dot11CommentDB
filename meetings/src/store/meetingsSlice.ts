import { createAction, PayloadAction } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import { createAppTableDataSlice, shallowEqual } from "dot11-components";

import {
	dataSet,
	fields,
	//LoadMeetingsConstraints,
	Meeting,
	MeetingsQuery,
} from "./meetingsSelectors";

const sortComparer = (a: Meeting, b: Meeting) => {
	// Sort by start
	const v1 =
		DateTime.fromISO(a.start).toMillis() -
		DateTime.fromISO(b.start).toMillis();
	if (v1 === 0) {
		// If equal, sort by end
		return (
			DateTime.fromISO(a.end).toMillis() -
			DateTime.fromISO(b.end).toMillis()
		);
	}
	return v1;
};

function toggleListItems(list: string[], items: string[]) {
	for (const id of items) {
		const i = list.indexOf(id);
		if (i >= 0) list.splice(i, 1);
		else list.push(id);
	}
}

const initialState: {
	groupName: string | null;
	query?: MeetingsQuery; //LoadMeetingsConstraints;
	selectedSlots: string[];
	lastLoad: string | null;
} = {
	groupName: null,
	selectedSlots: [],
	lastLoad: null,
};

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {
		setSelectedSlots(state, action: PayloadAction<string[]>) {
			state.selectedSlots = action.payload;
		},
		toggleSelectedSlots(state, action: PayloadAction<string[]>) {
			toggleListItems(state.selectedSlots, action.payload);
		},
	},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, query } = action.payload;
					state.lastLoad = new Date().toISOString();
					if (
						state.groupName !== groupName ||
						!shallowEqual(state.query, query)
					) {
						state.groupName = groupName;
						state.query = query;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action) => action.type === clearMeetings.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.groupName = null;
					state.valid = false;
				}
			);
	},
});

/* Slice actions */
// Override the default getPending()
export const getPending = createAction<{
	groupName: string;
	query?: MeetingsQuery; //LoadMeetingsConstraints;
}>(slice.name + "/getPending");
export const clearMeetings = createAction(slice.name + "/clear");

export default slice;
