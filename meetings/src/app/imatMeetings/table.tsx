import { Link } from "react-router";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	displayDate,
	TablesConfig,
	TableConfig,
	CellRendererProps,
	displayDateRange,
} from "dot11-components";

import {
	fields,
	imatMeetingsSelectors,
	imatMeetingsActions,
} from "@/store/imatMeetings";

const renderHeaderStartEnd = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="start" label="Start date" />
		<TableColumnHeader {...props} dataKey="end" label="End date" />
	</>
);

const renderCellStartEnd = ({ rowData: session }: CellRendererProps) =>
	displayDateRange(session.start, session.end);

const FlexRow = ({ style, ...props }: React.ComponentProps<"div">) => (
	<div
		style={{ ...style, display: "flex", alignItems: "center" }}
		{...props}
	/>
);

const renderHeaderSummary = (props: HeaderCellRendererProps) => (
	<>
		<FlexRow>
			<TableColumnHeader
				{...props}
				style={{ width: 60, marginRight: 10 }}
				dataKey="type"
				label="Type"
			/>
			<TableColumnHeader
				{...props}
				style={{ width: 60, marginRight: 10 }}
				dataKey="start"
				label="Start"
			/>
			<TableColumnHeader
				{...props}
				style={{ width: 60 }}
				dataKey="end"
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

const renderCellSummary = ({ rowData: session }: CellRendererProps) => (
	<>
		<FlexRow>
			{session.type + ", " + displayDateRange(session.start, session.end)}
		</FlexRow>
		<FlexRow style={{ fontStyle: "italic" }}>{session.name}</FlexRow>
	</>
);

const BreakoutsLink = ({ imatMeetingId }: { imatMeetingId: number }) => {
	return (
		<Link to={`../imatBreakouts/${imatMeetingId.toString()}`}>
			view breakouts
		</Link>
	);
};

type ColumnPropertiesWithWidth = ColumnProperties & { width: number };

export const tableColumns: ColumnPropertiesWithWidth[] = [
	{
		key: "__ctrl__",
		width: 40,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={imatMeetingsSelectors}
				actions={imatMeetingsActions}
				{...p}
			/>
		),
	},
	{
		key: "start",
		label: "Start date",
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: displayDate,
	},
	{
		key: "end",
		label: "End date",
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: displayDate,
	},
	{
		key: "start/end",
		label: "Start/end date",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderStartEnd,
		cellRenderer: renderCellStartEnd,
	},
	{
		key: "summary",
		label: "Summary",
		width: 500,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderSummary,
		cellRenderer: renderCellSummary,
	},
	{
		key: "name",
		...fields.name,
		width: 400,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{ key: "type", ...fields.type, width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "timezone",
		label: "Time zone",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "sessionId",
		...fields.sessionId,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "breakouts",
		label: "Breakouts",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }) => (
			<BreakoutsLink imatMeetingId={rowData.id} />
		),
	},
];

const defaultTablesColumns = {
	Summary: [
		"__ctrl__",
		"summary",
		"groupName",
		"timezone",
		"sessionId",
		"breakouts",
	],
	Detail: [
		"__ctrl__",
		"start/end",
		"number",
		"name",
		"type",
		"groupName",
		"timezone",
		"sessionId",
		"breakouts",
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

function ImatMeetingsTable() {
	return (
		<div className="table-container centered-rows">
			<AppTable
				fixed
				columns={tableColumns}
				headerHeight={44}
				estimatedRowHeight={44}
				selectors={imatMeetingsSelectors}
				actions={imatMeetingsActions}
				defaultTablesConfig={defaultTablesConfig}
			/>
		</div>
	);
}

export default ImatMeetingsTable;
