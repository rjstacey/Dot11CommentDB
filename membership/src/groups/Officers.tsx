import React from 'react';
import { v4 as uuid } from 'uuid';
import { Field, Col, ActionIcon } from 'dot11-components';

import { OfficerId, Officer } from '../store/officers';

import MemberSelector from './MemberActiveSelector';
import OfficerPositionSelector from './OfficerPositionSelector';
import {EditTable as Table, TableColumn} from '../components/Table';

const tableColumns: TableColumn[] = [
	{key: 'position', label: 'Position', gridTemplate: 'minmax(200px, auto)'},
	{key: 'member',	label: 'Member', gridTemplate: 'minmax(300px, 1fr)'},
	{key: 'action', label: '', gridTemplate: '40px'}
];

function Officers({
	officers,
	onChange,
	groupId,
	readOnly
}: {
	officers: Officer[];
	onChange: (officers: Officer[]) => void;
	groupId: string;
	readOnly?: boolean
}) {

	function addOne() {
		const officer: Officer = {
			id: uuid(),
			group_id: groupId,
			position: '',
			sapin: 0
		};
		officers = [...officers, officer];
		onChange(officers);
	}

	function updateOne(id: OfficerId, changes: Partial<Officer>) {
		const i = officers.findIndex(o => o.id === id);
		if (i < 0)
			throw Error("Can't find officer with id=" + id);
		officers[i] = {...officers[i], ...changes};
		onChange(officers);
	}

	function removeOne(id: OfficerId) {
		const i = officers.findIndex(o => o.id === id);
		if (i < 0)
			throw Error("Can't find officer with id=" + id);
		officers = officers.slice();
		officers.splice(i, 1);
		onChange(officers);
	}

	const columns = 
		(readOnly? tableColumns.filter(col => col.key !== 'action'): tableColumns)
		.map(col => {
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
