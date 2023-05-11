import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import {
	AppTable, SelectHeaderCell, SelectCell,
	ActionButton,
	ConfirmModal,
	ColumnProperties
} from 'dot11-components';

import VotersPoolAddModal from './VotersPoolAdd';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadVotingPools, deleteVotingPools, selectVotingPoolsState, votingPoolsSelectors, votingPoolsActions, getVotingPools } from '../store/votingPools';

const Title = styled.h2`
	font-weight: 600;
	font-size: 18px;
	margin: 0;
	padding: 0;
	color: #005979;
`;

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

const tableColumns: (ColumnProperties & {width: number})[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p => <SelectCell selectors={votingPoolsSelectors} actions={votingPoolsActions} {...p} />},
	{key: 'VotingPoolID',
		label: 'Name',		width: 200},
	{key: 'VoterCount',
		label: 'Voters',	width: 100},
	{key: 'Actions',
		label: 'Actions',	width: 100}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);

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

function VotersPools() {

	const navigate = useNavigate();
	const [showVotersPoolAdd, setShowVotersPoolAdd] = React.useState(false);

	const dispatch = useAppDispatch();

	React.useEffect(() => {
		dispatch(getVotingPools());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const columns = React.useMemo(() => {
		const deleteVotingPool = async (vp) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${vp.VotingPoolID}?`)
			if (ok)
				dispatch(deleteVotingPools([vp.VotingPoolID]));
		}

		return tableColumns.map(col =>
			col.key === 'Actions'?
				{	...col,
					cellRenderer: ({rowData}) => 
						<RowActions
							onEdit={() => navigate(`/voters/${rowData.VotingPoolID}`)}
							onDelete={() => deleteVotingPool(rowData)}
						/>}:
				col
		);
	}, [dispatch, navigate]);

	const addVotingPool = (votingPoolName: string) => navigate(`/voters/${votingPoolName}`);

	return <>
		<TopRow style={{maxWidth}}>
			<Title>Ballot series voting pools</Title>
			<span>
				<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowVotersPoolAdd(true)} />
				<ActionButton name='refresh' title='Refresh' onClick={() => dispatch(loadVotingPools())} />
			</span>
		</TopRow>

		<TableRow>
			<AppTable
				fitWidth
				fixed
				columns={columns}
				estimatedRowHeight={32}
				headerHeight={36}
				selectors={votingPoolsSelectors}
				actions={votingPoolsActions}
			/>
		</TableRow>

		<VotersPoolAddModal
			isOpen={showVotersPoolAdd}
			close={() => setShowVotersPoolAdd(false)}
			onSubmit={addVotingPool}
		/>
	</>
}

export default VotersPools;
