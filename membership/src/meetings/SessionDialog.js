import PropTypes from 'prop-types';
import React from 'react';
import {connect, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {Link} from "react-router-dom";
import {DateTime} from 'luxon';
import {shallowDiff, debounce} from 'dot11-components/lib';
import {ConfirmModal} from 'dot11-components/modals';
import {Button, ActionButton, Form, Row, Field, Input, Select} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';
import TimeZoneSelector from '../components/TimeZoneSelector';
import {addSession, updateSession, loadSessions, deleteSessions, setSessionsUiProperty, SessionTypeOptions, selectSessionsState} from '../store/sessions';
import {importBreakouts} from '../store/breakouts';
import {importAttendances} from '../store/attendees';

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

/*function getDate(d) {
	const s = d instanceof Date? d.toISOString(): d;
	return s.substring(0, 10);
}*/
function getDate(session, field) {
	return DateTime.fromISO(session[field], {zone: session.TimeZone}).toISODate();
}
function setDate(session, value) {
	return DateTime.fromISO(value, {zone: session.TimeZone}).toISO();
}

function SessionTypeSelector({value, onChange, ...otherProps}) {
	const values = SessionTypeOptions.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: null);
	return (
		<Select
			values={values}
			options={SessionTypeOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	)
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

function SessionEdit({
	session,
	selected,
	updateSession,
	readOnly,
}) {
	const [errMsg, setErrMsg] = React.useState('');

	return (
		<SessionContainer>
			<Row>
				<Field label='Start:'>
					<Input type='date' size={24}
						value={isMultiple(session.startDate)? null: session.startDate}
						placeholder={isMultiple(session.startDate)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({startDate: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date' size={24}
						value={isMultiple(session.endDate)? null: session.endDate}
						placeholder={isMultiple(session.endDate)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({endDate: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={Math.max(session.name.length, 34)}
						name='Name'
						value={isMultiple(session.name)? '': session.name}
						placeholder={isMultiple(session.name)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({name: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session type:' >
					<SessionTypeSelector
						value={isMultiple(session.type)? null: session.type}
						onChange={type => updateSession({type})}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT meeting number:' >
					<Input type='text'
						value={isMultiple(session.imatMeetingId)? '': session.imatMeetingId}
						placeholder={isMultiple(session.imatMeetingId)? MULTIPLE_STR: BLANK_STR}
						onChange={imatMeetingId => updateSession({imatMeetingId})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						value={isMultiple(session.timezone)? null: session.timezone}
						placeholder={isMultiple(session.timezone)? MULTIPLE_STR: BLANK_STR}
						onChange={timezone => updateSession({timezone})}
						style={{width: 200}}
						readOnly={readOnly}
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
		if (changes.Start)
			console.log(changes.Start)
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
		const {selected, deleteSessions} = this.props;
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected sessions?');
		if (ok) {
			await deleteSessions(selected);
		}
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
						<SessionEdit
							session={edited}
							selected={selected}
							updateSession={this.updateSession}
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

const ConnectedSessionDetail = connect(
	(state) => {
		const sessions = selectSessionsState(state);
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
				<SessionEdit
					session={session}
					selected={[]}
					updateSession={(changes) => setSession(s => ({...s, ...changes}))}
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
