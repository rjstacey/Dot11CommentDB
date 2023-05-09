import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import {
	AppTable, SelectHeaderCell, SelectCell,
	ConfirmModal,
	ActionButton, Input,
	ActionButtonDropdown,
	ColumnProperties,
	EntityId
} from 'dot11-components';

import VotersImportModal from './VotersImport';
import VoterEditModal from './VoterEdit';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadVoters, deleteVoters, exportVoters, selectVotersState, fields, votersSelectors, votersActions, SyncedVoter } from '../store/voters';
import { updateVotingPool } from '../store/votingPools';
import { RootState } from '../store';


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
	SAPIN: 0,
	Status: 'Voter'
}

type ColumnPropertiesWithWidth = ColumnProperties & {width: number};

const controlColumn: ColumnPropertiesWithWidth = {
	key: '__ctrl__',
	width: 30, flexGrow: 1, flexShrink: 0,
	headerRenderer: p => <SelectHeaderCell {...p} />,
	cellRenderer: p => <SelectCell selectors={votersSelectors} actions={votersActions} {...p} />
}

const actionsColumn: ColumnPropertiesWithWidth = {
	key: 'Actions',		label: 'Actions', 		width: 100
}

const tableColumns: ColumnPropertiesWithWidth[] = [
	controlColumn,
	{key: 'SAPIN',		label: 'SA PIN',		width: 100},
	{key: 'Name',		label: 'Name',			width: 200, dropdownWidth: 250},
	{key: 'Email',		label: 'Email',			width: 250, dropdownWidth: 350},
	{key: 'Status',		label: 'Status',		width: 100},
	{key: 'Excused',	...fields.Excused,		width: 100},
];

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	display: flex;
	flex-direction: column;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

function selectVotersInfo(state: RootState) {
	const {valid, loading, ids, selected, votingPoolId} = selectVotersState(state);
	const shownIds = votersSelectors.selectSortedFilteredIds(state);
	return {valid, loading, ids, selected, shownIds, votingPoolId};
}

type VotersState = {
	action: "add" | "update" | null;
	voter: {SAPIN: number; Status: string};
}
function Voters() {

	const votingPoolName = useParams().votingPoolName!;
	const [name, setName] = React.useState<string>(votingPoolName);
	const navigate = useNavigate();
	const [editVoter, setEditVoter] = React.useState<VotersState>({action: null, voter: defaultVoter});
	const [showImportVoters, setShowImportVoters] = React.useState(false);

	const {loading, ids, selected, shownIds, votingPoolId} = useAppSelector(selectVotersInfo);

	const dispatch = useAppDispatch();
	const load = React.useCallback((votingPoolName: string) => dispatch(loadVoters(votingPoolName)), [dispatch]);

	const [columns, maxWidth] = React.useMemo(() => {

		const onDelete = async (voter: SyncedVoter) => {
			const ok = await ConfirmModal.show(`Are you sure you want to remove ${voter.SAPIN} ${voter.Name} from the voting pool?`);
			if (ok)
				dispatch(deleteVoters(votingPoolName, [voter.id]));
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
	}, [dispatch, votingPoolName]);

	React.useEffect(() => {
		if ((!votingPoolId || votingPoolId !== votingPoolName) && !loading)
			load(votingPoolName);
	}, [load, loading, votingPoolId, votingPoolName]);

	const close = navigate(-1);
 	const refresh = () => load(votingPoolName);

	async function handleRemoveSelected() {
		const ids: EntityId[] = [];
		for (let id of shownIds) { // only select checked items that are visible
			if (selected.includes(id))
				ids.push(id);
		}
		if (ids.length) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${ids.length} entries?`);
			if (ok)
				await dispatch(deleteVoters(votingPoolName, ids));
		}
	}

	const handleAddVoter = () => setEditVoter({action: 'add', voter: defaultVoter});

	const updateVotingPoolName = React.useCallback(async (name: string) => {
		const votingPool = await dispatch(updateVotingPool(votingPoolName, {VotingPoolID: name}));
		if (votingPool) {
			setName(votingPool.VotingPoolID);
			navigate(`/voters/${votingPool.VotingPoolID}`);
		}
		else {
			setName(votingPoolName);
		}
	}, [dispatch, navigate, votingPoolName]);

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div style={{display: 'flex', alignItems: 'center'}}>
					<label>Ballot series voting pool: {votingPoolName} ({ids.length} voters)</label>
					<ActionButtonDropdown
						name='edit'
						onRequestClose={() => updateVotingPoolName(name)}
					>
						<Input
							type='text'
							size={24}
							value={name}
							onChange={e => setName(e.target.value)}
							onKeyDown={e => {if (e.key === 'Enter') updateVotingPoolName(name);}}
						/>
					</ActionButtonDropdown>
				</div>
				<div>
					<ActionButton name='add' title='Add voter' onClick={handleAddVoter} />
					<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import voters' onClick={() => setShowImportVoters(true)} />
					<ActionButton name='export' title='Export voters' onClick={() => dispatch(exportVoters(votingPoolName))} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow>
				<AppTable
					fitWidth
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					selectors={votersSelectors}
					actions={votersActions}
				/>
			</TableRow>

			<VoterEditModal
				isOpen={!!editVoter.action}
				close={() => setEditVoter(state => ({...state, action: null}))}
				votingPoolName={votingPoolName}
				voter={editVoter.voter}
				action={editVoter.action!}
			/>

			<VotersImportModal
				isOpen={showImportVoters}
				close={() => setShowImportVoters(false)}
				votingPoolName={votingPoolName}
			/>
		</>
	)
}

export default Voters;
