import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	CellRendererProps,
	IdSelector,
} from "@common";

import {
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	type SyncedSessionAttendee,
	fields,
} from "@/store/imatAttendanceSummary";

import { TruncatedDiff } from "@/components/TruncatedDiff";

export {
	sessionAttendeesSelectors as selectors,
	sessionAttendeesActions as actions,
};

const renderSAPIN = ({ rowData }: CellRendererProps<SyncedSessionAttendee>) => {
	const newStr = rowData.SAPIN.toString() || "";
	let oldStr = rowData.member?.SAPIN?.toString() || null;
	if (oldStr && newStr === oldStr) oldStr = null;
	return <TruncatedDiff newStr={newStr} oldStr={oldStr} />;
};

const renderName = ({ rowData }: CellRendererProps<SyncedSessionAttendee>) => (
	<TruncatedDiff
		className="fw-bold"
		newStr={rowData.Name}
		oldStr={rowData.member?.Name || null}
	/>
);

const renderEmail = ({ rowData }: CellRendererProps<SyncedSessionAttendee>) => (
	<TruncatedDiff
		newStr={rowData.Email}
		oldStr={rowData.member?.Email || null}
	/>
);

const renderEmployer = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => {
	// The "Employer" field is present with "daily attendance" but undefined with "attendance summary"
	if (rowData.Employer === undefined) return "N/A";
	return (
		<TruncatedDiff
			newStr={rowData.Employer}
			oldStr={rowData.member?.Employer || null}
		/>
	);
};

const renderAffiliation = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => (
	<TruncatedDiff
		newStr={rowData.Affiliation}
		oldStr={rowData.member?.Affiliation || null}
	/>
);

const renderAttendance = ({
	rowData,
}: CellRendererProps<SyncedSessionAttendee>) => {
	const newStr = rowData.AttendancePercentage.toFixed(1) + "%";
	let oldStr: string | null = null;
	if (rowData.attendance && rowData.attendance.AttendancePercentage)
		oldStr = rowData.attendance.AttendancePercentage.toFixed(1) + "%";
	return <TruncatedDiff newStr={newStr} oldStr={oldStr} />;
};

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 60,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => (
			<SelectHeaderCell
				customSelectorElement=<IdSelector
					dataKey="SAPIN"
					style={{ width: "400px" }}
					selectors={sessionAttendeesSelectors}
					actions={sessionAttendeesActions}
					focusOnMount
				/>
				{...p}
			/>
		),
		cellRenderer: (p) => (
			<SelectCell
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
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
		cellRenderer: renderAttendance,
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
		dataRenderer: (d: boolean) => (d ? "YES" : "NO"),
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
		"CurrentSAPIN",
		"Name",
		"Email",
		"Affiliation",
		"Status",
		"AttendancePercentage",
	],
	Detail: [
		"__ctrl__",
		"SAPIN",
		"CurrentSAPIN",
		"Name",
		"Email",
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
