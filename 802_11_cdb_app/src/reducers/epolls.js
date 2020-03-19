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
	epollsValid: false,
	epolls: [],
	epollsMap: [],
	getEpolls: false
};

function syncAgainstBallots(epolls, ballots) {
	const epollsList = ballots.map(b => b.EpollNum)
	return epolls.map(d => {
		if (d.InDatabase) {
			return !epollsList.includes(d.EpollNum)? Object.assign({}, d, {InDatabase: false}): d
		} else {
			return epollsList.includes(d.EpollNum)? Object.assign({}, d, {InDatabase: true}): d
		}
	})
}

const epolls = (state = defaultState, action) => {
	let epolls

	switch (action.type) {
		case SET_EPOLLS_SORT:
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				epollsMap: sortData(state.epollsMap, state.epolls, action.sortBy, action.sortDirection)
			}
		case SET_EPOLLS_FILTERS:
			const filters = {...state.filters, ...action.filters}
			return {
				...state,
				filters,
				epollsMap: sortData(filterData(state.epolls, filters), state.epolls, state.sortBy, state.sortDirection)
			}
		case GET_EPOLLS:
			return {
				...state,
				getEpolls: true,
				epolls: [],
				epollsMap: []
			}
		case GET_EPOLLS_SUCCESS:
			return {
				...state,
				getEpolls: false,
				epollsValid: true,
				epolls: action.epolls,
				epollsMap: sortData(filterData(action.epolls, state.filters), action.epolls, state.sortBy, state.sortDirection)
			}
		case GET_EPOLLS_FAILURE:
			return {...state, getEpolls: false}

		case SYNC_EPOLLS_AGAINST_BALLOTS:
			epolls = syncAgainstBallots(state.epolls, action.ballots)
			return {
				...state,
				epolls,
				epollsMap: sortData(filterData(epolls, state.filters), epolls, state.sortBy, state.sortDirection)
			}

		default:
			return state
	}
}

export default epolls
