import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {connect} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton, Button, Form, Row, Col, Field, FieldLeft, Input, InputDates, InputTime, Checkbox, Select} from 'dot11-components/form';
import TopRow from '../components/TopRow';

import {
	addTelecons, 
	updateTelecons, 
	deleteTelecons, 
	setSelectedTelecons, 
	selectTeleconsState, 
	selectSyncedTeleconEntities
} from '../store/telecons';

import {
	loadBreakouts,
	addMeetings,
	updateMeetings,
	deleteMeetings,
	setSelectedMeetings,
	setSelectedSlots,
	selectSession,
	selectSessionPrepState,
	selectSessionPrepEntities,
	selectSessionPrepDates,
	selectSelectedMeetings,
	selectSelectedSlots,
	selectSessionPrepTimeslots as selectTimeslots,
	selectSessionPrepRooms as selectRooms,
	toSlotId,
	fromSlotId
} from '../store/sessionPrep';

import {selectCurrentGroupId, selectCurrentGroupDefaults} from '../store/current';

import {selectGroupEntities} from '../store/groups';
import {selectCurrentSession} from '../store/imatMeetings';

import GroupSelector from '../components/GroupSelector';
import {WebexMeetingEdit, defaultWebexMeeting} from '../telecons/TeleconDetail';

const MULTIPLE_STR = '(Multiple)';

const defaultLocalEntry = {
	date: '',
	roomId: '',
	slotId: '',
	startTime: '',
	endTime: '',
}

