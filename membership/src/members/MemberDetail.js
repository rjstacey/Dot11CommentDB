import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {shallowDiff, recursivelyDiffObjects, isMultiple, debounce, displayDate} from 'dot11-components/lib'
import {ConfirmModal} from 'dot11-components/modals'
import {Row, Col, List, ListItem, Field, FieldLeft, Checkbox, Input} from 'dot11-components/general/Form'
import {IconCollapse, ActionButton, Icon} from 'dot11-components/icons'
import {
	updateMembers, 
	deleteMembers, 
	updateMemberStatusChange,
	deleteMemberStatusChange,
	addMemberContactEmail,
	updateMemberContactEmail,
	deleteMemberContactEmail,
	setMemberUiProperty
} from '../store/members'
import {setProperty} from 'dot11-components/store/ui'
import {getData, getSortedFilteredIds} from 'dot11-components/store/dataSelectors'
import StatusSelector from './StatusSelector'
import AccessSelector from './AccessSelector'
import MemberSelector from './MemberSelector'
import {SessionTypeOptions} from '../store/sessions'
import {loadBallots} from '../store/ballots'
import {loadSessions} from '../store/sessions'

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

function MemberStatusChangeHistory({
	member,
	setMember,
	updateStatusChange,
	deleteStatusChange,
	uiProperties,
	setUiProperty,
	readOnly
}) {
	const history = Array.isArray(member.StatusChangeHistory)? member.StatusChangeHistory: [];

	/*const addRow = () => {
		const defaultEmail = {Email: '', Primary: false, Broken: false, DateAdded: new Date()};
		setMember({ContactEmails: [defaultEmail, ...contactEmails]})
	}*/

	const rows = history.map(row =>
		<tr key={row.id}>
			<td>{displayDate(row.Date)}</td>
			<td>{row.OldStatus}</td>
			<td>{row.NewStatus}</td>
			<td>
				<Input type='text'
					style={{width: '100%'}}
					value={row.Reason}
					onChange={e => updateStatusChange(row.id, {Reason: e.target.value})}
					disabled={readOnly}
				/>
			</td>
			<td style={{textAlign: 'right'}}>
				<Icon name='delete' onClick={() => deleteStatusChange(row.id)} disabled={readOnly} />
			</td>
		</tr>
	);

	const empty = <tr><td style={{textAlign: 'center', fontStyle: 'italic', color: 'gray'}} colSpan={5}>Empty</td></tr>

	return (
		<Col>
			<Row>
				<label>Status change history:</label>
				<IconCollapse
					isCollapsed={!uiProperties.showStatusChangeHistory}
					onClick={() => setUiProperty('showStatusChangeHistory', !uiProperties.showStatusChangeHistory)}
				/>
			</Row>
			{uiProperties.showStatusChangeHistory && rows.length > 0 &&
				<table>
					<thead>
						<tr>
							<td>Date</td>
							<td>Old status</td>
							<td>New status</td>
							<td>Reason</td>
							<td style={{textAlign: 'right'}}></td>
						</tr>
					</thead>
					<tbody>
						{rows}
					</tbody>
				</table>}
		</Col>
	)
}

