import PropTypes from 'prop-types';
import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import styled from '@emotion/styled';
import {useDispatch, useSelector} from 'react-redux';

import {ActionButton, Button} from 'dot11-components/form';

import BallotSelector from '../ballots/BallotSelector';
import {loadComments, clearComments, selectCommentsState, getCID, getCommentStatus} from '../store/comments';
import {setBallotId, loadBallots, getCurrentBallot, selectBallotsState} from '../store/ballots';

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
		entry[status || '(Blank)'] = comments.filter(c => c.Status === status).length
	}
	return entry;
}

function commentsByCommenter(comments) {
	const commentersSet = [...new Set(comments.map(c => c.CommenterName))].sort()
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
	const assigneeSet = [...new Set(comments.map(c => c.AssigneeName))].sort()
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
	const assigneeSet = [...new Set(comments.map(c => c.AssigneeName))].sort()
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
		const commentGroupsSet = [...new Set(assigneeComments.map(c => c.CommentGroup))].sort()
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

//const Table = styled.table`
const tableStyle = `
	table {
		border-collapse: collapse;
		border: 1px solid grey;
		border-color: grey;
		th, td {
			border: 1px solid grey;
			padding: 5px;
		}
		td {
			vertical-align: top;
			width: 100px;
		}
	}
`;

function renderTable(data, ref) {

	if (data.length === 0)
		return <span>Empty</span>

	const header = data.length > 0?
		<tr key={-1}>{Object.keys(data[0]).map((d, i) => <th key={i}>{d}</th>)}</tr>:
		null
	const row = (r, i) => <tr key={i}>{Object.values(r).map((d, i) => <td key={i} width='100px'>{d}</td>)}</tr>

	return (
		<table style={{borderCollapse: 'collapse'}} cellPadding='5' border='1' ref={ref}>
			<thead>
				{header}
			</thead>
			<tbody>
				{data.map(row)}
			</tbody>
		</table>
	)
}

function Reports() {
	const history = useHistory();
	const {ballotId} = useParams();
	const [report, setReport] = React.useState('');
	const tableRef = React.useRef();

	const {valid: ballotsValid, loading: ballotsLoading, entities: ballotEntities} = useSelector(selectBallotsState);
	const currentBallot = useSelector(getCurrentBallot);
	const {valid, loading, ballot: commentsBallot, ids, entities} = useSelector(selectCommentsState);

	const dispatch = useDispatch();
	const load = (ballot_id) => dispatch(loadComments(ballot_id));
	const clear = () => dispatch(clearComments());

	React.useEffect(() => {
		if (!ballotsValid && !ballotsLoading)
			dispatch(loadBallots());
	}, []);

	React.useEffect(() => {
		if (ballotId) {
			if (!currentBallot || ballotId !== currentBallot.BallotID) {
				// Routed here with parameter ballotId specified, but not matching stored currentId; set the current ballot
				dispatch(setBallotId(ballotId));
			}
		}
		else if (currentBallot) {
			// Routed here with parameter ballotId unspecified, but current ballot has previously been selected; re-route to current ballot
			history.replace(`/reports/${currentBallot.BallotID}`);
		}
	}, [ballotId, ballotsValid]);

	React.useEffect(() => {
		if (loading)
			return;
		if ((!commentsBallot && currentBallot) ||
		    (commentsBallot && currentBallot && commentsBallot.id !== currentBallot.id)) {
			load(currentBallot.id);
		}
	}, [currentBallot, commentsBallot]);

	const data = React.useMemo(() => {
		const comments = ids.map(id => {
			const c = entities[id];
			return {
				...c,
				CID: getCID(c),
				Status: getCommentStatus(c)
			}
		});
		if (report === 'commentsbyassignee')
			return commentsByAssignee(comments);
		if (report === 'commentsbycommenter')
			return commentsByCommenter(comments);
		if (report === 'commentsbyassigneeandcommentgroup')
			return commentsByAssigneeAndCommentGroup(comments);
		return [];
	}, [ids, entities, report]);

	const onBallotSelected = (ballot_id) => {
		const ballot = ballotEntities[ballot_id];
		if (ballot)
			history.push(`/reports/${ballot.BallotID}`); // Redirect to page with selected ballot
		else
			clear();
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

	const ReportButton = ({report: thisReport, label}) => 
		<Button
			onClick={() => setReport(thisReport)}
			isActive={thisReport === report}
		>
			{label}
		</Button>

	return (
		<>
			<ActionRow>
				<BallotSelector onBallotSelected={onBallotSelected} />
			</ActionRow>
			<Body>
				<ReportSelectCol>
					<label>Select a report:</label>
					<ReportButton
						report='commentsbycommenter'
						label='Comments by Commenter'
					/>
					<ReportButton
						report='commentsbyassignee'
						label='Comments by Assignee'
					/>
					<ReportButton
						report='commentsbyassigneeandcommentgroup'
						label='Comments by Assignee and Comment Group'
					/>
				</ReportSelectCol>
				<ReportCol>
					{renderTable(data, tableRef)}
				</ReportCol>
				<ReportCopyCol>
					<ActionButton name='copy' onClick={copy} />
				</ReportCopyCol>
			</Body>
		</>
	)
}

const ActionRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	max-width: 1400px;
	margin: 10px;
`;

const Body = styled.div`
	flex: 1;
	width: 100%;
	max-width: 1400px;
	display: flex;
	flex-direction: row;
	overflow: hidden;
`;

const ReportSelectCol = styled.div`
	flex: 0 0 200px;
	display: flex;
	flex-direction: column;
	padding: 0 20px;
	& label {
		font-weight: 700;
	}
	& :not(label) {
		margin: 10px 0;
	}
`;

const ReportCol = styled.div`
	max-height: 100%;
	overflow: auto;
`;

const ReportCopyCol = styled.div`
	flex: 0 0 fit-content;
	display: flex;
	flex-direction: column;
	padding: 0 20px;
`;

export default Reports;
