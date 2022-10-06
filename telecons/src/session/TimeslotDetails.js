import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {
	selectSessionPrepTimeslots as selectTimeslots,
	addTimeslot,
	updateTimeslot,
	removeTimeslot
} from '../store/sessionPrep';

import {Input} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';

const tableColumns = {
	name: {
		label: 'Name',
		gridTemplate: 'minmax(200px, auto)'
	},
	startTime: {
		label: 'Start',
		gridTemplate: 'minmax(200px, auto)'
	},
	endTime: {
		label: 'End',
		gridTemplate: 'minmax(200px, auto)'
	},
	action: {
		label: '',
		gridTemplate: '40px'
	}
};

const defaultEntry = {name: '', startTime: '', endTime: ''};

function TimeslotDetails({readOnly}) {
	const dispatch = useDispatch();
	const timeslots = useSelector(selectTimeslots);

	const columns = React.useMemo(() => {
		
		let keys = Object.keys(tableColumns);
		if (readOnly)
			keys = keys.filter(key => key === 'actions');

		const add = (slot) => dispatch(addTimeslot(slot));
		const update = (id, changes) => dispatch(updateTimeslot({id, changes}));
		const remove = (id) => dispatch(removeTimeslot(id));

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
			else if (key === 'startTime') {
				col.renderCell = (entry) =>
					<Input
						type='time'
						value={entry.startTime}
						onChange={(e) => update(entry.id, {startTime: e.target.value})}
						readOnly={readOnly}
					/>;
			}
			else if (key === 'endTime') {
				col.renderCell = (entry) =>
					<Input
						type='time'
						value={entry.endTime}
						onChange={(e) => update(entry.id, {endTime: e.target.value})}
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
		<Table columns={columns} values={timeslots} />
	)
}

export default TimeslotDetails;
