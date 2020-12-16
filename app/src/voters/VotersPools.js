import PropTypes from 'prop-types'
import React from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import AppTable from '../table/AppTable'
import ConfirmModal from '../modals/ConfirmModal'
import {getVotingPools, deleteVotingPools} from '../actions/votingPools'
import {getDataMap} from '../selectors/dataMap'
import {ActionButton} from '../general/Icons'
import VotersPoolAddModal from './VotersPoolAdd'

const columns = Immutable.OrderedMap({
	PoolType: 		{label: 'Type',		width: 80},
	VotingPoolID: 	{label: 'Name',		width: 200},
	VoterCount: 	{label: 'Voters',	width: 100}
});

function VotersPools(props) {
	const history = useHistory()
	const [showVotersPoolAdd, setShowVotersPoolAdd] = React.useState(false)
	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40
	const width = Math.min(window.innerWidth - 1, maxWidth)

	React.useEffect(() => {
		if (!props.valid)
			props.getVotingPools()
	}, [])

	const showVoters = ({rowData}) => history.push(`/Voters/${rowData.PoolType}/${rowData.VotingPoolID}`)

	const onVotersPoolAdd = (votingPoolType, votingPoolName) => history.push(`/Voters/${votingPoolType}/${votingPoolName}`)

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
		<React.Fragment>
			<div style={{display: 'flex', justifyContent: 'center'}}>
				<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width}}>
					<span><label>Voting Pools</label></span>
					<span>
						<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowVotersPoolAdd(true)} />
						<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
						<ActionButton name='refresh' title='Refresh' onClick={props.getVotingPools} />
					</span>
				</div>
			</div>

			<div style={{flex: 1}}>
				<AppTable
					fixed
					columns={columns}
					controlColumn
					estimatedRowHeight={32}
					headerHeight={28}
					dataSet='votingPools'
					loading={props.loading}
					data={props.votingPools}
					dataMap={props.votingPoolsMap}
					rowKey='VotingPoolID'
					onRowDoubleClick={showVoters}
				/>
			</div>

			<VotersPoolAddModal
				isOpen={showVotersPoolAdd}
				close={() => setShowVotersPoolAdd(false)}
				onSubmit={onVotersPoolAdd}
			/>
		</React.Fragment>
	)
}

VotersPools.propTypes = {
	selected: PropTypes.array.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	votingPools:  PropTypes.array.isRequired,
	votingPoolsMap: PropTypes.array.isRequired,
	getVotingPools: PropTypes.func.isRequired,
}

const dataSet = 'votingPools'
export default connect(
	(state, ownProps) => {
		return {
			selected: state[dataSet].selected,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			votingPools: state[dataSet].votingPools,
			votingPoolsMap: getDataMap(state, dataSet),
		}
	},
	(dispatch, ownProps) => ({
		getVotingPools: () => dispatch(getVotingPools()),
		deleteVotingPools: (vps) => dispatch(deleteVotingPools(vps)),
	})
)(VotersPools)