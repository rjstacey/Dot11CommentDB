import PropTypes from 'prop-types';
import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {Duration} from 'luxon';

import {isMultiple, MULTIPLE} from 'dot11-components/lib';
import {Form, Row, Field, Select, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';

import {setError} from 'dot11-components/store/error';

import {
	selectCurrentSession,
	selectCurrentSessionDates,
} from '../store/sessions';

import {selectGroupEntities} from '../store/groups';

import TimeZoneSelector from '../components/TimeZoneSelector';
import GroupSelector from '../components/GroupSelector';
import CalendarAccountSelector from '../components/CalendarAccountSelector';
import ImatMeetingSelector from '../components/ImatMeetingSelector';

import {WebexMeetingAccount, WebexMeetingParams} from '../webexMeetings/WebexMeetingDetail';

const MULTIPLE_STR = '(Multiple)';
const BLANK_STR = '(Blank)';

const isSessionMeeting = (session) => session && (session.type === 'p' || session.type === 'i');

function validDuration(duration) {
	if (!duration)
		return false;
	let d = duration.trim();
	let m = /^(\d*):(\d{2})$/.exec(d);
	try {
		d = Duration.fromObject(m? {hours: m[1]? m[1]: 0, minutes: m[2]}: {hours: d});
		return d.isValid;
	}
	catch (error) {
		return false;
	}
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
					<Input
						type='text'
						value={isMultiple(entry.duration)? '': entry.duration}
						onChange={e => changeEntry({duration: e.target.value})}
						disabled={readOnly}
						placeholder={isMultiple(entry.duration)? MULTIPLE_STR: 'H or H:mm'}
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
		duration: PropTypes.string.isRequired,
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
						value={isMultiple(entry.dates)? '': entry.dates[0]}
						onChange={date => changeEntry({dates: date? [date]: []})}
						placeholder={isMultiple(entry.dates)? MULTIPLE_STR: undefined}
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
		dates: PropTypes.array.isRequired,
		startSlotId: PropTypes.any.isRequired,
		startTime: PropTypes.string.isRequired,
		endTime: PropTypes.string.isRequired,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export function MeetingEntry({
	entry,
	changeEntry,
	busy,
	action,
	submit,
	cancel,
	readOnly
}) {
	const dispatch = useDispatch();
	const session = useSelector(selectCurrentSession);
	const groupEntities = useSelector(selectGroupEntities);

	const isSession = isSessionMeeting(session);

	let errMsg = '';
	if (entry.dates.length === 0)
		errMsg = 'Date not set';
	else if (!entry.startTime)
		errMsg = 'Start time not set';
	else if (isSession && !entry.endTime)
		errMsg = 'End time not set';
	else if (!isSession && !validDuration(entry.duration))
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
			const subgroup = groupEntities[changes.organizationId];
			if (subgroup)
				changes.summary = subgroup.name;
		}
		if ('startSlotId' in changes) {
			const slot = session.timeslots.find(slot => slot.id === changes.startSlotId);
			if (slot) {
				changes.startTime = slot.startTime;
				changes.endTime = slot.endTime;
			}
		}
		if ('roomId' in changes) {
			changes.location = '';
		}
		changeEntry(changes);
	}

	function handleWebexMeetingChange(webexMeetingChanges) {
		let webexMeeting = {...entry.webexMeeting, ...webexMeetingChanges};
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
			style={{flex: 1, overflow: 'hidden'}}
			title={title}
			busy={busy}
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			<div style={{overflow: 'auto'}}>
				<Row>
					<Field label='Cancel meeting:'>
						<Checkbox
							checked={!!entry.isCancelled}
							intdeterminate={isMultiple(entry.isCancelled)}
							onChange={(e) => handleChange({isCancelled: e.target.checked? 1: 0})}
							disabled={readOnly}
						/>
					</Field>
				</Row>
				<Row>
					<Field label='Subgroup:'>
						<GroupSelector
							value={isMultiple(entry.organizationId)? '': entry.organizationId || ''}
							onChange={(organizationId) => handleChange({organizationId})}
							placeholder={isMultiple(entry.organizationId)? MULTIPLE_STR: BLANK_STR}
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
							placeholder={isMultiple(entry.summary)? MULTIPLE_STR: BLANK_STR}
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
								onChange={(roomId) => handleChange({roomId})}
								placeholder={isMultiple(entry.roomId)? MULTIPLE_STR: BLANK_STR}
								disabled={readOnly}
							/>:
							<Input
								type='search'
								style={{width: 200}}
								value={isMultiple(entry.location)? '': entry.location || ''}
								onChange={(e) => handleChange({location: e.target.value})}
								placeholder={isMultiple(entry.location)? MULTIPLE_STR: BLANK_STR}
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
								onChange={(e) => handleChange({hasMotions: e.target.checked? 1: 0})}
								disabled={readOnly}
							/>
						</Field>
					</Row>}
				<Row>
					<Field label='IMAT meeting:'>
						<ImatMeetingSelector
							value={isMultiple(entry.imatMeetingId)? null: entry.imatMeetingId}
							onChange={(imatMeetingId) => handleChange({imatMeetingId})}
							placeholder={isMultiple(entry.imatMeetingId)? MULTIPLE_STR: BLANK_STR}
							readOnly={readOnly}
						/>
					</Field>
				</Row>
				<WebexMeetingAccount
					entry={entry.webexMeeting? entry.webexMeeting: {accountId: entry.webexAccountId}}
					changeEntry={handleWebexMeetingChange}
					readOnly={readOnly}
				/>
				{entry.webexMeeting && entry.webexMeeting.accountId &&
					<WebexMeetingParams
						entry={entry.webexMeeting}
						changeEntry={handleWebexMeetingChange}
						readOnly={readOnly}
					/>}
				<Row>
					<Field label='Calendar:'>
						<CalendarAccountSelector
							value={entry.calendarAccountId}
							onChange={(calendarAccountId) => handleChange({calendarAccountId})}
							portal={document.querySelector('#root')}
							dropdownPosition='top'
							readOnly={readOnly}
						/>
					</Field>
				</Row>
			</div>
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
		webexMeeting: PropTypes.object,
		calendarAccountId: PropTypes.any,
		imatMeeingId: PropTypes.any
	}),
	changeEntry: PropTypes.func.isRequired,
	isSession: PropTypes.bool,
}

export default MeetingEntry;
