import React from 'react';
import {useSelector} from 'react-redux';

import {Input, ActionIcon} from 'dot11-components';

import {EditTable as Table, TableColumn} from '../components/Table';
import {RawSessionSelector} from '../components/SessionSelector';

import {selectSessionEntities, Timeslot} from '../store/sessions';
import { EntityId } from 'dot11-components';

const tableColumns: TableColumn[] = [
	{key: 'name', label: 'Name', gridTemplate: 'minmax(200px, auto)'},
	{key: 'startTime', label: 'Start', gridTemplate: 'minmax(200px, auto)'},
	{key: 'endTime', label: 'End', gridTemplate: 'minmax(200px, auto)'},
	{key: 'action', label: '', gridTemplate: '60px'}
];

const defaultEntry: Omit<Timeslot, "id"> = {name: '', startTime: '', endTime: ''};

function TimeslotDetails({
	timeslots,
	setTimeslots,
	readOnly
}: {
	timeslots: Timeslot[];
	setTimeslots: (timeslots: Timeslot[]) => void;
	readOnly?: boolean;
}) {
	const entities = useSelector(selectSessionEntities);

	const columns = React.useMemo(() => {

		const importTimeslotsFromSession = (sessionId: EntityId) => {
			const session = entities[sessionId];
			if (session)
				setTimeslots(session.timeslots);
		}

		const addTimeslot = (slot: Omit<Timeslot, "id">) => {
			const updateTimeslots = timeslots.slice();
			const id = timeslots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0) + 1;
			updateTimeslots.push({...slot, id});
			setTimeslots(updateTimeslots);
		}

		const updateTimeslot = (id: number, changes: Partial<Timeslot>) => {
			const updateTimeslots = timeslots.slice();
			const i = timeslots.findIndex(slot => slot.id === id);
			if (i >= 0)
				updateTimeslots[i] = {...timeslots[i], ...changes};
			setTimeslots(updateTimeslots);
		}

		const removeTimeslot = (id: number) => {
			const updateTimeslots = timeslots.slice();
			const i = timeslots.findIndex(slot => slot.id === id);
			if (i >= 0)
				updateTimeslots.splice(i, 1);
			setTimeslots(updateTimeslots);
		}
		
		let columns = tableColumns.slice();
		if (readOnly)
			columns.filter(col => col.key !== 'action');
		columns = columns.map(col => {
			if (col.key === 'name') {
				col.renderCell = (entry) =>
					<Input
						type='search'
						value={entry.name}
						onChange={(e) => updateTimeslot(entry.id, {name: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (col.key === 'startTime') {
				col.renderCell = (entry) =>
					<Input
						type='time'
						value={entry.startTime}
						onChange={(e) => updateTimeslot(entry.id, {startTime: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (col.key === 'endTime') {
				col.renderCell = (entry) =>
					<Input
						type='time'
						value={entry.endTime}
						onChange={(e) => updateTimeslot(entry.id, {endTime: e.target.value})}
						disabled={readOnly}
					/>;
			}
			else if (col.key === 'action') {
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
		/>
	)
}

export default TimeslotDetails;
