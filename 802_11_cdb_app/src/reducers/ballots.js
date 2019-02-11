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

/*
 * Reducer that returns an array of ballots for a particular project
 */
function getProjectBallotList(project, ballotsData) {
	return ballotsData.filter(b => {
		return b.Project === project? b: null
	});
}

const ballots = (state = defaultState, action) => {
	var ballotsData;
	var errorMsgs;

	console.log(action);

	switch (action.type) {
		case 'SET_BALLOTS_SORT':
			return Object.assign({}, state, {
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				ballotsDataMap: sortData(state.ballotsDataMap, state.ballotsData, action.sortBy, action.sortDirection)
			});
		case 'SET_BALLOTS_FILTER':
			const filters = Object.assign({}, state.filters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				filters,
				ballotsDataMap: sortData(filterData(state.ballotsData, filters), state.ballotsData, state.sortBy, state.sortDirection)
			});
		case 'GET_BALLOTS':
			return Object.assign({}, state, {
				getBallots: true,
				ballotsData: [],
				ballotsDataMap: []
			});
		case 'GET_BALLOTS_SUCCESS':
			return Object.assign({}, state, {
				ballotsDataValid: true,
				getBallots: false,
				ballotsData: action.ballots,
				ballotsDataMap: sortData(filterData(action.ballots, state.filters), action.ballots, state.sortBy, state.sortDirection),
				projectList: getProjectsList(action.ballots)
			});
		case 'GET_BALLOTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getBallots: false,
				errorMsgs: errorMsgs
			});
		case 'ADD_BALLOT':
			return Object.assign({}, state, {
				addBallot: true,
				addBallotError: false
			});
		case 'ADD_BALLOT_SUCCESS':
			ballotsData = state.ballotsData.slice();
			ballotsData.push(action.ballot);
			return Object.assign({}, state, {
				addBallot: false,
				addBallotError: false,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				projectList: getProjectsList(ballotsData),
			});
		case 'ADD_BALLOT_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				addBallot: false,
				errorMsgs: errorMsgs
			});

		case 'UPDATE_BALLOT':
			ballotsData = state.ballotsData.map(d =>
				(d.BallotID === action.ballot.BallotID)? Object.assign({}, d, action.ballot): d
			);
			return Object.assign({}, state, {
				updateBallot: true,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				projectList: getProjectsList(ballotsData)
			});
		case 'UPDATE_BALLOT_SUCCESS':
			return Object.assign({}, state, {
				updateBallot: false
			});
		case 'UPDATE_BALLOT_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				updateBallot: false,
				errorMsgs: errorMsgs
			});

		case 'DELETE_BALLOTS':
			return Object.assign({}, state, {
				deleteBallots: true
			});
		case 'DELETE_BALLOTS_SUCCESS':
			ballotsData = state.ballotsData.filter(b => !action.ballotIds.includes(b.BallotID));
			return Object.assign({}, state, {
				deleteBallots: false,
				ballotsData: ballotsData,
				ballotsDataMap: sortData(filterData(ballotsData, state.filters), ballotsData, state.sortBy, state.sortDirection),
				projectList: getProjectsList(ballotsData),
			});
		case 'DELETE_BALLOTS_FAILTURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				deleteBallots: false,
				errorMsgs: errorMsgs
			});

		case 'SET_PROJECT':
			return Object.assign({}, state, {
				project: action.project,
				ballotId: '',
				ballotList: getProjectBallotList(action.project, state.ballotsData)
			});
		case 'SET_BALLOTID':
			return Object.assign({}, state, {ballotId: action.ballotId});

		case 'CLEAR_BALLOTS_ERROR':
			if (state.errorMsgs.length) {
				errorMsgs = state.errorMsgs.slice();
				errorMsgs.pop();
				return Object.assign({}, state, {errorMsgs: errorMsgs})
			}
			return state;

		default:
			return state;
	}
}

export default ballots;
