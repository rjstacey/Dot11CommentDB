var axios = require('axios');

export const LOGIN_GET_STATE = 'LOGIN_GET_STATE'
export const LOGIN_GET_STATE_SUCCESS = 'LOGIN_GET_STATE_SUCCESS'
export const LOGIN_GET_STATE_FAILURE = 'LOGIN_GET_STATE_FAILURE'
export const LOGIN_START = 'LOGIN_START'
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS'
export const LOGIN_FAILURE = 'LOGIN_FAILURE'
export const LOGOUT_START = 'LOGOUT_START'
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS'
export const LOGOUT_FAILURE = 'LOGOUT_FAILURE'

const loginGetStateLocal = () => {return {type: LOGIN_GET_STATE}}
const loginGetStateSuccess = (info) => {return {type: LOGIN_GET_STATE_SUCCESS, info}}
const loginGetStateFailure = (errMsg) => {return {type: LOGIN_GET_STATE_FAILURE, errMsg}}

export function loginGetState() {
	return async (dispatch, getState) => {
		if (getState().login.InProgress) {
			return null
		}
		dispatch(loginGetStateLocal());
		try {
			const response = await axios.get('/login')
			if (response.data.status === 'OK') {
				return dispatch(loginGetStateSuccess(response.data.data))
			}
			return dispatch(loginGetStateFailure(response.data.message))
		}
		catch(error) {
			return dispatch(loginGetStateFailure('Unable to get login state'))
		}
	}
}

const loginStart = () => {return {type: LOGIN_START}}
const loginSuccess = (info) => {return {type: LOGIN_SUCCESS, info}}
const loginFailure = (errMsg) => {return {type: LOGIN_FAILURE, errMsg}}

export function login(username, password) {
	return async (dispatch) => {
		dispatch(loginStart())
		try {
			const response = await axios.post('/login', {username, password})
			if (response.data.status === 'OK') {
				return dispatch(loginSuccess(response.data.data))
			}
			return dispatch(loginFailure(response.data.message))
		}
		catch(error) {
			return dispatch(loginFailure('Unable to login'))
		}
	}
}

const logoutStart = () => {return {type: LOGOUT_START}}
const logoutSuccess = () => {return {type: LOGOUT_SUCCESS}}
const logoutFailure = (errMsg) => {return {type: LOGOUT_FAILURE, errMsg}}

export function logout() {
	return async (dispatch) => {
		dispatch(logoutStart())
		try {
			const response = await axios.post('/logout')
			if (response.data.status === 'OK') {
				return dispatch(logoutSuccess())
			}
			return dispatch(logoutFailure(response.data.message))
		}
		catch(error) {
			return dispatch(logoutFailure('Unable to logout'))
		}
	}
}
