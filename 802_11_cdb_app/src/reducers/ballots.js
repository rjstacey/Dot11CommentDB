import {sortData, filterData} from '../filter'
import {
	SET_BALLOTS_FILTERS,
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

const defaultState = {
	filters: {},
	sortBy: [],
	sortDirection: {},
	selected: [],
	expanded: [],
	ballotsValid: false,
	ballots: [],
	ballotsMap: [],
	getBallots: false,
	addBallot: false,
	updateBallot: false,
	deleteBallots: false,
	ballotsByProject: {},
	projectList: [],
	ballotList: [],
	project: '',
	ballotId: '',
	editBallot: {
		action: 'add',
		ballot: defaultBallot()
	},
}

function getProjectsList(ballotsData) {
	var projects = [];

	ballotsData.forEach(b => {
		if (!projects.includes(b.Project)) {
			projects.push(b.Project)
		}
	})
	return projects
}

function getBallotsByProject(ballotsData) {
	var ballotsByProject = {};
	ballotsData.forEach(b => {
		if (b.Project) {
			if (!ballotsByProject.hasOwnProperty(b.Project)) {
				ballotsByProject[b.Project] = [b.BallotID]
			}
			else {
				ballotsByProject[b.Project].push(b.BallotID)
			}
		}
	})
	return ballotsByProject
}

/*
 * Reducer that returns an array of ballots for a particular project
 */
function getBallotListForProject(ballots, project) {
	return ballots.filter(b => {
		return b.Project === project? b: null
	})
}

function getProjectForBallotId(ballots, ballotId) {
	for (var b of ballots) {
		if (b.BallotID === ballotId) {
			return b.Project;
		}
	}
	return ''
}

function updateSelected(ballots, selected) {
	return selected.filter(s => ballots.find(b => b.BallotID === s))
}

const ballots = (state = defaultState, action) => {
	var ballots, project

	switch (action.type) {
		case SET_BALLOTS_SORT:
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				ballotsMap: sortData(state.ballotsMap, state.ballots, action.sortBy, action.sortDirection)
			}
		case SET_BALLOTS_FILTERS:
			const filters = {
				...state.filters, 
				...action.filters
			}
			return {
				...state,
				filters,
				ballotsMap: sortData(filterData(state.ballots, filters), state.ballots, state.sortBy, state.sortDirection)
			}
		case SET_BALLOTS_SELECTED:
			return {
				...state,
				selected: updateSelected(state.ballots, action.selected)
			}
		case GET_BALLOTS:
			return {
				...state,
				getBallots: true,
				ballots: [],
				ballotsMap: [],
				ballotsByProject: {}
			}
		case GET_BALLOTS_SUCCESS:
			project = getProjectForBallotId(action.ballots, state.ballotId)
			return {
				...state,
				ballotsDataValid: true,
				getBallots: false,
				ballots: action.ballots,
				ballotsMap: sortData(filterData(action.ballots, state.filters), action.ballots, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(action.ballots),
				projectList: getProjectsList(action.ballots),
				ballotList: getBallotListForProject(action.ballots, project),
				project,
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
				ballotsMap: sortData(filterData(ballots, state.filters), ballots, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(ballots),
				projectList: getProjectsList(ballots),
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
				ballotsMap: sortData(filterData(ballots, state.filters), ballots, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(ballots),
				projectList: getProjectsList(ballots)
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
				ballotsMap: sortData(filterData(ballots, state.filters), ballots, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(ballots),
				projectList: getProjectsList(ballots),
				selected: updateSelected(ballots, state.selected)
			}
		case DELETE_BALLOTS_FAILURE:
			return {...state, deleteBallots: false}

		case SET_PROJECT:
			return {
				...state,
				project: action.project,
				ballotId: '',
				ballotList: getBallotListForProject(state.ballots, action.project)
			}
		case SET_BALLOTID:
			project = getProjectForBallotId(state.ballots, action.ballotId);
			if (project !== state.project) {
				return {
					...state,
					ballotId: action.ballotId,
					project,
					ballotList: getBallotListForProject(state.ballots, project)
				}
			}
			return {
				...state,
				ballotId: action.ballotId
			}

		default:
			return state
	}
}

export default ballots
