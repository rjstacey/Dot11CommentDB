import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple, MULTIPLE} from 'dot11-components/lib';
import {ActionButton} from 'dot11-components/form';

import {
	selectCurrentSession,
	fromSlotId
} from '../store/sessions';

import {
	addMeetings, 
	updateMeetings, 
	deleteMeetings,
	setSelectedMeetings, 
	setSelectedSlots,
	selectMeetingsState, 
	selectSyncedMeetingEntities,
	selectSelectedMeetings,
	selectSelectedSlots
} from '../store/meetings';

import {selectCurrentGroupId, selectCurrentGroupDefaults} from '../store/current';

import {selectGroupEntities} from '../store/groups';

import TopRow from '../components/TopRow';

import {webexMeetingConfigParams, defaultWebexMeeting} from '../webexMeetings/WebexMeetingDetail';

import MeetingEntry from './MeetingEntry';


//const toTimeStr = (hour, min) => ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
const fromTimeStr = (str) => {
	const m = str.match(/(\d+):(\d+)/);
	return m? {hour: parseInt(m[1], 10), minute: parseInt(m[2], 10)}: {hour: 0, minute: 0};
}

const isSessionMeeting = (session) => session && (session.type === 'p' || session.type === 'i');

function convertMeetingToEntry(meeting, session) {
	let {start, end, ...entry} = meeting;

	const zone = isSessionMeeting(session)? session.timezone: meeting.timezone;
	start = DateTime.fromISO(start, {zone});
	end = DateTime.fromISO(end, {zone});
	entry.date = start.toISODate({zone});
	entry.startTime = start.toFormat('HH:mm');
	entry.endTime = end.toFormat('HH:mm');

	if (isSessionMeeting(session)) {
		entry.roomId = meeting.roomId;
		if (entry.roomId === null || entry.roomId === undefined) {
			const room = session.rooms.find(r => r.name === meeting.location);
			entry.roomId =  room? room.id: 0;
		}

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
	let {date, startTime, endTime, startSlotId, ...meeting} = entry;

	let zone;
	if (isSessionMeeting(session)) {
		zone = session.timezone;
	}
	else {
		zone = entry.timezone;
	}
	let start = DateTime.fromISO(date, {zone}).set(fromTimeStr(startTime));
	let end = DateTime.fromISO(date, {zone}).set(fromTimeStr(endTime));
	if (end < start)
		end = end.plus({days: 1});
	meeting.timezone = zone;
	meeting.start = start.toISO();
	meeting.end = end.toISO();

	return meeting;
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
		const {selectedMeetings, selectedSlots} = props;
		this.state = this.initState((selectedMeetings.length === 0 && selectedSlots.length > 0)? 'add': 'update');
	}

	componentDidUpdate(prevProps, prevState) {
		const {selectedMeetings, setSelectedMeetings, selectedSlots} = this.props;
		const {action, meetings, slots} = this.state;
		const ids = meetings.map(m => m.id);

		const changeWithConfirmation = async () => {
			if (this.hasUpdates()) {
				const ok = await ConfirmModal.show('Changes not applied! Do you want to discard changes?');
				if (!ok) {
					setSelectedMeetings(ids);
					return;
				}
			}
			this.reinitState((selectedMeetings.length === 0 && selectedSlots.length > 0)? 'add': 'update');
		}

		if (action === 'update' && selectedMeetings.join() !== ids.join())
			changeWithConfirmation();
		else if (selectedSlots.join() !== slots.join())
			this.reinitState((selectedMeetings.length === 0 && selectedSlots.length > 0)? 'add': 'update');
	}
	
	initState = (action) => {
		const {entities, selectedMeetings, selectedSlots, defaults, groupId, session, groupEntities} = this.props;

		// Get meetings without superfluous webex params
		const meetings = selectedMeetings
			.map(id => entities[id])
			.filter(meeting => meeting)
			.map(meeting => ({
					...meeting,
					webexMeeting: {
						accountId: meeting.webexAccountId,
						...webexMeetingConfigParams(meeting.webexMeeting || {})
					}
				})
			);

		let entry;
		if (action === 'update') {
			entry = meetings.reduce((entry, meeting) => deepMergeTagMultiple(entry, convertMeetingToEntry(meeting, session)), {});
			entry.dates = isMultiple(entry.date)? entry.date: [entry.date];
		}
		else if (action === 'add') {
			entry = {};
			if (meetings.length > 0) {
				let dates = [];
				for (const meeting of meetings) {
					const original = convertMeetingToEntry(meeting, session);
					dates.push(original.date);
					entry = deepMergeTagMultiple(entry, original);
				}
				entry.dates = [...new Set(dates.sort())];	// array of unique dates
				if (isMultiple(entry.organizationId))
					entry.organizationId = groupId;
				if (isMultiple(entry.startTime))
					entry.startTime = '';
				if (isMultiple(entry.endTime))
					entry.endTime = '';
				if (isMultiple(entry.hasMotions))
					entry.hasMotions = 0;
			}
			else {
				if (selectedSlots.length > 0) {
					let date, roomId, slotId;
					for (const id of selectedSlots) {
						const [date_, slotId_, roomId_] = fromSlotId(id);
						date = (date !== undefined && date !== date_)? MULTIPLE: date_;
						roomId = (roomId !== undefined && roomId !== roomId_)? MULTIPLE: roomId_;
						slotId = (slotId !== undefined && slotId !== slotId_)? MULTIPLE: slotId_;
					}
					entry.dates = date === MULTIPLE? MULTIPLE: [date];
					entry.roomId = roomId;
					entry.startSlotId = slotId;
					if (slotId !== MULTIPLE) {
						const slot = session.timeslots.find(slot => slot.id === slotId);
						entry.startTime = slot? slot.startTime: '';
						entry.endTime = slot? slot.endTime: '';
					}
					else {
						entry.startTime = MULTIPLE;
						entry.endTime = MULTIPLE;
					}
				}
				else {
					entry.dates = [];
					entry.startSlotId = 0;
					entry.roomId = 0;
					entry.startTime = '';
					entry.endTime = '';
				}
				entry.organizationId = null;
				entry.hasMotions = 0;
			}
			entry.sessionId = session? session.id: null;
			entry.timezone = session? session.timezone: defaults.timezone;
			entry.isCancelled = 0;
			const subgroup = groupEntities[entry.organizationId];
			entry.summary = subgroup? subgroup.name: '';
			entry.webexAccountId = defaults.webexAccountId;
			entry.webexMeetingId = null;
			entry.calendarAccountId = defaults.calendarAccountId;
			entry.calendarEventId = null;
			entry.imatMeetingId = session? session.imatMeetingId: null;
			entry.imatBreakoutId = null;
			entry.webexMeeting = {
				...defaultWebexMeeting,
				accountId: defaults.webexAccountId,
				templateId: defaults.webexTemplateId
			};
			delete entry.id;
		}

		return {
			action,
			entry,
			saved: action === 'add'? {}: entry,
			session,
			meetings,
			slots: selectedSlots,
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
		console.log(changes)
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

		this.reinitState('add');
		await setSelectedMeetings([]);
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

		this.setState({busy: true});
		await deleteMeetings(ids);
		this.reinitState('update');
	}

	clickSync = async () => {
		const {updateMeetings} = this.props;
		const {meetings, session} = this.state;

		//const updates = meetings.map(m => ({id: m.id, changes: {}}));

		// Hack to ensure sessionId is set
		const updates = meetings.map(m => {
			const changes = {};
			if (!m.sessionId)
				changes.sessionId = session.id;
			return {id: m.id, changes};
		});

		this.setState({busy: true});
		await updateMeetings(updates);
		this.reinitState('update');
	}

	add = async () => {
		const {addMeetings, setSelectedMeetings, setSelectedSlots, session} = this.props;
		let {entry, slots} = this.state;

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId) {
			entry = {...entry, webexMeetingId: '$add'};
			if (entry.webexMeeting)
				entry.webexMeeting.publicMeeting = false;
		}

		// If an IMAT meeting ID is given then create a breakout
		if (entry.imatMeetingId)
			entry = {...entry, imatBreakoutId: '$add'};

		let meetings;
		if (slots.length > 0) {
			const {dates, startSlotId, roomId, startTime, endTime, ...rest} = entry;
			meetings = slots.map(id => {
				const [date, startSlotId, roomId] = fromSlotId(id);
				const slot = session.timeslots.find(slot => slot.id === startSlotId);
				const startTime = slot? slot.startTime: '';
				const endTime = slot? slot.endTime: '';
				return convertEntryToMeeting({...rest, date, startSlotId, startTime, endTime, roomId}, session);
			});
		}
		else {
			const {dates, ...rest} = entry;
			meetings = dates.map(date => convertEntryToMeeting({...rest, date}, session));
		}

		this.setState({busy: true});
		const ids = await addMeetings(meetings);
		await setSelectedSlots([]);
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

	cancel = async () => {
		const {setSelectedSlots} = this.props;
		await setSelectedSlots([]);
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
						name='upload'
						title='Sync meeting'
						disabled={loading || busy}
						onClick={this.clickSync}
					/>
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
		selectedMeetings: PropTypes.array.isRequired,
		selectedSlots: PropTypes.array.isRequired,
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
		selectedMeetings: selectSelectedMeetings(state),
		selectedSlots: selectSelectedSlots(state),
		entities: selectSyncedMeetingEntities(state),
		defaults: selectCurrentGroupDefaults(state),
		groupEntities: selectGroupEntities(state)
	}),
	{
		setSelectedMeetings,
		setSelectedSlots,
		updateMeetings,
		addMeetings,
		deleteMeetings,
	}
)(MeetingDetails);

export default ConnectedMeetingDetails;
