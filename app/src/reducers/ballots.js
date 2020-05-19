import {FilterType, filterCreate, filterSetValue, filterData} from './filter'
import {SortType, sortCreate, sortAddColumn, sortClick, sortData} from './sort'
import {
	SET_BALLOTS_FILTER,
	SET_BALLOTS_SORT,
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
 * Generate a filter for each field (table column)
 */
function genDefaultFilters() {
	let filters = {}
	for (let dataKey of ballotFields) {
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
			break
		}
		if (type !== undefined) {
			filters[dataKey] = filterCreate(type)
		}
	}
	return filters
}

function genDefaultSort() {
	let sort = sortCreate()
	for (let dataKey of ballotFields) {
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
		if (type !== undefined) {
			sortAddColumn(sort, dataKey, type)
		}
	}
	return sort
}

const defaultState = {
	filters: genDefaultFilters(),
	sort: genDefaultSort(),
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
	return [...new Set(ballots.map(b => b.Project))]
		.sort()
		.map(p => ({value: p, label: p}))
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

const ballots = (state = defaultState, action) => {
	let ballots, project

	switch (action.type) {
		case SET_BALLOTS_SORT:
			const sort = sortClick(state.sort, action.dataKey, action.event)
			return {
				...state,
				sort,
				ballotsMap: sortData(sort, state.ballotsMap, state.ballots)
			}
		case SET_BALLOTS_FILTER:
			const filters = {
				...state.filters,
				[action.dataKey]: filterSetValue(state.filters[action.dataKey], action.value)
			}
			return {
				...state,
				filters,
				ballotsMap: sortData(state.sort, filterData(state.ballots, filters), state.ballots)
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
			ballots = state.ballots.map(d => d.BallotID === action.ballot.BallotID? {...d, ...action.ballot}: d)
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

export default ballots
