import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';

import { setError } from 'dot11-components';

import {selectSessionEntities} from './sessions';
import {loadMeetings, LoadMeetingsConstraints, clearMeetings} from './meetings';
import {clearWebexMeetings} from './webexMeetings';
import {loadBreakouts, clearBreakouts} from './imatBreakouts';
import { AppThunk, RootState } from '.';

const dataSet = 'current';

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
	groupId: string | null;
	sessionId: number | null;
	showDateRange: boolean;
	groupDefaults: Record<string, GroupDefaults>
}

const slice = createSlice({
	name: dataSet,
	initialState: {
		groupId: null,
		sessionId: null,
		showDateRange: false,
		groupDefaults: {null: initDefaults}
	} as CurrentState,
	reducers: {
		setCurrentGroupId(state, action: PayloadAction<string | null>) {
			const groupId = action.payload;
			state.groupId = groupId;
			if (groupId && !state.groupDefaults[groupId])
				state.groupDefaults[groupId] = initDefaults;
		},
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
export function selectCurrentGroupId(state: RootState) {return selectCurrentState(state).groupId};
export const selectCurrentSessionId = (state: RootState) => selectCurrentState(state).sessionId;
export const selectShowDateRange = (state: RootState) => selectCurrentState(state).showDateRange;
export const selectGroupDefaults = (state: RootState, groupId: string) => selectCurrentState(state).groupDefaults[groupId] || initDefaults;

export const selectCurrentGroupDefaults = (state: RootState) => {
	const groupId = selectCurrentGroupId(state);
	return selectGroupDefaults(state, groupId || '');
};

/* Actions */
export const {setCurrentGroupId, setShowDateRange, setGroupDefaults} = slice.actions;

export const setCurrentGroupDefaults = (defaults: Partial<GroupDefaults>): AppThunk =>
	(dispatch, getState) => {
		const groupId = selectCurrentGroupId(getState());
		if (!groupId)
			dispatch(setError("Can't set defaults", "Group not set"));
		else
			dispatch(setGroupDefaults({groupId, defaults}));
		return Promise.resolve();
	}

export const refresh = (): AppThunk =>
	(dispatch, getState) => {
		const state = getState();
		const groupId = selectCurrentGroupId(state);
		const sessionId = selectCurrentSessionId(state)!;
		const showDateRange = selectShowDateRange(state);
		const session = selectSessionEntities(state)[sessionId];
		const constraints: LoadMeetingsConstraints = {};
		if (groupId)
			constraints.groupId = groupId;
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
		dispatch(clearMeetings());
		dispatch(clearWebexMeetings());
		dispatch(clearBreakouts());
		dispatch(loadMeetings(constraints));
		if (session && session.imatMeetingId)
			dispatch(loadBreakouts(session.imatMeetingId));
		return Promise.resolve();
	}

export const setCurrentSessionId = (sessionId: number | null): AppThunk =>
	(dispatch) => {
		dispatch(slice.actions.setCurrentSessionId(sessionId));
		dispatch(refresh());
		return Promise.resolve();
	}
