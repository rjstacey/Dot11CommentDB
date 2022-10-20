import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Link} from 'react-router-dom';
import {DateTime} from 'luxon';

import {ActionButton, ButtonGroup} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, ShowFilters, TableColumnSelector, TableViewSelector, TableColumnHeader} from 'dot11-components/table';

import {
	fields,
	loadTelecons,
	clearTelecons,
	selectTeleconsCurrentPanelConfig,
	setTeleconsCurrentPanelIsSplit,
	dataSet,
	getField
} from '../store/telecons';

import {selectCurrentGroupId, selectCurrentSessionId} from '../store/current';

import {displayMeetingNumber} from '../store/webexMeetings';

import {selectSessionEntities} from '../store/sessions';

import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';

import MeetingsCalendar from './MeetingsCalendar';
import MeetingDetails from './MeetingDetails';
import MeetingDefaults from './MeetingDefaults';
import MeetingsEmail from './MeetingsEmail';

function renderWebexMeeting({rowData}) {
	const {webexAccountId, webexAccountName, webexMeeting} = rowData;
	if (!webexAccountId || !webexMeeting)
		return 'None';
	return webexAccountName + ': ' + displayMeetingNumber(webexMeeting.meetingNumber);
}

function renderImatMeeting({rowData}) {
	return rowData.imatMeetingId?
		<Link to={`/imatMeetings/${rowData.imatMeetingId}`}>{rowData.imatMeetingName}</Link>:
		'None';
}

const ColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderDateHeader = (props) =>
	<>
		<ColumnHeader {...props} dataKey='day' label='Day' />
		<ColumnHeader {...props} dataKey='date' label='Date' />
	</>

const renderTimeRangeHeader = (props) =>
	<>
		<ColumnHeader {...props} dataKey='startTime' label='Start time' />
		<ColumnHeader {...props} dataKey='endTime' label='End time' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'day',
		...fields.day,
		width: 60, flexGrow: 1, flexShrink: 1},
	{key: 'dayDate',
		...fields.dayDate,
		width: 100, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderDateHeader},
	{key: 'timeRange',
		...fields.timeRange,
		width: 70, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderTimeRangeHeader},
	{key: 'duration',
		...fields.duration,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'groupName',
		...fields.groupName,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'summary',
		...fields.summary,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'location',
		...fields.location,
		width: 200, flexGrow: 1, flexShrink: 0},
	{key: 'hasMotions',
		...fields.hasMotions,
		width: 90, flexGrow: 1, flexShrink: 1},
	{key: 'webexAccountName',
		label: 'Webex meeting',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderWebexMeeting},
	{key: 'imatMeetingName',
		label: 'Session',
		width: 50, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderImatMeeting},
	{key: 'calendarAccountName',
		label: 'Calendar',
		width: 50, flexGrow: 1, flexShrink: 1}
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'groupName', 'summary', 'hasMotions', 'webexAccountName', 'imatMeetingName'],
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
 * Don't display date and time if it is the same as previous line
 */
function teleconsRowGetter({rowIndex, ids, entities}) {
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

function Meetings(props) {
	const dispatch = useDispatch();
	const {isSplit} = useSelector(selectTeleconsCurrentPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setTeleconsCurrentPanelIsSplit(value)), [dispatch]);
	const groupId = useSelector(selectCurrentGroupId);
	const sessionId = useSelector(selectCurrentSessionId);
	const sessionEntities = useSelector(selectSessionEntities);
	const [calView, setCalView] = React.useState(false);

	const load = React.useCallback((groupId, sessionId) => {
		const fromDate = DateTime.now().toISO();
		const constraints = {fromDate};
		if (sessionId) {
			const session = sessionEntities[sessionId];
			if (session) {
				constraints.fromDate = session.startDate;
				constraints.toDate = session.endDate;
			}
		}
		dispatch(loadTelecons(groupId, constraints));
	}, [dispatch, sessionEntities]);

	React.useEffect(() => {
		if (groupId) 
			load(groupId, sessionId)
	}, [groupId, sessionId]);  // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => load(groupId, sessionId);
	const clear = () => dispatch(clearTelecons());

	return (
		<>
			<TopRow>
				<GroupPathSelector
					onChange={clear}
				/>

				<CurrentSessionSelector/>

				<ActionButtonDropdown label='Set defaults'>
					<MeetingDefaults/>
				</ActionButtonDropdown>

				<ActionButtonDropdown
					label='Send email'
					dropdownRenderer={({methods}) => <MeetingsEmail close={methods.close} />}
				/>
			
				<div style={{display: 'flex', alignItems: 'center'}}>
					<ButtonGroup>
						<div style={{textAlign: 'center'}}>Table view</div>
						<div style={{display: 'flex', alignItems: 'center'}}>
							<TableViewSelector dataSet={dataSet} />
							<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
							<ActionButton
								name='book-open'
								title='Show detail'
								isActive={isSplit}
								onClick={() => setIsSplit(!isSplit)} 
							/>
						</div>
					</ButtonGroup>
					<ActionButton name='calendar' isActive={calView} onClick={() => setCalView(!calView)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					{calView?
						<MeetingsCalendar />:
						<>
							<ShowFilters
								dataSet={dataSet}
								fields={fields}
							/>
							<AppTable
								defaultTablesConfig={defaultTablesConfig}
								columns={tableColumns}
								headerHeight={46}
								estimatedRowHeight={32}
								measureRowHeight
								dataSet={dataSet}
								rowGetter={teleconsRowGetter}
							/>
						</>}
				</Panel>
				<Panel>
					<MeetingDetails />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Meetings;
