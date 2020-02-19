import {sortData, filterData} from '../filter'
import {
	SET_VOTING_POOL_FILTERS,
	SET_VOTING_POOL_SORT,
	GET_VOTING_POOL,
	GET_VOTING_POOL_SUCCESS,
	GET_VOTING_POOL_FAILURE,
	ADD_VOTING_POOL,
	ADD_VOTING_POOL_SUCCESS,
	ADD_VOTING_POOL_FAILURE,
	DELETE_VOTING_POOL,
	DELETE_VOTING_POOL_SUCCESS,
	DELETE_VOTING_POOL_FAILURE,
	SET_VOTERS_FILTERS,
	SET_VOTERS_SORT,
	GET_VOTERS,
	GET_VOTERS_SUCCESS,
	GET_VOTERS_FAILURE,
	DELETE_VOTERS,
	DELETE_VOTERS_SUCCESS,
	DELETE_VOTERS_FAILURE,
	UPLOAD_VOTERS,
	UPLOAD_VOTERS_SUCCESS,
	UPLOAD_VOTERS_FAILURE,
	ADD_VOTER,
	ADD_VOTER_SUCCESS,
	ADD_VOTER_FAILURE,
	UPDATE_VOTER,
	UPDATE_VOTER_SUCCESS,
	UPDATE_VOTER_FAILURE
}from '../actions/voters'

const defaultState = {
	getVotingPool: false,
	votingPoolFilters: {},
	votingPoolSortBy: [],
	votingPoolSortDirection: {},
	votingPoolDataValid: false,
	votingPoolData: [],
	votingPoolDataMap: [],

	votingPool: {},
	getVoters: false,
	votersFilters: {},
	votersSortBy: [],
	votersSortDirection: {},
	votersDataValid: false,
	votersData: [],
	votersDataMap: [],
	addVoter: false,
	deleteVoters: false,
	uploadVoters: false
}

const voters = (state = defaultState, action) => {
	var votingPoolData, votersData, filters;

	switch (action.type) {
		case SET_VOTING_POOL_SORT:
			return {
				...state,
				votingPoolSortBy: action.sortBy,
				votingPoolSortDirection: action.sortDirection,
				votingPoolDataMap: sortData(state.votingPoolDataMap, state.votingPoolData, action.sortBy, action.sortDirection)
			}
		case SET_VOTING_POOL_FILTERS:
			filters = {...state.votingPoolFilters, ...action.filters};
			return {
				...state,
				votingPoolFilters: filters,
				votingPoolDataMap: sortData(filterData(state.votingPoolData, filters), state.votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection)
			}
		case GET_VOTING_POOL:
			return {
				...state,
				getVotingPool: true,
				votingPoolDataValid: false,
				votingPoolData: [],
				votingPoolDataMap: []
			}
		case GET_VOTING_POOL_SUCCESS:
			return {
				...state,
				votingPoolDataValid: true,
				getVotingPool: false,
				votingPoolData: action.votingPoolData,
				votingPoolDataMap: sortData(filterData(action.votingPoolData, state.votingPoolFlters), state.votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection)
			}
		case GET_VOTING_POOL_FAILURE:
			return {...state, getVotingPool: false}

		case ADD_VOTING_POOL:
			return {...state, addVotingPool: true}
		case ADD_VOTING_POOL_SUCCESS:
			votingPoolData = state.votingPoolData.slice();
			votingPoolData.push(action.votingPoolData);
			return {
				...state,
				addVotingPool: false,
				votingPoolData: votingPoolData,
				votingPoolDataMap: sortData(filterData(votingPoolData, state.votingPoolFilters), votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection),
			}
		case ADD_VOTING_POOL_FAILURE:
			return {...state, addVotingPool: false}
		case DELETE_VOTING_POOL:
			return {...state, deleteVotingPool: true}
		case DELETE_VOTING_POOL_SUCCESS:
			votingPoolData = state.votingPoolData.filter(b => action.votingPoolId !== b.VotingPoolID);
			return {
				...state,
				deleteVotingPool: false,
				votingPoolDateValid: true,
				votingPoolData: votingPoolData,
				votingPoolDataMap: sortData(filterData(votingPoolData, state.filters), votingPoolData, state.votingPoolSortBy, state.votingPoolSortDirection),
			}
		case DELETE_VOTING_POOL_FAILURE:
			return {...state, deleteVotingPool: false}

		case SET_VOTERS_SORT:
			return {
				...state,
				votersSortBy: action.sortBy,
				votersSortDirection: action.sortDirection,
				votersDataMap: sortData(state.votersDataMap, state.votersData, action.sortBy, action.sortDirection)
			}
		case SET_VOTERS_FILTERS:
			filters = {...state.votersFilters, ...action.filters};
			return {
				...state,
				votersFilters: filters,
				votersDataMap: sortData(filterData(state.votersData, filters), state.votersData, state.votersSortBy, state.votersSortDirection)
			}
		case GET_VOTERS:
			return {
				...state,
				votingPool: {VotingPoolID: action.votingPoolId},
				getVoters: true,
				votersData: [],
				votersDataMap: []
			}
		case GET_VOTERS_SUCCESS:
			return {
				...state,
				votersDataValid: true,
				getVoters: false,
				votingPool: action.votingPool,
				votersData: action.voters,
				votersDataMap: sortData(filterData(action.voters, state.votersFlters), action.voters, state.votersSortBy, state.votersSortDirection)
			}
		case GET_VOTERS_FAILURE:
			return {...state, getVoters: false}
		case ADD_VOTER:
			return {...state, addVoter: true}
		case ADD_VOTER_SUCCESS:
			votersData = state.votersData.slice();
			votersData.push(action.voter);
			return {
				...state,
				addVoter: false,
				votersData: votersData,
				votersDataMap: sortData(filterData(votersData, state.votersFilters), votersData, state.votersSortBy, state.votersSortDirection)
			}
		case ADD_VOTER_FAILURE:
			return {...state, addVoter: false}
		case UPDATE_VOTER:
			return {...state, updateVoter: true}
		case UPDATE_VOTER_SUCCESS:
			votersData = state.votersData.map(v =>
				(v.SAPIN === action.SAPIN)? {...v, ...action.voterData}: v
			);
			return {
				...state,
				updateVoter: false,
				votersData: votersData,
				votersDataMap: sortData(filterData(votersData, state.votersFilters), votersData, state.votersSortBy, state.votersSortDirection)
			}
		case UPDATE_VOTER_FAILURE:
			return {...state, updateVoter: false}

		case DELETE_VOTERS:
			return {...state, deleteVoters: true}
		case DELETE_VOTERS_SUCCESS:
			votersData = state.votersData.filter(v => !action.SAPINs.includes(v.SAPIN));
			return {
				...state,
				deleteVoters: false,
				votersData,
				votersDataMap: sortData(filterData(votersData, state.votersFilters), votersData, state.votersSortBy, state.votersSortDirection)
			}
		case DELETE_VOTERS_FAILURE:
			return {...state, deleteVoters: false}

		case UPLOAD_VOTERS:
			return {...state, uploadVoters: true}
		case UPLOAD_VOTERS_SUCCESS:
			return {...state, uploadVoters: false}
		case UPLOAD_VOTERS_FAILURE:
			return {...state, uploadVoters: false}

		default:
			return state
	}
}

export default voters
