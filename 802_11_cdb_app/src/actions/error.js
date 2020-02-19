
export const SET_ERROR = 'SET_ERROR'
export const CLEAR_ERROR = 'CLEAR_ERROR'

export const setError = (errMsg) => {return {type: SET_ERROR, errMsg}}
export const clearError = () => {return {type: CLEAR_ERROR}}
