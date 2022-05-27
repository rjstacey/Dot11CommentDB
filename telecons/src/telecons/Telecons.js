import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useHistory, useParams} from 'react-router-dom';
import styled from '@emotion/styled';

import {ActionButton, ButtonGroup, Form, Row, Field} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, ShowFilters, TableColumnSelector, TableViewSelector} from 'dot11-components/table';

import {fields, loadTelecons, selectTeleconDefaults, setTeleconDefaults, removeTelecons, selectTeleconsState, selectTeleconsCurrentPanelConfig, setTeleconsCurrentPanelIsSplit, dataSet} from '../store/telecons';
import {selectGroupsState} from '../store/groups';
import {selectWebexAccountsState} from '../store/webexAccounts';

import TeleconDetail from './TeleconDetail';
import TeleconDefaults from './TeleconDefaults';
import ShowCalendar from './ShowCalendar';
import GroupSelector from '../organization/GroupSelector';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;


function WebexAccount({rowData}) {
	const {webex_id} = rowData;
	const {entities} = useSelector(selectWebexAccountsState);
	const account = entities[webex_id];
	const accountName = account? account.name: '-';

	return accountName;
}

function WebexMeeting({rowData}) {
	const {webexMeeting} = rowData;
	if (webexMeeting) {
		const {meetingNumber, hostKey} = webexMeeting;
		return `${meetingNumber}: ${hostKey}`;
	}
	return '';
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'groupName',
		...fields.groupName,
		width: 200, flexGrow: 1, flexShrink: 0},
	{key: 'day',
		...fields.day,
		width: 60, flexGrow: 1, flexShrink: 0},
	{key: 'date',
		...fields.date,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'time',
		...fields.time,
		width: 70, flexGrow: 1, flexShrink: 0},
	{key: 'duration',
		...fields.duration,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'hasMotions',
		...fields.hasMotions,
		width: 90, flexGrow: 1, flexShrink: 0},
	{key: 'webexAccount',
		label: 'Webex account',
		width: 150, flexGrow: 1, flexShrink: 0,
		cellRenderer: p => <WebexAccount {...p} />},
	{key: 'webexMeeting',
		label: 'Webex meeting',
		width: 150, flexGrow: 1, flexShrink: 0,
		cellRenderer: p => <WebexMeeting {...p} />}
];

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
				dispatch(loadTelecons(pathGroupId));
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

	const refresh = () => dispatch(loadTelecons(groupId));

	return (
		<>
			<TopRow>
				<ShowCalendar groupId={groupId} />
			</TopRow>
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
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						dataSet={dataSet}
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
