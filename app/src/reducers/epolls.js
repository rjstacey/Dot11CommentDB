import sortReducer from './sort'
import {SORT_PREFIX, SORT_INIT, SortDirection} from '../actions/sort'
import {SortType} from '../lib/sort'

import filtersReducer from './filter'
import {FILTER_PREFIX, FILTER_INIT, FilterType} from '../actions/filter'

import {SELECT_PREFIX} from '../actions/select'
import selectReducer from './select'

import {EXPAND_PREFIX} from '../actions/expand'
import expandReducer from './expand'

import {UI_PREFIX} from '../actions/ui'
import uiReducer from './ui'

import {
	EPOLLS_GET,
	EPOLLS_GET_SUCCESS,
	EPOLLS_GET_FAILURE
} from '../actions/epolls'

const epollFields = ['EpollNum', 'BallotID', 'Document', 'Topic', 'Start', 'End', 'Votes']

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = epollFields.reduce((entries, dataKey) => {
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
	return type !== undefined? {...entries, [dataKey]: {type}}: entries;
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = epollFields.reduce((entries, dataKey) => {
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
	const direction = SortDirection.NONE;
	return type !== undefined? {...entries, [dataKey]: {type, direction}}: entries;
}, {});

const defaultState = {
	valid: false,
	epolls: [],
	loading: false
};

const epollsReducer = (state = defaultState, action) => {

	switch (action.type) {
		case EPOLLS_GET:
			return {
				...state,
				epolls: [],
				loading: true,
				valid: false
			}

		case EPOLLS_GET_SUCCESS:
			return {
				...state,
				epolls: action.epolls,
				loading: false,
				valid: true,
			}

		case EPOLLS_GET_FAILURE:
			return {
				...state,
				loading: false
			}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'epolls'
export default (state, action) => {
	if (state === undefined) {
		return {
			...epollsReducer(undefined, {}),
			sort: sortReducer(undefined, {type: SORT_INIT, entries: defaultSortEntries}),
			filters: filtersReducer(undefined, {type: FILTER_INIT, entries: defaultFiltersEntries}),
			selected: selectReducer(undefined, {}),
			expanded: expandReducer(undefined, {}),
			ui: uiReducer(undefined, {})
		}
	}
	if (action.type.startsWith(SORT_PREFIX) && action.dataSet === dataSet) {
		const sort = sortReducer(state.sort, action);
		return {...state, sort}
	}
	else if (action.type.startsWith(FILTER_PREFIX) && action.dataSet === dataSet) {
		const filters = filtersReducer(state.filters, action);
		return {...state, filters}
	}
	else if (action.type.startsWith(SELECT_PREFIX) && action.dataSet === dataSet) {
		const selected = selectReducer(state.selected, action);
		return {...state, selected}
	}
	else if (action.type.startsWith(EXPAND_PREFIX) && action.dataSet === dataSet) {
		const expanded = expandReducer(state.expanded, action);
		return {...state, expanded}
	}
	else if (action.type.startsWith(UI_PREFIX) && action.dataSet === dataSet) {
		const ui = uiReducer(state.ui, action);
		return {...state, ui}
	}
	else {
		return epollsReducer(state, action)
	}
}

