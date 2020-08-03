import PropTypes from 'prop-types'
import React, {useEffect} from 'react'
import {Link, useHistory} from "react-router-dom"
import {connect} from 'react-redux'
import ConfirmModal from '../modals/ConfirmModal'
import AppTable from '../table/AppTable'
import {setBallotsFilter, setBallotsSort, setBallotsSelected, getBallots, deleteBallots} from '../actions/ballots'
import {getVotingPools} from '../actions/voters'
import {ActionButton, Checkbox} from '../general/Icons'
import {allSelected, toggleVisible} from '../lib/select'

const ControlHeader = ({data, dataMap, selected, setSelected}) => {
	const isSelected = allSelected(selected, dataMap, data, 'BallotID')
	const isIndeterminate = !isSelected && selected.length

	return (
		<Checkbox
			title={isSelected? "Clear All": isIndeterminate? "Clear Selected": "Select All"}
			checked={isSelected}
			indeterminate={isIndeterminate}
			onChange={e => setSelected(toggleVisible(selected, dataMap, data, 'BallotID'))}
		/>
	)
}

const ControlCell = ({rowData, selected, setSelected}) => {
	const id = rowData['BallotID']
	return (
		<Checkbox
			key='selector'
			title="Select Row"
			checked={selected.includes(id)}
			onChange={() => {
				const i = selected.indexOf(id)
				const s = selected.slice()
				if (i >= 0) {s.splice(i, 1)} else {s.push(id)}
				setSelected(s)
			}}
		/>
	)
}

const mapControlState = (state, ownProps) => ({
	selected: state.ballots.selected,
	data: state.ballots.ballots,
	dataMap: state.ballots.ballotsMap
});

const mapControlDispatch = (dispatch, ownProps) => ({
	setSelected: cids => dispatch(setBallotsSelected(cids)),
});

const ConnectedControlHeader = connect(mapControlState, mapControlDispatch)(ControlHeader);
const ConnectedControlCell = connect(mapControlState)(ControlCell);

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

export function renderResultsSummary({rowData, dataKey, column}) {
	if (!dataKey) dataKey = column.key
	var results = rowData[dataKey]
	var resultsStr = ''
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

export function renderCommentsSummary({rowData, dataKey, column}) {
	if (!dataKey) dataKey = column.key
	const comments = rowData[dataKey]
	let commentStr = 'None'
	if (comments && comments.Count > 0) {
		commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
	}
	return <Link to={`/Comments/${rowData.BallotID}`}>{commentStr}</Link>
}

function renderDate({rowData, column}) {
	const dataKey = column.key
	// rowData[dataKey] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	const d = new Date(rowData[dataKey])
	const str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
	return str
}

const columns = [
	{key: 'BallotID',
		width: 40, flexShrink: 0, flexGrow: 0,
		headerRenderer: props => <ConnectedControlHeader {...props}/>,
		cellRenderer: props => <ConnectedControlCell {...props} />},
	{key: 'Project',
		label: 'Project',
		width: 65,	flexShrink: 0, flexGrow: 0},
	{key: 'BallotID',
		label: 'Ballot ID',
		width: 75,	flexShrink: 0, flexGrow: 0},
	{key: 'Document',
		label: 'Document',
		width: 150,	flexShrink: 1, flexGrow: 1},
	{key: 'Topic',
		label: 'Topic',
		width: 300,	flexShrink: 1, flexGrow: 1},
	{key: 'EpollNum',
		label: 'ePoll',
		width: 80,	flexGrow: 0, flexShrink: 0},
	{key: 'Start',
		label: 'Start',
		width: 86, flexShrink: 0,
		cellRenderer: renderDate},
	{key: 'End',
		label: 'End',
		width: 86, flexShrink: 0,
		cellRenderer: renderDate},
	{key: 'N/A',
		label: 'Voting Pool/Prev Ballot',
		width: 100, flexShrink: 1, flexGrow: 1,
		cellRenderer: renderVotingPool},
	{key: 'Results',
		label: 'Result',
		width: 150,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderResultsSummary},
	{key: 'Comments',
		label: 'Comments',
		width: 100,	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary}
]
const primaryDataKey = 'BallotID'

function Ballots(props) {
	const history = useHistory()

	useEffect(() => {
		if (!props.ballotsValid && !props.loading) {
			props.getBallots()
		}
		if (!props.votingPoolsValid) {
			props.getVotingPools()
		}
	}, [])

	function showEpolls(e) {
		history.push('/Epolls/')
	}

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

	function handleAddBallot(event) {
		history.push('/Ballot/')
	}

	function handleEditBallot({rowData}) {
		history.push(`/Ballot/${rowData.BallotID}`)
	}

	return (
		<div id='Ballots'>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
				<span><label>Ballots</label></span>
				<span>
					<ActionButton name='add' title='Add' onClick={handleAddBallot} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import ePoll' onClick={showEpolls} />
					<ActionButton name='refresh' title='Refresh' onClick={props.getBallots} disabled={props.loading} />
				</span>
			</div>
			<AppTable
				columns={columns}
				headerHeight={60}
				rowHeight={40}
				height='70vh'
				width='calc(100vw - 16px)'
				estimatedRowHeight={54}
				loading={props.loading}
				onRowDoubleClick={handleEditBallot}
				filters={props.filters}
				setFilter={props.setFilter}
				sort={props.sort}
				setSort={props.setSort}
				selected={props.selected}
				setSelected={props.setSelected}
				data={props.ballots}
				dataMap={props.ballotsMap}
				rowKey={primaryDataKey}
			/>
		</div>
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
			setFilter: (dataKey, value) => dispatch(setBallotsFilter(dataKey, value)),
			setSort: (dataKey, event) => dispatch(setBallotsSort(event, dataKey)),
			setSelected: (ballotIds) => dispatch(setBallotsSelected(ballotIds)),
		}
	}
)(Ballots);
