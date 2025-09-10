import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@common";
import { votersSelectors, votersActions } from "@/store/voters";

type ColumnPropertiesWithWidth = ColumnProperties & { width: number };

const controlColumn: ColumnPropertiesWithWidth = {
	key: "__ctrl__",
	width: 40,
	flexGrow: 0,
	flexShrink: 0,
	headerRenderer: (p) => <SelectHeaderCell {...p} />,
	cellRenderer: (p) => (
		<SelectCell
			selectors={votersSelectors}
			actions={votersActions}
			{...p}
		/>
	),
};

export const tableColumns: ColumnPropertiesWithWidth[] = [
	controlColumn,
	{ key: "SAPIN", label: "SA PIN", width: 100 },
	{ key: "Name", label: "Name", width: 200, dropdownWidth: 250 },
	{ key: "Email", label: "Email", width: 250, dropdownWidth: 350 },
	{ key: "Status", label: "Status", width: 100 },
	{
		key: "Excused",
		label: "Excused",
		width: 100,
		dataRenderer: (value) => (value ? "Yes" : ""),
	},
];

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

export const defaultTablesConfig: TablesConfig = { default: tableConfig };
