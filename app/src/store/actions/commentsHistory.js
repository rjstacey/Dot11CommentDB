import {setError} from './error'
import fetcher from '../lib/fetcher'

export const COMMENTS_HISTORY_PREFIX = 'COMMENTS_HISTORY_'

export const COMMENTS_HISTORY_GET = COMMENTS_HISTORY_PREFIX + 'GET'
export const COMMENTS_HISTORY_GET_SUCCESS = COMMENTS_HISTORY_PREFIX + 'GET_SUCCESS'
export const COMMENTS_HISTORY_GET_FAILURE = COMMENTS_HISTORY_PREFIX + 'GET_FAILURE'

const getCommentsHistoryLocal = (comment_id) => ({type: COMMENTS_HISTORY_GET, comment_id})
const getCommentsHistorySuccess = (commentsHistory) => ({type: COMMENTS_HISTORY_GET_SUCCESS, commentsHistory})
const getCommentsHistoryFailure = () => ({type: COMMENTS_HISTORY_GET_FAILURE})

export function getCommentsHistory(comment) {
	return async (dispatch, getState) => {
		dispatch(getCommentsHistoryLocal(comment.comment_id));
		let response;
		try {
			response = await fetcher.get(`/api/commentsHistory/${comment.comment_id}`)
		}
		catch(error) {
			return Promise.all([
				dispatch(getCommentsHistoryFailure()),
				dispatch(setError(`Unable to get comments history for ${comment.CID}`, error))
			]);
		}
		return dispatch(getCommentsHistorySuccess(response.commentsHistory))
	}
}
