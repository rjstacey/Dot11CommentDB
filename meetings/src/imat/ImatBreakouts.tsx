import React from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';

import {
	AppTable, SelectHeaderCell, SelectCell, TableColumnHeader, SplitPanelButton, SplitPanel, Panel, TableColumnSelector,
	ActionButton,
	displayDateRange,
	HeaderCellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	RowGetterProps
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {
	loadBreakouts,
	clearBreakouts,
	selectBreakoutMeetingId,
	selectBreakoutMeeting,
	getField,
	fields,
	imatBreakoutsSelectors,
	imatBreakoutsActions,
	Breakout
} from '../store/imatBreakouts';

import type { ImatMeeting } from '../store/imatMeetings';

import ImatBreakoutDetails from './ImatBreakoutDetails';
import MeetingSummary from '../components/MeetingSummary';
import ImatMeetingSelector from '../components/ImatMeetingSelector';
import TopRow from '../components/TopRow';


const renderGroup = ({rowData}: {rowData: Breakout}) => {
	if (rowData.groupShortName)
		return rowData.groupShortName;
	const parts = rowData.symbol.split('/');
	return parts[parts.length-1];
}

export const renderSessionInfo = (session: ImatMeeting) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{session.name}</span>
		<span>{displayDateRange(session.start, session.end)}</span>
		<span>{session.timezone}</span>
	</div>

function SessionInfo() {
	const imatMeeting = useAppSelector(selectBreakoutMeeting);
	return imatMeeting? renderSessionInfo(imatMeeting): null;
}

const renderDateHeader = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='weekDay' label='Day' />
		<TableColumnHeader {...props} dataKey='date' label='Date' />
	</>

const renderTimeRangeHeader = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='startTime' label='Start time' />
		<TableColumnHeader {...props} dataKey='endTime' label='End time' />
	</>

const AttendanceLink = ({breakoutId}: {breakoutId: number}) => {
	const location = useLocation();
	const path = location.pathname.replace('imatBreakouts', 'imatAttendance') + `/${breakoutId}`;
	return <Link to={path}>view attendance</Link>
}

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p => 
			<SelectCell 
				selectors={imatBreakoutsSelectors}
				actions={imatBreakoutsActions} 
				{...p}
			/>},
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
		cellRenderer: ({rowData}) => <AttendanceLink breakoutId={rowData.id} />},
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'symbol', 'name', 'location', 'credit'],
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}


/*
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({rowIndex, ids, entities}: RowGetterProps) {
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
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();

	let pathImatMeetingId: number | null = Number(params.meetingNumber);
	if (isNaN(pathImatMeetingId))
		pathImatMeetingId = null;

	const imatMeetingId = useAppSelector(selectBreakoutMeetingId);

	React.useEffect(() => {
		if (pathImatMeetingId && pathImatMeetingId !== imatMeetingId) {
			/* If the user navigates here and the current meeting number does not match,
			 * then reload the breakouts */
			dispatch(loadBreakouts(pathImatMeetingId));
		}
		else if (!pathImatMeetingId && imatMeetingId) {
			/* If the user navigates to the breakouts root, but there is a meeting number selected,
			 * then navigate to the current meeting number */
			let path = location.pathname + `/${imatMeetingId}`;
			navigate(path);
		}
	}, [pathImatMeetingId, imatMeetingId, location.pathname, dispatch, navigate]);

	const setImatMeetingId = (imatMeetingId: number | null) => {
		/* If the user clears the selected meeting number, then clear the breakouts */
		if (!imatMeetingId)
			dispatch(clearBreakouts());
		/* Navigate to the selected meeting number */
		let path = location.pathname.replace(`/${pathImatMeetingId}`, '');
		if (imatMeetingId)
			path += `/${imatMeetingId}`;
		navigate(path);
	}

	const refresh = () => dispatch(pathImatMeetingId? loadBreakouts(pathImatMeetingId): clearBreakouts());

	return (
		<>
			<TopRow>
				<ImatMeetingSelector
					value={imatMeetingId}
					onChange={setImatMeetingId}
				/>
				<SessionInfo />

				<div style={{display: 'flex'}}>
					<TableColumnSelector
						selectors={imatBreakoutsSelectors}
						actions={imatBreakoutsActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={imatBreakoutsSelectors}
						actions={imatBreakoutsActions}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<SplitPanel
				selectors={imatBreakoutsSelectors}
				actions={imatBreakoutsActions}
			>
				<Panel>
					<AppTable
						fixed
						columns={tableColumns}
						headerHeight={46}
						estimatedRowHeight={56}
						rowGetter={breakoutsRowGetter}
						defaultTablesConfig={defaultTablesConfig}
						selectors={imatBreakoutsSelectors}
						actions={imatBreakoutsActions}
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
