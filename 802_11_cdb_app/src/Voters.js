import PropTypes from 'prop-types';
import React, {useState, useRef, useEffect} from 'react';
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux';
import ConfirmModal from './ConfirmModal';
import {setVotersFilters, setVotersSort, getVoters, deleteVoters, addVoter, updateVoter, uploadVoters} from './actions/voters'
import {sortClick, filterValidate, shallowDiff} from './filter'
import AppTable from './AppTable';
import AppModal from './AppModal';
import {ActionButton, IconClose} from './Icons';


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

function AddVoterModal(props) {
	const [voter, setVoter] = useState(props.voter);

	function onOpen() {
		setVoter(props.voter)
	}

	function change(e) {
		setVoter({...voter, [e.target.name]: e.target.value})
	}

	async function submit(e) {
		let a;
		if (props.action === 'add') {
			a = addVoter({
				VotingPoolID: props.votingPool.VotingPoolID,
				...voter
			})
		}
		else {
			const changed = shallowDiff(props.voter, voter)
			a = updateVoter(
				props.votingPool.VotingPoolID,
				props.voter.SAPIN,
				changed
			)
		}
		await props.dispatch(a)
		props.close()
	}

	const style = {
		label: {display: 'inline-block', textAlign: 'left', width: '100px'}
	}
	const title = props.action === 'add'
		? 'Add voter to voting pool ' + props.votingPool.Name
		: 'Update voter';
	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<h3>{title}</h3>
			<p>
				<label style={style.label}>SA PIN:</label>
				<input style={{width: 100}} type='text' name='SAPIN' value={voter.SAPIN} onChange={change}/>
			</p>
			<p>
				<label style={style.label}>Last Name:</label>
				<input style={{width: 150}} type='text' name='LastName' value={voter.LastName} onChange={change}/>
			</p>
			<p>
				<label style={style.label}>First Name:</label>
				<input style={{width: 150}} type='text' name='FirstName' value={voter.FirstName} onChange={change}/>
			</p>
			<p>
				<label style={style.label}>MI:</label>
				<input style={{width: 50}} type='text' name='MI' value={voter.MI} onChange={change}/>
			</p>
			<p>
				<label style={style.label}>Email:</label>
				<input style={{width: 250}} type='text' name='Email' value={voter.Email} onChange={change}/>
			</p>
			<p>
				<label style={style.label}>Status:</label>
				<select style={{width: 100}} name='Status' value={voter.Status} onChange={change}>
					<option value='Voter'>Voter</option>
					<option value='ExOfficio'>ExOfficio</option>
				</select>
			</p>
			<p>
				<button onClick={submit}>OK</button>
				<button onClick={props.close}>Cancel</button>
			</p>
		</AppModal>
	)
}
AddVoterModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPool: PropTypes.object.isRequired,
	voter: PropTypes.object.isRequired,
	action: PropTypes.oneOf(['add', 'update']),
	dispatch: PropTypes.func.isRequired
}

const defaultVoter = {
	SAPIN: '',
	LastName: '',
	FirstName: '',
	MI: '',
	Email: '',
	Status: 'Voter'
};

