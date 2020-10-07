
export const EXPAND_PREFIX = 'EXPAND_'
export const EXPAND_SET = EXPAND_PREFIX + 'SET'
export const EXPAND_TOGGLE = EXPAND_PREFIX + 'TOGGLE'

export const setExpanded = (dataSet, ids) => ({type: EXPAND_SET, dataSet, ids})
export const toggleExpanded = (dataSet, ids) => ({type: EXPAND_TOGGLE, dataSet, ids})
