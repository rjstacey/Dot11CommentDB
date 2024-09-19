import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	ShowFilters,
	TableViewSelector,
	TableColumnSelector,
	SplitPanel,
	Panel,
	ActionButton,
	ButtonGroup,
	displayDateRange,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	HeaderCellRendererProps,
	displayDate,
	CellRendererProps,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectGroupEntities, selectWorkingGroupName } from "../store/groups";
import {
	fields,
	getBallotId,
	selectBallotsState,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
	BallotType,
	SyncedBallot,
	Ballot,
	selectBallotEntities,
	loadBallots,
} from "../store/ballots";

import BallotDetail from "./BallotDetail";

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
			{ballotsSelectors.getField(rowData, "Stage")}
		</div>
	</>
);

const GroupNameLink = (props: React.ComponentProps<typeof Link>) => {
	const { to, ...rest } = props;
	const groupName = useAppSelector(selectWorkingGroupName);
	return <Link to={`/${groupName}/${to}`} {...rest} />;
};

function BallotVoters({ ballot }: { ballot: Ballot }) {
	const access = useAppSelector(selectBallotsAccess);
	const entities = useAppSelector(selectBallotEntities);

	// Find initial ballot
	let ballotInitial = ballot;
	while (ballotInitial.prev_id && entities[ballotInitial.prev_id])
		ballotInitial = entities[ballotInitial.prev_id]!;

	if (ballotInitial.Type === BallotType.WG && !ballotInitial.IsRecirc) {
		return access >= AccessLevel.admin ? (
			<GroupNameLink to={`/voters/${getBallotId(ballot)}`}>
				{ballotInitial.Voters}
			</GroupNameLink>
		) : (
			<>{ballotInitial.Voters}</>
		);
	}
	return <></>;
}

export function BallotResults({ ballot }: { ballot: Ballot }) {
	const access = useAppSelector(selectBallotsAccess);
	const results = ballot.Results;
	let str = "";
	if (ballot.Type === BallotType.CC) {
		const commenters = results?.Commenters || 0;
		str = `${commenters} commenters`;
	} else {
		if (results && results.TotalReturns) {
			str = `${results.Approve}/${results.Disapprove}/${results.Abstain}`;
			const p =
				(100 * results.Approve) /
				(results.Approve + results.Disapprove);
			if (!isNaN(p)) str += ` (${p.toFixed(1)}%)`;
		}
		if (!str) str = "None";
	}
	return access >= AccessLevel.admin ? (
		<GroupNameLink to={`/results/${getBallotId(ballot)}`}>
			{str}
		</GroupNameLink>
	) : (
		<>{str}</>
	);
}

export function renderComments({ rowData }: { rowData: Ballot }) {
	const comments = rowData.Comments;
	const str =
		comments && comments.Count > 0
			? `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
			: "None";
	return (
		<GroupNameLink to={`/comments/${getBallotId(rowData)}`}>
			{str}
		</GroupNameLink>
	);
}

export function BallotComments({ ballot }: { ballot: Ballot }) {
	const comments = ballot.Comments;
	const str =
		comments && comments.Count > 0
			? `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
			: "None";
	return (
		<GroupNameLink to={`/comments/${getBallotId(ballot)}`}>
			{str}
		</GroupNameLink>
	);
}

const tableColumns: ColumnProperties[] = [
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
			if (ballot.Type === 2) console.log(ballot);
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
		key: "PrevBallotID",
		label: "Prev ballot",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
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

function Ballots() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName } = useParams();

	const access = useAppSelector(selectBallotsAccess);
	const { loading } = useAppSelector(selectBallotsState);
	const { isSplit } = useAppSelector(
		ballotsSelectors.selectCurrentPanelConfig
	);

	const refresh = () => dispatch(loadBallots(groupName!, true));
	const showEpolls = () => navigate(`/${groupName}/epolls/`);

	return (
		<>
			<div className="top-row justify-right">
				<ButtonGroup className="button-group">
					<div>Table view</div>
					<div style={{ display: "flex" }}>
						<TableViewSelector
							selectors={ballotsSelectors}
							actions={ballotsActions}
						/>
						<TableColumnSelector
							selectors={ballotsSelectors}
							actions={ballotsActions}
							columns={tableColumns}
						/>
						{access >= AccessLevel.rw && (
							<ActionButton
								name="book-open"
								title="Show detail"
								isActive={isSplit}
								onClick={() =>
									dispatch(
										ballotsActions.setPanelIsSplit({
											isSplit: !isSplit,
										})
									)
								}
							/>
						)}
					</div>
				</ButtonGroup>
				{access >= AccessLevel.admin && (
					<ButtonGroup className="button-group">
						<div>Edit</div>
						<ActionButton
							name="import"
							title="Import ePoll"
							onClick={showEpolls}
						/>
					</ButtonGroup>
				)}
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
					disabled={loading}
				/>
			</div>

			<ShowFilters
				selectors={ballotsSelectors}
				actions={ballotsActions}
				fields={fields}
			/>

			<SplitPanel selectors={ballotsSelectors} actions={ballotsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={42}
						estimatedRowHeight={42}
						//rowGetter={getRow}
						selectors={ballotsSelectors}
						actions={ballotsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<BallotDetail
						access={access}
						readOnly={access < AccessLevel.admin}
					/>
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Ballots;
