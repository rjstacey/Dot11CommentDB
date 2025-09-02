import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@common";

import {
	fields,
	groupsSelectors,
	groupsActions,
	type GroupWithOfficers,
} from "@/store/groups";
import { GroupOfficers } from "./GroupOfficers";

const renderName = ({ rowData }: { rowData: GroupWithOfficers }) => (
	<div style={{ background: rowData.color || "transparent" }}>
		{rowData.name}
	</div>
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
				selectors={groupsSelectors}
				actions={groupsActions}
				{...p}
			/>
		),
	},
	{
		key: "name",
		...fields.name,
		width: 80,
		flexGrow: 1,
		flexShrink: 0,
		cellRenderer: renderName,
	},
	{ key: "type", ...fields.type, width: 100, flexGrow: 1, flexShrink: 0 },
	{ key: "status", ...fields.status, width: 60, flexGrow: 1, flexShrink: 0 },
	{
		key: "officers",
		label: "Officers",
		cellRenderer: ({ rowData }) => <GroupOfficers group={rowData} />,
		width: 400,
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
