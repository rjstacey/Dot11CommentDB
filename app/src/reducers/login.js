import {
	LOGIN_GET_STATE,
	LOGIN_START,
	LOGIN_SUCCESS,
	LOGIN_FAILURE,
	LOGOUT_START
} from '../actions/login'

const defaultState = {
	InProgress: false,
	LoggedIn: false,
	User: null,
	Access: 0,
	StatusMsg: ''
}

const login = (state = defaultState, action) => {

	switch (action.type) {
	case LOGIN_GET_STATE:
		return {
			...state,
			InProgress: true,
			StatusMsg: ''
		}
	case LOGIN_START:
	case LOGOUT_START:
		return {
			...state,
			InProgress: true,
			LoggedIn: false,
			User: null,
			Access: 0,
			StatusMsg: ''
		}
	case LOGIN_SUCCESS:
		return {
			...state,
			InProgress: false,
			LoggedIn: action.user? true: false,
			User: action.user,
			Access: action.user? action.user.Access: 0
		}
	case LOGIN_FAILURE:
		return {
			...state,
			InProgress: false,
			StatusMsg: action.errMsg
		}
	default:
		return state
	}
}

export default login
