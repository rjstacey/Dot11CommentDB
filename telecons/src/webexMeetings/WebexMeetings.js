import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DateTime} from 'luxon';
import copyToClipboard from 'copy-html-to-clipboard';

import AppTable, {SelectHeader, SelectCell, TableColumnHeader, TableColumnSelector, SplitPanel, Panel} from 'dot11-components/table';
import {ActionButton, Form} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {selectCurrentGroupId} from '../store/current';
import {selectGroupEntities} from '../store/groups';
import {displayMeetingNumber} from '../store/webexMeetings';

import {
	updateTelecons,
	addTelecons,
} from '../store/telecons';

import {
	loadWebexMeetings,
	clearWebexMeetings,
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	selectWebexMeetingsCurrentPanelConfig,
	setWebexMeetingsCurrentPanelIsSplit,
	fields,
	getField,
	dataSet
} from '../store/webexMeetings';

import {selectCurrentSession} from '../store/imatMeetings';

import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TeleconSelector from '../components/TeleconSelector';
import TopRow from '../components/TopRow';
import TeleconSummary from '../components/TeleconSummary';

import WebexMeetingDetail from './WebexMeetingDetail';
import {TeleconEntry, convertFromLocal} from '../telecons/TeleconDetail';


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

function TeleconLink({webexMeeting, close}) {
	const dispatch = useDispatch();
	const [id, setTeleconId] = React.useState();

	function submit() {
		dispatch(updateTelecons([{id, changes: {webexAccountId: webexMeeting.webexAccountId, webexMeetingId: webexMeeting.id}}]));
	}

	return (
		<Form
			submit={submit}
			cancel={close}
		>
			<TeleconSelector
				value={id}
				onChange={setTeleconId}
			/>
		</Form>
	)
}

const toTimeStr = (hour, min) => ('' + hour).padStart(2, '0') + ':' + ('' + min).padStart(2, '0');

function TeleconAdd({webexMeeting, close, groupId}) {
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
		const telecon = convertFromLocal(entry);
		dispatch(addTelecons([telecon]));
		close();
	}

	return (
		<TeleconEntry
			groupId={groupId}
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
			<WebexMeetingsColumnHeader {...props} label='Webex account' dataKey='webexAccountName' />
			<WebexMeetingsColumnHeader {...props} label='Meeting number' dataKey='meetingNumber' />
		</>
	)
}

function renderWebexMeeting({rowData}) {
	const {webexAccountName, meetingNumber} = rowData;
	return `${webexAccountName}: ${displayMeetingNumber(meetingNumber)}`;
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'dayDate',
		...fields.dayDate,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'time',
		...fields.time,
		width: 70, flexGrow: 1, flexShrink: 0},
	{key: 'webexMeeting',
		label: 'Meeting',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: p => <WebexMeetingHeading {...p}/>,
		cellRenderer: renderWebexMeeting},
	{key: 'webexAccountName', 
		...fields.webexAccountName,
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
	{key: 'Actions',
		label: 'Telecon',
		width: 200, flexGrow: 1, flexShrink: 1}
];

const defaultColumns = tableColumns.reduce((obj, col) => {
	let unselectable = false,
	    shown = true; 
	if (col.key === '__ctrl__')
		unselectable = true;
	if (col.key in ['webexAccountName', 'meetingNumber'])
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
		time: getField(b, 'time')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, 'dayDate')) {
			b = {...b, dayDate: ''};
			if (b.Time === getField(b_prev, 'time'))
				b = {...b, time: ''};
		}
	}
	return b;
}

function WebexMeetings() {
	const dispatch = useDispatch();
	const groupId = useSelector(selectCurrentGroupId);
	const session = useSelector(selectCurrentSession);
	const {selected: wmSelected} = useSelector(selectWebexMeetingsState);
	const wmEntities = useSelector(selectSyncedWebexMeetingEntities);
	const {isSplit} = useSelector(selectWebexMeetingsCurrentPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setWebexMeetingsCurrentPanelIsSplit(value)), [dispatch]);
	const [webexMeetingToLink, setWebexMeetingToLink] = React.useState(null);
	const [webexMeetingToAdd, setWebexMeetingToAdd] = React.useState(null);

	const load = () => dispatch(loadWebexMeetings({groupId, timezone: session?.timezone, fromDate: session?.start, toDate: session?.end}));

	React.useEffect(() => {
		load();
	}, [dispatch, groupId]);

	const columns = React.useMemo(() => {
		function renderActions({rowData}) {
			if (rowData.teleconId)
				return <TeleconSummary teleconId={rowData.teleconId} />
			return (
				<>
					<ActionButton
						name='link'
						onClick={() => setWebexMeetingToLink(rowData)}
					/>
					<ActionButton
						name='add'
						onClick={() => setWebexMeetingToAdd(rowData)}
					/>
					
				</>
			)
		}
		const columns = [...tableColumns];
		columns[columns.length-1] = {
			...columns[columns.length-1],
			cellRenderer: renderActions
		}
		return columns;
	}, [setWebexMeetingToLink, setWebexMeetingToAdd]);


	const closeToLink = () => setWebexMeetingToLink(null);
	const closeToAdd = () => setWebexMeetingToAdd(null);

	const copyHostKeys = () => {
		setClipboard(wmSelected, wmEntities);
	}

	function handleSetGroupId(groupId) {
		dispatch(clearWebexMeetings());
	}

	return (
		<>
			<TopRow>
				<GroupPathSelector
					onChange={handleSetGroupId}
				/>
				<CurrentSessionSelector/>

				<div style={{display: 'flex'}}>
					<TableColumnSelector dataSet={dataSet} columns={columns} />
					<ActionButton
						name='book-open'
						title='Show detail'
						isActive={isSplit}
						onClick={() => setIsSplit(!isSplit)} 
					/>
					<ActionButton
						name='copy'
						title='Copy host keys'
						onClick={copyHostKeys}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={load} />
				</div>
			</TopRow>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						fixed
						columns={columns}
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
				<TeleconLink
					webexMeeting={webexMeetingToLink}
					close={closeToLink}
				/>
			</AppModal>

			<AppModal
				isOpen={!!webexMeetingToAdd}
				onRequestClose={closeToAdd}
			>
				<TeleconAdd
					webexMeeting={webexMeetingToAdd}
					close={closeToAdd}
					groupId={groupId}
				/>
			</AppModal>
		</>
	)
}

export default WebexMeetings;
