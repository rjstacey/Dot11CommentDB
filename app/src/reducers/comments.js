import sortReducer, {SortType, SortDirection} from './sort'
import {SORT_PREFIX, SORT_INIT} from '../actions/sort'

import filtersReducer, {FilterType} from './filter'
import {FILTER_PREFIX, FILTER_INIT} from '../actions/filter'

import {SELECT_PREFIX} from '../actions/select'
import selectReducer from './select'

import {EXPAND_PREFIX} from '../actions/expand'
import expandReducer from './expand'

import {
	GET_COMMENTS,
	GET_COMMENTS_SUCCESS,
	GET_COMMENTS_FAILURE,
	DELETE_COMMENTS,
	DELETE_COMMENTS_SUCCESS,
	DELETE_COMMENTS_FAILURE,
	IMPORT_COMMENTS,
	IMPORT_COMMENTS_SUCCESS,
	IMPORT_COMMENTS_FAILURE,
	UPDATE_COMMENTS,
	UPDATE_COMMENTS_SUCCESS,
	UPDATE_COMMENTS_FAILURE,
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
 * Generate a list of unique value-label pairs for a particular field
 */
function genFieldOptions(dataKey, comments) {
	let options
	switch (dataKey) {
	case 'MustSatisfy':
		return [{value: 0, label: 'No'}, {value: 1, label: 'Yes'}]
	default:
		// return an array of unique values for dataKey, sorted, and value '' or null labeled '<blank>'
		options = [...new Set(comments.map(c => c[dataKey]))]	// array of unique values for dataKey
			.sort()
			.map(v => ({value: v, label: (v === null || v === '')? '<blank>': v}))
		return options
	}
}

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = Object.keys(commentFields).reduce((entries, dataKey) => {
	let type
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
		default:
			type = FilterType.STRING
	}
	return {...entries, [dataKey]: {type}}
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
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

const defaultState = {
	ballotId: '',
	commentsValid: false,
	comments: [],
	commentsMap: [],
	getComments: false,
	updateComment: false,
	deleteComments: false,
	importComments: false,
	uploadComments: false,
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

function updateCommentsStatus(comments, selected, expanded) {
	return comments.map(c => {
		const Status = getCommentStatus(c)
		return c.Status !== Status? {...c, Status}: c
	})
}

function commentsReducer(state = defaultState, action) {
	let newComments

	switch (action.type) {

		case GET_COMMENTS:
			return {
				...state,
				getComments: true,
				ballotId: action.ballotId,
				commentsValid: false,
				comments: [],
				selected: state.ballotId !== action.ballotId? []: state.selected,
				expanded: state.ballotId !== action.ballotId? []: state.expanded
			}
		case GET_COMMENTS_SUCCESS:
			newComments = updateCommentsStatus(action.comments, state.selected, state.expanded)
			return {
				...state,
				getComments: false,
				commentsValid: true,
				comments: newComments,
				selected: updateSelected(newComments, state.selected)
			}
		case GET_COMMENTS_FAILURE:
			return {...state, getComments: false}

		case UPDATE_COMMENTS:
			return {...state, updateComment: true}
		case UPDATE_COMMENTS_SUCCESS:
			if (state.ballotId !== action.ballotId) {
				return {...state, updateComment: false}
			}
			newComments = state.comments.map(c => {
				const i = action.commentIds.indexOf(c.CommentID)
				return (i === -1)? c: {...c, ...action.comments[i]}
			})
			newComments = newComments.map(c => ({Selected: !!c.Selected, ...c}))
			return {
				...state,
				updateComment: true,
				comments: newComments,
				//commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments)
			}
		case UPDATE_COMMENTS_FAILURE:
			return {...state, updateComment: false}

		case DELETE_COMMENTS:
			return state.ballotId === action.ballotId? {
					...state,
					deleteComments: true,
					comments: [],
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
			newComments = updateCommentsStatus(action.comments, state.selected, state.expanded)
			return {
				...state,
				importComments: false,
				commentsValid: true,
				comments: newComments,
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
			newComments = updateCommentsStatus(action.comments, state.selected, state.expanded)
			return {
				...state,
				uploadComments: false,
				commentsValid: true,
				comments: newComments,
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
			newComments = updateCommentsStatus(newComments, state.selected, state.expanded)
			return {
				...state,
				updateComment: false,
				comments: newComments,
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
				selected: updateSelected(newComments, state.selected)
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
export default (state, action) => {
	if (state === undefined) {
		return {
			...commentsReducer(undefined, {}),
			sort: sortReducer(undefined, {type: SORT_INIT, entries: defaultSortEntries}),
			filters: filtersReducer(undefined, {type: FILTER_INIT, entries: defaultFiltersEntries}),
			selected: selectReducer(undefined, {}),
			expanded: expandReducer(undefined, {})
		}
	}
	if (action.type.startsWith(SORT_PREFIX) && action.dataSet === 'comments') {
		const sort = sortReducer(state.sort, action);
		return {...state, sort}
	}
	else if (action.type.startsWith(FILTER_PREFIX) && action.dataSet === 'comments') {
		const filters = filtersReducer(state.filters, action);
		return {...state, filters}
	}
	else if (action.type.startsWith(SELECT_PREFIX) && action.dataSet === 'comments') {
		const selected = selectReducer(state.selected, action);
		return {...state, selected}
	}
	else if (action.type.startsWith(EXPAND_PREFIX) && action.dataSet === 'comments') {
		const expanded = expandReducer(state.expanded, action);
		return {...state, expanded}
	}
	else {
		return commentsReducer(state, action)
	}
}
