import {setError} from './error'
var axios = require('axios');

export const SET_EPOLLS_FILTERS = 'SET_EPOLLS_FILTERS'
export const SET_EPOLLS_SORT = 'SET_EPOLLS_SORT'
export const GET_EPOLLS = 'GET_EPOLLS'
export const GET_EPOLLS_SUCCESS = 'GET_EPOLLS_SUCCESS'
export const GET_EPOLLS_FAILURE = 'GET_EPOLLS_FAILURE'
export const SYNC_EPOLLS_AGAINST_BALLOTS = 'SYNC_EPOLLS_AGAINST_BALLOTS'

export const setEpollsFilters = (filters) => {return {type: SET_EPOLLS_FILTERS, filters}}
export const setEpollsSort = (sortBy, sortDirection) => {return {type: SET_EPOLLS_SORT, sortBy, sortDirection}}

const getEpollsLocal = (n) => {return {type: GET_EPOLLS, n}}
const getEpollsSuccess = (n, epollsData) => {return {type: GET_EPOLLS_SUCCESS, n, epollsData}}
const getEpollsFailure = () => {return {type: GET_EPOLLS_FAILURE}}

export function getEpolls(n = 20) {
	return async (dispatch, getState) => {
		dispatch(getEpollsLocal(n))
		try {
			const response = await axios.get('/epolls', {params: {n}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(getEpollsFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(getEpollsSuccess(n, response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(getEpollsFailure()),
				dispatch(setError('Unable to get a list of epolls'))
			])
		}
	}
}

export const syncEpollsAgainstBallots = (ballotsData) => {return {type: SYNC_EPOLLS_AGAINST_BALLOTS, ballotsData}}
