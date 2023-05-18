import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import type { EntityId } from '@reduxjs/toolkit';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import {
	Form, ActionButton, Row, Col, Field, FieldLeft, Checkbox, Input,
	ConfirmModal,
	shallowDiff, deepMergeTagMultiple, isMultiple, Multiple,
} from 'dot11-components';

import type { RootState } from '../store';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
	setUiProperties,
	selectUiProperties,
	addMembers,
	updateMembers,
	deleteMembers,
	addMemberStatusChangeEntries,
	updateMemberStatusChangeEntries,
	deleteMemberStatusChangeEntries,
	selectMembersState,
	selectMemberEntities,
	Member,
	MemberAdd
} from '../store/members';

import { selectMemberAttendancesCount } from '../store/sessionParticipation';
import { selectMemberBallotParticipationCount } from '../store/ballotParticipation';

import StatusSelector from './StatusSelector';
import MemberSelector from './MemberSelector';
import MemberStatusChangeHistory from './MemberStatusChange';
import MemberContactInfo from './MemberContactInfo';
import MemberPermissions from './MemberPermissions';
import MemberAttendances from '../sessionParticipation/MemberAttendances';
import MemberBallotParticipation from '../ballotParticipation/MemberBallotParticipation';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const defaultMember = {
	SAPIN: 0,
	Name: '',
	Email: '',
	Status: 'Non-Voter',
	Affiliation: '',
	Employer: '',
	Access: 0,
	ContactInfo: {
		StreetLine1: '',
		StreetLine2: '',
		City: '',
		State: '',
		Zip: '',
		Country: '',
		Phone: '',
		Fax: ''
	}
};

const displayDate = (isoDateTime: string) => DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function ShortMemberSummary({sapins}: {sapins: number[]}) {
	const members = useAppSelector(selectMemberEntities);

	const rows = sapins.map(sapin => {
		const m = members[sapin];
		if (!m)
			return null
		return (
			<tr key={m.SAPIN}>
				<td>{m.SAPIN}</td>
				<td>{m.Name}</td>
				<td>{m.Email}</td>
				<td>{m.Affiliation}</td>
				<td>{m.Status}</td>
				<td>{displayDate(m.DateAdded)}</td>
			</tr>
		)
	})
	return (
		<table>
			<tbody>
				{rows}
			</tbody>
		</table>
	)
}

const renderDate = (value: any) => isMultiple(value)?
	<i>{MULTIPLE_STR}</i>:
	value?
		displayDate(value):
		<i>{BLANK_STR}</i>;

