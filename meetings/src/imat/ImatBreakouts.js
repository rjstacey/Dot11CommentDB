import React from 'react';
import {Link} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';

import {AppTable, SelectHeader, SelectCell, TableColumnHeader, SplitPanelButton, SplitPanel, Panel, TableColumnSelector} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';

import MeetingSummary from '../components/MeetingSummary';
import ImatBreakoutDetails from './ImatBreakoutDetails';
import PathGroupAndSessionSelector from '../components/PathGroupAndSessionSelector';
import TopRow from '../components/TopRow';

import {
	getField,
	dataSet,
	fields,
} from '../store/imatBreakouts';

import {selectCurrentImatMeeting} from '../store/imatMeetings';

import {refresh as refreshCurrent} from '../store/current';

const renderGroup = ({rowData}) => {
	if (rowData.groupShortName)
		return rowData.groupShortName;
	const parts = rowData.symbol.split('/');
	return parts[parts.length-1];
}

export const renderSessionInfo = (session) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{session.name}</span>
		<span>{displayDateRange(session.start, session.end)}</span>
		<span>{session.timezone}</span>
	</div>

function SessionInfo() {
	const imatMeeting = useSelector(selectCurrentImatMeeting);
	if (imatMeeting)
		return renderSessionInfo(imatMeeting);
	return null;
}

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
	{key: 'id', 
		...fields.id,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'dayDate', 
		...fields.dayDate,
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderDateHeader},
	{key: 'timeRange',
		...fields.timeRange,
		width: 120, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderTimeRangeHeader},
	{key: 'symbol', 
		...fields.symbol,
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderGroup},
	{key: 'name', 
		...fields.name,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'location', 
		...fields.location,
		width: 250, flexGrow: 1, flexShrink: 1},
	{key: 'credit', 
		label: 'Credit',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'meeting',
		label: 'Associated meeting',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData}) => rowData.meetingId && <MeetingSummary meetingId={rowData.meetingId} />},
	{key: 'attendance',
		label: 'Attendance',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData}) => <Link to={`${rowData.id}`}>view attendance</Link>},
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'symbol', 'name', 'location', 'credit'],
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
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({rowIndex, ids, entities}) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, 'dayDate'),
		timeRange: getField(b, 'timeRange')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, 'dayDate')) {
			b = {...b, dayDate: ''};
			if (b.timeRange === getField(b_prev, 'timeRange'))
				b = {...b, timeRange: ''};
		}
	}
	return b;
}

function Breakouts() {
	const dispatch = useDispatch();
	const refresh = () => dispatch(refreshCurrent());

	return (
		<>
			<TopRow>
				<PathGroupAndSessionSelector onChange={refresh} />

				<SessionInfo />

				<div style={{display: 'flex'}}>
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
					<SplitPanelButton dataSet={dataSet} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
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
				<Panel style={{overflow: 'auto'}}>
					<ImatBreakoutDetails />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Breakouts;
