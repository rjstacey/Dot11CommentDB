import React from 'react';
import {useHistory} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {SessionImportModal} from './SessionDialog';

import {loadImatMeetings, selectSyncedImatMeetingsEntities, selectImatMeetingsState, fields, dataSet} from '../store/imatMeetings';
import {loadSessions, selectSessionsState} from '../store/sessions';

function imatMeetingToSession(meeting) {
	// Luxon can't handle some of these shorter timezone names
	const map = {
		'EST5EDT': 'America/New_York',
		'CST6CDT': 'America/Chicago',
		'MST7MDT': 'America/Denver',
		'PST8PDT': 'America/Los_Angeles',
		'EST': 'America/New_York',
		'HST': 'Pacific/Honolulu',
		'CET': 'Europe/Vienna'
	};
	const timezone = map[meeting.timezone] || meeting.timezone;
	const startDate = DateTime.fromISO(meeting.start, {zone: timezone}).toISODate();
	const endDate = DateTime.fromISO(meeting.end, {zone: timezone}).toISODate();
	return {
		...meeting,
		timezone,
		startDate,
		endDate,
		imatMeetingId: meeting.id,
		name: meeting.name,
		OrganizerID: meeting.organizerId,
		type: meeting.type[0].toLowerCase()
	}
}

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	width: 100%;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'id',
		...fields.id,
		width: 120, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'start', 
		...fields.start,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'end', 
		...fields.end,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'name', 
		...fields.name,
		width: 400, flexGrow: 1, flexShrink: 1},
	{key: 'type', 
		...fields.type,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'timezone', 
		...fields.timezone,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Actions',
		label: 'Actions',
		width: 200, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);

function ImatMeetings() {
	const history = useHistory();
	const [defaultSession, setDefaultSession] = React.useState(null);
	const numberSessions = React.useRef(20);

	const dispatch = useDispatch();
	const {valid} = useSelector(selectImatMeetingsState);
	const imatMeetings = useSelector(selectSyncedImatMeetingsEntities);
	const {valid: sessionsValid} = useSelector(selectSessionsState);

	const columns = React.useMemo(() => {

		const renderActions = ({rowData}) => 
			(rowData.sessionId)
				? <span>Already Present</span>
				: <ActionButton name='import' title='Import' onClick={() => importSessionDialog(rowData)} />

		return tableColumns.map(col => col.key === 'Actions'? {...col, cellRenderer: renderActions}: col);

	}, []);

	React.useEffect(() => {
		if (!sessionsValid)
			dispatch(loadSessions());
		if (!valid)
			dispatch(loadImatMeetings(numberSessions.current));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const importSessionDialog = (meeting) => setDefaultSession(imatMeetingToSession(meeting));
	const closeSessionDialog = () => setDefaultSession(null);

	function getMore() {
		numberSessions.current += 10;
		dispatch(loadImatMeetings(numberSessions.current));
	}

	const close = () => history.push('/sessions');
	const refresh = () => dispatch(loadImatMeetings(numberSessions.current));

	return (
		<>
		<TopRow style={{maxWidth}}>
			<div>IMAT Session</div>
			<div>
				<ActionButton name='more' title='Load More' onClick={getMore} />
				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				<ActionButton name='close' title='Close' onClick={close} />
			</div>
		</TopRow>

		<TableRow style={{maxWidth}}>
			<AppTable
				fixed
				columns={columns}
				headerHeight={36}
				estimatedRowHeight={36}
				dataSet={dataSet}
				rowGetter={({rowId}) => imatMeetings[rowId]}
			/>
		</TableRow>

		<SessionImportModal
			isOpen={!!defaultSession}
			defaultSession={defaultSession}
			close={closeSessionDialog}
		/>
		</>
	)
}

export default ImatMeetings;
