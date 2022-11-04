import PropTypes from 'prop-types';
import React from 'react';
import {connect, useSelector, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton, Form, Row, Field, Select, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';

import {setError} from 'dot11-components/store/error';

import {
	selectCurrentSession,
	selectCurrentSessionDates,
} from '../store/sessions';

import {
	addMeetings, 
	updateMeetings, 
	deleteMeetings, 
	setSelectedMeetings, 
	selectMeetingsState, 
	selectSyncedMeetingEntities
} from '../store/meetings';

import {selectCurrentGroupId, selectCurrentGroupDefaults} from '../store/current';

import {selectGroupEntities} from '../store/groups';

import TimeZoneSelector from '../components/TimeZoneSelector';
import GroupSelector from '../components/GroupSelector';
import CalendarAccountSelector from '../components/CalendarAccountSelector';
import ImatMeetingSelector from '../components/ImatMeetingSelector';
import TopRow from '../components/TopRow';
import InputTimeRangeAsDuration from '../components/InputTimeRangeAsDuration';

import {WebexMeetingAccount, WebexMeetingParams, webexMeetingConfigParams, defaultWebexMeeting} from '../webexMeetings/WebexMeetingDetail';
import {BreakoutCredit} from '../imat/ImatBreakoutDetails';

const MULTIPLE_STR = '(Multiple)';

//const toTimeStr = (hour, min) => ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
const fromTimeStr = (str) => {
	const m = str.match(/(\d+):(\d+)/);
	return m? {hour: parseInt(m[1], 10), minute: parseInt(m[2], 10)}: {hour: 0, minute: 0};
}

const isSessionMeeting = (session) => session && (session.type === 'p' || session.type === 'i');

function convertMeetingToEntry(meeting, session) {
	let {start, end, ...rest} = meeting;
	let entry = {...rest};

	const zone = isSessionMeeting(session)? session.timezone: meeting.timezone;
	start = DateTime.fromISO(start, {zone});
	end = DateTime.fromISO(end, {zone});
	entry.date = start.toISODate({zone});
	entry.startTime = start.toFormat('HH:mm');
	entry.endTime = end.toFormat('HH:mm');

	if (isSessionMeeting(session)) {
		const room = session.rooms.find(r => r.name === meeting.location);
		entry.roomId =  room? room.id: 0;

		let startSlot = session.timeslots.find(s => {
			const slotStart = start.set(fromTimeStr(s.startTime));
			const slotEnd = start.set(fromTimeStr(s.endTime));
			return start >= slotStart && start < slotEnd;
		});
		if (!startSlot) {
			// If we can't find a slot that includes the startTime then find best match
			startSlot = session.timeslots.find(s => {
				const slotStart = start.set(fromTimeStr(s.startTime));
				return start >= slotStart;
			});
		}
		entry.startSlotId = startSlot? startSlot.id: 0;
	}

	return entry;
}

export function convertEntryToMeeting(entry, session) {
	let {date, startTime, endTime, startSlotId, endSlotId, roomId, ...rest} = entry;
	const meeting = {...rest};

	let zone;
	if (isSessionMeeting(session)) {
		zone = session.timezone;

		const room = session.rooms.find(r => r.id === roomId);
		if (room)
			meeting.location = room.name;
	}
	else {
		zone = entry.timezone;
	}
	meeting.timezone = zone;
	meeting.start = DateTime.fromISO(date, {zone}).set(fromTimeStr(startTime)).toISO();
	meeting.end = DateTime.fromISO(date, {zone}).set(fromTimeStr(endTime)).toISO();

	return meeting;
}

function TeleconMeetingTime({action, entry, changeEntry, readOnly}) {
	return (
		<>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						style={{width: 200}}
						value={isMultiple(entry.timezone)? '': entry.timezone || ''}
						onChange={(timezone) => changeEntry({timezone})}
						placeholder={isMultiple(entry.timezone)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label={action === 'add'? 'Dates:': 'Date:'}>
					<InputDates
						disablePast
						multi={action === 'add'}
						value={isMultiple(entry.dates)? []: entry.dates}
						onChange={dates => changeEntry({dates})}
						placeholder={isMultiple(entry.dates)? MULTIPLE_STR: undefined}
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
				<Field label='Duration:'>
					<InputTimeRangeAsDuration
						entry={(isMultiple(entry.startTime) || isMultiple(entry.endTime))? {startTime: '', endTime: ''}: entry}
						changeEntry={changeEntry}
						disabled={readOnly}
						placeholder={(isMultiple(entry.startTime) || isMultiple(entry.endTime))? MULTIPLE_STR: undefined}
					/>
				</Field>
			</Row>
		</>
	)
}

TeleconMeetingTime.propTypes = {
	action: PropTypes.oneOf(['add', 'update']).isRequired,
	entry: PropTypes.shape({
		timezone: PropTypes.string,
		dates: PropTypes.arrayOf(PropTypes.string).isRequired,
		startTime: PropTypes.string.isRequired,
		endTime: PropTypes.string.isRequired,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

function SessionDateSelector({value, onChange, ...otherProps}) {
	const options = useSelector(selectCurrentSessionDates).map(date => ({value: date, label: date}))
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
	const {timeslots} = useSelector(selectCurrentSession);
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
	const {rooms} = useSelector(selectCurrentSession);
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

function SessionMeetingTime({entry, changeEntry, readOnly}) {
	return (
		<>
			<Row>
				<Field label='Session day:'>
					<SessionDateSelector
						value={isMultiple(entry.date)? []: entry.date}
						onChange={date => changeEntry({date})}
						placeholder={isMultiple(entry.date)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start slot:'>
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
		</>
	)
}

SessionMeetingTime.propTypes = {
	entry: PropTypes.shape({	
		date: PropTypes.string.isRequired,
		startSlotId: PropTypes.any.isRequired,
		startTime: PropTypes.string.isRequired,
		endTime: PropTypes.string.isRequired,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

function defaultSummary(groupEntities, organizationId, hasMotions) {

	let subgroup, group;
	subgroup = groupEntities[organizationId];
	if (subgroup &&
		subgroup.type.search(/^(tg|sg|sc|ah)/) !== -1 &&
		subgroup.parent_id) {
		group = groupEntities[subgroup.parent_id];
	}

	let summary = '';
	if (group && subgroup)
		summary = `${group.name} ${subgroup.name}`;
	else if (subgroup)
		summary = subgroup.name;
	if (hasMotions)
		summary += '*';
	return summary;
}

export function MeetingEntry({
	entry,
	changeEntry,
	busy,
	action,
	submit,
	cancel,
}) {
	const dispatch = useDispatch();
	const session = useSelector(selectCurrentSession);
	const groupEntities = useSelector(selectGroupEntities);

	const isSession = isSessionMeeting(session);
	const readOnly = action === 'view';

	let errMsg = '';
	if (entry.dates.length === 0)
		errMsg = 'Date not set';
	else if (!entry.startTime)
		errMsg = 'Start time not set'
	else if (!entry.endTime)
		errMsg = 'Duration not set';
	else if (!entry.timezone)
		errMsg = 'Time zone not set';

	let submitForm, cancelForm, submitLabel;
	let title = isSession? "Session meeting": "Telecon";
	if (submit) {
		if (action === 'add') {
			submitLabel = "Add";
			title = isSession? "Add session meeting": "Add telecon";
		}
		else {
			submitLabel = "Update";
			title = isSession? "Update session meeting": "Update telecon";
		}
		submitForm = () => {
			if (errMsg) {
				dispatch(setError("Fix error", errMsg));
				return;
			}
			submit();
		};
		cancelForm = cancel;
	}

	function handleChange(changes) {
		changes = {...changes};
		if ('organizationId' in changes) {
			changes.summary = defaultSummary(groupEntities, changes.organizationId, entry.hasMotions);
		}
		if ('hasMotions' in changes) {
			let summary = entry.summary;
			summary = summary.replace(/[*]$/, '');	// Remove trailing asterisk
			if (changes.hasMotions)
				summary += '*';				// Add trailing asterisk
			changes.summary = summary;
		}
		if ('startSlotId' in changes) {
			const slot = session.timeslots.find(slot => slot.id === changes.startSlotId);
			if (slot) {
				changes.startTime = slot.startTime;
				changes.endTime = slot.endTime;
			}
		}
		changeEntry(changes);
	}

	function handleWebexMeetingChange(webexMeetingChanges) {
		let webexMeeting = {...entry.webexMeeting, ...webexMeetingChanges};
		console.log(webexMeetingChanges)
		const changes = {};
		if ('accountId' in webexMeetingChanges) {
			changes.webexAccountId = webexMeetingChanges.accountId;
			if (!webexMeetingChanges.accountId)
				webexMeeting = {accountId: null};
		}
		changes.webexMeeting = webexMeeting;
		handleChange(changes);
	}

	return (
		<Form
			title={title}
			busy={busy}
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			<Row>
				<Field label='Cancel meeting:'>
					<Checkbox
						checked={entry.isCancelled}
						intdeterminate={isMultiple(entry.isCancelled)}
						onChange={(e) => handleChange({isCancelled: e.target.checked? 1: 0})}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Subgroup:'>
					<GroupSelector
						value={isMultiple(entry.organizationId)? '': entry.organizationId || ''}
						onChange={(organizationId) => handleChange({organizationId})}
						placeholder={isMultiple(entry.organizationId)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Summary:'>
					<Input
						type='search'
						style={{width: 200}}
						value={isMultiple(entry.summary)? '': entry.summary || ''}
						onChange={(e) => handleChange({summary: e.target.value})}
						placeholder={isMultiple(entry.summary)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			{isSession?
				<SessionMeetingTime
					action={action}
					entry={entry}
					changeEntry={handleChange}
					readOnly={readOnly}
				/>:
				<TeleconMeetingTime
					action={action}
					entry={entry}
					changeEntry={handleChange}
					readOnly={readOnly}
				/>}
			<Row>
				<Field label='Location:'>
					{isSession?
						<RoomSelector
							value={isMultiple(entry.roomId)? []: entry.roomId}
							onChange={roomId => handleChange({roomId})}
							placeholder={isMultiple(entry.roomId)? MULTIPLE_STR: undefined}
							disabled={readOnly}
						/>:
						<Input
							type='search'
							style={{width: 200}}
							value={isMultiple(entry.location)? '': entry.location || ''}
							onChange={(e) => handleChange({location: e.target.value})}
							placeholder={isMultiple(entry.location)? MULTIPLE_STR: undefined}
							disabled={readOnly}
						/>}
				</Field>
			</Row>
			{!isSession &&
				<Row>
					<Field label='Agenda includes motions:'>
						<Checkbox
							indeterminate={isMultiple(entry.hasMotions)}
							checked={!!entry.hasMotions}
							onChange={e => handleChange({hasMotions: e.target.checked})}
							disabled={readOnly}
						/>
					</Field>
				</Row>}
			<Row>
				<Field label='IMAT meeting:'>
					<ImatMeetingSelector
						value={entry.imatMeetingId}
						onChange={imatMeetingId => handleChange({imatMeetingId})}
					/>
				</Field>
			</Row>
			{isSession &&
				<BreakoutCredit
					entry={entry}
					changeEntry={handleChange}
				/>}
			<WebexMeetingAccount
				entry={entry.webexMeeting}
				changeEntry={handleWebexMeetingChange}
				readOnly={readOnly}
			/>
			{entry.webexMeeting.accountId &&
				<WebexMeetingParams
					entry={entry.webexMeeting}
					changeEntry={handleWebexMeetingChange}
					readOnly={readOnly}
				/>}
			<Row>
				<Field label='Calendar:'>
					<CalendarAccountSelector
						value={entry.calendarAccountId}
						onChange={calendarAccountId => handleChange({calendarAccountId})}
					/>
				</Field>
			</Row>
		</Form>
	)
}

MeetingEntry.propTypes = {
	action: PropTypes.oneOf(['add', 'update', 'view']).isRequired,
	entry: PropTypes.shape({
		organizationId: PropTypes.any,
		summary: PropTypes.string.isRequired,
		hasMotions: PropTypes.oneOf([0, 1, MULTIPLE]).isRequired,
		isCancelled: PropTypes.oneOf([0, 1, MULTIPLE]).isRequired,
		credit: PropTypes.string,
		webexMeeting: PropTypes.object.isRequired,
		calendarAccountId: PropTypes.any,
		imatMeeingId: PropTypes.any
	}),
	changeEntry: PropTypes.func.isRequired,
	isSession: PropTypes.bool,
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

class MeetingDetails extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.initState('update');
	}

	componentDidUpdate(prevProps, prevState) {
		const {selected, setSelectedMeetings} = this.props;
		const {action, meetings} = this.state;
		const ids = meetings.map(m => m.id);

		const changeWithConfirmation = async () => {
			if (action === 'update' && this.hasUpdates()) {
				const ok = await ConfirmModal.show('Changes not applied! Do you want to discard changes?');
				if (!ok) {
					setSelectedMeetings(ids);
					return;
				}
			}
			this.reinitState('update');
		}

		if (selected.join() !== ids.join())
			changeWithConfirmation();
	}
	
	initState = (action) => {
		const {entities, selected, defaults, groupId, session, groupEntities} = this.props;

		// Get meetings without superfluous webex params
		const meetings = selected.map(id => {
			const {webexMeeting, ...meeting} = entities[id];
			meeting.webexMeeting = {
				accountId: meeting.webexAccountId,
				...webexMeetingConfigParams(webexMeeting || {})
			};
			return meeting;
		});
		//console.log(meetings)

		let entry;
		if (action === 'update') {
			entry = meetings.reduce((entry, meeting) => deepMergeTagMultiple(entry, convertMeetingToEntry(meeting, session)), {});
			entry.dates = isMultiple(entry.date)? entry.date: [entry.date];
		}
		else if (action === 'add') {
			entry = {};
			let dates = [];
			for (const meeting of meetings) {
				const original = convertMeetingToEntry(meeting, session);
				dates.push(original.date);
				entry = deepMergeTagMultiple(entry, original);
			}
			entry.dates = [...new Set(dates.sort())];	// array of unique dates
			entry.timezone = session? session.timezone: defaults.timezone;
			if (isMultiple(entry.organizationId))
				entry.organizationId = groupId;
			if (isMultiple(entry.startTime))
				entry.startTime = '';
			if (isMultiple(entry.endTime))
				entry.endTime = '';
			if (isMultiple(entry.hasMotions))
				entry.hasMotions = 0;
			entry.isCancelled = 0;
			entry.summary = defaultSummary(groupEntities, entry.organizationId, entry.hasMotions);
			entry.webexAccountId = defaults.webexAccountId;
			entry.calendarAccountId = defaults.calendarAccountId;
			entry.imatMeetingId = session? session.imatMeetingId: null;
			if (entry.webexAccountId) {
				entry.webexMeeting = {
					...defaultWebexMeeting,
					accountId: defaults.webexAccountId,
					templateId: defaults.webexTemplateId
				};
			}
			delete entry.id;
		}
		console.log(entry)
		return {
			action,
			entry,
			saved: action === 'add'? {}: entry,
			session,
			meetings,
			busy: false
		};
	}

	reinitState = (action) => this.setState(this.initState(action))

	getUpdates = () => {
		let {entry, saved, session, meetings} = this.state;

		// Get modified local entry without dates[]
		let {dates, ...e} = entry;
		if (dates.length === 1)
			e.date = dates[0];

		// Find differences
		const diff = deepDiff(saved, e);
		//console.log(diff)
		const updates = [];
		for (const meeting of meetings) {
			const local = deepMerge(convertMeetingToEntry(meeting, session), diff);
			//console.log(local)
			const updated = convertEntryToMeeting(local, session);
			//console.log(updated)
			//console.log(entities[id], convertFromLocal(changesLocal))
			const changes = deepDiff(meeting, updated);
			//console.log(local, updated, changes)

			// If a (new) webex account is given, add a webex meeting
			if (changes.webexAccountId)
				changes.webexMeetingId = '$add';

			// If a (new) meeting ID is given, add a breakout
			if (changes.imatMeetingId)
				changes.imatBreakoutId = '$add';

			// If we change any webex meeting parameters, then include all parameters
			if (changes.webexMeeting)
				changes.webexMeeting = updated.webexMeeting;

			if (Object.keys(changes).length > 0)
				updates.push({id: meeting.id, changes});
		}
		//console.log(updates)
		return updates;
	}

	//hasUpdates = () => this.getUpdates().length > 0;
	hasUpdates = () => this.state.saved !== this.state.entry;

	changeEntry = (changes) => {
		this.setState(state => {
			let entry = {...state.entry, ...changes};
			// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
			changes = deepDiff(state.saved, entry) || {};
			if (Object.keys(changes).length === 0)
				entry = state.saved;
			return {...state, entry}
		});
	}

	clickAdd = async () => {
		const {setSelectedMeetings} = this.props;
		const {action} = this.state;

		if (action === 'update' && this.hasUpdates()) {
			const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
			if (!ok)
				return;
		}

		setSelectedMeetings([]);
		this.reinitState('add');
	}

	clickDelete = async () => {
		const {deleteMeetings} = this.props;
		const {meetings} = this.state;
		const ids = meetings.map(m => m.id);

		const ok = await ConfirmModal.show(
			'Are you sure you want to delete the ' + 
				(ids.length > 1? ids.length + ' selected entries?': 'selected entry?')
		);
		if (!ok)
			return;

		await deleteMeetings(ids);
		this.reinitState('update');
	}

	add = async () => {
		const {addMeetings, setSelectedMeetings, session} = this.props;
		let {entry} = this.state;

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId) {
			entry = {...entry, webexMeetingId: '$add'};
			if (entry.webexMeeting)
				entry.webexMeeting.publicMeeting = false;
		}

		// If an IMAT meeting ID is given then create a breakout
		if (entry.imatMeetingId)
			entry = {...entry, imatBreakoutId: '$add'};

		const {dates, ...rest} = entry;
		const meetings = dates.map(date => convertEntryToMeeting({...rest, date}, session));
		//console.log(meetings);

		this.setState({busy: true});
		const ids = await addMeetings(meetings);
		await setSelectedMeetings(ids);
		this.reinitState('update');
	}

	update = async () => {
		const {updateMeetings} = this.props;

		const updates = this.getUpdates();
		//console.log(updates)

		this.setState({busy: true});
		await updateMeetings(updates)
		this.reinitState('update');
	}

	cancel = () => {
		this.reinitState('update');
	}

	render() {
		const {loading} = this.props;
		const {action, entry, meetings, busy} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === 'update' && meetings.length === 0)
			notAvailableStr = 'Nothing selected';

		let submit, cancel;
		if (action === 'add') {
			submit = this.add;
			cancel = this.cancel;
		}
		else if (this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
		}

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='add'
						title='Add meeting'
						disabled={loading || busy}
						isActive={action === 'add'}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='delete'
						title='Delete meeting'
						disabled={loading || meetings.length === 0 || busy}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<MeetingEntry
						entry={entry}
						changeEntry={this.changeEntry}
						busy={busy}
						action={action}
						submit={submit}
						cancel={cancel}
					/>}
			</Container>
		)
	}

	static propTypes = {
		groupId: PropTypes.any,
		session: PropTypes.object,
		loading: PropTypes.bool.isRequired,
		selected: PropTypes.array.isRequired,
		entities: PropTypes.object.isRequired,
		defaults: PropTypes.object.isRequired,
		groupEntities: PropTypes.object.isRequired,
		setSelectedMeetings: PropTypes.func.isRequired,
		updateMeetings: PropTypes.func.isRequired,
		addMeetings: PropTypes.func.isRequired,
		deleteMeetings: PropTypes.func.isRequired
	}
}

const ConnectedMeetingDetails = connect(
	(state) => ({
		groupId: selectCurrentGroupId(state),
		session: selectCurrentSession(state),
		loading: selectMeetingsState(state).loading,
		selected: selectMeetingsState(state).selected,
		entities: selectSyncedMeetingEntities(state),
		defaults: selectCurrentGroupDefaults(state),
		groupEntities: selectGroupEntities(state)
	}),
	{
		setSelectedMeetings,
		updateMeetings,
		addMeetings,
		deleteMeetings
	}
)(MeetingDetails);

export default ConnectedMeetingDetails;
