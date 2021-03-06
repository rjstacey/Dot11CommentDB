import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {SelectHeader, SelectCell, TableColumnHeader, ShowFilters, TableColumnSelector, TableViewSelector} from 'dot11-components/table'
import {Button, ActionButton} from 'dot11-components/lib/icons'
import {displayDate} from 'dot11-components/lib/utils'
import {ConfirmModal} from 'dot11-components/modals'
import {AccessLevel} from 'dot11-components/lib/user'

import {fields, loadBallots, BallotType} from '../store/ballots'

const dataSet = 'ballots'

const DataSubcomponent = styled.div`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const BallotsColumnDropdown = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;
const HeaderSubcomponent = DataSubcomponent.withComponent(BallotsColumnDropdown);

const renderHeaderCellVotingPool = (props) =>
	<>
		<HeaderSubcomponent {...props} dataKey='VotingPoolID' label='Voting Pool' />
		<HeaderSubcomponent {...props} dataKey='PrevBallotID' label='Prev Ballot' />
	</>

const renderVotingPool = ({rowData}) => {
	const type = rowData.Type
	if (type === BallotType.WG_Initial || type === BallotType.SA_Initial || type === BallotType.Motion) {
		return rowData.VotingPoolID
	}
	else if (type === BallotType.WG_Recirc || type === BallotType.SA_Recirc) {
		return rowData.PrevBallotID
	}
	return ''
}

const renderHeaderStartEnd = (props) =>
	<>
		<HeaderSubcomponent {...props} dataKey='Start' label='Start' dataRenderer={displayDate} />
		<HeaderSubcomponent {...props} dataKey='End' label='End' dataRenderer={displayDate} />
	</>

const NoWrapItem = styled.div`
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
`;

const renderStartEnd = ({rowData, dataKey}) =>
	<>
		<NoWrapItem>{displayDate(rowData['Start'])}</NoWrapItem>
		<NoWrapItem>{displayDate(rowData['End'])}</NoWrapItem>
	</>

export function renderResultsSummary({rowData, dataKey, readOnly}) {
	const results = rowData[dataKey]
	let resultsStr = ''
	if (results && results.TotalReturns) {
		let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove))
		resultsStr = `${results.Approve}/${results.Disapprove}/${results.Abstain}`
		if (!isNaN(p)) {
			resultsStr += ` (${p.toFixed(1)}%)`
		}
	}
	if (!resultsStr) {
		resultsStr = 'None'
	}
	return readOnly? resultsStr: <Link to={`/Results/${rowData.BallotID}`}>{resultsStr}</Link>
}

export function renderCommentsSummary({rowData, dataKey}) {
	const comments = rowData[dataKey];
	let commentStr = 'None';
	if (comments && comments.Count > 0) {
		commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
	}
	return <Link to={`/Comments/${rowData.BallotID}`}>{commentStr}</Link>
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
	{key: 'Start/End',
		width: 120, flexShrink: 0,
		headerRenderer: renderHeaderStartEnd,
		cellRenderer: renderStartEnd},
	{key: 'Start',
		...fields.Start,
		width: 120, flexShrink: 0,
		dropdownWidth: 300},
	{key: 'End',
		...fields.End,
		width: 120, flexShrink: 0,
		dropdownWidth: 300},
	{key: 'Type',
		...fields.Type,
		width: 80, flexShrink: 0},
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
	{key: 'VotingPool/PrevBallotID',
		label: 'Voting Pool/Prev Ballot',
		width: 100, flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderCellVotingPool,
		cellRenderer: renderVotingPool},
	{key: 'VotingPoolID',
		label: 'Voting Pool',
		width: 100, flexShrink: 1, flexGrow: 1},
	{key: 'PrevBallotID',
		label: 'Prev Ballot',
		width: 100, flexShrink: 1, flexGrow: 1},
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
	'Tight': ['__ctrl__', 'Project', 'BallotID', 'Start/End', 'Type', 'Document', 'VotingPool/PrevBallotID', 'Results', 'Comments'],
	'Relaxed': ['__ctrl__', 'Project', 'BallotID', 'Start', 'End', 'Type', 'Document', 'Topic', 'VotingPool/PrevBallotID']
};

const defaultTablesConfig = {};
for (const [view, colsArray] of Object.entries(defaultTablesColumns)) {
	const columns = {};
	defaultTablesConfig[view] = {fixed: false, columns};
	for (const column of tableColumns) {
		columns[column.key] = {
			unselectable: column.key.startsWith('__'),
			shown: colsArray.includes(column.key),
			width: column.width,
		}
	}
}

const primaryDataKey = 'BallotID';

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
	valid,
	loading,
	loadBallots,
	tableView,
	tablesConfig,
}) {
	const history = useHistory();
	const {ballotId} = useParams();

	React.useEffect(() => {
		if (!valid && !loading)
			loadBallots();
	}, []);

	const closeBallot = () => history.push('/Ballots')

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
						</div>
					</ButtonGroup>
					<ActionButton name='refresh' title='Refresh' onClick={loadBallots} disabled={loading} />
				</div>
			</TopRow>

			<ShowFilters
				dataSet={dataSet}
				fields={fields}
			/>

			<TableRow>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					tableView={tableView}
					headerHeight={50}
					estimatedRowHeight={50}
					dataSet={dataSet}
				/>
			</TableRow>

		</>
	)
}

Ballots.propTypes = {
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
}

export default connect(
	(state) => {
		const tableView = state[dataSet].ui.tableView;
		const tablesConfig = state[dataSet].ui.tablesConfig;
		return {
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			tableView,
			tablesConfig,
		}
	},
	{loadBallots}
)(Ballots);
