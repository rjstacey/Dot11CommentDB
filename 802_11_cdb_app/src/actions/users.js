var axios = require('axios');

function requestUsers() {
	return {
		type: 'GETALL_USERS'
	}
}
function receiveUsersSuccess(users) {
	return {
		type: 'GETALL_USERS_SUCCESS',
		users
	}
}
function receiveUsersFailure(msg) {
	return {
		type: 'GETALL_USERS_FAILURE',
		errMsg: msg
	}
}

export function fetchUsers() {
	return dispatch => {
		console.log('fetch users')
		dispatch(requestUsers())
		return axios.get('/users')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(receiveUsersFailure(response.data.message))
				}
				else {
					dispatch(receiveUsersSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(receiveUsersFailure('Unable to get users list'))
			})
	}
}

function updateUserLocal(userData) {
	return {
		type: 'UPDATE_USER',
		user: userData
	}
}
function updateUserSuccess(userData) {
	return {
		type: 'UPDATE_USER_SUCCESS',
		user: userData
	}
}
function updateUserFailure(userId, msg) {
	return {
		type: 'UPDATE_USER_FAILURE',
		userId,
		errMsg: msg
	}
}

export function updateUser(newUserData) {
	return dispatch => {
		dispatch(updateUserLocal(newUserData));
		return axios.post('/users', newUserData)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(updateUserFailure(response.data.message))
				}
				else {
					dispatch(updateUserSuccess(newUserData))
				}
			})
			.catch((error) => {
				dispatch(updateUserFailure(newUserData.UserID, `Unable to update user ${newUserData.UserID}`))
			})
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
function addUserLocal(userData) {
	return {
		type: 'ADD_USERS',
		userData
	}
}
function addUserSuccess(userData) {
	return {
		type: 'ADD_USER_SUCCESS',
		userData
	}
}
function addUserFailure(userData, msg) {
	return {
		type: 'ADD_USER_FAILURE',
		userData,
		errMsg: msg
	}
}

export function addUser(userData) {
	return dispatch => {
		dispatch(addUserLocal(userData))
		return axios.put('/users', userData)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addUserFailure(userData, response.data.message))
				}
				else {
					dispatch(addUserSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(addUserFailure(userData, `Unable to add user ${userData.UserID}`))
			})
	}
}
export function invalidateUsers() {
	return {
		type: 'INVALIDATE_USERS'
	}
}

export function clearError() {
	return {
		type: 'CLEAR_ERROR'
	}
}