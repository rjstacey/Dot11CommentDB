import PropTypes from 'prop-types'
import React, {useState, useRef, useEffect} from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import AppTable from '../table/AppTable'
import AppModal from '../modals/AppModal'
import ConfirmModal from '../modals/ConfirmModal'
import {setVotingPoolsSort, setVotingPoolsFilter, setVotingPoolsSelected, getVotingPools, deleteVotingPools, uploadVoters} from '../actions/voters'
import {setError} from '../actions/error'
import {ActionButton} from '../general/Icons'

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
			props.setError('Unable to add voting pool', 'Voting pool must have a name')
		}
		else {
			let file = fileInputRef.current.files[0]
			if (file) {
				await props.uploadVoters(votingPoolType, votingPoolName, file)
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
	uploadVoters: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired
}

function ImportVotersModal(props) {
	const votersFileInputRef = useRef()

	async function submit() {
		await props.uploadVoters(props.votingPool.VotingPoolID, votersFileInputRef.current.files[0])
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
	uploadVoters: PropTypes.func.isRequired
}

const columns = [
	{key: 'PoolType',		label: 'Type',		width: 80},
	{key: 'VotingPoolID',	label: 'Name',		width: 200},
	{key: 'VoterCount',		label: 'Voters',	width: 100}
]

function VoterPools(props) {
	const history = useHistory()
	const [showAddVotingPool, setShowAddVotingPool] = useState(false)
	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40
	const width = Math.min(window.innerWidth - 1, maxWidth)

	useEffect(() => {
		if (!props.votingPoolsValid) {
			props.getVotingPools()
		}
	}, [])

	function showVoters({rowData}) {
		history.push(`/Voters/${rowData.PoolType}/${rowData.VotingPoolID}`)
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
				await props.deleteVotingPools(vps);
			}
		}
	}

	return (
		<div id='VoterPools' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width, justifyContent: 'space-between'}}>
				<span><label>Voting Pools</label></span>
				<span>
					<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowAddVotingPool(true)} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={props.getVotingPools} />
				</span>
			</div>
			<AppTable
				fixed
				columns={columns}
				estimatedRowHeight={32}
				headerHeight={64}
				height='70vh'
				width={width}
				loading={props.loading}
				onRowDoubleClick={showVoters}
				filters={props.filters}
				setFilter={props.setFilter}
				sort={props.sort}
				setSort={props.setSort}
				selected={props.selected}
				setSelected={props.setSelected}
				data={props.votingPools}
				dataMap={props.votingPoolsMap}
				rowKey='VotingPoolID'
			/>
			<AddVotingPoolModal
				isOpen={showAddVotingPool}
				close={() => setShowAddVotingPool(false)}
				uploadVoters={props.uploadVoters}
				setError={props.setError}
				history={history}
			/>
		</div>
	)
}

VoterPools.propTypes = {
	filters: PropTypes.object.isRequired,
	sort: PropTypes.object.isRequired,
	selected: PropTypes.array.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools:  PropTypes.array.isRequired,
	votingPoolsMap: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	setFilter: PropTypes.func.isRequired,
	setSort: PropTypes.func.isRequired,
	setSelected: PropTypes.func.isRequired,
	getVotingPools: PropTypes.func.isRequired,
	uploadVoters: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired,
}

export default connect(
	(state, ownProps) => {
		const s = state.voters
		return {
			filters: s.votingPoolsFilters,
			sort: s.votingPoolsSort,
			selected: s.votingPoolsSelected,
			votingPoolsValid: s.votingPoolsValid,
			votingPools: s.votingPools,
			votingPoolsMap: s.votingPoolsMap,
			loading: s.getVotingPools
		}
	},
	(dispatch, ownProps) => ({
		setFilter: (dataKey, value) => dispatch(setVotingPoolsFilter(dataKey, value)),
		setSort: (dataKey, event) => dispatch(setVotingPoolsSort(event, dataKey)),
		setSelected: (ids) => dispatch(setVotingPoolsSelected(ids)),
		getVotingPools: () => dispatch(getVotingPools()),
		deleteVotingPools: (vps) => dispatch(deleteVotingPools(vps)),
		uploadVoters: (votingPoolType, votingPoolName, file) => dispatch(uploadVoters(votingPoolType, votingPoolName, file)),
		setError: (a, b) => dispatch(setError(a, b))
	})
)(VoterPools)