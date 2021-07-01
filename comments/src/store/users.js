import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/lib/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'
import {AccessLevel, AccessLevelOptions} from 'dot11-common/store/login'	// re-export access level constants

export {AccessLevel, AccessLevelOptions};

const fields = ['SAPIN', 'Name', 'Access']

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
	selectId: (user) => user.SAPIN
})

const dataSet = 'users'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
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
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
/*		updateOne(state, action) {
			const {SAPIN, user} = action.payload;
			dataAdapter.updateOne(state, user);
		},
		addOne(state, action) {
			const user = action.payload;
			dataAdapter.addOne(state, user);
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
		}*/
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

const {getPending, getSuccess, getFailure} = slice.actions;

export function loadUsers() {
	return async (dispatch, getState) => {
		dispatch(getPending())
		let response;
		try {
			response = await fetcher.get('/api/users')
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get users list', error))
			])
		}
		return dispatch(getSuccess(response.users))
	}
}

/*
const {updateOne} = usersSlice.actions;

export function updateUser(SAPIN, user) {
	return async (dispatch) => {
		dispatch(updateOne({SAPIN, user}))
		try {
			const response = await fetcher.put(`/api/user/${SAPIN}`, {user})
			return null
		}
		catch(error) {
			return dispatch(setError(`Unable to update user ${SAPIN}`, error))
		}
	}
}

const {addOne} = usersSlice.actions;
export function addUser(user) {
	return async (dispatch) => {
		dispatch(addOne(user))
		try {
			const response = await fetcher.post('/api/user', {user})
			return null;
		}
		catch(error) {
			return dispatch(setError(`Unable to add user ${user.SAPIN}`, error))
		}
	}
}

const {deleteMany} = usersSlice.actions;

export function deleteUsers(userIds) {
	return async (dispatch, getState) => {
		dispatch(deleteMany(userIds))
		try {
			const users = userIds.map(sapin => ({SAPIN: sapin}));
			await fetcher.delete('/api/users', {users})
			const {selected} = getState()[dataSet]
			const newSelected = selected.filter(id => !userIds.includes(id))
			return dispatch(setSelected(dataSet, newSelected))
		}
		catch(error) {
			return dispatch(setError(`Unable to delete users ${userIds}`, error))
		}
	}
}

const {upload, uploadSuccess, uploadFailure} = usersSlice.actions;

export function uploadUsers(file) {
	return async (dispatch) => {
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
}
*/