function MemberBallotSeriesParticipation({
	member,
	setMember,
	uiProperties,
	setUiProperty,
	readOnly
}) {
	const ballotSeriesSummary = member.BallotSeriesSummary;

	const change = (id, field, value) => {
		let summary = {...ballotSeriesSummary[id], [field]: value};
		setMember({BallotSeriesSummary: {...ballotSeriesSummary, [id]: summary}});
	}

	let rows = [], participation = '';
	if (ballotSeriesSummary) {
		rows = Object.entries(ballotSeriesSummary).map(([id, summary]) => {
			const voteSummary = summary.Vote?
					summary.BallotID + '/' + summary.Vote + '/' + summary.CommentCount:
					'Did not vote';
			return (
				<tr key={id}>
					<td>{summary.Project}</td>
					<td>{summary.BallotIDs}</td>
					<td>{displayDate(summary.Start)}</td>
					<td>{displayDate(summary.End)}</td>
					<td>{voteSummary}</td>
					<td style={{textAlign: 'center'}}>
						<Checkbox
							checked={!!summary.Excused}
							onChange={e => change(id, 'Excused', e.target.checked? 1: 0)}
							disabled={readOnly}
						/>
					</td>
					<td>{summary.SAPIN !== member.SAPIN? summary.SAPIN: ''}</td>
				</tr>
			)
		});
		participation = `${member.BallotSeriesCount}/${member.BallotSeriesTotal}`;
	}

	return (
		<Col>
			<Row>
				<label>Recent ballot series participation: {participation}</label>
				<IconCollapse
					isCollapsed={!uiProperties.showBallotParticipation}
					onClick={() => setUiProperty('showBallotParticipation', !uiProperties.showBallotParticipation)}
				/>
			</Row>
			{uiProperties.showBallotParticipation && rows.length > 0 &&
				<table>
					<thead>
						<tr>
							<td>Project</td>
							<td>Ballot series</td>
							<td>Start</td>
							<td>End</td>
							<td>Last vote</td>
							<td style={{textAlign: 'center'}}>Excused</td>
							<td>SA PIN</td>
						</tr>
					</thead>
					<tbody>
						{rows}
					</tbody>
				</table>}
		</Col>
	)
}

const sessionTypeLabel = (type) => {
	const o = SessionTypeOptions.find(s => s.value === type);
	return o? o.label: '';
}

function MemberAttendances({
	member,
	setMember,
	sessions,
	uiProperties,
	setUiProperty,
	readOnly
}) {
	const attendances = member.Attendances || [];

	// Sort by session date (newest fist)
	const session_ids = Object.keys(attendances)
		.filter(k => sessions[k])
		.sort((k1, k2) => sessions[k2].Start - sessions[k1].Start);

	const change = (session_id, field, value) => {
		let attendance = {...attendances[session_id], [field]: value};
		if (field === 'DidAttend' && value && attendance.DidNotAttend)
			attendance = {...attendance, DidNotAttend: 0}
		if (field === 'DidNotAttend' && value && attendance.DidAttend)
			attendance = {...attendance, DidAttend: 0}
		setMember({Attendances: {...attendances, [session_id]: attendance}});
	}

	const rows = session_ids.map((session_id) => {
		const a = attendances[session_id];
		const s = sessions[session_id];
		return (
			<tr key={session_id}>
				<td>{displayDate(s.Start)}</td>
				<td>{sessionTypeLabel(s.Type)}</td>
				<td style={{textAlign: 'right'}}>{a.AttendancePercentage.toFixed(0)}%</td>
				<td style={{textAlign: 'center'}}>
					<Checkbox
						checked={a.DidAttend}
						onChange={e => change(session_id, 'DidAttend', e.target.checked)}
						disabled={readOnly}
					/>
				</td>
				<td style={{textAlign: 'center'}}>
					<Checkbox
						checked={a.DidNotAttend}
						onChange={e => change(session_id, 'DidNotAttend', e.target.checked)}
						disabled={readOnly}
					/>
				</td>
				<td>
					<Input type='text'
						value={a.Notes || ''}
						onChange={e => change(session_id, 'Notes', e.target.value)}
						disabled={readOnly}
					/>
				</td>
				<td>
					{a.SAPIN !== member.SAPIN? a.SAPIN: ''}
				</td>
			</tr>
		)
	});

	const empty = <tr><td style={{textAlign: 'center', fontStyle: 'italic', color: 'gray'}} colSpan={6}>Empty</td></tr>

	const attendance = member.AttendanceCount + '/' + Object.keys(attendances).length;

	return (
		<Col>
			<Row>
				<label>Recent session attendance: {attendance}</label>
				<IconCollapse
					isCollapsed={!uiProperties.showAttendance}
					onClick={() => setUiProperty('showAttendance', !uiProperties.showAttendance)}
				/>
			</Row>
			{uiProperties.showAttendance &&
				<table>
					<thead>
						<tr>
							<td>Date</td>
							<td>Type</td>
							<td style={{textAlign: 'right'}}>Attendance</td>
							<td style={{textAlign: 'center'}}>Did Attend</td>
							<td style={{textAlign: 'center'}}>Did Not Attend</td>
							<td>Notes</td>
							<td>SA PIN</td>
						</tr>
					</thead>
					<tbody>
						{rows.length > 0? rows: empty}
					</tbody>
				</table>}
		</Col>
	)
}

