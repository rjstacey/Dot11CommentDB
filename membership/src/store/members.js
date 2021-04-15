import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'
import {getSortedFilteredIds} from 'dot11-common/store/dataSelectors'
import {AccessLevel, AccessLevelOptions} from 'dot11-common/store/login'	// re-export access level constants

export {AccessLevel, AccessLevelOptions};

const fields = ['SAPIN', 'Name', 'Email', 'Employer', 'Affiliation', 'Status', 'NewStatus', 'Access', 'AttendanceCount']

const Status = {
	'Non-Voter': 'Non-Voter',
	'Aspirant': 'Aspirant',
	'Potential Voter': 'Potential Voter',
	'Voter': 'Voter',
	'ExOfficio': 'ExOfficio',
	'Obsolete': 'Obsolete'
};

export const StatusOptions = Object.entries(Status).map(([k, v]) => ({value: k, label: v}));

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = fields.reduce((entries, dataKey) => {
	let options;
	if (dataKey === 'Access')
		options = AccessLevelOptions;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = fields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'SAPIN':
		case 'Access':
		case 'AttendanceCount':
			type = SortType.NUMERIC
			break
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const membersAdapter = createEntityAdapter({
	selectId: (m) => m.SAPIN
})

const dataSet = 'members'

const slice = createSlice({
	name: dataSet,
	initialState: membersAdapter.getInitialState({
		valid: false,
		validAttendance: false,
		loading: false,
		sessions: {},
		[sortsSlice.name]: sortsSlice.reducer(undefined, sortInit(defaultSortEntries)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, filtersInit(defaultFiltersEntries)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})	
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
		getSuccess(state, action) {
			const {members} = action.payload;
			state.loading = false;
			state.valid = true;
			state.validAttendance = false;
			state.sessions = {};
			membersAdapter.setAll(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		getSuccessWithAttendance(state, action) {
			const {members, sessions} = action.payload;
			state.loading = false;
			state.valid = true;
			state.validAttendance = true;
			state.sessions = sessions.reduce((obj, s) => ({...obj, [s.id]: s}), {});
			membersAdapter.setAll(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		updateOne(state, action) {
			const {id, changes} = action.payload;
			membersAdapter.updateOne(state, {id, changes});
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		addOne(state, action) {
			const {member} = action.payload;
			membersAdapter.addOne(state, member);
		},
		upsertMany(state, action) {
			const {members} = action.payload;
			membersAdapter.upsertMany(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		deleteMany(state, action) {
			const userIds = action.payload;
			membersAdapter.removeMany(state, userIds);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		uploadPending(state, action) {
			state.loading = true;
		},
		uploadSuccess(state, action) {
			const {members} = action.payload;
			state.valid = true;
			state.loading = false;
			membersAdapter.setAll(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		uploadFailure(state, action) {
			state.loading = false;
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure, getSuccessWithAttendance} = slice.actions;

export const loadMembers = () =>
	async (dispatch, getState) => {
		dispatch(getPending())
		let response;
		try {
			response = await fetcher.get('/api/members');
			if (typeof response !== 'object' || !response.hasOwnProperty('members'))
				throw new TypeError("Unexpected response to GET: /api/members");
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get members list', error))
			])
		}
		return dispatch(getSuccess(response))
	}

export const loadMembersWithAttendance = () =>
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/members/attendance');
			if (typeof response !== 'object' || !response.hasOwnProperty('members'))
				throw new TypeError("Unexpected response to GET: /api/members/attendance");
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get users list', error))
			])
		}
		return dispatch(getSuccessWithAttendance(response));
	}

const {updateOne} = slice.actions;

export const updateMember = (id, member) =>
	async (dispatch) => {
		dispatch(updateOne({id, changes: member}));
		const url = `/api/member/${id}`;
		let response;
		try {
			response = await fetcher.patch(url, {member});
			if (typeof response !== 'object' || !response.hasOwnProperty('member'))
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to update member', error));
			return;
		}
		dispatch(updateOne({id, changes: response.member}));
	}

const {addOne} = slice.actions;

export const addMember = (member) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/member', {member});
			if (typeof response !== 'object' || !response.hasOwnProperty('member'))
				throw new TypeError("Unexpected response to POST: /api/member");
		}
		catch(error) {
			await dispatch(setError(`Unable to add member SAPIN=${member.SAPIN}`, error))
			return
		}
		dispatch(addOne(response))
	}

const {upsertMany} = slice.actions;

export const upsertMembers = (members) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/members', {members})
			if (typeof response !== 'object' || !response.hasOwnProperty('members'))
				throw new TypeError("Unexpected response to POST: /api/members")
		}
		catch(error) {
			await dispatch(setError(`Unable to update/insert members`, error));
			return;
		}
		dispatch(upsertMany(response));
	}

const {deleteMany} = slice.actions;

export const deleteMembers = (ids) =>
	async (dispatch, getState) => {
		dispatch(deleteMany(ids))
		try {
			await fetcher.delete('/api/members', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete members ${ids}`, error));
		}
	}

const {uploadPending, uploadSuccess, uploadFailure} = slice.actions;

export const UploadFormat = {
	Roster: 'roster',
	Members: 'members',
	SAPINs: 'sapins',
	Emails: 'emails'
};

export const uploadMembers = (format, file) =>
	async (dispatch) => {
		dispatch(uploadPending())
		const url = `/api/members/upload/${format}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file})
			if (typeof response !== 'object' || !response.hasOwnProperty('members'))
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadFailure()),
				dispatch(setError('Unable to upload users', error))
			])
		}
		return dispatch(uploadSuccess(response))
	}

export const deleteSelectedMembers = () => 
	(dispatch, getState) => {
		const state = getState();
		const selected = state[dataSet].selected;
		const shown = getSortedFilteredIds(state, dataSet);
		const ids = selected.filter(id => shown.includes(id));
		return dispatch(deleteMembers(ids));
	}
