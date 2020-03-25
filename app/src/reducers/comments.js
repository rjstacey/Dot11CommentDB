import {sortClick, sortData, filterValidate, filterData} from '../filter'
import {
	SET_COMMENTS_FILTER,
	SET_COMMENTS_SORT,
	SET_COMMENTS_SELECTED,
	SET_COMMENTS_EXPANDED,
	GET_COMMENTS,
	GET_COMMENTS_SUCCESS,
	GET_COMMENTS_FAILURE,
	DELETE_COMMENTS,
	DELETE_COMMENTS_SUCCESS,
	DELETE_COMMENTS_FAILURE,
	IMPORT_COMMENTS,
	IMPORT_COMMENTS_SUCCESS,
	IMPORT_COMMENTS_FAILURE,
	UPDATE_COMMENT,
	UPDATE_COMMENT_SUCCESS,
	UPDATE_COMMENT_FAILURE,
	ADD_RESOLUTIONS,
	ADD_RESOLUTIONS_SUCCESS,
	ADD_RESOLUTIONS_FAILURE,
	UPDATE_RESOLUTIONS,
	UPDATE_RESOLUTIONS_SUCCESS,
	UPDATE_RESOLUTIONS_FAILURE,
	DELETE_RESOLUTIONS,
	DELETE_RESOLUTIONS_SUCCESS,
	DELETE_RESOLUTIONS_FAILURE,
	UPLOAD_COMMENTS,
	UPLOAD_COMMENTS_SUCCESS,
	UPLOAD_COMMENTS_FAILURE
} from '../actions/comments'

const filterKeys = [
	'CID', 'CommenterName', 'Vote', 'MustSatisfy', 'Category', 'Clause', 'Page',
	'Comment', 'ProposedChange', 'CommentGroup', 'AssigneeName', 'Submission',
	'Resolution'
]

const defaultState = {
	ballotId: '',
	filters: filterKeys.reduce((obj, key) => ({...obj, [key]: filterValidate(key, '')}), {}),
	sortBy: [],
	sortDirection: {},
	selected: [],
	expanded: [],
	commentsValid: false,
	comments: [],
	commentsMap: [],
	getComments: false,
	updateComment: false,
	deleteComments: false,
	importComments: false,
	uploadComments: false,
	importCommentsCount: undefined
}

function updateSelected(comments, selected) {
	const newSelected = []
	for (let s of selected) {
		if (comments.find(c => c.CID === s)) {
			// Keep it if it matches a comment exactly
			newSelected.push(s)
		}
		else {
			// If it is just the comment ID, then keep CIDs for all those comments
			for (let c of comments) {
				if (s === c.CommentID.toString()) {
					newSelected.push(c.CID)
				}
			}
		}
	}
	return newSelected
}

function updateComments(comments, updatedComments) {
	/* Replace comments with the modified CommentID, maintaining increasing CommentID order */
	const cids = updatedComments.map(c => c.CommentID)
	return comments
		.filter(c => !cids.includes(c.CommentID))
		.concat(updatedComments)
		.sort((c1, c2) => c1.CommentID - c2.CommentID)
}

function getCommentStatus(c) {
	let Status = ''
	if (c.ApprovedByMotion) {
		Status = 'Resolution approved'
	}
	else if (c.ReadyForMotion) {
		Status = 'Ready for motion'
	}
	else if (c.ResnStatus) {
		Status = 'Resolution drafted'
	}
	else if (c.AssigneeName) {
		Status = 'Assigned'
	}
	return Status
}

function updateCommentsStatus(comments) {
	return comments.map(c => {
		const Status = getCommentStatus(c)
		return Status !== c.Status? {...c, Status}: c
	})
}

