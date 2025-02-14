import {
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	IdSelector,
	IdFilter,
	ColumnProperties,
	CellRendererProps,
	TablesConfig,
	TableConfig,
} from "dot11-components";

import {
	fields,
	myProjectRosterSelectors,
	myProjectRosterActions,
} from "@/store/myProjectRoster";

import styles from "../../sessionAttendance/table.module.css";

const BLANK_STR = "(Blank)";

function renderDiff(s1: string, s2: string | undefined) {
	const s1Style: React.CSSProperties = {},
		s2Style: React.CSSProperties = {};

	if (!s1) {
		s1 = BLANK_STR;
		s1Style.fontStyle = "italic";
	}

	if (s2 === "") {
		s2 = BLANK_STR;
		s2Style.fontStyle = "italic";
	}

	if (s2 !== undefined && s1 !== s2) {
		return (
			<>
				<del style={s2Style}>{s2}</del>
				<ins style={s1Style}>{s1}</ins>
			</>
		);
	}

	return <span style={s1Style}>{s1}</span>;
}

function renderDiffCell(s1: string, s2: string | undefined) {
	return <div className={styles.tableCell}>{renderDiff(s1, s2)}</div>;
}

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 48,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => (
			<SelectHeaderCell
				customSelectorElement=<IdSelector
					dataKey="SAPIN"
					style={{ width: "400px" }}
					selectors={myProjectRosterSelectors}
					actions={myProjectRosterActions}
					focusOnMount
				/>
				{...p}
			/>
		),
		cellRenderer: (p) => (
			<SelectCell
				selectors={myProjectRosterSelectors}
				actions={myProjectRosterActions}
				{...p}
			/>
		),
	},
	{
		key: "SAPIN",
		...fields.SAPIN,
		width: 90,
		flexGrow: 0,
		flexShrink: 0,
		dropdownWidth: 200,
		headerRenderer: (p) => (
			<TableColumnHeader
				customFilterElement=<IdFilter
					selectors={myProjectRosterSelectors}
					actions={myProjectRosterActions}
					dataKey="SAPIN"
				/>
				{...p}
			/>
		),
	},
	{
		key: "Name",
		...fields.Name,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }: CellRendererProps) =>
			renderDiffCell(rowData.Name, rowData.m_Name),
	},
	{
		key: "Email",
		...fields.Email,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }: CellRendererProps) =>
			renderDiffCell(rowData.Email, rowData.m_Email),
	},
	{
		key: "Employer",
		...fields.Employer,
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }: CellRendererProps) =>
			renderDiffCell(rowData.Employer, rowData.m_Employer),
	},
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }: CellRendererProps) =>
			renderDiffCell(rowData.Affiliation, rowData.m_Affiliation),
	},
	{
		key: "Status",
		...fields.Status,
		width: 160,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
		cellRenderer: ({ rowData }: CellRendererProps) =>
			renderDiffCell(rowData.Status, rowData.m_Status),
	},
];

const defaultTablesColumns = {
	default: ["__ctrl__", "SAPIN", "Name", "Email", "Affiliation", "Status"],
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