const ContactInfoField = styled.div`
	display: flex;
	align-items: center;
	div:first-of-type {
		font-weight: bold;
		width: 100px;
	}
`;

const ContactInfoFields = [
	{key: 'StreetLine1', label: 'Street', size: 36},
	{key: 'StreetLine2', label: '', size: 36},
	{key: 'City', label: 'City', size: 20},
	{key: 'State', label: 'State', size: 20},
	{key: 'Zip', label: 'Zip/Code'},
	{key: 'Country', label: 'Country'},
	{key: 'Phone', label: 'Phone'},
];

function MemberContactInfo({
	member,
	setMember,
	addContactEmail,
	updateContactEmail,
	deleteContactEmail,
	uiProperties,
	setUiProperty
}) {
	const i = member.ContactInfo || {};

	const rows = ContactInfoFields.map(f => 
		<ContactInfoField key={f.key} >
			<div>{f.label}</div>
			<Input
				type='text'
				size={f.size}
				value={i[f.key]}
				onChange={e => setMember({ContactInfo: {...i, [f.key]: e.target.value}})}
			/>
		</ContactInfoField>
	);

	return (
		<Col>
			<Row>
				<label>Contact information:</label>
				<IconCollapse
					isCollapsed={!uiProperties.showContactInfo}
					onClick={() => setUiProperty('showContactInfo', !uiProperties.showContactInfo)}
				/>
			</Row>
			{uiProperties.showContactInfo &&
				<Col style={{marginLeft: 10}}>
					<MemberContactEmails
						member={member}
						setMember={setMember}
						addContactEmail={addContactEmail}
						updateContactEmail={updateContactEmail}
						deleteContactEmail={deleteContactEmail}
					/>
					{rows}
				</Col>}
		</Col>
	)
}

function MemberContactEmails({
	member,
	setMember,
	addContactEmail,
	updateContactEmail,
	deleteContactEmail
}) {
	const contactEmails = Array.isArray(member.ContactEmails)? member.ContactEmails: [];
	const disableAdd = contactEmails.length > 0 && contactEmails[0].Email === ''; 

	const addRow = () => {
		const defaultEmail = {Email: '', Primary: false, Broken: false, DateAdded: new Date()};
		setMember({ContactEmails: [defaultEmail, ...contactEmails]})
	}

	const deleteRow = (index) => {
		const newContactEmails = contactEmails.filter((e, i) => i !== index);
		setMember({ContactEmails: newContactEmails});
	}

	const changeRow = (index, field, value) => {
		const newContactEmails = contactEmails.slice();
		newContactEmails[index] = {...newContactEmails[index], [field]: value};
		setMember({ContactEmails: newContactEmails});
	}

	const rows = contactEmails.map(row =>
		<tr key={row.id}>
			<td>
				<Input type='text'
					style={{width: '100%'}}
					value={row.Email}
					onChange={e => updateContactEmail(row.id, {Email: e.target.value})}
				/>
			</td>
			<td style={{textAlign: 'center'}}>
				<Checkbox 
					checked={row.Primary}
					onChange={e => updateContactEmail(row.id, {Primary: e.target.checked})}
				/>
			</td>
			<td style={{textAlign: 'center'}}>
				<Checkbox
					checked={row.Broken}
					onChange={e => updateContactEmail(row.id, {Broken: e.target.checked})}
				/>
			</td>
			<td style={{textAlign: 'right'}}>
				{displayDate(row.DateAdded)}
			</td>
			<td style={{textAlign: 'right'}}>
				<Icon name='delete' onClick={() => deleteContactEmail(row.id)} />
			</td>
		</tr>
	);

	const empty = <tr><td style={{textAlign: 'center', fontStyle: 'italic', color: 'gray'}} colSpan={5}>No contact email</td></tr>

	return (
		<table>
			<thead>
				<tr>
					<td>Email</td>
					<td style={{textAlign: 'center'}}>Primary</td>
					<td style={{textAlign: 'center'}}>Broken</td>
					<td style={{textAlign: 'right'}}>Date Added</td>
					<td style={{textAlign: 'right'}}>
						<Icon name='add' disabled={disableAdd} onClick={() => addContactEmail({})} />
					</td>
				</tr>
			</thead>
			<tbody>
				{rows.length > 0? rows: empty}
			</tbody>
		</table>
	)
}

