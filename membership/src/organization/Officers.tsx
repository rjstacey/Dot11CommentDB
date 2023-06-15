import React from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type { RootState } from '../store';

import {Field, Col, ActionIcon} from 'dot11-components';

import {
	addOfficer,
	updateOfficer,
	deleteOfficer,
	selectOfficersState,
	selectGroupOfficers,
	Officer,
	OfficerId,
} from '../store/officers';

import MemberSelector from './MemberActiveSelector';
import OfficerPositionSelector from './OfficerPositionSelector';
import {EditTable as Table, TableColumn} from '../components/Table';

const tableColumns: TableColumn[] = [
	{key: 'position', label: 'Position', gridTemplate: 'minmax(200px, auto)'},
	{key: 'member',	label: 'Member', gridTemplate: 'minmax(300px, 1fr)'},
	{key: 'action', label: '', gridTemplate: '40px'}
];

function Officers({groupId, readOnly}: {groupId: string; readOnly?: boolean}) {
	const dispatch = useAppDispatch();
	const selectOfficers = React.useCallback((state: RootState) => selectGroupOfficers(selectOfficersState(state), groupId), [groupId]);
	const officers = useAppSelector(selectOfficers);

	const columns = React.useMemo(() => {
		const officer: Officer = {
			id: '',
			group_id: groupId,
			position: '',
			sapin: 0
		};

		const addOne = () => dispatch(addOfficer(officer));
		const updateOne = (id: OfficerId, changes: {}) => dispatch(updateOfficer({id, changes}));
		const removeOne = (id: OfficerId) => dispatch(deleteOfficer(id));

		let columns = tableColumns.slice();
		if (readOnly)
			columns = columns.filter(col => col.key !== 'action');
		columns = columns.map(col => {
			col = {...col};
			if (col.key === 'position') {
				col.renderCell = (entry: Officer) =>
					<OfficerPositionSelector
						value={entry.position}
						onChange={(position: string) => updateOne(entry.id, {position})}
						readOnly={readOnly}
					/>;
			}
			else if (col.key === 'member') {
				col.renderCell = (entry: Officer) =>
					<MemberSelector
						value={entry.sapin}
						onChange={(sapin: number) => updateOne(entry.id, {sapin})}
						readOnly={readOnly}
					/>;
			}
			else if (col.key === 'action') {
				col.renderCell = (entry: Officer) => 
					<ActionIcon type='delete' onClick={() => removeOne(entry.id)} />
				col.label = 
					<ActionIcon type='add' onClick={addOne} />
			}
			return col;
		});

		return columns;
	}, [dispatch, readOnly, groupId]);

	return (
		<Col>
			<Field label='Officers:' />
			<Table
				columns={columns}
				values={officers}
			/>
		</Col>
	)
}

export default Officers;
