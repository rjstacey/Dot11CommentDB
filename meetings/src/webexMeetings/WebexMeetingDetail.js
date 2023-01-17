import PropTypes from 'prop-types';
import React from 'react';
import {connect, useSelector, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ActionButton, Form, Row, Field, FieldLeft, Input, InputTime, Checkbox} from 'dot11-components/form';
import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, isObject} from 'dot11-components/lib';

import {setError} from 'dot11-components/store/error';

import {
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	addWebexMeeting,
	updateWebexMeetings,
	deleteWebexMeetings,
	setSelected
} from '../store/webexMeetings';

import {updateMeetings} from '../store/meetings';

import {selectWebexAccountEntities} from '../store/webexAccounts';

import {selectCurrentGroupDefaults} from '../store/current';

import {selectCurrentSession} from '../store/sessions';

import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TopRow from '../components/TopRow';
import TimeZoneSelector from '../components/TimeZoneSelector';
import InputTimeRangeAsDuration from '../components/InputTimeRangeAsDuration';
import MeetingSelector from '../components/MeetingSelector';

const MULTIPLE_STR = '(Multiple)';
const BLANK_STR = '(Blank)';

export const defaultWebexMeeting = {
	title: '',
	timezone: '',
	date: '',
	startTime: '',
	endTime: '02:00',
	password: 'wireless',
	enabledJoinBeforeHost: true,
	joinBeforeHostMinutes: 10,
	enableConnectAudioBeforeHost: true,
	publicMeeting: false,
	meetingOptions: {
		enabledChat: true,
		enabledVideo: true,
		enabledNote: true,
		enabledClosedCaptions: true,
		enabledFileTransfer: false
	},
	meetingId: null
}

/*
 * Remove unnecessary parameters
 */
export function webexMeetingConfigParams(webexMeeting) {

	function getProperties(template, input) {
		const output = {};
		for (const key of Object.keys(template)) {
			if (isObject(template[key]) && isObject(input[key]))
				output[key] = getProperties(template[key], input[key])
			else if (key in template && key in input)
				output[key] = input[key];
		}
		return output;
	}

	const w = getProperties(defaultWebexMeeting, webexMeeting);
	if ('templateId' in webexMeeting)
		w.templateId = webexMeeting.templateId;
	if ('accountId' in webexMeeting)
		w.accountId = webexMeeting.accountId;

	return w;
}


