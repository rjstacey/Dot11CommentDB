import {sortData, filterData} from '../filter';

const defaultState = {
  	filters: {},
	sortBy: [],
	sortDirection: {},
	ballotId: '',
	votingPoolID: '',
	votingPoolSize: 0,
	ballot: {},
	resultsDataValid: false,
	resultsData: [],
	resultsDataMap: [],
	resultsSummary: {},
	importResults: false,
	errorMsgs: []
}

const results = (state = defaultState, action) => {
	var errorMsgs;

	switch (action.type) {
		case 'SET_RESULTS_SORT':
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				resultsDataMap: sortData(state.resultsDataMap, state.resultsData, action.sortBy, action.sortDirection)
			}
		case 'SET_RESULTS_FILTERS':
			const filters = {
				...state.filters,
				...action.filters
			}
			return {
				...state,
				filters,
				resultsDataMap: sortData(filterData(state.resultsData, filters), state.resultsData, state.sortBy, state.sortDirection)
			}
		case 'GET_RESULTS':
			return {
				...state,
				getResults: true,
				ballotId: action.ballotId,
				resultsData: [],
				resultsDataMap: []
			}
		case 'GET_RESULTS_SUCCESS':
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
		case 'GET_RESULTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				getResults: false,
				errorMsgs: errorMsgs
			}

		case 'DELETE_RESULTS':
			return Object.assign({}, state, {
				deleteResults: true,
			}, (state.ballotId === action.ballotId)? {
				resultsDataValid: false,
				resultsData: [],
				resultsDataMap: [],
				resultsSummary: {}
			}: null)
		case 'DELETE_RESULTS_SUCCESS':
			return {...state, deleteResults: false}
		case 'DELETE_RESULTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				deleteResults: false,
				errorMsgs: errorMsgs
			}

		case 'IMPORT_RESULTS':
			return {...state, importResults: true}
		case 'IMPORT_RESULTS_SUCCESS':
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
		case 'IMPORT_RESULTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				importResults: false,
				errorMsgs: errorMsgs
			}

		case 'SUMMARIZE_RESULTS':
			return Object.assign({}, state, {
				summarizeResults: true,
			})
		case 'SUMMARIZE_RESULTS_SUCCESS':
			return Object.assign({}, state, {
				summarizeResults: false,
				resultsSummary: action.summary
			})
		case 'SUMMARIZE_RESULTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				summarizeResults: false,
				errorMsgs: errorMsgs
			});

		case 'CLEAR_RESULTS_ERROR':
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

export default results
