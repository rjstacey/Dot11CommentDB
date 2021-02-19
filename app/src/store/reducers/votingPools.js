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
	VOTING_POOLS_GET,
	VOTING_POOLS_GET_SUCCESS,
	VOTING_POOLS_GET_FAILURE,
	VOTING_POOLS_DELETE,
	VOTING_POOLS_DELETE_SUCCESS,
	VOTING_POOLS_DELETE_FAILURE,
} from '../actions/votingPools'

import {
	VOTERS_ADD_SUCCESS,
	VOTERS_UPDATE_SUCCESS,
	VOTERS_UPLOAD_SUCCESS,
	VOTERS_DELETE_SUCCESS
} from '../actions/voters'

const votingPoolFields = ['PoolType', 'VotingPoolID', 'VoterCount'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = votingPoolFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}}
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = votingPoolFields.reduce((entries, dataKey) => {
	const type = dataKey === 'VoterCount'? SortType.NUMERIC: SortType.STRING;
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

const defaultState = {
	loading: false,
	valid: false,
	votingPools: [],
}

const votingPoolsReducer = (state = defaultState, action) => {
	let votingPools

	switch (action.type) {
		case VOTING_POOLS_GET:
			return {
				...state,
				loading: true,
				valid: false,
				votingPools: [],
			}
		case VOTING_POOLS_GET_SUCCESS:
			votingPools = action.votingPools
			return {
				...state,
				valid: true,
				loading: false,
				votingPools,
			}
		case VOTING_POOLS_GET_FAILURE:
			return {...state, getVotingPools: false}

		case VOTING_POOLS_DELETE:
			return {...state, deleteVotingPools: true}
		case VOTING_POOLS_DELETE_SUCCESS:
			votingPools = state.votingPools.filter(vp1 => !action.votingPools.find(vp2 => vp2.PoolType === vp1.PoolType && vp2.VotingPoolID === vp1.VotingPoolID))
			return {
				...state,
				deleteVotingPools: false,
				valid: true,
				votingPools,
			}
		case VOTING_POOLS_DELETE_FAILURE:
			return {...state, deleteVotingPools: false}

		case VOTERS_ADD_SUCCESS:
		case VOTERS_UPDATE_SUCCESS:
		case VOTERS_UPLOAD_SUCCESS:
		case VOTERS_DELETE_SUCCESS:
			const votingPool = action.votingPool
			const vp = state.votingPools.find(vp => (vp.PoolType === votingPool.PoolType && vp.VotingPoolID === votingPool.VotingPoolID))
			votingPools = vp?
				state.votingPools.map(vp => (vp.PoolType === votingPool.PoolType && vp.VotingPoolID === votingPool.VotingPoolID)? votingPool: vp):
				state.votingPools.concat([votingPool])
			return {
				...state,
				votingPools
			}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'votingPools'
const votingPoolsReducerAll = (state, action) => {
	if (state === undefined) {
		return {
			...votingPoolsReducer(undefined, {}),
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
		return votingPoolsReducer(state, action)
	}
}

export default votingPoolsReducerAll;