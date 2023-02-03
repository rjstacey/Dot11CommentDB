import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DateTime} from 'luxon';
import copyToClipboard from 'copy-html-to-clipboard';

import AppTable, {SelectHeader, SelectCell, TableColumnHeader, TableColumnSelector, SplitPanelButton, SplitPanel, Panel} from 'dot11-components/table';
import {ActionButton, Form} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {selectCurrentGroupId, refresh as refreshCurrent} from '../store/current';
import {selectGroupEntities} from '../store/groups';
import {displayMeetingNumber} from '../store/webexMeetings';

import {
	updateMeetings,
	addMeetings,
} from '../store/meetings';

import {
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	fields,
	getField,
	dataSet,
	loadWebexMeetings
} from '../store/webexMeetings';

import {
	selectCurrentSessionId,
	selectShowDateRange
} from '../store/current';

import {selectSessionEntities} from '../store/sessions';

import PathGroupAndSessionSelector from '../components/PathGroupAndSessionSelector';
import MeetingSelector from '../components/MeetingSelector';
import MeetingSummary from '../components/MeetingSummary';
import TopRow from '../components/TopRow';

import WebexMeetingDetail from './WebexMeetingDetail';
import {convertEntryToMeeting} from '../meetings/MeetingDetails';
import MeetingEntry from '../meetings/MeetingEntry';


function displayDateTime(entity) {
	const start = DateTime.fromISO(entity.start, {zone: entity.timezone});
	const end = DateTime.fromISO(entity.end, {zone: entity.timezone});
	return start.toFormat('EEE, d LLL yyyy HH:mm') + '-' + end.toFormat('HH:mm');
}

