import type { EntityId } from "@reduxjs/toolkit";
import { useNavigate } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	ShowFilters,
	GlobalFilter,
	IdSelector,
	IdFilter,
	SplitPanel,
	Panel,
	ColumnProperties,
	TableConfig,
	TablesConfig,
	CellRendererProps,
	HeaderCellRendererProps,
	ButtonGroup,
	ActionButton,
	SplitTableButtonGroup,
} from "dot11-components";

import MembersUpload from "./MembersUpload";
import MembersSummary from "./MembersSummary";
import MemberDetail from "./MemberDetail";
import MembersRoster from "./MembersRoster";
import MembersExport from "./MembersExport";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fields,
	selectMembersState,
	setSelected,
	membersSelectors,
	membersActions,
} from "../store/members";
import type { Member, MembersDictionary } from "../store/members";
import React from "react";

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function setClipboard(selected: EntityId[], members: MembersDictionary) {
	const td = (d: string | number) => `<td>${d}</td>`;
	const th = (d: string) => `<th>${d}</th>`;
	const header = `
		<tr>
			${th("SAPIN")}
			${th("Family Name")}
			${th("Given Name")}
			${th("MI")}
			${th("Email")}
			${th("Status")}
		</tr>`;
	const row = (m: Member) => `
		<tr>
			${td(m.SAPIN)}
			${td(m.LastName)}
			${td(m.FirstName)}
			${td(m.MI)}
			${td(m.Email)}
			${td(m.Status)}
		</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map((sapin) => row(members[sapin]!)).join("")}
		</table>`;

	copyHtmlToClipboard(table);
}

const lineTruncStyle: React.CSSProperties = {
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipses",
};

export const renderHeaderNameAndEmail = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="Name" label="Name" />
		<TableColumnHeader
			{...props}
			dataKey="Email"
			label="Email" /*dropdownWidth={200}*/
		/>
	</>
);

export const renderNameAndEmail = ({ rowData }: CellRendererProps<Member>) => (
	<>
		<div style={{ fontWeight: "bold", ...lineTruncStyle }}>
			{rowData.Name}
		</div>
		<div style={lineTruncStyle}>{rowData.Email}</div>
	</>
);

export const renderHeaderEmployerAndAffiliation = (
	props: HeaderCellRendererProps
) => (
	<>
		<TableColumnHeader {...props} dataKey="Employer" label="Employer" />
		<TableColumnHeader
			{...props}
			dataKey="Affiliation"
			label="Affiliation"
		/>
	</>
);

export const renderEmployerAndAffiliation = ({
	rowData,
}: CellRendererProps<Member>) => (
	<>
		<div style={lineTruncStyle}>{rowData.Employer}</div>
		<div style={lineTruncStyle}>{rowData.Affiliation}</div>
	</>
);

const tableColumns: ColumnProperties[] = [
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
					selectors={membersSelectors}
					actions={membersActions}
					focusOnMount
				/>
				{...p}
			/>
		),
		cellRenderer: (p) => (
			<SelectCell
				selectors={membersSelectors}
				actions={membersActions}
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
					selectors={membersSelectors}
					actions={membersActions}
					dataKey="SAPIN"
				/>
				{...p}
			/>
		),
	},
	{
		key: "Name/Email",
		label: "Name/Email",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail,
	},
	{ key: "Name", ...fields.Name, width: 200, flexGrow: 1, flexShrink: 1 },
	{ key: "Email", ...fields.Email, width: 200, flexGrow: 1, flexShrink: 1 },
	{
		key: "Employer/Affiliation",
		label: "Employer/Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderEmployerAndAffiliation,
		cellRenderer: renderEmployerAndAffiliation,
	},
	{
		key: "Employer",
		...fields.Employer,
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "OldStatus",
		...fields.OldStatus,
		width: 160,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
	{
		key: "Status",
		...fields.Status,
		width: 160,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
	{
		key: "StatusChangeDate",
		...fields.StatusChangeDate,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "DateAdded",
		...fields.DateAdded,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "AttendancesSummary",
		...fields.AttendancesSummary,
		label: "Session participation",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "BallotParticipationSummary",
		...fields.BallotParticipationSummary,
		label: "Ballot participation",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
];

const defaultTablesColumns = {
	General: [
		"__ctrl__",
		"SAPIN",
		"Name/Email",
		"Employer/Affiliation",
		"Status",
		"StatusChangeDate",
	],
	Participation: [
		"__ctrl__",
		"SAPIN",
		"Name/Email",
		"Status",
		"AttendancesSummary",
		"BallotParticipationSummary",
	],
};

let defaultTablesConfig: TablesConfig = {};
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

function Members() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const refresh = () => navigate(".", { replace: true });
	const { selected, entities: members } = useAppSelector(selectMembersState);

	return (
		<>
			<div className="top-row">
				<MembersSummary />
				<div className="control-group">
					<SplitTableButtonGroup
						columns={tableColumns}
						selectors={membersSelectors}
						actions={membersActions}
					/>
					<MembersRoster />
					<MembersExport />
					<ButtonGroup className="button-group">
						<div>Edit</div>
						<div style={{ display: "flex" }}>
							<ActionButton
								name="copy"
								title="Copy to clipboard"
								disabled={selected.length === 0}
								onClick={() => setClipboard(selected, members)}
							/>
							<MembersUpload />
						</div>
					</ButtonGroup>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>

			<div
				style={{ width: "100%", display: "flex", alignItems: "center" }}
			>
				<ShowFilters
					selectors={membersSelectors}
					actions={membersActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={membersSelectors}
					actions={membersActions}
				/>
			</div>

			<SplitPanel selectors={membersSelectors} actions={membersActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						selectors={membersSelectors}
						actions={membersActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) => dispatch(setSelected(ids))}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Members;
