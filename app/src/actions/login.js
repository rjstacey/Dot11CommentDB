import fetcher from '../lib/fetcher'

export const AccessLevel = {
	Public: 0,
	Member: 1,
	SubgroupAdmin: 2,
	WGAdmin: 3
};

export const AccessLevelOptions = [
	{value: AccessLevel.Public,		label: 'Public'},
	{value: AccessLevel.Member,		label: 'Member'},
	{value: AccessLevel.SubgroupAdmin, label: 'Subgroup Admin'},
	{value: AccessLevel.WGAdmin,	label: 'WG Admin'}
];

export const LOGIN_PREFIX = 'LOGIN_'
export const LOGIN_GET_STATE = LOGIN_PREFIX + 'GET_STATE'
export const LOGIN_START = LOGIN_PREFIX + 'START'
export const LOGIN_SUCCESS = LOGIN_PREFIX + 'SUCCESS'
export const LOGIN_FAILURE = LOGIN_PREFIX + 'FAILURE'
export const LOGOUT_START = 'LOGOUT_START'

const loginGetStateLocal = () => ({type: LOGIN_GET_STATE})
const loginStart = () => ({type: LOGIN_START})
const logoutStart = () => ({type: LOGOUT_START})
const loginSuccess = (user) => ({type: LOGIN_SUCCESS, user})
const loginFailure = (errMsg) => ({type: LOGIN_FAILURE, errMsg})

export const LOGIN_STORAGE = 'User';

export function loginUserInit() {
	// Get user from local storage. This may fail if the browser has certain privacy settings.
	let user;
	try {user = JSON.parse(localStorage.getItem(LOGIN_STORAGE))} catch (err) {/* ignore errors */}
	if (user)
		fetcher.setJWT(user.Token);
	return user;
}

export function loginGetState() {
	return async (dispatch, getState) => {
		if (getState().login.loading)
			return null
		dispatch(loginGetStateLocal())
		try {
			const user = await fetcher.get('/auth/login')
			try {localStorage.setItem(LOGIN_STORAGE, JSON.stringify(user))} catch (err) {};
			if (user)
				fetcher.setJWT(user.Token);
			return dispatch(loginSuccess(user))
		}
		catch (error) {
			console.error(error)
			return dispatch(loginFailure('Unable to get login state'))
		}
	}
}

export function login(username, password) {
	return async (dispatch) => {
		try {localStorage.removeItem(LOGIN_STORAGE)} catch (err) {};
		dispatch(loginStart())
		try {
			const user = await fetcher.post('/auth/login', {username, password})
			try {localStorage.setItem(LOGIN_STORAGE, JSON.stringify(user))} catch (err) {};
			if (user && user.Token)
				fetcher.setJWT(user.Token);
			else
				console.error('Missing JWT token');
			return dispatch(loginSuccess(user))
		}
		catch (error) {
			return dispatch(loginFailure(typeof error === 'string'? error: error.toString()))
		}
	}
}

export function logout() {
	return async (dispatch) => {
		try {localStorage.removeItem(LOGIN_STORAGE)} catch (err) {};
		dispatch(logoutStart())
		fetcher.setJWT(null);
		try {
			await fetcher.post('/auth/logout')
			return dispatch(loginSuccess(null))
		}
		catch (error) {
			console.log(error)
			return dispatch(loginFailure('Unable to logout'))
		}
	}
}
