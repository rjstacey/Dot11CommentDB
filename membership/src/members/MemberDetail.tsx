import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import type { EntityId } from '@reduxjs/toolkit';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { useAppSelector, useAppDispatch } from '../store/hooks';
import type { RootState } from '../store';

import {
	ActionButton, Row, Col, Field, FieldLeft, Checkbox,
	ConfirmModal,
	shallowDiff, recursivelyDiffObjects, isMultiple, debounce
} from 'dot11-components';

import {
	setUiProperties,
	selectUiProperties,
	updateMembers,
	deleteMembers,
	updateMemberStatusChange,
	deleteMemberStatusChange,
	selectMembersState,
	selectMemberEntities,
	Member,
	StatusChangeType
} from '../store/members';

import { selectMemberAttendancesCount } from '../store/attendances';
import { selectMemberBallotParticipationCount } from '../store/ballotParticipation';

import StatusSelector from './StatusSelector';
import MemberSelector from './MemberSelector';
import MemberStatusChangeHistory from './MemberStatusChange';
import MemberContactInfo from './MemberContactInfo';
import MemberPermissions from './MemberPermissions';
import MemberAttendances from '../attendances/MemberAttendances';
import MemberBallotParticipation from '../ballotParticipation/MemberBallotParticipation';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

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

const renderString = (value: any) => isMultiple(value)? <i>{MULTIPLE_STR}</i>: (value === null || value === '')? <i>{BLANK_STR}</i>: value;

const renderDate = (value: any) => isMultiple(value)? <i>{MULTIPLE_STR}</i>: (value === null || value === '')? <i>{BLANK_STR}</i>: displayDate(value);

const renderEmail = (value: any) => isMultiple(value)? <i>{MULTIPLE_STR}</i>: (value === null || value === '')? <i>{BLANK_STR}</i>: <a href={'mailto:' + value}>{value}</a>;

function MemberDetailInfo({
	member,
	updateMember,
	updateStatusChange,
	deleteStatusChange,
	readOnly
}: {
	member: Member;
	updateMember: (changes: Partial<Member>) => void;
	updateStatusChange: (id: number, changes: {}) => void;
	deleteStatusChange: (id: number) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const {tabIndex} = useAppSelector(selectUiProperties);
	const setTabIndex = (tabIndex: number) => {dispatch(setUiProperties({tabIndex}))};
	const {count: sessionCount, total: sessionTotal} = useAppSelector((state) => selectMemberAttendancesCount(state, member));
	const {count: ballotCount, total: ballotTotal} = useAppSelector((state) => selectMemberBallotParticipationCount(state, member));

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
					updateStatusChange={updateStatusChange}
					deleteStatusChange={deleteStatusChange}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberAttendances
					member={member}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberBallotParticipation
					member={member}
					readOnly={readOnly}
				/>
			</TabPanel>
		</Tabs>
	)
}

const MemberContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function MemberEntry({
	sapins,
	member,
	updateMember,
	updateStatusChange,
	deleteStatusChange,
	readOnly
}: {
	sapins: number[];
	member: Member;
	updateMember: (changes: Partial<Member>) => void;
	updateStatusChange: (id: number, changes: {}) => void;
	deleteStatusChange: (id: number) => void;
	readOnly?: boolean;
}) {
	const sapinsStr = sapins.join(', ');
	const sapinsLabel = sapins.length > 1? 'SA PINs:': 'SA PIN:';

	return (
		<MemberContainer>
			<Row>
				<FieldLeft label={sapinsLabel}>{sapinsStr}</FieldLeft>
				<FieldLeft label='Date added:'>{renderDate(member.DateAdded)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Name:'>{renderString(member.Name)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Email:'>{renderEmail(member.Email)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Employer:'>{renderString(member.Employer)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Affiliation:'>{renderString(member.Affiliation)}</FieldLeft>
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
			{member.Status === 'Obsolete'?
				<Row>
					<Field label='Replaced by:'>
						<MemberSelector
							style={{maxWidth: 400, flex: 1}}
							value={isMultiple(member.ReplacedBySAPIN)? null: member.ReplacedBySAPIN}
							onChange={value => updateMember({ReplacedBySAPIN: value})}
							placeholder={isMultiple(member.ReplacedBySAPIN)? MULTIPLE_STR: BLANK_STR}
							readOnly={readOnly}
						/>
					</Field>
				</Row>:
				sapins.length === 1 &&
					<>
						{member.ObsoleteSAPINs.length > 0 &&
							<Row>
								<Col>
									<label>Replaces:</label>
									<ShortMemberSummary sapins={member.ObsoleteSAPINs} />
								</Col>
							</Row>}
						<Row>
							<MemberDetailInfo
								member={member} 
								updateMember={updateMember}
								updateStatusChange={updateStatusChange}
								deleteStatusChange={deleteStatusChange}
								readOnly={readOnly}
							/>
						</Row>
					</>
			}
		</MemberContainer>
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

type MemberDetailProps = {
	style?: React.CSSProperties;
	className?: string;
	readOnly?: boolean;
};

type MemberDetailInternalProps = ConnectedMemberDetailProps & MemberDetailProps;

type MemberDetailState = {
	saved: Member | {};
	edited: Member | {};
	originals: Member[];
};

class MemberDetail extends React.Component<MemberDetailInternalProps, MemberDetailState>  {
	constructor(props: MemberDetailInternalProps) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	triggerSave: ReturnType<typeof debounce>;

	componentDidMount() {
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props: MemberDetailInternalProps) => {
		const {members, selected} = props;
		let diff: Member | {} = {};
		let originals: Member[] = [];
		for (const sapin of selected) {
			const member = members[sapin];
			if (member) {
				diff = recursivelyDiffObjects(diff, member) as Member;
				originals.push(member);
			}
		}
		return {
			saved: diff,
			edited: diff,
			originals
		};
	}

	updateMember = (changes: Partial<Member>) => {
		const {readOnly, uiProperties} = this.props;
		if (readOnly || !uiProperties.editMember) {
			console.warn("Update when read-only")
			return;
		}
		// merge the edits and trigger a debounced save
		this.setState(
			state => ({...state, edited: {...state.edited, ...changes}}),
			this.triggerSave
		);
	}

	updateStatusChange = (id: number, changes: Partial<StatusChangeType>) => {
		const edited = this.state.edited as Member;
		this.props.updateMemberStatusChange(edited.SAPIN, {id, ...changes});
		const StatusChangeHistory = edited.StatusChangeHistory.map(h => h.id === id? {...h, ...changes}: h);
		this.updateMember({StatusChangeHistory});
	}

	deleteStatusChange = (id: number) => {
		const edited = this.state.edited as Member;
		this.props.deleteMemberStatusChange(edited.SAPIN, id);
		const StatusChangeHistory = edited.StatusChangeHistory.filter(h => h.id !== id);
		this.setState({edited: {...edited, StatusChangeHistory}});
	}

	handleRemoveSelected = async () => {
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

	handleToggleEditMember = () => this.props.setUiProperties({editMember: !this.props.uiProperties.editMember});

	save = () => {
		const {edited, saved, originals} = this.state;
		const d = shallowDiff(saved, edited) as Partial<Member>;
		console.log(d)
		delete d.StatusChangeHistory;
		const updates = [];
		for (const m of originals) {
			if (Object.keys(d).length > 0)
				updates.push({id: m.SAPIN, changes: d});
		}
		if (updates.length > 0)
			this.props.updateMembers(updates);
		this.setState(state => ({...state, saved: edited}));
	}

	render() {
		const {style, className, loading, uiProperties, readOnly} = this.props;
		const {originals} = this.state;

		let notAvailableStr
		if (loading)
			notAvailableStr = 'Loading...';
		else if (originals.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string

		return (
			<DetailContainer
				style={style}
				className={className}
			>
				<TopRow>
					{!this.props.readOnly &&
						<>
							<ActionButton
								name='edit'
								title='Edit member'
								disabled={disableButtons}
								isActive={uiProperties.editMember}
								onClick={this.handleToggleEditMember}
							/>
							<ActionButton
								name='delete'
								title='Delete member'
								disabled={disableButtons}
								onClick={this.handleRemoveSelected}
							/>
						</>}
				</TopRow>
				{notAvailableStr?
					<NotAvaialble>
						<span>{notAvailableStr}</span>
				 	</NotAvaialble>:
					<MemberEntry
						sapins={this.props.selected as number[]}
						member={this.state.edited as Member}
						updateMember={this.updateMember}
						updateStatusChange={this.updateStatusChange}
						deleteStatusChange={this.deleteStatusChange}
						readOnly={readOnly || !uiProperties.editMember}
					/>
				}
			</DetailContainer>
		)
	}
}

const connector = connect(
	(state: RootState, props: {selected?: EntityId[]}) => {
		const members = selectMembersState(state);
		return {
			members: members.entities,
			loading: members.loading,
			selected: props.selected? props.selected: members.selected,
			uiProperties: selectUiProperties(state),
		}
	},
	{
		updateMembers,
		updateMemberStatusChange,
		deleteMemberStatusChange,
		deleteMembers,
		setUiProperties,
	}
);

type ConnectedMemberDetailProps = ConnectedProps<typeof connector>

const ConnectedMemberDetail = connector(MemberDetail);

export default ConnectedMemberDetail;
