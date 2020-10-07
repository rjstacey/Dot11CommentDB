import {
	SORT_INIT,
	SORT_SET,
	SORT_TOGGLE
} from '../actions/sort'

function parseNumber(value) {
	// Return the value as-is if it's already a number
	if (typeof value === 'number') {
		return value
	}

	// Build regex to strip out everything except digits, decimal point and minus sign
	let regex = new RegExp('[^0-9-.]', ['g']);
	let unformatted = parseFloat(
		('' + value)
			// strip out any cruft
			.replace(regex, '')
		);

	// This will fail silently
	return !isNaN(unformatted) ? unformatted : 0;
}

export function sortData(sort, dataMap, data) {
	const sortType = sort.type, sortBy = sort.by, sortDirection = sort.direction;
	const sortedDataMap = dataMap.slice()

	for (let key of sortBy) {
		let sortFunc = (index_a, index_b) => index_a - index_b; // Index order (= original order)
		if (sortDirection[key] && sortType[key] && sortDirection[key] !== SortDirection.NONE) {
			if (sortType[key] === SortType.NUMERIC) {
				// Numeric compare function
				sortFunc = (index_a, index_b) => {
					const A = parseNumber(data[index_a][key]);
					const B = parseNumber(data[index_b][key]);
					return A - B;
				}
			}
			else if (sortType[key] === SortType.CLAUSE) {
				// Clause sort function
				sortFunc = (index_a, index_b) => {
					const A = data[index_a][key].split('.')
					const B = data[index_b][key].split('.')
					for (let i of Array(Math.min(A.length, B.length)).keys()) {
						if (A[i] !== B[i]) {
							if (!isNaN(A[i]) && !isNaN(B[i])) {
								return parseNumber(A[i]) - parseNumber(B[i], 10);
							}
							else {
								return A[i] < B[i]? -1: 1;
							}
						}
					}
					// Equal so far, so straight string compare
					return A < B? -1: (A > B? 1: 0);
				}
			}
			else {
				// String compare function
				sortFunc = (index_a, index_b) => {
					const A = ('' + data[index_a][key]).toLowerCase();
					const B = ('' + data[index_b][key]).toLowerCase();
					if (A < B) {
						return -1;
					}
					if (A > B) {
						return 1;
					}
					return 0;
				}
			}
		}
		sortedDataMap.sort(sortFunc)
		if (sortDirection[key] === SortDirection.DESC) {
			sortedDataMap.reverse()
		}
	}

	return sortedDataMap
}

export function sortClick(sort, dataKey, event) {
	var sortBy = sort.by.slice()
	var sortDirection = Object.assign({}, sort.direction)

	if (event.shiftKey) {
		// Shift + click appends a column to existing criteria
		if (sortBy.includes(dataKey)) {
			sortDirection[dataKey] = sortDirection[dataKey] === SortDirection.DESC? SortDirection.NONE:
				(sortDirection[dataKey] === SortDirection.ASC? SortDirection.DESC: SortDirection.ASC);
		} else {
			sortDirection[dataKey] = SortDirection.ASC;
			sortBy.unshift(dataKey);
		}
	} else if (event.ctrlKey || event.metaKey) {
		// Control + click removes column from sort (if pressent)
		const index = sortBy.indexOf(dataKey);
		if (index >= 0) {
			sortBy.splice(index, 1);
			delete sortDirection[dataKey];
		}
	} else {
		if (sortBy.includes(dataKey)) {
			sortDirection[dataKey] = sortDirection[dataKey] === SortDirection.DESC? SortDirection.NONE:
				(sortDirection[dataKey] === SortDirection.ASC? SortDirection.DESC: SortDirection.ASC);
		} else {
			sortDirection[dataKey] = SortDirection.ASC;
		}
		sortBy.length = 0;
		sortBy.push(dataKey);
	}
	return {...sort, by: sortBy, direction: sortDirection};
}

export function setSort(sort, dataKey, direction) {
	const sortBy = sort.by.slice();
	const sortDirection = Object.assign({}, sort.direction);
	const index = sortBy.indexOf(dataKey);
	if (index >= 0) {
		if (sortDirection[dataKey] === direction) {
			sortBy.splice(index, 1);
			delete sortDirection[dataKey];
		}
		else {
			sortDirection[dataKey] = direction;
		}
	}
	else {
		sortDirection[dataKey] = direction;
		sortBy.unshift(dataKey);
	}
	return {...sort, by: sortBy, direction: sortDirection};
}

export function isSortable(sort, dataKey) {
	return sort.type.hasOwnProperty(dataKey)
}

/*
 * Create sort object
 */
export function sortCreate() {
	return {
		by: [],
		type: {},
		direction: {}
	}
}

/*
 * Initialize a column in sort object
 */
export function sortAddColumn(sort, dataKey, type) {
	sort.direction[dataKey] = SortDirection.NONE
	sort.type[dataKey] = type
}

export const SortDirection = {
	NONE: 'NONE',
	ASC: 'ASC',
	DESC: 'DESC'
}

export const SortType = {
	NOTSORTABLE: 0,
	STRING: 1,
	NUMERIC: 2,
	CLAUSE: 3
}

const defaultState = {
	by: [],
	type: {},
	direction: {}
}

function sortInit(entries) {
	let sort = {...defaultState}
	if (entries) {
		for (let dataKey of Object.keys(entries)) {
			sort.type[dataKey] = entries[dataKey].type;
			sort.direction[dataKey] = entries[dataKey].direction;
		}
	}
	return sort;
}

function sortReducer(state = defaultState, action) {

	switch (action.type) {
		case SORT_SET:
			return setSort(state, action.dataKey, action.direction)

		case SORT_TOGGLE:
			return sortClick(state, action.dataKey, action.event)

		case SORT_INIT:
			return sortInit(action.entries)

		default:
			return state
	}
}

export default sortReducer