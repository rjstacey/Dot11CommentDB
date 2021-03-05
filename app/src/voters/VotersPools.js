import PropTypes from 'prop-types'
import React from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable from '../table/AppTable'
import {ControlHeader, ControlCell} from '../table/ControlColumn'
import ConfirmModal from '../modals/ConfirmModal'
import {ActionButton} from '../general/Icons'
import VotersPoolAddModal from './VotersPoolAdd'

import {loadVotingPools, deleteVotingPools} from '../store/votingPools'
import {getData, getSortedFilteredIds} from '../store/dataSelectors'

const dataSet = 'votingPools'

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
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'PoolType',
		label: 'Type',		width: 80, dropdownWidth: 150},
	{key: 'VotingPoolID',
		label: 'Name',		width: 200},
	{key: 'VoterCount',
		label: 'Voters',	width: 100},
	{key: 'Actions',
		label: 'Actions',	width: 100}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;

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

function VotersPools(props) {
	const {valid, loading, loadVotingPools, deleteVotingPools} = props;
	const history = useHistory();
	const [showVotersPoolAdd, setShowVotersPoolAdd] = React.useState(false);

	React.useEffect(() => {
		if (!valid && !loading)
			loadVotingPools();
	}, [valid, loading, loadVotingPools]);

	const columns = React.useMemo(() => {
		const deleteVotingPool = async (vp) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${vp.VotingPoolID}?`)
			if (ok)
				deleteVotingPools([vp])
		}

		return tableColumns.map(col =>
			col.key === 'Actions'
				? {	...col,
					cellRenderer: ({rowData}) => 
						<RowActions
							onEdit={() => history.push(`/Voters/${rowData.PoolType}/${rowData.VotingPoolID}`)}
							onDelete={() => deleteVotingPool(rowData)}
						/>}
				: col
		);
	}, [history, deleteVotingPools]);


	const addVotingPool = (votingPoolType, votingPoolName) => history.push(`/Voters/${votingPoolType}/${votingPoolName}`)

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<label>Voting Pools</label>
				<span>
					<ActionButton name='add' title='Add Voter Pool' onClick={() => setShowVotersPoolAdd(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={props.getVotingPools} />
				</span>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					estimatedRowHeight={32}
					headerHeight={36}
					dataSet='votingPools'
					loading={props.loading}
					rowKey='VotingPoolID'
				/>
			</TableRow>

			<VotersPoolAddModal
				isOpen={showVotersPoolAdd}
				close={() => setShowVotersPoolAdd(false)}
				onSubmit={addVotingPool}
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
	loadVotingPools: PropTypes.func.isRequired,
	deleteVotingPools: PropTypes.func.isRequired,
}

export default connect(
	(state, ownProps) => ({
		selected: state[dataSet].selected,
		valid: state[dataSet].valid,
		loading: state[dataSet].loading,
		votingPools: getData(state, dataSet),
		votingPoolsMap: getSortedFilteredIds(state, dataSet),
	}),
	{loadVotingPools, deleteVotingPools}
)(VotersPools)
