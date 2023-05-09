import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import {useDispatch, useSelector} from 'react-redux';
import copyToClipboard from 'copy-html-to-clipboard';

import {ActionButton, Button} from 'dot11-components';

import TopRow from '../components/TopRow';
import BallotSelector from '../components/BallotSelector';
import {loadComments, clearComments, selectCommentsState, getCID, getCommentStatus, CommentResolution, getField} from '../store/comments';
import {setBallotId, getCurrentBallot, selectBallotsState} from '../store/ballots';

const Table = styled.table`
	display: grid;
	grid-template-columns: auto auto auto auto auto;
	border-spacing: 1px;
	max-height: 100%;
	overflow: auto;

	thead, tbody, tr {
		display: contents;
	}

	th, td {
		padding: 10px;
		border: gray solid 1px;
		vertical-align: top;
	}

	th:first-of-type, td:first-of-type {
		grid-column: 1;
	}

	tr:first-of-type td {
		border-top: none;
	}

	tr:not(:last-of-type) td {
		border-bottom: none;
	}

	th:not(:last-of-type),
	td:not(:last-of-type) {
		border-right: none;
	}

	th {
		position: sticky;
		top: 0;
		background: #f6f6f6;
		text-align: left;
		font-weight: bold;
		font-size: 1rem;
	}

	td {
		display: flex;
		align-items: center;	// vertical
		justify-content: right;	// horizontal
		padding-top: 5px;
		padding-bottom: 5px;
	}

	td.empty {
		grid-column: 1 / -1;
		colspan: 0;
		color: gray;
		font-style: italic;
	}

	tr:nth-of-type(even) td {
		background: #fafafa;
	}
`;

type CountsByCategory = {
	Total: number;
	E: number;
	T: number;
	G: number;
}

function countsByCategory(comments: CommentResolution[]): CountsByCategory {
	return {
		Total: comments.length,
		E: comments.filter(c => c.Category === 'E').length,
		T: comments.filter(c => c.Category === 'T').length,
		G: comments.filter(c => c.Category === 'G').length
	}
}

type CountsByStatus = {
	Total: number;
	[ Status: string ]: number
}

function countsByStatus(statusSet: Set<string>, comments: CommentResolution[]): Counts {
	const entry: CountsByStatus = {Total: comments.length}
	for (let status of statusSet) {
		entry[status || '(Blank)'] = comments.filter(c => getField(c, 'Status') === status).length
	}
	return entry;
}

type CountsByCategoryByCommenter = CountsByCategory & {
	Commenter: string;
}

function commentsByCommenter(comments: CommentResolution[]) {
	const commentersSet = [...new Set(comments.map(c => c.CommenterName))].sort()
	const data: CountsByCategoryByCommenter[] = []
	for (let name of commentersSet) {
		data.push({
			Commenter: name || '(Blank)',
			...countsByCategory(comments.filter(c => c.CommenterName === name))
		})
	}
	return data;
}

type CountsByAssignee = CountsByStatus & {
	Assignee: string;
}

function commentsByAssignee(comments: CommentResolution[]) {
	const assigneeSet = [...new Set(comments.map(c => c.AssigneeName))].sort()
	const statusSet = new Set(comments.map(c => getField(c, 'Status')))
	const data: Counts[] = [];
	for (let name of assigneeSet) {
		const assigneeComments = comments.filter(c => c.AssigneeName === name)
		const entry: Counts = {
			Assignee: name || '(Blank)',
			...countsByStatus(statusSet, assigneeComments)
		}
		data.push(entry);
	}
	return data;
}

