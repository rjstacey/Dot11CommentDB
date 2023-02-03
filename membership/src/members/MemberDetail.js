import PropTypes from 'prop-types';
import React from 'react';
import {connect, useSelector, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import {shallowDiff, recursivelyDiffObjects, isMultiple, debounce} from 'dot11-components/lib';
import {ConfirmModal} from 'dot11-components/modals';
import {ActionButton, Row, Col, Field, FieldLeft, Checkbox} from 'dot11-components/form';
import {setProperty} from 'dot11-components/store/appTableData';
import {
	updateMembers,
	deleteMembers,
	updateMemberStatusChange,
	deleteMemberStatusChange,
	selectMembersState,
	selectMemberEntities,
	dataSet,
	getField
} from '../store/members';

import {loadSessions} from '../store/sessions';

import StatusSelector from './StatusSelector';
import MemberSelector from './MemberSelector';
import MemberStatusChangeHistory from './MemberStatusChange';
import MemberContactInfo from './MemberContactInfo';
import MemberPermissions from './MemberPermissions';
import MemberAttendances from './MemberAttendances';
import MemberBallotParticipation from './MemberBallotParticipation';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const displayDate = (isoDateTime) => DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);


function ShortMemberSummary({sapins}) {
	const members = useSelector(selectMemberEntities);

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

const renderString = (value) => isMultiple(value)? <i>{MULTIPLE_STR}</i>: (value === null || value === '')? <i>{BLANK_STR}</i>: value;

const renderDate = (value) => isMultiple(value)? <i>{MULTIPLE_STR}</i>: (value === null || value === '')? <i>{BLANK_STR}</i>: displayDate(value);

const renderEmail = (value) => isMultiple(value)? <i>{MULTIPLE_STR}</i>: (value === null || value === '')? <i>{BLANK_STR}</i>: <a href={'mailto:' + value}>{value}</a>;

function selectMemberDetailTabIndex(state) {
	const members = selectMembersState(state);
	return members.ui.tabIndex;
}

function MemberDetailInfo({
	sapins,
	member,
	updateMember,
	updateStatusChange,
	deleteStatusChange,
	readOnly
}) {
	const dispatch = useDispatch();
	const tabIndex = useSelector(selectMemberDetailTabIndex);
	const setTabIndex = (index) => dispatch(setProperty(dataSet, 'tabIndex', index));

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
				<Tab>Session participation {getField(member, 'AttendancesSummary')}</Tab>
				<Tab>Ballot participation {getField(member, 'BallotSeriesSummary')}</Tab>
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
					updateStatusChange={updateStatusChange}
					deleteStatusChange={deleteStatusChange}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberAttendances
					member={member}
					updateMember={updateMember}
					readOnly={readOnly}
				/>
			</TabPanel>
			<TabPanel>
				<MemberBallotParticipation
					member={member}
					updateMember={updateMember}
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

function Member({
	sapins,
	member,
	updateMember,
	updateStatusChange,
	deleteStatusChange,
	uiProperties,
	setUiProperty,
	readOnly
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
						value={isMultiple(member.Status)? null: member.Status}
						onChange={value => updateMember({Status: value})}
						placeholder={isMultiple(member.Status)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<label>Override</label>
						<Checkbox 
							checked={member.StatusChangeOverride}
							indeterminate={isMultiple(member.StatusChangeOverride)}
							onChange={e => updateMember({StatusChangeOverride: e.target.checked? 1: 0})}
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

class MemberDetail extends React.Component {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	componentDidMount() {
		if (!this.props.sessionsValid)
			this.props.loadSessions();
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props) => {
		const {members, selected} = props;
		let diff = {}, originals = [];
		for (const sapin of selected) {
			const member = members[sapin];
			if (member) {
				diff = recursivelyDiffObjects(diff, member);
				originals.push(member);
			}
		}
		return {
			saved: diff,
			edited: diff,
			originals: originals
		};
	}

	updateMember = (changes) => {
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

	updateStatusChange = (id, changes) => {
		const {edited} = this.state;
		this.props.updateMemberStatusChange(edited.SAPIN, {id, ...changes});
		const StatusChangeHistory = edited.StatusChangeHistory.map(h => h.id === id? {...h, ...changes}: h);
		this.updateMember({StatusChangeHistory});
	}

	deleteStatusChange = (id) => {
		const {edited} = this.state;
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

	handleToggleEditMember = () => this.props.setUiProperty('editMember', !this.props.uiProperties.editMember);

	save = () => {
		const {edited, saved, originals} = this.state;
		const d = shallowDiff(saved, edited);
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
					{!this.readOnly &&
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
					<Member 
						sapins={this.props.selected}
						member={this.state.edited}
						updateMember={this.updateMember}
						updateStatusChange={this.updateStatusChange}
						deleteStatusChange={this.deleteStatusChange}
						uiProperties={uiProperties}
						setUiProperty={this.props.setUiProperty}
						readOnly={readOnly || !uiProperties.editMember}
					/>
				}
			</DetailContainer>
		)
	}

	static propTypes = {
		members: PropTypes.object.isRequired,
		loading: PropTypes.bool.isRequired,
		selected: PropTypes.array.isRequired,
		sessionsValid: PropTypes.bool.isRequired,
		sessions: PropTypes.object.isRequired,
		uiProperties: PropTypes.object.isRequired,
		updateMembers: PropTypes.func.isRequired,
		updateMemberStatusChange: PropTypes.func.isRequired,
		deleteMemberStatusChange: PropTypes.func.isRequired,
		loadSessions: PropTypes.func.isRequired,
		setUiProperty: PropTypes.func.isRequired
	}
}

const ConnectedMemberDetail = connect(
	(state) => {
		const members = selectMembersState(state);
		return {
			members: members.entities,
			loading: members.loading,
			selected: members.selected,
			uiProperties: members.ui,
			sessionsValid: state.sessions.valid,
			sessions: state.sessions.entities,
		}
	},
	{
		updateMembers,
		updateMemberStatusChange,
		deleteMemberStatusChange,
		loadSessions,
		deleteMembers,
		setUiProperty: (property, value) => setProperty(dataSet, property, value),
	}
)(MemberDetail);

ConnectedMemberDetail.propTypes = {
	readOnly: PropTypes.bool,
}

export default ConnectedMemberDetail;
