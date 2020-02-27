import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import {Link, useHistory} from "react-router-dom";
import {connect} from 'react-redux';
import moment from'moment-timezone';
import ConfirmModal from './ConfirmModal';
import AppTable from './AppTable';
import {setBallotsFilters, setBallotsSort, getBallots, deleteBallots} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import {sortClick, filterValidate} from './filter';
import {ActionButton} from './Icons';


/* Convert an ISO date string to US eastern time
 * and display only the date in format "yyyy-mm-dd" */
function dateToShortDate(isoDate) {
	return moment(isoDate).tz('America/New_York').format('YYYY-MM-DD')
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

	async function handleRemoveSelected() {
		const {ballotsData, ballotsDataMap} = props;
		let ids = [];
		for (let i of ballotsDataMap) { // only select checked items that are visible
			let id = ballotsData[i][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length === 0) {
			return;
		}
		
		const ok = await ConfirmModal.show('Are you sure you want to delete ' + ids.join(', ') + '?')
		if (!ok) {
			return
		}
		
		await props.dispatch(deleteBallots(ids))

		const s = selected.filter(id => !ids.includes(id));
		setSelected(s);
	}

	function setSort(dataKey, event) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setBallotsSort(sortBy, sortDirection));
		event.preventDefault()
	}

	function setFilter(dataKey, value) {
		var filter = filterValidate(dataKey, value)
		props.dispatch(setBallotsFilters({[dataKey]: filter}));
	}

	function renderDate({rowData, dataKey}) {
		return dateToShortDate(rowData[dataKey])
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
		if (!resultsStr) {
			resultsStr = 'None'
		}
		return <Link to={`/Results/${rowData.BallotID}`}>{resultsStr}</Link>
	}

	function renderCommentsSummary({rowIndex, rowData, dataKey}) {
		const comments = rowData[dataKey];
		let commentStr = 'None';
		if (comments && comments.Count > 0) {
			commentStr = `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
		}
		return <Link to={`/Comments/${rowData.BallotID}`}>{commentStr}</Link>
	}

	function refresh() {
		props.dispatch(getBallots())
	}

	function handleAddBallot(event) {
		history.push('/Ballot/');
	}

	function handleEditBallot({rowData}) {
		history.push(`/Ballot/${rowData.BallotID}`);
	}

	return (
		<div id='Ballots'>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between'}}>
				<span><label>Ballots</label></span>
				<span>
					<ActionButton name='add' title='Add' onClick={handleAddBallot} />
					<ActionButton name='delete' title='Remove Selected' onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import ePoll' onClick={showEpolls} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={props.getBallots} />
				</span>
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
				setSort={setSort}
				setFilter={setFilter}
				setSelected={(cids) => setSelected(cids)}
				selected={selected}
				data={props.ballotsData}
				dataMap={props.ballotsDataMap}
				primaryDataKey={primaryDataKey}
			/>
		</div>
	)
}
Ballots.propTypes = {
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	ballotsDataValid: PropTypes.bool.isRequired,
	ballotsData: PropTypes.array.isRequired,
	ballotsDataMap: PropTypes.array.isRequired,
	ballotsByProject: PropTypes.object.isRequired,
	getBallots: PropTypes.bool.isRequired,
	votingPoolDataValid: PropTypes.bool.isRequired,
	votingPoolData: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired
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
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
	}
}
export default connect(mapStateToProps)(Ballots);