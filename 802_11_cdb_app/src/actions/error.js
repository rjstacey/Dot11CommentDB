
export const SET_ERROR = 'SET_ERROR'
export const CLEAR_ERROR = 'CLEAR_ERROR'

export const setError = (summary, detail) => {return {type: SET_ERROR, summary, detail}}
export const clearError = () => {return {type: CLEAR_ERROR}}
