import * as React from "react";
import { DateTime } from "luxon";
import { Button, FormCheck } from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	toSlotId,
	selectCurrentSession,
	selectCurrentSessionDates,
	Room,
	Timeslot,
} from "@/store/sessions";
import {
	selectSelectedSlots,
	toggleSelectedSlots,
	selectSelectedMeetings,
	toggleSelectedMeetings,
	setSelectedMeetings,
	selectMeetingEntities,
	selectMeetingIds,
	Meeting,
} from "@/store/meetings";
import { selectGroupEntities } from "@/store/groups";

import styles from "./meetings.module.css";

function SelectAllMeetings({ style }: { style?: React.CSSProperties }) {
	const dispatch = useAppDispatch();

	const selectedMeetings = useAppSelector(selectSelectedMeetings);
	const selectedSlots = useAppSelector(selectSelectedSlots);
	const ids = useAppSelector(selectMeetingIds);

	const isDisabled =
		selectedMeetings.length === 0 && selectedSlots.length > 0;

	const allSelected = React.useMemo(
		() =>
			ids.length > 0 && // not if list is empty
			ids.every((id) => selectedMeetings.includes(id)),
		[ids, selectedMeetings]
	);

	const isIndeterminate = !allSelected && selectedMeetings.length > 0;

	const toggleSelect = () => {
		dispatch(setSelectedMeetings(selectedMeetings.length ? [] : ids));
	};

	return (
		<div
			style={{
				...style,
				position: "sticky",
				top: 0,
				zIndex: "+1",
				display: "flex",
				justifyContent: "center",
			}}
		>
			<FormCheck
				id="clear-all"
				title={
					allSelected
						? "Clear all"
						: isIndeterminate
						? "Clear selected"
						: "Select all"
				}
				checked={allSelected}
				ref={(ref) => {
					if (ref) ref.indeterminate = isIndeterminate;
				}}
				onChange={toggleSelect}
				disabled={isDisabled}
			/>
		</div>
	);
}

const time = [
	"12 AM",
	"1 AM",
	"2 AM",
	"3 AM",
	"4 AM",
	"5 AM",
	"6 AM",
	"7 AM",
	"8 AM",
	"9 AM",
	"10 AM",
	"11 AM",
	"12 PM",
	"1 PM",
	"2 PM",
	"3 PM",
	"4 PM",
	"5 PM",
	"6 PM",
	"7 PM",
	"8 PM",
	"9 PM",
	"10 PM",
	"11 PM",
];

function TimeColumn({ style }: { style?: React.CSSProperties }) {
	function timeEntry(s: string, i: number) {
		const display = i === 0 ? "none" : undefined;
		return (
			<div
				key={i}
				style={{ position: "relative", height: 48, textAlign: "right" }}
			>
				<span style={{ display, position: "relative", top: "-6px" }}>
					{s}
				</span>
			</div>
		);
	}
	return (
		<div
			style={{
				...style,
				position: "relative",
				boxSizing: "border-box",
				marginLeft: "auto",
			}}
		>
			{time.map(timeEntry)}
			<div style={{ height: 20 }} />
		</div>
	);
}

function timeToHours(time: string) {
	const p = time.split(":");
	return parseInt(p[0]) + parseInt(p[1]) / 60;
}

function TimeslotContent({
	date,
	room,
	slot,
}: {
	date: string;
	room: Room;
	slot: Timeslot;
}) {
	const dispatch = useAppDispatch();
	const selectedMeetings = useAppSelector(selectSelectedMeetings);
	const selectedSlots = useAppSelector(selectSelectedSlots);

	if (!slot.startTime || !slot.endTime) return null;
	const h1 = timeToHours(slot.startTime);
	const h2 = timeToHours(slot.endTime);

	const style = {
		top: h1 * 48,
		height: (h2 - h1) * 48,
	};

	const id = toSlotId(date, slot, room);

	const isReadOnly =
		selectedSlots.length === 0 && selectedMeetings.length > 0;

	return (
		<div className="slot" style={style}>
			<span style={{ width: "100%" }}>
				<FormCheck
					id={`slot-select-${id}`}
					style={{ float: "right" }}
					checked={selectedSlots.includes(id)}
					onChange={() => dispatch(toggleSelectedSlots([id]))}
					disabled={isReadOnly}
				/>
				<span style={{ color: "gray" }}>{slot.name}</span>
			</span>
		</div>
	);
}

