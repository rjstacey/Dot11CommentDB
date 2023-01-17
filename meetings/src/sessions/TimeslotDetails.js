import React from 'react';
import {useSelector} from 'react-redux';

import {Input} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {EditTable as Table} from '../components/Table';
import {RawSessionSelector} from '../components/SessionSelector';

import {selectSessionEntities} from '../store/sessions';

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
		gridTemplate: '60px'
	}
};

const defaultEntry = {name: '', startTime: '', endTime: ''};

function TimeslotDetails({timeslots, setTimeslots, readOnly}) {
	const entities = useSelector(selectSessionEntities);

	const columns = React.useMemo(() => {

		const importTimeslotsFromSession = (sessionId) => {
			const session = entities[sessionId];
			if (session)
				setTimeslots(session.timeslots);
		}

		const addTimeslot = (slot) => {
			const updateTimeslots = timeslots.slice();
			const id = timeslots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0) + 1;
			updateTimeslots.push({...slot, id});
			setTimeslots(updateTimeslots);
		}

		const updateTimeslot = (id, changes) => {
			const updateTimeslots = timeslots.slice();
			const i = timeslots.findIndex(slot => slot.id === id);
			if (i >= 0)
				updateTimeslots[i] = {...timeslots[i], ...changes};
			setTimeslots(updateTimeslots);
		}

		const removeTimeslot = (id) => {
			const updateTimeslots = timeslots.slice();
			const i = timeslots.findIndex(slot => slot.id === id);
			if (i >= 0)
				updateTimeslots.splice(i, 1);
			setTimeslots(updateTimeslots);
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
					<div style={{width: '100%', display: 'flex', justifyContent: 'space-evenly', fontWeight: 'normal'}}>
						<ActionIcon type='add' onClick={() => addTimeslot(defaultEntry)} />
						<RawSessionSelector onChange={importTimeslotsFromSession} />
					</div>
			}
			return col;
		});

		return columns;
	}, [setTimeslots, timeslots, entities, readOnly]);

	return (
		<Table
			columns={columns}
			values={timeslots} 
			readOnly={readOnly}
		/>
	)
}

export default TimeslotDetails;
