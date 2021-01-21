import {setError} from './error'
import fetcher from '../lib/fetcher'
import {setSelected} from './select'
export {AccessLevel, AccessLevelOptions} from './login'	// re-export access level constants

const dataSet = 'users'
export const USERS_PREFIX = 'USERS_'

export const USERS_GET = USERS_PREFIX + 'GET'
export const USERS_GET_SUCCESS = USERS_PREFIX + 'GET_SUCCESS'
export const USERS_GET_FAILURE = USERS_PREFIX + 'GET_FAILURE'

export const USERS_UPDATE = USERS_PREFIX + 'UPDATE'
export const USERS_UPDATE_SUCCESS = USERS_PREFIX + 'UPDATE_SUCCESS'
export const USERS_UPDATE_FAILURE = USERS_PREFIX + 'UPDATE_FAILURE'

export const USERS_ADD = USERS_PREFIX + 'ADD'
export const USERS_ADD_SUCCESS = USERS_PREFIX + 'ADD_SUCCESS'
export const USERS_ADD_FAILURE = USERS_PREFIX + 'ADD_FAILURE'

export const USERS_DELETE = USERS_PREFIX + 'DELETE'
export const USERS_DELETE_SUCCESS = USERS_PREFIX + 'DELETE_SUCCESS'
export const USERS_DELETE_FAILURE = USERS_PREFIX + 'DELETE_FAILURE'

export const USERS_UPLOAD = USERS_PREFIX + 'UPLOAD'
export const USERS_UPLOAD_SUCCESS = USERS_PREFIX + 'UPLOAD_SUCCESS'
export const USERS_UPLOAD_FAILURE = USERS_PREFIX + 'UPLOAD_FAILURE'

function updateIdList(users, selected) {
	const changed = selected.reduce(
		(result, id) => result || !users.find(u => u.SAPIN === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !users.find(u => u.SAPIN === id))
}

const getUsersLocal = () => ({type: USERS_GET})
const getUsersSuccess = (users) => ({type: USERS_GET_SUCCESS, users})
const getUsersFailure = ()=> ({type: USERS_GET_FAILURE})

export function getUsers() {
	return async (dispatch, getState) => {
		dispatch(getUsersLocal())
		try {
			const users = await fetcher.get('/api/users')

			const p = []
			const {selected} = getState()[dataSet]
			const newSelected = updateIdList(users, selected)
			if (newSelected !== selected)
				p.push(dispatch(setSelected(dataSet, newSelected)))

			p.push(dispatch(getUsersSuccess(users)))
			return Promise.all(p)
		}
		catch(error) {
			return Promise.all([
				dispatch(getUsersFailure()),
				dispatch(setError('Unable to get users list', error))
			])
		}
	}
}

const updateUserLocal = (SAPIN, user) => ({type: USERS_UPDATE, SAPIN, user})
const updateUserSuccess = (SAPIN, user)=> ({type: USERS_UPDATE_SUCCESS, SAPIN, user})
const updateUserFailure = (SAPIN) => ({type: USERS_UPDATE_FAILURE, SAPIN})

export function updateUser(SAPIN, user) {
	return async (dispatch) => {
		dispatch(updateUserLocal(SAPIN, user))
		try {
			const updatedUser = await fetcher.put(`/api/user/${SAPIN}`, user)
			return dispatch(updateUserSuccess(SAPIN, updatedUser))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateUserFailure(SAPIN)),
				dispatch(setError(`Unable to update user ${SAPIN}`, error))
			])
		}
	}
}

const addUserLocal = (user) => ({type: USERS_ADD,	user})
const addUserSuccess = (user) => ({type: USERS_ADD_SUCCESS, user})
const addUserFailure = (user)=> ({type: USERS_ADD_FAILURE, user})

export function addUser(user) {
	return async (dispatch) => {
		dispatch(addUserLocal(user))
		try {
			const updatedUser = await fetcher.post('/api/user', user)
			return dispatch(addUserSuccess(updatedUser))
		}
		catch(error) {
			return Promise.all([
				dispatch(addUserFailure(user)),
				dispatch(setError(`Unable to add user ${user.SAPIN}`, error))
			])
		}
	}
}

const deleteUsersLocal = (userIds) => ({type: USERS_DELETE, userIds})
const deleteUsersSuccess = (userIds) => ({type: USERS_DELETE_SUCCESS, userIds})
const deleteUsersFailure = (userIds) => ({type: USERS_DELETE_FAILURE, userIds})

export function deleteUsers(userIds) {
	return async (dispatch, getState) => {
		dispatch(deleteUsersLocal(userIds))
		try {
			await fetcher.delete('/api/users', userIds)
			const {selected} = getState()[dataSet]
			const newSelected = selected.filter(id => !userIds.includes(id))
			return Promise.all([
				dispatch(deleteUsersSuccess(userIds)),
				dispatch(setSelected(dataSet, newSelected))
				])
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteUsersFailure(userIds)),
				dispatch(setError(`Unable to delete users ${userIds}`, error))
			])
		}
	}
}

const uploadUsersLocal = () => ({type: USERS_UPLOAD})
const uploadUsersSuccess = (users) => ({type: USERS_UPLOAD_SUCCESS, users})
const uploadUsersFailure = () => ({type: USERS_UPLOAD_FAILURE})

export function uploadUsers(file) {
	return async (dispatch) => {
		dispatch(uploadUsersLocal())
		try {
			const users = await fetcher.postMultipart('/api/users/upload', {UsersFile: file})
			return dispatch(uploadUsersSuccess(users))
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadUsersFailure()),
				dispatch(setError('Unable to upload users', error))
			])
		}
	}
}
