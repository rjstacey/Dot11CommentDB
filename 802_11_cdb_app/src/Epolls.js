import React, {useState, useRef, useEffect} from 'react';
import {connect} from 'react-redux';
import {useHistory, useParams} from 'react-router-dom'
import AppTable from './AppTable';
import BallotDetailModal from './BallotDetail';
import {sortClick, filterValidate} from './filter'
import {IconRefresh, IconImport, IconClose, IconMore} from './Icons'
import {setEpollsSort, setEpollsFilters, getEpolls} from './actions/epolls';
import styles from './Epolls.css'


function defaultBallot() {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return {
		Project: '',
		BallotID: '',
		EpollNum: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: 0,
		PrevBallotID: ''}
}

function Epolls(props) {

	const columns = [
		{dataKey: 'EpollNum',  width: 100, label: 'ePoll',
			sortable: true,
			filterable: true},
		{dataKey: 'BallotID',  width: 200, label: 'ePoll Name',
			sortable: true,
			filterable: true},
		{dataKey: 'Document',  width: 200, label: 'Document',
			sortable: true,
			filterable: true},
		{dataKey: 'Topic',     width: 500, label: 'Topic',
			sortable: true,
			filterable: true},
		{dataKey: 'Start',     width: 100, label: 'Start',
			sortable: true,
			filterable: true,
			cellRenderer: renderDate},
		{dataKey: 'End',       width: 100, label: 'End',
			sortable: true,
			filterable: true,
			cellRenderer: renderDate},
		{dataKey: 'Votes',     width: 100, label: 'Result',
			sortable: true,
			filterable: true},
		{dataKey: '', label: '',
			sortable: false,
			filterable: false,
			width: 200,
			headerRenderer: renderHeaderActions,
			cellRenderer: renderActions,
			isLast: true}
	];

	const history = useHistory();

	const numberEpolls = useRef(20);
	const [importBallot, setImportBallot] = useState(() => {return {
		show: false,
		ballot: defaultBallot()
	}});
	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	function updateTableSize() {
		const headerEl = document.getElementsByTagName('header')[0];
		const headerHeight = headerEl.offsetHeight;

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
			props.dispatch(setEpollsFilters(filters));
		}
		if (!props.epollsDataValid) {
			props.dispatch(getEpolls(numberEpolls.current))
		}
	}, [])

	function importClick(rowData) {
		console.log(rowData)
		const ballot = {...rowData, Project: ''}
		setImportBallot({
			show: true,
			ballot
		})
	}

	function refresh() {
		props.dispatch(getEpolls(numberEpolls.current))
	}

	function close() {
		history.goBack();
	}

	function getMore() {
		numberEpolls.current += 10;
		props.dispatch(getEpolls(numberEpolls.current))
	}

	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setEpollsSort(sortBy, sortDirection));
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		props.dispatch(setEpollsFilters({[dataKey]: filter}));
	}

	function renderHeaderActions({rowIndex}) {
		return (
			<React.Fragment>
				<IconRefresh title='Refresh' onClick={refresh} />&nbsp;
				<IconMore title='Load More' onClick={getMore} />
				<IconClose title='Close' onClick={close} />&nbsp;
			</React.Fragment>
		)
	}

	function renderActions({rowData}) {
		if (rowData.InDatabase) {
			return (
				<span>Already Present</span>
			)
		} else {
			return (
				<IconImport title='Import' onClick={() => importClick(rowData)} />
			)
		}
	}

	function renderDate({rowData, dataKey}) {
		// rowData[dataKey] is an ISO time string. We convert this to eastern time
		// and display only the date (not time).
		var d = new Date(rowData[dataKey])
		var str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
		return str
	}

	return (
		<div id='Epolls'>
			<AppTable
				hasRowSelector={false}
				hasRowExpander={true}
				columns={columns}
				rowHeight={54}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getEpolls}
				//editRow={editRow}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				//showSelected={() => setShowSelected(true)}
				//setSelected={(cids) => setSelected(cids)}
				//selected={selected}
				data={props.epollsData}
				dataMap={props.epollsDataMap}
				//primaryDataKey={'CommentID'}
			/>

			{/*<BallotDetailModal
				//votingPoolData={props.votingPoolData}
				//ballotsByProject={props.ballotsByProject}
				//isOpen={importBallot.show}
				//ballot={importBallot.ballot}
				//action={'add'}
				//close={() => setImportBallot({...importBallot, show: false})}
			/>*/}
		</div>
	)
}

function mapStateToProps(state) {
	const {epolls, ballots, voters} = state;

	return {
		filters: epolls.filters,
		sortBy: epolls.sortBy,
		sortDirection: epolls.sortDirection,
		epollsDataValid: epolls.epollsDataValid,
		epollsData: epolls.epollsData,
		epollsDataMap: epolls.epollsDataMap,
		getEpolls: epolls.getEpolls,
		addBallot: ballots.addBallot,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
		ballotsByProject: ballots.ballotsByProject,
	}
}
export default connect(mapStateToProps)(Epolls);
