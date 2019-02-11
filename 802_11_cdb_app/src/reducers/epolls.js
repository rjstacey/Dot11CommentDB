import {sortData, filterData} from '../filter';

const defaultState = {
	filters: {},
	sortBy: [],
	sortDirection: {},
	epollsDataValid: false,
	epollsData: [],
	epollsDataMap: [],
	getEpolls: false,
	errorMsgs: []
};

function syncAgainstBallots(epollsData, ballotsData) {
	const epollsList = ballotsData.map(b => b.EpollNum);
    return epollsData.map(d => {
    	if (d.InDatabase) {
			return !epollsList.includes(d.EpollNum)? Object.assign({}, d, {InDatabase: false}): d
		} else {
			return epollsList.includes(d.EpollNum)? Object.assign({}, d, {InDatabase: true}): d
		}
	});
}

const epolls = (state = defaultState, action) => {
	var epollsData, errorMsgs;
	console.log(action);

	switch (action.type) {
		case 'SET_EPOLLS_SORT':
			return Object.assign({}, state, {
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				epollsDataMap: sortData(state.epollsDataMap, state.epollsData, action.sortBy, action.sortDirection)
			});
		case 'SET_EPOLLS_FILTER':
			const filters = Object.assign({}, state.filters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				filters,
				epollsDataMap: sortData(filterData(state.epollsData, filters), state.epollsData, state.sortBy, state.sortDirection)
			});
		case 'GET_EPOLLS':
			return Object.assign({}, state, {
				getEpolls: true,
				epollData: [],
				epollDataMap: []
			});
		case 'GET_EPOLLS_SUCCESS':
			return Object.assign({}, state, {
				getEpolls: false,
				epollsDataValid: true,
				epollsData: action.epollsData,
				epollsDataMap: sortData(filterData(action.epollsData, state.filters), action.epollsData, state.sortBy, state.sortDirection)
			});
		case 'GET_EPOLLS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getEpolls: false,
				errorMsgs: errorMsgs
			});

		case 'SYNC_EPOLLS_AGAINST_BALLOTS':
			epollsData = syncAgainstBallots(state.epollsData, action.ballotsData)
			return Object.assign({}, state, {
				epollsData: epollsData,
				epollsDataMap: sortData(filterData(epollsData, state.filters), epollsData, state.sortBy, state.sortDirection)
			});

		case 'CLEAR_EPOLLS_ERROR':
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

export default epolls;
