
export const FILTER_PREFIX = 'FILTER_'
export const FILTER_INIT = FILTER_PREFIX + 'INIT'
export const FILTER_SET = FILTER_PREFIX + 'SET'
export const FILTER_ADD = FILTER_PREFIX + 'ADD'
export const FILTER_REMOVE = FILTER_PREFIX + 'REMOVE'
export const FILTER_CLEAR = FILTER_PREFIX + 'CLEAR'
export const FILTER_CLEAR_ALL = FILTER_PREFIX + 'CLEAR_ALL'

export const FilterType = {
	EXACT: 0,
	CONTAINS: 1,
	NUMERIC: 2,
	STRING: 3,
	CLAUSE: 4,
	PAGE: 5,
	REGEX: 6
}

export const setFilter = (dataSet, dataKey, values) => ({type: FILTER_SET, dataSet, dataKey, values})
export const addFilter = (dataSet, dataKey, value, filterType) => ({type: FILTER_ADD, dataSet, dataKey, value, filterType})
export const removeFilter = (dataSet, dataKey, value, filterType) => ({type: FILTER_REMOVE, dataSet, dataKey, value, filterType})
export const clearFilter = (dataSet, dataKey) => ({type: FILTER_CLEAR_ALL, dataSet, dataKey})
export const clearAllFilters = (dataSet) => ({type: FILTER_CLEAR_ALL, dataSet})

export function isFilterable(filters, dataKey) {
	return filters.hasOwnProperty(dataKey)
}
