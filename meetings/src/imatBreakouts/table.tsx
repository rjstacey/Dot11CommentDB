import { Link } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	SplitPanel,
	Panel,
	displayDateRange,
	HeaderCellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	RowGetterProps,
} from "dot11-components";

import {
	getField,
	fields,
	imatBreakoutsSelectors,
	imatBreakoutsActions,
	Breakout,
} from "../store/imatBreakouts";
import type { ImatMeeting } from "../store/imatMeetings";

import ImatBreakoutDetails from "./ImatBreakoutDetails";
import MeetingSummary from "../components/MeetingSummary";

const renderGroup = ({ rowData }: { rowData: Breakout }) => {
	if (rowData.groupShortName) return rowData.groupShortName;
	const parts = rowData.symbol.split("/");
	return parts[parts.length - 1];
};

export function ImatMeetingInfo({
	imatMeeting,
}: {
	imatMeeting?: ImatMeeting;
}) {
	let content = imatMeeting ? (
		<>
			<span>{imatMeeting.name}</span>
			<span>{displayDateRange(imatMeeting.start, imatMeeting.end)}</span>
			<span>{imatMeeting.timezone}</span>
		</>
	) : null;
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{content}
		</div>
	);
}

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

const AttendanceLink = ({
	imatMeetingId,
	breakoutId,
}: {
	imatMeetingId: number;
	breakoutId: number;
}) => {
	return (
		<Link to={`../../imatAttendance/${imatMeetingId}/${breakoutId}`}>
			view attendance
		</Link>
	);
};

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
		cellRenderer: ({ rowData }) => (
			<AttendanceLink
				imatMeetingId={rowData.imatMeetingId}
				breakoutId={rowData.id}
			/>
		),
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

/*
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({ rowIndex, ids, entities }: RowGetterProps) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, "dayDate"),
		timeRange: getField(b, "timeRange"),
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, "dayDate")) {
			b = { ...b, dayDate: "" };
			if (b.timeRange === getField(b_prev, "timeRange"))
				b = { ...b, timeRange: "" };
		}
	}
	return b;
}

function Breakouts() {
	return (
		<SplitPanel
			selectors={imatBreakoutsSelectors}
			actions={imatBreakoutsActions}
		>
			<Panel>
				<AppTable
					fixed
					columns={tableColumns}
					headerHeight={46}
					estimatedRowHeight={56}
					rowGetter={breakoutsRowGetter}
					defaultTablesConfig={defaultTablesConfig}
					selectors={imatBreakoutsSelectors}
					actions={imatBreakoutsActions}
				/>
			</Panel>
			<Panel className="details-panel">
				<ImatBreakoutDetails />
			</Panel>
		</SplitPanel>
	);
}

export default Breakouts;
