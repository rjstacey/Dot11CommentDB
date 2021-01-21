import sortReducer from './sort'
import {SORT_PREFIX, SORT_INIT, SortDirection} from '../actions/sort'
import {SortType} from '../lib/sort'

import filtersReducer from './filter'
import {FILTER_PREFIX, FILTER_INIT, FilterType} from '../actions/filter'

import selectReducer from './select'
import {SELECT_PREFIX} from '../actions/select'

import {UI_PREFIX} from '../actions/ui'
import uiReducer from './ui'

import {
	USERS_GET,
	USERS_GET_SUCCESS,
	USERS_GET_FAILURE,
	USERS_UPDATE,
	USERS_UPDATE_SUCCESS,
	USERS_UPDATE_FAILURE,
	USERS_ADD,
	USERS_ADD_SUCCESS,
	USERS_ADD_FAILURE,
	USERS_DELETE,
	USERS_DELETE_SUCCESS,
	USERS_DELETE_FAILURE,
	USERS_UPLOAD,
	USERS_UPLOAD_SUCCESS,
	USERS_UPLOAD_FAILURE,
	AccessLevelOptions
} from '../actions/users'

const userFields = ['SAPIN', 'Name', 'Email', 'Access']

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = userFields.reduce((entries, dataKey) => {
	let type, options
	switch (dataKey) {
		case 'SAPIN':
			type = FilterType.NUMERIC
			break
		case 'Access':
			type = FilterType.NUMERIC
			options = AccessLevelOptions
			break
		default:
			type = FilterType.STRING
	}
	return {...entries, [dataKey]: {type, options}}
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


const defaultState = {
	valid: false,
	loading: false,
	users: [],
	updateUsers: false,
	addUsers: false,
	uploadUsers: false,
	deleteUsers: false
}

function usersReducer(state = defaultState, action) {
	var users, userIds

	switch (action.type) {
		case USERS_GET:
			return {
				...state,
				loading: true
			}
		case USERS_GET_SUCCESS:
			return {
				...state,
				loading: false,
				valid: true,
				users: action.users,
			}
		case USERS_GET_FAILURE:
			return {
				...state,
				loading: false
			}

		case USERS_UPDATE:
			users = state.users.map(u =>
				(u.SAPIN === action.SAPIN)? Object.assign({}, u, action.user): u
				)
			return {
				...state,
				updateUser: true,
				users,
			}
		case USERS_UPDATE_SUCCESS:
			return {...state, updateUser: false}
		case USERS_UPDATE_FAILURE:
			return {...state, updateUser: false}

		case USERS_ADD:
			return {...state, addUser: true}
		case USERS_ADD_SUCCESS:
			users = state.users.slice()
			users.push(action.user)
			return {
				...state,
				addUser: false,
				users: users,
			}
		case USERS_ADD_FAILURE:
			return {...state, addUsers: false}

		case USERS_DELETE:
			userIds = action.userIds
			users = state.users.filter(u => !userIds.includes(u.SAPIN))
			return {
				...state,
				deleteUsers: true,
				users: users,
			}
		case USERS_DELETE_SUCCESS:
			return {...state, deleteUsers: false}
		case USERS_DELETE_FAILURE:
			return {...state, deleteUsers: false}

		case USERS_UPLOAD:
			return {...state, uploadUsers: true}
		case USERS_UPLOAD_SUCCESS:
			return {
				...state,
				uploadUsers: false,
				usersValid: true,
				users: action.users,
			}
		case USERS_UPLOAD_FAILURE:
			return {...state, uploadUsers: false}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'users'
export default (state, action) => {
	if (state === undefined) {
		return {
			...usersReducer(undefined, {}),
			sort: sortReducer(undefined, {type: SORT_INIT, entries: defaultSortEntries}),
			filters: filtersReducer(undefined, {type: FILTER_INIT, entries: defaultFiltersEntries}),
			selected: selectReducer(undefined, {}),
			ui: uiReducer(undefined, {})
		}
	}
	if (action.type.startsWith(SORT_PREFIX) && action.dataSet === dataSet) {
		const sort = sortReducer(state.sort, action);
		return {...state, sort}
	}
	else if (action.type.startsWith(FILTER_PREFIX) && action.dataSet === dataSet) {
		const filters = filtersReducer(state.filters, action);
		return {...state, filters}
	}
	else if (action.type.startsWith(SELECT_PREFIX) && action.dataSet === dataSet) {
		const selected = selectReducer(state.selected, action);
		return {...state, selected}
	}
	else if (action.type.startsWith(UI_PREFIX) && action.dataSet === dataSet) {
		const ui = uiReducer(state.ui, action);
		return {...state, ui}
	}
	else {
		return usersReducer(state, action)
	}
}

