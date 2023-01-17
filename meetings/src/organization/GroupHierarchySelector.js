import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {ActionButton} from 'dot11-components/form';

import {loadOfficers, addOfficer, updateOfficer, deleteOfficer, selectOfficersState, selectGroupOfficers} from '../store/officers';
import {loadGroups, addGroup} from '../store/groups';

import GroupSelector from './GroupSelector';


const Container = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

function GroupHeirarchySelector({value, onChange}) {

	const dispatch = useDispatch();
	const {loading: groupsLoading, entities: groupEntities, ids: groupIds} = useSelector(state => state['groups']);

	const [state, setState] = React.useState({
		sponsor: null,
		workingGroups: [],
		selectedWorkingGroup: null,
		subgroups: [],
		selectedSubgroup: null,
	});

	React.useEffect(() => {
		let sponsor;
		for (const id of groupIds) {
			if (!groupEntities[id].parent_id)
				sponsor = groupEntities[id];
		}
		const workingGroups = [];
		if (sponsor) {
			for (const id of groupIds) {
				const group = groupEntities[id];
				if (group.parent_id === sponsor.id)
					workingGroups.push(group);
			}
		}
		setState(state => ({...state, sponsor, workingGroups}));
	}, [groupEntities, groupIds]);

	React.useEffect(() => {
		const subgroups = [];
		let {selectedSubgroup} = state;
		if (state.selectedWorkingGroup) {
			for (const id of groupIds) {
				const group = groupEntities[id];
				if (group.parent_id === state.selectedWorkingGroup.id)
					subgroups.push(group);
			}
		}
		if (subgroups.indexOf(selectedSubgroup) < 0)
			selectedSubgroup = null;
		setState(state => ({...state, subgroups, selectedSubgroup}));
	}, [groupEntities, groupIds, state.workingGroups, state.selectedWorkingGroup]);

	let groupStr = '';
	if (state.sponsor) {
		groupStr = state.sponsor.name;
		if (state.selectedWorkingGroup) {
			groupStr = state.selectedWorkingGroup.name;
			if (state.selectedSubgroup)
				groupStr += ' ' + state.selectedSubgroup.name;
		}
		groupStr = 'Officer positions for ' + groupStr;
	}

	const handleSetWorkingGroup = (id) => {
		const selectedWorkingGroup = groupEntities[id];
		setState(state => ({...state, selectedWorkingGroup: groupEntities[id], selectedSubgroup: null}));
		if (selectedWorkingGroup) {
			const subgroups = [];
			for (const id of groupIds) {
				const group = groupEntities[id];
				if (group.parent_id === selectedWorkingGroup.id)
					subgroups.push(group);
			}
			onChange({group: selectedWorkingGroup, subgroups});
		}
		else {
			const workingGroups = [];
			for (const id of groupIds) {
				const group = groupEntities[id];
				if (group.parent_id === state.sponsor.id)
					workingGroups.push(group);
			}
			onChange({group: state.sponsor, subgroups: workingGroups});
		}
	}

	const handleSetSubgroup = (id) => {
		const selectedSubgroup = groupEntities[id];
		setState(state => ({...state, selectedSubgroup: groupEntities[id]}));
		if (selectedSubgroup)
			onChange({group: selectedSubgroup, subgroups: []});
		else {
			onChange({group: state.selectedWorkingGroup, subgroups: state.subgroups});
		}
	}

	const refresh = () => dispatch(loadGroups());

	return (
		<Container>
			<h2>Groups</h2>
			<GroupSelector
				value={state.sponsor? state.sponsor.id: 0}
				options={state.sponsor? [state.sponsor]: []}
				valueField='id'
				labelField='name'
			/>
			<GroupSelector
				value={state.selectedWorkingGroup? state.selectedWorkingGroup.id: 0}
				options={state.workingGroups}
				onChange={handleSetWorkingGroup}
				valueField='id'
				labelField='name'
			/>
			<GroupSelector
				value={state.selectedSubgroup? state.selectedSubgroup.id: 0}
				options={state.subgroups}
				onChange={handleSetSubgroup}
				valueField='id'
				labelField='name'
			/>
			<div style={{display: 'flex'}}>
				<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={groupsLoading} />
			</div>
		</Container>
	)
}

export default GroupHeirarchySelector;