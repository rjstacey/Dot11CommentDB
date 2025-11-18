import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	CellRendererProps,
} from "@common";
import { TruncatedDiff } from "@/components/TruncatedDiff";

import {
	sessionRegistrationSelectors,
	sessionRegistrationActions,
	SessionRegistration,
} from "@/store/sessionRegistration";

const renderSAPIN = ({ rowData }: CellRendererProps<SessionRegistration>) => {
	const newStr = rowData.SAPIN?.toString() || "";
	let oldStr = rowData.CurrentSAPIN?.toString() || null;
	if (oldStr && newStr === oldStr) oldStr = null;
	return <TruncatedDiff newStr={newStr} oldStr={oldStr} />;
};

const renderEmail = ({ rowData }: CellRendererProps<SessionRegistration>) => {
	const newStr = rowData.Email;
	let oldStr = rowData.CurrentEmail;
	if (oldStr && oldStr.toLocaleLowerCase() === newStr.toLocaleLowerCase())
		oldStr = null;
	return <TruncatedDiff newStr={rowData.Email} oldStr={oldStr} />;
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
		<TruncatedDiff className="fw-bold" newStr={newStr} oldStr={oldStr} />
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
		key: "SAPIN",
		label: "SA PIN",
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: renderSAPIN,
	},
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
	Basic: ["__ctrl__", "SAPIN", "Name", "Email", "Matched", "RegType"],
	Detail: [
		"__ctrl__",
		"SAPIN",
		"Name",
		"Email",
		"Affiliation",
		"Matched",
		"RegType",
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
