import React from 'react';
import styled from '@emotion/styled';
//import copyToClipboard from 'copy-html-to-clipboard';

import {ActionButton, Button} from 'dot11-components';

import TopRow from '../components/TopRow';
import PathBallotSelector from '../components/PathBallotSelector';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentId } from '../store/ballots';
import {
	loadComments,
	clearComments,
	selectCommentsState,
	selectCommentsBallotId,
	getCID,
	getCommentStatus,
	CommentResolution,
	getField
} from '../store/comments';

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

type Counts = { [ Label: string ]: string | number };

type CountsByCategory = {
	Total: number;
	E: number;
	T: number;
	G: number;
}

function countsByCategory(comments: CommentResolution[]): Counts {
	return {
		Total: comments.length,
		E: comments.filter(c => c.Category === 'E').length,
		T: comments.filter(c => c.Category === 'T').length,
		G: comments.filter(c => c.Category === 'G').length
	}
}

function countsByStatus(statusSet: Set<string>, comments: CommentResolution[]): Counts {
	const entry: Counts = {Total: comments.length}
	for (let status of statusSet)
		entry[status || '(Blank)'] = comments.filter(c => getField(c, 'Status') === status).length
	return entry;
}

function commentsByCommenter(comments: CommentResolution[]) {
	const commentersSet = [...new Set(comments.map(c => c.CommenterName))].sort()
	const data: Counts[] = []
	for (let name of commentersSet) {
		data.push({
			Commenter: name || '(Blank)',
			...countsByCategory(comments.filter(c => c.CommenterName === name))
		})
	}
	return data;
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

function renderTable(data: Counts[]) {

	if (data.length === 0)
		return <span>Empty</span>

	const header = <tr>{Object.keys(data[0]).map((d, i) => <th key={i}><span>{d}</span></th>)}</tr>;
	const row = (r: Counts, i: number) => <tr key={i}>{Object.values(r).map((d, i) => <td key={i} ><span>{d}</span></td>)}</tr>;
	return (
		<Table style={{borderCollapse: 'collapse'}} cellPadding='5' border={1}>
			<thead>{header}</thead>
			<tbody>{data.map(row)}</tbody>
		</Table>
	)
}

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
    const blob = new Blob([html], {type});
    const data = [new ClipboardItem({[type]: blob})];
	navigator.clipboard.write(data);
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

	copyHtmlToClipboard(table);
}

function Reports() {
	const dispatch = useAppDispatch();
	const [report, setReport] = React.useState('');

	const {ids, entities} = useAppSelector(selectCommentsState);
	const commentsBallot_id = useAppSelector(selectCommentsBallotId);
	const currentBallot_id = useAppSelector(selectCurrentId);

	React.useEffect(() => {
		if (currentBallot_id && commentsBallot_id !== currentBallot_id)
			dispatch(loadComments(currentBallot_id));
		if (!currentBallot_id && commentsBallot_id)
			dispatch(clearComments());
	}, [dispatch, currentBallot_id, commentsBallot_id]);

	const onBallotSelected = (ballot_id: number | null) => dispatch(ballot_id? loadComments(ballot_id): clearComments());
	const refresh = () => dispatch(commentsBallot_id? loadComments(commentsBallot_id): clearComments());

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
				<PathBallotSelector onBallotSelected={onBallotSelected} />
			</TopRow>
			<Body>
				<ReportSelectCol>
					<label>Select a report:</label>
					{Object.keys(commentsReport).map(report => 
							<ReportButton
								key={report}
								report={report}
								label={report}
							/>
						)}
				</ReportSelectCol>
				<ReportCol>
					{renderTable(data)}
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
