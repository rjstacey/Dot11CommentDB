import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {ButtonGroup, ActionButton} from 'dot11-components/form';
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, TableColumnSelector} from 'dot11-components/table';
import {setFilter, clearFilter} from 'dot11-components/store/filters';

import {loadGroups, addGroup, setSelected, selectGroupsState, dataSet, fields, selectGroupsPanelConfig, setGroupsPanelIsSplit} from '../store/groups';
import {loadOfficers, selectOfficersState, selectGroupOfficers} from '../store/officers';
import {loadMembers, selectMembersState} from '../store/members';

import GroupSelector from './GroupSelector';
import OrginzationDetail from './OrganizationDetail';


function Officers({group}) {

	const officers = useSelector(state => group? selectGroupOfficers(selectOfficersState(state), group.id): []);
	const members = useSelector(selectMembersState).entities;

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

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'name',
		...fields.name,
		width: 80, flexGrow: 1, flexShrink: 0},
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

function Organization(props) {
	const dispatch = useDispatch();
	const {isSplit} = useSelector(selectGroupsPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setGroupsPanelIsSplit(value)), [dispatch]);

	function createCommittee({props, state, methods}) {
		const group = {
			parent_id: null,
			name: state.search,
		}
		return dispatch(addGroup(group));
	}

	const {entities, ids, selected} = useSelector(selectGroupsState);

	const [groupId, setGroupId] = React.useState();

	function handleSetGroupId(groupId) {
		if (!groupId) {
			dispatch(clearFilter(dataSet, 'id'));
		}
		else {
			const groupIds = ids.filter(id => id === groupId || entities[id].parent_id === groupId);
			dispatch(setFilter(dataSet, 'id', groupIds));
		}
		
		dispatch(setSelected([]));
		setGroupId(groupId);
	}

	const committeeId = React.useMemo(() => {
		const committee = ids
			.map(id => entities[id])
			.find(group => group.name === '802')
		return committee? committee.id: undefined;
	}, [entities, ids]);

	const refresh = () => {
		dispatch(loadGroups());
		dispatch(loadOfficers());
		dispatch(loadMembers());
	}

	return (
		<>
			<div style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
				<div style={{display: 'flex'}}>
					<label>Group:</label>
					<GroupSelector
						value={groupId}
						onChange={handleSetGroupId}
						parent_id={committeeId}
						create={!committeeId}
						createOption={createCommittee}
					/>
				</div>
				<ButtonGroup>
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
					<ActionButton
						name='book-open'
						title='Show detail'
						isActive={isSplit}
						onClick={() => setIsSplit(!isSplit)} 
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</ButtonGroup>
			</div>
			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						dataSet={dataSet}
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