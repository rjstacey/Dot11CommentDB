import {FilterType, filterCreate, filterSetValue, filterData} from './filter'
import {SortType, sortCreate, sortAddColumn, sortClick, sortData} from './sort'
import {
	SET_RESULTS_FILTER,
	SET_RESULTS_SORT,
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
function genDefaultFilters() {
	let filters = {}
	for (let dataKey of resultFields) {
		let type
		switch (dataKey) {
		case 'SAPIN':
		case 'CommentCount':
			type = FilterType.NUMERIC
			break
		case 'Name':
		case 'Affiliation':
		case 'Email':
		case 'Vote':
		case 'Notes':
			type = FilterType.STRING
			break
		default:
			break
		}
		if (type !== undefined) {
			filters[dataKey] = filterCreate(type)
		}
	}
	return filters
}

function genDefaultSort() {
	let sort = sortCreate()
	for (let dataKey of resultFields) {
		let type
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
			break
		}
		if (type !== undefined) {
			sortAddColumn(sort, dataKey, type)
		}
	}
	return sort
}
const defaultState = {
  	filters: genDefaultFilters(),
	sort: genDefaultSort(),
	ballotId: '',
	votingPoolID: '',
	votingPoolSize: 0,
	ballot: {},
	getResults: false,
	resultsValid: false,
	results: [],
	resultsMap: [],
	resultsSummary: {},
	importResults: false
}

function results(state = defaultState, action) {

	switch (action.type) {
		case SET_RESULTS_SORT:
			const sort = sortClick(state.sort, action.dataKey, action.event)
			return {
				...state,
				sort,
				resultsMap: sortData(sort, state.resultsMap, state.results)
			}
		case SET_RESULTS_FILTER:
			const filters = {
				...state.filters,
				[action.dataKey]: filterSetValue(state.filters[action.dataKey], action.value)
			}
			return {
				...state,
				filters,
				resultsMap: sortData(state.sort, filterData(state.results, filters), state.results)
			}
		case GET_RESULTS:
			return {
				...state,
				getResults: true,
				ballotId: action.ballotId,
				results: [],
				resultsMap: []
			}
		case GET_RESULTS_SUCCESS:
			return {
				...state,
				getResults: false,
				ballotId: action.ballotId,
				votingPoolId: action.votingPoolId,
				votingPoolSize: action.votingPoolSize,
				ballot: action.ballot,
				resultsValid: true,
				results: action.results,
				resultsMap: sortData(state.sort, filterData(action.results, state.filters), action.results),
				resultsSummary: action.summary
			}
		case GET_RESULTS_FAILURE:
			return {...state, getResults: false}

		case DELETE_RESULTS:
			return Object.assign({}, state, {
				deleteResults: true,
			}, (state.ballotId === action.ballotId)? {
				resultsValid: false,
				results: [],
				resultsMap: [],
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
				resultsValid: true,
				results: action.results,
				resultsMap: sortData(state.sort, filterData(action.results, state.filters), action.results),
				resultsSummary: action.summary
			}
		case IMPORT_RESULTS_FAILURE:
			return {...state, importResults: false}

		default:
			return state
	}
}

export default results
