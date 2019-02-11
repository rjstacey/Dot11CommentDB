import {sortData, filterData} from '../filter';

const defaultState = {
	ballotId: '',
  	filters: {},
	sortBy: [],
	sortDirection: {},
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
			return Object.assign({}, state, {
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				resultsDataMap: sortData(state.resultsDataMap, state.resultsData, action.sortBy, action.sortDirection)
			});
		case 'SET_RESULTS_FILTER':
			const filters = Object.assign({}, state.filters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				filters,
				resultsDataMap: sortData(filterData(state.resultsData, filters), state.resultsData, state.sortBy, state.sortDirection)
			});
		case 'GET_RESULTS':
			return Object.assign({}, state, {
				getResults: true,
				ballotId: action.ballotId,
				resultsData: [],
				resultsDataMap: []
			})
		case 'GET_RESULTS_SUCCESS':
			return Object.assign({}, state, {
				resultsDataValid: true,
				getResults: false,
				resultsData: action.results,
				resultsDataMap: sortData(filterData(action.results, state.filters), action.results, state.sortBy, state.sortDirection),
			})
		case 'GET_RESULTS_FAILURE':
			errorMsgs = state.votersErrorMsg.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getResults: false,
				errorMsgs: errorMsgs
			});

		case 'DELETE_RESULTS':
			return Object.assign({}, state, {
				deleteResults: true,
			}, (state.ballotId === action.ballotId)? {resultsData: []}: null)
		case 'DELETE_RESULTS_SUCCESS':
			return Object.assign({}, state, {
				deleteResults: false,
			})
		case 'DELETE_RESULTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				deleteResults: false,
				errorMsgs: errorMsgs
			});

		case 'IMPORT_RESULTS':
			return Object.assign({}, state, {
				importResults: true
			})
		case 'IMPORT_RESULTS_SUCCESS':
			return Object.assign({}, state, {
				importResults: false,
				importResultsError: false,
				importSummary: action.summary
			})
		case 'IMPORT_RESULTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				importResults: false,
				errorMsgs: errorMsgs
			});

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
