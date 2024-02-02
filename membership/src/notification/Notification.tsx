import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	TableColumnSelector,
	TableViewSelector,
	SplitPanelButton,
	ShowFilters,
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
	displayDateRange,
} from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	fields,
	membersSelectors,
	membersActions,
	type Member,
} from "../store/members";
import { selectMostRecentAttendedSession } from "../store/sessionParticipation";
import {
	selectBallotEntities,
	selectMostRecentBallotSeries,
} from "../store/ballotParticipation";

import NotificationEmail from "./NotificationEmail";

function MostRecentBallotSummary() {
	const ballotSeries = useAppSelector(selectMostRecentBallotSeries);
	const ballotEntities = useAppSelector(selectBallotEntities);

	let content: React.ReactNode;
	if (ballotSeries) {
		const ballotIdsStr = ballotSeries.ballotIds
			.map((id) => ballotEntities[id]?.BallotID || "?")
			.join(", ");
		content = (
			<>
				<div>{ballotSeries.project}</div>
				<div>{displayDateRange(ballotSeries.start, ballotSeries.end)}</div>
				<div>{ballotIdsStr}</div>
			</>
		)
	}
	else {
		content = <i>None</i>
	}

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<label>Most recent ballot series:</label>
			{content}
		</div>
	);
}

function MostRecentSessionSummary() {
	const session = useAppSelector(selectMostRecentAttendedSession);

	let content: React.ReactNode;
	if (session) {
		content = (
			<>
				<div>
					{session.number}{" "}
					{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
					{displayDateRange(session.startDate, session.endDate)}
				</div>
				<div
					style={{
						whiteSpace: "nowrap",
						textOverflow: "ellipsis",
						overflow: "hidden",
					}}
				>
					{session.name}
				</div>
				<div>{`(${session.attendees} attendees)`}</div>
			</>
		)
	}
	else {
		content = <i>None</i>
	}

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<label>Most recent session:</label>
			{content}
		</div>
	);
}

const lineTruncStyle: React.CSSProperties = {
	width: '100%',
	overflow: 'hidden',
	whiteSpace: 'nowrap',
	textOverflow: 'ellipses'
}

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
					style={{ width: "200px" }}
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
		"Attendance",
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
	const navigate = useNavigate();
	const refresh = () => navigate(".", {replace: true});

	return (
		<>
			<div className="top-row">
				<MostRecentBallotSummary />
				<MostRecentSessionSummary />
				<div style={{ display: "flex" }}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{ display: "flex" }}>
							<TableViewSelector
								selectors={membersSelectors}
								actions={membersActions}
							/>
							<TableColumnSelector
								selectors={membersSelectors}
								actions={membersActions}
								columns={tableColumns}
							/>
							<SplitPanelButton
								selectors={membersSelectors}
								actions={membersActions}
							/>
						</div>
					</ButtonGroup>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>

			<div style={{ display: "flex", width: "100%" }}>
				<ShowFilters
					selectors={membersSelectors}
					actions={membersActions}
					fields={fields}
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
					<NotificationEmail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Members;
