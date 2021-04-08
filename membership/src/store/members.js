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

const userFields = ['SAPIN', 'Name', 'Email', 'Status', 'NewStatus', 'Access']

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
const defaultFiltersEntries = userFields.reduce((entries, dataKey) => {
	let options;
	if (dataKey === 'Access')
		options = AccessLevelOptions;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = userFields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'SAPIN':
		case 'Access':
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

const dataAdapter = createEntityAdapter({
	selectId: (m) => m.SAPIN
})

const dataSet = 'members'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
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
			dataAdapter.setAll(state, members);
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
			dataAdapter.setAll(state, members);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		updateOne(state, action) {
			const {SAPIN, user} = action.payload;
			dataAdapter.updateOne(state, {id: SAPIN, changes: user});
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		addOne(state, action) {
			const user = action.payload;
			dataAdapter.addOne(state, user);
		},
		upsertMany(state, action) {
			const users = action.payload;
			dataAdapter.upsertMany(state, users);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		deleteMany(state, action) {
			const userIds = action.payload;
			dataAdapter.removeMany(state, userIds);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		upload(state, action) {
			state.loading = true;
		},
		uploadSuccess(state, action) {
			state.valid = true;
			state.loading = false;
			dataAdapter.setAll(state, action.payload);
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
		let users;
		try {
			users = await fetcher.get('/api/users');
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get users list', error))
			])
		}
		return dispatch(getSuccess(users))
	}

export const loadMembersWithAttendance = () =>
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get('/api/users/attendance');
			if (!response.hasOwnProperty('members') || !response.hasOwnProperty('sessions'))
				throw new TypeError("Unexpected response to get('/api/users/attendance')");
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

export const updateMember = (SAPIN, user) =>
	async (dispatch) => {
		dispatch(updateOne({SAPIN, user}));
		try {
			const response = await fetcher.put(`/api/user/${SAPIN}`, {user});
			return null
		}
		catch(error) {
			return dispatch(setError(`Unable to update user ${SAPIN}`, error))
		}
	}

const {addOne} = slice.actions;

export const addMember = (user) =>
	async (dispatch) => {
		dispatch(addOne(user))
		try {
			const response = await fetcher.post('/api/user', {user})
			return null;
		}
		catch(error) {
			return dispatch(setError(`Unable to add user ${user.SAPIN}`, error))
		}
	}

const {upsertMany} = slice.actions;

export const upsertMembers = (users) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/users', {users})
			if (!response.hasOwnProperty('users'))
				throw new TypeError("Unexpected response to post('/api/users')")
		}
		catch(error) {
			return dispatch(setError(`Unable to update/insert users`, error))
		}
		dispatch(upsertMany(response.users))
	}

const {deleteMany} = slice.actions;

export const deleteMembers = (ids) =>
	async (dispatch, getState) => {
		dispatch(deleteMany(ids))
		try {
			await fetcher.delete('/api/users', ids)
		}
		catch(error) {
			return dispatch(setError(`Unable to delete users ${ids}`, error))
		}
	}

const {upload, uploadSuccess, uploadFailure} = slice.actions;

export const uploadMembers = (file) =>
	async (dispatch) => {
		dispatch(upload())
		let users;
		try {
			users = await fetcher.postMultipart('/api/users/upload', {UsersFile: file})
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadFailure()),
				dispatch(setError('Unable to upload users', error))
			])
		}
		return dispatch(uploadSuccess(users))
	}

export const deleteSelectedMembers = () => 
	(dispatch, getState) => {
		const state = getState();
		const selected = state[dataSet].selected;
		const shown = getSortedFilteredIds(state, dataSet);
		const ids = selected.filter(id => shown.includes(id));
		return dispatch(deleteMembers(ids));
	}
