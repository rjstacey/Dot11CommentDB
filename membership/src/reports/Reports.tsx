import React from "react";
import styled from "@emotion/styled";

import { ActionButton, Button } from "dot11-components";

import TopRow from "../components/TopRow";

import type { Dictionary, EntityId } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectMembersGroupName,
	selectActiveMembers,
	loadMembers,
	type Member,
} from "../store/members";
import {
	selectSessionIds,
	selectSessionEntities,
	type Session,
} from "../store/sessions";
import {
	MemberAttendances,
	selectAttendancesWithMembershipAndSummary,
} from "../store/sessionParticipation";

const Table = styled.table<{ nCol: number }>`
	display: grid;
	grid-template-columns: ${(props) => `repeat(${props.nCol}, auto)`};
	border-spacing: 1px;
	max-height: 100%;
	overflow: auto;

	thead,
	tbody,
	tr {
		display: contents;
	}

	th,
	td {
		padding: 10px;
		border: gray solid 1px;
		vertical-align: top;
	}

	th:first-of-type,
	td:first-of-type {
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
		align-items: center; // vertical
		justify-content: left; // horizontal
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
	const dispatch = useAppDispatch();
	const groupName = useAppSelector(selectMembersGroupName);
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
		if (groupName) {
			dispatch(loadMembers(groupName));
		}
	}

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
			<TopRow>
				<ActionButton name="refresh" title="Refresh" onClick={refresh} />
			</TopRow>
			<Body>
				<ReportSelectCol>
					<label>Select a report:</label>
					{reportsList.map((report) => (
						<ReportButton
							key={report}
							report={report}
							label={report}
						/>
					))}
				</ReportSelectCol>
				<ReportCol>{renderTable(tableData)}</ReportCol>
				<ReportCopyCol>
					<ActionButton
						name="copy"
						onClick={() => renderTableToClipboard(tableData)}
					/>
				</ReportCopyCol>
			</Body>
		</>
	);
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
