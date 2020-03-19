import {sortData, filterData} from '../filter'
import {
	SET_VOTING_POOLS_FILTERS,
	SET_VOTING_POOLS_SORT,
	SET_VOTING_POOLS_SELECTED,
	GET_VOTING_POOLS,
	GET_VOTING_POOLS_SUCCESS,
	GET_VOTING_POOLS_FAILURE,
	DELETE_VOTING_POOLS,
	DELETE_VOTING_POOLS_SUCCESS,
	DELETE_VOTING_POOLS_FAILURE,
	SET_VOTERS_FILTERS,
	SET_VOTERS_SORT,
	SET_VOTERS_SELECTED,
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
	getVotingPools: false,
	votingPoolsFilters: {},
	votingPoolsSortBy: [],
	votingPoolsSortDirection: {},
	votingPoolsSelected: [],
	votingPoolsValid: false,
	votingPools: [],
	votingPoolsMap: [],

	votingPool: {VotingPool: '', PoolType: '', VotersCount: 0},
	getVoters: false,
	votersFilters: {},
	votersSortBy: [],
	votersSortDirection: {},
	votersSelected: [],
	votersValid: false,
	voters: [],
	votersMap: [],
	addVoter: false,
	deleteVoters: false,
	uploadVoters: false
}

function updateSelected(data, dataKey, selected) {
	return selected.filter(s => data.find(d => d[dataKey] === s))
}

