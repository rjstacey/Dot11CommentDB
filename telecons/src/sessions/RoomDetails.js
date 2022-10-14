import React from 'react';

import {Input, Row, Field} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';

const tableColumns = {
	name: {
		label: 'Name',
		gridTemplate: 'minmax(200px, auto)'
	},
	description: {
		label: 'Description',
		gridTemplate: 'minmax(200px, auto)'
	},
	action: {
		label: '',
		gridTemplate: '80px'
	}
};

const defaultEntry = {name: '', description: ''};

function RoomDetails({
	rooms,
	addRoom,
	removeRoom,
	updateRoom,
	moveRoomUp,
	moveRoomDown,
	getRoomsFromLocations,
	readOnly
}) {

	const columns = React.useMemo(() => {

		let keys = Object.keys(tableColumns);
		if (readOnly)
			keys = keys.filter(key => key !== 'action');

		const columns = keys.map(key => {
			const col = {...tableColumns[key]};
			col.key = key;
			if (key === 'name') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.name}
						onChange={(e) => updateRoom(entry.id, {name: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (key === 'description') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.description}
						onChange={(e) => updateRoom(entry.id, {description: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (key === 'action') {
				col.renderCell = (entry) =>
					<div style={{width: '100%', display: 'flex', justifyContent: 'space-evenly'}}>
						<ActionIcon type='prev' style={{transform: 'rotate(90deg)'}} onClick={() => moveRoomUp(entry.id)} />
						<ActionIcon type='next' style={{transform: 'rotate(90deg)'}} onClick={() => moveRoomDown(entry.id)} />
						<ActionIcon type='delete' onClick={() => removeRoom(entry.id)} />
					</div>
				col.label = 
					<div style={{width: '100%', display: 'flex', justifyContent: 'space-evenly'}}>
						<ActionIcon type='add' onClick={() => addRoom(defaultEntry)} />
						<ActionIcon type='import' onClick={getRoomsFromLocations} />
					</div>
			}
			return col;
		});

		return columns;
	}, [addRoom, removeRoom, updateRoom, readOnly]);

	return (
		<Row>
			<Field
				style={{flexWrap: 'wrap'}}
				label='Rooms:'
			>
				<Table columns={columns} values={rooms} />
			</Field>
		</Row>
	)
}

export default RoomDetails;
