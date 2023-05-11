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
	FilterType
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentGroupId } from '../store/current';
import {
	loadGroups,
	setSelected,
	selectGroupsState,
	fields,
	setFilter, clearFilter, 
	groupsSelectors,
	groupsActions,
	Group
} from '../store/groups';
import { loadOfficers, selectOfficersState, selectGroupOfficers } from '../store/officers';
import { loadMembers, selectMembersState } from '../store/members';

import TopRow from '../components/TopRow';
import PathGroupSelector from '../components/PathGroupSelector';

import OrginzationDetail from './OrganizationDetail';


function Officers({group}: {group: Group}) {

	const officers = useAppSelector((state) => group? selectGroupOfficers(selectOfficersState(state), group.id): []);
	const members = useAppSelector(selectMembersState).entities;

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
		cellRenderer: ({rowData}) => <Officers group={rowData} />,
		width: 400, flexGrow: 1, flexShrink: 0}
];

function Organization() {
	const dispatch = useAppDispatch();
	const {entities, ids, selected} = useAppSelector(selectGroupsState);
	const groupId = useAppSelector(selectCurrentGroupId);
	const prevGroupIdRef = React.useRef<string | null>();

	React.useEffect(() => {
		if (!groupId) {
			dispatch(clearFilter({dataKey: 'id'}));
		}
		else {
			const groupIds = ids.filter(id => id === groupId || entities[id]!.parent_id === groupId);
			const comps = groupIds.map(groupId => ({filterType: FilterType.EXACT, value: groupId}));
			dispatch(setFilter({dataKey: 'id', comps}));
		}
		if (prevGroupIdRef.current !== groupId) {
			dispatch(setSelected([]));
			prevGroupIdRef.current = groupId;
		}
	}, [groupId, entities, ids]);	 // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => {
		dispatch(loadGroups());
		dispatch(loadOfficers());
		dispatch(loadMembers());
	}

	return (
		<>
			<TopRow>
				<PathGroupSelector />
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
					<OrginzationDetail key={selected.join()} />
				</Panel>
			</SplitPanel>
		</>
	);
}


export default Organization;