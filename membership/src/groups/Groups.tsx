import React from 'react';

import {
	ActionButton,
	AppTable, 
	SplitPanel,
	Panel,
	SelectHeaderCell,
	SelectCell,
	TableColumnSelector,
	SplitPanelButton,
	ColumnProperties,
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	loadGroups,
	fields,
	groupsSelectors,
	groupsActions,
	Group,
} from '../store/groups';
import { loadOfficers, selectGroupOfficers } from '../store/officers';
import { loadMembers, selectMemberEntities } from '../store/members';

import TopRow from '../components/TopRow';
import GroupDetail from './GroupDetail';

function GroupOfficers({group}: {group: Group}) {

	const officers = useAppSelector((state) => selectGroupOfficers(state, group.id));
	const members = useAppSelector(selectMemberEntities);

	return (
		<div style={{display: 'grid', gridTemplateColumns: '150px auto'}}>
			{officers.map(officer => {
				const member = members[officer.sapin];
				const name = member? member.Name: '';
				return (
					<React.Fragment key={officer.id}>
						<div>{officer.position}</div>
						<div>{name}</div>
					</React.Fragment>
				)
			})}
		</div>
	)
}

const renderName = ({rowData}: {rowData: Group}) => <div style={{background: rowData.color || 'transparent'}}>{rowData.name}</div>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p =>
			<SelectCell
				selectors={groupsSelectors}
				actions={groupsActions}
				{...p}
			/>},
	{key: 'name',
		...fields.name,
		width: 80, flexGrow: 1, flexShrink: 0,
		cellRenderer: renderName},
	{key: 'type',
		...fields.type,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'status',
		...fields.status,
		width: 60, flexGrow: 1, flexShrink: 0},
	{key: 'officers',
		label: 'Officers',
		cellRenderer: ({rowData}) => <GroupOfficers group={rowData} />,
		width: 400, flexGrow: 1, flexShrink: 0}
];

function Organization() {
	const dispatch = useAppDispatch();

	const refresh = () => {
		dispatch(loadGroups());
		dispatch(loadOfficers());
		dispatch(loadMembers());
	}

	return (
		<>
			<TopRow style={{justifyContent: 'flex-end'}}>
				<div style={{display: 'flex'}}>
					<TableColumnSelector
						selectors={groupsSelectors}
						actions={groupsActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={groupsSelectors}
						actions={groupsActions}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>
			<SplitPanel
				selectors={groupsSelectors}
				actions={groupsActions}
			>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						selectors={groupsSelectors}
						actions={groupsActions}
					/>
				</Panel>
				<Panel>
					<GroupDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}


export default Organization;