import React from 'react';
import {useSelector, connect} from 'react-redux';
import styled from '@emotion/styled';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, debounce} from 'dot11-components/lib';
import {ActionButton, Form, Row, Field, Input, Select} from 'dot11-components/form';

import {addGroup, updateGroups, deleteGroups, selectGroupsState, GroupTypeOptions, GroupStatusOptions, setSelected} from '../store/groups';

import GroupSelector from './GroupSelector';
import Officers from './Officers';
import ImatCommitteeSelector from './ImatCommitteeSelector';

const MULTIPLE_STR = '(Multiple)';
const BLANK_STR = '(Blank)';

const defaultEntry = {
	name: '',
	type: 'tg',
	status: 1,
}

function GroupTypeSelector({value, onChange, ...props}) {

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: 0;
		if (newValue !== value)
			onChange(newValue);
	}

	const optionSelected = GroupTypeOptions.find(o => o.value === value);

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={GroupTypeOptions}
			portal={document.querySelector('#root')}
			{...props}
		/>
	)
}

function GroupStatusSelector({value, onChange, ...props}) {

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: 0;
		if (newValue !== value)
			onChange(newValue);
	}

	const optionSelected = GroupStatusOptions.find(o => o.value === value);

	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			onChange={handleChange}
			options={GroupStatusOptions}
			portal={document.querySelector('#root')}
			{...props}
		/>
	)
}

function GroupEntry({
	entry,
	changeEntry,
	readOnly
}) {
	const {entities, ids} = useSelector(selectGroupsState);
	const groups = ids.map(id => entities[id]);
	const parentGroups = groups.filter(g => (g.type === 'wg' || g.type === 'c') && g.id !== entry.id);

	return (
		<Form
		>
			<Row>
				<Field label='Group name:'>
					<Input
						type='text'
						value={isMultiple(entry.name)? '': entry.name || ''}
						onChange={e => changeEntry({name: e.target.value})}
						placeholder={isMultiple(entry.name)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Group type:'>
					<GroupTypeSelector
						style={{width: 200}}
						value={isMultiple(entry.type)? '': entry.type || ''}
						onChange={(type) => changeEntry({type})}
						placeholder={isMultiple(entry.type)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Parent group:'>
					<GroupSelector
						style={{width: 200}}
						value={isMultiple(entry.parent_id)? '': entry.parent_id || ''}
						onChange={(parent_id) => changeEntry({parent_id})}
						placeholder={isMultiple(entry.parent_id)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
						options={parentGroups}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Status:'>
					<GroupStatusSelector
						value={isMultiple(entry.status)? 1: entry.status}
						onChange={status => changeEntry({status})}
						placeholder={isMultiple(entry.status)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT committee:'>
					<ImatCommitteeSelector
						value={isMultiple(entry.imatCommitteeId)? '': entry.imatCommitteeId}
						onChange={imatCommitteeId => changeEntry({imatCommitteeId})}
						placeholder={isMultiple(entry.imatCommitteeId)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			{!isMultiple(entry.id) &&
				<Row>
				
					<Officers
						group={entry}
						readOnly={readOnly}
					/>
				</Row>}
		</Form>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: flex-end;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const Container = styled.div`
	padding: 10px;
	label {
		font-weight: bold;
	}
`;

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

class GroupDetail extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props) => {
		const {entities, selected} = props;
		const originals = {};
		let entry = {};
		if (selected.length > 0) {
			for (const id of selected) {
				originals[id] = entities[id];
				entry = deepMergeTagMultiple(entry, entities[id]);
			}
		}
		else {
			entry = {...defaultEntry};
		}
		return {
			entry,
			originals,
			ids: selected
		}
	}

	save = (updates) => {
		this.props.updateGroups(updates);
		this.setState(state => {
			const originals = {...state.originals};
			for (const {id, changes} of updates)
				originals[id] = {...originals[id], ...changes};
			return {...state, originals}
		});
	};

	addEntry = async () => {
		const {addGroup} = this.props;
		const entry = {...defaultEntry};
		const group = await addGroup(entry);
		if (group)
			setSelected([group.id]);
	}

	updateEntries = (changes) => {
		this.setState(state => {
			const entry = deepMerge(state.entry, changes);
			const {originals, ids} = state;

			let diff = {};
			for (const id of ids)
				diff = deepMergeTagMultiple(diff, originals[id]);
			diff = deepDiff(diff, entry);

			const updates = [];
			for (const id of ids) {
				const updated = {...originals[id], ...diff};
				const changes = deepDiff(originals[id], updated);
				if (Object.keys(changes).length > 0)
					updates.push({id, changes});
			}
			if (updates.length > 0)
				this.triggerSave(updates);
			return {...state, entry}
		});
	}

	removeEntries = async () => {
		const {ids} = this.state;
		const {entities, deleteGroups} = this.props;
		const groupNames = ids.map(id => entities[id].name || BLANK_STR);
		const ok = await ConfirmModal.show(`Are you sure you want to delete ${groupNames.join(', ')}?`);
		if (!ok)
			return;
		await deleteGroups(ids);
	}

	render() {
		const {selected, loading} = this.props;
		const {entry} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (selected.length === 0)
			notAvailableStr = 'Nothing selected';

		return (
			<Container>
				<TopRow>
					<ActionButton
						name='add'
						title='Add group'
						disabled={loading}
						onClick={this.addEntry}
					/>
					<ActionButton
						name='delete'
						title='Delete group'
						disabled={loading || selected.length === 0}
						onClick={this.removeEntries}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<GroupEntry
						entry={entry}
						changeEntry={this.updateEntries}
						readOnly={false}
					/>
				}
			</Container>
		)
	}
}

export default connect(
	(state) => {
		const data = selectGroupsState(state);
		return {
			loading: data.loading,
			selected: data.selected,
			entities: data.entities,
		}
	},
	{
		addGroup,
		updateGroups,
		deleteGroups,
		setSelected,
	}
)(GroupDetail);

