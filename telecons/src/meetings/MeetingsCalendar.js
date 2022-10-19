import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import AutoSizer from 'react-virtualized-auto-sizer';

import {Checkbox, Select} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {
	toSlotId,
	selectCurrentSession,
	selectCurrentSessionDates,
} from '../store/sessions';

import {
	selectSelectedSlots,
	toggleSelectedSlots,
	selectSelectedTelecons,
	toggleSelectedTelecons,
	selectTeleconEntities
} from '../store/telecons';

import {selectGroupEntities} from '../store/groups';

import TopRow from '../components/TopRow';

const options = [
	{label: '5 Day', value: 5},
	{label: '3 Day', value: 3},
	{label: '1 Day', value: 1}
];

function WeekSelector({value, onChange}) {
	const values = options.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: 0);
	return (
		<Select
			options={options}
			values={values}
			onChange={handleChange}
		/>
	)
}

const time = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
	'12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];

function TimeColumn() {
	function timeEntry(s, i) {
		const display = i === 0? 'none': undefined;
		return (
			<div style={{position: 'relative', height: 48, textAlign: 'right'}} key={i}>
				<span style={{display, position: 'relative', top: '-6px'}}>{s}</span>
			</div>
		)
	}
	return (
		<div style={{position: 'relative', boxSizing: 'border-box', marginLeft: 'auto'}}>
			{time.map(timeEntry)}
			<div style={{height: 20}} />
		</div>
	)
}

const Container = styled.div`
	display: flex;
	flex-direction: row;
	flex: 1 1 auto;
	align-items: stretch;
	min-width: 100%;
`;

const Column = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	border-right: #dadce0 1px solid;
	padding-right: 12px;
	box-sizing: border-box;
`;
const BorderRowCell = styled.div`
	height: 48px;
	&::after {
		content: "";
		border-bottom: #dadce0 1px solid;
		position: absolute;
		width: 100%;
	}
`;

const LeftMarginColumn = styled.div`
	width: 8px;
	border-right: #dadce0 1px solid;
`;

const Slot = styled.div`
	position: absolute;
	width: calc(100%);
	padding: 4px;
	border: gray 1px dashed;
	border-radius: 5px;
	box-sizing: border-box;
	display: flex;
	justify-content: space-between;
