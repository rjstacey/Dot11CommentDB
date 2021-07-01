import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {SelectHeader, SelectCell, DataColumnHeader, ShowFilters, ColumnSelector} from 'dot11-components/table'
import {Button, ActionButton} from 'dot11-components/lib/icons'
import {displayDate} from 'dot11-components/lib/utils'
import {ConfirmModal} from 'dot11-components/modals'
import {AccessLevel} from 'dot11-components/lib/user'

import BallotDetail from './BallotDetail'
import BallotAdd from './BallotAdd'

import {getData, getSortedFilteredIds} from 'dot11-components/store/dataSelectors'
import {setTableView, initTableConfig, setProperty} from 'dot11-components/store/ui'

import {fields, loadBallots, deleteBallots, BallotType} from '../store/ballots'
import {loadVotingPools} from '../store/votingPools'

const dataSet = 'ballots'

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

const DataSubcomponent = styled.div`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const BallotsColumnDropdown = (props) => <DataColumnHeader dataSet={dataSet} {...props}/>;
const HeaderSubcomponent = DataSubcomponent.withComponent(BallotsColumnDropdown);

const renderHeaderCellVotingPool = (props) =>
	<React.Fragment>
		<HeaderSubcomponent {...props} dataKey='VotingPoolID' label='Voting Pool' />
		<HeaderSubcomponent {...props} dataKey='PrevBallotID' label='Prev Ballot' />
	</React.Fragment>

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
	const comments = rowData[dataKey]
	let commentStr = 'None'
	if (comments && comments.Count > 0) {
		commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
	}
	return <Link to={`/Comments/${rowData.BallotID}`}>{commentStr}</Link>
}

function renderDate({rowData, dataKey}) {
	// rowData[key] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	return displayDate(rowData[dataKey]);
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
	{key: 'Start',
		...fields.Start,
		width: 86, flexShrink: 0,
		cellRenderer: renderDate,
		dropdownWidth: 300},
	{key: 'End',
		...fields.End,
		width: 86, flexShrink: 0,
		cellRenderer: renderDate,
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
		label: '',
		width: 100, flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderCellVotingPool,
		cellRenderer: renderVotingPool},
	{key: 'Results',
		...fields.Results,
		width: 150,	flexShrink: 1, flexGrow: 1,
		cellRenderer: (props) => renderResultsSummary({readOnly: true, ...props})},
	{key: 'Comments',
		...fields.Comments,
		width: 100,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary},
];

const defaultTablesConfig = {
	'1': {
		fixed: false,
		columns: ['__ctrl__', 'Project', 'BallotID', 'Start', 'End', 'Document', 'VotingPool', 'Results', 'Comments']
	},
	'2': {
		fixed: false,
		columns: ['__ctrl__', 'Project', 'BallotID', 'Start', 'End', 'Document', 'Topic', 'VotingPool']
	}
};

function setDefaultTableConfig({tablesConfig, initTableConfig, setTableView}) {
	for (const tableView of Object.keys(defaultTablesConfig)) {
		const tableConfig = tablesConfig[tableView];
		if (tableConfig)
			continue;
		const columns = tableColumns.reduce((cols, c) => {
			cols[c.key] = {
				visible: c.key.startsWith('__') || defaultTablesConfig[tableView].columns.includes(c.key),
				width: c.width
			}
			return cols;
		}, {});
		const newTableConfig = {
			fixed: defaultTablesConfig[tableView].fixed,
			columns
		}
		initTableConfig(tableView, newTableConfig);
	}
}

function TableViewSelector({tableView, setTableView}) {
	const tableViews = Object.keys(defaultTablesConfig);
	return tableViews.map(view => 
		<Button
			key={view}
			isActive={tableView === view}
			onClick={e => setTableView(view)}
		>
			{view}
		</Button>
	)
}

const actionsColumn = {
	key: 'Actions',
		label: 'Actions',
		width: 100,	flexShrink: 1, flexGrow: 1
};

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
	ballotsValid,
	selected,
	loading,
	loadBallots,
	deleteBallots,
	votingPoolsValid,
	loadVotingPools,
	tableView,
	tablesConfig,
	setTableView,
	initTableConfig,
	uiProperty,
	setUiProperty
}) {
	const history = useHistory();
	const {ballotId} = useParams();
	const [split, setSplit] = React.useState(0.5);
	const setTableDetailSplit = (deltaX) => setSplit(split => split - deltaX/window.innerWidth);

	/* On mount, if the store does not contain default configuration for each of our views, 
	 * then add them */
	React.useEffect(() => setDefaultTableConfig({tablesConfig, initTableConfig, setTableView}), []);

	React.useEffect(() => {
		if (!ballotsValid && !loading)
			loadBallots()
		if (!votingPoolsValid)
			loadVotingPools()
	}, [ballotsValid, loading, loadBallots, votingPoolsValid, loadVotingPools]);

	const closeBallot = () => history.push('/Ballots')
	const showEpolls = () => history.push('/Epolls/')

	const table =
		<AppTable
			columns={tableColumns}
			tableView={tableView}
			headerHeight={50}
			estimatedRowHeight={50}
			dataSet={dataSet}
			resizeWidth={uiProperty.editView? setTableDetailSplit: undefined}
		/>

	const body = (uiProperty.editView)?
		<React.Fragment>
			<div style={{flex: `${100 - split*100}%`, height: '100%', overflow: 'hidden', boxSizing: 'border-box'}}>
				{table}
			</div>
			<BallotDetail
				style={{flex: `${split*100}%`, height: '100%', overflow: 'auto', boxSizing: 'border-box'}}
				key={selected}
			/>
		</React.Fragment>:
		table

	return (
		<React.Fragment>
			<TopRow>
				<div><label>Ballots</label></div>
				<div style={{display: 'flex'}}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{display: 'flex'}}>
							<TableViewSelector
								tableView={tableView}
								setTableView={setTableView}
							/>
							<ColumnSelector dataSet={dataSet} columns={tableColumns} />
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

			<TableRow>
				{body}
			</TableRow>

		</React.Fragment>
	)
}

Ballots.propTypes = {
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
}

export default connect(
	(state) => {
		const {ballots, votingPools} = state
		const tableView = state[dataSet].ui.tableView;
		const tablesConfig = state[dataSet].ui.tablesConfig;
		return {
			ballotsValid: ballots.valid,
			selected: ballots.selected,
			loading: ballots.loading,
			ballots: getData(state, dataSet),
			votingPoolsValid: votingPools.valid,
			votingPools: getData(state, 'votingPools'),
			tableView,
			tablesConfig,
			uiProperty: state[dataSet].ui
		}
	},
	(dispatch) => {
		return {
			loadBallots: () => dispatch(loadBallots()),
			deleteBallots: (ids) => dispatch(deleteBallots(ids)),
			loadVotingPools: () => dispatch(loadVotingPools()),
			setTableView: view => dispatch(setTableView(dataSet, view)),
			initTableConfig: (view, config) => dispatch(initTableConfig(dataSet, view, config)),
			setUiProperty: (property, value) => dispatch(setProperty(dataSet, property, value))
		}
	}
)(Ballots);
