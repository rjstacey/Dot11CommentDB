import {sortData, filterData} from '../filter'
import {
	SET_COMMENTS_FILTERS,
	SET_COMMENTS_SORT,
	GET_COMMENTS,
	GET_COMMENTS_SUCCESS,
	GET_COMMENTS_FAILURE,
	DELETE_COMMENTS_WITH_BALLOTID,
	DELETE_COMMENTS_WITH_BALLOTID_SUCCESS,
	DELETE_COMMENTS_WITH_BALLOTID_FAILURE,
	IMPORT_COMMENTS,
	IMPORT_COMMENTS_SUCCESS,
	IMPORT_COMMENTS_FAILURE,
	UPDATE_COMMENT,
	UPDATE_COMMENT_SUCCESS,
	UPDATE_COMMENT_FAILURE,
	ADD_RESOLUTION,
	ADD_RESOLUTION_SUCCESS,
	ADD_RESOLUTION_FAILURE,
	UPDATE_RESOLUTIONS,
	UPDATE_RESOLUTIONS_SUCCESS,
	UPDATE_RESOLUTIONS_FAILURE,
	DELETE_RESOLUTION,
	DELETE_RESOLUTION_SUCCESS,
	DELETE_RESOLUTION_FAILURE,
	UPLOAD_COMMENTS,
	UPLOAD_COMMENTS_SUCCESS,
	UPLOAD_COMMENTS_FAILURE,
	UPLOAD_RESOLUTIONS,
	UPLOAD_RESOLUTIONS_SUCCESS,
	UPLOAD_RESOLUTIONS_FAILURE
} from '../actions/comments'

const defaultState = {
	ballotId: '',
	filters: {},
	sortBy: [],
	sortDirection: {},
	commentDataValid: false,
	commentData: [],
	commentDataMap: [],
	getComments: false,
	updateComment: false,
	deleteComments: false,
	importComments: false,
	uploadComments: false,
	importCommentsCount: undefined
}

const comments = (state = defaultState, action) => {
	var newCommentData;

	switch (action.type) {
		case SET_COMMENTS_SORT:
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				commentDataMap: sortData(state.commentDataMap, state.commentData, action.sortBy, action.sortDirection)
			}
		case SET_COMMENTS_FILTERS:
			const filters = {...state.filters, ...action.filters};
			return {
				...state,
				filters,
				commentDataMap: sortData(filterData(state.commentData, filters), state.commentData, state.sortBy, state.sortDirection)
			}
		case GET_COMMENTS:
			return {
				...state,
				getComments: true,
				ballotId: action.ballotId,
				commentDataValid: false,
				commentData: [],
				commentDataMap: []
			}
		case GET_COMMENTS_SUCCESS:
			return {
				...state,
				getComments: false,
				commentDataValid: true,
				commentData: action.comments,
				commentDataMap: sortData(filterData(action.comments, state.filters), action.comments, state.sortBy, state.sortDirection)
			}
		case GET_COMMENTS_FAILURE:
			return {...state, getComments: false}

		case DELETE_COMMENTS_WITH_BALLOTID:
			return state.ballotId === action.ballotId? {
					...state,
					deleteComments: true,
					commentData: [],
					commentDataMap: []
				}: {
					...state,
					deleteComments: true,
				}
		case DELETE_COMMENTS_WITH_BALLOTID_SUCCESS:
			return {...state, deleteComments: false}
		case DELETE_COMMENTS_WITH_BALLOTID_FAILURE:
			return {...state, deleteComments: false}

		case IMPORT_COMMENTS:
			return {
				...state,
				importComments: true,
				importCommentsCount: undefined
			}
		case IMPORT_COMMENTS_SUCCESS:
			return {
				...state,
				importComments: false,
				importCommentsCount: action.commentCount
			}
		case IMPORT_COMMENTS_FAILURE:
			return {...state, importComments: false}
		case UPLOAD_COMMENTS:
			return {...state, uploadComments: true}
		case UPLOAD_COMMENTS_SUCCESS:
			if (action.ballotId !== state.ballotId) {
				return {
					...state,
					uploadComments: false
				}
			}
			return {
				...state,
				uploadComments: false,
				commentDataValid: true,
				commentData: action.comments,
				commentDataMap: sortData(filterData(action.comments, state.filters), action.comments, state.sortBy, state.sortDirection)
			}
		case UPLOAD_COMMENTS_FAILURE:
			return {...state, uploadComments: false}

		case UPDATE_COMMENT:
			if (state.ballotID !== action.comment.BallotID) {
				return {
					...state,
					updateComment: true,
				}
			}
			newCommentData = state.commentData.map(c =>
				(c.CommentID === action.comment.CommentID)? {...c, ...action.comment}: c
				)
			return {
				...state,
				updateComment: true,
				commentData: newCommentData,
				commentDataMap: sortData(filterData(newCommentData, state.filters), newCommentData, state.sortBy, state.sortDirection)
			}
		case UPDATE_COMMENT_SUCCESS:
			return {...state, updateComment: false}
		case UPDATE_COMMENT_FAILURE:
			return {...state, updateComment: false}

		case UPDATE_RESOLUTIONS:
			return {...state, updateComment: true}
		case UPDATE_RESOLUTIONS_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}
			newCommentData = state.commentData.map(c => {
				const r = action.resolutions.find(r => r.CommentID === c.CommentID && r.ResolutionID === c.ResolutionID)
				if (r) {
					console.log('updated with ', r)
					return {...c, ...r}
				}
				else {
					return c
				}
			});
			return {
				...state,
				updateComment: false,
				commentData: newCommentData,
				commentDataMap: sortData(filterData(newCommentData, state.filters), newCommentData, state.sortBy, state.sortDirection)
			}
		case UPDATE_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		case ADD_RESOLUTION:
			return {...state, updateComment: true}
		case ADD_RESOLUTION_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}

			/* Replace comments with the modified CommentID, maintaining increasing CommentID order */
			newCommentData = state.commentData
								.filter(c => Math.floor(c.CommentID) !== action.commentId)
								.concat(action.updatedComments)
								.sort((c1, c2) => c1.CommentID - c2.CommentID)
			return {
				...state,
				updateComment: false,
				commentData: newCommentData,
				commentDataMap: sortData(filterData(newCommentData, state.filters), newCommentData, state.sortBy, state.sortDirection)
			}
		case ADD_RESOLUTION_FAILURE:
			return {...state, updateComment: false}

		case DELETE_RESOLUTION:
			return {...state, updateComment: true}
		case DELETE_RESOLUTION_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}
			/* Replace comments with the modified CommentID, maintaining increasing CommentID order */
			newCommentData = state.commentData
								.filter(c => Math.floor(c.CommentID) !== action.commentId)
								.concat(action.updatedComments)
								.sort((c1, c2) => c1.CommentID - c2.CommentID)
			return {
				...state,
				updateComment: false,
				commentData: newCommentData,
				commentDataMap: sortData(filterData(newCommentData, state.filters), newCommentData, state.sortBy, state.sortDirection)
			}
		case DELETE_RESOLUTION_FAILURE:
			return {...state, updateComment: false}

		default:
			return state
	}
}

export default comments
