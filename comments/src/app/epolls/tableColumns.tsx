import { ColumnProperties, TablesConfig, TableConfig } from "@common";
import { fields } from "@/store/epolls";

export const tableColumns: (ColumnProperties & { width: number })[] = [
	{ key: "id", ...fields.id, width: 100 },
	{ key: "name", ...fields.name, width: 200 },
	{ key: "start", ...fields.start, width: 100 },
	{ key: "end", ...fields.end, width: 100 },
	{ key: "document", ...fields.document, width: 200 },
	{ key: "topic", ...fields.topic, width: 500 },
	{ key: "resultsSummary", ...fields.resultsSummary, width: 100 },
	{ key: "present", ...fields.present, width: 100 },
];

export const defaultTablesConfig: TablesConfig = {};
const tableView = "default";
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
defaultTablesConfig[tableView] = tableConfig;
