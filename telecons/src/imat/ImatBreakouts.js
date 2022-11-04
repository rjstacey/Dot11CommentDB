import React from 'react';
import {Link} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';

import AppTable, {SelectHeader, SelectCell, TableColumnHeader, SplitPanel, Panel, TableColumnSelector} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';

import MeetingSummary from '../components/MeetingSummary';
import ImatBreakoutDetails from './ImatBreakoutDetails';
import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';

import {selectCurrentSession} from '../store/sessions';

import {
	loadBreakouts,
	clearBreakouts,
	selectBreakoutsState,
	selectImatMeeting,
	getField,
	dataSet,
	fields,
	selectBreakoutsCurrentPanelConfig,
	setBreakoutsCurrentPanelIsSplit
} from '../store/imatBreakouts';

const renderGroup = ({rowData}) => {
	if (rowData.groupShortName)
		return rowData.groupShortName;
	const parts = rowData.group.split('/');
	return parts[parts.length-1];
}

export const renderSessionInfo = (session) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{session.name}</span>
		<span>{displayDateRange(session.start, session.end)}</span>
		<span>{session.timezone}</span>
	</div>

const BreakoutsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderDateHeader = (props) =>
	<>
		<BreakoutsColumnHeader {...props} dataKey='weekDay' label='Day' />
		<BreakoutsColumnHeader {...props} dataKey='date' label='Date' />
	</>

const renderTimeRangeHeader = (props) =>
	<>
		<BreakoutsColumnHeader {...props} dataKey='startTime' label='Start time' />
		<BreakoutsColumnHeader {...props} dataKey='endTime' label='End time' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'dayDate', 
		label: 'Date',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderDateHeader},
	{key: 'timeRange',
		label: 'Time',
		width: 120, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderTimeRangeHeader},
	{key: 'group', 
		label: 'Group',
		...fields.group,
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderGroup},
	{key: 'name', 
		label: 'Name',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'location', 
		label: 'Location',
		width: 250, flexGrow: 1, flexShrink: 1},
	{key: 'credit', 
		label: 'Credit',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'meeting',
		label: 'Associated meeting',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData}) => <MeetingSummary meetingId={rowData.meetingId} />},
	{key: 'attendance',
		label: 'Attendance',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData}) => <Link to={`${rowData.id}`}>view attendance</Link>},
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'group', 'name', 'location', 'credit'],
};

const defaultTablesConfig = {};

for (const tableView of Object.keys(defaultTablesColumns)) {
	const tableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}

/*

function slotDateTime(date, slot) {
	return [
		date.set({hour: slot.startTime.substring(0,2), minute: slot.startTime.substring(3,5)}),
		date.set({hour: slot.endTime.substring(0,2), minute: slot.endTime.substring(3,5)})
	];
}

function teleconToBreakout(telecon, session, groups, committees, timeslots) {
	const sessionStart = DateTime.fromISO(session.start, {zone: session.timezone});
	const start = DateTime.fromISO(telecon.start, {zone: session.timezone});
	const end = DateTime.fromISO(telecon.end, {zone: session.timezone});
	console.log(session.start, telecon.start)

	const day = Math.floor(start.diff(sessionStart, 'days').get('day'));
	let startTime = start.toFormat('HH:mm');
	let endTime = end.toFormat('HH:mm');

	// If breakout straddles a day, then end at midnight
	if (end.toISODate() !== start.toISODate())
		endTime = '23:59';

	const breakoutDate = sessionStart.plus({days: day});
	let startSlot, endSlot;

	// Go through slots looking for exact match
	for (const slot of timeslots) {
		const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
		if (start === slotStart && end <= slotEnd) {
			startSlot = slot;
			endSlot = slot;
		}
	}

	if (!startSlot) {
		// Go through slots again, this time looking for approx match
		for (const slot of timeslots) {
			const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
			if (!startSlot && start >= slotStart && start < slotEnd)
				startSlot = slot;
			if (end > slotStart && end <= slotEnd)
				endSlot = slot;
		}
	}

	// If we still don't have a start slot, choose the first (or last) and override time
	if (!startSlot)
		startSlot = timeslots[0];
	if(!endSlot)
		endSlot = timeslots[timeslots.length-1];

	// If the startTime/endTime aligns with slot start/end then clear time
	if (startSlot && slotDateTime(breakoutDate, startSlot)[0].toFormat("HH:mm") === startTime)
		startTime = '';
	if (endSlot && slotDateTime(breakoutDate, endSlot)[1].toFormat("HH:mm") === endTime)
		endTime = '';

	let name = telecon.groupName;
	if (telecon.isCancelled)
		name = 'CANCELLED - ' + name;

	let location = getTeleconField(telecon, 'location');
	if (telecon.isCancelled)
		location = 'CANCELLED';

	const group = groups[telecon.organizationId];
	const committee = committees.find(c => c.symbol === group.imatCommitteeId);
	const groupId = committee? committee.id: 0;

	return {
		teleconId: telecon.id,
		name,
		location,
		groupId,
		day,
		startSlotId: startSlot? startSlot.id: 0,
		endSlotId: endSlot? endSlot.id: 0,
		startTime,
		endTime,
		credit: "Zero",
		creditOverideNumerator: 0,
		creditOverideDenominator: 0,
		facilitator: window.user? window.user.Email: ''
	}
}
*/

/*
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({rowIndex, ids, entities}) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, 'dayDate'),
		time: getField(b, 'time')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, 'dayDate')) {
			b = {...b, dayDate: ''};
			if (b.time === getField(b_prev, 'time'))
				b = {...b, time: ''};
		}
	}
	return b;
}

function Breakouts() {
	const dispatch = useDispatch();
	const session = useSelector(selectCurrentSession);
	const {valid, imatMeetingId} = useSelector(selectBreakoutsState);

	const imatMeeting = useSelector(selectImatMeeting);

	React.useEffect(() => {
		if (session && session.imatMeetingId !== imatMeetingId) {
			if (session.imatMeetingId)
				dispatch(loadBreakouts(session.imatMeetingId));
			else
				dispatch(clearBreakouts());
		}
	}, [dispatch, valid, session, imatMeetingId]);

	const refresh = () => dispatch(loadBreakouts(imatMeetingId));

	const {isSplit} = useSelector(selectBreakoutsCurrentPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setBreakoutsCurrentPanelIsSplit(value)), [dispatch]);

	return (
		<>
			<TopRow>
				<GroupPathSelector
					//onChange={clear}
				/>

				<CurrentSessionSelector/>

				<div>{imatMeeting && renderSessionInfo(imatMeeting)}</div>
				{/*<div>
					<Button onClick={syncTelecons}>Sync</Button>
				</div>*/}
				<div style={{display: 'flex'}}>
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
					<ActionButton
						name='book-open'
						title='Show detail'
						isActive={isSplit}
						onClick={() => setIsSplit(!isSplit)} 
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={!imatMeetingId} />
				</div>
			</TopRow>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						fixed
						columns={tableColumns}
						headerHeight={46}
						estimatedRowHeight={56}
						dataSet={dataSet}
						rowGetter={breakoutsRowGetter}
						defaultTablesConfig={defaultTablesConfig}
					/>
				</Panel>
				<Panel>
					<ImatBreakoutDetails />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Breakouts;