function MeetingContent({
	meeting,
	meetings,
}: {
	date: string;
	room: Room;
	meeting: Meeting;
	meetings: Meeting[];
}) {
	const dispatch = useAppDispatch();
	const session = useAppSelector(selectCurrentSession)!;
	const selectedMeetings = useAppSelector(selectSelectedMeetings);
	const selectedSlots = useAppSelector(selectSelectedSlots);
	const groupEntities = useAppSelector(selectGroupEntities);

	const start = DateTime.fromISO(meeting.start, { zone: session.timezone });
	const end = DateTime.fromISO(meeting.end, { zone: session.timezone });
	//console.log(meeting.start, start.toFormat('HH:mm'))
	const startTime = start.toFormat("HH:mm");
	const endTime = end.toFormat("HH:mm");
	const h1 = timeToHours(startTime);
	const h2 = timeToHours(endTime);

	const overlappingMeetings = meetings.filter((m) => {
		const mStart = DateTime.fromISO(m.start);
		const mEnd = DateTime.fromISO(m.end);
		return (
			(mStart >= start && mStart < end) || (mEnd > start && mEnd <= end)
		);
	});
	const index = overlappingMeetings.findIndex((m) => m.id === meeting.id);
	const widthPct = 100 / overlappingMeetings.length;

	const group = meeting.organizationId
		? groupEntities[meeting.organizationId]
		: undefined;

	const style = {
		top: h1 * 48,
		height: (h2 - h1) * 48,
		left: `${index * widthPct}%`,
		width: `${widthPct}%`,
		background: group?.color || "yellow",
	};

	const summary = meeting.summary.replace(/^802.11/, "").trim();

	const isReadOnly =
		selectedMeetings.length === 0 && selectedSlots.length > 0;

	return (
		<div className="slot" style={style}>
			<span style={{ width: "100%" }}>
				<FormCheck
					style={{ float: "right" }}
					checked={selectedMeetings.includes(meeting.id)}
					onChange={() =>
						dispatch(toggleSelectedMeetings([meeting.id]))
					}
					disabled={isReadOnly}
				/>
				{summary}
			</span>
		</div>
	);
}

function RoomColumn({ date, room }: { date: string; room: Room }) {
	const { timezone, timeslots, rooms } =
		useAppSelector(selectCurrentSession)!;
	const meetingEntities = useAppSelector(selectMeetingEntities);

	// Meetings for this date with roomId added
	const meetings = React.useMemo(() => {
		return (Object.values(meetingEntities) as Meeting[])
			.filter(
				(m) =>
					date ===
					DateTime.fromISO(m.start, { zone: timezone }).toISODate()
			)
			.map((m) => {
				if (m.roomId !== undefined && m.roomId !== null) return m;
				const room = rooms.find((r) => r.name === m.location);
				return { ...m, roomId: room ? room.id : 0 };
			})
			.filter((m) => m.roomId === room.id);
	}, [meetingEntities, date, room.id, timezone, rooms]);

	return (
		<div key={room.id} className="column">
			{timeslots.map((slot) => (
				<TimeslotContent
					key={slot.id}
					date={date}
					room={room}
					slot={slot}
				/>
			))}
			{meetings.map((meeting) => (
				<MeetingContent
					key={meeting.id}
					date={date}
					room={room}
					meeting={meeting}
					meetings={meetings}
				/>
			))}
		</div>
	);
}

const SessionDayContainer = ({
	style,
	n,
	...props
}: { n: number } & React.ComponentProps<"div">) => (
	<div
		style={{
			...style,
			width: "100%",
			display: "grid",
			gridTemplateColumns: `8px repeat(${n}, minmax(10px, 1fr))`,
			gridTemplateRows: "minmax(10px, 1fr)",
		}}
		{...props}
	/>
);

