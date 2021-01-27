import sortReducer from './sort'
import {SORT_PREFIX, SORT_INIT, SortDirection} from '../actions/sort'
import {SortType} from '../lib/sort'

import filtersReducer from './filter'
import {FILTER_PREFIX, FILTER_INIT, FilterType} from '../actions/filter'

import {SELECT_PREFIX} from '../actions/select'
import selectReducer from './select'

import {EXPAND_PREFIX} from '../actions/expand'
import expandReducer from './expand'

import {UI_PREFIX} from '../actions/ui'
import uiReducer from './ui'

import {
	COMMENTS_GET,
	COMMENTS_GET_SUCCESS,
	COMMENTS_GET_FAILURE,
	COMMENTS_UPDATE,
	COMMENTS_UPDATE_SUCCESS,
	COMMENTS_UPDATE_FAILURE,
	COMMENTS_DELETE,
	COMMENTS_DELETE_SUCCESS,
	COMMENTS_DELETE_FAILURE,
	COMMENTS_IMPORT,
	COMMENTS_IMPORT_SUCCESS,
	COMMENTS_IMPORT_FAILURE,
	COMMENTS_UPLOAD,
	COMMENTS_UPLOAD_SUCCESS,
	COMMENTS_UPLOAD_FAILURE,
	ADD_RESOLUTIONS,
	ADD_RESOLUTIONS_SUCCESS,
	ADD_RESOLUTIONS_FAILURE,
	UPDATE_RESOLUTIONS,
	UPDATE_RESOLUTIONS_SUCCESS,
	UPDATE_RESOLUTIONS_FAILURE,
	DELETE_RESOLUTIONS,
	DELETE_RESOLUTIONS_SUCCESS,
	DELETE_RESOLUTIONS_FAILURE,
} from '../actions/comments'

