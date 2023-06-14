import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';

import {
	ConfirmModal,
	deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, Multiple, debounce,
	ActionButton, Form, Row, Field, Input, Select,
	setError,
	EntityId, Dictionary
} from 'dot11-components';

import {
	addGroup,
	updateGroups,
	deleteGroups,
	selectGroupsState,
	selectWorkingGroupId,
	GroupTypeOptions,
	GroupStatusOptions,
	setSelected,
	Group, GroupCreate, GroupType
} from '../store/groups';

import { AccessLevel} from '../store/user';

import GroupSelector from '../components/GroupSelector';
import ImatCommitteeSelector from '../components/ImatCommitteeSelector';
import ColorPicker from '../components/ColorPicker';

import Officers from './Officers';
import TopRow from '../components/TopRow';
import { RootState } from '../store';

const MULTIPLE_STR = '(Multiple)';
const BLANK_STR = '(Blank)';

const defaultEntry: GroupCreate = {
	parent_id: null,
	name: '',
	type: 'tg',
	status: 1,
	color: 'white',
	symbol: null,
	project: null
}

function GroupTypeSelector({
	value,
	onChange,
	...otherProps
}: {
	value: GroupType | null;
	onChange: (value: GroupType | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {

	function handleChange(values: typeof GroupTypeOptions) {
		const newValue: GroupType | null = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}

	const values = GroupTypeOptions.filter(o => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={GroupTypeOptions}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

function GroupStatusSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {

	function handleChange(values: typeof GroupStatusOptions) {
		const newValue = values.length > 0? values[0].value: 0;
		if (newValue !== value)
			onChange(newValue);
	}

	const values = GroupStatusOptions.filter(o => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={GroupStatusOptions}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

function GroupEntry({
	entry,
	changeEntry,
	readOnly
}: {
	entry: MultipleGroupEntry;
	changeEntry: (changes: Partial<GroupCreate>) => void;
	readOnly?: boolean;
}) {

	function change(changes: Partial<GroupCreate>) {
		if ('symbol' in changes && entry.type === 'tg') {
			const s = changes.symbol?.split('/');
			changes = {
				...changes,
				project: "P" + (s? s[s.length - 1]: s)
			};
		}
		changeEntry(changes);
	}

	return (
		<Form
		>
			<Row>
				<Field label='Group name:'>
					<Input
						type='text'
						value={isMultiple(entry.name)? '': entry.name || ''}
						onChange={e => change({name: e.target.value})}
						placeholder={isMultiple(entry.name)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Color:'>
					<ColorPicker
						value={isMultiple(entry.color)? '': entry.color}
						onChange={(color) => change({color})}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Group type:'>
					<GroupTypeSelector
						style={{width: 200}}
						value={isMultiple(entry.type)? null: entry.type}
						onChange={(type) => change({type})}
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
						onChange={(parent_id) => change({parent_id})}
						//multi={false}
						placeholder={isMultiple(entry.parent_id)? MULTIPLE_STR: "(None)"}
						readOnly={readOnly}
						//options={parentGroups}
					/>
				</Field>
			</Row>

			<Row>
				<Field label='Status:'>
					<GroupStatusSelector
						value={isMultiple(entry.status)? 1: entry.status}
						onChange={status => change({status})}
						placeholder={isMultiple(entry.status)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			{entry.type === 'tg' &&
				<Row>
					<Field label='Project:'>
						<Input
							type='text'
							value={isMultiple(entry.project)? '': entry.project || ''}
							onChange={e => change({project: e.target.value})}
							placeholder={isMultiple(entry.project)? MULTIPLE_STR: BLANK_STR}
							disabled={readOnly}
						/>
					</Field>
				</Row>}
			{entry.type && ['c', 'wg', 'tg'].includes(entry.type) &&
				<Row>
					<Field label={'IMAT committee:'}>
						<ImatCommitteeSelector
							value={isMultiple(entry.symbol)? '': entry.symbol}
							onChange={symbol => change({symbol})}
							type={entry.type === 'wg'? "Working Group": entry.type === 'tg'? "Project": undefined}
							placeholder={isMultiple(entry.symbol)? MULTIPLE_STR: undefined}
							readOnly={readOnly}
						/>
					</Field>
				</Row>}
			{!isMultiple(entry.id) &&
				<Row>
					<Officers
						groupId={entry.id}
						readOnly={readOnly}
					/>
				</Row>}
		</Form>
	)
}

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

type MultipleGroupEntry = Multiple<Group>;

type GroupDetailState = {
	entry: MultipleGroupEntry | {};
	originals: Dictionary<Group>;
	ids: EntityId[];
}

class GroupDetail extends React.Component<GroupDetailConnectedProps, GroupDetailState> {
	constructor(props: GroupDetailConnectedProps) {
		super(props);
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}
	//triggerSave: ReturnType<typeof debounce>;
	triggerSave: any;	// Hack: something wrong with debounce typing

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props: GroupDetailConnectedProps): GroupDetailState => {
		const {entities, selected} = props;
		const originals: Dictionary<Group> = {};
		let entry: MultipleGroupEntry | {} = {};
		if (selected.length > 0) {
			for (const id of selected) {
				originals[id] = entities[id];
				entry = deepMergeTagMultiple(entry, entities[id]!);
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

	save = (updates: {id: string; changes: Partial<Group>}[]) => {
		this.props.updateGroups(updates);
		this.setState(state => {
			const originals: Dictionary<Group> = {...state.originals};
			for (const {id, changes} of updates)
				originals[id] = {...originals[id]!, ...changes};
			return {...state, originals}
		});
	};

	addEntry = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for addEntry()");
			return;
		}
		const {addGroup, setSelected, setError, groupId, entities} = this.props;
		const entry: GroupCreate = {...defaultEntry, parent_id: groupId};
		let group: Group;
		for (group of Object.values(entities) as Group[]) {
			if (group!.parent_id === groupId && group!.name === entry.name) {
				setError('Unable to add entry', 'Entry already exists for ' + (group!.name || BLANK_STR));
				return;
			}
		}
		group = await addGroup(entry);
		setSelected([group.id]);
	}

	updateEntries = (changes: Partial<GroupCreate>) => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for updateEntries()");
			return;
		}
		this.setState(state => {
			const entry: MultipleGroupEntry = deepMerge(state.entry as MultipleGroupEntry, changes);
			const {originals, ids} = state;

			let diff: Partial<GroupCreate> = {};
			for (const id of ids)
				diff = deepMergeTagMultiple(diff, originals[id]!) as Partial<GroupCreate>;
			diff = deepDiff(diff, entry);

			const updates = [];
			for (const id of ids) {
				const updated = {...originals[id], ...diff};
				const changes: Partial<GroupCreate> = deepDiff(originals[id]!, updated);
				if (Object.keys(changes).length > 0)
					updates.push({id, changes});
			}
			if (updates.length > 0)
				this.triggerSave(updates);
			return {...state, entry}
		});
	}

	removeEntries = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for removeEntries()");
			return;
		}
		const {ids} = this.state;
		const {entities, deleteGroups} = this.props;
		const groupNames = ids.map(id => entities[id]!.name || BLANK_STR);
		const ok = await ConfirmModal.show(`Are you sure you want to delete ${groupNames.join(', ')}?`);
		if (!ok)
			return;
		await deleteGroups(ids);
	}

	render() {
		const {selected, loading, access} = this.props;
		const {entry, ids} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (ids.length === 0)
			notAvailableStr = 'Nothing selected';

		const readOnly = access <= AccessLevel.ro;

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='add'
						title='Add group'
						disabled={loading || readOnly}
						onClick={this.addEntry}
					/>
					<ActionButton
						name='delete'
						title='Delete group'
						disabled={loading || selected.length === 0 || readOnly}
						onClick={this.removeEntries}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<GroupEntry
						entry={entry as MultipleGroupEntry}
						changeEntry={this.updateEntries}
						readOnly={readOnly}
					/>
				}
			</Container>
		)
	}
}

const connector = connect(
	(state: RootState) => {
		const data = selectGroupsState(state);
		return {
			loading: data.loading,
			selected: data.selected,
			entities: data.entities,
			groupId: selectWorkingGroupId(state),
			access: AccessLevel.admin
		}
	},
	{
		addGroup,
		updateGroups,
		deleteGroups,
		setSelected,
		setError
	}
);

type GroupDetailConnectedProps = ConnectedProps<typeof connector>;

const ConnectedGroupDetail = connector(GroupDetail);

export default ConnectedGroupDetail;

