import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table'
import {ActionButton} from 'dot11-components/lib/icons'
import {getData, getSortedFilteredIds} from 'dot11-components/store/dataSelectors'
import {ConfirmModal} from 'dot11-components/modals'
import {Input} from 'dot11-components/general/Form'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import VotersImportModal from './VotersImport'
import VoterEditModal from './VoterEdit'

import {loadVoters, deleteVoters} from '../store/voters'
import {updateVotingPool} from '../store/votingPools'

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
	SAPIN: '',
	Status: 'Voter'
}

const controlColumn = {
	key: '__ctrl__',
	width: 30, flexGrow: 1, flexShrink: 0,
	headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
	cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />
}

const actionsColumn = {
	key: 'Actions',		label: 'Actions', 		width: 100
}

const tableColumns = [
	controlColumn,
	{key: 'SAPIN',		label: 'SA PIN',		width: 100},
	{key: 'Name',		label: 'Name',			width: 200, dropdownWidth: 250},
	{key: 'Email',		label: 'Email',			width: 250, dropdownWidth: 350},
	{key: 'Status',		label: 'Status',		width: 100},
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

function Voters({
	loadVoters,
	deleteVoters,
	uploadVoters,
	votingPool,
	updateVotingPool,
	loading,
	shownIds,
	selected,
	members
}) {
	const {votingPoolName} = useParams();
	const [name, setName] = React.useState(votingPoolName);
	const history = useHistory();
	const [editVoter, setEditVoter] = React.useState({action: null, voter: defaultVoter});
	const [showImportVoters, setShowImportVoters] = React.useState(false);

	const [columns, maxWidth] = React.useMemo(() => {

		const onDelete = async (voter) => {
			const ok = await ConfirmModal.show(`Are you sure you want to remove ${voter.SAPIN} ${voter.Name} from the voting pool?`)
			if (ok)
				deleteVoters(votingPoolName, [voter.id])
		}

		const columns = tableColumns.concat({
			...actionsColumn,
			cellRenderer: ({rowData}) => 
				<RowActions
					onEdit={() => setEditVoter({action: 'update', voter: rowData})}
					onDelete={() => onDelete(rowData)}
				/>
		});
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return [columns, maxWidth];
	}, [votingPoolName]);

	React.useEffect(() => {
		if ((!votingPool.VotingPoolID || votingPool.VotingPoolID !== votingPoolName) &&
			!loading) {
			loadVoters(votingPoolName)
		}
	}, [votingPool, votingPoolName]);

	const close = history.goBack;
 	const refresh = () => loadVoters(votingPoolName);

	async function handleRemoveSelected() {
		const ids = [];
		for (let id of shownIds) { // only select checked items that are visible
			if (selected.includes(id))
				ids.push(id);
		}
		if (ids.length) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${ids.length} entries?`);
			if (ok)
				await deleteVoters(votingPoolName, ids);
		}
	}

	const handleAddVoter = () => setEditVoter({action: 'add', voter: defaultVoter});
	//const handleUpdateVoter = ({rowData}) => setEditVoter({action: 'update', voter: rowData});

	const rowGetter = ({rowId, rowData}) => ({...members[rowId], ...rowData});

	const updateVotingPoolName = async () => {
		await updateVotingPool(votingPoolName, {VotingPoolID: name});
		history.push(`/Voters/${name}`)
	}

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<span>
					<label>WG ballot voting pool:&nbsp;{votingPoolName}</label>
					<ActionButtonDropdown
						name='edit'
						onClose={updateVotingPoolName}
					>
						<Input type='text'
							size={24}
							value={name}
							onChange={e => setName(e.target.value)}
							onKeyDown={e => {if (e.key === 'Enter') updateVotingPoolName();}}
						/>
					</ActionButtonDropdown>
				</span>
				<span>
					<ActionButton name='add' title='Add voter' onClick={handleAddVoter} />
					<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import voters' onClick={() => setShowImportVoters(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
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
					loading={loading}
					rowKey={'SAPIN'}
					//rowGetter={rowGetter}
				/>
			</TableRow>

			<VoterEditModal
				isOpen={!!editVoter.action}
				close={() => setEditVoter(state => ({...state, action: null}))}
				votingPoolName={votingPoolName}
				voter={editVoter.voter}
				action={editVoter.action}
			/>

			<VotersImportModal
				isOpen={showImportVoters}
				close={() => setShowImportVoters(false)}
				votingPoolName={votingPoolName}
				uploadVoters={uploadVoters}
			/>
		</React.Fragment>
	)
}

Voters.propTypes = {
	selected: PropTypes.array.isRequired,
	votingPool: PropTypes.object.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	shownIds: PropTypes.array.isRequired,
	loadVoters: PropTypes.func.isRequired,
	deleteVoters: PropTypes.func.isRequired,
	updateVotingPool: PropTypes.func.isRequired
}

export default connect(
	(state, ownProps) => ({
		selected: state[dataSet].selected,
		votingPool: state[dataSet].votingPool,
		valid: state[dataSet].valid,
		loading: state[dataSet].loading,
		shownIds: getSortedFilteredIds(state, dataSet),
		members: state.members.entities
	}),
	{loadVoters, deleteVoters, updateVotingPool}
)(Voters)