`;

function timeToHours(time) {
	const p = time.split(':');
	return parseInt(p[0]) + parseInt(p[1])/60;
}

function Timeslot({date, room, slot}) {
	const dispatch = useDispatch();
	const selectedMeetings = useSelector(selectSelectedTelecons);
	const selectedSlots = useSelector(selectSelectedSlots);

	if (!slot.startTime || !slot.endTime)
			return null;
	const h1 = timeToHours(slot.startTime);
	const h2 = timeToHours(slot.endTime);

	const style = {
		top: h1*48,
		height: (h2-h1)*48
	};

	const id = toSlotId(date, slot, room);

	const isReadOnly = selectedSlots.length === 0 && selectedMeetings.length > 0;

	return (
		<Slot style={style} >
			<span style={{color: 'gray'}}>{slot.name}</span>
			<Checkbox
				checked={selectedSlots.includes(id)}
				onChange={() => dispatch(toggleSelectedSlots([id]))}
				disabled={isReadOnly}
			/>
		</Slot>
	)
}

function Meeting({date, room, meeting, meetings}) {
	const dispatch = useDispatch();
	const session = useSelector(selectCurrentSession);
	const selectedMeetings = useSelector(selectSelectedTelecons);
	const selectedSlots = useSelector(selectSelectedSlots);
	const groupEntities = useSelector(selectGroupEntities);

	const start = DateTime.fromISO(meeting.start, {zone: session.timezone});
	const end = DateTime.fromISO(meeting.end, {zone: session.timezone});
	//console.log(meeting.start, start.toFormat('HH:mm'))
	const startTime = start.toFormat('HH:mm');
	const endTime = end.toFormat('HH:mm');
	const h1 = timeToHours(startTime);
	const h2 = timeToHours(endTime);

	const overlappingMeetings = meetings.filter(m => {
		const mStart = DateTime.fromISO(m.start);
		const mEnd = DateTime.fromISO(m.end);
		return (mStart >= start && mStart < end) || (mEnd > start && mEnd <= end);
	});
	const index = overlappingMeetings.findIndex(m => m.id === meeting.id);
	const widthPct = 100/overlappingMeetings.length;

	const group = groupEntities[meeting.organizationId];

	const style = {
		top: h1*48,
		height: (h2-h1)*48,
		left: `${index*widthPct}%`,
		width: `${widthPct}%`,
		background: group?.color || 'yellow'
	};

	const isReadOnly = selectedMeetings.length === 0 && selectedSlots.length > 0;

	return (
		<Slot style={style}>
			<span style={{width: '100%'}}>
				<Checkbox
					style={{float: 'right'}}
					checked={selectedMeetings.includes(meeting.id)}
					onChange={() => dispatch(toggleSelectedTelecons([meeting.id]))}
					disabled={isReadOnly}
				/>
				{meeting.summary}
			</span>
		</Slot>
	)
}

function RoomColumn({date, room}) {
	const {timezone, timeslots, rooms} = useSelector(selectCurrentSession);
	const meetingEntities = useSelector(selectTeleconEntities);

	// Meetings for this date with roomId added
	const meetings = React.useMemo(() => {
		return Object.values(meetingEntities)
			.filter(m => date === DateTime.fromISO(m.start, {zone: timezone}).toISODate())
			.map(m => {
				const room = rooms.find(r => r.name === m.location) || rooms[0];
				return {...m, roomId: room.id};
			})
			.filter(m => m.roomId === room.id)
	}, [meetingEntities, date, room.id, timezone, rooms]);

	return (
		<Column key={room.id}>
			<span>{room.name}</span>
			{timeslots.map((slot) => <Timeslot key={slot.id} date={date} room={room} slot={slot}/>)}
			{meetings.map((meeting) => <Meeting key={meeting.id} date={date} room={room} meeting={meeting} meetings={meetings}/>)}
		</Column>
	)
}

function SessionDay({style, date}) {
	const {rooms} = useSelector(selectCurrentSession);

	return (
		<div style={{...style, display: 'flex', flex: '1 1 auto', flexDirection: 'column', alignItems: 'flex-start'}}>
			<div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
				<span style={{textTransform: 'uppercase'}}>
					{DateTime.fromISO(date).weekdayShort}
				</span>
				<span>
					{DateTime.fromISO(date).day}
				</span>
			</div>
			<div role='row' style={{minWidth: '100%', flex: 'none', display: 'inline-flex', position: 'relative', overflow: 'hidden', verticalAlign: 'top'}}>
				<div>
					{time.map(t => <BorderRowCell key={t}/>)}
				</div>
				<LeftMarginColumn />
				{rooms.map((room) => <RoomColumn key={room.id} date={date} room={room} />)}
			</div>
		</div>
	)
}

function MeetingCalendar() {
	const dates = useSelector(selectCurrentSessionDates);
	const [nDays, setNDays] = React.useState(1);
	const [day, setDay] = React.useState(0);

	function clickLeft() {
		let d = day - 1;
		if (d < 0)
			d = 0;
		setDay(d);
	}

	function clickRight() {
		let d = day + 1;
		if (d >= (dates.length - nDays))
			d = dates.length - nDays;
		setDay(d);
	}

	const shownDates = dates.slice(day, day + nDays);

	return (
		<>
			<TopRow>
				<ActionIcon type='angle-left' onClick={clickLeft} />
				<ActionIcon type='angle-right' onClick={clickRight} />
				<WeekSelector
					value={nDays}
					onChange={setNDays}
				/>
			</TopRow>

			<Container>
				<TimeColumn />
				<div style={{flex: 1}}>
					<AutoSizer>
						{({height, width}) => 
							<div style={{width, height}} >
								{shownDates.map((date, i) => 
									<SessionDay
										key={date}
										style={{position: 'absolute', overflow: 'hidden', left: i*width/shownDates.length, width: width/shownDates.length, height}}
										date={date}
									/>
								)}
							</div>
						}
					</AutoSizer>
				</div>
			</Container>
		</>
	)
}

export default MeetingCalendar;