function SessionDayHead({
	style,
	date,
	sessionDate,
	rooms,
}: {
	style?: React.CSSProperties;
	date: string;
	sessionDate: string;
	rooms: Room[];
}) {
	const day = DateTime.fromISO(date).diff(
		DateTime.fromISO(sessionDate),
		"days"
	).days;
	const background = day % 2 === 0 ? "#eeeeee" : "white";

	return (
		<div
			style={{
				...style,
				position: "sticky",
				top: 0,
				zIndex: "+1",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				background,
			}}
		>
			<div style={{ textTransform: "uppercase", fontWeight: "bold" }}>
				{DateTime.fromISO(date).weekdayShort}
			</div>
			<div style={{ fontWeight: "bold" }}>
				{DateTime.fromISO(date).day}
			</div>
			<SessionDayContainer n={rooms.length}>
				<div className="border-cell" style={{ height: "unset" }} />
				{rooms.map((room) => (
					<div key={room.id} className="column">
						<span>{room.name}</span>
					</div>
				))}
			</SessionDayContainer>
		</div>
	);
}

const LeftMarginAndRowLines = ({ style }: { style?: React.CSSProperties }) => (
	<div style={style}>
		{time.map((t) => (
			<div key={t} className="border-cell" style={{ height: 48 }} />
		))}
	</div>
);

const defaultRooms: Room[] = [{ id: 0, name: "", description: "" }];

function SessionDayBody({
	style,
	date,
	sessionDate,
	rooms,
}: {
	style?: React.CSSProperties;
	date: string;
	sessionDate: string;
	rooms: Room[];
}) {
	const day = DateTime.fromISO(date).diff(
		DateTime.fromISO(sessionDate),
		"days"
	).days;
	const background = day % 2 === 0 ? "#eeeeee" : "white";

	return (
		<SessionDayContainer
			n={rooms.length}
			style={{ ...style, position: "relative", background }}
		>
			<LeftMarginAndRowLines />
			{rooms.map((room) => (
				<RoomColumn key={room.id} date={date} room={room} />
			))}
		</SessionDayContainer>
	);
}

function MeetingsCalendar({ nDays }: { nDays: number }) {
	const dates = useAppSelector(selectCurrentSessionDates);
	const [day, setDay] = React.useState(0);

	let rooms = useAppSelector(selectCurrentSession)?.rooms || [];
	if (rooms.length === 0) rooms = defaultRooms;

	function clickLeft() {
		let d = day - 1;
		if (d < 0) d = 0;
		setDay(d);
	}

	function clickRight() {
		let d = day + 1;
		if (d >= dates.length - nDays) d = dates.length - nDays;
		setDay(d);
	}

	const shownDates = dates.slice(day, day + nDays);

	return (
		<div className={styles.calendar}>
			<div
				style={{
					display: "grid",
					gridTemplateRows: "max-content 1fr",
					gridTemplateColumns: `max-content repeat(${shownDates.length}, minmax(10px, 1fr))`,
				}}
			>
				<SelectAllMeetings style={{ gridArea: "1 / 1" }} />
				<div
					style={{
						gridArea: `1 / 2 / 1 / ${nDays + 2}`,
						position: "sticky",
						top: 0,
						zIndex: "+2",
					}}
				>
					{day > 0 && (
						<Button
							variant="light"
							className="bi-arrow-left-circle"
							style={{
								position: "absolute",
								top: 0,
								left: 10,
								fontSize: "x-large",
							}}
							onClick={clickLeft}
						/>
					)}
					{day + nDays < dates.length && (
						<Button
							variant="light"
							className="bi-arrow-right-circle"
							style={{
								position: "absolute",
								top: 0,
								right: 10,
								fontSize: "x-large",
							}}
							onClick={clickRight}
						/>
					)}
				</div>
				{shownDates.map((date, i) => (
					<SessionDayHead
						key={date}
						style={{ gridArea: `1 / ${i + 2}` }}
						date={date}
						sessionDate={dates[0]}
						rooms={rooms}
					/>
				))}
				<TimeColumn style={{ gridArea: "2 / 1" }} />
				{shownDates.map((date, i) => (
					<SessionDayBody
						key={date}
						style={{ gridArea: `2 / ${i + 2}` }}
						date={date}
						sessionDate={dates[0]}
						rooms={rooms}
					/>
				))}
			</div>
		</div>
	);
}

export default MeetingsCalendar;
