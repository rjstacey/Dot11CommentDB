import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@common";

import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
} from "@/store/sessionRegistration";

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 40,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionRegistrationSelectors}
				actions={sessionRegistrationActions}
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
	},
	{
		key: "LastName",
		label: "Last name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "FirstName",
		label: "First name",
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
	{
		key: "RegType",
		label: "Registration type",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Matched",
		label: "Matched",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: boolean) => (d ? "YES" : "NO"),
	},
];

const defaultTablesColumns = {
	default: ["__ctrl__", "SAPIN", "Name", "Email", "RegType", "Matched"],
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
