import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {SelectHeader, SelectCell, TableColumnHeader, ShowFilters, TableViewSelector, TableColumnSelector, SplitPanel, Panel} from 'dot11-components/table'
import {Button, ActionButton} from 'dot11-components/lib/icons'
import {displayDate} from 'dot11-components/lib/utils'
import {ConfirmModal} from 'dot11-components/modals'
import {AccessLevel} from 'dot11-components/lib/user'

import BallotDetail, {BallotAdd} from './BallotDetail'

import {getEntities} from 'dot11-components/store/dataSelectors'
import {setSelected} from 'dot11-components/store/selected'
import {setProperty} from 'dot11-components/store/ui'

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

const BallotsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;
const HeaderSubcomponent = DataSubcomponent.withComponent(BallotsColumnHeader);

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
	return readOnly? resultsStr: <Link to={`/results/${rowData.BallotID}`}>{resultsStr}</Link>
}

export function renderCommentsSummary({rowData, dataKey}) {
	const comments = rowData[dataKey]
	let commentStr = 'None'
	if (comments && comments.Count > 0) {
		commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
	}
	return <Link to={`/comments/${rowData.BallotID}`}>{commentStr}</Link>
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

const defaultTablesColumns = {
	'1': ['__ctrl__', 'Project', 'BallotID', 'Start', 'End', 'Document', 'VotingPool', 'Results', 'Comments'],
	'2': ['__ctrl__', 'Project', 'BallotID', 'Start', 'End', 'Document', 'Topic', 'VotingPool']
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

	return (
		<React.Fragment>
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
						ballotId={ballotId}
					/>
				</Panel>
			</SplitPanel>

		</React.Fragment>
	)
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
