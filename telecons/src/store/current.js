import {createSlice} from '@reduxjs/toolkit';

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
		meetingId: null,
		groupDefaults: {null: initDefaults}
	},
	reducers: {
		setCurrentGroupId(state, action) {
			const groupId = action.payload;
			state.groupId = groupId;
			if (!state.groupDefaults[groupId])
				state.groupDefaults[groupId] = initDefaults;
		},
		setCurrentMeetingId(state, action) {
			const meetingId = action.payload;
			state.meetingId = meetingId;
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
export const selectCurrentGroupId = (state) => selectCurrentState(state).groupId;
export const selectCurrentMeetingId = (state) => selectCurrentState(state).meetingId;
//export const selectCurrentCalendarAccountId = (state) => selectCurrentState(state).calendarAccountId;
//export const selectCurrentWebexAccountId = (state) => selectCurrentState(state).webexAccountId;
//export const selectCurrentWebexTemplateId = (state) => selectCurrentState(state).webexTemplateId;
export const selectGroupDefaults = (state, groupId) => selectCurrentState(state).groupDefaults[groupId] || initDefaults;
export const selectCurrentGroupDefaults = (state) => {
	const groupId = selectCurrentGroupId(state);
	return selectGroupDefaults(state, groupId);
};

/* Actions */
export const {setCurrentGroupId, setCurrentMeetingId, setGroupDefaults} = slice.actions;

//export const setCurrentGroupId = (groupId) => setCurrent({groupId});
//export const setCurrentMeetingId = (meetingId) => setCurrent({meetingId});
export const setCurrentGroupDefaults = (defaults) =>
	(dispatch, getState) => {
		const groupId = selectCurrentGroupId(getState());
		return dispatch(setGroupDefaults({groupId, defaults}));
	}