const voters = (state = defaultState, action) => {
	let votingPools, votingPool, voters, filters, key

	switch (action.type) {
		case SET_VOTING_POOLS_SORT:
			return {
				...state,
				votingPoolsSortBy: action.sortBy,
				votingPoolsSortDirection: action.sortDirection,
				votingPoolsMap: sortData(state.votingPoolsMap, state.votingPools, action.sortBy, action.sortDirection)
			}
		case SET_VOTING_POOLS_FILTERS:
			filters = {...state.votingPoolsFilters, ...action.filters}
			return {
				...state,
				votingPoolsFilters: filters,
				votingPoolsMap: sortData(filterData(state.votingPools, filters), state.votingPools, state.votingPoolsSortBy, state.votingPoolsSortDirection)
			}
		case SET_VOTING_POOLS_SELECTED:
			return {
				...state,
				votingPoolsSelected: updateSelected(state.votingPools, 'VotingPoolID', action.selected)
			}
		case GET_VOTING_POOLS:
			return {
				...state,
				getVotingPools: true,
				votingPoolsValid: false,
				votingPools: [],
				votingPoolsMap: []
			}
		case GET_VOTING_POOLS_SUCCESS:
			votingPools = action.votingPools
			return {
				...state,
				votingPoolsValid: true,
				getVotingPools: false,
				votingPools,
				votingPoolsMap: sortData(filterData(votingPools, state.votingPoolsFlters), votingPools, state.votingPoolsSortBy, state.votingPoolsSortDirection)
			}
		case GET_VOTING_POOLS_FAILURE:
			return {...state, getVotingPools: false}

		case DELETE_VOTING_POOLS:
			return {...state, deleteVotingPools: true}
		case DELETE_VOTING_POOLS_SUCCESS:
			votingPools = state.votingPools.filter(vp1 => !action.votingPools.find(vp2 => vp2.PoolType === vp1.PoolType && vp2.VotingPoolID === vp1.VotingPoolID))
			return {
				...state,
				deleteVotingPools: false,
				votingPoolsValid: true,
				votingPools,
				votingPoolsMap: sortData(filterData(votingPools, state.votingPoolsFilters), votingPools, state.votingPoolsSortBy, state.votingPoolsSortDirection),
				votingPoolsSelected: updateSelected(votingPools, 'VotingPoolID', state.votingPoolsSelected)
			}
		case DELETE_VOTING_POOLS_FAILURE:
			return {...state, deleteVotingPools: false}

		case SET_VOTERS_SORT:
			return {
				...state,
				votersSortBy: action.sortBy,
				votersSortDirection: action.sortDirection,
				votersMap: sortData(state.votersMap, state.voters, action.sortBy, action.sortDirection)
			}
		case SET_VOTERS_FILTERS:
			filters = {...state.votersFilters, ...action.filters};
			return {
				...state,
				votersFilters: filters,
				votersMap: sortData(filterData(state.voters, filters), state.voters, state.votersSortBy, state.votersSortDirection)
			}
		case SET_VOTERS_SELECTED:
			key = state.votingPool.PoolType === 'SA'? 'Email': 'SAPIN'
			return {
				...state,
				votersSelected: updateSelected(state.voters, key, action.selected)
			}
		case GET_VOTERS:
			return {
				...state,
				getVoters: true,
				voters: [],
				votersMap: []
			}
		case GET_VOTERS_SUCCESS:
			return {
				...state,
				getVoters: false,
				votersValid: true,
				votingPool: action.votingPool,
				voters: action.voters,
				votersMap: sortData(filterData(action.voters, state.votersFlters), action.voters, state.votersSortBy, state.votersSortDirection)
			}
		case GET_VOTERS_FAILURE:
			return {...state, getVoters: false}

		case ADD_VOTER:
			return {...state, addVoter: true}
		case ADD_VOTER_SUCCESS:
			voters = state.voters.slice()
			voters.push(action.voter)
			votingPools = state.votingPools.map(vp => (vp.PoolType === action.votingPool.PoolType && vp.VotingPoolID === action.votingPool.VotingPoolID)? action.votingPool: vp)
			return {
				...state,
				addVoter: false,
				voters,
				votersMap: sortData(filterData(voters, state.votersFilters), voters, state.votersSortBy, state.votersSortDirection),
				votingPools,
				votingPoolsMap: sortData(filterData(votingPools, state.votingPoolsFlters), votingPools, state.votingPoolsSortBy, state.votingPoolsSortDirection)
			}
		case ADD_VOTER_FAILURE:
			return {...state, addVoter: false}
		case UPDATE_VOTER:
			return {...state, updateVoter: true}
		case UPDATE_VOTER_SUCCESS:
			votingPool = action.votingPool
			if (votingPool.PoolType === state.votingPool.PoolType && votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				key = votingPool.PoolType === 'SA'? 'Email': 'SAPIN'
				voters = state.voters.map(v => (v[key] === action.voterId)? {...v, ...action.voter}: v)
				return {
					...state,
					updateVoter: false,
					voters,
					votersMap: sortData(filterData(voters, state.votersFilters), voters, state.votersSortBy, state.votersSortDirection)
				}
			}
			return {...state, updateVoter: false}
		case UPDATE_VOTER_FAILURE:
			return {...state, updateVoter: false}

		case DELETE_VOTERS:
			return {...state, deleteVoters: true}
		case DELETE_VOTERS_SUCCESS:
			votingPool = action.votingPool
			key = votingPool.PoolType === 'SA'? 'Email': 'SAPIN'
			voters = state.voters.filter(v => !action.voterIds.includes(v[key]))
			votingPools = state.votingPools.map(vp => (vp.PoolType === votingPool.PoolType && vp.VotingPoolID === votingPool.VotingPoolID)? votingPool: vp)
			return {
				...state,
				deleteVoters: false,
				votingPool,
				voters,
				votersMap: sortData(filterData(voters, state.votersFilters), voters, state.votersSortBy, state.votersSortDirection),
				votingPools,
				votingPoolsMap: sortData(filterData(votingPools, state.votingPoolsFlters), votingPools, state.votingPoolsSortBy, state.votingPoolsSortDirection),
				votersSelected: updateSelected(voters, key, state.votersSelected)
			}
		case DELETE_VOTERS_FAILURE:
			return {...state, deleteVoters: false}

		case UPLOAD_VOTERS:
			return {...state, uploadVoters: true}
		case UPLOAD_VOTERS_SUCCESS:
			voters = action.voters
			votingPool = action.votingPool
			key = votingPool.PoolType === 'SA'? 'Email': 'SAPIN'
			votingPools = state.votingPools.slice()
			let i
			for (i = 0; i < votingPools.length; i++) {
				let vp = votingPools[i]
				if (vp.PoolType === votingPool.PoolType && vp.VotingPoolID === votingPool.VotingPoolID) {
					votingPools[i] = votingPool
					break
				}
			}
			if (i === votingPools.length) {
				votingPools.push(votingPool)
			}
			return {
				...state,
				uploadVoters: false,
				votingPool,
				voters,
				votersMap: sortData(filterData(voters, state.votersFilters), voters, state.votersSortBy, state.votersSortDirection),
				votingPools,
				votingPoolsMap: sortData(filterData(votingPools, state.votingPoolsFlters), votingPools, state.votingPoolsSortBy, state.votingPoolsSortDirection),
				votersSelected: updateSelected(voters, key, state.votersSelected)
			}
		case UPLOAD_VOTERS_FAILURE:
			return {...state, uploadVoters: false}

		default:
			return state
	}
}

export default voters
