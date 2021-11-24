import PropTypes from 'prop-types';
import React from 'react';
import {useHistory} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable,{SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/icons';
import {ConfirmModal} from 'dot11-components/modals';

import VotersPoolAddModal from './VotersPoolAdd';

import {loadVotingPools, deleteVotingPools, getVotingPoolsDataSet, dataSet} from '../store/votingPools'

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
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

	const history = useHistory();
	const [showVotersPoolAdd, setShowVotersPoolAdd] = React.useState(false);

	const {valid, loading} = useSelector(getVotingPoolsDataSet);
	const dispatch = useDispatch();
	const load = React.useCallback(() => dispatch(loadVotingPools()), [dispatch]);

	React.useEffect(() => {
		if (!valid && !loading)
			load();
	}, []);

	const columns = React.useMemo(() => {
		const deleteVotingPool = async (vp) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${vp.VotingPoolID}?`)
			if (ok)
				dispatch(deleteVotingPools([vp.VotingPoolID]));
		}

		return tableColumns.map(col =>
			col.key === 'Actions'
				? {	...col,
					cellRenderer: ({rowData}) => 
						<RowActions
							onEdit={() => history.push(`/voters/${rowData.VotingPoolID}`)}
							onDelete={() => deleteVotingPool(rowData)}
						/>}
				: col
		);
	}, [dispatch]);

	const addVotingPool = (votingPoolName) => history.push(`/voters/${votingPoolName}`);

	return <>
		<TopRow style={{maxWidth}}>
			<label>Voting Pools</label>
			<span>
				<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowVotersPoolAdd(true)} />
				<ActionButton name='refresh' title='Refresh' onClick={load} />
			</span>
		</TopRow>

		<TableRow>
			<AppTable
				fitWidth
				fixed
				columns={columns}
				estimatedRowHeight={32}
				headerHeight={36}
				dataSet={dataSet}
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
