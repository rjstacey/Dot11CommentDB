import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import styled from '@emotion/styled';

import {
	AppTable, SelectHeaderCell, SelectCell, TableColumnHeader, ShowFilters, TableViewSelector, TableColumnSelector, SplitPanel, Panel,
	ActionButton, ButtonGroup,
	displayDateRange,
	ColumnProperties, TablesConfig, TableConfig, HeaderCellRendererProps
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import TopRow from '../components/TopRow';
import BallotDetail, {BallotAddDropdown as BallotAdd} from './BallotDetail';

import {
	fields,
	loadBallots,
	BallotType,
	selectBallotsState,
	ballotsSelectors,
	ballotsActions,
	SyncedBallot, Ballot
} from '../store/ballots';

import { selectUserAccessLevel, AccessLevel } from '../store/user';

const renderHeaderStartEnd = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Start' {...fields.Start} />
		<TableColumnHeader {...props} dataKey='End' {...fields.End} />
	</>

const renderCellStartEnd = ({rowData}) => displayDateRange(rowData.Start, rowData.End);

const NoWrapItem = styled.div`
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
`;

const renderHeaderTypeStage = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Type' {...fields.Type} />
		<TableColumnHeader {...props} dataKey='IsRecirc' {...fields.IsRecirc} />
	</>

const renderCellTypeStage = ({rowData}: {rowData: SyncedBallot}) =>
	<>
		<NoWrapItem>{fields.Type.dataRenderer(rowData.Type)}</NoWrapItem>
		<NoWrapItem>{fields.IsRecirc.dataRenderer(rowData.IsRecirc)}</NoWrapItem>
	</>

const renderHeaderVotingPool = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='VotingPoolID' {...fields.VotingPoolID} />
		<TableColumnHeader {...props} dataKey='PrevBallotID' {...fields.PrevBallotID} />
	</>

const renderCellVotingPool = ({rowData, access}: {rowData: SyncedBallot, access?: number}) => {
	const type = rowData.Type;
	const isRecirc = rowData.IsRecirc;
	if ((type === BallotType.WG && !isRecirc) || type === BallotType.Motion) {
		//const access = window.user.Access; // XXX
		return (typeof access === 'number' && access >= AccessLevel.admin)?
			<Link to={`/voters/${rowData.VotingPoolID}`}>{rowData.VotingPoolID}</Link>:
			rowData.VotingPoolID;
	}
	if (type === BallotType.WG)
		return rowData.PrevBallotID;
	return '';
}

export function renderResultsSummary({rowData, access}: {rowData: Ballot, access?: number}) {
	//const access = window.user.Access;	// XXX
	const results = rowData.Results;
	let str = '';
	if (results && results.TotalReturns) {
		str = `${results.Approve}/${results.Disapprove}/${results.Abstain}`;
		const p = 100*results.Approve/(results.Approve+results.Disapprove);
		if (!isNaN(p))
			str += ` (${p.toFixed(1)}%)`;
	}
	if (!str)
		str = 'None';
	return (typeof access !== 'undefined' && access >= AccessLevel.admin)?
		<Link to={`/results/${rowData.BallotID}`}>{str}</Link>:
		str;
}

export function renderCommentsSummary({rowData}: {rowData: Ballot}) {
	const comments = rowData.Comments;
	const str =
		(comments && comments.Count > 0)
			? `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
			: 'None';
	return <Link to={`/comments/${rowData.BallotID}`}>{str}</Link>
}

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p => 
			<SelectCell
				selectors={ballotsSelectors}
				actions={ballotsActions}
				{...p}
			/>},
	{key: 'Project',
		...fields.Project,
		width: 100,	flexShrink: 0, flexGrow: 0,
		dropdownWidth: 200},
	{key: 'BallotID',
		...fields.BallotID,
		width: 100,	flexShrink: 0, flexGrow: 0,
		dropdownWidth: 200},
	{key: 'Type/Stage',
		label: 'Type/Stage',
		width: 120, flexShrink: 0,
		headerRenderer: renderHeaderTypeStage,
		cellRenderer: renderCellTypeStage},
	{key: 'Type',
		...fields.Type,
		width: 100,	flexShrink: 0, flexGrow: 0},
	{key: 'IsRecirc',
		...fields.IsRecirc,
		width: 100,	flexShrink: 0, flexGrow: 0},
	{key: 'Start/End',
		label: 'Start/End',
		width: 120, flexShrink: 0,
		headerRenderer: renderHeaderStartEnd,
		cellRenderer: renderCellStartEnd},
	{key: 'Start',
		...fields.Start,
		width: 86, flexShrink: 0,
		dropdownWidth: 300},
	{key: 'End',
		...fields.End,
		width: 86, flexShrink: 0,
		dropdownWidth: 300},
	{key: 'Document',
		...fields.Document,
		width: 150,	flexShrink: 1, flexGrow: 1,
		dropdownWidth: 300},
	{key: 'Topic',
		...fields.Topic,
		width: 300,	flexShrink: 1, flexGrow: 1},
	{key: 'EpollNum',
		...fields.EpollNum,
		width: 80,	flexGrow: 0, flexShrink: 0,
		dropdownWidth: 200},
	{key: 'VotingPool/PrevBallot',
		label: 'Voting pool/Prev ballot',
		width: 100, flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderVotingPool,
		cellRenderer: renderCellVotingPool},
	{key: 'Results',
		...fields.Results,
		width: 150,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderResultsSummary},
	{key: 'Comments',
		...fields.Comments,
		width: 100,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary},
];

const defaultTablesColumns = {
	'Basic': ['__ctrl__', 'BallotID', 'Project', 'Start/End', 'Document', 'Results', 'Comments'],
	'Detailed': ['__ctrl__', 'BallotID', 'Project', 'Type/Stage', 'Start/End', 'Document', 'Topic', 'VotingPool/PrevBallot', 'Results', 'Comments']
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}

function getRow({rowIndex, ids, entities}) {
	const currData = entities[ids[rowIndex]];
	if (rowIndex === 0)
		return currData;
	const prevData = entities[ids[rowIndex-1]];
	if (currData.Project !== prevData.Project)
		return currData;
	// Previous row holds the same comment
	return {
		...currData,
		Project: '',
	}
}

function Ballots() {

	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const access = useAppSelector(selectUserAccessLevel);
	const {loading, selected} = useAppSelector(selectBallotsState);
	const {isSplit} = useAppSelector(ballotsSelectors.selectCurrentPanelConfig);

	const load = React.useCallback(() => {
		dispatch(loadBallots());
	}, [dispatch]);

	const showEpolls = () => navigate('/epolls/');

	const columns = React.useMemo(() => {
		return tableColumns
			.slice()
			.map(col => {
				let newCol: ColumnProperties = col;
				if (col.key === 'Results') {
					newCol = {
						...col,
						cellRenderer: (props) => renderResultsSummary({...props, access})
					}
				}
				if (col.key === 'VotingPool/PrevBallot') {
					newCol = {
						...col,
						cellRenderer: (props) => renderCellVotingPool({...props, access})
					}
				}
				return newCol;
			})

	}, [access])
	return (
		<>
			<TopRow>
				<div />
				<div style={{display: 'flex'}}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{display: 'flex'}}>
							<TableViewSelector
								selectors={ballotsSelectors}
								actions={ballotsActions}
							/>
							<TableColumnSelector 
								selectors={ballotsSelectors}
								actions={ballotsActions}
								columns={tableColumns}
							/>
							{access >= AccessLevel.admin && 
								<ActionButton
									name='book-open'
									title='Show detail'
									isActive={isSplit}
									onClick={() => dispatch(ballotsActions.setPanelIsSplit({isSplit: !isSplit}))} 
								/>}
						</div>
					</ButtonGroup>
					{access >= AccessLevel.admin &&
						<ButtonGroup>
							<div>Edit</div>
							<div style={{display: 'flex'}}>
								<ActionButton name='import' title='Import ePoll' onClick={showEpolls} />
								<BallotAdd />
							</div>
						</ButtonGroup>}
					<ActionButton name='refresh' title='Refresh' onClick={load} disabled={loading} />
				</div>
			</TopRow>

			<ShowFilters
				selectors={ballotsSelectors}
				actions={ballotsActions}
				fields={fields}
			/>

			<SplitPanel
				selectors={ballotsSelectors}
				actions={ballotsActions}
			>
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
				<Panel style={{overflow: 'auto'}}>
					<BallotDetail
						key={selected.join()}
					/>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Ballots;
