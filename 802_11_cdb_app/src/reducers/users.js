import {sortData, filterData} from '../filter'
import {
	SET_USERS_FILTERS,
	SET_USERS_SORT,
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

const defaultState = {
	filters: {},
	sortBy: [],
	sortDirection: {},
	usersDataValid: false,
	usersData: [],
	usersDataMap: [],
	getUsers: false,
	updateUsers: false,
	addUsers: false,
	uploadUsers: false,
	deleteUsers: false
}

function users(state = defaultState, action) {
	var newUsersData, userIds;

	switch (action.type) {
		case SET_USERS_SORT:
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				usersDataMap: sortData(state.usersDataMap, state.usersData, action.sortBy, action.sortDirection)
			}
		case SET_USERS_FILTERS:
			const filters = {...state.filters, ...action.filters};
			return {
				...state,
				filters,
				usersDataMap: sortData(filterData(state.usersData, filters), state.usersData, state.sortBy, state.sortDirection)
			}
		case GET_USERS:
			return {...state, getUsers: true}
		case GET_USERS_SUCCESS:
			return {
				...state,
				getUsers: false,
				usersDataValid: true,
				usersData: action.users,
				usersDataMap: sortData(filterData(action.users, state.filters), action.users, state.sortBy, state.sortDirection)
			}
		case GET_USERS_FAILURE:
			return {...state, getUsers: false}

		case UPDATE_USER:
			newUsersData = state.usersData.map(u =>
				(u.UserID === action.user.UserID)? Object.assign({}, u, action.user): u
				)
			return {
				...state,
				updateUser: true,
				usersData: newUsersData,
				usersDataMap: sortData(filterData(newUsersData, state.filters), newUsersData, state.sortBy, state.sortDirection)
			}
		case UPDATE_USER_SUCCESS:
			return {...state, updateUser: false}
		case UPDATE_USER_FAILURE:
			return {...state, updateUser: false}

		case ADD_USER:
			return {...state, addUser: true}
		case ADD_USER_SUCCESS:
			newUsersData = state.usersData.slice()
			newUsersData.push(action.user)
			return {
				...state,
				addUser: false,
				usersData: newUsersData,
				usersDataMap: sortData(filterData(newUsersData, state.filters), newUsersData, state.sortBy, state.sortDirection)
			}
		case ADD_USER_FAILURE:
			return {...state, addUsers: false}

		case DELETE_USERS:
			userIds = (action.userIds instanceof Array)? action.userIds: [action.userIds];
			newUsersData = state.usersData.filter(u => !userIds.includes(u.UserID));
			return {
				...state,
				deleteUsers: true,
				usersData: newUsersData,
				usersDataMap: sortData(filterData(newUsersData, state.filters), newUsersData, state.sortBy, state.sortDirection),
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
				usersDataValid: true,
				usersData: action.users,
				usersDataMap: sortData(filterData(action.users, state.filters), action.users, state.sortBy, state.sortDirection)
			}
		case UPLOAD_USERS_FAILURE:
			return {...state, uploadUsers: false}

		default:
			return state
	}
}

export default users
