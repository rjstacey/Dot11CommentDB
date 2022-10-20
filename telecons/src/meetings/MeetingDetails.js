import PropTypes from 'prop-types';
import React from 'react';
import {connect, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton, Form, Row, Col, Field, FieldLeft, Select, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';

import {
	selectCurrentSession,
	selectCurrentSessionDates,
} from '../store/sessions';

import {
	addTelecons, 
	updateTelecons, 
	deleteTelecons, 
	setSelectedTelecons, 
	selectTeleconsState, 
	selectSyncedTeleconEntities
} from '../store/telecons';
import {selectCurrentGroupId, selectCurrentGroupDefaults} from '../store/current';

import {selectGroupEntities} from '../store/groups';

import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TimeZoneSelector from '../components/TimeZoneSelector';
import GroupSelector from '../components/GroupSelector';
import CalendarAccountSelector from '../components/CalendarAccountSelector';
import ImatMeetingSelector from '../components/ImatMeetingSelector';
import TopRow from '../components/TopRow';

const MULTIPLE_STR = '(Multiple)';

const defaultLocalEntry = {
	dates: [],
	time: '',
	duration: 1,
	hasMotions: false,
}

export const defaultWebexMeeting = {
	password: 'wireless',
	enabledJoinBeforeHost: true,
	joinBeforeHostMinutes: 10,
	enableConnectAudioBeforeHost: true,
	publicMeeting: false,
	meetingOptions: {
		enabledChat: true,
		enabledVideo: true,
		enabledNote: false,
		enabledClosedCaptions: true,
		enabledFileTransfer: false
	}
}

const toTimeStr = (hour, min) => ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
const fromTimeStr = (str) => {
	const m = str.match(/(\d+):(\d+)/);
	return m? {hour: parseInt(m[1], 10), minute: parseInt(m[2], 10)}: {hour: 0, minute: 0};
}

const isSessionMeeting = (session) => session && (session.type === 'p' || session.type === 'i');

function webexMeetingParams(webexMeeting) {

	function getProperties(template, input) {
		const output = {};
		for (const key of Object.keys(template)) {
			if (typeof template[key] === 'object' && typeof input[key] === 'object')
				output[key] = getProperties(template[key], input[key])
			else if (template.hasOwnProperty(key) && input.hasOwnProperty(key))
				output[key] = input[key];
		}
		return output;
	}

	const w = getProperties(defaultWebexMeeting, webexMeeting);
	if (webexMeeting.hasOwnProperty('templateId'))
		w.templateId = webexMeeting.templateId;
	return w;
}

export function convertEntryToMeeting(entry, session) {
	let {date, startTime, endTime, startSlotId, endSlotId, duration, roomId, webexMeeting, ...rest} = entry;
	const meeting = {...rest};

	if (isSessionMeeting(session)) {
		const zone = session.timezone;
		meeting.timezone = zone;
		meeting.start = DateTime.fromISO(date, {zone}).set(fromTimeStr(startTime)).toISO();
		meeting.end = DateTime.fromISO(date, {zone}).set(fromTimeStr(endTime)).toISO();

		const room = session.rooms.find(r => r.id === roomId);
		if (room)
			meeting.location = room.name;
	}
	else {
		const zone = entry.timezone;
		const start = DateTime.fromISO(date, {zone}).set(fromTimeStr(startTime));
		meeting.start = start.toISO();
		const m = /(\d+):(\d+)/.exec(duration);
		meeting.end = start.plus(m? {hours: m[1], minutes: m[2]}: {hours: duration}).toISO();
	}

	if (webexMeeting) {
		meeting.webexMeeting = webexMeetingParams(webexMeeting);
		meeting.webexMeeting.publicMeeting = false;
	}

	return meeting;
}

function convertEntryToMeetingMultipleDates(entry, session) {
	const {dates, ...rest} = entry;
	return dates.map(date => convertEntryToMeeting({...rest, date}, session));
}

function convertMeetingToEntry(meeting, session) {
	let {start, end, webexMeeting, ...rest} = meeting;
	let entry = {...rest};

	if (isSessionMeeting(session)) {
		const room = session.rooms.find(r => r.name === meeting.location);
		entry.roomId =  room? room.id: 0;

		const zone = session.timezone;
		start = DateTime.fromISO(start, {zone});
		end = DateTime.fromISO(end, {zone});
		entry.date = start.toISODate({zone});
		entry.startTime = start.toFormat('HH:mm');
		entry.endTime = end.toFormat('HH:mm');
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
	else {
		const zone = meeting.timezone;
		start = DateTime.fromISO(start, {zone});
		entry.date = start.toISODate({zone});
		entry.startTime = start.toFormat('HH:mm');
		end = DateTime.fromISO(end, {zone});
		entry.duration = DateTime.fromISO(end, {zone}).diff(start, 'hours').hours;
	}

	if (webexMeeting) {
		// We only care about certain configurable properties
		entry.webexMeeting = webexMeetingParams(webexMeeting);
	}

	return entry;
}

function convertMeetingsToEntryTagMultiple(meetings, session) {

	let entry = {}, dates = [];
	for (const meeting of meetings) {
		const original = convertMeetingToEntry(meeting, session);
		dates.push(original.date);
		entry = deepMergeTagMultiple(entry, original);
	}
	entry.dates = [...new Set(dates.sort())];	// array of unique dates

	return entry;
}

function cancelUpdates(selected, entities) {
	/* Default is to set all entries to cancelled.
	 * However, if they are already all cancelled, then uncancel. */
	let isCancelled = 1;
	if (selected.every(id => entities[id].isCancelled))
		isCancelled = 0;
	const updates = [];
	for (const id of selected) {
		const entity = entities[id];
		// Remove "cancelled" (or "canceled") and any leading or trailing " - "
		let summary = entity.summary.replace(/cancelled|canceled/i, '').replace(/^[\s-]*/, '').replace(/[\s-]*$/, '');
		if (isCancelled)
			summary = 'CANCELLED - ' + summary;
		const changes = {
			isCancelled,
			summary
		}
		updates.push({id, changes});
	}
	return updates;
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
				<Field label='Date:'>
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
					<Input
						type='search'
						value={isMultiple(entry.duration)? '': entry.duration || ''}
						onChange={e => changeEntry({duration: e.target.value})}
						placeholder={isMultiple(entry.duration)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
		</>
	)
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

function SessionMeetingTime({action, entry, changeEntry, readOnly}) {
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

function CreditSelector({value, onChange}) {
	return (
		<div style={{display: 'flex', justifyContent: 'space-between'}}>
			<div style={{margin: '0 5px'}}>
				<input
					type='radio'
					id='extra'
					value='Extra'
					checked={value === 'Extra'}
					onChange={e => onChange(e.target.value)}
				/>
				<label htmlFor='extra'>Extra</label>
			</div>
			<div style={{margin: '0 5px'}}>
				<input
					type='radio'
					id='normal'
					value='Normal'
					checked={value === 'Normal'}
					onChange={e => onChange(e.target.value)}
				/>
				<label htmlFor='normal'>Normal</label>
			</div>
			<div style={{margin: '0 5px'}}>
				<input
					type='radio'
					id='other'
					value='Other'
					checked={value === 'Other'}
					onChange={e => onChange(e.target.value)}
				/>
				<label htmlFor='other'>Other</label>
			</div>
			<div style={{margin: '0 5px'}}>
				<input
					type='radio'
					id='zero'
					value='Zero'
					checked={value === 'Zero'}
					onChange={e => onChange(e.target.value)}
				/>
				<label htmlFor='zero'>Zero</label>
			</div>
		</div>
	)
}

export function WebexMeetingEdit({
	value,
	onChange,
	webexAccountId,
	onChangeWebexAccountId,
	readOnly,
	isNew,
}) {
	const webexMeeting = value || {};
	const meetingOptions = webexMeeting.meetingOptions || {};

	const changeWebexMeeting = (changes) => {
		if (changes.enabledJoinBeforeHost === false) {
			changes.joinBeforeHostMinutes = 0;
			changes.enableConnectAudioBeforeHost = false;
		}
		onChange(changes);
	}

	const changeWebexMeetingOptions = (changes) => {
		const u = {...meetingOptions, ...changes};
		changeWebexMeeting({meetingOptions: u});
	}

	return (
		<Col
			style={{marginLeft: 10}}
		>
			<Field label='Webex account'>
				<WebexAccountSelector
					value={isMultiple(webexAccountId)? null: webexAccountId}
					onChange={webexAccountId => onChangeWebexAccountId(webexAccountId)}
					placeholder={isMultiple(webexAccountId)? MULTIPLE_STR: undefined}
					readOnly={readOnly}
				/>
			</Field>
			{!webexMeeting.id &&
				<Field label='Template'>
					<WebexTemplateSelector
						value={webexMeeting.templateId}
						onChange={templateId => changeWebexMeeting({templateId})}
						accountId={isMultiple(webexAccountId)? null: webexAccountId}
						readOnly={readOnly}
					/>
				</Field>}
			<Field label='Password:'>
				<Input 
					type='search'
					value={webexMeeting.password}
					onChange={e => changeWebexMeeting({password: e.target.value})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Join before host (minutes):'>
				<Checkbox
					checked={webexMeeting.enabledJoinBeforeHost}
					onChange={e => changeWebexMeeting({enabledJoinBeforeHost: e.target.checked})}
					disabled={readOnly}
				/>
				<Input 
					type='text'
					value={webexMeeting.joinBeforeHostMinutes}
					onChange={e => changeWebexMeeting({joinBeforeHostMinutes: e.target.value})}
					disabled={readOnly || !webexMeeting.enabledJoinBeforeHost}
				/>
			</Field>
			<Field label='Connect audio before host:'>
				<Checkbox 
					checked={webexMeeting.enableConnectAudioBeforeHost}
					onChange={e => changeWebexMeeting({enableConnectAudioBeforeHost: e.target.checked})}
					disabled={readOnly || !webexMeeting.enabledJoinBeforeHost}
				/>
			</Field>
			<Row>
				<FieldLeft label='Chat:'>
					<Checkbox 
						checked={meetingOptions.enabledChat}
						onChange={e => changeWebexMeetingOptions({enabledChat: e.target.checked})}
						disabled={readOnly}
					/>
				</FieldLeft>
				<FieldLeft label='Video:'>
					<Checkbox 
						checked={meetingOptions.enabledVideo}
						onChange={e => changeWebexMeetingOptions({enabledVideo: e.target.checked})}
						disabled={readOnly}
					/>
				</FieldLeft>
			</Row>
			<Field label='Notes:'>
				<Checkbox 
					checked={meetingOptions.enabledNote}
					onChange={e => changeWebexMeetingOptions({enabledNote: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Closed captions:'>
				<Checkbox 
					checked={meetingOptions.enabledClosedCaptions}
					onChange={e => changeWebexMeetingOptions({enabledClosedCaptions: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='File transfer:'>
				<Checkbox 
					checked={meetingOptions.enabledFileTransfer}
					onChange={e => changeWebexMeetingOptions({enabledFileTransfer: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
		</Col>
	)
}

export function MeetingEntry({
	session,
	entry,
	changeEntry,
	busy,
	action,
	actionAdd,
	actionUpdate,
	actionCancel,
}) {
	const readOnly = action === 'view';
	const isSession = isSessionMeeting(session);

	return (
		<Form
			title={isSession? 'Session meeting': 'Telecon'}
			busy={busy}
			submitLabel={action === 'add'? 'Add': 'Update'}
			submit={action === 'add'? actionAdd: actionUpdate}
			cancel={actionCancel}
		>
			<Row>
				<Field label='Subgroup:'>
					<GroupSelector
						value={isMultiple(entry.organizationId)? '': entry.organizationId || ''}
						onChange={(organizationId) => changeEntry({organizationId})}
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
						onChange={(e) => changeEntry({summary: e.target.value})}
						placeholder={isMultiple(entry.summary)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			{isSession?
				<SessionMeetingTime
					action={action}
					entry={entry}
					changeEntry={changeEntry}
					readOnly={readOnly}
				/>:
				<TeleconMeetingTime
					action={action}
					entry={entry}
					changeEntry={changeEntry}
					readOnly={readOnly}
				/>}
			<Row>
				<Field label='Location:'>
					{isSession?
						<RoomSelector
							value={isMultiple(entry.roomId)? []: entry.roomId}
							onChange={roomId => changeEntry({roomId})}
							placeholder={isMultiple(entry.roomId)? MULTIPLE_STR: undefined}
							disabled={readOnly}
						/>:
						<Input
							type='search'
							style={{width: 200}}
							value={isMultiple(entry.location)? '': entry.location || ''}
							onChange={(e) => changeEntry({location: e.target.value})}
							placeholder={isMultiple(entry.location)? MULTIPLE_STR: undefined}
							disabled={readOnly}
						/>}
				</Field>
			</Row>
			{isSession && 
				<Row>
					<Field label='Credit:'>
						<CreditSelector
							value={isMultiple(entry.credit)? '': entry.credit || ''}
							onChange={(credit) => changeEntry({credit})}
						/>
					</Field>
				</Row>}
			{!isSession &&
				<Row>
					<Field label='Agenda includes motions:'>
						<Checkbox
							indeterminate={isMultiple(entry.hasMotions)}
							checked={!!entry.hasMotions}
							onChange={e => changeEntry({hasMotions: e.target.checked})}
							disabled={readOnly}
						/>
					</Field>
				</Row>}
			<Row>
				<Field label='Webex:'>
					<Checkbox
						checked={!!entry.webexMeeting}
						onChange={e => changeEntry({webexMeeting: e.target.checked? {}: null})}
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
			<Row>
				<Field label='Calendar:'>
					<CalendarAccountSelector
						value={entry.calendarAccountId}
						onChange={calendarAccountId => changeEntry({calendarAccountId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT meeting:'>
					<ImatMeetingSelector
						value={entry.imatMeetingId}
						onChange={imatMeetingId => changeEntry({imatMeetingId})}
					/>
				</Field>
			</Row>
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

class MeetingDetails extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.initState('update');
	}

	componentDidUpdate(prevProps, prevState) {
		const prevSelected = prevProps.selected;
		const {selected, setSelectedTelecons} = this.props;
		const {action, ids} = this.state;

		const changeWithConfirmation = async () => {
			console.log('check for changes')
			const updates = this.getUpdates();
			if (updates.length > 0) {
				console.log(updates)
				const ok = await ConfirmModal.show('Changes not applied! Do you want to discard changes?');
				if (!ok) {
					setSelectedTelecons(ids);
					return;
				}
			}
			this.setState(this.initState('update'));
		}

		if (action !== 'add' && selected.join() !== prevSelected.join()) {
			changeWithConfirmation();
		}
	}
	
	initState = (action) => {
		const {entities, selected, defaults, groupId, session} = this.props;

		let entry;
		const meetings = selected.map(id => entities[id]);
		if (meetings.length > 0) {
			entry = convertMeetingsToEntryTagMultiple(meetings, session);
			if (action === 'add') {
				delete entry.id;
				delete entry.calendarEventId;
				delete entry.webexMeetingId;
				if (isMultiple(entry.starTime))
					entry.starTime = '';
				if (isMultiple(entry.hasMotions))
					entry.hasMotions = false;
				entry.isCancelled = false;
				entry.summary = this.defaultSummary(entry.organizationId, entry.hasMotions);
				entry.timezone = session? session.timezone: defaults.timezone;
				entry.calendarAccountId = defaults.calendarAccountId;
				entry.webexAccountId = defaults.webexAccountId;
				entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webexTemplateId};
				entry.imatMeetingId = session? session.imatMeetingId: null;
			}
			else {
				if (isMultiple(entry.date))
					entry.dates = MULTIPLE;
				else
					entry.dates = [entry.date];
			}
		}
		else {
			entry = {...defaultLocalEntry, organizationId: groupId};
			entry.summary = this.defaultSummary(entry.organizationId, entry.hasMotions);
			entry.timezone = session? session.timezone: defaults.timezone;
			entry.calendarAccountId = defaults.calendarAccountId;
			entry.webexAccountId = defaults.webexAccountId;
			entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webexTemplateId};
			entry.imatMeetingId = session? session.imatMeetingId: null;
		}
		//console.log(entry)
		return {
			action,
			entry,
			saved: entry,
			meetings,
			busy: false
		};
	}

	defaultSummary = (organizationId, hasMotions) => {
		const {groupEntities} = this.props;

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

	getUpdates = () => {
		let {entry, saved, meetings} = this.state;
		const {session} = this.props;		

		// Get modified local entry without dates and webexMeeting.templateId
		let {webexMeeting, dates, ...e} = entry;
		if (webexMeeting) {
			e.webexMeeting = {...webexMeeting};
			delete e.webexMeeting.templateId;
		}
		if (dates.length === 1)
			e.date = dates[0];

		// Find differences
		const diff = deepDiff(saved, e);
		//console.log(diff)
		const updates = [];
		for (const meeting of meetings) {
			// Get original without superfluous webex params
			const {webexMeeting, ...entity} = meeting;
			if (webexMeeting)
				entity.webexMeeting = webexMeetingParams(webexMeeting);

			const local = deepMerge(convertMeetingToEntry(entity, session), diff);
			//console.log(local)
			const updated = convertEntryToMeeting(local, session);
			//console.log(updated)
			//console.log(entities[id], convertFromLocal(changesLocal))
			const changes = deepDiff(entity, updated);
			//console.log(local, updated, changes)

			// If a (new) webex account is given, add a webex meeting
			if (changes.webexAccountId)
				changes.webexMeetingId = '$add';

			// If a (new) meeting ID is given, add a breakout
			if (changes.imatMeetingId)
				changes.imatBreakoutId = '$add';

			if (Object.keys(changes).length > 0)
				updates.push({id: meeting.id, changes});
		}
		return updates;
	}

	clickAdd = async () => {
		const {setSelectedTelecons} = this.props;
		const {action} = this.state;

		console.log('clickAdd')
		if (action === 'update') {
			const updates = this.getUpdates();
			if (updates.length > 0) {
				const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
				if (!ok)
					return;
			}
		}
		if (action !== 'add') {
			setSelectedTelecons([]);
			this.setState(this.initState('add'));
		}
	}

	clickDelete = async () => {
		const {deleteTelecons} = this.props;
		const ids = this.state.ids;
		const ok = await ConfirmModal.show(
			'Are you sure you want to delete the ' + 
				(ids.length > 1?
					ids.length + ' selected entries?':
					'selected entry?')
		);
		if (!ok)
			return;
		await deleteTelecons(ids);
		this.setState(this.initState('update'));
	}

	clickCancel = async () => {
		const {updateTelecons, entities} = this.props;
		const ids = this.state.ids;
		const updates = cancelUpdates(ids, entities);
		await updateTelecons(updates);
		this.setState(this.initState('update'));
	}

	changeEntry = (changes) => {
		const {session, defaults} = this.props;
		const {action, entry} = this.state;
		if (action === 'view') {
			console.warn("Update when read-only");
			return;
		}
		changes = {...changes};
		if ('organizationId' in changes) {
			changes.summary = this.defaultSummary(changes.organizationId, entry.hasMotions);
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
		if ('webexMeeting' in changes) {
			if (!changes.webexMeeting) {
				changes.webexAccountId = null;
			}
			else if (Object.keys(changes.webexMeeting).length === 0) {
				changes.webexAccountId = defaults.webexAccountId;
				changes.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webexTemplateId};
			}
		}
		this.setState(state => {
			const entry = deepMerge(state.entry, changes);
			return {...state, entry}
		});
	}

	add = async () => {
		const {addTelecons, setSelectedTelecons, session} = this.props;
		let {entry} = this.state;

		let errMsg = '';
		if (entry.dates.length === 0)
			errMsg = 'Date(s) not set';
		else if (!entry.time)
			errMsg = 'Start time not set'
		else if (!entry.duration)
			errMsg = 'Duration not set';
		else if (!entry.timezone)
			errMsg = 'Time zone not set';
		else if (entry.webexMeeting && !entry.webexAccountId)
			errMsg = 'Must select Webex account to schedule webex meeting';

		if (errMsg) {
			ConfirmModal.show(errMsg, false);
			return;
		}

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId)
			entry = {...entry, webexMeetingId: '$add'};

		// If an IMAT meeting ID is given then create a breakout
		if (entry.imatMeetingId)
			entry = {...entry, imatBreakoutId: '$add'};

		const meetings = convertEntryToMeetingMultipleDates(entry, session);
		//console.log(meetings);
		
		this.setState({busy: true});
		addTelecons(meetings)
			.then(ids => setSelectedTelecons(ids))
			.then(() => this.setState(this.initState('update')));
	}

	update = async () => {
		const {updateTelecons} = this.props;

		const updates = this.getUpdates();
		//console.log(updates)

		this.setState({busy: true});
		updateTelecons(updates)
			.then(() => this.setState(this.initState('update')));
	}

	cancel = () => {
		this.setState(this.initState('update'));
	}

	render() {
		const {loading, selected, session} = this.props;
		const {action, entry} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === 'update' && selected.length === 0)
			notAvailableStr = 'Nothing selected';

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='cancel'
						title={(entry.isCancelled === 1? 'Uncancel': 'Cancel') + ' meeting'}
						disabled={loading}
						isActive={entry.isCancelled === 1}
						onClick={this.clickCancel}
					/>
					<ActionButton
						name='add'
						title='Add meeting'
						disabled={loading}
						isActive={action === 'add'}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='delete'
						title='Delete meeting'
						disabled={loading || selected.length === 0}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<MeetingEntry
						session={session}
						entry={entry}
						changeEntry={this.changeEntry}
						busy={this.state.busy}
						action={action}
						actionAdd={this.add}
						actionUpdate={this.update}
						actionCancel={this.cancel}
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
		setSelectedTelecons: PropTypes.func.isRequired,
		updateTelecons: PropTypes.func.isRequired,
		addTelecons: PropTypes.func.isRequired,
		deleteTelecons: PropTypes.func.isRequired
	}
}

const ConnectedMeetingDetails = connect(
	(state) => ({
		groupId: selectCurrentGroupId(state),
		session: selectCurrentSession(state),
		loading: selectTeleconsState(state).loading,
		selected: selectTeleconsState(state).selected,
		entities: selectSyncedTeleconEntities(state),
		defaults: selectCurrentGroupDefaults(state),
		groupEntities: selectGroupEntities(state)
	}),
	{
		setSelectedTelecons,
		updateTelecons,
		addTelecons,
		deleteTelecons
	}
)(MeetingDetails);

export default ConnectedMeetingDetails;
