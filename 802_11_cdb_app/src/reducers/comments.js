
import {sortData, filterData} from '../filter';

const defaultState = {
	ballotId: '',
	filters: {},
	sortBy: [],
	sortDirection: {},
	commentData: [],
	commentDataMap: [],
	getComments: false,
	updateComment: false,
	deleteComments: false,
	importComments: false,
	importCommentsCount: undefined,
	errorMsgs: []
}

const comments = (state = defaultState, action) => {
	var newCommentData, newResolutions, errorMsgs;

	switch (action.type) {
		case 'SET_COMMENTS_SORT':
			return {
				...state,
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				commentDataMap: sortData(state.commentDataMap, state.commentData, action.sortBy, action.sortDirection)
			}
		case 'SET_COMMENTS_FILTERS':
			const filters = {...state.filters, ...action.filters};
			return {
				...state,
				filters,
				commentDataMap: sortData(filterData(state.commentData, filters), state.commentData, state.sortBy, state.sortDirection)
			}
		case 'GET_COMMENTS':
			return {
				...state,
				getComments: true,
				ballotId: action.ballotId,
				commentData: [],
				commentDataMap: []
			}
		case 'GET_COMMENTS_SUCCESS':
			return {
				...state,
				getComments: false,
				commentData: action.comments,
				commentDataMap: sortData(filterData(action.comments, state.filters), action.comments, state.sortBy, state.sortDirection)
			}
		case 'GET_COMMENTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				getComments: false,
				errorMsgs: errorMsgs
			}

		case 'DELETE_COMMENTS_WITH_BALLOTID':
			return state.ballotId === action.ballotId? {
					...state,
					deleteComments: true,
					commentData: [],
					commentDataMap: []
				}: {
					...state,
					deleteComments: true,
				}
		case 'DELETE_COMMENTS_WITH_BALLOTID_SUCCESS':
			return {...state, deleteComments: false}
		case 'DELETE_COMMENTS_WITH_BALLOTID_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				deleteComment: false,
				errorMsgs
			}

		case 'IMPORT_COMMENTS':
			return {
				...state,
				importComments: true,
				importCommentsCount: undefined
			}
		case 'IMPORT_COMMENTS_SUCCESS':
			return {
				...state,
				importComments: false,
				importCommentsCount: action.commentCount
			}
		case 'IMPORT_COMMENTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				importComments: false,
				errorMsgs
			}

		case 'UPDATE_COMMENT':
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
		case 'UPDATE_COMMENT_SUCCESS':
			return {...state, updateComment: false}
		case 'UPDATE_COMMENT_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				updateComment: false,
				errorMsgs
			}

		case 'UPDATE_RESOLUTION':
			return {...state, updateComment: true}
		case 'UPDATE_RESOLUTION_SUCCESS':
			if (state.ballotId !== action.resolution.BallotID) {
				return {...state, updateComment: false}
			}
			newCommentData = state.commentData.map(c => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.map(r => 
						(r.ResolutionID === action.resolution.ResolutionID)? {...r, ...action.resolution}: r
					)
					return {...c, resolutions: newResolutions}
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
		case 'UPDATE_RESOLUTION_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				updateComment: false,
				errorMsgs
			}

		case 'ADD_RESOLUTION':
			return {...state, updateComment: true}
		case 'ADD_RESOLUTION_SUCCESS':
			if (state.ballotId !== action.resolution.BallotID) {
				return {...state, updateComment: false}
			}
			newCommentData = state.commentData.map(c => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.slice()
					newResolutions.push(action.resolution)
					return {...c, resolutions: newResolutions}
				}
				else {
					return c
				}
			})
			return {
				...state,
				updateComment: false,
				commentData: newCommentData,
				commentDataMap: sortData(filterData(newCommentData, state.filters), newCommentData, state.sortBy, state.sortDirection)
			}
		case 'ADD_RESOLUTION_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				updateComment: false,
				errorMsgs
			}

		case 'DELETE_RESOLUTION':
			return {...state, updateComment: true}
		case 'DELETE_RESOLUTION_SUCCESS':
			if (state.ballotId !== action.resolution.BallotID) {
				return {...state, updateComment: false}
			}
			newCommentData = state.commentData.map((c, index) => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.filter(r => 
						(r.ResolutionID !== action.resolution.ResolutionID)
					)
					return {...c, resolutions: newResolutions}
				}
				else {
					return c
				}
			})
			return {
				...state,
				updateComment: false,
				commentData: newCommentData
			}
		case 'DELETE_RESOLUTION_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return {
				...state,
				updateComment: false,
				errorMsgs
			}

		case 'CLEAR_COMMENTS_ERROR':
			if (state.errorMsgs.length) {
				errorMsgs = state.errorMsgs.slice();
				errorMsgs.pop();
				return {...state, errorMsgs}
			}
			return state;

		default:
			return state
	}
}

export default comments
