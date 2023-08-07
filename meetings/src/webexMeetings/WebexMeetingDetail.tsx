import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {
	ActionButton, Form, Row, Field, FieldLeft, Input, InputTime, Checkbox, Select,
	ConfirmModal,
	deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE, Multiple,
	setError,
} from 'dot11-components';

import {
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	addWebexMeeting,
	updateWebexMeetings,
	deleteWebexMeetings,
	setSelected,
	defaultWebexMeetingParams,
	webexMeetingToWebexMeetingParams,
	WebexMeetingParams, WebexMeetingOptions, WebexMeetingAudioConnectionOptions,
	WebexMeetingUpdate,
} from '../store/webexMeetings';

import { updateMeetings, Meeting } from '../store/meetings';
import { selectWebexAccountEntities } from '../store/webexAccounts';
import { selectCurrentGroupDefaults } from '../store/current';
import { selectCurrentSession } from '../store/sessions';
import { selectUserMeetingsAccess, AccessLevel } from '../store/user';

import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TopRow from '../components/TopRow';
import TimeZoneSelector from '../components/TimeZoneSelector';
import InputTimeRangeAsDuration from '../components/InputTimeRangeAsDuration';
import MeetingSelector from '../components/MeetingSelector';
import { RootState } from '../store';

const MULTIPLE_STR = '(Multiple)';
const BLANK_STR = '(Blank)';

export const defaultWebexMeeting: WebexMeetingEntry = {
	...defaultWebexMeetingParams,
	accountId: null,
	title: '',
	timezone: '',
	date: '',
	startTime: '',
	endTime: '02:00',
	templateId: null,
}

export function WebexMeetingAccount({
	entry,
	changeEntry,
	readOnly
}: {
	entry: Multiple<{accountId: number | null}>;
	changeEntry: (changes: Partial<WebexMeetingEntry>) => void;
	readOnly?: boolean;
}) {
	const webexAccountEntities = useAppSelector(selectWebexAccountEntities);
	const defaults = useAppSelector(selectCurrentGroupDefaults);

	function onChange(accountId: number | null) {
		let changes: Partial<WebexMeetingEntry> = {accountId};

		// If the account is changed to the default webex account, select the default template.
		// If not, try to find the default template for the account.
		if (accountId === defaults.webexAccountId && defaults.webexTemplateId) {
			changes.templateId = defaults.webexTemplateId;
		}
		else {
			const webexAccount = accountId && webexAccountEntities[accountId];
			if (webexAccount) {
				const template = webexAccount.templates.find(t => t.isDefault);
				if (template)
					changes.templateId = template.id;
			}
		}
		// If account was not previously selected, revert to defaults
		if (!entry.accountId && accountId) {
			changes = {
				...defaultWebexMeeting,
				...changes
			};
		}

		changeEntry(changes);
	}

	return (
		<Row>
			<Field label='Webex account'>
				<WebexAccountSelector
					value={isMultiple(entry.accountId)? null: entry.accountId}
					onChange={onChange}
					placeholder={isMultiple(entry.accountId)? MULTIPLE_STR: undefined}
					readOnly={readOnly}
					portal={document.querySelector('#root')}
				/>
			</Field>
		</Row>
	)
}

const entryToneOptions = [
	{value: 'noTone', label: 'No tone'},
	{value: 'beep', label: 'Beep'},
	{value: 'announceName', label: 'Announce name'}
];

/*
 * Allow `null` as value for the case when MULTIPLE options are present, but don't allow it to be set to `null`
 * through `onChange()`.
 */
