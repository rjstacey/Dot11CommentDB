import PropTypes from 'prop-types'
import React, {useState, useRef, useEffect} from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import ConfirmModal from './ConfirmModal'
import {setVotersFilter, setVotersSort, setVotersSelected, getVoters, deleteVoters, addVoter, updateVoter, uploadVoters} from './actions/voters'
import {setError} from './actions/error'
import {shallowDiff} from './lib/filter'
import AppTable from './AppTable'
import AppModal from './AppModal'
import {ActionButton} from './Icons'


function ImportVotersModal(props) {
	const fileInputRef = useRef();

	async function submit() {
		await props.dispatch(uploadVoters(props.votingPoolType, props.votingPoolName, fileInputRef.current.files[0]))
		props.close()
	}

	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Import voters list for {props.votingPoolName}</p>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={fileInputRef}
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
	votingPoolName: PropTypes.string.isRequired,
	votingPoolType: PropTypes.oneOf(['SA', 'WG']),
	dispatch: PropTypes.func.isRequired
}

function AddUpdateVoterModal(props) {
	const [voter, setVoter] = useState(props.voter)

	function onOpen() {
		setVoter(props.voter)
	}

	function change(e) {
		let {name, value} = e.target
		if (name === 'SAPIN') {
			value = parseInt(value, 10)
		}
		setVoter({...voter, [name]: value})
	}

	async function submit(e) {
		const key = props.votingPoolType === 'SA'? 'Email': 'SAPIN'
		let a
		if (!voter[key]) {
			a = setError(`Unable to ${props.action} voter`, `${key} must not be blank.`)
		}
		else {
			if (props.action === 'add') {
				a = addVoter(
					props.votingPoolType,
					props.votingPoolName,
					voter
				)
			}
			else {
				const changed = shallowDiff(props.voter, voter)
				a = updateVoter(
					props.votingPoolType,
					props.votingPoolName,
					props.voter[key],
					changed
				)
			}
		}
		await props.dispatch(a)
		props.close()
	}

	const style = {
		label: {display: 'inline-block', textAlign: 'left', width: '100px'}
	}

	const title = props.action === 'add'
		? 'Add voter to voting pool ' + props.votingPoolName
		: 'Update voter'

	const wgVoterFields = (
		<React.Fragment>
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
		</React.Fragment>
	)

	const saVoterFields = (
		<React.Fragment>
			<p>
				<label style={style.label}>Name:</label>
				<input style={{width: 200}} type='text' name='Name' value={voter.Name} onChange={change}/>
			</p>
			<p>
				<label style={style.label}>Email:</label>
				<input style={{width: 250}} type='text' name='Email' value={voter.Email} onChange={change}/>
			</p>
		</React.Fragment>
	)

	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<h3>{title}</h3>
			{props.votingPoolType === 'SA'? saVoterFields: wgVoterFields}
			<p>
				<button onClick={submit}>OK</button>
				<button onClick={props.close}>Cancel</button>
			</p>
		</AppModal>
	)
}
AddUpdateVoterModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPoolName: PropTypes.string.isRequired,
	votingPoolType: PropTypes.oneOf(['SA', 'WG']),
	voter: PropTypes.object.isRequired,
	action: PropTypes.oneOf(['add', 'update']),
	dispatch: PropTypes.func.isRequired
}

const defaultVoter = {
	Name: '',
	SAPIN: '',
	LastName: '',
	FirstName: '',
	MI: '',
	Email: '',
	Status: 'Voter'
}

const wgColumns = [
	{dataKey: 'SAPIN',		label: 'SA PIN',	width: 100,	sortable: true},
	{dataKey: 'LastName',	label: 'Last Name',	width: 150,	sortable: true},
	{dataKey: 'FirstName',	label: 'First Name',width: 150,	sortable: true},
	{dataKey: 'MI',			label: 'MI',		width: 50,	sortable: true},
	{dataKey: 'Email',		label: 'Email',		width: 250,	sortable: true},
	{dataKey: 'Status',		label: 'Status',	width: 100,	sortable: true}
]

const saColumns = [
	{dataKey: 'Email',		label: 'Email',		width: 250,	sortable: true},
	{dataKey: 'Name',		label: 'Name',		width: 300,	sortable: true}
]

