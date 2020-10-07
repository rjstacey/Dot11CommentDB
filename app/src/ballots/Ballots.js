import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from "react-router-dom"
import {connect} from 'react-redux'
import BallotDetailModal from './BallotDetail'
import ConfirmModal from '../modals/ConfirmModal'
import AppTable from '../table/AppTable'
import ColumnDropdown from '../table/ColumnDropdown'
import {genBallotsOptions, setBallotsSelected, getBallots, deleteBallots} from '../actions/ballots'
import {setSort} from '../actions/sort'
import {setFilter, removeFilter, clearFilters} from '../actions/filter'
import {getVotingPools} from '../actions/voters'
import {ActionButton} from '../general/Icons'
import styled from '@emotion/styled'

const ballotFieldLabel = dataKey => ({
	Project: 'Project',
	BallotID: 'Ballot ID',
	EpollNum: 'ePoll Number',
	VotingPoolID: 'Voting Pool',
	PrevBallotID: 'Prev Ballot ID'
}[dataKey] || dataKey);

const BallotsColumnDropdown = connect(
	(state, ownProps) => {
		const {dataKey} = ownProps
		return {
			label: ballotFieldLabel(dataKey),
			filter: state.ballots.filters[dataKey],
			sort: state.ballots.sort,
		}
	},
	(dispatch, ownProps) => {
		const {dataKey} = ownProps
		return {
			setFilter: (value) => dispatch(setFilter('ballots', dataKey, value)),
			setSort: (dataKey, direction) => dispatch(setSort('ballots', dataKey, direction)),
			genOptions: (all) => dispatch(genBallotsOptions(dataKey, all))
		}
	}
)(ColumnDropdown);

const renderHeaderCell = (props) => <BallotsColumnDropdown dataKey={props.column.key} {...props} />

const DataSubcomponent = styled.div`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	height: 18px;
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const HeaderSubcomponent = DataSubcomponent.withComponent(BallotsColumnDropdown);

function renderHeaderCellVotingPool(props) {
	return (
		<React.Fragment>
			<HeaderSubcomponent dataKey='VotingPoolID' {...props} />
			<HeaderSubcomponent dataKey='PrevBallotID' {...props} />
		</React.Fragment>
	)
}

function renderVotingPool({rowData}) {
	const type = rowData.Type
	if (type === 1 || type === 3 || type === 5) {
		return rowData.VotingPoolID
	}
	else if (type === 2 || type === 4) {
		return rowData.PrevBallotID
	}
	return ''
}

export function renderResultsSummary({rowData, key}) {
	const results = rowData[key]
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

function renderDate({rowData, key}) {
	// rowData[key] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	const d = new Date(rowData[key])
	const str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
	return str
}

const columns = [
	{key: 'Project', label: 'Project',
		width: 65,	flexShrink: 0, flexGrow: 0,
		headerRenderer: renderHeaderCell},
	{key: 'BallotID', label: 'Ballot ID',
		width: 75,	flexShrink: 0, flexGrow: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Document', label: 'Document',
		width: 150,	flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Topic', label: 'Topic',
		width: 300,	flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderCell},
	{key: 'EpollNum', label: 'ePoll',
		width: 80,	flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Start', label: 'Start',
		width: 86, flexShrink: 0,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDate},
	{key: 'End', label: 'End',
		width: 86, flexShrink: 0,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDate},
	{key: 'N/A', label: 'Voting Pool/Prev Ballot',
		width: 100, flexShrink: 1, flexGrow: 1,
		headerRenderer: renderHeaderCellVotingPool,
		cellRenderer: renderVotingPool},
	{key: 'Results', label: 'Result',
		width: 150,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderResultsSummary},
	{key: 'Comments', label: 'Comments',
		width: 100,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary}
]
const primaryDataKey = 'BallotID'

// The action row height is determined by its content
const ActionRow = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: space-between;`

// The table row grows to the available height
const TableRow = styled.div`flex: 1`

function Ballots(props) {
	const history = useHistory();
	const {ballotId} = useParams();
	//const [ballotId, setBallotId] = React.useState(null);

	React.useEffect(() => {
		if (!props.ballotsValid && !props.loading)
			props.getBallots()
		if (!props.votingPoolsValid)
			props.getVotingPools()
	}, [])

	async function handleRemoveSelected() {
		const {ballots, ballotsMap, selected} = props
		let ids = []
		for (let i of ballotsMap) { // only select checked items that are visible
			let id = ballots[i][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + ids.join(', ') + '?')
			if (ok) {
				await props.deleteBallots(ids)
			}
		}
	}

	const showEpolls = e => history.push('/Epolls/')
	const handleAddBallot = event => history.push('/Ballots/+')
	const handleEditBallot = ({rowData}) => history.push(`/Ballots/${rowData.BallotID}`)
	const closeBallot = () => history.push('/Ballots')

	return (
		<React.Fragment>
			<ActionRow>
				<span><label>Ballots</label></span>
				<span>
					<ActionButton name='add' title='Add' onClick={handleAddBallot} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import ePoll' onClick={showEpolls} />
					<ActionButton name='refresh' title='Refresh' onClick={props.getBallots} disabled={props.loading} />
				</span>
			</ActionRow>
			<TableRow>
				<AppTable
					columns={columns}
					headerHeight={60}
					rowHeight={40}
					estimatedRowHeight={54}
					loading={props.loading}
					sort={props.sort}
					setSort={props.setSort}
					filters={props.filters}
					setFilter={props.setFilter}
					removeFilter={props.removeFilter}
					clearFilters={props.clearFilters}
					selected={props.selected}
					setSelected={props.setSelected}
					onRowDoubleClick={handleEditBallot}
					data={props.ballots}
					dataMap={props.ballotsMap}
					rowKey={primaryDataKey}
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
		const {ballots, voters} = state
		return {
			filters: ballots.filters,
			sort: ballots.sort,
			ballotsValid: ballots.ballotsValid,
			ballots: ballots.ballots,
			ballotsMap: ballots.ballotsMap,
			selected: ballots.selected,
			loading: ballots.getBallots,
			votingPoolsValid: voters.votingPoolsValid,
			votingPools: voters.votingPools,
		}
	},
	(dispatch, ownProps) => {
		return {
			getBallots: () => dispatch(getBallots()),
			deleteBallots: (ids) => dispatch(deleteBallots(ids)),
			getVotingPools: () => dispatch(getVotingPools()),
			setSelected: (ballotIds) => dispatch(setBallotsSelected(ballotIds)),
			setSort: (dataKey, direction) => dispatch(setSort(dataSet, dataKey, direction)),
			setFilter: (dataKey, value) => dispatch(setFilter(dataSet, dataKey, value)),
			removeFilter: (dataKey, value) => dispatch(removeFilter(dataSet, dataKey, value)),
			clearFilters: () => dispatch(clearFilters(dataSet))
		}
	}
)(Ballots);
