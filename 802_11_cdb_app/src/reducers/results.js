import {sortData, filterData} from '../filter'
import {
	SET_RESULTS_FILTERS,
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

const defaultState = {
  	filters: {},
	sortBy: [],
	sortDirection: {},
	ballotId: '',
	votingPoolID: '',
	votingPoolSize: 0,
	ballot: {},
	getResults: false,
	resultsDataValid: false,
	resultsData: [],
	resultsDataMap: [],
	resultsSummary: {},
	importResults: false,
}

const results = (state = defaultState, action) => {

	switch (action.type) {
		case SET_RESULTS_SORT:
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				resultsDataMap: sortData(state.resultsDataMap, state.resultsData, action.sortBy, action.sortDirection)
			}
		case SET_RESULTS_FILTERS:
			const filters = {
				...state.filters,
				...action.filters
			}
			return {
				...state,
				filters,
				resultsDataMap: sortData(filterData(state.resultsData, filters), state.resultsData, state.sortBy, state.sortDirection)
			}
		case GET_RESULTS:
			return {
				...state,
				getResults: true,
				ballotId: action.ballotId,
				resultsData: [],
				resultsDataMap: []
			}
		case GET_RESULTS_SUCCESS:
			return {
				...state,
				getResults: false,
				ballotId: action.ballotId,
				votingPoolId: action.votingPoolId,
				votingPoolSize: action.votingPoolSize,
				ballot: action.ballot,
				resultsDataValid: true,
				resultsData: action.results,
				resultsDataMap: sortData(filterData(action.results, state.filters), action.results, state.sortBy, state.sortDirection),
				resultsSummary: action.summary
			}
		case GET_RESULTS_FAILURE:
			return {...state, getResults: false}

		case DELETE_RESULTS:
			return Object.assign({}, state, {
				deleteResults: true,
			}, (state.ballotId === action.ballotId)? {
				resultsDataValid: false,
				resultsData: [],
				resultsDataMap: [],
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
				resultsDataValid: true,
				resultsData: action.results,
				resultsDataMap: sortData(filterData(action.results, state.filters), action.results, state.sortBy, state.sortDirection),
				resultsSummary: action.summary
			}
		case IMPORT_RESULTS_FAILURE:
			return {...state, importResults: false}

		default:
			return state
	}
}

export default results
