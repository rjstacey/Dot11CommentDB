import PropTypes from 'prop-types';
import React, {useState, useEffect, useRef} from 'react';
import {Link, useHistory} from "react-router-dom";
import {connect} from 'react-redux';
import moment from'moment-timezone';
import AppTable from './AppTable'
import AppModal from './AppModal';
import ContentEditable from './ContentEditable';
import BallotDetailModal from './BallotDetail';
import {setBallotsFilters, setBallotsSort, getBallots, deleteBallots, updateBallot, addBallot, editBallot} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import {deleteCommentsWithBallotId, importComments, uploadComments} from './actions/comments'
import {deleteResults, importResults, uploadResults} from './actions/results'
import {sortClick, filterValidate} from './filter'
import {IconImport, IconDelete} from './Icons'
import styles from './AppTable.css'

/* Convert a UTC time string to US eastern time
 * and display only the date in format "yyyy-mm-dd" (ISO format). */
function strDate(utcDateStr) {
	var d = new Date(utcDateStr)
	d = new Date(d.toLocaleString('en-US', {timeZone: 'America/New_York'}))
	return d.toISOString().substring(0,10)
}

/* Parse date and convert to ISO UTC string */
function parseDate(etDateStr) {
	// Date is in format: "yyyy-mm-dd" and is always eastern time
	return moment.tz(etDateStr, 'YYYY-MM-DD', 'America/New_York').toUTCString()
}

function defaultBallot() {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return {
		Project: '',
		BallotID: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: 0,
		PrevBallotID: ''}
}

function ImportBallotModal(props) {
	const {ballotId, epollNum, importType, isOpen, close, dispatch} = props;
	const fileInputRef = useRef();

	const [fromFile, setFromFile] = useState(false);

	function submit() {
		if (fromFile) {
			dispatch(
				importType === 'results'?
					uploadResults(ballotId, fileInputRef.current.files[0]):
					uploadComments(ballotId, fileInputRef.current.files[0])
			).then(() => close())
		}
		else {
			dispatch(
				importType === 'results'?
					importResults(ballotId, epollNum):
					importComments(ballotId, epollNum, 1)
			).then(() => close())
		}
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<p>Import {importType} for {ballotId}. Current {importType} (if any) will be deleted.</p>
			<p>Select whether to import from the ePoll associated with the ballot or from a local .csv file.</p>
			<label>
				<input
					name='FromEpoll'
					type='radio'
					checked={!fromFile}
					onChange={e => setFromFile(!e.target.checked)}
				/>
				From ePoll
			</label>
			<br />
			<label>
				<input
					name='FromFile'
					type='radio'
					checked={fromFile}
					onChange={e => setFromFile(e.target.checked)}
				/>
				From file&nbsp;&nbsp;
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileInputRef}
				/>
			</label>
			<br />
			<button onClick={submit}>OK</button>
			<button onClick={close}>Cancel</button>
		</AppModal>
	)
}
ImportBallotModal.propTypes = {
	ballotId: PropTypes.string.isRequired,
	epollNum: PropTypes.string.isRequired,
	importType: PropTypes.oneOf(['', 'results', 'comments']),
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired
}

