import {
	LOGIN_GET_STATE,
	LOGIN_START,
	LOGIN_SUCCESS,
	LOGIN_FAILURE,
	LOGOUT_START,
	loginUserInit
} from '../actions/login'

const user = loginUserInit();
const defaultState = {
	loading: false,
	user,
	statusMsg: ''
}

const login = (state = defaultState, action) => {

	switch (action.type) {
	case LOGIN_GET_STATE:
		return {
			...state,
			loading: true,
			statusMsg: ''
		}
	case LOGIN_START:
	case LOGOUT_START:
		return {
			...state,
			loading: true,
			user: null,
			statusMsg: ''
		}
	case LOGIN_SUCCESS:
		return {
			...state,
			loading: false,
			user: action.user,
		}
	case LOGIN_FAILURE:
		return {
			...state,
			loading: false,
			statusMsg: action.errMsg
		}
	default:
		return state
	}
}

export default login
