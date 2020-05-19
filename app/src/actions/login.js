import fetcher from '../lib/fetcher'

export const LOGIN_GET_STATE = 'LOGIN_GET_STATE'
export const LOGIN_START = 'LOGIN_START'
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS'
export const LOGIN_FAILURE = 'LOGIN_FAILURE'
export const LOGOUT_START = 'LOGOUT_START'

const loginGetStateLocal = () => {return {type: LOGIN_GET_STATE}}
const loginStart = () => {return {type: LOGIN_START}}
const logoutStart = () => {return {type: LOGOUT_START}}
const loginSuccess = (user) => {return {type: LOGIN_SUCCESS, user}}
const loginFailure = (errMsg) => {return {type: LOGIN_FAILURE, errMsg}}

export function loginGetState() {
	return async (dispatch, getState) => {
		if (getState().login.InProgress) {
			return null
		}
		dispatch(loginGetStateLocal())
		try {
			const user = await fetcher.get('/auth/login')
			return dispatch(loginSuccess(user))
		}
		catch(error) {
			console.log(error)
			return dispatch(loginFailure('Unable to get login state'))
		}
	}
}


export function login(username, password) {
	return async (dispatch) => {
		dispatch(loginStart())
		try {
			const user = await fetcher.post('/auth/login', {username, password})
			return dispatch(loginSuccess(user))
		}
		catch(error) {
			return dispatch(loginFailure(typeof error === 'string'? error: error.toString()))
		}
	}
}

export function logout() {
	return async (dispatch) => {
		dispatch(logoutStart())
		try {
			await fetcher.post('/auth/logout')
			return dispatch(loginSuccess(null))
		}
		catch(error) {
			console.log(error)
			return dispatch(loginFailure('Unable to logout'))
		}
	}
}
