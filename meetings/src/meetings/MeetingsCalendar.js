import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {Checkbox} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';

import {
	toSlotId,
	selectCurrentSession,
	selectCurrentSessionDates,
} from '../store/sessions';

import {
	selectSelectedSlots,
	toggleSelectedSlots,
	selectSelectedMeetings,
	toggleSelectedMeetings,
	selectMeetingEntities
} from '../store/meetings';

import {selectGroupEntities} from '../store/groups';

const time = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
	'12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];

function TimeColumn({style}) {
	function timeEntry(s, i) {
		const display = i === 0? 'none': undefined;
		return (
			<div style={{position: 'relative', height: 48, textAlign: 'right'}} key={i}>
				<span style={{display, position: 'relative', top: '-6px'}}>{s}</span>
			</div>
		)
	}
	return (
		<div style={{...style, position: 'relative', boxSizing: 'border-box', marginLeft: 'auto'}}>
			{time.map(timeEntry)}
			<div style={{height: 20}} />
		</div>
	)
}

const Container = styled.div`
	display: grid;
	grid-template-columns: max-content ${({n}) => `repeat(${n}, minmax(10px, 1fr))`};
	grid-template-rows: max-content 1fr;
`;

const Column = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	border-right: #dadce0 1px solid;
	box-sizing: border-box;
	overflow: hidden;
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
	const selectedMeetings = useSelector(selectSelectedMeetings);
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
			<span style={{width: '100%'}}>
				<Checkbox
					style={{float: 'right'}}
					checked={selectedSlots.includes(id)}
					onChange={() => dispatch(toggleSelectedSlots([id]))}
					disabled={isReadOnly}
				/>
				<span style={{color: 'gray'}}>{slot.name}</span>
			</span>
		</Slot>
	)
}

function Meeting({date, room, meeting, meetings}) {
	const dispatch = useDispatch();
	const session = useSelector(selectCurrentSession);
	const selectedMeetings = useSelector(selectSelectedMeetings);
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

	const summary = meeting.summary.replace(/^802.11/, '').trim();

	const isReadOnly = selectedMeetings.length === 0 && selectedSlots.length > 0;

	return (
		<Slot style={style}>
			<span style={{width: '100%'}}>
				<Checkbox
					style={{float: 'right'}}
					checked={selectedMeetings.includes(meeting.id)}
					onChange={() => dispatch(toggleSelectedMeetings([meeting.id]))}
					disabled={isReadOnly}
				/>
				{summary}
			</span>
		</Slot>
	)
}

function RoomColumn({date, room}) {
	const {timezone, timeslots, rooms} = useSelector(selectCurrentSession);
	const meetingEntities = useSelector(selectMeetingEntities);

	// Meetings for this date with roomId added
	const meetings = React.useMemo(() => {
		return Object.values(meetingEntities)
			.filter(m => date === DateTime.fromISO(m.start, {zone: timezone}).toISODate())
			.map(m => {
				if (m.roomId !== undefined && m.roomId !== null)
					return m;
				const room = rooms.find(r => r.name === m.location);
				return {...m, roomId: room? room.id: 0};
			})
			.filter(m => m.roomId === room.id)
	}, [meetingEntities, date, room.id, timezone, rooms]);

	return (
		<Column key={room.id}>
			{timeslots.map((slot) => <Timeslot key={slot.id} date={date} room={room} slot={slot}/>)}
			{meetings.map((meeting) => <Meeting key={meeting.id} date={date} room={room} meeting={meeting} meetings={meetings}/>)}
		</Column>
	)
}

const SessionDayContainer = styled.div`
	width: 100%;
	display: grid;
	grid-template-columns: 8px ${({n}) => `repeat(${n}, minmax(10px, 1fr))`};
	grid-template-rows: minmax(10px, 1fr);
`;

const BorderRowCell = styled.div`
	border-right: #dadce0 1px solid;
	&::after {
		content: "";
		border-bottom: #dadce0 1px solid;
		position: absolute;
		width: 100%;
	}
`;

function SessionDayHead({style, date, sessionDate, rooms}) {

	const day = DateTime.fromISO(date).diff(DateTime.fromISO(sessionDate), 'days').days;
	const background = (day % 2 === 0)? '#eeeeee': 'white';

	return (
		<div style={{...style, position: 'sticky', top: 0, zIndex: '+1', display: 'flex', flexDirection: 'column', alignItems: 'center', background}}>
			<div style={{textTransform: 'uppercase', fontWeight: 'bold'}}>
				{DateTime.fromISO(date).weekdayShort}
			</div>
			<div style={{fontWeight: 'bold'}}>
				{DateTime.fromISO(date).day}
			</div>
			<SessionDayContainer
				n={rooms.length}
			>
				<BorderRowCell style={{height: 'unset'}} />
				{rooms.map(room => 
					<Column key={room.id}>
						<span>{room.name}</span>
					</Column>
				)}
			</SessionDayContainer>
		</div>
	)
}


const LeftMarginAndRowLines = ({style}) =>
	<div style={style} >
		{time.map(t => <BorderRowCell key={t} style={{height: 48}} />)}
	</div>

const defaultRooms = [{id: 0, name: ''}];

function SessionDayBody({style, date, sessionDate, rooms}) {

	const day = DateTime.fromISO(date).diff(DateTime.fromISO(sessionDate), 'days').days;
	const background = (day % 2 === 0)? '#eeeeee': 'white';

	return (
		<SessionDayContainer
			n={rooms.length}
			style={{...style, position: 'relative', background}}
		>
			<LeftMarginAndRowLines />
			{rooms.map((room) =>
				<RoomColumn
					key={room.id}
					date={date}
					room={room}
				/>
			)}
		</SessionDayContainer>
	)
}

function MeetingCalendar({nDays}) {
	const dates = useSelector(selectCurrentSessionDates);
	//const [nDays, setNDays] = React.useState(1);
	const [day, setDay] = React.useState(0);

	let {rooms} = useSelector(selectCurrentSession);
	if (rooms.length === 0)
		rooms = defaultRooms;

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
		<Container n={shownDates.length} >
			<div style={{gridArea: `1 / 2 / 1 / ${nDays + 2}`, position: 'sticky', top: 0, zIndex: '+2'}}>
				{day > 0 && <ActionIcon type='angle-left' style={{position: 'absolute', left: 0, fontSize: 'xx-large'}} onClick={clickLeft} />}
				{(day + nDays) < dates.length && <ActionIcon type='angle-right' style={{position: 'absolute', right: 0, fontSize: 'xx-large'}} onClick={clickRight} />}
			</div>
			{shownDates.map((date, i) =>
				<SessionDayHead
					key={date}
					style={{gridArea: `1 / ${i+2}`}}
					date={date}
					sessionDate={dates[0]}
					rooms={rooms}
				/>)}
			<TimeColumn style={{gridArea: '2 / 1'}}/>
			{shownDates.map((date, i) =>
				<SessionDayBody
					key={date}
					style={{gridArea: `2 / ${i+2}`}}
					date={date}
					sessionDate={dates[0]}
					rooms={rooms}
				/>
			)}
		</Container>
	)
}

MeetingCalendar.propTypes = {
	nDays: PropTypes.number.isRequired
}

export default MeetingCalendar;