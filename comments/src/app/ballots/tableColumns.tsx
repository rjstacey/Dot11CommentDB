import React from "react";
import { Link } from "react-router";

import {
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	displayDateRange,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	HeaderCellRendererProps,
	displayDate,
	CellRendererProps,
} from "@common";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import { selectGroupEntities } from "@/store/groups";
import {
	fields,
	getBallotId,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
	BallotType,
	SyncedBallot,
	Ballot,
	selectBallotEntities,
} from "@/store/ballots";

import { BallotResults } from "./BallotResults";
import { BallotComments } from "./BallotComments";

const renderHeaderGroupProject = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader
			{...props}
			dataKey="GroupName"
			{...fields.GroupName}
		/>
		<TableColumnHeader {...props} dataKey="Project" {...fields.Project} />
	</>
);

function CellGroupProject({
	prevRowId,
	rowData: ballot,
}: CellRendererProps<Ballot>) {
	const ballotEntities = useAppSelector(selectBallotEntities);
	const groupEntities = useAppSelector(selectGroupEntities);
	let groupName = "(Blank)";
	if (ballot.groupId) {
		const group = groupEntities[ballot.groupId];
		groupName = group?.name || "Unknown";
	}
	let project = ballot.Project;
	const prevRowBallot = prevRowId ? ballotEntities[prevRowId] : undefined;
	if (prevRowBallot) {
		if (
			ballot.groupId === prevRowBallot.groupId &&
			ballot.Project === prevRowBallot.Project
		) {
			groupName = "";
			project = "";
		}
	}
	return (
		<>
			<div style={lineTruncStyle}>{groupName}</div>
			<div style={lineTruncStyle}>{project}</div>
		</>
	);
}

const renderHeaderStartEnd = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="Start" {...fields.Start} />
		<TableColumnHeader {...props} dataKey="End" {...fields.End} />
	</>
);

const renderCellStartEnd = ({ rowData }: { rowData: SyncedBallot }) =>
	displayDateRange(rowData.Start || "", rowData.End || "");

const lineTruncStyle: React.CSSProperties = {
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipses",
};

const renderHeaderTypeStage = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="Type" {...fields.Type} />
		<TableColumnHeader {...props} dataKey="stage" {...fields.stage} />
	</>
);

const renderCellTypeStage = ({ rowData }: { rowData: SyncedBallot }) => (
	<>
		<div style={lineTruncStyle}>
			{fields.Type.dataRenderer(rowData.Type)}
		</div>
		<div style={lineTruncStyle}>
			{ballotsSelectors.getField(rowData, "Stage") as string}
		</div>
	</>
);

function BallotVoters({ ballot }: { ballot: Ballot }) {
	const access = useAppSelector(selectBallotsAccess);
	const entities = useAppSelector(selectBallotEntities);

	// Find initial ballot
	let ballotInitial = ballot;
	while (ballotInitial.prev_id && entities[ballotInitial.prev_id])
		ballotInitial = entities[ballotInitial.prev_id]!;

	if (ballotInitial.Type === BallotType.WG && !ballotInitial.prev_id) {
		return access >= AccessLevel.admin ? (
			<Link to={`../voters/${getBallotId(ballot)}`}>
				{ballotInitial.Voters}
			</Link>
		) : (
			<>{ballotInitial.Voters}</>
		);
	}
	return <></>;
}

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={ballotsSelectors}
				actions={ballotsActions}
				{...p}
			/>
		),
	},
	{
		key: "BallotID",
		label: "ID",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
		dropdownWidth: 200,
		cellRenderer: ({ rowData: ballot }) => {
			return <span>{getBallotId(ballot)}</span>;
		},
	},
	{
		key: "Group/Project",
		label: "Group/Project",
		headerRenderer: renderHeaderGroupProject,
		cellRenderer: (props) => <CellGroupProject {...props} />,
		width: 130,
		flexShrink: 1,
		flexGrow: 1,
	},
	{
		key: "GroupName",
		label: "Group",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
	},
	{
		key: "Project",
		label: "Project",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
		dropdownWidth: 200,
	},
	{
		key: "Type/Stage",
		label: "Type/Stage",
		headerRenderer: renderHeaderTypeStage,
		cellRenderer: renderCellTypeStage,
		width: 120,
		flexShrink: 1,
		flexGrow: 1,
	},
	{ key: "Type", ...fields.Type, width: 100, flexShrink: 1, flexGrow: 1 },
	{ key: "number", label: "Number", width: 100, flexShrink: 1, flexGrow: 1 },
	{ key: "Stage", label: "Stage", width: 100, flexShrink: 1, flexGrow: 1 },
	{
		key: "Start/End",
		label: "Start/End",
		dataRenderer: displayDate,
		headerRenderer: renderHeaderStartEnd,
		cellRenderer: renderCellStartEnd,
		width: 120,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Start",
		label: "Start",
		dataRenderer: displayDate,
		width: 86,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "End",
		label: "End",
		dataRenderer: displayDate,
		width: 86,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "Document",
		...fields.Document,
		width: 150,
		flexShrink: 1,
		flexGrow: 1,
		dropdownWidth: 300,
	},
	{
		key: "EpollNum",
		...fields.EpollNum,
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
	{
		key: "Voters",
		label: "Voters",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
		cellRenderer: ({ rowData }) => <BallotVoters ballot={rowData} />,
	},
	{
		key: "Results",
		label: "Results",
		width: 150,
		flexShrink: 1,
		flexGrow: 1,
		cellRenderer: ({ rowData }) => <BallotResults ballot={rowData} />,
	},
	{
		key: "Comments",
		label: "Comments",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
		cellRenderer: ({ rowData }) => <BallotComments ballot={rowData} />,
	},
];

const defaultTablesColumns = {
	Basic: [
		"__ctrl__",
		"Group/Project",
		"BallotID",
		"Start/End",
		"Document",
		"Results",
		"Comments",
	],
	Detailed: [
		"__ctrl__",
		"Group/Project",
		"BallotID",
		"Type/Stage",
		"Start/End",
		"Document",
		"Topic",
		"Voters",
		"Results",
		"Comments",
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
