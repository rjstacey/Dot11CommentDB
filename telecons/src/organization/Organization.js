import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Form, Row, Field, ActionButton} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import {IconCollapse} from 'dot11-components/icons';

import {loadGroups, addGroup} from '../store/groups';
import {loadOfficers, addOfficer, updateOfficer, deleteOfficer, selectOfficersState, selectGroupOfficers} from '../store/officers';
import OfficerPositionSelector from './OfficerPositionSelector';
import MemberSelector from './MemberSelector';
import GroupSelector from './GroupSelector';

// The top row height is determined by its content
const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

function OfficerAdd({close, type, group}) {
	const [officer, setOfficer] = React.useState({});
	const dispatch = useDispatch();

	const submit = async () => {
		officer.group_id = group.id;
		await dispatch(addOfficer(officer));
		close();
	};

	return (
		<Form
			title={'Add officer position for ' + group.name}
			submitLabel='Add'
			submit={submit}
			cancel={close}
			onClick={e => e.stopPropagation()}
			style={{height: '400px'}}
		>
			<Row>
				<Field
					label='Position:'
				>
					<OfficerPositionSelector
						value={officer.position}
						onChange={(position) => setOfficer({officer, position})}
						//portal={document.querySelector('#root')}
					/>
				</Field>
			</Row>
		</Form>
	)
}

const OfficerTable = styled.table`
	display: grid;
	grid-template-columns: 1fr 3fr;
	border-collapse: collapse;

	& * {
		box-sizing: border-box;
	}

	thead, tbody, tr {
		display: contents;
	}

	th, td {
		padding: 10px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		border: gray solid 1px;
	}

	tr:first-of-type td {
		border-top: none;
	}

	tr:not(:last-of-type) td {
		border-bottom: none;
	}

	th:not(:last-of-type),
	td:not(:last-of-type) {
		border-right: none;
	}

	th {
		position: sticky;
		top: 0;
		background: #f6f6f6;
		text-align: left;
		font-weight: bold;
		font-size: 1rem;
	}

	td {
		padding-top: 5px;
		padding-bottom: 5px;
	}

	td.empty {
		grid-column: 1 / -1;
		color: gray;
		font-style: italic;
	}

	tr:nth-of-type(even) td {
		background: #fafafa;
	}
`;

function OfficerTableHeader({group}) {
	const dispatch = useDispatch();

	const handleAddPosition = (position) => {
		const officer = {
			group_id: group.id,
			position
		};
		dispatch(addOfficer(officer));
	};

	return (
		<thead>
			<tr>
				<th style={{display: 'flex', justifyContent: 'space-between'}}>
					<span>Position</span>
					<OfficerPositionSelector
						//value={officer.position}
						onChange={handleAddPosition}
						contentRenderer={(props) => <ActionButton name='add' title='Add position'/>}
						placeholder=''
						portal={document.querySelector('#root')}
					/>
				</th>
				<th>
					<span>Member</span>
				</th>
			</tr>
		</thead>
	);
}

function OfficerPosition({officer}) {
	const dispatch = useDispatch();
	const handleDelete = () => dispatch(deleteOfficer(officer));
	return (
		<div style={{display: 'flex', justifyContent: 'space-between'}}>
			<span>{officer.position}</span>
			<ActionButton name='delete' onClick={handleDelete}/>
		</div>
	)
}


function OfficerTableRow({officer}) {
	const dispatch = useDispatch();
	function handleUpdateSAPIN(sapin) {
		const {id} = officer;
		dispatch(updateOfficer({id, changes: {sapin}}));
	}
	return (
		<tr>
			<td>
				<OfficerPosition officer={officer} />
			</td>
			<td>
				<MemberSelector
					value={officer.sapin}
					onChange={handleUpdateSAPIN}
				/>
			</td>
		</tr>
	)
}

function EmptyOfficerTableRow() {
	return (
		<tr>
			<td className='empty'>Empty</td>
		</tr>
	)
}

function Officers({group}) {
	const officers = useSelector(state => selectGroupOfficers(selectOfficersState(state), group.id));
	return (
		<OfficerTable>
			<OfficerTableHeader group={group} />
			<tbody>
				{officers.length?
					officers.map(officer => <OfficerTableRow key={officer.id} officer={officer} />):
					<EmptyOfficerTableRow />}
			</tbody>
		</OfficerTable>
	)
}