function SelectEntryAndExitTone({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {

	const values = entryToneOptions.filter(e => e.value === value);
	if (values.length === 0)
		onChange(entryToneOptions[0].value)
	const handleChange = (values: typeof entryToneOptions) => onChange(values.length > 0? values[0].value: entryToneOptions[0].value);
	return (
		<Select
			values={values}
			options={entryToneOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

const joinMinutes = [0, 5, 10, 15];

function SelectJoinBeforeHostMinutes({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {

	let options = joinMinutes.map(value => ({value, label: value.toString()}));
	if (typeof value === 'number' && !joinMinutes.includes(value))
		options.concat([{value, label: value.toString()}]);

	let values = options.filter(e => e.value === value);

	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value: 0);

	return (
		<Select
			values={values}
			options={options}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

type WebexMeetingTitleDateTime = {
	title: string;
	timezone: string;
	date: string;
	startTime: string;
	endTime: string;
}

function WebexMeetingTitleDateTimeEdit({
	entry,
	changeEntry,
	readOnly
}: {
	entry: Multiple<WebexMeetingTitleDateTime>;
	changeEntry: (changes: Partial<WebexMeetingTitleDateTime>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row>
				<Field label='Title:'>
					<Input
						type='text'
						value={isMultiple(entry.title)? '': entry.title}
						onChange={e => changeEntry({title: e.target.value})}
						placeholder={isMultiple(entry.title)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						style={{width: 200}}
						value={isMultiple(entry.timezone)? '': entry.timezone}
						onChange={(timezone) => changeEntry({timezone})}
						placeholder={isMultiple(entry.timezone)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Date:'>
					<Input
						type='date'
						//disablePast
						value={isMultiple(entry.date)? '': entry.date}
						onChange={e => changeEntry({date: e.target.value})}
						placeholder={isMultiple(entry.date)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start time:'>
					<InputTime
						value={isMultiple(entry.startTime)? '': entry.startTime}
						onChange={(startTime) => changeEntry({startTime})}
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


function WebexMeetingAudioOptionsEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: Multiple<WebexMeetingAudioConnectionOptions>;
	changeEntry: (changes: Partial<WebexMeetingAudioConnectionOptions>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row>
				<Field label='Allow unmute self:'>
					<Checkbox
						checked={isMultiple(entry.allowAttendeeToUnmuteSelf)? false: entry.allowAttendeeToUnmuteSelf}
						indeterminate={isMultiple(entry.allowAttendeeToUnmuteSelf)}
						onChange={e => changeEntry({allowAttendeeToUnmuteSelf: e.target.checked})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Mute attendee on entry:'>
					<Checkbox
						checked={isMultiple(entry.muteAttendeeUponEntry)? false: entry.muteAttendeeUponEntry}
						indeterminate={isMultiple(entry.muteAttendeeUponEntry)}
						onChange={e => changeEntry({muteAttendeeUponEntry: e.target.checked})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Entry and exit tone:'>
					<SelectEntryAndExitTone
						value={isMultiple(entry.entryAndExitTone)? null: entry.entryAndExitTone}
						onChange={entryAndExitTone => changeEntry({entryAndExitTone})}
						portal={document.querySelector('#root')}
						placeholder={isMultiple(entry.entryAndExitTone)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
		</>
	)
}

function WebexMeetingOptionsEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: Multiple<WebexMeetingOptions>;
	changeEntry: (changes: Partial<WebexMeetingOptions>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row style={{flexWrap: 'wrap'}}>
			<FieldLeft label='Chat:'>
				<Checkbox 
					checked={isMultiple(entry.enabledChat)? false: entry.enabledChat}
					indeterminate={isMultiple(entry.enabledChat)}
					onChange={e => changeEntry({enabledChat: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='Video:'>
				<Checkbox 
					checked={isMultiple(entry.enabledVideo)? false: entry.enabledVideo}
					indeterminate={isMultiple(entry.enabledVideo)}
					onChange={e => changeEntry({enabledVideo: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='Notes:'>
				<Checkbox 
					checked={isMultiple(entry.enabledNote)? false: entry.enabledNote}
					indeterminate={isMultiple(entry.enabledNote)}
					onChange={e => changeEntry({enabledNote: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='Closed captions:'>
				<Checkbox 
					checked={isMultiple(entry.enabledClosedCaptions)? false: entry.enabledClosedCaptions}
					indeterminate={isMultiple(entry.enabledClosedCaptions)}
					onChange={e => changeEntry({enabledClosedCaptions: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='File transfer:'>
				<Checkbox 
					checked={isMultiple(entry.enabledFileTransfer)? false: entry.enabledFileTransfer}
					indeterminate={isMultiple(entry.enabledFileTransfer)}
					onChange={e => changeEntry({enabledFileTransfer: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
		</Row>
	)
}

export function WebexMeetingParamsEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: MultipleWebexMeetingEntry;
	changeEntry: (changes: PartialWebexMeetingEntry) => void;
	readOnly?: boolean;
}) {

	function handleChange(changes: PartialWebexMeetingEntry) {
		if (changes.enabledJoinBeforeHost === false) {
			changes.joinBeforeHostMinutes = 0;
			changes.enableConnectAudioBeforeHost = false;
		}
		changeEntry(changes);
	}

	return (
		<>
			{entry.templateId &&
				<Row>
					<Field label='Template'>
						<WebexTemplateSelector
							value={entry.templateId}
							onChange={templateId => handleChange({templateId})}
							accountId={isMultiple(entry.accountId)? null: entry.accountId}
							readOnly={readOnly}
						/>
					</Field>
				</Row>}
			<Row>
				<Field label='Password:'>
					<Input 
						type='search'
						value={isMultiple(entry.password)? MULTIPLE_STR: entry.password}
						onChange={e => handleChange({password: e.target.value})}
						placeholder={isMultiple(entry.password)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Join before host (minutes):'>
					<div style={{display: 'flex', alignItems: 'center'}}>
						<Checkbox
							checked={isMultiple(entry.enabledJoinBeforeHost)? false: entry.enabledJoinBeforeHost}
							indeterminate={isMultiple(entry.enabledJoinBeforeHost)}
							onChange={e => handleChange({enabledJoinBeforeHost: e.target.checked})}
							disabled={readOnly}
						/>
						<SelectJoinBeforeHostMinutes
							value={isMultiple(entry.joinBeforeHostMinutes)? null: entry.joinBeforeHostMinutes}
							onChange={joinBeforeHostMinutes => handleChange({joinBeforeHostMinutes})}
							placeholder={isMultiple(entry.joinBeforeHostMinutes)? MULTIPLE_STR: BLANK_STR}
							readOnly={readOnly || !entry.enabledJoinBeforeHost}
						/>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label='Connect audio before host:'>
					<Checkbox 
						checked={isMultiple(entry.enableConnectAudioBeforeHost)? false: entry.enableConnectAudioBeforeHost}
						indeterminate={isMultiple(entry.enableConnectAudioBeforeHost)}
						onChange={e => handleChange({enableConnectAudioBeforeHost: e.target.checked})}
						disabled={readOnly || !entry.enabledJoinBeforeHost}
					/>
				</Field>
			</Row>
			<WebexMeetingAudioOptionsEdit
				entry={entry.audioConnectionOptions}
				changeEntry={audioConnectionOptions => changeEntry({audioConnectionOptions})}
				readOnly={readOnly}
			/>
			<WebexMeetingOptionsEdit
				entry={entry.meetingOptions || {}}
				changeEntry={meetingOptions => changeEntry({meetingOptions})}
				readOnly={readOnly}
			/>
		</>
	)
}

function AssociatedMeetingSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof MeetingSelector>, "value" | "onChange" | "fromDate" | "toDate">) {
	const session = useAppSelector(selectCurrentSession);
	let fromDate, toDate;
	if (session) {
		fromDate = session.startDate;
		toDate = session.endDate;
	}

	function handleChange(v: number | null) {
		if (v !== value)
			onChange(v);
	}

	return (
		<MeetingSelector
			value={value}
			onChange={handleChange}
			fromDate={fromDate}
			toDate={toDate}
			{...otherProps}
		/>
	)
}

function WebexMeetingEntryForm({
	action,
	entry,
	changeEntry,
	submit,
	cancel,
	readOnly
}: {
	action: "add" | "update";
	entry: MultipleWebexMeetingEntry;
	changeEntry: (changes: PartialWebexMeetingEntry) => void;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	let submitForm, cancelForm, submitLabel, errMsg = '';
	let title = "Webex meeting";
	if (submit) {
		if (!entry.date)
			errMsg = 'Date not set';
		else if (!entry.startTime)
			errMsg = 'Start time not set'
		else if (!entry.endTime)
			errMsg = 'Duration not set';
		else if (!entry.timezone)
			errMsg = 'Time zone not set';
		else if (!entry.accountId)
			errMsg = 'Must select Webex account to schedule webex meeting';

		if (action === 'add') {
			submitLabel = "Add";
			title = "Add Webex meeting";
		}
		else {
			submitLabel = "Update";
			title = "Update Webex meeting";
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

	return (
		<Form
			title={title}
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			<WebexMeetingAccount
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<WebexMeetingTitleDateTimeEdit
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<WebexMeetingParamsEdit
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<Row>
				<Field label='Associate with meeting:'>
					<AssociatedMeetingSelector
						value={isMultiple(entry.meetingId)? null: entry.meetingId || null}
						onChange={meetingId => changeEntry({meetingId: meetingId || undefined})}
						placeholder={isMultiple(entry.meetingId)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
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

export type WebexMeetingEntry = Omit<WebexMeetingParams, "accountId" | "id" | "start" | "end"> & {
	accountId: number | null;
	date: string;
	startTime: string;
	endTime: string;
}

export type PartialWebexMeetingEntry = Partial<Omit<WebexMeetingEntry, "meetingOptions" | "audioConnectionOptions">> & {
	meetingOptions?: Partial<WebexMeetingOptions>;
	audioConnectionOptions?: Partial<WebexMeetingAudioConnectionOptions>;
}

export type MultipleWebexMeetingEntry = Multiple<Omit<WebexMeetingEntry, "meetingOptions" | "audioConnectionOptions">> & {
	meetingOptions: Multiple<WebexMeetingOptions>;
	audioConnectionOptions: Multiple<WebexMeetingAudioConnectionOptions>;
}

function convertWebexMeetingToEntry(webexMeeting: WebexMeetingParams): WebexMeetingEntry {
	let {start, end, ...rest} = webexMeeting;

	const zone = webexMeeting.timezone;
	const startDT = DateTime.fromISO(start, {zone});
	const endDT = DateTime.fromISO(end, {zone});
	const date = startDT.toISODate()!;
	const startTime = startDT.toFormat('HH:mm');
	const endTime = endDT.toFormat('HH:mm');

	if (endDT.diff(startDT, 'days').days > 1)
		console.warn("Duration greater than one day");

	return {
		...rest,
		date,
		startTime,
		endTime
	};
}

export function convertEntryToWebexMeeting(entry: WebexMeetingEntry): Omit<WebexMeetingParams, "id"> {
	let {date, startTime, endTime, accountId, meetingId, ...rest} = entry;
	const webexMeeting = {...rest};

	const zone = webexMeeting.timezone;
	let startDT = DateTime.fromFormat(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', {zone});
	let endDT = DateTime.fromFormat(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', {zone});
	if (endDT.toMillis() < startDT.toMillis())
		endDT = endDT.plus({days: 1});
	const start = startDT.toISO()!;
	const end = endDT.toISO()!;

	return {
		...rest,
		accountId: accountId!, // Checks ensure that accountId is not null
		start,
		end
	};
}

type Actions = "add" | "update";

type WebexMeetingDetailState = {
	action: Actions;
	entry: MultipleWebexMeetingEntry;
	saved: MultipleWebexMeetingEntry;
	webexMeetings: WebexMeetingParams[];
}

class WebexMeetingDetail extends React.Component<WebexMeetingDetailConnectedProps, WebexMeetingDetailState> {

	constructor(props: WebexMeetingDetailConnectedProps) {
		super(props);
		this.state = this.initState('update');
	}

	componentDidUpdate() {
		const {selected, setSelected} = this.props;
		const {action, webexMeetings} = this.state;
		const ids = webexMeetings.map(b => b.id);

		const changeWithConfirmation = async () => {
			if (action === 'update' && this.hasUpdates()) {
				const ok = await ConfirmModal.show('Changes not applied! Do you want to discard changes?');
				if (!ok) {
					setSelected(ids);
					return;
				}
			}
			this.reinitState('update');
		}

		if (selected.join() !== ids.join())
			changeWithConfirmation();
	}

	initState = (action: Actions): WebexMeetingDetailState => {
		const {entities, selected, defaults} = this.props;

		const webexMeetings: WebexMeetingParams[] = selected
			.filter(id => entities[id])
			.map(id => {
				// Redo 'start' and 'end' - there is an extra zero on the milliseconds
				let webexMeeting = entities[id]!;
				webexMeeting = {
					...webexMeeting,
					start: DateTime.fromISO(webexMeeting.start, {zone: webexMeeting.timezone}).toISO()!,
					end: DateTime.fromISO(webexMeeting.end, {zone: webexMeeting.timezone}).toISO()!,
				}
				return webexMeetingToWebexMeetingParams(webexMeeting);
			});
		let entry: MultipleWebexMeetingEntry;
		if (action === 'update') {
			const entryMerge: any = webexMeetings.reduce((entry, webexMeeting) => deepMergeTagMultiple(entry, convertWebexMeetingToEntry(webexMeeting)), {});
			const meetingOptions: WebexMeetingOptions = !entryMerge.meetingOptions || Object.values(entryMerge.meetingOptions).includes(MULTIPLE)?
				defaultWebexMeeting.meetingOptions:
				entryMerge.meetingOptions;
			const audioConnectionOptions: WebexMeetingAudioConnectionOptions = !entryMerge.audioConnectionOptions || Object.values(entryMerge.audioConnectionOptions).includes(MULTIPLE)?
				defaultWebexMeeting.audioConnectionOptions:
				entryMerge.audioConnectionOptions;
			entry = {...entryMerge, meetingOptions, audioConnectionOptions};
		}
		else {
			entry = {
				...defaultWebexMeeting,
				accountId: defaults.webexAccountId,
				templateId: defaults.webexTemplateId
			};
		}
		//console.log(action, entry)
		return {
			action,
			entry,
			saved: entry,
			webexMeetings,
		};
	}

	reinitState = (action: Actions) => {this.setState(this.initState(action))}

	getUpdates = () => {
		let {entry, saved, webexMeetings} = this.state;

		// Find differences
		const diff: PartialWebexMeetingEntry = deepDiff(saved, entry) || {};
		const webexMeetingUpdates: WebexMeetingUpdate[] = [];
		const meetingUpdates: {id: number; changes: Partial<Meeting>}[] = [];
		for (const webexMeeting of webexMeetings) {
			const local: WebexMeetingEntry = deepMerge(convertWebexMeetingToEntry(webexMeeting), diff);
			const updated = convertEntryToWebexMeeting(local);
			const changes: Partial<WebexMeetingParams> = deepDiff(webexMeeting, updated) || {};
			if (changes.meetingId) {
				// Associating with a meeting
				meetingUpdates.push({id: changes.meetingId, changes: {webexAccountId: updated.accountId, webexMeetingId: webexMeeting.id}});
				delete changes.meetingId;
			}
			if (Object.keys(changes).length > 0) {
				webexMeetingUpdates.push({...updated, id: webexMeeting.id});
			}
		}
		return {webexMeetingUpdates, meetingUpdates};
	}

	hasUpdates = () => this.state.saved !== this.state.entry; 
	/*{
		const {webexMeetingUpdates, meetingUpdates} = this.getUpdates();
		return webexMeetingUpdates.length > 0 || meetingUpdates.length > 0;
	}*/

	changeEntry = (changes: PartialWebexMeetingEntry) => {
		//console.log('change', changes)
		this.setState(state => {
			let entry = deepMerge(state.entry, changes);
			// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
			changes = deepDiff(state.saved, entry) || {};
			if (Object.keys(changes).length === 0)
				entry = state.saved as WebexMeetingEntry;
			return {...state, entry}
		});
	}

	clickAdd = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for clickAdd()");
			return;
		}

		const {setSelected} = this.props;
		const {action} = this.state;

		if (action === 'update' && this.hasUpdates()) {
			const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
			if (!ok)
				return;
		}

		this.reinitState('add');
		setSelected([]);
	}

	clickDelete = async () => {

		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for clickDelete()");
			return;
		}

		const {deleteWebexMeetings} = this.props;
		const {webexMeetings} = this.state;
		const ids = webexMeetings.map(m => m.id);
		const ok = await ConfirmModal.show(
			'Are you sure you want to delete the ' + 
				(ids.length > 1?
					ids.length + ' selected entries?':
					'selected entry?')
		);
		if (!ok)
			return;
		await deleteWebexMeetings(webexMeetings);
		this.reinitState('update');
	}

	add = async () => {
		const {setSelected, addWebexMeeting, updateMeetings} = this.props;
		const entry = this.state.entry as WebexMeetingEntry;

		const webexMeeting = convertEntryToWebexMeeting(entry);
		const id = await addWebexMeeting(entry.accountId!, webexMeeting);
		if (entry.meetingId)
			await updateMeetings([{id: entry.meetingId, changes: {webexAccountId: entry.accountId, webexMeetingId: id}}]);
		setSelected(id? [id]: []);
		this.reinitState('update');
	}

	update = async () => {
		const {updateWebexMeetings, updateMeetings} = this.props;

		const {webexMeetingUpdates, meetingUpdates} = this.getUpdates();
		//console.log(webexMeetingUpdates, meetingUpdates)
		if (webexMeetingUpdates.length > 0)
			await updateWebexMeetings(webexMeetingUpdates);
		if (meetingUpdates.length > 0)
			await updateMeetings(meetingUpdates);
		this.reinitState('update');
	}

	cancel = () => {
		this.reinitState('update');
	}

	render() {
		const {loading, access} = this.props;
		const {action, entry, webexMeetings} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === 'update' && webexMeetings.length === 0)
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

		const readOnly = access <= AccessLevel.ro;

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='add'
						title='Add Webex meeting'
						disabled={loading || readOnly}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='delete'
						title='Delete webex meeting'
						disabled={loading || webexMeetings.length === 0 || readOnly}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<WebexMeetingEntryForm
						action={action}
						entry={entry}
						changeEntry={this.changeEntry}
						submit={submit}
						cancel={cancel}
						readOnly={readOnly}
					/>}
			</Container>
		)
	}
}

const connector = connect(
	(state: RootState) => ({
		loading: selectWebexMeetingsState(state).loading,
		selected: selectWebexMeetingsState(state).selected,
		entities: selectSyncedWebexMeetingEntities(state),
		defaults: selectCurrentGroupDefaults(state),
		access: selectUserMeetingsAccess(state)
	}),
	{
		setSelected,
		addWebexMeeting,
		updateWebexMeetings,
		deleteWebexMeetings,
		updateMeetings,
	}
);

type WebexMeetingDetailConnectedProps = ConnectedProps<typeof connector>;

const ConnectedWebexMeetingDetail = connector(WebexMeetingDetail);

export default ConnectedWebexMeetingDetail;
