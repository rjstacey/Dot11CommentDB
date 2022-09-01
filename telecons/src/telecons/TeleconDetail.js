import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton, Button, Form, Row, Col, Field, FieldLeft, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';

import {
	addTelecons, 
	updateTelecons, 
	deleteTelecons, 
	setSelectedTelecons, 
	selectTeleconsState, 
	selectTeleconDefaults,
	selectSyncedTeleconEntities
} from '../store/telecons';

import {selectGroupsState} from '../store/groups';

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

const defaultWebexMeeting = {
	password: 'wireless',
	enabledJoinBeforeHost: true,
	joinBeforeHostMinutes: 10,
	enableConnectAudioBeforeHost: true,
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

export function convertFromLocal(entry) {
	let {date, time, duration, webexMeeting, calendarEvent, ...rest} = entry;
	
	let start = MULTIPLE,
	    end = MULTIPLE;
	if (!isMultiple(date) && !isMultiple(entry.timezone) && !isMultiple(time)) {
		start = DateTime.fromISO(date, {zone: entry.timezone}).set(fromTimeStr(time));
		if (!isMultiple(duration))
			end = start.plus({hours: duration}).toISO();
		start = start.toISO();
	}

	if (webexMeeting)
		webexMeeting = webexMeetingParams(webexMeeting);

	return {
		start,
		end,
		webexMeeting,
		...rest
	};
}

function convertFromLocalMultipleDates(entry) {
	const {dates, ...rest} = entry;
	return dates.map(date => convertFromLocal({...rest, date}));
}

function convertToLocal(entry) {
	let {start, end, webexMeeting, ...rest} = entry;
	let date = MULTIPLE,
	    time = MULTIPLE,
	    duration = MULTIPLE;
	if (!isMultiple(entry.timezone)) {
		date = DateTime.fromISO(start, {zone: entry.timezone});
		time = toTimeStr(date.hour, date.minute);
		duration = DateTime.fromISO(end).diff(DateTime.fromISO(start), 'hours').hours;
		date = date.toISODate({zone: entry.timezone});
	}

	if (webexMeeting) {
		// Only care about certain properties
		webexMeeting = webexMeetingParams(webexMeeting);
	}

	return {
		date,
		time,
		duration,
		webexMeeting,
		...rest
	}
}

function convertToLocalTagMultiple(ids, entities) {

	let entry = {}, dates = [];
	for (const id of ids) {
		if (!entities[id]) {
			console.warn('bad id=' + id)
			continue;
		}
		const original = convertToLocal(entities[id]);
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
					readOnly={readOnly || !isNew}
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

export function TeleconEntry({
	groupId,
	entry,
	changeEntry,
	action,
	actionAdd,
	actionUpdate,
	actionCancel,
}) {
	const readOnly = action === 'view';

	const changeHasMotions = (hasMotions) => {
		let summary = entry.summary;
		summary = summary.replace(/[*]$/, '');	// Remove trailing asterisk
		if (hasMotions)
			summary += '*';				// Add trailing asterisk
		changeEntry({hasMotions, summary});
	}

	const toggleWebexMeeting = () => {
		if (entry.webexMeeting)
			changeEntry({webexMeetingId: null, webexMeeting: null});
		else
			changeEntry({webexMeeting: defaultWebexMeeting});
	}

	return (
		<Form
			submitLabel={action === 'add'? 'Add': 'Update'}
		>
			<Row>
				<Field label='Group:'>
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
				<Field label='Time:'>
					<InputTime
						value={isMultiple(entry.time)? '': entry.time}
						onChange={time => changeEntry({time})}
						placeholder={isMultiple(entry.time)? MULTIPLE_STR: undefined}
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
			<Row>
				<Field label='Agenda includes motions:'>
					<Checkbox
						indeterminate={isMultiple(entry.hasMotions)}
						checked={!!entry.hasMotions}
						onChange={e => changeHasMotions(e.target.checked)}
						disabled={readOnly}
					/>
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
			<Row>
				<Field label='Calendar:'>
					<CalendarAccountSelector
						value={entry.calendarAccountId}
						onChange={calendarAccountId => changeEntry({calendarAccountId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT:'>
					<ImatMeetingSelector
						value={entry.imatMeetingId}
						onChange={imatMeetingId => changeEntry({imatMeetingId})}
					/>
				</Field>
			</Row>
			{(action === 'add' || action === 'update') &&
			<Row>
				<Button onClick={action === 'add'? actionAdd: actionUpdate}>{action === 'add'? 'Add': 'Update'}</Button>
				<Button onClick={actionCancel}>Cancel</Button>
			</Row>}
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

class TeleconDetail extends React.Component {
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
		const {entities, selected, defaults, groupId} = this.props;

		console.log('initState')
		const ids = selected;
		let entry;
		if (ids.length > 0) {
			entry = convertToLocalTagMultiple(ids, entities);
			console.log(entities[ids[0]], entry)
			if (action === 'add') {
				delete entry.id;
				delete entry.calendarEventId;
				delete entry.webexMeetingId;
				if (isMultiple(entry.time))
					entry.time = '';
				if (isMultiple(entry.hasMotions))
					entry.hasMotions = false;
				entry.isCancelled = false;
				entry.summary = this.defaultSummary(entry.organizationId);
				entry.timezone = defaults.timezone;
				entry.calendarAccountId = defaults.calendarAccountId;
				entry.webexAccountId = defaults.webexAccountId;
				entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webex_template_id};
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
			entry.summary = this.defaultSummary(entry.organizationId);
			entry.timezone = defaults.timezone;
			entry.calendarAccountId = defaults.calendarAccountId;
			entry.webexAccountId = defaults.webexAccountId;
			entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webex_template_id};
		}
		console.log(ids.length > 0, action, entry)
		return {
			action,
			entry,
			ids
		};
	}

	defaultSummary = (organizationId) => {
		const {groupEntities} = this.props;

		let subgroup, group;
		subgroup = groupEntities[organizationId];
		if (subgroup &&
			subgroup.type.search(/^(tg|sg|sc|ah)/) !== -1 &&
			subgroup.parent_id) {
			group = groupEntities[subgroup.parent_id];
		}
		if (group && subgroup)
			return `${group.name} ${subgroup.name}`;
		if (subgroup)
			return subgroup.name;
		return '';
	}

	getUpdates = () => {
		let {entry, ids} = this.state;
		const {entities} = this.props;

		console.log('getUpdates')
		ids = ids.filter(id => entities[id]);	// Only ids that exist
		
		// Collapse selection to local format
		const collapsed = convertToLocalTagMultiple(ids, entities);

		// Get modified local entry without dates and webexMeeting.templateId
		let {webexMeeting, dates, ...e} = entry;
		if (webexMeeting) {
			e.webexMeeting = {...webexMeeting};
			delete e.webexMeeting.templateId;
		}
		if (dates.length === 1)
			e.date = dates[0];

		// Find differences
		const diff = deepDiff(collapsed, e);

		const updates = [];
		for (const id of ids) {
			// Get original without superfluous webex params
			const {webexMeeting, ...entity} = entities[id];
			if (webexMeeting)
				entity.webexMeeting = webexMeetingParams(webexMeeting);

			const local = deepMerge(convertToLocal(entity), diff);
			const updated = convertFromLocal(local);
			console.log(updated)
			//console.log(entities[id], convertFromLocal(changesLocal))
			const changes = deepDiff(entity, updated);
			console.log(changes)
			if (Object.keys(changes).length > 0)
				updates.push({id, changes});
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
		const {action} = this.state;
		if (action === 'view') {
			console.warn("Update when read-only");
			return;
		}
		changes = {...changes};
		if (changes.hasOwnProperty('organizationId'))
			changes.summary = this.defaultSummary(changes.organizationId);
		this.setState(state => {
			const entry = deepMerge(state.entry, changes);
			return {...state, entry}
		});
	}

	add = async () => {
		const {addTelecons, setSelectedTelecons} = this.props;
		const {entry} = this.state;

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

		addTelecons(convertFromLocalMultipleDates(entry))
			.then(ids => setSelectedTelecons(ids))
			.then(() => this.setState(this.initState('update')));
	}

	update = async () => {
		const {updateTelecons} = this.props;

		const updates = this.getUpdates();
		console.log(updates)
		await updateTelecons(updates);
		this.setState(this.initState('update'));
	}

	cancel = () => {
		this.setState(this.initState('update'));
	}

	render() {
		const {loading, selected, groupId} = this.props;
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
						name='add'
						title='Add telecon'
						disabled={loading}
						isActive={action === 'add'}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='cancel'
						title={(entry.isCancelled === 1? 'Uncancel': 'Cancel') + ' telecon'}
						disabled={loading}
						isActive={entry.isCancelled === 1}
						onClick={this.clickCancel}
					/>
					<ActionButton
						name='delete'
						title='Delete telecon'
						disabled={loading || selected.length === 0}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<TeleconEntry
						groupId={groupId}
						entry={entry}
						changeEntry={this.changeEntry}
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

const ConnectedTeleconDetail = connect(
	(state) => ({
		loading: selectTeleconsState(state).loading,
		selected: selectTeleconsState(state).selected,
		entities: selectSyncedTeleconEntities(state),
		defaults: selectTeleconDefaults(state),
		groupEntities: selectGroupsState(state).entities
	}),
	{
		setSelectedTelecons,
		updateTelecons,
		addTelecons,
		deleteTelecons
	}
)(TeleconDetail);

ConnectedTeleconDetail.propTypes = {
	groupId: PropTypes.any
}

export default ConnectedTeleconDetail;
