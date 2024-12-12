import { createAction } from "@reduxjs/toolkit";
import { createAppTableDataSlice, shallowEqual } from "dot11-components";

import { dataSet, fields } from "./webexMeetingsSelectors";
import { LoadMeetingsConstraints } from "./meetingsSelectors";

const initialState: {
	groupName: string | null;
	query?: LoadMeetingsConstraints;
	lastLoad: string | null;
} = {
	groupName: null,
	lastLoad: null,
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
					const { groupName, query } = action.payload;
					if (
						state.groupName !== groupName ||
						!shallowEqual(state.query, query)
					) {
						state.groupName = groupName;
						state.query = query;
						dataAdapter.removeAll(state);
					}
					state.lastLoad = new Date().toISOString();
				}
			)
			.addMatcher(
				(action) => action.type === clearWebexMeetings.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.groupName = null;
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
// Override getPending() with one the sets groupName
export const getPending = createAction<{
	groupName: string;
	query?: LoadMeetingsConstraints;
}>(slice.name + "/getPending");
export const clearWebexMeetings = createAction(slice.name + "/clear");