function Voters(props) {
	let {votingPoolId} = useParams()
	if (votingPoolId) {
		votingPoolId = parseInt(votingPoolId, 10)
	}
	const history = useHistory()

	const columns = [
		{dataKey: 'SAPIN',		label: 'SA PIN',
			sortable: true,
			filterable: true,
			width: 100},
		{dataKey: 'LastName',	label: 'Last Name',
			sortable: true,
			filterable: true,
			width: 150},
		{dataKey: 'FirstName',	label: 'First Name',
			sortable: true,
			filterable: true,
			width: 150},
		{dataKey: 'MI',			label: 'MI',
			sortable: true,
			filterable: true,
			width: 50},
		{dataKey: 'Email',		label: 'Email',
			sortable: true,
			filterable: true,
			width: 250},
		{dataKey: 'Status',		label: 'Status',
			sortable: true,
			filterable: true,
			width: 100}
	];
	const primaryDataKey = columns[0].dataKey

	const [selected, setSelected] = useState([])
	const [addEditVoter, setAddEditVoter] = useState({
		action: null,
		voter: defaultVoter
	})
	const [showImportVoters, setShowImportVoters] = useState(false)

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	function updateTableSize() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
		const headerEl = document.getElementsByTagName('header')[0];

		const height = window.innerHeight - headerEl.offsetHeight - 5;
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
			props.dispatch(setVotersFilters(filters));
		}
	}, [])

	useEffect(() => {
		if ((!props.votingPool || props.votingPool.VotingPoolID !== votingPoolId) && !props.getVoters) {
			props.dispatch(getVoters(votingPoolId))
		}
	}, [votingPoolId, props.votingPool])

	function close() {
 		history.goBack()
 	}

 	function refresh() {
 		props.dispatch(getVoters(votingPoolId))
 	}

	async function handleRemoveSelected() {
		const {data, dataMap} = props;
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

		await props.dispatch(deleteVoters(votingPoolId, ids))

		const s = selected.filter(id => !ids.includes(id));
		setSelected(s);
	}

	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setVotersSort(sortBy, sortDirection));
		event.preventDefault();
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		props.dispatch(setVotersFilters({[dataKey]: filter}));
	}

	function handleAddVoter(e) {
		setAddEditVoter({
			action: 'add',
			voter: defaultVoter
		})
	}

	function handleEditVoter({rowData}) {
		setAddEditVoter({
			action: 'update',
			voter: rowData
		})
	}

	return (
		<div id='Voters' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			{props.votingPool?
				(<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between'}}>
					<span><label>Voting Pool:&nbsp;</label>{props.votingPool.Name}</span>
					<span>
						<ActionButton name='add' title='Add Voter' onClick={handleAddVoter} />
						<ActionButton name='delete' title='Remove Selected' onClick={handleRemoveSelected} />
						<ActionButton name='import' title='Import Voters' onClick={() => setShowImportVoters(true)} />
						<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={props.getVoters} />
						<IconClose onClick={close} />
					</span>
				</div>):
				(<div id='top-row'></div>)
			}
			<AppTable
				hasRowSelector={true}
				hasRowExpander={false}
				columns={columns}
				rowHeight={20}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getVoters}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				setSelected={(ids) => setSelected(ids)}
				selected={selected}
				editRow={handleEditVoter}
				data={props.data}
				dataMap={props.dataMap}
				primaryDataKey={primaryDataKey}
			/>

			<AddVoterModal
				isOpen={!!addEditVoter.action}
				close={() => setAddEditVoter({...addEditVoter, action: null})}
				votingPool={props.votingPool}
				voter={addEditVoter.voter}
				action={addEditVoter.action}
				dispatch={props.dispatch}
			/>
			<ImportVotersModal
				isOpen={showImportVoters}
				close={() => setShowImportVoters(false)}
				votingPool={props.votingPool}
				dispatch={props.dispatch}
			/>
		</div>
	)
}
Voters.propTypes = {
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	votingPool: PropTypes.object.isRequired,
	dataValid: PropTypes.bool.isRequired,
	data:  PropTypes.array.isRequired,
	dataMap: PropTypes.array.isRequired,
	getVoters: PropTypes.bool.isRequired
}

function mapStateToProps(state) {
	const {voters} = state;
	return {
		filters: voters.votersFilters,
		sortBy: voters.votersSortBy,
		sortDirection: voters.votersSortDirection,
		votingPool: voters.votingPool,
		dataValid: voters.votersDataValid,
		data: voters.votersData,
		dataMap: voters.votersDataMap,
		getVoters: voters.getVoters,
	}
}
export default connect(mapStateToProps)(Voters);