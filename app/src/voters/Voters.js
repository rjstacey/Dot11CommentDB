import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable from '../table/AppTable'
import {ControlHeader, ControlCell} from '../table/ControlColumn'
import ConfirmModal from '../modals/ConfirmModal'
import VotersImportModal from './VotersImport'
import VoterEditModal from './VoterEdit'
import {ActionButton} from '../general/Icons'

import {getVoters, deleteVoters} from '../store/voters'
import {getData, getSortedFilteredIds} from '../store/dataSelectors'

const dataSet = 'voters'

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

const defaultVoter = {
	Name: '',
	SAPIN: '',
	LastName: '',
	FirstName: '',
	MI: '',
	Email: '',
	Status: 'Voter'
}

const controlColumn = {
	key: '__ctrl__',
	width: 30, flexGrow: 1, flexShrink: 0,
	headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
	cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />
}

const actionsColumn = {
	key: 'Actions',		label: 'Actions', 		width: 100
}

const wgColumns = [
	controlColumn,
	{key: 'SAPIN',		label: 'SA PIN',		width: 100},
	{key: 'LastName',	label: 'Last Name',		width: 150, dropdownWidth: 250},
	{key: 'FirstName',	label: 'First Name',	width: 150, dropdownWidth: 250},
	{key: 'MI',			label: 'MI',			width: 50},
	{key: 'Email',		label: 'Email',			width: 250, dropdownWidth: 350},
	{key: 'Status',		label: 'Status',		width: 100},
];

const saColumns = [
	controlColumn,
	{key: 'Email',		label: 'Email',			width: 250, dropdownWidth: 350},
	{key: 'Name',		label: 'Name',			width: 300, dropdownWidth: 350},
];

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	width: 100%;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

function Voters(props) {
	const {deleteVoters, getVoters, votingPool, loading} = props;
	const {votingPoolType, votingPoolName} = useParams()
	const history = useHistory()
	const [editVoter, setEditVoter] = React.useState({action: null, voter: defaultVoter})
	const [showImportVoters, setShowImportVoters] = React.useState(false)

	const [columns, primaryDataKey, maxWidth] = React.useMemo(() => {

		let columns = votingPoolType === 'WG'? wgColumns: saColumns
		let primaryDataKey = votingPoolType === 'WG'? 'SAPIN': 'Email';

		const onDelete = async (voter) => {
			const ok = await ConfirmModal.show(`Are you sure you want to remove ${voter.FirstName} ${voter.LastName} from the voting pool?`)
			if (ok)
				deleteVoters(votingPoolType, votingPoolName, [voter[primaryDataKey]])
		}

		columns = columns.concat({
			...actionsColumn,
			cellRenderer: ({rowData}) => 
				<RowActions
					onEdit={() => setEditVoter({action: 'update', voter: rowData})}
					onDelete={() => onDelete(rowData)}
				/>
		});
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40
		return [columns, primaryDataKey, maxWidth]
	}, [deleteVoters, votingPoolType, votingPoolName]);

	React.useEffect(() => {
		if ((!votingPool.VotingPoolID || votingPool.VotingPoolID !== votingPoolName ||
			 !votingPool.PoolType || votingPool.PoolType !== votingPoolType) &&
			!loading) {
			getVoters(votingPoolType, votingPoolName)
		}
	}, [getVoters, loading, votingPool, votingPoolName, votingPoolType])

	const close = history.goBack;
 	const refresh = () => props.getVoters(votingPoolType, votingPoolName);

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

	const handleAddVoter = () => setEditVoter({action: 'add', voter: defaultVoter});
	//const handleUpdateVoter = ({rowData}) => setEditVoter({action: 'update', voter: rowData});

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<span><label>{votingPoolType} ballot voting pool:&nbsp;</label>{votingPoolName}</span>
				<span>
					<ActionButton name='add' title='Add Voter' onClick={handleAddVoter} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import Voters' onClick={() => setShowImportVoters(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={props.loading} />
					<ActionButton name='close' title='Close' onClick={close} />
				</span>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					key={columns}
					fixed
					columns={columns}
					dataSet='voters'
					headerHeight={36}
					estimatedRowHeight={36}
					loading={props.loading}
					rowKey={primaryDataKey}
				/>
			</TableRow>

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

export default connect(
	(state, ownProps) => ({
		selected: state[dataSet].selected,
		votingPool: state[dataSet].votingPool,
		valid: state[dataSet].valid,
		loading: state[dataSet].loading,
		voters: getData(state, dataSet),
		votersMap: getSortedFilteredIds(state, dataSet),
	}),
	{getVoters, deleteVoters}
)(Voters)