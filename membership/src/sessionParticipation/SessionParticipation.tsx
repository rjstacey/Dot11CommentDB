import React from "react";
import { DateTime } from "luxon";
import { useNavigate } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	ActionButton,
	CellRendererProps,
	displayDateRange,
	ShowFilters,
	GlobalFilter,
	TableColumnSelector,
	SplitPanel,
	Panel,
	SplitPanelButton,
	DropdownRendererProps,
	Checkbox,
	Row,
	Form,
	FieldLeft,
	ActionButtonDropdown,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fields,
	importAttendances,
	selectAttendancesState,
	selectAttendanceSessions,
	attendancesSelectors,
	attendancesActions,
	type MemberAttendances,
	type SessionAttendanceSummary,
} from "../store/sessionParticipation";
import { type Session } from "../store/sessions";

import { renderNameAndEmail } from "../members/Members";
import MemberDetail from "../members/MemberDetail";
import BulkStatusUpdate from "./BulkStatusUpdate";

function ImportAttendanceForm({
	methods,
	session,
}: DropdownRendererProps & { session: Session }) {
	const dispatch = useAppDispatch();
	const [useDailyAttendance, setUseDailyAttendance] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	let warning: string | undefined;
	if (session.attendees) {
		warning =
			"Importing again will reset any overrides that were previously made for this session";
	}

	async function submit() {
		setBusy(true);
		await dispatch(importAttendances(session.id, useDailyAttendance));
		methods.close();
		setBusy(false);
	}

	return (
		<Form
			style={{ maxWidth: 350 }}
			title={`Import attenance for session ${
				session.number || `id=${session.id}`
			}`}
			cancel={methods.close}
			submit={submit}
			errorText={warning}
			busy={busy}
		>
			<Row>
				<FieldLeft label="IMAT spreadsheet:" />
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={!useDailyAttendance}
					onChange={() => setUseDailyAttendance(!useDailyAttendance)}
				/>
				<label>attendance summary</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={useDailyAttendance}
					onChange={() => setUseDailyAttendance(!useDailyAttendance)}
				/>
				<label>daily attendance</label>
			</Row>
		</Form>
	);
}

function SessionSummary() {
	const sessions = useAppSelector(selectAttendanceSessions);

	return (
		<>
			{sessions.map((session) => (
				<div
					key={session.id}
					style={{
						display: "flex",
						flexDirection: "column",
						flex: 1,
						overflow: "hidden",
					}}
				>
					<div>
						{session.number}{" "}
						{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
						{displayDateRange(session.startDate, session.endDate)}
					</div>
					<div
						style={{
							whiteSpace: "nowrap",
							textOverflow: "ellipsis",
							overflow: "hidden",
						}}
					>
						{session.name}
					</div>
					<div style={{ display: "flex" }}>
						<div>{`(${session.attendees} attendees)`}</div>
						<ActionButtonDropdown
							name="import"
							title="Import attendance summary"
							dropdownRenderer={(props) => (
								<ImportAttendanceForm
									{...props}
									session={session}
								/>
							)}
							portal={
								document.querySelector("#root") || undefined
							}
						/>
					</div>
				</div>
			))}
		</>
	);
}

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

function Attendances() {
	const navigate = useNavigate();
	const refresh = () => navigate(".", {replace: true});

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
			<div className="top-row">
				<SessionSummary />

				<div style={{ display: "flex" }}>
					<BulkStatusUpdate isSession={true} />
					<TableColumnSelector
						selectors={attendancesSelectors}
						actions={attendancesActions}
						columns={columns}
					/>
					<SplitPanelButton
						selectors={attendancesSelectors}
						actions={attendancesActions}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>

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
					<MemberDetail key={selected.join()} selected={selected} />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Attendances;
