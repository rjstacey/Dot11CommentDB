import React from 'react';
import {Link, useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {Button, ActionButton, Form, Row, Field, Input, InputTime, Select} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';
import {parseNumber} from 'dot11-components/lib';

import {loadBreakouts, addBreakouts, selectBreakoutsState, selectSyncedBreakoutEntities, getField, dataSet} from '../store/imatBreakouts';
import {selectImatMeetingEntities} from '../store/imatMeetings';
import {
	selectTeleconsState,
	selectSyncedTeleconEntities,
	selectTeleconEntities,
	selectTeleconDefaults,
	updateTelecons,
	addTelecons,
	getField as getTeleconField
} from '../store/telecons';

import {selectGroupEntities} from '../store/groups';

import ImatCommitteeSelector from '../organization/ImatCommitteeSelector';
import TeleconSelector from '../telecons/TeleconSelector';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

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
	rowData.meetingNumber && rowData.id &&
	<Link to={`/imat/${rowData.meetingNumber}/${rowData.id}`}>view attendance</Link>

function parseISODate(isoDate) {
	// ISO date: "YYYY-MM-DD"
	const year = parseInt(isoDate.substring(0, 4));
	const month = parseInt(isoDate.substring(5, 7));
	const day = parseInt(isoDate.substring(8, 10));
	const monthStr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return {
		year,
		monthShort: monthStr[month] || '???',
		month,
		day
	}
}

/*function displayDate(isoDate) {
	const {year, monthShort, day} = parseISODate(isoDate);
	return `${year} ${monthShort} ${day}`; 
}*/

export const displayDateRange = (start, end) => {
	const s = parseISODate(start);
	const e = parseISODate(end);
	if (s.year !== e.year)
		return `${s.year} ${s.monthShort} ${s.day}-${e.year} ${e.monthShort} ${e.day}`;
	if (s.month !== e.month)
		return `${s.year} ${s.monthShort} ${s.day}-${e.monthShort} ${e.day}`;
	return `${s.year} ${s.monthShort} ${s.day}-${e.day}`;
}

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

function BreakoutAdd({close, breakout, setBreakout, session}) {
	const dispatch = useDispatch();

	function submit() {
		dispatch(addBreakouts(session.id, [breakout]));
		close();
	}

	if (!breakout)
		return null;

	return (
		<Form
			title={`Add breakout`}
			submit={submit}
			cancel={close}
		>
			<Row>
				<Field label='Meeting name:'>
					<Input
						type='text'
						value={breakout.name}
						onChange={e => setBreakout({name: e.target.value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Group:'>
					<GroupIdSelector
						value={breakout.groupId}
						onChange={groupId => setBreakout({groupId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session day:'>
					<SessionDaySelector
						value={breakout.day}
						onChange={day => setBreakout({day})}
						session={session}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start slot:'>
					<StartSlotSelector
						value={breakout.startSlotId}
						onChange={startSlotId => setBreakout({startSlotId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Override start time:'>
					<InputTime
						value={breakout.startTime}
						onChange={startTime => setBreakout({startTime})}
						placeholder='No override'
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End slot:'>
					<EndSlotSelector
						value={breakout.endSlotId}
						onChange={endSlotId => setBreakout({endSlotId})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Override end time:'>
					<InputTime
						value={breakout.endTime}
						onChange={endTime => setBreakout({endTime})}
						placeholder='No override'
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Location/room:'>
					<Input
						type='text'
						value={breakout.location}
						onChange={e => setBreakout({location: e.target.value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Credit:'>
					<div>
						<input
							type='radio'
							id='extra'
							value='Extra'
							checked={breakout.credit === 'Extra'}
							onChange={e => setBreakout({credit: e.target.value})}
						/>
						<label htmlFor='extra'>Extra</label>
						<input
							type='radio'
							id='normal'
							value='Normal'
							checked={breakout.credit === 'Normal'}
							onChange={e => setBreakout({Credit: e.target.value})}
						/>
						<label htmlFor='normal'>Normal</label>
						<input
							type='radio'
							id='other'
							value='Other'
							checked={breakout.credit === 'Other'}
							onChange={e => setBreakout({credit: e.target.value})}
						/>
						<label htmlFor='other'>Other</label>
						<input
							type='radio'
							id='zero'
							value='Zero'
							checked={breakout.credit === 'Zero'}
							onChange={e => setBreakout({credit: e.target.value})}
						/>
						<label htmlFor='zero'>Zero</label>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label='Override credit numerator/denominator:'>
					<Input
						type='text'
						size={4}
						value={breakout.overrideCreditNumerator}
						onChange={e => setBreakout({overrideCreditNumerator: e.target.value})}
						disabled={breakout.credit !== "Other"}
					/>
					<label>/</label>
					<Input
						type='text'
						size={4}
						value={breakout.overrideCreditDenominator}
						onChange={e => setBreakout({overrideCreditDenominator: e.target.value})}
						disabled={breakout.credit !== "Other"}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Facilitator:'>
					<Input
						type='text'
						value={breakout.facilitator}
						onChange={e => setBreakout({facilitator: e.target.value})}
					/>
				</Field>
			</Row>
		</Form>
	)
}

function TeleconLink({breakout, close}) {
	const dispatch = useDispatch();
	const [id, setTeleconId] = React.useState();

	async function submit() {
		await dispatch(updateTelecons([{id, changes: {imatMeetingId: breakout.meetingId, imatBreakoutId: breakout.id}}]));
		close();
	}

	return (
		<Form
			submit={submit}
			cancel={close}
		>
			<TeleconSelector
				value={id}
				onChange={setTeleconId}
			/>
		</Form>
	)
}


function TeleconSummary({teleconId}) {
	const teleconEntities = useSelector(selectTeleconEntities);
	const telecon = teleconEntities[teleconId];
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<span>{telecon.summary}</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller'}}>
				{getTeleconField(telecon, 'date')} {getTeleconField(telecon, 'timeRange')}
			</span>
		</div>
	)
}

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'dayDate', 
		label: 'Date',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'time',
		label: 'Time',
		width: 120, flexGrow: 1, flexShrink: 1},
	{key: 'group', 
		label: 'Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderGroup},
	{key: 'name', 
		label: 'Name',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'location', 
		label: 'Location',
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'credit', 
		label: 'Credit',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'status', 
		label: 'Status',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'actions', 
		label: 'Actions',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderAttendanceLink},
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

	const group = groups[telecon.group_id];
	const committee = committees.find(c => c.symbol === group.imatCommitteeId);
	const groupId = committee? committee.id: 0;

	return {
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
		creditOverideDenominator: 0
	}
}

function getBreakoutStatus(breakout, teleconEntities) {
	const telecon = teleconEntities[breakout.teleconId];

	if (!telecon)
		return 'Orphan';

	const isCancelled = breakout.name.search(/cancel/i) !== -1;
	if (telecon.isCancelled !== isCancelled)
		return 'cancelled';

	if (telecon.start !== breakout.start)
		return 'start';

	if (telecon.end !== breakout.end)
		return 'end';

	if (getTeleconField(telecon, 'location') !== breakout.location)
		return 'location';

	return 'OK'
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
		b_prev = {
			...b_prev,
			dayDate: getField(b_prev, 'dayDate'),
			time: getField(b_prev, 'time')
		};
		if (b.dayDate === b_prev.dayDate) {
			b = {...b, dayDate: ''};
			if (b.Time === b_prev.Time)
				b = {...b, time: ''};
		}
	}
	return b;
}

function Breakouts() {
	const history = useHistory();
	const params = useParams();
	const urlMeetingId = parseNumber(params.meetingNumber);
	const [breakout, setBreakout] = React.useState(null);

	const dispatch = useDispatch();
	const {valid, meetingId, selected, committees, timeslots} = useSelector(selectBreakoutsState);
	const entities = useSelector(selectSyncedBreakoutEntities);
	const meeting = useSelector(selectImatMeetingEntities)[meetingId];
	const teleconEntities = useSelector(selectSyncedTeleconEntities);
	const groups = useSelector(selectGroupEntities);
	const [breakoutToLink, setBreakoutToLink] = React.useState(null);

	React.useEffect(() => {
		if (!valid || (urlMeetingId && urlMeetingId !== meetingId))
			dispatch(loadBreakouts(urlMeetingId));
	}, [dispatch, valid, urlMeetingId, meetingId]);

	const columns = React.useMemo(() => {
		function renderActions({rowData}) {
			if (rowData.teleconId)
				return <TeleconSummary teleconId={rowData.teleconId} />
			return (
				<>
					<ActionButton
						name='link'
						onClick={() => setBreakoutToLink(rowData)}
					/>
				</>
			)
		}
		const columns = [...tableColumns];
		columns[columns.length-1] = {
			...columns[columns.length-1],
			cellRenderer: renderActions
		}
		return columns;
	}, [setBreakoutToLink]);

	const rowGetter = React.useCallback((props) => {
		let b = breakoutsRowGetter(props);
		return {...b, status: getBreakoutStatus(b, teleconEntities)}
	}, [teleconEntities]);

	const onImport = () => {
		if (selected.length) {
			const entry = entities[selected[0]];
			const telecon = teleconEntities[entry.teleconId];
			const breakout = teleconToBreakout(telecon, meeting, groups, committees, timeslots);
			console.log(breakout);
			setBreakout(breakout);
		}
	}

	const close = () => history.push('/imatMeetings');
	const refresh = () => dispatch(loadBreakouts(urlMeetingId));

	const closeBreakoutAdd = () => setBreakout(null);
	const closeToLink = () => setBreakoutToLink(null);

	function updateBreakout(update) {
		setBreakout({...breakout, ...update});
	}

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>{meeting && renderSessionInfo(meeting)}</div>
				<div>Breakouts</div>
				<div>
					<Button>Sync</Button>
					<ActionButton name='import' title='Add' onClick={onImport} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow>
				<AppTable
					fitWidth
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					dataSet={dataSet}
					rowGetter={rowGetter}
				/>
			</TableRow>

			<AppModal
				isOpen={!!breakout}
				onRequestClose={closeBreakoutAdd}
			>
				<BreakoutAdd
					breakout={breakout}
					setBreakout={updateBreakout}
					close={closeBreakoutAdd}
					session={meeting}
				/>
			</AppModal>

			<AppModal
				isOpen={!!breakoutToLink}
				onRequestClose={closeToLink}
			>
				<TeleconLink
					breakout={breakoutToLink}
					close={closeToLink}
				/>
			</AppModal>
		</>
	)
}

export default Breakouts;
