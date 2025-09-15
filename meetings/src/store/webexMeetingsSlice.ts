import { createAction } from "@reduxjs/toolkit";
import { createAppTableDataSlice, shallowEqual } from "@common";

import { dataSet, fields, type WebexMeeting } from "./webexMeetingsSelectors";
import { WebexMeetingsQuery } from "@schemas/webex";

const initialState: {
	groupName: string | null;
	query?: WebexMeetingsQuery;
	lastLoad: string | null;
} = {
	groupName: null,
	lastLoad: null,
};

const selectId = (entity: WebexMeeting) => entity.id;
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
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
	query?: WebexMeetingsQuery;
}>(slice.name + "/getPending");
export const clearWebexMeetings = createAction(slice.name + "/clear");
