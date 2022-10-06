import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Input, Button} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';

import {
	selectSessionPrepRooms as selectRooms,
	deriveRoomsFromBreakouts,
	addRoom,
	updateRoom,
	removeRoom
} from '../store/sessionPrep';

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
		gridTemplate: '40px'
	}
};

const defaultEntry = {name: '', description: ''};

function RoomDetails({readOnly}) {
	const dispatch = useDispatch();
	const rooms = useSelector(selectRooms);

	const columns = React.useMemo(() => {

		let keys = Object.keys(tableColumns);
		if (readOnly)
			keys = keys.filter(key => key === 'actions');

		const update = (id, changes) => dispatch(updateRoom({id, changes}));
		const add = (room) => dispatch(addRoom(room));
		const remove = (id) => dispatch(removeRoom(id));

		const columns = keys.map(key => {
			const col = {...tableColumns[key]};
			col.key = key;
			if (key === 'name') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.name}
						onChange={(e) => update(entry.id, {name: e.target.value})}
					/>;
			}
			else if (key === 'description') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.description}
						onChange={(e) => update(entry.id, {description: e.target.value})}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'action') {
				col.renderCell = (entry) => 
					<ActionIcon type='delete' onClick={() => remove(entry.id)} />
				col.label = 
					<ActionIcon type='add' onClick={() => add(defaultEntry)} />
			}
			return col;
		});

		return columns;
	}, [dispatch, readOnly]);

	return (
		<>
			<Button
				onClick={() => dispatch(deriveRoomsFromBreakouts())}
			>
				Derive rooms from breakout locations
			</Button>
			<Table columns={columns} values={rooms} />
		</>
	)
}

export default RoomDetails;
