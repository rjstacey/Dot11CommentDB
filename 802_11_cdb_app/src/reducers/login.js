import {
	LOGIN_GET_STATE,
	LOGIN_GET_STATE_SUCCESS,
	LOGIN_GET_STATE_FAILURE,
	LOGIN_START,
	LOGIN_SUCCESS,
	LOGIN_FAILURE,
	LOGOUT_START,
	LOGOUT_SUCCESS,
	LOGOUT_FAILURE
} from '../actions/login'

const defaultState = {
	valid: false,
	Username: '',
	Name: '',
	SAPIN: '',
	Access: 0,
	LoggedIn: false,
	InProgress: false,
	StatusMsg: ''
}

const login = (state = defaultState, action) => {

	switch (action.type) {
	case LOGIN_GET_STATE:
		return {
			...state,
			valid: false,
			InProgress: true
		}
	case LOGIN_GET_STATE_SUCCESS:
		if (action.info) {
			return {
	        	...state,
	        	valid: true,
				InProgress: false,
				LoggedIn: action.info.access > 0,
				Username: action.info.username,
				Name: action.info.name,
				SAPIN: action.info.sapin,
				Access: action.info.access
			}
		}
		else {
	        return {
				...state,
				valid: true,
				InProgress: false,
				LoggedIn: false
			}
		}
	case LOGIN_GET_STATE_FAILURE:
		return {
			...state,
			LoggedIn: false,
			InProgress: false,
			StatusMsg: action.errMsg
		}
	case LOGIN_START:
		return {
			...state,
			InProgress: true,
			LoggedIn: false
		}
	case LOGIN_SUCCESS:
		return {
			...state,
			valid: true,
			InProgress: false,
			LoggedIn: action.info.access > 0,
			Username: action.info.username,
			Name: action.info.name,
			SAPIN: action.info.sapin,
			Access: action.info.access
		}
	case LOGIN_FAILURE:
		return {
			...state,
			valid: false,
			InProgress: false,
			LoggedIn: false,
			StatusMsg: action.errMsg
		}
	case LOGOUT_START:
		return {
			...state,
			InProgress: true,
			StatusMsg: '',
		}
	case LOGOUT_SUCCESS:
		return {
			...state,
			valid: true,
			LoggedIn: false,
			Access: 0,
			InProgress: false,
		}
	case LOGOUT_FAILURE:
		return {
			...state,
			valid: false,
			LoggedIn: false,
			Access: 0,
			InProgress: false,
			StatusMsg: action.errMsg
		}
	default:
		return state
	}
}

export default login