export function WebexMeetingAccount({
	entry,
	changeEntry,
	readOnly
}) {
	const webexAccountEntities = useSelector(selectWebexAccountEntities);
	const defaults = useSelector(selectCurrentGroupDefaults);

	function onChange(accountId) {
		let changes = {accountId};

		// If the account is changed to the default webex account, select the default template.
		// If not, try to find the default template for the account.
		if (accountId === defaults.webexAccountId && defaults.webexTemplateId) {
			changes.templateId = defaults.webexTemplateId;
		}
		else {
			const webexAccount = webexAccountEntities[accountId];
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
				/>
			</Field>
		</Row>
	)
}

WebexMeetingAccount.propTypes = {
	entry: PropTypes.shape({
		accountId: PropTypes.any,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

function WebexMeetingTitleDateTime({
	entry,
	changeEntry,
	readOnly
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
						disablePast
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

WebexMeetingTitleDateTime.propTypes = {
	entry: PropTypes.shape({
		title: PropTypes.string.isRequired,
		timezone: PropTypes.string.isRequired,
		date: PropTypes.string.isRequired,
		startTime: PropTypes.string.isRequired,
		endTime: PropTypes.string.isRequired,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

function WebexMeetingOptions({
	entry,
	changeEntry,
	readOnly,
}) {
	return (
		<Row style={{flexWrap: 'wrap'}}>
			<FieldLeft label='Chat:'>
				<Checkbox 
					checked={entry.enabledChat}
					onChange={e => changeEntry({enabledChat: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='Video:'>
				<Checkbox 
					checked={entry.enabledVideo}
					onChange={e => changeEntry({enabledVideo: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='Notes:'>
				<Checkbox 
					checked={entry.enabledNote}
					onChange={e => changeEntry({enabledNote: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='Closed captions:'>
				<Checkbox 
					checked={entry.enabledClosedCaptions || false}
					onChange={e => changeEntry({enabledClosedCaptions: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft label='File transfer:'>
				<Checkbox 
					checked={entry.enabledFileTransfer}
					onChange={e => changeEntry({enabledFileTransfer: e.target.checked})}
					disabled={readOnly}
				/>
			</FieldLeft>
		</Row>
	)
}

WebexMeetingOptions.propTypes = {
	entry: PropTypes.shape({
		enabledChat: PropTypes.bool.isRequired,
		enabledVideo: PropTypes.bool.isRequired,
		enabledNote: PropTypes.bool.isRequired,
		enabledClosedCaptions: PropTypes.bool,
		enabledFileTransfer: PropTypes.bool.isRequired,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export function WebexMeetingParams({
	entry,
	changeEntry,
	readOnly,
}) {

	function handleChange(changes) {
		if (changes.enabledJoinBeforeHost === false) {
			changes.joinBeforeHostMinutes = 0;
			changes.enableConnectAudioBeforeHost = false;
		}
		changeEntry(changes);
	}

	function changeMeetingOptions(changes) {
		let {meetingOptions} = entry;
		meetingOptions = {
			...meetingOptions,
			...changes
		}
		changeEntry({meetingOptions});
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
						value={entry.password}
						onChange={e => handleChange({password: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Join before host (minutes):'>
					<div>
						<Checkbox
							checked={entry.enabledJoinBeforeHost}
							onChange={e => handleChange({enabledJoinBeforeHost: e.target.checked})}
							disabled={readOnly}
						/>
						<Input 
							type='number'
							value={'' + entry.joinBeforeHostMinutes}
							onChange={e => handleChange({joinBeforeHostMinutes: parseInt(e.target.value)})}
							disabled={readOnly || !entry.enabledJoinBeforeHost}
						/>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label='Connect audio before host:'>
					<Checkbox 
						checked={entry.enableConnectAudioBeforeHost}
						onChange={e => handleChange({enableConnectAudioBeforeHost: e.target.checked})}
						disabled={readOnly || !entry.enabledJoinBeforeHost}
					/>
				</Field>
			</Row>
			<WebexMeetingOptions
				entry={entry.meetingOptions || {}}
				changeEntry={changeMeetingOptions}
				readOnly={readOnly}
			/>
		</>
	)
}

WebexMeetingParams.propTypes = {
	entry: PropTypes.shape({
		password: PropTypes.string.isRequired,
		enabledJoinBeforeHost: PropTypes.bool.isRequired,
		joinBeforeHostMinutes: PropTypes.number.isRequired,
		enableConnectAudioBeforeHost: PropTypes.bool.isRequired,
	}),
	changeEntry: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

function AssociatedMeetingSelector({value, onChange, ...otherProps}) {
	const session = useSelector(selectCurrentSession);
	let fromDate, toDate;
	if (session) {
		fromDate = session.startDate;
		toDate = session.endDate;
	}

	function handleChange(v) {
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

function WebexMeetingEntry({
	action,
	entry,
	changeEntry,
	submit,
	cancel,
}) {
	const dispatch = useDispatch();
	const readOnly = action !== 'add' && action !== 'update';

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
		else if (entry.webexMeeting && !entry.webexAccountId)
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
			<WebexMeetingTitleDateTime
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<WebexMeetingParams
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<Row>
				<Field label='Associate with meeting:'>
					<AssociatedMeetingSelector
						value={isMultiple(entry.meetingId)? null: entry.meetingId}
						onChange={meetingId => changeEntry({meetingId})}
						placeholder={isMultiple(entry.meetingId)? MULTIPLE_STR: BLANK_STR} 
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

function convertWebexMeetingToEntry(webexMeeting) {
	let {start, end, ...rest} = webexMeeting;
	let entry = {...rest};

	const zone = webexMeeting.timezone;
	start = DateTime.fromISO(start, {zone});
	end = DateTime.fromISO(end, {zone});
	entry.date = start.toISODate({zone});
	entry.startTime = start.toFormat('HH:mm');
	entry.endTime = end.toFormat('HH:mm');

	if (end.diff(start, 'days').days > 1)
		console.warn("Duration greater than one day")

	return entry;
}

export function convertEntryToWebexMeeting(entry) {
	let {date, startTime, endTime, ...rest} = entry;
	const webexMeeting = {...rest};

	const zone = webexMeeting.timezone;
	let start = DateTime.fromFormat(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', {zone});
	let end = DateTime.fromFormat(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', {zone});
	if (end.toMillis() < start.toMillis())
		end = end.plus({days: 1});
	webexMeeting.start = start.toISO();
	webexMeeting.end = end.toISO();

	return webexMeeting;
}

class WebexMeetingDetail extends React.Component {

	constructor(props) {
		super(props);
		this.state = this.initState('update');
	}

	componentDidUpdate(prevProps, prevState) {
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

	initState = (action) => {
		const {entities, selected, defaults} = this.props;

		const webexMeetings = selected
			.filter(id => entities[id])
			.map(id => {
				// Redo 'start' and 'end' - there is an extra zero on the milliseconds
				const webexMeeting = entities[id];
				return {
					id: webexMeeting.id,
					...webexMeetingConfigParams(webexMeeting),
					start: DateTime.fromISO(webexMeeting.start, {zone: webexMeeting.timezone}).toISO(),
					end: DateTime.fromISO(webexMeeting.end, {zone: webexMeeting.timezone}).toISO(),
				}
			});
		let entry;
		if (action === 'update') {
			entry = webexMeetings.reduce((entry, webexMeeting) => deepMergeTagMultiple(entry, convertWebexMeetingToEntry(webexMeeting)), {});
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
			saved: action === 'add'? {}: entry,
			webexMeetings,
		};
	}

	reinitState = (action) => {this.setState(this.initState(action))}

	getUpdates = () => {
		let {entry, saved, webexMeetings} = this.state;

		// Find differences
		const diff = deepDiff(saved, entry) || {};
		const webexMeetingUpdates = [], meetingUpdates = [];
		for (const webexMeeting of webexMeetings) {
			const local = deepMerge(convertWebexMeetingToEntry(webexMeeting), diff);
			const updated = convertEntryToWebexMeeting(local);
			const changes = deepDiff(webexMeeting, updated) || {};
			if ('meetingId' in changes) {
				meetingUpdates.push({id: changes.meetingId, changes: {webexAccountId: updated.accountId, webexMeetingId: updated.id}});
				delete changes.meetingId;
			}
			if (Object.keys(changes).length > 0) {
				webexMeetingUpdates.push(updated);
			}
		}
		return {webexMeetingUpdates, meetingUpdates};
	}

	hasUpdates = () => this.state.saved !== this.state.entry; 
	/*{
		const {webexMeetingUpdates, meetingUpdates} = this.getUpdates();
		return webexMeetingUpdates.length > 0 || meetingUpdates.length > 0;
	}*/

	changeEntry = (changes) => {
		//console.log('change', changes)
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
		const {setSelected} = this.props;
		const {action} = this.state;

		if (action === 'update' && this.hasUpdates) {
			const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
			if (!ok)
				return;
		}

		this.reinitState('add');
		setSelected([]);
	}

	clickDelete = async () => {
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
		const {entry} = this.state;

		const id = await addWebexMeeting(entry.accountId, entry);
		if (entry.meetingId)
			await updateMeetings([{id: entry.meetingId, changes: {webexAccountId: entry.accountId, webexMeetingId: id}}]);
		await setSelected([id]);
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
		const {loading} = this.props;
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

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='add'
						title='Add Webex meeting'
						disabled={loading}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='delete'
						title='Delete webex meeting'
						disabled={loading || webexMeetings.length === 0}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<WebexMeetingEntry
						action={action}
						entry={entry}
						changeEntry={this.changeEntry}
						submit={submit}
						cancel={cancel}
					/>}
			</Container>
		)
	}

	static propTypes = {
		loading: PropTypes.bool.isRequired,
		selected: PropTypes.array.isRequired,
		entities: PropTypes.object.isRequired,
		defaults: PropTypes.object.isRequired,
		setSelected: PropTypes.func.isRequired,
		addWebexMeeting: PropTypes.func.isRequired,
		updateWebexMeetings: PropTypes.func.isRequired,
		deleteWebexMeetings: PropTypes.func.isRequired,
		updateMeetings: PropTypes.func.isRequired
	}
}

const ConnectedWebexMeetingDetail = connect(
	(state) => ({
		loading: selectWebexMeetingsState(state).loading,
		selected: selectWebexMeetingsState(state).selected,
		entities: selectSyncedWebexMeetingEntities(state),
		defaults: selectCurrentGroupDefaults(state),
	}),
	{
		setSelected,
		addWebexMeeting,
		updateWebexMeetings,
		deleteWebexMeetings,
		updateMeetings,
	}
)(WebexMeetingDetail);

export default ConnectedWebexMeetingDetail;
