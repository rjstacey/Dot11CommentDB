import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Form, Row, Field, Input, ActionButton, Button} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general';
import {IconCollapse} from 'dot11-components/icons';

import {loadGroups, addGroup, selectGroupsState, selectGroupHierarchy} from '../store/groups';
import {loadOfficers, addOfficer, selectOfficersState, selectGroupOfficers} from '../store/officers';
import OfficerPositionSelector from './OfficerPositionSelector';

// The top row height is determined by its content
const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

function GroupAdd({close, type, group}) {
	const [name, setName] = React.useState('');
	const dispatch = useDispatch();

	const submit = async () => {
		await dispatch(addGroup({name, parent_id: group.id}));
		close();
	};

	const change = e => {
		setName(e.target.value);
	}

	return (
		<Form
			title={'Add a subgroup' + (group.name? ` to ${group.name}`: '')}
			submitLabel='Add'
			submit={submit}
			cancel={close}
		>
			<Row>
				<Field
					label='Name:'
				>
					<Input
						type='search'
						name='name'
						value={name}
						onChange={change}
						placeholder='Enter subgroup name...'
					/>
				</Field>
			</Row>
		</Form>
	)
}

function OfficerAdd({close, type, group}) {
	const [officer, setOfficer] = React.useState({});
	const dispatch = useDispatch();

	const submit = async () => {
		officer.group_id = group.id;
		await dispatch(addOfficer(officer));
		close();
	};

	const change = e => {
		const {name, value} = e.target;
		setOfficer(officer => ({...officer, [name]: value}));
	}

	return (
		<Form
			title={'Add officer position for ' + group.name}
			submitLabel='Add'
			submit={submit}
			cancel={close}
		>
			<Row>
				<Field
					label='Position:'
				>
					<OfficerPositionSelector
						value={officer.position}
						onChange={(position) => setOfficer({officer, position})}
						portal={document.querySelector('#root')}
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

	tr:nth-child(even) td {
		background: #fafafa;
	}
`;

function OfficerTableHeader(props) {
	return (
		<thead>
			<tr>
				<th>Position</th>
				<th>Member</th>
			</tr>
		</thead>
	);
}


function OfficerTableRow({officer}) {
	return (
		<tr>
			<td>{officer.position}</td>
			<td>{officer.sapin}</td>
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
		<GroupRow>
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
									{subgroups.map(entry => <Group key={entry.node.id} level={level + 1} group={entry.node} subgroups={entry.children} />)}
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
	const {loading: groupsLoading} = useSelector(state => state['groups']);
	const {loading: officersLoading} = useSelector(state => state['officers']);

	const groups = useSelector(selectGroupHierarchy);
	console.log(groups)

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
				<div style={{display: 'flex'}}>
					<ActionButtonDropdown
						name='add'
						title='Add group'
						dropdownRenderer={(props) => <GroupAdd {...props} />}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} disabled={groupsLoading} />
				</div>
			</TopRow>
			{groups.map(entry => <Group key={entry.node.id} level={1} group={entry.node} subgroups={entry.children} />)}
		</Container>
	);
}


export default Organization;