function ShortMemberSummary({sapins, members}) {
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

const MemberContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function Member({
	sapins,
	members,
	sessions,
	member,
	setMember,
	updateStatusChange,
	deleteStatusChange,
	addContactEmail,
	updateContactEmail,
	deleteContactEmail,
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
				<FieldLeft label='Date added:'>{isMultiple(member.DateAdded)? MULTIPLE_STR: displayDate(member.DateAdded)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Name:'>{member.Name}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Email:'>{member.Email}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Employer:'>{member.Employer}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Affiliation:'>{member.Affiliation}</FieldLeft>
			</Row>
			<Row>
				<Field label='Status:'>
					<StatusSelector
						style={{flexBasis: 200}}
						value={isMultiple(member.Status)? null: member.Status}
						onChange={value => setMember({Status: value})}
						placeholder={isMultiple(member.Status)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<label>Override</label>
						<Checkbox 
							checked={member.StatusChangeOverride}
							indeterminate={isMultiple(member.StatusChangeOverride)}
							onChange={e => setMember({StatusChangeOverride: e.target.checked? 1: 0})}
							disabled={readOnly}
						/>
					</div>
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<label>Last change</label>
						<div>
							{isMultiple(member.StatusChangeDate)?
								MULTIPLE_STR:
								displayDate(member.StatusChangeDate) || BLANK_STR}
						</div>
					</div>
				</Field>
			</Row>
			<Row>
				<MemberStatusChangeHistory
					member={member}
					setMember={setMember}
					updateStatusChange={updateStatusChange}
					deleteStatusChange={deleteStatusChange}
					uiProperties={uiProperties}
					setUiProperty={setUiProperty}
					readOnly={readOnly}
				/>
			</Row>
			{member.Status === 'Obsolete' &&
				<Row>
					<Field label='Replaced by:'>
						<MemberSelector
							style={{maxWidth: 400, flex: 1}}
							value={isMultiple(member.ReplacedBySAPIN)? null: member.ReplacedBySAPIN}
							onChange={value => setMember({ReplacedBySAPIN: value})}
							placeholder={isMultiple(member.Status)? MULTIPLE_STR: BLANK_STR}
							readOnly={readOnly}
						/>
					</Field>
				</Row>}
			<Row>
				<Field label='Access:'>
					<AccessSelector
						style={{flexBasis: 200}}
						value={isMultiple(member.Access)? null: member.Access}
						onChange={value => setMember({Access: value})}
						placeholder={isMultiple(member.Access)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
				{sapins.length === 1 && <>
					{member.ObsoleteSAPINs.length > 0 &&
						<Row>
							<Col>
								<label>Replaces:</label>
								<ShortMemberSummary sapins={member.ObsoleteSAPINs} members={members} />
							</Col>
						</Row>}
					<Row>
						<MemberContactInfo
							member={member} 
							setMember={setMember}
							addContactEmail={addContactEmail}
							updateContactEmail={updateContactEmail}
							deleteContactEmail={deleteContactEmail}
							uiProperties={uiProperties}
							setUiProperty={setUiProperty}
							readOnly={readOnly}
						/>
					</Row>
					<Row>
						<MemberAttendances
							member={member}
							setMember={setMember}
							sessions={sessions}
							uiProperties={uiProperties}
							setUiProperty={setUiProperty}
							readOnly={readOnly}
						/>
					</Row>
					<Row>
						<MemberBallotSeriesParticipation
							member={member}
							setMember={setMember}
							uiProperties={uiProperties}
							setUiProperty={setUiProperty}
							readOnly={readOnly}
						/>
					</Row>
				</>}
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
		if (!this.props.ballotsValid)
			this.props.loadBallots();
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
		// merge in the edits and trigger a debounced save
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

	addContactEmail = (entry) => {
		const {edited} = this.state;
		this.props.addMemberContactEmail(edited.SAPIN, entry);
	}

	updateContactEmail = (id, changes) => {
		const {edited} = this.state;
		this.props.updateMemberContactEmail(edited.SAPIN, {id, ...changes});
		const ContactEmails = edited.ContactEmails.map(h => h.id === id? {...h, ...changes}: h);
		this.updateMember({ContactEmails});
	}

	deleteContactEmail = (id) => {
		const {edited} = this.state;
		this.props.deleteMemberContactEmail(edited.SAPIN, id);
	}

	handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected members?');
		if (ok)
			await this.props.deleteSelectedMembers();
	}

	handleToggleEditMember = () => this.props.setUiProperty('editMember', !this.props.uiProperties.editMember);

	save = () => {
		const {edited, saved, originals} = this.state;
		const d = shallowDiff(saved, edited);
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
		const {style, className, loading, uiProperties, readOnly, members, selected} = this.props;
		const {edited} = this.state;

		if (selected.length === 1) {
			const member = members[selected[0]];
			if (edited.ContactEmails.length !== member.ContactEmails.length)
				this.setState({edited: {...edited, ContactEmails: member.ContactEmails}});
			if (edited.StatusChangeHistory.length !== member.StatusChangeHistory.length)
				this.setState({edited: {...edited, StatusChangeHistory: member.StatusChangeHistory}});
		}

		let notAvailableStr
		if (loading)
			notAvailableStr = 'Loading...';
		else if (this.state.originals.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string

		return (
			<DetailContainer
				style={style}
				className={className}
			>
				<TopRow>
					{!this.readOnly && <>
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
						members={members}
						sessions={this.props.sessions}
						setMember={this.updateMember}
						updateStatusChange={this.updateStatusChange}
						deleteStatusChange={this.deleteStatusChange}
						addContactEmail={this.addContactEmail}
						updateContactEmail={this.updateContactEmail}
						deleteContactEmail={this.deleteContactEmail}
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
		ballotsValid: PropTypes.bool.isRequired,
		ballots: PropTypes.object.isRequired,
		uiProperties: PropTypes.object.isRequired,
		updateMembers: PropTypes.func.isRequired,
		updateMemberStatusChange: PropTypes.func.isRequired,
		deleteMemberStatusChange: PropTypes.func.isRequired,
		loadBallots: PropTypes.func.isRequired,
		loadSessions: PropTypes.func.isRequired,
		setUiProperty: PropTypes.func.isRequired
	}
}

const dataSet = 'members';

const ConnectedMemberDetail = connect(
	(state) => {
		const members = state[dataSet];
		return {
			members: members.entities,
			loading: members.loading,
			selected: members.selected,
			uiProperties: members.ui,
			sessionsValid: state.sessions.valid,
			sessions: state.sessions.entities,
			ballotsValid: state.ballots.valid,
			ballots: state.ballots.entities,
		}
	},
	{
		updateMembers,
		updateMemberStatusChange,
		deleteMemberStatusChange,
		addMemberContactEmail,
		updateMemberContactEmail,
		deleteMemberContactEmail,
		loadBallots,
		loadSessions,
		setUiProperty: (property, value) => setProperty(dataSet, property, value),
	}
)(MemberDetail);

ConnectedMemberDetail.propTypes = {
	readOnly: PropTypes.bool,
}

export default ConnectedMemberDetail;
