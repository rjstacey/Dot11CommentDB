var axios = require('axios');

function getUsersLocal() {
	return {
		type: 'GET_USERS'
	}
}
function getUsersSuccess(users) {
	return {
		type: 'GET_USERS_SUCCESS',
		users
	}
}
function getUsersFailure(msg) {
	return {
		type: 'GET_USERS_FAILURE',
		errMsg: msg
	}
}

export function getUsers() {
	return dispatch => {
		dispatch(getUsersLocal())
		return axios.get('/users')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getUsersFailure(response.data.message))
				}
				else {
					dispatch(getUsersSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(getUsersFailure('Unable to get users list'))
			})
	}
}

export function clearGetUsersError() {
	return {
		type: 'CLEAR_GET_USERS_ERROR'
	}
}

function updateUserLocal(user) {
	return {
		type: 'UPDATE_USER',
		user
	}
}
function updateUserSuccess(user) {
	return {
		type: 'UPDATE_USER_SUCCESS',
		user
	}
}
function updateUserFailure(user, msg) {
	return {
		type: 'UPDATE_USER_FAILURE',
		user,
		errMsg: msg
	}
}

export function updateUser(user) {
	return dispatch => {
		dispatch(updateUserLocal(user));
		return axios.post('/users', user)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(updateUserFailure(user, response.data.message))
				}
				else {
					dispatch(updateUserSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(updateUserFailure(user, `Unable to update user ${user.UserID}`))
			})
	}
}

export function clearUpdateUserError() {
	return {
		type: 'CLEAR_UPDATE_USER_ERROR'
	}
}

function addUserLocal(user) {
	return {
		type: 'ADD_USERS',
		user
	}
}
function addUserSuccess(user) {
	return {
		type: 'ADD_USER_SUCCESS',
		user
	}
}
function addUserFailure(user, msg) {
	return {
		type: 'ADD_USER_FAILURE',
		user,
		errMsg: msg
	}
}

export function addUser(user) {
	return dispatch => {
		dispatch(addUserLocal(user))
		return axios.put('/users', user)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addUserFailure(user, response.data.message))
				}
				else {
					dispatch(addUserSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(addUserFailure(user, `Unable to add user ${user.UserID}`))
			})
	}
}

export function clearAddUserError() {
	return {
		type: 'CLEAR_ADD_USER_ERROR'
	}
}

function deleteUsersLocal(userIds) {
	return {
		type: 'DELETE_USERS',
		userIds
	}
}
function deleteUsersSuccess(userIds) {
	return {
		type: 'DELETE_USERS_SUCCESS'
	}
}
function deleteUsersFailure(userIds, msg) {
	return {
		type: 'DELETE_USERS_FAILURE',
		userIds,
		errMsg: msg
	}
}

export function deleteUsers(userIds) {
	return dispatch => {
		dispatch(deleteUsersLocal(userIds))
		return axios.delete('/users', {data: userIds})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteUsersFailure(userIds, response.data.message))
				}
				else {
					dispatch(deleteUsersSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(updateUserFailure(userIds, `Unable to delete users ${userIds}`))
			})
	}
}

export function clearDeleteUsersError() {
	return {
		type: 'CLEAR_DELETE_USERS_ERROR'
	}
}

