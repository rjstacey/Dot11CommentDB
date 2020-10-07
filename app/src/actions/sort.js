

export const SORT_PREFIX = 'SORT_'
export const SORT_INIT = SORT_PREFIX + 'INIT'
export const SORT_SET = SORT_PREFIX + 'SET'
export const SORT_TOGGLE = SORT_PREFIX + 'TOGGLE'

export const setSort = (dataSet, dataKey, direction) => ({type: SORT_SET, dataSet, dataKey, direction})
export const toggleSort = (dataSet, dataKey, event) => ({type: SORT_TOGGLE, dataSet, dataKey, event})
