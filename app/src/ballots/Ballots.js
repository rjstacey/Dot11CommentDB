import PropTypes from 'prop-types'
import React, {useEffect} from 'react'
import {Link, useHistory} from "react-router-dom"
import {connect} from 'react-redux'
import ConfirmModal from '../modals/ConfirmModal'
import AppTable, {renderDate} from '../general/AppTable'
import {setBallotsFilter, setBallotsSort, setBallotsSelected, getBallots, deleteBallots} from '../actions/ballots'
import {getVotingPools} from '../actions/voters'
import {ActionButton} from '../general/Icons'


function renderVotingPool({columnIndex, rowData}) {
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

export function renderCommentsSummary({rowData, dataKey}) {
	const comments = rowData[dataKey]
	let commentStr = 'None'
	if (comments && comments.Count > 0) {
		commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
	}
	return <Link to={`/Comments/${rowData.BallotID}`}>{commentStr}</Link>
}

function getTableSize() {
	const headerEl = document.getElementsByTagName('header')[0]
	const topRowEl = document.getElementById('top-row')
	const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight

	const height = window.innerHeight - headerHeight - 1
	const width = window.innerWidth - 1

	return {height, width}
}

const columns = [
	{dataKey: 'Project',		label: 'Project',	width: 65,	sortable: true,
		flexShrink: 0, flexGrow: 0},
	{dataKey: 'BallotID',		label: 'Ballot ID',	width: 75,	sortable: true,
		flexShrink: 0, flexGrow: 0},
	{dataKey: 'Document',		label: 'Document',	width: 150,	sortable: true,
		flexShrink: 1, flexGrow: 1},
	{dataKey: 'Topic',			label: 'Topic',		width: 300,	sortable: true,
		flexShrink: 1, flexGrow: 1},
	{dataKey: 'EpollNum',		label: 'ePoll',		width: 80,	sortable: true,
		flexGrow: 0, flexShrink: 0},
	{dataKey: 'Start',			label: 'Start',		width: 86,	sortable: true,
		flexShrink: 0,
		cellRenderer: renderDate},
	{dataKey: 'End',			label: 'End',		width: 86,	sortable: true,
		flexShrink: 0,
		cellRenderer: renderDate},
	{dataKey: 'N/A',			label: 'Voting Pool/Prev Ballot',	width: 100, sortable: false,
    	flexShrink: 1, flexGrow: 1,
		cellRenderer: renderVotingPool},
	{dataKey: 'Results',		label: 'Result',	width: 150,	sortable: true,
		flexShrink: 1, flexGrow: 1,
		cellRenderer: renderResultsSummary},
	{dataKey: 'Comments',		label: 'Comments',	width: 100,	sortable: true,
		flexShrink: 1, flexGrow: 1,
		cellRenderer: renderCommentsSummary,
		isLast: true}
]
const primaryDataKey = 'BallotID'

function Ballots(props) {
	const history = useHistory()

	useEffect(() => {
		if (!props.ballotsValid && !props.getBallots) {
			props.dispatch(getBallots())
		}
		if (!props.votingPoolsValid) {
			props.dispatch(getVotingPools())
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
				await props.dispatch(deleteBallots(ids))
			}
		}
	}

	function refresh() {
		props.dispatch(getBallots())
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
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={props.getBallots} />
				</span>
			</div>
			<AppTable
				columns={columns}
				headerHeight={60}
				rowHeight={40}
				getTableSize={getTableSize}
				loading={props.getBallots}
				editRow={handleEditBallot}
				filters={props.filters}
				setFilter={(dataKey, value) => props.dispatch(setBallotsFilter(dataKey, value))}
				sort={props.sort}
				setSort={(dataKey, event) => props.dispatch(setBallotsSort(event, dataKey))}
				selected={props.selected}
				setSelected={(ballotIds) => props.dispatch(setBallotsSelected(ballotIds))}
				data={props.ballots}
				dataMap={props.ballotsMap}
				primaryDataKey={primaryDataKey}
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
	getBallots: PropTypes.bool.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired
}

function mapStateToProps(state) {
	const {ballots, voters} = state
	return {
		filters: ballots.filters,
		sort: ballots.sort,
		ballotsValid: ballots.ballotsValid,
		ballots: ballots.ballots,
		ballotsMap: ballots.ballotsMap,
		selected: ballots.selected,
		getBallots: ballots.getBallots,
		votingPoolsValid: voters.votingPoolsValid,
		votingPools: voters.votingPools,
	}
}
export default connect(mapStateToProps)(Ballots)