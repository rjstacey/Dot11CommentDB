var axios = require('axios');

export function setUsersFilters(filters) {
	return {
		type: 'SET_USERS_FILTERS',
		filters
	}

}

export function setUsersSort(sortBy, sortDirection) {
	return {
		type: 'SET_USERS_SORT',
		sortBy,
		sortDirection
	}
}

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
		return axios.put('/users', user)
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
		return axios.post('/users', user)
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

function uploadUsersLocal() {
	return {
		type: 'UPLOAD_USERS'
	}
}

function uploadUsersSuccess(users) {
	return {
		type: 'UPLOAD_USERS_SUCCESS',
		users
	}
}

function uploadUsersFailure(msg) {
	return {
		type: 'UPLOAD_USERS_FAILURE',
		errMsg: msg
	}
}

export function uploadUsers(file) {
	return async (dispatch) => {
		dispatch(uploadUsersLocal());
		var formData = new FormData();
		formData.append("UsersFile", file);
		try {
			const response = await axios.post('/users/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status === 'OK') {
				return dispatch(uploadUsersSuccess(response.data.data))
			}
			else {
				return dispatch(uploadUsersFailure(response.data.message))
			}
		}
		catch(error) {
			return dispatch(uploadUsersFailure('Unable to upload users'))
		}
	}
}

export function clearUsersError() {
	return {
		type: 'CLEAR_USERS_ERROR'
	}
}

