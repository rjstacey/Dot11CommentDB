var axios = require('axios');

export function setEpollsFilters(filters) {
	return {
		type: 'SET_EPOLLS_FILTERS',
		filters
	}
}
export function setEpollsSort(sortBy, sortDirection) {
	return {
		type: 'SET_EPOLLS_SORT',
		sortBy,
		sortDirection
	}
}

function getEpollsLocal(n) {
	return {
		type: 'GET_EPOLLS',
		n
	}
}
function getEpollsSuccess(n, epollsData) {
	return {
		type: 'GET_EPOLLS_SUCCESS',
		n,
		epollsData
	}
}
function getEpollsFailure(msg) {
	return {
		type: 'GET_EPOLLS_FAILURE',
		errMsg: msg
	}
}
export function getEpolls(n = 20) {
	return async (dispatch, getState) => {
		dispatch(getEpollsLocal(n))
		try {
			const response = await axios.get('/epolls', {params: {n}})
			if (response.data.status !== 'OK') {
				return dispatch(getEpollsFailure(response.data.message))
			}
			else {
				return dispatch(getEpollsSuccess(n, response.data.data))
			}
		}
		catch(error) {
			return dispatch(getEpollsFailure('Unable to get a list of epolls'))
		}
	}
}
export function clearEpollsError() {
	return {
		type: 'CLEAR_EPOLLS_ERROR'
	}
}

export function syncEpollsAgainstBallots(ballotsData) {
	return {
		type: 'SYNC_EPOLLS_AGAINST_BALLOTS',
		ballotsData
	}
}