function Voters(props) {
	let {votingPoolType, votingPoolName} = useParams()
	const history = useHistory()
	const [addUpdateVoter, setAddUpdateVoter] = useState({
		action: null,
		voter: defaultVoter
	})
	const [showImportVoters, setShowImportVoters] = useState(false)

	const columns = votingPoolType === 'SA'? saColumns: wgColumns
	const primaryDataKey = columns[0].dataKey

	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
	const width = Math.min(window.innerWidth - 1, maxWidth)

	function getTableSize() {
		const headerEl = document.getElementsByTagName('header')[0]
		const height = window.innerHeight - headerEl.offsetHeight - 5
		return {height, width}
	}

	useEffect(() => {
		if ((!props.votingPool.VotingPool || props.votingPool.VotingPool !== votingPoolName ||
			 !props.votingPool.PoolType || props.votingPool.PoolType !== votingPoolType) &&
			!props.getVoters) {
			props.dispatch(getVoters(votingPoolType, votingPoolName))
		}
	}, [votingPoolName, votingPoolType])

	function close() {
 		history.goBack()
 	}

 	function refresh() {
 		props.dispatch(getVoters(votingPoolType, votingPoolName))
 	}

	async function handleRemoveSelected() {
		const {voters, votersMap} = props
		var ids = []
		for (var i = 0; i < votersMap.length; i++) { // only select checked items that are visible
			let id = voters[votersMap[i]][primaryDataKey]
			if (props.selected.includes(id)) {
				ids.push(id)
			}
		}

		if (ids.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + ids.join(', ') + '?')
			if (ok) {
				await props.dispatch(deleteVoters(votingPoolType, votingPoolName, ids))
			}
		}
	}

	function handleAddVoter(e) {
		setAddUpdateVoter({
			action: 'add',
			voter: defaultVoter
		})
	}

	function handleUpdateVoter({rowData}) {
		setAddUpdateVoter({
			action: 'update',
			voter: rowData
		})
	}

	return (
		<div id='Voters' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width, justifyContent: 'space-between'}}>
				<span><label>Voting Pool:&nbsp;</label>{votingPoolName}</span>
				<span>
					<ActionButton name='add' title='Add Voter' onClick={handleAddVoter} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import Voters' onClick={() => setShowImportVoters(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={props.getVoters} />
					<ActionButton name='close' title='Close' onClick={close} />
				</span>
			</div>
			<AppTable
				columns={columns}
				rowHeight={20}
				getTableSize={getTableSize}
				loading={props.getVoters}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				setSort={(dataKey, event) => props.dispatch(setVotersSort(event, dataKey))}
				setFilter={(dataKey, value) => props.dispatch(setVotersFilter(dataKey, value))}
				setSelected={(ids) => props.dispatch(setVotersSelected(ids))}
				selected={props.selected}
				editRow={handleUpdateVoter}
				data={props.voters}
				dataMap={props.votersMap}
				primaryDataKey={primaryDataKey}
			/>

			<AddUpdateVoterModal
				isOpen={!!addUpdateVoter.action}
				close={() => setAddUpdateVoter({...addUpdateVoter, action: null})}
				votingPoolName={votingPoolName}
				votingPoolType={votingPoolType}
				voter={addUpdateVoter.voter}
				action={addUpdateVoter.action}
				dispatch={props.dispatch}
			/>
			<ImportVotersModal
				isOpen={showImportVoters}
				close={() => setShowImportVoters(false)}
				votingPoolName={votingPoolName}
				votingPoolType={votingPoolType}
				dispatch={props.dispatch}
			/>
		</div>
	)
}
Voters.propTypes = {
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	selected: PropTypes.array.isRequired,
	votingPool: PropTypes.object.isRequired,
	votersValid: PropTypes.bool.isRequired,
	voters:  PropTypes.array.isRequired,
	votersMap: PropTypes.array.isRequired,
	getVoters: PropTypes.bool.isRequired
}

function mapStateToProps(state) {
	const s = state.voters
	return {
		filters: s.votersFilters,
		sortBy: s.votersSortBy,
		sortDirection: s.votersSortDirection,
		selected: s.votersSelected,
		votingPool: s.votingPool,
		votersValid: s.votersValid,
		voters: s.voters,
		votersMap: s.votersMap,
		getVoters: s.getVoters,
	}
}
export default connect(mapStateToProps)(Voters)