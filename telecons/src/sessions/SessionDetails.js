import PropTypes from 'prop-types';
import React from 'react';
import {connect, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {Link} from "react-router-dom";
import {DateTime} from 'luxon';

import {shallowDiff, deepDiff, debounce} from 'dot11-components/lib';
import {ConfirmModal} from 'dot11-components/modals';
import {Button, ActionButton, Form, Row, Field, Input, Select} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import TimeZoneSelector from '../components/TimeZoneSelector';
import RoomDetails from './RoomDetails';
import TimeslotDetails from './TimeslotDetails';

import {addSession, updateSession, loadSessions, deleteSessions, setSessionsUiProperty, SessionTypeOptions, selectSessionsState} from '../store/sessions';
import {selectTeleconsState} from '../store/telecons';

//import {importBreakouts} from '../store/breakouts';
//import {importAttendances} from '../store/attendees';

const importBreakouts = () => {};
const importAttendances = () => {};

const MULTIPLE = '<multiple>';
const isMultiple = (value) => value === MULTIPLE;
const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

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

	return (
		<>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={24}
						name='Name'
						value={isMultiple(session.name)? '': session.name}
						placeholder={isMultiple(session.name)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({name: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start:'>
					<Input type='date' size={24}
						name='Start'
						value={isMultiple(session.startDate)? '': session.startDate}
						placeholder={isMultiple(session.startDate)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({startDate: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date' size={24}
						name='End'
						value={isMultiple(session.endDate)? '': session.endDate}
						placeholder={isMultiple(session.endDate)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({endDate: e.target.value})}
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
						name='imatMeetingNumber'
						value={isMultiple(session.imatMeetingNumber)? '': session.imatMeetingNumber}
						placeholder={isMultiple(session.imatMeetingNumber)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({imatMeetingNumber: e.target.value})}
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
		</>
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
				diff = deepDiff(diff, session);
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
		if (readOnly || !uiProperties.editEnabled) {
			console.warn("Update in read-only component")
			return;
		}
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

	handleAddRoom = (room) => {
		let {rooms} = this.state.edited;
		rooms = rooms.slice();
		const id = rooms.reduce((maxId, room) => Math.max(maxId, room.id), 0) + 1;
		rooms.push({...room, id});
		this.updateSession({rooms});
	}

	handleUpdateRoom = (id, changes) => {
		let {rooms} = this.state.edited;
		rooms = rooms.slice();
		const i = rooms.findIndex(room => room.id === id);
		if (i >= 0) {
			rooms[i] = {...rooms[i], ...changes};
			this.updateSession({rooms});
		}
	}

	handleRemoveRoom = (id) => {
		let {rooms} = this.state.edited;
		rooms = rooms.slice();
		const i = rooms.findIndex(room => room.id === id);
		if (i >= 0) {
			rooms.splice(i, 1);
			this.updateSession({rooms});
		}
	}

	moveRoomUp = (id) => {
		let {rooms} = this.state.edited;
		rooms = rooms.slice();
		const i = rooms.findIndex(room => room.id === id);
		if (i > 0) {
			const [room] = rooms.splice(i, 1);
			rooms.splice(i - 1, 0, room);
			this.updateSession({rooms});
		}
	}

	moveRoomDown = (id) => {
		let {rooms} = this.state.edited;
		rooms = rooms.slice();
		const i = rooms.findIndex(room => room.id === id);
		if (i > 0) {
			const [room] = rooms.splice(i, 1);
			rooms.splice(i + 1, 0, room);
			this.updateSession({rooms});
		}
	}

	handleGetRoomsFromLocations = () => {
		const {sessions, selected, telecons} = this.props;
		const roomsSet = new Set();
		if (selected.length > 0) {
			const session = sessions[selected[0]];
			const startDate = DateTime.fromISO(session.startDate, {zone: session.timezone});
			const endDate = DateTime.fromISO(session.endDate, {zone: session.timezone}).plus({days: 1});
			for (const t of telecons) {
				const start = DateTime.fromISO(t.start);
				if (start >= startDate && start < endDate)
					roomsSet.add(t.location);
			}
		}
		const rooms = [...roomsSet].map((name, id) => ({id, name, description: ''}));
		console.log(rooms);
		this.updateSession({rooms});
	}

	handleAddTimeslot = (slot) => {
		let {timeslots} = this.state.edited;
		timeslots = timeslots.slice();
		const id = timeslots.reduce((maxId, slot) => Math.max(maxId, slot.id), 0) + 1;
		timeslots.push({...slot, id});
		this.updateSession({timeslots});
	}

	handleUpdateTimeslot = (id, changes) => {
		let {timeslots} = this.state.edited;
		timeslots = timeslots.slice();
		const i = timeslots.findIndex(slot => slot.id === id);
		if (i >= 0)
			timeslots[i] = {...timeslots[i], ...changes};
		this.updateSession({timeslots});
	}

	handleRemoveTimeslot = (id) => {
		let {timeslots} = this.state.edited;
		timeslots = timeslots.slice();
		const i = timeslots.findIndex(slot => slot.id === id);
		if (i >= 0)
			timeslots.splice(i, 1);
		this.updateSession({timeslots});
	}

	handleToggleEditEnabled = () => this.props.setUiProperty('editEnabled', !this.props.uiProperties.editEnabled);

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
								isActive={uiProperties.editEnabled}
								onClick={this.handleToggleEditEnabled}
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
					 	<SessionContainer>
							<SessionEdit
								session={edited}
								sessions={sessions}
								selected={selected}
								updateSession={this.updateSession}
								uiProperties={uiProperties}
								setUiProperty={setUiProperty}
								readOnly={readOnly || !uiProperties.editEnabled}
							/>
							{Array.isArray(edited.rooms) &&
								<RoomDetails
									rooms={edited.rooms}
									addRoom={this.handleAddRoom}
									removeRoom={this.handleRemoveRoom}
									updateRoom={this.handleUpdateRoom}
									moveRoomUp={this.moveRoomUp}
									moveRoomDown={this.moveRoomDown}
									getRoomsFromLocations={this.handleGetRoomsFromLocations}
									readOnly={readOnly || !uiProperties.editEnabled}
								/>}
							{Array.isArray(edited.timeslots) &&
								<TimeslotDetails
									timeslots={edited.timeslots}
									addTimeslot={this.handleAddTimeslot}
									removeTimeslot={this.handleRemoveTimeslot}
									updateTimeslot={this.handleUpdateTimeslot}
									readOnly={readOnly || !uiProperties.editEnabled}
								/>}
						</SessionContainer>
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
		const {entities, ids} = selectTeleconsState(state);
		const telecons = ids.map(id => entities[id]);
		return {
			sessions: sessions.entities,
			telecons,
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
					updateSession={(changes) => setSession(s => ({...s, changes}))}
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
