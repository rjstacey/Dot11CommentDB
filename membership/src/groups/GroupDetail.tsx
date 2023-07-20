import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';

import {
	ConfirmModal,
	deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, Multiple,
	ActionButton, Form, Row, Field, Input, Select,
	setError,
	EntityId, Dictionary
} from 'dot11-components';

import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { AccessLevel, selectUserMembersAccess} from '../store/user';
import {
	addGroup,
	updateGroups,
	deleteGroups,
	selectGroupsState,
	selectGroup,
	selectWorkingGroupId,
	GroupTypeOptions,
	GroupStatusOptions,
	setSelected,
	Group, GroupCreate, GroupUpdate, GroupType
} from '../store/groups';

import Officers from './Officers';
import GroupSelector from '../components/GroupSelector';
import ImatCommitteeSelector from '../components/ImatCommitteeSelector';
import ColorPicker from '../components/ColorPicker';
import TopRow from '../components/TopRow';
import ShowAccess from '../components/ShowAccess';

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
	parent_id,
	...otherProps
}: {
	value: GroupType | null;
	onChange: (value: GroupType | null) => void;
	parent_id: string | null;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const parentGroup = useAppSelector(state => parent_id? selectGroup(state, parent_id): undefined);

	let options = GroupTypeOptions;
	if (!parentGroup)
		options = options.filter(o => ["c", "wg"].includes(o.value));
	else if (parentGroup.type === "c")
		options = options.filter(o => o.value === "wg");
	else if (parentGroup.type === "wg")
		options = options.filter(o => o.value !== "c");
	else
		options = options.filter(o => !["c", "wg"].includes(o.value));

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
			options={options}
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
	action,
	entry,
	changeEntry,
	title,
	busy,
	submit,
	cancel,
	readOnly
}: {
	action: Action;
	entry: MultipleGroupEntry;
	changeEntry: (changes: Partial<GroupCreate>) => void;
	title?: string;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {

	function change(changes: Partial<GroupCreate>) {
		if ('symbol' in changes && entry.type === 'tg') {
			const s = changes.symbol?.split('/');
			changes.project = "P" + (s? s[s.length - 1]: s);
		}
		changeEntry(changes);
	}

	return (
		<Form
			title={title}
			busy={busy}
			submitLabel={action === "add"? 'Add': 'Update'}
			submit={submit}
			cancel={cancel}
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
						parent_id={entry.parent_id}
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
						placeholder={isMultiple(entry.parent_id)? MULTIPLE_STR: "(None)"}
						readOnly={readOnly}
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
			{entry.id && !isMultiple(entry.id) &&
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

type Action = "add" | "update";
type MultipleGroupEntry = Multiple<GroupCreate>;

type GroupDetailState = ({
	action: "update";
	entry: MultipleGroupEntry;
	saved: MultipleGroupEntry;
} | {
	action: "add";
	entry: GroupCreate;
	saved: GroupCreate;
}) & {
	originals: Dictionary<Group>;
	ids: EntityId[];
	busy: boolean;
};

class GroupDetail extends React.Component<GroupDetailConnectedProps, GroupDetailState> {
	constructor(props: GroupDetailConnectedProps) {
		super(props);
		this.state = this.initState();
	}

	componentDidUpdate() {
		const {selected, setSelected} = this.props;
		const {ids} = this.state;

		const changeWithConfirmation = async () => {
			if (this.hasUpdates()) {
				const ok = await ConfirmModal.show('Changes not applied! Do you want to discard changes?');
				if (!ok) {
					setSelected(ids);
					return;
				}
			}
			this.reinitState();
		}

		if (selected.join() !== ids.join())
			changeWithConfirmation();
	}

	initState = (): GroupDetailState => {
		const {entities, selected} = this.props;
		const originals: Dictionary<Group> = {};
		let entry: MultipleGroupEntry = {} as MultipleGroupEntry;
		selected.forEach(id => {
			const entity = entities[id]!
			originals[id] = entity;
			entry = deepMergeTagMultiple(entry, entity);
		});

		return {
			action: "update",
			entry,
			saved: entry,
			originals,
			ids: selected,
			busy: false
		}
	}

	reinitState = () => this.setState(this.initState())

	getUpdates = () => {
		const {originals, ids, entry} = this.state;

		let diff: Partial<GroupCreate> = {};
		for (const id of ids)
			diff = deepMergeTagMultiple(diff, originals[id]!) as Partial<GroupCreate>;
		diff = deepDiff(diff, entry);

		const updates: GroupUpdate[] = [];
		for (const id of ids) {
			const updated = {...originals[id], ...diff};
			const changes: Partial<GroupCreate> = deepDiff(originals[id]!, updated);
			if (Object.keys(changes).length > 0)
				updates.push({id, changes});
		}
		return updates;
	}

	hasUpdates = () => this.state.saved !== this.state.entry;

	changeEntry = (changes: Partial<GroupCreate>) => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for updateEntries()");
			return;
		}
		this.setState(state => {
			let entry: MultipleGroupEntry = deepMerge(state.entry as MultipleGroupEntry, changes);
			// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
			//console.log(changes, entry)
			changes = deepDiff(state.saved, entry) as Partial<GroupCreate>;
			if (Object.keys(changes).length === 0)
				entry = state.saved;
			return {...state, entry}
		});
	}

	clickAdd = () => {
		this.props.setSelected([]);
		this.setState({
			action: "add",
			entry: defaultEntry,
			saved: defaultEntry,
			originals: {},
			ids: [],
			busy: false
		});
	}

	clickDelete = async () => {
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

	add = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for addEntry()");
			return;
		}
		const {addGroup, setSelected, setError, groupId, entities} = this.props;
		const entry = this.state.entry as GroupCreate;
		let group: Group;
		for (group of Object.values(entities) as Group[]) {
			if (group!.parent_id === groupId && group!.name === entry.name) {
				setError('Unable to add entry', 'Entry already exists for ' + (group!.name || BLANK_STR));
				return;
			}
		}
		this.setState({busy: true});
		group = await addGroup(entry);
		setSelected([group.id]);
		this.reinitState();
	}

	update = async () => {
		const {updateGroups} = this.props;

		this.setState({busy: true});
		const updates = this.getUpdates();
		//console.log(updates)
		await updateGroups(updates);
		this.reinitState();
	}

	cancel = async () => {
		const {setSelected} = this.props;
		setSelected([]);
		this.reinitState();
	}

	render() {
		const {selected, loading, access} = this.props;
		const {entry, ids, action, busy} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === "update" && ids.length === 0)
			notAvailableStr = 'Nothing selected';

		const readOnly = access <= AccessLevel.ro;

		let submit, cancel, title;
		if (action === "add") {
			submit = this.add;
			cancel = this.cancel;
			title = 'Add group';
		}
		else if (action === "update" && this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
			title = 'Update group';
		}

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='add'
						title='Add group'
						disabled={loading || readOnly}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='delete'
						title='Delete group'
						disabled={loading || selected.length === 0 || readOnly}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<GroupEntry
						action={action}
						title={title}
						entry={entry}
						changeEntry={this.changeEntry}
						submit={submit}
						cancel={cancel}
						busy={busy}
						readOnly={readOnly}
					/>
				}
				<ShowAccess access={access} />
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
			access: selectUserMembersAccess(state)
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

