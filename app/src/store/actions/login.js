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
	if (user && user.Token)
		fetcher.setJWT(user.Token);
	return user;
}

export function loginGetState() {
	return async (dispatch, getState) => {
		if (getState().login.loading)
			return null
		dispatch(loginGetStateLocal())
		let user;
		try {
			const response = await fetcher.get('/auth/login');
			user = response.user;
		}
		catch (error) {
			console.error(error)
			return dispatch(loginFailure('Unable to get login state'))
		}
		try {localStorage.setItem(LOGIN_STORAGE, JSON.stringify(user))} catch (err) {};
		if (user && user.Token)
			fetcher.setJWT(user.Token);
		return dispatch(loginSuccess(user))
	}
}

export function login(username, password) {
	return async (dispatch) => {
		try {localStorage.removeItem(LOGIN_STORAGE)} catch (err) {};
		dispatch(loginStart())
		let user;
		try {
			const response = await fetcher.post('/auth/login', {username, password});
			user = response.user;
		}
		catch (error) {
			await dispatch(loginFailure(typeof error === 'string'? error: error.toString()));
			return null;
		}
		try {localStorage.setItem(LOGIN_STORAGE, JSON.stringify(user))} catch (err) {};
		if (user && user.Token)
			fetcher.setJWT(user.Token);
		else
			console.error('Missing JWT token');
		await dispatch(loginSuccess(user));
		return user;
	}
}

export function logout() {
	return async (dispatch) => {
		try {localStorage.removeItem(LOGIN_STORAGE)} catch (err) {};
		dispatch(logoutStart())
		try {
			await fetcher.post('/auth/logout')
			fetcher.setJWT(null);
		}
		catch (error) {
			console.error(error)
			fetcher.setJWT(null);
			return dispatch(loginFailure('Unable to logout'))
		}
		return dispatch(loginSuccess(null))
	}
}