const commentFields = {
	CID: 'CID',
	CommenterName: 'Commenter',
	Vote: 'Vote',
	MustSatisfy: 'Must Satisfy',
	Category: 'Category',
	Clause: 'Clause',
	Page: 'Page',
	Comment: 'Comment',
	ProposedChange: 'Proposed Change',
	AdHoc: 'Ad-hoc',
	CommentGroup: 'Group',
	AssigneeName: 'Assignee',
	Submission: 'Submission',
	Status: 'Status',
	ApprovedByMotion: 'Motion Number',
	ResnStatus: 'Resn Status',
	Resolution: 'Resolution',
	EditStatus: 'Editing Status',
	EditInDraft: 'In Draft',
	EditNotes: 'Editing Notes'
}

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = Object.keys(commentFields).reduce((entries, dataKey) => {
	let type, options
	switch (dataKey) {
		case 'CID':
			type = FilterType.NUMERIC
			break
		case 'Clause':
			type = FilterType.CLAUSE
			break
		case 'Page':
			type = FilterType.PAGE
			break
		case 'MustSatisfy':
			type = FilterType.NUMERIC
			options = [{value: 0, label: 'No'}, {value: 1, label: 'Yes'}]
			break;
		default:
			type = FilterType.STRING
	}
	return {...entries, [dataKey]: {type, options}}
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = Object.keys(commentFields).reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'CommentID':
		case 'CID':
		case 'Page':
			type = SortType.NUMERIC
			break
		case 'Clause':
			type = SortType.CLAUSE
			break
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


const updateComments = (comments, updatedComments) => (
	/* Replace comments with the modified CommentID, maintaining increasing CommentID order */
	comments
		.filter(c1 => !updatedComments.find(c2 => c2.comment_id === c1.comment_id))
		.concat(updatedComments)
		.sort((c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID)
)

function getCommentStatus(c) {
	let Status = ''
	if (c.ApprovedByMotion)
		Status = 'Resolution approved'
	else if (c.ReadyForMotion)
		Status = 'Ready for motion'
	else if (c.ResnStatus)
		Status = 'Resolution drafted'
	else if (c.AssigneeName)
		Status = 'Assigned'
	return Status
}

const updateCommentsStatus = (comments) => (
	comments.map(c => {
		const Status = getCommentStatus(c)
		return c.Status !== Status? {...c, Status}: c
	})
)

const defaultState = {
	ballotId: '',
	valid: false,
	loading: false,
	comments: [],
	updateComment: false,
	deleteComments: false,
	importComments: false,
	uploadComments: false,
}

function commentsReducer(state = defaultState, action) {
	let newComments

	switch (action.type) {

		case COMMENTS_GET:
			return {
				...state,
				ballotId: action.ballotId,
				loading: true,
				valid: false,
				comments: []
			}
		case COMMENTS_GET_SUCCESS:
			newComments = updateCommentsStatus(action.comments)
			return {
				...state,
				loading: false,
				valid: true,
				comments: newComments
			}
		case COMMENTS_GET_FAILURE:
			return {...state, loading: false}

		case COMMENTS_UPDATE:
			return {...state, updateComment: true}
		case COMMENTS_UPDATE_SUCCESS:
			newComments = state.comments.map(c1 => {
				const c2 = action.comments.find(c2 => c2.id === c1.id)
				return c2? {...c1, ...c2}: c1
			});
			newComments = updateCommentsStatus(newComments);
			return {
				...state,
				updateComment: false,
				comments: newComments
			}
		case COMMENTS_UPDATE_FAILURE:
			return {...state, updateComment: false}

		case COMMENTS_DELETE:
			return state.ballotId === action.ballotId? {
					...state,
					deleteComments: true,
					comments: [],
				}: {
					...state,
					deleteComments: true,
				}
		case COMMENTS_DELETE_SUCCESS:
			return {...state, deleteComments: false}
		case COMMENTS_DELETE_FAILURE:
			return {...state, deleteComments: false}

		case COMMENTS_IMPORT:
			return {...state, importComments: true}
		case COMMENTS_IMPORT_SUCCESS:
			if (action.ballotId !== state.ballotId) {
				return {...state, importComments: false}
			}
			newComments = updateCommentsStatus(action.comments)
			return {
				...state,
				importComments: false,
				valid: true,
				comments: newComments
			}
		case COMMENTS_IMPORT_FAILURE:
			return {...state, importComments: false}

		case COMMENTS_UPLOAD:
			return {...state, uploadComments: true}
		case COMMENTS_UPLOAD_SUCCESS:
			if (action.ballotId !== state.ballotId) {
				return {...state, uploadComments: false}
			}
			newComments = updateCommentsStatus(action.comments)
			return {
				...state,
				uploadComments: false,
				valid: true,
				comments: newComments
			}
		case COMMENTS_UPLOAD_FAILURE:
			return {...state, uploadComments: false}

		case ADD_RESOLUTIONS:
			return {...state, updateComment: true}
		case ADD_RESOLUTIONS_SUCCESS:
			// Concat new comments
			newComments = updateComments(state.comments, action.comments)
			newComments = updateCommentsStatus(newComments)
			return {
				...state,
				updateComment: false,
				comments: newComments,
			}
		case ADD_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		case UPDATE_RESOLUTIONS:
			return {...state, updateComment: true}
		case UPDATE_RESOLUTIONS_SUCCESS:
			newComments = state.comments.map(c1 => {
				const c2 = action.comments.find(c2 => c1.resolution_id === c2.resolution_id)
				return c2? {...c1, ...c2}: c1;
			})
			newComments = updateCommentsStatus(newComments)
			return {
				...state,
				updateComment: false,
				comments: newComments,
			}
		case UPDATE_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		case DELETE_RESOLUTIONS:
			return {
				...state,
				updateComment: true
			}
		case DELETE_RESOLUTIONS_SUCCESS:
			// Remove deleted comments
			newComments = updateComments(state.comments, action.comments)
			newComments = updateCommentsStatus(newComments)
			return {
				...state,
				updateComment: false,
				comments: newComments,
			}
		case DELETE_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		default:
			return state
	}
}

/*
 * Attach higher-order reducers
 */
const dataSet = 'comments'
const commentsReducerAll = (state, action) => {
	if (state === undefined) {
		return {
			...commentsReducer(undefined, {}),
			sort: sortReducer(undefined, {type: SORT_INIT, entries: defaultSortEntries}),
			filters: filtersReducer(undefined, {type: FILTER_INIT, entries: defaultFiltersEntries}),
			selected: selectReducer(undefined, {}),
			expanded: expandReducer(undefined, {}),
			ui: uiReducer(undefined, {})
		}
	}
	if (action.type.startsWith(SORT_PREFIX) && action.dataSet === dataSet) {
		const sort = sortReducer(state.sort, action);
		return {...state, sort}
	}
	else if (action.type.startsWith(FILTER_PREFIX) && action.dataSet === dataSet) {
		const filters = filtersReducer(state.filters, action);
		return {...state, filters}
	}
	else if (action.type.startsWith(SELECT_PREFIX) && action.dataSet === dataSet) {
		const selected = selectReducer(state.selected, action);
		return {...state, selected}
	}
	else if (action.type.startsWith(EXPAND_PREFIX) && action.dataSet === dataSet) {
		const expanded = expandReducer(state.expanded, action);
		return {...state, expanded}
	}
	else if (action.type.startsWith(UI_PREFIX) && action.dataSet === dataSet) {
		const ui = uiReducer(state.ui, action);
		return {...state, ui}
	}
	else {
		return commentsReducer(state, action)
	}
}

export default commentsReducerAll;