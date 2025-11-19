import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@common";

import {
	sessionAttendanceSummarySelectors,
	sessionAttendanceSummaryActions,
} from "@/store/sessionAttendanceSummary";

export {
	sessionAttendanceSummarySelectors as selectors,
	sessionAttendanceSummaryActions as actions,
};

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 40,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionAttendanceSummarySelectors}
				actions={sessionAttendanceSummaryActions}
				{...p}
			/>
		),
	},
	{ key: "SAPIN", label: "SA PIN", width: 80, flexGrow: 1, flexShrink: 1 },
	{
		key: "CurrentSAPIN",
		label: "Current SA PIN",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }) =>
			rowData.CurrentSAPIN !== rowData.SAPIN ? rowData.CurrentSAPIN : "",
	},
	{
		key: "Name",
		label: "Name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "LastName",
		label: "Family name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "FirstName",
		label: "Given name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Email",
		label: "Email",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "Status", label: "Status", width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: number | null) =>
			d === null ? "" : d.toFixed(1) + "%",
	},
	{
		key: "AttendanceOverride",
		label: "Attendance override",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "IsRegistered",
		label: "Registered",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: boolean | null) =>
			d === null ? "" : d ? "YES" : "NO",
	},
	{
		key: "InPerson",
		label: "In-Person",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: boolean | null) =>
			d === null ? "" : d ? "In-person" : "Remote",
	},
	{
		key: "Notes",
		label: "Notes",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
];

const defaultTablesColumns = {
	default: [
		"__ctrl__",
		"SAPIN",
		"CurrentSAPIN",
		"Name",
		"Email",
		"Status",
		"AttendancePercentage",
		"IsRegistered",
		"InPerson",
		"Notes",
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
