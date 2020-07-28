import {FilterType, filterCreate, filterSetValue, filterData} from './filter'
import {SortType, sortCreate, sortAddColumn, sortClick, sortData} from './sort'
import {
	SET_COMMENTS_FILTER,
	CLEAR_COMMENTS_FILTERS,
	GEN_COMMENTS_OPTIONS,
	SET_COMMENTS_SORT,
	SET_COMMENTS_SELECTED,
	TOGGLE_COMMENTS_SELECTED,
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
	switch (dataKey) {
	case 'MustSatisfy':
		return [{value: 0, label: 'No'}, {value: 1, label: 'Yes'}]
	default:
		return [...new Set(comments.map(c => c[dataKey]))]
			.sort()
			.map(v => ({value: v, label: v === ''? '<blank>': v}))
	}
}

/*
 * Generate a filter for each field (table column)
 */
function genDefaultFilters() {
	let filters = {}
	for (let dataKey of Object.keys(commentFields)) {
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
		filters[dataKey] = filterCreate(type)
	}
	return filters
}

function genDefaultSort() {
	let sort = sortCreate()
	for (let dataKey of Object.keys(commentFields)) {
		let type
		switch (dataKey) {
		case 'SAPIN':
		case 'Access':
			type = SortType.NUMERIC
			break
		default:
			type = SortType.STRING
		}
		sortAddColumn(sort, dataKey, type)
	}
	return sort
}

const defaultState = {
	ballotId: '',
	filters: genDefaultFilters(),
	options: Object.keys(commentFields).reduce((options, dataKey) => ({...options, [dataKey]: []}), {}),
	sort: genDefaultSort(),
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

function updateCommentsStatusSelected(comments, selected) {
	return comments.map(c => {
		const Status = getCommentStatus(c)
		const Selected = selected.includes(c.CID) || selected.includes(c.CommentID.toString())
		return (c.Status !== Status || c.Selected !== Selected)? {...c, Status, Selected}: c
	})
}

function comments(state = defaultState, action) {
	let newComments, newSelected, filters

	switch (action.type) {
		case SET_COMMENTS_FILTER:
			filters = {
				...state.filters,
				[action.dataKey]: filterSetValue(state.filters[action.dataKey], action.value)
			}
			return {
				...state,
				filters,
				commentsMap: sortData(state.sort, filterData(state.comments, filters), state.comments)
			}
		case CLEAR_COMMENTS_FILTERS:
			filters = {}
			for (let dataKey in state.filters) {
				filters[dataKey] = filterSetValue(state.filters[dataKey], '')
			}
			return {
				...state,
				filters,
				commentsMap: sortData(state.sort, filterData(state.comments, filters), state.comments)
			}
		case GEN_COMMENTS_OPTIONS:
			const fieldOptions = genFieldOptions(action.dataKey, state.comments)
			return {
				...state,
				options: {...state.options, [action.dataKey]: fieldOptions}
			}
		case SET_COMMENTS_SORT:
			const sort = sortClick(state.sort, action.dataKey, action.event)
			return {
				...state,
				sort,
				commentsMap: sortData(sort, state.commentsMap, state.comments)
			}

		case SET_COMMENTS_SELECTED:
			newSelected = updateSelected(state.comments, action.selected)
			return {
				...state,
				comments: updateCommentsStatusSelected(state.comments, newSelected),
				selected: newSelected
			}
		case TOGGLE_COMMENTS_SELECTED:
			newSelected = state.selected.slice()
			for (let s of action.selected) {
				const i = newSelected.indexOf(s)
				if (i >= 0) {
					newSelected.splice(i, 1)
				}
				else {
					newSelected = newSelected.concat([s])
				}
				
			}
			console.log(state.selected, newSelected)
			//newSelected = updateSelected(state.comments, newSelected)
			return {
				...state,
				comments: updateCommentsStatusSelected(state.comments, newSelected),
				selected: newSelected
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
			newComments = updateCommentsStatusSelected(action.comments, state.selected)
			return {
				...state,
				getComments: false,
				commentsValid: true,
				comments: newComments,
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments),
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
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments)
			}
		case UPDATE_COMMENTS_FAILURE:
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
			newComments = updateCommentsStatusSelected(action.comments, state.selected)
			return {
				...state,
				importComments: false,
				commentsValid: true,
				comments: newComments,
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments),
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
			newComments = updateCommentsStatusSelected(action.comments, state.selected)
			return {
				...state,
				uploadComments: false,
				commentsValid: true,
				comments: newComments,
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments),
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
			newComments = updateCommentsStatusSelected(newComments, state.selected)
			return {
				...state,
				updateComment: false,
				comments: newComments,
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments),
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
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments),
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
				commentsMap: sortData(state.sort, filterData(newComments, state.filters), newComments),
				selected: updateSelected(newComments, state.selected)
			}
		case DELETE_RESOLUTIONS_FAILURE:
			return {...state, updateComment: false}

		default:
			return state
	}
}

export default comments
