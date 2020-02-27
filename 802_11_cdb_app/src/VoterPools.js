import PropTypes from 'prop-types';
import React, {useState, useRef, useEffect} from 'react';
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux';
import AppTable from './AppTable';
import AppModal from './AppModal';
import ConfirmModal from './ConfirmModal';
import {setVotingPoolSort, setVotingPoolFilters, getVotingPool, addVotingPool, deleteVotingPool, uploadVoters} from './actions/voters'
import {sortClick, filterValidate} from './filter'
import {ActionButton} from './Icons'

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
			width: 100,
			isLast: true}
	];
	const primaryDataKey = columns[0].dataKey;

	const [showAddVotingPool, setShowAddVotingPool] = useState(false)
	const [selected, setSelected] = useState([])

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	function updateTableSize() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
		const headerEl = document.getElementsByTagName('header')[0];
		const topRowEl = document.getElementById('top-row')

		const height = window.innerHeight - headerEl.offsetHeight - topRowEl.offsetHeight - 5;
		const width = window.innerWidth - 1;

		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width: Math.min(width, maxWidth)});
		}
	}

	useEffect(() => {
		updateTableSize();
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
			props.dispatch(setVotingPoolFilters(filters));
		}
		if (!props.votingPoolDataValid) {
			props.dispatch(getVotingPool())
		}
	}, [])

	function showVoters({event, rowData}) {
		history.push(`/Voters/${rowData.VotingPoolID}`)
	}

	function refresh() {
		props.dispatch(getVotingPool());
	}

	async function handleRemoveSelected() {
		const data = props.votingPoolData;
		const dataMap = props.votingPoolDataMap;
		var ids = [];
		for (var i = 0; i < dataMap.length; i++) { // only select checked items that are visible
			let id = data[dataMap[i]][primaryDataKey]
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

		await Promise.all(ids.map(id => {return props.dispatch(deleteVotingPool(id))}));

		const s = selected.filter(id => !ids.includes(id));
		setSelected(s);
	}

	function setSort(dataKey, event) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setVotingPoolSort(sortBy, sortDirection));
		event.preventDefault();
	}

	function setFilter(dataKey, value) {
		var filter = filterValidate(dataKey, value)
		props.dispatch(setVotingPoolFilters({[dataKey]: filter}));
	}

	return (
		<div id='VoterPools' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between'}}>
				<span><label>Voting Pools</label></span>
				<span>
					<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowAddVotingPool(true)} />
					<ActionButton name='delete' title='Remove Selected' onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</span>
			</div>
			<AppTable
				hasRowSelector={true}
				hasRowExpander={false}
				columns={columns}
				rowHeight={22}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getVotingPool}
				editRow={showVoters}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				setSort={setSort}
				setFilter={setFilter}
				setSelected={(ids) => setSelected(ids)}
				selected={selected}
				data={props.votingPoolData}
				dataMap={props.votingPoolDataMap}
				primaryDataKey={primaryDataKey}
			/>
			<AddVotingPoolModal
				isOpen={showAddVotingPool}
				close={() => setShowAddVotingPool(false)}
				dispatch={props.dispatch}
			/>
		</div>
	)
}
VoterPools.propTypes = {
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	votingPoolDataValid: PropTypes.bool.isRequired,
	votingPoolData:  PropTypes.array.isRequired,
	votingPoolDataMap: PropTypes.array.isRequired,
	getVotingPool: PropTypes.bool.isRequired
}

function mapStateToProps(state) {
	const {voters} = state;
	return {
		filters: voters.votingPoolFilters,
		sortBy: voters.votingPoolSortBy,
		sortDirection: voters.votingPoolSortDirection,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
		votingPoolDataMap: voters.votingPoolDataMap,
		getVotingPool: voters.getVotingPool,
	}
}
export default connect(mapStateToProps)(VoterPools);