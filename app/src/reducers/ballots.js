import sortReducer, {SortType, SortDirection, sortData} from './sort'
import {SORT_PREFIX, SORT_INIT} from '../actions/sort'

import filtersReducer, {FilterType, filterSetOptions, filterData} from './filter'
import {FILTER_PREFIX, FILTER_INIT} from '../actions/filter'

import {
	GEN_BALLOTS_OPTIONS,
	SET_BALLOTS_SELECTED,
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

function defaultBallot() {
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	return {
		Project: '',
		BallotID: '',
		EpollNum: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: '',
		PrevBallotID: ''
	}
}

const ballotFields = ['Project', 'BallotID', 'Document', 'Topic', 'EpollNum', 'Start', 'End', 'Result', 'Comments', 'VotingPoolID', 'PrevBallotID'];

/*
 * Generate a list of unique value-label pairs for a particular field
 */
function genFieldOptions(dataKey, data) {
	let options
	// return an array of unique values for dataKey, sorted, and value '' or null labeled '<blank>'
	options = [...new Set(data.map(c => c[dataKey]))]	// array of unique values for dataKey
		.sort()
		.map(v => ({value: v, label: (v === null || v === '')? '<blank>': v}))
	return options
}

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
			type = FilterType.STRING
			break
		default:
			type = FilterType.STRING
			break
	}
	return {...entries, [dataKey]: {type}}
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
			type = SortType.STRING
			break
		default:
			break
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


const defaultState = {
	selected: [],
	expanded: [],
	ballotsValid: false,
	ballots: [],
	ballotsMap: [],
	getBallots: false,
	addBallot: false,
	updateBallot: false,
	deleteBallots: false,
	projectList: [],
	ballotList: [],
	project: '',
	ballotId: '',
	editBallot: {
		action: 'add',
		ballot: defaultBallot()
	},
}

function genProjectList(ballots) {
	return [...new Set(ballots.map(b => b.Project))].sort()
}

function genBallotList(ballots, project) {
	const compare = (a, b) => {
		const A = a.label.toUpperCase()
		const B = b.label.toUpperCase()
		return A < B? -1: (A > B? 1: 0)
	}
	return ballots.filter(b => b.Project === project)
		.map(b => ({value: b.BallotID, label: `${b.BallotID} ${b.Document}`}))
		.sort(compare)
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
		case GEN_BALLOTS_OPTIONS:
			// If the "all" options is specified then generate for all comments, otherwise for those visible
			ballots = action.all? state.ballots: state.ballotsMap.map(i => state.ballots[i])
			const fieldOptions = genFieldOptions(action.dataKey, ballots)
			return {
				...state,
				filters: {
					...state.filters,
					[action.dataKey]: filterSetOptions(state.filters[action.dataKey], fieldOptions)
				}
			}
		case SET_BALLOTS_SELECTED:
			return {
				...state,
				selected: updateSelected(state.ballots, action.selected)
			}
		case GET_BALLOTS:
			return {
				...state,
				getBallots: true
			}
		case GET_BALLOTS_SUCCESS:
			project = getProjectForBallotId(action.ballots, state.ballotId)
			return {
				...state,
				ballotsValid: true,
				getBallots: false,
				ballots: action.ballots,
				ballotsMap: sortData(state.sort, filterData(action.ballots, state.filters), action.ballots),
				project,
				projectList: genProjectList(action.ballots),
				ballotList: genBallotList(action.ballots, project),
				selected: updateSelected(action.ballots, state.selected)
			}
		case GET_BALLOTS_FAILURE:
			return {...state, getBallots: false}
		case ADD_BALLOT:
			return {...state, addBallot: true}
		case ADD_BALLOT_SUCCESS:
			ballots = state.ballots.slice();
			ballots.push(action.ballot);
			return {
				...state,
				addBallot: false,
				ballots,
				ballotsMap: sortData(state.sort, filterData(ballots, state.filters), ballots),
				projectList: genProjectList(ballots),
				selected: updateSelected(action.ballots, state.selected)
			}
		case ADD_BALLOT_FAILURE:
			return {...state, addBallot: false}

		case UPDATE_BALLOT:
			return {
				...state,
				updateBallot: true,
			}
		case UPDATE_BALLOT_SUCCESS:
			ballots = state.ballots.map(d => d.BallotID === action.ballotId? {...d, ...action.ballot}: d)
			return {
				...state,
				updateBallot: false,
				ballots,
				ballotsMap: sortData(state.sort, filterData(ballots, state.filters), ballots),
				projectList: genProjectList(ballots),
			}
		case UPDATE_BALLOT_FAILURE:
			ballots = state.ballots.map(d => d.BallotID === action.ballotId? Object.assign({}, d): d)
			return {
				...state,
				updateBallot: false,
				ballots
			}

		case DELETE_BALLOTS:
			return {...state, deleteBallots: true}
		case DELETE_BALLOTS_SUCCESS:
			ballots = state.ballots.filter(b => !action.ballotIds.includes(b.BallotID));
			return {
				...state,
				deleteBallots: false,
				ballots,
				ballotsMap: sortData(state.sort, filterData(ballots, state.filters), ballots),
				projectList: genProjectList(ballots),
				selected: updateSelected(ballots, state.selected)
			}
		case DELETE_BALLOTS_FAILURE:
			return {...state, deleteBallots: false}

		case SET_PROJECT:
			return {
				...state,
				project: action.project,
				ballotList: genBallotList(state.ballots, action.project)
			}

		case SET_BALLOTID:
			project = getProjectForBallotId(state.ballots, action.ballotId)
			return {
				...state,
				ballotId: action.ballotId,
				project,
				projectList: genProjectList(state.ballots),
				ballotList: genBallotList(state.ballots, project)
			}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
export default (state, action) => {
	if (state === undefined) {
		return {
			...ballotsReducer(undefined, {}),
			sort: sortReducer(undefined, {type: SORT_INIT, entries: defaultSortEntries}),
			filters: filtersReducer(undefined, {type: FILTER_INIT, entries: defaultFiltersEntries})
		}
	}
	if (action.type.startsWith(SORT_PREFIX) && action.dataSet === 'ballots') {
		const sort = sortReducer(state.sort, action);
		return {
			...state,
			sort,
			ballotsMap: sortData(sort, state.ballotsMap, state.ballots)
		}
	}
	else if (action.type.startsWith(FILTER_PREFIX) && action.dataSet === 'ballots') {
		const filters = filtersReducer(state.filters, action);
		return {
			...state,
			filters,
			ballotsMap: sortData(state.sort, filterData(state.ballots, filters), state.ballots)
		}
	}
	else {
		return ballotsReducer(state, action)
	}
}

