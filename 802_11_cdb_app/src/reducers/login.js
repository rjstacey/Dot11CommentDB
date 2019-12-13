
const defaultState = {
	Username: '',
	Name: '',
	SAPIN: '',
	Access: 0,
	LoggedIn: false,
	InProgress: false,
	StatusMsg: ''
}

const comments = (state = defaultState, action) => {

	switch (action.type) {
	case 'LOGIN_GET_STATE':
		return {...state, InProgress: true}
	case 'LOGIN_GET_STATE_SUCCESS':
		if (action.info) {
			return {
	        	...state,
				LoggedIn: true,
				InProgress: false,
				Username: action.info.username,
				Name: action.info.name,
				SAPIN: action.info.sapin,
				Access: action.info.access
			}
		}
		else {
	        return {
				...state,
				LoggedIn: false,
				InProgress: false
			}
		}
	case 'LOGIN_GET_STATE_FAILURE':
		return {
			...state,
			LoggedIn: false,
			InProgress: false,
			StatusMsg: action.errMsg
		}
	case 'LOGIN_START':
		return {
			...state,
			InProgress: true,
			LoggedIn: false
		}
	case 'LOGIN_SUCCESS':
		return {
			...state,
			LoggedIn: true,
			InProgress: false,
			Username: action.info.username,
			Name: action.info.name,
			SAPIN: action.info.sapin,
			Access: action.info.access
		}
	case 'LOGIN_FAILURE':
		return {
			...state,
			LoggedIn: false,
			InProgress: false,
			StatusMsg: action.errMsg
		}
	case 'LOGOUT_START':
		return {
			...state,
			InProgress: true,
			StatusMsg: '',
		}
	case 'LOGOUT_SUCCESS':
		return {
			...state,
			LoggedIn: false,
			InProgress: false,
		}
	case 'LOGOUT_FAILURE':
		return {
			...state,
			LoggedIn: false,
			InProgress: false,
			StatusMsg: action.errMsg
		}
	default:
		return state
	}
}

export default comments
