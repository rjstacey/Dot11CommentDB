
export const SET_ERROR = 'SET_ERROR'
export const CLEAR_ERROR = 'CLEAR_ERROR'

export function setError(summary, error) {
	let detail
	if (typeof error === 'string') {
		detail = error
	}
	else {
		if (error.hasOwnProperty('detail')) {
			detail = error.detail
		}
		else {
			detail = error.toString()
		}
	}
	return {type: SET_ERROR, summary, detail}
}

export const clearError = () => ({type: CLEAR_ERROR})
