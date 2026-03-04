import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@common";

import {
	fields,
	membershipOverTimeSelectors,
	membershipOverTimeActions,
} from "@/store/membershipOverTime";

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={membershipOverTimeSelectors}
				actions={membershipOverTimeActions}
				{...p}
			/>
		),
	},
	{
		key: "date",
		...fields.date,
		width: 80,
		flexGrow: 1,
		flexShrink: 0,
	},
	{
		key: "count",
		...fields.count,
		width: 100,
		flexGrow: 1,
		flexShrink: 0,
	},
	{
		key: "note",
		...fields.note,
		width: 200,
		flexGrow: 1,
		flexShrink: 0,
	},
];

export const defaultTablesConfig: TablesConfig = {};
const tableConfig: TableConfig = {
	fixed: false,
	columns: {},
};
for (const column of tableColumns) {
	const key = column.key;
	tableConfig.columns[key] = {
		unselectable: key.startsWith("__"),
		shown: true,
		width: column.width || 200,
	};
}
defaultTablesConfig["default"] = tableConfig;
