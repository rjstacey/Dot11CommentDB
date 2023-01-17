import {createSlice} from '@reduxjs/toolkit';
import {DateTime} from 'luxon';

import {selectSessionEntities} from './sessions';
import {loadMeetings, clearMeetings} from './meetings';
import {clearWebexMeetings} from './webexMeetings';
import {loadBreakouts, clearBreakouts} from './imatBreakouts';

const dataSet = 'current';

const initDefaults = {
	meetingId: '',
	calendarAccountId: 0,
	webexAccountId: 0,
	webexTemplateId: ''
};

const slice = createSlice({
	name: dataSet,
	initialState: {
		groupId: null,
		sessionId: null,
		showDateRange: false,
		groupDefaults: {null: initDefaults}
	},
	reducers: {
		setCurrentGroupId(state, action) {
			const groupId = action.payload;
			state.groupId = groupId;
			if (!state.groupDefaults[groupId])
				state.groupDefaults[groupId] = initDefaults;
		},
		setCurrentSessionId(state, action) {
			const sessionId = action.payload;
			state.sessionId = sessionId;
		},
		setShowDateRange(state, action) {
			state.showDateRange = action.payload;
		},
		setGroupDefaults(state, action) {
			const {groupId, defaults} = action.payload;
			const currentDefaults = state.groupDefaults[groupId] || initDefaults;
			state.groupDefaults[groupId] = {...currentDefaults, ...defaults};
		}
	},
});

export default slice;

/* Selectors */
export const selectCurrentState = (state) => state[dataSet];
export function selectCurrentGroupId(state) {return selectCurrentState(state).groupId};
export const selectCurrentSessionId = (state) => selectCurrentState(state).sessionId;
export const selectShowDateRange = (state) => selectCurrentState(state).showDateRange;
export const selectGroupDefaults = (state, groupId) => selectCurrentState(state).groupDefaults[groupId] || initDefaults;

export const selectCurrentGroupDefaults = (state) => {
	const groupId = selectCurrentGroupId(state);
	return selectGroupDefaults(state, groupId);
};

/* Actions */
export const {setCurrentGroupId, setShowDateRange, setGroupDefaults} = slice.actions;

export const setCurrentGroupDefaults = (defaults) =>
	(dispatch, getState) => {
		const groupId = selectCurrentGroupId(getState());
		return dispatch(setGroupDefaults({groupId, defaults}));
	}

export const refresh = () =>
	(dispatch, getState) => {
		const state = getState();
		const groupId = selectCurrentGroupId(state);
		const sessionId = selectCurrentSessionId(state);
		const showDateRange = selectShowDateRange(state);
		const session = selectSessionEntities(state)[sessionId];
		const constraints = {};
		if (groupId)
			constraints.groupId = groupId;
		if (showDateRange) {
			if (session) {
				constraints.fromDate = session.startDate;
				constraints.toDate = session.endDate;
				constraints.timezone = session.timezone;
			}
			else {
				constraints.fromDate = DateTime.now().toISODate();
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
	}

export const setCurrentSessionId = (sessionId) =>
	(dispatch, getState) => {
		dispatch(slice.actions.setCurrentSessionId(sessionId));
		dispatch(refresh());
	}
