import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import AppTable from '../table/AppTable'
import ConfirmModal from '../modals/ConfirmModal'
import {getVoters, deleteVoters} from '../actions/voters'
import {ActionButton} from '../general/Icons'
import {getDataMap} from '../selectors/dataMap'
import VotersImportModal from './VotersImport'
import VoterEditModal from './VoterEdit'


const defaultVoter = {
	Name: '',
	SAPIN: '',
	LastName: '',
	FirstName: '',
	MI: '',
	Email: '',
	Status: 'Voter'
}

const wgColumns = Immutable.OrderedMap({
	SAPIN: 		{label: 'SA PIN',		width: 100},
	LastName: 	{label: 'Last Name',	width: 150},
	FirstName: 	{label: 'First Name',	width: 150},
	MI: 		{label: 'MI',			width: 50},
	Email: 		{label: 'Email',		width: 250},
	Status: 	{label: 'Status',		width: 100}
});

const saColumns = Immutable.OrderedMap({
	Email: 		{label: 'Email',		width: 250},
	Name: 		{label: 'Name',			width: 300}
});

function Voters(props) {
	const {votingPoolType, votingPoolName} = useParams()
	const history = useHistory()
	const [editVoter, setEditVoter] = React.useState({
		action: null,
		voter: defaultVoter
	})
	const [showImportVoters, setShowImportVoters] = React.useState(false)

	const columns = votingPoolType === 'SA'? saColumns: wgColumns
	const primaryDataKey = columns.keys()[0]

	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
	const width = Math.min(window.innerWidth - 1, maxWidth)

	React.useEffect(() => {
		if ((!props.votingPool.VotingPoolID || props.votingPool.VotingPoolID !== votingPoolName ||
			 !props.votingPool.PoolType || props.votingPool.PoolType !== votingPoolType) &&
			!props.loading) {
			props.getVoters(votingPoolType, votingPoolName)
		}
	}, [votingPoolName, votingPoolType])

	function close() {
 		history.goBack()
 	}

 	function refresh() {
 		props.getVoters(votingPoolType, votingPoolName)
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
				await props.deleteVoters(votingPoolType, votingPoolName, ids)
			}
		}
	}

	function handleAddVoter(e) {
		setEditVoter({
			action: 'add',
			voter: defaultVoter
		})
	}

	function handleUpdateVoter({rowData}) {
		setEditVoter({
			action: 'update',
			voter: rowData
		})
	}

	return (
		<React.Fragment>
			<div style={{display: 'flex', justifyContent: 'center'}}>
				<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width}}>
					<span><label>Voters Pool:&nbsp;</label>{votingPoolName}</span>
					<span>
						<ActionButton name='add' title='Add Voter' onClick={handleAddVoter} />
						<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
						<ActionButton name='import' title='Import Voters' onClick={() => setShowImportVoters(true)} />
						<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={props.loading} />
						<ActionButton name='close' title='Close' onClick={close} />
					</span>
				</div>
			</div>

			<div style={{flex: 1}}>
				<AppTable
					fixed
					columns={columns}
					controlColumn
					dataSet='voters'
					headerHeight={60}
					estimatedRowHeight={32}
					loading={props.loading}
					onRowDoubleClick={handleUpdateVoter}
					data={props.voters}
					dataMap={props.votersMap}
					rowKey={primaryDataKey}
				/>
			</div>

			<VoterEditModal
				isOpen={!!editVoter.action}
				close={() => setEditVoter(state => ({...state, action: null}))}
				votingPoolName={votingPoolName}
				votingPoolType={votingPoolType}
				voter={editVoter.voter}
				action={editVoter.action}
			/>

			<VotersImportModal
				isOpen={showImportVoters}
				close={() => setShowImportVoters(false)}
				votingPoolName={votingPoolName}
				votingPoolType={votingPoolType}
				uploadVoters={props.uploadVoters}
			/>
		</React.Fragment>
	)
}

Voters.propTypes = {
	selected: PropTypes.array.isRequired,
	votingPool: PropTypes.object.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	voters:  PropTypes.array.isRequired,
	votersMap: PropTypes.array.isRequired,
	getVoters: PropTypes.func.isRequired,
	deleteVoters: PropTypes.func.isRequired
}

const dataSet = 'voters'
export default connect(
	(state, ownProps) => ({
		selected: state[dataSet].selected,
		votingPool: state[dataSet].votingPool,
		valid: state[dataSet].valid,
		loading: state[dataSet].loading,
		voters: state[dataSet][dataSet],
		votersMap: getDataMap(state, dataSet),
	}),
	(dispatch, ownProps) => ({
		getVoters: (...args) => dispatch(getVoters(...args)),
		deleteVoters: (...args) => dispatch(deleteVoters(...args)),
	})
)(Voters)