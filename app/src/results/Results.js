import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import AppTable from '../general/AppTable'
import AppModal from '../modals/AppModal'
import BallotSelector from '../ballots/BallotSelector'
import {setResultsSort, setResultsFilter, getResults} from '../actions/results'
import {setError} from '../actions/error'
import {setBallotId} from '../actions/ballots'
import {ActionButton, Handle} from '../general/Icons'
import fetcher from '../lib/fetcher'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function ExportModal(props) {
	const {isOpen, close, dispatch} = props
	const ballotId = props.ballot.BallotID
	const project = props.ballot.Project
	const [forProject, setForProject] = React.useState(false)

	async function submit(e) {
		const ballotId = props.ballot.BallotID
		const project = props.ballot.Project
		const params = forProject? {Project: project}: {BallotID: ballotId}
		try {
			await fetcher.getFile('/api/exportResults', params)
		}
		catch(error) {
			console.log(error)
			dispatch(setError(`Unable to export results for ${ballotId}`, error))
		}
		close()
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<p>Export results for:</p>
			<label><input
				type="radio"
				title={ballotId}
				checked={!forProject}
				onChange={e => setForProject(!forProject)}
			/>This ballot {ballotId}</label><br />
			<label><input
				type="radio"
				title={project}
				checked={forProject}
				onChange={e => setForProject(!forProject)}
			/>This project {project}</label><br />
			<button onClick={submit}>OK</button>
			<button onClick={close}>Cancel</button>
		</AppModal>
	)
}
ExportModal.propTypes = {
	ballot: PropTypes.object.isRequired,
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired,
}


function getResultsSummary(resultsSummary, ballot, votingPoolSize) {
	const r = resultsSummary, b = ballot
	var rs = {
		opened: '',
		closed: '',
		duration: '',
		votingPoolSize: votingPoolSize,

		approvalRate: null,
		approvalRateStr: '',
		approvalRateReqStr: '',
		approve: null,
		disapprove: null,
		abstain: null,

		invalidVote: null,
		invalidDisapprove: null,
		invalidAbstain: null,

		returns: null,
		returnsPct: null,
		returnsPctStr: '',
		returnsReqStr: '',
		abstainsPct: null,
		abstainsPctStr: '',
		abstainsReqStr: ''
	}
	if (b.Start && b.End) {
		const dStart = new Date(b.Start);
		rs.opened = dStart.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'});
		const dEnd = new Date(b.End);
		rs.closed = dEnd.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'})
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		const dur = Math.floor((dEnd - dStart) / _MS_PER_DAY);
		if (!isNaN(dur)) {
			rs.duration = `${dur} days`
		}
	}

	if (r) {
		var pct = parseFloat(r.Approve/(r.Approve+r.Disapprove));
		if (!isNaN(pct)) {
			rs.approvalRate = pct
			rs.approvalRateStr = `${(100*pct).toFixed(1)}%`
			rs.approvalRateReqStr = (pct > 0.75? 'Meets': 'Does not meet') + ' approval requirement (>75%)'
		}
		rs.approve = r.Approve
		rs.disapprove = r.Disapprove
		rs.abstain = r.Abstain
		rs.invalidVote = r.InvalidVote
		rs.invalidDisapprove = r.InvalidDisapprove
		rs.invalidAbstain = r.InvalidAbstain
		rs.returns = r.TotalReturns
		pct = parseFloat(rs.returns/r.ReturnsPoolSize)
		if (!isNaN(pct)) {
			rs.returnsPct = pct
			rs.returnsPctStr = `${(100*pct).toFixed(1)}%`
			if (ballot.Type === 3 || ballot.Type === 4) {	// SA ballot requirement
				rs.returnsReqStr = (rs.returnsPct > 0.75? 'Meets': 'Does not meet') + ' return requirement (>75%)'
			}
			else {	// WG requirement
				rs.returnsReqStr = (rs.returnsPct > 0.5? 'Meets': 'Does not meet') + ' return requirement (>50%)'
			}
		}
		pct = parseFloat(r.Abstain/votingPoolSize)
		if (!isNaN(pct)) {
			rs.abstainsPct = pct
			rs.abstainsPctStr = `${(100*pct).toFixed(1)}%`
			rs.abstainsReqStr = (rs.abstainsPct < 0.3? 'Meets': 'Does not meet') + ' abstain requirement (<30%)'
		}
	}

	return rs
}


