import {sortData, filterData} from '../filter';

const defaultState = {
	votingPoolFilters: {},
	votingPoolSortBy: [],
	votingPoolSortDirection: {},
	votingPoolValid: false,
	votingPoolData: [],
	votingPoolDataMap: [],

	votingPoolId: '',
	votersFilters: {},
	votersSortBy: [],
	votersSortDirection: {},
	votersDataValid: false,
	votersData: [],
	votersDataMap: [],
	addVoter: false,
	deleteVoters: false,
	importVoters: false,
	errorMsgs: [],
}

const voters = (state = defaultState, action) => {
	var errorMsgs, votingPoolData, votersData, filters;

	switch (action.type) {
		case 'SET_VOTING_POOL_SORT':
			return Object.assign({}, state, {
				votingPoolSortBy: action.sortBy,
				votingPoolSortDirection: action.sortDirection,
				votingPoolDataMap: sortData(state.votingPoolDataMap, state.votingPoolData, action.sortBy, action.sortDirection)
			});
		case 'SET_VOTING_POOL_FILTER':
			filters = Object.assign({}, state.votingPoolFilters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				votingPoolFilters: filters,
				votingPoolDataMap: sortData(filterData(state.votingPoolData, filters), state.votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection)
			});
		case 'GET_VOTING_POOL':
			return Object.assign({}, state, {
				getVotingPool: true,
				votingPoolData: [],
				votingPoolDataMap: []
			});
		case 'GET_VOTING_POOL_SUCCESS':
			return Object.assign({}, state, {
				votersDataValid: true,
				getVotingPool: false,
				votingPoolData: action.votingPoolData,
				votingPoolDataMap: sortData(filterData(action.votingPoolData, state.votingPoolFlters), state.votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection)
			});
		case 'GET_VOTING_POOL_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getVotingPool: false,
				errorMsgs: errorMsgs
			});

		case 'ADD_VOTING_POOL':
			return Object.assign({}, state, {addVotingPool: true});
		case 'ADD_VOTING_POOL_SUCCESS':
			votingPoolData = state.votingPoolData.slice();
			votingPoolData.push(action.votingPoolData);
			return Object.assign({}, state, {
				addVotingPool: false,
				votingPoolData: votingPoolData,
				votingPoolDataMap: sortData(filterData(votingPoolData, state.votingPoolFilters), votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection),
			});
		case 'ADD_VOTING_POOL_FAILTURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				addVotingPool: false,
				errorMsgs: errorMsgs
			});
		case 'DELETE_VOTING_POOL':
			return Object.assign({}, state, {deleteVotingPool: true});
		case 'DELETE_VOTING_POOL_SUCCESS':
			votingPoolData = state.votingPoolData.filter(b => action.votingPoolId !== b.VotingPoolID);
			return Object.assign({}, state, {
				deleteVotingPool: false,
				votingPoolData: votingPoolData,
				votingPoolDataMap: sortData(filterData(votingPoolData, state.filters), votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection),
			});
		case 'DELETE_VOTING_POOL_FAILTURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				deleteVotingPool: false,
				errorMsgs: errorMsgs
			});

		case 'SET_VOTERS_SORT':
			return Object.assign({}, state, {
				votersSortBy: action.sortBy,
				votersSortDirection: action.sortDirection,
				votersDataMap: sortData(state.votersDataMap, state.votersData, action.sortBy, action.sortDirection)
			});
		case 'SET_VOTERS_FILTER':
			filters = Object.assign({}, state.votersFilters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				votersFilters: filters,
				votersDataMap: sortData(filterData(state.votersData, filters), state.votersData, state.votersSortBy, state.votersSortDirection)
			});
		case 'GET_VOTERS':
			return Object.assign({}, state, {
				votingPoolId: action.VotingPoolID,
				getVoters: true,
				votersData: [],
				votersDataMap: []
			});
		case 'GET_VOTERS_SUCCESS':
			return Object.assign({}, state, {
				votersDataValid: true,
				getVoters: false,
				votersData: action.votersData,
				votersDataMap: sortData(filterData(action.votersData, state.votersFlters), action.votersData, state.votersSortBy, state.votersSortDirection)
			});
		case 'GET_VOTERS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getVoters: false,
				errorMsgs: errorMsgs
			});
		case 'ADD_VOTER':
			return Object.assign({}, state, {
				addVoter: true
			});
		case 'ADD_VOTER_SUCCESS':
			votersData = state.votersData.slice();
			votersData.push(action.voter);
			return Object.assign({}, state, {
				addVoter: false,
				votersData: votersData,
				votersDataMap: sortData(filterData(votersData, state.votersFilters), votersData, state.votersSortBy, state.votersSortDirection)
			});
		case 'ADD_VOTER_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				addVoter: false,
				errorMsgs: errorMsgs
			});

		case 'DELETE_VOTERS':
			return Object.assign({}, state, {
				deleteVoters: true,
			}, (state.votingPoolID === action.VotingPoolID)? {votersData: [], votersDataMap: []}: null)
		case 'DELETE_VOTERS_SUCCESS':
			return Object.assign({}, state, {
				deleteVoters: false
			})
		case 'DELETE_VOTERS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				deleteVoters: false,
				errorMsgs: errorMsgs
			});

		case 'IMPORT_VOTERS':
			return Object.assign({}, state, {importVoters: true})
		case 'IMPORT_VOTERS_SUCCESS':
			return Object.assign({}, state, {
				importVoters: false,
			})
		case 'IMPORT_VOTERS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				importVoters: false,
				errorMsgs: errorMsgs
			});

		case 'CLEAR_VOTERS_ERROR':
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

export default voters
