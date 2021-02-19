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
	GET_RESULTS,
	GET_RESULTS_SUCCESS,
	GET_RESULTS_FAILURE,
	DELETE_RESULTS,
	DELETE_RESULTS_SUCCESS,
	DELETE_RESULTS_FAILURE,
	IMPORT_RESULTS,
	IMPORT_RESULTS_SUCCESS,
	IMPORT_RESULTS_FAILURE
} from '../actions/results'

const resultFields = ['SAPIN', 'Name', 'Affiliation', 'Email', 'Vote', 'CommentCount', 'Notes'];


/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = resultFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}};
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = resultFields.reduce((entries, dataKey) => {
	let type;
	switch (dataKey) {
		case 'SAPIN':
		case 'CommentCount':
			type = SortType.NUMERIC
			break
		case 'Name':
		case 'Affiliation':
		case 'Email':
		case 'Vote':
		case 'Notes':
			type = SortType.STRING
			break
		default:
			return entries;
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}};
}, {});

const defaultState = {
	ballotId: '',
	votingPoolID: '',
	votingPoolSize: 0,
	ballot: {},
	loading: false,
	valid: false,
	results: [],
	resultsSummary: {},
	importResults: false
}

function resultsReducer(state = defaultState, action) {

	switch (action.type) {
		case GET_RESULTS:
			return {
				...state,
				loading: true,
				ballotId: action.ballotId,
				results: [],
				resultsSummary: {}
			}
		case GET_RESULTS_SUCCESS:
			return {
				...state,
				loading: false,
				ballotId: action.ballotId,
				votingPoolId: action.votingPoolId,
				votingPoolSize: action.votingPoolSize,
				ballot: action.ballot,
				valid: true,
				results: action.results,
				resultsSummary: action.summary
			}
		case GET_RESULTS_FAILURE:
			return {...state, getResults: false}

		case DELETE_RESULTS:
			return Object.assign({}, state, {
				deleteResults: true,
			}, (state.ballotId === action.ballotId)? {
				valid: false,
				results: [],
				resultsSummary: {}
			}: null)
		case DELETE_RESULTS_SUCCESS:
			return {...state, deleteResults: false}
		case DELETE_RESULTS_FAILURE:
			return {...state, deleteResults: false}

		case IMPORT_RESULTS:
			return {...state, importResults: true}
		case IMPORT_RESULTS_SUCCESS:
			return {
				...state,
				importResults: false,
				ballotId: action.ballotId,
				votingPoolId: action.votingPoolId,
				valid: true,
				results: action.results,
				resultsSummary: action.summary
			}
		case IMPORT_RESULTS_FAILURE:
			return {...state, importResults: false}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'results'
const resultsReducerAll = (state, action) => {
	if (state === undefined) {
		return {
			...resultsReducer(undefined, {}),
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
		return resultsReducer(state, action)
	}
}

export default resultsReducerAll;
