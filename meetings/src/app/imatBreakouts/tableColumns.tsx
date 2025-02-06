import { Link } from "react-router";

import {
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	CellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "dot11-components";

import {
	fields,
	imatBreakoutsSelectors,
	imatBreakoutsActions,
	Breakout,
} from "@/store/imatBreakouts";

import MeetingSummary from "@/components/MeetingSummary";

const renderGroup = ({ rowData }: { rowData: Breakout }) => {
	if (rowData.groupShortName) return rowData.groupShortName;
	const parts = rowData.symbol.split("/");
	return parts[parts.length - 1];
};

const renderDateHeader = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="weekDay" label="Day" />
		<TableColumnHeader {...props} dataKey="date" label="Date" />
	</>
);

const renderTimeRangeHeader = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="startTime" label="Start time" />
		<TableColumnHeader {...props} dataKey="endTime" label="End time" />
	</>
);

function renderAttendanceLink({ rowData }: CellRendererProps) {
	const imatMeetingId = rowData.imatMeetingId;
	const breakoutId = rowData.id;
	return (
		<Link to={`../../imatAttendance/${imatMeetingId}/${breakoutId}`}>
			view attendance
		</Link>
	);
}

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={imatBreakoutsSelectors}
				actions={imatBreakoutsActions}
				{...p}
			/>
		),
	},
	{ key: "id", ...fields.id, width: 150, flexGrow: 1, flexShrink: 1 },
	{
		key: "dayDate",
		...fields.dayDate,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderDateHeader,
	},
	{
		key: "timeRange",
		...fields.timeRange,
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderTimeRangeHeader,
	},
	{
		key: "symbol",
		...fields.symbol,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderGroup,
	},
	{ key: "name", ...fields.name, width: 150, flexGrow: 1, flexShrink: 1 },
	{
		key: "location",
		...fields.location,
		width: 250,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "credit", label: "Credit", width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "meeting",
		label: "Associated meeting",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }) => (
			<MeetingSummary meetingId={rowData.meetingId} />
		),
	},
	{
		key: "attendance",
		label: "Attendance",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderAttendanceLink,
	},
];

const defaultTablesColumns = {
	default: [
		"__ctrl__",
		"dayDate",
		"timeRange",
		"symbol",
		"name",
		"location",
		"credit",
	],
};

export const defaultTablesConfig: TablesConfig = {};
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
