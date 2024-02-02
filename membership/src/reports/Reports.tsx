import * as React from "react";
import { useNavigate } from "react-router-dom";

import { ActionButton, Button } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	selectActiveMembersWithParticipationSummary,
	Member,
	type MemberWithParticipation,
} from "../store/members";

import styles from "./reports.module.css";

const Table = ({
	nCol,
	style,
	...props
}: { nCol: number } & React.ComponentProps<"table">) => (
	<table
		className={styles.table}
		style={{ ...style, gridTemplateColumns: `repeat(${nCol}, auto)` }}
		{...props}
	/>
);

function renderTable(tableData: TableData | null) {
	if (!tableData || tableData.values.length === 0) return <span>Empty</span>;
	const { headings, values } = tableData;

	const header = (
		<tr>
			{headings.map((d, i) => (
				<th key={i}>
					<span>{d}</span>
				</th>
			))}
		</tr>
	);
	const row = (r: string[], i: number) => (
		<tr key={i}>
			{r.map((d, i) => (
				<td key={i}>
					<span>{d}</span>
				</td>
			))}
		</tr>
	);
	return (
		<Table
			style={{ borderCollapse: "collapse" }}
			cellPadding="5"
			border={1}
			nCol={headings.length}
		>
			<thead>{header}</thead>
			<tbody>{values.map(row)}</tbody>
		</Table>
	);
}

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function renderTableToClipboard(tableData: TableData | null) {
	if (!tableData || tableData.values.length === 0) return;
	const { headings, values } = tableData;

	const header = `<tr>${headings.map((d) => `<th>${d}</th>`).join("")}</tr>`;
	const row = (r: string[]) =>
		`<tr>${r.map((d) => `<td>${d}</td>`).join("")}</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top; text-align: left;}
		</style>
		<table cellpadding="5" border="1">
			<thead>${header}</thead>
			<tbody>${values.map(row).join("")}</tbody>
		</table>`;

	copyHtmlToClipboard(table);
}

type TableData = {
	headings: string[];
	values: string[][];
};

function membersSummary(members: Member[]): TableData {
	const headings = ["Aspirants", "Potential Voters", "Voters", "ExOfficio"];
	let V = [0, 0, 0, 0];
	members.forEach((m) => {
		if (m.Status === "Aspirant") V[0]++;
		if (m.Status === "Potential Voter") V[1]++;
		if (m.Status === "Voter") V[2]++;
		if (m.Status === "ExOfficio") V[3]++;
	});
	let values = [V.map(String)];
	return { headings, values };
}

function membersPublic(members: Member[]): TableData {
	const headings = [
		"Family Name",
		"Given Name",
		"MI",
		"Affilitation",
		"Status",
	];
	const values = members.map((m) => [
		m.LastName,
		m.FirstName,
		m.MI,
		m.Affiliation,
		m.Status,
	]);
	return { headings, values };
}

function membersPrivate(members: MemberWithParticipation[]): TableData {
	const headings = [
		"Family Name",
		"Given Name",
		"MI",
		"Affilitation",
		"Status",
		"Session participation",
		"Ballot series participation",
	];
	const values = members
		.slice()
		.sort((m1, m2) => (m1.LastName || "").localeCompare(m2.LastName || ""))
		.map((m) => {
			return [
				m.LastName,
				m.FirstName,
				m.MI,
				m.Affiliation,
				m.Status,
				m.AttendancesSummary,
				m.BallotParticipationSummary,
			];
		});
	return { headings, values };
}

const reports = {
	"Members summary": membersSummary,
	"Members public list": membersPublic,
	"Members private list": membersPrivate,
} as const;
const reportsList = Object.keys(reports) as (keyof typeof reports)[];

function Reports() {
	const navigate = useNavigate();

	const members = useAppSelector(selectActiveMembersWithParticipationSummary);
	const [report, setReport] = React.useState<keyof typeof reports | null>(
		null
	);

	const refresh = () => {
		navigate(".", { replace: true });
	};

	const tableData: TableData | null = React.useMemo(() => {
		if (!report) return null;
		return reports[report](members);
	}, [members, report]);

	const ReportButton = ({
		report: thisReport,
		label,
	}: {
		report: keyof typeof reports;
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
			<div className="top-row justify-right">
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
			<div className={styles.body}>
				<div className={styles.selectCol}>
					<label>Select a report:</label>
					{reportsList.map((report) => (
						<ReportButton
							key={report}
							report={report}
							label={report}
						/>
					))}
				</div>
				<div className={styles.mainCol}>{renderTable(tableData)}</div>
				<div className={styles.actionsCol}>
					<ActionButton
						name="copy"
						onClick={() => renderTableToClipboard(tableData)}
					/>
				</div>
			</div>
		</>
	);
}

export default Reports;
