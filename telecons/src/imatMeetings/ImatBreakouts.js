import React from 'react';
import {Link, useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import AppTable, {SelectHeader, SelectCell, TableColumnHeader} from 'dot11-components/table';
import {Button, ActionButton, Form, Row, Field, Input, InputTime, Select} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';
import {parseNumber, displayDateRange} from 'dot11-components/lib';

import ImatCommitteeSelector from '../components/ImatCommitteeSelector';
import TeleconSelector from '../components/TeleconSelector';
import TopRow from '../components/TopRow';
import TeleconSummary from '../components/TeleconSummary';

import {
	loadBreakouts,
	addBreakouts,
	selectBreakoutsState,
	getField,
	dataSet,
	fields
} from '../store/imatBreakouts';

import {selectImatMeetingEntities} from '../store/imatMeetings';

import {
	selectSyncedTeleconEntities,
	selectTeleconsState,
	getField as getTeleconField,
	updateTelecons
} from '../store/telecons';

import {selectGroupEntities} from '../store/groups';

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	display: flex;
	flex-direction: column;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const renderGroup = ({rowData}) => {
	if (rowData.groupShortName)
		return rowData.groupShortName;
	const parts = rowData.group.split('/');
	return parts[parts.length-1];
}

const renderAttendanceLink = ({rowData}) =>
	rowData.meetingId && rowData.id && <Link to={`/imatMeetings/${rowData.meetingId}/${rowData.id}`}>view attendance</Link>

export const renderSessionInfo = (session) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{session.name}</span>
		<span>{displayDateRange(session.start, session.end)}</span>
		<span>{session.timezone}</span>
	</div>

function SlotSelector({value, onChange, isStart}) {
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
		/>
	)
}

const StartSlotSelector = (props) => SlotSelector({...props, isStart: true});
const EndSlotSelector = SlotSelector;

function SessionDaySelector({value, onChange, session}) {

	const options = React.useMemo(() => {
		const sessionStart = DateTime.fromISO(session.start);
		const days = Math.floor(DateTime.fromISO(session.end).diff(sessionStart, 'days').days);
		const options = Array.from({length: days}, (_, i) => ({value: i, label: sessionStart.plus({days: i}).toFormat('EEE, d LLL yyyy')}));
		return options;
	}, [session]);

	const widthCh = options.reduce((maxCh, o) => Math.max(maxCh, o.label.length), 12);
	
	const values = options.filter(o => o.value === value);

	const handleChange = React.useCallback((values) => onChange(values.length? values[0].id: 0), [onChange]);

	return (
		<Select
			style={{minWidth: `calc(${widthCh}ch + 30px)`}}
			options={options}
			values={values}
			onChange={handleChange}
		/>
	)
}

function GroupIdSelector({value, onChange}) {
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
		/>
	)
}

