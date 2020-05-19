import {FilterType, filterCreate, filterSetValue, filterData} from './filter'
import {SortType, sortCreate, sortAddColumn, sortClick, sortData} from './sort'
import {
	SET_EPOLLS_FILTER,
	SET_EPOLLS_SORT,
	GET_EPOLLS,
	GET_EPOLLS_SUCCESS,
	GET_EPOLLS_FAILURE,
	SYNC_EPOLLS_AGAINST_BALLOTS
} from '../actions/epolls'

const epollFields = ['EpollNum', 'BallotID', 'Document', 'Topic', 'Start', 'End', 'Votes']

/*
 * Generate a filter for each field (table column)
 */
function genDefaultFilters() {
	let filters = {}
	for (let dataKey of epollFields) {
		let type
		switch (dataKey) {
		case 'EpollNum':
		case 'Votes':
			type = FilterType.NUMERIC
			break
		case 'BallotID':
		case 'Document':
		case 'Topic':
			type = FilterType.STRING
			break
		default:
			break
		}
		if (type) {
			filters[dataKey] = filterCreate(type)
		}
	}
	return filters
}

function genDefaultSort() {
	let sort = sortCreate()
	for (let dataKey of epollFields) {
		let type
		switch (dataKey) {
		case 'EpollNum':
		case 'Votes':
			type = SortType.NUMERIC
			break
		case 'BallotID':
		case 'Document':
		case 'Topic':
			type = SortType.STRING
			break
		default:
			break
		}
		if (type) {
			sortAddColumn(sort, dataKey, type)
		}
	}
	return sort
}

const defaultState = {
	filters: genDefaultFilters(),
	sort: genDefaultSort(),
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
			const sort = sortClick(state.sort, action.dataKey, action.event)
			return {
				...state,
				sort,
				epollsMap: sortData(sort, state.epollsMap, state.epolls)
			}
		case SET_EPOLLS_FILTER:
			const filters = {
				...state.filters,
				[action.dataKey]: filterSetValue(state.filters[action.dataKey], action.value)
			}
			return {
				...state,
				filters,
				epollsMap: sortData(state.sort, filterData(state.epolls, filters), state.epolls)
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
				epollsMap: sortData(state.sort, filterData(action.epolls, state.filters), action.epolls)
			}
		case GET_EPOLLS_FAILURE:
			return {...state, getEpolls: false}

		case SYNC_EPOLLS_AGAINST_BALLOTS:
			epolls = syncAgainstBallots(state.epolls, action.ballots)
			return {
				...state,
				epolls,
				epollsMap: sortData(state.sort, filterData(epolls, state.filters), epolls)
			}

		default:
			return state
	}
}

export default epolls
