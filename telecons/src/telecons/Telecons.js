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

import {selectCurrentGroupId, selectCurrentMeetingId} from '../store/current';

import {displayMeetingNumber} from '../store/webexMeetings';

import {selectImatMeetingEntities} from '../store/imatMeetings';

import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';

import TeleconDetail from './TeleconDetail';
import TeleconDefaults from './TeleconDefaults';
import TeleconEmail from './TeleconsEmail';

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
		width: 60, flexGrow: 1, flexShrink: 0},
	{key: 'dayDate',
		...fields.dayDate,
		width: 100, flexGrow: 1, flexShrink: 0,
		headerRenderer: renderDateHeader},
	{key: 'timeRange',
		...fields.timeRange,
		width: 70, flexGrow: 1, flexShrink: 0,
		headerRenderer: renderTimeRangeHeader},
	{key: 'duration',
		...fields.duration,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'groupName',
		...fields.groupName,
		width: 200, flexGrow: 1, flexShrink: 0},
	{key: 'hasMotions',
		...fields.hasMotions,
		width: 90, flexGrow: 1, flexShrink: 0},
	{key: 'webexAccountName',
		label: 'Webex meeting',
		width: 150, flexGrow: 1, flexShrink: 0,
		cellRenderer: renderWebexMeeting},
	{key: 'imatMeetingName',
		label: 'Session',
		width: 50, flexGrow: 1, flexShrink: 0,
		cellRenderer: renderImatMeeting},
	{key: 'calendarAccountName',
		label: 'Calendar',
		width: 50, flexGrow: 1, flexShrink: 0}
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'groupName', 'hasMotions', 'webexAccountName', 'imatMeetingName'],
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

function Telecons(props) {
	const dispatch = useDispatch();
	const {isSplit} = useSelector(selectTeleconsCurrentPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setTeleconsCurrentPanelIsSplit(value)), [dispatch]);
	const groupId = useSelector(selectCurrentGroupId);
	const meetingId = useSelector(selectCurrentMeetingId);
	const imatMeetingEntities = useSelector(selectImatMeetingEntities);

	const load = React.useCallback((groupId, meetingId) => {
		const fromDate = DateTime.now().toISO();
		const constraints = {fromDate};
		if (meetingId) {
			const session = imatMeetingEntities[meetingId];
			if (session) {
				constraints.fromDate = session.start;
				constraints.toDate = session.end;
			}
		}
		dispatch(loadTelecons(groupId, constraints));
	}, [dispatch, imatMeetingEntities]);

	React.useEffect(() => {
		if (groupId) 
			load(groupId, meetingId)
	}, [groupId, meetingId]);  // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => load(groupId, meetingId);
	const clear = () => dispatch(clearTelecons());

	return (
		<>
			<TopRow>
				<GroupPathSelector
					onChange={clear}
				/>

				<CurrentSessionSelector/>

				<ActionButtonDropdown label='Set defaults'>
					<TeleconDefaults/>
				</ActionButtonDropdown>

				<ActionButtonDropdown
					label='Send email'
					dropdownRenderer={({methods}) => <TeleconEmail close={methods.close} />}
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
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<ShowFilters
				dataSet={dataSet}
				fields={fields}
			/>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={46}
						estimatedRowHeight={32}
						measureRowHeight
						dataSet={dataSet}
						rowGetter={teleconsRowGetter}
					/>
				</Panel>
				<Panel>
					<TeleconDetail
						groupId={groupId}
					/>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Telecons;
