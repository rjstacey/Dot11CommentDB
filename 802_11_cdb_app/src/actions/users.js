import {setError} from './error'
import fetcher from '../lib/fetcher'

export const SET_USERS_FILTER = 'SET_USERS_FILTER'
export const SET_USERS_SORT = 'SET_USERS_SORT'
export const SET_USERS_SELECTED = 'SET_USERS_SELECTED'

export const GET_USERS = 'GET_USERS'
export const GET_USERS_SUCCESS = 'GET_USERS_SUCCESS'
export const GET_USERS_FAILURE = 'GET_USERS_FAILURE'
export const UPDATE_USER = 'UPDATE_USER'
export const UPDATE_USER_SUCCESS = 'UPDATE_USER_SUCCESS'
export const UPDATE_USER_FAILURE = 'UPDATE_USER_FAILURE'
export const ADD_USER = 'ADD_USER'
export const ADD_USER_SUCCESS = 'ADD_USER_SUCCESS'
export const ADD_USER_FAILURE = 'ADD_USER_FAILURE'
export const DELETE_USERS = 'DELETE_USERS'
export const DELETE_USERS_SUCCESS = 'DELETE_USERS_SUCCESS'
export const DELETE_USERS_FAILURE = 'DELETE_USERS_FAILURE'
export const UPLOAD_USERS = 'UPLOAD_USERS'
export const UPLOAD_USERS_SUCCESS = 'UPLOAD_USERS_SUCCESS'
export const UPLOAD_USERS_FAILURE = 'UPLOAD_USERS_FAILURE'

export const setUsersFilter = (dataKey, value) => {return {type: SET_USERS_FILTER, dataKey, value}}
export const setUsersSort = (event, dataKey) => {return {type: SET_USERS_SORT, event, dataKey}}
export const setUsersSelected = (selected) => {return {type: SET_USERS_SELECTED, selected}}

const getUsersLocal = () => {return {type: GET_USERS}}
const getUsersSuccess = (users) => {return {type: GET_USERS_SUCCESS, users}}
const getUsersFailure = ()=> {return {type: GET_USERS_FAILURE}}

export function getUsers() {
	return async (dispatch) => {
		dispatch(getUsersLocal())
		try {
			const users = await fetcher.get('/users')
			return dispatch(getUsersSuccess(users))
		}
		catch(error) {
			return Promise.all([
				dispatch(getUsersFailure()),
				dispatch(setError('Unable to get users list', error))
			])
		}
	}
}

const updateUserLocal = (SAPIN, user) => {return {type: UPDATE_USER, SAPIN, user}}
const updateUserSuccess = (SAPIN, user)=> {return {type: UPDATE_USER_SUCCESS, SAPIN, user}}
const updateUserFailure = (SAPIN) => {return {type: UPDATE_USER_FAILURE, SAPIN}}

export function updateUser(SAPIN, user) {
	return async (dispatch) => {
		dispatch(updateUserLocal(SAPIN, user))
		try {
			const updatedUser = await fetcher.put(`/user/${SAPIN}`, user)
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

const addUserLocal = (user) => {return {type: ADD_USER,	user}}
const addUserSuccess = (user) => {return {type: ADD_USER_SUCCESS, user}}
const addUserFailure = (user)=> {return {type: ADD_USER_FAILURE, user}}

export function addUser(user) {
	return async (dispatch) => {
		dispatch(addUserLocal(user))
		try {
			const updatedUser = await fetcher.post('/user', user)
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

const deleteUsersLocal = (userIds) => {return {type: DELETE_USERS, userIds}}
const deleteUsersSuccess = (userIds) => {return {type: DELETE_USERS_SUCCESS, userIds}}
const deleteUsersFailure = (userIds) => {return {type: DELETE_USERS_FAILURE, userIds}}

export function deleteUsers(userIds) {
	return async (dispatch) => {
		dispatch(deleteUsersLocal(userIds))
		try {
			await fetcher.delete('/users', userIds)
			return dispatch(deleteUsersSuccess(userIds))
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteUsersFailure(userIds)),
				dispatch(setError(`Unable to delete users ${userIds}`, error))
			])
		}
	}
}

const uploadUsersLocal = () => {return {type: UPLOAD_USERS}}
const uploadUsersSuccess = (users) => {return {type: UPLOAD_USERS_SUCCESS, users}}
const uploadUsersFailure = () => {return {type: UPLOAD_USERS_FAILURE}}

export function uploadUsers(file) {
	return async (dispatch) => {
		dispatch(uploadUsersLocal())
		try {
			const users = await fetcher.postMultipart('/users/upload', {UsersFile: file})
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