const GroupRow = styled.div`
	padding-left: 50px;
	min-width: 300px;
`;

function Group({level, group, subgroups, clickAdd}) {
	const officers = useSelector(state => selectGroupOfficers(selectOfficersState(state), group.id));
	const [showContent, setShowContent] = React.useState(level === 1? true: false);
	const [showOfficers, setShowOfficers] = React.useState(false);
	const [showSubgroups, setShowSubgroups] = React.useState(level === 1? true: false);
	return (
		<GroupRow id='group'>
			<Row>
				<h2>
					<IconCollapse isCollapsed={!showContent} onClick={() => setShowContent(!showContent)} />
					{group.name}
				</h2>
			</Row>
			{showContent &&
				<>
					<Row>
						<h3>
							<IconCollapse isCollapsed={!showOfficers} onClick={() => setShowOfficers(!showOfficers)} />
							Officers
						</h3>
						<ActionButtonDropdown
							name='add'
							title='Add officer'
							dropdownRenderer={(props) => <OfficerAdd group={group} {...props} />}
						/>
					</Row>
					{showOfficers &&
						<OfficerTable>
							<OfficerTableHeader />
							<tbody>
								{officers.length?
									officers.map(officer => <OfficerTableRow key={officer.id} officer={officer} />):
									<EmptyOfficerTableRow />}
							</tbody>
						</OfficerTable>
					}
					{level < 3 && 
						<>
							<Row>
								<h3>
									{subgroups.length > 0 && <IconCollapse isCollapsed={!showSubgroups} onClick={() => setShowSubgroups(!showSubgroups)} />}
									Subgroups
								</h3>
							</Row>
							{showSubgroups &&
								<>
									{subgroups.map(entry => <Group key={entry.id} level={level + 1} group={entry} subgroups={entry.children} />)}
								</>
							}
						</>
					}
				</>}
		</GroupRow>
	)
}

const Container = styled.div`
	width: 1000px;
`;


function Organization() {

	const dispatch = useDispatch();
	const {loading: groupsLoading, entities: groupEntities, ids: groupIds} = useSelector(state => state['groups']);
	const {loading: officersLoading} = useSelector(state => state['officers']);
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

	const handleSetWorkingGroup = (id) => setState(state => ({...state, selectedWorkingGroup: groupEntities[id]}));

	const handleSetSubgroup = (id) => setState(state => ({...state, selectedSubgroup: groupEntities[id]}));

	const addSponsor = async ({state: selectState}) => {
		return await dispatch(addGroup({name: selectState.search, parent_id: null}));
	}

	const addWorkingGroup = async ({state: selectState}) => {
		return await dispatch(addGroup({name: selectState.search, parent_id: state.sponsor.id}));
	}

	const addSubgroup = async ({state: selectState}) => {
		return await dispatch(addGroup({name: selectState.search, parent_id: state.selectedWorkingGroup.id}));
	}

	const currentGroup = state.selectedSubgroup || state.selectedWorkingGroup || state.sponsor;

	React.useEffect(() => {
		if (!groupsLoading)
			dispatch(loadGroups());
		if (!officersLoading)
			dispatch(loadOfficers());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => dispatch(loadGroups());

	return (
		<Container>
			<TopRow>
				<h2>Groups</h2>
				<GroupSelector
					value={state.sponsor? state.sponsor.id: 0}
					options={state.sponsor? [state.sponsor]: []}
					create
					createOption={addSponsor}
					valueField='id'
					labelField='name'
				/>
				<GroupSelector
					value={state.selectedWorkingGroup? state.selectedWorkingGroup.id: 0}
					options={state.workingGroups}
					onChange={handleSetWorkingGroup}
					create
					createOption={addWorkingGroup}
					valueField='id'
					labelField='name'
				/>
				<GroupSelector
					value={state.selectedSubgroup? state.selectedSubgroup.id: 0}
					options={state.subgroups}
					onChange={handleSetSubgroup}
					create
					createOption={addSubgroup}
					valueField='id'
					labelField='name'
				/>
				<div style={{display: 'flex'}}>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={groupsLoading} />
				</div>
			</TopRow>
			{groupStr && <p>{groupStr}</p>}
			{currentGroup && <Officers group={currentGroup} />}
		</Container>
	);
}


export default Organization;