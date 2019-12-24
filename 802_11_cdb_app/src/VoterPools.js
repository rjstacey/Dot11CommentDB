import PropTypes from 'prop-types';
import React, {useState, useRef, useEffect, useLayoutEffect} from 'react';
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux';
import AppTable from './AppTable';
import AppModal from './AppModal';
import {setVotingPoolSort, setVotingPoolFilters, getVotingPool, addVotingPool, deleteVotingPool, uploadVoters} from './actions/voters'
import {sortClick, filterValidate} from './filter'
import {IconRefresh, IconAdd, IconDelete, IconImport} from './Icons'
import styles from './AppTable.css'

function AddVotingPoolModal(props) {
	const defaultVotingPool = {VotingPoolID: 0, Name: '', Date: new Date()}
	const [votingPool, setVotingPool] = useState(defaultVotingPool)
	const votersFileInputRef = useRef();

	function onOpen() {
		setVotingPool(defaultVotingPool);	// Reset votinPool data to default on each open
	}

	function change(e) {
		setVotingPool({...votingPool, [e.target.name]: e.target.value});
	}
	//function changeDate(date) {
	//	setVotingPool({...votingPool, Date: date})
	//}
	function submit() {
		var file = votersFileInputRef.current.files[0];
		props.dispatch(addVotingPool(votingPool))
			.then(() => {
				if (file) {
					return props.dispatch(uploadVoters(votingPool.VotingPoolID, file))
				}
				else {
					return Promise.resolve()
				}
			})
			.then(props.close)
	}
	const style = {
		label: {display: 'inline-block', textAlign: 'left', width: '100px'}
	}
	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<p>Add voters pool</p>
			<label style={style.label}>Pool Name:</label>
				<input type='text' name='Name' value={votingPool.Name} onChange={change}/><br />
			<label style={style.label}>Voters:</label>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={votersFileInputRef}
				/>
			<br />
			<p>
				<button onClick={submit}>OK</button>
				<button onClick={props.close}>Cancel</button>
			</p>
		</AppModal>
	)
}
AddVotingPoolModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired
}

function ImportVotersModal(props) {
	const votersFileInputRef = useRef();

	function submit() {
		props.dispatch(uploadVoters(props.votingPool.VotingPoolID, votersFileInputRef.current.files[0])).then(props.close)
	}
	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Import voters list for {props.votingPool.Name}</p>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={votersFileInputRef}
			/>
			<br />
			<button onClick={submit}>OK</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
ImportVotersModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPool: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}

function VoterPools(props) {
	const history = useHistory()

	const columns = [
		{dataKey: 'VotingPoolID',	label: 'ID',
			sortable: true,
			filterable: true,
			width: 100},
		{dataKey: 'Name',			label: 'Voting Pool',
			sortable: true,
			filterable: true,
			width: 200},
		{dataKey: 'VoterCount',		label: 'Voters',
			sortable: true,
			filterable: true,
			width: 100},
		{dataKey: '',				label: '',
			sortable: false,
			filterable: false,
			width: 100,
			headerRenderer: renderHeaderActions,
			cellRenderer: renderActions,
			isLast: true}
	];

	const [tableHeight, setTableHeight] = useState(400)
	const [tableWidth, setTableWidth] = useState(() => columns.reduce((acc, col) => acc + col.width, 0))
	const [showAddVotingPool, setShowAddVotingPool] = useState(false)
	const [showVotersImport, setShowVotersImport] = useState(false)
	const [selected, setSelected] = useState([])
	const [votingPool, setVotingPool] = useState({})

	useLayoutEffect(() => {
		updateDimensions();
		window.addEventListener("resize", updateDimensions);
		return () => {
			window.removeEventListener("resize", updateDimensions);
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
			props.dispatch(setVotingPoolFilters(filters));
		}
		if (!props.votingPoolValid) {
			props.dispatch(getVotingPool())
		}
	}, [])

	function updateDimensions() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
		const header = document.getElementsByTagName('header')[0]
		const top = document.getElementById('top-row')
		const height = window.innerHeight - header.offsetHeight - top.offsetHeight - 5
		const width = window.innerWidth - 1;
		setTableHeight(height)
		setTableWidth(Math.min(width, maxWidth))
	}

	function deleteVotingPool(rowData) {
		console.log('VotingPoolID=', rowData.VotingPoolID)
		props.dispatch(deleteVotingPool(rowData.VotingPoolID));
	}

	function importVotersClick(rowData) {
		setVotingPool(rowData)
		setShowVotersImport(true)
	}

	function showVoters({event, rowData}) {
		history.push(`/Voters/${rowData.VotingPoolID}`)
	}

	function refresh() {
		props.dispatch(getVotingPool());
	}

	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setVotingPoolSort(sortBy, sortDirection));
		event.preventDefault();
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		props.dispatch(setVotingPoolFilters({[dataKey]: filter}));
	}

	function renderActions({rowIndex, rowData}) {
		return (
			<div className={styles.actionColumn}>
				<IconImport title='Import' onClick={() => importVotersClick(rowData)} />&nbsp;
				<IconDelete title='Delete' onClick={() => deleteVotingPool(rowData)} />
			</div>
		)
	}

	function renderHeaderActions({rowIndex}) {
		return (
			<div title='Actions'>
				<IconRefresh title='Refresh' onClick={refresh} />&nbsp;
				<IconAdd title='Add Voter Pool' onClick={() => setShowAddVotingPool(true)} />
			</div>
		)
	}

	return (
		<div id='VoterPools'>
			<div id='top-row'>
			</div>
			<AppTable
				hasRowSelector={true}
				hasRowExpander={false}
				columns={columns}
				rowHeight={22}
				height={tableHeight}
				width={tableWidth}
				loading={props.getVotingPool}
				editRow={showVoters}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				//showSelected={() => setShowSelected(true)}
				setSelected={(cids) => setSelected(cids)}
				selected={selected}
				data={props.votingPoolData}
				dataMap={props.votingPoolDataMap}
				primaryDataKey={'VotingPoolID'}
			/>
			<AddVotingPoolModal
				isOpen={showAddVotingPool}
				close={() => setShowAddVotingPool(false)}
				dispatch={props.dispatch}
			/>
			<ImportVotersModal
				votingPool={votingPool}
				isOpen={showVotersImport}
				close={() => setShowVotersImport(false)}
				dispatch={props.dispatch}
			/>
		</div>
	)
}

function mapStateToProps(state) {
	const {voters} = state;
	return {
		filters: voters.votingPoolFilters,
		sortBy: voters.votingPoolSortBy,
		sortDirection: voters.votingPoolSortDirection,
		votingPoolData: voters.votingPoolData,
		votingPoolDataMap: voters.votingPoolDataMap,
		getVotingPool: voters.getVotingPool,
		addVotingPool: voters.addVotingPool,
	}
}
export default connect(mapStateToProps)(VoterPools);