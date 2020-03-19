import {sortClick, sortData, filterValidate, filterData} from '../filter'
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

const filterKeys = [
	'SAPIN', 'Name', 'Email', 'Access'
]

const defaultState = {
	filters: filterKeys.reduce((obj, key) => ({...obj, [key]: filterValidate(key, '')}), {}),
	sortBy: [],
	sortDirection: {},
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
			const {sortBy, sortDirection} = sortClick(action.event, action.dataKey, state.sortBy, state.sortDirection)
			return {
				...state,
				sortBy,
				sortDirection,
				usersMap: sortData(state.usersMap, state.users, sortBy, sortDirection)
			}
		case SET_USERS_FILTER:
			const filters = {
				...state.votingPoolsFilters,
				[action.dataKey]: filterValidate(action.dataKey, action.value)
			}
			return {
				...state,
				filters,
				usersMap: sortData(filterData(state.users, filters), state.users, state.sortBy, state.sortDirection)
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
				usersMap: sortData(filterData(action.users, state.filters), action.users, state.sortBy, state.sortDirection),
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
				usersMap: sortData(filterData(users, state.filters), users, state.sortBy, state.sortDirection)
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
				usersMap: sortData(filterData(users, state.filters), users, state.sortBy, state.sortDirection)
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
				usersMap: sortData(filterData(users, state.filters), users, state.sortBy, state.sortDirection),
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
				usersMap: sortData(filterData(action.users, state.filters), action.users, state.sortBy, state.sortDirection),
				selected: updateSelected(action.users, state.selected)
			}
		case UPLOAD_USERS_FAILURE:
			return {...state, uploadUsers: false}

		default:
			return state
	}
}

export default users
