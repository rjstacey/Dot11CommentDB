import React from 'react';

import { Input, ActionIcon } from 'dot11-components';

import { useAppSelector } from '../store/hooks';

import {EditTable as Table, TableColumn} from '../components/Table';
import {RawSessionSelector} from '../components/SessionSelector';

import {
	selectSessionEntities,
	Room
} from '../store/sessions';

const tableColumns: TableColumn[] = [
	{key: 'name', label: 'Name', gridTemplate: 'minmax(200px, auto)'},
	{key: 'description', label: 'Description', gridTemplate: 'minmax(200px, auto)'},
	{key: 'action', label: '', gridTemplate: '80px'}
];

const defaultEntry = {name: '', description: ''};

function RoomDetails({
	rooms,
	setRooms,
	readOnly
}: {
	rooms: Room[];
	setRooms: (rooms: Room[]) => void;
	readOnly?: boolean;
}) {
	const entities = useAppSelector(selectSessionEntities);

	const columns = React.useMemo(() => {

		const importRoomsFromSession = (sessionId: number) => {
			const session = entities[sessionId];
			if (session)
				setRooms(session.rooms);
		}

		const addRoom = (room: Omit<Room, "id">) => {
			const updatedRooms = rooms.slice();
			const id = rooms.reduce((maxId, room) => Math.max(maxId, room.id), 0) + 1;
			updatedRooms.push({...room, id});
			setRooms(updatedRooms);
		}

		const updateRoom = (id: number, changes: Partial<Room>) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i >= 0) {
				updatedRooms[i] = {...rooms[i], ...changes};
				setRooms(updatedRooms);
			}
		}

		const removeRoom = (id: number) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i >= 0) {
				updatedRooms.splice(i, 1);
				setRooms(updatedRooms);
			}
		}

		const moveRoomUp = (id: number) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i > 0) {
				const [room] = updatedRooms.splice(i, 1);
				updatedRooms.splice(i - 1, 0, room);
				setRooms(updatedRooms);
			}
		}

		const moveRoomDown = (id: number) => {
			const updatedRooms = rooms.slice();
			const i = rooms.findIndex(room => room.id === id);
			if (i >= 0) {
				const [room] = updatedRooms.splice(i, 1);
				updatedRooms.splice(i + 1, 0, room);
				setRooms(updatedRooms);
			}
		}

		let columns = tableColumns;
		if (readOnly)
			columns = columns.filter(col => col.key !== 'action');
		columns = columns.map(col => {
			col = {...col};
			if (col.key === 'name') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.name}
						onChange={(e) => updateRoom(entry.id, {name: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (col.key === 'description') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.description}
						onChange={(e) => updateRoom(entry.id, {description: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (col.key === 'action') {
				col.renderCell = (entry) =>
					<div style={{width: '100%', display: 'flex', justifyContent: 'space-evenly'}}>
						<ActionIcon type='prev' style={{transform: 'rotate(90deg)'}} onClick={() => moveRoomUp(entry.id)} />
						<ActionIcon type='next' style={{transform: 'rotate(90deg)'}} onClick={() => moveRoomDown(entry.id)} />
						<ActionIcon type='delete' onClick={() => removeRoom(entry.id)} />
					</div>
				col.label = 
					<div style={{width: '100%', display: 'flex', justifyContent: 'space-evenly', fontWeight: 'normal'}}>
						<ActionIcon type='add' onClick={() => addRoom(defaultEntry)} />
						<RawSessionSelector onChange={importRoomsFromSession} />
					</div>
			}
			return col;
		});

		return columns;
	}, [setRooms, rooms, entities, readOnly]);

	return (
		<Table columns={columns} values={rooms} />
	)
}

export default RoomDetails;
