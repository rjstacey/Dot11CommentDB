import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {IconCollapse} from 'dot11-components/icons';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton, Button, Form, Row, Field, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';

import {addTelecons, updateTelecons, deleteTelecons, syncTeleconsWithWebex, syncTeleconsWithCalendar, setSelected, setUiProperty, dataSet} from './store/telecons';
import WebexAccountSelector from './WebexAccountSelector';
import CalendarAccountSelector from './CalendarAccountSelector';
import TimeZoneSelector from './TimeZoneSelector';

const MULTIPLE_STR = '(Multiple)';

const defaultLocalEntry = {
	group: '802.11',
	subgroup: '',
	dates: [],
	time: '',
	duration: 1,
	hasMotions: false,
	timezone: 'America/New_York'
}

const toTimeStr = (hour, min) => ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
const fromTimeStr = (str) => {
	const m = str.match(/(\d+):(\d+)/);
	return m? {hour: parseInt(m[1], 10), minute: parseInt(m[2], 10)}: {hour: 0, minute: 0};
}

export function convertFromLocal(entry) {
	const {dates, time, duration, ...rest} = entry;
	
	let start = MULTIPLE,
	    end = MULTIPLE;
	if (!isMultiple(dates) && !isMultiple(entry.timezone) && !isMultiple(time)) {
		const [date] = dates;
		start = DateTime.fromISO(date, {zone: entry.timezone}).set(fromTimeStr(time));
		if (!isMultiple(duration))
			end = start.plus({hours: duration}).toISO();
		start = start.toISO();
	}
	return {
		start,
		end,
		...rest
	}
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

function WebexEntry({
	entry,
	changeEntry,
	readOnly
}) {
	if (!entry)
		return null;

	return <>
		<Row>
			<Field label='Meeting number:'>
				<span>{entry.meetingNumber}</span>
			</Field>
		</Row>
		<Row>
			<Field label='Host key:'>
				<span>{entry.hostKey}</span>
			</Field>
		</Row>
		<Row>
			<Field label='Join before host (minutes):'>
				<Checkbox
					checked={entry.enabledJoinBeforeHost}
					onChange={e => changeEntry({enabledJoinBeforeHost: e.target.checked})}
					disabled={readOnly}
				/>
				<Input 
					type='text'
					value={entry.joinBeforeHostMinutes}
					onChange={e => changeEntry({joinBeforeHostMinutes: e.target.value})}
					disabled={readOnly || !entry.enabledJoinBeforeHost}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Connect audio before host:'>
				<Checkbox 
					checked={entry.enableConnectAudioBeforeHost}
					onChange={e => changeEntry({enableConnectAudioBeforeHost: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Password:'>
				<Input 
					type='search'
					value={entry.password}
					onChange={e => changeEntry({password: e.target.value})}
					disabled={readOnly}
				/>
			</Field>
		</Row>
	</>
}

function TeleconEntry({
	entry,
	changeEntry,
	action,
	actionSyncWebex,
	actionSyncCalendar,
	actionOk,
	actionCancel,
}) {
	const dispatch = useDispatch();
	const uiProperties = useSelector(state => state[dataSet].ui);
	const readOnly = action === 'view';
	console.log(entry)
	return (
		<Form
			submitLabel={action === 'add'? 'Add': 'Update'}
			submit={readOnly? undefined: actionOk}
			cancel={readOnly? undefined: actionCancel}
		>
			<Row>
				<Field label='Subgroup:'>
					<Input
						type='text'
						value={isMultiple(entry.subgroup)? '': entry.subgroup || ''}
						onChange={e => changeEntry({subgroup: e.target.value})}
						placeholder={isMultiple(entry.subgroup)? MULTIPLE_STR: undefined}
						disabled={readOnly}
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
				<Field label='Webex:'>
					<WebexAccountSelector
						value={isMultiple(entry.webex_id)? null: entry.webex_id}
						onChange={value => changeEntry({webex_id: value})}
						placeholder={isMultiple(entry.webex_id)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
				<IconCollapse
					isCollapsed={!uiProperties.showWebexDetail}
					onClick={() => dispatch(setUiProperty({property: 'showWebexDetail', value: !uiProperties.showWebexDetail}))}
				/>
			</Row>
			{uiProperties.showWebexDetail &&
				<WebexEntry
					entry={entry.webexMeeting}
					changeEntry={(changes) => changeEntry({webexMeeting: changes})}
					readOnly={readOnly}
				/>}
			<Row>
				<Field label='Calendar:'>
					<CalendarAccountSelector
						value={isMultiple(entry.calendar_id)? null: entry.calendar_id}
						onChange={value => changeEntry({calendar_id: value})}
						placeholder={isMultiple(entry.calendar_id)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
				<IconCollapse
					isCollapsed={!uiProperties.showCalendarDetail}
					onClick={() => dispatch(setUiProperty({property: 'showCalendarDetail', value: !uiProperties.showCalendarDetail}))}
				/>
			</Row>
			{uiProperties.showCalendarDetail &&
				<Row>
					
				</Row>}
			<Row>
				<Button onClick={actionSyncWebex}>Sync webex</Button>
			</Row>
			<Row>
				<Button onClick={actionSyncCalendar}>Sync calendar</Button>
			</Row>
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
`;

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

function TeleconDetail(props) {
	const dispatch = useDispatch();
	const {loading, selected, entities} = useSelector(state => state[dataSet]);
	const {timeZone} = useSelector(state => state.timeZones);

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
				if (isMultiple(entry.subgroup))
					entry.subgroup = '';
			}
		}
		else {
			entry = {...defaultLocalEntry, timeZone};
		}
		return {
			action,
			entry,
			ids
		};
	}, [selected, entities, timeZone]);

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
			dispatch(setSelected([]));
			setState(initState('add'));
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
			const entry = deepMerge(state.entry, changes);
			console.log('after:', entry);
			return {...state, entry}
		});
	}, [state, setState]);

	const add = React.useCallback(async () => {
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

	const syncWebex = () => dispatch(syncTeleconsWithWebex(selected));
	const syncCalendar = () => dispatch(syncTeleconsWithCalendar(selected));

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
					entry={state.entry}
					changeEntry={changeEntry}
					action={state.action}
					actionSyncWebex={syncWebex}
					actionSyncCalendar={syncCalendar}
					actionOk={state.action === 'add'? add: update}
					actionCancel={clickCancel}
				/>
			}
		</Container>
	)
}

export default TeleconDetail;
