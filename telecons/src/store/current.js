import {createSlice} from '@reduxjs/toolkit';

import {selectImatMeetingEntities} from './imatMeetings';
import {selectSessionEntities} from './sessions';

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
		imatMeetingId: null,
		groupDefaults: {null: initDefaults}
	},
	reducers: {
		setCurrentGroupId(state, action) {
			const groupId = action.payload;
			state.groupId = groupId;
			if (!state.groupDefaults[groupId])
				state.groupDefaults[groupId] = initDefaults;
		},
		setImatMeetingId(state, action) {
			const imatMeetingId = action.payload;
			state.imatMeetingId = imatMeetingId;
		},
		setCurrentSessionId(state, action) {
			const sessionId = action.payload;
			state.sessionId = sessionId;
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
export const selectCurrentImatMeetingId = (state) => selectCurrentState(state).imatMeetingId;
export const selectCurrentSessionId = (state) => selectCurrentState(state).sessionId;
export const selectGroupDefaults = (state, groupId) => selectCurrentState(state).groupDefaults[groupId] || initDefaults;

export const selectCurrentGroupDefaults = (state) => {
	const groupId = selectCurrentGroupId(state);
	return selectGroupDefaults(state, groupId);
};

/* Actions */
const {setImatMeetingId} = slice.actions;
export const {setCurrentGroupId, setCurrentSessionId, setGroupDefaults} = slice.actions;

export const setCurrentGroupDefaults = (defaults) =>
	(dispatch, getState) => {
		const groupId = selectCurrentGroupId(getState());
		return dispatch(setGroupDefaults({groupId, defaults}));
	}

export function setCurrentImatMeetingId(imatMeetingId) {
	return (dispatch, getState) => {
		const state = getState();
		const imatMeetingEntities = selectImatMeetingEntities(state);
		const sessionEntities = selectSessionEntities(state);
		const imatMeeting = imatMeetingEntities[imatMeetingId];
		if (imatMeeting) {
			const session = Object.values(sessionEntities).find(session => session.startDate === imatMeeting.startDate)
			if (session)
				dispatch(setCurrentSessionId(session.id));
		}
		dispatch(setImatMeetingId(imatMeetingId));
	}
}