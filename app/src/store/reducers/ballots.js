import sortReducer from './sort'
import {SORT_PREFIX, SORT_INIT, SortDirection} from '../actions/sort'
import {SortType} from '../lib/sort'

import filtersReducer from './filter'
import {FILTER_PREFIX, FILTER_INIT, FilterType} from '../actions/filter'

import {SELECT_PREFIX} from '../actions/select'
import selectReducer from './select'

import {UI_PREFIX} from '../actions/ui'
import uiReducer from './ui'

import {
	GET_BALLOTS,
	GET_BALLOTS_SUCCESS,
	GET_BALLOTS_FAILURE,
	UPDATE_BALLOT,
	UPDATE_BALLOT_SUCCESS,
	UPDATE_BALLOT_FAILURE,
	DELETE_BALLOTS,
	DELETE_BALLOTS_SUCCESS,
	DELETE_BALLOTS_FAILURE,
	ADD_BALLOT,
	ADD_BALLOT_SUCCESS,
	ADD_BALLOT_FAILURE,
	SET_PROJECT,
	SET_BALLOTID
} from '../actions/ballots'

const ballotFields = ['Project', 'BallotID', 'Document', 'Topic', 'EpollNum', 'Start', 'End', 'Result', 'Comments', 'VotingPoolID', 'PrevBallotID'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = ballotFields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'EpollNum':
			type = FilterType.NUMERIC
			break
		case 'Project':
		case 'BallotID':
		case 'Document':
		case 'Topic':
		case 'PrevBallotID':
		case 'VotingPoolID':
			type = FilterType.STRING
			break
		default:
			type = FilterType.STRING
			break
	}
	return type !== undefined? {...entries, [dataKey]: {type}}: entries
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = ballotFields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'EpollNum':
			type = SortType.NUMERIC
			break
		case 'Project':
		case 'BallotID':
		case 'Document':
		case 'Topic':
		case 'PrevBallotID':
		case 'VotingPoolID':
			type = SortType.STRING
			break
		case 'Start':
		case 'End':
			type = SortType.DATE
			break
		default:
			break
	}
	const direction = SortDirection.NONE;
	return type !== undefined? {...entries, [dataKey]: {type, direction}}: entries
}, {});


const defaultState = {
	ballots: [],
	valid: false,
	loading: false,
	addBallot: false,
	updateBallot: false,
	deleteBallots: false,
	project: '',
	ballotId: ''
}

function getProjectForBallotId(ballots, ballotId) {
	const b = ballots.find(b => b.BallotID === ballotId)
	return b? b.Project: ''
}

function updateSelected(ballots, selected) {
	return selected.filter(s => ballots.find(b => b.BallotID === s))
}

const ballotsReducer = (state = defaultState, action) => {
	let ballots, project

	switch (action.type) {
		case GET_BALLOTS:
			return {
				...state,
				loading: true
			}
		case GET_BALLOTS_SUCCESS:
			project = getProjectForBallotId(action.ballots, state.ballotId)
			return {
				...state,
				loading: false,
				valid: true,
				ballots: action.ballots,
				project,
				selected: updateSelected(action.ballots, state.selected)
			}
		case GET_BALLOTS_FAILURE:
			return {
				...state,
				loading: false
			}
		case ADD_BALLOT:
			return {...state, addBallot: true}
		case ADD_BALLOT_SUCCESS:
			ballots = state.ballots.slice();
			ballots.push(action.ballot);
			return {
				...state,
				loading: false,
				ballots,
				selected: updateSelected(ballots, state.selected)
			}
		case ADD_BALLOT_FAILURE:
			return {...state, addBallot: false}

		case UPDATE_BALLOT:
			return {
				...state,
				updateBallot: true,
			}
		case UPDATE_BALLOT_SUCCESS:
			ballots = state.ballots.map(d => d.id === action.ballot.id? {...d, ...action.ballot}: d);
			return {
				...state,
				updateBallot: false,
				ballots,
			}
		case UPDATE_BALLOT_FAILURE:
			return {
				...state,
				updateBallot: false
			}

		case DELETE_BALLOTS:
			return {...state, deleteBallots: true}
		case DELETE_BALLOTS_SUCCESS:
			ballots = state.ballots.filter(b1 => !action.ballots.find(b2 => b1.id === b2.id));
			return {
				...state,
				deleteBallots: false,
				ballots,
				selected: updateSelected(ballots, state.selected)
			}
		case DELETE_BALLOTS_FAILURE:
			return {...state, deleteBallots: false}

		case SET_PROJECT:
			project = getProjectForBallotId(state.ballots, state.ballotId)
			let ballotId = state.ballotId
			if (project !== action.project)
				ballotId = '';
			return {
				...state,
				project: action.project,
				ballotId
			}

		case SET_BALLOTID:
			project = getProjectForBallotId(state.ballots, action.ballotId)
			return {
				...state,
				ballotId: action.ballotId,
				project,
			}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'ballots';
const ballotsReducerAll = (state, action) => {
	if (state === undefined) {
		return {
			...ballotsReducer(undefined, {}),
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
		return ballotsReducer(state, action)
	}
}

export default ballotsReducerAll