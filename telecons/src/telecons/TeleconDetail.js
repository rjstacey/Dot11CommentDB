import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton, Button, Form, Row, Col, Field, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {
	addTelecons, 
	updateTelecons, 
	deleteTelecons, 
	addWebexMeetingToTelecons,
	removeWebexMeetingFromTelecons,
	setSelected, 
	selectTeleconsState, 
	selectTeleconDefaults
} from '../store/telecons';

import {selectGroupsState} from '../store/groups';
import WebexAccountSelector from '../accounts/WebexAccountSelector';
import WebexTemplateSelector from '../accounts/WebexTemplateSelector';
import TimeZoneSelector from './TimeZoneSelector';
import GroupSelector from '../organization/GroupSelector';

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
	joinBeforeHostMinutes: 5,
	enableConnectAudioBeforeHost: true,
	meetingOptions: {
		enabledChat: true,
		enabledVideo: true,
		enabledPolling: true,
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

export function convertFromLocal(entry) {
	let {dates, time, duration, webexMeeting, calendarEvent, ...rest} = entry;
	
	let start = MULTIPLE,
	    end = MULTIPLE;
	if (!isMultiple(dates) && !isMultiple(entry.timezone) && !isMultiple(time)) {
		const [date] = dates;
		start = DateTime.fromISO(date, {zone: entry.timezone}).set(fromTimeStr(time));
		if (!isMultiple(duration))
			end = start.plus({hours: duration}).toISO();
		start = start.toISO();
	}

	let localEntry = {
		start,
		end,
		...rest
	}

	if (webexMeeting) {
		let params = {};
		if (webexMeeting.enableJoinBeforeHost) {
			params.enableJoinBeforeHost = true;
			params.joinBeforeHostMinutes = webexMeeting.joinBeforeHostMinutes || 5;
		}
		params.password = webexMeeting.password;
		localEntry.webexMeeting = params;
	}

	return localEntry;
}

function convertFromLocalMultipleDates(entry) {
	const {dates, ...rest} = entry;
	return dates.map(date => convertFromLocal({dates: [date], ...rest}));
}

function convertToLocal(entry) {
	const {start, end, ...rest} = entry;
	let dates = MULTIPLE,
	    time = MULTIPLE,
	    duration = MULTIPLE;
	if (!isMultiple(start) && !isMultiple(end) && !isMultiple(entry.timezone)) {
		const date = DateTime.fromISO(start, {zone: entry.timezone});
		dates = [date.toISODate({zone: entry.timezone})];
		time = toTimeStr(date.hour, date.minute);
		duration = DateTime.fromISO(end).diff(DateTime.fromISO(start), 'hours').hours;
	}
	return {
		dates,
		time,
		duration,
		...rest
	}
}

function WebexCreateScheduleEntry({
	entry,
	changeEntry,
	readOnly,
}) {
	console.log(entry)
	const webexMeeting = entry.webexMeeting || {};
	const meetingOptions = webexMeeting.meetingOptions || {};

	const changeWebexMeeting = (changes) => {
		console.log(changes)
		const u = {...webexMeeting, ...changes};
		changeEntry({webexMeeting: u});
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
					value={isMultiple(entry.webex_id)? null: entry.webex_id}
					onChange={webex_id => changeEntry({webex_id})}
					placeholder={isMultiple(entry.webex_id)? MULTIPLE_STR: undefined}
					readOnly={readOnly}
				/>
			</Field>
			<Field label='Template'>
				<WebexTemplateSelector
					value={webexMeeting.templateId}
					onChange={templateId => changeWebexMeeting({templateId})}
					accountId={isMultiple(entry.webex_id)? null: entry.webex_id}
					readOnly={readOnly}
				/>
			</Field>
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
					disabled={readOnly || !entry.enabledJoinBeforeHost}
				/>
			</Field>
			<Field label='Connect audio before host:'>
				<Checkbox 
					checked={webexMeeting.enableConnectAudioBeforeHost}
					onChange={e => changeWebexMeeting({enableConnectAudioBeforeHost: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Enable chat:'>
				<Checkbox 
					checked={meetingOptions.enabledChat}
					onChange={e => changeWebexMeetingOptions({enabledChat: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Enable video:'>
				<Checkbox 
					checked={meetingOptions.enabledVideo}
					onChange={e => changeWebexMeetingOptions({enabledVideo: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Enable polling:'>
				<Checkbox 
					checked={meetingOptions.enabledPolling}
					onChange={e => changeWebexMeetingOptions({enabledPolling: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Enable notes:'>
				<Checkbox 
					checked={meetingOptions.enabledNote}
					onChange={e => changeWebexMeetingOptions({enabledNote: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Enable closed captions:'>
				<Checkbox 
					checked={meetingOptions.enabledClosedCaptions}
					onChange={e => changeWebexMeetingOptions({enabledClosedCaptions: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Enable file transfer:'>
				<Checkbox 
					checked={meetingOptions.enabledFileTransfer}
					onChange={e => changeWebexMeetingOptions({enabledFileTransfer: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
		</Col>
	)
}

function WebexCreateSchedule({
	ids,
	defaultEntry,
	close,
}) {
	const dispatch = useDispatch();
	const [entry, setEntry] = React.useState(defaultEntry);

	const onSubmit = () => {
		const updates = ids.map(id => ({id, changes: {webex_meeting_id: null, webexMeeting: entry.webexMeeting}}));
		dispatch(addWebexMeetingToTelecons(updates));
		close();
	}

	const changeEntry = (changes) => {
		const u = {...entry, ...changes};
		setEntry(u);
	}

	return (
		<Form
			title={'Schedule Webex'}
			submit={onSubmit}
			cancel={close}
		>
			<WebexCreateScheduleEntry
				entry={entry}
				changeEntry={changeEntry}
			/>
		</Form>
	)
}

function WebexUpdateScheduleEntry({
	entry,
	webexMeeting,
	changeWebexMeeting,
	readOnly
}) {
	if (!webexMeeting)
		return null;

	return (
		<Col>
			<Field label='Webex account'>
				<WebexAccountSelector
					value={isMultiple(entry.webex_id)? null: entry.webex_id}
					onChange={() => {}}
					placeholder={isMultiple(entry.webex_id)? MULTIPLE_STR: undefined}
					readOnly={true}
				/>
			</Field>
			<Field label='Meeting number:'>
				{webexMeeting.meetingNumber}
			</Field>
			<Field label='Host key:'>
				{webexMeeting.hostKey}
			</Field>
			<Field label='Join before host (enable/minutes):'>
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
					disabled={readOnly}
				/>
			</Field>
			<Field label='Password:'>
				<Input 
					type='search'
					value={webexMeeting.password}
					onChange={e => changeWebexMeeting({password: e.target.value})}
					disabled={readOnly}
				/>
			</Field>
		</Col>
	)
}

function TeleconEntry({
	groupId,
	entry,
	changeEntry,
	action,
	actionAddWithWebex,
	actionAddWithoutWebex,
	actionAddWebex,
	actionRemoveWebex,
	actionUpdate,
	actionCancel,
}) {
	const readOnly = action === 'view';

	const changeWebexMeeting = (changes) => {
		const webexMeeting = {...entry.webexMeeting, ...changes};
		changeEntry({webexMeeting})
	}

	return (
		<Form
			submitLabel={action === 'add'? 'Add': 'Update'}
		>
			<Row>
				<Field label='Group:'>
					<GroupSelector
						value={isMultiple(entry.group_id)? '': entry.group_id || ''}
						onChange={(group_id) => changeEntry({group_id})}
						placeholder={isMultiple(entry.group_id)? MULTIPLE_STR: undefined}
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
				{action === 'add'?
					<WebexCreateScheduleEntry
						entry={entry}
						changeEntry={changeEntry}
						readOnly={readOnly}
					/>:
					<WebexUpdateScheduleEntry
						entry={entry}
						webexMeeting={entry.webexMeeting}
						changeWebexMeeting={changeWebexMeeting}
						readOnly={readOnly}
					/>}
			</Row>
			{(action === 'add' || action === 'update') &&
			<Row>
				{action === 'add'?
					<>
						<Button onClick={actionAddWithWebex}>Add with Webex</Button>
						<Button onClick={actionAddWithoutWebex}>Add without Webex</Button>
					</>:
					<>
						{entry.webex_meeting_id?
							<Button onClick={actionRemoveWebex}>Remove Webex</Button>:
							<Button onClick={actionAddWebex}>Schedule Webex</Button>}
						<Button onClick={actionUpdate}>Update</Button>
					</>}
				<Button onClick={actionCancel}>Cancel</Button>
			</Row>}
		</Form>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: flex-end;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

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

function TeleconDetail({groupId}) {
	const dispatch = useDispatch();
	const {loading, selected, entities} = useSelector(selectTeleconsState);
	const defaults = useSelector(selectTeleconDefaults);
	const {entities: groupEntities} = useSelector(selectGroupsState);

	const defaultSummary = React.useCallback((subgroup_id) => {
		let subgroup, group;
		subgroup = groupEntities[subgroup_id];
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
	}, [groupEntities]);

	const initState = React.useCallback((action) => {
		const ids = selected;
		let entry = {};
		if (ids.length > 0) {
			for (const id of ids)
				entry = deepMergeTagMultiple(entry, convertToLocal(entities[id]));
			if (action === 'add') {
				delete entry.id;
				delete entry.calendar_event_id;
				delete entry.webex_meeting_id;
				if (isMultiple(entry.dates))
					entry.dates = [];
				if (isMultiple(entry.time))
					entry.time = '';
				if (isMultiple(entry.hasMotions))
					entry.hasMotions = false;
				entry.summary = defaultSummary(entry.group_id);
				entry.timezone = defaults.timezone;
				entry.calendar_id = defaults.calendar_id;
				entry.webex_id = defaults.webex_id;
				entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webex_template_id};
				console.log('init add', entry)
			}
		}
		else {
			entry = {...defaultLocalEntry, group_id: groupId};
			entry.summary = defaultSummary(entry.group_id);
			entry.timezone = defaults.timezone;
			entry.calendar_id = defaults.calendar_id;
			entry.webex_id = defaults.webex_id;
			entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webex_template_id};
			console.log(entry)
		}
		return {
			action,
			entry,
			ids
		};
	}, [selected, entities, defaults, groupId, defaultSummary]);

	const [state, setState] = React.useState(() => initState('view'));

	React.useEffect(() => {
		if (state.action === 'add') {
			if (selected.length !== 0) {
				console.log('change to view', selected)
				setState(initState('view'));
			}
		}
		else {
			if (selected.join() !== state.ids.join()) {
				setState(initState(state.action));
			}
		}
	}, [state, selected, initState]);

	const getUpdates = React.useCallback(() => {
		const {entry, ids} = state;

		let diff = {}, originals = {};
		for (const id of ids) {
			const original = convertToLocal(entities[id]);
			originals[id] = original;
			diff = deepMergeTagMultiple(diff, original);
		}
		diff = deepDiff(diff, entry);
		console.log(diff)

		const updates = [];
		for (const id of ids) {
			const changesLocal = {...originals[id], ...diff};
			console.log(changesLocal)
			console.log(entities[id], convertFromLocal(changesLocal))
			const changes = deepDiff(entities[id], convertFromLocal(changesLocal));
			console.log(changes)
			if (Object.keys(changes).length > 0)
				updates.push({id, changes});
		}
		return updates;
	}, [state, entities]);

	const clickAdd = React.useCallback(async () => {
		if (state.action === 'update') {
			const updates = getUpdates();
			if (updates.length > 0) {
				const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
				if (!ok)
					return;
			}
		}
		if (state.action !== 'add') {
			setState(initState('add'));
			dispatch(setSelected([]));
		}
		else {
			setState(initState('view'));
		}
	}, [state, setState, initState, dispatch, getUpdates]);

	const clickEdit = React.useCallback(async () => {
		if (state.action === 'update') {
			const updates = getUpdates();
			console.log(updates)
			if (updates.length > 0) {
				const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
				if (!ok)
					return;
			}
		}
		setState(initState(state.action !== 'update'? 'update': 'view'));
	}, [state, setState, initState, getUpdates]);

	const clickCancel = React.useCallback(() => {
		setState(initState('view'));
	}, [setState, initState]);

	const changeEntry = React.useCallback((changes) => {
		if (state.actions === 'view') {
			console.warn("Update when read-only");
			return;
		}
		setState(state => {
			console.log('before:', state.entry);
			console.log('changes:', changes);
			if (changes.hasOwnProperty('group_id'))
				changes.summary = defaultSummary(changes.group_id);
			const entry = deepMerge(state.entry, changes);
			console.log('after:', entry);
			return {...state, entry}
		});
	}, [state, setState, defaultSummary]);

	const add = React.useCallback(async (withWebex) => {
		const {entry} = state;
		let errMsg = '';
		if (entry.dates.length === 0)
			errMsg = 'Date(s) not set';
		else if (!entry.time)
			errMsg = 'Start time not set'
		else if (!entry.duration)
			errMsg = 'Duration not set';
		else if (!entry.timezone)
			errMsg = 'Time zone not set';
		if (errMsg)
			ConfirmModal.show(errMsg, false);
		else {
			const ids = await dispatch(addTelecons(convertFromLocalMultipleDates(entry)));
			if (withWebex) {
				const {webexMeeting} = entry;
				const updates = ids.map(id => ({id, changes: {webex_meeting_id: null, webexMeeting}}));
				await dispatch(addWebexMeetingToTelecons(updates));
			}
			if (ids)
				dispatch(setSelected(ids));
		}
	}, [state, dispatch]);

	const update = React.useCallback(() => {
		const updates = getUpdates();
		dispatch(updateTelecons(updates));
	}, [getUpdates, dispatch]);

	const remove = React.useCallback(async () => {
		const ids = state.ids;
		const ok = await ConfirmModal.show(`Are you sure you want to delete ${ids}?`);
		if (!ok)
			return;
		await dispatch(deleteTelecons(ids));
	}, [state, dispatch]);

	const removeWebex = React.useCallback(async () => {
		const ids = state.ids;
		await dispatch(removeWebexMeetingFromTelecons(ids));
	}, [state, dispatch]);

	const [reschedule, setReschedule] = React.useState(false);

	let notAvailableStr = '';
	if (loading)
		notAvailableStr = 'Loading...';
	else if (state.action !== 'add' && selected.length === 0)
		notAvailableStr = 'Nothing selected';

	return (
		<Container>
			<TopRow>
				<ActionButton
					name='add'
					title='Add telecon'
					disabled={loading}
					isActive={state.action === 'add'}
					onClick={clickAdd}
				/>
				<ActionButton
					name='edit'
					title='Edit telecon'
					disabled={loading || selected.length === 0}
					isActive={state.action === 'update'}
					onClick={clickEdit}
				/>
				<ActionButton
					name='delete'
					title='Delete telecon'
					disabled={loading || selected.length === 0}
					onClick={remove}
				/>
			</TopRow>
			{notAvailableStr?
				<NotAvailable>{notAvailableStr}</NotAvailable>:
				<TeleconEntry
					groupId={groupId}
					entry={state.entry}
					changeEntry={changeEntry}
					action={state.action}
					actionAddWithWebex={() => add(true)}
					actionAddWithoutWebex={() => add(false)}
					actionAddWebex={() => setReschedule(true)}
					actionRemoveWebex={removeWebex}
					actionUpdate={update}
					actionCancel={clickCancel}
				/>}
			<AppModal
				isOpen={reschedule}
			>
				<WebexCreateSchedule
					ids={state.ids}
					defaultEntry={state.entry}
					close={() => setReschedule(false)}
				/>
			</AppModal>
		</Container>
	)
}

export default TeleconDetail;