function setClipboard(selected, entities) {

	const td = d => `<td>${d}</td>`
	const th = d => `<th>${d}</th>`
	const header = `
		<tr>
			${th('When')}
			${th('Title')}
			${th('Meeting')}
			${th('Host key')}
		</tr>`
	const row = m => `
		<tr>
			${td(displayDateTime(m))}
			${td(m.title)}
			${td(`${m.webexAccountName}: <a href="${m.webLink}">${displayMeetingNumber(m.meetingNumber)}</a>`)}
			${td(m.hostKey)}
		</tr>`
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid gray;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map(id => row(entities[id])).join('')}
		</table>`

	copyToClipboard(table, {asHtml: true});
}

function MeetingLink({webexMeeting, close}) {
	const dispatch = useDispatch();
	const [id, setId] = React.useState();

	function submit() {
		dispatch(updateMeetings([{id, changes: {webexAccountId: webexMeeting.accountId, webexMeetingId: webexMeeting.id}}]));
	}

	return (
		<Form
			submit={submit}
			cancel={close}
		>
			<MeetingSelector
				value={id}
				onChange={setId}
			/>
		</Form>
	)
}

const toTimeStr = (hour, min) => ('' + hour).padStart(2, '0') + ':' + ('' + min).padStart(2, '0');

function MeetingAdd({webexMeeting, close, groupId}) {
	const dispatch = useDispatch();
	const groupEntities = useSelector(selectGroupEntities);
	const [entry, setEntry] = React.useState(initState);

	function initState() {
		const start = DateTime.fromISO(webexMeeting.start, {zone: webexMeeting.timezone});
		const end = DateTime.fromISO(webexMeeting.end, {zone: webexMeeting.timezone});
		const dates = [start.toISODate()];
		const time = toTimeStr(start.hour, start.minute);
		const duration = end.diff(start, 'hours').hours;

		let subgroupId = null;
		const parentGroup = groupEntities[groupId];
		if (parentGroup) {
			const m = webexMeeting.title.match(`${parentGroup.name} (.*)`);
			if (m) {
				for (const id in groupEntities) {
					const group = groupEntities[id];
					if (group.name === m[1])
						subgroupId = group.id;
				}
			}
		}

		return {
			webexMeeting,
			start: start.toISO(),
			end: end.toISO(),
			summary: webexMeeting.title,
			timezone: webexMeeting.timezone,
			dates,
			time,
			duration,
			group_id: subgroupId,
			webexAccountId: webexMeeting.webexAccountId,
			webexMeetingId: webexMeeting.id,
		}
	}

	function add() {
		const meeting = convertEntryToMeeting(entry);
		dispatch(addMeetings([meeting]));
		close();
	}

	return (
		<MeetingEntry
			entry={entry}
			changeEntry={changes => setEntry(state => ({...state, ...changes}))}
			action='add'
			actionAdd={add}
			actionCancel={close}
		/>
	)
}

const WebexMeetingsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props} />;

function WebexMeetingHeading(props) {
	return (
		<>
			<WebexMeetingsColumnHeader {...props} label='Webex account' dataKey='accountName' />
			<WebexMeetingsColumnHeader {...props} label='Meeting number' dataKey='meetingNumber' />
		</>
	)
}

function renderWebexMeeting({rowData}) {
	const {accountName, meetingNumber} = rowData;
	return `${accountName}: ${displayMeetingNumber(meetingNumber)}`;
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'dayDate',
		...fields.dayDate,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'timeRange',
		...fields.timeRange,
		width: 70, flexGrow: 1, flexShrink: 1},
	{key: 'webexMeeting',
		label: 'Meeting',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: p => <WebexMeetingHeading {...p}/>,
		cellRenderer: renderWebexMeeting},
	{key: 'accountName', 
		...fields.accountName,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'meetingNumber', 
		...fields.meetingNumber,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'hostKey',
		...fields.hostKey,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'title', 
		...fields.title,
		width: 200, flexGrow: 1, flexShrink: 1, dropdownWidth: 300},
	{key: 'timezone', 
		...fields.timezone,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'meeting',
		label: 'Associated meeting',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData}) => rowData.meetingId && <MeetingSummary meetingId={rowData.meetingId} />},
];

const defaultColumns = tableColumns.reduce((obj, col) => {
	let unselectable = false,
	    shown = true; 
	if (col.key === '__ctrl__')
		unselectable = true;
	if (col.key in ['accountName', 'meetingNumber'])
		shown = false;
	obj[col.key] = {unselectable, shown, width: col.width};
	return obj;
}, {});
const defaultTablesConfig = {default: {fixed: false, columns: defaultColumns}};

/*
 * Don't display date and time if it is the same as previous line
 */
function webexMeetingsRowGetter({rowIndex, ids, entities}) {
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
			if (b.Time === getField(b_prev, 'timeRange'))
				b = {...b, timeRange: ''};
		}
	}
	return b;
}

function WebexMeetings() {
	const dispatch = useDispatch();
	//const groupId = useSelector(selectCurrentGroupId);
	const {selected: wmSelected} = useSelector(selectWebexMeetingsState);
	const wmEntities = useSelector(selectSyncedWebexMeetingEntities);
	const [webexMeetingToLink, setWebexMeetingToLink] = React.useState(null);
	const [webexMeetingToAdd, setWebexMeetingToAdd] = React.useState(null);

	const groupId = useSelector(selectCurrentGroupId);
	const sessionId = useSelector(selectCurrentSessionId);
	const showDateRange = useSelector(selectShowDateRange);
	const session = useSelector(selectSessionEntities)[sessionId];
	
	const refresh = () => {
		const constraints = {};
		if (groupId)
			constraints.groupId = groupId;
		if (showDateRange) {
			if (session) {
				constraints.fromDate = session.startDate;
				constraints.toDate = session.endDate;
				constraints.timezone = session.timezone;
			}
			else {
				constraints.fromDate = DateTime.now().toISODate();
			}
		}
		else {
			constraints.sessionId = sessionId;
		}
		dispatch(loadWebexMeetings(constraints));
	}

	const closeToLink = () => setWebexMeetingToLink(null);
	const closeToAdd = () => setWebexMeetingToAdd(null);

	const copyHostKeys = () => {
		setClipboard(wmSelected, wmEntities);
	}

	return (
		<>
			<TopRow>
				<PathGroupAndSessionSelector allowShowDateRange />

				<div style={{display: 'flex'}}>
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
					<SplitPanelButton dataSet={dataSet} />
					<ActionButton
						name='copy'
						title='Copy host keys'
						onClick={copyHostKeys}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={46}
						estimatedRowHeight={36}
						rowGetter={webexMeetingsRowGetter}
						dataSet={dataSet}
					/>
				</Panel>
				<Panel>
					<WebexMeetingDetail />
				</Panel>
			</SplitPanel>

			<AppModal
				isOpen={!!webexMeetingToLink}
				onRequestClose={closeToLink}
			>
				<MeetingLink
					webexMeeting={webexMeetingToLink}
					close={closeToLink}
				/>
			</AppModal>

			<AppModal
				isOpen={!!webexMeetingToAdd}
				onRequestClose={closeToAdd}
			>
				<MeetingAdd
					webexMeeting={webexMeetingToAdd}
					close={closeToAdd}
					groupId={groupId}
				/>
			</AppModal>
		</>
	)
}

export default WebexMeetings;
