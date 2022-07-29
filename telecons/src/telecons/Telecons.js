import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useHistory, useParams, Link} from 'react-router-dom';
import {DateTime} from 'luxon';

import {ActionButton, ButtonGroup} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, ShowFilters, TableColumnSelector, TableViewSelector, TableColumnHeader} from 'dot11-components/table';

import {
	fields,
	loadTelecons,
	removeTelecons,
	selectTeleconsState,
	selectTeleconsCurrentPanelConfig,
	setTeleconsCurrentPanelIsSplit,
	dataSet,
	getField
} from '../store/telecons';

import {selectGroupsState} from '../store/groups';
import {displayMeetingNumber} from '../store/webexMeetings';

import GroupSelector from '../components/GroupSelector';
import TopRow from '../components/TopRow';

import TeleconDetail from './TeleconDetail';
import TeleconDefaults from './TeleconDefaults';

function renderWebexMeeting({rowData}) {
	const {webexAccountId, webexAccountName, webexMeeting} = rowData;
	if (!webexAccountId || !webexMeeting)
		return 'None';
	return rowData.webexAccountName + ': ' + displayMeetingNumber(webexMeeting.meetingNumber);
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
		label: 'IMAT',
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
	const {entities, ids} = useSelector(selectGroupsState);
	const history = useHistory();
	const {groupName} = useParams();
	const {groupId} = useSelector(selectTeleconsState);

	React.useEffect(() => {
		if (groupName) {
			const pathGroupId = ids.find(id => entities[id].name === groupName);
			if (pathGroupId && groupId !== pathGroupId) {
				// Routed here with groupName in path, but not matching stored groupId; load telecons for groupName
				dispatch(loadTelecons({parent_id: pathGroupId, fromDate: DateTime.now().toISO()}));
			}
		}
		else if (groupId) {
			// Routed here without groupName in path, but group has previously been selected; re-route to current group
			history.replace(`/telecons/${entities[groupId].name}`);
		}
	}, [groupId, groupName, entities, ids, dispatch, history]);

	const groups = React.useMemo(() => {
		return ids
			.map(id => entities[id])
			.filter(group => group.type === 'c' || group.type === 'wg')
			.sort((groupA, groupB) => groupA.name.localeCompare(groupB.name))
	}, [entities, ids]);

	function handleSetGroupId(groupId) {
		dispatch(removeTelecons());
		if (groupId) {
			const group = entities[groupId];
			const groupName = group? group.name: 'Unknown';
			history.push(`/telecons/${groupName}`); // Redirect to page for selected group
		}
		else {
			history.push(`/telecons`);
		}
	}

	const refresh = () => dispatch(loadTelecons({parent_id: groupId, fromDate: DateTime.now().toISO()}));

	return (
		<>
			<TopRow>
				<div style={{display: 'flex'}}>
					<label>Group:</label>
					<GroupSelector
						value={groupId}
						onChange={handleSetGroupId}
						options={groups}
					/>
				</div>
				<ActionButtonDropdown label='Set Defaults'>
					<TeleconDefaults
						groupId={groupId}
						groupName={groupName}
					/>
				</ActionButtonDropdown>
				
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
						measureRowHeight={true}
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
