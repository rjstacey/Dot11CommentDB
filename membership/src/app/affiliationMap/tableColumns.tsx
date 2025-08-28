import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@components/table";

import {
	fields,
	affiliationMapSelectors,
	affiliationMapActions,
} from "@/store/affiliationMap";

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={affiliationMapSelectors}
				actions={affiliationMapActions}
				{...p}
			/>
		),
	},
	{
		key: "match",
		...fields.match,
		width: 80,
		flexGrow: 1,
		flexShrink: 0,
	},
	{
		key: "shortAffiliation",
		...fields.shortAffiliation,
		width: 100,
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
