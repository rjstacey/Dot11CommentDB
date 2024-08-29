import { Link } from "react-router-dom";

import {
	AppTable,
	SplitPanel,
	Panel,
	SelectHeaderCell,
	SelectCell,
	ShowFilters,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	RowGetterProps,
} from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	fields,
	getField,
	selectUiProperties,
	meetingsSelectors,
	meetingsActions,
	SyncedMeeting,
} from "../store/meetings";
import { displayMeetingNumber } from "../store/webexMeetings";

import MeetingsCalendar from "./MeetingsCalendar";
import MeetingDetails from "./MeetingDetails";
import ShowSlots from "./ShowSlots";

function renderWebexMeeting({ rowData }: { rowData: SyncedMeeting }) {
	const { webexAccountId, webexAccountName, webexMeeting } = rowData;
	if (!webexAccountId) return "None";
	return (
		webexAccountName +
		(webexMeeting
			? ": " + displayMeetingNumber(webexMeeting.meetingNumber)
			: "")
	);
}

function renderImatMeeting({ rowData }: { rowData: SyncedMeeting }) {
	return rowData.imatMeetingId ? (
		<Link to={`/imatMeetings/${rowData.imatMeetingId}`}>
			{rowData.imatMeetingName}
		</Link>
	) : (
		"None"
	);
}

const renderDateHeader = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="day" label="Day" />
		<TableColumnHeader {...props} dataKey="date" label="Date" />
	</>
);

const renderTimeRangeHeader = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="startTime" label="Start time" />
		<TableColumnHeader {...props} dataKey="endTime" label="End time" />
	</>
);

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={meetingsSelectors}
				actions={meetingsActions}
				{...p}
			/>
		),
	},
	{ key: "id", ...fields.id, width: 60, flexGrow: 1, flexShrink: 1 },
	{ key: "day", ...fields.day, width: 60, flexGrow: 1, flexShrink: 1 },
	{ key: "date", ...fields.date, width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "dayDate",
		...fields.dayDate,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderDateHeader,
	},
	{
		key: "timeRange",
		...fields.timeRange,
		width: 70,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderTimeRangeHeader,
	},
	{
		key: "duration",
		...fields.duration,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "groupName",
		...fields.groupName,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "summary",
		...fields.summary,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "location",
		...fields.location,
		width: 200,
		flexGrow: 1,
		flexShrink: 0,
	},
	{
		key: "hasMotions",
		...fields.hasMotions,
		width: 90,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "webexAccountName",
		label: "Webex meeting",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderWebexMeeting,
	},
	{
		key: "sessionName",
		label: "Session",
		width: 60,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "imatMeetingName",
		label: "IMAT meeting",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderImatMeeting,
	},
	{
		key: "calendarAccountName",
		label: "Calendar",
		width: 50,
		flexGrow: 1,
		flexShrink: 1,
	},
];

const defaultTablesColumns = {
	default: [
		"__ctrl__",
		"dayDate",
		"timeRange",
		"groupName",
		"summary",
		"hasMotions",
		"webexAccountName",
		"imatMeetingName",
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
 * Don't display date and time if it is the same as previous line
 */
function rowGetter({ rowIndex, ids, entities }: RowGetterProps<SyncedMeeting>) {
	let meeting = entities[ids[rowIndex]]!;
	let b = {
		...meeting,
		day: getField(meeting, "day"),
		date: getField(meeting, "date"),
		dayDate: getField(meeting, "dayDate"),
		timeRange: getField(meeting, "timeRange"),
		location: getField(meeting, "location"),
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]]!;
		if (b.day === getField(b_prev, "day")) {
			b.day = "";
			if (b.date === getField(b_prev, "date")) {
				b.date = "";
				b.dayDate = "";
				if (b.timeRange === getField(b_prev, "timeRange"))
					b.timeRange = "";
			}
		}
	}
	return b;
}

function MeetingsTable() {
	let showDays: number = useAppSelector(selectUiProperties).showDays | 0;

	return (
		<SplitPanel selectors={meetingsSelectors} actions={meetingsActions}>
			{showDays > 0 ? (
				<Panel style={{ display: "flex", flexDirection: "column" }}>
					<ShowSlots />
					<MeetingsCalendar nDays={showDays} />
				</Panel>
			) : (
				<Panel
					style={{
						display: "flex",
						flexDirection: "column",
						margin: "10px 0 10px 10px",
					}}
				>
					<ShowFilters
						selectors={meetingsSelectors}
						actions={meetingsActions}
						fields={fields}
					/>
					<div style={{ display: "flex", flex: 1 }}>
						<AppTable
							defaultTablesConfig={defaultTablesConfig}
							columns={tableColumns}
							headerHeight={46}
							estimatedRowHeight={32}
							measureRowHeight
							selectors={meetingsSelectors}
							actions={meetingsActions}
							rowGetter={
								rowGetter as (
									p: RowGetterProps<SyncedMeeting>
								) => any
							}
						/>
					</div>
				</Panel>
			)}
			<Panel className="details-panel">
				<MeetingDetails />
			</Panel>
		</SplitPanel>
	);
}

export default MeetingsTable;
