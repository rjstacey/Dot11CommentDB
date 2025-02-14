import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	CellRendererProps,
} from "dot11-components";

import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	type SyncedSessionAttendee,
	fields,
} from "@/store/sessionAttendees";

import styles from "./table.module.css";

const BLANK_STR = "(Blank)";

export const renderDiff = (newStr: string, oldStr: string | null) => {
	const newStyle: React.CSSProperties = {},
		oldStyle: React.CSSProperties = {};

	if (!newStr) {
		newStr = BLANK_STR;
		newStyle.fontStyle = "italic";
	}

	if (oldStr === "") {
		oldStr = BLANK_STR;
		oldStyle.fontStyle = "italic";
	}

	if (oldStr !== null) {
		return (
			<>
				<del style={oldStyle}>{oldStr}</del>
				<ins style={newStyle}>{newStr}</ins>
			</>
		);
	} else {
		return <span style={newStyle}>{newStr}</span>;
	}
};

export const renderName = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<div className={styles.tableCell} style={{ fontWeight: "bold" }}>
		{renderDiff(rowData.Name, rowData.OldName)}
	</div>
);

export const renderEmail = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<div className={styles.tableCell}>
		{renderDiff(rowData.Email, rowData.OldEmail)}
	</div>
);

export const renderEmployer = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	// The "Employer" field is present with "daily attendance" but undefined with "attendance summary"
	<div className={styles.tableCell}>
		{rowData.Employer === undefined
			? "N/A"
			: renderDiff(rowData.Employer, rowData.OldEmployer)}
	</div>
);

export const renderAffiliation = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<div className={styles.tableCell}>
		{renderDiff(rowData.Affiliation, rowData.OldAffiliation)}
	</div>
);

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 40,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
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
		cellRenderer: renderName,
	},
	{
		key: "LastName",
		...fields.LastName,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "FirstName",
		...fields.FirstName,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "MI", ...fields.MI, width: 80, flexGrow: 1, flexShrink: 1 },
	{
		key: "Email",
		label: "Email",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderEmail,
	},
	{
		key: "Employer",
		label: "Employer",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderEmployer,
	},
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderAffiliation,
	},
	{ key: "Status", label: "Status", width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: number) => d.toFixed(0) + "%",
	},
	{
		key: "AttendanceOverride",
		label: "Attendance override",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "InPerson",
		label: "In-Person",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: boolean) => (d ? "In-person" : "Remote"),
	},
	{
		key: "IsRegistered",
		label: "Registered",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dataRenderer: (d: boolean) => (d ? "Registered" : ""),
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
	Basic: [
		"__ctrl__",
		"SAPIN",
		"Name",
		"Email",
		"Employer",
		"Affiliation",
		"Status",
	],
	Attendance: [
		"__ctrl__",
		"SAPIN",
		"Name",
		"Email",
		"Employer",
		"Affiliation",
		"Status",
		"AttendancePercentage",
		"AttendanceOverride",
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