function ResultsSummary(props) {
	const {ballot, votingPoolSize, resultsSummary, showSummary, setShowSummary} = props
	const r = getResultsSummary(resultsSummary, ballot, votingPoolSize)
	const ballotType = ['CC Ballot', 'WG Ballot', 'WG Ballot', 'SA Ballot', 'SA Ballot', 'Motion'][ballot.Type]

	const colCss = css`
		display: flex;
		flex-direction: column;
		padding-right: 20px;
	`
	const titleCss = css`
		display: block;
		font-weight: bold;
		margin: 5px 0 5px 0;
	`
	const lvCss = css`
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	`

	const Col = (props) => <div css={colCss} {...props} />
	const Title = (props) => <div css={titleCss} {...props} />
	const LabelValue = ({label, value, ...otherProps}) => (
			<div css={lvCss} {...otherProps} >
				<span>{label}</span><span>{value}</span>
			</div>
		)

	const ballotCol = (
		<Col css={{flex: '0 1 260px'}}>
			<Title>{ballotType}</Title>
			<LabelValue label='Opened:' value={r.opened} />
			<LabelValue label='Closed:' value={r.closed} />
			<LabelValue label='Duration:' value={r.duration} />
			<LabelValue label='Voting pool size:' value={r.votingPoolSize} />
		</Col>
	)

	const resultCol = (
		<Col css={{flex: '0 1 300px'}}>
			<Title>Result</Title>
			<LabelValue label='Approve:' value={r.approve} />
			<LabelValue label='Disapprove:' value={r.disapprove} />
			{(ballot.Type === 3 || ballot.Type === 4) && <LabelValue label='Disapprove without MBS comment:' value={r.invalidDisapprove} />}
			<LabelValue label='Abstain:' value={r.abstain} />
			<LabelValue label='Total returns:' value={r.returns} />
			{ballot.Type === 5 && <LabelValue label='Not in pool:' value={r.invalidVote} />}
		</Col>
	)

	const invalidVotesCol = (
		<Col css={{flex: '0 1 300px'}}>
			<Title>Invalid votes</Title>
			<LabelValue label='Not in pool:' value={r.invalidVote} />
			<LabelValue label='Disapprove without comment:' value={r.invalidDisapprove} />
			<LabelValue label='Abstain reason:' value={r.invalidAbstain} />
		</Col>
	)

	const approvalCriteriaCol = (
		<Col css={{flex: '0 1 400px'}}>
			<Title>Approval criteria</Title>
			<LabelValue label='Approval rate:' value={r.approvalRateStr} />
			{ballot.Type !== 0 && <div>{r.approvalRateReqStr}</div>}
			<LabelValue label='Returns as % of pool:' value={r.returnsPctStr} />
			<div>{r.returnsReqStr}</div>
			<LabelValue label='Abstains as % of returns:' value={r.abstainsPctStr} />
			<div>{r.abstainsReqStr}</div>
		</Col>
	)

	const contentCss = css`
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		width: 100%;
		max-width: 1400px;
	`
	const DetailedSummary = (props) => (
		<div css={contentCss}>
			{ballotCol}
			{resultCol}
			{ballotType === 'WG' && invalidVotesCol}
			{ballotType !== 'CC' && approvalCriteriaCol}
		</div>
	)

	const BasicSummary = (props) => (
		<div css={contentCss}>
			<Title>{ballotType}</Title>
			<LabelValue label='Result:' value={`${r.approve}/${r.disapprove}/${r.abstain} (${r.approvalRateStr})`} />
		</div>
	)

	const containerCss = css`
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	`
	return (
		<div id='results-summary' css={containerCss}>
			{showSummary? <DetailedSummary />: <BasicSummary />}
			<Handle open={showSummary} onClick={() => setShowSummary(!showSummary)} />
		</div>
	)
}
ResultsSummary.propTypes = {
	resultsSummary: PropTypes.object.isRequired,
	ballot: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired
}

