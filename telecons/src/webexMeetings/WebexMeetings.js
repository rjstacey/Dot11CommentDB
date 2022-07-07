import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import AppTable, {SelectHeader, SelectCell, TableColumnHeader, TableColumnSelector, SplitPanel, Panel} from 'dot11-components/table';
import {ActionButton, Form} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {selectGroupsState} from '../store/groups';
import {displayMeetingNumber} from '../store/webexMeetings';

import {
	selectTeleconsState,
	selectTeleconEntities,
	updateTelecons,
	addTelecons,
	getField as getTeleconField
} from '../store/telecons';

import {
	loadWebexMeetings,
	selectWebexMeetingsState,
	selectWebexMeetingsCurrentPanelConfig,
	setWebexMeetingsCurrentPanelIsSplit,
	fields,
	getField,
	dataSet
} from '../store/webexMeetings';

import WebexMeetingDetail from './WebexMeetingDetail';
import GroupSelector from '../organization/GroupSelector';
import TeleconSelector from '../telecons/TeleconSelector';
import {TeleconEntry, convertFromLocal} from '../telecons/TeleconDetail';


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

const toTimeStr = (hour, min) => ('0' + hour).substring(-2) + ':' + ('0' + min).substring(-2);

function TeleconAdd({webexMeeting, close, groupId, groupEntities}) {
	const dispatch = useDispatch();
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

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

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

function TeleconSummary({teleconId}) {
	const teleconEntities = useSelector(selectTeleconEntities);
	const telecon = teleconEntities[teleconId];
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<span>{telecon.summary}</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller'}}>
				{getTeleconField(telecon, 'date')} {getTeleconField(telecon, 'timeRange')}
			</span>
		</div>
	)
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
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
	{key: 'dayDate',
		...fields.dayDate,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'time',
		...fields.time,
		width: 70, flexGrow: 1, flexShrink: 0},
	{key: 'title', 
		...fields.title,
		width: 200, flexGrow: 1, flexShrink: 1, dropdownWidth: 300},
	{key: 'timezone', 
		...fields.timezone,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Actions',
		label: '',
		width: 200, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);

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
		b_prev = {
			...b_prev,
			dayDate: getField(b_prev, 'dayDate'),
			time: getField(b_prev, 'time')
		};
		if (b.dayDate === b_prev.dayDate) {
			b = {...b, dayDate: ''};
			if (b.Time === b_prev.Time)
				b = {...b, time: ''};
		}
	}
	return b;
}

function WebexMeetings() {
	const history = useHistory();
	const dispatch = useDispatch();
	const {groupName} = useParams();
	const {entities, ids} = useSelector(selectGroupsState);
	const {entities: wmEntities, ids: wmIds} = useSelector(selectWebexMeetingsState);
	const webexMeeting2 = wmIds.length? wmEntities[wmIds[0]]: null;
	console.log(webexMeeting2)
	const {groupId} = useSelector(selectTeleconsState);
	const {isSplit} = useSelector(selectWebexMeetingsCurrentPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setWebexMeetingsCurrentPanelIsSplit(value)), [dispatch]);
	const [webexMeetingToLink, setWebexMeetingToLink] = React.useState(null);
	const [webexMeetingToAdd, setWebexMeetingToAdd] = React.useState(null);

	React.useEffect(() => {
		if (groupName) {
			const pathGroupId = ids.find(id => entities[id].name === groupName);
			if (pathGroupId && groupId !== pathGroupId) {
				// Routed here with groupName in path, but not matching stored groupId; load telecons for groupName
				dispatch(loadWebexMeetings(pathGroupId));
			}
		}
		else if (groupId) {
			// Routed here without groupName in path, but group has previously been selected; re-route to current group
			history.replace(`/webexMeetings/${entities[groupId].name}`);
		}
	}, [groupId, groupName, entities, ids, dispatch, history]);

	const groups = React.useMemo(() => {
		return ids
			.map(id => entities[id])
			.filter(group => group.type === 'c' || group.type === 'wg')
			.sort((groupA, groupB) => groupA.name.localeCompare(groupB.name))
	}, [entities, ids]);

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

	const refresh = () => dispatch(loadWebexMeetings(groupId));

	const closeToLink = () => setWebexMeetingToLink(null);
	const closeToAdd = () => setWebexMeetingToAdd(null);

	function handleSetGroupId(groupId) {
		if (groupId) {
			const group = entities[groupId];
			const groupName = group? group.name: 'Unknown';
			history.push(`/webexMeetings/${groupName}`); // Redirect to page for selected group
		}
		else {
			history.push(`/webexMeetings`);
		}
	}

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>IMAT Session</div>
				<div style={{display: 'flex'}}>
					<label>Group:</label>
					<GroupSelector
						value={groupId}
						onChange={handleSetGroupId}
						options={groups}
					/>
				</div>
				<div style={{display: 'flex'}}>
					<TableColumnSelector dataSet={dataSet} columns={columns} />
					<ActionButton
						name='book-open'
						title='Show detail'
						isActive={isSplit}
						onClick={() => setIsSplit(!isSplit)} 
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
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
					<WebexMeetingDetail
						value={webexMeeting2}
						onChange={() => {}}
					/>
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
					groupEntities={entities}
				/>
			</AppModal>
		</>
	)
}

export default WebexMeetings;
