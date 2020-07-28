import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {ActionButton} from '../general/Icons'
import AssigneeSelector from './AssigneeSelector'
import CommentGroupSelector from './CommentGroupSelector'
import {addResolutions, updateResolutions, updateComments} from '../actions/comments'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function BulkActions(props) {
	const {ballotId, comments, selected, updateComments, addResolutions, updateResolutions} = props
	const [assignee, setAssignee] = React.useState(0)
	const [commentGroup, setCommentGroup] = React.useState('')

	function assignSelected(field) {
		const a = [], u = []
		for (let cid of selected) {
			const c = comments.find(c => c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid)
			if (c) {
				let entry = {CommentID: c.CommentID, AssigneeSAPIN: assignee}
				if (c.ResolutionCount) {
					entry.ResolutionID = c.ResolutionID
					u.push(entry)
				}
				else {
					a.push(entry)
				}
			}
		}
		if (a.length) {
			addResolutions(ballotId, a)
		}
		if (u.length) {
			updateResolutions(ballotId, u)
		}
	}

	function groupSelected() {
		const u = []
		for (let cid of selected) {
			const c = comments.find(c => c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid)
			if (c && !u.find(u => c.CommentID === u.CommentID)) {
				u.push({CommentID: c.CommentID, CommentGroup: commentGroup})
			}
		}
		if (u.length) {
			updateComments(ballotId, u)
		}
	}

	function editSelected() {
		props.editSelected(selected)
	}

	const bulkActionsCss = css`
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		& > label {
			font-weight: bold;
		}
		& > span {
			margin-left: 10px;
		}`

	return (
		<div css={bulkActionsCss}>
			<label>Bulk Actions ({props.selected.length} Selected):</label>
			<span>
				<CommentGroupSelector
					style={{display: 'inline-block'}}
					value={commentGroup}
					onChange={setCommentGroup}
					placeholder='Select comment group'
				/>&nbsp;
				<ActionButton
					name='group'
					title='Group Selected'
					disabled={selected.length === 0}
					onClick={groupSelected}
				/>
			</span>
			<span>
				<AssigneeSelector
					style={{display: 'inline-block'}}
					value={assignee}
					onChange={setAssignee}
				/>&nbsp;
				<ActionButton
					name='assignment'
					title='Assign Selected'
					disabled={selected.length === 0}
					onClick={assignSelected}
				/>
			</span>

			<span>
				<ActionButton
					name='edit'
					title='Edit Selected'
					disabled={selected.length === 0}
					onClick={editSelected}
				/>
			</span>
		</div>
	)
}

BulkActions.propTypes = {
	ballotId: PropTypes.string.isRequired,
	selected: PropTypes.array.isRequired,
	comments: PropTypes.array.isRequired,
	editSelected: PropTypes.func.isRequired
}

export default connect(
	(state) => {
		const {comments} = state
		return {
			ballotId: comments.ballotId,
			selected: comments.selected,
			comments: comments.comments
		}
	},
	(dispatch, ownProps) => {
		return {
			addResolutions: (ballotId, resolutions) => dispatch(addResolutions(ballotId, resolutions)),
			updateResolutions: (ballotId, resolutions) => dispatch(updateResolutions(ballotId, resolutions)),
			updateComments: (ballotId, comments) => dispatch(updateComments(ballotId, comments))
		}
	}
)(BulkActions)