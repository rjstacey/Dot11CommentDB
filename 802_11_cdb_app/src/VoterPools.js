import PropTypes from 'prop-types'
import React, {useState, useRef, useEffect} from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import AppTable from './AppTable'
import AppModal from './AppModal'
import ConfirmModal from './ConfirmModal'
import {setVotingPoolsSort, setVotingPoolsFilter, setVotingPoolsSelected, getVotingPools, deleteVotingPools, uploadVoters} from './actions/voters'
import {setError} from './actions/error'
import {ActionButton} from './Icons'

function AddVotingPoolModal(props) {
	const [votingPoolName, setVotingPoolName] = useState('')
	const [votingPoolType, setVotingPoolType] = useState('WG')
	const fileInputRef = useRef()

	function onOpen() {
		// Reset votinPool data to default on each open
		setVotingPoolName('')
		setVotingPoolType('WG')
	}

	async function submit() {
		if (!votingPoolName) {
			props.dispatch(setError('Unable to add voting pool', 'Voting pool must have a name'))
		}
		else {
			let file = fileInputRef.current.files[0]
			if (file) {
				await props.dispatch(uploadVoters(votingPoolType, votingPoolName, file))
			}
			props.history.push(`/Voters/${votingPoolType}/${votingPoolName}`)
		}
		props.close()
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
			<h3>Add voters pool</h3>
			<p>
				<label style={style.label}>Pool Name:</label>
				<input type='text' name='Name' value={votingPoolName} onChange={e => setVotingPoolName(e.target.value)}/>
			</p>
			<p>
				<label><input type="radio" value='WG' checked={votingPoolType === 'WG'} onChange={e => setVotingPoolType(e.target.value)} />WG ballot pool</label><br />
				<label><input type="radio" value='SA' checked={votingPoolType === 'SA'} onChange={e => setVotingPoolType(e.target.value)} />SA ballot pool</label><br />
			</p>
			<p>
				<label style={style.label}>Voters:</label>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileInputRef}
				/>
			</p>
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
	const votersFileInputRef = useRef()

	async function submit() {
		await props.dispatch(uploadVoters(props.votingPool.VotingPoolID, votersFileInputRef.current.files[0]))
		props.close()
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

const columns = [
	{dataKey: 'PoolType',		label: 'Type',
		sortable: true,
		width: 80},
	{dataKey: 'VotingPoolID',	label: 'Name',
		sortable: true,
		width: 200},
	{dataKey: 'VoterCount',		label: 'Voters',
		sortable: true,
		width: 100,
		isLast: true}
]

function VoterPools(props) {
	const history = useHistory()
	const [showAddVotingPool, setShowAddVotingPool] = useState(false)

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	function updateTableSize() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
		const headerEl = document.getElementsByTagName('header')[0]
		const topRowEl = document.getElementById('top-row')

		const height = window.innerHeight - headerEl.offsetHeight - topRowEl.offsetHeight - 5
		const width = window.innerWidth - 1

		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width: Math.min(width, maxWidth)})
		}
	}

	useEffect(() => {
		updateTableSize();
		window.addEventListener("resize", updateTableSize)
		return () => {
			window.removeEventListener("resize", updateTableSize)
		}
	}, [])

	useEffect(() => {
		if (!props.votingPoolsValid) {
			props.dispatch(getVotingPools())
		}
	}, [])

	function showVoters({event, rowData}) {
		history.push(`/Voters/${rowData.PoolType}/${rowData.VotingPoolID}`)
	}

	function refresh() {
		props.dispatch(getVotingPools());
	}

	async function handleRemoveSelected() {
		const data = props.votingPools
		const dataMap = props.votingPoolsMap
		let vps = []
		for (var i = 0; i < dataMap.length; i++) { // only select checked items that are visible
			let vp = data[dataMap[i]]
			if (props.selected.includes(vp.VotingPoolID)) {
				vps.push(vp)
			}
		}

		if (vps.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + vps.map(vp => vp.VotingPoolID).join(', ') + '?')
			if (ok) {
				await props.dispatch(deleteVotingPools(vps))
			}
		}
	}

	return (
		<div id='VoterPools' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between'}}>
				<span><label>Voting Pools</label></span>
				<span>
					<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowAddVotingPool(true)} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</span>
			</div>
			<AppTable
				columns={columns}
				rowHeight={22}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getVotingPools}
				editRow={showVoters}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				setSort={(dataKey, event) => props.dispatch(setVotingPoolsSort(event, dataKey))}
				setFilter={(dataKey, value) => props.dispatch(setVotingPoolsFilter(dataKey, value))}
				setSelected={(ids) => props.dispatch(setVotingPoolsSelected(ids))}
				selected={props.selected}
				data={props.votingPools}
				dataMap={props.votingPoolsMap}
				primaryDataKey='VotingPoolID'
			/>
			<AddVotingPoolModal
				isOpen={showAddVotingPool}
				close={() => setShowAddVotingPool(false)}
				dispatch={props.dispatch}
				history={history}
			/>
		</div>
	)
}
VoterPools.propTypes = {
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	selected: PropTypes.array.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools:  PropTypes.array.isRequired,
	votingPoolsMap: PropTypes.array.isRequired,
	getVotingPools: PropTypes.bool.isRequired
}

function mapStateToProps(state) {
	const s = state.voters
	return {
		filters: s.votingPoolsFilters,
		sortBy: s.votingPoolsSortBy,
		sortDirection: s.votingPoolsSortDirection,
		selected: s.votingPoolsSelected,
		votingPoolsValid: s.votingPoolsValid,
		votingPools: s.votingPools,
		votingPoolsMap: s.votingPoolsMap,
		getVotingPools: s.getVotingPools
	}
}
export default connect(mapStateToProps)(VoterPools)