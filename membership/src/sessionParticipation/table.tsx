import * as React from "react";
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

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fields,
	setSelected,
	selectAttendancesState,
	selectAttendanceSessions,
	attendancesSelectors,
	attendancesActions,
	type MemberAttendances,
	type SessionAttendanceSummary,
} from "../store/sessionParticipation";

import { renderNameAndEmail } from "../members/table";
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
		<span>{attendance.AttendancePercentage.toFixed(1) + "%"}</span>
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
				selectors={attendancesSelectors}
				actions={attendancesActions}
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
			selectors={attendancesSelectors}
			actions={attendancesActions}
			columns={tableColumns}
		/>
		<SplitPanelButton
			selectors={attendancesSelectors}
			actions={attendancesActions}
		/>
	</>
);

function SessionParticipationTable() {
	const dispatch = useAppDispatch();

	const { selected } = useAppSelector(selectAttendancesState);
	const sessions = useAppSelector(selectAttendanceSessions);

	const columns = React.useMemo(() => {
		return tableColumns.concat(
			sessions.map((session, i) => {
				const cellRenderer = ({
					rowData,
				}: CellRendererProps<MemberAttendances>) => {
					const attendance = rowData.sessionAttendanceSummaries.find(
						(a: any) => a.session_id === session.id
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
					selectors={attendancesSelectors}
					actions={attendancesActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={attendancesSelectors}
					actions={attendancesActions}
				/>
			</div>

			<SplitPanel
				selectors={attendancesSelectors}
				actions={attendancesActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={40}
						estimatedRowHeight={50}
						selectors={attendancesSelectors}
						actions={attendancesActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) => dispatch(setSelected(ids))}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}

export default SessionParticipationTable;
