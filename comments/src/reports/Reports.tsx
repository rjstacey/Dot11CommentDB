import * as React from "react";

import { ActionButton, Button } from "dot11-components";

import ProjectBallotSelector from "../components/ProjectBallotSelector";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	loadComments,
	clearComments,
	selectCommentsState,
	selectCommentsBallot_id,
	getCID,
	getCommentStatus,
	commentStatusOrder,
	CommentResolution,
	getField,
} from "../store/comments";

import styles from "./reports.module.css";

type Counts = { [Label: string]: string | number };

function statusComp(status1: string, status2: string) {
	let n1 = (commentStatusOrder as readonly string[]).indexOf(status1);
	if (n1 < 0) n1 = commentStatusOrder.length;
	let n2 = (commentStatusOrder as readonly string[]).indexOf(status2);
	if (n2 < 0) n2 = commentStatusOrder.length;
	return n1 - n2;
}

function countsByCategory(comments: CommentResolution[]): Counts {
	return {
		Total: comments.length,
		E: comments.filter((c) => c.Category === "E").length,
		T: comments.filter((c) => c.Category === "T").length,
		G: comments.filter((c) => c.Category === "G").length,
	};
}

function countsByStatus(
	statusSet: string[],
	comments: CommentResolution[]
): Counts {
	const entry: Counts = { Total: comments.length };
	for (let status of statusSet)
		entry[status || "(Blank)"] = comments.filter(
			(c) => getField(c, "Status") === status
		).length;
	return entry;
}

function commentsByCommenter(comments: CommentResolution[]) {
	const commentersSet = [
		...new Set(comments.map((c) => c.CommenterName)),
	].sort();
	const data: Counts[] = [];
	for (let name of commentersSet) {
		data.push({
			Commenter: name || "(Blank)",
			...countsByCategory(
				comments.filter((c) => c.CommenterName === name)
			),
		});
	}
	return data;
}

function commentsByAssignee(comments: CommentResolution[]) {
	const assigneeSet = [
		...new Set(comments.map((c) => c.AssigneeName)),
	].sort();
	const statusSet = [
		...new Set(comments.map((c) => getField(c, "Status"))),
	].sort(statusComp);
	const data: Counts[] = [];
	for (let name of assigneeSet) {
		const assigneeComments = comments.filter(
			(c) => c.AssigneeName === name
		);
		const entry: Counts = {
			Assignee: name || "(Blank)",
			...countsByStatus(statusSet, assigneeComments),
		};
		data.push(entry);
	}
	return data;
}

function commentsByAssigneeAndCommentGroup(comments: CommentResolution[]) {
	const assigneeSet = [
		...new Set(comments.map((c) => c.AssigneeName)),
	].sort();
	const statusSet = [
		...new Set(comments.map((c) => getField(c, "Status"))),
	].sort(statusComp);
	const data: Counts[] = [];
	for (let name of assigneeSet) {
		const assigneeComments = comments.filter(
			(c) => c.AssigneeName === name
		);
		const entry: Counts = {
			Assignee: name || "(Blank)",
			"Comment Group": "",
			...countsByStatus(statusSet, assigneeComments),
		};
		data.push(entry);
		const commentGroupsSet = [
			...new Set(assigneeComments.map((c) => c.CommentGroup)),
		].sort();
		for (let group of commentGroupsSet) {
			const entry = {
				Assignee: "",
				"Comment Group": group || "(Blank)",
				...countsByStatus(
					statusSet,
					assigneeComments.filter((c) => c.CommentGroup === group)
				),
			};
			data.push(entry);
		}
	}
	return data;
}