function commentsByAssigneeAndCommentGroup(comments: CommentResolution[]) {
	const assigneeSet = [...new Set(comments.map(c => c.AssigneeName))].sort()
	const statusSet = new Set(comments.map(c => getField(c, 'Status')))
	const data: Counts[] = [];
	for (let name of assigneeSet) {
		const assigneeComments = comments.filter(c => c.AssigneeName === name)
		const entry: Counts = {
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

type Counts = { [ S: string ]: string | number };

function commentsByAdHocAndCommentGroup(comments: CommentResolution[])  {
	const adhocSet = [...new Set(comments.map(c => c.AdHoc))].sort()
	const statusSet = new Set(comments.map(c => getField(c, 'Status')))
	const data: Counts[] = [];
	for (let name of adhocSet) {
		const adhocComments = comments.filter(c => c.AdHoc === name)
		const entry: Counts = {
			'Ad-Hoc': name || '(Blank)',
			'Comment Group': '',
			...countsByStatus(statusSet, adhocComments)
		}
		data.push(entry)
		const commentGroupsSet = [...new Set(adhocComments.map(c => c.CommentGroup))].sort()
		for (let group of commentGroupsSet) {
			const entry = {
				Assignee: '',
				'Comment Group': group || '(Blank)',
				...countsByStatus(statusSet, adhocComments.filter(c => c.CommentGroup === group))
			}
			data.push(entry);
		}
	}
	return data;
}

const commentsReport = {
	'Comments by Commenter': commentsByCommenter,
	'Comments by Assignee': commentsByAssignee,
	'Comments by Assignee and Comment Group': commentsByAssigneeAndCommentGroup,
	'Comments by Ad-Hoc and Comment Group': commentsByAdHocAndCommentGroup
}

function renderTable(data: Counts[], ref) {

	if (data.length === 0)
		return <span>Empty</span>

	const header = <tr>{Object.keys(data[0]).map((d, i) => <th key={i}><span>{d}</span></th>)}</tr>;
	const row = (r: Counts, i: number) => <tr key={i}>{Object.values(r).map((d, i) => <td key={i} ><span>{d}</span></td>)}</tr>;
	return (
		<Table style={{borderCollapse: 'collapse'}} cellPadding='5' border={1} ref={ref}>
			<thead>{header}</thead>
			<tbody>{data.map(row)}</tbody>
		</Table>
	)
}

function renderTableToClipboard(data: Counts[]) {

	if (data.length === 0)
		return;

	const header = `<tr>${Object.keys(data[0]).map((d) => `<th>${d}</th>`).join('')}</tr>`;
	const row = (r: Counts) => `<tr>${Object.values(r).map((d) => `<td>${d}</td>`).join('')}</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top; text-align: right;}
		</style>
		<table cellpadding="5" border="1">
			<thead>${header}</thead>
			<tbody>${data.map(row).join('')}</tbody>
		</table>`;
	copyToClipboard(table, {asHtml: true});
}

function Reports() {
	const navigate = useNavigate();
	const {ballotId} = useParams();
	const [report, setReport] = React.useState('');
	const tableRef = React.useRef();

	const {valid: ballotsValid, entities: ballotEntities} = useSelector(selectBallotsState);
	const currentBallot = useSelector(getCurrentBallot);
	const {loading, ballot_id: commentsBallot_id, ids, entities} = useSelector(selectCommentsState);

	const dispatch = useDispatch();

	React.useEffect(() => {
		if (ballotId) {
			if (!currentBallot || ballotId !== currentBallot.BallotID) {
				// Routed here with parameter ballotId specified, but not matching stored currentId; set the current ballot
				dispatch(setBallotId(ballotId));
			}
		}
		else if (currentBallot) {
			// Routed here with parameter ballotId unspecified, but current ballot has previously been selected; re-route to current ballot
			navigate(`/reports/${currentBallot.BallotID}`);
		}
	}, [dispatch, navigate, ballotId, ballotsValid, currentBallot]);

	React.useEffect(() => {
		if (!loading && currentBallot && commentsBallot_id !== currentBallot.id)
			dispatch(loadComments(currentBallot.id));
	}, [dispatch, currentBallot, commentsBallot_id, loading]);

	const onBallotSelected = (ballot_id) => {
		const ballot = ballotEntities[ballot_id];
		if (ballot)
			navigate(`/reports/${ballot.BallotID}`); // Redirect to page with selected ballot
		else
			dispatch(clearComments());
	}

	const data: Counts[] = React.useMemo(() => {
		const comments = ids.map(id => {
			const c = entities[id]!;
			return {
				...c,
				CID: getCID(c),
				Status: getCommentStatus(c)
			}
		});
		const generateReport = commentsReport[report];
		return generateReport? generateReport(comments): [];
	}, [ids, entities, report]);

	/*function copy() {
		if (tableRef.current) {
			var r = document.createRange();
			r.selectNode(tableRef.current);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(r);
			document.execCommand('copy');
			window.getSelection().removeAllRanges();
		}
	}*/

	const ReportButton = ({report: thisReport, label}) => 
		<Button
			onClick={() => setReport(thisReport)}
			isActive={thisReport === report}
		>
			{label}
		</Button>

	return (
		<>
			<TopRow>
				<BallotSelector onBallotSelected={onBallotSelected} />
			</TopRow>
			<Body>
				<ReportSelectCol>
					<label>Select a report:</label>
					{Object.keys(commentsReport).map(report => 
							<ReportButton
								report={report}
								label={report}
							/>
						)}
				</ReportSelectCol>
				<ReportCol>
					{renderTable(data, tableRef)}
				</ReportCol>
				<ReportCopyCol>
					<ActionButton name='copy' onClick={() => renderTableToClipboard(data)} />
				</ReportCopyCol>
			</Body>
		</>
	)
}

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