const allColumns = [
	{dataKey: 'SAPIN',		 label: 'SA PIN',		width: 75,	sortable: true},
	{dataKey: 'Name',		 label: 'Name',			width: 200,	sortable: true},
	{dataKey: 'Affiliation', label: 'Affiliation',	width: 200,	sortable: true},
	{dataKey: 'Email',		 label: 'Email',		width: 250,	sortable: true},
	{dataKey: 'Vote',		 label: 'Vote',			width: 210,	sortable: true},
	{dataKey: 'CommentCount',label: 'Comments',		width: 110,	sortable: true},
	{dataKey: 'Notes',		 label: 'Notes',		width: 250,	sortable: true,
		flexShrink: 1, flexGrow: 1,
		isLast: true}
]

function getTableSize() {
	const headerEl = document.getElementsByTagName('header')[0]
	const topRowEl = document.getElementById('top-row')
	const resultsEl = document.getElementById('results-summary')
	const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight + resultsEl.offsetHeight

	const height = window.innerHeight - headerHeight - 5
	const width = window.innerWidth - 1

	return {height, width}
}

function Results(props) {
	const {ballotId} = useParams()
	const history = useHistory()

	const [showSummary, setShowSummary] = React.useState(true)
	const [showExportModal, setShowExportModal] = React.useState(false)

	let columns, primaryDataKey
	if (props.ballot.Type === 3 || props.ballot.Type === 4) {
		columns = allColumns.slice(1, allColumns.length)
		primaryDataKey = 'Email'
	}
	else {
		columns = allColumns
		primaryDataKey = 'SAPIN'
	}

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				props.dispatch(setBallotId(ballotId))
				props.dispatch(getResults(ballotId))
			}
			else if (!props.getResults && (!props.resultsValid || props.ballot.BallotID !== ballotId)) {
				props.dispatch(getResults(ballotId))
			}
		}
		else if (props.ballotId) {
			history.replace(`/Results/${props.ballotId}`)
		}
	}, [ballotId, props.ballotId])

	function refresh(e) {
		props.dispatch(getResults(ballotId))
	}

	function ballotSelected(ballotId) {
		// Redirect to page with selected ballot
		history.push(`/Results/${ballotId}`)
		props.dispatch(getResults(ballotId))
	}

	return (
		<div id='Results'>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', position: 'relative'}}>
				<span>
					<BallotSelector
						onBallotSelected={ballotSelected}
					/>
				</span>
				<span>
					<ActionButton name='export' title='Export' onClick={() => setShowExportModal(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</span>
			</div>
			<ResultsSummary
				resultsSummary={props.resultsSummary}
				ballot={props.ballot}
				votingPoolSize={props.votingPoolSize}
				showSummary={showSummary}
				setShowSummary={setShowSummary}
			/>
			<AppTable
				columns={columns}
				headerHeight={60}
				rowHeight={18}
				getTableSize={getTableSize}
				tableSizeDependencies={[showSummary]}
				loading={props.getResults}
				filters={props.filters}
				setFilter={(dataKey, value) => props.dispatch(setResultsFilter(dataKey, value))}
				sort={props.sort}
				setSort={(dataKey, event) => props.dispatch(setResultsSort(event, dataKey))}
				primaryDataKey={primaryDataKey}
				data={props.results}
				dataMap={props.resultsMap}
			/>
			<ExportModal
				ballot={props.ballot}
				isOpen={showExportModal}
				close={() => setShowExportModal(false)}
				dispatch={props.dispatch}
			/>
		</div>
	)
}
Results.propTypes = {
	filters: PropTypes.object.isRequired,
	sort: PropTypes.object.isRequired,
	ballotId: PropTypes.string.isRequired,
	ballot: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired,
	resultsValid: PropTypes.bool.isRequired,
	results: PropTypes.array.isRequired,
	resultsMap: PropTypes.array.isRequired,
	getResults: PropTypes.bool.isRequired
}

function mapStateToProps(state) {
	const {ballots, results} = state;
	return {
		filters: results.filters,
		sort: results.sort,
		ballotId: ballots.ballotId,
		ballot: results.ballot,
		votingPoolSize: results.votingPoolSize,
		resultsValid: results.resultsValid,
		results: results.results,
		resultsMap: results.resultsMap,
		resultsSummary: results.resultsSummary,
		getResults: results.getResults
	}
}
export default connect(mapStateToProps)(Results);