function DateSelector({value, onChange, ...otherProps}) {
	const options = useSelector(selectSessionPrepDates).map(date => ({value: date, label: date}))
	const handleChange = (values) => onChange(values.length > 0? values[0].value: null);
	const values = options.filter(d => d.value === value);
	return (
		<Select
			options={options}
			values={values}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

function TimeslotSelector({value, onChange, ...otherProps}) {
	const timeslots = useSelector(selectTimeslots);
	const handleChange = (values) => onChange(values.length > 0? values[0].id: null);
	const values = timeslots.filter(slot => slot.id === value);
	return (
		<Select
			options={timeslots}
			values={values}
			onChange={handleChange}
			labelField='name'
			valueField='id'
			{...otherProps}
		/>
	)
}

function RoomSelector({value, onChange, options, ...otherProps}) {
	const rooms = useSelector(selectRooms);
	const handleChange = (values) => onChange(values.length > 0? values[0].id: null);
	const values = rooms.filter(room => room.id === value);
	return (
		<Select
			options={rooms}
			values={values}
			onChange={handleChange}
			labelField='name'
			valueField='id'
			{...otherProps}
		/>
	)
}

export function EditMeeting({
	action,
	groupId,
	entry,
	changeEntry,
	dates,
	busy,
	actionAdd,
	actionUpdate,
	actionCancel,
}) {
	const readOnly = action === 'view';

	const toggleWebexMeeting = () => {
		if (entry.webexMeeting)
			changeEntry({webexMeetingId: null, webexMeeting: null});
		else
			changeEntry({webexMeeting: defaultWebexMeeting});
	}

	console.log(entry)
	return (
		<Form
			title={action === 'add'? "Add meeting": "Update meeting"}
			submitLabel={action === 'add'? 'Add': 'Update'}
			submit={action === 'add'? actionAdd: actionUpdate}
			cancel={actionCancel}
			busy={busy}
		>
			<Row>
				<Field label='Meeting name:'>
					<Input
						type='search'
						style={{width: 200}}
						value={isMultiple(entry.name)? '': entry.name || ''}
						onChange={(e) => changeEntry({name: e.target.value})}
						placeholder={isMultiple(entry.name)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Subgroup:'>
					<GroupSelector
						value={isMultiple(entry.organizationId)? '': entry.organizationId || ''}
						onChange={(organizationId) => changeEntry({organizationId})}
						placeholder={isMultiple(entry.organizationId)? MULTIPLE_STR: undefined}
						parent_id={groupId}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session day:'>
					<DateSelector
						value={isMultiple(entry.date)? []: entry.date}
						onChange={date => changeEntry({date})}
						placeholder={isMultiple(entry.date)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Slot:'>
					<TimeslotSelector
						value={isMultiple(entry.startSlotId)? []: entry.startSlotId}
						onChange={startSlotId => changeEntry({startSlotId})}
						placeholder={isMultiple(entry.startSlotId)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start time:'>
					<InputTime
						value={isMultiple(entry.startTime)? '': entry.startTime}
						onChange={startTime => changeEntry({startTime})}
						placeholder={isMultiple(entry.startTime)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End time:'>
					<InputTime
						value={isMultiple(entry.endTime)? '': entry.endTime}
						onChange={endTime => changeEntry({endTime})}
						placeholder={isMultiple(entry.endTime)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Location/room:'>
					<RoomSelector
						value={isMultiple(entry.roomId)? []: entry.roomId}
						onChange={roomId => changeEntry({roomId})}
						placeholder={isMultiple(entry.roomId)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Credit:'>
					<div style={{display: 'flex', justifyContent: 'space-between'}}>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='extra'
								value='Extra'
								checked={entry.credit === 'Extra'}
								onChange={e => changeEntry({credit: e.target.value})}
							/>
							<label htmlFor='extra'>Extra</label>
						</div>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='normal'
								value='Normal'
								checked={entry.credit === 'Normal'}
								onChange={e => changeEntry({credit: e.target.value})}
							/>
							<label htmlFor='normal'>Normal</label>
						</div>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='other'
								value='Other'
								checked={entry.credit === 'Other'}
								onChange={e => changeEntry({credit: e.target.value})}
							/>
							<label htmlFor='other'>Other</label>
						</div>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='zero'
								value='Zero'
								checked={entry.credit === 'Zero'}
								onChange={e => changeEntry({credit: e.target.value})}
							/>
							<label htmlFor='zero'>Zero</label>
						</div>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label='Include Webex:'>
					<Checkbox
						checked={!!entry.webexMeeting}
						onChange={toggleWebexMeeting}
					/>
				</Field>
			</Row>
			{entry.webexMeeting &&
				<Row>
					<WebexMeetingEdit
						value={entry.webexMeeting}
						onChange={changes => changeEntry({webexMeeting: {...entry.webexMeeting, ...changes}})}
						webexAccountId={entry.webexAccountId}
						onChangeWebexAccountId={webexAccountId => changeEntry({webexAccountId})}
						readOnly={readOnly}
						isNew={action === 'add'}
					/>
				</Row>}
			{(action === 'add' || action === 'update') &&
			<Row>
				<Button onClick={action === 'add'? actionAdd: actionUpdate}>{action === 'add'? 'Add': 'Update'}</Button>
				<Button onClick={actionCancel}>Cancel</Button>
			</Row>}
		</Form>
	)
}

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

function convertMeetingToEntry(meeting, session, rooms, timeslots) {
	let {start, end, ...rest} = meeting;
	const entry = {...rest};
	start = DateTime.fromISO(start, {zone: session.timezone});
	end = DateTime.fromISO(end, {zone: session.timezone});
	entry.date = start.toISODate();
	entry.startTime = start.toFormat('HH:mm');
	entry.endTime = end.toFormat('HH:mm');
	const room = rooms.find(r => r.name === meeting.location);
	entry.roomId =  room.id || 0;
	const slot = timeslots.find(s => {
		const slotStart = start.set({hour: parseInt(s.startTime.substring(0, 2)), minute: parseInt(s.startTime.substring(3, 5))});
		const slotEnd = start.set({hour: parseInt(s.endTime.substring(0, 2)), minute: parseInt(s.endTime.substring(3, 5))});
		return start >= slotStart && start < slotEnd;
	});
	entry.startSlotId = slot? slot.id: 0;
	return entry;
}

function convertEntryToMeeting(entry, session, rooms, timeslots) {
	let {date, startTime, endTime, startSlotId, roomId, ...rest} = entry;
	const meeting = {...rest};
	meeting.start = DateTime.fromFormat(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', {zone: session.timezone}).toISO();
	meeting.end = DateTime.fromFormat(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', {zone: session.timezone}).toISO();
	const room = rooms.find(r => r.id === roomId);
	meeting.location = room? room.name: '';
	meeting.timezone = session.timezone;
	return meeting;
}

function convertMultipleMeetingsToEntry(ids, entities, session, rooms, timeslots) {
	return ids.reduce((entry, id) => deepMergeTagMultiple(entry, convertMeetingToEntry(entities[id], session, rooms, timeslots)), {});
}

class MeetingDetails extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.initState('view');
	}

	componentDidMount() {
		const {setSelectedMeetings, setSelectedSlots} = this.props;
		setSelectedMeetings([]);
		setSelectedSlots([]);
		this.setState(this.initState('view'));
	}

	componentDidUpdate(prevProps, prevState) {
		const {props} = this;
		const {action, ids} = this.state;

		const changeWithConfirmation = async () => {
			console.log('check for changes')
			/*const updates = this.getUpdates();
			if (updates.length > 0) {
				console.log(updates)
				const ok = await ConfirmModal.show('Changes not applied! Do you want to discard changes?');
				if (!ok) {
					setSelectedTelecons(ids);
					return;
				}
			}*/
			let action;
			if (props.selectedMeetings.length > 0)
				action = 'update';
			else if (props.selectedSlots.length > 0)
				action = 'add';
			else
				action = 'view';
			this.setState(this.initState(action));
		}

		if (props.selectedMeetings.join() !== prevProps.selectedMeetings.join() ||
			props.selectedSlots.join() !== prevProps.selectedSlots.join()) {
			changeWithConfirmation();
		}
	}

	initState = (action) => {
		const {selectedMeetings, selectedSlots, entities, rooms, timeslots, session, defaults, groupId} = this.props;
		console.log(this.props)
		let entry = {};
		if (action === 'update' && selectedMeetings.length) {
			entry = convertMultipleMeetingsToEntry(selectedMeetings, entities, session, rooms, timeslots);
		}
		else if (action === 'add') {
			entry.organizationId = groupId;
			for (const id of selectedSlots) {
				const [date, slotId, roomId] = fromSlotId(id);
				const timeslot = timeslots.find(slot => slot.id === slotId);
				//const room = rooms.find(room => room.id === roomId);
				entry = deepMergeTagMultiple(entry, {date, startSlotId: slotId, roomId, startTime: timeslot.startTime, endTime: timeslot.endTime});
				console.log(entry)
			}
			entry.name = '';
			entry.calendarAccountId = defaults.calendarAccountId;
			entry.webexAccountId = defaults.webexAccountId;
			entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webexTemplateId};
			entry.imatMeetingId = session?.id;
		}
		console.log(entry)
		return {entry, action};
	}

	defaultSummary = (organizationId) => {
		const {groupEntities} = this.props;
		const subgroup = groupEntities[organizationId];
		return subgroup?.name || '';
	}

	changeEntry = (changes) => {
		if ('organizationId' in changes)
			changes = {...changes, name: this.defaultSummary(changes.organizationId)};
		if ('startSlotId' in changes) {
			const {timeslots} = this.props;
			const slot = timeslots.find(s => s.id === changes.startSlotId);
			if (slot) {
				changes.startTime = slot.startTime;
				changes.endTime = slot.endTime;
			}
		}
		console.log(changes)
		this.setState(state => {
			const entry = deepMerge(state.entry, changes);
			return {...state, entry}
		});
	}

	add = async () => {
		const {selectedSlots, setSelectedSlots, setSelectedMeetings, addMeetings, rooms, timeslots, session} = this.props;
		const {entry} = this.state;
		console.log(entry)

		let errMsg = '';
		if (!entry.name)
			errMsg = 'Provide a meeting name';
		if (errMsg) {
			ConfirmModal.show(errMsg, false);
			return;
		}

		let meetings = selectedSlots.map(id => {
			const [date, slotId, roomId] = fromSlotId(id);
			const slot = timeslots.find(t => t.id === slotId);
			if (!slot)
				console.error("Can't find timeslot id=" + slotId);
			const room = rooms.find(r => r.id === roomId);
			if (!room)
				console.error("Can't find room id=" + roomId);

			const meeting = {
				name: entry.name,
				organizationId: entry.organizationId,
				roomId: roomId,
				startSlotId: slotId,
				timezone: session.timezone,
			};
			const startTime = isMultiple(entry.startTime)? slot.startTime: entry.startTime;
			const endTime = isMultiple(entry.endTime)? slot.endTime: entry.endTime;
			meeting.start = DateTime.fromFormat(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', {zone: session.timezone}).toISO();
			meeting.end = DateTime.fromFormat(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', {zone: session.timezone}).toISO();
			meeting.location = room.name;
			console.log(meeting)
			return meeting;
		});
		meetings = await addMeetings(meetings);
		setSelectedSlots([]);
		setSelectedMeetings(meetings.map(m => m.id));
	}

	getUpdates = () => {
		let {entry, ids} = this.state;
		const {entities, selectedMeetings, session, rooms, timeslots} = this.props;

		console.log('getUpdates')
		ids = selectedMeetings.filter(id => entities[id]);	// Only ids that exist
		
		// Collapse selection to local format
		const collapsed = convertMultipleMeetingsToEntry(ids, entities, session, rooms, timeslots);

		// Find differences
		const diff = deepDiff(collapsed, entry);

		const updates = [];
		for (const id of ids) {
			const entity = entities[id];
			const local = deepMerge(convertMeetingToEntry(entity, session, rooms, timeslots), diff);
			const meeting = convertEntryToMeeting(local, session, rooms, timeslots);
			console.log(meeting)
			const changes = deepDiff(entity, meeting);
			console.log(changes)

			if (Object.keys(changes).length > 0)
				updates.push({id, changes});
		}
		return updates;
	}

	update = () => {
		const {updateMeetings} = this.props;

		const updates = this.getUpdates();
		console.log(updates)
		if (updates.length > 0)
			updateMeetings(updates);
	}

	cancel = () => {

	}

	clickAdd = () => {
		const {setSelectedMeetings, setSelectedSlots} = this.props;
		setSelectedMeetings([]);
		setSelectedSlots([]);
		this.initState('add');
	}

	clickDelete = async () => {
		const {deleteMeetings, selectedMeetings, setSelectedMeetings} = this.props;
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected meetings?');
		if (ok) {
			deleteMeetings(selectedMeetings);
			setSelectedMeetings([]);
			this.initState('view');
		}
	}

	render() {
		const {loading, selectedMeetings, selectedSlots, groupId} = this.props;
		const {action, entry} = this.state;

		console.log(action)
		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === 'view' && selectedMeetings.length === 0 && selectedSlots.length === 0)
			notAvailableStr = 'Nothing selected';

		return (
			<>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton name='add' onClick={this.clickAdd} />
					<ActionButton name='delete' onClick={this.clickDelete} disabled={selectedMeetings.length === 0} />
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<EditMeeting
						action={action}
						groupId={groupId}
						entry={entry}
						changeEntry={this.changeEntry}
						busy={this.state.busy}
						actionAdd={this.add}
						actionUpdate={this.update}
						actionCancel={this.cancel}
					/>}
			</>
		)
	}

	static propTypes = {
		groupId: PropTypes.any,
		selectedBreakouts: PropTypes.array.isRequired,
		selectedSlots: PropTypes.array.isRequired,
	}
}

const ConnectedMeetingDetails = connect(
	(state) => ({
		groupId: selectCurrentGroupId(state),
		session: selectSession(state),
		loading: selectSessionPrepState(state).loading,
		timeslots: selectTimeslots(state),
		rooms: selectRooms(state),
		selectedMeetings: selectSelectedMeetings(state),
		selectedSlots: selectSelectedSlots(state),
		entities: selectSessionPrepEntities(state),
		defaults: selectCurrentGroupDefaults(state),
		groupEntities: selectGroupEntities(state)
	}),
	{
		updateMeetings,
		addMeetings,
		deleteMeetings,
		setSelectedMeetings,
		setSelectedSlots
	}
)(MeetingDetails);

export default ConnectedMeetingDetails;