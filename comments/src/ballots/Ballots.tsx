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
	RowGetterProps,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectWorkingGroupName } from "../store/groups";
import {
	fields,
	BallotType,
	selectBallotsState,
	selectBallotsAccess,
	ballotsSelectors,
	ballotsActions,
	SyncedBallot,
	Ballot,
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

const renderCellGroupProject = ({ rowData }: { rowData: SyncedBallot }) => (
	<>
		<div style={lineTruncStyle}>{rowData.GroupName}</div>
		<div style={lineTruncStyle}>{rowData.Project}</div>
	</>
);

const renderHeaderStartEnd = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="Start" {...fields.Start} />
		<TableColumnHeader {...props} dataKey="End" {...fields.End} />
	</>
);

const renderCellStartEnd = ({ rowData }: { rowData: SyncedBallot }) =>
	displayDateRange(rowData.Start || "", rowData.End || "");

const lineTruncStyle: React.CSSProperties = {
	overflow: 'hidden',
	whiteSpace: 'nowrap',
	textOverflow: 'ellipses'
}

const renderHeaderTypeStage = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="Type" {...fields.Type} />
		<TableColumnHeader {...props} dataKey="Stage" {...fields.Stage} />
	</>
);

const renderCellTypeStage = ({ rowData }: { rowData: SyncedBallot }) => (
	<>
		<div style={lineTruncStyle}>{fields.Type.dataRenderer(rowData.Type)}</div>
		<div style={lineTruncStyle}>{ballotsSelectors.getField(rowData, "Stage")}</div>
	</>
);

const renderHeaderVotingPool = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader
			{...props}
			dataKey="VotingPoolID"
			{...fields.VotingPoolID}
		/>
		<TableColumnHeader
			{...props}
			dataKey="PrevBallotID"
			{...fields.PrevBallotID}
		/>
	</>
);

const GroupNameLink = (props: React.ComponentProps<typeof Link>) => {
	const { to, ...rest } = props;
	const groupName = useAppSelector(selectWorkingGroupName);
	return <Link to={`/${groupName}/${to}`} {...rest} />;
};

const renderCellVotingPool = ({
	rowData,
	access,
}: {
	rowData: SyncedBallot;
	access?: number;
}) => {
	const type = rowData.Type;
	const isRecirc = rowData.IsRecirc;
	const votingPoolSize = rowData.Results?.VotingPoolSize || 0;
	const votersStr = `${votingPoolSize} voters`;
	if ((type === BallotType.WG && !isRecirc) || type === BallotType.Motion) {
		return typeof access === "number" && access >= AccessLevel.admin ? (
			<GroupNameLink to={`/voters/${rowData.BallotID}`}>
				{votersStr}
			</GroupNameLink>
		) : (
			votersStr
		);
	}
	if (type === BallotType.WG || type === BallotType.SA)
		return rowData.PrevBallotID;
	return "";
};

export function renderResultsSummary({
	rowData,
	access,
}: {
	rowData: Ballot;
	access?: number;
}) {
	const results = rowData.Results;
	let str = "";
	if (rowData.Type === BallotType.CC) {
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
	return typeof access !== "undefined" && access >= AccessLevel.admin ? (
		<GroupNameLink to={`/results/${rowData.BallotID}`}>{str}</GroupNameLink>
	) : (
		str
	);
}

export function renderCommentsSummary({ rowData }: { rowData: Ballot }) {
	const comments = rowData.Comments;
	const str =
		comments && comments.Count > 0
			? `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
			: "None";
	return (
		<GroupNameLink to={`/comments/${rowData.BallotID}`}>
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
		key: "Group/Project",
		label: "Group/Project",
		headerRenderer: renderHeaderGroupProject,
		cellRenderer: renderCellGroupProject,
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
		key: "BallotID",
		label: "Ballot",
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
	{ key: "Topic", ...fields.Topic, width: 300, flexShrink: 1, flexGrow: 1 },
	{
		key: "EpollNum",
		...fields.EpollNum,
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
	{
		key: "VotingPool/PrevBallot",
		label: "Voting pool/Prev ballot",
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
		headerRenderer: renderHeaderVotingPool,
		cellRenderer: renderCellVotingPool,
	},
	{
		key: "Results",
		...fields.Results,
		width: 150,
		flexShrink: 1,
		flexGrow: 1,
		cellRenderer: renderResultsSummary,
	},
	{
		key: "Comments",
		...fields.Comments,
		width: 100,
		flexShrink: 1,
		flexGrow: 1,
		cellRenderer: renderCommentsSummary,
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
		"VotingPool/PrevBallot",
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

function getRow({ rowIndex, ids, entities }: RowGetterProps) {
	const currData = entities[ids[rowIndex]];
	if (rowIndex === 0) return currData;
	const prevData = entities[ids[rowIndex - 1]];
	if (
		currData.Project !== prevData.Project ||
		currData.GroupName !== prevData.GroupName
	)
		return currData;
	// Previous row holds the same comment
	return {
		...currData,
		GroupName: "",
		Project: "",
	};
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

	const refresh = () => navigate(".", {replace: true});
	const showEpolls = () => navigate(`/${groupName}/epolls/`);

	const columns = React.useMemo(() => {
		return tableColumns.slice().map((col) => {
			let newCol: ColumnProperties = col;
			if (col.key === "Results") {
				newCol = {
					...col,
					cellRenderer: (props) =>
						renderResultsSummary({ ...props, access }),
				};
			}
			if (col.key === "VotingPool/PrevBallot") {
				newCol = {
					...col,
					cellRenderer: (props) =>
						renderCellVotingPool({ ...props, access }),
				};
			}
			return newCol;
		});
	}, [access]);

	return (
		<>
			<div className="top-row justify-right">
				<ButtonGroup>
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
					<ButtonGroup>
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
						columns={columns}
						headerHeight={42}
						estimatedRowHeight={42}
						rowGetter={getRow}
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
