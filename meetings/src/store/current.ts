import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import { setError } from 'dot11-components';

import type { AppThunk, RootState } from '.';
import { selectSessionEntities } from './sessions';
import { loadMeetings, LoadMeetingsConstraints, clearMeetings } from './meetings';
import { clearWebexMeetings } from './webexMeetings';
import { loadBreakouts, clearBreakouts } from './imatBreakouts';
import { selectWorkingGroupId } from './groups';


export type GroupDefaults = {
	meetingId: string;
	timezone: string;
	calendarAccountId: number | null;
	webexAccountId: number | null;
	webexTemplateId: string | null;
}

const initDefaults: GroupDefaults = {
	meetingId: '',
	timezone: '',
	calendarAccountId: 0,
	webexAccountId: 0,
	webexTemplateId: ''
};

type CurrentState = {
	sessionId: number | null;
	showDateRange: boolean;
	groupDefaults: Record<string, GroupDefaults>
}

const dataSet = 'current';
const slice = createSlice({
	name: dataSet,
	initialState: {
		groupId: null,
		sessionId: null,
		showDateRange: false,
		groupDefaults: {null: initDefaults}
	} as CurrentState,
	reducers: {
		setCurrentSessionId(state, action: PayloadAction<number | null>) {
			const sessionId = action.payload;
			state.sessionId = sessionId;
		},
		setShowDateRange(state, action: PayloadAction<boolean>) {
			state.showDateRange = action.payload;
		},
		setGroupDefaults(state, action: PayloadAction<{groupId: string; defaults: Partial<GroupDefaults>}>) {
			const {groupId, defaults} = action.payload;
			const currentDefaults = state.groupDefaults[groupId] || initDefaults;
			state.groupDefaults[groupId] = {...currentDefaults, ...defaults};
		}
	},
});

export default slice;

/* Selectors */
export const selectCurrentState = (state: RootState) => state[dataSet];
export const selectCurrentSessionId = (state: RootState) => selectCurrentState(state).sessionId;
export const selectCurrentSession = (state: RootState) => {
	const sessionId = selectCurrentSessionId(state);
	return sessionId? selectSessionEntities(state)[sessionId]: undefined;
}
export const selectCurrentImatMeetingId = (state: RootState) => {
	const session = selectCurrentSession(state);
	return session?.imatMeetingId;
}
export const selectShowDateRange = (state: RootState) => selectCurrentState(state).showDateRange;
export const selectGroupDefaults = (state: RootState, groupId: string) => selectCurrentState(state).groupDefaults[groupId] || initDefaults;

export const selectCurrentGroupDefaults = (state: RootState) => {
	const groupId = selectWorkingGroupId(state);
	return selectGroupDefaults(state, groupId || '');
};

/* Actions */
export const {
	setCurrentSessionId: setCurrentSessionIdLocal,
	setShowDateRange,
	setGroupDefaults
} = slice.actions;

export const setCurrentGroupDefaults = (defaults: Partial<GroupDefaults>): AppThunk =>
	async (dispatch, getState) => {
		const groupId = selectWorkingGroupId(getState());
		if (!groupId)
			dispatch(setError("Can't set defaults", "Group not set"));
		else
			dispatch(setGroupDefaults({groupId, defaults}));
	}

export const refresh = (): AppThunk =>
	async (dispatch, getState) => {
		dispatch(clearMeetings());
		dispatch(clearWebexMeetings());
		dispatch(clearBreakouts());

		const state = getState();
		const sessionId = selectCurrentSessionId(state);
		if (sessionId) {
			const showDateRange = selectShowDateRange(state);
			const session = selectSessionEntities(state)[sessionId];
			const constraints: LoadMeetingsConstraints = {};
			if (showDateRange) {
				if (session) {
					constraints.fromDate = session.startDate;
					constraints.toDate = session.endDate;
					constraints.timezone = session.timezone;
				}
				else {
					constraints.fromDate = DateTime.now().toISODate()!;
				}
			}
			else {
				constraints.sessionId = sessionId;
			}
			dispatch(loadMeetings(constraints));
			if (session?.imatMeetingId)
				dispatch(loadBreakouts(session.imatMeetingId));
		}
	}

export const setCurrentSessionId = (sessionId: number | null): AppThunk =>
	async (dispatch) => {
		dispatch(setCurrentSessionIdLocal(sessionId));
		dispatch(refresh());
	}
