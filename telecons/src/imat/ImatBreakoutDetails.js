import PropTypes from 'prop-types';
import React from 'react';
import {connect, useSelector, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple} from 'dot11-components/lib';
import {ActionButton, Form, Row, Field, Select, Input, InputTime} from 'dot11-components/form';
import {setError} from 'dot11-components/store/error';

import ImatCommitteeSelector from '../components/ImatCommitteeSelector';
import MeetingSelector from '../components/MeetingSelector';
import {MeetingEntry, convertEntryToMeeting} from '../meetings/MeetingDetails';
import TopRow from '../components/TopRow';

import {
	addBreakouts,
	updateBreakouts,
	deleteBreakouts,
	setSelectedBreakouts,
	selectBreakoutMeetingId,
	selectImatMeeting,
	selectBreakoutsState,
	selectSyncedBreakoutEntities
} from '../store/imatBreakouts';

import {selectCurrentSession} from '../store/sessions';

import {updateMeetings, addMeetings} from '../store/meetings';

import {selectGroupEntities} from '../store/groups';

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

const fromTimeStr = (str) => {
	const m = str.match(/(\d+):(\d+)/);
	return m? {hour: parseInt(m[1], 10), minute: parseInt(m[2], 10)}: {hour: 0, minute: 0};
}

function convertBreakoutToMeetingEntry(breakout, imatMeeting, session, groupEntities) {

	const start = DateTime.fromFormat(`${imatMeeting.start} ${breakout.startTime}`, 'yyyy-MM-dd HH:mm', {zone: imatMeeting.timezone}).plus({days: breakout.day});
	const end = DateTime.fromFormat(`${imatMeeting.start} ${breakout.endTime}`, 'yyyy-MM-dd HH:mm', {zone: imatMeeting.timezone}).plus({days: breakout.day});

	let organizationId;
	const groups = Object.values(groupEntities);
	const bNameRe = new RegExp(breakout.name, 'i');
	const group =
		groups.find(g => g.name.toLowerCase() === breakout.name.toLowerCase()) ||	// near exact match
		groups.find(g => breakout.name.match(new RegExp(g.name, 'i'))) || // case invariant substring match
		groups.find(g => g.name.match(bNameRe));	// both ways
	if (group)
		organizationId = group.id;

	const entry = {
		summary: breakout.name,
		start: start.toISO(),
		end: end.toISO(),
		date: start.toISODate(),
		dates: [start.toISODate()],
		startTime: breakout.startTime,
		endTime: breakout.endTime,
		location: breakout.location,
		organizationId,
		hasMotions: false,
		isCancelled: false,
		timezone: imatMeeting.timezone,
		calendarAccountId: null,
		calendarEventId: null,
		webexAccountId: null,
		webexMeetingId: null,
		webexMeeting: {accountId: null},
		imatMeetingId: imatMeeting.id,
		imatBreakoutId: breakout.id
	}

	const room = session.rooms.find(r => r.name === breakout.location);
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

	//console.log(entry)
	return entry;
}

