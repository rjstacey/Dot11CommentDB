import PropTypes from 'prop-types';
import React from 'react';
import {Link, useHistory, useParams} from "react-router-dom";
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SelectHeader, SelectCell, TableColumnHeader, ShowFilters, TableViewSelector, TableColumnSelector, SplitPanel, Panel} from 'dot11-components/table';
import {Button, ActionButton} from 'dot11-components/icons';
import {AccessLevel, displayDate, displayDateRange} from 'dot11-components/lib';
import {ConfirmModal} from 'dot11-components/modals';

import BallotDetail, {BallotAddDropdown as BallotAdd} from './BallotDetail';

import {setSelected} from 'dot11-components/store/selected'
import {setProperty} from 'dot11-components/store/ui'

import {fields, loadBallots, deleteBallots, BallotType, BallotStage, getBallotsDataSet, dataSet} from '../store/ballots'
import {loadVotingPools, getVotingPoolsDataSet} from '../store/votingPools'


const DataSubcomponent = styled.div`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const BallotsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;
const HeaderSubcomponent = DataSubcomponent.withComponent(BallotsColumnHeader);

const renderHeaderStartEnd = (props) =>
	<>
		<HeaderSubcomponent {...props} dataKey='Start' {...fields.Start} />
		<HeaderSubcomponent {...props} dataKey='End' {...fields.End} />
	</>

const renderCellStartEnd = ({rowData, dataKey}) => displayDateRange(rowData.Start, rowData.End);

const NoWrapItem = styled.div`
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
`;

const renderHeaderTypeStage = (props) =>
	<>
		<HeaderSubcomponent {...props} dataKey='Type' {...fields.Type} />
		<HeaderSubcomponent {...props} dataKey='IsRecirc' {...fields.IsRecirc} />
	</>

const renderCellTypeStage = ({rowData}) =>
	<>
		<NoWrapItem>{fields.Type.dataRenderer(rowData.Type)}</NoWrapItem>
		<NoWrapItem>{fields.IsRecirc.dataRenderer(rowData.IsRecirc)}</NoWrapItem>
	</>

const renderHeaderVotingPool = (props) =>
	<>
		<HeaderSubcomponent {...props} dataKey='VotingPoolID' {...fields.VotingPoolID} />
		<HeaderSubcomponent {...props} dataKey='PrevBallotID' {...fields.PrevBallotID} />
	</>

const renderCellVotingPool = ({rowData}) => {
	const type = rowData.Type;
	const isRecirc = rowData.IsRecirc;
	if ((type === BallotType.WG && !isRecirc) || type === BallotType.Motion) {
		const access = window.user.Access;
		return access >= AccessLevel.SubgroupAdmin?
			<Link to={`/voters/${rowData.VotingPoolID}`}>{rowData.VotingPoolID}</Link>:
			rowData.VotingPoolID;
	}
	if (type === BallotType.WG)
		return rowData.PrevBallotID;
	return '';
}

export function renderResultsSummary({rowData, readOnly}) {
	const access = window.user.Access;
	const results = rowData.Results;
	let str = '';
	if (results && results.TotalReturns) {
		str = `${results.Approve}/${results.Disapprove}/${results.Abstain}`;
		const p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
		if (!isNaN(p))
			str += ` (${p.toFixed(1)}%)`;
	}
	if (!str)
		str = 'None';
	return access >= AccessLevel.SubgroupAdmin?
		<Link to={`/results/${rowData.BallotID}`}>{str}</Link>:
		str;
}

export function renderCommentsSummary({rowData}) {
	const comments = rowData.Comments;
	const str =
		(comments && comments.Count > 0)
			? `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
			: 'None';
	return <Link to={`/comments/${rowData.BallotID}`}>{str}</Link>
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
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
		cellRenderer: (props) => renderResultsSummary({readOnly: true, ...props})},
	{key: 'Comments',
		...fields.Comments,
		width: 100,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary},
];

const defaultTablesColumns = {
	'Basic': ['__ctrl__', 'BallotID', 'Project', 'Start/End', 'Document', 'Results', 'Comments'],
	'Detailed': ['__ctrl__', 'BallotID', 'Project', 'Type/Stage', 'Start/End', 'Document', 'Topic', 'VotingPool/PrevBallot', 'Results', 'Comments']
};

const defaultTablesConfig = {};

for (const tableView of Object.keys(defaultTablesColumns)) {
	const tableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}

// The top row height is determined by its content
const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const ButtonGroup = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	background: linear-gradient(to bottom, #fdfdfd 0%,#f6f7f8 100%);
	border: 1px solid #999;
	border-radius: 2px;
	padding: 5px;
	margin: 0 5px;
`;

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
	width: 100%;
`;

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

function Ballots({access}) {

	const history = useHistory();
	const {ballotId} = useParams();

	const {valid, loading, entities: ballots, ui: uiProperty, selected} = useSelector(getBallotsDataSet);
	const {valid: votingPoolsValid, loading: votingPoolsLoading} = useSelector(getVotingPoolsDataSet);

	const dispatch = useDispatch();

	const load = React.useCallback(() => {
		dispatch(loadBallots());
		dispatch(loadVotingPools());
	}, [dispatch]);

	const setUiProperty = React.useCallback((property, value) => dispatch(setProperty(dataSet, property, value)), [dispatch]);

	const closeBallot = () => history.push('/ballots');
	const showEpolls = () => history.push('/epolls/');

	return (
		<>
		<TopRow>
			<div><label>Ballots</label></div>
			<div style={{display: 'flex'}}>
				<ButtonGroup>
					<div>Table view</div>
					<div style={{display: 'flex'}}>
						<TableViewSelector dataSet={dataSet} />
						<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
						{access >= AccessLevel.WGAdmin && 
							<ActionButton
								name='book-open'
								title='Show detail'
								isActive={uiProperty.editView} 
								onClick={() => setUiProperty('editView', !uiProperty.editView)} 
							/>}
					</div>
				</ButtonGroup>
				{access >= AccessLevel.WGAdmin &&
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
			dataSet={dataSet}
			fields={fields}
		/>

		<SplitPanel splitView={(access >= AccessLevel.WGAdmin && uiProperty.editView) || false} >
			<Panel>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={50}
					estimatedRowHeight={50}
					dataSet={dataSet}
					rowGetter={getRow}
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
