import React from 'react';

import {Input, Row, Field} from 'dot11-components/form';
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

function TimeslotDetails({timeslots, addTimeslot, removeTimeslot, updateTimeslot, readOnly}) {

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
						onChange={(e) => updateTimeslot(entry.id, {name: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (key === 'startTime') {
				col.renderCell = (entry) =>
					<Input
						type='time'
						value={entry.startTime}
						onChange={(e) => updateTimeslot(entry.id, {startTime: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (key === 'endTime') {
				col.renderCell = (entry) =>
					<Input
						type='time'
						value={entry.endTime}
						onChange={(e) => updateTimeslot(entry.id, {endTime: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (key === 'action') {
				col.renderCell = (entry) => 
					<ActionIcon type='delete' onClick={() => removeTimeslot(entry.id)} />
				col.label = 
					<ActionIcon type='add' onClick={() => addTimeslot(defaultEntry)} />
			}
			return col;
		});

		return columns;
	}, [addTimeslot, removeTimeslot, updateTimeslot, readOnly]);

	return (
		<Row>
			<Field
				style={{flexWrap: 'wrap'}}
				label='Timeslots:'
			>
				<Table
					columns={columns}
					values={timeslots} 
					readOnly={readOnly}
				/>
			</Field>
		</Row>
	)
}

export default TimeslotDetails;
