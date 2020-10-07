
export const SELECT_PREFIX = 'SELECT_'
export const SELECT_SET = SELECT_PREFIX + 'SET'
export const SELECT_TOGGLE = SELECT_PREFIX + 'TOGGLE'

export const setSelected = (dataSet, ids) => ({type: SELECT_SET, dataSet, ids})
export const toggleSelected = (dataSet, ids) => ({type: SELECT_TOGGLE, dataSet, ids})
