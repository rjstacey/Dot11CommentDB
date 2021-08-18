import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {SelectHeader, SelectCell, TableColumnHeader, ShowFilters, TableViewSelector, TableColumnSelector, SplitPanel, Panel} from 'dot11-components/table'
import {Button, ActionButton} from 'dot11-components/icons'
import {AccessLevel, displayDate, displayDateRange} from 'dot11-components/lib'
import {ConfirmModal} from 'dot11-components/modals'

import BallotDetail, {BallotAddDropdown as BallotAdd} from './BallotDetail'

import {getEntities} from 'dot11-components/store/dataSelectors'
import {setSelected} from 'dot11-components/store/selected'
import {setProperty} from 'dot11-components/store/ui'

import {fields, loadBallots, deleteBallots, BallotType, BallotStage} from '../store/ballots'
import {loadVotingPools} from '../store/votingPools'

const dataSet = 'ballots'

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
	if ((type === BallotType.WG && !isRecirc) || type === BallotType.Motion)
		return rowData.VotingPoolID;
	if (type === BallotType.WG)
		return rowData.PrevBallotID;
	return '';
}

export function renderResultsSummary({rowData, readOnly}) {
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
	return readOnly? str: <Link to={`/results/${rowData.BallotID}`}>{str}</Link>
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
	{key: 'BallotID',
		...fields.BallotID,
		width: 100,	flexShrink: 0, flexGrow: 0,
		dropdownWidth: 200},
	{key: 'Project',
		...fields.Project,
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
	{key: 'Stage',
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
	{key: 'VotingPool',
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
	'1': ['__ctrl__', 'BallotID', 'Project', 'Start/End', 'Document', 'VotingPool', 'Results', 'Comments'],
	'2': ['__ctrl__', 'BallotID', 'Project', 'Start/End', 'Document', 'Topic', 'VotingPool']
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

function Ballots({
	access,
	ballots,
	ballotsValid,
	selected,
	setSelected,
	loading,
	loadBallots,
	deleteBallots,
	votingPoolsValid,
	loadVotingPools,
	uiProperty,
	setUiProperty
}) {
	const history = useHistory();
	const {ballotId} = useParams();

	React.useEffect(() => {
		if (!ballotsValid && !loading)
			loadBallots();
		if (!votingPoolsValid)
			loadVotingPools();
		if (ballotsValid && ballotId && selected.length === 0) {
			for (const ballot of Object.values(ballots)) {
				if (ballot.BallotID === ballotId)
					setSelected([ballot.id]);
			}
		}
	}, [ballotsValid, loading, loadBallots, votingPoolsValid, loadVotingPools]);

	React.useEffect(() => {
		if (!ballotsValid)
			return;
		if (selected.length === 1) {
			const ballot = ballots[selected[0]];
			if (ballot.BallotID !== ballotId)
				history.push(`/ballots/${ballot.BallotID}`);
		}
		else {
			if (ballotId)
				history.push('/ballots');
		}
	}, [ballotId, selected]);

	const closeBallot = () => history.push('/Ballots');
	const showEpolls = () => history.push('/epolls/');

	return <>
		<TopRow>
			<div><label>Ballots</label></div>
			<div style={{display: 'flex'}}>
				<ButtonGroup>
					<div>Table view</div>
					<div style={{display: 'flex'}}>
						<TableViewSelector dataSet={dataSet} />
						<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
						<ActionButton
							name='book-open'
							title='Show detail'
							isActive={uiProperty.editView} 
							onClick={() => setUiProperty('editView', !uiProperty.editView)} 
						/>
					</div>
				</ButtonGroup>
				<ButtonGroup>
					<div>Edit</div>
					<div style={{display: 'flex'}}>
						<ActionButton name='import' title='Import ePoll' onClick={showEpolls} />
						<BallotAdd />
					</div>
				</ButtonGroup>
				<ActionButton name='refresh' title='Refresh' onClick={loadBallots} disabled={loading} />
			</div>
		</TopRow>

		<ShowFilters
			dataSet={dataSet}
			fields={fields}
		/>

		<SplitPanel splitView={uiProperty.editView || false} >
			<Panel>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={50}
					estimatedRowHeight={50}
					dataSet={dataSet}
				/>
			</Panel>
			<Panel style={{overflow: 'auto'}}>
				<BallotDetail
					key={selected}
				/>
			</Panel>
		</SplitPanel>
	</>
}

Ballots.propTypes = {
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.object.isRequired,
	loading: PropTypes.bool.isRequired,
	selected: PropTypes.array.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
}

export default connect(
	(state) => {
		const {ballots, votingPools} = state
		return {
			ballotsValid: ballots.valid,
			selected: ballots.selected,
			loading: ballots.loading,
			ballots: getEntities(state, dataSet),
			votingPoolsValid: votingPools.valid,
			uiProperty: state[dataSet].ui
		}
	},
	(dispatch) => {
		return {
			loadBallots: () => dispatch(loadBallots()),
			deleteBallots: (ids) => dispatch(deleteBallots(ids)),
			loadVotingPools: () => dispatch(loadVotingPools()),
			setSelected: (ids) => dispatch(setSelected('ballots', ids)),
			setUiProperty: (property, value) => dispatch(setProperty(dataSet, property, value))
		}
	}
)(Ballots);
