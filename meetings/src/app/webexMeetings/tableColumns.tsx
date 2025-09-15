import {
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@common";

import {
	fields,
	webexMeetingsSelectors,
	webexMeetingsActions,
	displayMeetingNumber,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";

import MeetingSummary from "@/components/MeetingSummary";

function renderWebexMeetingHeading(props: HeaderCellRendererProps) {
	return (
		<>
			<TableColumnHeader
				{...props}
				label="Webex account"
				dataKey="accountName"
			/>
			<TableColumnHeader
				{...props}
				label="Meeting number"
				dataKey="meetingNumber"
			/>
		</>
	);
}

function renderWebexMeeting({ rowData }: { rowData: SyncedWebexMeeting }) {
	const { accountName, meetingNumber } = rowData;
	return `${accountName}: ${displayMeetingNumber(meetingNumber)}`;
}

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={webexMeetingsSelectors}
				actions={webexMeetingsActions}
				{...p}
			/>
		),
	},
	{
		key: "dayDate",
		...fields.dayDate,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "timeRange",
		...fields.timeRange,
		width: 70,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "webexMeeting",
		label: "Meeting",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderWebexMeetingHeading,
		cellRenderer: renderWebexMeeting,
	},
	{
		key: "accountName",
		...fields.accountName,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "meetingNumber",
		...fields.meetingNumber,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "hostKey",
		...fields.hostKey,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "title",
		...fields.title,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "timezone",
		...fields.timezone,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
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
];

const defaultTablesColumns = {
	default: [
		"__ctrl__",
		"dayDate",
		"timeRange",
		"webexMeeting",
		"title",
		"meeting",
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
