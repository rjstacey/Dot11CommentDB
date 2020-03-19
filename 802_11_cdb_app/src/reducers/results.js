import {sortClick, sortData, filterValidate, filterData} from '../filter'
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

const filterKeys = [
	'SAPIN', 'Name', 'Affiliation', 'Email', 'Vote', 'CommentCount', 'Notes'
]

const defaultState = {
  	filters: filterKeys.reduce((obj, key) => ({...obj, [key]: filterValidate(key, '')}), {}),
	sortBy: [],
	sortDirection: {},
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
			const {sortBy, sortDirection} = sortClick(action.event, action.dataKey, state.sortBy, state.sortDirection)
			return {
				...state,
				sortBy,
				sortDirection,
				resultsMap: sortData(state.resultsMap, state.results, sortBy, sortDirection)
			}
		case SET_RESULTS_FILTER:
			const filters = {
				...state.filters,
				[action.dataKey]: filterValidate(action.dataKey, action.value)
			}
			return {
				...state,
				filters,
				resultsMap: sortData(filterData(state.results, filters), state.results, state.sortBy, state.sortDirection)
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
				resultsMap: sortData(filterData(action.results, state.filters), action.results, state.sortBy, state.sortDirection),
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
				resultsMap: sortData(filterData(action.results, state.filters), action.results, state.sortBy, state.sortDirection),
				resultsSummary: action.summary
			}
		case IMPORT_RESULTS_FAILURE:
			return {...state, importResults: false}

		default:
			return state
	}
}

export default results
