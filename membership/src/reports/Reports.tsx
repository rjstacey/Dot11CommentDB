import React from "react";
import { useNavigate } from "react-router-dom";

import { ActionButton, Button } from "dot11-components";

import type { Dictionary, EntityId } from "@reduxjs/toolkit";
import { useAppSelector } from "../store/hooks";
import { selectActiveMembers, type Member } from "../store/members";
import {
	selectSessionIds,
	selectSessionEntities,
	type Session,
} from "../store/sessions";
import {
	MemberAttendances,
	selectAttendancesWithMembershipAndSummary,
} from "../store/sessionParticipation";

import styles from "./reports.module.css";

const Table = ({ nCol, ...props }: { nCol: number } & React.ComponentProps<"table">) => (
	<table
		className={styles.table}
		style={{ gridTemplateColumns: `repeat(${nCol}, auto)` }}
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

function membersPrivate(
	members: Member[],
	attendanceEntities: Dictionary<MemberAttendances>,
	sessionIds: EntityId[],
	sessionEntities: Dictionary<Session>
): TableData {
	const headings = [
		"Family Name",
		"Given Name",
		"MI",
		"Affilitation",
		"Status",
		"Expires",
		"Meeting",
		"Last invalid ballot",
	];
	const values = members
		.slice()
		.sort((m1, m2) => (m1.LastName || "").localeCompare(m2.LastName || ""))
		.map((m) => {
			let expires = "",
				meeting = "";
			const a = attendanceEntities[m.SAPIN];
			if (a && a.LastSessionId) {
				let lastSession = sessionEntities[a.LastSessionId]!;
				const i =
					sessionIds.findIndex((id) => id === a.LastSessionId) -
					(lastSession.type === "p" ? 8 : 7);
				if (i >= 0) {
					let expiresSession = sessionEntities[sessionIds[i]]!;
					expires = `${expiresSession.number}${
						lastSession.type === "i" ? "*" : ""
					} (${expiresSession.startDate})`;
					meeting = expiresSession.name;
				}
			}
			return [
				m.LastName,
				m.FirstName,
				m.MI,
				m.Affiliation,
				m.Status,
				expires,
				meeting,
				"unknown",
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

	const members = useAppSelector(selectActiveMembers);
	const sessionEntities = useAppSelector(selectSessionEntities);
	const sessionIds = useAppSelector(selectSessionIds);
	const attendanceEntities = useAppSelector(
		selectAttendancesWithMembershipAndSummary
	);
	const [report, setReport] = React.useState<keyof typeof reports | null>(
		null
	);

	const refresh = () => {
		navigate(".", { replace: true });
	};

	const tableData: TableData | null = React.useMemo(() => {
		if (!report) return null;
		return reports[report](
			members,
			attendanceEntities,
			sessionIds,
			sessionEntities
		);
	}, [members, attendanceEntities, sessionIds, sessionEntities, report]);

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