function commentsByAdHocAndCommentGroup(comments: CommentResolution[]) {
	const adhocSet = [...new Set(comments.map((c) => c.AdHoc))].sort();
	const statusSet = [
		...new Set(comments.map((c) => getField(c, "Status"))),
	].sort(statusComp);
	const data: Counts[] = [];
	for (let name of adhocSet) {
		const adhocComments = comments.filter((c) => c.AdHoc === name);
		const entry: Counts = {
			"Ad-Hoc": name || "(Blank)",
			"Comment Group": "",
			...countsByStatus(statusSet, adhocComments),
		};
		data.push(entry);
		const commentGroupsSet = [
			...new Set(adhocComments.map((c) => c.CommentGroup)),
		].sort();
		for (let group of commentGroupsSet) {
			const entry = {
				Assignee: "",
				"Comment Group": group || "(Blank)",
				...countsByStatus(
					statusSet,
					adhocComments.filter((c) => c.CommentGroup === group)
				),
			};
			data.push(entry);
		}
	}
	return data;
}

const commentsReport = {
	"Comments by Commenter": commentsByCommenter,
	"Comments by Assignee": commentsByAssignee,
	"Comments by Assignee and Comment Group": commentsByAssigneeAndCommentGroup,
	"Comments by Ad-Hoc and Comment Group": commentsByAdHocAndCommentGroup,
} as const;

type Report = keyof typeof commentsReport;

function renderTable(data: Counts[]) {
	if (data.length === 0) return <span>Empty</span>;

	const nCol = Object.keys(data[0]).length;
	const header = (
		<tr>
			{Object.keys(data[0]).map((d, i) => (
				<th key={i}>
					<span>{d}</span>
				</th>
			))}
		</tr>
	);
	const row = (r: Counts, i: number) => (
		<tr key={i}>
			{Object.values(r).map((d, i) => (
				<td key={i}>
					<span>{d}</span>
				</td>
			))}
		</tr>
	);
	return (
		<table
			className={styles.table}
			style={{
				gridTemplateColumns: `repeat(${nCol}, auto)`,
				borderCollapse: "collapse",
			}}
			cellPadding="5"
			border={1}
		>
			<thead>{header}</thead>
			<tbody>{data.map(row)}</tbody>
		</table>
	);
}

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function renderTableToClipboard(data: Counts[]) {
	if (data.length === 0) return;

	const header = `<tr>${Object.keys(data[0])
		.map((d) => `<th>${d}</th>`)
		.join("")}</tr>`;
	const row = (r: Counts) =>
		`<tr>${Object.values(r)
			.map((d) => `<td>${d}</td>`)
			.join("")}</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top; text-align: right;}
		</style>
		<table cellpadding="5" border="1">
			<thead>${header}</thead>
			<tbody>${data.map(row).join("")}</tbody>
		</table>`;

	copyHtmlToClipboard(table);
}

function Reports() {
	const [report, setReport] = React.useState<Report | null>(null);

	const { ids, entities } = useAppSelector(selectCommentsState);

	const data: Counts[] = React.useMemo(() => {
		const comments = ids.map((id) => {
			const c = entities[id]!;
			return {
				...c,
				CID: getCID(c),
				Status: getCommentStatus(c),
			};
		});
		const generateReport = report ? commentsReport[report] : undefined;
		return generateReport ? generateReport(comments) : [];
	}, [ids, entities, report]);

	const ReportButton = ({
		report: thisReport,
		label,
	}: {
		report: Report;
		label: string;
	}) => (
		<Button
			onClick={() => setReport(thisReport)}
			isActive={thisReport === report}
		>
			{label}
		</Button>
	);

	return (
		<>
			<div className={styles.body}>
				<div className={styles.selectCol}>
					<label>Select a report:</label>
					{Object.keys(commentsReport).map((report) => (
						<ReportButton
							key={report}
							report={report as Report}
							label={report}
						/>
					))}
				</div>
				<div className={styles.mainCol}>{renderTable(data)}</div>
				<div className={styles.actionsCol}>
					<ActionButton
						name="copy"
						onClick={() => renderTableToClipboard(data)}
					/>
				</div>
			</div>
		</>
	);
}

export default Reports;
