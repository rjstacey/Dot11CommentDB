import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {ControlHeader, ControlCell, ColumnDropdown} from 'dot11-common/table'
import {ActionButton} from 'dot11-common/lib/icons'
import {displayDate} from 'dot11-common/lib/utils'
import {ConfirmModal} from 'dot11-common/modals'
import {AccessLevel} from 'dot11-common/store/login'

import BallotDetailModal from './BallotDetail'

import {setSelected} from 'dot11-common/store/selected'
import {sortSet} from 'dot11-common/store/sort'
import {getData, getSortedFilteredIds} from 'dot11-common/store/dataSelectors'

import {loadBallots, deleteBallots, BallotType} from '../store/ballots'
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

const BallotsColumnDropdown = (props) => <ColumnDropdown dataSet={dataSet} {...props}/>;
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
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'Project',
		label: 'Project',
		width: 100,	flexShrink: 0, flexGrow: 0,
		dropdownWidth: 200},
	{key: 'BallotID',
		label: 'Ballot',
		width: 100,	flexShrink: 0, flexGrow: 0,
		dropdownWidth: 200},
	{key: 'Document',
		label: 'Document',
		width: 150,	flexShrink: 1, flexGrow: 1,
		dropdownWidth: 300},
	{key: 'Topic',
		label: 'Topic',
		width: 300,	flexShrink: 1, flexGrow: 1},
	{key: 'EpollNum',
		label: 'ePoll',
		width: 80,	flexGrow: 0, flexShrink: 0,
		dropdownWidth: 200},
	{key: 'Start',
		label: 'Start',
		width: 86, flexShrink: 0,
		dataRenderer: displayDate,
		cellRenderer: renderDate,
		dropdownWidth: 300},
	{key: 'End',
		label: 'End',
		width: 86, flexShrink: 0,
		dataRenderer: displayDate,
		cellRenderer: renderDate,
		dropdownWidth: 300},
	{key: 'VotingPool',
		label: '',
		width: 100, flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderCellVotingPool,
		cellRenderer: renderVotingPool},
	{key: 'Results',
		label: 'Result',
		width: 150,	flexShrink: 1, flexGrow: 1,
		cellRenderer: (props) => renderResultsSummary({readOnly: true, ...props})},
	{key: 'Comments',
		label: 'Comments',
		width: 100,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary},
];

const actionsColumn = {
	key: 'Actions',
		label: 'Actions',
		width: 100,	flexShrink: 1, flexGrow: 1
};

const primaryDataKey = 'BallotID';

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
	const {ballotsValid, loading, loadBallots, deleteBallots, votingPoolsValid, loadVotingPools, access} = props;
	const history = useHistory();
	const {ballotId} = useParams();

	const [columns, maxWidth] = React.useMemo(() => {

		let columns = tableColumns;

		if (access >= AccessLevel.SubgroupAdmin) {
			/* Subgroup admin can see results so add link */
			const resultsSummaryRenderer = (props) => renderResultsSummary({readOnly: false, ...props});
			columns = columns.map(col => {
				return (col.key === 'Results')
					? {...col,
						cellRenderer: resultsSummaryRenderer}
					: col
			});
		}

		if (access >= AccessLevel.WGAdmin) {
			/* Working froup admin can edit ballots so add actions column */
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

			columns = columns.concat({
				...actionsColumn,
				cellRenderer: actionCellRenderer
			})
		}

		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40;

		return [columns, maxWidth];

	}, [deleteBallots, history, access]);

	React.useEffect(() => {
		if (!ballotsValid && !loading)
			loadBallots()
		if (!votingPoolsValid)
			loadVotingPools()
	}, [ballotsValid, loading, loadBallots, votingPoolsValid, loadVotingPools]);

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
					<ActionButton name='refresh' title='Refresh' onClick={props.loadBallots} disabled={props.loading} />
				</span>
			</ActionRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					columns={columns}
					dataSet={dataSet}
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
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.array.isRequired,
	selected: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
}

export default connect(
	(state) => {
		const {ballots, votingPools} = state
		return {
			ballotsValid: ballots.valid,
			loading: ballots.loading,
			ballots: getData(state, dataSet),
			selected: ballots.selected,
			votingPoolsValid: votingPools.valid,
			votingPools: getData(state, 'votingPools'),
		}
	},
	(dispatch) => {
		return {
			loadBallots: () => dispatch(loadBallots()),
			deleteBallots: (ids) => dispatch(deleteBallots(ids)),
			loadVotingPools: () => dispatch(loadVotingPools()),
			setSelected: (ballotIds) => dispatch(setSelected(dataSet, ballotIds)),
			setSort: (dataKey, direction) => dispatch(sortSet(dataSet, dataKey, direction)),
		}
	}
)(Ballots);
