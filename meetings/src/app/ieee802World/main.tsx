import { Button } from "react-bootstrap";
import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnSelector,
	TableColumnHeader,
	ConfirmModal,
	ColumnProperties,
	TableConfig,
	TablesConfig,
	HeaderCellRendererProps,
	RowGetterProps,
} from "@common";

import { useAppDispatch } from "@/store/hooks";
import {
	importSelectedAsMeetings,
	fields,
	getField,
	ieee802WorldSelectors,
	ieee802WorldActions,
} from "@/store/ieee802World";
import { refresh } from "./loader";

import MeetingSummary from "@/components/MeetingSummary";

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

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={ieee802WorldSelectors}
				actions={ieee802WorldActions}
				{...p}
			/>
		),
	},
	{ key: "day", ...fields.day, width: 60, flexGrow: 1, flexShrink: 0 },
	{
		key: "dayDate",
		...fields.dayDate,
		width: 100,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: renderDateHeader,
	},
	{
		key: "timeRange",
		...fields.timeRange,
		width: 70,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: renderTimeRangeHeader,
	},
	{
		key: "startTime",
		...fields.startTime,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "endTime",
		...fields.endTime,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "groupName",
		...fields.groupName,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "meeting",
		...fields.meeting,
		width: 400,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "mtgRoom",
		...fields.mtgRoom,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "mtgLocation",
		...fields.mtgLocation,
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "meetingId",
		label: "Compare meeting",
		width: 200,
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
		"groupName",
		"meeting",
		"mtgRoom",
	],
};

const defaultTablesConfig: TablesConfig = {};
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
function schedRowGetter({ rowIndex, ids, entities }: RowGetterProps) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, "dayDate"),
		timeRange: getField(b, "timeRange"),
	};
	if (rowIndex > 0) {
		const b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, "dayDate")) {
			b = { ...b, dayDate: "" };
			if (b.timeRange === getField(b_prev, "timeRange"))
				b = { ...b, timeRange: "" };
		}
	}
	return b;
}

export function Ieee802WorldMain() {
	const dispatch = useAppDispatch();

	const importSelected = async () => {
		const ok = await ConfirmModal.show("Import selected?");
		if (ok) dispatch(importSelectedAsMeetings());
	};

	return (
		<>
			<div className="top-row justify-right gap-2">
				<TableColumnSelector
					selectors={ieee802WorldSelectors}
					actions={ieee802WorldActions}
					columns={tableColumns}
				/>
				<Button
					variant="light"
					name="import"
					title="Import selected"
					onClick={importSelected}
				>
					{"Import selected"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</div>

			<div className="table-container centered-rows">
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={46}
					estimatedRowHeight={36}
					selectors={ieee802WorldSelectors}
					actions={ieee802WorldActions}
					rowGetter={schedRowGetter}
				/>
			</div>
		</>
	);
}
