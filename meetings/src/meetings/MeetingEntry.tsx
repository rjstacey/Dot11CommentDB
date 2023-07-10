import React from 'react';
import { Duration } from 'luxon';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	Form, Row, Field, Select, Input, InputDates, InputTime, Checkbox,
	isMultiple, Multiple,
	setError
} from 'dot11-components';

import {
	selectCurrentSession,
	selectCurrentSessionDates,
	Session,
} from '../store/sessions';

import { selectGroupEntities } from '../store/groups';

import TimeZoneSelector from '../components/TimeZoneSelector';
import GroupSelector from '../components/GroupSelector';
import CalendarAccountSelector from '../components/CalendarAccountSelector';
import ImatMeetingSelector from '../components/ImatMeetingSelector';

import { PartialWebexMeetingEntry, WebexMeetingAccount, WebexMeetingParamsEdit } from '../webexMeetings/WebexMeetingDetail';
import type { MultipleMeetingEntry, PartialMeetingEntry } from './MeetingDetails';

const MULTIPLE_STR = '(Multiple)';
const BLANK_STR = '(Blank)';

const isSessionMeeting = (session: Session | undefined) => session? (session.type === 'p' || session.type === 'i'): false;

function validDuration(duration: string) {
	if (!duration)
		return false;
	let d = duration.trim();
	let m = /^(\d*):(\d{2})$/.exec(d);
	try {
		let dt = Duration.fromObject(m? {hours: m[1]? Number(m[1]): 0, minutes: Number(m[2])}: {hours: Number(d)});
		return dt.isValid;
	}
	catch (error) {
		return false;
	}
}

type TeleconTime = {
	timezone: string;
	dates: string[];
	startTime: string;
	duration: string;
}

function TeleconMeetingTime({
	action,
	entry,
	changeEntry,
	readOnly
}: {
	action: "add" | "update";
	entry: Multiple<TeleconTime>;
	changeEntry: (changes: Partial<TeleconTime>) => void;
	readOnly?: boolean;
}) {
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

function SessionDateSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (date: string | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {
	const options = useAppSelector(selectCurrentSessionDates).map(date => ({value: date, label: date}))
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value: null);
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

function TimeslotSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {
	const timeslots = useAppSelector(selectCurrentSession)?.timeslots || [];
	const handleChange = (values: typeof timeslots) => onChange(values.length > 0? values[0].id: null);
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

function RoomSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {
	const rooms = useAppSelector(selectCurrentSession)?.rooms || [];
	const handleChange = (values: typeof rooms) => onChange(values.length > 0? values[0].id: null);
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

type MeetingTime = {
	dates: string[];
	startSlotId: number | null;
	startTime: string;
	endTime: string;
}

function SessionMeetingTime({
	entry,
	changeEntry,
	readOnly
}: {
	entry: Multiple<MeetingTime>;
	changeEntry: (changes: Partial<MeetingTime>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row>
				<Field label='Session day:'>
					<SessionDateSelector
						value={entry.dates.length === 1? entry.dates[0]: ''}
						onChange={date => changeEntry({dates: date? [date]: []})}
						placeholder={entry.dates.length > 1? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start slot:'>
					<TimeslotSelector
						value={isMultiple(entry.startSlotId)? null: entry.startSlotId}
						onChange={startSlotId => changeEntry({startSlotId})}
						placeholder={isMultiple(entry.startSlotId)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
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


export function MeetingEntryForm({
	entry,
	changeEntry,
	busy,
	action,
	submit,
	cancel,
	readOnly
}: {
	entry: MultipleMeetingEntry;
	changeEntry: (changes: PartialMeetingEntry) => void;
	action: "add-by-slot" | "add-by-date" | "update";
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const session = useAppSelector(selectCurrentSession);
	const groupEntities = useAppSelector(selectGroupEntities);

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
		if (action === 'add-by-slot') {
			submitLabel = "Add";
			title = "Add session meeting to selected slots";
		}
		else if (action === 'add-by-date') {
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

	function handleChange(changes: PartialMeetingEntry) {
		changes = {...changes};
		if ('organizationId' in changes) {
			const subgroup = changes.organizationId && groupEntities[changes.organizationId];
			if (subgroup)
				changes.summary = subgroup.name;
		}
		if ('startSlotId' in changes) {
			const slot = session?.timeslots.find(slot => slot.id === changes.startSlotId);
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

	function handleWebexMeetingChange(webexMeetingChanges: PartialWebexMeetingEntry) {
		const changes: PartialMeetingEntry = {webexMeeting: webexMeetingChanges};
		if ('accountId' in webexMeetingChanges)
			changes.webexAccountId = webexMeetingChanges.accountId;
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
							indeterminate={isMultiple(entry.isCancelled)}
							onChange={(e) => handleChange({isCancelled: e.target.checked})}
							disabled={readOnly}
						/>
					</Field>
				</Row>
				<Row>
					<Field label='Subgroup:'>
						<GroupSelector
							style={{minWidth: 200}}
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
				{action !== 'add-by-slot' &&
						(isSession?
							<SessionMeetingTime
								entry={entry}
								changeEntry={handleChange}
								readOnly={readOnly}
							/>:
							<TeleconMeetingTime
								action={action === 'update'? 'update': 'add'}
								entry={entry}
								changeEntry={handleChange}
								readOnly={readOnly}
							/>)}
				{action !== 'add-by-slot' &&
					<Row>
						<Field label='Location:'>
							{isSession?
								<RoomSelector
									value={isMultiple(entry.roomId)? null: entry.roomId}
									onChange={(roomId) => handleChange({roomId})}
									placeholder={isMultiple(entry.roomId)? MULTIPLE_STR: BLANK_STR}
									readOnly={readOnly}
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
					</Row>}
				{!isSession &&
					<Row>
						<Field label='Agenda includes motions:'>
							<Checkbox
								indeterminate={isMultiple(entry.hasMotions)}
								checked={isMultiple(entry.hasMotions)? false: entry.hasMotions}
								onChange={(e) => handleChange({hasMotions: e.target.checked})}
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
					<WebexMeetingParamsEdit
						entry={entry.webexMeeting}
						changeEntry={handleWebexMeetingChange}
						readOnly={readOnly}
					/>}
				<Row>
					<Field label='Calendar:'>
						<CalendarAccountSelector
							value={isMultiple(entry.calendarAccountId)? null: entry.calendarAccountId}
							onChange={(calendarAccountId) => handleChange({calendarAccountId})}
							placeholder={isMultiple(entry.calendarAccountId)? MULTIPLE_STR: undefined}
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

export default MeetingEntryForm;
