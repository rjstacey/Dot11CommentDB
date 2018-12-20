var axios = require('axios');

function requestUsers() {
	return {
		type: 'FETCH_USERS'
	}
}
function receiveUsersSuccess(users) {
	return {
		type: 'FETCH_USERS_SUCCESS',
		users: users
	}
}
function receiveUsersFailure(error) {
	return {
		type: 'FETCH_USERS_FAILURE',
		errMsg: error
	}
}
export function fetchUsers() {
	return dispatch => {
		dispatch(requestUsers())
		return axios.get('/users')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(receiveUsersFailure(response.data.message))
				}
				else {
					dispatch(receiveUsersSuccess(response.data.data))
				}
			}
			.catch((error) => {
				dispatch(receiveUsersFailure('Unable to get users list'))
			})
	}
}