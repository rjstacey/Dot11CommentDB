
export const FILTER_PREFIX = 'FILTER_'
export const FILTER_INIT = FILTER_PREFIX + 'INIT'
export const FILTER_SET = FILTER_PREFIX + 'SET'
export const FILTER_CLEAR_ALL = FILTER_PREFIX + 'CLEAR_ALL'
export const FILTER_REMOVE = FILTER_PREFIX + 'REMOVE'

export const setFilter = (dataSet, dataKey, value) => ({type: FILTER_SET, dataSet, dataKey, value})
export const clearFilters = (dataSet) => ({type: FILTER_CLEAR_ALL, dataSet})
export const removeFilter = (dataSet, dataKey, value) => ({type: FILTER_REMOVE, dataSet, dataKey, value})