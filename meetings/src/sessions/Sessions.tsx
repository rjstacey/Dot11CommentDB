import { useNavigate, useParams } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnSelector,
	TableColumnHeader,
	ButtonGroup,
	TableViewSelector,
	SplitPanelButton,
	SplitPanel,
	Panel,
	ConfirmModal,
	ActionButton,
	displayDateRange,
	HeaderCellRendererProps,
	CellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fields,
	deleteSessions,
	selectSessionsState,
	sessionsSelectors,
	sessionsActions,
	displaySessionType,
} from "../store/sessions";

import SessionDetails from "./SessionDetails";

const renderHeaderStartEnd = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="startDate" label="Start" />
		<TableColumnHeader {...props} dataKey="endDate" label="End" />
	</>
);

export const renderCellStartEnd = ({ rowData }: CellRendererProps) =>
	displayDateRange(rowData.startDate, rowData.endDate);

const FlexRow = ({ style, ...props }: React.ComponentProps<"div">) => (
	<div
		style={{ ...style, display: "flex", alignItems: "center" }}
		{...props}
	/>
);

const renderHeaderSessionSummary = (props: HeaderCellRendererProps) => (
	<>
		<FlexRow>
			<TableColumnHeader
				{...props}
				style={{ width: 100, marginRight: 10 }}
				dataKey="number"
				label="Number"
			/>
			<TableColumnHeader
				{...props}
				style={{ width: 60, marginRight: 10 }}
				dataKey="type"
				label="Type"
			/>
			<TableColumnHeader
				{...props}
				style={{ width: 60, marginRight: 10 }}
				dataKey="startDate"
				label="Start"
			/>
			<TableColumnHeader
				{...props}
				style={{ width: 60 }}
				dataKey="endDate"
				label="End"
			/>
		</FlexRow>
		<FlexRow>
			<TableColumnHeader
				{...props}
				style={{ width: 90 }}
				dataKey="name"
				label="Name"
			/>
		</FlexRow>
	</>
);

const renderCellSessionSummary = ({ rowData: session }: CellRendererProps) => (
	<>
		<FlexRow>
			{session.number +
				" " +
				displaySessionType(session.type) +
				", " +
				displayDateRange(session.startDate, session.endDate)}
		</FlexRow>
		<FlexRow style={{ fontStyle: "italic" }}>{session.name}</FlexRow>
	</>
);

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionsSelectors}
				actions={sessionsActions}
				{...p}
			/>
		),
	},
	{
		key: "id",
		...fields.id,
		width: 60,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
	{
		key: "startDate",
		...fields.startDate,
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "endDate",
		...fields.endDate,
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "start/end",
		label: "Start/End",
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderStartEnd,
		cellRenderer: renderCellStartEnd,
	},
	{ key: "number", label: "Number", width: 80, flexGrow: 1, flexShrink: 1 },
	{ key: "name", label: "Name", width: 300, flexGrow: 1, flexShrink: 1 },
	{ key: "type", ...fields.type, width: 80, flexGrow: 1, flexShrink: 1 },
	{
		key: "summary",
		label: "Summary",
		width: 500,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderSessionSummary,
		cellRenderer: renderCellSessionSummary,
	},
	{
		key: "timezone",
		label: "Time zone",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "groupName",
		...fields.groupName,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "imatMeetingId",
		...fields.imatMeetingId,
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
];

const defaultTablesColumns = {
	Summary: ["__ctrl__", "summary", "groupName", "timezone", "Attendance"],
	Detail: [
		"__ctrl__",
		"start/end",
		"number",
		"name",
		"type",
		"groupName",
		"timezone",
		"Attendance",
	],
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {},
	};
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith("__"),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200,
		};
	}
	defaultTablesConfig[tableView] = tableConfig;
}

function Sessions() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName } = useParams();

	const { selected } = useAppSelector(selectSessionsState);

	const refresh = () => navigate(".", { replace: true });
	const showImatMeetings = () => navigate(`/${groupName}/imatMeetings`);

	const handleRemoveSelected = async () => {
		if (selected.length) {
			const ok = await ConfirmModal.show(
				"Are you sure you want to delete " + selected.join(", ") + "?"
			);
			if (ok) await dispatch(deleteSessions(selected));
		}
	};

	return (
		<>
			<div className="top-row justify-right">
				<div className="control-group">
					<ButtonGroup className="button-group">
						<div>Table view</div>
						<div style={{ display: "flex" }}>
							<TableViewSelector
								selectors={sessionsSelectors}
								actions={sessionsActions}
							/>
							<TableColumnSelector
								selectors={sessionsSelectors}
								actions={sessionsActions}
								columns={tableColumns}
							/>
							<SplitPanelButton
								selectors={sessionsSelectors}
								actions={sessionsActions}
							/>
						</div>
					</ButtonGroup>
					<ActionButton
						name="import"
						title="Import IMAT session"
						onClick={showImatMeetings}
					/>
					<ActionButton
						name="delete"
						title="Remove selected"
						disabled={selected.length === 0}
						onClick={handleRemoveSelected}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>

			<SplitPanel selectors={sessionsSelectors} actions={sessionsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={44}
						estimatedRowHeight={44}
						selectors={sessionsSelectors}
						actions={sessionsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<SessionDetails />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Sessions;
