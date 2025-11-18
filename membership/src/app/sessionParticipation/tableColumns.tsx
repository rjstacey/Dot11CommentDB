import * as React from "react";
import { DateTime } from "luxon";
import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	CellRendererProps,
	TablesConfig,
	TableConfig,
} from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectRecentSessions } from "@/store/sessions";
import {
	sessionParticipationSelectors,
	sessionParticipationActions,
	type MemberAttendances,
} from "@/store/sessionParticipation";
import type { SessionAttendanceSummary } from "@/store/attendanceSummaries";
import {
	renderNameAndEmail,
	renderHeaderNameAndEmail,
} from "../members/tableColumns";

function renderSessionAttendance(
	notRelevant: boolean,
	attendance: SessionAttendanceSummary
) {
	const attendancePct = attendance.AttendancePercentage || 0;
	const pct = attendancePct.toFixed(1) + "%";
	const qualifies =
		(attendancePct >= 75 || attendance.DidAttend) &&
		!attendance.DidNotAttend;
	const color = notRelevant ? "gray" : qualifies ? "green" : "red";
	const prefixEl = attendance.DidAttend ? (
		<i className="bi-check-circle me-2" />
	) : attendance.DidNotAttend ? (
		<i className="bi-x-circle me-2" />
	) : null;
	return (
		<div
			style={{
				justifySelf: "flex-end",
				color,
			}}
		>
			{prefixEl}
			<span>{pct}</span>
		</div>
	);
}

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionParticipationSelectors}
				actions={sessionParticipationActions}
				{...p}
			/>
		),
	},
	{ key: "SAPIN", label: "SA PIN", width: 80, flexGrow: 1, flexShrink: 1 },
	{
		key: "Name",
		label: "Name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail,
	},
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "Status", label: "Status", width: 150, flexGrow: 1, flexShrink: 1 },
	{
		key: "ExpectedStatus",
		label: "Expected status",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Summary",
		label: "Summary",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
];

const lineTruncStyle: React.CSSProperties = {
	maxWidth: "100%",
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipses",
};

export function useTableColumns() {
	const sessions = useAppSelector(selectRecentSessions);

	const columns = React.useMemo(() => {
		return tableColumns.concat(
			sessions.map((session, i) => {
				const cellRenderer = ({
					rowData,
				}: CellRendererProps<MemberAttendances>) => {
					const attendance = rowData.sessionAttendanceSummaries.find(
						(a) => a.session_id === session.id
					);
					const notRelevant =
						!!rowData.NonVoterDate &&
						DateTime.fromISO(rowData.NonVoterDate) >
							DateTime.fromISO(session.endDate);
					return attendance
						? renderSessionAttendance(notRelevant, attendance)
						: null;
				};
				const yearMonth = DateTime.fromISO(session.startDate).toFormat(
					"yyyy MMM"
				);
				const identifier =
					session.type.toLocaleUpperCase() + ": " + yearMonth;
				const parts = session.name.split(",");
				const place = (parts.length > 1 ? parts[1] : parts[0]).trim();
				const label: React.ReactNode = (
					<>
						<span style={lineTruncStyle}>{identifier}</span>
						<br />
						<span style={lineTruncStyle}>{place}</span>
					</>
				);
				const column = {
					key: "session_" + i,
					label,
					width: 100,
					flexGrow: 1,
					flexShrink: 1,
					cellRenderer,
				};
				return column;
			})
		);
	}, [sessions]);

	return columns;
}

export function useDefaultTablesConfig() {
	const columns = useTableColumns();

	const defaultTablesConfig = React.useMemo(() => {
		const defaultTablesConfig: TablesConfig = {};
		const tableView = "default";
		const tableConfig: TableConfig = {
			fixed: false,
			columns: {},
		};
		for (const column of columns) {
			const key = column.key;
			tableConfig.columns[key] = {
				unselectable: key.startsWith("__"),
				shown: true,
				width: column.width || 200,
			};
		}
		defaultTablesConfig[tableView] = tableConfig;
		return defaultTablesConfig;
	}, [columns]);

	return defaultTablesConfig;
}
