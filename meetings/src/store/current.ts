import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { setError } from "dot11-components";

import type { RootState } from ".";
import { selectSessionEntities } from "./sessions";
import { selectWorkingGroup } from "./groups";

export type GroupDefaults = {
	meetingId: string;
	timezone: string;
	calendarAccountId: number | null;
	webexAccountId: number | null;
	webexTemplateId: string | null;
};

const initDefaults: GroupDefaults = {
	meetingId: "",
	timezone: "",
	calendarAccountId: 0,
	webexAccountId: 0,
	webexTemplateId: "",
};

type CurrentState = {
	sessionId: number | null;
	showDateRange: boolean;
	groupDefaults: Record<string, GroupDefaults>;
};

const dataSet = "current";
const slice = createSlice({
	name: dataSet,
	initialState: {
		groupId: null,
		sessionId: null,
		showDateRange: false,
		groupDefaults: { null: initDefaults },
	} as CurrentState,
	reducers: {
		setCurrentSessionId(state, action: PayloadAction<number | null>) {
			const sessionId = action.payload;
			state.sessionId = sessionId;
		},
		setShowDateRange(state, action: PayloadAction<boolean>) {
			state.showDateRange = action.payload;
		},
		updateGroupDefaults(
			state,
			action: PayloadAction<{
				groupName: string;
				changes: Partial<GroupDefaults>;
			}>
		) {
			const { groupName, changes } = action.payload;
			const currentDefaults =
				state.groupDefaults[groupName] || initDefaults;
			state.groupDefaults[groupName] = { ...currentDefaults, ...changes };
		},
	},
});

export default slice;

/* Slice actions */
export const { setCurrentSessionId, setShowDateRange, updateGroupDefaults } =
	slice.actions;

/* Selectors */
export const selectCurrentState = (state: RootState) => state[dataSet];
export const selectCurrentSessionId = (state: RootState) =>
	selectCurrentState(state).sessionId;
export const selectCurrentSession = (state: RootState) => {
	const sessionId = selectCurrentSessionId(state);
	return sessionId ? selectSessionEntities(state)[sessionId] : undefined;
};
export const selectCurrentImatMeetingId = (state: RootState) => {
	const session = selectCurrentSession(state);
	return session?.imatMeetingId;
};
export const selectShowDateRange = (state: RootState) =>
	selectCurrentState(state).showDateRange;
export const selectGroupDefaults = (state: RootState, groupId: string) =>
	selectCurrentState(state).groupDefaults[groupId] || initDefaults;

export const selectCurrentGroupDefaults = (state: RootState) => {
	const group = selectWorkingGroup(state);
	return selectGroupDefaults(state, group?.name || "");
};
