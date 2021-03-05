import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortsSlice, {sortInit, SortDirection, SortType} from './sort'
import filtersSlice, {filtersInit, FilterType} from './filters'
import selectedSlice, {setSelected} from './selected'
import uiSlice from './ui'

import {AccessLevel, AccessLevelOptions} from './login'	// re-export access level constants

export {AccessLevel, AccessLevelOptions};

const userFields = ['SAPIN', 'Name', 'Email', 'Access']

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


const dataAdapter = createEntityAdapter({
	selectId: (user) => user.SAPIN
})

const dataSet = 'users'

const usersSlice = createSlice({
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
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateOne(state, action) {
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
		},
		upload(state, action) {
			state.loading = true;
		},
		uploadSuccess(state, action) {
			state.valid = true;
			state.loading = false;
			dataAdapter.setAll(state, action.payload);
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
export default usersSlice.reducer;

function updateIdList(users, selected) {
	const changed = selected.reduce(
		(result, id) => result || !users.find(u => u.SAPIN === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !users.find(u => u.SAPIN === id))
}

const {getPending, getSuccess, getFailure} = usersSlice.actions;

export function loadUsers() {
	return async (dispatch, getState) => {
		dispatch(getPending())
		let users;
		try {
			users = await fetcher.get('/api/users')
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get users list', error))
			])
		}
		const p = []
		const {selected} = getState()[dataSet]
		const newSelected = updateIdList(users, selected)
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))

		p.push(dispatch(getSuccess(users)))
		return Promise.all(p)
	}
}

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
