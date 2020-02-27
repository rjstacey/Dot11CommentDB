import {
	SET_ERROR,
	CLEAR_ERROR
} from '../actions/error'

const initialState = []

function errMsg(state = initialState, action) {
	var newState
	switch (action.type) {
		case SET_ERROR:
			newState = state.slice()
			newState.push({summary: action.summary, detail: action.detail})
			return newState
		case CLEAR_ERROR:
			if (state.length) {
				newState = state.slice()
				newState.shift()
				return newState
			}
			return state
		default:
			return state
	}
}

export default errMsg