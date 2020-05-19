import {FilterType, filterCreate, filterSetValue, filterData} from './filter'
import {SortType, sortCreate, sortAddColumn, sortClick, sortData} from './sort'
import {
	SET_USERS_FILTER,
	SET_USERS_SORT,
	SET_USERS_SELECTED,
	GET_USERS,
	GET_USERS_SUCCESS,
	GET_USERS_FAILURE,
	UPDATE_USER,
	UPDATE_USER_SUCCESS,
	UPDATE_USER_FAILURE,
	ADD_USER,
	ADD_USER_SUCCESS,
	ADD_USER_FAILURE,
	DELETE_USERS,
	DELETE_USERS_SUCCESS,
	DELETE_USERS_FAILURE,
	UPLOAD_USERS,
	UPLOAD_USERS_SUCCESS,
	UPLOAD_USERS_FAILURE
} from '../actions/users'

const userFields = ['SAPIN', 'Name', 'Email', 'Access']

const accessOptions = [
	{value: 0, label: 'Public'},
	{value: 1, label: 'Member'},
	{value: 2, label: 'Subgroup Admin'},
	{value: 3, label: 'WG Admin'}
]

/*
 * Generate a filter for each field (table column)
 */
function genDefaultFilters() {
	let filters = {}
	for (let dataKey of userFields) {
		let type
		switch (dataKey) {
		case 'SAPIN':
		case 'Access':
			type = FilterType.NUMERIC
			break
		default:
			type = FilterType.STRING
		}
		filters[dataKey] = filterCreate(type)
	}
	return filters
}

function genDefaultSort() {
	let sort = sortCreate()
	for (let dataKey of userFields) {
		let type
		switch (dataKey) {
		case 'SAPIN':
		case 'Access':
			type = SortType.NUMERIC
			break
		default:
			type = SortType.STRING
		}
		sortAddColumn(sort, dataKey, type)
	}
	return sort
}

const defaultState = {
	filters: genDefaultFilters(),
	accessOptions: accessOptions,
	sort: genDefaultSort(),
	selected: [],
	usersValid: false,
	users: [],
	usersMap: [],
	getUsers: false,
	updateUsers: false,
	addUsers: false,
	uploadUsers: false,
	deleteUsers: false
}

function updateSelected(users, selected) {
	return selected.filter(s => users.find(u => u.SAPIN === s))
}

function users(state = defaultState, action) {
	var users, userIds

	switch (action.type) {
		case SET_USERS_SORT:
			const sort = sortClick(state.sort, action.dataKey, action.event)
			return {
				...state,
				sort,
				usersMap: sortData(sort, state.usersMap, state.users)
			}
		case SET_USERS_FILTER:
			const filters = {
				...state.filters,
				[action.dataKey]: filterSetValue(state.filters[action.dataKey], action.value)
			}
			return {
				...state,
				filters,
				usersMap: sortData(state.sort, filterData(state.users, filters), state.users)
			}
		case SET_USERS_SELECTED:
			return {
				...state,
				selected: updateSelected(state.users, action.selected)
			}
		case GET_USERS:
			return {...state, getUsers: true}
		case GET_USERS_SUCCESS:
			return {
				...state,
				getUsers: false,
				usersValid: true,
				users: action.users,
				usersMap: sortData(state.sort, filterData(action.users, state.filters), action.users),
				selected: updateSelected(action.users, state.selected)
			}
		case GET_USERS_FAILURE:
			return {...state, getUsers: false}

		case UPDATE_USER:
			users = state.users.map(u =>
				(u.SAPIN === action.SAPIN)? Object.assign({}, u, action.user): u
				)
			return {
				...state,
				updateUser: true,
				users,
				usersMap: sortData(state.sort, filterData(users, state.filters), users)
			}
		case UPDATE_USER_SUCCESS:
			return {...state, updateUser: false}
		case UPDATE_USER_FAILURE:
			return {...state, updateUser: false}

		case ADD_USER:
			return {...state, addUser: true}
		case ADD_USER_SUCCESS:
			users = state.users.slice()
			users.push(action.user)
			return {
				...state,
				addUser: false,
				users: users,
				usersMap: sortData(state.sort, filterData(users, state.filters), users)
			}
		case ADD_USER_FAILURE:
			return {...state, addUsers: false}

		case DELETE_USERS:
			userIds = action.userIds
			users = state.users.filter(u => !userIds.includes(u.SAPIN))
			return {
				...state,
				deleteUsers: true,
				users: users,
				usersMap: sortData(state.sort, filterData(users, state.filters), users),
				selected: updateSelected(users, state.selected)
			}
		case DELETE_USERS_SUCCESS:
			return {...state, deleteUsers: false}
		case DELETE_USERS_FAILURE:
			return {...state, deleteUsers: false}

		case UPLOAD_USERS:
			return {...state, uploadUsers: true}
		case UPLOAD_USERS_SUCCESS:
			return {
				...state,
				uploadUsers: false,
				usersValid: true,
				users: action.users,
				usersMap: sortData(state.sort, filterData(action.users, state.filters), action.users),
				selected: updateSelected(action.users, state.selected)
			}
		case UPLOAD_USERS_FAILURE:
			return {...state, uploadUsers: false}

		default:
			return state
	}
}

export default users
