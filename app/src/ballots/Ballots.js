import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import Immutable from 'immutable'
import styled from '@emotion/styled'
import BallotDetailModal from './BallotDetail'
import ConfirmModal from '../modals/ConfirmModal'
import AppTable from '../table/AppTable'
import ColumnDropdown from '../table/ColumnDropdown'
import {getBallots, deleteBallots} from '../actions/ballots'
import {setSelected} from '../actions/select'
import {setSort} from '../actions/sort'
import {getDataMap} from '../selectors/dataMap'
import {getVotingPools} from '../actions/votingPools'
import {ActionButton} from '../general/Icons'

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
	height: 18px;
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const HeaderSubcomponent = DataSubcomponent.withComponent(ColumnDropdown);

const renderHeaderCellVotingPool = (props) =>
	<React.Fragment>
		<HeaderSubcomponent {...props} dataKey='VotingPoolID' label='Voting Pool' />
		<HeaderSubcomponent {...props} dataKey='PrevBallotID' label='Prev Ballot' />
	</React.Fragment>

const renderVotingPool = ({rowData}) => {
	const type = rowData.Type
	if (type === 1 || type === 3 || type === 5) {
		return rowData.VotingPoolID
	}
	else if (type === 2 || type === 4) {
		return rowData.PrevBallotID
	}
	return ''
}

export function renderResultsSummary({rowData, dataKey}) {
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
	return <Link to={`/Results/${rowData.BallotID}`}>{resultsStr}</Link>
}

export function renderCommentsSummary({rowData, key}) {
	const comments = rowData[key]
	let commentStr = 'None'
	if (comments && comments.Count > 0) {
		commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
	}
	return <Link to={`/Comments/${rowData.BallotID}`}>{commentStr}</Link>
}

function renderDate({rowData, dataKey}) {
	// rowData[key] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	const d = new Date(rowData[dataKey])
	const str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
	return str
}

const tableColumns = Immutable.OrderedMap({
	Project:
		{label: 'Project',
			width: 100,	flexShrink: 0, flexGrow: 0},
	BallotID: 
		{label: 'Ballot',
			width: 100,	flexShrink: 0, flexGrow: 0},
	Document:
		{label: 'Document',
			width: 150,	flexShrink: 1, flexGrow: 1},
	Topic:
		{label: 'Topic',
			width: 300,	flexShrink: 1, flexGrow: 1},
	EpollNum:
		{label: 'ePoll',
			width: 80,	flexGrow: 0, flexShrink: 0},
	Start:
		{label: 'Start',
			width: 86, flexShrink: 0,
			cellRenderer: renderDate},
	End:
		{label: 'End',
			width: 86, flexShrink: 0,
			cellRenderer: renderDate},
	VotingPool:
		{label: '',
			width: 100, flexShrink: 1, flexGrow: 1,
			headerRenderer: renderHeaderCellVotingPool,
			cellRenderer: renderVotingPool},
	Results:
		{label: 'Result',
			width: 150,	flexShrink: 1, flexGrow: 1,
			cellRenderer: renderResultsSummary},
	Comments:
		{label: 'Comments',
			width: 100,	flexShrink: 1, flexGrow: 1,
			cellRenderer: renderCommentsSummary},
	Actions:
		{label: 'Actions',
			width: 100,	flexShrink: 1, flexGrow: 1}
});

const primaryDataKey = 'BallotID';
const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;

// The action row height is determined by its content
const ActionRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
	width: 100%;
`;

function Ballots(props) {
	const history = useHistory();
	const {ballotId} = useParams();

	const columns = React.useMemo(() => {
		return tableColumns.update('Actions', c => ({
			...c,
			cellRenderer: ({rowData}) => 
				<RowActions
					onEdit={() => history.push(`/Ballots/${rowData.BallotID}`)}
					onDelete={() => deleteBallot(rowData)}
				/>
		}));
	}, []);

	React.useEffect(() => {
		if (!props.ballotsValid && !props.loading)
			props.getBallots()
		if (!props.votingPoolsValid)
			props.getVotingPools()
	}, []);

	const deleteBallot = async (ballot) => {
		const ok = await ConfirmModal.show(`Are you sure you want to delete ${ballot.BallotID}?`)
		if (ok)
			await props.deleteBallots([ballot.BallotID])
	}
	const addBallot = event => history.push('/Ballots/+')
	const closeBallot = () => history.push('/Ballots')
	const showEpolls = () => history.push('/Epolls/')

	return (
		<React.Fragment>
			<ActionRow style={{maxWidth}}>
				<span><label>Ballots</label></span>
				<span>
					<ActionButton name='add' title='Add' onClick={addBallot} />
					<ActionButton name='import' title='Import ePoll' onClick={showEpolls} />
					<ActionButton name='refresh' title='Refresh' onClick={props.getBallots} disabled={props.loading} />
				</span>
			</ActionRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					columns={columns}
					controlColumn
					dataSet={'ballots'}
					rowKey={primaryDataKey}
					headerHeight={40}
					rowHeight={40}
					estimatedRowHeight={54}
					loading={props.loading}
				/>
			</TableRow>

			<BallotDetailModal
				isOpen={!!ballotId}
				ballotId={ballotId || ''}
				close={closeBallot}
			/>
		</React.Fragment>
	)
}

Ballots.propTypes = {
	filters: PropTypes.object.isRequired,
	sort: PropTypes.object.isRequired,
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.array.isRequired,
	ballotsMap: PropTypes.array.isRequired,
	selected: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
}

const dataSet = 'ballots'

export default connect(
	(state, ownProps) => {
		const {ballots, votingPools} = state
		return {
			filters: ballots.filters,
			sort: ballots.sort,
			ballotsValid: ballots.valid,
			loading: ballots.loading,
			ballots: ballots.ballots,
			ballotsMap: getDataMap(state, 'ballots'),
			selected: ballots.selected,
			votingPoolsValid: votingPools.valid,
			votingPools: votingPools.votingPools,
		}
	},
	(dispatch, ownProps) => {
		return {
			getBallots: () => dispatch(getBallots()),
			deleteBallots: (ids) => dispatch(deleteBallots(ids)),
			getVotingPools: () => dispatch(getVotingPools()),
			setSelected: (ballotIds) => dispatch(setSelected(dataSet, ballotIds)),
			setSort: (dataKey, direction) => dispatch(setSort(dataSet, dataKey, direction)),
		}
	}
)(Ballots);
