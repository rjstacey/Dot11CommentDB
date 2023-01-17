import React from 'react';
import {useDispatch} from 'react-redux';
import {Link} from 'react-router-dom';

import {ActionButton, Select} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import {AppTable, SplitPanel, Panel, TableColumnSelector, SplitPanelButton, SelectHeader, SelectCell, ShowFilters, TableColumnHeader} from 'dot11-components/table';

import {
	fields,
	dataSet,
	getField
} from '../store/meetings';

import {refresh as refreshCurrent} from '../store/current';

import {displayMeetingNumber} from '../store/webexMeetings';

import PathGroupandSessionSelector from '../components/PathGroupAndSessionSelector';
import TopRow from '../components/TopRow';

import MeetingsCalendar from './MeetingsCalendar';
import MeetingDetails from './MeetingDetails';
import MeetingDefaults from './MeetingDefaults';
import MeetingsEmail from './MeetingsEmail';

const DisplayFormat = {
	0: 'Table',
	1: '1-Day Calendar',
	3: '3-Day Calendar',
	5: '5-Day Calendar'
}

const displayFormatOptions = Object.entries(DisplayFormat).map(([key, label]) => ({value: parseInt(key), label}));

function SelectDisplayFormat({value, onChange}) {
	const values = displayFormatOptions.filter(o => o.value === value);

	function handleChange(values) {
		onChange(values.length > 0? values[0].value: 0);
	}

	return (
		<Select
			values={values}
			options={displayFormatOptions}
			onChange={handleChange}
		/>
	)
}

function renderWebexMeeting({rowData}) {
	const {webexAccountId, webexAccountName, webexMeeting} = rowData;
	if (!webexAccountId)
		return 'None';
	return webexAccountName + (webexMeeting? ': ' + displayMeetingNumber(webexMeeting.meetingNumber): '');
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
	{key: 'id',
		...fields.id,
		width: 60, flexGrow: 1, flexShrink: 1},
	{key: 'day',
		...fields.day,
		width: 60, flexGrow: 1, flexShrink: 1},
	{key: 'date',
		...fields.date,
		width: 100, flexGrow: 1, flexShrink: 1},
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
		label: 'IMAT meeting',
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
function rowGetter({rowIndex, ids, entities}) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		day: getField(b, 'day'),
		date: getField(b, 'date'),
		dayDate: getField(b, 'dayDate'),
		timeRange: getField(b, 'timeRange'),
		location: getField(b, 'location')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.day === getField(b_prev, 'day')) {
			b.day = '';
			if (b.date === getField(b_prev, 'date')) {
				b.date = '';
				b.dayDate = '';
				if (b.timeRange === getField(b_prev, 'timeRange'))
					b.timeRange = '';
			}
		}
	}
	return b;
}

function Meetings(props) {
	const dispatch = useDispatch();
	const [showDays, setShowDays] = React.useState(0);

	const refresh = () => dispatch(refreshCurrent());

	return (
		<>
			<TopRow>
				<PathGroupandSessionSelector allowShowDateRange />

				<ActionButtonDropdown label='Set defaults'>
					<MeetingDefaults/>
				</ActionButtonDropdown>

				<ActionButtonDropdown
					label='Send email'
					dropdownRenderer={({methods}) => <MeetingsEmail close={methods.close} />}
				/>
			
				<div style={{display: 'flex', alignItems: 'center'}}>
					<SelectDisplayFormat
						value={showDays}
						onChange={setShowDays}
					/>
					{showDays === 0 && <TableColumnSelector dataSet={dataSet} columns={tableColumns} />}
					<SplitPanelButton dataSet={dataSet} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<SplitPanel dataSet={dataSet}>
				{showDays > 0?
					<Panel style={{overflow: 'auto'}}>
						<MeetingsCalendar nDays={showDays} />
					</Panel>:
					<Panel style={{display: 'flex', flexDirection: 'column', margin: '10px 0 10px 10px'}} >
						<ShowFilters
							dataSet={dataSet}
							fields={fields}
						/>
						<div style={{display: 'flex', flex: 1}}>
							<AppTable
								defaultTablesConfig={defaultTablesConfig}
								columns={tableColumns}
								headerHeight={46}
								estimatedRowHeight={32}
								measureRowHeight
								dataSet={dataSet}
								rowGetter={rowGetter}
							/>
						</div>
					</Panel>}
				<Panel style={{overflow: 'auto'}}>
					<MeetingDetails />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Meetings;
