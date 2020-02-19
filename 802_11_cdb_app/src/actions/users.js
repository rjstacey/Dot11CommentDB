import {setError} from './error'
var axios = require('axios')

export const SET_USERS_FILTERS = 'SET_USERS_FILTERS'
export const SET_USERS_SORT = 'SET_USERS_SORT'
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

export const setUsersFilters = (filters) => {return {type: SET_USERS_FILTERS, filters}}
export const setUsersSort = (sortBy, sortDirection) => {return {type: SET_USERS_SORT, sortBy, sortDirection}}

const getUsersLocal = () => {return {type: GET_USERS}}
const getUsersSuccess = (users) => {return {type: GET_USERS_SUCCESS, users}}
const getUsersFailure = ()=> {return {type: GET_USERS_FAILURE}}

export function getUsers() {
	return async (dispatch) => {
		dispatch(getUsersLocal())
		try {
			const response = await axios.get('/users')
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(getUsersFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(getUsersSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(getUsersFailure()),
				dispatch(setError('Unable to get users list'))
			])
		}
	}
}

const updateUserLocal = (user) => {return {type: UPDATE_USER, user}}
const updateUserSuccess = (user)=> {return {type: UPDATE_USER_SUCCESS, user}}
const updateUserFailure = (user) => {return {type: UPDATE_USER_FAILURE, user}}

export function updateUser(user) {
	return async (dispatch) => {
		dispatch(updateUserLocal(user))
		try {
			const response = await axios.put('/users', user)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(updateUserFailure(user)),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(updateUserSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateUserFailure(user)),
				dispatch(setError(`Unable to update user ${user.UserID}`))
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
			const response = await axios.post('/users', user)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(addUserFailure(user)),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(addUserSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(addUserFailure(user)),
				dispatch(setError(`Unable to add user ${user.UserID}`))
			])
		}
	}
}

const deleteUsersLocal = (userIds) => {return {type: DELETE_USERS, userIds}}
const deleteUsersSuccess = (userIds) => {return {type: DELETE_USERS_SUCCESS}}
const deleteUsersFailure = (userIds) => {return {type: DELETE_USERS_FAILURE, userIds}}

export function deleteUsers(userIds) {
	return async (dispatch) => {
		dispatch(deleteUsersLocal(userIds))
		try {
			const response = await axios.delete('/users', {data: userIds})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(deleteUsersFailure(userIds)),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(deleteUsersSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateUserFailure(userIds)),
				dispatch(setError(`Unable to delete users ${userIds}`))
			])
		}
	}
}

const uploadUsersLocal = () => {return {type: UPLOAD_USERS}}
const uploadUsersSuccess = (users) => {return {type: UPLOAD_USERS_SUCCESS, users}}
const uploadUsersFailure = () => {return {type: UPLOAD_USERS_FAILURE}}

export function uploadUsers(file) {
	return async (dispatch) => {
		dispatch(uploadUsersLocal());
		var formData = new FormData();
		formData.append("UsersFile", file);
		try {
			const response = await axios.post('/users/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(uploadUsersFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(uploadUsersSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadUsersFailure()),
				dispatch(setError('Unable to upload users'))
			])
		}
	}
}
