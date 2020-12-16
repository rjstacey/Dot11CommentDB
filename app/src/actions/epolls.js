import {setError} from './error'
import fetcher from '../lib/fetcher'

export const EPOLLS_PREFIX = 'EPOLLS_'
export const EPOLLS_GET = EPOLLS_PREFIX + 'GET'
export const EPOLLS_GET_SUCCESS = EPOLLS_PREFIX + 'GET_SUCCESS'
export const EPOLLS_GET_FAILURE = EPOLLS_PREFIX + 'GET_FAILURE'

const getEpollsLocal = (n) => ({type: EPOLLS_GET, n})
const getEpollsSuccess = (n, epolls) => ({type: EPOLLS_GET_SUCCESS, n, epolls})
const getEpollsFailure = () => ({type: EPOLLS_GET_FAILURE})

export function getEpolls(n = 20) {
	return async (dispatch, getState) => {
		dispatch(getEpollsLocal(n))
		try {
			const epolls = await fetcher.get('/api/epolls', {n})
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
