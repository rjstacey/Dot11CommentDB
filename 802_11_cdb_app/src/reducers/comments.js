
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
			return Object.assign({}, state, {
				sortBy: action.sortBy,
				sortDirection: action.sortDirection,
				commentDataMap: sortData(state.commentDataMap, state.commentData, state.sortBy, state.sortDirection)
			});
		case 'SET_COMMENTS_FILTER':
			const filters = Object.assign({}, state.filters, {[action.dataKey]: action.filter});
			return Object.assign({}, state, {
				filters,
				commentDataMap: sortData(filterData(state.commentData, filters), state.commentData, state.sortBy, state.sortDirection)
			});
		case 'GET_COMMENTS':
			return Object.assign({}, state, {
				getComments: true,
				ballotId: action.ballotId,
				commentData: [],
				commentDataMap: []
			})
		case 'GET_COMMENTS_SUCCESS':
			return Object.assign({}, state, {
				getComments: false,
				commentData: action.comments,
				commentDataMap: sortData(filterData(action.comments, state.filters), action.comments, state.sortBy, state.sortDirection)
			})
		case 'GET_COMMENTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				getComments: false,
				errorMsgs: errorMsgs
			});

		case 'DELETE_COMMENTS_WITH_BALLOTID':
			return Object.assign({}, state, {
				deleteComments: true,
			}, (state.ballotId === action.ballotId)? {commentData: [], commentDataMap: []}: null)
		case 'DELETE_COMMENTS_WITH_BALLOTID_SUCCESS':
			return Object.assign({}, state, {
				deleteComments: false,
				deleteCommentsError: false
			})
		case 'DELETE_COMMENTS_WITH_BALLOTID_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				deleteComment: false,
				errorMsgs: errorMsgs
			});

		case 'IMPORT_COMMENTS':
			return Object.assign({}, state, {
				importComments: true,
				importCommentsCount: undefined
			})
		case 'IMPORT_COMMENTS_SUCCESS':
			return Object.assign({}, state, {
				importComments: false,
				importCommentsCount: action.commentCount
			})
		case 'IMPORT_COMMENTS_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				importComments: false,
				errorMsgs: errorMsgs
			});

		case 'UPDATE_COMMENT':
			if (state.ballotID !== action.comment.BallotID) {
				return Object.assign({}, state, {
					updateComment: true,
				})
			}
			newCommentData = state.commentData.map(c =>
				(c.CommentID === action.comment.CommentID)? Object.assign({}, c, action.comment): c
				)
			return Object.assign({}, state, {
				updateComment: true,
				commentData: newCommentData
			})
		case 'UPDATE_COMMENT_SUCCESS':
			return Object.assign({}, state, {
				updateComment: false,
				updateCommentError: false
			})
		case 'UPDATE_COMMENT_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				updateComment: false,
				errorMsgs: errorMsgs
			});

		case 'UPDATE_RESOLUTION':
			if (state.ballotID !== action.resolution.BallotID) {
				return Object.assign({}, state, {
					updateComment: true,
				})
			}
			newCommentData = state.commentData.map(c => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.map(r => 
						(r.ResolutionID === action.resolution.ResolutionID)? Object.assign({}, r, action.resolution): r
						)
					return Object.assign({}, c, {resolutions: newResolutions})
				}
				else {
					return c
				}
			})
			return Object.assign({}, state, {
				updateComment: true,
				commentData: newCommentData
			})
		case 'UPDATE_RESOLUTION_SUCCESS':
			return Object.assign({}, state, {
				updateComment: false,
				updateCommentError: false
			})
		case 'UPDATE_RESOLUTION_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				updateComment: false,
				errorMsgs: errorMsgs
			});

		case 'ADD_RESOLUTION':
			if (state.ballotID !== action.resolution.BallotID) {
				return Object.assign({}, state, {
					updateComment: true,
				})
			}
			newCommentData = state.commentData.map((c, index) => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.slice()
					newResolutions.push({ResolutionID: index, ...action.resolution})
					return Object.assign({}, c, {resolutions: newResolutions})
				}
				else {
					return c
				}
			})
			return Object.assign({}, state, {
				updateComment: true,
				commentData: newCommentData
			})
		case 'ADD_RESOLUTION_SUCCESS':
			if (state.ballotID !== action.resolution.BallotID) {
				return Object.assign({}, state, {
					updateComment: false,
					updateCommentError: false,
				})
			}
			newCommentData = state.commentData.map(c => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.slice()
					newResolutions.push(action.resolution)
					return Object.assign({}, c, {resolutions: newResolutions})
				}
				else {
					return c
				}
			})
			return Object.assign({}, state, {
				updateComment: false,
				commentData: newCommentData
			})
		case 'ADD_RESOLUTION_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				updateComment: false,
				errorMsgs: errorMsgs
			});

		case 'DELETE_RESOLUTION':
			return Object.assign({}, state, {
				updateComment: true,
				updateCommentError: false
			})
		case 'DELETE_RESOLUTION_SUCCESS':
			newCommentData = state.commentData.map((c, index) => {
				if (c.CommentID === action.resolution.CommentID) {
					newResolutions = c.resolutions.filter(r => 
						(r.ResolutionID !== action.data.ResolutionID)
						)
					return Object.assign({}, c, {resolutions: newResolutions})
				}
				else {
					return c
				}
			})
			return Object.assign({}, state, {
				updateComment: false,
				updateCommentError: false,
				commentData: newCommentData
			})
		case 'DELETE_RESOLUTION_FAILURE':
			errorMsgs = state.errorMsgs.slice();
			errorMsgs.push(action.errMsg);
			return Object.assign({}, state, {
				updateComment: false,
				errorMsgs: errorMsgs
			});

		case 'CLEAR_COMMENTS_ERROR':
			if (state.errorMsgs.length) {
				errorMsgs = state.errorMsgs.slice();
				errorMsgs.pop();
				return Object.assign({}, state, {errorMsgs: errorMsgs})
			}
			return state;

		default:
			return state
	}
}

export default comments
