import PropTypes from 'prop-types';
import React, {useState, useEffect, useLayoutEffect} from 'react';
import {useHistory, useParams} from 'react-router-dom'
import AppTable from './AppTable';
import AppModal from './AppModal';
import {connect} from 'react-redux';
import BallotSelector from './BallotSelector';
import {setResultsSort, setResultsFilters, getResults} from './actions/results'
import {setError} from './actions/error'
import {setBallotId} from './actions/ballots'
import {sortClick, filterValidate} from './filter'
import {ActionButton, IconUp, IconDown} from './Icons'
//import {saveAs} from 'file-saver'
//var axios = require('axios');
import fetcher from './lib/fetcher'


function ExportModal(props) {
	const {isOpen, close, dispatch} = props
	const ballotId = props.ballot.BallotID
	const project = props.ballot.Project
	const [forProject, setForProject] = useState(false)

	async function submit(e) {
		const ballotId = props.ballot.BallotID
		const project = props.ballot.Project
		const params = forProject? {Project: project}: {BallotID: ballotId}
		try {
			await fetcher.getFile('/exportResults', params)
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
	const {visible, ballot, votingPoolSize, resultsSummary} = props
	const r = getResultsSummary(resultsSummary, ballot, votingPoolSize)
	const ballotType = ['CC', 'WG', 'WG', 'SA', 'SA'][ballot.Type]

	var style = {
		container: {
			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-arround',
		},
		col: {
			display: 'flex',
			flexDirection: 'column',
			paddingRight: '20px'
		},
		lv: {
			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-between'
		},
		title: {display: 'block', fontWeight: 'bold', margin: '5px 0 5px 0'}
	}

	const ballotCol = (
		<div style={{...style.col, flex: '0 1 260px'}}>
			<div style={style.title}>{ballotType} Ballot</div>
			<div style={style.lv}><span>Opened:</span><span>{r.opened}</span></div>
			<div style={style.lv}><span>Closed:</span><span>{r.closed}</span></div>
			<div style={style.lv}><span>Duration:</span><span>{r.duration}</span></div>
			<div style={style.lv}><span>Voting pool size:</span><span>{r.votingPoolSize}</span></div>
		</div>
	)

	const resultCol = (
		<div style={{...style.col, flex: '0 1 300px'}}>
			<div style={style.title}>Result</div>
			<div style={style.lv}><span>Approve:</span><span>{r.approve}</span></div>
			<div style={style.lv}><span>Disapprove:</span><span>{r.disapprove}</span></div>
			{ballotType === 'SA' && <div style={style.lv}><span>Disapprove without MBS comment:</span><span>{r.invalidDisapprove}</span></div>}
			<div style={style.lv}><span>Abstain:</span><span>{r.abstain}</span></div>
			<div style={style.lv}><span>Total returns:</span><span>{r.returns}</span></div>
		</div>
	)

	const invalidVotesCol = (
		<div style={{...style.col, flex: '0 1 300px'}}>
			<div style={style.title}>Invalid votes</div>
			<div style={style.lv}><span>Not in pool:</span><span>{r.invalidVote}</span></div>
			<div style={style.lv}><span>Disapprove without comment:</span><span>{r.invalidDisapprove}</span></div>
			<div style={style.lv}><span>Abstain reason:</span><span>{r.invalidAbstain}</span></div>
		</div>
	)

	const approvalCriteriaCol = (
		<div style={{...style.col, flex: '0 1 400px'}}>
			<div style={style.title}>Approval criteria</div>
			<div style={style.lv}><span>Approval rate:</span><span>{r.approvalRateStr}</span></div>
			{ballotType !== 'CC' && <div>{r.approvalRateReqStr}</div>}
			<div style={style.lv}><span>Returns as % of pool:</span><span>{r.returnsPctStr}</span></div>
			<div>{r.returnsReqStr}</div>
			<div style={style.lv}><span>Abstains as % of returns:</span><span>{r.abstainsPctStr}</span></div>
			<div>{r.abstainsReqStr}</div>
		</div>
	)

	return (
		<div id='results-summary' style={{...style.container, display: visible? 'flex': 'none'}}>
			{ballotCol}
			{resultCol}
			{ballotType === 'WG' && invalidVotesCol}
			{ballotType !== 'CC' && approvalCriteriaCol}
		</div>
	)
}
ResultsSummary.propTypes = {
	visible: PropTypes.bool.isRequired,
	resultsSummary: PropTypes.object.isRequired,
	ballot: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired
}

const allColumns = [
	{dataKey: 'SAPIN',		label: 'SA PIN',
		sortable: true,
		filterable: true,
		width: 75},
	{dataKey: 'Name',		label: 'Name',
		sortable: true,
		filterable: true,
		width: 200},
	{dataKey: 'Affiliation', label: 'Affiliation',
		sortable: true,
		filterable: true,
		width: 200},
	{dataKey: 'Email',		label: 'Email',
		sortable: true,
		filterable: true,
		width: 250},
	{dataKey: 'Vote',		label: 'Vote',
		sortable: true,
		filterable: true,
		width: 210},
	{dataKey: 'CommentCount', label: 'Comments',
		sortable: true,
		filterable: true,
		width: 110},
	{dataKey: 'Notes',		label: 'Notes',
		sortable: true,
		filterable: true,
		width: 250, flexShrink: 1, flexGrow: 1,
		isLast: true}
]

function Results(props) {
	const {ballotId} = useParams();
	const history = useHistory();

	const [showSummary, setShowSummary] = useState(true);
	const [showExportModal, setShowExportModal] = useState(false);

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 400,
	})

	let columns
	if (props.ballot.Type === 3 || props.ballot.Type === 4) {
		columns = allColumns.slice(1, allColumns.length)
	}
	else {
		columns = allColumns
	}

	function updateTableSize() {
		const headerEl = document.getElementsByTagName('header')[0];
		const topRowEl = document.getElementById('top-row');
		const resultsEl = document.getElementById('results-summary');
		const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight + resultsEl.offsetHeight;

		const height = window.innerHeight - headerHeight - 5;
		const width = window.innerWidth - 1;

		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width});
		}
	}
	useLayoutEffect(() => {updateTableSize()}, [showSummary])

	useEffect(() => {
		window.addEventListener("resize", updateTableSize);
		return () => {
			window.removeEventListener("resize", updateTableSize);
		}
	}, [])

	useEffect(() => {
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			for (let col of columns) {
				if (col.filterable) {
					filters[col.dataKey] = filterValidate(col.dataKey, '')
				}
			}
			props.dispatch(setResultsFilters(filters));
		}
	}, [])

	useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				props.dispatch(setBallotId(ballotId))
				props.dispatch(getResults(ballotId))
			}
			else if (!props.getResults && (!props.resultsDataValid || props.ballot.BallotID !== ballotId)) {
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

	function setSort(dataKey, event) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setResultsSort(sortBy, sortDirection));
	}

	function setFilter(dataKey, value) {
		var filter = filterValidate(dataKey, value)
		props.dispatch(setResultsFilters({[dataKey]: filter}));
	}

	function ballotSelected(ballotId) {
		// Redirect to page with selected ballot
		history.push(`/Results/${ballotId}`)
		props.dispatch(getResults(ballotId));
	}

	return (
		<div id='Results'>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between', position: 'relative'}}>
				<span>
					<BallotSelector
						onBallotSelected={ballotSelected}
					/>
				</span>
				<span>
					<ActionButton name='export' title='Export' onClick={() => setShowExportModal(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</span>
				<div style={{position: 'absolute', right: '80px', bottom: '-10px'}}>
					{showSummary? <IconUp onClick={() => setShowSummary(false)}/>: <IconDown onClick={() => setShowSummary(true)}/>}
				</div>
			</div>
			<ResultsSummary
				visible={showSummary}
				resultsSummary={props.resultsSummary}
				ballot={props.ballot}
				votingPoolSize={props.votingPoolSize}
			/>
			<AppTable
				columns={columns}
				rowHeight={18}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getResults}
				//editRow={editRow}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				setSort={setSort}
				setFilter={setFilter}
				//showSelected={() => setShowSelected(true)}
				//setSelected={(cids) => setSelected(cids)}
				//selected={selected}
				primaryDataKey={'SAPIN'}
				data={props.resultsData}
				dataMap={props.resultsDataMap}
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
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	ballotId: PropTypes.string.isRequired,
	ballot: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired,
	resultsDataValid: PropTypes.bool.isRequired,
	resultsData: PropTypes.array.isRequired,
	resultsDataMap: PropTypes.array.isRequired,
	getResults: PropTypes.bool.isRequired
}

function mapStateToProps(state) {
	const {ballots, results} = state;
	return {
		filters: results.filters,
		sortBy: results.sortBy,
		sortDirection: results.sortDirection,
		ballotId: ballots.ballotId,
		ballot: results.ballot,
		votingPoolSize: results.votingPoolSize,
		resultsDataValid: results.resultsDataValid,
		resultsData: results.resultsData,
		resultsDataMap: results.resultsDataMap,
		resultsSummary: results.resultsSummary,
		getResults: results.getResults,
	}
}
export default connect(mapStateToProps)(Results);