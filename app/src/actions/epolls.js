import {setError} from './error'
import fetcher from '../lib/fetcher'

export const SET_EPOLLS_FILTER = 'SET_EPOLLS_FILTER'
export const SET_EPOLLS_SORT = 'SET_EPOLLS_SORT'
export const GET_EPOLLS = 'GET_EPOLLS'
export const GET_EPOLLS_SUCCESS = 'GET_EPOLLS_SUCCESS'
export const GET_EPOLLS_FAILURE = 'GET_EPOLLS_FAILURE'
export const SYNC_EPOLLS_AGAINST_BALLOTS = 'SYNC_EPOLLS_AGAINST_BALLOTS'

export const setEpollsFilter = (dataKey, value) => {return {type: SET_EPOLLS_FILTER, dataKey, value}}
export const setEpollsSort = (event, dataKey) => {return {type: SET_EPOLLS_SORT, event, dataKey}}

const getEpollsLocal = (n) => {return {type: GET_EPOLLS, n}}
const getEpollsSuccess = (n, epolls) => {return {type: GET_EPOLLS_SUCCESS, n, epolls}}
const getEpollsFailure = () => {return {type: GET_EPOLLS_FAILURE}}

export function getEpolls(n = 20) {
	return async (dispatch, getState) => {
		dispatch(getEpollsLocal(n))
		try {
			const epolls = await fetcher.get('/epolls', {n})
			return dispatch(getEpollsSuccess(n, epolls))
		}
		catch(error) {
			return Promise.all([
				dispatch(getEpollsFailure()),
				dispatch(setError('Unable to get a list of epolls', error))
			])
		}
	}
}

export const syncEpollsAgainstBallots = (ballots) => {return {type: SYNC_EPOLLS_AGAINST_BALLOTS, ballots}}