function SlotSelector({value, onChange, isStart, ...otherProps}) {
	const {timeslots} = useSelector(selectBreakoutsState);
	const options = timeslots.map(s => ({value: s.id, label: `${s.name} ${isStart? s.startTime: s.endTime}`}))
	const widthCh = options.reduce((maxCh, o) => Math.max(maxCh, o.label.length), 12);
	const values = options.filter(o => o.value === value);
	const handleChange = React.useCallback((values) => onChange(values.length? values[0].value: 0), [onChange]);

	return (
		<Select
			style={{minWidth: `calc(${widthCh}ch + 30px)`}}
			options={options}
			values={values}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

const StartSlotSelector = (props) => SlotSelector({...props, isStart: true});
const EndSlotSelector = SlotSelector;

function SessionDaySelector({value, onChange, ...otherProps}) {
	const imatMeeting = useSelector(selectImatMeeting);

	const options = React.useMemo(() => {
		const sessionStart = DateTime.fromISO(imatMeeting.start);
		const days = Math.floor(DateTime.fromISO(imatMeeting.end).diff(sessionStart, 'days').days) + 1;
		const options = Array.from({length: days}, (_, i) => ({value: i, label: sessionStart.plus({days: i}).toFormat('EEE, d LLL yyyy')}));
		return options;
	}, [imatMeeting]);

	const widthCh = options.reduce((maxCh, o) => Math.max(maxCh, o.label.length), 12);
	
	const values = options.filter(o => o.value === value);

	const handleChange = React.useCallback((values) => onChange(values.length? values[0].id: 0), [onChange]);

	return (
		<Select
			style={{minWidth: `calc(${widthCh}ch + 30px)`}}
			options={options}
			values={values}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

function GroupIdSelector({value, onChange, ...otherProps}) {
	const {committees} = useSelector(selectBreakoutsState);
	const committee = committees.find(c => c.id === value);
	function handleChange(symbol) {
		const committee = committees.find(c => c.symbol === symbol);
		onChange(committee? committee.id: 0);
	}
	return (
		<ImatCommitteeSelector
			value={committee? committee.symbol: ''}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

function AssociatedMeetingSelector({value, onChange}) {
	const imatMeeting = useSelector(selectImatMeeting);

	function handleChange(v) {
		if (v !== value)
			onChange(v);
	}
	return (
		<MeetingSelector
			value={value}
			onChange={handleChange}
			fromDate={imatMeeting.start}
			toDate={imatMeeting.end}
		/>
	)
}

const getDefaultBreakout = () => ({
	meetingId: null,
	name: "",
	day: 0,
	startTime: "",
	startSlotId: null,
	endTime: "",
	endSlotId: null,
	groupId: null,
	location: "",
	credit: "Zero",
	overrideCreditDenominator: 0,
	overrideCreditNumerator: 0,
	facilitator: window.user? window.user.Email: ''
});

export function BreakoutCredit({entry, changeEntry}) {
	return (
		<>
			<Row>
				<Field label='Credit:'>
					<div style={{display: 'flex', justifyContent: 'space-between'}}>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='extra'
								value='Extra'
								checked={entry.credit === 'Extra'}
								indeterminate={isMultiple(entry.credit).toString()}
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
								indeterminate={isMultiple(entry.credit).toString()}
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
								indeterminate={isMultiple(entry.credit).toString()}
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
								indeterminate={isMultiple(entry.credit).toString()}
								onChange={e => changeEntry({credit: e.target.value})}
							/>
							<label htmlFor='zero'>Zero</label>
						</div>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label='Other credit (numerator/denominator):'>
					<div>
						<Input
							type='text'
							size={4}
							value={isMultiple(entry.overrideCreditNumerator)? '': entry.overrideCreditNumerator || ''}
							onChange={e => changeEntry({overrideCreditNumerator: e.target.value})}
							disabled={entry.credit !== "Other"}
							placeholder={isMultiple(entry.overrideCreditNumerator)? MULTIPLE_STR: undefined}
						/>
						<label>/</label>
						<Input
							type='text'
							size={4}
							value={isMultiple(entry.overrideCreditDenominator)? '': entry.overrideCreditDenominator || ''}
							onChange={e => changeEntry({overrideCreditDenominator: e.target.value})}
							disabled={entry.credit !== "Other"}
							placeholder={isMultiple(entry.overrideCreditDenominator)? MULTIPLE_STR: undefined}
						/>
					</div>
				</Field>
			</Row>
		</>
	)
}

function BreakoutEntry({
	entry,
	changeEntry,
	busy,
	action,
	submit,
	cancel,
}) {
	const dispatch = useDispatch();
	const {timeslots} = useSelector(selectBreakoutsState);
	const readOnly = action === 'view';

	let errMsg;
	if (!entry.name)
		errMsg = "Enter breakout name";
	else if (!entry.groupId)
		errMsg = "Select group";
	else if (!entry.startSlotId)
		errMsg = "Select start slot";

	let submitForm, cancelForm, submitLabel;
	let title = "Breakout";
	if (submit) {
		if (action === 'add') {
			submitLabel = "Add";
			title = "Add breakout";
		}
		else {
			submitLabel = "Update";
			title = "Update breakout";
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
		if ('startSlotId' in changes) {
			const slot = timeslots.find(slot => slot.id === changes.startSlotId);
			if (slot) {
				changes.startTime = '';
				changes.endSlotId = changes.startSlotId;
				changes.endTime = '';
			}
		}
		if ('endSlotId' in changes) {
			const slot = timeslots.find(slot => slot.id === changes.endSlotId);
			if (slot)
				changes.endTime = '';
		}
		changeEntry(changes);
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
				<Field label='Meeting name:'>
					<Input
						type='text'
						value={isMultiple(entry.name)? '': entry.name}
						onChange={e => handleChange({name: e.target.value})}
						placeholder={isMultiple(entry.name)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Group:'>
					<GroupIdSelector
						value={isMultiple(entry.groupId)? null: entry.groupId}
						onChange={groupId => handleChange({groupId})}
						placeholder={isMultiple(entry.groupId)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session day:'>
					<SessionDaySelector
						value={isMultiple(entry.day)? null: entry.day}
						onChange={day => handleChange({day})}
						placeholder={isMultiple(entry.day)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start slot:'>
					<StartSlotSelector
						value={isMultiple(entry.startSlotId)? 0: entry.startSlotId}
						onChange={startSlotId => handleChange({startSlotId})}
						placeholder={isMultiple(entry.startSlotId)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Override start time:'>
					<InputTime
						value={isMultiple(entry.startTime)? '': entry.startTime}
						onChange={startTime => handleChange({startTime})}
						placeholder={isMultiple(entry.startTime)? MULTIPLE_STR: 'No override'}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End slot:'>
					<EndSlotSelector
						value={isMultiple(entry.endSlotId)? 0: entry.endSlotId}
						onChange={endSlotId => handleChange({endSlotId})}
						placeholder={isMultiple(entry.endSlotId)? MULTIPLE_STR: undefined}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Override end time:'>
					<InputTime
						value={isMultiple(entry.endTime)? '': entry.endTime}
						onChange={endTime => handleChange({endTime})}
						placeholder={isMultiple(entry.endTime)? MULTIPLE_STR: 'No override'}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Location/room:'>
					<Input
						type='text'
						value={isMultiple(entry.location)? '': entry.location}
						onChange={e => handleChange({location: e.target.value})}
						placeholder={isMultiple(entry.location)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<BreakoutCredit entry={entry} onChange={changeEntry} />
			<Row>
				<Field label='Facilitator:'>
					<Input
						type='text'
						value={isMultiple(entry.facilitator)? '': entry.facilitator}
						onChange={e => handleChange({facilitator: e.target.value})}
						placeholder={isMultiple(entry.facilitator)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Associate with meeting:'>
					<AssociatedMeetingSelector
						value={isMultiple(entry.meetingId)? null: entry.meetingId}
						onChange={meetingId => handleChange({meetingId})}
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

class BreakoutDetails extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.initState('update');
	}

	componentDidUpdate(prevProps, prevState) {
		const {selected, setSelected} = this.props;
		const {action, breakouts} = this.state;
		const ids = breakouts.map(b => b.id);

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
		const {entities, selected, imatMeetingId, imatMeeting, session, groupEntities} = this.props;

		let entry;
		let breakouts = [];
		if (action === 'update' || action === 'view') {
			breakouts = selected.map(id => entities[id]);
			entry = breakouts.reduce((entry, breakout) => deepMergeTagMultiple(entry, breakout), {});
		}
		else if (action === 'add') {
			entry = getDefaultBreakout();
		}
		else if (action === 'import') {
			const id = selected[0];
			const breakout = entities[id];
			entry = convertBreakoutToMeetingEntry(breakout, imatMeeting, session, groupEntities)
			breakouts = [breakout];
		}

		//console.log(entry)
		return {
			action,
			entry,
			saved: action === 'add'? {}: entry,
			imatMeetingId,
			breakouts,
			busy: false
		};
	}

	reinitState = (action) => {this.setState(this.initState(action))}

	getUpdates = () => {
		let {entry, saved, imatMeetingId, breakouts} = this.state;

		// Find differences
		const diff = deepDiff(saved, entry) || {};
		const breakoutUpdates = [], meetingUpdates = [];
		for (const breakout of breakouts) {
			const updated = deepMerge(breakout, diff);
			const changes = deepDiff(breakout, updated) || {};
			if ('meetingId' in changes) {
				meetingUpdates.push({id: changes.meetingId, changes: {imatMeetingId, imatBreakoutId: breakout.id}});
				delete changes.meetingId;
			}
			if (Object.keys(changes).length > 0) {
				breakoutUpdates.push(updated);
			}
		}
		return {breakoutUpdates, meetingUpdates};
	}

	hasUpdates = () => this.state.saved !== this.state.entry; 
	//{
	//	const {breakoutUpdates, meetingUpdates} = this.getUpdates();
	//	return breakoutUpdates.length > 0 || meetingUpdates.length > 0;
	//}

	changeEntry = (changes) => {
		const {action} = this.state;
		if (action === 'view') {
			console.warn("Update when read-only");
			return;
		}
		this.setState(state => {
			let entry = {...state.entry, ...changes};
			const diff = deepDiff(state.saved, entry) || {};
			if (Object.keys(diff).length === 0)
				entry = state.saved;
			return {...state, entry}
		});
	}

	clickAdd = async () => {
		const {setSelected} = this.props;
		const {action} = this.state;

		if (action === 'update' && this.hasUpdates()) {
			const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
			if (!ok)
				return;
		}

		await setSelected([]);
		this.reinitState('add');
	}

	clickDelete = async () => {
		const {deleteBreakouts} = this.props;
		const {imatMeetingId, breakouts} = this.state;

		const ids = breakouts.map(b => b.id);
		const ok = await ConfirmModal.show(
			'Are you sure you want to delete the ' + 
				(ids.length > 1?
					ids.length + ' selected entries?':
					'selected entry?')
		);
		if (!ok)
			return;
		await deleteBreakouts(imatMeetingId, ids);
		this.reinitState('update');
	}

	clickImport = () => {
		this.reinitState('import')
	}

	add = async () => {
		const {addBreakouts, updateMeetings, setSelected} = this.props;
		const {entry, imatMeetingId} = this.state;

		this.setState({busy: true});
		const [id] = await addBreakouts(imatMeetingId, [entry]);
		if (entry.meetingId)
			await updateMeetings([{id: entry.meetingId, changes: {imatMeetingId, imatBreakoutId: id}}])
		await setSelected([id]);
		this.reinitState('update');
	}

	update = async () => {
		const {updateBreakouts, updateMeetings} = this.props;
		const {imatMeetingId} = this.state;

		const {breakoutUpdates, meetingUpdates} = this.getUpdates();
		//console.log(updates)

		this.setState({busy: true});
		if (breakoutUpdates.length > 0)
			await updateBreakouts(imatMeetingId, breakoutUpdates);
		if (meetingUpdates.length > 0)
			await updateMeetings(meetingUpdates);
		this.reinitState('update');
	}

	import = async () => {
		const {addMeetings, session} = this.props;
		let {entry} = this.state;

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId) {
			entry = {...entry, webexMeetingId: '$add'};
			if (entry.webexMeeting)
				entry.webexMeeting.publicMeeting = false;
		}

		const {dates, ...rest} = entry;
		const meetings = dates.map(date => convertEntryToMeeting({...rest, date}, session));
		//console.log(meetings);

		this.setState({busy: true});
		await addMeetings(meetings);
		this.reinitState('update');
	}

	cancel = () => {
		this.reinitState('update');
	}

	render() {
		const {loading} = this.props;
		const {action, entry, breakouts, busy} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === 'update' && breakouts.length === 0)
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
						name='import'
						title='Import as meeting'
						disabled={loading || busy}
						onClick={this.clickImport}
					/>
					<ActionButton
						name='add'
						title='Add breakout'
						disabled={loading || busy}
						isActive={action === 'add'}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='delete'
						title='Delete breakout'
						disabled={loading || breakouts.length === 0 || busy}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					action === 'import'?
						<MeetingEntry
							entry={entry}
							changeEntry={this.changeEntry}
							busy={busy}
							action='add'
							submit={this.import}
							cancel={this.cancel}
						/>:
						<BreakoutEntry
							entry={entry}
							changeEntry={this.changeEntry}
							busy={busy}
							action={action}
							submit={submit}
							cancel={cancel}
						/>
				}
			</Container>
		)
	}

	static propTypes = {
		imatMeetingId: PropTypes.any.isRequired,
		timeslots: PropTypes.array.isRequired,
		loading: PropTypes.bool.isRequired,
		selected: PropTypes.array.isRequired,
		entities: PropTypes.object.isRequired,
		setSelected: PropTypes.func.isRequired,
		updateBreakouts: PropTypes.func.isRequired,
		addBreakouts: PropTypes.func.isRequired,
		deleteBreakouts: PropTypes.func.isRequired,
		updateMeetings: PropTypes.func.isRequired,
		addMeetings: PropTypes.func.isRequired
	}
}

const ConnectedBreakoutDetails = connect(
	(state) => ({
		imatMeetingId: selectBreakoutMeetingId(state),
		timeslots: selectBreakoutsState(state).timeslots,
		loading: selectBreakoutsState(state).loading,
		selected: selectBreakoutsState(state).selected,
		entities: selectSyncedBreakoutEntities(state),
		imatMeeting: selectImatMeeting(state),
		session: selectCurrentSession(state),
		groupEntities: selectGroupEntities(state)
	}),
	{
		setSelected: setSelectedBreakouts,
		updateBreakouts,
		addBreakouts,
		deleteBreakouts,
		updateMeetings,
		addMeetings
	}
)(BreakoutDetails);

export default ConnectedBreakoutDetails;
