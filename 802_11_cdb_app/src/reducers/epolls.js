import {sortData, filterData} from '../filter';
import {
	SET_EPOLLS_FILTERS,
	SET_EPOLLS_SORT,
	GET_EPOLLS,
	GET_EPOLLS_SUCCESS,
	GET_EPOLLS_FAILURE,
	SYNC_EPOLLS_AGAINST_BALLOTS
} from '../actions/epolls'

const defaultState = {
	filters: {},
	sortBy: [],
	sortDirection: {},
	epollsDataValid: false,
	epollsData: [],
	epollsDataMap: [],
	getEpolls: false
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
	var epollsData;

	switch (action.type) {
		case SET_EPOLLS_SORT:
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				epollsDataMap: sortData(state.epollsDataMap, state.epollsData, action.sortBy, action.sortDirection)
			}
		case SET_EPOLLS_FILTERS:
			const filters = {...state.filters, ...action.filters}
			return {
				...state,
				filters,
				epollsDataMap: sortData(filterData(state.epollsData, filters), state.epollsData, state.sortBy, state.sortDirection)
			}
		case GET_EPOLLS:
			return {
				...state,
				getEpolls: true,
				epollsData: [],
				epollsDataMap: []
			}
		case GET_EPOLLS_SUCCESS:
			return {
				...state,
				getEpolls: false,
				epollsDataValid: true,
				epollsData: action.epollsData,
				epollsDataMap: sortData(filterData(action.epollsData, state.filters), action.epollsData, state.sortBy, state.sortDirection)
			}
		case GET_EPOLLS_FAILURE:
			return {...state, getEpolls: false}

		case SYNC_EPOLLS_AGAINST_BALLOTS:
			epollsData = syncAgainstBallots(state.epollsData, action.ballotsData)
			return {
				...state,
				epollsData: epollsData,
				epollsDataMap: sortData(filterData(epollsData, state.filters), epollsData, state.sortBy, state.sortDirection)
			}

		default:
			return state
	}
}

export default epolls