function comments(state = defaultState, action) {
	let newComments

	switch (action.type) {
		case SET_COMMENTS_SORT:
			const {sortBy, sortDirection} = sortClick(action.event, action.dataKey, state.sortBy, state.sortDirection)
			return {
				...state,
				sortBy,
				sortDirection,
				commentsMap: sortData(state.commentsMap, state.comments, sortBy, sortDirection)
			}
		case SET_COMMENTS_FILTER:
			const filters = {
				...state.filters,
				[action.dataKey]: filterValidate(action.dataKey, action.value)
			}
			return {
				...state,
				filters,
				commentsMap: sortData(filterData(state.comments, filters), state.comments, state.sortBy, state.sortDirection)
			}
		case SET_COMMENTS_SELECTED:
			return {
				...state,
				selected: updateSelected(state.comments, action.selected)
			}
		case SET_COMMENTS_EXPANDED:
			return {
				...state,
				expanded: action.expanded
			}
		case GET_COMMENTS:
			return {
				...state,
				getComments: true,
				ballotId: action.ballotId,
				commentsValid: false,
				comments: [],
				commentsMap: [],
				selected: state.ballotId !== action.ballotId? []: state.selected,
				expanded: state.ballotId !== action.ballotId? []: state.expanded
			}
		case GET_COMMENTS_SUCCESS:
			newComments = updateCommentsStatus(action.comments)
			return {
				...state,
				getComments: false,
				commentsValid: true,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection),
				selected: updateSelected(newComments, state.selected)
			}
		case GET_COMMENTS_FAILURE:
			return {...state, getComments: false}

		case UPDATE_COMMENT:
			if (state.ballotID !== action.comment.BallotID) {
				return {
					...state,
					updateComment: true,
				}
			}
			newComments = state.comments.map(c =>
				(c.CommentID === action.comment.CommentID)? {...c, ...action.comment}: c
				)
			return {
				...state,
				updateComment: true,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection)
			}
		case UPDATE_COMMENT_SUCCESS:
			return {...state, updateComment: false}
		case UPDATE_COMMENT_FAILURE:
			return {...state, updateComment: false}

		case DELETE_COMMENTS:
			return state.ballotId === action.ballotId? {
					...state,
					deleteComments: true,
					comments: [],
					commentsMap: [],
					selected: []
				}: {
					...state,
					deleteComments: true,
				}
		case DELETE_COMMENTS_SUCCESS:
			return {...state, deleteComments: false}
		case DELETE_COMMENTS_FAILURE:
			return {...state, deleteComments: false}

		case IMPORT_COMMENTS:
			return {...state, importComments: true}
		case IMPORT_COMMENTS_SUCCESS:
			if (action.ballotId !== state.ballotId) {
				return {...state, importComments: false}
			}
			newComments = updateCommentsStatus(action.comments)
			return {
				...state,
				importComments: false,
				commentsValid: true,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection),
				selected: updateSelected(newComments, state.selected)
			}
		case IMPORT_COMMENTS_FAILURE:
			return {...state, importComments: false}

		case UPLOAD_COMMENTS:
			return {...state, uploadComments: true}
		case UPLOAD_COMMENTS_SUCCESS:
			if (action.ballotId !== state.ballotId) {
				return {...state, uploadComments: false}
			}
			newComments = updateCommentsStatus(action.comments)
			return {
				...state,
				uploadComments: false,
				commentsValid: true,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection),
				selected: updateSelected(newComments, state.selected)
			}
		case UPLOAD_COMMENTS_FAILURE:
			return {...state, uploadComments: false}

		case ADD_RESOLUTIONS:
			return {...state, updateComment: true}
		case ADD_RESOLUTIONS_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}
			newComments = action.updatedComments.concat(action.newComments)
			newComments = updateCommentsStatus(newComments)
			newComments = updateComments(state.comments, newComments)
			return {
				...state,
				updateComment: false,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection),
				selected: updateSelected(newComments, state.selected)
			}
		case ADD_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		case UPDATE_RESOLUTIONS:
			return {...state, updateComment: true}
		case UPDATE_RESOLUTIONS_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}
			newComments = state.comments.map(c => {
				let r = action.resolutions.find(r => r.CommentID === c.CommentID && r.ResolutionID === c.ResolutionID)
				if (r) {
					r.Status = getCommentStatus(r)
					return {...c, ...r}
				}
				return c
			})
			return {
				...state,
				updateComment: false,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection),
			}
		case UPDATE_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		case DELETE_RESOLUTIONS:
			return {...state, updateComment: true}
		case DELETE_RESOLUTIONS_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}
			newComments = updateComments(state.comments, action.updatedComments)
			return {
				...state,
				updateComment: false,
				comments: newComments,
				commentsMap: sortData(filterData(newComments, state.filters), newComments, state.sortBy, state.sortDirection),
				selected: updateSelected(newComments, state.selected)
			}
		case DELETE_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		default:
			return state
	}
}

export default comments