function MemberDetailInfo({
	member,
	updateMember,
	readOnly
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const tabIndex: number = useAppSelector(selectUiProperties).tabIndex || 0;
	const setTabIndex = (tabIndex: number) => {dispatch(setUiProperties({tabIndex}))};

	const SAPIN = member.SAPIN[0];

	const {count: sessionCount, total: sessionTotal} = useAppSelector((state) => selectMemberAttendancesCount(state, SAPIN));
	const {count: ballotCount, total: ballotTotal} = useAppSelector((state) => selectMemberBallotParticipationCount(state, SAPIN));

	return (
		<Tabs
			style={{width: '100%'}}
			onSelect={setTabIndex}
			selectedIndex={tabIndex}
		>
			<TabList>
				<Tab>Contact info</Tab>
				<Tab>Permissions</Tab>
				<Tab>Status history</Tab>
				<Tab>{`Session participation ${sessionCount}/${sessionTotal}`}</Tab>
				<Tab>{`Ballot participation ${ballotCount}/${ballotTotal}`}</Tab>
			</TabList>
			<TabPanel>
				<MemberContactInfo
					member={member} 
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberPermissions
					member={member}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberStatusChangeHistory
					member={member}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberAttendances
					SAPIN={SAPIN}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberBallotParticipation
					SAPIN={SAPIN}
					readOnly={readOnly}
				/>
			</TabPanel>
		</Tabs>
	)
}

function MemberEntryForm({
	action,
	member,
	updateMember,
	submit,
	cancel,
	readOnly
}: {
	action: Action;
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	submit: () => void;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const hasMany = Array.isArray(member.SAPIN) && member.SAPIN.length > 1;
	const sapinsStr = Array.isArray(member.SAPIN)? member.SAPIN.join(', '): member.SAPIN;
	const sapinsLabel = hasMany? 'SA PINs:': 'SA PIN:';

	let errMsg = '';
	if (!member.Name)
		errMsg = 'Name not set';
	else if (!member.Affiliation)
		errMsg = 'Affiliation not set';

	let submitForm, cancelForm, submitLabel;
	let title = "Member detail";
	if (submit) {
		if (action === 'add') {
			submitLabel = "Add";
			title = "Add member";
		}
		else {
			submitLabel = "Update";
			title = "Update member";
		}
		submitForm = async () => {
			if (errMsg) {
				ConfirmModal.show("Fix error: " + errMsg)
				return;
			}
			submit();
		};
		cancelForm = cancel;
	}
	console.log(member)

	return (
		<Form
			style={{flex: 1, overflow: 'hidden'}}
			title={title}
			//busy={busy}
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			<Row>
				<FieldLeft label={sapinsLabel}>{sapinsStr}</FieldLeft>
				<FieldLeft label='Date added:'>{renderDate(member.DateAdded)}</FieldLeft>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input
						type='text'
						size={24}
						name='Name'
						value={isMultiple(member.Name)? '': member.Name}
						onChange={e => updateMember({Name: e.target.value})}
						placeholder={isMultiple(member.Name)? MULTIPLE_STR: ''}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Email:'>
					<Input
						type='text'
						size={24}
						name='Email'
						value={isMultiple(member.Email)? '': member.Email}
						onChange={e => updateMember({Email: e.target.value})}
						placeholder={isMultiple(member.Email)? MULTIPLE_STR: ''}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Employer:'>
					<Input
						type='text'
						size={24}
						name='Employer'
						value={isMultiple(member.Employer)? '': member.Employer}
						onChange={e => updateMember({Employer: e.target.value})}
						placeholder={isMultiple(member.Employer)? MULTIPLE_STR: ''}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Affiliation:'>
					<Input
						type='text'
						size={24}
						name='Affiliation'
						value={isMultiple(member.Affiliation)? '': member.Affiliation}
						onChange={e => updateMember({Affiliation: e.target.value})}
						placeholder={isMultiple(member.Affiliation)? MULTIPLE_STR: ''}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Status:'>
					<StatusSelector
						style={{flexBasis: 200}}
						value={isMultiple(member.Status)? '': member.Status}
						onChange={value => updateMember({Status: value})}
						placeholder={isMultiple(member.Status)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<label>Override</label>
						<Checkbox 
							checked={!!member.StatusChangeOverride}
							indeterminate={isMultiple(member.StatusChangeOverride)}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMember({StatusChangeOverride: e.target.checked? 1: 0})}
							disabled={readOnly}
						/>
					</div>
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<label>Last change</label>
						<div>
							{renderDate(member.StatusChangeDate)}
						</div>
					</div>
				</Field>
			</Row>
			{member.Status === 'Obsolete' &&
				<Row>
					<Field label='Replaced by:'>
						<MemberSelector
							style={{maxWidth: 400, flex: 1}}
							value={isMultiple(member.ReplacedBySAPIN)? null: (member.ReplacedBySAPIN || null)}
							onChange={value => updateMember({ReplacedBySAPIN: value})}
							placeholder={isMultiple(member.ReplacedBySAPIN)? MULTIPLE_STR: BLANK_STR}
							readOnly={readOnly}
						/>
					</Field>
				</Row>}
				{!hasMany &&
					<>
						{member.ObsoleteSAPINs && !isMultiple(member.ObsoleteSAPINs) && member.ObsoleteSAPINs.length > 0 &&
							<Row>
								<Col>
									<label>Replaces:</label>
									<ShortMemberSummary sapins={member.ObsoleteSAPINs} />
								</Col>
							</Row>}
						<Row>
							{action === "update"?
								<MemberDetailInfo
									member={member} 
									updateMember={updateMember}
									readOnly={readOnly}
								/>:
								<MemberContactInfo
									member={member} 
									updateMember={updateMember}
									readOnly={readOnly}
								/>}
						</Row>
					</>}
		</Form>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: flex-end;
	width: 100%;
`;

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

const DetailContainer = styled.div`
	padding: 10px;
`;

type NormalizeOptions<T> = {
	selectId?: (entry: T) => string | number;
}

function normalize<T>(arr: T[], options?: NormalizeOptions<T>) {
	const selectId = options?.selectId || ((entry: any) => entry.id);
	const ids: (number | string)[] = [];
	const entities: Record<number | string, T> = {};
	arr.forEach(entity => {
		const id = selectId(entity);
		entities[id] = entity;
		ids.push(id);
	});
	return {ids, entities}
}

function arrayDiff<T extends {id: number}>(originalArr1: T[], updatedArr2: T[]):
	{updates: {id: number; changes: Partial<T>}[];
	adds: T[];
	deletes: number[]};
function arrayDiff<T extends {id: string}>(originalArr1: T[], updatedArr2: T[]):
	{updates: {id: string; changes: Partial<T>}[];
	adds: T[];
	deletes: string[]};
function arrayDiff<T extends {id: number | string}>(originalArr1: T[], updatedArr2: T[]):
	{updates: {id: number | string; changes: Partial<T>}[];
	adds: T[];
	deletes: (number | string)[]}
{
	const updates: {id: number | string, changes: Partial<T>}[] = [];
	const deletes: (number | string)[] = [];
	let {ids: ids1, entities: entities1} = normalize(originalArr1);
	let {ids: ids2, entities: entities2} = normalize(updatedArr2);
	ids1.forEach(id1 => {
		if (entities2[id1]) {
			const changes = shallowDiff(entities1[id1], entities2[id1]);
			if (Object.keys(changes).length > 0)
				updates.push({id: id1, changes});
		}
		else {
			deletes.push(id1);
		}
		ids2 = ids2.filter(id2 => id2 !== id1);
	});
	const adds: T[] = ids2.map(id2 => entities2[id2]);
	return {updates, adds, deletes};
}

type MemberDetailProps = {
	style?: React.CSSProperties;
	className?: string;
	readOnly?: boolean;
	selected?: EntityId[];
	getAsMember?: (sapin: number) => MemberAdd | undefined;
};

type MemberDetailInternalProps = ConnectedMemberDetailProps & MemberDetailProps;

type Action = "add" | "update";

export type MultipleMember = Multiple<Omit<MemberAdd, "SAPIN" | "StatusChangeHistory" | "ContactEmails" | "ContactInfo">> & {
	SAPIN: number[];
	StatusChangeHistory: Member["StatusChangeHistory"];
	ContactEmails: Member["ContactEmails"];
	ContactInfo: Multiple<Member["ContactInfo"]>;
}

type MemberDetailState = ({
	action: "void";
	saved: null;
	edited: null;
} | {
	action: "update" | "add";
	saved: MultipleMember;
	edited: MultipleMember;
}) & {
	originals: MemberAdd[];
	message: string;
};

class MemberDetail extends React.Component<MemberDetailInternalProps, MemberDetailState>  {
	constructor(props: MemberDetailInternalProps) {
		super(props)
		this.state = this.initState("update");
	}

	initState = (action: Action): MemberDetailState => {
		const {members, selected, getAsMember} = this.props;

		if (selected.length === 0) {
			return {
				action: "void",
				edited: null,
				saved: null,
				originals: [],
				message: "Nothing selected"
			}
		}

		if (getAsMember) {
			if (selected.every(id => members[id])) {
				// All selected are existing members
				let diff = {} as MultipleMember;
				let originals: Member[] = [];
				selected.forEach(sapin => {
					const attendee = getAsMember(sapin as number);
					if (!attendee) {
						console.warn("Can't get member with SAPIN=" + sapin);
						return;
					}
					const member = members[sapin]!;
					const {Status, Access, SAPIN, ...rest} = attendee;
					const changes = shallowDiff(member, rest) as Partial<Member>;
					diff = deepMergeTagMultiple(diff, {...member, ...changes}) as MultipleMember;
					originals.push(member);
				});
				diff.SAPIN = selected as number[];
				return {
					action: "update",
					edited: diff,
					saved: diff,
					originals,
					message: ''
				}
			}
			else if (selected.every(id => !members[id])) {
				// All selected are new attendees
				let diff = {} as MultipleMember;
				let originals: MemberAdd[] = [];
				selected.forEach(sapin => {
					const attendee = getAsMember(sapin as number);
					if (!attendee) {
						console.warn("Can't get member with SAPIN=" + sapin);
						return;
					}
					const {Status, Access, SAPIN, ...rest} = attendee;
					diff = deepMergeTagMultiple(diff, rest) as MultipleMember;
					originals.push(attendee);
				});
				diff.SAPIN = selected as number[];
				return {
					action: "add",
					edited: diff,
					saved: diff,
					originals,
					message: ''
				}
			}
			else {
				return {
					action: "void",
					edited: null,
					saved: null,
					originals: [],
					message: "Mix of new attendees and existing members selected"
				}
			}
		}
		else {
			if (action === "add") {
				const entry: MultipleMember = {
					...defaultMember,
					SAPIN: [0],
					StatusChangeHistory: [],
					ContactEmails: [],
				}
				return {
					action: "add",
					edited: entry,
					saved: entry,
					originals: [],
					message: ''
				}
			}
			else {
				let diff = {} as MultipleMember;
				let originals: Member[] = [];
				selected.forEach(sapin => {
					const member = members[sapin];
					if (!member) {
						console.warn("Can't get member with SAPIN=" + sapin);
						return;
					}
					diff = deepMergeTagMultiple(diff, member) as MultipleMember;
					originals.push(member);
				});
				return {
					action: "update",
					edited: diff,
					saved: diff,
					originals,
					message: ''
				}
			}
		}
	}

	updateMember = (changes: Partial<Omit<Member, "SAPIN">>) => {
		const {readOnly} = this.props;
		const {action} = this.state;

		if (readOnly) {
			console.warn("Update when read-only")
			return;
		}

		if (action === "void") {
			console.warn("Update in bad state");
			return;
		}

		// merge changes
		this.setState({edited: {...this.state.edited, ...changes}})
	}

	hasUpdates = () => this.state.saved !== this.state.edited;

	clickAdd = async () => {
		const {action} = this.state;

		if (action === 'update' && this.hasUpdates()) {
			const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
			if (!ok)
				return;
		}

		this.setState(this.initState('add'));
	}

	clickDelete = async () => {
		const {originals} = this.state;
		if (originals.length === 0)
			return;
		const sapins = originals.map(o => o.SAPIN);
		const str =
			'Are you sure you want to delete:\n' +
			originals.map(o => `${o.SAPIN} ${o.Name}`).join('\n');
		const ok = await ConfirmModal.show(str);
		if (ok)
			await this.props.deleteMembers(sapins);
	}

	add = () => {
		const {addMembers} = this.props;
		const {action, edited, originals} = this.state;
		if (action !== "add") {
			console.warn("Add with unexpected state");
			return;
		}
		const newMembers = originals.map(m => {
			const changes = shallowDiff(m, edited);
			return {...m, ...changes};
		});
		addMembers(newMembers);
	}

	update = () => {
		const {action, edited, saved, originals} = this.state;
		if (action !== "update") {
			console.warn("Update with unexpected state");
			return;
		}
		const changes = shallowDiff(saved, edited) as Partial<Member>;
		if ('StatusChangeHistory' in changes) {
			const {updates, adds, deletes} = arrayDiff(saved.StatusChangeHistory, edited.StatusChangeHistory);
			originals.forEach(m => {
				if (updates.length > 0)
					this.props.updateMemberStatusChangeEntries(m.SAPIN, updates);
				if (deletes.length > 0)
					this.props.deleteMemberStatusChangeEntries(m.SAPIN, deletes);
				if (adds.length > 0)
					this.props.addMemberStatusChangeEntries(m.SAPIN, adds);
			});
			delete changes.StatusChangeHistory;
		}
		if (Object.keys(changes).length > 0) {
			const updates = originals.map(m => ({id: m.SAPIN, changes}));
			this.props.updateMembers(updates);
		}
		this.setState(state => ({...state, saved: edited}));
	}

	cancel = () => {
		this.setState(this.initState('update'));
	}

	render() {
		const {style, className, loading, readOnly} = this.props;
		const {originals, action, message} = this.state;

		const isSelected = originals.length > 0;

		return (
			<DetailContainer
				style={style}
				className={className}
			>
				<TopRow>
					{!readOnly &&
						<>
							<ActionButton
								name='add'
								title='Add member'
								disabled={loading}
								isActive={action === "add"}
								onClick={this.clickAdd}
							/>
							<ActionButton
								name='delete'
								title='Delete member'
								disabled={loading || !isSelected}
								onClick={this.clickDelete}
							/>
						</>}
				</TopRow>
				{action === "void" || loading?
					<NotAvaialble>
						<span>{loading? "Loading...": message}</span>
				 	</NotAvaialble>:
					<MemberEntryForm
						action={action}
						member={this.state.edited}
						updateMember={this.updateMember}
						submit={action === "update"? this.update: this.add}
						cancel={this.cancel}
						readOnly={readOnly}
					/>
				}
			</DetailContainer>
		)
	}
}

const connector = connect(
	(state: RootState, props: MemberDetailProps) => {
		const members = selectMembersState(state);
		return {
			members: members.entities,
			loading: members.loading,
			selected: props.selected? props.selected: members.selected,
			uiProperties: selectUiProperties(state),
		}
	},
	{
		addMembers,
		updateMembers,
		addMemberStatusChangeEntries,
		updateMemberStatusChangeEntries,
		deleteMemberStatusChangeEntries,
		deleteMembers,
		setUiProperties,
	}
);

type ConnectedMemberDetailProps = ConnectedProps<typeof connector>

const ConnectedMemberDetail = connector(MemberDetail);

export default ConnectedMemberDetail;
