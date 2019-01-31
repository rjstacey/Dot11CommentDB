var axios = require('axios');

function loginGetStateLocal() {
	return {
		type: 'LOGIN_GET_STATE'
	}
}
function loginGetStateSuccess(info) {
	return {
		type: 'LOGIN_GET_STATE_SUCCESS',
		info
	}
}
function loginGetStateFailure(msg) {
	return {
		type: 'LOGIN_GET_STATE_FAILURE',
		errMsg: msg
	}
}

export function loginGetState() {
	return dispatch => {
		dispatch(loginGetStateLocal());
		return axios.get('/login')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(loginGetStateFailure(response.data.message))
				}
				else {
					dispatch(loginGetStateSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(loginGetStateFailure('Unable to get login state'))
			})
	}
}

function loginStart() {
	return {
		type: 'LOGIN_START'
	}
}
function loginSuccess(info) {
	return {
		type: 'LOGIN_SUCCESS',
		info
	}
}
function loginFailure(msg) {
	return {
		type: 'LOGIN_FAILURE',
		errMsg: msg
	}
}

export function login(username, password) {
	return dispatch => {
		dispatch(loginStart())
		return axios.post('/login', {username, password})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(loginFailure(response.data.message))
				}
				else {
					dispatch(loginSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(loginFailure('Unable to login'))
			})
	}
}

function logoutStart() {
	return {
		type: 'LOGOUT_START'
	}
}
function logoutSuccess() {
	return {
		type: 'LOGOUT_SUCCESS',
	}
}
function logoutFailure(msg) {
	return {
		type: 'LOGOUT_FAILURE',
		errMsg: msg
	}
}

export function logout() {
	return dispatch => {
		dispatch(logoutStart())
		return axios.post('/logout')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(logoutFailure(response.data.message))
				}
				else {
					dispatch(logoutSuccess())
				}
			})
			.catch((error) => {
				dispatch(logoutFailure('Unable to logout'))
			})
	}
}
