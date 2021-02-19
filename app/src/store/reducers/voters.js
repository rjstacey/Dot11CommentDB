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
	VOTERS_GET,
	VOTERS_GET_SUCCESS,
	VOTERS_GET_FAILURE,
	VOTERS_DELETE,
	VOTERS_DELETE_SUCCESS,
	VOTERS_DELETE_FAILURE,
	VOTERS_UPLOAD,
	VOTERS_UPLOAD_SUCCESS,
	VOTERS_UPLOAD_FAILURE,
	VOTERS_ADD,
	VOTERS_ADD_SUCCESS,
	VOTERS_ADD_FAILURE,
	VOTERS_UPDATE,
	VOTERS_UPDATE_SUCCESS,
	VOTERS_UPDATE_FAILURE
} from '../actions/voters'

const voterFields = ['SAPIN', 'Email', 'Name', 'LastName', 'FirstName', 'MI', 'Status'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = voterFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}}
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = voterFields.reduce((entries, dataKey) => {
	const type = dataKey === 'SAPIN'? SortType.NUMERIC: SortType.STRING
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


const defaultState = {
	votingPool: {VotingPool: '', PoolType: '', VotersCount: 0},
	loading: false,
	valid: false,
	voters: [],
	addVoter: false,
	deleteVoters: false,
	uploadVoters: false
}

const votersReducer = (state = defaultState, action) => {
	let votingPool, voters, key

	switch (action.type) {

		case VOTERS_GET:
			return {
				...state,
				loading: true,
				voters: [],
				votingPool: {VotingPool: action.votingPoolId, PoolType: action.votingPoolType, VotersCount: 0}
			}
		case VOTERS_GET_SUCCESS:
			return {
				...state,
				loading: false,
				valid: true,
				votingPool: action.votingPool,
				voters: action.voters,
			}
		case VOTERS_GET_FAILURE:
			return {
				...state,
				loading: false
			}

		case VOTERS_ADD:
			return {...state, addVoter: true}
		case VOTERS_ADD_SUCCESS:
			votingPool = action.votingPool
			if (votingPool.PoolType === state.votingPool.PoolType && votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				voters = state.voters.slice()
				voters.push(action.voter)
				return {
					...state,
					addVoter: false,
					votingPool,
					voters,
				}
			}
			return {...state, addVoter: false}
		case VOTERS_ADD_FAILURE:
			return {...state, addVoter: false}

		case VOTERS_UPDATE:
			return {...state, updateVoter: true}
		case VOTERS_UPDATE_SUCCESS:
			votingPool = action.votingPool
			if (votingPool.PoolType === state.votingPool.PoolType && votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				key = votingPool.PoolType === 'SA'? 'Email': 'SAPIN'
				voters = state.voters.map(v => (v[key] === action.voterId)? {...v, ...action.voter}: v)
				return {
					...state,
					updateVoter: false,
					votingPool,
					voters,
				}
			}
			return {...state, updateVoter: false}
		case VOTERS_UPDATE_FAILURE:
			return {...state, updateVoter: false}

		case VOTERS_DELETE:
			return {...state, deleteVoters: true}
		case VOTERS_DELETE_SUCCESS:
			votingPool = action.votingPool
			if (votingPool.PoolType === state.votingPool.PoolType && votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				key = votingPool.PoolType === 'SA'? 'Email': 'SAPIN'
				voters = state.voters.filter(v => !action.voterIds.includes(v[key]))
				return {
					...state,
					deleteVoters: false,
					voters,
					votingPool,
				}
			}
			return {...state, deleteVoters: false}
		case VOTERS_DELETE_FAILURE:
			return {...state, deleteVoters: false}

		case VOTERS_UPLOAD:
			return {...state, uploadVoters: true}
		case VOTERS_UPLOAD_SUCCESS:
			return {
				...state,
				uploadVoters: false,
				voters: action.voters,
				votingPool: action.votingPool
			}
		case VOTERS_UPLOAD_FAILURE:
			return {...state, uploadVoters: false}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'voters';
const votersReducerAll = (state, action) => {
	if (state === undefined) {
		return {
			...votersReducer(undefined, {}),
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
		return votersReducer(state, action)
	}
}

export default votersReducerAll;