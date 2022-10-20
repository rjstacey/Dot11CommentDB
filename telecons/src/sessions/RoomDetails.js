import React from 'react';
import {useSelector} from 'react-redux';

import {Input, Row, Field} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';
import {RawSessionSelector} from '../components/SessionSelector';

import {selectSessionEntities} from '../store/sessions';

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
	setRooms,
	readOnly
}) {
	const entities = useSelector(selectSessionEntities);

	const columns = React.useMemo(() => {

		const importRoomsFromSession = (sessionId) => {
			const session = entities[sessionId];
			if (session)
				setRooms(session.rooms);
		}

		const addRoom = (room) => {
			const updatedRooms = rooms.slice();
			const id = rooms.reduce((maxId, room) => Math.max(maxId, room.id), 0) + 1;
			updatedRooms.push({...room, id});
			setRooms(updatedRooms);
		}

		const updateRoom = (id, changes) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i >= 0) {
				updatedRooms[i] = {...rooms[i], ...changes};
				setRooms(updatedRooms);
			}
		}

		const removeRoom = (id) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i >= 0) {
				updatedRooms.splice(i, 1);
				setRooms(updatedRooms);
			}
		}

		const moveRoomUp = (id) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i > 0) {
				const [room] = updatedRooms.splice(i, 1);
				updatedRooms.splice(i - 1, 0, room);
				setRooms(updatedRooms);
			}
		}

		const moveRoomDown = (id) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i >= 0) {
				const [room] = updatedRooms.splice(i, 1);
				updatedRooms.splice(i + 1, 0, room);
				setRooms(updatedRooms);
			}
		}

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
						<RawSessionSelector onChange={importRoomsFromSession} />
					</div>
			}
			return col;
		});

		return columns;
	}, [setRooms, rooms, entities, readOnly]);

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
