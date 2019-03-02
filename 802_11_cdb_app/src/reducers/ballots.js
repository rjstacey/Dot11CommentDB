import {sortData, filterData} from '../filter';

const defaultState = {
	filters: {},
	sortBy: [],
	sortDirection: {},
	ballotsDataValid: false,
	ballotsData: [],
	ballotsDataMap: [],
	getBallots: false,
	addBallot: false,
	updateBallot: false,
	deleteBallots: false,
	ballotsByProject: {},
	projectList: [],
	ballotList: [],
	project: '',
	ballotId: '',
	errorMsgs: [],
};

function getProjectsList(ballotsData) {
	var projects = [];

	ballotsData.forEach(b => {
		if (!projects.includes(b.Project)) {
			projects.push(b.Project);
		}
	})
	return projects;
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
	return ballotsByProject;
}

/*
 * Reducer that returns an array of ballots for a particular project
 */
function getBallotListForProject(ballotsData, project) {
	return ballotsData.filter(b => {
		return b.Project === project? b: null
	});
}

function getProjectForBallotId(ballotsData, ballotId) {
	for (var b of ballotsData) {
		if (b.BallotID === ballotId) {
			return b.Project;
		}
	}
	return '';
}

const ballots = (state = defaultState, action) => {
	var ballotsData, errorMsgs, project;

	console.log(action);

	switch (action.type) {
		case 'SET_BALLOTS_SORT':
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				ballotsDataMap: sortData(state.ballotsDataMap, state.ballotsData, action.sortBy, action.sortDirection)
			}
		case 'SET_BALLOTS_FILTER':
			const filters = {
				...state.filters, 
				[action.dataKey]: action.filter
			}
			return {
				...state,
				filters,
				ballotsDataMap: sortData(filterData(state.ballotsData, filters), state.ballotsData, state.sortBy, state.sortDirection)
			}
		case 'GET_BALLOTS':
			return {
				...state,
				getBallots: true,
				ballotsData: [],
				ballotsDataMap: [],
				ballotsByProject: {}
			}
		case 'GET_BALLOTS_SUCCESS':
			project = getProjectForBallotId(action.ballots, state.ballotId)
			return {
				...state,
				ballotsDataValid: true,
				getBallots: false,
				ballotsData: action.ballots,
				ballotsDataMap: sortData(filterData(action.ballots, state.filters), action.ballots, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(action.ballots),
				projectList: getProjectsList(action.ballots),
				ballotList: getBallotListForProject(action.ballots, project),
				project
			}
		case 'GET_BALLOTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				getBallots: false,
				errorMsgs: errorMsgs
			}
		case 'ADD_BALLOT':
			return {...state, addBallot: true}
		case 'ADD_BALLOT_SUCCESS':
			ballotsData = state.ballotsData.slice();
			ballotsData.push(action.ballot);
			return {
				...state,
				addBallot: false,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(ballotsData),
				projectList: getProjectsList(ballotsData)
			}
		case 'ADD_BALLOT_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				addBallot: false,
				errorMsgs: errorMsgs
			}

		case 'UPDATE_BALLOT':
			ballotsData = state.ballotsData.map(d =>
				d.BallotID === action.ballot.BallotID? {...d, ...action.ballot, Result: {...action.ballot.Result}}: d
			);
			return {
				...state,
				updateBallot: true,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(ballotsData),
				projectList: getProjectsList(ballotsData)
			}
		case 'UPDATE_BALLOT_SUCCESS':
			ballotsData = state.ballotsData.map(d =>
				d.BallotID === action.ballot.BallotID? {...d, ...action.ballot, Result: {...action.ballot.Result}}: d
			);
			return {
				...state,
				updateBallot: false,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				projectList: getProjectsList(ballotsData)
			}
		case 'UPDATE_BALLOT_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				updateBallot: false,
				errorMsgs: errorMsgs
			}

		case 'DELETE_BALLOTS':
			return {...state, deleteBallots: true}
		case 'DELETE_BALLOTS_SUCCESS':
			ballotsData = state.ballotsData.filter(b => !action.ballotIds.includes(b.BallotID));
			return {
				...state,
				deleteBallots: false,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				ballotsByProject: getBallotsByProject(ballotsData),
				projectList: getProjectsList(ballotsData)
			}
		case 'DELETE_BALLOTS_FAILTURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				deleteBallots: false,
				errorMsgs: errorMsgs
			}

		case 'SET_PROJECT':
			return {
				...state,
				project: action.project,
				ballotId: '',
				ballotList: getBallotListForProject(state.ballotsData, action.project)
			}
		case 'SET_BALLOTID':
			project = getProjectForBallotId(state.ballotsData, action.ballotId);
			if (project !== state.project) {
				return {
					...state,
					ballotId: action.ballotId,
					project,
					ballotList: getBallotListForProject(state.ballotsData, project)
				}
			}
			return {
				...state,
				ballotId: action.ballotId
			}

		case 'CLEAR_BALLOTS_ERROR':
			if (state.errorMsgs.length) {
				errorMsgs = state.errorMsgs.slice();
				errorMsgs.pop();
				return {...state, errorMsgs}
			}
			return state;

		default:
			return state;
	}
}

export default ballots;
