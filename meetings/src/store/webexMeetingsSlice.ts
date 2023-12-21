import { createAction } from "@reduxjs/toolkit";
import { createAppTableDataSlice } from "dot11-components";

import { dataSet, fields } from "./webexMeetingsSelectors";

const initialState: {
	groupName: string | null;
} = {
	groupName: null
};

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	reducers: {},
	extraReducers(builder, dataAdapter) {
		builder
		.addMatcher(
			(action) => action.type === getPending.toString(),
			(state, action: ReturnType<typeof getPending>) => {
				const {groupName} = action.payload;
				if (state.groupName !== groupName) {
					state.groupName = groupName;
					dataAdapter.removeAll(state);
				}
			}
		)
		.addMatcher(
			(action) => action.type === clearWebexMeetings.toString(),
			(state) => {
				dataAdapter.removeAll(state);
				state.groupName = null;
				state.valid = false;
			}
		)
	},
});

export default slice;

/* Slice actions */
// Override getPending() with one the sets groupName
export const getPending = createAction<{ groupName: string }>(
	slice.name + "/getPending"
);
export const clearWebexMeetings = createAction(slice.name + "/clear");

