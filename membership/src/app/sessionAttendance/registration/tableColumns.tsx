import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	CellRendererProps,
} from "@common";
import { ProvidedExisting } from "@/components/ProvidedExisting";

import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	SessionRegistration,
} from "@/store/sessionRegistration";

export {
	sessionRegistrationSelectors as selectors,
	sessionRegistrationActions as actions,
};

const renderSAPIN = ({ rowData }: CellRendererProps<SessionRegistration>) => {
	const newStr = rowData.SAPIN?.toString() || "";
	let oldStr = rowData.CurrentSAPIN?.toString() || null;
	if (oldStr && newStr === oldStr) oldStr = null;
	return <ProvidedExisting newStr={newStr} oldStr={oldStr} />;
};

const renderEmail = ({ rowData }: CellRendererProps<SessionRegistration>) => {
	const newStr = rowData.Email;
	let oldStr = rowData.CurrentEmail;
	if (oldStr && oldStr.toLocaleLowerCase() === newStr.toLocaleLowerCase())
		oldStr = null;
	return <ProvidedExisting newStr={rowData.Email} oldStr={oldStr} />;
};

function matchNames(name1: string, name2: string): boolean {
	const n1 = name1.trim().toLowerCase();
	const n2 = name2.trim().toLowerCase();
	return n1 === n2;
}

const renderName = ({ rowData }: CellRendererProps<SessionRegistration>) => {
	const newStr = rowData.Name;
	let oldStr = rowData.CurrentName;
	if (oldStr && matchNames(newStr, oldStr)) oldStr = null;
	return (
		<ProvidedExisting className="fw-bold" newStr={newStr} oldStr={oldStr} />
	);
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
				selectors={sessionRegistrationSelectors}
				actions={sessionRegistrationActions}
				{...p}
			/>
		),
	},
	{
		key: "CurrentSAPIN",
		label: "Member SA PIN",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "SAPIN",
		label: "SA PIN (Member SAPIN)",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderSAPIN,
	},
	{
		key: "Name",
		label: "Name (Member name)",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderName,
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
		label: "Email (Member email)",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderEmail,
	},
	{
		key: "Matched",
		label: "Matched",
		width: 80,
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
		key: "AttendancePercentage",
		label: "Attendance",
		width: 100,
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
		"Affiliation",
		"Matched",
		"RegType",
		"AttendancePercentage",
		"AttendanceOverride",
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
