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
import {ControlHeader, ControlCell} from '../table/ControlColumn'
import {ActionButton} from '../general/Icons'
import {displayDate} from '../lib/utils'

import {getBallots, deleteBallots, BallotType} from '../store/actions/ballots'
import {setSelected} from '../store/actions/select'
import {setSort} from '../store/actions/sort'
import {getDataMap} from '../store/selectors/dataMap'
import {getVotingPools} from '../store/actions/votingPools'
import {AccessLevel} from '../store/actions/login'

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

const HeaderSubcomponent = DataSubcomponent.withComponent(ColumnDropdown);

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

const tableColumns = Immutable.OrderedMap({
	__ctrl__:
		{
			width: 30, flexGrow: 1, flexShrink: 0,
			headerRenderer: p => <ControlHeader {...p} />,
			cellRenderer: p => <ControlCell {...p} />},
	Project:
		{label: 'Project',
			width: 100,	flexShrink: 0, flexGrow: 0,
			dropdownWidth: 200},
	BallotID: 
		{label: 'Ballot',
			width: 100,	flexShrink: 0, flexGrow: 0,
			dropdownWidth: 200},
	Document:
		{label: 'Document',
			width: 150,	flexShrink: 1, flexGrow: 1,
			dropdownWidth: 300},
	Topic:
		{label: 'Topic',
			width: 300,	flexShrink: 1, flexGrow: 1},
	EpollNum:
		{label: 'ePoll',
			width: 80,	flexGrow: 0, flexShrink: 0,
			dropdownWidth: 200},
	Start:
		{label: 'Start',
			width: 86, flexShrink: 0,
			dataRenderer: displayDate,
			cellRenderer: renderDate,
			dropdownWidth: 300},
	End:
		{label: 'End',
			width: 86, flexShrink: 0,
			dataRenderer: displayDate,
			cellRenderer: renderDate,
			dropdownWidth: 300},
	VotingPool:
		{label: '',
			width: 100, flexShrink: 1, flexGrow: 1,
			headerRenderer: renderHeaderCellVotingPool,
			cellRenderer: renderVotingPool},
	Results:
		{label: 'Result',
			width: 150,	flexShrink: 1, flexGrow: 1,
			cellRenderer: (props) => renderResultsSummary({readOnly: true, ...props})},
	Comments:
		{label: 'Comments',
			width: 100,	flexShrink: 1, flexGrow: 1,
			cellRenderer: renderCommentsSummary},
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
	const {ballotsValid, loading, getBallots, deleteBallots, votingPoolsValid, getVotingPools, access} = props;
	const history = useHistory();
	const {ballotId} = useParams();

	const columns = React.useMemo(() => {
		if (access < AccessLevel.SubgroupAdmin)
			return tableColumns;

		const resultsSummaryRenderer = (props) => renderResultsSummary({readOnly: false, ...props});
		let columns = tableColumns
			.set('Results', 
				{...tableColumns.get('Results'), cellRenderer: resultsSummaryRenderer});

		if (access < AccessLevel.WGAdmin)
			return columns;

		const deleteBallot = async (ballot) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${ballot.BallotID}?`)
			if (ok)
				await deleteBallots([ballot])
		}

		const actionCellRenderer = ({rowData}) => 
			<RowActions
				onEdit={() => history.push(`/Ballots/${rowData.BallotID}`)}
				onDelete={() => deleteBallot(rowData)}
			/>

		return columns
			.set('Actions',
				{label: 'Actions',
					width: 100,	flexShrink: 1, flexGrow: 1,
					cellRenderer: actionCellRenderer});
	}, [deleteBallots, history, access]);

	React.useEffect(() => {
		if (!ballotsValid && !loading)
			getBallots()
		if (!votingPoolsValid)
			getVotingPools()
	}, [ballotsValid, loading, getBallots, votingPoolsValid, getVotingPools]);

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
