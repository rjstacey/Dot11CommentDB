import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import {DateTime} from 'luxon';
import {FixedSizeList} from 'react-window';

import {SplitPanel, Panel} from 'dot11-components/table';
import {Checkbox, Button} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {
	selectSessionPrepState,
	selectSession,
	selectSessionPrepEntities,
	selectSessionPrepRooms as selectRooms,
	selectSessionPrepTimeslots as selectTimeslots,
	selectSessionPrepDates,
	selectSelectedMeetings,
	selectSelectedSlots,
	toggleSelectedMeetings,
	toggleSelectedSlots,
	toSlotId,
	fromSlotId,
} from '../store/sessionPrep';

import {selectGroupEntities} from '../store/groups';
import {selectCurrentSession} from '../store/imatMeetings';

import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';

import MeetingDetails from './MeetingDetails';
import TimeslotDetails from './TimeslotDetails';
import RoomDetails from './RoomDetails';
import SessionDetails from './SessionDetails';

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

const timeslots = [
	{id: 0, name: 'AM0', startTime: '07:00', endTime: '08:00'},
	{id: 1, name: 'AM1', startTime: '08:00', endTime: '10:00'},
	{id: 2, name: 'AM2', startTime: '10:30', endTime: '12:30'},
	{id: 3, name: 'PM1', startTime: '13:30', endTime: '15:30'},
	{id: 4, name: 'PM2', startTime: '16:00', endTime: '18:00'},
	{id: 5, name: 'EVE', startTime: '19:30', endTime: '21:30'},
];

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
		<Slot key={'slt' + id} style={style} >
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
	const session = useSelector(selectSession);
	const selectedMeetings = useSelector(selectSelectedMeetings);
	const selectedSlots = useSelector(selectSelectedSlots);
	const groupEntities = useSelector(selectGroupEntities);

	const start = DateTime.fromISO(meeting.start, {zone: meeting.timezone || session.timezone});
	const end = DateTime.fromISO(meeting.end, {zone: meeting.timezone || session.timezone});
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
		<Slot key={'mtg' + meeting.id} style={style}>
			<span>{meeting.name}</span>
			<Checkbox
				checked={selectedMeetings.includes(meeting.id)}
				onChange={() => dispatch(toggleSelectedMeetings([meeting.id]))}
				disabled={isReadOnly}
			/>
		</Slot>
	)
}

function RoomColumn({date, room}) {
	const session = useSelector(selectSession);
	const timeslots = useSelector(selectTimeslots);
	const rooms = useSelector(selectRooms);
	const meetingEntities = useSelector(selectSessionPrepEntities);

	// Meetings for this date with roomId added
	const meetings = React.useMemo(() => {
		return Object.values(meetingEntities)
			.filter(m => date === DateTime.fromISO(m.start).toISODate())
			.map(m => {
				const room = rooms.find(r => r.name === m.location) || rooms[0];
				return {...m, roomId: room.id};
			})
			.filter(m => m.roomId === room.id)
	}, [meetingEntities, date]);

	return (
		<Column key={room.id}>
			<span>{room.name}</span>
			{timeslots.map((slot) => <Timeslot date={date} room={room} slot={slot}/>)}
			{meetings.map((meeting) => <Meeting date={date} room={room} meeting={meeting} meetings={meetings}/>)}
		</Column>
	)
}

function SessionDay({style, date}) {
	const rooms = useSelector(selectRooms);

	return (
		<div style={{...style, display: 'flex', flex: '1 1 auto', alignItems: 'flex-start'}}>
			<div role='row' style={{minWidth: '100%', flex: 'none', display: 'inline-flex', position: 'relative', overflow: 'hidden', verticalAlign: 'top'}}>
				<div>
					{time.map(t => <BorderRowCell key={t}/>)}
				</div>
				<LeftMarginColumn />
				{rooms.map((room) => <RoomColumn date={date} room={room} />)}
			</div>
		</div>
	)
}


function SessionBreakouts() {
	const dates = useSelector(selectSessionPrepDates);

	return (
		<>
			<TopRow>
				<GroupPathSelector/>
				<CurrentSessionSelector/>
			</TopRow>

			<SplitPanel dataSet='telecons' >
				<Panel>
					<Container>
						<TimeColumn />
						<FixedSizeList
							itemCount={dates.length}
							itemSize={600}
							layout='horizontal'
							width={1000}
						>
							{({index, style}) => 
								<SessionDay
									style={style}
									date={dates[index]}
								/>
							}
						</FixedSizeList>
					</Container>
				</Panel>
				<Panel>
					<Tabs>
						<TabList>
							<Tab>Session</Tab>
							<Tab>Time slots</Tab>
							<Tab>Rooms</Tab>
							<Tab>Meetings</Tab>
						</TabList>
						<TabPanel>
							<SessionDetails />
						</TabPanel>
						<TabPanel>
							<TimeslotDetails />
						</TabPanel>
						<TabPanel>
							<RoomDetails />
						</TabPanel>
						<TabPanel>
							<MeetingDetails />
						</TabPanel>
					</Tabs>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default SessionBreakouts;
