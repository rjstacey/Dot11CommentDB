import {sortData, filterData} from '../filter';

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
	deleteUsers: false,
	errorMsgs: []
}

const users = (state = defaultState, action) => {
	var newUsersData, userIds, errorMsgs;

	switch (action.type) {
		case 'SET_USERS_SORT':
			return Object.assign({}, state, {
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				usersDataMap: sortData(state.usersDataMap, state.usersData, action.sortBy, action.sortDirection)
			});
		case 'SET_USERS_FILTER':
			const filters = Object.assign({}, state.filters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				filters,
				usersDataMap: sortData(filterData(state.usersData, filters), state.usersData, state.sortBy, state.sortDirection)
			});
		case 'GET_USERS':
			return Object.assign({}, state, {
				getUsers: true,
			})
		case 'GET_USERS_SUCCESS':
			return Object.assign({}, state, {
				getUsers: false,
				usersDataValid: true,
				usersData: action.users,
				usersDataMap: sortData(filterData(action.users, state.filters), action.users, state.sortBy, state.sortDirection)
			})
		case 'GET_USERS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getUsers: false,
				errorMsgs: errorMsgs
			});

		case 'UPDATE_USER':
			newUsersData = state.usersData.map(u =>
				(u.UserID === action.user.UserID)? Object.assign({}, u, action.user): u
				)
			return Object.assign({}, state, {
				updateUser: true,
				usersData: newUsersData,
				usersDataMap: sortData(filterData(newUsersData, state.filters), newUsersData, state.sortBy, state.sortDirection)
			})
		case 'UPDATE_USER_SUCCESS':
			return Object.assign({}, state, {
				updateUser: false,
			});
		case 'UPDATE_USER_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				updateUsers: false,
				errorMsgs: errorMsgs
			});

		case 'ADD_USER':
			return Object.assign({}, state, {
				addUser: true
			})
		case 'ADD_USER_SUCCESS':
			newUsersData = state.usersData.slice()
			newUsersData.push(action.user)
			return Object.assign({}, state, {
				addUser: false,
				usersData: newUsersData,
				usersDataMap: sortData(filterData(newUsersData, state.filters), newUsersData, state.sortBy, state.sortDirection)
			})
		case 'ADD_USER_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				addUsers: false,
				errorMsgs: errorMsgs
			});

		case 'DELETE_USERS':
			userIds = (action.userIds instanceof Array)? action.userIds: [action.userIds];
			newUsersData = state.usersData.filter(u => !userIds.includes(u.UserID));
			return Object.assign({}, state, {
				deleteUsers: true,
				usersData: newUsersData,
				usersDataMap: sortData(filterData(newUsersData, state.filters), newUsersData, state.sortBy, state.sortDirection),
			})
		case 'DELETE_USERS_SUCCESS':
			return Object.assign({}, state, {
				deleteUsers: false,
			})
		case 'DELETE_USERS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				deleteUsers: false,
				errorMsgs: errorMsgs
			});
		case 'CLEAR_USERS_ERROR':
			if (state.errorMsgs.length) {
				errorMsgs = state.errorMsgs.slice();
				errorMsgs.pop();
				return Object.assign({}, state, {errorMsgs: errorMsgs})
			}
			return state;

		default:
			return state
	}
}

export default users
