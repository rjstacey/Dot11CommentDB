import React from 'react';
import styled from '@emotion/styled';

import {
	AppTable, SelectHeaderCell, SelectCell,
	ConfirmModal,
	ActionButton,
	ColumnProperties
} from 'dot11-components';

import type { RootState } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentBallot_id } from '../store/ballots';
import {
	loadVoters,
	clearVoters,
	deleteVoters,
	exportVoters,
	selectVotersState,
	selectVotersBallot_id,
	votersSelectors,
	votersActions,
	Voter,
	VoterCreate
} from '../store/voters';

import VotersImportModal from './VotersImport';
import VoterEditModal from './VoterEdit';
import PathBallotSelector from '../components/PathBallotSelector';
import TopRow from '../components/TopRow';

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

function getDefaultVoter(ballot_id: number | null): VoterCreate {
	let voter: VoterCreate = {
		SAPIN: 0,
		Status: "Voter"
	}
	if (ballot_id)
		voter.ballot_id = ballot_id;
	return voter;
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
	{key: 'Excused',	label: 'Excused',		width: 100, dataRenderer: (value) => value? "Yes": ""},
];

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
	const {valid, loading, ids, selected} = selectVotersState(state);
	const shownIds = votersSelectors.selectSortedFilteredIds(state);
	return {valid, loading, ids, selected, shownIds};
}

type VotersState = {
	action: "add" | "update" | null;
	voter: VoterCreate;
}

function Voters() {
	const dispatch = useAppDispatch();

	const votersBallot_id = useAppSelector(selectVotersBallot_id);
	const currentBallot_id = useAppSelector(selectCurrentBallot_id);

	React.useEffect(() => {
		if (currentBallot_id && votersBallot_id !== currentBallot_id)
			dispatch(loadVoters(currentBallot_id));
		if (!currentBallot_id && votersBallot_id)
			dispatch(clearVoters());
	}, [dispatch, currentBallot_id, votersBallot_id]);

	const refresh = () => dispatch(votersBallot_id? loadVoters(votersBallot_id): clearVoters());

	const [editVoter, setEditVoter] = React.useState<VotersState>({action: null, voter: getDefaultVoter(votersBallot_id)});
	const [showImportVoters, setShowImportVoters] = React.useState(false);

	const {loading, selected, shownIds} = useAppSelector(selectVotersInfo);

	const [columns, maxWidth] = React.useMemo(() => {

		const onDelete = async (voter: Voter) => {
			const ok = await ConfirmModal.show(`Are you sure you want to remove ${voter.SAPIN} ${voter.Name} from the voting pool?`);
			if (ok)
				dispatch(deleteVoters([voter.id]));
		}

		const columns = tableColumns.concat({
			...actionsColumn,
			cellRenderer: ({rowData}: {rowData: Voter}) => 
				<RowActions
					onEdit={() => setEditVoter({action: 'update', voter: rowData})}
					onDelete={() => onDelete(rowData)}
				/>
		});
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return [columns, maxWidth];
	}, [dispatch]);

	async function handleRemoveSelected() {
		const ids = selected.filter(id => shownIds.includes(id));	// only select checked items that are visible
		if (ids.length) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${ids.length} entries?`);
			if (ok)
				await dispatch(deleteVoters(ids));
		}
	}

	const handleAddVoter = () => setEditVoter({action: 'add', voter: getDefaultVoter(votersBallot_id!)});

	return (
		<>
			<TopRow style={{maxWidth}}>
				<PathBallotSelector />
				<div>
					<ActionButton name='add' title='Add voter' disabled={!votersBallot_id} onClick={handleAddVoter} />
					<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='import' title='Import voters' disabled={!votersBallot_id} onClick={() => setShowImportVoters(true)} />
					<ActionButton name='export' title='Export voters' disabled={!votersBallot_id} onClick={() => dispatch(exportVoters(votersBallot_id!))} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={loading} />
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
				ballot_id={votersBallot_id}
				voter={editVoter.voter}
				action={editVoter.action}
			/>

			<VotersImportModal
				isOpen={showImportVoters}
				close={() => setShowImportVoters(false)}
				ballot_id={votersBallot_id}
			/>
		</>
	)
}

export default Voters;
