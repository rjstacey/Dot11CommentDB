import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import styled from '@emotion/styled'
import {connect} from 'react-redux'
import BallotSelector from '../ballots/BallotSelector'
import {setBallotId} from '../actions/ballots'
import {getComments} from '../actions/comments'

function countsByCategory(comments) {
	return {
		Total: comments.length,
		E: comments.filter(c => c.Category === 'E').length,
		T: comments.filter(c => c.Category === 'T').length,
		G: comments.filter(c => c.Category === 'G').length
	}
}

function countsByStatus(statusSet, comments) {
	const entry = {Total: comments.length}
	for (let status of statusSet) {
		entry[status] = comments.filter(c => c.Status === status).length
	}
	return entry;
}

function commentsByCommenter(comments) {
	const commentersSet = new Set(comments.map(c => c.CommenterName))
	const data = []
	for (let name of commentersSet) {
		data.push({
			Commenter: name || '(Blank)',
			...countsByCategory(comments.filter(c => c.CommenterName === name))
		})
	}
	return data;
}

function commentsByAssignee(comments) {
	const assigneeSet = new Set(comments.map(c => c.AssigneeName))
	const statusSet = new Set(comments.map(c => c.Status))
	const data = [];
	for (let name of assigneeSet) {
		const assigneeComments = comments.filter(c => c.AssigneeName === name)
		const entry ={
			Assignee: name || '(Blank)',
			...countsByStatus(statusSet, assigneeComments)
		}
		data.push(entry);
	}
	return data;
}

function commentsByAssigneeAndCommentGroup(comments) {
	const assigneeSet = new Set(comments.map(c => c.AssigneeName))
	const statusSet = new Set(comments.map(c => c.Status))
	const data = [];
	for (let name of assigneeSet) {
		const assigneeComments = comments.filter(c => c.AssigneeName === name)
		const entry ={
			Assignee: name || '(Blank)',
			'Comment Group': '',
			...countsByStatus(statusSet, assigneeComments)
		}
		data.push(entry)
		const commentGroupsSet = new Set(assigneeComments.map(c => c.CommentGroup))
		for (let group of commentGroupsSet) {
			const entry = {
				Assignee: '',
				'Comment Group': group || '(Blank)',
				...countsByStatus(statusSet, assigneeComments.filter(c => c.CommentGroup === group))
			}
			data.push(entry);
		}
	}
	return data;
}

const Table = styled.table`
	max-width: 800px;
	border-collapse: collapse;
	border: 1px solid grey;
	border-color: grey;
	th, td {
		border: 1px solid grey;
		padding: 5px;
	}
	td {
		vertical-align: top;
	}
`;

function renderTable(data, ref) {

	if (data.length === 0)
		return <span>Empty</span>

	const header = data.length > 0?
		<tr key={-1}>{Object.keys(data[0]).map((d, i) => <th key={i}>{d}</th>)}</tr>:
		null
	const row = (r, i) => <tr key={i}>{Object.values(r).map((d, i) => <td key={i}>{d}</td>)}</tr>

	return (
		<Table ref={ref}>
			<thead>
				{header}
			</thead>
			<tbody>
				{data.map(row)}
			</tbody>
		</Table>
	)
}

function Reports(props) {
	const history = useHistory();
	const {ballotId} = useParams();
	const [report, setReport] = React.useState('');
	const tableRef = React.useRef();

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get comments for this ballotId
				props.setBallotId(ballotId)
				props.getComments(ballotId)
			}
			else if (!props.loading && (!props.valid || props.commentBallotId !== ballotId)) {
				props.getComments(ballotId)
			}
		}
		else if (props.ballotId) {
			history.replace(`/Report/${props.ballotId}`)
		}
	}, [ballotId])

	const data = React.useMemo(() => {
		if (report === 'commentsbyassignee')
			return commentsByAssignee(props.comments)
		if (report === 'commentsbycommenter')
			return commentsByCommenter(props.comments)
		if (report === 'commentsbyassigneeandcommentgroup')
			return commentsByAssigneeAndCommentGroup(props.comments)
		return []
	}, [props.comments, report]);

	function ballotSelected(ballotId) {
		// Redirect to page with selected ballot
		history.push(`/Reports/${ballotId}`)
	}

	function copy() {
		if (tableRef.current) {
			var r = document.createRange();
			r.selectNode(tableRef.current);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(r);
			document.execCommand('copy');
			window.getSelection().removeAllRanges();
		}
	}

	const topRow = (
		<div style={{display: 'flex', justifyContent: 'space-between'}} >
			<BallotSelector onBallotSelected={ballotSelected} />
			<div>
				<button onClick={() => setReport('commentsbycommenter')}>Comments by Commenter</button>
				<button onClick={() => setReport('commentsbyassignee')}>Comments by Assignee</button>
				<button onClick={() => setReport('commentsbyassigneeandcommentgroup')}>Comments by Assignee and Comment Group</button>
				<button onClick={copy}>Copy</button>
			</div>
		</div>
	)

	return (
		<React.Fragment>
			{topRow}
			{renderTable(data, tableRef)}
		</React.Fragment>
	)
}

Reports.propTypes = {
	ballotId: PropTypes.string.isRequired,
	setBallotId: PropTypes.func.isRequired
}

const dataSet = 'comments'
export default connect(
	(state, ownProps) => ({
		ballotId: state.ballots.ballotId,
		commentsBallotId: state[dataSet].ballotId,
		valid: state[dataSet].valid,
		loading: state[dataSet].loading,
		comments: state[dataSet].comments
	}),
	(dispatch, ownProps) => ({
		setBallotId: ballotId => dispatch(setBallotId(ballotId)),
		getComments: ballotId => dispatch(getComments(ballotId)),
	})
)(Reports);