function Ballots(props) {
	const history = useHistory();

	const columns = [
		{dataKey: 'Project',      label: 'Project',
			sortable: true,
			filterable: true,
			width: 65, flexShrink: 0, flexGrow: 0},
		{dataKey: 'BallotID',     label: 'Ballot ID',
			sortable: true,
			filterable: true,
			width: 75, flexShrink: 0, flexGrow: 0},
		{dataKey: 'Document',     label: 'Document',
			sortable: true,
			filterable: true,
			width: 150, flexShrink: 1, flexGrow: 1},
		{dataKey: 'Topic',        label: 'Topic',
			sortable: true,
			filterable: true,
			width: 300, flexShrink: 1, flexGrow: 1},
		{dataKey: 'EpollNum',     label: 'ePoll',
			sortable: true,
			filterable: true,
			width: 80, flexGrow: 0, flexShrink: 0},
		{dataKey: 'Start',        label: 'Start',
			sortable: true,
			filterable: true,
			width: 86, flexShrink: 0,
			cellRenderer: renderDate},
		{dataKey: 'End',          label: 'End',
			sortable: true,
			filterable: true,
			width: 86, flexShrink: 0,
			cellRenderer: renderDate},
        {dataKey: ['VotingPoolID', 'PrevBallotID'], label: 'Voting Pool/Prev Ballot',
        	sortable: false,
			filterable: false,
        	width: 100, flexShrink: 1, flexGrow: 1,
    		cellRenderer: renderVotingPool},
		{dataKey: 'Results',      label: 'Result',
			sortable: true,
			filterable: true,
			width: 150, flexShrink: 1, flexGrow: 1,
			cellRenderer: renderResultsSummary},
		{dataKey: 'Comments',	label: 'Comments',
			sortable: true,
			filterable: true,
			width: 100, flexShrink: 1, flexGrow: 1,
			cellRenderer: renderCommentsSummary,
			isLast: true}
	];
	const primaryDataKey = 'BallotID';

	const [selected, setSelected] = useState([]);
	const [importHandler, setImportHandler] = useState({
		show: false,
		type: '',
		ballot: {BallotID: '', EpollNum: ''}});

	const [ballotDetail, setBallotDetail] = useState(() => {return {
		show: false,
		action: null,
		ballot: defaultBallot()
	}});

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 400,
	});

	function updateTableSize() {
		const headerEl = document.getElementsByTagName('header')[0];
		const topRowEl = document.getElementById('top-row');
		const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight;

		const height = window.innerHeight - headerHeight - 5;
		const width = window.innerWidth - 1;

		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width});
		}
	}
	useEffect(() => {updateTableSize()})

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
			props.dispatch(setBallotsFilters(filters));
		}
		if (!props.ballotsDataValid) {
			props.dispatch(getBallots())
		}
		if (!props.votingPoolDataValid) {
			props.dispatch(getVotingPool())
		}
	}, [])

	function showEpolls(e) {
		history.push('/Epolls/');
	}

	function deleteCommentsClick(e, rowData) {
		console.log('ballotId=', rowData.BallotID)
		props.dispatch(deleteCommentsWithBallotId(rowData.BallotID));
	}
	function importCommentsClick(e, rowData) {
		setImportHandler({
			show: true,
			type: 'comments',
			ballot: rowData
		})
	}

	function deleteResultsClick(e, rowData) {
		console.log('ballotId=', rowData.BallotID)
		props.dispatch(deleteResults(rowData.BallotID));
	}

	function importResultsClick(e, rowData) {
		setImportHandler({
			show: true,
			type: 'results',
			ballot: rowData
		})
	}

	function handleRemoveSelected() {
		const {ballotsData, ballotsDataMap} = props;
		let ids = [];
		for (let i of ballotsDataMap) { // only select checked items that are visible
			let id = ballotsData[i][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			props.dispatch(deleteBallots(ids))
				.then(() => {
					const s = selected.filter(id => !ids.includes(id));
					setSelected(s);
				})
		}
	}

	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setBallotsSort(sortBy, sortDirection));
		event.preventDefault()
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		props.dispatch(setBallotsFilters({[dataKey]: filter}));
	}

	function updateBallotField(rowIndex, columnIndex, dataKey, fieldData) {
		const b = props.ballotsData[props.ballotsDataMap[rowIndex]];
		if (b[dataKey] !== fieldData) {
			props.dispatch(updateBallot(b.BallotID, {[dataKey]: fieldData}))
		}
	}

	function renderDate({rowData, dataKey}) {
		return strDate(rowData[dataKey])
	}

	function renderEditable({rowIndex, rowData, dataKey, columnIndex}) {
		return (
			<ContentEditable
				value={rowData[dataKey]}
				onChange={e => updateBallotField(rowIndex, columnIndex, dataKey, e.target.value)}
			/>
		)
	}
	
	function renderVotingPool({rowIndex, columnIndex, rowData, dataKey}) {
		const votingPoolID = rowData[dataKey[0]];
		const prevBallotID = rowData[dataKey[1]]; 
		if (votingPoolID > 0) {
			const v = props.votingPoolData.find(v => v.VotingPoolID === votingPoolID)
			return v? v.Name: '';
		}
		else {
			return prevBallotID;
		}
		//var project = rowData.Project;
		//const showSelectVotingPool = !rowData[dataKey[1]]
		//const showSelectBallot = !rowData[dataKey[0]]
		/*
		return (
			<div>
				{showSelectVotingPool &&
					<select
						name={dataKey}
						value={rowData[dataKey[0]]}
						onChange={e => updateBallotField(rowIndex, columnIndex, dataKey[0], e.target.value)}
					>
						<option key={0} value={''}>Select Pool</option>
						{props.votingPoolData.map(i => {
							return (<option key={i.VotingPoolID} value={i.VotingPoolID}>{i.Name}</option>)
						})}
					</select>}
				{showSelectBallot &&
					<select
						name={dataKey}
						value={rowData[dataKey[1]]}
						onChange={e => updateBallotField(rowIndex, columnIndex, dataKey[1], e.target.value)}
					>
						<option key={0} value={''}>Select Ballot</option>
						{project && props.ballotsByProject[project].map(i => {
							return (i !== rowData.BallotID? <option key={i} value={i}>{i}</option>: null)
						})}
					</select>}
			</div>
		)
		*/
	}

	function renderResultsSummary({rowIndex, rowData, dataKey}) {
		var results = rowData[dataKey];
		var resultsStr = '';
		if (results && results.TotalReturns) {
			let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
			resultsStr = `${results.Approve}/${results.Disapprove}/${results.Abstain}`
			if (!isNaN(p)) {
				resultsStr += ` (${p.toFixed(1)}%)`
			}
		}
		return resultsStr
			? <React.Fragment>
				<Link to={`/Results/${rowData.BallotID}`}>{resultsStr}</Link>&nbsp;
				<div className={styles.actionColumn}>
					<IconDelete title="Delete Results" onClick={e => deleteResultsClick(e, rowData)} />&nbsp;
					<IconImport title="Import Results" onClick={e => importResultsClick(e, rowData)} />
				</div>
			  </React.Fragment>
			: <React.Fragment>
				None&nbsp;
				<div className={styles.actionColumn}>
					<IconImport title="Import Results" onClick={e => importResultsClick(e, rowData)} />
				</div>
			  </React.Fragment>
	}

	function renderCommentsSummary({rowIndex, rowData, dataKey}) {
		var comments = rowData.Comments;
		return (comments && comments.Count > 0)
			? <React.Fragment>
				<Link to={`/Comments/${rowData.BallotID}`}>{comments.CommentIDMin}-{comments.CommentIDMax} ({comments.Count})</Link>&nbsp;
				<div className={styles.actionColumn}>
					<IconDelete title="Delete Comments" onClick={e => deleteCommentsClick(e, rowData)} />&nbsp;
					<IconImport title="Import Comments" onClick={e => importCommentsClick(e, rowData)} />
				</div>
			  </React.Fragment>
			: <React.Fragment>
				None&nbsp;
				<div className={styles.actionColumn}>
					<IconImport title="Import Comments" onClick={e => importCommentsClick(e, rowData)} />
				</div>
			  </React.Fragment>
	}

	function refresh() {
		props.dispatch(getBallots())
	}

	function handleAddBallot(event) {
		setBallotDetail({
			show: true,
			action: 'add',
			ballot: defaultBallot()
		})
	}

	function handleEditBallot({event, index, rowData}) {
		const ballotId = rowData.BallotID;
		props.dispatch(editBallot(ballotId));
		history.push(`/Ballot/${ballotId}`);

		/*const ballot = props.ballotsData[props.ballotsDataMap[index]];
		setBallotDetail({
			show: true,
			action: 'update',
			ballot
		})*/
	}

	return (
		<div id='Ballots'>
			<div id='top-row'>
				<button disabled={props.getBallots} onClick={refresh}>Refresh</button>
				<button onClick={handleAddBallot}>Add</button>
				<button onClick={handleRemoveSelected}>Remove Selected</button>
				<button onClick={showEpolls}>Import ePoll</button>
			</div>
			<AppTable
				hasRowSelector={true}
				hasRowExpander={false}
				columns={columns}
				rowHeight={40}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getBallots}
				editRow={handleEditBallot}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				//showSelected={() => setShowSelected(true)}
				setSelected={(cids) => setSelected(cids)}
				selected={selected}
				data={props.ballotsData}
				dataMap={props.ballotsDataMap}
				primaryDataKey={primaryDataKey}
			/>
			<ImportBallotModal
				ballotId={importHandler.ballot.BallotID}
				epollNum={importHandler.ballot.EpollNum}
				importType={importHandler.type}
				isOpen={importHandler.show}
				close={() => setImportHandler({...importHandler, show: false})}
				dispatch={props.dispatch}
			/>
			{/*<BallotDetailModal
				//votingPoolData={props.votingPoolData}
				//ballotsByProject={props.ballotsByProject}
				isOpen={ballotDetail.show}
				ballot={ballotDetail.ballot}
				action={ballotDetail.action}
				close={() => setBallotDetail({...ballotDetail, show: false})}
			/>*/}
		</div>
	)
}

function mapStateToProps(state) {
	const {ballots, voters} = state
	return {
		filters: ballots.filters,
		sortBy: ballots.sortBy,
		sortDirection: ballots.sortDirection,
		ballotsDataValid: ballots.ballotsDataValid,
		ballotsData: ballots.ballotsData,
		ballotsDataMap: ballots.ballotsDataMap,
		ballotsByProject: ballots.ballotsByProject,
		getBallots: ballots.getBallots,
		updateBallot: ballots.updateBallot,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
	}
}
export default connect(mapStateToProps)(Ballots);