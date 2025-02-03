import React from "react";
import { DateTime } from "luxon";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	CellRendererProps,
	ShowFilters,
	GlobalFilter,
	SplitPanel,
	Panel,
	TableColumnSelector,
	SplitPanelButton,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	sessionParticipationSelectors,
	sessionParticipationActions,
	selectSessionParticipationSelected,
	setSessionParticipationSelected,
	type MemberAttendances,
} from "@/store/sessionParticipation";
import { selectRecentSessions } from "@/store/sessions";
import { SessionAttendanceSummary } from "@/store/attendanceSummary";

import { renderNameAndEmail } from "../members/membersTableColumns";
import MemberDetail from "../members/MemberDetail";

const renderHeaderNameAndEmail = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="Name" label="Name" />
		<TableColumnHeader {...props} dataKey="Email" label="Email" />
	</>
);

const renderSessionAttendance = (
	notRelevant: boolean,
	attendance: SessionAttendanceSummary
) => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			alignItems: "flex-end",
			color: notRelevant ? "gray" : "unset",
		}}
	>
		<span>{(attendance.AttendancePercentage || 0).toFixed(1) + "%"}</span>
		<span>
			{attendance.DidAttend
				? "Did attend"
				: attendance.DidNotAttend
					? "Did not attend"
					: ""}
		</span>
	</div>
);

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

export const SessionParticipationTableActions = () => (
	<>
		<TableColumnSelector
			selectors={sessionParticipationSelectors}
			actions={sessionParticipationActions}
			columns={tableColumns}
		/>
		<SplitPanelButton
			selectors={sessionParticipationSelectors}
			actions={sessionParticipationActions}
		/>
	</>
);

function SessionParticipationTable() {
	const dispatch = useAppDispatch();

	const selected = useAppSelector(selectSessionParticipationSelected);
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
						DateTime.fromISO(session.startDate) <
							DateTime.fromISO(rowData.NonVoterDate);
					return attendance
						? renderSessionAttendance(notRelevant, attendance)
						: null;
				};
				const yearMonth = DateTime.fromISO(session.startDate).toFormat(
					"yyyy MMM"
				);
				const column = {
					key: "session_" + i,
					label:
						(session.type || "?").toLocaleUpperCase() +
						": " +
						yearMonth,
					width: 100,
					flexGrow: 1,
					flexShrink: 1,
					cellRenderer,
				};
				return column;
			})
		);
	}, [sessions]);

	return (
		<>
			<div
				style={{ display: "flex", width: "100%", alignItems: "center" }}
			>
				<ShowFilters
					selectors={sessionParticipationSelectors}
					actions={sessionParticipationActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={sessionParticipationSelectors}
					actions={sessionParticipationActions}
				/>
			</div>

			<SplitPanel
				selectors={sessionParticipationSelectors}
				actions={sessionParticipationActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={40}
						estimatedRowHeight={50}
						selectors={sessionParticipationSelectors}
						actions={sessionParticipationActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) =>
							dispatch(setSessionParticipationSelected(ids))
						}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}

export default SessionParticipationTable;
