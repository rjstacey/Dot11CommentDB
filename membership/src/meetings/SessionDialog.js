import PropTypes from 'prop-types'
import React from 'react'
import {connect, useDispatch} from 'react-redux'
import styled from '@emotion/styled'
import {Link} from "react-router-dom"
import {shallowDiff, debounce} from 'dot11-components/lib'
import {ConfirmModal} from 'dot11-components/modals'
import {Button, ActionButton} from 'dot11-components/icons'
import {Form, Row, Field, Input, Select} from 'dot11-components/general/Form'
import {AppModal} from 'dot11-components/modals'
import TimeZoneSelector from './TimeZoneSelector'
import {addSession, updateSession, loadSessions, deleteSessions, setSessionsUiProperty, SessionTypeOptions} from '../store/sessions'
import {importBreakouts} from '../store/breakouts'
import {importAttendances} from '../store/attendees'

const MULTIPLE = '<multiple>';
const isMultiple = (value) => value === MULTIPLE;
const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

function recursivelyDiffObjects(l, r) {
	const isObject = o => o != null && typeof o === 'object';
	const isDate = d => d instanceof Date;
	const isEmpty = o => Object.keys(o).length === 0;

	if (l === r) return l;

	if (!isObject(l) || !isObject(r))
		return MULTIPLE;

	if (isDate(l) || isDate(r)) {
		if (l.valueOf() === r.valueOf()) return l;
		return MULTIPLE;
	}

	if (Array.isArray(l) && Array.isArray(r)) {
		if (l.length === r.length) {
			return l.map((v, i) => recursivelyDiffObjects(l[i], r[i]))
		}
	}
	else {
		const deletedValues = Object.keys(l).reduce((acc, key) => {
			return r.hasOwnProperty(key) ? acc : { ...acc, [key]: MULTIPLE };
		}, {});

		return Object.keys(r).reduce((acc, key) => {
			if (!l.hasOwnProperty(key)) return { ...acc, [key]: r[key] }; // return added r key

			const difference = recursivelyDiffObjects(l[key], r[key]);

			if (isObject(difference) && isEmpty(difference) && !isDate(difference)) return acc // return no diff

			return { ...acc, [key]: difference } // return updated key
		}, deletedValues)
	}
}

function getDate(d) {
	const s = d instanceof Date? d.toISOString(): d;
	return s.substring(0, 10);
}

function SessionBreakouts({
	session,
	selected,
	readOnly
}) {
	const dispatch = useDispatch();

	const doImport = () => selected.forEach(id => dispatch(importBreakouts(id)));

	return <>
		<Row>
			<label>Breakouts:</label>
			{selected.length > 1?
				(isMultiple(session.Breakouts)? <i>{MULTIPLE_STR}</i>: session.Breakouts):
				<Link to={`/session/${session.id}/breakouts`}>{session.Breakouts}</Link>}
		</Row>
		{!readOnly && <Row>
			<Button
				onClick={doImport}
				disabled={readOnly}
			>
				Import breakouts
			</Button>
		</Row>}
	</>
}

function SessionAttendees({
	session,
	selected,
	readOnly
}) {
	const dispatch = useDispatch();
	const doImport = () => selected.forEach(id => dispatch(importAttendances(id)));

	return <>
		<Row>
			<label>Attendees:</label>
			{selected.length > 1?
				(isMultiple(session.Attendees)? <i>{MULTIPLE_STR}</i>: session.Attendees):
				<Link to={`/session/${session.id}/attendees`}>{session.Attendees}</Link>}
		</Row>
		{!readOnly && <Row>
			<Button
				onClick={doImport}
				disabled={readOnly}
			>
				Import attendances
			</Button>
		</Row>}
	</>
}

const SessionContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function Session({
	session,
	selected,
	setSession,
	readOnly,
}) {
	const [errMsg, setErrMsg] = React.useState('');

	const change = e => setSession({[e.target.name]: e.target.value});
	const changeDate = e => setSession({[e.target.name]: new Date(e.target.value)});
	const changeType = options => setSession({Type: options.length? options[0].value: null});
	const getTypeOption = session => SessionTypeOptions.find(o => o.value === session.Type) || [];
	const changeTimeZone = tz => setSession({TimeZone: tz});

	const typeOption = SessionTypeOptions.find(o => o.value === session.Type)

	return (
		<SessionContainer>
			<Row>
				<Field label='Start:'>
					<Input type='date' size={24}
						name='Start'
						value={isMultiple(session.Start)? null: getDate(session.Start)}
						placeholder={isMultiple(session.Start)? MULTIPLE_STR: BLANK_STR}
						onChange={changeDate}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date' size={24}
						name='End'
						value={isMultiple(session.End)? null: getDate(session.End)}
						placeholder={isMultiple(session.End)? MULTIPLE_STR: BLANK_STR}
						onChange={changeDate}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={24}
						name='Name'
						value={isMultiple(session.Name)? '': session.Name}
						placeholder={isMultiple(session.Name)? MULTIPLE_STR: BLANK_STR}
						onChange={change}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session type:' >
					<Select
						options={SessionTypeOptions}
						values={typeOption? [typeOption]: []}
						onChange={changeType}
						portal={document.querySelector('#root')}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT meeting number:' >
					<Input type='text'
						name='MeetingNumber'
						value={isMultiple(session.MeetingNumber)? '': session.MeetingNumber}
						placeholder={isMultiple(session.MeetingNumber)? MULTIPLE_STR: BLANK_STR}
						onChange={change}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						value={isMultiple(session.TimeZone)? null: session.TimeZone}
						placeholder={isMultiple(session.TimeZone)? MULTIPLE_STR: BLANK_STR}
						onChange={changeTimeZone}
						style={{width: 200}}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<SessionBreakouts
				session={session}
				selected={selected}
				readOnly={readOnly}
			/>
			<SessionAttendees
				session={session}
				selected={selected}
				readOnly={readOnly}
			/>
		</SessionContainer>
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

class SessionDetail extends React.Component {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	componentDidMount() {
		if (!this.props.valid)
			this.props.loadSessions();
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props) => {
		const {sessions, selected} = props;
		let diff = {}, originals = [];
		for (const id of selected) {
			const session = sessions[id];
			if (session) {
				diff = recursivelyDiffObjects(diff, session);
				originals.push(session);
			}
		}
		return {
			saved: diff,
			edited: diff,
			originals: originals
		};
	}

	updateSession = (changes) => {
		const {readOnly, uiProperties} = this.props;
		if (readOnly || !uiProperties.editSession) {
			console.warn("Update in read-only component")
			return;
		}
		// merge in the edits and trigger a debounced save
		this.setState(
			state => ({...state, edited: {...state.edited, ...changes}}),
			this.triggerSave
		);
	}

	save = () => {
		const {edited, saved, originals} = this.state;
		const d = shallowDiff(saved, edited);
		const updates = [];
		for (const o of originals) {
			if (Object.keys(d).length > 0)
				updates.push({...d, id: o.id});
		}
		if (updates.length > 0)
			updates.forEach(u => this.props.updateSession(u.id, u));
		this.setState(state => ({...state, saved: edited}));
	}

	handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected sessions?');
		if (ok)
			await this.props.deleteSelectedSessions();
	}

	handleToggleEditSession = () => this.props.setUiProperty('editSession', !this.props.uiProperties.editSession);

	render() {
		const {style, className, loading, sessions, selected, uiProperties, setUiProperty, readOnly} = this.props;
		const {edited} = this.state;

		let notAvailableStr
		if (loading)
			notAvailableStr = 'Loading...';
		else if (selected.length === 0)
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
								title='Edit session'
								disabled={disableButtons}
								isActive={uiProperties.editSession}
								onClick={this.handleToggleEditSession}
							/>
							<ActionButton
								name='delete'
								title='Delete session'
								disabled={disableButtons}
								onClick={this.handleRemoveSelected}
							/>
						</>}
					</TopRow>
					{notAvailableStr?
						<NotAvaialble>
							<span>{notAvailableStr}</span>
					 	</NotAvaialble>:
						<Session 
							session={edited}
							sessions={sessions}
							selected={selected}
							setSession={this.updateSession}
							uiProperties={uiProperties}
							setUiProperty={setUiProperty}
							readOnly={readOnly || !uiProperties.editSession}
						/>
					}
				</DetailContainer>
			)
	}

	static propTypes = {
		sessions: PropTypes.object.isRequired,
		valid: PropTypes.bool.isRequired,
		loading: PropTypes.bool.isRequired,
		uiProperties: PropTypes.object.isRequired,
		loadSessions: PropTypes.func.isRequired,
		updateSession: PropTypes.func.isRequired,
		deleteSessions: PropTypes.func.isRequired
	}
}

const dataSet = 'sessions';

const ConnectedSessionDetail = connect(
	(state) => {
		const sessions = state[dataSet];
		return {
			sessions: sessions.entities,
			loading: sessions.loading,
			valid: sessions.valid,
			selected: sessions.selected,
			uiProperties: sessions.ui,
		}
	},
	{
		loadSessions,
		updateSession,
		deleteSessions,
		setUiProperty: setSessionsUiProperty,
	}
)(SessionDetail);

function SessionImportModal({
	isOpen,
	close,
	defaultSession,
}) {
	const [session, setSession] = React.useState({});
	const [errMsg, setErrMsg] = React.useState('');
	const dispatch = useDispatch();
	React.useEffect(() => setSession(defaultSession), [isOpen]);

	async function submit() {
		dispatch(addSession(session));
		close();
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form
				title={`Add session`}
				errorText={errMsg}
				submit={submit}
				cancel={close}
			>
				<Session
					session={session}
					selected={[]}
					setSession={(changes) => setSession(s => ({...s, changes}))}
				/>
			</Form>
		</AppModal>
	)
}

SessionImportModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	defaultSession: PropTypes.object
}

export {SessionImportModal};
export default ConnectedSessionDetail;