const getDefaultBreakout = () => ({
	teleconId: null,
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

function BreakoutAdd({close, session, committees, timeslots, groups, teleconEntities}) {
	const dispatch = useDispatch();
	const [teleconId, setTeleconId] = React.useState(0);
	const [breakout, setBreakout] = React.useState(getDefaultBreakout);

	async function submit() {
		await dispatch(addBreakouts(session.id, [breakout]));
		close();
	}

	function handleTeleconSelect(id) {
		setTeleconId(id);
		const telecon = teleconEntities[id];
		setBreakout(telecon?
			teleconToBreakout(telecon, session, groups, committees, timeslots):
			getDefaultBreakout()
		);
	}

	const updateBreakout = (changes) => setBreakout(breakout => ({...breakout, ...changes}));

	return (
		<Form
			title={`Add breakout`}
			submit={submit}
			cancel={close}
		>
			<Row>
				<Field label='Telecon:'>
					<TeleconSelector
						value={teleconId}
						onChange={handleTeleconSelect}
						fromDate={session.start}
						toDate={session.end}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Meeting name:'>
					<Input
						type='text'
						value={breakout.name}
						onChange={e => updateBreakout({name: e.target.value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Group:'>
					<GroupIdSelector
						value={breakout.groupId}
						onChange={groupId => updateBreakout({groupId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session day:'>
					<SessionDaySelector
						value={breakout.day}
						onChange={day => updateBreakout({day})}
						session={session}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start slot:'>
					<StartSlotSelector
						value={breakout.startSlotId}
						onChange={startSlotId => updateBreakout({startSlotId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Override start time:'>
					<InputTime
						value={breakout.startTime}
						onChange={startTime => updateBreakout({startTime})}
						placeholder='No override'
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End slot:'>
					<EndSlotSelector
						value={breakout.endSlotId}
						onChange={endSlotId => updateBreakout({endSlotId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Override end time:'>
					<InputTime
						value={breakout.endTime}
						onChange={endTime => updateBreakout({endTime})}
						placeholder='No override'
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Location/room:'>
					<Input
						type='text'
						value={breakout.location}
						onChange={e => updateBreakout({location: e.target.value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Credit:'>
					<div style={{display: 'flex', justifyContent: 'space-between'}}>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='extra'
								value='Extra'
								checked={breakout.credit === 'Extra'}
								onChange={e => updateBreakout({credit: e.target.value})}
							/>
							<label htmlFor='extra'>Extra</label>
						</div>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='normal'
								value='Normal'
								checked={breakout.credit === 'Normal'}
								onChange={e => updateBreakout({credit: e.target.value})}
							/>
							<label htmlFor='normal'>Normal</label>
						</div>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='other'
								value='Other'
								checked={breakout.credit === 'Other'}
								onChange={e => updateBreakout({credit: e.target.value})}
							/>
							<label htmlFor='other'>Other</label>
						</div>
						<div style={{margin: '0 5px'}}>
							<input
								type='radio'
								id='zero'
								value='Zero'
								checked={breakout.credit === 'Zero'}
								onChange={e => updateBreakout({credit: e.target.value})}
							/>
							<label htmlFor='zero'>Zero</label>
						</div>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label='Override credit numerator/denominator:'>
					<Input
						type='text'
						size={4}
						value={breakout.overrideCreditNumerator}
						onChange={e => updateBreakout({overrideCreditNumerator: e.target.value})}
						disabled={breakout.credit !== "Other"}
					/>
					<label>/</label>
					<Input
						type='text'
						size={4}
						value={breakout.overrideCreditDenominator}
						onChange={e => updateBreakout({overrideCreditDenominator: e.target.value})}
						disabled={breakout.credit !== "Other"}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Facilitator:'>
					<Input
						type='text'
						value={breakout.facilitator}
						onChange={e => updateBreakout({facilitator: e.target.value})}
					/>
				</Field>
			</Row>
		</Form>
	)
}

function BreakoutLink({session, breakout, close}) {
	const dispatch = useDispatch();
	const [teleconId, setTeleconId] = React.useState();

	function submit() {
		const update = {
			id: teleconId,
			changes: {imatBreakoutId: breakout.id}
		}
		dispatch(updateTelecons([update]));
		close();
	}

	return (
		<Form
			submit={submit}
			cancel={close}
		>
			<TeleconSelector
				value={teleconId}
				onChange={setTeleconId}
				fromDate={session.start}
				toDate={session.end}
			/>
		</Form>
	)
}

const BreakoutsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderDateHeader = (props) =>
	<>
		<BreakoutsColumnHeader {...props} dataKey='weekDay' label='Day' />
		<BreakoutsColumnHeader {...props} dataKey='date' label='Date' />
	</>

const renderTimeRangeHeader = (props) =>
	<>
		<BreakoutsColumnHeader {...props} dataKey='startTime' label='Start time' />
		<BreakoutsColumnHeader {...props} dataKey='endTime' label='End time' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'dayDate', 
		label: 'Date',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderDateHeader},
	{key: 'timeRange',
		label: 'Time',
		width: 120, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderTimeRangeHeader},
	{key: 'group', 
		label: 'Group',
		...fields.group,
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderGroup},
	{key: 'name', 
		label: 'Name',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'location', 
		label: 'Location',
		width: 250, flexGrow: 1, flexShrink: 1},
	{key: 'credit', 
		label: 'Credit',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'telecon',
		label: 'Telecon',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'actions',
		label: 'Actions',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderAttendanceLink}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);

function slotDateTime(date, slot) {
	return [
		date.set({hour: slot.startTime.substring(0,2), minute: slot.startTime.substring(3,5)}),
		date.set({hour: slot.endTime.substring(0,2), minute: slot.endTime.substring(3,5)})
	];
}

function teleconToBreakout(telecon, session, groups, committees, timeslots) {
	const sessionStart = DateTime.fromISO(session.start, {zone: session.timezone});
	const start = DateTime.fromISO(telecon.start, {zone: session.timezone});
	const end = DateTime.fromISO(telecon.end, {zone: session.timezone});
	console.log(session.start, telecon.start)

	const day = Math.floor(start.diff(sessionStart, 'days').get('day'));
	let startTime = start.toFormat('HH:mm');
	let endTime = end.toFormat('HH:mm');

	// If breakout straddles a day, then end at midnight
	if (end.toISODate() !== start.toISODate())
		endTime = '23:59';

	const breakoutDate = sessionStart.plus({days: day});
	let startSlot, endSlot;

	// Go through slots looking for exact match
	for (const slot of timeslots) {
		const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
		if (start === slotStart && end <= slotEnd) {
			startSlot = slot;
			endSlot = slot;
		}
	}

	if (!startSlot) {
		// Go through slots again, this time looking for approx match
		for (const slot of timeslots) {
			const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
			if (!startSlot && start >= slotStart && start < slotEnd)
				startSlot = slot;
			if (end > slotStart && end <= slotEnd)
				endSlot = slot;
		}
	}

	// If we still don't have a start slot, choose the first (or last) and override time
	if (!startSlot)
		startSlot = timeslots[0];
	if(!endSlot)
		endSlot = timeslots[timeslots.length-1];

	// If the startTime/endTime aligns with slot start/end then clear time
	if (startSlot && slotDateTime(breakoutDate, startSlot)[0].toFormat("HH:mm") === startTime)
		startTime = '';
	if (endSlot && slotDateTime(breakoutDate, endSlot)[1].toFormat("HH:mm") === endTime)
		endTime = '';

	let name = telecon.groupName;
	if (telecon.isCancelled)
		name = 'CANCELLED - ' + name;

	let location = getTeleconField(telecon, 'location');
	if (telecon.isCancelled)
		location = 'CANCELLED';

	const group = groups[telecon.organizationId];
	const committee = committees.find(c => c.symbol === group.imatCommitteeId);
	const groupId = committee? committee.id: 0;

	return {
		teleconId: telecon.id,
		name,
		location,
		groupId,
		day,
		startSlotId: startSlot? startSlot.id: 0,
		endSlotId: endSlot? endSlot.id: 0,
		startTime,
		endTime,
		credit: "Zero",
		creditOverideNumerator: 0,
		creditOverideDenominator: 0,
		facilitator: window.user? window.user.Email: ''
	}
}

/*
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({rowIndex, ids, entities}) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, 'dayDate'),
		time: getField(b, 'time')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, 'dayDate')) {
			b = {...b, dayDate: ''};
			if (b.time === getField(b_prev, 'time'))
				b = {...b, time: ''};
		}
	}
	return b;
}

function Breakouts() {
	const history = useHistory();
	const params = useParams();
	const urlMeetingId = parseNumber(params.meetingNumber);

	const dispatch = useDispatch();
	const {valid, meetingId, committees, timeslots} = useSelector(selectBreakoutsState);
	const meeting = useSelector(selectImatMeetingEntities)[meetingId];
	const teleconsIds = useSelector(selectTeleconsState).ids;
	const teleconEntities = useSelector(selectSyncedTeleconEntities);
	const groups = useSelector(selectGroupEntities);

	React.useEffect(() => {
		if (!valid || (urlMeetingId && urlMeetingId !== meetingId))
			dispatch(loadBreakouts(urlMeetingId));
	}, [dispatch, valid, urlMeetingId, meetingId]);

	const [addBreakout, setAddBreakout] = React.useState(false);

	const close = () => history.push('/imatMeetings');
	const refresh = () => dispatch(loadBreakouts(urlMeetingId));

	const openBreakoutAdd = () => setAddBreakout(true);
	const closeBreakoutAdd = () => setAddBreakout(false);
	
	const [breakoutToLink, setBreakoutToLink] = React.useState(null);
	const closeBreakoutToLink = () => setBreakoutToLink(null);

	const columns = React.useMemo(() => {
		function renderTelecon({rowData}) {
			if (rowData.teleconId)
				return <TeleconSummary teleconId={rowData.teleconId} />
			return (
				<ActionButton
					name='link'
					onClick={() => setBreakoutToLink(rowData)}
				/>
			)
		}
		const columns = tableColumns.map(c => {
			if (c.key === 'telecon')
				return {...c, cellRenderer: renderTelecon};
			return c;
		});
		return columns;
	}, [setBreakoutToLink]);

	const syncTelecons = () => {
		const sessionStart = DateTime.fromISO(meeting.start);
		const sessionEnd = DateTime.fromISO(meeting.end).endOf('day');
		//console.log(sessionStart.toFormat('EEE, dd-MM-yyyy'), sessionEnd.toFormat('EEE, dd-MM-yyyy HH:mm'))
		const breakouts = [];
		for (const id of teleconsIds) {
			const telecon = teleconEntities[id];
			const teleconStart = DateTime.fromISO(telecon.start);
			if (!telecon.breakoutId && teleconStart >= sessionStart && teleconStart < sessionEnd) {
				const breakout = teleconToBreakout(telecon, meeting, groups, committees, timeslots);
				if (!breakout.startSlotId)
					console.warn('Missing start slot')
				if (!breakout.endSlotId)
					console.warn('Missing end slot')
				breakouts.push(breakout);
			}
		}
		console.log(breakouts);
		dispatch(addBreakouts(meeting.id, breakouts));
	}

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>{meeting && renderSessionInfo(meeting)}</div>
				<div>Breakouts</div>
				<div>
					<Button onClick={syncTelecons}>Sync</Button>
					<ActionButton name='add' title='Add breakout' onClick={openBreakoutAdd} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow>
				<AppTable
					fitWidth
					fixed
					columns={columns}
					headerHeight={46}
					estimatedRowHeight={56}
					dataSet={dataSet}
					rowGetter={breakoutsRowGetter}
				/>
			</TableRow>

			<AppModal
				isOpen={addBreakout}
				onRequestClose={closeBreakoutAdd}
			>
				<BreakoutAdd
					close={closeBreakoutAdd}
					session={meeting}
					committees={committees}
					timeslots={timeslots}
					groups={groups}
					teleconEntities={teleconEntities}
				/>
			</AppModal>

			<AppModal
				isOpen={!!breakoutToLink}
				onRequestClose={closeBreakoutToLink}
			>
				<BreakoutLink
					session={meeting}
					breakout={breakoutToLink}
					close={closeBreakoutToLink}
				/>
			</AppModal>
		</>
	)
}

export default Breakouts;
