export const SORT_PREFIX = 'SORT_'
export const SORT_INIT = SORT_PREFIX + 'INIT'
export const SORT_SET = SORT_PREFIX + 'SET'
export const SORT_CLICK = SORT_PREFIX + 'CLICK'

export const SortDirection = {
	NONE: 'NONE',
	ASC: 'ASC',
	DESC: 'DESC'
}

export const setSort = (dataSet, dataKey, direction) => ({type: SORT_SET, dataSet, dataKey, direction})
export const sortClick = (dataSet, dataKey, event) => ({type: SORT_CLICK, dataSet, dataKey, event})

export const isSortable = (sort, dataKey) => sort.type.hasOwnProperty(dataKey)
