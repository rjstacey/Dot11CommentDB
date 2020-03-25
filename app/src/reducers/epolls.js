import {sortClick, sortData, filterValidate, filterData} from '../filter';
import {
	SET_EPOLLS_FILTER,
	SET_EPOLLS_SORT,
	GET_EPOLLS,
	GET_EPOLLS_SUCCESS,
	GET_EPOLLS_FAILURE,
	SYNC_EPOLLS_AGAINST_BALLOTS
} from '../actions/epolls'

const filterKeys = [
	'EpollNum', 'BallotID', 'Document', 'Topic', 'Start', 'End', 'Votes'
]

const defaultState = {
	filters: filterKeys.reduce((obj, key) => ({...obj, [key]: filterValidate(key, '')}), {}),
	sortBy: [],
	sortDirection: {},
	epollsValid: false,
	epolls: [],
	epollsMap: [],
	getEpolls: false
};

function syncAgainstBallots(epolls, ballots) {
	return epolls.map(d => {
		if (ballots.find(b => b.EpollNum === d.EpollNum)) {
			return d.InDatabase? d: {...d, InDatabase: true}
		}
		else {
			return d.InDatabase? {...d, InDatabase: false}: d
		}
	})
}

const epolls = (state = defaultState, action) => {
	let epolls

	switch (action.type) {
		case SET_EPOLLS_SORT:
			const {sortBy, sortDirection} = sortClick(action.event, action.dataKey, state.sortBy, state.sortDirection)
			return {
				...state,
				sortBy,
				sortDirection,
				epollsMap: sortData(state.epollsMap, state.epolls, sortBy, sortDirection)
			}
		case SET_EPOLLS_FILTER:
			const filters = {
				...state.votingPoolsFilters,
				[action.dataKey]: filterValidate(action.dataKey, action.value)
			}
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
